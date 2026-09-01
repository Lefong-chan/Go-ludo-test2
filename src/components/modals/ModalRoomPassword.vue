<template>
  <Teleport to="body">
    <Transition name="rmp-fade">
      <div v-if="visible" class="rmp-ovl" @click.self="!loading && cancel()">
        <div class="rmp-box">
          <button class="rmp-x" @click="cancel" aria-label="Fermer">
            <span class="material-icons">close</span>
          </button>

          <div class="rmp-icon">
            <span class="material-icons">lock</span>
          </div>
          <p class="rmp-title">Salon privé</p>
          <p class="rmp-msg">Ce salon est protégé par un mot de passe.</p>

          <div class="mp-pwd-input-wrap">
            <input
              :type="passwordVisible ? 'text' : 'password'"
              class="mp-pwd-input"
              v-model="password"
              placeholder="Mot de passe du salon"
              :disabled="loading"
              @keyup.enter="submit"
            />
            <button
              type="button"
              class="mp-pwd-eye"
              :disabled="loading"
              :aria-label="passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
              @click="passwordVisible = !passwordVisible"
            >
              <span class="material-icons">{{ passwordVisible ? 'visibility_off' : 'visibility' }}</span>
            </button>
          </div>

          <p v-if="errorMsg" class="rmp-error">{{ errorMsg }}</p>

          <button class="rmp-btn" :disabled="loading || !password.trim()" @click="submit">
            <span v-if="loading" class="rmp-spin"></span>
            <span v-else>Entrer</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { fetchWithTimeout } from '../../utils/network'

const API_ROOM = '/api/room'

const props = defineProps({
  show:     { type: Boolean, default: false },
  roomId:   { type: String,  default: '' },
  myUid:    { type: String,  default: '' },
  myName:   { type: String,  default: 'Player' },
  myAvatar: { type: String,  default: '👤' },
})
const emit = defineEmits(['close', 'joined'])

const visible         = ref(false)
const password        = ref('')
const passwordVisible = ref(false)
const loading         = ref(false)
const errorMsg        = ref('')

const authHeaders = () => {
  const token = localStorage.getItem('user_token')
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

const cancel = () => {
  if (loading.value) return
  emit('close')
}

const submit = async () => {
  if (!password.value.trim() || loading.value) return
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await fetchWithTimeout(`${API_ROOM}?action=join-room`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({
        uid: props.myUid,
        username: props.myName,
        avatar: props.myAvatar,
        roomId: props.roomId,
        password: password.value.trim(),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.roomId) {
      errorMsg.value = data.message || 'Impossible de rejoindre ce salon.'
      return
    }
    emit('joined', { roomId: data.roomId })
  } catch (e) {
    errorMsg.value = e?.message || 'Erreur réseau. Réessayez.'
  } finally {
    loading.value = false
  }
}

watch(() => props.show, val => {
  visible.value = val
  if (val) {
    password.value = ''
    passwordVisible.value = false
    errorMsg.value = ''
    loading.value = false
  }
})
</script>

<style scoped>
/* ══ Overlay / boîte : mitovy border sy background amin'i ModalConfirm.vue ══ */
.rmp-ovl {
  position: fixed; inset: 0; z-index: 9200;
  background: rgba(0,0,0,.65); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.rmp-box {
  background: linear-gradient(to bottom, #0f2a4a, #071828);
  border: 2px solid rgba(255,255,255,.12);
  border-radius: 24px;
  padding: 32px 24px 24px;
  width: 100%; max-width: 320px;
  display: flex; flex-direction: column; align-items: center;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,.7);
  position: relative;
}

.rmp-x {
  position: absolute; top: 14px; right: 14px;
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(220,80,70,.8); border: none; color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: .2s;
}
.rmp-x:hover { background: #e06a5a; transform: scale(1.15) rotate(90deg); }
.rmp-x .material-icons { font-size: 18px; }

.rmp-icon .material-icons { font-size: 44px; opacity: .85; color: #ff6b6b; }

/* Teo aloha: gap:10px (.rmp-box) + margin-top manokana isaky ny anaka-
   zaza — natambatra ho margin-top tokana isaky ny anaka-zaza mba tsy
   hiankina amin'ny flex "gap" (tsy miasa amin'ny navigateur taloha). */
.rmp-title { color: #fff9e0; font-size: 16px; font-weight: 800; margin: 14px 0 0; }
.rmp-msg   { color: rgba(255,245,200,.45); font-size: 12.5px; line-height: 1.5; margin-top: 10px; }

/* ══ Input mot de passe : mitovy design amin'i ModalBet.vue ══ */
.mp-pwd-input-wrap { position: relative; width: 100%; height: 40px; margin-top: 16px; }
.mp-pwd-input {
  width: 100%; height: 40px; box-sizing: border-box;
  background: rgba(255,255,220,.07); border: 1px solid rgba(255,240,160,.18);
  border-radius: 12px; padding: 0 40px 0 12px;
  color: #fff9e0; font-size: 13px; font-weight: 600;
}
.mp-pwd-input::placeholder { color: rgba(255,245,200,.35); }
.mp-pwd-input:disabled { opacity: .4; cursor: not-allowed; }
.mp-pwd-input:focus { outline: none; border-color: rgba(255,220,100,.5); }

.mp-pwd-eye {
  position: absolute; top: 0; right: 0; height: 100%; width: 38px;
  border: none; background: none; color: rgba(255,245,200,.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.mp-pwd-eye:disabled { opacity: .4; cursor: not-allowed; }
.mp-pwd-eye .material-icons { font-size: 18px; }

/* ══ Erreur (mot de passe incorrect) ══ */
.rmp-error { color: #ff6b6b; font-size: 12px; font-weight: 700; margin-top: 12px; }

/* ══ Bouton : mitovy design amin'ilay bouton "Annuler" ao amin'i ModalConfirm ══ */
.rmp-btn {
  width: 100%; height: 40px; border: none; border-radius: 20px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: filter .2s, transform .15s; margin-top: 24px;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  color: rgba(255,245,200,.6);
}
.rmp-btn:hover:not(:disabled) { filter: brightness(1.15); transform: scale(1.03); }
.rmp-btn:disabled { opacity: .65; cursor: not-allowed; }

@keyframes rmpSpin { to { transform: rotate(360deg); } }
.rmp-spin {
  display: inline-block; width: 16px; height: 16px;
  border-radius: 50%; border: 2.5px solid rgba(255,255,255,.25);
  border-top-color: #fff;
  animation: rmpSpin .65s linear infinite;
}

/* Transition */
.rmp-fade-enter-active { transition: opacity .4s; }
.rmp-fade-leave-active { transition: opacity .4s; }
.rmp-fade-enter-from, .rmp-fade-leave-to { opacity: 0; }

.rmp-fade-enter-active .rmp-box { animation: rmpZoom .4s ease-out forwards; }
.rmp-fade-leave-active .rmp-box { animation: rmpOut  .4s ease-in  forwards; }

@keyframes rmpZoom {
  0%   { opacity: 0; transform: scale(.5); }
  50%  { opacity: 1; transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes rmpOut {
  0%   { transform: scale(1);  opacity: 1; }
  100% { transform: scale(.4); opacity: 0; }
}
</style>
