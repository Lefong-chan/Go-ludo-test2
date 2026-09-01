<template>
  <Teleport to="body">
  <div
    v-if="localVisible"
    :class="['ovl', closing ? 'off' : 'on']"
    id="modal-room-list"
    @click.self="handleClose"
  >
    <div class="mdl">

      <button class="x flex-c" @click="handleClose">
        <span class="material-icons">close</span>
      </button>

      <h2 class="mtitle mtitle-sm">Liste des salons</h2>

      <!-- ── Tabs ── -->
      <div class="ftabs">
        <button :class="['ft', activeTab === 'all' ? 'on' : '']" @click="activeTab = 'all'">
          <span class="material-icons">apps</span>
          <span class="ft-lbl">Tous</span>
        </button>
        <button :class="['ft', activeTab === 'public' ? 'on' : '']" @click="activeTab = 'public'">
          <span class="material-icons">lock_open</span>
          <span class="ft-lbl">Public</span>
        </button>
        <button :class="['ft', activeTab === 'private' ? 'on' : '']" @click="activeTab = 'private'">
          <span class="material-icons">lock</span>
          <span class="ft-lbl">Privée</span>
        </button>
      </div>

      <!-- ══════════════════════════════
           TAB: TOUS
           ══════════════════════════════ -->
      <div :class="['fp', activeTab === 'all' ? 'on' : '']">
        <div class="fsrch">
          <input type="text" v-model="allSearch" placeholder="ID ou mise du salon..." @keyup.enter="commitAllSearch">
          <button class="srch-btn" @click="commitAllSearch" aria-label="Rechercher">
            <span class="material-icons">search</span>
          </button>
        </div>
        <div class="flist">
          <div v-if="isLoadingRooms" class="empty"><div class="list-spinner"></div></div>
          <div v-else-if="committedAllSearch && filteredAll.length === 0" class="empty">
            <span class="material-icons">search_off</span><p>Aucun résultat trouvé</p>
          </div>
          <div v-else-if="!committedAllSearch && allRooms.length === 0" class="empty">
            <span class="material-icons">meeting_room</span><p>Aucun salon disponible</p>
          </div>

          <div v-if="!isLoadingRooms" v-for="r in filteredAll" :key="'all-' + r.roomId" class="fi">
            <div class="fi-l">
              <div class="rm-icon" :class="r.private ? 'rm-icon-locked' : 'rm-icon-unlocked'">
                <span class="material-icons">{{ r.private ? 'lock' : 'lock_open' }}</span>
              </div>
              <div>
                <div class="fn">{{ formatStake(r.stake) }}</div>
                <div class="rm-count">{{ r.count }}/{{ r.capacity }}</div>
              </div>
            </div>
            <div class="fa">
              <button
                class="fb fb-i" style="min-width:74px;"
                :class="{ 'btn-loading': loadingBtn === r.roomId }"
                :disabled="!!loadingBtn || r.count >= r.capacity"
                @click.stop="enterRoom(r)"
              >
                <span v-if="loadingBtn === r.roomId" class="btn-spin btn-spin-gold"></span>
                <span v-else-if="r.count >= r.capacity">Plein</span>
                <span v-else>Entrer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════
           TAB: PUBLIC
           ══════════════════════════════ -->
      <div :class="['fp', activeTab === 'public' ? 'on' : '']">
        <div class="fsrch">
          <input type="text" v-model="publicSearch" placeholder="ID ou mise du salon..." @keyup.enter="commitPublicSearch">
          <button class="srch-btn" @click="commitPublicSearch" aria-label="Rechercher">
            <span class="material-icons">search</span>
          </button>
        </div>
        <div class="flist">
          <div v-if="isLoadingRooms" class="empty"><div class="list-spinner"></div></div>
          <div v-else-if="committedPublicSearch && filteredPublic.length === 0" class="empty">
            <span class="material-icons">search_off</span><p>Aucun résultat trouvé</p>
          </div>
          <div v-else-if="!committedPublicSearch && publicRooms.length === 0" class="empty">
            <span class="material-icons">meeting_room</span><p>Aucun salon public disponible</p>
          </div>

          <div v-if="!isLoadingRooms" v-for="r in filteredPublic" :key="'pub-' + r.roomId" class="fi">
            <div class="fi-l">
              <div class="rm-icon rm-icon-unlocked">
                <span class="material-icons">lock_open</span>
              </div>
              <div>
                <div class="fn">{{ formatStake(r.stake) }}</div>
                <div class="rm-count">{{ r.count }}/{{ r.capacity }}</div>
              </div>
            </div>
            <div class="fa">
              <button
                class="fb fb-i" style="min-width:74px;"
                :class="{ 'btn-loading': loadingBtn === r.roomId }"
                :disabled="!!loadingBtn || r.count >= r.capacity"
                @click.stop="enterRoom(r)"
              >
                <span v-if="loadingBtn === r.roomId" class="btn-spin btn-spin-gold"></span>
                <span v-else-if="r.count >= r.capacity">Plein</span>
                <span v-else>Entrer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════
           TAB: PRIVÉE
           ══════════════════════════════ -->
      <div :class="['fp', activeTab === 'private' ? 'on' : '']">
        <div class="fsrch">
          <input type="text" v-model="privateSearch" placeholder="ID ou mise du salon..." @keyup.enter="commitPrivateSearch">
          <button class="srch-btn" @click="commitPrivateSearch" aria-label="Rechercher">
            <span class="material-icons">search</span>
          </button>
        </div>
        <div class="flist">
          <div v-if="isLoadingRooms" class="empty"><div class="list-spinner"></div></div>
          <div v-else-if="committedPrivateSearch && filteredPrivate.length === 0" class="empty">
            <span class="material-icons">search_off</span><p>Aucun résultat trouvé</p>
          </div>
          <div v-else-if="!committedPrivateSearch && privateRooms.length === 0" class="empty">
            <span class="material-icons">meeting_room</span><p>Aucun salon privé disponible</p>
          </div>

          <div v-if="!isLoadingRooms" v-for="r in filteredPrivate" :key="'priv-' + r.roomId" class="fi">
            <div class="fi-l">
              <div class="rm-icon rm-icon-locked">
                <span class="material-icons">lock</span>
              </div>
              <div>
                <div class="fn">{{ formatStake(r.stake) }}</div>
                <div class="rm-count">{{ r.count }}/{{ r.capacity }}</div>
              </div>
            </div>
            <div class="fa">
              <button
                class="fb fb-i" style="min-width:74px;"
                :class="{ 'btn-loading': loadingBtn === r.roomId }"
                :disabled="!!loadingBtn || r.count >= r.capacity"
                @click.stop="enterRoom(r)"
              >
                <span v-if="loadingBtn === r.roomId" class="btn-spin btn-spin-gold"></span>
                <span v-else-if="r.count >= r.capacity">Plein</span>
                <span v-else>Entrer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Bouton flottant : créer un salon ── -->
      <button class="rm-fab" type="button" title="Créer un salon" aria-label="Créer un salon" @click="handleCreateRoom">
        <span class="material-icons">add</span>
      </button>

    </div>
  </div>

  <!-- ── Notification ── -->
  <Notification
    :message="errorMsg"
    :type="errorType"
    :duration="5000"
    @close="errorMsg = ''"
  />

  <!-- ── Mot de passe (salon privé) ── -->
  <ModalRoomPassword
    :show="showPasswordModal"
    :room-id="pendingRoom ? pendingRoom.roomId : ''"
    :my-uid="myUid"
    :my-name="myName"
    :my-avatar="myAvatar"
    @close="closePasswordModal"
    @joined="onPasswordJoined"
  />
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import Notification from './Notification.vue'
import ModalRoomPassword from './ModalRoomPassword.vue'
import { fetchWithTimeout } from '../../utils/network'

// ── API ────────────────────────────────────────────────────────
const API_ROOM = '/api/room'
const ROOMS_POLL_MS = 4000

// ── Props / Emits ──────────────────────────────────────────────
const props = defineProps({
  show:     { type: Boolean, default: false },
  myUid:    { type: String,  default: '' },
  myName:   { type: String,  default: 'Player' },
  myAvatar: { type: String,  default: '👤' },
})
const emit = defineEmits(['close', 'open-room', 'create-room'])

// ── Mot de passe salon privé ────────────────────────────────────
const showPasswordModal = ref(false)
const pendingRoom       = ref(null)

// ── UI state ───────────────────────────────────────────────────
const localVisible    = ref(false)
const closing         = ref(false)
const activeTab       = ref('all') // 'all' | 'public' | 'private'
const loadingBtn      = ref(null)  // roomId en cours de jointure
const isLoadingRooms  = ref(true)

// ── Error ──────────────────────────────────────────────────────
const errorMsg  = ref('')
const errorType = ref('error')
const showError = (msg, type = 'error') => {
  errorMsg.value = ''
  setTimeout(() => { errorMsg.value = msg; errorType.value = type }, 50)
}

// ── Search state (iray isaky ny tab, tahaka an'i ModalSocial.vue) ──
const allSearch            = ref('')
const committedAllSearch   = ref('')
const publicSearch         = ref('')
const committedPublicSearch = ref('')
const privateSearch        = ref('')
const committedPrivateSearch = ref('')

const commitAllSearch     = () => { committedAllSearch.value     = allSearch.value.trim() }
const commitPublicSearch  = () => { committedPublicSearch.value  = publicSearch.value.trim() }
const commitPrivateSearch = () => { committedPrivateSearch.value = privateSearch.value.trim() }

// ── Rooms data ─────────────────────────────────────────────────
const rooms = ref([]) // { roomId, private, stake, count, capacity }

const authHeaders = () => {
  const token = localStorage.getItem('user_token')
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

const loadRooms = async () => {
  try {
    const res = await fetchWithTimeout(API_ROOM, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ action: 'list-rooms', uid: props.myUid }),
    })
    const data = await res.json()
    rooms.value = (res.ok && data.success) ? (data.rooms || []) : []
  } catch {
    rooms.value = []
  } finally {
    isLoadingRooms.value = false
  }
}

let roomsTimer = null
const startRoomsPolling = () => {
  stopRoomsPolling()
  loadRooms()
  roomsTimer = setInterval(loadRooms, ROOMS_POLL_MS)
}
const stopRoomsPolling = () => {
  if (roomsTimer) { clearInterval(roomsTimer); roomsTimer = null }
}

// ── Tri / filtres ──────────────────────────────────────────────
const byStakeAsc = (a, b) => (a.stake ?? Infinity) - (b.stake ?? Infinity)

const publicRooms  = computed(() => rooms.value.filter(r => !r.private).sort(byStakeAsc))
const privateRooms = computed(() => rooms.value.filter(r => r.private).sort(byStakeAsc))
// Tous : ny salon public rehetra aloha (misesy mise), avy eo ny privé (misesy mise)
const allRooms      = computed(() => [...publicRooms.value, ...privateRooms.value])

const formatStake = (stake) => stake != null ? `${stake.toLocaleString('fr-FR')}ar` : '—'

const matchesQuery = (r, q) => {
  if (!q) return true
  const query = q.toLowerCase()
  return r.roomId.toLowerCase().includes(query) || String(r.stake ?? '').includes(query)
}

const filteredAll     = computed(() => allRooms.value.filter(r => matchesQuery(r, committedAllSearch.value)))
const filteredPublic  = computed(() => publicRooms.value.filter(r => matchesQuery(r, committedPublicSearch.value)))
const filteredPrivate = computed(() => privateRooms.value.filter(r => matchesQuery(r, committedPrivateSearch.value)))

// ── Actions ────────────────────────────────────────────────────
// Salon PUBLIC → miditra mivantana. Salon PRIVÉ → aseho aloha ilay
// ModalRoomPassword.vue mba hangatahana ny mot de passe.
const enterRoom = async (room) => {
  if (room.count >= room.capacity) return
  if (room.private) {
    pendingRoom.value = room
    showPasswordModal.value = true
    return
  }
  if (loadingBtn.value) return
  loadingBtn.value = room.roomId
  try {
    const res = await fetchWithTimeout(`${API_ROOM}?action=join-room`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ uid: props.myUid, username: props.myName, avatar: props.myAvatar, roomId: room.roomId }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.roomId) {
      showError(data.message || "Impossible de rejoindre ce salon.")
      return
    }
    emit('open-room', { roomId: data.roomId })
    emit('close')
  } catch (e) {
    showError(e?.message || 'Erreur réseau. Réessayez.')
  } finally {
    loadingBtn.value = null
  }
}

const closePasswordModal = () => {
  showPasswordModal.value = false
  pendingRoom.value = null
}
const onPasswordJoined = ({ roomId } = {}) => {
  showPasswordModal.value = false
  pendingRoom.value = null
  if (!roomId) return
  emit('open-room', { roomId })
  emit('close')
}

const handleCreateRoom = () => { emit('create-room') }
const handleClose = () => emit('close')

// ── Watch ──────────────────────────────────────────────────────
watch(() => props.show, val => {
  if (val) {
    localVisible.value = true; closing.value = false
    activeTab.value = 'all'
    isLoadingRooms.value = true
    allSearch.value = ''; committedAllSearch.value = ''
    publicSearch.value = ''; committedPublicSearch.value = ''
    privateSearch.value = ''; committedPrivateSearch.value = ''
    errorMsg.value = ''
    loadingBtn.value = null
    document.body.style.overflow = 'hidden'
    startRoomsPolling()
  } else {
    closing.value = true
    setTimeout(() => {
      localVisible.value = false; closing.value = false
      document.body.style.overflow = 'auto'
      stopRoomsPolling()
    }, 400)
  }
})

onUnmounted(() => stopRoomsPolling())
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

#modal-room-list { --gd:#ffd966; --tg:#fff9e0; }

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
  display:flex; background:rgba(0,0,0,.25);
  border-radius:20px; padding:4px; margin-bottom:12px; flex-shrink:0;
}
.ftabs > * + * { margin-left:4px; }
.ft {
  flex:1; padding:9px 4px; border:none; background:none; border-radius:16px;
  color:rgba(255,245,200,.5); font-size:10px; font-weight:700; cursor:pointer;
  display:flex; flex-direction:column; place-items:center;
  position:relative; transition:.2s;
}
.ft > * + * { margin-top:2px; }
.ft .material-icons { font-size:19px; }
.ft.on { background:rgba(255,220,100,.18); color:var(--gd); border:1px solid rgba(255,220,100,.3); }

.fp { display:none; flex-direction:column; flex:1; overflow:hidden; }
.fp.on { display:flex; }

.fsrch {
  display:flex; align-items:center;
  background:rgba(10,30,18,.6); border:1px solid rgba(255,240,160,.3);
  border-radius:30px; padding:5px 8px 5px 14px;
  margin-bottom:10px; flex-shrink:0;
}
.fsrch > * + * { margin-left:8px; }
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
  overflow-y:auto; flex:1; padding-right:4px;
  position:relative;
}
.flist > * + * { margin-top:7px; }
.flist::-webkit-scrollbar { width:4px; }
.flist::-webkit-scrollbar-thumb { background:rgba(255,220,100,.2); border-radius:4px; }

.fi {
  display:flex; align-items:center; justify-content:space-between;
  padding:9px 11px;
  background:rgba(255,255,220,.07); border:1px solid rgba(255,240,160,.12);
  border-radius:14px;
}
.fi > * + * { margin-left:8px; }

.fi-l { display:flex; align-items:center; min-width:0; }
.fi-l > * + * { margin-left:10px; }
.fi-l > div:last-child { display:flex; flex-direction:column; min-width:0; }

/* ── Icône cadenas (remplace l'avatar, pas de cercle/bordure) ── */
.rm-icon {
  width:38px; height:38px; flex-shrink:0;
  display:flex; align-items:center; justify-content:center;
}
.rm-icon .material-icons { font-size:24px; }
.rm-icon-locked   { color:#ff6b6b; }
.rm-icon-unlocked { color:var(--gd); }

.rm-count { font-size:10px; font-weight:700; margin-top:2px; letter-spacing:.3px; color:rgba(255,245,200,.55); }

.fn   { color:var(--tg); font-size:13.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.fa { display:flex; gap:5px; flex-shrink:0; }

.fb {
  border:none; border-radius:20px; font-size:11px; font-weight:700;
  padding:0 11px; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  transition:filter .2s, transform .15s; box-sizing:border-box; height:30px;
}
.fb-i { background:rgba(255,200,80,.15); border:1px solid rgba(255,200,80,.4); color:var(--gd); }
.fb:hover:not(:disabled) { filter:brightness(1.15); transform:scale(1.04); }
.fb:disabled { opacity:.55; cursor:not-allowed; }

@keyframes btnSpin { to { transform:rotate(360deg); } }
.btn-spin {
  display:inline-block; width:13px; height:13px;
  border-radius:50%; border:2px solid transparent;
  animation:btnSpin .6s linear infinite; flex-shrink:0;
}
.btn-spin-gold  { border-color:rgba(255,217,102,.25); border-top-color:var(--gd); }

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

/* ── Bouton flottant "+" (créer un salon) ── */
.rm-fab {
  position:absolute; bottom:50px; right:20px; z-index:40;
  width:50px; height:50px; border-radius:50%;
  background:linear-gradient(135deg, #ffe55c, #f5c518);
  border:2px solid rgba(255,255,255,.25);
  color:#2a1e00; cursor:pointer;
  display:flex; align-items:center; justify-content:center;
  box-shadow:0 6px 20px rgba(0,0,0,.5);
  transition:filter .2s, transform .15s;
}
.rm-fab:hover { filter:brightness(1.1); transform:scale(1.05); }
.rm-fab:active { transform:scale(.95); }
.rm-fab .material-icons { font-size:26px; }
</style>
