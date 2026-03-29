<template>

  <header id="hdr">
    <div id="hdr-l">
      <div class="h-l-icon">
        <span class="material-icons">account_balance_wallet</span>
      </div>
      <span class="w-amount">{{ wallet }}</span> 
      <div class="h-r-icon" @click="showWallet = true" role="button">
        <span class="material-icons">add_circle</span>
      </div>
    </div>
    <div id="hdr-r">
      <button class="btn-circle" aria-label="Friends List">
        <span class="material-icons">group</span>
      </button>
      <button id="btn-settings" class="btn-circle" title="Settings" aria-label="Settings" @click="showSettings = true">
        <span class="material-icons">settings</span>
      </button>
    </div>
  </header>

  <main id="main">
    <div id="logo-wrap">
      <img class="logo-img" src="../assets/images/logo/Go_Ludo.png" alt="Go Ludo Mada Logo">
    </div>

    <div id="btns">

      <div class="mbtn mbtn-g" @click="showSocial = true" role="button">
        <div class="btn-diamond">
          <img src="../assets/images/buttons/icons/000000005.png" style="width: 145px" alt="Friends Icon">
        </div>
        <div class="btn-label">
          <span class="btn-title">Friends</span>
          <span class="btn-sub">Invite others</span>
        </div>
      </div>

      <div class="mbtn mbtn-p" role="button">
        <div class="btn-diamond">
          <img src="../assets/images/buttons/icons/1209849.png" alt="Multiplayer Icon">
        </div>
        <div class="btn-label">
          <span class="btn-title">Multiplayer</span>
          <span class="btn-sub">Auto match</span>
        </div>
      </div>

      <div class="mbtn mbtn-y" role="button">
        <div class="btn-diamond">
          <img src="../assets/images/buttons/icons/8193229.png" alt="Create Table Icon">
        </div>
        <div class="btn-label">
          <span class="btn-title">Create Game</span>
          <span class="btn-sub">New table</span>
        </div>
      </div>

      <div class="mbtn mbtn-b" role="button">
        <div class="btn-diamond">
          <img src="../assets/images/buttons/icons/dice-clip-art-clkerm-vector-clip-art-online-royalty-domain-18.png" alt="Lobby Icon">
        </div>
        <div class="btn-label">
          <span class="btn-title">Public Lobby</span>
          <span class="btn-sub">Join game</span>
        </div>
      </div>

    </div>
  </main>

  <footer id="footer">
    <div id="profile-info">
      <div id="ava" role="img" aria-label="User Avatar">{{ avatar }}</div>
      <div>
        <div id="uname">{{ username }}</div>
        <div id="uid">ID: {{ userUid }}</div>
      </div>
    </div>
    <div id="btn-stats" role="button" tabindex="0" @click="showProfile = true">
      <div style="display: flex; align-items: center; gap: 5px;">
        <span class="material-icons" style="font-size: 18px;">leaderboard</span>
        <span>Stats</span>
      </div>
    </div>
  </footer>

  <!-- ── Modals ──────────────────────────────────────────────────── -->
  <ModalSocial
    :show="showSocial"
    @close="showSocial = false"
    @update-badge="onBadgeUpdate"
  />

  <ModalSettings
    :show="showSettings"
    @close="showSettings = false"
  />

  <ModalWallet
    :show="showWallet"
    @close="showWallet = false"
  />

  <ModalUsername
    :show="showUsername"
    :user-firebase-uid="userFirebaseUid"
    @username-set="onUsernameSet"
  />

  <ModalProfile
    :show="showProfile"
    :username="username"
    :user-uid="userUid"
    :wallet="wallet"
    :avatar="avatar"
    @close="showProfile = false"
    @open-social="onProfileOpenSocial"
    @avatar-updated="onAvatarUpdated"
  />

</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { initializeApp, getApps }      from 'firebase/app'
import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore'
import {
  getDatabase,
  ref      as dbRef,
  set      as dbSet,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database'

import ModalSocial   from '../components/modals/ModalSocial.vue'
import ModalSettings from '../components/modals/ModalSettings.vue'
import ModalWallet   from '../components/modals/ModalWallet.vue'
import ModalUsername from '../components/modals/ModalUsername.vue'
import ModalProfile  from '../components/modals/ModalProfile.vue'

// ── Firebase ──────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL:       "https://go-ludo-gascar-default-rtdb.europe-west1.firebasedatabase.app",
}
const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
const fsDb        = getFirestore(firebaseApp)
const rtdb        = getDatabase(firebaseApp)

// ── State ─────────────────────────────────────────────────────
const showSocial    = ref(false)
const showSettings  = ref(false)
const showWallet    = ref(false)
const showUsername  = ref(false)
const showProfile   = ref(false)

const username        = ref('Player')
const userUid         = ref('000000000')
const wallet          = ref(0)
const avatar          = ref('👨')
const userFirebaseUid = ref('')

let unsubscribe    = null
let myPresenceRef  = null

// ── Presence ──────────────────────────────────────────────────
const initMyPresence = async (uid) => {
  if (!uid) return
  myPresenceRef = dbRef(rtdb, `presence/${uid}`)

  await onDisconnect(myPresenceRef).set({
    online:   false,
    lastSeen: serverTimestamp(),
  })

  await dbSet(myPresenceRef, {
    online:   true,
    lastSeen: serverTimestamp(),
  })
}

const destroyMyPresence = async () => {
  if (!myPresenceRef) return
  try {
    await dbSet(myPresenceRef, {
      online:   false,
      lastSeen: serverTimestamp(),
    })
  } catch { }
  myPresenceRef = null
}

// ── onMounted ─────────────────────────────────────────────────
onMounted(async () => {
  const savedUid         = localStorage.getItem('user_uid')
  const savedWallet      = localStorage.getItem('user_wallet')
  const savedFirebaseUid = localStorage.getItem('user_firebase_uid')
  const savedAvatar      = localStorage.getItem('user_avatar')

  if (savedUid)         userUid.value         = savedUid
  if (savedWallet)      wallet.value          = savedWallet
  if (savedFirebaseUid) userFirebaseUid.value = savedFirebaseUid
  if (savedAvatar)      avatar.value          = savedAvatar

  if (savedFirebaseUid) {
    // Jerena mivantana ao Firestore ny username — tsy miankina amin'ny token
    await fetchUsernameFromFirestore(savedFirebaseUid)
    initMyPresence(savedFirebaseUid)
  } else {
    showUsername.value = true
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  window.removeEventListener('beforeunload', handleBeforeUnload)
  destroyMyPresence()
})

const handleBeforeUnload = () => {
  const token = localStorage.getItem('user_token')
  if (!token || !myPresenceRef) return
}

// ── Firestore: getDoc mivantana (tsy miankina amin'ny token) ──
const fetchUsernameFromFirestore = async (fbUid) => {
  try {
    const userRef  = doc(fsDb, 'users', fbUid)
    const snap     = await getDoc(userRef)

    if (snap.exists()) {
      const data = snap.data()

      // Mameno ny state amin'ny data avy ao Firestore
      if (data.wallet !== undefined) {
        wallet.value = data.wallet
        localStorage.setItem('user_wallet', data.wallet)
      }
      if (data.avatar) {
        avatar.value = data.avatar
        localStorage.setItem('user_avatar', data.avatar)
      }

      const hasUsername = data.username &&
                          data.username !== 'New Player' &&
                          data.username.trim() !== ''

      if (hasUsername) {
        // ✅ Misy username → tsy mampiseho modal, manomboka listener
        username.value = data.username
        startFirestoreListener(fbUid)
      } else {
        // ❌ Tsy misy username → mampiseho modal
        showUsername.value = true
        startFirestoreListener(fbUid)
      }
    } else {
      // Tsy misy document → compte vaovao, mila username
      showUsername.value = true
    }
  } catch {
    // Raha fail ny Firestore (offline, etc.) → jerena ny localStorage
    const savedUsername = localStorage.getItem('user_username')
    const hasUsername   = savedUsername &&
                          savedUsername !== 'New Player' &&
                          savedUsername.trim() !== ''

    if (hasUsername) {
      username.value = savedUsername
      startFirestoreListener(fbUid)
    } else {
      showUsername.value = true
    }
  }
}

// ── Firestore real-time listener ──────────────────────────────
const startFirestoreListener = (fbUid) => {
  if (!fbUid || unsubscribe) return
  const userRef = doc(fsDb, 'users', fbUid)
  unsubscribe = onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data()
      if (data.username && data.username !== 'New Player' && data.username !== '') {
        username.value = data.username
        localStorage.setItem('user_username', data.username)
        // Raha voaroaka ny modal username (efa napetraka ny username) → afatsy
        if (showUsername.value) showUsername.value = false
      }
      if (data.wallet !== undefined) {
        wallet.value = data.wallet
        localStorage.setItem('user_wallet', data.wallet)
      }
      if (data.avatar) {
        avatar.value = data.avatar
        localStorage.setItem('user_avatar', data.avatar)
      }
    }
  })
}

// ── Callbacks ─────────────────────────────────────────────────
const onUsernameSet = (newUsername) => {
  username.value     = newUsername
  localStorage.setItem('user_username', newUsername)
  showUsername.value = false
}

const onBadgeUpdate = (count) => {
  console.log('Badge inbox:', count)
}

const onProfileOpenSocial = () => {
  showProfile.value = false
  setTimeout(() => { showSocial.value = true }, 200)
}

const onAvatarUpdated = (newAvatar) => {
  avatar.value = newAvatar
}
</script>

<style>

:root {
  --bg-a:      #1b2b3f;
  --bg-b:      #0a111f;
  --bg:        radial-gradient(circle at 30% 10%, var(--bg-a), var(--bg-b));
  --gold:      #ffd966;
  --gold-dim:  #c9a83a;
  --cream:     #fffbe6;
  --panel:     rgba(255, 248, 225, 0.055);
  --panel-md:  rgba(255, 248, 225, 0.09);
  --border:    rgba(255, 255, 200, 0.12);
  --border-md: rgba(255, 220, 100, 0.22);
  --shadow:    rgba(0, 0, 0, 0.55);
  --red:       #ff4d2e;
  --green:     #2bef7a;
  --blue:      #39b9ff;
  --yellow:    #ffe55c;
  --input-bg:  rgba(10, 17, 31, 0.6);
  --bar-h:     80px;
}

*, *::before, *::after {
  margin: 0; padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

body {
  font-family: 'Segoe UI', 'Poppins', system-ui, -apple-system, 'Roboto', sans-serif;
  color: var(--cream);
  overflow-x: hidden;
}

#hdr {
  position: fixed; top: 0; left: 0; right: 0;
  z-index: 200; height: var(--bar-h);
  display: flex; align-items: center;
  justify-content: space-between; padding: 0 16px;
}

#hdr-l {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-radius: 40px;
  background: var(--panel); border: 1px solid var(--border);
}

#hdr-r { display: flex; align-items: center; gap: 10px; }

.w-amount { font-size: 20px; font-weight: 700; color: var(--gold); }

.h-l-icon { color: var(--gold); }

.material-icons {
  display: flex; align-items: center;
  justify-content: center; vertical-align: middle;
}

.h-l-icon, .h-r-icon {
  width: 24px; height: 24px;
  display: flex; font-size: 25px;
  align-items: center; justify-content: center;
}

.h-r-icon span { color: var(--gold); }

.btn-circle {
  width: 42px; height: 42px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--panel); border: 1px solid var(--border);
  color: #fff; font-size: 25px; cursor: pointer;
}

.logo-img {
  width: min(280px, 72vw);
  filter: drop-shadow(0 8px 24px rgba(255, 217, 102, 0.25));
}

@keyframes riseUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

#main {
  min-height: 100vh; padding: 0 16px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 40px;
}

#logo-wrap {
  animation: riseUp 0.6s cubic-bezier(0.2, 0.9, 0.4, 1) both;
  margin-top: -80px;
}

#btns {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 30px 15px; width: 100%; max-width: 400px;
}

.mbtn {
  width: 100%; display: flex; flex-direction: column;
  align-items: center; cursor: pointer;
  position: relative; transition: transform 0.2s;
}
.mbtn:active { transform: scale(0.95); }

.btn-diamond {
  width: 100px; height: 100px; border-radius: 18px;
  transform: rotate(45deg);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 8px 20px var(--shadow);
  border: 4px solid rgba(255,255,255,0.2);
  position: relative; z-index: 1;
}
.btn-diamond img {
  width: 100px; transform: rotate(-45deg);
  margin: -10px 0 0 -10px;
}

.btn-label {
  width: 85%; margin-top: -20px;
  padding: 12px 5px 8px; border-radius: 12px;
  text-align: center; box-shadow: 0 4px 15px var(--shadow);
  z-index: 2; border: 2px solid rgba(255,255,255,0.1);
}
.btn-title { display: block; font-size: 14px; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; }
.btn-sub   { display: block; font-size: 9px; color: rgba(255,255,255,0.7); font-weight: 600; }

.mbtn-b .btn-diamond { background: linear-gradient(135deg, #39b9ff, #0f7bcb); }
.mbtn-b .btn-label   { background: linear-gradient(to bottom, #0f4a82, #08264a); }
.mbtn-p .btn-diamond { background: linear-gradient(135deg, #ff4081, #c2185b); }
.mbtn-p .btn-label   { background: linear-gradient(to bottom, #8b1042, #4a0824); }
.mbtn-g .btn-diamond { background: linear-gradient(135deg, #ffe55c, #f5c518); }
.mbtn-g .btn-label   { background: linear-gradient(to bottom, #8c7100, #5c4a00); }
.mbtn-y .btn-diamond { background: linear-gradient(135deg, #2bef7a, #0fa844); }
.mbtn-y .btn-label   { background: linear-gradient(to bottom, #1a6b38, #0d3d20); }

#footer {
  position: fixed; bottom: 0; left: 0; right: 0;
  height: var(--bar-h);
  display: flex; align-items: center;
  justify-content: space-between; padding: 0 16px;
}
#profile-info { display: flex; align-items: center; gap: 12px; }
#ava { width: 46px; height: 46px; border-radius: 50%; background: #3a6a5a; border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; font-size: 26px; }
#uname { font-size: 15px; font-weight: 700; }
#uid   { font-size: 9px; color: rgba(255,245,200,0.3); }

#btn-stats {
  background: #27ae60; color: #ffffff;
  padding: 10px 20px; border-radius: 40px;
  font-weight: 700; cursor: pointer;
}

@media (min-width: 900px) {
  #btns { grid-template-columns: repeat(4, 1fr); max-width: 800px; gap: 20px; }
  .btn-diamond { width: 120px; height: 120px; }
}

</style>
