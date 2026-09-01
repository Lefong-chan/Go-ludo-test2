<template>
<div class="game-page">

  <!-- Button eo ambony afovoany (position:fixed — tsy manimba ny
       deplacement/fandrindran'ny table) → mampiseho ModalSettings.vue
       (mode "inGame": "Quitter" fa tsy "Déconnexion"). -->
  <button class="game-menu-btn" @click="showGameMenu = true" aria-label="Menu">
    <span class="material-icons">menu</span>
  </button>
  <ModalSettings :show="showGameMenu" in-game @close="showGameMenu = false" @quit-game="onQuitGame" />

<div class="game-wrapper">

  <!-- ===== TOP ROW ===== -->
  <div class="dice-row">

    <!-- Player 2 — Red (left) -->
    <div class="dice-holder" :class="{ 'dice-holder-empty': !hasPlayer.red }">
      <div class="dice-pair">
        <div class="player-avatar av-red">
          <div class="av-inner">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
              <circle cx="12" cy="7.5" r="4.3" fill="white" opacity="0.93"/>
              <path d="M6 22 Q6 13.5 12 13.5 Q18 13.5 18 22 Z" fill="white" opacity="0.93"/>
            </svg>
          </div>
        </div>
        <div class="dice-btn-wrap dw-red">
          <div class="dice-frame" :class="{ 'dice-frame-dim': dimmed.red }">
            <Dice v-if="hasPlayer.red" ref="diceRedRef" :interactive="interactive.red" @roll-request="onRollRequest('red')" />
          </div>
        </div>
      </div>
      <div class="player-name lbl-red">{{ names.red }}</div>
    </div>

    <!-- Player 3 — Green (right) -->
    <div class="dice-holder" :class="{ 'dice-holder-empty': !hasPlayer.green }">
      <div class="dice-pair">
        <div class="dice-btn-wrap dw-green">
          <div class="dice-frame" :class="{ 'dice-frame-dim': dimmed.green }">
            <Dice v-if="hasPlayer.green" ref="diceGreenRef" :interactive="interactive.green" @roll-request="onRollRequest('green')" />
          </div>
        </div>
        <div class="player-avatar av-green">
          <div class="av-inner">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
              <circle cx="12" cy="7.5" r="4.3" fill="white" opacity="0.93"/>
              <path d="M6 22 Q6 13.5 12 13.5 Q18 13.5 18 22 Z" fill="white" opacity="0.93"/>
            </svg>
          </div>
        </div>
      </div>
      <div class="player-name lbl-green">{{ names.green }}</div>
    </div>

  </div>

  <!-- ===== BOARD ===== -->
  <div class="board" ref="boardRef">

    <!-- ROW 1: red | top-path | green -->
    <div class="row">
      <div class="red-box">
        <div class="white-box" ref="redHomeRef">
          <div class="red circle"><img v-if="hasPlayer.red && isPieceHome('red', 1)" src="../assets/images/pieces/red_piece.png" class="piece-img" alt="Pion rouge"></div>
          <div class="red circle"><img v-if="hasPlayer.red && isPieceHome('red', 2)" src="../assets/images/pieces/red_piece.png" class="piece-img" alt="Pion rouge"></div>
          <div class="red circle"><img v-if="hasPlayer.red && isPieceHome('red', 3)" src="../assets/images/pieces/red_piece.png" class="piece-img" alt="Pion rouge"></div>
          <div class="red circle"><img v-if="hasPlayer.red && isPieceHome('red', 4)" src="../assets/images/pieces/red_piece.png" class="piece-img" alt="Pion rouge"></div>
        </div>
      </div>
      <div class="cell-container">
        <div class="row"><div class="cell"></div><div class="cell"></div><div class="cell"></div></div>
        <div class="row"><div class="cell"></div><div class="cell green"></div><div class="cell green entry-cell" ref="entryGreenRef"><div v-if="dockedCount.green > 0" class="entry-piece-row" :class="{ 'entry-piece-row-multi': dockedCount.green > 1 }"><img v-for="n in dockedCount.green" :key="n" src="../assets/images/pieces/green_piece.png" class="entry-piece-img" alt="Pion vert"></div></div></div>
        <div class="row"><div class="cell"></div><div class="cell green"></div><div class="cell"></div></div>
        <div class="row"><div class="cell"></div><div class="cell green"></div><div class="cell"></div></div>
        <div class="row"><div class="cell"></div><div class="cell green"></div><div class="cell"></div></div>
        <div class="row"><div class="cell"></div><div class="cell green"></div><div class="cell"></div></div>
      </div>
      <div class="green-box">
        <div class="white-box" ref="greenHomeRef">
          <div class="green circle"><img v-if="hasPlayer.green && isPieceHome('green', 1)" src="../assets/images/pieces/green_piece.png" class="piece-img" alt="Pion vert"></div>
          <div class="green circle"><img v-if="hasPlayer.green && isPieceHome('green', 2)" src="../assets/images/pieces/green_piece.png" class="piece-img" alt="Pion vert"></div>
          <div class="green circle"><img v-if="hasPlayer.green && isPieceHome('green', 3)" src="../assets/images/pieces/green_piece.png" class="piece-img" alt="Pion vert"></div>
          <div class="green circle"><img v-if="hasPlayer.green && isPieceHome('green', 4)" src="../assets/images/pieces/green_piece.png" class="piece-img" alt="Pion vert"></div>
        </div>
      </div>
    </div>

    <!-- ROW 2: left-path | destination | right-path -->
    <div class="row middle">
      <div class="cell-container">
        <div class="row">
          <div class="cell"></div><div class="cell red entry-cell" ref="entryRedRef"><div v-if="dockedCount.red > 0" class="entry-piece-row" :class="{ 'entry-piece-row-multi': dockedCount.red > 1 }"><img v-for="n in dockedCount.red" :key="n" src="../assets/images/pieces/red_piece.png" class="entry-piece-img" alt="Pion rouge"></div></div>
          <div class="cell"></div><div class="cell"></div>
          <div class="cell"></div><div class="cell"></div>
        </div>
        <div class="row">
          <div class="cell"></div><div class="cell red"></div>
          <div class="cell red"></div><div class="cell red"></div>
          <div class="cell red"></div><div class="cell red"></div>
        </div>
        <div class="row">
          <div class="cell"></div><div class="cell"></div>
          <div class="cell"></div><div class="cell"></div>
          <div class="cell"></div><div class="cell"></div>
        </div>
      </div>
      <div class="destination"></div>
      <div class="cell-container">
        <div class="row">
          <div class="cell"></div><div class="cell"></div>
          <div class="cell"></div><div class="cell"></div>
          <div class="cell"></div><div class="cell"></div>
        </div>
        <div class="row">
          <div class="cell yellow"></div><div class="cell yellow"></div>
          <div class="cell yellow"></div><div class="cell yellow"></div>
          <div class="cell yellow"></div><div class="cell"></div>
        </div>
        <div class="row">
          <div class="cell"></div><div class="cell"></div>
          <div class="cell"></div><div class="cell"></div>
          <div class="cell yellow entry-cell" ref="entryYellowRef"><div v-if="dockedCount.yellow > 0" class="entry-piece-row" :class="{ 'entry-piece-row-multi': dockedCount.yellow > 1 }"><img v-for="n in dockedCount.yellow" :key="n" src="../assets/images/pieces/yellow_piece.png" class="entry-piece-img" alt="Pion jaune"></div></div><div class="cell"></div>
        </div>
      </div>
    </div>

    <!-- ROW 3: blue | bottom-path | yellow -->
    <div class="row">
      <div class="blue-box">
        <div class="white-box" ref="blueHomeRef">
          <div class="blue circle"><img v-if="hasPlayer.blue && isPieceHome('blue', 1)" src="../assets/images/pieces/blue_piece.png" class="piece-img" alt="Pion bleu"></div>
          <div class="blue circle"><img v-if="hasPlayer.blue && isPieceHome('blue', 2)" src="../assets/images/pieces/blue_piece.png" class="piece-img" alt="Pion bleu"></div>
          <div class="blue circle"><img v-if="hasPlayer.blue && isPieceHome('blue', 3)" src="../assets/images/pieces/blue_piece.png" class="piece-img" alt="Pion bleu"></div>
          <div class="blue circle"><img v-if="hasPlayer.blue && isPieceHome('blue', 4)" src="../assets/images/pieces/blue_piece.png" class="piece-img" alt="Pion bleu"></div>
        </div>
      </div>
      <div class="cell-container">
        <div class="row"><div class="cell"></div><div class="cell blue"></div><div class="cell"></div></div>
        <div class="row"><div class="cell"></div><div class="cell blue"></div><div class="cell"></div></div>
        <div class="row"><div class="cell"></div><div class="cell blue"></div><div class="cell"></div></div>
        <div class="row"><div class="cell"></div><div class="cell blue"></div><div class="cell"></div></div>
        <div class="row"><div class="cell blue entry-cell" ref="entryBlueRef"><div v-if="dockedCount.blue > 0" class="entry-piece-row" :class="{ 'entry-piece-row-multi': dockedCount.blue > 1 }"><img v-for="n in dockedCount.blue" :key="n" src="../assets/images/pieces/blue_piece.png" class="entry-piece-img" alt="Pion bleu"></div></div><div class="cell blue"></div><div class="cell"></div></div>
        <div class="row"><div class="cell"></div><div class="cell"></div><div class="cell"></div></div>
      </div>
      <div class="yellow-box">
        <div class="white-box" ref="yellowHomeRef">
          <div class="yellow circle"><img v-if="hasPlayer.yellow && isPieceHome('yellow', 1)" src="../assets/images/pieces/yellow_piece.png" class="piece-img" alt="Pion jaune"></div>
          <div class="yellow circle"><img v-if="hasPlayer.yellow && isPieceHome('yellow', 2)" src="../assets/images/pieces/yellow_piece.png" class="piece-img" alt="Pion jaune"></div>
          <div class="yellow circle"><img v-if="hasPlayer.yellow && isPieceHome('yellow', 3)" src="../assets/images/pieces/yellow_piece.png" class="piece-img" alt="Pion jaune"></div>
          <div class="yellow circle"><img v-if="hasPlayer.yellow && isPieceHome('yellow', 4)" src="../assets/images/pieces/yellow_piece.png" class="piece-img" alt="Pion jaune"></div>
        </div>
      </div>
    </div>

    <!-- "Pion" mihisaka (0.3s) rehefa 6 no niseho — jereo animatePieceExit
         ao <script>: position:absolute mifototra amin'ny ".board" (izay
         "position:relative"), left/top/width/height JS-computed
         (getBoundingClientRect) mba ho marina na inona na inona habe
         écran (responsive), ary CSS transition no mampiseho ny
         fihisahana sy ny fihenan'ny taille. -->
    <img
      v-if="travelPiece.active"
      class="piece-travel"
      :src="travelPiece.src"
      :style="travelPiece.style"
      alt=""
    >

  </div><!-- end .board -->

  <!-- ===== BOTTOM ROW ===== -->
  <div class="dice-row">

    <!-- Player 1 — Blue (left) -->
    <div class="dice-holder" :class="{ 'dice-holder-empty': !hasPlayer.blue }">
      <div class="player-name lbl-blue">{{ names.blue }}</div>
      <div class="dice-pair">
        <div class="player-avatar av-blue">
          <div class="av-inner">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
              <circle cx="12" cy="7.5" r="4.3" fill="white" opacity="0.93"/>
              <path d="M6 22 Q6 13.5 12 13.5 Q18 13.5 18 22 Z" fill="white" opacity="0.93"/>
            </svg>
          </div>
        </div>
        <div class="dice-btn-wrap dw-blue">
          <div class="dice-frame" :class="{ 'dice-frame-dim': dimmed.blue }">
            <Dice v-if="hasPlayer.blue" ref="diceBlueRef" :interactive="interactive.blue" @roll-request="onRollRequest('blue')" />
          </div>
        </div>
      </div>
    </div>

    <!-- Player 4 — Yellow (right) -->
    <div class="dice-holder" :class="{ 'dice-holder-empty': !hasPlayer.yellow }">
      <div class="player-name lbl-yellow">{{ names.yellow }}</div>
      <div class="dice-pair">
        <div class="dice-btn-wrap dw-yellow">
          <div class="dice-frame" :class="{ 'dice-frame-dim': dimmed.yellow }">
            <Dice v-if="hasPlayer.yellow" ref="diceYellowRef" :interactive="interactive.yellow" @roll-request="onRollRequest('yellow')" />
          </div>
        </div>
        <div class="player-avatar av-yellow">
          <div class="av-inner">
            <svg viewBox="0 0 24 24" width="30" height="30" fill="none">
              <circle cx="12" cy="7.5" r="4.3" fill="white" opacity="0.93"/>
              <path d="M6 22 Q6 13.5 12 13.5 Q18 13.5 18 22 Z" fill="white" opacity="0.93"/>
            </svg>
          </div>
        </div>
      </div>
    </div>

  </div>

</div>
</div>
</template>

<script setup>
import { computed, ref, reactive, nextTick, onMounted, onUnmounted } from 'vue'
import Dice from './Dice.vue'
import ModalSettings from './modals/ModalSettings.vue'
import { fetchWithTimeout } from '../utils/network'
// Sary ny pion — import mivantana (fa tsy "src" tsotra ao amin'ny
// <template>) satria ilaina ao anaty JS (travelPiece.src, jereo
// animatePieceExit eo ambany), tsy amin'ny <template> fotsiny.
import redPieceImg    from '../assets/images/pieces/red_piece.png'
import greenPieceImg  from '../assets/images/pieces/green_piece.png'
import bluePieceImg   from '../assets/images/pieces/blue_piece.png'
import yellowPieceImg from '../assets/images/pieces/yellow_piece.png'

// "slots" dia ny "room.slots" avy amin'ny ModalRoom.vue / room.js:
// slots[0] = Rouge, slots[1] = Vert, slots[2] = Bleu, slots[3] = Jaune
// (jereo COLORS ao amin'ny ModalRoom.vue — io filaharana io no tsy
// miova). Ny anaran'ny mpilalao (username) dia alaina eo amin'ny
// "slot" tsirairay, ka soloana ny "Player 1 / 2 / 3 / 4" tsy miova.
const props = defineProps({
  slots: { type: Array, default: () => [] },
  // UID an'ny mpampiasa mijery ity Game.vue ity — ampiasaina hamantarana
  // izay couleur "azy" (jereo isMine), mba tsy hahazoany afaka mitsindry
  // ny dice an'ny adversaire.
  myUid: { type: String, default: '' },
  // ID an'ny room mandeha izao — ilaina rehefa "Quitter" (leave-room).
  roomId: { type: String, default: '' },
})

const emit = defineEmits(['quit-game'])

// ── Menu (button eo ambony afovoany) → ModalSettings (mode "inGame") ──
const showGameMenu = ref(false)
const quitting     = ref(false)

const onQuitGame = async () => {
  if (quitting.value) return
  quitting.value = true
  try {
    const token = localStorage.getItem('user_token')
    await fetchWithTimeout('/api/room?action=leave-room', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ uid: props.myUid, roomId: props.roomId }),
    })
  } catch { /* mijanona miala ihany na dia tsy nahomby aza ny API */ }
  quitting.value      = false
  showGameMenu.value  = false
  emit('quit-game')
}

const nameFor = (index, fallback) => props.slots?.[index]?.username || fallback

const names = computed(() => ({
  red:    nameFor(0, 'Joueur 2'),
  green:  nameFor(1, 'Joueur 3'),
  blue:   nameFor(2, 'Joueur 1'),
  yellow: nameFor(3, 'Joueur 4'),
}))

// Raha misy toerana (couleur) tsy misy mpilalao tokoa (Multijoueur na
// Créer amin'ny 2/3 mpilalao), dia tsy aseho mihitsy ilay soratra
// "Joueur .." sy ilay cadre miloko (dice-holder manontolo) mifanaraka
// aminy — ny misy mpilalao marina ihany no aseho.
const hasPlayer = computed(() => ({
  red:    !!props.slots?.[0],
  green:  !!props.slots?.[1],
  blue:   !!props.slots?.[2],
  yellow: !!props.slots?.[3],
}))

// Ny couleur mifanaraka amin'ny "myUid" ihany no mety ho "interactive"
// (azo atsindrina) amin'ny Dice.vue — tsy azon'ny mpampiasa atsindrina
// ny dice an'ny mpilalao hafa. Ampiasain'ny computed "interactive" eo
// ambany (miaraka amin'ny "tour"/"activeSlotIndex") — jereo eo.
const isMine = computed(() => ({
  red:    !!props.slots?.[0] && props.slots[0].uid === props.myUid,
  green:  !!props.slots?.[1] && props.slots[1].uid === props.myUid,
  blue:   !!props.slots?.[2] && props.slots[2].uid === props.myUid,
  yellow: !!props.slots?.[3] && props.slots[3].uid === props.myUid,
}))

// ══════════════════════════════════════════════════════════════════
// ── Roll dice : tour-tour, tantanan'ny SERVER (api/game.js) ─────────
// ══════════════════════════════════════════════════════════════════
// "SLOT_INDEX"/"COLOR_BY_SLOT" — mitovy filaharana amin'ny "slots" prop
// (0=Rouge,1=Vert,2=Bleu,3=Jaune, jereo names/hasPlayer/isMine etsy
// ambony) sy amin'ny "CANONICAL_ORDER" ao amin'i api/game.js.
const SLOT_INDEX    = { red: 0, green: 1, blue: 2, yellow: 3 }
const COLOR_BY_SLOT = ['red', 'green', 'blue', 'yellow']

const API_GAME = '/api/game'
const authHeaders = () => {
  const token = localStorage.getItem('user_token')
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}
const callGame = async (action, extra = {}) => {
  try {
    const res = await fetchWithTimeout(`${API_GAME}?action=${action}`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ uid: props.myUid, roomId: props.roomId, ...extra }),
    })
    return await res.json().catch(() => ({}))
  } catch {
    return null
  }
}

// Refs Dice.vue (imperative "playRoll", jereo Dice.vue) isaky ny couleur.
const diceRedRef    = ref(null)
const diceGreenRef  = ref(null)
const diceBlueRef   = ref(null)
const diceYellowRef = ref(null)
const diceRefs = { red: diceRedRef, green: diceGreenRef, blue: diceBlueRef, yellow: diceYellowRef }

// ── Refs ho an'ny animation "fivoahan'ny pion" (roll=6, jereo
// animatePieceExit eo ambany): "boardRef" no "position:relative"
// itokisan'ny sary "piece-travel" mihisaka (position:absolute mifototra
// aminy); "XHomeRef" (.white-box, misy ny 4 pion "an-trano") sy
// "entryXRef" (ilay "cadre kely" hidiran'ny pion, jereo <template>
// etsy ambony) no toerana alaina ny "getBoundingClientRect()" (FROM/TO)
// amin'ny animation.
const boardRef       = ref(null)
const redHomeRef     = ref(null)
const greenHomeRef   = ref(null)
const blueHomeRef    = ref(null)
const yellowHomeRef  = ref(null)
const homeRefs  = { red: redHomeRef, green: greenHomeRef, blue: blueHomeRef, yellow: yellowHomeRef }
const entryRedRef    = ref(null)
const entryGreenRef  = ref(null)
const entryBlueRef   = ref(null)
const entryYellowRef = ref(null)
const entryRefs = { red: entryRedRef, green: entryGreenRef, blue: entryBlueRef, yellow: entryYellowRef }
const PIECE_IMG = { red: redPieceImg, green: greenPieceImg, blue: bluePieceImg, yellow: yellowPieceImg }

// "turnOrder"/"turnIndex"/"pendingValue" — mitovy anarana amin'ny
// "room.game" avy amin'ny server (jereo api/game.js), havaozina isaky
// ny polling (fetchGameState). "pendingValue" no "prefetch": ilay isa
// (1-6) VOAOMANIN'NY SERVER MIALOHA ho an'ilay mpilalao IZAO TOUR-NY
// IZAO — efa mipetraka eto (client) ALOHAN'NY hanindriany ny dice-ny,
// ka rehefa tsindriana (onRollRequest) dia tsy misy fiandrasana valin'
// ny server intsony (efa fantatra mialoha).
const turnOrder    = ref([])
const turnIndex    = ref(0)
const pendingValue = ref(null)

// "activeSlotIndex" — ny "tour" azo antoka amin'ity client ity
// ANKEHITRINY (mety "miova aoriana" kely noho ny "turnIndex" tena
// izy any amin'ny server — jereo playRollSequence: mijanona ho an'ilay
// nahazo ny tour teo aloha mandritra ny 1s "flip + grace" mba
// hahitan'ny mpilalao mazava tsara ny valiny alohan'ny hifindran'ny
// tour, dia io ihany no mamaritra ny "interactive"/"dimmed" eo ambany).
const activeSlotIndex = ref(null)
// "knownTurnIndex" — ny "turnIndex" (server) farany efa "voamarina"
// tamin'ny alalan'ny POLLING (tsy ovaina mihitsy avy amin'ny roll
// ataoko manokana, jereo BUGFIX ao amin'ny fanazavana an'ny
// "selfRollSlotIndex" eo ambany) — misakana tsy hiverimberina milalao
// animation efa vita (jereo applyGameState).
let knownTurnIndex = null
// "selfRollSlotIndex" — BUGFIX: teo aloha dia "knownTurnIndex" ihany
// koa no ovaina AVY HATRANY (optimiste) tao amin'ny "onRollRequest",
// mba tsy hamerina milalao ny animation-ko manokana rehefa mahatratra
// ny "poll" — nefa io no niteraka ilay bug ("animation miverimberina
// / ny an'ny adversaire indraindray no miova"): raha nisy "poll" efa
// "an-dalana" (mbola tsy nahazo ny valin'ny "roll" navoakako) tonga
// taorian'io, dia "server tsy mbola nandroso" (mbola ilay "turnIndex"
// TALOHA) — ka "newTurnIndex !== knownTurnIndex" (efa "an-tsoratra
// mialoha" ilay knownTurnIndex) dia TRUE tsy nahitsy, ka "lastRoll"
// TALOHA (an'ny mpilalao hafa, indraindray) no nalefa milalao
// animation indray.
//
// Vahaolana: "knownTurnIndex" dia AVERINA ho voamarin'ny POLLING
// ihany foana (tsy misy "optimiste" intsony) — ny "selfRollSlotIndex"
// eto kosa no mitahiry NY SLOT nataoko roll manokana, mandra-
// pahatongan'ny "poll" MARINA mifanaraka aminy (jereo applyGameState:
// raha io no "lastRoll.slotIndex" hita, dia tsy averina milalao ny
// animation-ny — efa naseho teo aloha — fa ny "knownTurnIndex" sy
// "activeSlotIndex" ihany no havaozina/hamarinina).
let selfRollSlotIndex = null

const diceAnimating = reactive({ red: false, green: false, blue: false, yellow: false })
// "postRollLock" — mandritra ny 1s manontolo (flip 500ms + grace 500ms)
// aorian'ny roll iray (an-tenako na an'olon-kafa): tsy azo atsindrina
// io couleur io mandritra izany, na dia efa "tour-ny" ihany aza araka
// ny "activeSlotIndex" (jereo "interactive" eo ambany).
const postRollLock  = reactive({ red: false, green: false, blue: false, yellow: false })
// "dimmed" — mihena ny hazavan'ilay "cadre kely" (.dice-frame, tsy ny
// couleur an'ilay dice mihitsy) rehefa tsy tour-ny (jereo CSS
// ".dice-frame-dim" eto ambany, opacity 0.7).
const dimmed = reactive({ red: true, green: true, blue: true, yellow: true })

// Azo atsindrina ihany raha: 1) an'ilay mpampiasa tokoa ilay couleur
// (isMine), 2) tour-ny izao (activeSlotIndex), 3) tsy mandritra ny
// "flip"/"grace" (diceAnimating/postRollLock), 4) efa azo (prefetch)
// ny valiny hasehony (pendingValue).
const interactive = computed(() => {
  const out = {}
  for (const key of COLOR_BY_SLOT) {
    out[key] = !!isMine.value[key] &&
      activeSlotIndex.value === SLOT_INDEX[key] &&
      !diceAnimating[key] && !postRollLock[key] &&
      pendingValue.value != null
  }
  return out
})

// ══════════════════════════════════════════════════════════════════
// ── Fivoahan'ny pion (roll = 6) ──────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
// "piecesOutState[couleur]" — isan'ny pion (0-4) efa nivoaka ny "yard"
// ho an'io couleur io (avy amin'ny server, "room.game.piecesOut[slot]",
// jereo applyGameState/onRollRequest). Ny filaharan'ny fivoahana
// (efa voafaritry ny mpampiasa) dia: ambany-havanana (nth-child 4)
// voalohany, ambany-havia (3) faharoa, ambony-havanana (2) fahatelo,
// ambony-havia (1) fahaefatra — ka ny "isPieceHome" eto ambany no
// mamaha izany ho an'ny <template> (v-if isaky ny 4 pion an-trano).
const piecesOutState = reactive({ red: 0, green: 0, blue: 0, yellow: 0 })
// "dockedCount[couleur]" — isan'ny pion (0-4) miseho MARINA (v-for) any
// amin'ilay "cadre kely" (entry-cell), rehefa vita ny animation
// mihisaka (500ms) — tsy avy hatrany rehefa "piecesOutState" mihitsy
// miova (izay manomboka ny animation, jereo animatePieceExit), fa
// 500ms aty aoriana, mba tsy hisy "double" (pion eo amin'ny roa
// toerana miaraka). Raha "1" ihany, lehibe (130%, PIECE_DOCK_SCALE) sy
// afovoany ilay pion; raha "2" na mihoatra, mihakely ho 90% avokoa
// izy ireo ary mifanindry mifanakaiky (jereo .entry-piece-row-multi
// ao amin'ny <style>).
const dockedCount     = reactive({ red: 0, green: 0, blue: 0, yellow: 0 })
// "travelPiece" — ilay sary "mihisaka" (position:absolute anaty
// ".board", jereo <template>), fehezin'i animatePieceExit eto ambany.
const travelPiece = reactive({ active: false, src: '', style: {} })

// Ny "isPieceHome" dia jerena avy amin'ny <template> (v-if isaky ny 4
// pion tsirairay avy anaty .white-box, position 1=ambony-havia,
// 2=ambony-havanana, 3=ambany-havia, 4=ambany-havanana — mitovy
// filaharana amin'ny 4 <div class="X circle"> ao anaty template).
const isPieceHome = (colorKey, position) => piecesOutState[colorKey] < (5 - position)

// "animatePieceExit" — antsoina (avy amin'ny playRollSequence) rehefa
// 6 no niseho ary mbola misy pion an-trano ho an'io couleur io.
// "pieceOutIndex" (0-3) no ilay pion FAHA-N nivoaka (0=voalohany,
// azo antoka fa "ambany-havanana" satria io no efa nivoaka teo aloha
// raha $piecesOutState$ efa > 0), ka "position" (1-4, filaharana amin'
// ny <template>) dia 4-pieceOutIndex.
//
// Fomba fiasa: 1) alaina (getBoundingClientRect) ny toerana ANKEHITRINY
// an'ilay pion (mbola ao amin'ny "circle" an-trano — ALOHAN'NY hanovana
// ny "piecesOutState", mba mbola eo tokoa izy), sy ny toerana an'ilay
// "cadre kely" (entry cell); 2) apetraka amin'ilay toerana voalohany
// ny "travelPiece" (tsy misy transition, mba tsy hisy "fihetsehana"
// hita); 3) amin'ny "frame" manaraka (requestAnimationFrame), ovaina ho
// ilay toerana faharoa ny style — ny CSS transition (0.3s, jereo
// ".piece-travel") no mampiseho ny fihisahana sy ny fihenan'ny taille
// (98% → 90%) miaraka; 4) miova ho "true" NY "piecesOutState" (manafina
// ilay pion an-trano, jereo isPieceHome) MIVANTANA amin'ny fanombohan'
// ny animation (fa TSY ny "dockedCount", izay miandry ny 500ms mba
// tsy hisy pion eo amin'ny roa toerana miaraka).
// PIECE_SLIDE_MS — 0.5s (nangatahina) ny fahareten'ilay fihisahana.
const PIECE_SLIDE_MS = 500
// PIECE_DOCK_SCALE — ny habean'ilay pion rehefa "docké" (miorina ao
// anaty entry-cell): tafahotra kely ny ambony (poka mihoatra ny
// taipika ambony an'ilay cadre, tahaka ny sary nomen'ny mpampiasa),
// fa ny toerany amin'ny "bottom" (8%, mitovy amin'ny ".piece-img")
// dia tsy miova — "bottom:8%" + "height" lehibe noho 100% dia
// mitombo any ambony ihany (tsy mikasika ny "bottom" anchor).
const PIECE_DOCK_SCALE = 1.3

const animatePieceExit = async (colorKey, pieceOutIndex) => {
  const position = 4 - pieceOutIndex
  const homeEl  = homeRefs[colorKey].value
  const entryEl = entryRefs[colorKey].value
  const board   = boardRef.value
  if (!homeEl || !entryEl || !board) return
  const sourceCircle = homeEl.children[position - 1]
  if (!sourceCircle) return

  const boardRect  = board.getBoundingClientRect()
  const sourceRect = sourceCircle.getBoundingClientRect()
  const targetRect = entryEl.getBoundingClientRect()

  // Mitovy amin'ny convention efa ao amin'ny ".piece-img" (height:98%,
  // bottom:8% — "tsy mikasika ilay taipika bottom").
  const fromSize = sourceRect.height * 0.98
  const fromLeft = sourceRect.left - boardRect.left + sourceRect.width / 2
  const fromTop  = (sourceRect.top - boardRect.top) + sourceRect.height - (sourceRect.height * 0.08) - fromSize

  // "toSize" lehibe kokoa noho ny cadre mihitsy (PIECE_DOCK_SCALE) —
  // "bottom:8%" ihany koa ny fiorenany, ka ny "top" no mitombo any
  // ambony (mipoitra mihoatra ny cadre).
  const toSize = targetRect.height * PIECE_DOCK_SCALE
  const toLeft = targetRect.left - boardRect.left + targetRect.width / 2
  const toTop  = (targetRect.top - boardRect.top) + targetRect.height - (targetRect.height * 0.08) - toSize

  // "width:auto" (tsy "width:<px>" mitovy amin'ny height) — mitovy
  // amin'ny convention an'ny ".piece-img"/".entry-piece-img", mba tsy
  // hisy fanolosana/fanenjehana ("stretch", lasa "matevina") an'ilay
  // sary (izay tsy carré) rehefa ovaina ny "height" mandritra ny
  // transition — ny "height" ihany no "authoritative", ny "width" dia
  // manaraka ny "aspect ratio" an'ilay sary tsotra izao.
  travelPiece.src = PIECE_IMG[colorKey]
  travelPiece.style = {
    left: fromLeft + 'px', top: fromTop + 'px',
    width: 'auto', height: fromSize + 'px',
    transition: 'none',
  }
  travelPiece.active = true
  piecesOutState[colorKey] += 1 // manafina avy hatrany ilay pion an-trano (jereo isPieceHome)

  // BUGFIX ("transition tsy hita"): raha "requestAnimationFrame" tokana
  // ihany no ampiasaina, dia mety hiara-mivoaka amin'ny frame ihany
  // (miaraka amin'ny fanovana DOM ataon'i Vue, izay "asynchrone" ihany
  // koa) ny style "FROM" sy "TO", ka tsy misy transition tena hita (ny
  // navigateur dia "manisy" ny fanovana roa ho iray ihany, tsy mahita
  // ny "FROM" velively izy vao mihodina mankany amin'ny "TO"). Vahaolana:
  // "await nextTick()" (miandry marina ny fanovana DOM ataon'i Vue),
  // ary "double requestAnimationFrame" (miandry marina fa efa "peint"
  // (nasehon'ny navigateur) ilay "FROM" alohan'ny hanovana ho "TO").
  await nextTick()
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      travelPiece.style = {
        left: toLeft + 'px', top: toTop + 'px',
        width: 'auto', height: toSize + 'px',
        transition: `left ${PIECE_SLIDE_MS}ms ease, top ${PIECE_SLIDE_MS}ms ease, height ${PIECE_SLIDE_MS}ms ease`,
      }
    })
  })

  setTimeout(() => {
    travelPiece.active = false
    dockedCount[colorKey] += 1
  }, PIECE_SLIDE_MS)
}

// "playRollSequence" — animation "roll" ho an'ny couleur iray, na avy
// amin'ny fitsindrian'ny tenako manokana (onRollRequest) na "voafantina"
// tamin'ny polling (applyGameState) — mitovy dingana avokoa ny roa:
// 500ms "flip" (Dice.vue → playRoll), aorian'izay 500ms "grace" (mbola
// tsy maizina ny .dice-frame, tsy azo atsindrina na dia efa "disable"
// aza — mba hahitana mazava tsara ny valiny), ary rehefa vita io 1s io
// dia miditra ny "dimmed" ary mifindra amin'ny "nextActiveSlotIndex"
// ny "activeSlotIndex" (izay vao miseho ho "enable" ilay mpilalao
// manaraka). Raha "6" ary misy pion nivoaka (pieceOutIndex != null),
// dia ampidirina eo anelanelan'ny 500ms flip sy ny "grace" ny 300ms
// fihisahan'ny pion (jereo animatePieceExit, PIECE_SLIDE_MS=500ms) +
// 500ms fanampiny — izany hoe 1500ms fa tsy 1000ms no fiandrasana
// alohan'ny hifindran'ny tour.
const playRollSequence = (colorKey, value, nextActiveSlotIndex, pieceOutIndex = null) => {
  diceRefs[colorKey].value?.playRoll(value)
  dimmed[colorKey]        = false
  diceAnimating[colorKey] = true
  postRollLock[colorKey]  = true

  setTimeout(() => {
    diceAnimating[colorKey] = false
    if (pieceOutIndex != null) animatePieceExit(colorKey, pieceOutIndex)
  }, 500)

  const handoffDelay = pieceOutIndex != null ? (500 + PIECE_SLIDE_MS + 500) : 1000
  setTimeout(() => {
    dimmed[colorKey]       = true
    postRollLock[colorKey] = false
    activeSlotIndex.value  = nextActiveSlotIndex
    // Ilay mpilalao manaraka (izay vao mahazo ny tour) dia miditra ho
    // "enable" avy hatrany (tsy maizina) amin'io fotoana io ihany koa.
    const nextColorKey = COLOR_BY_SLOT[nextActiveSlotIndex]
    if (nextColorKey) dimmed[nextColorKey] = false
  }, handoffDelay)
}

// "onRollRequest" — @roll-request avy amin'i Dice.vue (mpampiasa
// nanindry ny dice-ny manokana, tour-ny). Tsy miandry ny valin'ny
// server mihitsy talohan'ny fampisehoana ny animation (efa "prefetch"
// ny "pendingValue" — jereo fanazavana etsy ambony), fa mandefa ny
// "roll" any amin'ny server any ambadika ihany (mba hampandroso ny
// tour sy hamorona "pendingValue" vaovao ho an'ny mpilalao manaraka).
const onRollRequest = (colorKey) => {
  if (!interactive.value[colorKey]) return
  const value = pendingValue.value
  const order = turnOrder.value
  const myIdxInOrder      = order.indexOf(SLOT_INDEX[colorKey])
  const nextTurnIndex     = order.length ? (myIdxInOrder + 1) % order.length : 0
  const nextActiveSlotIdx = order.length ? order[nextTurnIndex] : null

  // "6" → mivoaka pion iray (raha mbola misy ao anaty "yard") — mitovy
  // lojika amin'ny server (jereo api/game.js → action "roll"), mba
  // hahafahan'ny animation manomboka avy hatrany (tsy miandry ny
  // valin'ny server, efa fantatra mialoha ny valiny sy ny isan'ny
  // pion efa nivoaka).
  const pieceOutIndex = (value === 6 && piecesOutState[colorKey] < 4) ? piecesOutState[colorKey] : null

  // "selfRollSlotIndex" fa TSY "knownTurnIndex" no ovaina eto (jereo
  // BUGFIX etsy ambony) — "knownTurnIndex" dia mijanona ho an'ny
  // polling ihany hamarinany azy.
  selfRollSlotIndex = SLOT_INDEX[colorKey]
  playRollSequence(colorKey, value, nextActiveSlotIdx, pieceOutIndex)
  callGame('roll')
}

// "applyGameState" — polling (fetchGameState eo ambany). Voalohany
// (knownTurnIndex === null): mametraka ny statut ankehitriny mivantana
// (tsy misy animation ilaina, satria mbola tsy nisy roll niseho teo
// imason'ity client ity). Manaraka: raha hafa amin'ny "knownTurnIndex"
// (voamarina, poll fotsiny — jereo BUGFIX ao amin'ny "selfRollSlotIndex"
// etsy ambony) ny "turnIndex" navoakan'ny server, dia midika izany fa
// nisy roll VAO VOAMARIN'NY SERVER — raha "lastRoll.slotIndex" dia ny
// slot nataoko roll manokana (selfRollSlotIndex), dia tsy averina
// milalao ny animation-ny (efa naseho tany am-boalohany, tamin'ny
// onRollRequest); raha tsy izany (an'olon-kafa), dia vao alefa ny
// animation.
const applyGameState = (game) => {
  if (!game) return
  const order         = game.turnOrder || []
  const newTurnIndex  = game.turnIndex ?? 0
  const newActiveSlot = order.length ? order[newTurnIndex] : null

  turnOrder.value    = order
  pendingValue.value = game.pendingValue ?? null

  if (knownTurnIndex === null) {
    knownTurnIndex = newTurnIndex
    turnIndex.value = newTurnIndex
    activeSlotIndex.value = newActiveSlot
    for (const key of COLOR_BY_SLOT) dimmed[key] = SLOT_INDEX[key] !== newActiveSlot
    // Fanamarinana voalohany (ohatra: niditra tao anaty lalao efa
    // nandeha, indrindra indrindra) — asehoy avy hatrany (tsy misy
    // animation ilaina) ny pion efa nivoaka teo aloha.
    const piecesOut = Array.isArray(game.piecesOut) ? game.piecesOut : [0, 0, 0, 0]
    for (const key of COLOR_BY_SLOT) {
      piecesOutState[key] = piecesOut[SLOT_INDEX[key]] || 0
      dockedCount[key]    = piecesOutState[key]
    }
    return
  }

  if (newTurnIndex === knownTurnIndex) return // tsy nisy fiovana (poll "an-dalana" na mbola tsy nandroso ny server)

  knownTurnIndex  = newTurnIndex
  turnIndex.value = newTurnIndex

  const rolledSlotIndex = game.lastRoll ? game.lastRoll.slotIndex : null
  if (rolledSlotIndex === selfRollSlotIndex) {
    // Ilay roll nataoko manokana, farany voamarin'ny server — efa
    // naseho teo aloha ny animation-ny (onRollRequest), tsy averina.
    selfRollSlotIndex = null
    activeSlotIndex.value = newActiveSlot // manamarina fotsiny (efa io ihany no napetraky ny playRollSequence)
    return
  }

  const rolledColorKey = COLOR_BY_SLOT[rolledSlotIndex]
  if (rolledColorKey) {
    const pieceOutIndex = game.lastRoll.pieceOutIndex ?? null
    playRollSequence(rolledColorKey, game.lastRoll.value, newActiveSlot, pieceOutIndex)
  }
}

// 50ms — nangatahin'ny mpampiasa mivantana (mba ho "quasi-instantané"
// ny fahitan'ny adversaire ny roll/fivoahan'ny pion ataoko). MARIHINA:
// mampitombo be ny "throughput" fangatahana any amin'ny server (~20
// fangatahana/segondra isaky ny mpilalao mandritra ny lalao, dia 40-80/s
// raha 2-4 mpilalao) — raha misy olana amin'ny fandaniana/latence any
// aoriana, dia eto no toerana hanovana azy indray.
const GAME_POLL_MS = 50
let gamePollTimer = null
// "pollInFlight" — misoroka ny fanindronan-jina fangatahana ("get-
// state") miaraka: raha lava kokoa noho 50ms ny valin'ny alina
// tokana (latence), dia mety hisy fangatahana maromaro miaraka an-
// dàlana, ka ny valiny mety tsy tonga araka ny filaharana nandefasana
// azy ireo (network "out of order") — raha izany, ny "applyGameState"
// dia mety hahazo valiny TALOHA kokoa AORIAN'ny iray vaovao kokoa, ka
// "miverina" ny "knownTurnIndex" amin'ny "lastRoll" efa naseho teo
// aloha (averina ny animation-ny dice — jereo BUGFIX nangatahin'ny
// mpampiasa: dice miverina miodina, indraindray "miaraka" amin'ny
// roll vaovao manaraka azy avy hatrany). Ny vahaolana: tsy alefa ny
// fangatahana manaraka raha mbola miandry ny valin'ny teo aloha (ka
// tsy misy fifanindronan'ny valiny — tsy voatery ho "in-order" ny
// navigateur raha samy mandeha miaraka ny fangatahana).
let pollInFlight = false
const fetchGameState = async () => {
  if (pollInFlight) return
  pollInFlight = true
  try {
    const data = await callGame('get-state')
    if (data && data.success) applyGameState(data.game)
  } finally {
    pollInFlight = false
  }
}
const startGamePolling = () => {
  stopGamePolling()
  fetchGameState()
  gamePollTimer = setInterval(fetchGameState, GAME_POLL_MS)
}
const stopGamePolling = () => {
  if (gamePollTimer) { clearInterval(gamePollTimer); gamePollTimer = null }
}

onMounted(() => startGamePolling())
onUnmounted(() => stopGamePolling())
</script>

<style scoped>

/* ========== RESET & GLOBAL ========== */
* { 
  margin: 0; 
  padding: 0; 
  box-sizing: border-box; 
}

body {
  min-height: 100vh;
  background: radial-gradient(circle at 30% 10%, #1b2b3f, #0a111f);
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Segoe UI', 'Poppins', system-ui, -apple-system, 'Roboto', sans-serif;
  padding: 10px 2px; /* 2px amin'ny sisiny (left & right) */
  margin: 0;
  -webkit-tap-highlight-color: transparent;
}

/* ========== BOARD ========== */
.board {
  margin: 0 auto;
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  flex-direction: column;
  gap: var(--gap-board);
  background: rgba(255,248,225,0.08);
  backdrop-filter: blur(2px);
  border-radius: 24px;
  padding: 10px;
  box-shadow: 0 25px 45px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.1);
  /* "position:relative" — itokisan'ny sary ".piece-travel" (jereo eo
     ambany, animatePieceExit ao <script>) — position:absolute
     mifototra amin'ity ".board" ity, mba ho marina ny toerana na
     inona na inona habe écran (getBoundingClientRect() computed). */
  position: relative;
}
/* Ilay pion "mihisaka" (roll=6, jereo animatePieceExit ao <script>):
   toerana/habe JS-computed (left/top/width/height, px), ny transition
   0.3s no baiko avy amin'ny JS ihany koa (fa tsy eto — miova arakaraka
   ny dingana amin'ny animation). */
.piece-travel {
  position: absolute;
  transform: translateX(-50%);
  z-index: 70;
  pointer-events: none;
  max-width: none;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
}

/* ========== ROWS ========== */
.row { 
  display: flex; 
  flex-wrap: nowrap; 
  gap: var(--gap-board); 
}
.row.middle { 
  align-items: center; 
}

/* ========== CORNER BOXES ========== */
.red-box, .green-box, .yellow-box, .blue-box {
  width: var(--corner); 
  height: var(--corner);
  display: flex; 
  align-items: center; 
  justify-content: center;
  border-radius: 40px;
  box-shadow: 0 12px 20px -8px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.3);
}
.red-box    { background: linear-gradient(145deg,#ff4d2e,#e02b00); border-right:5px solid #1f1a15; border-bottom:5px solid #1f1a15; border-top-left-radius:40px; border-bottom-right-radius:15px; }
.green-box  { background: linear-gradient(145deg,#2bef7a,#0fa844); border-left:5px solid #1f1a15; border-bottom:5px solid #1f1a15; border-top-right-radius:40px; border-bottom-left-radius:15px; }
.yellow-box { background: linear-gradient(145deg,#ffe55c,#f5c518); border-top:5px solid #1f1a15; border-left:5px solid #1f1a15; border-bottom-right-radius:40px; border-top-left-radius:15px; }
.blue-box   { background: linear-gradient(145deg,#39b9ff,#0f7bcb); border-top:5px solid #1f1a15; border-right:5px solid #1f1a15; border-bottom-left-radius:40px; border-top-right-radius:15px; }

/* ========== WHITE TOKEN AREA ========== */
/* "display:grid" + "gap" dia mbola tsy takatry ny navigateur / WebView
   taloha indraindray (ny "gap" property indrindra tao anaty grid context
   dia efa be taona kokoa noho ny grid mihitsy), ka na dia tsy nampidina
   tanteraka ny declaration aza (grid mety mbola miasa), dia esorina
   ho 0px ilay "gap" — mahatonga ireo .circle hifanindry (tsy misy
   elanelana), ary tsy mitovy amin'ny sakan'ny --circle-d intsony
   (izay nomanina ho an'ny grid 2 tsanja MISY gap 8px), ka lasa tsy
   boribory tsara. Vahaolana: ilay .white-box tsy mampiasa "grid"
   mihitsy intsony fa "position:absolute" mivantana isaky ny .circle
   (4 farany: ambony-havia/havanana, ambany-havia/havanana), mba tsy
   hiankina na amin'ny grid na amin'ny gap — calc()/var() fotsiny no
   miasa ka mitovy 100% amin'ny navigateur rehetra. */
.white-box {
  width: calc(var(--corner) * 0.65);
  height: calc(var(--corner) * 0.65);
  background: #fef9e8;
  border: 3px solid #1f1b16;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2px rgba(255,245,200,0.8), inset 0 4px 12px rgba(0,0,0,0.05), 0 6px 12px rgba(0,0,0,0.2);
  position: relative;
  backdrop-filter: blur(2px);
}

/* ========== TOKEN CIRCLES ========== */
/* "aspect-ratio" (2021) sy ny "gap" ao anaty grid (tsy takatry ny
   navigateur taloha indraindray, jereo ny hevitra eo ambony an'ny
   .white-box) no antony tsy nisehoan'ireo boribory teo aloha — ka
   ny efatra amin'izy ireo dia "position:absolute" mivantana ao anaty
   .white-box (izay "position:relative"), samy manana ny toerany
   manokana (nth-child eo ambany), habeny kajian'ny --circle-d
   (calc()/var() fotsiny, efa ela be no takatry ny navigateur rehetra)
   — mitovy 100% amin'ny navigateur taloha sy amin'izao. */
.circle {
  position: absolute;
  width: var(--circle-d);
  height: var(--circle-d);
  border-radius: 50%;
  box-shadow: 0 3px 6px rgba(0,0,0,0.3), inset 0 1px 2px rgba(255,255,255,0.7);
  transition: transform 0.2s cubic-bezier(0.2,0.9,0.4,1.1);
  cursor: pointer;
}
.circle:hover { transform: scale(1.1); }
/* Toerana: 1=ambony-havia, 2=ambony-havanana, 3=ambany-havia,
   4=ambany-havanana (mitovy amin'ny filaharan'ny 4 div ao amin'ny
   template). 6px = mimicky ny padding teo aloha, 8px = ny gap teo
   aloha — samy efa tafiditra ao anaty --circle-d (jereo .game-page). */
.circle:nth-child(1) { top: 6px; left: 6px; }
.circle:nth-child(2) { top: 6px; right: 6px; }
.circle:nth-child(3) { bottom: 6px; left: 6px; }
.circle:nth-child(4) { bottom: 6px; right: 6px; }
/* Loko maivana kokoa (mifangaro amin'ny fotsy ~40%) noho ny pion (sary
   PNG) mba tsy hitovizany aminy — tsy niova ny "hue"/loko fototra. */
.red.circle    { background: radial-gradient(circle at 35% 35%,#ffa693,#ea7f66); }
.green.circle  { background: radial-gradient(circle at 35% 35%,#95ffb9,#6ed794); }
.yellow.circle { background: radial-gradient(circle at 35% 35%,#fff6af,#fae366); }
.blue.circle   { background: radial-gradient(circle at 35% 35%,#a6e0ff,#71bcec); }

/* Sarin'ny pion (piece) — "position:absolute" ao anaty .circle
   (izay "position:absolute" koa amin'ny toerany manokana ao amin'ny
   .white-box, jereo eo ambony), ka tsy manimba ny fandrindrana efa
   vita amin'ilay table. Asongadina eny ambony (bottom-anchored, TSY
   afovoany intsony) mba hisian'ny "mihotra kely" eny an-dohany ihany
   (tsy afovoany avokoa toy ny teo aloha). */
.piece-img {
  position: absolute;
  left: 50%;
  bottom: 8%;
  transform: translateX(-50%);
  height: 98%;
  width: auto;
  max-width: none;
  pointer-events: none;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
}

/* Ilay "cadre kely" (cellule) hidiran'ny pion rehefa 6 (jereo
   animatePieceExit ao <script>) — "position:relative" mba hametrahana
   ilay "entry-piece-row" ao anatiny, rehefa vita ny animation
   "mihisaka" (.piece-travel). */
.entry-cell {
  position: relative;
}
/* "entry-piece-row" — mitazona ny pion "docké" iray na maromaro
   (dockedCount ao <script>, v-for) miorina ao anaty entry-cell.
   "height:100%" (mifanaraka amin'ny .entry-cell, izay manana habe
   marina) mba hisian'ny "containing block" marina ho an'ny "height %"
   an'ny .entry-piece-img ao anatiny; "display:flex" + "align-items:
   flex-end" mba hampifanindry ny "ambany" an'ireo pion (na iray na
   maro) amin'ny "bottom" napetraky ity "row" ity ihany (tsy voatery
   amin'ny "bottom" tsirairay avy amin'ny img), ary "left:50% +
   translateX(-50%)" mba hampivondrona ny vondrona (iray na maro)
   eo afovoan'ilay cadre. */
.entry-piece-row {
  position: absolute;
  left: 50%;
  bottom: 8%;
  transform: translateX(-50%);
  height: 100%;
  display: flex;
  align-items: flex-end;
  z-index: 5;
  pointer-events: none;
}
/* Raha roa (na mihoatra) pion miaraka ao anaty cadre iray ihany (jereo
   dockedCount ao <script>) — nangatahin'ny mpampiasa: mihakely ho 90%
   (fa tsy 130%, izay mijanona ho an'ny tokana) izy rehetra, ary ny
   elanelana amin'ny ambany dia 20% (fa tsy 8%) mba hisy toerana ho
   an'izy roa mifanakaiky ("mi-colle", jereo .entry-piece-row eto
   ambony — "align-items:flex-end" no mampifanindry azy ireo, "gap:0"
   [default] no mampikasika azy ireo). */
.entry-piece-row-multi {
  bottom: 20%;
}
/* Ilay pion "docké" tsirairay avy (mitovy convention amin'ny
   ".piece-img": "width:auto" mba tsy hisy fanenjehana/"stretch" —
   jereo BUGFIX ao <script>, animatePieceExit — ny "height" ihany no
   "authoritative"). Tokana (.entry-piece-row, tsy "-multi"): 130%
   (PIECE_DOCK_SCALE ao <script>) — tafahotra kely ny ambony (mipoitra
   mihoatra ny taipika ambony an'ilay cadre, araka ny sary nomen'ny
   mpampiasa). Roa na mihoatra (.entry-piece-row-multi): 90%. */
.entry-piece-img {
  height: 130%;
  width: auto;
  max-width: none;
  filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4));
}
.entry-piece-row-multi .entry-piece-img {
  height: 90%;
}

/* ========== PATH CELLS ========== */
.cell {
  width: var(--cell); 
  height: var(--cell);
  flex-shrink: 0;
  border: 1px solid #181818;
  background-color: #fff9ef;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px rgba(255,245,200,0.4), 0 1px 2px rgba(0,0,0,0.1);
}
.cell.red    { background: linear-gradient(145deg,#ff6242,#f13b0c); box-shadow: inset 0 0 0 1px #ff9b7a; }
.cell.green  { background: linear-gradient(145deg,#45f58a,#0fc455); box-shadow: inset 0 0 0 1px #9affb5; }
.cell.yellow { background: linear-gradient(145deg,#ffec6e,#fdd835); box-shadow: inset 0 0 0 1px #fff1b0; }
.cell.blue   { background: linear-gradient(145deg,#5bc9ff,#259be6); box-shadow: inset 0 0 0 1px #a8ddff; }

.cell-container { display: flex; flex-direction: column; flex-shrink: 0; }
.cell-container .row { gap: 0; }

/* ========== DESTINATION ========== */
.destination {
  width: 0; height: 0;
  border-top:    var(--dest-border) solid #2bef7a;
  border-left:   var(--dest-border) solid #ff4d2e;
  border-right:  var(--dest-border) solid #ffe55c;
  border-bottom: var(--dest-border) solid #39b9ff;
  border-radius: 10px;
  position: relative; flex-shrink: 0; align-self: center;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.35));
}
.destination::after {
  content: '⭐';
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%);
  font-size: calc(var(--dest-border) * 0.7);
  color: rgba(255,235,140,0.95);
  text-shadow: 0 0 8px gold;
  pointer-events: none;
}

/* ==============================================
   GAME LAYOUT
   ============================================== */
.game-page {
  /*
    Fikajiana ny --cell araka ny sakany (screen width):
    - Sakany feno: 100vw
    - Elanelana 2px ankavia/ankavanana sy padding an'ny board: ~24px total
    - Totalin'ny kazy amin'ny sakany: 15 cells (6 corner + 3 middle + 6 corner)
    - Ampiharina ny calc() mba hamenoana ny écran ka 2px ihany no elanelany amin'ny sisiny.
  */
  --cell: clamp(20px, calc((100vw - 28px) / 15), 42px);
  --gap-board: 4px;
  --corner: calc(var(--cell) * 6);
  --dest-border: calc(var(--cell) * 1.5);
  /* .white-box (box-sizing: border-box) = corner*0.65 amin'ny lafiny
     rehetra: esorina ny border (3px*2=6px), padding (6px*2=12px), sy
     ny grid-gap (8px) mba hahazoana ny sakan'ny "content" azaraina
     roa tsanja — 6+12+8=26px. Nomerika (mitovy marina amin'ny valeur
     navoakan'ny width:100% grid track teo aloha, nohamarinina tamin'ny
     getBoundingClientRect() amin'ny navigateur), ka tsy miova ny habe
     eny amin'ny navigateur rehetra na dia amin'ireo mahalala ny
     aspect-ratio aza. */
  --circle-d: calc((var(--corner) * 0.65 - 26px) / 2);

  width: 100%;
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 2px; /* 2px amin'ny sisiny ankavia sy ankavanana */
  overflow-x: hidden;
}

/* Button "menu" eo ambony afovoany — "position:fixed" mba tsy hisy
   fiantraikany amin'ny "flex" fandrindrana an'ny .game-wrapper/.board
   (esorina tanteraka amin'ny normal flow, tahaka ny #hdr-r/.btn-circle
   ao Home.vue, fa endrika "rectangle" (border-radius, sakany lava
   kokoa, haavony fohy kokoa) fa tsy boribory. */
.game-menu-btn {
  position: fixed;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  width: 46px;
  height: 34px;
  border-radius: 17px;
  background: rgba(255, 248, 225, 0.09);
  border: 1px solid rgba(255, 255, 200, 0.18);
  color: #fff9e0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(2px);
}
.game-menu-btn .material-icons {
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Fallback ho an'ny navigateur tsy mahalala ny CSS clamp() — tsy toy ny
   "width: min(...)" (izay tsotra averina amin'ny declaration teo aloha
   raha tsy takatra), ny custom property "--cell" dia TSY manavaka izany
   satria tsy misy "syntax check" atao amin'ny valeur-ny mandra-pampiasana
   azy (var(--cell)) — ka "@supports" no fomba azo antoka indrindra
   hamerenana valeur mety ho an'ny --cell (sy koa ny --corner/--dest-border
   miankina aminy) amin'ireo navigateur ireo, tsy misy clamp() intsony fa
   calc() tsotra (efa takatry ny navigateur tranainy indrindra hatramin'ny
   ela) ihany. */
@supports not (width: clamp(1px, 1px, 1px)) {
  .game-page {
    --cell: calc((100vw - 28px) / 15);
  }
}

/* "gap" ao anaty flexbox — tsy takatry ny navigateur/WebView taloha
   (jereo ny fanazavana ao amin'ny Home.vue #hdr-l), esorina mangina ho
   0px, ka mifanakaiky ny dice-row/board/dice-row (sy ny cadre-dice sy
   ny anarana, eo ambany). Solon'ny "gap" dia "margin-top"/"margin-left"
   eo amin'ny zanaka rehetra afa-tsy ny voalohany. */
.game-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 100%;
}
.game-wrapper > * + * { margin-top: 12px; }

.dice-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0 2px;
}

/* ==============================================
   DICE HOLDER
   ============================================== */
/* Ny elanelana eo anelanelan'ny .dice-pair sy .player-name dia
   avy amin'ny margin (6px) an'izy roa manokana (jereo .dice-pair sy
   .player-name eto ambany), fa tsy avy amin'ny ".dice-holder > * + *"
   intsony — satria miova ny filaharan'izy roa arakaraka ny andalana
   (BOTTOM ROW: player-name aloha, dice-pair aoriana, mifamadika amin'ny
   TOP ROW), ka raha "margin-top" mivantana amin'ny "zanaka faharoa"
   ihany no ampiasaina, dia 12px (6+6, satria tsy mifangaro ny margin
   an'ny "flex items") ny elanelana rehefa .dice-pair no voalohany
   (TOP ROW: manana margin-bottom ihany koa izy), fa 6px ihany (tsy
   mifangaro amin'ny margin an'ny .player-name, izay tsy nisy) rehefa
   .player-name no voalohany (BOTTOM ROW) — tsy mitovy ny andaniny sy
   ny ilany. */
.dice-holder {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Toerana (couleur) tsy misy mpilalao — "visibility:hidden" fa tsy
   "display:none"/v-if, mba hitazonana ny "justify-content:space-between"
   an'ny .dice-row (raha tsy izany, ny mpilalao TOKANA mijanona amin'ny
   andalana iray dia mifindra any amin'ny ilany diso — jereo .dice-row). */
.dice-holder-empty {
  visibility: hidden;
}

.dice-pair {
  margin: 6px 0;
  display: flex;
  align-items: center;
}
.dice-pair > * + * { margin-left: 5px; }

.player-avatar {
  width: 50px;
  height: 45px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
}

.av-red {
  background: linear-gradient(145deg,#c82000,#ff5533);
  box-shadow:
    0 0 0 3.5px #ff7755,
    0 0 0 6px #7711003a,
    inset 0 1px 2px rgba(255,255,255,0.3),
    0 8px 20px rgba(0,0,0,0.5);
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.av-green {
  background: linear-gradient(145deg,#0aaa44,#33ff88);
  box-shadow:
    0 0 0 3.5px #44ffaa,
    0 0 0 6px #00882233,
    inset 0 1px 2px rgba(255,255,255,0.3),
    0 8px 20px rgba(0,0,0,0.5);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}
.av-blue {
  background: linear-gradient(145deg,#0b7bcf,#33bbff);
  box-shadow:
    0 0 0 3.5px #55ccff,
    0 0 0 6px #004488aa,
    inset 0 1px 2px rgba(255,255,255,0.3),
    0 8px 20px rgba(0,0,0,0.5);
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}
.av-yellow {
  background: linear-gradient(145deg,#d4a000,#ffe855);
  box-shadow:
    0 0 0 3.5px #ffee88,
    0 0 0 6px #886600aa,
    inset 0 1px 2px rgba(255,255,255,0.3),
    0 8px 20px rgba(0,0,0,0.5);
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.av-inner {
  width: calc(100% - 10px);
  height: calc(100% - 10px);
  border-radius: 11px;
  background: rgba(255,255,255,0.13);
  border: 1.5px solid rgba(255,255,255,0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.25);
}

.dice-btn-wrap {
  width: 70px;
  height: 70px;
  border-radius: 18px;
  padding: 5px;
  z-index: 2;
}

.dw-red {
  background: linear-gradient(150deg,#c82000,#ff5533);
  box-shadow:
    0 0 0 3.5px #ff7755,
    0 0 0 6px #7711003a,
    0 8px 20px rgba(0,0,0,0.5);
}
.dw-green {
  background: linear-gradient(150deg,#0aaa44,#33ff88);
  box-shadow:
    0 0 0 3.5px #44ffaa,
    0 0 0 6px #00882233,
    0 8px 20px rgba(0,0,0,0.5);
}
.dw-blue {
  background: linear-gradient(150deg,#0b7bcf,#33bbff);
  box-shadow:
    0 0 0 3.5px #55ccff,
    0 0 0 6px #004488aa,
    0 8px 20px rgba(0,0,0,0.5);
}
.dw-yellow {
  background: linear-gradient(150deg,#d4a000,#ffe855);
  box-shadow:
    0 0 0 3.5px #ffee88,
    0 0 0 6px #886600aa,
    0 8px 20px rgba(0,0,0,0.5);
}

.dice-frame {
  width: 100%;
  height: 100%;
  border-radius: 13px;
  background: linear-gradient(160deg,#383848,#1e1e2a);
  padding: 5px;
  box-shadow:
    inset 0 2px 5px rgba(0,0,0,0.7),
    inset 0 -1px 2px rgba(255,255,255,0.07);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: opacity 0.2s ease-out;
}
/* Tsy tour-ny (na mbola "grace" 0.5s taorian'ny roll-ny) — ilay "cadre
   kely" (.dice-frame, MIARAKA amin'ny dice) no maizina kely (opacity
   0.7), TSY ilay "cadre couleur" ambony azy (.dice-btn-wrap/.dw-*,
   izay mijanona feno hazavana hatrany). */
.dice-frame-dim {
  opacity: 0.7;
}

/* -----------------------------------------------
   PLAYER NAMES
   ----------------------------------------------- */
.player-name {
  margin: 6px 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.3px;
  text-transform: uppercase;
}
.lbl-red    { color: #ff8870; text-shadow: 0 0 10px rgba(255,70,40,0.4); }
.lbl-green  { color: #44ffbb; text-shadow: 0 0 10px rgba(40,255,100,0.4); }
.lbl-blue   { color: #66ddff; text-shadow: 0 0 10px rgba(40,150,255,0.4); }
.lbl-yellow { color: #ffee88; text-shadow: 0 0 10px rgba(255,200,0,0.4); }

</style>
