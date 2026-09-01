<template>
  <div
    v-if="localVisible"
    :class="['ovl', closing ? 'off' : 'on']"
    id="modal-username"
  >
    <div class="mdl">

      <div class="mu-icon">
        <span class="material-icons">badge</span>
      </div>

      <h2 class="mtitle mtitle-lg">CHOISISSEZ VOTRE NOM</h2>
      <p class="mu-sub">Choisissez votre nom de joueur pour commencer</p>

      <div class="mu-field">
        <div class="input-wrap" :class="{ 'has-error': errorMsg, 'has-success': successMsg }">
          <span class="material-icons field-icon">person</span>
          <input
            v-model="usernameInput"
            type="text"
            placeholder="Ex : Malala1"
            maxlength="14"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="words"
            spellcheck="false"
            :disabled="isLoading"
            @input="onInput"
            @keyup.enter="handleConfirm"
          />
          <span v-if="successMsg" class="status-icon material-icons success-icon">check_circle</span>
          <span v-if="errorMsg"   class="status-icon material-icons error-icon">error</span>
        </div>

        <p v-if="errorMsg"   class="err-txt">{{ errorMsg }}</p>
        <p v-if="successMsg" class="ok-txt">{{ successMsg }}</p>

        <div class="mu-rules">
          <div class="rule" :class="ruleClass(lengthOk)">
            <span class="material-icons rule-ic">{{ lengthOk ? 'check_circle' : 'radio_button_unchecked' }}</span>
            <span>4 à 10 lettres</span>
          </div>
          <div class="rule" :class="ruleClass(startsWithSingleUppercase)">
            <span class="material-icons rule-ic">{{ startsWithSingleUppercase ? 'check_circle' : 'radio_button_unchecked' }}</span>
            <span>Commence par une seule majuscule</span>
          </div>
          <div class="rule" :class="ruleClass(noSymbols)">
            <span class="material-icons rule-ic">{{ noSymbols ? 'check_circle' : 'radio_button_unchecked' }}</span>
            <span>Aucun caractère spécial</span>
          </div>
          <div class="rule" :class="ruleClass(lettersBeforeNumbers)">
            <span class="material-icons rule-ic">{{ lettersBeforeNumbers ? 'check_circle' : 'radio_button_unchecked' }}</span>
            <span>Chiffres autorisés uniquement à la fin</span>
          </div>
        </div>
      </div>

      <button
        class="btn-confirm"
        :class="{ loading: isLoading }"
        @click="handleConfirm"
        :disabled="isLoading"
      >
        <template v-if="!isLoading">
          <span class="material-icons">check_circle</span>
          <span>Confirmer</span>
        </template>
        <div class="spinner" v-else></div>
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { fetchWithTimeout } from '../../utils/network'

const props = defineProps({
  show: { type: Boolean, default: false },
  userFirebaseUid: { type: String, default: '' },
})
const emit = defineEmits(['username-set'])

const usernameInput = ref('')
const errorMsg   = ref('')
const successMsg = ref('')
const isLoading  = ref(false)

const closing = ref(false)
const localVisible = computed(() => props.show)

const lettersPrefix = computed(() => {
  const m = usernameInput.value.match(/^[A-Za-z]*/)
  return m ? m[0] : ''
})

const lengthOk = computed(() =>
  lettersPrefix.value.length >= 4 && lettersPrefix.value.length <= 10
)

const startsWithSingleUppercase = computed(() => {
  const letters = lettersPrefix.value
  if (!letters) return false
  const first = letters[0]
  const rest = letters.slice(1)
  return first === first.toUpperCase() && rest === rest.toLowerCase()
})

const noSymbols = computed(() => /^[A-Za-z0-9]*$/.test(usernameInput.value))

const lettersBeforeNumbers = computed(() => /^[A-Za-z]+[0-9]*$/.test(usernameInput.value))

const isValidFormat = computed(() =>
  lengthOk.value
  && startsWithSingleUppercase.value
  && noSymbols.value
  && lettersBeforeNumbers.value
)

const ruleClass = (ok) => ({ 'rule-ok': ok })

const onInput = () => {
  errorMsg.value = ''
  successMsg.value = ''
}

// ── Confirmation → api/session.js ( action: 'setUsername' ) ─────
const handleConfirm = async () => {
  if (isLoading.value) return

  errorMsg.value = ''
  successMsg.value = ''

  const value = usernameInput.value.trim()

  if (!isValidFormat.value) {
    errorMsg.value = 'Ce nom ne respecte pas les règles ci-dessus.'
    return
  }

  isLoading.value = true
  try {
    const res = await fetchWithTimeout('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'setUsername',
        uid: props.userFirebaseUid,
        username: value,
      }),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      errorMsg.value = data.error || 'Une erreur est survenue. Réessayez.'
      return
    }

    successMsg.value = 'Nom enregistré !'
    emit('username-set', data.username)
  } catch (e) {
    errorMsg.value = e?.message || "Impossible de contacter le serveur. Réessayez."
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
/* ── Overlay ─────────────────────────────────────────────────── */
.ovl {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .75);
  backdrop-filter: blur(4px);
  display: flex;
  place-content: center;
  place-items: center;
  z-index: 3000;
  transition: .3s;
}
.ovl.on  { display: flex; }
.ovl.off { animation: kFade .4s forwards; }

/* ── Modal box ───────────────────────────────────────────────── */
.mdl {
  border-radius: 32px;
  padding: 38px 24px 32px;
  width: 88%;
  max-width: 340px;
  position: relative;
  color: #fff9e0;
  background: linear-gradient(to bottom, #0f4a82, #08264a);
  border: 4px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.on  .mdl { animation: kZoom .4s ease-out forwards; }
.off .mdl { animation: kOut  .4s ease-in  forwards; }

@keyframes kZoom {
  0%   { opacity: 0; transform: scale(.5); }
  50%  { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes kOut {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(.4); opacity: 0; }
}
@keyframes kFade { to { opacity: 0; } }

/* ── Icon top ─────────────────────────────────────────────────── */
.mu-icon {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(255, 220, 100, 0.12);
  border: 2px solid rgba(255, 220, 100, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}
.mu-icon .material-icons {
  font-size: 34px;
  color: #ffd966;
}

/* ── Title ────────────────────────────────────────────────────── */
.mtitle {
  color: #fffacd;
  font-family: 'Chicle', cursive;
  text-align: center;
  letter-spacing: 2px;
  text-shadow: 0 4px 8px rgba(0,0,0,0.5);
  margin-bottom: 6px;
}
.mtitle-lg { font-size: 28px; }

.mu-sub {
  font-size: 13px;
  color: rgba(255, 245, 200, 0.55);
  text-align: center;
  margin-bottom: 24px;
}

/* ── Input field ─────────────────────────────────────────────── */
.mu-field {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 22px;
}

.input-wrap {
  display: flex;
  align-items: center;
  background: rgba(10, 17, 31, 0.6);
  border: 2px solid rgba(255, 255, 200, 0.15);
  border-radius: 14px;
  padding: 0 12px;
  height: 52px;
  gap: 8px;
  transition: border-color 0.25s, box-shadow 0.25s;
  position: relative;
}
.input-wrap:focus-within {
  border-color: rgba(255, 217, 102, 0.5);
  box-shadow: 0 0 0 3px rgba(255, 217, 102, 0.08);
}
.input-wrap.has-error {
  border-color: rgba(255, 77, 46, 0.7);
  box-shadow: 0 0 0 3px rgba(255, 77, 46, 0.08);
}
.input-wrap.has-success {
  border-color: rgba(43, 239, 122, 0.7);
  box-shadow: 0 0 0 3px rgba(43, 239, 122, 0.08);
}

.field-icon {
  font-size: 20px;
  color: rgba(255, 217, 102, 0.5);
  flex-shrink: 0;
}
.input-wrap:focus-within .field-icon { color: #ffd966; }

.input-wrap input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fffbe6;
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.5px;
  min-width: 0;
}
.input-wrap input::placeholder {
  color: rgba(255, 245, 200, 0.2);
  font-weight: 400;
  font-size: 14px;
}

.status-icon {
  font-size: 22px;
  flex-shrink: 0;
}
.success-icon { color: #2bef7a; }
.error-icon   { color: #ff4d2e; }

/* ── Error / Success text ─────────────────────────────────────── */
.err-txt {
  font-size: 12.5px;
  color: #ff6b50;
  font-weight: 600;
  padding-left: 4px;
  animation: shake .3s ease;
}
.ok-txt {
  font-size: 12.5px;
  color: #2bef7a;
  font-weight: 600;
  padding-left: 4px;
}

@keyframes shake {
  0%,100% { transform: translateX(0); }
  25%      { transform: translateX(-5px); }
  75%      { transform: translateX(5px); }
}

/* ── Rules ────────────────────────────────────────────────────── */
.mu-rules {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 4px 0;
}
.rule {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: rgba(255, 245, 200, 0.35);
  transition: color 0.3s;
}
.rule-ok { color: #2bef7a; }
.rule-ic {
  font-size: 15px !important;
  transition: color 0.3s;
}
.rule-ok .rule-ic { color: #2bef7a; }

/* ── Confirm button ───────────────────────────────────────────── */
.btn-confirm {
  width: 100%;
  height: 52px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #d4a94a 0%, #b8882e 60%, #a07020 100%);
  color: #0a111f;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 6px 20px rgba(180, 130, 30, 0.35);
  transition: filter .2s, transform .15s, box-shadow .25s;
}
.btn-confirm:hover {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 10px 26px rgba(212, 169, 74, 0.4);
}
.btn-confirm:active {
  transform: translateY(0);
  filter: brightness(0.95);
}
.btn-confirm.loading {
  opacity: .7;
  pointer-events: none;
}
.btn-confirm .material-icons { font-size: 20px; }

/* ── Spinner ──────────────────────────────────────── */
.spinner {
  width: 22px; height: 22px;
  border: 2.5px solid rgba(10, 17, 31, 0.3);
  border-top-color: #0a111f;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
