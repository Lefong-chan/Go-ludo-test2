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

  <!-- Loading screen rehefa mbola manamarina session -->
  <div v-if="isCheckingSession" id="session-loading">
    <div class="session-spinner"></div>
    <p class="session-text">Checking session…</p>
  </div>

  <template v-else>

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

    <!-- ── Modals ── -->
    <ModalSocial
      :show="showSocial"
      :my-firebase-uid="userFirebaseUid"
      :my-username="username"
      :my-avatar="avatar"
      @close="showSocial = false"
      @update-badge="onBadgeUpdate"
      @open-room="onOpenRoom"
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
      @challenge="onProfileChallenge"
    />

    <!-- ── Game Room Modal ── -->
    <ModalRoom
      :show="showRoom"
      :room-id="currentRoomId"
      :my-uid="userFirebaseUid"
      :my-name="username"
      :my-avatar="avatar"
      @close="onLeaveRoom"
      @game-start="onGameStart"
    />

    <!-- ── Notification (errors + invitations) ── -->
    <ModalNotification
      :message="notifMessage"
      :type="notifType"
      :duration="notifDuration"
      :inviter-uid="notifInviterUid"
      :room-id="notifRoomId"
      @close="notifMessage = ''"
      @accept-invitation="onAcceptInvitation"
      @decline-invitation="onDeclineInvitation"
    />

  </template>

</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { initializeApp, getApps }      from 'firebase/app'
import { getFirestore, doc, getDoc, onSnapshot } from 'firebase/firestore'
import {
  getDatabase,
  ref      as dbRef,
  set      as dbSet,
  onValue,
  off,
  remove,
  onDisconnect,
  serverTimestamp,
} from 'firebase/database'

import ModalSocial        from '../components/modals/ModalSocial.vue'
import ModalSettings      from '../components/modals/ModalSettings.vue'
import ModalWallet        from '../components/modals/ModalWallet.vue'
import ModalUsername      from '../components/modals/ModalUsername.vue'
import ModalProfile       from '../components/modals/ModalProfile.vue'
import ModalRoom          from '../components/modals/ModalRoom.vue'
import ModalNotification  from '../components/modals/ModalNotification.vue'

// ─── Emit ─────────────────────────────────────────────────────────────────────
const emit = defineEmits(['logout'])

// ─── Firebase ─────────────────────────────────────────────────────────────────
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

// ─── State ────────────────────────────────────────────────────────────────────
const isCheckingSession = ref(true)

const showSocial    = ref(false)
const showSettings  = ref(false)
const showWallet    = ref(false)
const showUsername  = ref(false)
const showProfile   = ref(false)
const showRoom      = ref(false)

const username        = ref('Player')
const userUid         = ref('000000000')
const wallet          = ref(0)
const avatar          = ref('👤')
const userFirebaseUid = ref('')

// ─── Notification state ───────────────────────────────────────────────────────
const notifMessage     = ref('')
const notifType        = ref('error')
const notifDuration    = ref(4000)
const notifInviterUid  = ref('')
const notifRoomId      = ref('')

const showNotif = (msg, type = 'error', duration = 4000, extra = {}) => {
  notifMessage.value    = ''
  notifType.value       = type
  notifDuration.value   = duration
  notifInviterUid.value = extra.inviterUid || ''
  notifRoomId.value     = extra.roomId     || ''
  setTimeout(() => { notifMessage.value = msg }, 30)
}

// ─── Room state ───────────────────────────────────────────────────────────────
const currentRoomId = ref('')

// ─── Invitation listener (RTDB: invitations/<myUid>) ──────────────────────────
let inviteRef     = null
let inviteHandler = null

const startInvitationListener = (uid) => {
  if (!uid) return
  inviteRef     = dbRef(rtdb, `invitations/${uid}`)
  inviteHandler = (snap) => {
    const inv = snap.val()
    if (!inv || inv.status !== 'pending') return
    // Asehoy ilay modal invitation
    showNotif(
      `${inv.inviterUsername || 'Someone'} invited you to play!`,
      'invitation',
      0,
      { inviterUid: inv.inviterUid, roomId: inv.roomId }
    )
  }
  onValue(inviteRef, inviteHandler)
}

const stopInvitationListener = () => {
  if (inviteRef && inviteHandler) {
    off(inviteRef, 'value', inviteHandler)
    inviteRef     = null
    inviteHandler = null
  }
}

// ─── Accept invitation ────────────────────────────────────────────────────────
const onAcceptInvitation = async ({ inviterUid, roomId }) => {
  if (!roomId) return
  try {
    const token = localStorage.getItem('user_token')
    const res   = await fetch(`/api/room?action=join-room`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ roomId, username: username.value, avatar: avatar.value }),
    })
    const data = await res.json()
    if (!res.ok) {
      showNotif(data.message || 'Could not join room.', 'error')
      return
    }
    currentRoomId.value = roomId
    showRoom.value      = true
  } catch {
    showNotif('Network error. Could not join room.', 'error')
  }
}

// ─── Decline invitation ───────────────────────────────────────────────────────
// Ra mandaha fotsiny ilay modal (tsy nanindry Decline, navelany niala),
// tsy ampisehoana ny "declined" message ao amin'ilay inviter.
// Ra nanindry Decline dia ampisehoana ao amin'ilay inviter.
const onDeclineInvitation = async ({ inviterUid, roomId }) => {
  if (!inviterUid) return
  try {
    const token = localStorage.getItem('user_token')
    // Fafao ny invitation
    await fetch(`/api/room?action=decline-invite`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ inviterUid }),
    })
    // Mampiseho ny declined-notification ao amin'ilay inviter via RTDB
    const declineRef = dbRef(rtdb, `inviteResponse/${inviterUid}`)
    await dbSet(declineRef, {
      responderUid:      userFirebaseUid.value,
      responderUsername: username.value,
      status:            'declined',
      roomId,
      at:                Date.now(),
    })
    
    setTimeout(async () => {
      try { await remove(declineRef) } catch { }
    }, 5000)
  } catch { }
}

let inviteRespRef     = null
let inviteRespHandler = null

const startInviteResponseListener = (uid) => {
  if (!uid) return
  inviteRespRef     = dbRef(rtdb, `inviteResponse/${uid}`)
  inviteRespHandler = (snap) => {
    const resp = snap.val()
    if (!resp || resp.status !== 'declined') return
    showNotif(
      `${resp.responderUsername || 'The player'} declined your invitation.`,
      'info',
      4000
    )
    // Fafao avy hatrany
    remove(inviteRespRef).catch(() => {})
  }
  onValue(inviteRespRef, inviteRespHandler)
}

const stopInviteResponseListener = () => {
  if (inviteRespRef && inviteRespHandler) {
    off(inviteRespRef, 'value', inviteRespHandler)
    inviteRespRef     = null
    inviteRespHandler = null
  }
}

// ─── Open Room
const onOpenRoom = (roomId) => {
  currentRoomId.value = roomId
  showSocial.value  = false
  showProfile.value = false
  setTimeout(() => { showRoom.value = true }, 300)
}

const onProfileChallenge = async (targetFirebaseUid) => {
  try {
    const token = localStorage.getItem('user_token')
    const createRes = await fetch('/api/room?action=create-room', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ username: username.value, avatar: avatar.value }),
    })
    let createData
    try { createData = await createRes.json() }
    catch { showNotif('Server error. Please try again.', 'error'); return }
    if (!createRes.ok) { showNotif(createData.message || 'Could not create room.', 'error'); return }
    const roomId = createData.roomId
    if (!roomId) { showNotif('Invalid room ID.', 'error'); return }

    await fetch('/api/room?action=send-invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({
        targetFirebaseUid,
        roomId,
        inviterUsername: username.value,
      }),
    })

    onOpenRoom(roomId)
  } catch (e) {
    showNotif(e.message || 'Network error.', 'error')
  }
}

// ─── Leave room ────────────────────────────────────────────────────────────────
const onLeaveRoom = () => {
  showRoom.value      = false
  currentRoomId.value = ''
}

const onGameStart = ({ roomId, players }) => {
  console.log('Game start!', roomId, players)
}

// ─── Presence ─────────────────────────────────────────────────────────────────
let unsubscribe   = null
let myPresenceRef = null

const initMyPresence = async (uid) => {
  if (!uid) return
  myPresenceRef = dbRef(rtdb, `presence/${uid}`)
  await onDisconnect(myPresenceRef).set({ online: false, lastSeen: serverTimestamp() })
  await dbSet(myPresenceRef, { online: true, lastSeen: serverTimestamp() })
}

const destroyMyPresence = async () => {
  if (!myPresenceRef) return
  try { await dbSet(myPresenceRef, { online: false, lastSeen: serverTimestamp() }) } catch { }
  myPresenceRef = null
}

const forceLogout = () => {
  if (unsubscribe) { unsubscribe(); unsubscribe = null }
  stopInvitationListener()
  stopInviteResponseListener()
  destroyMyPresence()
  localStorage.removeItem('user_token')
  localStorage.removeItem('user_refresh_token')
  localStorage.removeItem('user_uid')
  localStorage.removeItem('user_firebase_uid')
  localStorage.removeItem('user_wallet')
  localStorage.removeItem('user_username')
  localStorage.removeItem('user_avatar')
  emit('logout')
}

// ─── Refresh token ────────────────────────────────────────────────────────────
const tryRefreshToken = async () => {
  const refreshToken = localStorage.getItem('user_refresh_token')
  if (!refreshToken) return null
  try {
    const res = await fetch('/api/session?action=refresh-token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.token) return null
    localStorage.setItem('user_token',         data.token)
    localStorage.setItem('user_refresh_token', data.refreshToken || refreshToken)
    return data.token
  } catch { return null }
}

// ─── Session check ────────────────────────────────────────────────────────────
const checkSession = async () => {
  let token = localStorage.getItem('user_token')
  if (!token) { forceLogout(); return }

  let sessionData = null

  try {
    const res = await fetch('/api/session?action=check-session', {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (res.ok) {
      sessionData = await res.json()
    } else if (res.status === 401) {
      token = await tryRefreshToken()
      if (!token) { forceLogout(); return }
      const res2 = await fetch('/api/session?action=check-session', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res2.ok) { sessionData = await res2.json() }
      else { forceLogout(); return }
    } else { forceLogout(); return }
  } catch {
    const fbUid = localStorage.getItem('user_firebase_uid')
    if (!fbUid) { forceLogout(); return }
    userFirebaseUid.value = fbUid
    userUid.value         = localStorage.getItem('user_uid')      || '000000000'
    wallet.value          = localStorage.getItem('user_wallet')   || 0
    avatar.value          = localStorage.getItem('user_avatar')   || '👤'
    const savedUsername   = localStorage.getItem('user_username') || ''
    if (savedUsername && savedUsername !== 'New Player') {
      username.value = savedUsername
    } else {
      showUsername.value = true
    }
    isCheckingSession.value = false
    initMyPresence(fbUid)
    startInvitationListener(fbUid)
    startInviteResponseListener(fbUid)
    return
  }

  const fbUid = sessionData.firebaseUid
  userFirebaseUid.value = fbUid
  userUid.value         = sessionData.uid    || localStorage.getItem('user_uid') || '000000000'
  wallet.value          = sessionData.wallet ?? 0
  avatar.value          = localStorage.getItem('user_avatar') || '👤'

  localStorage.setItem('user_firebase_uid', fbUid)
  localStorage.setItem('user_uid',          userUid.value)
  localStorage.setItem('user_wallet',       wallet.value)

  await fetchUsernameFromFirestore(fbUid)
  initMyPresence(fbUid)
  startInvitationListener(fbUid)
  startInviteResponseListener(fbUid)

  isCheckingSession.value = false
}

const fetchUsernameFromFirestore = async (fbUid) => {
  try {
    const userRef = doc(fsDb, 'users', fbUid)
    const snap    = await getDoc(userRef)
    if (snap.exists()) {
      const data = snap.data()
      if (data.wallet !== undefined) {
        wallet.value = data.wallet
        localStorage.setItem('user_wallet', data.wallet)
      }
      if (data.avatar) {
        avatar.value = data.avatar
        localStorage.setItem('user_avatar', data.avatar)
      }
      const hasUsername = data.username && data.username !== 'New Player' && data.username.trim() !== ''
      if (hasUsername) {
        username.value = data.username
        startFirestoreListener(fbUid)
      } else {
        showUsername.value = true
        startFirestoreListener(fbUid)
      }
    } else { showUsername.value = true }
  } catch {
    const savedUsername = localStorage.getItem('user_username')
    const hasUsername   = savedUsername && savedUsername !== 'New Player' && savedUsername.trim() !== ''
    if (hasUsername) {
      username.value = savedUsername
      startFirestoreListener(fbUid)
    } else { showUsername.value = true }
  }
}

// ─── Firestore listener ────────────────────────────────────────────────────────
const startFirestoreListener = (fbUid) => {
  if (!fbUid || unsubscribe) return
  const userRef = doc(fsDb, 'users', fbUid)
  unsubscribe = onSnapshot(userRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data()
      if (data.username && data.username !== 'New Player' && data.username !== '') {
        username.value = data.username
        localStorage.setItem('user_username', data.username)
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

// ─── Lifecycle ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  await checkSession()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
  stopInvitationListener()
  stopInviteResponseListener()
  window.removeEventListener('beforeunload', handleBeforeUnload)
  destroyMyPresence()
})

const handleBeforeUnload = () => { destroyMyPresence() }

// ─── Handlers ──────────────────────────────────────────────────────────────────
const onUsernameSet = (newUsername) => {
  username.value = newUsername
  localStorage.setItem('user_username', newUsername)
  showUsername.value = false
}

const onBadgeUpdate = (count) => { console.log('Badge inbox:', count) }

const onProfileOpenSocial = () => {
  showProfile.value = false
  setTimeout(() => { showSocial.value = true }, 200)
}

const onAvatarUpdated = (newAvatar) => { avatar.value = newAvatar }
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

/* ── Session loading screen ─────────────────────────────────── */
#session-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
}

.session-spinner {
  width: 44px; height: 44px;
  border: 3px solid rgba(255, 217, 102, 0.15);
  border-top-color: #ffd966;
  border-radius: 50%;
  animation: sessionSpin 0.75s linear infinite;
}
@keyframes sessionSpin {
  to { transform: rotate(360deg); }
}

.session-text {
  font-size: 13px;
  color: rgba(255, 245, 200, 0.4);
  letter-spacing: 0.05em;
}

/* ── Header ──────────────────────────────────────────────────── */
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

/* ── Footer ──────────────────────────────────────────────────── */
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
