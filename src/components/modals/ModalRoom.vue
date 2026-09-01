<template>
  <Teleport to="body">
    <div
      v-if="localVisible"
      :class="['ovl', closing ? 'off' : 'on']"
      id="modal-room"
    >
      <div class="mdl">
        <h2 class="mtitle mtitle-sm">
          <template v-if="searchMode">Recherche de partie</template>
          <span v-else class="room-title-lock">
            <span class="material-icons room-lock-title-icon" :class="room.private ? 'is-private' : 'is-public'">
              {{ room.private ? 'lock' : 'lock_open' }}
            </span>
            {{ room.private ? 'Salon privé' : 'Salon public' }}
          </span>
        </h2>

        <!-- Mise (Multijoueur ary "Créer" miaraka amin'ny mise) -->
        <div v-if="room.stake" class="stake-badge">
          <span class="material-icons">payments</span>
          Mise : {{ room.stake.toLocaleString('fr-FR') }}ar
        </div>

        <!-- En-tête du salon : ID (petit cadre, à gauche) + icônes
             message / paramètres du salon (à droite) — pas affiché en
             mode Multijoueur (searchMode) -->
        <div v-if="!searchMode" class="room-header-row">
          <div class="room-code room-code-sm" @click="copyRoomId">
            <span class="rc-label">ID</span>
            <span class="rc-val rc-val-sm">{{ roomId }}</span>
            <span class="material-icons rc-copy">{{ codeCopied ? 'check_circle' : 'content_copy' }}</span>
          </div>
          <div class="room-header-actions">
            <button class="rh-icon-btn" type="button" title="Message du salon" aria-label="Message du salon" @click="showRoomChat = true">
              <IconMessage class="material-icons" />
            </button>
            <!-- Ny Hôte ihany no mahita ny icône "Paramètres" (miditra
                 amin'ny ModalBet.vue mode="settings", azo ovaina). Ny
                 invité (tsy hôte) kosa dia mahita icône "i" (information),
                 azo tsindriana ihany koa fa mampiseho ilay ModalBet
                 mode="view" (lecture seule, jereo eo ambany). -->
            <button
              v-if="isHost"
              class="rh-icon-btn"
              type="button"
              title="Paramètres du salon"
              aria-label="Paramètres du salon"
              @click="openRoomSettings"
            >
              <span class="material-icons">settings</span>
            </button>
            <button
              v-else
              class="rh-icon-btn"
              type="button"
              title="Informations"
              aria-label="Informations"
              @click="showRoomInfo = true"
            >
              <span class="material-icons">info</span>
            </button>
          </div>
        </div>

        <div v-if="loading" class="room-loading">
          <div class="list-spinner"></div>
        </div>

        <template v-else>
          <!-- 4 emplacements colorés (Rouge / Vert / Bleu / Jaune) -->
          <div class="slots-grid">
            <div v-for="(color, i) in COLORS" :key="color.key" :class="['slot', useNeutralColors ? 'slot-neutral' : 'slot-' + color.key]">
              <template v-if="room.slots[i]">
                <div class="slot-ava">{{ room.slots[i].avatar || '👤' }}</div>
                <div class="slot-name">{{ room.slots[i].username }}</div>
                <div class="slot-tags">
                  <span v-if="!searchMode && !isSlotOnline(room.slots[i])" class="tag tag-offline">
                    <span class="material-icons">wifi_off</span>Hors ligne
                  </span>
                  <span v-else-if="!searchMode && room.slots[i].uid === room.hostUid" class="tag tag-host">
                    <span class="material-icons">star</span>Hôte
                  </span>
                  <span v-else-if="!searchMode && room.slots[i].insufficientBalance" class="tag tag-insufficient">
                    <span class="material-icons">money_off</span>Solde insuffisant
                  </span>
                  <span v-else-if="room.slots[i].ready" class="tag tag-ready">
                    <span class="material-icons">check_circle</span>Prêt
                  </span>
                  <span v-else class="tag tag-wait">En attente</span>
                </div>
                <button
                  v-if="!searchMode && isHost && room.slots[i].uid !== myUid"
                  class="slot-kick"
                  title="Exclure"
                  @click="askKickSlot(i)"
                >
                  <span class="material-icons">person_remove</span>
                </button>
              </template>
              <template v-else>
                <button
                  v-if="!searchMode"
                  class="slot-empty"
                  :disabled="room.status !== 'waiting'"
                  @click="openInvite(i)"
                >
                  <span class="material-icons">add</span>
                  <span class="slot-empty-lbl">Inviter</span>
                </button>
                <div v-else class="slot-empty slot-empty-search">
                  <span class="material-icons mp-loop-icon">loop</span>
                </div>
              </template>
              <div class="slot-color-lbl">{{ useNeutralColors ? '?' : color.label }}</div>
            </div>
          </div>

          <!-- Countdown 60s "Multijoueur" — miseho rehefa 2 mpilalao
               (na mihoatra) tafiditra, afenina raha miala ka iray sisa.
               Mena (urgent) rehefa ≤3s (jereo koa MATCH_COUNTDOWN_LOCK_S
               ao amin'ny <script> — io ihany koa no fotoana anakanana
               ny fidiran'ny mpilalao vaovao sy ny "Quitter"). -->
          <div
            v-if="searchMode && matchCountdown !== null"
            class="mp-countdown"
            :class="{ 'mp-countdown-urgent': matchCountdown <= MATCH_COUNTDOWN_LOCK_S }"
          >
            <span class="material-icons">timer</span>
            Début dans {{ matchCountdown }}s
          </div>

          <!-- Statut de la partie -->
          <div v-if="room.status === 'playing'" class="room-status room-status-playing">
            <span class="material-icons">sports_esports</span>
            La partie a commencé !
          </div>

          <!-- Actions -->
          <div class="room-actions">
            <button
              v-if="!searchMode && !isHost && room.status === 'waiting'"
              class="rbtn rbtn-ready"
              :class="{ 'rbtn-on': displayReady, 'rbtn-counting': startCountdown !== null }"
              :disabled="startCountdown !== null"
              @click="toggleReady"
            >
              <span class="material-icons" :class="{ 'ready-icon-spin': readyPending }">{{ startCountdown !== null ? 'timer' : (readyPending ? 'autorenew' : (displayReady ? 'check_circle' : 'radio_button_unchecked')) }}</span>
              {{ startCountdown !== null ? startCountdown : (displayReady ? 'Prêt !' : 'Je suis prêt') }}
            </button>
            <button
              v-if="!searchMode && isHost && room.status === 'waiting'"
              class="rbtn rbtn-start"
              :class="{ 'rbtn-counting': startCountdown !== null }"
              :disabled="!canStart || startCountdown !== null"
              @click="startGame"
            >
              <span class="material-icons">{{ startCountdown !== null ? 'timer' : 'play_arrow' }}</span>
              {{ startCountdown !== null ? startCountdown : 'Lancer la partie' }}
            </button>
            <button
              class="rbtn rbtn-leave"
              :disabled="searchMode && matchCountdown !== null && matchCountdown <= MATCH_COUNTDOWN_LOCK_S"
              @click="askLeaveRoom"
            >
              <span class="material-icons">logout</span>
              Quitter
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- ── Invitation d'un ami dans un emplacement précis ── -->
    <ModalSocial
      :show="showInviteSocial"
      :my-firebase-uid="myUid"
      :my-username="myName"
      :my-avatar="myAvatar"
      :room-invite-mode="true"
      :room-id="roomId"
      :invite-target-slot="inviteSlot"
      :in-room-uids="occupiedUids"
      @close="showInviteSocial = false"
    />

    <!-- ── Erreurs ── -->
    <Notification
      :message="errorMsg"
      type="error"
      :duration="4000"
      @close="errorMsg = ''"
    />

    <!-- ── Paramètres du salon (Hôte irery ihany) ── -->
    <ModalBet
      :show="showRoomSettings"
      mode="settings"
      :room-id="roomId"
      :my-uid="myUid"
      :my-name="myName"
      :my-avatar="myAvatar"
      :wallet="myWallet"
      :initial-stake="room.stake"
      :initial-private="room.private"
      :initial-color-pick="room.colorPickEnabled"
      :slots="room.slots"
      :host-uid="room.hostUid"
      @close="showRoomSettings = false"
      @settings-updated="onSettingsUpdated"
    />

    <!-- ── Informations du salon (icône "i", Utilisateur invité — lecture
         seule, jereo ModalBet.vue mode="view") ── -->
    <ModalBet
      :show="showRoomInfo"
      mode="view"
      :room-id="roomId"
      :my-uid="myUid"
      :my-name="myName"
      :my-avatar="myAvatar"
      :initial-stake="room.stake"
      :initial-private="room.private"
      :initial-color-pick="room.colorPickEnabled"
      :slots="room.slots"
      :host-uid="room.hostUid"
      @close="showRoomInfo = false"
    />

    <!-- ── Chat n'ny Salon (mpilalao maro) ── -->
    <ModalChat
      :show="showRoomChat"
      :my-firebase-uid="myUid"
      :my-username="myName"
      :room-mode="true"
      :room-id="roomId"
      :room-private="room.private"
      :host-uid="room.hostUid"
      @close="showRoomChat = false"
    />

    <!-- ── Confirmation avant de quitter / fermer le salon ── -->
    <ModalConfirm
      v-model="showLeaveConfirm"
      :title="leaveConfirmTitle"
      :message="leaveConfirmMessage"
      :icon="leaveConfirmIcon"
      type="danger"
      confirm-label="Quitter"
      cancel-label="Annuler"
      :loading="leaveLoading"
      @confirm="confirmLeaveRoom"
      @cancel="cancelLeaveRoom"
    />

    <!-- ── Confirmation avant d'exclure un joueur ── -->
    <ModalConfirm
      v-model="showKickConfirm"
      title="Exclure ce joueur ?"
      :message="kickConfirmMessage"
      icon="person_remove"
      type="danger"
      confirm-label="Exclure"
      cancel-label="Annuler"
      :loading="kickLoading"
      @confirm="confirmKickSlot"
      @cancel="cancelKickSlot"
    />

    <!-- ── Conflit de couleur avant "Lancer la partie" (2 joueurs, jereo
         twoPlayerColorConflict) — ny bokotra roa dia "Vous" / "L'adversaire",
         ary miova couleur SY manomboka ny countdown miaraka. ── -->
    <ModalConfirm
      v-model="showColorConflict"
      title="Couleurs incompatibles"
      message="Vous devez changer de couleur, vous ou votre adversaire, avant de lancer la partie."
      icon="palette"
      type="info"
      cancel-label="Vous"
      confirm-label="L'adversaire"
      :loading="colorConflictLoading"
      @cancel="chooseSwapMe"
      @confirm="chooseSwapOpponent"
    />
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted } from 'vue'
import ModalSocial from './ModalSocial.vue'
import Notification from './Notification.vue'
import ModalConfirm from './ModalConfirm.vue'
import ModalBet from './ModalBet.vue'
import ModalChat from './ModalChat.vue'
import IconMessage from '../IconMessage.vue'
import { fetchWithTimeout } from '../../utils/network'

const API_ROOM = '/api/room'
const POLL_MS = 2500
// Rehefa vao miditra ao anaty salon (invité na mpamorona), dia atao
// haingana kokoa aloha ny "polling" (FAST_JOIN_POLL_MS) mandritra ny
// FAST_JOIN_DURATION_MS voalohany, mba tsy hiandry ela ny mpampiasa
// vao tafiditra vao mahazo ny "slots"/"ready" farany indrindra ao
// anaty salon — miverina amin'ny POLL_MS mahazatra aorian'izay.
const FAST_JOIN_POLL_MS = 800
const FAST_JOIN_DURATION_MS = 5000

const props = defineProps({
  show:       { type: Boolean, default: false },
  roomId:     { type: String,  default: '' },
  myUid:      { type: String,  default: '' },
  myName:     { type: String,  default: 'Player' },
  myAvatar:   { type: String,  default: '👤' },
  searchMode: { type: Boolean, default: false },
  // "myWallet" — solden'ny mpampiasa (Ar), ampiasaina hamantarana raha
  // tsy ampy ny vola-nay raha oharina amin'ny "room.stake" (jereo
  // myBalanceInsufficient/toggleReady eo ambany).
  myWallet:   { type: Number,  default: null },
})

const emit = defineEmits(['close', 'game-start', 'room-cancelled', 'kicked'])

const COLORS = [
  { key: 'red',    label: 'Rouge' },
  { key: 'green',  label: 'Vert'  },
  { key: 'blue',   label: 'Bleu'  },
  { key: 'yellow', label: 'Jaune' },
]

const localVisible = ref(false)
const closing       = ref(false)
const loading       = ref(true)
const errorMsg       = ref('')

const room = reactive({ hostUid: '', status: 'waiting', slots: [null, null, null, null], stake: null, private: false, colorPickEnabled: false, countdownStartedAt: null, startingAt: null })

// ── Paramètres du salon (icône "settings", Hôte irery ihany) ─────────
const showRoomSettings = ref(false)

// ── Informations du salon (icône "i", utilisateur invité — lecture
// seule, jereo ModalBet.vue mode="view") ─────────────────────────────
const showRoomInfo = ref(false)

// ── Chat n'ny Salon (icône "chat", mpilalao maro) ─────────────────
const showRoomChat = ref(false)

// "Online / Hors ligne" — havaozina haingana kokoa (HEARTBEAT_MS) noho
// ny "room" manontolo (POLL_MS), jereo "sendHeartbeat" etsy ambany.
// { [uid]: true/false }
const presenceMap = reactive({})

const showInviteSocial = ref(false)
const inviteSlot        = ref(-1)
const codeCopied        = ref(false)

// ── Confirmation avant de quitter / fermer le salon ──────────────
const showLeaveConfirm = ref(false)
const leaveLoading      = ref(false)

// ── Confirmation avant d'exclure un joueur ────────────────────────
const showKickConfirm  = ref(false)
const kickLoading       = ref(false)
const kickTargetIndex   = ref(-1)

// ── Conflit de couleur avant "Lancer la partie" (jereo twoPlayerColorConflict) ──
const showColorConflict   = ref(false)
const colorConflictLoading = ref(false)

let pollTimer = null
let fastPollSwitchTimer = null
let gameStartEmitted = false
// BUGFIX: rehefa ny tenanay ihany no miala an-tsitrapo (askLeaveRoom →
// confirmLeaveRoom), dia tsy tokony haseho ny fanambarana "kicked" any
// amin'i Home.vue (io dia tokony haseho ihany raha ny Hôte no nandroaka
// antsika tamin'ny "kick-player"). Io "flag" io dia miaro amin'ny "race
// condition" mety hitranga eo anelanelan'ny fandefasana "leave-room" sy
// ny "poll" (na "fetch" efa nandeha teo aloha) mety mbola tonga aorian'izay
// ka mahita ny "slot"-nay tsy ao anaty room intsony.
let selfLeaving = false

const isHost = computed(() => room.hostUid === props.myUid)

// Ny "couleur" (Rouge/Vert/Bleu/Jaune) dia tsy aseho raha:
//  - Multijoueur (searchMode) — toy ny teo aloha, na
//  - Room "Créer" fa TSY nasian'ny mpamorona mot de passe (public) —
//    ka lasa "slot-neutral" (gris noire) toy ny amin'ny Multijoueur
//    ihany koa, na
//  - Room PRIVÉ fa ny Hôte tsy nampiasa ny "L'hôte choisit la couleur"
//    (colorPickEnabled=false, valeur "par défaut") — mijanona ho "?"
//    hatrany ny couleur. Ny couleur dia aseho ihany raha PRIVÉ ARY
//    "colorPickEnabled" (jereo ModalBet.vue mode="settings").
const useNeutralColors = computed(() => props.searchMode || !room.private || !room.colorPickEnabled)

// "presenceMap" (havaozina isaky ny HEARTBEAT_MS, haingana kokoa) no
// jerena aloha; raha mbola tsy misy valiny ho an'io uid io (vao
// niditra), dia ny "online" avy amin'ny "get-room" farany (POLL_MS)
// no ampiasaina — tsy misy "false negative" mandritra ny fiandrasana
// ny heartbeat voalohany.
const isSlotOnline = (slot) => {
  if (!slot) return true
  if (Object.prototype.hasOwnProperty.call(presenceMap, slot.uid)) return presenceMap[slot.uid]
  return slot.online !== false
}
const mySlot = computed(() => room.slots.find(s => s && s.uid === props.myUid) || null)
const myReady = computed(() => !!mySlot.value?.ready)
// "myBalanceInsufficient" — tsy ampy ny solden'ny mpampiasa raha
// oharina amin'ny mise an'ilay room (mety hitranga raha invitation
// tamin'ny room misy mise ambony noho ny solde-ny, jereo toggleReady).
// "insufficientBalance" (avy amin'ny server, jereo room.slots[i] amin'ny
// <template>, ho an'ny mpilalao rehetra ao anaty room) no andrasana
// aloha satria io no marina indrindra (wallet "live", tsy "myWallet"
// mety efa lasa taloha); "myWallet" (prop, avy amin'i Home.vue) dia
// fallback fotsiny raha mbola tsy tonga ny "slots" voalohany.
const myBalanceInsufficient = computed(() => {
  const slot = mySlot.value
  if (slot && typeof slot.insufficientBalance === 'boolean') return slot.insufficientBalance
  return room.stake != null && props.myWallet != null && room.stake > props.myWallet
})

// ── "Prêt" / "En attente" — optimistic UI ─────────────────────────
// readyTarget: raha tsy "null", dia midika fa mbola miandry ny
// valin'ny server isika ("pret" na "attend") ka io no aseho eo no ho
// eo (avy hatrany, tsy miandry ny "fetchRoom"). readyPending: aseho
// ny "animation boribory miodina" eo amin'ilay icon mandritra izany.
const readyPending = ref(false)
const readyTarget  = ref(null)
const displayReady = computed(() => readyTarget.value !== null ? readyTarget.value : myReady.value)
const occupiedUids = computed(() => room.slots.filter(Boolean).map(s => s.uid))
const canStart = computed(() => {
  const occupied = room.slots.filter(Boolean)
  if (occupied.length < 2) return false
  return occupied.every(s => s.ready || s.uid === room.hostUid)
})

// ── Conflit de couleur (Créer, "L'hôte choisit la couleur", 2 joueurs
//     ihany) — jereo pairPartner/isValidTwoPlayerPair ao api/room.js:
//     tsy maintsy (Bleu+Vert) na (Rouge+Jaune) ny 2 mpilalao, raha tsy
//     izany dia ilay ModalConfirm "Vous"/"L'adversaire" no aseho eo
//     amin'ny "Lancer la partie" fa tsy mandeha mivantana ny countdown.
const TWO_PLAYER_COLOR_PAIRS = [[2, 1], [0, 3]] // Bleu+Vert, Rouge+Jaune
const isValidTwoPlayerPair = (a, b) => TWO_PLAYER_COLOR_PAIRS.some(p => (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a))
const twoPlayerColorConflict = computed(() => {
  if (props.searchMode || !room.private || !room.colorPickEnabled) return false
  const idxs = room.slots.map((s, i) => s ? i : null).filter(i => i !== null)
  if (idxs.length !== 2) return false
  return !isValidTwoPlayerPair(idxs[0], idxs[1])
})

// Ny hafatra amin'ny fandaozana dia miova arakaraka ny maha-hôte
// (mamorona) na tsia ny mpampiasa: ny Hôte no "mamorona" ilay salon,
// ka raha izy no miala dia ny salon manontolo no foanana. Amin'ny
// Multijoueur (searchMode) kosa dia tsy misy "Hôte" fix — na iza na
// iza no miala dia izy irery ihany no mandao, ka "Quitter" foana no
// asehon'ny hafatra, na dia ilay tao amin'ny slot 1 aza.
const leaveConfirmTitle = computed(() => (!props.searchMode && isHost.value) ? 'Fermer le salon ?' : 'Quitter le salon ?')
const leaveConfirmMessage = computed(() => (!props.searchMode && isHost.value)
  ? 'Voulez-vous vraiment fermer ce salon ? Tous les joueurs présents seront exclus.'
  : 'Voulez-vous vraiment quitter ce salon ?')
const leaveConfirmIcon = computed(() => (!props.searchMode && isHost.value) ? 'meeting_room' : 'logout')

const kickConfirmMessage = computed(() => {
  const target = room.slots[kickTargetIndex.value]
  const name = target ? target.username : 'ce joueur'
  return `Voulez-vous vraiment exclure ${name} de ce salon ?`
})

const authHeaders = () => {
  const token = localStorage.getItem('user_token')
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

// "silent" — ampiasain'ny "get-room"/"heartbeat" (polling, isaky ny
// 800ms-2500ms/1.2s): tsy mampiseho Notification isaky ny "tick" tsy
// mety (hoentina spam). Ny action mivantana ataon'ny mpampiasa
// (set-ready, start-game, leave-room, kick-player, sns) kosa dia
// mampiseho Notification foana (silent=false, valeur default).
const callRoom = async (action, extra = {}, { silent = false } = {}) => {
  try {
    const res = await fetchWithTimeout(`${API_ROOM}?action=${action}`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ uid: props.myUid, roomId: props.roomId, ...extra }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (!silent) { errorMsg.value = ''; setTimeout(() => { errorMsg.value = data.message || 'Une erreur est survenue.' }, 30) }
      return null
    }
    return data
  } catch (e) {
    if (!silent) setTimeout(() => { errorMsg.value = e?.message || 'Erreur réseau. Réessayez.' }, 30)
    return null
  }
}

const fetchRoom = async () => {
  const data = await callRoom('get-room', {}, { silent: true })
  if (!data) return
  if (!data.room) {
    // Nofoanana ny room (efa tsy misy intsony ny document)
    handleClose()
    return
  }

  // BUGFIX: rehefa ny Hôte no niala (leave-room mametraka
  // status:'cancelled'), dia ampiseho fanambarana ny mpilalao hafa
  // rehetra mbola ao amin'ny room, ary miala miaraka izy ireo — tsy
  // misy fifindram-pahefana any amin'ny hôte manaraka.
  if (data.room.status === 'cancelled') {
    stopPolling()
    callRoom('leave-room', {}, { silent: true }).catch(() => {}) // manadio ny "slot" manokana + mamafa ilay room raha tsy misy intsony
    emit('room-cancelled')
    return
  }

  // BUGFIX: raha teo aloha nisy ny "slot"-nay tao anaty room (efa
  // nametraka azy ny loading.value = false), fa amin'ity fetch ity
  // dia tsy hita intsony ny UID-nay tao anaty slots vaovao nefa
  // mbola misy ihany ilay room (tsy cancelled), midika izany fa ny
  // hôte no efa nandroaka anay (kick-player). Tsy maintsy miala
  // tanteraka isika eto (tsy mijery ny ao anatin'ilay salon intsony),
  // fa tsy mila miantso "leave-room" satria efa nesorin'ny server ny
  // slot-nay.
  if (!loading.value && !selfLeaving) {
    const stillInRoom = data.room.slots.some(s => s && s.uid === props.myUid)
    if (!stillInRoom) {
      stopPolling()
      emit('kicked')
      return
    }
  }

  room.hostUid = data.room.hostUid
  room.status  = data.room.status
  room.slots   = data.room.slots
  room.stake   = data.room.stake ?? room.stake
  room.private = !!data.room.private
  room.colorPickEnabled = !!data.room.colorPickEnabled
  room.countdownStartedAt = data.room.countdownStartedAt || null
  room.startingAt = data.room.startingAt || null
  loading.value = false

  if (room.status === 'playing' && !gameStartEmitted) {
    gameStartEmitted = true
    emit('game-start', { roomId: props.roomId, slots: room.slots, hostUid: room.hostUid })
  }
}

// "Online / Hors ligne" — jereo rapide kokoa noho ny "get-room"
// mahazatra (POLL_MS = 2500ms), mba hahitana haingana kokoa raha
// "hors ligne" tampoka ny mpilalao iray. Manavao ny "lastSeen"-nay
// manokana ary mamerina ny "presence" (uid → online) an'ny rehetra.
const HEARTBEAT_MS = 1200
let heartbeatTimer = null

const sendHeartbeat = async () => {
  const data = await callRoom('heartbeat', {}, { silent: true })
  if (data && data.presence) Object.assign(presenceMap, data.presence)
}

const startHeartbeat = () => {
  stopHeartbeat()
  sendHeartbeat()
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_MS)
}
const stopHeartbeat = () => {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
}

const startPolling = () => {
  stopPolling()
  fetchRoom()
  pollTimer = setInterval(fetchRoom, FAST_JOIN_POLL_MS)
  fastPollSwitchTimer = setTimeout(() => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = setInterval(fetchRoom, POLL_MS) }
    fastPollSwitchTimer = null
  }, FAST_JOIN_DURATION_MS)
  startHeartbeat()
}
const stopPolling = () => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (fastPollSwitchTimer) { clearTimeout(fastPollSwitchTimer); fastPollSwitchTimer = null }
  stopHeartbeat()
}

const openInvite = (slotIndex) => {
  inviteSlot.value = slotIndex
  showInviteSocial.value = true
}

const toggleReady = async () => {
  if (readyPending.value) return
  if (myBalanceInsufficient.value) {
    errorMsg.value = ''
    setTimeout(() => { errorMsg.value = 'Solde insuffisant pour rejoindre cette partie.' }, 30)
    return
  }
  const target = !myReady.value
  readyTarget.value = target
  readyPending.value = true
  const ok = await callRoom('set-ready', { ready: target })
  if (ok) {
    // Manavao mivantana ny "slot"-nay eto an-toerana (tsy miandry
    // "fetchRoom" hafa intsony — io no nampiandry ela teo aloha),
    // mba ho haingana kokoa ny fisehoan'ny "pret"/"en attente".
    const idx = room.slots.findIndex(s => s && s.uid === props.myUid)
    if (idx !== -1) room.slots[idx] = { ...room.slots[idx], ready: target }
  }
  readyPending.value = false
  readyTarget.value = null
}

// ── Décompte 3s "Lancer la partie" (Créer) ────────────────────────
// "room.startingAt" dia avy amin'ny server (jereo api/room.js → action
// "start-countdown"), ka MAHITA ny décompte ihany koa ny mpilalao
// invité (tsy hôte) rehetra ao anaty salon — tsy ny Hôte irery
// intsony (io no vaovao — teo aloha dia "setInterval" client-local
// tsotra, ka ny Hôte ihany no nahita ny "3, 2, 1"). Ny fanombohana
// varina ny lalao ("start-game") dia mijanona ho an'ny Hôte ihany,
// tsy miova ny lojika amin'izay: rehefa tapitra ny 3s eo an-toeran'ny
// Hôte (araka ny "startingAt" navoakan'ny server) dia izy ihany no
// miantso ny "start-game".
const START_COUNTDOWN_S = 3
const startCountdown = ref(null)
let startCountdownTicker = null
let startGameCalled = false

const finalizeStartGame = async () => {
  if (startGameCalled) return
  startGameCalled = true
  stopStartCountdownTicker()
  const ok = await callRoom('start-game')
  startCountdown.value = null
  if (ok) fetchRoom()
}
const recomputeStartCountdown = () => {
  if (!room.startingAt) { startCountdown.value = null; return }
  const elapsedS = (Date.now() - room.startingAt) / 1000
  startCountdown.value = Math.max(0, Math.ceil(START_COUNTDOWN_S - elapsedS))
  if (startCountdown.value <= 0 && isHost.value) finalizeStartGame()
}
const stopStartCountdownTicker = () => {
  if (startCountdownTicker) { clearInterval(startCountdownTicker); startCountdownTicker = null }
}
watch(() => room.startingAt, (val) => {
  stopStartCountdownTicker()
  startGameCalled = false
  if (!val) { startCountdown.value = null; return }
  recomputeStartCountdown()
  startCountdownTicker = setInterval(recomputeStartCountdown, 250)
})

const startGame = async () => {
  if (startCountdown.value !== null) return
  if (twoPlayerColorConflict.value) {
    showColorConflict.value = true
    return
  }
  await callRoom('start-countdown')
  fetchRoom()
}

// ── Résolution du conflit de couleur ("Vous" / "L'adversaire") ───────
// Ny mpilalao voafidy dia mifindra any amin'ny couleur "mpiray
// tapakila" amin'ilay mpilalao HAFA (jereo pairPartner ao api/room.js)
// — miova couleur SY manomboka ny countdown 3s miaraka, indray mandeha.
const resolveColorConflict = async (swapTarget) => {
  if (colorConflictLoading.value) return
  colorConflictLoading.value = true
  const ok = await callRoom('resolve-color-conflict', { swapTarget })
  colorConflictLoading.value = false
  showColorConflict.value = false
  if (ok) fetchRoom()
}
const chooseSwapMe       = () => resolveColorConflict('host')
const chooseSwapOpponent = () => resolveColorConflict('opponent')

// ── Countdown 60s "Multijoueur" (matchmaking, searchMode) ────────────
// "room.countdownStartedAt" dia avy amin'ny server (jereo api/room.js
// → computeMatchmakingCountdown), ka mitovy amin'ny mpilalao rehetra
// ao anaty salon (tsy client-local fotsiny, izay mety hisy elanelana
// isaky ny mpampiasa). Eto dia "ticker" mandeha isaky ny 250ms fotsiny
// no ampiasaina mba hampiseho ny segondra sisa tavela (mihatsara kely
// noho ny fiandrasana ny "poll" manaraka ihany), fa ny "vraie" valeur
// dia avy amin'ny "countdownStartedAt" navoakan'ny server tamin'ny
// "fetchRoom" farany. Rehefa tapitra ny 60s dia ny SERVER ihany no
// mametraka ny "status" ho 'playing' (jereo sweepPresence), ka ny
// "fetchRoom" mahazatra (poll/heartbeat) ihany no hahita sy hamoaka ny
// "game-start" — tsy misy hetsika manokana takiana eto amin'ny client.
const MATCH_COUNTDOWN_S = 60
// Rehefa ≤3s sisa: mena ny soratra, tsy azo atao intsony ny "Quitter"
// (jereo template) — ary ny server (find-match) dia tsy mandray
// mpilalao vaovao intsony amin'io salon io (jereo api/room.js).
const MATCH_COUNTDOWN_LOCK_S = 3
const matchCountdown = ref(null) // segondra sisa tavela, null = tsy misy countdown mandeha
let matchCountdownTicker = null

const recomputeMatchCountdown = () => {
  if (!room.countdownStartedAt) { matchCountdown.value = null; return }
  const elapsedS = (Date.now() - room.countdownStartedAt) / 1000
  matchCountdown.value = Math.max(0, Math.ceil(MATCH_COUNTDOWN_S - elapsedS))
}
const stopMatchCountdownTicker = () => {
  if (matchCountdownTicker) { clearInterval(matchCountdownTicker); matchCountdownTicker = null }
}
watch(() => room.countdownStartedAt, (val) => {
  stopMatchCountdownTicker()
  if (!val) { matchCountdown.value = null; return }
  recomputeMatchCountdown()
  matchCountdownTicker = setInterval(recomputeMatchCountdown, 250)
})

// ── Fandaozana / fanakatonana ny salon — aseho aloha ny ModalConfirm,
//     tsy miala mivantana (jereo ny hafatra amin'ny leaveConfirmMessage) ──
const askLeaveRoom = () => {
  showLeaveConfirm.value = true
}
const confirmLeaveRoom = async () => {
  // BUGFIX: atao "true" ity aloha ny fiantsoana ny API, ary ajanona
  // avy hatrany ny polling, mba tsy hisy "poll" (na "fetch" efa nandeha)
  // mety hahita ny "slot"-nay ho voaesotra ka hieritreritra fa noroahina
  // isika (jereo fetchRoom → "!loading.value && !selfLeaving").
  selfLeaving = true
  stopPolling()
  leaveLoading.value = true
  await callRoom('leave-room')
  leaveLoading.value = false
  showLeaveConfirm.value = false
  handleClose()
}
const cancelLeaveRoom = () => {
  showLeaveConfirm.value = false
}

// ── Fandroahana mpilalao — aseho aloha ny ModalConfirm, tsy esorina
//     mivantana ──────────────────────────────────────────────────
const askKickSlot = (slotIndex) => {
  const target = room.slots[slotIndex]
  if (!target || !isHost.value) return
  kickTargetIndex.value = slotIndex
  showKickConfirm.value = true
}
const confirmKickSlot = async () => {
  const target = room.slots[kickTargetIndex.value]
  if (!target) { showKickConfirm.value = false; return }
  kickLoading.value = true
  const ok = await callRoom('kick-player', { targetUid: target.uid })
  kickLoading.value = false
  showKickConfirm.value = false
  kickTargetIndex.value = -1
  if (ok) fetchRoom()
}
const cancelKickSlot = () => {
  showKickConfirm.value = false
  kickTargetIndex.value = -1
}

// ── Paramètres du salon (icône "settings", Hôte irery ihany) ─────────
const openRoomSettings = () => {
  if (!isHost.value) return
  showRoomSettings.value = true
}
// Rehefa voa "Confirmer" (ao amin'ny ModalConfirm anaty ModalBet.vue) ny
// fiovana, dia manavao avy hatrany ny "room" eto (tsy miandry ny "poll"
// manaraka intsony) mba haingana kokoa ny fisehoan'ny fiovana.
const onSettingsUpdated = () => { fetchRoom() }

const copyRoomId = async () => {
  try { await navigator.clipboard.writeText(props.roomId) } catch { /* silencieux */ }
  codeCopied.value = true
  setTimeout(() => { codeCopied.value = false }, 2000)
}

const handleClose = () => {
  stopPolling()
  stopStartCountdownTicker()
  startCountdown.value = null
  stopMatchCountdownTicker()
  matchCountdown.value = null
  emit('close')
}

watch(() => props.show, (val) => {
  if (val) {
    localVisible.value = true
    closing.value = false
    loading.value = true
    gameStartEmitted = false
    selfLeaving = false
    errorMsg.value = ''
    showLeaveConfirm.value = false
    leaveLoading.value = false
    showKickConfirm.value = false
    kickLoading.value = false
    kickTargetIndex.value = -1
    showColorConflict.value = false
    colorConflictLoading.value = false
    showRoomSettings.value = false
    showRoomInfo.value = false
    showRoomChat.value = false
    for (const k in presenceMap) delete presenceMap[k]
    document.body.style.overflow = 'hidden'
    // Raha efa tonga ny "roomId" dia manomboka mivantana ny polling;
    // raha mbola tsy tonga (ohatra: mbola miandry ny valin'ny
    // "create-room" avy any Home.vue), dia ilay watch(roomId) eto
    // ambany no hanomboka azy rehefa vao azo.
    if (props.roomId) startPolling()
  } else {
    stopPolling()
    closing.value = true
    // BUGFIX : raha nisokatra ilay "Paramètres du salon"/"Informations du
    // salon" (ModalBet, mode="settings"/"view") na ilay "Chat" (ModalChat,
    // roomMode) ka tampoka foana/kicked/Hors ligne ny Salon, dia mikatona
    // miaraka amin'ity ModalRoom ity koa izy ireo — tsy mijanona miseho
    // irery any ambony.
    showRoomSettings.value = false
    showRoomInfo.value = false
    showRoomChat.value = false
    showColorConflict.value = false
    setTimeout(() => {
      localVisible.value = false
      closing.value = false
      document.body.style.overflow = 'auto'
    }, 400)
  }
}, { immediate: true })

// Manomboka ny polling rehefa vao tonga ny "roomId", raha sendra
// niseho talohan'izay ilay modal (jereo Home.vue → onCreateRoom).
watch(() => props.roomId, (val) => {
  if (val && props.show && !pollTimer) startPolling()
})

onUnmounted(() => {
  stopPolling()
  stopStartCountdownTicker()
  stopMatchCountdownTicker()
})
</script>

<style scoped>
.ovl {
  position: fixed; inset: 0; z-index: 5000;
  background: rgba(3, 8, 18, 0.72);
  display: flex; align-items: center; justify-content: center;
  padding: 16px; backdrop-filter: blur(3px);
  opacity: 0; pointer-events: none; transition: opacity .3s;
}
.ovl.on { opacity: 1; pointer-events: auto; }
.ovl.off { opacity: 0; pointer-events: none; }

.mdl {
  position: relative; width: 100%; max-width: 420px;
  max-height: 88vh; overflow-y: auto;
  background: linear-gradient(to bottom, #0f4a82, #08264a);
  border: 4px solid rgba(255, 255, 255, .1);
  border-radius: 24px; padding: 22px 18px 18px;
  box-shadow: 0 20px 60px rgba(0,0,0,.6);
}

.mtitle-sm { font-size: 18px; font-weight: 900; text-align: center; color: #ffe9c0; margin-bottom: 12px; }

/* "Salon privé"/"Salon public" — icône look/unlock eo ankavia (mena
   raha "privé", mavo raha "public" — mitovy loko amin'ny room-lock-icon
   ao ModalChat.vue). */
.room-title-lock { display: inline-flex; align-items: center; vertical-align: middle; }
/* "margin-right" (fa tsy "gap") satria soratra "bare" no manaraka ny
   icone anaty ".room-title-lock" (jereo .vbtn ao ModalProfile.vue). */
.room-lock-title-icon { font-size: 18px; margin-right: 6px; }
.room-lock-title-icon.is-private { color: #ff5c5c; }
.room-lock-title-icon.is-public  { color: #ffd966; }

.room-header-row {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 16px;
}
.room-header-row > * + * { margin-left: 10px; }

.room-code {
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,220,.07); border: 1px solid rgba(255,240,160,.18);
  border-radius: 14px; padding: 8px 14px; cursor: pointer;
  width: fit-content;
}
.room-code > * + * { margin-left: 8px; }
.room-code-sm { padding: 5px 10px; border-radius: 11px; }
.room-code-sm > * + * { margin-left: 6px; }
.rc-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(255,245,200,.4); }
.rc-val { font-size: 16px; font-weight: 900; letter-spacing: 3px; color: #ffd966; }
.rc-val-sm { font-size: 12px; letter-spacing: 2px; }
.rc-copy { font-size: 16px; color: rgba(255,245,200,.5); }

.room-header-actions { display: flex; align-items: center; flex-shrink: 0; }
.room-header-actions > * + * { margin-left: 8px; }
.rh-icon-btn {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,220,.07); border: 1px solid rgba(255,240,160,.18);
  color: #ffe9c0; cursor: pointer;
}
.rh-icon-btn .material-icons { font-size: 17px; }

.stake-badge {
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,217,102,.12); border: 1px solid rgba(255,217,102,.3);
  border-radius: 14px; padding: 7px 16px; margin-bottom: 16px;
  width: fit-content; margin-left: auto; margin-right: auto;
  font-size: 13.5px; font-weight: 800; color: #ffd966; letter-spacing: .3px;
}
/* "margin-right" satria soratra "bare" no manaraka ny icone. */
.stake-badge .material-icons { font-size: 17px; margin-right: 7px; }


.room-loading { display: flex; justify-content: center; padding: 40px 0; }
.list-spinner {
  width: 30px; height: 30px; border-radius: 50%;
  border: 2.5px solid rgba(255,217,102,.2); border-top-color: #ffd966;
  animation: rspin .7s linear infinite;
}
@keyframes rspin { to { transform: rotate(360deg); } }

.slots-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 10px; margin-bottom: 16px;
}
.slot {
  position: relative; border-radius: 16px; padding: 12px 10px 8px;
  display: flex; flex-direction: column; align-items: center;
  min-height: 118px; border: 1.5px solid rgba(255,255,255,.1);
}
.slot > * + * { margin-top: 4px; }
.slot-red    { background: linear-gradient(160deg, rgba(255,77,46,.16), rgba(60,10,5,.3)); }
.slot-green  { background: linear-gradient(160deg, rgba(43,239,122,.16), rgba(5,50,20,.3)); }
.slot-blue   { background: linear-gradient(160deg, rgba(57,185,255,.16), rgba(5,25,50,.3)); }
.slot-yellow { background: linear-gradient(160deg, rgba(255,229,92,.16), rgba(50,40,5,.3)); }

.slot-ava { font-size: 30px; margin-top: 4px; }
.slot-name { font-size: 12.5px; font-weight: 800; color: #fff; text-align: center; }
.slot-tags { margin-top: 2px; }
.tag { display: inline-flex; align-items: center; font-size: 9.5px; font-weight: 800;
  padding: 2px 8px; border-radius: 10px; text-transform: uppercase; letter-spacing: .4px; }
/* "margin-right" satria soratra "bare" no manaraka ny icone (rehefa misy). */
.tag .material-icons { font-size: 11px; margin-right: 3px; }
.tag-host  { background: rgba(255,220,100,.2); color: #ffd966; }
.tag-ready { background: rgba(60,220,100,.2); color: #6cfa8e; }
.tag-wait  { background: rgba(255,255,255,.08); color: rgba(255,255,255,.45); }
.tag-offline { background: rgba(150,150,160,.22); color: rgba(220,220,228,.7); }
.tag-insufficient { background: rgba(255,90,90,.18); color: #ff8080; }

.slot-kick {
  position: absolute; top: 6px; right: 6px; width: 22px; height: 22px;
  border-radius: 50%; border: none; background: rgba(220,50,50,.25); color: #ff8080;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.slot-kick .material-icons { font-size: 13px; }

.slot-empty {
  flex: 1; width: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: none; border: 1.5px dashed rgba(255,255,255,.25);
  border-radius: 12px; color: rgba(255,255,255,.5); cursor: pointer;
  min-height: 76px; margin-top: 2px; transition: background .15s;
}
.slot-empty:hover:not(:disabled) { background: rgba(255,255,255,.06); }
.slot-empty:disabled { opacity: .4; cursor: not-allowed; }
.slot-empty .material-icons { font-size: 20px; }
.slot-empty-lbl { font-size: 10.5px; font-weight: 700; margin-top: 4px; }

.slot-color-lbl {
  font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .6px; color: rgba(255,255,255,.35); margin-top: 2px;
}

.room-status {
  display: flex; align-items: center; justify-content: center;
  background: rgba(43,239,122,.12); border: 1px solid rgba(43,239,122,.35);
  color: #6cfa8e; font-weight: 800; font-size: 13px;
  border-radius: 14px; padding: 10px; margin-bottom: 14px;
}
.room-status .material-icons { margin-right: 8px; }

/* Countdown 60s "Multijoueur" */
.mp-countdown {
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,217,102,.12); border: 1px solid rgba(255,217,102,.35);
  color: #ffd966; font-weight: 800; font-size: 13px;
  border-radius: 14px; padding: 10px; margin-bottom: 14px;
}
.mp-countdown .material-icons { font-size: 16px; margin-right: 8px; }
.mp-countdown-urgent {
  background: rgba(255,90,90,.14); border-color: rgba(255,90,90,.4);
  color: #ff8080; animation: mpCountdownPulse .6s ease-in-out infinite alternate;
}
@keyframes mpCountdownPulse { from { transform: scale(1); } to { transform: scale(1.04); } }

.room-actions { display: flex; flex-direction: column; }
.room-actions > * + * { margin-top: 8px; }
.rbtn {
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 16px; padding: 12px; font-size: 13.5px;
  font-weight: 800; cursor: pointer; transition: filter .2s, transform .15s;
}
/* "margin-right" satria soratra "bare" no manaraka ny icone anaty .rbtn. */
.rbtn .material-icons { margin-right: 8px; }
.rbtn:hover:not(:disabled) { filter: brightness(1.12); transform: scale(1.01); }
.rbtn:disabled { opacity: .4; cursor: not-allowed; }

.rbtn-ready { background: rgba(255,255,255,.08); border: 1.5px solid rgba(255,255,255,.2); color: #fff; }
.rbtn-ready.rbtn-on { background: rgba(60,220,100,.18); border-color: rgba(60,220,100,.5); color: #6cfa8e; }
.ready-icon-spin { animation: mpLoopSpin 0.8s linear infinite; }
.rbtn-start { background: linear-gradient(135deg, #ffd966, #c9a83a); color: #2a1e00; }
.rbtn-start.rbtn-counting:disabled { opacity: 1; font-size: 17px; letter-spacing: 1px; animation: rbtnCountPulse .5s ease-in-out infinite alternate; }
.rbtn-ready.rbtn-counting:disabled { opacity: 1; background: rgba(255,217,102,.18); border-color: rgba(255,217,102,.5); color: #ffd966; font-size: 17px; letter-spacing: 1px; animation: rbtnCountPulse .5s ease-in-out infinite alternate; }
@keyframes rbtnCountPulse { from { transform: scale(1); } to { transform: scale(1.06); } }
.rbtn-leave { background: rgba(220,80,80,.14); border: 1.5px solid rgba(220,80,80,.4); color: #ff8080; }

/* ══ Mode recherche (matchmaking) ══════════════════════════════ */
.slot-neutral { background: linear-gradient(160deg, rgba(120,120,128,.22), rgba(20,20,24,.4)); }

.slot-empty-search { cursor: default; }
.mp-loop-icon { animation: mpLoopSpin 1.1s linear infinite; }
@keyframes mpLoopSpin { to { transform: rotate(360deg); } }
</style>
