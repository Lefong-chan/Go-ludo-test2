// api/game.js
// ─────────────────────────────────────────────────────────────
// Ity fichier ity dia miandraikitra ny lojika an'ny lalao mihitsy
// (fihodinan'ny roll dice sy ny valin'ny roll tsirairay) — mitovy
// "backend" (Firestore, "rooms/{roomId}") amin'i api/room.js (izay
// mbola miandraikitra ny "salon": slots/stake/status/sns), fa io
// "room.game" (sub-objet vaovao ao anaty document "rooms/{roomId}"
// ihany, tsy collection manokana) no toerana itehirizana ny statut
// an'ny lalao mandritra ny fotoana (turnOrder/turnIndex/pendingValue/
// lastRoll — jereo eo ambany).
//
// ── Lojika ("valin'ny roll dia ny SERVER ihany no mitantana azy, ny
//    client dia mampiseho fotsiny") ──────────────────────────────────
// "pendingValue" — ilay isa (1-6) VOAOMANINA MIALOHA ho an'ilay
// mpilalao manaraka HANAO roll (ampiasain'ny Game.vue "prefetch": efa
// mipetraka ao amin'ny client (avy amin'ny polling "get-state")
// ALOHAN'NY hanindriany ny dice-ny, ka rehefa tsindriana dia miseho
// avy hatrany (tsy miandry valin'ny server intsony amin'io fotoana
// io) ny "roll") — ary "lastRoll" no ampahafantarana NY MPILALAO HAFA
// REHETRA (polling koa) fa vao avy nanao roll ny mpilalao iray
// (mba hahitany ny animation/valiny eo amin'ny écran-ny manokana koa,
// tsy izy ihany no mahita).
//
// ── Filaharan'ny roll (turnOrder) ────────────────────────────────────
// Mifototra amin'ny toeran'ny 4 "corner" tena izy eo amin'ny board
// (jereo Game.vue): slot 0=Rouge (ambony-havia), 1=Vert (ambony-
// havanana), 2=Bleu (ambany-havia), 3=Jaune (ambany-havanana) — ny
// fihodinana "clockwise" (mira amin'ny fandehan'ny lalao Ludo tena
// izy) manodidina an'ireo 4 "corner" ireo dia: Rouge(ambony-havia) →
// Vert(ambony-havanana) → Jaune(ambany-havanana) → Bleu(ambany-havia)
// → miverina Rouge, izany hoe filaharan'ny INDEX slot: [0, 1, 3, 2].
// Raha misy toerana tsy misy mpilalao (2/3 mpilalao), dia esorina
// tsotra amin'io filaharana io izy (CANONICAL_ORDER.filter), ka
// mitazona ny filaharana "clockwise" an'ireo mpilalao TENA misy ihany
// — mitovy amin'ny fihodinana efa nolazaina (4 mpilalao: manga→mena→
// maintso→mavo→manga; 3 mpilalao, tsy misy mavo: maintso→manga→mena→
// maintso). Ny mpandray ny roll voalohany dia kisendrasendra (Math.
// random) isaky ny fanombohan'ny lalao iray.
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

// slots[0]=Rouge, [1]=Vert, [2]=Bleu, [3]=Jaune (mitovy amin'i api/room.js).
const CANONICAL_ORDER = [0, 1, 3, 2]

// "randomDice(sixStreak)" — nangatahin'ny mpampiasa: "cache" (P(6),
// mitombo arakaraka ny isan'ny "6" nifanesy efa nataon'ilay mpilalao
// mandritra ny tour tsy tapaka ankehitriny — 0, 1, na 2, jereo action
// "roll" etsy ambany):
//  - 0 (roll voalohany amin'ity tour ity): 40% ny mety hisian'ny "6".
//  - 1 (efa nahazo "6" indray mandeha): 60%.
//  - 2 (efa nahazo "6" indroa misesy — ity "roll" ity no hamantarana
//    raha 6 fahatelo misesy): 80%.
// Ny 5 hafa (1-5, rehefa tsy "6" ny valiny) dia mitovy indrindra ny
// mety hiseho (uniforme amin'ny sisa aorian'ny "6").
function randomDice(sixStreak = 0) {
  const p6 = sixStreak >= 2 ? 0.8 : sixStreak === 1 ? 0.6 : 0.4
  if (Math.random() < p6) return 6
  return 1 + Math.floor(Math.random() * 5)
}

function computeTurnOrder(slots) {
  return CANONICAL_ORDER.filter(i => !!(slots && slots[i]))
}

function freshGame(slots) {
  const turnOrder = computeTurnOrder(slots)
  return {
    turnOrder,
    turnIndex: turnOrder.length ? Math.floor(Math.random() * turnOrder.length) : 0,
    pendingValue: randomDice(0),
    lastRoll: null,
    // "piecesOut[i]" — isan'ny pion (0-4) efa nivoaka ny "yard" ho an'ny
    // slot i (0=Rouge,1=Vert,2=Bleu,3=Jaune) — mitombo iray isaky ny
    // manao roll "6" ny mpilalao ao amin'io slot io (raha mbola <4).
    // Ity "MVP" ity dia mijanona eo amin'ny "cellule fidirana" iray
    // an'ny couleur tsirairay foana (tsy mbola misy fizarazarana
    // manaraka ny làlana manontolo, izay tsy notakian'ny cahier des
    // charges nomena).
    piecesOut: [0, 0, 0, 0],
    // "rollSeq" — isa mitombo iray isaky ny roll TSIRAIRAY (na mitohy
    // amin'ilay mpilalao ihany ny tour aza — "6" — na mifindra any
    // amin'olon-kafa), mba hahafahan'ny client (Game.vue, applyGameState)
    // mahita fa nisy roll vaovao na dia TSY miova aza ny "turnIndex"
    // (jereo action "roll" etsy ambany — "6" dia mijanona amin'ilay
    // mpilalao ihany ny tour, ka "turnIndex" tsy miova, fa "rollSeq" no
    // manamarina fa nisy zavatra vaovao).
    rollSeq: 0,
    // "sixStreak" — isan'ny "6" nifanesy efa nataon'ilay mpilalao
    // "activeSlotIndex" ankehitriny, mandritra ny tour tsy tapaka
    // ankehitriny (0, 1, na 2) — miverina 0 isaky ny mifindra amin'ny
    // mpilalao hafa ny tour. Ampiasain'ny "randomDice" etsy ambony (P(6)
    // arakaraka azy io) sy ny action "roll" (hamantarana ny "6" fahatelo
    // misesy, izay TSY hamoaka pion na hampitohy ny tour intsony).
    sixStreak: 0,
  }
}

// "ensureGame" — raha mbola tsy misy "room.game" (voalohan'ny "get-
// state"/"roll" antsoina taorian'ny "start-game"), dia amoronina
// (kisendrasendra ny mpandray ny roll voalohany) sy tehirizina eo
// noho eo (tx.update) — atao ao anaty "transaction" mba tsy hisy
// "race condition" raha samy mety hiantso azy io miaraka ny mpilalao
// maro (isaky ny mahita fa mbola tsy misy "game" izy ireo). TSY misy
// fifehezana raha misy mpilalao miala mandritra ny lalao (ny slot-ny
// dia mijanona ao anaty "turnOrder" hatrany, ka raha sendra tonga ny
// tour-ny dia hijanona eo io — tsy zavatra notakian'ny cahier des
// charges nomena, ka tsy natao eto).
function ensureGame(tx, roomRef, room) {
  if (room.game && Array.isArray(room.game.turnOrder) && room.game.turnOrder.length) {
    return room.game
  }
  const game = freshGame(room.slots)
  tx.update(roomRef, { game, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
  return game
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
  const roomId = body.roomId

  if (!uid || typeof uid !== 'string') {
    res.status(400).json({ message: 'Session invalide.' })
    return
  }
  if (!roomId || typeof roomId !== 'string') {
    res.status(400).json({ message: 'Salon invalide.' })
    return
  }

  try {
    const adm = getAdmin()
    const db = adm.firestore()
    const roomRef = db.collection('rooms').doc(roomId)

    // ── "get-state" — polling (jereo Game.vue), mba hahazoana ny
    // "turnOrder"/"turnIndex" (iza no tour-ny izao) sy ny "pendingValue"
    // (prefetch ho an'ilay mpilalao manaraka) ary ny "lastRoll" (mba
    // hahitan'ny mpilalao hafa ny roll vao natao). ──────────────────
    if (action === 'get-state') {
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef)
        if (!snap.exists) return { error: 'room-gone' }
        const room = snap.data()
        if (room.status !== 'playing') return { success: true, game: null }
        const game = ensureGame(tx, roomRef, room)
        return { success: true, game }
      })
      if (result.error === 'room-gone') { res.status(404).json({ message: 'Ce salon n\'existe plus.' }); return }
      res.status(200).json(result)
      return
    }

    // ── "roll" — antsoin'ny mpilalao (Game.vue → Dice.vue "press")
    // rehefa tsindriany ny dice-ny manokana: manamarina fa tena tour-ny
    // marina io (tsy azo antoka ny "interactive" client-side irery,
    // satria mety ho "obsolète" kely noho ny polling — ny SERVER no
    // "source of truth" farany).
    //
    // "turnContinues" (nangatahin'ny mpampiasa): raha "6" ny valiny
    // (game.pendingValue, efa "prefetch" — jereo ny fanazavana etsy
    // ambony) DIA MIJANONA amin'ilay mpilalao ihany ny tour (turnIndex
    // TSY MIOVA), ka mbola afaka manao roll indray izy — AFA-TSY raha
    // ity no 6 FAHATELO MISESY (game.sixStreak efa 2 talohan'ity roll
    // ity): amin'izay dia TSY hamoaka pion intsony ilay roll (na dia
    // "6" aza) ary mifindra amin'ny mpilalao manaraka avy hatrany ny
    // tour, mitovy tanteraka amin'ny roll tsy 6. ──────────────────────
    if (action === 'roll') {
      const result = await db.runTransaction(async (tx) => {
        const snap = await tx.get(roomRef)
        if (!snap.exists) return { error: 'room-gone' }
        const room = snap.data()
        if (room.status !== 'playing') return { error: 'not-playing' }

        const slots = room.slots || [null, null, null, null]
        const mySlotIndex = slots.findIndex(s => s && s.uid === uid)
        if (mySlotIndex === -1) return { error: 'not-in-room' }

        const game = ensureGame(tx, roomRef, room)
        const activeSlotIndex = game.turnOrder[game.turnIndex]
        if (mySlotIndex !== activeSlotIndex) return { error: 'not-your-turn' }

        const rolledValue  = game.pendingValue
        const priorStreak  = game.sixStreak || 0
        const isSix        = rolledValue === 6
        const isVoidThirdSix = isSix && priorStreak >= 2
        const turnContinues  = isSix && !isVoidThirdSix

        // "6" (fa tsy 6 fahatelo misesy) → mamoaka pion iray (raha
        // mbola misy ao anaty "yard", <4) ho an'ilay slot nanao ilay
        // roll — "pieceOutIndex" (0-3, ilay pion faha-N nivoaka) dia
        // tehirizina ao anaty "lastRoll" mba hahafahan'ny client
        // (Game.vue) mahalala raha tokony hampiseho ny animation
        // fivoahan'ny pion (tsy ny valeur ihany).
        const piecesOut = Array.isArray(game.piecesOut) ? game.piecesOut.slice() : [0, 0, 0, 0]
        let pieceOutIndex = null
        if (turnContinues && piecesOut[activeSlotIndex] < 4) {
          pieceOutIndex = piecesOut[activeSlotIndex]
          piecesOut[activeSlotIndex] += 1
        }

        const nextTurnIndex = turnContinues ? game.turnIndex : (game.turnIndex + 1) % game.turnOrder.length
        const nextSixStreak = turnContinues ? priorStreak + 1 : 0

        const newGame = {
          turnOrder:    game.turnOrder,
          turnIndex:    nextTurnIndex,
          pendingValue: randomDice(nextSixStreak),
          lastRoll:     { slotIndex: activeSlotIndex, value: rolledValue, at: Date.now(), pieceOutIndex },
          piecesOut,
          // "rollSeq" — mitombo isaky ny roll TSIRAIRAY (na dia
          // "turnIndex" tsy miova aza, "6" mitohy tour — jereo ny
          // fanazavana ao amin'ny freshGame etsy ambony).
          rollSeq:      (game.rollSeq || 0) + 1,
          sixStreak:    nextSixStreak,
        }
        tx.update(roomRef, { game: newGame, updatedAt: admin.firestore.FieldValue.serverTimestamp() })
        return { success: true, game: newGame }
      })
      if (result.error === 'room-gone')    { res.status(404).json({ message: 'Ce salon n\'existe plus.' }); return }
      if (result.error === 'not-playing')  { res.status(400).json({ message: 'La partie n\'est pas en cours.' }); return }
      if (result.error === 'not-in-room')  { res.status(400).json({ message: 'Vous n\'êtes pas dans ce salon.' }); return }
      if (result.error === 'not-your-turn') { res.status(403).json({ message: 'Ce n\'est pas votre tour.' }); return }
      res.status(200).json(result)
      return
    }

    res.status(400).json({ message: 'Action inconnue.' })
  } catch (err) {
    console.error('api/game.js error:', err)
    res.status(500).json({ message: 'Impossible de se connecter au serveur. Réessayez.' })
  }
}
