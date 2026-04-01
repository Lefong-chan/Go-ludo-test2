<template>
  <Teleport to="body">
    <Transition name="notif-fade">
      <div
        v-if="visible"
        class="notif-toast"
        :class="'notif-toast--' + type"
        role="alert"
        aria-live="assertive"
      >
        <!-- ── INVITATION TYPE ── -->
        <template v-if="type === 'invitation'">
          <div class="inv-header">
            <span class="material-icons inv-icon">sports_esports</span>
            <div class="inv-texts">
              <span class="inv-title">Game Invitation</span>
              <span class="inv-msg">{{ message }}</span>
            </div>
            <!-- Countdown circle -->
            <div class="inv-countdown" :style="countdownStyle">
              <span class="inv-countdown-num">{{ countdown }}</span>
            </div>
            <button class="notif-close" @click="declineInvitation" aria-label="Close">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="inv-actions">
            <button class="inv-btn inv-btn-accept" @click="acceptInvitation">
              <span class="material-icons">check_circle</span>
              Accept
            </button>
            <button class="inv-btn inv-btn-decline" @click="declineInvitation">
              <span class="material-icons">cancel</span>
              Decline
            </button>
          </div>
        </template>

        <!-- ── ERROR / WARNING / INFO TYPE ── -->
        <template v-else>
          <span class="material-icons notif-icon">{{ icon }}</span>
          <span class="notif-msg">{{ message }}</span>
          <button class="notif-close" @click="close" aria-label="Close">
            <span class="material-icons">close</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue'

const INVITATION_DURATION = 10

const props = defineProps({
  message:    { type: String,  default: '' },
  type:       { type: String,  default: 'error' }, // 'error' | 'warning' | 'info' | 'invitation'
  duration:   { type: Number,  default: 4000 },
  inviterUid: { type: String,  default: '' },
  roomId:     { type: String,  default: '' },
})

const emit = defineEmits(['close', 'accept-invitation', 'decline-invitation'])

const visible   = ref(false)
const countdown = ref(INVITATION_DURATION)

let autoTimer         = null
let countdownInterval = null

const icon = computed(() => {
  if (props.type === 'warning') return 'warning'
  if (props.type === 'info')    return 'info'
  return 'error_outline'
})

const countdownStyle = computed(() => ({
  '--pct': countdown.value / INVITATION_DURATION,
}))

const clearTimers = () => {
  clearTimeout(autoTimer)
  clearInterval(countdownInterval)
  autoTimer = null
  countdownInterval = null
}

const startCountdown = () => {
  countdown.value = INVITATION_DURATION
  countdownInterval = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearTimers()
      visible.value = false
      emit('decline-invitation', { inviterUid: props.inviterUid, roomId: props.roomId })
    }
  }, 1000)
}

const show = () => {
  clearTimers()
  visible.value = true
  if (props.type === 'invitation') {
    startCountdown()
  } else if (props.duration > 0) {
    autoTimer = setTimeout(close, props.duration)
  }
}

const close = () => {
  clearTimers()
  visible.value = false
  emit('close')
}

const acceptInvitation = () => {
  clearTimers()
  visible.value = false
  emit('accept-invitation', { inviterUid: props.inviterUid, roomId: props.roomId })
}

const declineInvitation = () => {
  clearTimers()
  visible.value = false
  emit('decline-invitation', { inviterUid: props.inviterUid, roomId: props.roomId })
}

watch(() => props.message, val => {
  if (val) show()
})

onBeforeUnmount(() => clearTimers())

defineExpose({ show, close })
</script>

<style scoped>
.notif-toast {
  position: fixed; top: 18px; right: 18px; z-index: 9999;
  min-width: 280px; max-width: min(400px, calc(100vw - 36px));
  border-radius: 20px; box-shadow: 0 12px 40px rgba(0,0,0,.65);
  font-size: 13px; font-weight: 600; line-height: 1.4;
  backdrop-filter: blur(8px); border: 1.5px solid;
  pointer-events: auto; overflow: hidden;
}

.notif-toast--error {
  background: rgba(140,20,20,.92); border-color: rgba(255,90,90,.5);
  color: #ffe0e0; display: flex; align-items: center; gap: 10px;
  padding: 13px 14px 13px 16px;
}
.notif-toast--warning {
  background: rgba(120,80,0,.92); border-color: rgba(255,200,50,.5);
  color: #fff3c0; display: flex; align-items: center; gap: 10px;
  padding: 13px 14px 13px 16px;
}
.notif-toast--info {
  background: rgba(10,55,110,.95); border-color: rgba(100,180,255,.4);
  color: #d0eaff; display: flex; align-items: center; gap: 10px;
  padding: 13px 14px 13px 16px;
}
.notif-toast--invitation {
  background: linear-gradient(160deg, #0a2a50 0%, #051428 100%);
  border-color: rgba(100,220,120,.5); color: #e0fff0;
  padding: 0; display: flex; flex-direction: column;
}

.inv-header {
  display: flex; align-items: center;
  gap: 12px; padding: 14px 14px 10px 16px;
}
.inv-icon {
  font-size: 30px; color: #3ddc84; flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(61,220,132,.5));
  animation: invPulse 2s ease-in-out infinite;
}
@keyframes invPulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:.75; transform:scale(1.12); }
}
.inv-texts { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
.inv-title { font-size: 11px; font-weight: 800; color: rgba(61,220,132,.7); text-transform: uppercase; letter-spacing: 1.5px; }
.inv-msg   { font-size: 13.5px; font-weight: 700; color: #e8fff5; line-height: 1.4; }

/* ── Countdown circle ── */
.inv-countdown {
  position: relative; width: 36px; height: 36px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.inv-countdown::before {
  content: ''; position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(
    rgba(61,220,132,.7) calc(var(--pct) * 360deg),
    rgba(255,255,255,.08) 0deg
  );
  transition: background .4s linear;
}
.inv-countdown::after {
  content: ''; position: absolute; inset: 5px;
  border-radius: 50%; background: #061e38;
}
.inv-countdown-num {
  position: relative; z-index: 1;
  font-size: 13px; font-weight: 900; color: #3ddc84; line-height: 1;
}

.inv-actions { display: flex; gap: 8px; padding: 8px 14px 14px; }
.inv-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: 6px; padding: 10px 14px; border: none; border-radius: 14px;
  font-size: 12.5px; font-weight: 800; cursor: pointer;
  transition: filter .2s, transform .15s; letter-spacing: .3px;
}
.inv-btn .material-icons { font-size: 17px; }
.inv-btn:hover  { filter: brightness(1.15); transform: scale(1.03); }
.inv-btn:active { transform: scale(.97); }
.inv-btn-accept {
  background: linear-gradient(135deg, rgba(43,239,122,.25), rgba(15,168,68,.15));
  border: 1.5px solid rgba(43,239,122,.5); color: #6cfa8e;
  box-shadow: 0 4px 14px rgba(43,200,100,.2);
}
.inv-btn-decline {
  background: linear-gradient(135deg, rgba(220,80,80,.18), rgba(160,30,30,.1));
  border: 1.5px solid rgba(220,80,80,.4); color: #ff8080;
}

.notif-icon { font-size: 22px; flex-shrink: 0; opacity: .9; }
.notif-msg  { flex: 1; min-width: 0; }

.notif-close {
  background: none; border: none; cursor: pointer; padding: 2px;
  color: inherit; opacity: .55;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; border-radius: 50%;
  transition: opacity .2s, background .2s;
}
.notif-close:hover { opacity: 1; background: rgba(255,255,255,.15); }
.notif-close .material-icons { font-size: 17px; }

.notif-fade-enter-active,
.notif-fade-leave-active { transition: opacity .28s ease, transform .28s ease; }
.notif-fade-enter-from,
.notif-fade-leave-to     { opacity: 0; transform: translateX(50px) scale(.92); }
</style>
