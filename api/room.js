// api/room.js
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

const SLOT_COUNT = 4
const INVITE_TTL_MS = 15_000

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
function randomRoomCode() {
  let code = ''
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  return code
}

async function generateUniqueRoomId(db) {
  for (let attempt = 0; attempt < 15; attempt++) {
    const candidate = randomRoomCode()
    const snap = await db.collection('rooms').doc(candidate).get()
    if (!snap.exists) return candidate
  }
  throw new Error('room-code-generation-failed')
}

function emptySlots() {
  return [null, null, null, null]
}

function toMillis(ts) {
  return ts && typeof ts.toMillis === 'function' ? ts.toMillis() : (typeof ts === 'number' ? ts : null)
}

// ── "Online / Hors ligne" (présence) ────────────────────────────
// Afaka 5s tsy nisy heartbeat → aseho ho "Hors ligne" (mbola ao anaty slot).
// Afaka 60s tsy nisy heartbeat → esorina automatique ("Hors ligne tampoka"):
//   - Hôte esorina → foana avy hatrany ny Salon manontolo (na public na privé),
//     na dia mbola misy mpilalao (invité) hafa ao aza.
//   - Invité (tsy hôte) esorina → izy irery no miala ("Quitte"), tsy mikasika
//     ny Salon (mijanona ihany io raha mbola en ligne ny hôte).
const PRESENCE_TIMEOUT_MS = 5000
const REMOVE_GRACE_MS = 55000
const REMOVE_TIMEOUT_MS = PRESENCE_TIMEOUT_MS + REMOVE_GRACE_MS // = 60000

// Countdown 60s "Multijoueur" (matchmaking) — jereo computeMatchmakingCountdown.
const MATCHMAKING_COUNTDOWN_MS = 60000
// Rehefa ≤3s sisa (jereo MATCH_COUNTDOWN_LOCK_S ao amin'ny ModalRoom.vue),
// dia tsy azo idiran'ny mpilalao vaovao intsony ilay salon (jereo
// "find-match") — mba tsy hisy mpilalao miditra ampihatra tampoka
// eo am-pikatonan'ny countdown.
const MATCHMAKING_LOCK_MS = 3000

function isMatchmakingRoomLocked(countdownStartedAt, now) {
  if (!countdownStartedAt) return false
  return (now - countdownStartedAt) >= (MATCHMAKING_COUNTDOWN_MS - MATCHMAKING_LOCK_MS)
}

function isSlotOnline(slot, now) {
  if (!slot) return false
  if (!slot.lastSeen) return true
  return (now - slot.lastSeen) <= PRESENCE_TIMEOUT_MS
}

function isSlotRemovable(slot, now) {
  if (!slot || !slot.lastSeen) return false
  return (now - slot.lastSeen) > REMOVE_TIMEOUT_MS
}

// ── Countdown 60s "Multijoueur" (matchmaking) ────────────────────
// Raha 2 mpilalao (na mihoatra) ao anaty salon matchmaking → atomboka
// (na tohizana, TSY AVERINA) ny countdown 60s — ny mpilalao fahatelo/
// fahefatra mety hiditra aorian'izay dia tsy manova na inona na inona.
// Raha latsaka ny isan'ny mpilalao ambany noho ny 2 (miala ka iray
// sisa, na foana) → ajanona/afenina ny countdown ("countdownStartedAt"
// averina ho null), ka rehefa miverina ho 2 (na mihoatra) indray dia
// atomboka INDRAY amin'ny 60s (tsy tohizana intsony). Rehefa tapitra
// ny 60s (ary mbola 2 farafahakeliny ny ao anatiny) dia "expired:true"
// — ny mpiantso (sweepPresence/leave-room/find-match) no mametraka ny
// "status" ho 'playing' arakaraka izay.
function computeMatchmakingCountdown(prevCountdownStartedAt, slots, now) {
  const occupiedCount = slots.filter(Boolean).length
  if (occupiedCount < 2) return { countdownStartedAt: null, expired: false }
  if (!prevCountdownStartedAt) return { countdownStartedAt: now, expired: false }
  const expired = (now - prevCountdownStartedAt) >= MATCHMAKING_COUNTDOWN_MS
  return { countdownStartedAt: prevCountdownStartedAt, expired }
}

function shuffleArray(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i]; a[i] = a[j]; a[j] = tmp
  }
  return a
}

// ── Toerana (couleur) kisendrasendra "Multijoueur" rehefa manomboka
// ny lalao (countdown expired) ─────────────────────────────────────
// slots[0]=Rouge, [1]=Vert, [2]=Bleu, [3]=Jaune (jereo COLORS ao
// amin'ny ModalRoom.vue). Raha 2 mpilalao ihany no tafiditra, dia TSY
// maintsy (Bleu+Vert) na (Rouge+Jaune) — roa mifanandrify amin'ny
// tapakila — no toerana ametrahana azy (kisendrasendra ny fomba roa
// ireo, ary kisendrasendra koa izay mpilalao ho amin'ny toerana
// tsirairay ao anaty ireo roa voafidy). Raha 3 na 4 mpilalao kosa dia
// toerana kisendrasendra tanteraka amin'ireo 4 slot (na aiza na aiza).
const TWO_PLAYER_COLOR_PAIRS = [
  [2, 1], // Bleu + Vert
  [0, 3], // Rouge + Jaune
]

// Ho an'ny index couleur iray (0..3), avereno ny "mpiray tapakila" azy
// ao anaty TWO_PLAYER_COLOR_PAIRS (Rouge<->Jaune, Bleu<->Vert).
function pairPartner(index) {
  for (const [a, b] of TWO_PLAYER_COLOR_PAIRS) {
    if (index === a) return b
    if (index === b) return a
  }
  return null
}

function isValidTwoPlayerPair(idxA, idxB) {
  return pairPartner(idxA) === idxB
}

function randomizeMatchSlots(slots) {
  const players = shuffleArray(slots.filter(Boolean))
  const result = emptySlots()
  if (players.length < 2) return slots

  if (players.length === 2) {
    const [posA, posB] = TWO_PLAYER_COLOR_PAIRS[Math.floor(Math.random() * TWO_PLAYER_COLOR_PAIRS.length)]
    result[posA] = players[0]
    result[posB] = players[1]
    return result
  }

  const positions = shuffleArray([0, 1, 2, 3]).slice(0, players.length)
  positions.forEach((pos, i) => { result[pos] = players[i] })
  return result
}

function sweepPresence(room) {
  const now = Date.now()
  let slots = (room.slots || emptySlots()).slice()
  let status = room.status
  let changed = false

  if (room.mode === 'matchmaking') {
    const hasRemovable = slots.some(s => s && isSlotRemovable(s, now))
    if (hasRemovable) {
      const remaining = slots.filter(s => s && !isSlotRemovable(s, now))
      const compacted = emptySlots()
      remaining.forEach((s, i) => { compacted[i] = s })
      slots = compacted
      changed = true
    }

    let countdownStartedAt = room.countdownStartedAt || null
    if (status === 'waiting') {
      const cd = computeMatchmakingCountdown(countdownStartedAt, slots, now)
      if (cd.countdownStartedAt !== countdownStartedAt) changed = true
      countdownStartedAt = cd.countdownStartedAt
      if (cd.expired) {
        status = 'playing'
        slots = randomizeMatchSlots(slots)
        changed = true
      }
    }

    return { slots, status, changed, countdownStartedAt }
  }

  // Salon PUBLIC sy PRIVÉ : mitovy avokoa ny lojika.
  // - Slot Hors ligne mihoatra REMOVE_TIMEOUT_MS (60s) → esorina.
  // - Slot Hors ligne fa mbola tao anatin'ny 60s (efa mihoatra ny 5s) →
  //   tsy esorina, fa averina ho "pas prêt" raha efa "ready" izy.
  let hostRemoved = false
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i]
    if (!s) continue
    if (isSlotRemovable(s, now)) {
      if (s.uid === room.hostUid) hostRemoved = true
      slots[i] = null
      changed = true
      continue
    }
    if (isSlotOnline(s, now)) continue
    if (s.ready) { slots[i] = { ...s, ready: false }; changed = true }
  }

  if (hostRemoved) {
    // Ny hôte niala ("Quitte") noho ny Hors ligne tampoka > 60s → foana
    // avy hatrany ny Salon manontolo, na dia mbola misy invité tao aza.
    slots = emptySlots()
    status = 'cancelled'
    changed = true
  }

  // "countdownStartedAt" dia tsy ampiasaina raha tsy amin'ny matchmaking
  // (jereo eo ambony) — averina eto ihany mba hitoviana ny endriky ny
  // valiny amin'ny mpiantso (applyPresenceSweep / applyHeartbeat).
  return { slots, status, changed, countdownStartedAt: room.countdownStartedAt || null }
}


async function applyPresenceSweep(db, roomId) {
  const roomRef = db.collection('rooms').doc(roomId)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef)
    if (!snap.exists) return { deleted: true }
    const room = snap.data()

    const swept = sweepPresence(room)
    if (!swept.changed) {
      return { slots: room.slots || emptySlots(), status: room.status, countdownStartedAt: room.countdownStartedAt || null, room }
    }

    const stillOccupied = swept.slots.filter(Boolean)
    if (stillOccupied.length === 0) {
      tx.delete(roomRef)
      return { deleted: true }
    }

    const update = {
      slots: swept.slots,
      status: swept.status,
      countdownStartedAt: swept.countdownStartedAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    if (room.mode === 'matchmaking') update.hostUid = swept.slots[0]?.uid || room.hostUid
    tx.update(roomRef, update)
    return { slots: swept.slots, status: swept.status, countdownStartedAt: swept.countdownStartedAt, room }
  })
}

async function applyHeartbeat(db, roomId, uid) {
  const roomRef = db.collection('rooms').doc(roomId)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(roomRef)
    if (!snap.exists) return { deleted: true }
    const room = snap.data()

    const slots = (room.slots || emptySlots()).slice()
    const idx = slots.findIndex(s => s && s.uid === uid)
    if (idx !== -1) slots[idx] = { ...slots[idx], lastSeen: Date.now() }
    const roomWithHeartbeat = { ...room, slots }

    const swept = sweepPresence(roomWithHeartbeat)
    const finalSlots = swept.slots
    const stillOccupied = finalSlots.filter(Boolean)

    if (stillOccupied.length === 0) {
      tx.delete(roomRef)
      return { deleted: true }
    }

    const update = {
      slots: finalSlots,
      status: swept.status,
      countdownStartedAt: swept.countdownStartedAt,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    if (room.mode === 'matchmaking') update.hostUid = finalSlots[0]?.uid || room.hostUid
    tx.update(roomRef, update)
    return { slots: finalSlots, status: swept.status, countdownStartedAt: swept.countdownStartedAt }
  })
}

async function getUserBrief(db, uid) {
  const snap = await db.collection('users').doc(uid).get()
  if (!snap.exists) return { username: 'Player', avatar: '👤' }
  const d = snap.data()
  return {
    username: d.username || 'Player',
    avatar: (d.avatar && d.avatar !== 'default') ? d.avatar : '👤',
  }
}

// "insufficientBalance" (par slot) — mba ho hitan'ny mpilalao REHETRA
// ao anaty room (Hôte sy invité, tsy izy manokana ihany, jereo
// ModalRoom.vue → tag "Solde insuffisant"), tsy hoe ny wallet varavan-
// olona ao amin'ny client irery no manisa azy (izay tsy mahita afa-tsy
// ny wallet-ny manokana). Ny SERVER ihany no mahazo mamaky ny wallet-n'
// ny olona hafa (Realtime Database), ka eto no ampiana boolean fotsiny
// (tsy ny valeur wallet marina, mba tsy hoseho ny solden'olon-kafa).
async function withInsufficientBalance(rtdb, slots, stake) {
  if (!stake) return slots
  return Promise.all(slots.map(async (s) => {
    if (!s) return s
    const bal = await wallet.getWallet(rtdb, s.uid)
    return { ...s, insufficientBalance: bal < stake }
  }))
}

async function roomPublicView(roomId, room, rtdb) {
  const now = Date.now()
  let slots = (room.slots || emptySlots()).map(s => {
    if (!s) return null
    const { lastSeen, ...rest } = s
    return { ...rest, online: isSlotOnline(s, now) }
  })
  slots = await withInsufficientBalance(rtdb, slots, room.stake ?? null)
  return {
    roomId,
    hostUid: room.hostUid,
    status: room.status,
    slots,
    stake: room.stake ?? null,
    private: !!room.private,
    // "L'hôte choisit la couleur" — miasa raha private ihany (jereo
    // "update-room-settings", izay manery azy ho "false" raha public).
    colorPickEnabled: !!room.private && !!room.colorPickEnabled,
    // Countdown 60s "Multijoueur" (matchmaking) — jereo computeMatchmakingCountdown.
    countdownStartedAt: room.countdownStartedAt || null,
    // Décompte 3s "Lancer la partie" (Créer) — jereo action "start-countdown".
    startingAt: room.startingAt || null,
  }
}

function firstEmptySlot(slots) {
  for (let i = 0; i < SLOT_COUNT; i++) if (!slots[i]) return i
  return -1
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  body = body || {}

  const action = (req.query && req.query.action) || body.action
  const uid = body.uid

  if (!uid || typeof uid !== 'string') {
    res.status(400).json({ message: 'Session invalide.' })
    return
  }

  try {
    const adm = getAdmin()
    const db = adm.firestore()

    if (action === 'create-room') {
      const roomId = await generateUniqueRoomId(db)
      const slots = emptySlots()
      slots[0] = {
        uid,
        username: (body.username || '').trim() || 'Player',
        avatar: body.avatar || '👤',
        ready: false,
        lastSeen: Date.now(),
      }

      const rawStake = Number(body.stake)
      const stake = (Number.isFinite(rawStake) && rawStake > 0) ? rawStake : null

      const rawPassword = typeof body.password === 'string' ? body.password.trim() : ''
      const password = rawPassword.length > 0 ? rawPassword : null

      // "L'hôte choisit la couleur" — tsy azo activé raha tsy salon
      // privé (mitovy lojika amin'ny "update-room-settings").
      const colorPickEnabled = !!password && !!body.colorPickEnabled

      await db.collection('rooms').doc(roomId).set({
        hostUid: uid,
        slots,
        stake,
        password,
        private: !!password,
        colorPickEnabled,
        status: 'waiting',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      res.status(200).json({ success: true, roomId })
      return
    }

    if (action === 'find-match') {
      const stake = Number(body.stake)
      if (!stake || stake <= 0) {
        res.status(400).json({ message: 'Mise invalide.' })
        return
      }

      const username = (body.username || '').trim() || 'Player'
      const avatar = body.avatar || '👤'

      const newRoomId = await generateUniqueRoomId(db)

      const result = await db.runTransaction(async (tx) => {
        const q = db.collection('rooms')
          .where('mode', '==', 'matchmaking')
          .where('stake', '==', stake)
          .where('status', '==', 'waiting')
          .orderBy('createdAt', 'asc')
          .limit(20)

        const snap = await tx.get(q)

        let joinRef      = null
        let joinSlots    = null
        let joinIndex    = -1
        let joinRoomData = null

        const now = Date.now()
        for (const doc of snap.docs) {
          const data = doc.data()
          const slots = data.slots || emptySlots()
          if (slots.some(s => s && s.uid === uid)) continue
          if (isMatchmakingRoomLocked(data.countdownStartedAt, now)) continue
          const idx = firstEmptySlot(slots)
          if (idx !== -1) {
            joinRef  = doc.ref
            joinSlots = slots
            joinIndex = idx
            joinRoomData = data
            break
          }
        }

        if (joinRef) {
          joinSlots[joinIndex] = { uid, username, avatar, ready: true, lastSeen: Date.now() }
          // Ity fidirana ity dia mety mahatonga ny isan'ny mpilalao ao
          // anaty salon ho tonga amin'ny 2 (na mihoatra) — atomboka
          // (na tohizana) eto ihany koa ny countdown 60s, mba tsy
          // hiandry ny "sweep" manaraka (get-room/heartbeat) vao aseho
          // ilay countdown any amin'ny mpilalao.
          const cd = computeMatchmakingCountdown(joinRoomData.countdownStartedAt, joinSlots, Date.now())
          tx.update(joinRef, {
            slots: joinSlots,
            countdownStartedAt: cd.countdownStartedAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
          return { roomId: joinRef.id }
        }

        const newRoomRef = db.collection('rooms').doc(newRoomId)
        const slots = emptySlots()
        slots[0] = { uid, username, avatar, ready: true, lastSeen: Date.now() }
        tx.set(newRoomRef, {
          hostUid: uid,
          mode: 'matchmaking',
          stake,
          slots,
          status: 'waiting',
          countdownStartedAt: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return { roomId: newRoomId }
      })

      res.status(200).json({ success: true, roomId: result.roomId })
      return
    }

    // ── Lisitry ny salon (room) rehetra mbola "waiting" — ampiasain'i
    //     ModalRoomList.vue. Tsy asehoy ireo salon "matchmaking" (Multijoueur),
    //     ny salon noforonina tamin'ny "Créer" ihany no aseho eto.
    // ── Lisitry ny salon (room) rehetra mbola "waiting" — ampiasain'i
    //     ModalRoomList.vue. Tsy asehoy ireo salon "matchmaking" (Multijoueur),
    //     ny salon noforonina tamin'ny "Créer" ihany no aseho eto. Ampiharina
    //     ny "presence sweep" (ny mitovy amin'ilay atao rehefa "get-room" /
    //     "heartbeat") amin'ny salon tsirairay mba tsy hampiseho salon efa
    //     tsy actif intsony (host na mpilalao efa tapaka fifandraisana ela be,
    //     ka efa tokony ho "cancelled" na foana) — ny salon marina ary miasa
    //     amin'io fotoana io ihany no averina.
    if (action === 'list-rooms') {
      const snap = await db.collection('rooms')
        .where('status', '==', 'waiting')
        .limit(200)
        .get()

      const rooms = []
      for (const doc of snap.docs) {
        const d = doc.data()
        if (d.mode === 'matchmaking') continue

        const swept = await applyPresenceSweep(db, doc.id)
        if (!swept || swept.deleted) continue
        if (swept.status !== 'waiting') continue

        const slots = swept.slots || d.slots || emptySlots()
        const count = slots.filter(Boolean).length
        if (count === 0) continue

        rooms.push({
          roomId: doc.id,
          private: !!d.private,
          stake: d.stake ?? null,
          count,
          capacity: SLOT_COUNT,
        })
      }

      res.status(200).json({ success: true, rooms })
      return
    }

    // ── Fanovana ny "paramètres" an'ny salon (mise, public/privé + mot de
    //     passe, "L'hôte choisit la couleur") — avy amin'i ModalBet.vue
    //     rehefa "mode=settings" (icône "settings" ao amin'i ModalRoom.vue,
    //     ny Hôte irery ihany no mahita/afaka mampiasa io icône io).
    //     Ny Hôte ihany no afaka manova, ary tsy azo atao raha efa
    //     "playing" ny salon. Raha mbola PRIVÉ ny salon ary tsy nisy
    //     mot de passe VAOVAO nomena (rawPassword tsy voasoratra), dia
    //     ny mot de passe efa voatahiry no tazomina (tsy voatery averina
    //     amin'ny client ny mot de passe, jereo "roomPublicView").
    if (action === 'update-room-settings') {
      const roomId = body.roomId
      if (!roomId || typeof roomId !== 'string') {
        res.status(400).json({ message: 'Salon invalide.' })
        return
      }

      const rawStake = Number(body.stake)
      const stake = (Number.isFinite(rawStake) && rawStake > 0) ? rawStake : null

      const wantPrivate = !!body.private
      const rawPassword = typeof body.password === 'string' ? body.password.trim() : ''
      // Ny "colorPickEnabled" dia tsy azo activé raha tsy salon PRIVÉ —
      // terena ho "false" eto ihany koa (fiarovana ao anaty server, na
      // dia efa voasakana ao amin'ny client aza).
      const wantColorPick = wantPrivate && !!body.colorPickEnabled

      const roomRef = db.collection('rooms').doc(roomId)
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef)
        if (!snap.exists) return { error: 'room-gone' }
        const room = snap.data()
        if (room.hostUid !== uid) return { error: 'not-host' }
        if (room.status !== 'waiting') return { error: 'room-started' }

        let password = null
        if (wantPrivate) {
          password = rawPassword || (room.private ? (room.password || null) : null)
          if (!password) return { error: 'password-required' }
        }

        // "slotsOrder" (tahafamadika toerana/couleur) — ekena ihany raha
        // permutation an'ilay mpilalao efa ao amin'ny salon (mitovy tanteraka
        // ny uid rehetra ao anatiny), mba tsy azo ampidirina uid vahiny na
        // esorina/ampiana mpilalao amin'ny alalan'ity.
        let slots = room.slots || emptySlots()
        if (Array.isArray(body.slotsOrder) && body.slotsOrder.length === slots.length) {
          const currentUids = slots.filter(Boolean).map(s => s.uid).sort()
          const wantedUids  = body.slotsOrder.filter(Boolean).sort()
          const sameOccupants = currentUids.length === wantedUids.length &&
            currentUids.every((u, idx) => u === wantedUids[idx])
          if (sameOccupants) {
            const byUid = {}
            slots.forEach(s => { if (s) byUid[s.uid] = s })
            slots = body.slotsOrder.map(entryUid => entryUid ? (byUid[entryUid] || null) : null)
          }
        }

        tx.update(roomRef, {
          stake,
          private: wantPrivate,
          password,
          colorPickEnabled: wantColorPick,
          slots,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        return { success: true }
      })

      if (result.error) {
        const messages = {
          'room-gone': 'Ce salon n\'existe plus.',
          'not-host': 'Seul l\'hôte peut modifier ce salon.',
          'room-started': 'La partie a déjà commencé.',
          'password-required': 'Mot de passe requis pour un salon privé.',
        }
        res.status(400).json({ message: messages[result.error] || 'Impossible de modifier ce salon.' })
        return
      }

      res.status(200).json({ success: true })
      return
    }

    // ── Fidirana mivantana anaty salon PUBLIC (avy amin'i ModalRoomList.vue,
    //     "Entrer") — tsy misy invitation, mametraka ilay mpampiasa ao
    //     amin'ny "slot" malalaka voalohany hita. Ny salon "privé" dia tsy
    //     azo idirana amin'ity hetsika ity (mbola tsy misy mot de passe
    //     voampitantana amin'ity version ity).
    if (action === 'join-room') {
      const roomId = body.roomId
      if (!roomId || typeof roomId !== 'string') {
        res.status(400).json({ message: 'Salon invalide.' })
        return
      }

      const username = (body.username || '').trim() || 'Player'
      const avatar = body.avatar || '👤'
      const roomRef = db.collection('rooms').doc(roomId)

      // Ra toa ka salon privé (misy mot de passe) dia takiana ny mot de
      // passe ary ampitahaina amin'ilay voatahiry ao amin'ny document —
      // ny mot de passe mihitsy dia tsy mba miverina any amin'ny client
      // (jereo "roomPublicView" tsy mampiverina "password").
      const providedPassword = typeof body.password === 'string' ? body.password.trim() : ''

      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef)
        if (!snap.exists) return { error: 'room-gone' }
        const room = snap.data()
        if (room.mode === 'matchmaking') return { error: 'room-private' }
        if (room.status !== 'waiting') return { error: 'room-started' }
        if (room.private && providedPassword !== (room.password || '')) return { error: 'wrong-password' }

        const slots = room.slots || emptySlots()
        const already = slots.findIndex(s => s && s.uid === uid)
        if (already !== -1) return { roomId }

        const idx = firstEmptySlot(slots)
        if (idx === -1) return { error: 'room-full' }

        slots[idx] = { uid, username, avatar, ready: false, lastSeen: Date.now() }
        tx.update(roomRef, { slots, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
        return { roomId }
      })

      if (result.error) {
        const messages = {
          'room-gone': 'Ce salon n\'existe plus.',
          'room-started': 'La partie a déjà commencé.',
          'room-private': 'Ce salon est privé.',
          'room-full': 'Ce salon est complet.',
          'wrong-password': 'Mot de passe incorrect.',
        }
        res.status(400).json({ message: messages[result.error] || 'Impossible de rejoindre.' })
        return
      }

      res.status(200).json({ success: true, roomId: result.roomId })
      return
    }

    if (action === 'send-invite') {
      const targetUid = body.targetFirebaseUid
      const roomId = body.roomId
      if (!targetUid || typeof targetUid !== 'string' || targetUid === uid) {
        res.status(400).json({ message: 'Joueur invalide.' })
        return
      }
      if (!roomId || typeof roomId !== 'string') {
        res.status(400).json({ message: 'Salon invalide.' })
        return
      }

      const roomRef = db.collection('rooms').doc(roomId)
      const roomSnap = await roomRef.get()
      if (!roomSnap.exists) {
        res.status(404).json({ message: 'Ce salon n\'existe plus.' })
        return
      }
      const room = roomSnap.data()
      if (room.status !== 'waiting') {
        res.status(400).json({ message: 'La partie a déjà commencé.' })
        return
      }

      const slots = room.slots || emptySlots()
      let targetSlot = (typeof body.targetSlot === 'number' && body.targetSlot >= 0 && body.targetSlot < SLOT_COUNT)
        ? body.targetSlot
        : -1
      if (targetSlot === -1 || slots[targetSlot]) {
        targetSlot = firstEmptySlot(slots)
      }
      if (targetSlot === -1) {
        res.status(400).json({ message: 'Ce salon est complet.' })
        return
      }

      await db.collection('roomInvites').doc(targetUid).set({
        targetUid,
        inviterUid: uid,
        inviterUsername: (body.inviterUsername || '').trim() || 'Un joueur',
        roomId,
        targetSlot,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })

      res.status(200).json({ success: true, targetSlot })
      return
    }

    if (action === 'poll-invite') {
      const ref = db.collection('roomInvites').doc(uid)
      const snap = await ref.get()
      if (!snap.exists) { res.status(200).json({ success: true, invite: null }); return }

      const inv = snap.data()
      const age = Date.now() - (toMillis(inv.createdAt) || 0)
      if (inv.status !== 'pending' || age > INVITE_TTL_MS) {
        await ref.delete().catch(() => {})
        res.status(200).json({ success: true, invite: null })
        return
      }

      const roomSnap = await db.collection('rooms').doc(inv.roomId).get()
      if (!roomSnap.exists || roomSnap.data().status !== 'waiting') {
        await ref.delete().catch(() => {})
        res.status(200).json({ success: true, invite: null })
        return
      }

      res.status(200).json({
        success: true,
        invite: {
          roomId: inv.roomId,
          inviterUid: inv.inviterUid,
          inviterUsername: inv.inviterUsername,
          targetSlot: inv.targetSlot,
        },
      })
      return
    }

    if (action === 'respond-invite') {
      const response = body.response
      const ref = db.collection('roomInvites').doc(uid)
      const snap = await ref.get()

      if (!snap.exists) {
        res.status(404).json({ message: 'Cette invitation a expiré.' })
        return
      }
      const inv = snap.data()

      if (response === 'decline') {
        await ref.delete()
        res.status(200).json({ success: true })
        return
      }

      if (response !== 'accept') {
        res.status(400).json({ message: 'Réponse invalide.' })
        return
      }

      const roomId = inv.roomId
      const roomRef = db.collection('rooms').doc(roomId)

      const brief = await getUserBrief(db, uid)

      const result = await db.runTransaction(async (tx) => {
        const roomSnap = await tx.get(roomRef)
        if (!roomSnap.exists) throw new Error('room-gone')
        const room = roomSnap.data()
        if (room.status !== 'waiting') throw new Error('room-started')

        const slots = room.slots || emptySlots()
        let slotIndex = (typeof inv.targetSlot === 'number' && !slots[inv.targetSlot]) ? inv.targetSlot : -1
        if (slotIndex === -1) slotIndex = firstEmptySlot(slots)
        if (slotIndex === -1) throw new Error('room-full')

        slots[slotIndex] = { uid, username: brief.username, avatar: brief.avatar, ready: false, lastSeen: Date.now() }
        tx.update(roomRef, { slots, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
        return { roomId, slotIndex }
      }).catch((e) => ({ error: e.message }))

      await ref.delete().catch(() => {})

      if (result && result.error) {
        const messages = {
          'room-gone': 'Ce salon n\'existe plus.',
          'room-started': 'La partie a déjà commencé.',
          'room-full': 'Ce salon est complet.',
        }
        res.status(400).json({ message: messages[result.error] || 'Impossible de rejoindre.' })
        return
      }

      res.status(200).json({ success: true, roomId, slotIndex: result.slotIndex })
      return
    }

    if (action === 'get-room') {
      const roomId = body.roomId
      if (!roomId) { res.status(400).json({ message: 'Salon invalide.' }); return }

      const swept = await applyPresenceSweep(db, roomId)
      if (!swept || swept.deleted || !swept.room) { res.status(200).json({ success: true, room: null }); return }
      const finalRoom = { ...swept.room, slots: swept.slots, status: swept.status, countdownStartedAt: swept.countdownStartedAt }

      const rtdb = adm.database()
      res.status(200).json({ success: true, room: await roomPublicView(roomId, finalRoom, rtdb) })
      return
    }

    // ── "Heartbeat"
    if (action === 'heartbeat') {
      const roomId = body.roomId
      if (!roomId) { res.status(400).json({ message: 'Salon invalide.' }); return }

      const result = await applyHeartbeat(db, roomId, uid)
      if (!result || result.deleted) { res.status(200).json({ success: true, room: null }); return }

      const now = Date.now()
      const presence = {}
      result.slots.forEach(s => { if (s) presence[s.uid] = isSlotOnline(s, now) })

      res.status(200).json({ success: true, presence })
      return
    }

    // ── "Ready" / "pas prêt" ────────────────────────
    if (action === 'set-ready') {
      const roomId = body.roomId
      const roomRef = db.collection('rooms').doc(roomId)
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef)
        if (!snap.exists) return { error: 'room-gone' }
        const room = snap.data()
        const slots = room.slots || emptySlots()
        const idx = slots.findIndex(s => s && s.uid === uid)
        if (idx === -1) return { error: 'not-in-room' }
        slots[idx] = { ...slots[idx], ready: !!body.ready }
        tx.update(roomRef, { slots, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
        return { success: true }
      })
      if (result.error === 'room-gone') { res.status(404).json({ message: 'Ce salon n\'existe plus.' }); return }
      if (result.error === 'not-in-room') { res.status(400).json({ message: 'Vous n\'êtes pas dans ce salon.' }); return }
      res.status(200).json({ success: true })
      return
    }

    if (action === 'leave-room') {
      const roomId = body.roomId
      const roomRef = db.collection('rooms').doc(roomId)
      const snap = await roomRef.get()
      if (!snap.exists) { res.status(200).json({ success: true }); return }
      const room = snap.data()
      const slots = room.slots || emptySlots()
      const idx = slots.findIndex(s => s && s.uid === uid)

      if (room.mode === 'matchmaking') {
        if (idx === -1) { res.status(200).json({ success: true }); return }

        const remaining = slots.filter((s, i) => i !== idx && s)
        const compacted = emptySlots()
        remaining.forEach((s, i) => { compacted[i] = s })

        if (compacted.every(s => !s)) {
          await roomRef.delete()
          res.status(200).json({ success: true })
          return
        }

        // Raha ny fialan'ity mpilalao ity dia mahatonga ny isany ho
        // latsaka ny 2 (miala ka iray sisa) → ajanona/afenina ny
        // countdown (jereo computeMatchmakingCountdown); raha mbola 2
        // farafahakeliny ny sisa (nisy 3/4 talohan'izay) → tsy voakasika
        // ny countdown efa nandeha (tsy averina, tohizana ihany).
        const cd = computeMatchmakingCountdown(room.countdownStartedAt, compacted, Date.now())

        await roomRef.update({
          slots: compacted,
          hostUid: compacted[0]?.uid || room.hostUid,
          countdownStartedAt: cd.countdownStartedAt,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        res.status(200).json({ success: true })
        return
      }

      if (idx !== -1) slots[idx] = null

      const stillOccupied = slots.filter(Boolean)

      if (room.hostUid === uid) {
        if (stillOccupied.length === 0) {
          await roomRef.delete()
        } else {
          await roomRef.update({
            slots,
            status: 'cancelled',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })
        }
        res.status(200).json({ success: true })
        return
      }

      if (stillOccupied.length === 0) {
        await roomRef.delete()
        res.status(200).json({ success: true })
        return
      }

      await roomRef.update({
        slots,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      res.status(200).json({ success: true })
      return
    }

    if (action === 'kick-player') {
      const targetUid = body.targetUid
      const roomId = body.roomId
      if (!targetUid || typeof targetUid !== 'string') {
        res.status(400).json({ message: 'Joueur invalide.' })
        return
      }
      const roomRef = db.collection('rooms').doc(roomId)
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef)
        if (!snap.exists) return { success: true }
        const room = snap.data()

        if (room.hostUid !== uid) return { error: 'not-host' }
        if (targetUid === uid) return { error: 'self-kick' }

        const slots = room.slots || emptySlots()
        const idx = slots.findIndex(s => s && s.uid === targetUid)
        if (idx === -1) return { success: true }
        slots[idx] = null

        tx.update(roomRef, { slots, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
        return { success: true }
      })
      if (result.error === 'not-host') { res.status(403).json({ message: 'Seul l\'hôte peut exclure un joueur.' }); return }
      if (result.error === 'self-kick') { res.status(400).json({ message: 'Vous ne pouvez pas vous exclure vous-même.' }); return }
      res.status(200).json({ success: true })
      return
    }

    // ── Décompte 3s "Lancer la partie" (Créer, Hôte ihany) ────────────
    // Rehefa tsindrian'ny Hôte ilay bokotra "Lancer la partie", dia ity
    // hetsika ity no antsoina ALOHA (mba hitehirizana amin'ny server ny
    // fotoana nanombohan'ilay 3s), ary aorian'ny 3s eo an-toerana (any
    // amin'ny client) ihany vao antsoina ny "start-game" varina — mitovy
    // tanteraka amin'ny lojika teo aloha (Hôte ihany no mikasika ny
    // "start-game", tsy misy fiovana amin'izay). Ny tanjony dia ny
    // hahafahan'ny mpilalao invité rehetra (tsy hôte) koa mahita ilay
    // décompte 3s (asolo ny "Prêt"/"Je suis prêt" any amin'ny
    // ModalRoom.vue), fa tsy ny Hôte irery ihany intsony.
    if (action === 'start-countdown') {
      const roomId = body.roomId
      const roomRef = db.collection('rooms').doc(roomId)
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef)
        if (!snap.exists) return { error: 'room-gone' }
        const room = snap.data()
        if (room.hostUid !== uid) return { error: 'not-host' }
        if (room.status !== 'waiting') return { error: 'room-started' }

        const slots = room.slots || emptySlots()
        const occupied = slots.filter(Boolean)
        if (occupied.length < 2) return { error: 'not-enough-players' }
        const allReady = occupied.every(s => s.ready || s.uid === room.hostUid)
        if (!allReady) return { error: 'not-all-ready' }

        // "L'hôte choisit la couleur" (colorPickEnabled) + 2 mpilalao
        // ihany: tsy maintsy (Bleu+Vert) na (Rouge+Jaune) — jereo
        // isValidTwoPlayerPair. Raha diso, dia ny client no tokony
        // hametraka ilay ModalConfirm ("resolve-color-conflict")
        // ALOHAN'NY hiantso ity — fiarovana fanampiny eto ihany raha
        // tsy izany no nitranga (client manta na race condition).
        if (room.private && room.colorPickEnabled && occupied.length === 2) {
          const idxs = slots.map((s, i) => s ? i : null).filter(i => i !== null)
          if (!isValidTwoPlayerPair(idxs[0], idxs[1])) return { error: 'color-conflict' }
        }

        tx.update(roomRef, { startingAt: Date.now(), updatedAt: admin.firestore.FieldValue.serverTimestamp() })
        return { success: true }
      })
      if (result.error) {
        const messages = {
          'room-gone': 'Ce salon n\'existe plus.',
          'not-host': 'Seul l\'hôte peut lancer la partie.',
          'room-started': 'La partie a déjà commencé.',
          'not-enough-players': 'Il faut au moins 2 joueurs.',
          'not-all-ready': 'Tous les joueurs doivent être prêts.',
          'color-conflict': 'Vous devez changer de couleur, vous ou votre adversaire, avant de lancer la partie.',
        }
        res.status(400).json({ message: messages[result.error] || 'Impossible de lancer la partie.' })
        return
      }
      res.status(200).json({ success: true })
      return
    }

    // ── Fifamadihana couleur + lancement (Créer, colorPickEnabled,
    //     2 mpilalao, couleur tsy mifanandrify) ────────────────────
    // Antsoin'ny ModalRoom.vue rehefa nofidin'ny Hôte ny "Vous" na
    // "L'adversaire" tao amin'ilay ModalConfirm naseho noho ny
    // "color-conflict" avy amin'ny "start-countdown". Ny mpilalao
    // voafidy (Hôte na Adversaire) dia mifindra any amin'ny couleur
    // "mpiray tapakila" amin'ilay mpilalao HAFA (izay tsy miova) —
    // couleur io dia azo antoka fa malalaka satria 2 mpilalao ihany no
    // ao anaty ny 4 slot, ary efa fantatra fa tsy mifanandrify izy roa
    // ireo (io mihitsy no antony niseho ny ModalConfirm). Ny "couleur"
    // sy ny "countdown" dia miova/manomboka MIARAKA, indray mandeha.
    if (action === 'resolve-color-conflict') {
      const roomId = body.roomId
      const swapTarget = body.swapTarget // 'host' | 'opponent'
      const roomRef = db.collection('rooms').doc(roomId)
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef)
        if (!snap.exists) return { error: 'room-gone' }
        const room = snap.data()
        if (room.hostUid !== uid) return { error: 'not-host' }
        if (room.status !== 'waiting') return { error: 'room-started' }
        if (!room.private || !room.colorPickEnabled) return { error: 'not-applicable' }
        if (swapTarget !== 'host' && swapTarget !== 'opponent') return { error: 'invalid-target' }

        const slots = room.slots || emptySlots()
        const idxs = slots.map((s, i) => s ? i : null).filter(i => i !== null)
        if (idxs.length !== 2) return { error: 'not-two-players' }
        if (isValidTwoPlayerPair(idxs[0], idxs[1])) return { error: 'already-valid' }

        const hostIdx = slots[idxs[0]].uid === uid ? idxs[0] : idxs[1]
        const oppIdx  = hostIdx === idxs[0] ? idxs[1] : idxs[0]
        const changeIdx = swapTarget === 'host' ? hostIdx : oppIdx
        const keepIdx   = swapTarget === 'host' ? oppIdx  : hostIdx
        const newIdx    = pairPartner(keepIdx)

        const newSlots = slots.slice()
        newSlots[newIdx] = newSlots[changeIdx]
        if (newIdx !== changeIdx) newSlots[changeIdx] = null

        const allReady = newSlots.filter(Boolean).every(s => s.ready || s.uid === room.hostUid)
        if (!allReady) return { error: 'not-all-ready' }

        tx.update(roomRef, { slots: newSlots, startingAt: Date.now(), updatedAt: admin.firestore.FieldValue.serverTimestamp() })
        return { success: true }
      })
      if (result.error) {
        const messages = {
          'room-gone': 'Ce salon n\'existe plus.',
          'not-host': 'Seul l\'hôte peut lancer la partie.',
          'room-started': 'La partie a déjà commencé.',
          'not-applicable': 'Ce salon ne permet pas de choisir sa couleur.',
          'not-two-players': 'Cette action nécessite exactement 2 joueurs.',
          'already-valid': 'Les couleurs sont déjà valides.',
          'not-all-ready': 'Tous les joueurs doivent être prêts.',
        }
        res.status(400).json({ message: messages[result.error] || 'Impossible de changer de couleur.' })
        return
      }
      res.status(200).json({ success: true })
      return
    }

    if (action === 'start-game') {
      const roomId = body.roomId
      const roomRef = db.collection('rooms').doc(roomId)
      const snap = await roomRef.get()
      if (!snap.exists) { res.status(404).json({ message: 'Ce salon n\'existe plus.' }); return }
      const room = snap.data()
      if (room.hostUid !== uid) { res.status(403).json({ message: 'Seul l\'hôte peut lancer la partie.' }); return }

      let slots = room.slots || emptySlots()
      const occupied = slots.filter(Boolean)
      // BUGFIX: "start-game" dia antsoina ihany rehefa vita ny décompte
      // 3s (jereo "start-countdown"), ka efa "startingAt" voatahiry ao
      // amin'ny salon foana amin'io fotoana io. Raha misy fahatapahana
      // eto (ohatra: nisy mpilalao vaovao niditra mandritra ilay 3s ka
      // tsy "prêt"), dia tsy maintsy fafàna io "startingAt" io koa —
      // raha tsy izany dia hijanona voasakana ("0" mandrakizay) ny
      // bokotra "Prêt" any amin'ny mpilalao invité (jereo
      // recomputeStartCountdown ao ModalRoom.vue: tsy miverina ho null
      // ny "startCountdown"-ny raha tsy miova ny "startingAt" navoakan'ny
      // server), mandra-panindrian'ny Hôte ilay bokotra indray.
      if (occupied.length < 2) {
        await roomRef.update({ startingAt: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {})
        res.status(400).json({ message: 'Il faut au moins 2 joueurs.' })
        return
      }
      const allReady = occupied.every(s => s.ready || s.uid === room.hostUid)
      if (!allReady) {
        await roomRef.update({ startingAt: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() }).catch(() => {})
        res.status(400).json({ message: 'Tous les joueurs doivent être prêts.' })
        return
      }

      // Raha tsy "L'hôte choisit la couleur" (colorPickEnabled) — na
      // satria salon PUBLIC (tsy misy mot de passe), na satria PRIVÉ
      // fa tsy activé io option io — dia toerana (couleur) kisendrasendra
      // no ametrahana ny mpilalao rehetra, mitovy tanteraka amin'ny
      // Multijoueur (jereo randomizeMatchSlots).
      if (!room.private || !room.colorPickEnabled) {
        slots = randomizeMatchSlots(slots)
      }

      await roomRef.update({ status: 'playing', slots, startingAt: null, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
      res.status(200).json({ success: true })
      return
    }

    res.status(400).json({ message: 'Action inconnue.' })
  } catch (err) {
    console.error('api/room.js error:', err)
    res.status(500).json({ message: "Impossible de se connecter au serveur. Réessayez." })
  }
}
