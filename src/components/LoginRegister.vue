<template>
  <div class="auth-wrapper">

    <div class="noise-overlay"></div>

    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>

    <div class="grid-lines">
      <div class="grid-line" v-for="i in 5" :key="i"></div>
    </div>

    <div class="auth-card">

      <div class="auth-logo">
        <div class="logo-ring">
          <img src="../assets/images/logo/Go_Ludo.png" alt="Go Ludo Logo" />
        </div>
      </div>

      <div class="divider-deco">
        <span class="deco-line"></span>
        <span class="deco-diamond">◆</span>
        <span class="deco-line"></span>
      </div>

      <div class="auth-header">
        <h2 class="auth-title">
          <span class="title-word" v-if="isLogin">Sign In</span>
          <span class="title-word" v-else>Create Account</span>
        </h2>
        <p class="auth-subtitle">
          {{ isLogin ? 'Welcome back to the game!' : 'Join the Go Ludo community' }}
        </p>
      </div>

      <div class="auth-form">

        <div class="field-wrap">
          <label class="field-label">Email Address</label>
          <div class="input-group" :class="{ focused: emailFocused, filled: email }">
            <span class="material-icons input-icon left-icon">mail</span>
            <input
              v-model="email"
              type="email"
              placeholder="name@example.com"
              @focus="emailFocused = true"
              @blur="emailFocused = false"
              @keyup.enter="handleSubmit"
            />
          </div>
        </div>

        <div class="field-wrap">
          <label class="field-label">Password</label>
          <div class="input-group" :class="{ focused: passwordFocused, filled: password }">
            <span class="material-icons input-icon left-icon">lock_outline</span>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              @focus="passwordFocused = true"
              @blur="passwordFocused = false"
              @keyup.enter="handleSubmit"
            />
            <div class="eye-btn" @click="showPassword = !showPassword">
              <span class="material-icons eye-icon">
                {{ showPassword ? 'visibility' : 'visibility_off' }}
              </span>
            </div>
          </div>
        </div>

        <div class="forgot-row" v-if="isLogin">
          <span class="forgot-link">Forgot password?</span>
        </div>

        <div class="submit-btn" :class="{ loading: isLoading }" @click="handleSubmit">
          <template v-if="!isLoading">
            <span class="material-icons submit-icon">{{ isLogin ? 'login' : 'person_add' }}</span>
            <span class="submit-label">{{ isLogin ? 'Sign In' : 'Sign Up' }}</span>
          </template>
          <div class="spinner" v-else></div>
        </div>

      </div>

      <div class="or-divider">
        <span class="or-line"></span>
        <span class="or-text">or</span>
        <span class="or-line"></span>
      </div>

      <div class="auth-toggle" @click="toggleMode">
        <span class="toggle-text">
          {{ isLogin ? "Don't have an account?" : "Already have an account?" }}
        </span>
        <span class="toggle-link">
          {{ isLogin ? 'Register now' : 'Log in here' }}
        </span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const email           = ref('')
const password        = ref('')
const isLogin         = ref(true)
const showPassword    = ref(false)
const emailFocused    = ref(false)
const passwordFocused = ref(false)
const isLoading       = ref(false)

const emit = defineEmits(['auth-success'])

const FIREBASE_API_KEY = import.meta.env.VITE_FIREBASE_API_KEY

const toggleMode = () => {
  isLogin.value  = !isLogin.value
  email.value    = ''
  password.value = ''
}

// ── Rehefa register: exchange custom token → ID token ──────────
// Firebase Admin SDK dia mamerina custom token fa ny verifyIdToken()
// ao amin'ny backend dia mitaky ID token. Koa ilaina ny exchange ity.
// Mamerina { idToken, refreshToken } miantoana
const exchangeCustomTokenForIdToken = async (customToken) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${FIREBASE_API_KEY}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Token exchange failed')
  return { idToken: data.idToken, refreshToken: data.refreshToken }
}

const handleSubmit = async () => {
  if (isLoading.value) return
  if (!email.value || !password.value) return

  isLoading.value = true

  const action   = isLogin.value ? 'login' : 'register'
  const finalUrl = `/api/auth?action=${action}`

  try {
    const response = await fetch(finalUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email: email.value, password: password.value }),
    })

    const data = await response.json()
    if (!response.ok) throw new Error(data.message || 'Error occurred')

    if (data.token) {
      let idToken      = data.token
      let refreshToken = data.refreshToken || ''

      if (!isLogin.value) {
        // REGISTER: backend mamerina custom token → exchange
        const exchanged = await exchangeCustomTokenForIdToken(data.token)
        idToken         = exchanged.idToken
        refreshToken    = exchanged.refreshToken
      }

      // ── Tahiry ──────────────────────────────────────────────
      localStorage.setItem('user_token',         idToken)
      localStorage.setItem('user_refresh_token', refreshToken)
      localStorage.setItem('user_uid',           data.uid)
      localStorage.setItem('user_firebase_uid',  data.firebaseUid)
      localStorage.setItem('user_wallet',        isLogin.value && data.wallet !== undefined ? data.wallet : 0)
      localStorage.removeItem('user_username')   // Dashboard no hamaky avy amin'ny Firestore
    }

    emit('auth-success')

  } catch (error) {
    alert('Error: ' + error.message)
  } finally {
    isLoading.value = false
  }
}
</script>

<!-- ─── GLOBAL : feno ny body ──────────────────────────────────── -->
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

html, body {
  width: 100%;
  height: 100%;
  min-height: 100%;
}

html {
  --bg-a: #1b2b3f;
  --bg-b: #0a111f;
}

body {
  background: radial-gradient(circle at 30% 10%, #1b2b3f, #0a111f);
  background-attachment: fixed;
  background-repeat: no-repeat;
  background-size: cover;
  min-height: 100vh;
}

#app {
  min-height: 100vh;
  width: 100%;
}
</style>

<!-- ─── SCOPED : styles du composant ──────────────────────────── -->
<style scoped>
/* ── Tokens ─────────────────────────────────────────────────── */
.auth-wrapper {
  --gold:           #d4a94a;
  --gold-light:     #f0cc7a;
  --gold-dim:       rgba(212, 169, 74, 0.18);
  --gold-glow:      rgba(212, 169, 74, 0.30);
  --glass-bg:       rgba(14, 26, 45, 0.72);
  --glass-border:   rgba(255, 255, 255, 0.09);
  --glass-focus:    rgba(212, 169, 74, 0.50);
  --text-main:      #dde5f0;
  --text-muted:     #7a8fa8;
  --text-dim:       #4a5e73;
  --input-bg:       rgba(255, 255, 255, 0.04);
  --input-hover:    rgba(255, 255, 255, 0.07);
  --radius-card:    22px;
  --radius-input:   13px;

  position: relative;
  min-height: 100vh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.2rem;
  overflow: hidden;
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  isolation: isolate;
}

/* ── Noise ───────────────────────────────────────────────────── */
.noise-overlay {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  opacity: 0.3;
  display: none;
}

.noise-overlay, .grid-lines, .blob, .logo-ring::before {
  pointer-events: none !important;
}

/* ── Blobs ───────────────────────────────────────────────────── */
.blob, .noise-overlay, .grid-lines {
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
}

.blob {
  position: fixed;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
  will-change: transform;
}

.blob-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(30, 70, 120, 0.55), transparent 70%);
  transform: translate(-120px, -160px);
  animation: blobDrift1 14s ease-in-out infinite alternate;
}

.blob-2 {
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(180, 130, 30, 0.22), transparent 70%);
  right: 0; bottom: 0;
  transform: translate(80px, 100px);
  animation: blobDrift2 10s ease-in-out infinite alternate;
  animation-delay: 2s;
}

.blob-3 {
  width: 260px; height: 260px;
  background: radial-gradient(circle, rgba(20, 90, 140, 0.30), transparent 70%);
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  animation: blobDrift3 18s ease-in-out infinite alternate;
}

@keyframes blobDrift1 {
  from { transform: translate(-120px, -160px) scale(1); }
  to   { transform: translate(-80px,  -100px) scale(1.08); }
}
@keyframes blobDrift2 {
  from { transform: translate(80px, 100px) scale(1); }
  to   { transform: translate(40px,  60px) scale(1.06); }
}
@keyframes blobDrift3 {
  from { transform: translate(-50%, -50%) scale(1); }
  to   { transform: translate(-45%, -55%) scale(1.1); }
}

/* ── Grid lines ──────────────────────────────────────────────── */
.grid-lines {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: space-around;
  pointer-events: none;
  z-index: 0;
  opacity: 0.025;
}
.grid-line {
  width: 1px;
  height: 100%;
  background: linear-gradient(to bottom, transparent, rgba(212,169,74,0.8), transparent);
}

/* ── Card ────────────────────────────────────────────────────── */
.auth-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  padding: 2.4rem 2rem 2rem;
  box-shadow:
    0 24px 60px rgba(0,0,0,0.5),
    0  0   0 1px rgba(255,255,255,0.03) inset,
    0  1px 0 rgba(255,255,255,0.06) inset;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  animation: cardIn 0.5s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1); }
}

/* ── Logo ────────────────────────────────────────────────────── */
.auth-logo {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}
.logo-ring {
  position: relative;
  width: 96px; height: 96px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, rgba(255,255,255,0.07), transparent);
  border: 1px solid rgba(212, 169, 74, 0.20);
  box-shadow:
    0 0 28px rgba(212, 169, 74, 0.15),
    0 0  8px rgba(0,0,0,0.4) inset;
}
.logo-ring::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid rgba(212, 169, 74, 0.10);
  animation: ringPulse 3s ease-in-out infinite;
}
@keyframes ringPulse {
  0%, 100% { transform: scale(1); opacity: 0.6; }
  50%      { transform: scale(1.06); opacity: 1; }
}
.logo-ring img {
  width: 68px; height: 68px;
  object-fit: contain;
  filter: drop-shadow(0 3px 12px rgba(212, 169, 74, 0.4));
}

/* ── Séparateur décoratif ────────────────────────────────────── */
.divider-deco {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0.8rem 0 1.2rem;
}
.deco-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(212,169,74,0.25), transparent);
}
.deco-diamond {
  font-size: 7px;
  color: var(--gold);
  animation: dimPulse 3s ease-in-out infinite;
}
@keyframes dimPulse {
  0%, 100% { opacity: 0.4; } 50% { opacity: 0.9; }
}

/* ── En-tête ─────────────────────────────────────────────────── */
.auth-header {
  text-align: center;
  margin-bottom: 2rem;
}
.auth-title {
  font-size: 1.7rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: 0.02em;
}
.title-word {
  display: inline-block;
  animation: fadeUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.auth-subtitle {
  margin-top: 0.4rem;
  font-size: 0.82rem;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

/* ── Formulaire ──────────────────────────────────────────────── */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.field-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
.field-label {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding-left: 4px;
  pointer-events: none;
  user-select: none;
}

.input-group {
  display: flex;
  align-items: center;
  background: var(--input-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-input);
  padding: 0 14px;
  height: 54px;
  gap: 8px;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
  position: relative;
  overflow: hidden;
}
.input-group::after {
  content: '';
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 2px;
  background: linear-gradient(to right, var(--gold), var(--gold-light));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 0.3s cubic-bezier(0.22,1,0.36,1);
  border-radius: 0 0 2px 2px;
}
.input-group:hover   { background: var(--input-hover); }
.input-group.focused {
  border-color: var(--glass-focus);
  background: rgba(255,255,255,0.07);
  box-shadow: 0 0 0 3px rgba(212,169,74,0.10);
}
.input-group.focused::after { transform: scaleX(1); }

.left-icon {
  font-size: 18px;
  color: var(--text-dim);
  flex-shrink: 0;
  transition: color 0.25s;
}
.input-group.focused .left-icon,
.input-group.filled  .left-icon { color: var(--gold); }

.input-group input {
  flex: 1;
  background: transparent;
  border: none; outline: none;
  color: var(--text-main);
  font-size: 0.93rem;
  height: 100%;
  min-width: 0;
}
.input-group input::placeholder {
  color: var(--text-dim);
  font-size: 0.87rem;
}

.eye-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.eye-btn:hover { background: rgba(255,255,255,0.06); }
.eye-icon { font-size: 18px; color: var(--text-muted); transition: color 0.2s; }
.eye-btn:hover .eye-icon { color: var(--gold-light); }

/* ── Forgot ───────────────────────────────────────────────────── */
.forgot-row {
  display: flex;
  justify-content: flex-end;
  margin-top: -2px;
}
.forgot-link {
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
  letter-spacing: 0.01em;
}
.forgot-link:hover { color: var(--gold-light); }

/* ── Submit button ───────────────────────────────────────────── */
.submit-btn {
  margin-top: 0.5rem;
  height: 54px;
  border-radius: var(--radius-input);
  background: linear-gradient(135deg, #d4a94a 0%, #b8882e 60%, #a07020 100%);
  color: #0a111f;
  font-size: 0.96rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: filter 0.2s, transform 0.15s, box-shadow 0.25s;
  user-select: none;
}
.submit-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 6px 15px rgba(212, 169, 74, 0.25);
}
.submit-btn:active {
  transform: translateY(0);
  filter: brightness(0.95);
}
.submit-btn.loading {
  opacity: 0.7;
  pointer-events: none;
  cursor: default;
}
.submit-icon { font-size: 18px; }

/* ── Spinner ─────────────────────────────────────────────────── */
.spinner {
  width: 22px; height: 22px;
  border: 2px solid rgba(10, 17, 31, 0.3);
  border-top-color: #0a111f;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Séparateur "or" ─────────────────────────────────────────── */
.or-divider {
  display: flex; align-items: center; gap: 12px;
  margin: 1.4rem 0 0.6rem;
}
.or-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
.or-text {
  font-size: 0.72rem; font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── Toggle ──────────────────────────────────────────────────── */
.auth-toggle {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; flex-wrap: wrap; text-align: center;
  cursor: pointer;
  padding: 10px 8px;
  border-radius: 10px;
  transition: background 0.2s;
}
.auth-toggle:hover { background: rgba(255,255,255,0.04); }
.toggle-text  { font-size: 0.82rem; color: var(--text-muted); }
.toggle-link  {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.82rem; font-weight: 700;
  color: var(--gold);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.2s;
}
.auth-toggle:hover .toggle-link { color: var(--gold-light); }

/* ── Responsive mobile ───────────────────────────────────────── */
@media (max-width: 480px) {
  .auth-wrapper { padding: 1.5rem 1rem; }
  .auth-card {
    padding: 2rem 1.4rem 1.6rem;
    border-radius: 18px;
    max-width: 100%;
  }
  .logo-ring { width: 82px; height: 82px; }
  .logo-ring img { width: 56px; height: 56px; }
  .auth-title { font-size: 1.45rem; }
  .input-group, .submit-btn { height: 50px; }
  .grid-lines { display: none; }
}

/* ── Responsive tablette / desktop ──────────────────────────── */
@media (min-width: 768px) {
  .auth-card {
    padding: 3rem 2.8rem 2.4rem;
    max-width: 460px;
  }
  .logo-ring { width: 108px; height: 108px; }
  .logo-ring img { width: 76px; height: 76px; }
  .auth-title { font-size: 1.85rem; }
}
</style>
