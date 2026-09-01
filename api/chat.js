// api/chat.js
// ─────────────────────────────────────────────────────────────
// Messagerie privée entre 2 utilisateurs (1-à-1).
//
//   Cloud Firestore → collection "conversations", ID = ny 2 UID
//   voalahatra abidy sy hampifandraisina amin'ny "_" (mba tsy hisy
//   doublon), toy ny "friendships" ao amin'i api/session.js.
//   Isaky ny conversation dia misy sub-collection "messages".
//
// Ampiasain'ny client (ModalChat.vue) amin'ny alalan'ny endpoint
// POST /api/chat { action, uid, ... }.
// ─────────────────────────────────────────────────────────────

const admin = require('firebase-admin')

function getAdmin() {
  if (!admin.apps.length) {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    })
  }
  return admin
}

const MESSAGES_PAGE_SIZE = 200
const MESSAGE_MAX_LEN    = 2000
const PREVIEW_MAX_LEN    = 120

function conversationDocId(uidA, uidB) {
  return [uidA, uidB].sort().join('_')
}

function toMillis(ts) {
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : null
}

async function getUserBrief(db, uid) {
  const snap = await db.collection('users').doc(uid).get()
  if (!snap.exists) return null
  const d = snap.data()
  return {
    firebaseUid: uid,
    username: d.username || 'Player',
    avatar: (d.avatar && d.avatar !== 'default') ? d.avatar : '👤',
    shortId: d.customUid || '',
  }
}

// ── Handler HTTP ( POST { action, uid, ... } ) ───────────────────
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  body = body || {}

  const { action, uid } = body

  if (!uid || typeof uid !== 'string') {
    res.status(400).json({ error: 'Session invalide.' })
    return
  }

  try {
    const adm = getAdmin()
    const db  = adm.firestore()

    // ── Lisitry ny resaka (conversations) misy an-dry uid ────────
    if (action === 'list-conversations') {
      const snap = await db.collection('conversations')
        .where('members', 'array-contains', uid)
        .get()

      const conversations = []
      for (const doc of snap.docs) {
        const c = doc.data()
        const otherUid = (c.members || []).find(m => m !== uid)
        if (!otherUid) continue

        // Raha efa nofafan'ilay uid ity resaka ity, ary tsy mbola nisy
        // hafatra vaovao taorian'izay, dia tsy aseho ao amin'ny lisitry
        // an-dry uid intsony (fa mbola hita ao amin'ny mpiresaka anankiray).
        const clearedAtMillis     = toMillis((c.clearedAt || {})[uid])
        const lastMessageAtMillis = toMillis(c.lastMessageAt)
        if (clearedAtMillis && (!lastMessageAtMillis || lastMessageAtMillis <= clearedAtMillis)) continue

        const brief = await getUserBrief(db, otherUid)
        if (!brief) continue

        conversations.push({
          ...brief,
          lastMessage:   c.lastMessage || '',
          lastMessageAt: toMillis(c.lastMessageAt),
          lastSenderUid: c.lastSenderUid || null,
          unreadCount:   (c.unread && c.unread[uid]) || 0,
        })
      }

      conversations.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0))

      res.status(200).json({ success: true, conversations })
      return
    }

    // ── Fakana ny hafatra ao anaty resaka iray + famafana unread ──
    if (action === 'get-messages') {
      const target = body.targetFirebaseUid
      if (!target || typeof target !== 'string' || target === uid) {
        res.status(400).json({ error: 'Joueur invalide.' })
        return
      }

      const docId = conversationDocId(uid, target)
      const ref   = db.collection('conversations').doc(docId)
      const snap  = await ref.get()

      if (!snap.exists) {
        res.status(200).json({ success: true, messages: [] })
        return
      }

      const msgSnap = await ref.collection('messages')
        .orderBy('createdAt', 'asc')
        .limit(MESSAGES_PAGE_SIZE)
        .get()

      // Raha efa nofafan'ilay uid ity resaka ity, dia tsy averina ny
      // hafatra taloha kokoa noho ny fotoana namafana azy.
      const clearedAtMillis = toMillis((snap.data().clearedAt || {})[uid])

      const messages = msgSnap.docs
        .map(d => {
          const m = d.data()
          return {
            id:        d.id,
            senderUid: m.senderUid,
            text:      m.text || '',
            createdAt: toMillis(m.createdAt),
          }
        })
        .filter(m => !clearedAtMillis || (m.createdAt && m.createdAt > clearedAtMillis))

      // Voajery: mamafa ny compteur "unread" an-dry uid amin'ity resaka ity
      if ((snap.data().unread || {})[uid]) {
        await ref.update({ [`unread.${uid}`]: 0 })
      }

      res.status(200).json({ success: true, messages })
      return
    }

    // ── Fandefasana hafatra ──────────────────────────────────────
    if (action === 'send-message') {
      const target = body.targetFirebaseUid
      const text   = typeof body.text === 'string' ? body.text.trim() : ''

      if (!target || typeof target !== 'string' || target === uid) {
        res.status(400).json({ error: 'Joueur invalide.' })
        return
      }
      if (!text) {
        res.status(400).json({ error: 'Le message ne peut pas être vide.' })
        return
      }
      if (text.length > MESSAGE_MAX_LEN) {
        res.status(400).json({ error: 'Message trop long.' })
        return
      }

      const docId = conversationDocId(uid, target)
      const ref   = db.collection('conversations').doc(docId)
      const snap  = await ref.get()

      if (!snap.exists) {
        await ref.set({
          members:   [uid, target],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          unread:    { [uid]: 0, [target]: 0 },
        })
      }

      const msgRef = await ref.collection('messages').add({
        senderUid: uid,
        text,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      // NOTE: .update() ihany no manaja marina ny "dot notation" ho
      // an'ny sombin-tsaha nested (ohatra "unread.<uid>"). Raha
      // .set(..., {merge:true}) no ampiasaina eto dia mamorona sahaza
      // saha vaovao ("unread.xxx" mihitsy no anarany) fa tsy manova
      // ilay "unread" map ao anaty — izay no antony tsy niseho ilay
      // boribory mena.
      await ref.update({
        lastMessage:   text.slice(0, PREVIEW_MAX_LEN),
        lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSenderUid: uid,
        [`unread.${target}`]: admin.firestore.FieldValue.increment(1),
        [`unread.${uid}`]:    0,
      })

      res.status(200).json({
        success: true,
        message: {
          id: msgRef.id,
          senderUid: uid,
          text,
          createdAt: Date.now(),
        },
      })
      return
    }

    // ── Famafana Conversation manontolo, ao amin'ilay uid namafa ihany
    //    (ny mpiresaka anankiray tsy voakasika, tsy very ny history azy) ──
    if (action === 'delete-conversation') {
      const target = body.targetFirebaseUid
      if (!target || typeof target !== 'string' || target === uid) {
        res.status(400).json({ error: 'Joueur invalide.' })
        return
      }

      const docId = conversationDocId(uid, target)
      const ref   = db.collection('conversations').doc(docId)
      const snap  = await ref.get()

      if (snap.exists) {
        await ref.update({
          [`clearedAt.${uid}`]: admin.firestore.FieldValue.serverTimestamp(),
          [`unread.${uid}`]:    0,
        })
      }

      res.status(200).json({ success: true })
      return
    }

    // ── Fakana ny hafatra ao anaty chat n'ny Salon (mpilalao maro) ──
    if (action === 'get-room-messages') {
      const roomId = body.roomId
      if (!roomId || typeof roomId !== 'string') {
        res.status(400).json({ error: 'Salon invalide.' })
        return
      }

      const ref     = db.collection('roomChats').doc(roomId)
      const msgSnap = await ref.collection('messages')
        .orderBy('createdAt', 'asc')
        .limit(MESSAGES_PAGE_SIZE)
        .get()

      const messages = msgSnap.docs.map(d => {
        const m = d.data()
        return {
          id:             d.id,
          senderUid:      m.senderUid,
          senderUsername: m.senderUsername || 'Player',
          text:           m.text || '',
          createdAt:      toMillis(m.createdAt),
        }
      })

      res.status(200).json({ success: true, messages })
      return
    }

    // ── Fandefasana hafatra ao anaty chat n'ny Salon (mpilalao maro) ──
    if (action === 'send-room-message') {
      const roomId   = body.roomId
      const text     = typeof body.text === 'string' ? body.text.trim() : ''
      const username = (typeof body.username === 'string' && body.username.trim()) ? body.username.trim() : 'Player'

      if (!roomId || typeof roomId !== 'string') {
        res.status(400).json({ error: 'Salon invalide.' })
        return
      }
      if (!text) {
        res.status(400).json({ error: 'Le message ne peut pas être vide.' })
        return
      }
      if (text.length > MESSAGE_MAX_LEN) {
        res.status(400).json({ error: 'Message trop long.' })
        return
      }

      const ref    = db.collection('roomChats').doc(roomId)
      const msgRef = await ref.collection('messages').add({
        senderUid:      uid,
        senderUsername: username,
        text,
        createdAt:      admin.firestore.FieldValue.serverTimestamp(),
      })

      res.status(200).json({
        success: true,
        message: {
          id:             msgRef.id,
          senderUid:      uid,
          senderUsername: username,
          text,
          createdAt:      Date.now(),
        },
      })
      return
    }

    res.status(400).json({ error: 'Action inconnue.' })
  } catch (err) {
    console.error('api/chat.js error:', err)
    res.status(500).json({ error: "Impossible de se connecter au serveur. Réessayez." })
  }
}
