<template>

  <!-- ── Ecran an-kilalao — misolo an'ilay Home mandritra ny lalao ── -->
  <Game
    v-if="showGame"
    :slots="gameSlots"
    :my-uid="userFirebaseUid"
    :room-id="currentRoomId"
    @quit-game="onQuitGame"
  />

  <template v-else>

  <header id="hdr">
    <div id="hdr-l" @click="showWallet = true" role="button" aria-label="Portefeuille">
      <div class="h-l-icon">
        <span class="material-icons">account_balance_wallet</span>
      </div>
      <span class="w-amount">{{ wallet }} Ar</span>
    </div>
    <div id="hdr-r">
      <button class="btn-circle" title="Notifications" aria-label="Notifications">
        <span class="material-icons">notifications</span>
      </button>
      <button id="btn-settings" class="btn-circle" title="Paramètres" aria-label="Paramètres" @click="showSettings = true">
        <span class="material-icons">settings</span>
      </button>
    </div>
  </header>

  <!-- Loading screen rehefa mbola manamarina session -->
  <div v-if="isCheckingSession" id="session-loading">
    <div class="session-spinner"></div>
    <p class="session-text">Vérification de la session…</p>
  </div>

  <template v-else>

    <main id="main">
      <div id="logo-wrap">
        <img class="logo-img" src="../assets/images/logo/Go_Ludo.png" alt="Logo Go Ludo Mada">
      </div>

      <div id="btns">

        <div class="mbtn mbtn-g" @click="showSocial = true" role="button">
          <div class="btn-diamond">
            <img src="../assets/images/buttons/icons/000000005.png" style="width: 145px" alt="Icône Amis">
          </div>
          <div class="btn-label">
            <span class="btn-title">Amis</span>
            <span class="btn-sub">Inviter des amis</span>
          </div>
        </div>

        <div class="mbtn mbtn-p" role="button" @click="onOpenMultiplayer">
          <div class="btn-diamond">
            <img src="../assets/images/buttons/icons/1209849.png" alt="Icône Multijoueur">
          </div>
          <div class="btn-label">
            <span class="btn-title">Multijoueur</span>
            <span class="btn-sub">Recherche auto</span>
          </div>
        </div>

        <div class="mbtn mbtn-y" role="button" @click="onOpenCreateRoom">
          <div class="btn-diamond">
            <img src="../assets/images/buttons/icons/8193229.png" alt="Icône Créer une partie">
          </div>
          <div class="btn-label">
            <span class="btn-title">Créer</span>
            <span class="btn-sub">Nouvelle table</span>
          </div>
        </div>

        <div class="mbtn mbtn-b" role="button" @click="showRoomList = true">
          <div class="btn-diamond">
            <img src="../assets/images/buttons/icons/dice-clip-art-clkerm-vector-clip-art-online-royalty-domain-18.png" alt="Icône Salon public">
          </div>
          <div class="btn-label">
            <span class="btn-title">Salon</span>
            <span class="btn-sub">Rejoindre</span>
          </div>
        </div>

      </div>
    </main>

    <footer id="footer">
      <div id="profile-info">
        <div id="ava" role="button" tabindex="0" aria-label="Voir le profil" @click="showProfile = true">{{ avatar }}</div>
        <div>
          <div id="uname">{{ username }}</div>
          <div id="uid">ID : {{ userUid }}</div>
        </div>
      </div>
      <div id="btn-stats" role="button" tabindex="0" @click="openChatList">
        <div style="display: flex; align-items: center; gap: 5px;">
          <IconMessage style="width:18px; height:18px;" />
        </div>
        <span v-if="chatBadgeCount > 0" id="chat-badge">{{ chatBadgeCount > 99 ? '99+' : chatBadgeCount }}</span>
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
      @open-chat="onOpenChat"
    />

    <ModalChat
      :show="showChat"
      :my-firebase-uid="userFirebaseUid"
      :target-user="chatTarget"
      @close="onChatClose"
      @challenge="onProfileChallenge"
    />

    <ModalBet
      :show="showMultiplayer"
      :my-uid="userFirebaseUid"
      :my-name="username"
      :my-avatar="avatar"
      :wallet="wallet"
      :mode="betMode"
      @close="showMultiplayer = false"
      @match-found="onMatchFound"
      @stake-confirmed="onStakeConfirmed"
    />

    <ModalRoomList
      :show="showRoomList"
      :my-uid="userFirebaseUid"
      :my-name="username"
      :my-avatar="avatar"
      @close="showRoomList = false"
      @open-room="onOpenRoomFromList"
      @create-room="onOpenCreateRoomFromList"
    />

    <ModalSettings
      :show="showSettings"
      v-model:message-notif="messageNotifEnabled"
      @close="showSettings = false"
    />

    <ModalWallet
      :show="showWallet"
      :wallet="wallet"
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
      :user-firebase-uid="userFirebaseUid"
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
      :my-wallet="wallet"
      :search-mode="roomSearchMode"
      @close="onLeaveRoom"
      @game-start="onGameStart"
      @room-cancelled="onRoomCancelled"
      @kicked="onKicked"
    />

    <!-- ── Notification (errors + invitations + demandes d'ami + messages) ── -->
    <Notification
      :message="notifMessage"
      :type="notifType"
      :duration="notifDuration"
      :inviter-uid="notifInviterUid"
      :room-id="notifRoomId"
      :sender-name="notifSenderName"
      @close="notifMessage = ''; notifType = ''"
      @accept-invitation="onAcceptInvitation"
      @decline-invitation="onDeclineInvitation"
      @accept-friend-request="onAcceptFriendRequest"
      @decline-friend-request="onDeclineFriendRequest"
      @reply-message="onReplyMessage"
    />

  </template>

  </template>

</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import ModalUsername from './modals/ModalUsername.vue'
import ModalSettings from './modals/ModalSettings.vue'
import ModalProfile from './modals/ModalProfile.vue'
import ModalSocial from './modals/ModalSocial.vue'
import ModalWallet from './modals/ModalWallet.vue'
import Notification from './modals/Notification.vue'
import ModalRoom from './modals/ModalRoom.vue'
import ModalBet from './modals/ModalBet.vue'
import ModalRoomList from './modals/ModalRoomList.vue'
import ModalChat from './modals/ModalChat.vue'
import Game from './Game.vue'
import IconMessage from './IconMessage.vue'
import { fetchWithTimeout } from '../utils/network'

const isCheckingSession = ref(true)
const username          = ref('Joueur')
const avatar             = ref('👤')
const userUid             = ref('')
const userFirebaseUid     = ref('')
const wallet              = ref(0)

const showSocial   = ref(false)
const showSettings = ref(false)
const showWallet   = ref(false)
const showUsername = ref(false)
const showProfile  = ref(false)
const showRoom     = ref(false)
const showMultiplayer = ref(false)
const showRoomList = ref(false)
const showChat     = ref(false)
const chatTarget   = ref(null)
const betMode = ref('search')
const currentRoomId = ref(null)
const roomSearchMode = ref(false)
const showGame  = ref(false)
const gameSlots = ref([])

const notifMessage     = ref('')
const notifType        = ref('')
const notifDuration    = ref(4000)
const notifInviterUid  = ref(null)
const notifRoomId      = ref(null)
// "notifSenderName"/"notifSenderAvatar" — ilaina amin'ny fanambarana
// 'friend-request'/'message' ihany (jereo Notification.vue,
// showMessageNotification, showFriendRequestNotification).
const notifSenderName   = ref('')
const notifSenderAvatar = ref('👤')

// ── Heartbeat presence ("status enligne") ────────────────────────
const HEARTBEAT_INTERVAL_MS = 10000
let heartbeatTimer = null

const sendHeartbeat = () => {
  if (!userFirebaseUid.value) return
  fetchWithTimeout('/api/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'heartbeat', uid: userFirebaseUid.value }),
  }).catch(() => {})
}

const startHeartbeat = () => {
  if (heartbeatTimer) return
  sendHeartbeat()
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)
}

const stopHeartbeat = () => {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
}

// ── Polling invitations ("challenge") ────────────────────────────
const API_ROOM = '/api/room'
const INVITE_POLL_INTERVAL_MS = 3000
let inviteTimer = null

const invitePending  = ref(false)
const lastHandledRoomId = ref(null)
let invitePendingTimer = null

const authHeaders = () => {
  const token = localStorage.getItem('user_token')
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

const pollInvite = async () => {
  if (!userFirebaseUid.value) return
  if (notifType.value === 'invitation' || showRoom.value || invitePending.value) return
  try {
    const res = await fetchWithTimeout(API_ROOM, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ action: 'poll-invite', uid: userFirebaseUid.value }),
    })
    const data = await res.json()
    if (res.ok && data.success && data.invite) {
      if (data.invite.roomId === lastHandledRoomId.value) return

      notifMessage.value    = `${data.invite.inviterUsername} vous défie à une partie !`
      notifType.value       = 'invitation'
      notifInviterUid.value = data.invite.inviterUid
      notifRoomId.value     = data.invite.roomId
    }
  } catch (e) {
    
  }
}

const startInvitePolling = () => {
  if (inviteTimer) return
  pollInvite()
  inviteTimer = setInterval(pollInvite, INVITE_POLL_INTERVAL_MS)
}

const stopInvitePolling = () => {
  if (inviteTimer) { clearInterval(inviteTimer); inviteTimer = null }
}

const lockInvite = (roomId) => {
  invitePending.value = true
  lastHandledRoomId.value = roomId
  clearTimeout(invitePendingTimer)
  invitePendingTimer = setTimeout(() => {
    invitePending.value = false
    lastHandledRoomId.value = null
  }, 4000)
}

// ── Polling hafatra ("message") — badge + Notification ──────
// "goludo_msg_notif" (localStorage): safidin'ny mpampiasa (ao amin'ny
// ModalSettings.vue) raha tokony haseho ny Notification isaky ny
// misy hafatra vaovao (ny badge kosa MISEHO HATRANY, na "activé" na
// "tsy activé" io safidy io — jereo ny fanazavana ao pollConversations).
const MSG_POLL_INTERVAL_MS = 8000
let msgPollTimer = null
let firstMsgPoll = true

const messageNotifEnabled = ref(localStorage.getItem('goludo_msg_notif') !== '0')
watch(messageNotifEnabled, (val) => {
  localStorage.setItem('goludo_msg_notif', val ? '1' : '0')
})

// "chatBadgeCount" — ny isan'ny UTILISATEUR miavaka (tsy ny isan'ny
// hafatra) manana hafatra tsy vaky NATERAKA taorian'ny fotoana farany
// nidiran'ny mpampiasa ilay lisitry ny resaka (jereo openChatList) —
// io no antony "averina ho 1" ilay chiffre raha nisy hafatra vaovao
// taorian'ny nidirana ilay lisitra, fa tsy "mitohy" amin'ilay chiffre
// teo aloha (efa hita/nidirana io lisitra io).
const chatBadgeCount    = ref(0)
const lastChatListOpenAt = ref(Number(localStorage.getItem('goludo_chat_list_seen_at') || Date.now()))
const knownLastMessageAt = {}

// "truncateMsg" — 10 caractère no aseho ao amin'ny Notification (aperçu
// hafatra), ary "..." avy eo raha mihoatra io (ny espace koa mikaonty
// amin'ilay 10 — "slice" tsotra amin'ny soratra manontolo, tsy
// manavaka ny espace amin'ny hafa).
const truncateMsg = (text, max = 10) =>
  text.length > max ? text.slice(0, max) + '...' : text

const showMessageNotification = (c) => {
  notifMessage.value      = ''
  notifType.value         = ''
  notifInviterUid.value   = null
  notifSenderName.value   = ''
  notifSenderAvatar.value = '👤'
  setTimeout(() => {
    notifMessage.value      = truncateMsg(c.lastMessage || 'Nouveau message')
    notifType.value         = 'message'
    notifSenderName.value   = c.username || 'Joueur'
    notifSenderAvatar.value = c.avatar || '👤'
    notifInviterUid.value   = c.firebaseUid
  }, 50)
}

const pollConversations = async () => {
  if (!userFirebaseUid.value) return
  try {
    const res = await fetchWithTimeout('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'list-conversations', uid: userFirebaseUid.value }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) return
    const convos = data.conversations || []

    chatBadgeCount.value = convos.filter(c =>
      c.unreadCount > 0 && c.lastMessageAt && c.lastMessageAt > lastChatListOpenAt.value
    ).length

    for (const c of convos) {
      if (!c.firebaseUid || !c.lastSenderUid || c.lastSenderUid === userFirebaseUid.value || !c.lastMessageAt) continue
      const prevSeen = knownLastMessageAt[c.firebaseUid] || 0
      const isNew = c.lastMessageAt > prevSeen
      knownLastMessageAt[c.firebaseUid] = c.lastMessageAt

      if (isNew && !firstMsgPoll && messageNotifEnabled.value && !notifType.value &&
          !(showChat.value && chatTarget.value?.firebaseUid === c.firebaseUid)) {
        showMessageNotification(c)
      }
    }
    firstMsgPoll = false
  } catch { /* mijanona amin'ny valeur teo aloha raha tsy tafiditra */ }
}

const startChatPolling = () => {
  if (msgPollTimer) return
  pollConversations()
  msgPollTimer = setInterval(pollConversations, MSG_POLL_INTERVAL_MS)
}
const stopChatPolling = () => {
  if (msgPollTimer) { clearInterval(msgPollTimer); msgPollTimer = null }
}

const onReplyMessage = ({ inviterUid } = {}) => {
  const username = notifSenderName.value
  const avatar   = notifSenderAvatar.value
  notifMessage.value = ''
  notifType.value = ''
  notifInviterUid.value = null
  if (!inviterUid) return
  onOpenChat({ firebaseUid: inviterUid, username, avatar })
}

// ── Polling demande d'ami ("friend-request") — Notification ──
const FRIEND_POLL_INTERVAL_MS = 10000
let friendPollTimer = null
let firstFriendPoll = true
let knownPendingReceivedUids = new Set()

const showFriendRequestNotification = (f) => {
  notifMessage.value      = ''
  notifType.value         = ''
  notifInviterUid.value   = null
  notifSenderName.value   = ''
  notifSenderAvatar.value = '👤'
  setTimeout(() => {
    notifMessage.value      = 'souhaite devenir votre ami.'
    notifType.value         = 'friend-request'
    notifSenderName.value   = f.username || 'Joueur'
    notifSenderAvatar.value = f.avatar || '👤'
    notifInviterUid.value   = f.firebaseUid
  }, 50)
}

const pollFriendRequests = async () => {
  if (!userFirebaseUid.value) return
  try {
    const res = await fetchWithTimeout('/api/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'list-friends', uid: userFirebaseUid.value }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) return
    const pendingReceived = (data.friends || []).filter(f => f.status === 'pending_received')
    const currentUids = new Set(pendingReceived.map(f => f.firebaseUid))

    if (!firstFriendPoll && !notifType.value) {
      const newOne = pendingReceived.find(f => !knownPendingReceivedUids.has(f.firebaseUid))
      if (newOne) showFriendRequestNotification(newOne)
    }
    knownPendingReceivedUids = currentUids
    firstFriendPoll = false
  } catch { /* mijanona amin'ny valeur teo aloha raha tsy tafiditra */ }
}

const startFriendRequestPolling = () => {
  if (friendPollTimer) return
  pollFriendRequests()
  friendPollTimer = setInterval(pollFriendRequests, FRIEND_POLL_INTERVAL_MS)
}
const stopFriendRequestPolling = () => {
  if (friendPollTimer) { clearInterval(friendPollTimer); friendPollTimer = null }
}

const onAcceptFriendRequest = async ({ inviterUid } = {}) => {
  notifMessage.value = ''
  notifType.value = ''
  notifInviterUid.value = null
  if (!inviterUid || !userFirebaseUid.value) return
  try {
    await fetchWithTimeout('/api/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'accept-request', uid: userFirebaseUid.value, requesterFirebaseUid: inviterUid }),
    })
  } catch { /* ignore */ }
}
const onDeclineFriendRequest = async ({ inviterUid } = {}) => {
  notifMessage.value = ''
  notifType.value = ''
  notifInviterUid.value = null
  if (!inviterUid || !userFirebaseUid.value) return
  try {
    await fetchWithTimeout('/api/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'decline-request', uid: userFirebaseUid.value, requesterFirebaseUid: inviterUid }),
    })
  } catch { /* ignore */ }
}

const persistSession = (patch) => {
  const raw = localStorage.getItem('goludo_session')
  let current = {}
  if (raw) {
    try { current = JSON.parse(raw) } catch (e) { current = {} }
  }
  localStorage.setItem('goludo_session', JSON.stringify({ ...current, ...patch }))
}

onMounted(async () => {
  const raw = localStorage.getItem('goludo_session')
  if (!raw) {
    isCheckingSession.value = false
    return
  }

  let cached
  try {
    cached = JSON.parse(raw)
  } catch (e) {
    localStorage.removeItem('goludo_session')
    isCheckingSession.value = false
    return
  }

  userFirebaseUid.value = cached.uid || ''

  userUid.value = cached.customUid || ''
  wallet.value  = cached.wallet ?? 0
  if (cached.username) username.value = cached.username

  try {
    const res = await fetchWithTimeout('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'profile', uid: userFirebaseUid.value }),
    })
    const data = await res.json()

    if (res.ok && data.success) {
      userUid.value = data.profile.customUid || ''
      wallet.value  = data.profile.wallet ?? 0
      if (data.profile.username) username.value = data.profile.username
      if (data.profile.avatar && data.profile.avatar !== 'default') {
        avatar.value = data.profile.avatar
      }

      showUsername.value = !data.hasUsername

      persistSession({
        customUid: data.profile.customUid,
        avatar: data.profile.avatar,
        wallet: data.profile.wallet,
        username: data.profile.username,
      })
    }
  } catch (e) {
    console.error('Tsy nahazo ny profil avy amin\'ny /api/session:', e)
  }

  isCheckingSession.value = false

  if (userFirebaseUid.value) {
    startHeartbeat()
    startInvitePolling()
    startChatPolling()
    startFriendRequestPolling()
  }
})

onUnmounted(() => {
  stopHeartbeat()
  stopInvitePolling()
  stopChatPolling()
  stopFriendRequestPolling()
  clearTimeout(invitePendingTimer)
})

const onBadgeUpdate        = () => {}
const onOpenRoom           = (payload) => {
  const roomId = typeof payload === 'string' ? payload : payload?.roomId
  if (!roomId) return
  roomSearchMode.value = false
  currentRoomId.value = roomId
  showRoom.value = true
  showSocial.value = false
  showProfile.value = false
}
// Bouton "Multijoueur"
const onOpenMultiplayer = () => {
  betMode.value = 'search'
  showMultiplayer.value = true
}
// Bouton "Créer" (Nouvelle table)
const onOpenCreateRoom = () => {
  betMode.value = 'create'
  showMultiplayer.value = true
}
const onOpenCreateRoomFromList = () => {
  showRoomList.value = false
  onOpenCreateRoom()
}
const onOpenRoomFromList = (payload) => {
  showRoomList.value = false
  onOpenRoom(payload)
}
const onStakeConfirmed = async ({ stake, password, colorPickEnabled } = {}) => {
  if (!stake) return
  showMultiplayer.value = false
  roomSearchMode.value = false
  currentRoomId.value = ''
  showRoom.value = true
  showSocial.value = false
  showProfile.value = false
  try {
    const res = await fetchWithTimeout(`${API_ROOM}?action=create-room`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ uid: userFirebaseUid.value, username: username.value, avatar: avatar.value, stake, password: password || null, colorPickEnabled: !!colorPickEnabled }),
    })
    const data = await res.json()
    if (!res.ok || !data.roomId) { showRoom.value = false; return }
    currentRoomId.value = data.roomId
  } catch (e) {
    console.error('Tsy nahomby ny famoronana salon:', e)
    showRoom.value = false
    notifMessage.value = ''
    notifType.value = ''
    setTimeout(() => {
      notifMessage.value  = e?.message || 'Impossible de créer le salon. Réessayez.'
      notifType.value     = 'error'
      notifDuration.value = 4000
    }, 50)
  }
}
const onUsernameSet        = (newUsername) => {
  username.value = newUsername
  showUsername.value = false
  persistSession({ username: newUsername })
}
const onAvatarUpdated      = (newAvatar) => {
  avatar.value = newAvatar
  persistSession({ avatar: newAvatar })
}
const onProfileOpenSocial  = () => {
  showSocial.value = true
}
const openChatList = () => {
  chatTarget.value = null
  showChat.value = true
  // Fanaovana "checkpoint" — esorina ilay badge, ary ny hafatra vaovao
  // manaraka ihany (aorian'ity fotoana ity) no hanisa indray (jereo
  // pollConversations/chatBadgeCount).
  lastChatListOpenAt.value = Date.now()
  localStorage.setItem('goludo_chat_list_seen_at', String(lastChatListOpenAt.value))
  chatBadgeCount.value = 0
}
const onOpenChat = (user) => {
  chatTarget.value = user
  showChat.value = true
}
const onChatClose = () => {
  showChat.value = false
  chatTarget.value = null
}
const onProfileChallenge   = async (targetFirebaseUid) => {
  if (!targetFirebaseUid) return
  try {
    const createRes = await fetchWithTimeout(`${API_ROOM}?action=create-room`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ uid: userFirebaseUid.value, username: username.value, avatar: avatar.value }),
    })
    const createData = await createRes.json()
    if (!createRes.ok || !createData.roomId) return

    await fetchWithTimeout(`${API_ROOM}?action=send-invite`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({
        uid: userFirebaseUid.value,
        targetFirebaseUid,
        roomId: createData.roomId,
        inviterUsername: username.value,
        targetSlot: 1,
      }),
    })

    onOpenRoom({ roomId: createData.roomId })
  } catch (e) {
    console.error('Tsy nahomby ny fandefasana challenge:', e)
    notifMessage.value = ''
    notifType.value = ''
    setTimeout(() => {
      notifMessage.value  = e?.message || "Impossible d'envoyer le défi. Réessayez."
      notifType.value     = 'error'
      notifDuration.value = 4000
    }, 50)
  }
}
const onMatchFound          = ({ roomId } = {}) => {
  if (!roomId) return
  currentRoomId.value = roomId
  roomSearchMode.value = true
  showRoom.value = true
  showMultiplayer.value = false
}
const onLeaveRoom          = () => { showRoom.value = false; currentRoomId.value = null; roomSearchMode.value = false }
// Rehefa vita ny décompte 3s ao amin'ny ModalRoom.vue (bouton "Lancer
// la partie"), dia mampiditra ny utilisateur ao amin'ny Game.vue —
// alefa ny "slots" (misy ny "username" tsirairay) mba haseho ao
// amin'ilay lalao ny anaran'ny mpilalao tena izy, fa tsy "Player 1 /
// 2 / 3 / 4" intsony.
const onGameStart = ({ roomId, slots } = {}) => {
  if (!roomId) return
  gameSlots.value = slots || []
  showGame.value = true
  showRoom.value = false
}
// Rehefa "Quitter" ao amin'ny button "menu" an'ny Game.vue (efa
// niala tao anaty room izy io — leave-room, jereo onQuitGame ao
// Game.vue), dia miverina any amin'ny Accueil.
const onQuitGame = () => {
  showGame.value       = false
  gameSlots.value      = []
  currentRoomId.value  = null
}
const onRoomCancelled      = () => {
  onLeaveRoom()
  notifMessage.value = ''
  notifType.value = ''
  notifInviterUid.value = null
  notifRoomId.value = null
  setTimeout(() => {
    notifMessage.value  = "Le salon a été annulé par l'hôte."
    notifType.value     = 'info'
    notifDuration.value = 4000
  }, 50)
}
const onKicked              = () => {
  onLeaveRoom()
  notifMessage.value = ''
  notifType.value = ''
  notifInviterUid.value = null
  notifRoomId.value = null
  setTimeout(() => {
    notifMessage.value  = "Vous avez été exclu du salon par l'hôte."
    notifType.value     = 'warning'
    notifDuration.value = 4000
  }, 50)
}
const onAcceptInvitation    = async ({ inviterUid, roomId } = {}) => {
  notifMessage.value = ''
  notifType.value = ''
  notifInviterUid.value = null
  if (!roomId) { notifRoomId.value = null; return }
  lockInvite(roomId)
  notifRoomId.value = null
  try {
    const res = await fetchWithTimeout(API_ROOM, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ action: 'respond-invite', uid: userFirebaseUid.value, roomId, response: 'accept' }),
    })
    const data = await res.json()
    if (res.ok && data.success) {
      onOpenRoom({ roomId: data.roomId || roomId })
    }
  } catch (e) {
    console.error('Tsy nahomby ny fanekena invitation:', e)
    setTimeout(() => {
      notifMessage.value  = e?.message || "Impossible d'accepter l'invitation. Réessayez."
      notifType.value     = 'error'
      notifDuration.value = 4000
    }, 50)
  }
}
const onDeclineInvitation   = async ({ roomId } = {}) => {
  notifMessage.value = ''
  notifType.value = ''
  notifInviterUid.value = null
  if (!roomId) { notifRoomId.value = null; return }
  lockInvite(roomId)
  notifRoomId.value = null
  fetchWithTimeout(API_ROOM, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ action: 'respond-invite', uid: userFirebaseUid.value, roomId, response: 'decline' }),
  }).catch(() => {})
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
  display: flex; align-items: center;
  padding: 6px 12px; border-radius: 40px;
  background: var(--panel); border: 1px solid var(--border);
  cursor: pointer;
}
/* "gap" (flexbox) dia CSS vaovao ihany koa (2020-2021), tsy toy ny
   "gap" amin'ny grid (izay efa ela be, jereo .white-box ao Game.vue) —
   raha tsy takatry ny navigateur (Safari taloha, WebView taloha) io
   dia TSY MISY error fa tsotra "tsy misy vokany" (ny elanelana no
   very, tsy mikambana ny zavatra rehetra). Ampiasaina ny margin eo
   amin'ny zanaka (efa takatry ny navigateur rehetra hatramin'ny ela)
   fa tsy "gap" mihitsy, mba ho azo antoka amin'ny navigateur rehetra. */
#hdr-l > * + * { margin-left: 8px; }

#hdr-r { display: flex; align-items: center; }
#hdr-r > * + * { margin-left: 10px; }

.w-amount { font-size: 20px; font-weight: 700; color: var(--gold); }
.h-l-icon { color: var(--gold); }

.material-icons {
  display: flex; align-items: center;
  justify-content: center; vertical-align: middle;
}

.h-l-icon {
  width: 24px; height: 24px;
  display: flex; font-size: 25px;
  align-items: center; justify-content: center;
}

.btn-circle {
  width: 42px; height: 42px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: var(--panel); border: 1px solid var(--border);
  color: #fff; font-size: 25px; cursor: pointer;
}

.logo-img {
  /* Fallback ho an'ny navigateur tsy mahalala ny CSS min() — raha tsy
     izany dia TSY MISY "width" mihitsy amin'izy ireo (esorina avokoa ny
     declaration raha tsy takatry ny parser), ka miverina amin'ny habe
     voajanahary (1280x853px an'ny Go_Ludo.png) ilay sary — LEHIBE be
     mandrakotra ny écran. Ity fallback ity dia mitovy amin'ilay ilany
     "mobile" (62vw) an'ny min() eo ambany, ka mitovy fisehoana amin'ny
     téléphone (izay ampiasan'ny ankamaroan'ny mpampiasa) na dia tsy
     takatry ny min() aza. */
  width: 62vw;
  width: min(230px, 62vw);
  filter: drop-shadow(0 8px 24px rgba(255, 217, 102, 0.25));
}

@keyframes riseUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

#main {
  min-height: 100vh;
  min-height: 100dvh;
  padding: calc(var(--bar-h) + 8px) 16px calc(var(--bar-h) + 56px);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
}

#logo-wrap {
  animation: riseUp 0.6s cubic-bezier(0.2, 0.9, 0.4, 1) both;
  margin-top: -14px;
}

/* "display:grid" dia tsy takatry ny navigateur/WebView taloha be
   (Firefox 45 sy Safari 10, ohatra, dia mialoha ny CSS Grid — 2017),
   ka esorina tanteraka ilay declaration, lasa "display" default (block)
   ilay #btns, ary ny .mbtn 4 (width:100%) miorina eo ambonin'ny hafa
   miampy ny fihodinana 45deg an'ny .btn-diamond (izay midadasika kokoa
   noho ny 100x100px voafetra azy) — ka mifanketoka/misy takona ireo
   button. Solon'ny grid dia "flexbox" (efa takatry ny navigateur
   rehetra amin'ity floor ity) miaraka amin'ny "flex-wrap", ary
   "margin" (fa tsy "gap", izay CSS vaovao ao anaty flexbox koa) no
   mamorona ny elanelana eo amin'ny .mbtn tsirairay. */
#btns {
  display: flex; flex-wrap: wrap;
  width: 100%; max-width: 400px;
  margin-top: 10px;
}

.mbtn {
  width: calc(50% - 7.5px); display: flex; flex-direction: column;
  align-items: center; cursor: pointer;
  position: relative; transition: transform 0.2s;
}
.mbtn:active { transform: scale(0.95); }
/* Toerana: 1=ambony-havia, 2=ambony-havanana, 3=ambany-havia,
   4=ambany-havanana — mitovy amin'ny "gap: 20px 15px" 2 tsanja
   nampiasaina teo aloha. */
.mbtn:nth-child(2) { margin-left: 15px; }
.mbtn:nth-child(3) { margin-top: 20px; }
.mbtn:nth-child(4) { margin-left: 15px; margin-top: 20px; }

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
#profile-info { display: flex; align-items: center; }
/* "gap" (flexbox) — jereo ny fanazavana ao amin'ny #hdr-l etsy ambony. */
#profile-info > * + * { margin-left: 12px; }
#ava { width: 46px; height: 46px; border-radius: 50%; background: #3a6a5a; border: 2px solid var(--gold); display: flex; align-items: center; justify-content: center; font-size: 26px; cursor: pointer; }
#uname { font-size: 15px; font-weight: 700; }
#uid   { font-size: 9px; color: rgba(255,245,200,0.3); }

#btn-stats {
  position: relative;
  background: #27ae60; color: #ffffff;
  padding: 10px 20px; border-radius: 40px;
  font-weight: 700; cursor: pointer;
}
/* Badge (isan'ny utilisateur miavaka nandefa hafatra vaovao) — eny
   ambony ankavanana, tsy manimba ny design an'ilay button ("position:
   absolute" mivoaka amin'ny normal flow, tsy mikasika ny habe/sakan'ny
   #btn-stats mihitsy). */
#chat-badge {
  position: absolute; top: -6px; right: -6px;
  min-width: 18px; height: 18px; padding: 0 4px;
  border-radius: 10px;
  background: #ff4f6e; color: #fff;
  font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #08264a;
  box-shadow: 0 2px 6px rgba(0,0,0,.4);
}

@media (min-width: 900px) {
  #btns { max-width: 800px; }
  .btn-diamond { width: 120px; height: 120px; }
  /* Andalana tokana misy 4 (gap:20px, tsanja tokana), ka averina
     hazavaina daholo ny margin an'ny 4 .mbtn mba tsy hisy sisan'ny
     naman'ny "toerana 2 tsanja" (jereo ambony) — voafehin'ny
     specificity/source-order (mitovy selector, avy eo kokoa) ny
     fandresen'ireto valeur ireto. */
  .mbtn { width: calc(25% - 15px); }
  .mbtn:nth-child(1) { margin-left: 0; margin-top: 0; }
  .mbtn:nth-child(2) { margin-left: 20px; margin-top: 0; }
  .mbtn:nth-child(3) { margin-left: 20px; margin-top: 0; }
  .mbtn:nth-child(4) { margin-left: 20px; margin-top: 0; }
}

</style>
