<template>
  <Teleport to="body">
  <div
    v-if="localVisible"
    :class="['ovl', closing ? 'off' : 'on']"
    id="modal-chat"
    @click.self="handleClose"
  >
    <div class="mdl" ref="mdlRef" @click="closePopup">

      <button class="x flex-c" @click="handleClose">
        <span class="material-icons">close</span>
      </button>

      <!-- ══════════════════════════════
           HEADER : Lisitry ny resaka
           ══════════════════════════════ -->
      <template v-if="view === 'list'">
        <h2 class="mtitle mtitle-sm">Messages</h2>
      </template>

      <!-- ══════════════════════════════
           HEADER : anaty resaka iray
           ══════════════════════════════ -->
      <template v-else>
        <div class="chat-top">
          <button class="back-btn flex-c" @click="goBack" aria-label="Retour">
            <span class="material-icons">arrow_back</span>
          </button>
          <div class="chat-top-user">
            <div v-if="roomMode" class="room-lock-icon flex-c" :class="roomPrivate ? 'is-private' : 'is-public'">
              <span class="material-icons">{{ roomPrivate ? 'lock' : 'lock_open' }}</span>
            </div>
            <div v-else class="fava fava-emoji fava-sm">{{ activeChat.avatar || '👤' }}</div>
            <div class="chat-top-name">{{ roomMode ? roomId : activeChat.username }}</div>
          </div>
        </div>
      </template>

      <!-- ══════════════════════════════
           VUE : Lisitry ny resaka
           ══════════════════════════════ -->
      <div v-if="view === 'list'" class="flist chat-list">
        <div v-if="isLoadingConversations" class="empty"><div class="list-spinner"></div></div>
        <div v-else-if="conversations.length === 0" class="empty">
          <IconMessage class="material-icons" />
          <p>Aucun message pour le moment</p>
        </div>

        <!-- ── Conversation row ── -->
        <div
          v-if="!isLoadingConversations"
          v-for="c in conversations"
          :key="c.firebaseUid"
          class="fi fi-clickable"
          :class="{ 'fi-active': popup.uid === c.firebaseUid }"
          @click="openConversation(c)"
        >
          <div class="fi-l">
            <div class="fava fava-emoji">
              {{ c.avatar || '👤' }}
              <span class="fava-status" :class="getPresence(c.firebaseUid).online ? 'online' : 'offline'"></span>
            </div>
            <div>
              <div class="fn">{{ c.username }}</div>
              <div class="fpres cpreview">
                <span v-if="c.unreadCount > 0" class="msg-badge">{{ c.unreadCount > 99 ? '99+' : c.unreadCount }}</span>
                <span v-else-if="c.lastSenderUid === myFirebaseUid">Vous : </span>{{ c.lastMessage || '…' }}
              </div>
            </div>
          </div>
          <div class="fa">
            <button class="more-btn flex-c" @click.stop="togglePopup(c, $event)" aria-label="Options">
              <span class="material-icons">more_vert</span>
            </button>
          </div>
        </div>
      </div>

      <!-- ══════════════════════════════
           CADRE KELY : Défier / Message / Supprimer
           ══════════════════════════════ -->
      <Transition name="pop-anim">
        <div
          v-if="popup.visible"
          class="popup-card"
          :style="popupStyle"
          @click.stop
        >
          <button
            v-if="getPresence(popup.user?.firebaseUid).online"
            class="pop-btn pop-challenge"
            @click="challengeFromChat(popup.user); closePopup()"
          >
            <span class="material-icons">sports_esports</span> Défier
          </button>
          <button class="pop-btn pop-message" @click="openConversation(popup.user); closePopup()">
            <IconMessage class="material-icons" /> Message
          </button>
          <button class="pop-btn pop-remove" @click="askDeleteConversation(popup.user)">
            <span class="material-icons">delete</span> Supprimer
          </button>
        </div>
      </Transition>

      <!-- ══════════════════════════════
           VUE : anaty resaka iray
           ══════════════════════════════ -->
      <div v-if="view !== 'list'" class="chat-body">
        <div class="chat-messages" ref="msgsEl">
          <div v-if="isLoadingMessages" class="empty"><div class="list-spinner"></div></div>
          <div v-else-if="messages.length === 0" class="empty">
            <IconMessage class="material-icons" />
            <p>Aucun message. Dites bonjour !</p>
          </div>
          <template v-else>
            <div
              v-for="m in messages"
              :key="m.id"
              :class="['bubble-row', m.senderUid === myFirebaseUid ? 'me' : 'them']"
            >
              <div class="bubble">
                <div v-if="roomMode" class="bubble-sender">
                  {{ m.senderUsername }}
                  <span v-if="m.senderUid === hostUid" class="bubble-host-tag">hôte</span>
                </div>
                <div class="bubble-text">{{ m.text }}</div>
                <div class="bubble-time">{{ formatTime(m.createdAt) }}</div>
              </div>
            </div>
          </template>
        </div>

        <div class="chat-input-bar">
          <input
            type="text"
            v-model="draft"
            placeholder="Écrivez un message..."
            :disabled="sending"
            @keyup.enter="sendMsg"
          >
          <button class="send-btn flex-c" :disabled="sending || !draft.trim()" @click="sendMsg" aria-label="Envoyer">
            <span v-if="sending" class="btn-spin btn-spin-dark"></span>
            <span v-else class="material-icons">send</span>
          </button>
        </div>
      </div>

    </div>
  </div>

  <!-- ── Notification ── -->
  <Notification
    :message="errorMsg"
    :type="errorType"
    :duration="4000"
    @close="errorMsg = ''"
  />

  <!-- ── ModalConfirm : famafana ny Conversation ── -->
  <ModalConfirm
    v-model="confirmDelete.visible"
    title="Supprimer la conversation ?"
    message="Voulez-vous vraiment supprimer la conversation ?"
    confirm-label="Supprimer"
    cancel-label="Annuler"
    type="danger"
    icon="delete"
    :loading="confirmDelete.loading"
    @confirm="doDeleteConversation"
  />
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onUnmounted, nextTick } from 'vue'
import Notification from './Notification.vue'
import ModalConfirm from './ModalConfirm.vue'
import IconMessage from '../IconMessage.vue'
import { fetchWithTimeout } from '../../utils/network'

// ── API ────────────────────────────────────────────────────────
const API_CHAT       = '/api/chat'
const API_SESSION    = '/api/session'
const LIST_POLL_MS   = 5000
const MSG_POLL_MS    = 3000

// ── Props / Emits ──────────────────────────────────────────────
const props = defineProps({
  show:          Boolean,
  myFirebaseUid: { type: String, default: '' },
  // Rehefa omena ity, dia mivoha mivantana ao anaty resaka amin'ilay
  // utilisateur ity (avy amin'ny button "Message" ao ModalSocial/Profil)
  targetUser:    { type: Object, default: null }, // { firebaseUid, username, avatar }
  // ── Chat n'ny Salon (mpilalao maro, "group") ──────────────────
  // Rehefa "roomMode" dia mivoha mivantana ao anaty resaka (tsy
  // misy vue "list"), ary "roomId" no ampiasaina fa tsy "targetUser".
  roomMode:      { type: Boolean, default: false },
  roomId:        { type: String,  default: '' },
  roomPrivate:   { type: Boolean, default: false },
  hostUid:       { type: String,  default: '' },
  myUsername:    { type: String,  default: 'Player' },
})
// "challenge" — mamoaka ny UID an'ilay utilisateur nofidina tao amin'ny
// Cadre kely "Défier" (jereo challengeFromChat), any amin'ny Home.vue
// (mitovy amin'ny "@challenge" efa ampiasaina ao amin'ny ModalProfile.vue).
const emit = defineEmits(['close', 'challenge'])

// ── UI state ───────────────────────────────────────────────────
const localVisible = ref(false)
const closing       = ref(false)
const view          = ref('list') // 'list' | 'chat'

// ── Error ──────────────────────────────────────────────────────
const errorMsg  = ref('')
const errorType = ref('error')
const showError = (msg, type = 'error') => {
  errorMsg.value = ''
  setTimeout(() => { errorMsg.value = msg; errorType.value = type }, 50)
}

// ── Lisitry ny resaka ──────────────────────────────────────────
const conversations          = ref([])
const isLoadingConversations = ref(true)
let listTimer = null

const loadConversations = async (silent = false) => {
  if (!silent) isLoadingConversations.value = true
  try {
    const res  = await fetchWithTimeout(API_CHAT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'list-conversations', uid: props.myFirebaseUid }),
    })
    const data = await res.json()
    conversations.value = (res.ok && data.success) ? (data.conversations || []) : []
    conversations.value.forEach(c => subscribePresence(c.firebaseUid))
    refreshPresence()
  } catch {
    if (!silent) conversations.value = []
  } finally {
    isLoadingConversations.value = false
  }
}

const startListPolling = () => {
  if (listTimer) return
  loadConversations()
  listTimer = setInterval(() => loadConversations(true), LIST_POLL_MS)
}
const stopListPolling = () => {
  if (listTimer) { clearInterval(listTimer); listTimer = null }
}

// ── Présence ("en ligne"/"hors ligne") — jereo ModalSocial.vue, mitovy
//    lojika, ilaina amin'ny teboka eo amin'ny avatar sy ny fisehoan'ny
//    button "Défier" ao amin'ny cadre kely. ──────────────────────────
const presenceMap = reactive({})
const trackedUids = new Set()

const getPresence = (uid) => presenceMap[uid] || { online: false, lastSeen: null }
const subscribePresence = (uid) => { if (uid) trackedUids.add(uid) }

const refreshPresence = async () => {
  const uids = Array.from(trackedUids)
  if (!uids.length) return
  try {
    const res  = await fetchWithTimeout(API_SESSION, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'get-presence', uid: props.myFirebaseUid, uids }),
    })
    const data = await res.json()
    if (res.ok && data.success) Object.assign(presenceMap, data.presence)
  } catch { /* mijanona amin'ny valeur teo aloha raha tsy tafiditra */ }
}

// ── Cadre kely (popup) : Message / Supprimer ─────────────────────
const mdlRef = ref(null)
const popup  = reactive({ visible: false, uid: '', user: null, top: 0, right: 0 })

const POPUP_WIDTH     = 170
const POPUP_RIGHT_GAP = 14

const popupStyle = computed(() => ({
  top:   popup.top   + 'px',
  right: popup.right + 'px',
  width: POPUP_WIDTH + 'px',
}))

const togglePopup = async (c, event) => {
  if (popup.visible && popup.uid === c.firebaseUid) { closePopup(); return }

  popup.uid  = c.firebaseUid
  popup.user = c

  await nextTick()

  const mdlEl = mdlRef.value
  if (mdlEl) {
    const mdlRect = mdlEl.getBoundingClientRect()
    const rowEl   = event.currentTarget.closest('.fi')
    const faEl    = rowEl ? rowEl.querySelector('.fa') : event.currentTarget
    const refRect = (faEl || event.currentTarget).getBoundingClientRect()

    popup.top   = (refRect.bottom - mdlRect.top) + 6
    popup.right = POPUP_RIGHT_GAP
  }

  popup.visible = true
}

const closePopup = () => {
  popup.visible = false
  popup.uid     = ''
  popup.user    = null
}

// Button "Défier" (cadre kely, miseho ambony ny "Message" rehefa en
// ligne ilay utilisateur) — jereo Home.vue (@challenge="onProfileChallenge").
const challengeFromChat = (c) => {
  if (!c || !c.firebaseUid) return
  emit('challenge', c.firebaseUid)
}

// ── Famafana Conversation manontolo (avy amin'ilay utilisateur namafa
//    ihany — ny ao amin'ny mpiresaka anankiray tsy fafaina) ────────
const confirmDelete = reactive({ visible: false, user: null, loading: false })

const askDeleteConversation = (c) => {
  closePopup()
  confirmDelete.user    = c
  confirmDelete.loading = false
  confirmDelete.visible = true
}

const doDeleteConversation = async () => {
  if (!confirmDelete.user) return
  confirmDelete.loading = true
  try {
    const res  = await fetchWithTimeout(API_CHAT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ action: 'delete-conversation', uid: props.myFirebaseUid, targetFirebaseUid: confirmDelete.user.firebaseUid }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      showError(data.error || 'Impossible de supprimer la conversation.')
      return
    }
    conversations.value = conversations.value.filter(c => c.firebaseUid !== confirmDelete.user.firebaseUid)
    confirmDelete.visible = false
    confirmDelete.user    = null
  } catch (e) {
    showError(e.message || 'Erreur réseau. Veuillez réessayer.')
  } finally {
    confirmDelete.loading = false
  }
}

// ── Resaka misokatra ───────────────────────────────────────────
const activeChat        = reactive({ firebaseUid: '', username: '', avatar: '👤' })
const messages           = ref([])
const isLoadingMessages  = ref(true)
const draft              = ref('')
const sending            = ref(false)
const msgsEl             = ref(null)
let   msgTimer           = null

// Ora:minitra kely aseho eo ankavanana anatin'ilay Cadre (bubble)
const formatTime = (ms) => {
  if (!ms) return ''
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const isNearBottom = () => {
  const el = msgsEl.value
  if (!el) return true
  return (el.scrollHeight - el.scrollTop - el.clientHeight) < 80
}

const scrollToBottom = async () => {
  await nextTick()
  const el = msgsEl.value
  if (el) el.scrollTop = el.scrollHeight
}

const loadMessages = async (silent = false) => {
  if (!silent) isLoadingMessages.value = true
  const wasNearBottom = isNearBottom()
  try {
    const res  = await fetchWithTimeout(API_CHAT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(
        props.roomMode
          ? { action: 'get-room-messages', uid: props.myFirebaseUid, roomId: props.roomId }
          : { action: 'get-messages', uid: props.myFirebaseUid, targetFirebaseUid: activeChat.firebaseUid }
      ),
    })
    const data = await res.json()
    messages.value = (res.ok && data.success) ? (data.messages || []) : []
  } catch {
    if (!silent) messages.value = []
  } finally {
    isLoadingMessages.value = false
    if (!silent || wasNearBottom) scrollToBottom()
  }
}

const startMsgPolling = () => {
  if (msgTimer) return
  msgTimer = setInterval(() => loadMessages(true), MSG_POLL_MS)
}
const stopMsgPolling = () => {
  if (msgTimer) { clearInterval(msgTimer); msgTimer = null }
}

const openConversation = async (c) => {
  closePopup()
  activeChat.firebaseUid = c.firebaseUid
  activeChat.username    = c.username
  activeChat.avatar      = c.avatar || '👤'
  c.unreadCount = 0 // voajery avy hatrany eo amin'ny lisitra

  stopListPolling()
  messages.value = []
  view.value = 'chat'
  await loadMessages()
  startMsgPolling()
}

const goBack = () => {
  // Amin'ny "roomMode" dia tsy misy vue "list" hiverenana, ka ny
  // fanidiana mivantana ilay modal no atao eto.
  if (props.roomMode) { handleClose(); return }
  stopMsgPolling()
  activeChat.firebaseUid = ''
  activeChat.username    = ''
  draft.value = ''
  view.value = 'list'
  startListPolling()
}

const sendMsg = async () => {
  const text = draft.value.trim()
  if (!text || sending.value) return
  if (!props.roomMode && !activeChat.firebaseUid) return
  if (props.roomMode && !props.roomId) return
  sending.value = true
  try {
    const res  = await fetchWithTimeout(API_CHAT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(
        props.roomMode
          ? { action: 'send-room-message', uid: props.myFirebaseUid, roomId: props.roomId, username: props.myUsername, text }
          : { action: 'send-message', uid: props.myFirebaseUid, targetFirebaseUid: activeChat.firebaseUid, text }
      ),
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      showError(data.error || "Impossible d'envoyer le message.")
      return
    }
    // Ampidirina mivantana ilay hafatra ao anaty lisitra ( tsy
    // mila loadMessages() indray, mba tsy hisy ilay animation
    // boribory miodina sy tsy hisy fikorontanana ny fijerena )
    messages.value = [...messages.value, data.message]
    draft.value = ''
    scrollToBottom()
  } catch (e) {
    showError(e.message || 'Erreur réseau. Veuillez réessayer.')
  } finally {
    sending.value = false
  }
}

// ── Watch ──────────────────────────────────────────────────────
watch(() => props.show, val => {
  if (val) {
    localVisible.value = true; closing.value = false
    errorMsg.value = ''
    document.body.style.overflow = 'hidden'

    if (props.roomMode) {
      messages.value = []
      view.value = 'chat'
      loadMessages().then(startMsgPolling)
    } else if (props.targetUser && props.targetUser.firebaseUid) {
      activeChat.firebaseUid = props.targetUser.firebaseUid
      activeChat.username    = props.targetUser.username || 'Player'
      activeChat.avatar      = props.targetUser.avatar || '👤'
      messages.value = []
      view.value = 'chat'
      loadMessages().then(startMsgPolling)
    } else {
      view.value = 'list'
      startListPolling()
    }
  } else {
    closing.value = true
    setTimeout(() => {
      localVisible.value = false; closing.value = false
      document.body.style.overflow = 'auto'
      stopListPolling(); stopMsgPolling()
      trackedUids.clear()
      view.value = 'list'
      draft.value = ''
      messages.value = []
      closePopup()
      confirmDelete.visible = false
    }, 400)
  }
})

onUnmounted(() => { stopListPolling(); stopMsgPolling() })

const handleClose = () => emit('close')
</script>

<style scoped>
.ovl {
  position:fixed; inset:0; background:rgba(0,0,0,.6);
  backdrop-filter:blur(1px);
  display:flex; place-content:center; place-items:center;
  /* z-index:5500 — mihoatra ny an'i ModalRoom.vue (.ovl { z-index:5000 }),
     satria mety mivoha ao anaty ModalRoom ity ModalChat ity (Chat n'ny
     Salon), ka tsy tokony ho takonan'ilay ModalRoom eo ambaniny. */
  z-index:5500;
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

#modal-chat { --gd:#ffd966; --tg:#fff9e0; }

.x {
  position:absolute; top:16px; right:18px;
  width:38px; height:38px; border-radius:50%;
  background:rgba(220,80,70,.8); border:none; color:#fff; cursor:pointer;
  display:flex; align-items:center; justify-content:center; transition:.2s;
}
.x:hover { background:#e06a5a; transform:scale(1.15) rotate(90deg); }

.mtitle { color:#fffacd; font-family:'Chicle',cursive; text-align:center; letter-spacing:2px; text-shadow:0 4px 8px rgba(0,0,0,.5); }
.mtitle-sm { font-size:28px; margin-bottom:14px; }

.flex-c { display:flex; align-items:center; justify-content:center; }

/* ── Lisitry ny resaka ── */
.chat-list { flex:1; }

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
.fi-clickable { cursor:pointer; transition:background .15s, border-color .15s; }
.fi-clickable:hover { background:rgba(255,255,220,.12); border-color:rgba(255,240,160,.22); }
.fi-active { background:rgba(255,220,100,.12); border-color:rgba(255,220,100,.35); }

.fi-l { display:flex; align-items:center; min-width:0; }
.fi-l > * + * { margin-left:10px; }
.fi-l > div:last-child { display:flex; flex-direction:column; min-width:0; }

.fava {
  position:relative;
  width:38px; height:38px; flex-shrink:0;
  background:rgba(30,74,130,.8); border:2px solid rgba(255,240,160,.2);
  border-radius:50%; display:flex; align-items:center; justify-content:center;
  color:rgba(255,220,100,.65);
}
.fava-emoji { font-size:22px; line-height:1; background:rgba(10,25,55,.7); }
.fava-sm { width:32px; height:32px; }
.fava-sm.fava-emoji { font-size:18px; }

/* Teboka "en ligne"/"hors ligne" — eo amin'ny sisiny ankavanana ambany
   an'ilay boribory avatar, mitovy toerana amin'ny ".btn-edit-avatar"
   ao ModalProfile.vue fa kelikely kokoa. */
.fava-status {
  position:absolute; bottom:1px; right:1px;
  width:11px; height:11px; border-radius:50%;
  border:2px solid #08264a;
}
.fava-status.online  { background:#3ddc84; }
.fava-status.offline { background:#5a5a5a; }

/* Icône Look/Unlock ao amin'ny header n'ny Chat n'ny Salon — tsy misy
   boribory na background (ny avatar ihany no manana izany), ny anjara
   soratra ihany no miova araka ny "private" na "public". */
.room-lock-icon { width:32px; height:32px; flex-shrink:0; }
.room-lock-icon .material-icons { font-size:20px; }
.room-lock-icon.is-private .material-icons { color:#ff5c5c; }
.room-lock-icon.is-public  .material-icons { color:var(--gd); }

.fn { color:var(--tg); font-size:13.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.fpres { font-size:10px; font-weight:700; margin-top:2px; letter-spacing:.3px; }
.cpreview {
  color:rgba(255,245,200,.45); font-weight:500;
  max-width:190px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

.fa { display:flex; align-items:center; gap:7px; flex-shrink:0; }

/* "inline-flex" (fa tsy "flex") — mba ho voarindra tsara ao anaty
   ".cpreview" (soratra "nowrap"/text-overflow, tsy "flex container"),
   eo ankavian'ny hafatra (toeran'ilay "Vous :" teo aloha), kelikely
   kokoa noho ny teo aloha (eo akaikin'ny button 3 point) mba tsy hisy
   fiantraikany amin'ny "design"/habe an'ilay andalana. */
.msg-badge {
  display:inline-flex; align-items:center; justify-content:center;
  min-width:15px; height:15px; padding:0 4px; border-radius:8px;
  background:#ff4f6e; color:#fff; font-size:9px; font-weight:800;
  box-shadow:0 2px 6px rgba(255,79,110,.4);
  margin-right:4px; vertical-align:middle; flex-shrink:0;
}

.more-btn {
  width:32px; height:32px; border-radius:50%; border:none;
  background:rgba(255,220,100,.15); color:var(--gd);
  cursor:pointer; transition:background .2s; flex-shrink:0;
}
.more-btn .material-icons { font-size:19px; }
.more-btn:hover { background:rgba(255,220,100,.28); }

/* ── Cadre kely (popup) : Message / Supprimer ── */
.popup-card {
  position:absolute; z-index:50;
  background:linear-gradient(to bottom, #0d3060, #071828);
  border:1.5px solid rgba(255,220,100,.3);
  border-radius:16px; padding:8px 8px;
  display:flex; flex-direction:column;
  box-shadow:0 8px 30px rgba(0,0,0,.7);
  pointer-events:auto;
}
.popup-card > * + * { margin-top:5px; }
.pop-anim-enter-active, .pop-anim-leave-active { transition:opacity .15s, transform .15s; }
.pop-anim-enter-from, .pop-anim-leave-to { opacity:0; transform:scaleY(.85); transform-origin:top right; }

.pop-btn {
  display:flex; align-items:center;
  padding:9px 12px; border:none; border-radius:12px;
  font-size:12px; font-weight:700; cursor:pointer;
  width:100%; text-align:left;
  transition:background .15s, transform .1s; white-space:nowrap;
}
.pop-btn:hover { transform:scale(1.02); }
/* "margin-right" (fa tsy "> * + *") satria soratra "bare" no manaraka
   ny icone anaty .pop-btn (jereo .vbtn ao ModalProfile.vue). */
.pop-btn .material-icons, .pop-btn .icon-message { font-size:17px; flex-shrink:0; margin-right:8px; }

/* "Défier" mavo, "Message" bleu ciel — mitovy manerana ny appli
   (jereo ModalSocial.vue .pop-challenge/.pop-add). */
.pop-challenge {
  background:rgba(255,200,60,.14); border:1px solid rgba(255,200,60,.35); color:#ffd966;
}
.pop-challenge:hover { background:rgba(255,200,60,.24); }

.pop-message {
  background:rgba(60,180,255,.14); border:1px solid rgba(60,180,255,.35); color:#7dd4ff;
}
.pop-message:hover { background:rgba(60,180,255,.24); }

.pop-remove {
  background:rgba(220,50,50,.12); border:1px solid rgba(220,50,50,.3); color:#ff6b6b;
}
.pop-remove:hover { background:rgba(220,50,50,.22); }

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
@keyframes btnSpin { to { transform:rotate(360deg); } }

/* ── Anaty resaka iray ── */
.chat-top {
  display:flex; align-items:center;
  margin:-22px 0 14px 0; padding-right:44px; flex-shrink:0;
}
.chat-top > * + * { margin-left:10px; }
.back-btn {
  width:36px; height:36px; border-radius:50%; border:none;
  background:rgba(255,255,255,.08); color:var(--tg);
  cursor:pointer; transition:background .2s; flex-shrink:0;
}
.back-btn:hover { background:rgba(255,255,255,.16); }
.back-btn .material-icons { font-size:20px; }

.chat-top-user { display:flex; align-items:center; min-width:0; }
.chat-top-user > * + * { margin-left:9px; }
.chat-top-name {
  font-size:15px; font-weight:800; color:var(--tg);
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
}

.chat-body { display:flex; flex-direction:column; flex:1; overflow:hidden; }

.chat-messages {
  flex:1; overflow-y:auto; display:flex; flex-direction:column;
  padding:4px 4px 8px 2px;
}
.chat-messages > * + * { margin-top:8px; }
.chat-messages::-webkit-scrollbar { width:4px; }
.chat-messages::-webkit-scrollbar-thumb { background:rgba(255,220,100,.2); border-radius:4px; }

.bubble-row { display:flex; }
.bubble-row.me   { justify-content:flex-end; }
.bubble-row.them { justify-content:flex-start; }

.bubble {
  max-width:75%; padding:9px 13px; border-radius:16px;
  font-size:13.5px; line-height:1.45; word-break:break-word;
  box-shadow:0 3px 10px rgba(0,0,0,.18);
}
.bubble-row.me .bubble {
  background:linear-gradient(135deg, rgba(255,209,102,.9), rgba(210,150,20,.85));
  color:#2a1c00; border-bottom-right-radius:4px; font-weight:600;
}
.bubble-row.them .bubble {
  background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.14);
  color:var(--tg); border-bottom-left-radius:4px;
}

/* ── Chat n'ny Salon : anaran'ny nandefa (ambony, ankavia) + hôte ── */
.bubble-sender {
  display:flex; align-items:center;
  font-size:10px; font-weight:800; text-align:left;
  margin-bottom:3px; letter-spacing:.2px;
  color:rgba(255,255,255,.7);
}
.bubble-row.me .bubble-sender { color:rgba(42,28,0,.6); }
.bubble-host-tag {
  /* "margin-left" (fa tsy "> * + *") satria soratra "bare" (senderUsername)
     no eo alohan'ity, tsy element, ka tsy voakasik'ny child combinator. */
  margin-left:6px;
  font-size:8.5px; font-weight:800; text-transform:uppercase;
  letter-spacing:.4px; color:#ffd966;
}
.bubble-row.me .bubble-host-tag { color:#8a5a00; }

.bubble-text { white-space:pre-wrap; }

/* ── Ora:minitra, eo ankavanana anatin'ilay Cadre ── */
.bubble-time {
  font-size:9.5px; font-weight:600; text-align:right;
  margin-top:3px; opacity:.55;
}

.chat-input-bar {
  display:flex; align-items:center;
  background:rgba(10,30,18,.6); border:1px solid rgba(255,240,160,.3);
  border-radius:30px; padding:6px 6px 6px 16px;
  margin-top:10px; flex-shrink:0;
}
.chat-input-bar > * + * { margin-left:8px; }
.chat-input-bar input {
  flex:1; background:none; border:none; outline:none;
  color:var(--tg); font-size:13.5px; min-width:0;
}
.chat-input-bar input::placeholder { color:rgba(255,245,200,.3); }
.chat-input-bar input:disabled { opacity:.6; }

.send-btn {
  width:36px; height:36px; min-width:36px; border-radius:50%; border:none;
  background:linear-gradient(135deg,#ffd966,#c9a83a); color:#1b2b3f;
  cursor:pointer; flex-shrink:0; transition:filter .2s, transform .15s;
}
.send-btn .material-icons { font-size:18px; }
.send-btn:hover:not(:disabled) { filter:brightness(1.1); transform:scale(1.06); }
.send-btn:disabled { opacity:.5; cursor:default; }

.btn-spin {
  display:inline-block; width:15px; height:15px;
  border-radius:50%; border:2px solid transparent;
  animation:btnSpin .6s linear infinite; flex-shrink:0;
}
.btn-spin-dark { border-color:rgba(27,43,63,.3); border-top-color:#1b2b3f; }
</style>
