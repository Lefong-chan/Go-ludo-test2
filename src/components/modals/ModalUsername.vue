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

      <h2 class="mtitle mtitle-lg">CHOOSE YOUR NAME</h2>
      <p class="mu-sub">Choose your player name to get started</p>

      <div class="mu-field">
        <div class="input-wrap" :class="{ 'has-error': errorMsg, 'has-success': successMsg }">
          <span class="material-icons field-icon">person</span>
          <input
            v-model="usernameInput"
            type="text"
            placeholder="Ex: Player123"
            maxlength="9"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="words"
            spellcheck="false"
            @input="onInput"
          />
          <span v-if="successMsg" class="status-icon material-icons success-icon">check_circle</span>
          <span v-if="errorMsg"   class="status-icon material-icons error-icon">error</span>
        </div>

        <p v-if="errorMsg"   class="err-txt">{{ errorMsg }}</p>
        <p v-if="successMsg" class="ok-txt">{{ successMsg }}</p>

        <div class="mu-rules">
          <div class="rule" :class="ruleClass(usernameInput.length >= 3 && usernameInput.length <= 9)">
            <span class="material-icons rule-ic">{{ usernameInput.length >= 3 && usernameInput.length <= 9 ? 'check_circle' : 'radio_button_unchecked' }}</span>
            <span>3 to 9 characters</span>
          </div>
          <div class="rule" :class="ruleClass(startsWithLetter)">
            <span class="material-icons rule-ic">{{ startsWithLetter ? 'check_circle' : 'radio_button_unchecked' }}</span>
            <span>Starts with a letter (uppercase)</span>
          </div>
          <div class="rule" :class="ruleClass(noSymbols)">
            <span class="material-icons rule-ic">{{ noSymbols ? 'check_circle' : 'radio_button_unchecked' }}</span>
            <span>No special characters</span>
          </div>
          <div class="rule" :class="ruleClass(lettersBeforeNumbers)">
            <span class="material-icons rule-ic">{{ lettersBeforeNumbers ? 'check_circle' : 'radio_button_unchecked' }}</span>
            <span>Letters first, numbers after</span>
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
          <span>Confirm</span>
        </template>
        <div class="spinner" v-else></div>
      </button>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'

// ── Props / Emits ──────────────────────────────────────────────
const props = defineProps({
  show:            { type: Boolean, default: false },
  userFirebaseUid: { type: String,  default: '' }
})
const emit = defineEmits(['username-set'])

// ── State ──────────────────────────────────────────────────────
const localVisible  = ref(false)
const closing       = ref(false)
const usernameInput = ref('')
const errorMsg      = ref('')
const successMsg    = ref('')
const isLoading     = ref(false)

// ── Watch prop ─────────────────────────────────────────────────
watch(() => props.show, (val) => {
  if (val) {
    localVisible.value  = true
    closing.value       = false
    usernameInput.value = ''
    errorMsg.value      = ''
    successMsg.value    = ''
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

onUnmounted(() => {
  document.body.style.overflow = 'auto'
})

// ── Validations ────────────────────────────────────────────────
const startsWithLetter     = computed(() => /^[A-Za-z]/.test(usernameInput.value))
const noSymbols            = computed(() => /^[A-Za-z0-9]*$/.test(usernameInput.value))
const lettersBeforeNumbers = computed(() => /^[A-Za-z]+[0-9]*$/.test(usernameInput.value))

const ruleClass = (ok) => ok ? 'rule-ok' : ''

const onInput = () => {
  errorMsg.value   = ''
  successMsg.value = ''

  if (usernameInput.value.length > 0) {
    usernameInput.value =
      usernameInput.value.charAt(0).toUpperCase() +
      usernameInput.value.slice(1)
  }
}

// ── Validate locally ───────────────────────────────────────────
const validateLocally = () => {
  const v = usernameInput.value

  if (!v || v.trim() === '') {
    errorMsg.value = 'Please enter a username.'
    return false
  }
  if (v.length < 3) {
    errorMsg.value = 'Minimum 3 characters required.'
    return false
  }
  if (v.length > 9) {
    errorMsg.value = 'Maximum 9 characters allowed.'
    return false
  }
  if (!startsWithLetter.value) {
    errorMsg.value = 'Username must start with a letter.'
    return false
  }
  if (!noSymbols.value) {
    errorMsg.value = 'No special characters allowed.'
    return false
  }
  if (!lettersBeforeNumbers.value) {
    errorMsg.value = 'Letters must come before numbers.'
    return false
  }
  return true
}

// ── Confirm ────────────────────────────────────────────────────
const handleConfirm = async () => {
  errorMsg.value   = ''
  successMsg.value = ''

  if (!validateLocally()) return

  isLoading.value = true
  const finalName = usernameInput.value.trim()

  try {
    const token = localStorage.getItem('user_token')

    if (!token) {
      errorMsg.value = 'Session expired. Please log in again.'
      return
    }

    // 1. Handiniana raha efa misy ilay anarana (/api/user)
    const checkRes = await fetch('/api/user?action=check-username', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: finalName }),
    })

    if (!checkRes.ok) {
      const checkErr = await checkRes.json().catch(() => ({}))
      throw new Error(checkErr.message || 'Failed to check username availability.')
    }

    const checkData = await checkRes.json()
    if (checkData.taken) {
      errorMsg.value = 'This username is already taken. Please choose another.'
      return
    }

    // 2. Voamarina fa tsy misy → Fanovana ny username (/api/user)
    const setRes = await fetch('/api/user?action=set-username', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ username: finalName }),
    })

    const setData = await setRes.json().catch(() => ({}))

    if (!setRes.ok) {
      throw new Error(setData.message || `Server error (${setRes.status}). Please try again.`)
    }

    successMsg.value = '✓ Username saved!'

    setTimeout(() => {
      emit('username-set', setData.username || finalName)
    }, 700)

  } catch (err) {
    errorMsg.value = err.message || 'Connection error. Please try again.'
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
