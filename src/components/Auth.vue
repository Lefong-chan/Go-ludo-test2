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
          <span class="title-word" v-if="isLogin">Connexion</span>
          <span class="title-word" v-else>Créer un compte</span>
        </h2>
        <p class="auth-subtitle">
          {{ isLogin ? 'Content de vous revoir !' : 'Rejoignez la communauté Go Ludo' }}
        </p>
      </div>

      <div class="auth-form">

        <div class="field-wrap">
          <label class="field-label">Adresse e-mail</label>
          <div class="input-group" :class="{ focused: emailFocused, filled: email }">
            <span class="material-icons input-icon left-icon">mail</span>
            <input
              v-model="email"
              type="email"
              placeholder="nom@exemple.com"
              @focus="emailFocused = true"
              @blur="emailFocused = false"
            />
          </div>
        </div>

        <div class="field-wrap">
          <label class="field-label">Mot de passe</label>
          <div class="input-group" :class="{ focused: passwordFocused, filled: password }">
            <span class="material-icons input-icon left-icon">lock_outline</span>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              @focus="passwordFocused = true"
              @blur="passwordFocused = false"
            />
            <div class="eye-btn" @click="showPassword = !showPassword">
              <span class="material-icons eye-icon">
                {{ showPassword ? 'visibility' : 'visibility_off' }}
              </span>
            </div>
          </div>
        </div>

        <div class="forgot-row" v-if="isLogin">
          <span class="forgot-link">Mot de passe oublié ?</span>
        </div>

        <div class="submit-btn" :class="{ loading: isLoading }" @click="handleSubmit">
          <div class="spinner" v-if="isLoading"></div>
          <template v-else>
            <span class="material-icons submit-icon">{{ isLogin ? 'login' : 'person_add' }}</span>
            <span class="submit-label">{{ isLogin ? 'Se connecter' : "S'inscrire" }}</span>
          </template>
        </div>

      </div>

      <div class="or-divider">
        <span class="or-line"></span>
        <span class="or-text">ou</span>
        <span class="or-line"></span>
      </div>

      <div class="google-btn" @click="handleGoogleAuth">
        <svg class="google-icon" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.8 2.71v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.61z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.97 10.71A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.17.29-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z"/>
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"/>
        </svg>
        <span class="google-label">Continuer avec Google</span>
      </div>

      <div class="auth-toggle" @click="toggleMode">
        <span class="toggle-text">
          {{ isLogin ? "Vous n'avez pas de compte ?" : "Vous avez déjà un compte ?" }}
        </span>
        <span class="toggle-link">
          {{ isLogin ? 'Inscrivez-vous' : 'Connectez-vous ici' }}
        </span>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { fetchWithTimeout } from '../utils/network'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'

const emit = defineEmits(['auth-success'])

const email           = ref('')
const password        = ref('')
const isLogin         = ref(true)
const showPassword    = ref(false)
const emailFocused    = ref(false)
const passwordFocused = ref(false)
const isLoading       = ref(false)

// Mifamadika Login ⇄ Register, ary mamafa ny champ email/password
const toggleMode = () => {
  isLogin.value  = !isLogin.value
  email.value    = ''
  password.value = ''
}

// Ny fijerena ny mot de passe (icone visibility/visibility_off) dia
// atao mivantana ao amin'ny template @click="showPassword = !showPassword"

// Placeholder handler ho an'ny "Continuer avec Google" (OAuth Google) —
// ampidiro eto ny logique tena izy rehefa vonona ny backend.
const handleGoogleAuth = () => {
  console.log('Continue with Google clicked')
}

// ── Validation client-side (avant d'appeler le serveur) ────────
const validate = () => {
  const mail = email.value.trim()
  const pass = password.value

  if (!mail || !pass) {
    alert("Veuillez saisir votre e-mail et votre mot de passe.")
    return false
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
    alert("Adresse e-mail invalide.")
    return false
  }
  if (pass.length <= 6) {
    alert("Le mot de passe doit contenir plus de 6 caractères.")
    return false
  }
  if (/\s/.test(pass)) {
    alert("Le mot de passe ne doit pas contenir d'espace.")
    return false
  }
  return true
}

// ── Inscription / Connexion via api/auth.js ────────────────────
const handleSubmit = async () => {
  if (isLoading.value) return
  if (!validate()) return

  isLoading.value = true
  try {
    const res = await fetchWithTimeout('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: isLogin.value ? 'login' : 'register',
        email: email.value.trim(),
        password: password.value,
      }),
    })
    const data = await res.json()

    if (!res.ok || data.error) {
      alert(data.error || "Une erreur est survenue. Réessayez.")
      return
    }

    // Tsy misy angona lalina tehirizina eto — session fotsiny mba
    // hahafahan'i Home.vue mamerina ny profil (customUid, avatar, wallet).
    localStorage.setItem('goludo_session', JSON.stringify({
      uid: data.uid,
      customUid: data.customUid,
      avatar: data.avatar,
      wallet: data.wallet,
      email: data.email,
    }))

    // "signInWithEmailAndPassword" (Firebase CLIENT SDK, jereo
    // ../firebase) — mitovy kaonty amin'ny "data.uid" navoakan'ny
    // api/auth.js (Firebase Authentication tena izy io koa, jereo
    // fanazavana ao amin'ny api/auth.js) — mamorona session Firebase
    // Auth marina ho an'ny navigateur, ilaina mba hahazoan'ny client
    // MAMAKY MIVANTANA (onSnapshot, jereo Game.vue) ny "gameStates/
    // {roomId}" any amin'ny Firestore (jereo firestore.rules:
    // "request.auth != null"). "Tsy fatal" raha tsy nahomby (log
    // fotsiny) — Game.vue dia miverina amin'ny "polling" HTTP raha tsy
    // misy session Firebase Auth (fallback, tsy hisy tapaka ny lalao).
    try {
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    } catch (e) {
      console.warn('Firebase client sign-in nahomby tsy tanteraka (fallback polling):', e)
    }

    emit('auth-success', data)
  } catch (e) {
    alert(e?.message || "Impossible de se connecter au serveur. Réessayez.")
  } finally {
    isLoading.value = false
  }
}
</script>

<!-- ─── GLOBAL : feno ny body, tsy misy scroll ─────────────────── -->
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

html {
  --bg-a: #1b2b3f;
  --bg-b: #0a111f;
}

body {
  /* Ny background (ludo_bg.png, jereo App.vue → body::before) dia tsy
     azo aronan'ity body{} ity intsony — nesorina ny "background: ..."
     satria opaque izy io ka manarona tanteraka ilay body::before
     (z-index:-1, ka eo ambadika ny background rehetra mihaino azy io). */
  height: 100%;
  height: 100dvh;
}

#app {
  height: 100%;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
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
  height: 100vh;
  height: 100dvh;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem 1.2rem;
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
  max-height: 100%;
  overflow-y: auto;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-card);
  padding: 1.7rem 2rem 1.6rem;
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
  margin-bottom: 0.6rem;
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
  width: 82px; height: 82px;
  object-fit: contain;
  filter: drop-shadow(0 3px 12px rgba(212, 169, 74, 0.4));
}

/* ── Séparateur décoratif ────────────────────────────────────── */
.divider-deco {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0.5rem 0 0.7rem;
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
  margin-bottom: 1.1rem;
}
.auth-title {
  font-size: 1.5rem;
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
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

/* ── Formulaire ──────────────────────────────────────────────── */
/* "gap" ao anaty flexbox dia tsy takatry ny navigateur/WebView taloha
   (mihoatra ny grid gap mihitsy) — esorina mangina ho 0px izy (tsy
   "declaration invalid", fa tsorina fotsiny), ka lasa mifanakaiky
   tanteraka ireo input/label. Solon'ny "gap" dia "margin-top" eo
   amin'ny zanaka rehetra afa-tsy ny voalohany (> * + *), mba hitovy
   marina amin'ny elanelana navoakan'ny gap tamin'ny navigateur rehetra. */
.auth-form {
  display: flex;
  flex-direction: column;
}
.auth-form > * + * {
  margin-top: 0.7rem;
}
.field-wrap {
  display: flex;
  flex-direction: column;
}
.field-wrap > * + * {
  margin-top: 0.3rem;
}
.field-label {
  font-size: 0.72rem;
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
  height: 48px;
  transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
  position: relative;
  overflow: hidden;
}
/* "gap" (flexbox) — jereo ny fanazavana etsy ambony amin'ny .auth-form. */
.input-group > * + * { margin-left: 8px; }
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
}
/* Class selector > mihoatra ny specificity an'ny ".auth-form > * + *"
   (universal selector), ka io ihany no manjaka eto — mitovy amin'ny
   fitambaran'ny "gap: 0.7rem" (.auth-form) + "margin-top: -2px" nampiasaina
   teo aloha (fa tsy "azo ampiana" ny margin-top roa, fa ny CSS cascade
   fotsiny no mamaha izany). */
.auth-form > .forgot-row {
  margin-top: calc(0.7rem - 2px);
}
.forgot-link {
  font-size: 0.74rem;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
  letter-spacing: 0.01em;
}
.forgot-link:hover { color: var(--gold-light); }

/* ── Submit button ───────────────────────────────────────────── */
.submit-btn {
  margin-top: 0.3rem;
  height: 48px;
  border-radius: var(--radius-input);
  background: linear-gradient(135deg, #d4a94a 0%, #b8882e 60%, #a07020 100%);
  color: #0a111f;
  font-size: 0.92rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: filter 0.2s, transform 0.15s, box-shadow 0.25s;
  user-select: none;
}
/* "gap" (flexbox) — jereo ny fanazavana etsy ambony amin'ny .auth-form. */
.submit-btn > * + * { margin-left: 8px; }
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

/* ── Séparateur "ou" ─────────────────────────────────────────── */
.or-divider {
  display: flex; align-items: center; gap: 12px;
  margin: 1rem 0 0.6rem;
}
.or-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
.or-text {
  font-size: 0.72rem; font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

/* ── Bouton Google ───────────────────────────────────────────── */
.google-btn {
  height: 46px;
  border-radius: var(--radius-input);
  background: rgba(255,255,255,0.06);
  border: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  margin-bottom: 0.9rem;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}
/* "gap" (flexbox) — jereo ny fanazavana etsy ambony amin'ny .auth-form. */
.google-btn > * + * { margin-left: 10px; }
.google-btn:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.18);
}
.google-btn:active { transform: translateY(1px); }
.google-icon { width: 18px; height: 18px; flex-shrink: 0; }
.google-label {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: 0.01em;
}

/* ── Toggle ──────────────────────────────────────────────────── */
/* "gap" (flexbox) — jereo ny fanazavana etsy ambony amin'ny .auth-form. */
.auth-toggle {
  display: flex; align-items: center; justify-content: center;
  flex-wrap: wrap; text-align: center;
  cursor: pointer;
  padding: 8px 8px;
  border-radius: 10px;
  transition: background 0.2s;
}
.auth-toggle > * + * { margin-left: 6px; }
.auth-toggle:hover { background: rgba(255,255,255,0.04); }
.toggle-text  { font-size: 0.8rem; color: var(--text-muted); }
.toggle-link  {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.8rem; font-weight: 700;
  color: var(--gold);
  text-decoration: underline;
  text-underline-offset: 2px;
  transition: color 0.2s;
}
.auth-toggle:hover .toggle-link { color: var(--gold-light); }

/* ── Responsive mobile ───────────────────────────────────────── */
@media (max-width: 480px) {
  .auth-wrapper { padding: 0.8rem 1rem; }
  .auth-card {
    padding: 1.5rem 1.3rem 1.3rem;
    border-radius: 18px;
    max-width: 100%;
  }
  .logo-ring { width: 78px; height: 78px; }
  .logo-ring img { width: 64px; height: 64px; }
  .auth-title { font-size: 1.3rem; }
  .input-group, .submit-btn, .google-btn { height: 44px; }
  .grid-lines { display: none; }
}

/* ── Responsive tablette / desktop ──────────────────────────── */
@media (min-width: 768px) {
  .auth-card {
    padding: 2.4rem 2.8rem 2rem;
    max-width: 460px;
  }
  .logo-ring { width: 108px; height: 108px; }
  .logo-ring img { width: 92px; height: 92px; }
  .auth-title { font-size: 1.7rem; }
}
</style>
