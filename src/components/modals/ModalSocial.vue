<template>
  <div
    v-if="localVisible"
    :class="['ovl', closing ? 'off' : 'on']"
    id="modal-social"
    @click.self="handleClose"
  >
    <div class="mdl" ref="mdlRef" @click="closePopup">

      <button class="x flex-c" @click="handleClose">
        <span class="material-icons">close</span>
      </button>

      <h2 class="mtitle mtitle-sm">Social Center</h2>

      <!-- ── Tabs ── -->
      <div class="ftabs">
        <button :class="['ft', activeTab === 'friends' ? 'on' : '']" @click="activeTab = 'friends'">
          <span class="material-icons">group</span>
          <span class="ft-lbl">Buddies</span>
        </button>
        <button :class="['ft', activeTab === 'inbox' ? 'on' : '']" @click="activeTab = 'inbox'">
          <span class="material-icons">mail</span>
          <span class="ft-lbl">Requests</span>
          <span v-if="inbox.length" class="ft-badge">{{ inbox.length }}</span>
        </button>
        <button :class="['ft', activeTab === 'search' ? 'on' : '']" @click="activeTab = 'search'">
          <span class="material-icons">person_search</span>
          <span class="ft-lbl">Find Player</span>
        </button>
      </div>

      <!-- ══════════════════════════════
           TAB: BUDDIES
           ══════════════════════════════ -->
      <div :class="['fp', activeTab === 'friends' ? 'on' : '']">
        <div class="fsrch">
          <input type="text" v-model="friendSearch" placeholder="Search Buddies..." @keyup.enter="commitFriendSearch">
          <button class="srch-btn" @click="commitFriendSearch" aria-label="Search">
            <span class="material-icons">search</span>
          </button>
        </div>
        <div class="flist" ref="listFriends">
          <div v-if="isLoadingFriends" class="empty"><div class="list-spinner"></div></div>
          <div v-else-if="committedFriendSearch && filteredFriends.length === 0" class="empty">
            <span class="material-icons">search_off</span><p>No match found</p>
          </div>
          <div v-else-if="!committedFriendSearch && friends.length === 0" class="empty">
            <span class="material-icons">group_off</span><p>No buddies yet</p>
          </div>

          <!-- ── Buddy row ── -->
          <div
            v-if="!isLoadingFriends"
            v-for="f in filteredFriends"
            :key="f.firebaseUid"
            class="fi fi-clickable"
            :class="{ 'fi-active': popup.uid === f.firebaseUid && popup.tab === 'friends' }"
            @click.stop="togglePopup(f, 'friends', $event)"
          >
            <div class="fi-l">
              <div class="fava fava-emoji">{{ f.avatar || '👤' }}</div>
              <div>
                <div class="fn">{{ f.username }}</div>
                <div class="fpres" :class="getPresence(f.firebaseUid).online ? 'fpres-on' : 'fpres-off'">
                  <span v-if="getPresence(f.firebaseUid).online">● Online</span>
                  <span v-else>● {{ formatLastSeen(getPresence(f.firebaseUid).lastSeen) }}</span>
                </div>
              </div>
            </div>
            <div class="fa">
              <button
                v-if="getPresence(f.firebaseUid).online"
                class="fb fb-i"
                style="min-width:84px;"
                :class="{ 'btn-loading': loadingBtn === 'challenge-' + f.firebaseUid }"
                :disabled="!!loadingBtn || getCountdown(f.firebaseUid) !== null"
                @click.stop="challengeFriend(f)"
              >
                <span v-if="loadingBtn === 'challenge-' + f.firebaseUid" class="btn-spin btn-spin-gold"></span>
                <span v-else-if="getCountdown(f.firebaseUid) !== null" class="btn-countdown">{{ getCountdown(f.firebaseUid) }}</span>
                <span v-else>Challenge</span>
              </button>
              <button v-else class="fb fb-i" style="min-width:84px;" @click.stop="openPlayerProfile(f)">
                View Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════
           TAB: REQUESTS
           ══════════════════════════════ -->
      <div :class="['fp', activeTab === 'inbox' ? 'on' : '']">
        <div class="fsrch">
          <input type="text" v-model="inboxSearch" placeholder="Search Requests..." @keyup.enter="commitInboxSearch">
          <button class="srch-btn" @click="commitInboxSearch" aria-label="Search">
            <span class="material-icons">search</span>
          </button>
        </div>
        <div class="flist" ref="listInbox">
          <div v-if="isLoadingFriends" class="empty"><div class="list-spinner"></div></div>
          <div v-else-if="inbox.length === 0" class="empty">
            <span class="material-icons">mark_email_read</span><p>No pending requests</p>
          </div>
          <div v-else-if="committedInboxSearch && filteredInbox.length === 0" class="empty">
            <span class="material-icons">search_off</span><p>No match found</p>
          </div>

          <!-- ── Request row ── -->
          <div
            v-if="!isLoadingFriends"
            v-for="f in filteredInbox"
            :key="f.firebaseUid"
            class="fi fi-clickable"
            :class="{ 'fi-active': popup.uid === f.firebaseUid && popup.tab === 'inbox' }"
            @click.stop="togglePopup(f, 'inbox', $event)"
          >
            <div class="fi-l">
              <div class="fava fava-emoji">{{ f.avatar || '👤' }}</div>
              <div>
                <div class="fn">{{ f.username }}</div>
                <div class="fpres" :class="getPresence(f.firebaseUid).online ? 'fpres-on' : 'fpres-off'">
                  <span v-if="getPresence(f.firebaseUid).online">● Online</span>
                  <span v-else>● {{ formatLastSeen(getPresence(f.firebaseUid).lastSeen) }}</span>
                </div>
              </div>
            </div>
            <div class="fa">
              <button
                class="fb fb-a" style="min-width:64px;"
                :class="{ 'btn-loading': loadingBtn === 'accept-' + f.firebaseUid }"
                :disabled="!!loadingBtn"
                @click.stop="acceptRequest(f)"
              >
                <span v-if="loadingBtn === 'accept-' + f.firebaseUid" class="btn-spin btn-spin-green"></span>
                <span v-else>Accept</span>
              </button>
              <button
                class="fb fb-d" style="min-width:64px;"
                :class="{ 'btn-loading': loadingBtn === 'decline-' + f.firebaseUid }"
                :disabled="!!loadingBtn"
                @click.stop="askDecline(f)"
              >
                <span v-if="loadingBtn === 'decline-' + f.firebaseUid" class="btn-spin btn-spin-red"></span>
                <span v-else>Decline</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════
           TAB: FIND PLAYER
           ══════════════════════════════ -->
      <div :class="['fp', activeTab === 'search' ? 'on' : '']">
        <div class="fsrch">
          <input type="text" v-model="playerSearch" placeholder="Username or 9-digit ID..." @keyup.enter="doSearch">
          <button class="srch-btn" :disabled="isSearching" @click="doSearch" aria-label="Search">
            <span v-if="isSearching" class="btn-spin btn-spin-gold"></span>
            <span v-else class="material-icons">search</span>
          </button>
        </div>
        <div class="flist" ref="listSearch">
          <div v-if="!searchDone" class="empty">
            <span class="material-icons">person_search</span>
            <p>Enter a name or 9-digit ID,<br>then tap Search</p>
          </div>
          <div v-else-if="searchResults.length === 0" class="empty">
            <span class="material-icons">search_off</span><p>No player found</p>
          </div>

          <!-- ── Search result row ── -->
          <div
            v-for="p in searchResults"
            :key="p.firebaseUid"
            class="fi fi-clickable"
            :class="{ 'fi-active': popup.uid === p.firebaseUid && popup.tab === 'search' }"
            @click.stop="togglePopup(p, 'search', $event)"
          >
            <div class="fi-l">
              <div class="fava fava-emoji">{{ p.avatar || '👤' }}</div>
              <div>
                <div class="fn">{{ p.username }}</div>
                <div class="fuid">ID: {{ p.shortId }}</div>
                <div class="fpres" :class="getPresence(p.firebaseUid).online ? 'fpres-on' : 'fpres-off'" style="margin-top:1px;">
                  <span v-if="getPresence(p.firebaseUid).online">● Online</span>
                  <span v-else>● {{ formatLastSeen(getPresence(p.firebaseUid).lastSeen) }}</span>
                </div>
              </div>
            </div>
            <div class="fa">
              <button v-if="isFriend(p.firebaseUid)" class="fb fb-c" disabled style="min-width:66px;">Buddies</button>
              <button v-else-if="isPendingSent(p.firebaseUid)"
                class="fb fb-d" style="min-width:66px;"
                :class="{ 'btn-loading': loadingBtn === 'cancel-' + p.firebaseUid }"
                :disabled="!!loadingBtn"
                @click.stop="cancelRequest(p)">
                <span v-if="loadingBtn === 'cancel-' + p.firebaseUid" class="btn-spin btn-spin-red"></span>
                <span v-else>Cancel</span>
              </button>
              <template v-else-if="isPendingReceived(p.firebaseUid)">
                <button class="fb fb-a" style="min-width:64px;"
                  :class="{ 'btn-loading': loadingBtn === 'accept-' + p.firebaseUid }"
                  :disabled="!!loadingBtn" @click.stop="acceptRequest(p)">
                  <span v-if="loadingBtn === 'accept-' + p.firebaseUid" class="btn-spin btn-spin-green"></span>
                  <span v-else>Accept</span>
                </button>
              </template>
              <button v-else class="fb fb-a" style="min-width:66px;"
                :class="{ 'btn-loading': loadingBtn === 'add-' + p.firebaseUid }"
                :disabled="!!loadingBtn" @click.stop="sendRequest(p)">
                <span v-if="loadingBtn === 'add-' + p.firebaseUid" class="btn-spin btn-spin-green"></span>
                <span v-else>Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════
           POPUP CADRE KELY
           ══════════════════════════════ -->
      <Transition name="pop-anim">
        <div
          v-if="popup.visible"
          class="popup-card"
          :style="popupStyle"
          @click.stop
        >
          <!-- ── BUDDIES popup ── -->
          <template v-if="popup.tab === 'friends'">
            <button class="pop-btn pop-profile" @click="openPlayerProfile(popup.user); closePopup()">
              <span class="material-icons">account_circle</span>
              View Profile
            </button>
            <button
              v-if="popup.user && getPresence(popup.user.firebaseUid).online"
              class="pop-btn pop-challenge"
              :class="{ 'btn-loading': loadingBtn === 'challenge-' + popup.user?.firebaseUid }"
              :disabled="!!loadingBtn || getCountdown(popup.user?.firebaseUid) !== null"
              @click="challengeFriend(popup.user); closePopup()"
            >
              <span v-if="loadingBtn === 'challenge-' + popup.user?.firebaseUid" class="btn-spin btn-spin-gold"></span>
              <template v-else-if="getCountdown(popup.user?.firebaseUid) !== null">
                <span class="btn-countdown">{{ getCountdown(popup.user?.firebaseUid) }}</span>
              </template>
              <template v-else>
                <span class="material-icons">sports_esports</span>
                Challenge
              </template>
            </button>
            <button class="pop-btn pop-remove" @click="askRemove(popup.user)">
              <span class="material-icons">person_remove</span>
              Remove
            </button>
            <button class="pop-btn pop-report" @click="closePopup()">
              <span class="material-icons">flag</span>
              Signalé
            </button>
          </template>

          <!-- ── REQUESTS popup ── -->
          <template v-else-if="popup.tab === 'inbox'">
            <button class="pop-btn pop-profile" @click="openPlayerProfile(popup.user); closePopup()">
              <span class="material-icons">account_circle</span>
              View Profile
            </button>
            <button
              v-if="popup.user && getPresence(popup.user.firebaseUid).online"
              class="pop-btn pop-challenge"
              :class="{ 'btn-loading': loadingBtn === 'challenge-' + popup.user?.firebaseUid }"
              :disabled="!!loadingBtn || getCountdown(popup.user?.firebaseUid) !== null"
              @click="challengeFriend(popup.user); closePopup()"
            >
              <span v-if="loadingBtn === 'challenge-' + popup.user?.firebaseUid" class="btn-spin btn-spin-gold"></span>
              <template v-else-if="getCountdown(popup.user?.firebaseUid) !== null">
                <span class="btn-countdown">{{ getCountdown(popup.user?.firebaseUid) }}</span>
              </template>
              <template v-else>
                <span class="material-icons">sports_esports</span>
                Challenge
              </template>
            </button>
            <button class="pop-btn pop-accept"
              :class="{ 'btn-loading': loadingBtn === 'accept-' + popup.user?.firebaseUid }"
              :disabled="!!loadingBtn"
              @click="acceptRequest(popup.user); closePopup()">
              <span v-if="loadingBtn === 'accept-' + popup.user?.firebaseUid" class="btn-spin btn-spin-green"></span>
              <template v-else>
                <span class="material-icons">check_circle</span>
                Accept
              </template>
            </button>
            <button class="pop-btn pop-decline"
              :disabled="!!loadingBtn"
              @click="askDecline(popup.user)">
              <span class="material-icons">cancel</span>
              Decline
            </button>
            <button class="pop-btn pop-report" @click="closePopup()">
              <span class="material-icons">flag</span>
              Signalé
            </button>
          </template>

          <!-- ── FIND PLAYER popup ── -->
          <template v-else-if="popup.tab === 'search'">
            <button class="pop-btn pop-profile" @click="openPlayerProfile(popup.user); closePopup()">
              <span class="material-icons">account_circle</span>
              View Profile
            </button>
            <button
              v-if="popup.user && getPresence(popup.user.firebaseUid).online"
              class="pop-btn pop-challenge"
              :class="{ 'btn-loading': loadingBtn === 'challenge-' + popup.user?.firebaseUid }"
              :disabled="!!loadingBtn || getCountdown(popup.user?.firebaseUid) !== null"
              @click="challengeFriend(popup.user); closePopup()"
            >
              <span v-if="loadingBtn === 'challenge-' + popup.user?.firebaseUid" class="btn-spin btn-spin-gold"></span>
              <template v-else-if="getCountdown(popup.user?.firebaseUid) !== null">
                <span class="btn-countdown">{{ getCountdown(popup.user?.firebaseUid) }}</span>
              </template>
              <template v-else>
                <span class="material-icons">sports_esports</span>
                Challenge
              </template>
            </button>
            <button
              v-if="popup.user && !isFriend(popup.user.firebaseUid) && !isPendingSent(popup.user.firebaseUid) && !isPendingReceived(popup.user.firebaseUid)"
              class="pop-btn pop-add"
              :class="{ 'btn-loading': loadingBtn === 'add-' + popup.user?.firebaseUid }"
              :disabled="!!loadingBtn"
              @click="sendRequest(popup.user); closePopup()"
            >
              <span v-if="loadingBtn === 'add-' + popup.user?.firebaseUid" class="btn-spin btn-spin-green"></span>
              <template v-else>
                <span class="material-icons">person_add</span>
                Add
              </template>
            </button>
            <button
              v-else-if="popup.user && isPendingSent(popup.user.firebaseUid)"
              class="pop-btn pop-decline"
              :class="{ 'btn-loading': loadingBtn === 'cancel-' + popup.user?.firebaseUid }"
              :disabled="!!loadingBtn"
              @click="cancelRequest(popup.user); closePopup()"
            >
              <span v-if="loadingBtn === 'cancel-' + popup.user?.firebaseUid" class="btn-spin btn-spin-red"></span>
              <template v-else>
                <span class="material-icons">cancel</span>
                Cancel Request
              </template>
            </button>
            <button
              v-else-if="popup.user && isPendingReceived(popup.user.firebaseUid)"
              class="pop-btn pop-accept"
              :class="{ 'btn-loading': loadingBtn === 'accept-' + popup.user?.firebaseUid }"
              :disabled="!!loadingBtn"
              @click="acceptRequest(popup.user); closePopup()"
            >
              <span v-if="loadingBtn === 'accept-' + popup.user?.firebaseUid" class="btn-spin btn-spin-green"></span>
              <template v-else>
                <span class="material-icons">check_circle</span>
                Accept
              </template>
            </button>
            <button class="pop-btn pop-report" @click="closePopup()">
              <span class="material-icons">flag</span>
              Signalé
            </button>
          </template>
        </div>
      </Transition>

    </div>
  </div>

  <!-- ── ModalNotification ── -->
  <ModalNotification
    :message="errorMsg"
    :type="errorType"
    :duration="5000"
    @close="errorMsg = ''"
  />

  <!-- ── ModalConfirm: famafa amis ── -->
  <ModalConfirm
    v-model="confirmRemove.visible"
    title="Remove Buddy?"
    :message="confirmRemove.username ? `Remove ${confirmRemove.username} from your buddy list?` : ''"
    confirm-label="Remove"
    cancel-label="Cancel"
    type="danger"
    icon="person_remove"
    :loading="confirmRemove.loading"
    @confirm="doRemoveFriend"
  />

  <!-- ── ModalConfirm: decline request ── -->
  <ModalConfirm
    v-model="confirmDecline.visible"
    title="Decline Request?"
    :message="confirmDecline.username ? `Decline ${confirmDecline.username}'s friend request?` : ''"
    confirm-label="Decline"
    cancel-label="Cancel"
    type="danger"
    icon="cancel"
    :loading="confirmDecline.loading"
    @confirm="doDeclineRequest"
  />

  <!-- ── ModalProfile: profil olonkafa ── -->
  <ModalProfile
    :show="playerProfileVisible"
    :viewer-data="playerProfileData"
    @close="playerProfileVisible = false"
    @accept-request="onProfileAccept"
    @decline-request="onProfileDecline"
    @send-request="onProfileSendRequest"
    @remove-friend="onProfileRemove"
    @challenge="onProfileChallenge"
  />
</template>

<script setup>
import { ref, computed, watch, onUnmounted, reactive, nextTick } from 'vue'
import { initializeApp, getApps }            from 'firebase/app'
import { getFirestore, collection, onSnapshot as fsOnSnapshot } from 'firebase/firestore'
import { getDatabase, ref as dbRef, onValue, off } from 'firebase/database'
import ModalNotification from './ModalNotification.vue'
import ModalConfirm from './ModalConfirm.vue'
import ModalProfile from './ModalProfile.vue'

// ── Firebase ───────────────────────────────────────────────────
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

// ── API ────────────────────────────────────────────────────────
const API_FRIENDS  = '/api/friends'
const API_REQUESTS = '/api/requests'
const FRIENDS_LIMIT = 100

// ── Props / Emits ──────────────────────────────────────────────
const props = defineProps({
  show:           Boolean,
  myFirebaseUid:  { type: String,  default: '' },
  myUsername:     { type: String,  default: 'Player' },
  myAvatar:       { type: String,  default: '👤' },
  // Mode invitation depuis ModalRoom
  roomInviteMode: { type: Boolean, default: false },
  roomId:         { type: String,  default: '' },
})
const emit  = defineEmits(['close', 'update-badge', 'open-room'])

// ── Countdown state (Challenge button) ────────────────────────
// countdowns[uid] = { value: 10, timer: intervalId } | undefined
const countdowns = ref({})

const startCountdown = (uid) => {
  if (countdowns.value[uid]) return
  const entry = { value: 10 }
  countdowns.value = { ...countdowns.value, [uid]: entry }
  entry.timer = setInterval(() => {
    const cur = countdowns.value[uid]
    if (!cur) return
    if (cur.value <= 1) {
      clearInterval(cur.timer)
      const updated = { ...countdowns.value }
      delete updated[uid]
      countdowns.value = updated
    } else {
      countdowns.value = { ...countdowns.value, [uid]: { ...cur, value: cur.value - 1 } }
    }
  }, 1000)
}

const stopCountdown = (uid) => {
  const cur = countdowns.value[uid]
  if (cur?.timer) clearInterval(cur.timer)
  const updated = { ...countdowns.value }
  delete updated[uid]
  countdowns.value = updated
}

const getCountdown = (uid) => countdowns.value[uid]?.value ?? null

// ── UI state ───────────────────────────────────────────────────
const localVisible     = ref(false)
const closing          = ref(false)
const activeTab        = ref('friends')
const loadingBtn       = ref(null)
const isLoadingFriends = ref(true)

// ── Error ──────────────────────────────────────────────────────
const errorMsg  = ref('')
const errorType = ref('error')
const showError = (msg, type = 'error') => {
  errorMsg.value = ''
  setTimeout(() => { errorMsg.value = msg; errorType.value = type }, 50)
}

// ── Confirm: famafa amis ───────────────────────────────────────
const confirmRemove  = reactive({ visible: false, user: null, username: '', loading: false })
const confirmDecline = reactive({ visible: false, user: null, username: '', loading: false })

const askRemove = (user) => {
  closePopup()
  confirmRemove.user     = user
  confirmRemove.username = user?.username || ''
  confirmRemove.loading  = false
  confirmRemove.visible  = true
}
const askDecline = (user) => {
  closePopup()
  confirmDecline.user     = user
  confirmDecline.username = user?.username || ''
  confirmDecline.loading  = false
  confirmDecline.visible  = true
}

const doRemoveFriend = async () => {
  if (!confirmRemove.user) return
  confirmRemove.loading = true
  const ok = await apiCall('remove-' + confirmRemove.user.firebaseUid, 'remove-friend', { friendFirebaseUid: confirmRemove.user.firebaseUid })
  confirmRemove.loading = false
  if (ok !== false) {
    confirmRemove.visible = false
    confirmRemove.user    = null
  }
}
const doDeclineRequest = async () => {
  if (!confirmDecline.user) return
  confirmDecline.loading = true
  const ok = await apiCall('decline-' + confirmDecline.user.firebaseUid, 'decline-request', { requesterFirebaseUid: confirmDecline.user.firebaseUid })
  confirmDecline.loading = false
  if (ok !== false) {
    confirmDecline.visible = false
    confirmDecline.user    = null
  }
}

// ── Player Profile viewer ──────────────────────────────────────
const playerProfileVisible = ref(false)
const playerProfileData    = ref(null)

const openPlayerProfile = (user) => {
  if (!user) return
  playerProfileData.value = {
    firebaseUid: user.firebaseUid,
    username:    user.username,
    shortId:     user.shortId,
    avatar:      user.avatar || '👤',
    presence:    getPresence(user.firebaseUid),
    isFriend:    isFriend(user.firebaseUid),
    isPendingSent:     isPendingSent(user.firebaseUid),
    isPendingReceived: isPendingReceived(user.firebaseUid),
  }
  playerProfileVisible.value = true
}

// Callbacks avy amin'ny ModalProfile viewer
const onProfileAccept = async (firebaseUid) => {
  const user = allFriends.value.find(f => f.firebaseUid === firebaseUid)
    || searchResults.value.find(p => p.firebaseUid === firebaseUid)
  if (user) await acceptRequest(user)
  // Hanavaozina ny data ao amin'ny playerProfileData
  if (playerProfileData.value?.firebaseUid === firebaseUid) {
    playerProfileData.value = {
      ...playerProfileData.value,
      isFriend: isFriend(firebaseUid),
      isPendingSent: isPendingSent(firebaseUid),
      isPendingReceived: isPendingReceived(firebaseUid),
    }
  }
}
const onProfileDecline = async (firebaseUid) => {
  const user = allFriends.value.find(f => f.firebaseUid === firebaseUid)
    || searchResults.value.find(p => p.firebaseUid === firebaseUid)
  if (user) await declineRequest(user)
  playerProfileVisible.value = false
}
const onProfileSendRequest = async (firebaseUid) => {
  const user = searchResults.value.find(p => p.firebaseUid === firebaseUid)
    || allFriends.value.find(f => f.firebaseUid === firebaseUid)
  if (user) await sendRequest(user)
}
const onProfileRemove = (firebaseUid) => {
  const user = allFriends.value.find(f => f.firebaseUid === firebaseUid)
  if (user) {
    playerProfileVisible.value = false
    askRemove(user)
  }
}
const onProfileChallenge = async (firebaseUid) => {
  const user = allFriends.value.find(f => f.firebaseUid === firebaseUid)
    || searchResults.value.find(p => p.firebaseUid === firebaseUid)
  if (user) {
    // Mikatona ModalProfile aloha automatique
    playerProfileVisible.value = false
    await challengeFriend(user)
  }
}

// ── Popup cadre kely ───────────────────────────────────────────
const popup = reactive({
  visible: false,
  uid:     '',
  tab:     '',
  user:    null,
  top:     0,
  right:   0,
})

const mdlRef      = ref(null)
const listFriends = ref(null)
const listInbox   = ref(null)
const listSearch  = ref(null)

const getListRef = () => {
  if (popup.tab === 'friends') return listFriends.value
  if (popup.tab === 'inbox')   return listInbox.value
  return listSearch.value
}

const POPUP_WIDTH    = 180
const POPUP_RIGHT_GAP = 14

const popupStyle = computed(() => ({
  top:   popup.top  + 'px',
  right: popup.right + 'px',
  width: POPUP_WIDTH + 'px',
}))

const togglePopup = async (user, tab, event) => {
  if (popup.visible && popup.uid === user.firebaseUid && popup.tab === tab) {
    closePopup(); return
  }

  if (tab === 'search') subscribePresence(user.firebaseUid)

  popup.uid  = user.firebaseUid
  popup.tab  = tab
  popup.user = user

  await nextTick()

  const mdlEl = mdlRef.value
  if (mdlEl) {
    const mdlRect = mdlEl.getBoundingClientRect()
    const rowEl   = event.currentTarget
    const faEl    = rowEl.querySelector('.fa')
    const refEl   = faEl || rowEl
    const refRect = refEl.getBoundingClientRect()

    popup.top   = (refRect.bottom - mdlRect.top) + 6
    popup.right = POPUP_RIGHT_GAP
  }

  popup.visible = true
}

const closePopup = () => {
  popup.visible = false
  popup.uid     = ''
  popup.tab     = ''
  popup.user    = null
}

// ── Friends data ───────────────────────────────────────────────
const allFriends   = ref([])
let   unsubFriends = null

// ── Presence ───────────────────────────────────────────────────
const presenceMap    = ref({})
const presenceUnsubs = {}

const getPresence = (uid) => presenceMap.value[uid] ?? { online: false, lastSeen: null }

const subscribePresence = (uid) => {
  if (!uid || presenceUnsubs[uid]) return
  const r = dbRef(rtdb, `presence/${uid}`)
  const handler = (snap) => {
    const val = snap.val()
    presenceMap.value = {
      ...presenceMap.value,
      [uid]: val ? { online: !!val.online, lastSeen: val.lastSeen ?? null } : { online: false, lastSeen: null },
    }
    // Hanavaozina ny playerProfileData raha ilay olona no sokafana
    if (playerProfileData.value?.firebaseUid === uid) {
      playerProfileData.value = {
        ...playerProfileData.value,
        presence: val ? { online: !!val.online, lastSeen: val.lastSeen ?? null } : { online: false, lastSeen: null },
      }
    }
  }
  onValue(r, handler)
  presenceUnsubs[uid] = () => off(r, 'value', handler)
}

const unsubscribePresence = (uid) => {
  if (presenceUnsubs[uid]) { presenceUnsubs[uid](); delete presenceUnsubs[uid] }
}

const stopAllPresenceListeners = () => {
  Object.keys(presenceUnsubs).forEach(unsubscribePresence)
}

const formatLastSeen = (ts) => {
  if (!ts) return 'Offline'
  const diffMs  = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)  return `${diffHr} hr ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
}

// ── Search state ───────────────────────────────────────────────
const friendSearch          = ref('')
const committedFriendSearch = ref('')
const inboxSearch           = ref('')
const committedInboxSearch  = ref('')
const playerSearch          = ref('')
const isSearching           = ref(false)
const searchDone            = ref(false)
const searchResults         = ref([])

const commitFriendSearch = () => { committedFriendSearch.value = friendSearch.value.trim() }
const commitInboxSearch  = () => { committedInboxSearch.value  = inboxSearch.value.trim()  }

// ── Computed ───────────────────────────────────────────────────
const friends = computed(() => allFriends.value.filter(f => f.status === 'accepted'))
const inbox   = computed(() => allFriends.value.filter(f => f.status === 'pending_received'))

const sortedFriends = computed(() =>
  [...friends.value].sort((a, b) => {
    const aOn = getPresence(a.firebaseUid).online ? 1 : 0
    const bOn = getPresence(b.firebaseUid).online ? 1 : 0
    return bOn - aOn
  })
)

const filteredFriends = computed(() => {
  const q = committedFriendSearch.value.toLowerCase()
  return q ? sortedFriends.value.filter(f => f.username.toLowerCase().includes(q)) : sortedFriends.value
})

const filteredInbox = computed(() => {
  const q = committedInboxSearch.value.toLowerCase()
  return q ? inbox.value.filter(f => f.username.toLowerCase().includes(q)) : inbox.value
})

const isFriend          = uid => allFriends.value.some(f => f.firebaseUid === uid && f.status === 'accepted')
const isPendingSent     = uid => allFriends.value.some(f => f.firebaseUid === uid && f.status === 'pending_sent')
const isPendingReceived = uid => allFriends.value.some(f => f.firebaseUid === uid && f.status === 'pending_received')

// ── Firestore listener ─────────────────────────────────────────
const startFriendsListener = () => {
  const fbUid = localStorage.getItem('user_firebase_uid')
  if (!fbUid) { isLoadingFriends.value = false; return }
  isLoadingFriends.value = true
  const colRef = collection(fsDb, 'users', fbUid, 'friends')
  unsubFriends = fsOnSnapshot(colRef, snap => {
    const newList = snap.docs.map(doc => ({ firebaseUid: doc.id, ...doc.data() }))
    const acceptedUids = new Set(newList.filter(f => f.status === 'accepted').map(f => f.firebaseUid))
    acceptedUids.forEach(uid => subscribePresence(uid))
    allFriends.value.filter(f => f.status === 'accepted' && !acceptedUids.has(f.firebaseUid))
      .forEach(f => unsubscribePresence(f.firebaseUid))
    allFriends.value       = newList
    isLoadingFriends.value = false
    emit('update-badge', inbox.value.length)
    // Hanavaozina ny relationship status ao amin'ny viewer profile raha misokatra
    if (playerProfileData.value) {
      const uid = playerProfileData.value.firebaseUid
      playerProfileData.value = {
        ...playerProfileData.value,
        isFriend:          isFriend(uid),
        isPendingSent:     isPendingSent(uid),
        isPendingReceived: isPendingReceived(uid),
      }
    }
  }, () => { isLoadingFriends.value = false })
}

const stopFriendsListener = () => {
  if (unsubFriends) { unsubFriends(); unsubFriends = null }
  stopAllPresenceListeners()
}

// ── Search player ──────────────────────────────────────────────
const doSearch = async () => {
  const q = playerSearch.value.trim()
  if (!q || isSearching.value) return
  isSearching.value = true; searchDone.value = false; searchResults.value = []
  try {
    const token = localStorage.getItem('user_token')
    const res   = await fetch(`${API_FRIENDS}?action=search-player&q=${encodeURIComponent(q)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    searchResults.value = data.results || []
    // Subscribe presence an'ireo results
    searchResults.value.forEach(p => subscribePresence(p.firebaseUid))
  } catch { searchResults.value = [] }
  finally { searchDone.value = true; isSearching.value = false }
}

// ── API helper ─────────────────────────────────────────────────
const getApiBase = (action) =>
  ['send-request','accept-request','decline-request','cancel-request'].includes(action) ? API_REQUESTS : API_FRIENDS

const apiCall = async (btnKey, action, body) => {
  loadingBtn.value = btnKey
  try {
    const token = localStorage.getItem('user_token')
    const res   = await fetch(`${getApiBase(action)}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) { showError(data.message || 'An error occurred.'); return false }
    return true
  } catch (e) {
    showError(e.message || 'Network error. Please try again.'); return false
  } finally { loadingBtn.value = null }
}

// ── Actions ────────────────────────────────────────────────────
const sendRequest = async (p) => {
  if (friends.value.length >= FRIENDS_LIMIT) {
    showError(`You've reached your friend limit. Remove someone to add new friends.`); return
  }
  await apiCall('add-' + p.firebaseUid, 'send-request', { targetFirebaseUid: p.firebaseUid })
}

const cancelRequest = async (p) => {
  await apiCall('cancel-' + p.firebaseUid, 'cancel-request', { targetFirebaseUid: p.firebaseUid })
}

const acceptRequest = async (f) => {
  if (friends.value.length >= FRIENDS_LIMIT) {
    showError(`You've reached your friend limit. Remove someone to accept new requests.`); return
  }
  await apiCall('accept-' + f.firebaseUid, 'accept-request', { requesterFirebaseUid: f.firebaseUid })
}

const declineRequest  = f => apiCall('decline-'   + f.firebaseUid, 'decline-request', { requesterFirebaseUid: f.firebaseUid })
const challengeFriend = async (f) => {
  const uid = f.firebaseUid
  // Raha mbola anaty countdown → tsy afaka manao fanindroany
  if (getCountdown(uid) !== null) return

  const key = 'challenge-' + uid
  loadingBtn.value = key
  try {
    const token = localStorage.getItem('user_token')
    let roomId = props.roomId

    // Raha tsy eo amin'ny room-invite-mode dia mamorona room vaovao
    if (!props.roomInviteMode) {
      const createRes = await fetch('/api/room?action=create-room', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body:    JSON.stringify({ username: props.myUsername, avatar: props.myAvatar }),
      })
      let createData
      try { createData = await createRes.json() }
      catch { showError('Server error. Please try again.'); return }
      if (!createRes.ok) { showError(createData.message || 'Could not create room.'); return }
      roomId = createData.roomId
      if (!roomId) { showError('Invalid room ID returned.'); return }
    }

    // Mandefitra invitation
    await fetch('/api/room?action=send-invite', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({
        targetFirebaseUid: uid,
        roomId,
        inviterUsername:   props.myUsername,
      }),
    })

    // Manomboka countdown eo amin'ny button
    startCountdown(uid)

    // Manokatra ModalRoom ho an'ilay nanao challenge (raha tsy eo amin'ny room-invite-mode)
    if (!props.roomInviteMode) {
      emit('open-room', roomId)
    } else {
      // Ao amin'ny room-invite-mode: mikatona ModalSocial rehefa vita ny invitation
      emit('close')
    }
  } catch (e) {
    showError(e.message || 'Network error.')
  } finally {
    loadingBtn.value = null
  }
}

// ── Watch ──────────────────────────────────────────────────────
watch(() => props.show, val => {
  if (val) {
    localVisible.value = true; closing.value = false
    searchDone.value = false; searchResults.value = []
    playerSearch.value = ''; friendSearch.value = ''
    committedFriendSearch.value = ''; inboxSearch.value = ''
    committedInboxSearch.value = ''; errorMsg.value = ''
    closePopup()
    document.body.style.overflow = 'hidden'
    startFriendsListener()
  } else {
    closing.value = true
    setTimeout(() => {
      localVisible.value = false; closing.value = false
      document.body.style.overflow = 'auto'
      stopFriendsListener()
      closePopup()
    }, 400)
  }
})

onUnmounted(() => {
  stopFriendsListener()
  // Fafao ny countdown timers rehetra
  Object.keys(countdowns.value).forEach(uid => stopCountdown(uid))
})
const handleClose = () => emit('close')
</script>

<style scoped>
.ovl {
  position:fixed; inset:0; background:rgba(0,0,0,.6);
  backdrop-filter:blur(1px);
  display:flex; place-content:center; place-items:center; z-index:2000;
}
.ovl.on  { display:flex; }
.ovl.off { animation:kFade .4s forwards; }

.mdl {
  border-radius:32px; padding:40px 22px 28px;
  width:90%; max-width:440px; height:560px;
  overflow:hidden; display:flex; flex-direction:column;
  position:relative; color:#fff9e0;
  background:linear-gradient(to bottom,#0f4a82,#08264a);
  border:4px solid rgba(255,255,255,.1);
}
.on  .mdl { animation:kZoom .4s ease-out forwards; }
.off .mdl { animation:kOut  .4s ease-in  forwards; }
@keyframes kZoom {
  0%  {opacity:0;transform:scale(.5);}
  50% {opacity:1;transform:scale(1.08);}
  100%{opacity:1;transform:scale(1);}
}
@keyframes kOut  {0%{transform:scale(1);opacity:1;}100%{transform:scale(.4);opacity:0;}}
@keyframes kFade {to{opacity:0;}}

#modal-social { --gd:#ffd966; --tg:#fff9e0; }

.x {
  position:absolute; top:16px; right:18px;
  width:38px; height:38px; border-radius:50%;
  background:rgba(220,80,70,.8); border:none; color:#fff; cursor:pointer;
  display:flex; align-items:center; justify-content:center; transition:.2s;
}
.x:hover { background:#e06a5a; transform:scale(1.15) rotate(90deg); }

.mtitle { color:#fffacd; font-family:'Chicle',cursive; text-align:center; letter-spacing:2px; text-shadow:0 4px 8px rgba(0,0,0,.5); }
.mtitle-sm { font-size:28px; margin-bottom:14px; }

.ftabs {
  display:flex; gap:4px; background:rgba(0,0,0,.25);
  border-radius:20px; padding:4px; margin-bottom:12px; flex-shrink:0;
}
.ft {
  flex:1; padding:9px 4px; border:none; background:none; border-radius:16px;
  color:rgba(255,245,200,.5); font-size:10px; font-weight:700; cursor:pointer;
  display:flex; flex-direction:column; place-items:center; gap:2px;
  position:relative; transition:.2s;
}
.ft .material-icons { font-size:19px; }
.ft.on { background:rgba(255,220,100,.18); color:var(--gd); border:1px solid rgba(255,220,100,.3); }
.ft-badge {
  position:absolute; top:2px; right:10px;
  width:15px; height:15px; border-radius:50%;
  background:#ff4f6e; color:#fff; font-size:9px; font-weight:800;
  display:flex; align-items:center; justify-content:center;
  border:1.5px solid #08264a;
}

.fp { display:none; flex-direction:column; flex:1; overflow:hidden; }
.fp.on { display:flex; }

.fsrch {
  display:flex; align-items:center;
  background:rgba(10,30,18,.6); border:1px solid rgba(255,240,160,.3);
  border-radius:30px; padding:5px 8px 5px 14px;
  margin-bottom:10px; gap:8px; flex-shrink:0;
}
.fsrch input { flex:1; background:none; border:none; outline:none; color:var(--tg); font-size:13.5px; min-width:0; }
.fsrch input::placeholder { color:rgba(255,245,200,.3); }

.srch-btn {
  width:32px; height:32px; min-width:32px; border-radius:50%; border:none;
  background:rgba(255,220,100,.18); color:var(--gd);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; flex-shrink:0; transition:background .2s;
}
.srch-btn .material-icons { font-size:18px; }
.srch-btn:hover:not(:disabled) { background:rgba(255,220,100,.32); }
.srch-btn:disabled { cursor:default; opacity:.55; }

.flist {
  display:flex; flex-direction:column;
  gap:7px; overflow-y:auto; flex:1; padding-right:4px;
  position:relative;
}
.flist::-webkit-scrollbar { width:4px; }
.flist::-webkit-scrollbar-thumb { background:rgba(255,220,100,.2); border-radius:4px; }

.fi {
  display:flex; align-items:center; justify-content:space-between;
  padding:9px 11px;
  background:rgba(255,255,220,.07); border:1px solid rgba(255,240,160,.12);
  border-radius:14px; gap:8px;
}
.fi-clickable { cursor:pointer; transition:background .15s, border-color .15s; }
.fi-clickable:hover { background:rgba(255,255,220,.12); border-color:rgba(255,240,160,.22); }
.fi-active { background:rgba(255,220,100,.12); border-color:rgba(255,220,100,.35); }

.fi-l { display:flex; align-items:center; gap:10px; min-width:0; }
.fi-l > div:last-child { display:flex; flex-direction:column; min-width:0; }

.fava {
  width:38px; height:38px; flex-shrink:0;
  background:rgba(30,74,130,.8); border:2px solid rgba(255,240,160,.2);
  border-radius:50%; display:flex; align-items:center; justify-content:center;
  color:rgba(255,220,100,.65);
}
.fava .material-icons { font-size:20px; }
.fava-emoji { font-size:22px; line-height:1; background:rgba(10,25,55,.7); }

.fpres { font-size:10px; font-weight:700; margin-top:2px; letter-spacing:.3px; }
.fpres-on  { color:#3ddc84; }
.fpres-off { color:rgba(255,245,200,.3); font-weight:500; }

.fn   { color:var(--tg); font-size:13.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fuid { font-size:10px; color:rgba(255,245,200,.3); margin-top:1px; }
.fsub { font-size:11px; color:rgba(255,245,200,.4); margin-top:2px; }

.fa { display:flex; gap:5px; flex-shrink:0; }

.fb {
  border:none; border-radius:20px; font-size:11px; font-weight:700;
  padding:0 11px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:filter .2s, transform .15s; box-sizing:border-box; height:30px;
}
.fb-i { background:rgba(255,200,80,.15); border:1px solid rgba(255,200,80,.4); color:var(--gd); }
.fb-a { background:rgba(100,220,120,.2);  border:1px solid rgba(100,220,120,.5); color:#6cfa8e; }
.fb-d { background:rgba(220,80,80,.15);   border:1px solid rgba(220,80,80,.4);  color:#ff8080; }
.fb-c { background:rgba(180,180,180,.1);  border:1px solid rgba(180,180,180,.3); color:#bbb; }
.fb:hover:not(:disabled) { filter:brightness(1.15); transform:scale(1.04); }
.fb:disabled { opacity:.55; cursor:not-allowed; }

@keyframes btnSpin { to { transform:rotate(360deg); } }
.btn-spin {
  display:inline-block; width:13px; height:13px;
  border-radius:50%; border:2px solid transparent;
  animation:btnSpin .6s linear infinite; flex-shrink:0;
}
.btn-spin-green { border-color:rgba(108,250,142,.25); border-top-color:#6cfa8e; }
.btn-spin-red   { border-color:rgba(255,128,128,.25); border-top-color:#ff8080; }
.btn-spin-gold  { border-color:rgba(255,217,102,.25); border-top-color:var(--gd); }

.btn-countdown {
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 900; color: var(--gd);
  min-width: 18px;
}

.empty {
  flex:1; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  text-align:center; padding:20px; color:rgba(255,245,200,.3);
}
.empty .material-icons { font-size:36px; margin-bottom:8px; opacity:.45; }
.empty p { font-size:12.5px; line-height:1.5; }

.list-spinner {
  width:28px; height:28px; border-radius:50%;
  border:2.5px solid rgba(255,217,102,.2); border-top-color:var(--gd);
  animation:btnSpin .7s linear infinite;
}

.flex-c { display:flex; align-items:center; justify-content:center; }

/* ══════════════════════════════════════
   POPUP CADRE KELY
   ══════════════════════════════════════ */
.popup-card {
  position: absolute;
  z-index: 50;
  background: linear-gradient(to bottom, #0d3060, #071828);
  border: 1.5px solid rgba(255,220,100,.3);
  border-radius: 16px;
  padding: 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  box-shadow: 0 8px 30px rgba(0,0,0,.7);
  min-width: 180px;
  pointer-events: auto;
}

.pop-anim-enter-active, .pop-anim-leave-active { transition: opacity .15s, transform .15s; }
.pop-anim-enter-from, .pop-anim-leave-to { opacity: 0; transform: scaleY(.85); transform-origin: top right; }

.pop-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 12px; border: none; border-radius: 12px;
  font-size: 12px; font-weight: 700; cursor: pointer;
  width: 100%; text-align: left;
  transition: background .15s, transform .1s;
  white-space: nowrap;
}
.pop-btn:hover:not(:disabled) { transform: scale(1.02); }
.pop-btn:disabled { opacity: .45; cursor: not-allowed; }
.pop-btn .material-icons { font-size: 17px; flex-shrink: 0; }

.pop-profile {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  color: rgba(255,245,200,.85);
}
.pop-profile:hover:not(:disabled) { background: rgba(255,255,255,.14); }

.pop-challenge {
  background: rgba(255,200,60,.14);
  border: 1px solid rgba(255,200,60,.35);
  color: #ffd966;
}
.pop-challenge:hover:not(:disabled) { background: rgba(255,200,60,.24); }

.pop-accept {
  background: rgba(60,220,100,.14);
  border: 1px solid rgba(60,220,100,.35);
  color: #6cfa8e;
}
.pop-accept:hover:not(:disabled) { background: rgba(60,220,100,.24); }

.pop-add {
  background: rgba(60,180,255,.14);
  border: 1px solid rgba(60,180,255,.35);
  color: #7dd4ff;
}
.pop-add:hover:not(:disabled) { background: rgba(60,180,255,.24); }

.pop-decline {
  background: rgba(220,80,80,.12);
  border: 1px solid rgba(220,80,80,.3);
  color: #ff8080;
}
.pop-decline:hover:not(:disabled) { background: rgba(220,80,80,.22); }

.pop-remove {
  background: rgba(220,50,50,.12);
  border: 1px solid rgba(220,50,50,.3);
  color: #ff6b6b;
}
.pop-remove:hover:not(:disabled) { background: rgba(220,50,50,.22); }

.pop-report {
  background: rgba(255,140,0,.1);
  border: 1px solid rgba(255,140,0,.25);
  color: rgba(255,180,60,.7);
}
.pop-report:hover:not(:disabled) { background: rgba(255,140,0,.18); color: rgba(255,180,60,.9); }

</style>
