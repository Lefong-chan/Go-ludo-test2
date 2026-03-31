<template>
  <Teleport to="body">
    <Transition name="room-fade">
      <div
        v-if="localVisible"
        :class="['room-ovl', closing ? 'off' : 'on']"
        @click.self="handleClose"
      >
        <div class="room-mdl">

          <!-- Close button -->
          <button class="room-x" @click="handleClose">
            <span class="material-icons">close</span>
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
            <!-- Slot 0: Rouge – haut gauche -->
            <div class="slot slot-red">
              <div class="slot-inner">
                <template v-if="players[0]">
                  <div class="slot-avatar">{{ players[0].avatar || '👤' }}</div>
                  <div class="slot-indicator slot-indicator-on">
                    <span class="slot-dot"></span>
                  </div>
                </template>
                <template v-else>
                  <span class="slot-empty-icon material-icons">hourglass_empty</span>
                </template>
              </div>
              <div class="slot-name">
                <span v-if="players[0]" class="slot-username">
                  {{ players[0].username }}
                  <span v-if="players[0].isMe" class="slot-you-badge">You</span>
                </span>
                <span v-else class="slot-waiting">Waiting…</span>
              </div>
            </div>

            <!-- Slot 1: Vert – haut droite -->
            <div class="slot slot-green">
              <div class="slot-inner">
                <template v-if="players[1]">
                  <div class="slot-avatar">{{ players[1].avatar || '👤' }}</div>
                  <div class="slot-indicator slot-indicator-on">
                    <span class="slot-dot"></span>
                  </div>
                </template>
                <template v-else>
                  <span class="slot-empty-icon material-icons">hourglass_empty</span>
                </template>
              </div>
              <div class="slot-name">
                <span v-if="players[1]" class="slot-username">
                  {{ players[1].username }}
                  <span v-if="players[1].isMe" class="slot-you-badge">You</span>
                </span>
                <span v-else class="slot-waiting">Waiting…</span>
              </div>
            </div>

            <!-- Slot 2: Bleu – bas gauche -->
            <div class="slot slot-blue">
              <div class="slot-inner">
                <template v-if="players[2]">
                  <div class="slot-avatar">{{ players[2].avatar || '👤' }}</div>
                  <div class="slot-indicator slot-indicator-on">
                    <span class="slot-dot"></span>
                  </div>
                </template>
                <template v-else>
                  <span class="slot-empty-icon material-icons">hourglass_empty</span>
                </template>
              </div>
              <div class="slot-name">
                <span v-if="players[2]" class="slot-username">
                  {{ players[2].username }}
                  <span v-if="players[2].isMe" class="slot-you-badge">You</span>
                </span>
                <span v-else class="slot-waiting">Waiting…</span>
              </div>
            </div>

            <!-- Slot 3: Jaune – bas droite -->
            <div class="slot slot-yellow">
              <div class="slot-inner">
                <template v-if="players[3]">
                  <div class="slot-avatar">{{ players[3].avatar || '👤' }}</div>
                  <div class="slot-indicator slot-indicator-on">
                    <span class="slot-dot"></span>
                  </div>
                </template>
                <template v-else>
                  <span class="slot-empty-icon material-icons">hourglass_empty</span>
                </template>
              </div>
              <div class="slot-name">
                <span v-if="players[3]" class="slot-username">
                  {{ players[3].username }}
                  <span v-if="players[3].isMe" class="slot-you-badge">You</span>
                </span>
                <span v-else class="slot-waiting">Waiting…</span>
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

            <!-- Play button – asehoy rehefa tafiditra ny olona rehetra (2+) -->
            <button
              v-if="activePlayers >= 2 && isHost"
              class="room-btn room-btn-play"
              :disabled="isStarting"
              @click="startGame"
            >
              <span v-if="isStarting" class="room-btn-spin"></span>
              <template v-else>
                <span class="material-icons">play_arrow</span>
                Start Game
              </template>
            </button>

            <div v-else-if="activePlayers >= 2 && !isHost" class="room-waiting-host">
              <span class="material-icons" style="font-size:16px; opacity:.6;">hourglass_top</span>
              Waiting for host to start…
            </div>

            <!-- Quit button -->
            <button class="room-btn room-btn-quit" @click="handleClose">
              <span class="material-icons">exit_to_app</span>
              Leave Room
            </button>

          </div>

        </div>
      </div>
    </Transition>
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
const localVisible = ref(false)
const closing      = ref(false)
const players      = ref([null, null, null, null])
const isStarting   = ref(false)

// ── Computed ───────────────────────────────────────────────────
const activePlayers = computed(() => players.value.filter(Boolean).length)
const isHost = computed(() => {
  const first = players.value.find(Boolean)
  return first?.firebaseUid === props.myUid
})

// ── RTDB listener ──────────────────────────────────────────────
let roomRef  = null
let unsubRoom = null

const startRoomListener = () => {
  if (!props.roomId) return
  roomRef = dbRef(rtdb, `rooms/${props.roomId}/players`)
  const handler = (snap) => {
    const data = snap.val() || {}
    const slots = [null, null, null, null]
    Object.values(data).forEach((p, i) => {
      if (i < 4) {
        slots[i] = {
          ...p,
          isMe: p.firebaseUid === props.myUid,
        }
      }
    })
    players.value = slots
  }
  onValue(roomRef, handler)
  unsubRoom = () => off(roomRef, 'value', handler)
}

const stopRoomListener = () => {
  if (unsubRoom) { unsubRoom(); unsubRoom = null }
}

// ── Join room ──────────────────────────────────────────────────
const joinRoom = async () => {
  if (!props.roomId || !props.myUid) return
  const playerRef = dbRef(rtdb, `rooms/${props.roomId}/players/${props.myUid}`)
  await dbSet(playerRef, {
    firebaseUid: props.myUid,
    username:    props.myName,
    avatar:      props.myAvatar,
    joinedAt:    serverTimestamp(),
  })
}

// ── Leave room ─────────────────────────────────────────────────
const leaveRoom = async () => {
  if (!props.roomId || !props.myUid) return
  try {
    const playerRef = dbRef(rtdb, `rooms/${props.roomId}/players/${props.myUid}`)
    await remove(playerRef)
    // Ra tsy misy olona intsony dia fafao ny room
    const playersSnap = await new Promise(resolve => {
      const r = dbRef(rtdb, `rooms/${props.roomId}/players`)
      onValue(r, snap => { off(r); resolve(snap) }, { onlyOnce: true })
    })
    if (!playersSnap.val() || Object.keys(playersSnap.val()).length === 0) {
      await remove(dbRef(rtdb, `rooms/${props.roomId}`))
    }
  } catch { }
}

// ── Start game ─────────────────────────────────────────────────
const startGame = async () => {
  if (isStarting.value) return
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

// ── Close / Leave ──────────────────────────────────────────────
const handleClose = async () => {
  await leaveRoom()
  emit('close')
}

// ── Watch ──────────────────────────────────────────────────────
watch(() => props.show, async (val) => {
  if (val) {
    localVisible.value = true
    closing.value      = false
    isStarting.value   = false
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

onUnmounted(() => {
  stopRoomListener()
})
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
  padding: 48px 24px 32px;
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

/* ── Close ── */
.room-x {
  position: absolute; top: 16px; right: 18px;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(220, 80, 70, .8); border: none;
  color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: .2s;
}
.room-x:hover { background: #e06a5a; transform: scale(1.15) rotate(90deg); }

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

/* ── Slot colors ── */
.slot-red {
  background: linear-gradient(160deg, rgba(200, 40, 40, 0.22) 0%, rgba(120, 10, 10, 0.12) 100%);
  border-color: rgba(255, 80, 80, 0.35);
  box-shadow: 0 4px 20px rgba(200, 30, 30, 0.15);
}
.slot-green {
  background: linear-gradient(160deg, rgba(30, 180, 80, 0.22) 0%, rgba(10, 100, 40, 0.12) 100%);
  border-color: rgba(61, 220, 132, 0.35);
  box-shadow: 0 4px 20px rgba(20, 180, 80, 0.15);
}
.slot-blue {
  background: linear-gradient(160deg, rgba(30, 100, 220, 0.22) 0%, rgba(10, 50, 140, 0.12) 100%);
  border-color: rgba(80, 160, 255, 0.35);
  box-shadow: 0 4px 20px rgba(30, 100, 220, 0.15);
}
.slot-yellow {
  background: linear-gradient(160deg, rgba(220, 180, 20, 0.22) 0%, rgba(140, 100, 0, 0.12) 100%);
  border-color: rgba(255, 220, 60, 0.35);
  box-shadow: 0 4px 20px rgba(200, 160, 20, 0.15);
}

/* ── Slot inner ── */
.slot-inner {
  position: relative;
  display: flex; align-items: center; justify-content: center;
}

.slot-avatar {
  font-size: 38px; line-height: 1;
  user-select: none;
  filter: drop-shadow(0 3px 8px rgba(0,0,0,.4));
}

.slot-empty-icon {
  font-size: 28px;
  opacity: 0.2;
  animation: emptyPulse 2s ease-in-out infinite;
}

@keyframes emptyPulse {
  0%, 100% { opacity: 0.2; }
  50%       { opacity: 0.4; }
}

.slot-indicator {
  position: absolute; bottom: -4px; right: -8px;
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(5, 21, 16, 0.9);
  display: flex; align-items: center; justify-content: center;
}
.slot-indicator-on  { background: #3ddc84; }

.slot-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(255,255,255,.8);
  animation: dotPulse 1.5s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}

/* ── Slot name ── */
.slot-name {
  text-align: center; min-width: 0; width: 100%;
}

.slot-username {
  font-size: 12.5px; font-weight: 800;
  color: #fffbe6; letter-spacing: .3px;
  white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis;
  display: flex; align-items: center; justify-content: center; gap: 4px;
}

.slot-you-badge {
  font-size: 9px; font-weight: 900;
  background: rgba(255, 220, 80, 0.25);
  border: 1px solid rgba(255, 220, 80, 0.4);
  color: #ffd966;
  border-radius: 8px; padding: 1px 5px;
  letter-spacing: .5px; text-transform: uppercase;
  flex-shrink: 0;
}

.slot-waiting {
  font-size: 11px; font-weight: 600;
  color: rgba(255,245,200,.25);
  letter-spacing: .5px;
  font-style: italic;
}

/* ── Player count ── */
.room-player-count {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; font-size: 12px; font-weight: 700;
  color: rgba(255,245,200,.4); letter-spacing: .5px;
  margin-bottom: 18px;
}

/* ── Actions ── */
.room-actions {
  display: flex; flex-direction: column; gap: 10px;
}

.room-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  width: 100%; padding: 14px 20px; border-radius: 18px; border: none;
  cursor: pointer; font-size: 14px; font-weight: 800;
  letter-spacing: .5px; transition: .2s;
  text-transform: uppercase;
}
.room-btn .material-icons { font-size: 20px; }
.room-btn:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
.room-btn:disabled { opacity: .5; cursor: not-allowed; transform: none !important; }

.room-btn-play {
  background: linear-gradient(135deg, rgba(43, 239, 122, .25), rgba(15, 168, 68, .15));
  border: 1.5px solid rgba(43, 239, 122, .5);
  color: #3ddc84;
  box-shadow: 0 6px 20px rgba(43, 200, 100, .2);
}

.room-btn-quit {
  background: linear-gradient(135deg, rgba(220, 80, 70, .15), rgba(160, 30, 30, .08));
  border: 1.5px solid rgba(220, 80, 70, .35);
  color: #ff8080;
}

.room-waiting-host {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; font-size: 12.5px; font-weight: 700;
  color: rgba(255,245,200,.35);
  letter-spacing: .3px; padding: 12px;
}

/* ── Spinner ── */
.room-btn-spin {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2.5px solid rgba(61, 220, 132, .25);
  border-top-color: #3ddc84;
  animation: rSpin .65s linear infinite; flex-shrink: 0;
}
@keyframes rSpin { to { transform: rotate(360deg); } }
</style>
