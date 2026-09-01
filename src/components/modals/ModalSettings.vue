<template>
  <div 
    v-if="localVisible" 
    :class="['ovl', closing ? 'off' : 'on']"
    id="modal-settings"
    @click.self="handleClose"
  >
    <div class="mdl gl">
      <button class="x" @click="handleClose">
        <span class="material-icons">close</span>
      </button>
      
      <h2 class="mtitle mtitle-lg">OPTIONS</h2>

      <div class="settings-list">
        <!-- "Langue" tsy aseho ao anaty lalao (Game.vue): tsy misy ifandraisany
             amin'ny lalao mandeha, jereo ihany koa "Notifications de messages". -->
        <div class="si" v-if="!inGame">
          <span class="si-lbl">
            <span class="material-icons" style="vertical-align: middle;">language</span>
            <span>Langue</span>
          </span>
          <span id="lang" @click="toggleLang">{{ lang }}</span>
        </div>

        <div class="si">
          <span class="si-lbl">
            <span class="material-icons" style="vertical-align: middle;">volume_up</span>
            <span>Music</span>
          </span>
          <label class="tgl">
            <input type="checkbox" v-model="sfx">
            <span class="sldr"></span>
          </label>
        </div>

        <div class="si">
          <span class="si-lbl">
            <span class="material-icons" style="vertical-align: middle;">bolt</span>
            <span>Effets visuels</span>
          </span>
          <label class="tgl">
            <input type="checkbox" v-model="vfx">
            <span class="sldr"></span>
          </label>
        </div>

        <div class="si" v-if="!inGame">
          <span class="si-lbl">
            <span class="material-icons" style="vertical-align: middle;">notifications_active</span>
            <span>Notifications<br>de messages</span>
          </span>
          <label class="tgl">
            <input type="checkbox" v-model="messageNotifModel">
            <span class="sldr"></span>
          </label>
        </div>
      </div>

      <div class="signout-wrap">
        <button class="btn-signout" @click="handleSignOut">
          <span class="material-icons">logout</span>
          <span>{{ inGame ? 'Quitter' : 'Déconnexion' }}</span>
        </button>
      </div>
    </div>
  </div>

  <ModalConfirm
    v-model="showConfirm"
    :title="inGame ? 'Quitter la partie ?' : 'Se déconnecter de votre compte ?'"
    :message="inGame ? 'Vous perdrez votre mise dans cette partie si vous quittez maintenant.' : 'Votre session sera effacée et vous devrez vous reconnecter.'"
    :confirmLabel="inGame ? 'QUITTER' : 'SE DÉCONNECTER'"
    cancelLabel="ANNULER"
    :icon="inGame ? 'exit_to_app' : 'logout'"
    type="danger"
    :loading="logoutLoading"
    @confirm="handleConfirm"
  />
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import ModalConfirm   from './ModalConfirm.vue'
import { fetchWithTimeout } from '../../utils/network'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'

const props = defineProps({
  show:   { type: Boolean, default: false },
  // "inGame": rehefa avy amin'ny Game.vue (button "menu" eo ambony
  // afovoany) ity Modal ity, ka ny "Déconnexion" dia "Quitter" ny
  // lalao mandeha izao (fa tsy fialana amin'ny compte).
  inGame: { type: Boolean, default: false },
  // "messageNotif" — ny valeur tena izy ao amin'ny Home.vue (jereo
  // eo, satria ilaina any ivelan'ity Modal ity ny fahafantarana azy,
  // mba hahafahan'ny Home.vue mamaha raha tokony hampiseho Notification.vue
  // ho an'ny hafatra vaovao sa tsia). "v-model:message-notif".
  messageNotif: { type: Boolean, default: true },
})

const emit = defineEmits(['close', 'quit-game', 'update:messageNotif'])

const messageNotifModel = computed({
  get: () => props.messageNotif,
  set: (v) => emit('update:messageNotif', v),
})

const localVisible  = ref(false)
const closing       = ref(false)
const lang          = ref('Français')
const sfx           = ref(true)
const vfx           = ref(true)

const showConfirm   = ref(false)
const logoutLoading = ref(false)

watch(() => props.show, (val) => {
  if (val) {
    localVisible.value = true
    closing.value      = false
    document.body.style.overflow = 'hidden'
  } else {
    closing.value = true
    setTimeout(() => {
      localVisible.value = false
      closing.value      = false
      document.body.style.overflow = 'auto'
    }, 400)
  }
})

const handleClose = () => emit('close')

const toggleLang = () => {
  lang.value = lang.value === 'Français' ? 'Malagasy' : 'Français'
}

const handleSignOut = () => {
  showConfirm.value = true
}

const handleConfirm = () => {
  if (props.inGame) {
    // Optimistic: afenina avy hatrany ity Modal ity (Game.vue no
    // manao ny API "leave-room" tena izy sy ny fiovana mankany amin'ny
    // Accueil, jereo onQuitGame), tsy misy antony hiandrasan'ity
    // ModalConfirm ity valiny avy amin'ny server.
    showConfirm.value = false
    emit('quit-game')
  } else {
    doLogout()
  }
}

const doLogout = async () => {
  logoutLoading.value = true
  try {
    const raw = localStorage.getItem('goludo_session')
    const session = raw ? JSON.parse(raw) : null
    if (session && session.uid) {
      await fetchWithTimeout('/api/auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout', uid: session.uid }),
      })
    }
  } catch { }

  // "signOut" (Firebase client SDK) — ny session Firebase Auth
  // navorona tao amin'i Auth.vue (signInWithEmailAndPassword) dia
  // TSY voafafan'ny "localStorage.clear()" etsy ambany (tehirizina any
  // amin'ny IndexedDB manokana ny SDK) — atsahatra manokana eto io
  // mba tsy hijanona "connecté" (Firestore) ilay navigateur na dia
  // efa "déconnecté" aza ny lalao.
  await signOut(auth).catch(() => {})

  localStorage.clear()
  window.location.replace('/')
}
</script>

<style scoped>
.ovl {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, .6);
  backdrop-filter: blur(1px);
  display: flex; place-content: center; place-items: center;
  z-index: 2000; transition: .3s;
}
.ovl.on  { display: flex; }
.ovl.off { animation: kFade .4s forwards; }

.mdl {
  border-radius: 32px; padding: 40px 24px 30px;
  width: 85%; max-width: 340px; position: relative;
  color: #fff9e0;
  background: linear-gradient(to bottom, #0f4a82, #08264a);
  border: 4px solid rgba(255, 255, 255, 0.1);
}

.on  .mdl { animation: kZoom .4s ease-out forwards; }
.off .mdl { animation: kOut  .4s ease-in  forwards; }

@keyframes kZoom {
  0%   { opacity: 0; transform: scale(.5); }
  50%  { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes kOut {
  0%   { transform: scale(1);  opacity: 1; }
  100% { transform: scale(.4); opacity: 0; }
}
@keyframes kFade { to { opacity: 0; } }

.x {
  position: absolute; top: 16px; right: 18px;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(220, 80, 70, .8); border: none;
  font-size: 28px; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: .2s;
}
.x:hover { background: #e06a5a; transform: scale(1.15) rotate(90deg); }

.mtitle {
  color: #fffacd; font-family: 'Chicle', cursive;
  text-align: center; letter-spacing: 2px;
  text-shadow: 0 4px 8px rgba(0,0,0,0.5); margin-bottom: 25px;
}
.mtitle-lg { font-size: 38px; }

.settings-list { margin-bottom: 8px; }

.si {
  display: flex; justify-content: space-between; align-items: center;
  padding: 15px 8px; border-bottom: 1px solid rgba(255, 255, 200, .2);
}
.si:last-child { border-bottom: none; }

.si-lbl {
  color: #fffce0; font-size: 20px; font-weight: 600;
  display: flex; align-items: center;
}
.si-lbl > * + * { margin-left: 10px; }
.si-lbl .material-icons { color: #ffecaa; }

#lang {
  background: rgba(10, 30, 18, .7); padding: 8px 20px;
  border-radius: 40px; font-weight: bold; color: #fff3b3;
  border: 1px solid #dbb56b; cursor: pointer; transition: .2s;
}
#lang:hover { background: #1e4f36; color: #fff; }

.tgl { position: relative; display: inline-block; width: 58px; height: 30px; }
.tgl input { opacity: 0; width: 0; height: 0; }

.sldr {
  position: absolute; inset: 0; background: #574e3c;
  border: 1px solid #ab9e70; border-radius: 30px;
  transition: .3s; cursor: pointer;
}
.sldr::before {
  content: ''; position: absolute;
  width: 24px; height: 24px; left: 3px; bottom: 2px;
  background: #fffbd6; border-radius: 50%; transition: .3s;
}
input:checked + .sldr { background: #58b368; }
input:checked + .sldr::before { transform: translateX(28px); background: #fff; }

.signout-wrap {
  margin-top: 22px; padding-top: 20px;
  border-top: 1px solid rgba(255, 100, 80, .15);
  display: flex; justify-content: center;
}

.btn-signout {
  position: relative; display: flex; align-items: center;
  justify-content: center; width: 100%;
  padding: 15px 24px; border-radius: 18px; border: none;
  background: linear-gradient(135deg, #7a1a10 0%, #b02a1a 50%, #8c1e12 100%);
  color: #ffe0db; font-size: 15px; font-weight: 800;
  letter-spacing: 2.5px; text-transform: uppercase;
  cursor: pointer; transition: .3s; overflow: hidden;
  box-shadow: 0 6px 22px rgba(180,30,15,.45),
              0 1px 0 rgba(255,160,140,.18) inset,
              0 -2px 0 rgba(0,0,0,.3) inset;
}
.btn-signout::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255,200,180,.18) 50%, transparent 65%);
  transform: translateX(-100%); transition: transform .55s ease;
}
.btn-signout:hover::before  { transform: translateX(100%); }
.btn-signout:hover {
  background: linear-gradient(135deg, #961f13 0%, #cc3320 50%, #a82316 100%);
  color: #fff; box-shadow: 0 10px 30px rgba(180,30,15,.6);
  transform: translateY(-2px);
}
.btn-signout .material-icons { font-size: 19px; color: #ffb8aa; }
.btn-signout > * + * { margin-left: 10px; }
.btn-signout:active { transform: translateY(0) scale(.97); }
</style>
