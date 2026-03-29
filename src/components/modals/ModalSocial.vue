<template>
  <div
    v-if="localVisible"
    :class="['ovl', closing ? 'off' : 'on']"
    id="modal-social"
    @click.self="handleClose"
  >
    <div class="mdl">
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
          <input
            type="text"
            v-model="friendSearch"
            placeholder="Search Buddies..."
            @keyup.enter="commitFriendSearch"
          >
          <button class="srch-btn" @click="commitFriendSearch" aria-label="Search">
            <span class="material-icons">search</span>
          </button>
        </div>
        <div class="flist">
          <div v-if="isLoadingFriends" class="empty">
            <div class="list-spinner"></div>
          </div>
          <div v-else-if="committedFriendSearch && filteredFriends.length === 0" class="empty">
            <span class="material-icons">search_off</span>
            <p>No match found</p>
          </div>
          <div v-else-if="!committedFriendSearch && friends.length === 0" class="empty">
            <span class="material-icons">group_off</span>
            <p>No buddies yet</p>
          </div>
          <div v-for="f in filteredFriends" :key="f.firebaseUid" class="fi">
            <div class="fi-l">
              <div class="fava">
                <span class="material-icons">person</span>
              </div>
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
                class="fb fb-i"
                style="min-width:84px;"
                :class="{ 'btn-loading': loadingBtn === 'challenge-' + f.firebaseUid }"
                :disabled="!!loadingBtn"
                @click="challengeFriend(f)"
              >
                <span v-if="loadingBtn === 'challenge-' + f.firebaseUid" class="btn-spin btn-spin-gold"></span>
                <span v-else>Challenge</span>
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
          <input
            type="text"
            v-model="inboxSearch"
            placeholder="Search Requests..."
            @keyup.enter="commitInboxSearch"
          >
          <button class="srch-btn" @click="commitInboxSearch" aria-label="Search">
            <span class="material-icons">search</span>
          </button>
        </div>
        <div class="flist">
          <div v-if="isLoadingFriends" class="empty">
            <div class="list-spinner"></div>
          </div>
          <div v-else-if="inbox.length === 0" class="empty">
            <span class="material-icons">mark_email_read</span>
            <p>No pending requests</p>
          </div>
          <div v-else-if="committedInboxSearch && filteredInbox.length === 0" class="empty">
            <span class="material-icons">search_off</span>
            <p>No match found</p>
          </div>
          <div v-for="f in filteredInbox" :key="f.firebaseUid" class="fi">
            <div class="fi-l">
              <div class="fava"><span class="material-icons">person</span></div>
              <div>
                <div class="fn">{{ f.username }}</div>
                <div class="fsub">Sent you a friend request</div>
              </div>
            </div>
            <div class="fa">
              <button
                class="fb fb-a"
                style="min-width:64px;"
                :class="{ 'btn-loading': loadingBtn === 'accept-' + f.firebaseUid }"
                :disabled="!!loadingBtn"
                @click="acceptRequest(f)"
              >
                <span v-if="loadingBtn === 'accept-' + f.firebaseUid" class="btn-spin btn-spin-green"></span>
                <span v-else>Accept</span>
              </button>
              <button
                class="fb fb-d"
                style="min-width:64px;"
                :class="{ 'btn-loading': loadingBtn === 'decline-' + f.firebaseUid }"
                :disabled="!!loadingBtn"
                @click="declineRequest(f)"
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
          <input
            type="text"
            v-model="playerSearch"
            placeholder="Username or 9-digit ID..."
            @keyup.enter="doSearch"
          >
          <button
            class="srch-btn"
            :disabled="isSearching"
            @click="doSearch"
            aria-label="Search"
          >
            <span v-if="isSearching" class="btn-spin btn-spin-gold"></span>
            <span v-else class="material-icons">search</span>
          </button>
        </div>
        <div class="flist">
          <div v-if="!searchDone" class="empty">
            <span class="material-icons">person_search</span>
            <p>Enter a name or 9-digit ID,<br>then tap Search</p>
          </div>
          <div v-else-if="searchResults.length === 0" class="empty">
            <span class="material-icons">search_off</span>
            <p>No player found</p>
          </div>
          <div v-for="p in searchResults" :key="p.firebaseUid" class="fi">
            <div class="fi-l">
              <div class="fava"><span class="material-icons">person</span></div>
              <div>
                <div class="fn">{{ p.username }}</div>
                <div class="fuid">ID: {{ p.shortId }}</div>
              </div>
            </div>
            <div class="fa">
              <button v-if="isFriend(p.firebaseUid)"
                class="fb fb-c" disabled style="min-width:66px;">
                Buddies
              </button>
              <button v-else-if="isPendingSent(p.firebaseUid)"
                class="fb fb-c" disabled style="min-width:66px;">
                Pending
              </button>
              <template v-else-if="isPendingReceived(p.firebaseUid)">
                <button
                  class="fb fb-a"
                  style="min-width:64px;"
                  :class="{ 'btn-loading': loadingBtn === 'accept-' + p.firebaseUid }"
                  :disabled="!!loadingBtn"
                  @click="acceptRequest(p)"
                >
                  <span v-if="loadingBtn === 'accept-' + p.firebaseUid" class="btn-spin btn-spin-green"></span>
                  <span v-else>Accept</span>
                </button>
              </template>
              <button v-else
                class="fb fb-a"
                style="min-width:66px;"
                :class="{ 'btn-loading': loadingBtn === 'add-' + p.firebaseUid }"
                :disabled="!!loadingBtn"
                @click="sendRequest(p)"
              >
                <span v-if="loadingBtn === 'add-' + p.firebaseUid" class="btn-spin btn-spin-green"></span>
                <span v-else>Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ── ModalError ── -->
  <ModalError
    :message="errorMsg"
    :type="errorType"
    :duration="5000"
    @close="errorMsg = ''"
  />
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { initializeApp, getApps }            from 'firebase/app'
import { getFirestore, collection, onSnapshot as fsOnSnapshot } from 'firebase/firestore'
import { usePresence }                       from '@/composables/usePresence'
import ModalError                            from './ModalError.vue'

// ── Firebase (Firestore) ───────────────────────────────────────
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

// ── Presence composable ────────────────────────────────────────
const {
  getPresence,
  formatLastSeen,
  subscribePresence,
  unsubscribePresence,
  stopAllPresenceListeners,
} = usePresence()

// ── API endpoints ──────────────────────────────────────────────
const API_FRIENDS  = '/api/friends'
const API_REQUESTS = '/api/requests'

const FRIENDS_LIMIT = 100

// ── Props / Emits ──────────────────────────────────────────────
const props = defineProps({ show: Boolean })
const emit  = defineEmits(['close', 'update-badge'])

// ── UI state ───────────────────────────────────────────────────
const localVisible     = ref(false)
const closing          = ref(false)
const activeTab        = ref('friends')
const loadingBtn       = ref(null)
const isLoadingFriends = ref(true)

// ── Error modal ────────────────────────────────────────────────
const errorMsg  = ref('')
const errorType = ref('error')

const showError = (msg, type = 'error') => {
  errorMsg.value = ''
  setTimeout(() => {
    errorMsg.value  = msg
    errorType.value = type
  }, 50)
}

// ── Friends data (Firestore realtime) ─────────────────────────
const allFriends   = ref([])
let   unsubFriends = null

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
const friends = computed(() =>
  allFriends.value.filter(f => f.status === 'accepted')
)
const inbox = computed(() =>
  allFriends.value.filter(f => f.status === 'pending_received')
)

// Sorted: Online ambony, Offline ambany
const sortedFriends = computed(() =>
  [...friends.value].sort((a, b) => {
    const aOn = getPresence(a.firebaseUid).online ? 1 : 0
    const bOn = getPresence(b.firebaseUid).online ? 1 : 0
    return bOn - aOn
  })
)

const filteredFriends = computed(() => {
  const q = committedFriendSearch.value.toLowerCase()
  return q
    ? sortedFriends.value.filter(f => f.username.toLowerCase().includes(q))
    : sortedFriends.value
})

const filteredInbox = computed(() => {
  const q = committedInboxSearch.value.toLowerCase()
  return q
    ? inbox.value.filter(f => f.username.toLowerCase().includes(q))
    : inbox.value
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

    // Sync presence listeners: accepted friends ihany
    const acceptedUids = new Set(
      newList.filter(f => f.status === 'accepted').map(f => f.firebaseUid)
    )
    acceptedUids.forEach(uid => subscribePresence(uid))
    // Esorina listener ho an'ny tsy accepted intsony
    allFriends.value
      .filter(f => f.status === 'accepted' && !acceptedUids.has(f.firebaseUid))
      .forEach(f => unsubscribePresence(f.firebaseUid))

    allFriends.value       = newList
    isLoadingFriends.value = false
    emit('update-badge', inbox.value.length)
  }, () => {
    isLoadingFriends.value = false
  })
}

const stopFriendsListener = () => {
  if (unsubFriends) { unsubFriends(); unsubFriends = null }
  stopAllPresenceListeners()
}

// ── Search player ──────────────────────────────────────────────
const doSearch = async () => {
  const q = playerSearch.value.trim()
  if (!q || isSearching.value) return

  isSearching.value   = true
  searchDone.value    = false
  searchResults.value = []

  try {
    const token = localStorage.getItem('user_token')
    const res   = await fetch(`${API_FRIENDS}?action=search-player&q=${encodeURIComponent(q)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message)
    searchResults.value = data.results || []
  } catch {
    searchResults.value = []
  } finally {
    searchDone.value  = true
    isSearching.value = false
  }
}

// ── API helper ─────────────────────────────────────────────────
const getApiBase = (action) => {
  const requestActions = ['send-request', 'accept-request', 'decline-request']
  return requestActions.includes(action) ? API_REQUESTS : API_FRIENDS
}

const apiCall = async (btnKey, action, body) => {
  loadingBtn.value = btnKey
  try {
    const token   = localStorage.getItem('user_token')
    const apiBase = getApiBase(action)
    const res     = await fetch(`${apiBase}?action=${action}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify(body)
    })
    const data = await res.json()
    if (!res.ok) {
      showError(data.message || 'An error occurred.')
      return false
    }
    return true
  } catch (e) {
    showError(e.message || 'Network error. Please try again.')
    return false
  } finally {
    loadingBtn.value = null
  }
}

// ── Actions ────────────────────────────────────────────────────
const sendRequest = async (p) => {
  if (friends.value.length >= FRIENDS_LIMIT) {
    showError(`You've reached your friend limit. Remove someone to add new friends.`)
    return
  }
  await apiCall('add-' + p.firebaseUid, 'send-request', { targetFirebaseUid: p.firebaseUid })
}

const acceptRequest = async (f) => {
  if (friends.value.length >= FRIENDS_LIMIT) {
    showError(`You've reached your friend limit. Remove someone to accept new requests.`)
    return
  }
  await apiCall('accept-' + f.firebaseUid, 'accept-request', { requesterFirebaseUid: f.firebaseUid })
}

const declineRequest  = f => apiCall('decline-'   + f.firebaseUid, 'decline-request', { requesterFirebaseUid: f.firebaseUid })
const challengeFriend = f => apiCall('challenge-' + f.firebaseUid, 'challenge',        { targetFirebaseUid:    f.firebaseUid })

// ── Watch ──────────────────────────────────────────────────────
watch(() => props.show, val => {
  if (val) {
    localVisible.value          = true
    closing.value               = false
    searchDone.value            = false
    searchResults.value         = []
    playerSearch.value          = ''
    friendSearch.value          = ''
    committedFriendSearch.value = ''
    inboxSearch.value           = ''
    committedInboxSearch.value  = ''
    errorMsg.value              = ''
    document.body.style.overflow = 'hidden'
    startFriendsListener()
  } else {
    closing.value = true
    setTimeout(() => {
      localVisible.value = false
      closing.value      = false
      document.body.style.overflow = 'auto'
      stopFriendsListener()
    }, 400)
  }
})

onUnmounted(stopFriendsListener)

const handleClose = () => emit('close')
</script>

<style scoped>
/* ── Overlay ── */
.ovl {
  position:fixed; inset:0;
  background:rgba(0,0,0,.6);
  backdrop-filter:blur(1px);
  display:flex; place-content:center; place-items:center;
  z-index:2000;
}
.ovl.on  { display:flex; }
.ovl.off { animation:kFade .4s forwards; }

/* ── Modal ── */
.mdl {
  border-radius:32px;
  padding:40px 22px 28px;
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

/* ── Close ── */
.x {
  position:absolute; top:16px; right:18px;
  width:38px; height:38px; border-radius:50%;
  background:rgba(220,80,70,.8); border:none;
  font-size:20px; color:#fff; cursor:pointer;
  display:flex; align-items:center; justify-content:center; transition:.2s;
}
.x:hover { background:#e06a5a; transform:scale(1.15) rotate(90deg); }

/* ── Title ── */
.mtitle { color:#fffacd; font-family:'Chicle',cursive; text-align:center; letter-spacing:2px; text-shadow:0 4px 8px rgba(0,0,0,.5); }
.mtitle-sm { font-size:28px; margin-bottom:14px; }

/* ── Tabs ── */
.ftabs {
  display:flex; gap:4px;
  background:rgba(0,0,0,.25); border-radius:20px;
  padding:4px; margin-bottom:12px; flex-shrink:0;
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

/* ── Panels ── */
.fp { display:none; flex-direction:column; flex:1; overflow:hidden; }
.fp.on { display:flex; }

/* ── Search bar ── */
.fsrch {
  display:flex; align-items:center;
  background:rgba(10,30,18,.6); border:1px solid rgba(255,240,160,.3);
  border-radius:30px; padding:5px 8px 5px 14px;
  margin-bottom:10px; gap:8px; flex-shrink:0;
}
.fsrch input {
  flex:1; background:none; border:none; outline:none;
  color:var(--tg); font-size:13.5px; min-width:0;
}
.fsrch input::placeholder { color:rgba(255,245,200,.3); }

/* ── Search button ── */
.srch-btn {
  width:32px; height:32px; min-width:32px; border-radius:50%; border:none;
  background:rgba(255,220,100,.18); color:var(--gd);
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; flex-shrink:0; transition:background .2s;
}
.srch-btn .material-icons { font-size:18px; }
.srch-btn:hover:not(:disabled) { background:rgba(255,220,100,.32); }
.srch-btn:disabled { cursor:default; opacity:.55; }

/* ── List ── */
.flist {
  display:flex; flex-direction:column;
  gap:7px; overflow-y:auto; flex:1; padding-right:4px;
}
.flist::-webkit-scrollbar { width:4px; }
.flist::-webkit-scrollbar-thumb { background:rgba(255,220,100,.2); border-radius:4px; }

/* ── Item ── */
.fi {
  display:flex; align-items:center; justify-content:space-between;
  padding:9px 11px;
  background:rgba(255,255,220,.07); border:1px solid rgba(255,240,160,.12);
  border-radius:14px; gap:8px;
}
.fi-l { display:flex; align-items:center; gap:10px; min-width:0; }
.fi-l > div:last-child { display:flex; flex-direction:column; min-width:0; }

/* ── Avatar ── */
.fava {
  width:38px; height:38px; flex-shrink:0;
  background:rgba(30,74,130,.8); border:2px solid rgba(255,240,160,.2);
  border-radius:50%; display:flex; align-items:center; justify-content:center;
  color:rgba(255,220,100,.65);
}
.fava .material-icons { font-size:20px; }

/* ── Presence text ── */
.fpres {
  font-size:10px; font-weight:700; margin-top:2px;
  letter-spacing:.3px;
}
.fpres-on  { color:#3ddc84; }
.fpres-off { color:rgba(255,245,200,.3); font-weight:500; }

.fn   { color:var(--tg); font-size:13.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fuid { font-size:10px; color:rgba(255,245,200,.3); margin-top:1px; }
.fsub { font-size:11px; color:rgba(255,245,200,.4); margin-top:2px; }

/* ── Action ── */
.fa { display:flex; gap:5px; flex-shrink:0; }

/* ── Buttons ── */
.fb {
  border:none; border-radius:20px;
  font-size:11px; font-weight:700;
  padding:0 11px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:filter .2s, transform .15s;
  box-sizing:border-box;
  height:30px;
}
.fb-i { background:rgba(255,200,80,.15); border:1px solid rgba(255,200,80,.4); color:var(--gd); }
.fb-a { background:rgba(100,220,120,.2);  border:1px solid rgba(100,220,120,.5); color:#6cfa8e; }
.fb-d { background:rgba(220,80,80,.15);   border:1px solid rgba(220,80,80,.4);  color:#ff8080; }
.fb-c { background:rgba(180,180,180,.1);  border:1px solid rgba(180,180,180,.3); color:#bbb; }
.fb:hover:not(:disabled) { filter:brightness(1.15); transform:scale(1.04); }
.fb:disabled { opacity:.55; cursor:not-allowed; }

/* ── Spinners ── */
@keyframes btnSpin { to { transform:rotate(360deg); } }
.btn-spin {
  display:inline-block; width:13px; height:13px;
  border-radius:50%; border:2px solid transparent;
  animation:btnSpin .6s linear infinite; flex-shrink:0;
}
.btn-spin-green { border-color:rgba(108,250,142,.25); border-top-color:#6cfa8e; }
.btn-spin-red   { border-color:rgba(255,128,128,.25); border-top-color:#ff8080; }
.btn-spin-gold  { border-color:rgba(255,217,102,.25); border-top-color:var(--gd); }

/* ── Empty ── */
.empty {
  flex:1; display:flex; flex-direction:column;
  align-items:center; justify-content:center;
  text-align:center; padding:20px;
  color:rgba(255,245,200,.3);
}
.empty .material-icons { font-size:36px; margin-bottom:8px; opacity:.45; }
.empty p { font-size:12.5px; line-height:1.5; }

.list-spinner {
  width:28px; height:28px; border-radius:50%;
  border:2.5px solid rgba(255,217,102,.2);
  border-top-color:var(--gd);
  animation:btnSpin .7s linear infinite;
}

.flex-c { display:flex; align-items:center; justify-content:center; }
</style>
