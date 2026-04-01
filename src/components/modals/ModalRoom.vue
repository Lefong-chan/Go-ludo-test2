<template>
  <Teleport to="body">
    <Transition name="room-fade">
      <div
        v-if="localVisible"
        :class="['room-ovl', closing ? 'off' : 'on']"
      >
        <div class="room-mdl">

          <!-- ── LEAVE ROOM button – ambony ankavanana ── -->
          <button class="room-leave-top" @click="askLeave">
            <span class="material-icons">exit_to_app</span>
            Leave Room
          </button>

          <!-- Title -->
          <h2 class="room-title">Game Room</h2>

          <!-- Room ID -->
          <div class="room-id-badge">
            <span class="material-icons" style="font-size:14px; opacity:.5;">tag</span>
            <span class="room-id-text">{{ roomId || '———' }}</span>
          </div>

          <!-- ── 4 Player Slots ── -->
          <div class="slots-grid">

            <!-- Slot 0: Rouge -->
            <div class="slot slot-red">
              <div class="slot-inner">
                <template v-if="players[0]">
                  <div class="slot-avatar">{{ players[0].avatar || '👤' }}</div>
                </template>
                <template v-else>
                  <!--
                    isHost  = nanao invitation = miseho + (afaka manoso invitation)
                    isGuest = nandray invitation = miseho Waiting
                  -->
                  <button v-if="isHost" class="slot-add-btn" @click="openInvite">
                    <span class="material-icons">add</span>
                  </button>
                  <span v-else class="slot-empty-icon material-icons">hourglass_empty</span>
                </template>
              </div>
              <div class="slot-name">
                <span v-if="players[0]" class="slot-username">
                  {{ players[0].username }}
                  <span v-if="players[0].isMe" class="slot-you-badge">You</span>
                  <!-- Host mahita Ready/Not Ready an'ireo guests -->
                  <span
                    v-if="isHost && !players[0].isMe"
                    class="slot-ready-badge"
                    :class="players[0].ready ? 'badge-ready' : 'badge-not-ready'"
                  >{{ players[0].ready ? 'Ready' : 'Not Ready' }}</span>
                </span>
                <span v-else class="slot-waiting">
                  <span class="material-icons slot-wait-icon">schedule</span>
                  Waiting
                </span>
              </div>
            </div>

            <!-- Slot 1: Vert -->
            <div class="slot slot-green">
              <div class="slot-inner">
                <template v-if="players[1]">
                  <div class="slot-avatar">{{ players[1].avatar || '👤' }}</div>
                </template>
                <template v-else>
                  <button v-if="isHost" class="slot-add-btn" @click="openInvite">
                    <span class="material-icons">add</span>
                  </button>
                  <span v-else class="slot-empty-icon material-icons">hourglass_empty</span>
                </template>
              </div>
              <div class="slot-name">
                <span v-if="players[1]" class="slot-username">
                  {{ players[1].username }}
                  <span v-if="players[1].isMe" class="slot-you-badge">You</span>
                  <span
                    v-if="isHost && !players[1].isMe"
                    class="slot-ready-badge"
                    :class="players[1].ready ? 'badge-ready' : 'badge-not-ready'"
                  >{{ players[1].ready ? 'Ready' : 'Not Ready' }}</span>
                </span>
                <span v-else class="slot-waiting">
                  <span class="material-icons slot-wait-icon">schedule</span>
                  Waiting
                </span>
              </div>
            </div>

            <!-- Slot 2: Bleu -->
            <div class="slot slot-blue">
              <div class="slot-inner">
                <template v-if="players[2]">
                  <div class="slot-avatar">{{ players[2].avatar || '👤' }}</div>
                </template>
                <template v-else>
                  <button v-if="isHost" class="slot-add-btn" @click="openInvite">
                    <span class="material-icons">add</span>
                  </button>
                  <span v-else class="slot-empty-icon material-icons">hourglass_empty</span>
                </template>
              </div>
              <div class="slot-name">
                <span v-if="players[2]" class="slot-username">
                  {{ players[2].username }}
                  <span v-if="players[2].isMe" class="slot-you-badge">You</span>
                  <span
                    v-if="isHost && !players[2].isMe"
                    class="slot-ready-badge"
                    :class="players[2].ready ? 'badge-ready' : 'badge-not-ready'"
                  >{{ players[2].ready ? 'Ready' : 'Not Ready' }}</span>
                </span>
                <span v-else class="slot-waiting">
                  <span class="material-icons slot-wait-icon">schedule</span>
                  Waiting
                </span>
              </div>
            </div>

            <!-- Slot 3: Jaune -->
            <div class="slot slot-yellow">
              <div class="slot-inner">
                <template v-if="players[3]">
                  <div class="slot-avatar">{{ players[3].avatar || '👤' }}</div>
                </template>
                <template v-else>
                  <button v-if="isHost" class="slot-add-btn" @click="openInvite">
                    <span class="material-icons">add</span>
                  </button>
                  <span v-else class="slot-empty-icon material-icons">hourglass_empty</span>
                </template>
              </div>
              <div class="slot-name">
                <span v-if="players[3]" class="slot-username">
                  {{ players[3].username }}
                  <span v-if="players[3].isMe" class="slot-you-badge">You</span>
                  <span
                    v-if="isHost && !players[3].isMe"
                    class="slot-ready-badge"
                    :class="players[3].ready ? 'badge-ready' : 'badge-not-ready'"
                  >{{ players[3].ready ? 'Ready' : 'Not Ready' }}</span>
                </span>
                <span v-else class="slot-waiting">
                  <span class="material-icons slot-wait-icon">schedule</span>
                  Waiting
                </span>
              </div>
            </div>

          </div>

          <!-- Player count -->
          <div class="room-player-count">
            <span class="material-icons" style="font-size:15px;">people</span>
            {{ activePlayers }}/4 players joined
          </div>

          <!-- ── Actions ── -->
          <div class="room-actions">

            <!--
              HOST (nanao invitation)  → START GAME
              GUEST (nandray invitation) → Ready / Not Ready
            -->

            <button
              v-if="isHost"
              class="room-btn room-btn-play"
              :disabled="isStarting || activePlayers < 2 || hasNotReady"
              @click="startGame"
            >
              <span v-if="isStarting" class="room-btn-spin"></span>
              <template v-else>
                <span class="material-icons">play_arrow</span>
                Start Game
                <span v-if="activePlayers < 2"   class="room-btn-hint">(Waiting for players)</span>
                <span v-else-if="hasNotReady"     class="room-btn-hint">(Not everyone is ready)</span>
              </template>
            </button>

            <button
              v-else
              class="room-btn"
              :class="myReady ? 'room-btn-notready' : 'room-btn-ready'"
              @click="toggleReady"
            >
              <span class="material-icons">{{ myReady ? 'close' : 'check_circle' }}</span>
              {{ myReady ? 'Not Ready' : 'Ready' }}
            </button>

          </div>

        </div>
      </div>
    </Transition>

    <!-- ── ModalConfirm: Leave Room ── -->
    <ModalConfirm
      v-model="confirmLeave"
      title="Leave Room?"
      message="Are you sure you want to leave this room?"
      confirm-label="Leave"
      cancel-label="Stay"
      type="danger"
      icon="exit_to_app"
      :loading="isLeaving"
      @confirm="doLeave"
    />

    <!-- ── ModalSocial: invitation depuis la room ── -->
    <ModalSocial
      :show="showInviteModal"
      :my-firebase-uid="myUid"
      :my-username="myName"
      :my-avatar="myAvatar"
      :room-invite-mode="true"
      :room-id="roomId"
      @close="showInviteModal = false"
    />

    <!-- ── ModalNotification: room dissolved by host ── -->
    <ModalNotification
      :message="dissolvedMsg"
      type="info"
      :duration="4000"
      @close="dissolvedMsg = ''"
    />

  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { initializeApp, getApps }            from 'firebase/app'
import {
  getDatabase,
  ref      as dbRef,
  onValue,
  off,
  set      as dbSet,
  remove,
  update,
  serverTimestamp,
}                                            from 'firebase/database'
import ModalConfirm      from './ModalConfirm.vue'
import ModalSocial       from './ModalSocial.vue'
import ModalNotification from './ModalNotification.vue'

// ── Firebase ───────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       'https://go-ludo-gascar-default-rtdb.europe-west1.firebasedatabase.app',
}
const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const rtdb        = getDatabase(firebaseApp)

// ── Props / Emits ──────────────────────────────────────────────
const props = defineProps({
  show:     { type: Boolean, default: false },
  roomId:   { type: String,  default: '' },
  myUid:    { type: String,  default: '' },
  myName:   { type: String,  default: 'Player' },
  myAvatar: { type: String,  default: '👤' },
})

const emit = defineEmits(['close', 'game-start'])

// ── State ──────────────────────────────────────────────────────
const localVisible    = ref(false)
const closing         = ref(false)
const players         = ref([null, null, null, null])
const isStarting      = ref(false)
const confirmLeave    = ref(false)
const isLeaving       = ref(false)
const showInviteModal = ref(false)
const dissolvedMsg    = ref('')

// ── Computed ───────────────────────────────────────────────────
const activePlayers = computed(() => players.value.filter(Boolean).length)

/**
 * isHost  = ilay nanao invitation (olona voalohany tafiditra ao amin'ny room)
 *         → miseho + button eo amin'ny slots banga
 *         → miseho START GAME button
 * isGuest = ilay nandray invitation
 *         → miseho hourglass (Waiting) eo amin'ny slots banga
 *         → miseho Ready / Not Ready button
 */
const isHost = computed(() => {
  const first = players.value.find(Boolean)
  return first?.firebaseUid === props.myUid
})

// Misy Guest Not Ready? (Host tsy isaina)
const hasNotReady = computed(() => {
  const hostUid = players.value.find(Boolean)?.firebaseUid
  return players.value
    .filter(Boolean)
    .filter(p => p.firebaseUid !== hostUid)
    .some(p => !p.ready)
})

// Status Ready an'ity utilisateur ity
const myReady = computed(() => {
  const me = players.value.find(p => p?.firebaseUid === props.myUid)
  return !!me?.ready
})

// ── Toggle Ready (Guest) ───────────────────────────────────────
const toggleReady = async () => {
  if (!props.roomId || !props.myUid) return
  const playerRef = dbRef(rtdb, `rooms/${props.roomId}/players/${props.myUid}`)
  await update(playerRef, { ready: !myReady.value })
}

// ── Open invite modal ──────────────────────────────────────────
const openInvite = () => { showInviteModal.value = true }

// ── RTDB listener ──────────────────────────────────────────────
let roomRef   = null
let unsubRoom = null

const startRoomListener = () => {
  if (!props.roomId) return

  // Mihaino ny room manontolo (tsy players ihany)
  // mba hahita raha voafafa ny room (Host niala)
  roomRef = dbRef(rtdb, `rooms/${props.roomId}`)

  const handler = (snap) => {
    const roomData = snap.val()

    // Room voafafa → Guest manaiky notification ary mikatona
    if (!roomData) {
      if (!isHost.value) {
        const hostName = players.value.find(Boolean)?.username || 'The host'
        dissolvedMsg.value = `${hostName} has closed the room. You have been removed.`
      }
      forceClose()
      return
    }

    const data  = roomData.players || {}
    const slots = [null, null, null, null]
    Object.values(data).forEach((p, i) => {
      if (i < 4) slots[i] = { ...p, isMe: p.firebaseUid === props.myUid }
    })
    players.value = slots
  }

  onValue(roomRef, handler)
  unsubRoom = () => off(roomRef, 'value', handler)
}

const stopRoomListener = () => {
  if (unsubRoom) { unsubRoom(); unsubRoom = null }
}

// ── Fermeture forcée (triggered by Firebase) ──────────────────
const forceClose = () => {
  stopRoomListener()
  closing.value = true
  setTimeout(() => {
    localVisible.value = false
    closing.value      = false
    document.body.style.overflow = 'auto'
    emit('close')
  }, 400)
}

// ── Join room ──────────────────────────────────────────────────
const joinRoom = async () => {
  if (!props.roomId || !props.myUid) return
  const playerRef = dbRef(rtdb, `rooms/${props.roomId}/players/${props.myUid}`)
  await dbSet(playerRef, {
    firebaseUid: props.myUid,
    username:    props.myName,
    avatar:      props.myAvatar,
    ready:       false,
    joinedAt:    serverTimestamp(),
  })
}

// ── Leave room ─────────────────────────────────────────────────
const leaveRoom = async () => {
  if (!props.roomId || !props.myUid) return
  try {
    if (isHost.value) {
      // Host (nanao invitation) miala → mafaho room manontolo → ejected avokoa ny guests
      await remove(dbRef(rtdb, `rooms/${props.roomId}`))
    } else {
      // Guest (nandray invitation) miala → izy irery no esorina
      const playerRef = dbRef(rtdb, `rooms/${props.roomId}/players/${props.myUid}`)
      await remove(playerRef)
      const playersSnap = await new Promise(resolve => {
        const r = dbRef(rtdb, `rooms/${props.roomId}/players`)
        onValue(r, snap => { off(r); resolve(snap) }, { onlyOnce: true })
      })
      if (!playersSnap.val() || Object.keys(playersSnap.val()).length === 0) {
        await remove(dbRef(rtdb, `rooms/${props.roomId}`))
      }
    }
  } catch { }
}

// ── Ask Leave ─────────────────────────────────────────────────
const askLeave = () => { confirmLeave.value = true }

const doLeave = async () => {
  isLeaving.value = true
  // Atsahatra aloha ny listener mba tsy hampiasa ilay "room deleted" handler
  stopRoomListener()
  await leaveRoom()
  isLeaving.value    = false
  confirmLeave.value = false
  closing.value = true
  setTimeout(() => {
    localVisible.value = false
    closing.value      = false
    document.body.style.overflow = 'auto'
    emit('close')
  }, 400)
}

// ── Start game ─────────────────────────────────────────────────
const startGame = async () => {
  if (isStarting.value || activePlayers.value < 2 || hasNotReady.value) return
  isStarting.value = true
  try {
    const roomStatusRef = dbRef(rtdb, `rooms/${props.roomId}/status`)
    await dbSet(roomStatusRef, 'starting')
    emit('game-start', {
      roomId:  props.roomId,
      players: players.value.filter(Boolean),
    })
  } catch {
    isStarting.value = false
  }
}

// ── Watch show ────────────────────────────────────────────────
watch(() => props.show, async (val) => {
  if (val) {
    localVisible.value = true
    closing.value      = false
    isStarting.value   = false
    dissolvedMsg.value = ''
    players.value      = [null, null, null, null]
    document.body.style.overflow = 'hidden'
    startRoomListener()
    await joinRoom()
  } else {
    closing.value = true
    stopRoomListener()
    setTimeout(() => {
      localVisible.value = false
      closing.value      = false
      document.body.style.overflow = 'auto'
    }, 400)
  }
})

onUnmounted(() => stopRoomListener())
</script>

<style scoped>
/* ── Overlay ── */
.room-ovl {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(3px);
  display: flex; place-content: center; place-items: center;
  z-index: 5000;
}
.room-ovl.on  { display: flex; }
.room-ovl.off { animation: rFade .4s forwards; }

/* ── Modal box ── */
.room-mdl {
  border-radius: 32px;
  padding: 56px 24px 32px;
  width: 90%; max-width: 380px;
  position: relative; color: #fff9e0;
  background: linear-gradient(160deg, #0b3a28 0%, #041510 100%);
  border: 2px solid rgba(61, 220, 132, 0.2);
  box-shadow:
    0 24px 64px rgba(0,0,0,.75),
    0 0 0 1px rgba(255,255,255,.05) inset,
    0 0 40px rgba(20, 180, 80, 0.06);
}

.room-ovl.on  .room-mdl { animation: rZoom .4s ease-out forwards; }
.room-ovl.off .room-mdl { animation: rOut  .4s ease-in  forwards; }

@keyframes rZoom {
  0%   { opacity: 0; transform: scale(.5); }
  55%  { opacity: 1; transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes rOut  {
  0%   { transform: scale(1);  opacity: 1; }
  100% { transform: scale(.4); opacity: 0; }
}
@keyframes rFade { to { opacity: 0; } }

/* ── Leave Room button – ambony ankavanana ── */
.room-leave-top {
  position: absolute; top: 14px; right: 16px;
  display: flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 20px;
  background: linear-gradient(135deg, rgba(220,80,70,.2), rgba(160,30,30,.12));
  border: 1.5px solid rgba(220,80,70,.4);
  color: #ff8080; font-size: 11.5px; font-weight: 800;
  letter-spacing: .4px; text-transform: uppercase;
  cursor: pointer; transition: .2s;
}
.room-leave-top .material-icons { font-size: 15px; }
.room-leave-top:hover { background: rgba(220,80,70,.35); transform: translateY(-1px); }

/* ── Title ── */
.room-title {
  font-family: 'Chicle', cursive; font-size: 32px;
  color: #fffacd; text-align: center; letter-spacing: 3px;
  text-shadow: 0 4px 12px rgba(0,0,0,.6);
  margin-bottom: 6px;
}

.room-id-badge {
  display: flex; align-items: center; justify-content: center;
  gap: 4px; margin-bottom: 22px;
  color: rgba(255,245,200,.3); font-size: 11px;
  letter-spacing: 2px; font-weight: 700;
}
.room-id-text { font-family: monospace; font-size: 12px; }

/* ── Slots grid 2×2 ── */
.slots-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-bottom: 16px;
}

.slot {
  border-radius: 20px;
  padding: 16px 12px 12px;
  display: flex; flex-direction: column;
  align-items: center; gap: 10px;
  border: 2px solid;
  transition: box-shadow .3s;
  min-height: 110px;
  justify-content: center;
}

.slot-red {
  background: linear-gradient(160deg, rgba(200,40,40,.22), rgba(120,10,10,.12));
  border-color: rgba(255,80,80,.35);
  box-shadow: 0 4px 20px rgba(200,30,30,.15);
}
.slot-green {
  background: linear-gradient(160deg, rgba(30,180,80,.22), rgba(10,100,40,.12));
  border-color: rgba(61,220,132,.35);
  box-shadow: 0 4px 20px rgba(20,180,80,.15);
}
.slot-blue {
  background: linear-gradient(160deg, rgba(30,100,220,.22), rgba(10,50,140,.12));
  border-color: rgba(80,160,255,.35);
  box-shadow: 0 4px 20px rgba(30,100,220,.15);
}
.slot-yellow {
  background: linear-gradient(160deg, rgba(220,180,20,.22), rgba(140,100,0,.12));
  border-color: rgba(255,220,60,.35);
  box-shadow: 0 4px 20px rgba(200,160,20,.15);
}

.slot-inner {
  position: relative;
  display: flex; align-items: center; justify-content: center;
}

.slot-avatar {
  font-size: 38px; line-height: 1;
  user-select: none;
  filter: drop-shadow(0 3px 8px rgba(0,0,0,.4));
}

/* ── + Button (Host ihany) ── */
.slot-add-btn {
  width: 44px; height: 44px; border-radius: 50%;
  background: rgba(61,220,132,.12);
  border: 2px dashed rgba(61,220,132,.4);
  color: rgba(61,220,132,.7);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: .2s;
}
.slot-add-btn .material-icons { font-size: 24px; }
.slot-add-btn:hover {
  background: rgba(61,220,132,.24);
  border-color: rgba(61,220,132,.75);
  color: #3ddc84;
  transform: scale(1.1);
}

.slot-empty-icon {
  font-size: 28px; opacity: 0.2;
  animation: emptyPulse 2s ease-in-out infinite;
}
@keyframes emptyPulse {
  0%, 100% { opacity: 0.2; }
  50%       { opacity: 0.4; }
}

.slot-name { text-align: center; min-width: 0; width: 100%; }

.slot-username {
  font-size: 12.5px; font-weight: 800;
  color: #fffbe6; letter-spacing: .3px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: flex; align-items: center; justify-content: center;
  gap: 4px; flex-wrap: wrap;
}

.slot-you-badge {
  font-size: 9px; font-weight: 900;
  background: rgba(255,220,80,.25); border: 1px solid rgba(255,220,80,.4);
  color: #ffd966; border-radius: 8px; padding: 1px 5px;
  letter-spacing: .5px; text-transform: uppercase; flex-shrink: 0;
}

.slot-ready-badge {
  font-size: 8px; font-weight: 900;
  border-radius: 8px; padding: 1px 5px;
  letter-spacing: .5px; text-transform: uppercase; flex-shrink: 0;
}
.badge-ready     { background: rgba(61,220,132,.2); border: 1px solid rgba(61,220,132,.45); color: #3ddc84; }
.badge-not-ready { background: rgba(220,80,70,.2);  border: 1px solid rgba(220,80,70,.45);  color: #ff8080; }

.slot-waiting {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  font-size: 11px; font-weight: 600;
  color: rgba(255,245,200,.25); letter-spacing: .5px; font-style: italic;
}
.slot-wait-icon {
  font-size: 13px !important; opacity: 0.5;
  animation: emptyPulse 2s ease-in-out infinite;
}

/* ── Player count ── */
.room-player-count {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; font-size: 12px; font-weight: 700;
  color: rgba(255,245,200,.4); letter-spacing: .5px;
  margin-bottom: 18px;
}

/* ── Actions ── */
.room-actions { display: flex; flex-direction: column; gap: 10px; }

.room-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px 20px; border-radius: 18px; border: none;
  cursor: pointer; font-size: 14px; font-weight: 800;
  letter-spacing: .5px; transition: .2s; text-transform: uppercase;
}
.room-btn .material-icons { font-size: 20px; }
.room-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
.room-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }

.room-btn-play {
  background: linear-gradient(135deg, rgba(43,239,122,.25), rgba(15,168,68,.15));
  border: 1.5px solid rgba(43,239,122,.5);
  color: #3ddc84;
  box-shadow: 0 6px 20px rgba(43,200,100,.2);
}
.room-btn-hint {
  font-size: 10px; font-weight: 600; opacity: .6;
  text-transform: none; letter-spacing: 0;
}
.room-btn-ready {
  background: linear-gradient(135deg, rgba(43,239,122,.2), rgba(15,168,68,.1));
  border: 1.5px solid rgba(43,239,122,.4);
  color: #3ddc84;
}
.room-btn-notready {
  background: linear-gradient(135deg, rgba(220,80,70,.15), rgba(160,30,30,.08));
  border: 1.5px solid rgba(220,80,70,.35);
  color: #ff8080;
}

/* ── Spinner ── */
.room-btn-spin {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2.5px solid rgba(61,220,132,.25);
  border-top-color: #3ddc84;
  animation: rSpin .65s linear infinite; flex-shrink: 0;
}
@keyframes rSpin { to { transform: rotate(360deg); } }
</style>
