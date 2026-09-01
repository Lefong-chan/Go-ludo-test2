<template>
  <Teleport to="body">
    <Transition name="notif-fade">
      <div
        v-if="visible"
        class="notif-toast"
        :class="'notif-toast--' + (type || 'error')"
        role="alert"
        aria-live="assertive"
      >
        <!-- ── ACTION CARD: invitation / demande d'ami / message ── -->
        <template v-if="type === 'invitation' || type === 'friend-request' || type === 'message'">
          <div class="inv-header">
            <IconMessage v-if="type === 'message'" class="inv-icon" />
            <span v-else class="material-icons inv-icon">
              {{ type === 'friend-request' ? 'person_add' : 'sports_esports' }}
            </span>
            <div class="inv-texts">
              <span class="inv-title">{{ actionTitle }}</span>
              <span class="inv-msg">{{ message }}</span>
            </div>
            <!-- Countdown circle -->
            <div class="inv-countdown" :style="countdownStyle">
              <span class="inv-countdown-num">{{ countdown }}</span>
            </div>
            <button class="notif-close" @click="closeAction" aria-label="Fermer">
              <span class="material-icons">close</span>
            </button>
          </div>
          <div class="inv-actions">
            <button v-if="type === 'message'" class="inv-btn inv-btn-reply inv-btn-full" @click="replyMessage">
              <IconMessage />
              Répondre
            </button>
            <template v-else>
              <button class="inv-btn inv-btn-accept" @click="acceptAction">
                <span class="material-icons">check_circle</span>
                Accepter
              </button>
              <button class="inv-btn inv-btn-decline" @click="closeAction">
                <span class="material-icons">cancel</span>
                Refuser
              </button>
            </template>
          </div>
        </template>

        <!-- ── ERROR / WARNING / INFO TYPE ── -->
        <template v-else>
          <span class="material-icons notif-icon">{{ icon }}</span>
          <span class="notif-msg">{{ message }}</span>
          <button class="notif-close" @click="close" aria-label="Fermer">
            <span class="material-icons">close</span>
          </button>
        </template>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue'
import IconMessage from '../IconMessage.vue'

// INVITATION_DURATION: fahareten'ny modal invitation/demande/message
// (segondra) — mitovy amin'ny telo karazana "action card" ireto.
const INVITATION_DURATION = 10

const props = defineProps({
  message:    { type: String,  default: '' },
  // 'error' | 'warning' | 'info' | 'invitation' | 'friend-request' | 'message'
  type:       { type: String,  default: 'error' },
  duration:   { type: Number,  default: 4000 },
  // "inviterUid" — ilay UID an'ny olona mifandray amin'ity fanambarana
  // ity (izay nandefa ny invitation/demande/hafatra), ampiasaina amin'ny
  // 3 karazana "action card" rehetra.
  inviterUid: { type: String,  default: '' },
  roomId:     { type: String,  default: '' },
  // "senderName" — anaran'ilay utilisateur (mandefa demande na hafatra),
  // aseho ho "titre" an'ny fanambarana 'friend-request'/'message'.
  senderName: { type: String,  default: '' },
})

const emit = defineEmits([
  'close',
  'accept-invitation', 'decline-invitation',
  'accept-friend-request', 'decline-friend-request',
  'reply-message',
])

const visible   = ref(false)
const countdown = ref(INVITATION_DURATION)

let autoTimer         = null
let countdownInterval = null

const icon = computed(() => {
  if (props.type === 'warning') return 'warning'
  if (props.type === 'info')    return 'info'
  return 'error_outline'
})

const isActionType = computed(() =>
  props.type === 'invitation' || props.type === 'friend-request' || props.type === 'message'
)

const actionTitle = computed(() => {
  if (props.type === 'invitation') return 'Invitation à jouer'
  if (props.senderName) return props.senderName
  return props.type === 'friend-request' ? "Demande d'ami" : 'Nouveau message'
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
      closeAction()
    }
  }, 1000)
}

const show = () => {
  clearTimers()
  visible.value = true
  if (isActionType.value) {
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

// Button "Accepter" (invitation sy demande d'ami — tsy misy amin'ny
// "message", izay iray ihany ny button azy, jereo replyMessage).
const acceptAction = () => {
  clearTimers()
  visible.value = false
  if (props.type === 'friend-request') {
    emit('accept-friend-request', { inviterUid: props.inviterUid })
  } else {
    emit('accept-invitation', { inviterUid: props.inviterUid, roomId: props.roomId })
  }
}

// Button "Refuser"/X/fahataperan'ny countdown — mifanaraka amin'ny
// karazana "action card" 3 (invitation/friend-request/message).
const closeAction = () => {
  clearTimers()
  visible.value = false
  if (props.type === 'friend-request') {
    emit('decline-friend-request', { inviterUid: props.inviterUid })
  } else if (props.type === 'invitation') {
    emit('decline-invitation', { inviterUid: props.inviterUid, roomId: props.roomId })
  } else {
    emit('close')
  }
}

// Button "Répondre" (type "message" ihany) — mamoha ny ModalChat
// mivantana ao anatin'ilay resaka.
const replyMessage = () => {
  clearTimers()
  visible.value = false
  emit('reply-message', { inviterUid: props.inviterUid })
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
  min-width: 280px;
  /* Fallback ho an'ny navigateur tsy mahalala ny CSS min() — raha tsy
     izany dia TSY MISY "max-width" mihitsy amin'izy ireo (esorina avokoa
     ny declaration raha tsy takatry ny parser), ka mety hitatra tafahoatra
     ilay toast amin'ny écran midadasika. */
  max-width: calc(100vw - 36px);
  max-width: min(400px, calc(100vw - 36px));
  border-radius: 20px; box-shadow: 0 12px 40px rgba(0,0,0,.65);
  font-size: 13px; font-weight: 600; line-height: 1.4;
  backdrop-filter: blur(8px); border: 1.5px solid;
  pointer-events: auto; overflow: hidden;
}

.notif-toast--error {
  background: rgba(140,20,20,.92); border-color: rgba(255,90,90,.5);
  color: #ffe0e0; display: flex; align-items: center;
  padding: 13px 14px 13px 16px;
}
.notif-toast--warning {
  background: rgba(120,80,0,.92); border-color: rgba(255,200,50,.5);
  color: #fff3c0; display: flex; align-items: center;
  padding: 13px 14px 13px 16px;
}
.notif-toast--info {
  background: rgba(10,55,110,.95); border-color: rgba(100,180,255,.4);
  color: #d0eaff; display: flex; align-items: center;
  padding: 13px 14px 13px 16px;
}
.notif-toast--error > * + *,
.notif-toast--warning > * + *,
.notif-toast--info > * + * { margin-left: 10px; }
/* "--accent": loko manokana isaky ny karazana "action card" (jereo
   .inv-icon/.inv-title/.inv-countdown eo ambany, izay mampiasa azy
   amin'ny "var(--accent, #3ddc84)" — #3ddc84 (maitso) no fallback
   ho an'ny "invitation", izay tsy manolo azy io). */
.notif-toast--invitation {
  --accent: #3ddc84;
  background: linear-gradient(160deg, #0a2a50 0%, #051428 100%);
  border-color: rgba(61,220,132,.5); color: #e0fff0;
  padding: 0; display: flex; flex-direction: column;
}
.notif-toast--friend-request {
  --accent: #ffd966;
  background: linear-gradient(160deg, #0a2a50 0%, #051428 100%);
  border-color: rgba(255,217,102,.5); color: #fff8e0;
  padding: 0; display: flex; flex-direction: column;
}
.notif-toast--message {
  --accent: #39b9ff;
  background: linear-gradient(160deg, #0a2a50 0%, #051428 100%);
  border-color: rgba(57,185,255,.5); color: #e0f4ff;
  padding: 0; display: flex; flex-direction: column;
}

.inv-header {
  display: flex; align-items: center;
  padding: 14px 14px 10px 16px;
}
.inv-header > * + * { margin-left: 12px; }
.inv-icon {
  font-size: 30px; color: var(--accent, #3ddc84); flex-shrink: 0;
  filter: drop-shadow(0 0 8px rgba(61,220,132,.5));
  animation: invPulse 2s ease-in-out infinite;
}
@keyframes invPulse {
  0%,100% { opacity:1; transform:scale(1); }
  50%      { opacity:.75; transform:scale(1.12); }
}
.inv-texts { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.inv-texts > * + * { margin-top: 2px; }
.inv-title { font-size: 11px; font-weight: 800; color: var(--accent, #3ddc84); opacity: .85; text-transform: uppercase; letter-spacing: 1.5px; }
.inv-msg   { font-size: 13.5px; font-weight: 700; color: #e8fff5; line-height: 1.4; }

/* ── Countdown circle ── */
.inv-countdown {
  position: relative; width: 36px; height: 36px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.inv-countdown::before {
  content: ''; position: absolute; inset: 0; border-radius: 50%;
  /* Fallback ho an'ny navigateur/WebView tsy mahalala ny fonction CSS
     conic-gradient() — raha tsy izany dia esorin'ny parser ilay
     declaration "conic-gradient" manontolo (invalid value), ka tsy
     hisy background mihitsy ilay boribory (tsy miseho). Ity fallback
     ity kosa dia efa boribory misy loko (tsy mihena tahaka ny "pie"
     fa mijanona ho boribory feno) — miseho hatrany na dia tsy takatry
     ny navigateur aza ny conic-gradient(). */
  background: var(--accent, #3ddc84);
  background: conic-gradient(
    var(--accent, #3ddc84) calc(var(--pct) * 360deg),
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
  font-size: 13px; font-weight: 900; color: var(--accent, #3ddc84); line-height: 1;
}

.inv-actions { display: flex; padding: 8px 14px 14px; }
.inv-actions > * + * { margin-left: 8px; }
.inv-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  padding: 10px 14px; border: none; border-radius: 14px;
  font-size: 12.5px; font-weight: 800; cursor: pointer;
  transition: filter .2s, transform .15s; letter-spacing: .3px;
}
/* Ny icone dia arahin'ny soratra tsotra tsy voafono <span> tao amin'ny
   template ("<IconMessage /> Répondre" sns.), ka tsy mahazo margin
   avy amin'ny "> * + *" ilay soratra — nampiasaina "margin-right"
   mivantana teo amin'ny icone kosa. */
.inv-btn .material-icons,
.inv-btn .icon-message { font-size: 17px; margin-right: 6px; }
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
/* Button "Répondre" (type "message"): iray ihany, mameno ny andalana,
   loko manga (--accent-ny) mba hifanaraka amin'ny "notif-toast--message"). */
.inv-btn-full { flex: 1 1 100%; }
.inv-btn-reply {
  background: linear-gradient(135deg, rgba(57,185,255,.25), rgba(15,120,200,.15));
  border: 1.5px solid rgba(57,185,255,.5); color: #7dd4ff;
  box-shadow: 0 4px 14px rgba(30,150,230,.2);
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
