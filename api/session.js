// api/session.js
// ─────────────────────────────────────────────────────────────
// Ity fichier ity dia miandraikitra ny profil'ny mpampiasa :
//
//   Cloud Firestore   → customUid (9 chiffre), username, avatar, email
//   Realtime Database → wallet (vola ao anaty lalao, mety hiova haingana)
//
// Ampiasain'ny client (ModalUsername.vue, Home.vue) amin'ny alalan'ny
// endpoint POST /api/session { action, uid, ... }.
//
// Ampiasain'i api/auth.js ihany koa ireto fonction ireto (require
// mivantana, tsy alalan'ny HTTP) mba hamoronana ny profil rehefa
// misy inscription vaovao, sy mba haka ny profil rehefa login.
// ─────────────────────────────────────────────────────────────

const admin = require('firebase-admin')
const wallet = require('./wallet')

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

// ── Amis / Presence ──────────────────────────────────────────────
// NOTE: ny "friendships" dia tehirizina ao amin'i Firestore, collection
// "friendships", ID = ny 2 UID voalahatra abidy sy hampifandraisina amin'ny
// "_" (mba tsy hisy doublon ka ho mora ny fikarohana/famafana). Ny "presence"
// ("online/offline") dia tsy Realtime Database intsony fa "heartbeat" tsotra:
// ny client (Home.vue) dia mandefa lastActive isaky ny 10s, ary heverina ho
// "online" ny mpampiasa raha vao nandefa heartbeat tao anatin'ny
// ONLINE_THRESHOLD_MS farany.
const ONLINE_THRESHOLD_MS = 20_000
const FRIENDS_LIMIT = 100

function friendshipDocId(uidA, uidB) {
  return [uidA, uidB].sort().join('_')
}

function isOnline(lastActiveMs) {
  return !!lastActiveMs && (Date.now() - lastActiveMs) < ONLINE_THRESHOLD_MS
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
    lastActive: toMillis(d.lastActive),
  }
}

// ── UID 9 chiffre tokana, tsy mifanindry amin'ny mpampiasa hafa ─
function randomNumericUid() {
  let uid = String(Math.floor(Math.random() * 9) + 1) // tsy manomboka amin'ny 0
  for (let i = 0; i < 8; i++) uid += String(Math.floor(Math.random() * 10))
  return uid
}

async function generateUniqueUid(db) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = randomNumericUid()
    const clash = await db.collection('users').where('customUid', '==', candidate).limit(1).get()
    if (clash.empty) return candidate
  }
  throw new Error('uid-generation-failed')
}

// ── Validation ny nom (username) ────────────────────────────────
// Miatomboka amin'ny Majuscule tokana (tsy misy double Majuscule),
// 4 litera minimum sy 10 maximum, ary azo asiana chiffre eny am-parany
// fotsiny (tsy eny anelanela'ny litera).
const USERNAME_REGEX = /^[A-Z][a-z]{3,9}[0-9]{0,4}$/

function usernameFormatError(username) {
  if (typeof username !== 'string' || !username.trim()) {
    return 'Veuillez entrer un nom.'
  }
  if (!USERNAME_REGEX.test(username.trim())) {
    return 'Ce nom ne respecte pas les règles demandées.'
  }
  return null
}

async function isUsernameTaken(db, username, excludeUid) {
  const snap = await db.collection('users')
    .where('usernameLower', '==', username.toLowerCase())
    .limit(1)
    .get()
  if (snap.empty) return false
  return snap.docs[0].id !== excludeUid
}

// ── Profil + wallet, sombiny fototra hovakiana matetika ──────────
async function fetchProfile(db, rtdb, uid) {
  const [profileSnap, walletValue] = await Promise.all([
    db.collection('users').doc(uid).get(),
    wallet.getWallet(rtdb, uid),
  ])
  const profile = profileSnap.exists ? profileSnap.data() : {}

  return {
    customUid: profile.customUid || null,
    username: profile.username || null,
    avatar: profile.avatar || 'default',
    wallet: walletValue,
  }
}

// ── Famoronana ny profil vaovao (antsoin'i api/auth.js rehefa register) ──
async function createInitialProfile(db, rtdb, uid, email) {
  const customUid = await generateUniqueUid(db)

  await db.collection('users').doc(uid).set({
    customUid,
    email,
    username: null,
    usernameLower: null,
    avatar: 'default',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  await wallet.initWallet(rtdb, uid, 0)

  return {
    customUid,
    username: null,
    avatar: 'default',
    wallet: 0,
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
    const db = adm.firestore()
    const rtdb = adm.database()

    // ── Fakana ny profil eo amin'ny angona (mba hahafantarana
    //     Ra toa efa misy username voatahiry na tsia) ────────────
    if (action === 'profile') {
      const profile = await fetchProfile(db, rtdb, uid)
      res.status(200).json({
        success: true,
        hasUsername: !!profile.username,
        profile,
      })
      return
    }

    // ── Fametrahana / fanovana ny username ──────────────────────
    if (action === 'setUsername') {
      const username = typeof body.username === 'string' ? body.username.trim() : ''

      const fmtErr = usernameFormatError(username)
      if (fmtErr) {
        res.status(400).json({ error: fmtErr })
        return
      }

      const taken = await isUsernameTaken(db, username, uid)
      if (taken) {
        res.status(409).json({ error: 'Ce nom est déjà utilisé par un autre joueur.' })
        return
      }

      await db.collection('users').doc(uid).set({
        username,
        usernameLower: username.toLowerCase(),
      }, { merge: true })

      res.status(200).json({ success: true, username })
      return
    }

    // ── Fanovana ny avatar ───────────────────────────────────────
    if (action === 'setAvatar') {
      const avatar = typeof body.avatar === 'string' ? body.avatar.trim() : ''

      if (!avatar) {
        res.status(400).json({ error: 'Avatar invalide.' })
        return
      }

      await db.collection('users').doc(uid).set({ avatar }, { merge: true })

      res.status(200).json({ success: true, avatar })
      return
    }

    // ── Fakana ny email (aseho ao amin'ny modal profil) ──────────
    if (action === 'getEmail') {
      const profileSnap = await db.collection('users').doc(uid).get()
      const email = profileSnap.exists ? (profileSnap.data().email || null) : null

      res.status(200).json({ success: true, email })
      return
    }

    // ── Heartbeat presence: ny client dia mandefa ity isaky ny 10s ──
    if (action === 'heartbeat') {
      await db.collection('users').doc(uid).set({
        lastActive: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      res.status(200).json({ success: true })
      return
    }

    // ── Fakana ny statut "online/offline" ho an'ny lisitry UID iray ──
    if (action === 'get-presence') {
      const uids = Array.isArray(body.uids)
        ? body.uids.filter(u => typeof u === 'string').slice(0, 200)
        : []

      const presence = {}
      await Promise.all(uids.map(async (u) => {
        const snap = await db.collection('users').doc(u).get()
        const lastActive = snap.exists ? toMillis(snap.data().lastActive) : null
        presence[u] = { online: isOnline(lastActive), lastSeen: lastActive }
      }))

      res.status(200).json({ success: true, presence })
      return
    }

    // ── Lisitry ny amis (accepted, pending sent, pending received) ──
    if (action === 'list-friends') {
      const snap = await db.collection('friendships')
        .where('members', 'array-contains', uid)
        .get()

      const friends = []
      for (const doc of snap.docs) {
        const f = doc.data()
        const otherUid = (f.members || []).find(m => m !== uid)
        if (!otherUid) continue
        const brief = await getUserBrief(db, otherUid)
        if (!brief) continue

        let status
        if (f.status === 'accepted') status = 'accepted'
        else status = (f.requestedBy === uid) ? 'pending_sent' : 'pending_received'

        friends.push({ ...brief, status })
      }

      res.status(200).json({ success: true, friends })
      return
    }

    // ── Fikarohana mpilalao (anarana na 9 chiffre ID) ────────────
    if (action === 'search-player') {
      const q = typeof body.query === 'string' ? body.query.trim() : ''
      if (!q) { res.status(200).json({ success: true, results: [] }); return }

      let snap
      if (/^\d{9}$/.test(q)) {
        snap = await db.collection('users').where('customUid', '==', q).limit(10).get()
      } else {
        const qLower = q.toLowerCase()
        snap = await db.collection('users')
          .where('usernameLower', '>=', qLower)
          .where('usernameLower', '<=', qLower + '\uf8ff')
          .limit(10)
          .get()
      }

      const results = []
      snap.forEach(doc => {
        if (doc.id === uid) return
        const d = doc.data()
        results.push({
          firebaseUid: doc.id,
          username: d.username || 'Player',
          avatar: (d.avatar && d.avatar !== 'default') ? d.avatar : '👤',
          shortId: d.customUid || '',
          lastActive: toMillis(d.lastActive),
        })
      })

      res.status(200).json({ success: true, results })
      return
    }

    // ── Fandefasana fangatahana amis ─────────────────────────────
    if (action === 'send-request') {
      const target = body.targetFirebaseUid
      if (!target || typeof target !== 'string' || target === uid) {
        res.status(400).json({ error: 'Joueur invalide.' })
        return
      }

      const docId = friendshipDocId(uid, target)
      const ref   = db.collection('friendships').doc(docId)
      const existing = await ref.get()
      if (existing.exists) {
        res.status(409).json({ error: 'Une relation existe déjà avec ce joueur.' })
        return
      }

      const acceptedSnap = await db.collection('friendships')
        .where('members', 'array-contains', uid)
        .where('status', '==', 'accepted')
        .get()
      if (acceptedSnap.size >= FRIENDS_LIMIT) {
        res.status(400).json({ error: "Votre liste d'amis est complète." })
        return
      }

      await ref.set({
        members:     [uid, target],
        status:      'pending',
        requestedBy: uid,
        createdAt:   admin.firestore.FieldValue.serverTimestamp(),
      })

      res.status(200).json({ success: true })
      return
    }

    // ── Fanafoanana ny fangatahana efa nalefa ────────────────────
    if (action === 'cancel-request') {
      const target = body.targetFirebaseUid
      const docId  = friendshipDocId(uid, target)
      const ref    = db.collection('friendships').doc(docId)
      const snap   = await ref.get()
      if (snap.exists && snap.data().status === 'pending' && snap.data().requestedBy === uid) {
        await ref.delete()
      }
      res.status(200).json({ success: true })
      return
    }

    // ── Fanekena fangatahana amis ─────────────────────────────────
    if (action === 'accept-request') {
      const requester = body.requesterFirebaseUid
      const docId  = friendshipDocId(uid, requester)
      const ref    = db.collection('friendships').doc(docId)
      const snap   = await ref.get()
      if (!snap.exists || snap.data().status !== 'pending' || snap.data().requestedBy !== requester) {
        res.status(400).json({ error: 'Demande introuvable.' })
        return
      }

      const acceptedSnap = await db.collection('friendships')
        .where('members', 'array-contains', uid)
        .where('status', '==', 'accepted')
        .get()
      if (acceptedSnap.size >= FRIENDS_LIMIT) {
        res.status(400).json({ error: "Votre liste d'amis est complète." })
        return
      }

      await ref.set({
        status:     'accepted',
        acceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })

      res.status(200).json({ success: true })
      return
    }

    // ── Fandavana fangatahana amis ────────────────────────────────
    if (action === 'decline-request') {
      const requester = body.requesterFirebaseUid
      const docId = friendshipDocId(uid, requester)
      await db.collection('friendships').doc(docId).delete().catch(() => {})
      res.status(200).json({ success: true })
      return
    }

    // ── Famafana namana ao amin'ny lisitra ────────────────────────
    if (action === 'remove-friend') {
      const friendUid = body.friendFirebaseUid
      const docId = friendshipDocId(uid, friendUid)
      await db.collection('friendships').doc(docId).delete().catch(() => {})
      res.status(200).json({ success: true })
      return
    }

    res.status(400).json({ error: 'Action inconnue.' })
  } catch (err) {
    console.error('api/session.js error:', err)
    res.status(500).json({ error: "Impossible de se connecter au serveur. Réessayez." })
  }
}

// ── Exports ho an'i api/auth.js (tsy alalan'ny HTTP) ─────────────
module.exports.createInitialProfile = createInitialProfile
module.exports.fetchProfile = fetchProfile
