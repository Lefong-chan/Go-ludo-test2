<template>
  <!-- ══════════════════════════════════════════════════════════
       MAIN PROFILE MODAL
  ══════════════════════════════════════════════════════════ -->
  <div
    v-if="localVisible"
    :class="['ovl', closing ? 'off' : 'on']"
    id="modal-profile"
    @click.self="handleClose"
  >
    <div class="mdl">
      <button class="x" @click="handleClose">
        <span class="material-icons">close</span>
      </button>

      <h2 class="mtitle">{{ isViewer ? 'PROFILE' : 'PROFILE' }}</h2>

      <!-- ── Avatar + Identity ──────────────────────────────── -->
      <div class="profile-header">

        <!-- Avatar -->
        <div class="avatar-wrap">
          <div class="avatar-ring">
            <div class="avatar-emoji">{{ currentAvatar }}</div>
            <div v-if="avatarSaving" class="avatar-saving-spin"></div>
          </div>
          <!-- Bouton edit: mode propre uniquement -->
          <button
            v-if="!isViewer"
            class="btn-edit-avatar"
            @click="showAvatarPicker = true"
            :disabled="avatarSaving"
            title="Change avatar"
          >
            <span class="material-icons">edit</span>
          </button>
          <!-- Statut enligne: mode viewer -->
          <div v-if="isViewer" class="viewer-status" :class="viewerOnline ? 'vstatus-on' : 'vstatus-off'">
            <span class="vstatus-dot">●</span>
          </div>
        </div>

        <!-- Username + UID -->
        <div class="identity-block">
          <div class="p-name">{{ displayUsername }}</div>

          <!-- Mode propre: UID + copy -->
          <div class="p-uid-row">
            <div class="p-uid">
              <span class="uid-label">UID</span>
              <span class="uid-val">{{ displayUid }}</span>
            </div>
            <button
              class="btn-copy-uid"
              :class="{ copied: uidCopied }"
              :disabled="uidCopied"
              @click="copyUid"
              :title="uidCopied ? 'Copied!' : 'Copy UID'"
            >
              <span class="material-icons copy-icon">{{ uidCopied ? 'check_circle' : 'content_copy' }}</span>
            </button>
          </div>

          <!-- Mode viewer: presence -->
          <div v-if="isViewer" class="viewer-presence" :class="viewerOnline ? 'vpres-on' : 'vpres-off'">
            <span v-if="viewerOnline">● Online</span>
            <span v-else>● {{ viewerLastSeenText }}</span>
          </div>
        </div>

      </div>

      <!-- ══ MODE PROPRE ══════════════════════════════════════ -->
      <template v-if="!isViewer">

        <!-- Balance -->
        <div class="balance-card">
          <span class="material-icons balance-icon">account_balance_wallet</span>
          <div class="balance-info">
            <span class="balance-label">Balance</span>
            <span class="balance-amount">{{ Number(wallet).toLocaleString() }}</span>
          </div>
          <span class="balance-unit">pts</span>
        </div>

        <!-- Action Buttons -->
        <div class="action-btns">
          <button class="abtn abtn-friends" @click="openFriends">
            <span class="material-icons">group</span>
            <span>Friends List</span>
            <span class="material-icons abtn-arrow">chevron_right</span>
          </button>
          <button class="abtn abtn-email" @click="fetchAndShowEmail">
            <span class="material-icons">mail</span>
            <span>My Email</span>
            <span v-if="emailLoading" class="email-spin"></span>
            <span v-else class="material-icons abtn-arrow">chevron_right</span>
          </button>
        </div>

      </template>

      <!-- ══ MODE VIEWER (profil olonkafa) ══════════════════════ -->
      <template v-if="isViewer">

        <div class="viewer-actions">

          <!-- Challenge: raha online -->
          <button
            v-if="viewerOnline"
            class="vbtn vbtn-challenge"
            :class="{ 'btn-loading': viewerLoadingBtn === 'challenge' }"
            :disabled="!!viewerLoadingBtn"
            @click="emitChallenge"
          >
            <span v-if="viewerLoadingBtn === 'challenge'" class="vbtn-spin vbtn-spin-gold"></span>
            <template v-else>
              <span class="material-icons">sports_esports</span>
              Challenge
            </template>
          </button>

          <!-- Chat -->
          <button class="vbtn vbtn-chat" disabled>
            <span class="material-icons">chat_bubble</span>
            Chat
          </button>

          <!-- Add: tsy amis, tsy pending -->
          <button
            v-if="!viewerData.isFriend && !viewerData.isPendingSent && !viewerData.isPendingReceived"
            class="vbtn vbtn-add"
            :class="{ 'btn-loading': viewerLoadingBtn === 'add' }"
            :disabled="!!viewerLoadingBtn"
            @click="emitSendRequest"
          >
            <span v-if="viewerLoadingBtn === 'add'" class="vbtn-spin vbtn-spin-green"></span>
            <template v-else>
              <span class="material-icons">person_add</span>
              Add Friend
            </template>
          </button>

          <!-- Accept + Decline: request received -->
          <template v-else-if="viewerData.isPendingReceived">
            <button
              class="vbtn vbtn-accept"
              :class="{ 'btn-loading': viewerLoadingBtn === 'accept' }"
              :disabled="!!viewerLoadingBtn"
              @click="emitAccept"
            >
              <span v-if="viewerLoadingBtn === 'accept'" class="vbtn-spin vbtn-spin-green"></span>
              <template v-else>
                <span class="material-icons">check_circle</span>
                Accept
              </template>
            </button>
            <button
              class="vbtn vbtn-decline"
              :disabled="!!viewerLoadingBtn"
              @click="emitDecline"
            >
              <span class="material-icons">cancel</span>
              Decline
            </button>
          </template>

          <!-- Remove: efa amis -->
          <button
            v-else-if="viewerData.isFriend"
            class="vbtn vbtn-remove"
            :disabled="!!viewerLoadingBtn"
            @click="emitRemove"
          >
            <span class="material-icons">person_remove</span>
            Remove
          </button>

          <!-- Signalé -->
          <button class="vbtn vbtn-report">
            <span class="material-icons">flag</span>
            Signalé
          </button>

        </div>

      </template>

    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       AVATAR PICKER SUB-MODAL (mode propre uniquement)
  ══════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="sub-fade">
      <div v-if="showAvatarPicker" class="sub-ovl" @click.self="showAvatarPicker = false">
        <div class="sub-box">
          <button class="x x-sub" @click="showAvatarPicker = false">
            <span class="material-icons">close</span>
          </button>
          <h3 class="sub-title">Choose Your Avatar</h3>
          <p class="sub-hint">Tap to select</p>

          <div class="emoji-grid">
            <button
              v-for="emoji in AVATARS"
              :key="emoji"
              :class="['emoji-btn', currentAvatar === emoji ? 'emoji-active' : '']"
              @click="selectAvatar(emoji)"
            >{{ emoji }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- ══════════════════════════════════════════════════════════
       EMAIL SUB-MODAL
  ══════════════════════════════════════════════════════════ -->
  <Teleport to="body">
    <Transition name="sub-fade">
      <div v-if="showEmailModal" class="sub-ovl" @click.self="showEmailModal = false">
        <div class="sub-box sub-box-sm">
          <button class="x x-sub" @click="showEmailModal = false">
            <span class="material-icons">close</span>
          </button>
          <div class="email-icon-wrap">
            <span class="material-icons email-big-icon">mail_outline</span>
          </div>
          <h3 class="sub-title">Account Email</h3>
          <div class="email-display">
            <span class="material-icons" style="font-size:16px; color:#ffecaa;">verified_user</span>
            <span class="email-text">{{ userEmail }}</span>
          </div>
          <p class="email-note">This is the email linked to your Go Ludo account.</p>
          <button class="btn-close-email" @click="showEmailModal = false">Close</button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  show:        { type: Boolean, default: false },
  // Mode propre
  username:    { type: String,  default: 'Player' },
  userUid:     { type: String,  default: '000000000' },
  wallet:      { type: [Number, String], default: 0 },
  avatar:      { type: String,  default: '👤' },
  viewerData:  { type: Object,  default: null },
})

const emit = defineEmits([
  'close', 'open-social', 'avatar-updated',
  // Viewer events
  'accept-request', 'decline-request', 'send-request', 'remove-friend', 'challenge',
])

// ── Mode detection ─────────────────────────────────────────────
const isViewer = computed(() => !!props.viewerData)

const displayUsername = computed(() =>
  isViewer.value ? (props.viewerData?.username || 'Player') : props.username
)
const displayUid = computed(() =>
  isViewer.value ? (props.viewerData?.shortId || '—') : props.userUid
)

// ── Viewer: presence ───────────────────────────────────────────
const viewerOnline = computed(() => isViewer.value && !!props.viewerData?.presence?.online)
const viewerLastSeenText = computed(() => {
  if (!isViewer.value) return ''
  const ts = props.viewerData?.presence?.lastSeen
  if (!ts) return 'Offline'
  const diffMs  = Date.now() - ts
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1)  return 'Just now'
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24)  return `${diffHr} hr ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`
})

// ── Viewer loading ─────────────────────────────────────────────
const viewerLoadingBtn = ref(null)

const emitChallenge = async () => {
  viewerLoadingBtn.value = 'challenge'
  emit('challenge', props.viewerData.firebaseUid)
  setTimeout(() => { viewerLoadingBtn.value = null }, 1500)
}
const emitSendRequest = async () => {
  viewerLoadingBtn.value = 'add'
  emit('send-request', props.viewerData.firebaseUid)
  setTimeout(() => { viewerLoadingBtn.value = null }, 1500)
}
const emitAccept = async () => {
  viewerLoadingBtn.value = 'accept'
  emit('accept-request', props.viewerData.firebaseUid)
  setTimeout(() => { viewerLoadingBtn.value = null }, 1500)
}
const emitDecline = () => emit('decline-request', props.viewerData.firebaseUid)
const emitRemove  = () => emit('remove-friend',   props.viewerData.firebaseUid)

// ── UID Copy ───────────────────────────────────────────────────
const uidCopied = ref(false)
let   uidCopyTimer = null

const copyUid = async () => {
  const val = displayUid.value
  if (!val || val === '—') return
  try {
    await navigator.clipboard.writeText(val)
  } catch {
    // fallback
    const el = document.createElement('textarea')
    el.value = val; document.body.appendChild(el)
    el.select(); document.execCommand('copy')
    document.body.removeChild(el)
  }
  uidCopied.value = true
  clearTimeout(uidCopyTimer)
  uidCopyTimer = setTimeout(() => { uidCopied.value = false }, 3000)
}

// ── Own profile state ──────────────────────────────────────────
const localVisible     = ref(false)
const closing          = ref(false)
const currentAvatar    = ref(props.avatar)
const showAvatarPicker = ref(false)
const avatarSaving     = ref(false)
const showEmailModal   = ref(false)
const userEmail        = ref('')
const emailLoading     = ref(false)

const AVATARS = [
  '👨','👩','🧔','👱','🧑','👴','👵','👦','👧','🧕',
  '🧙','🧝','🦸','🦹','🧑‍🚀','👮','🕵️','👷','🤴','👸',
  '🦁','🐯','🐺','🦊','🐻','🐼','🐨','🦝','🐮','🐧',
  '😎','🤩','😈','💀','👽','🤖','🃏','🎭','🔥','⚡',
]

watch(() => props.show, (val) => {
  if (val) {
    currentAvatar.value    = props.avatar
    uidCopied.value        = false
    viewerLoadingBtn.value = null
    localVisible.value     = true
    closing.value          = false
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

watch(() => props.avatar, (val) => { currentAvatar.value = val })

const handleClose = () => emit('close')

const openFriends = () => {
  emit('open-social')
  emit('close')
}

const selectAvatar = async (emoji) => {
  if (emoji === currentAvatar.value) { showAvatarPicker.value = false; return }
  showAvatarPicker.value = false
  avatarSaving.value     = true
  try {
    const token = localStorage.getItem('user_token')
    const res   = await fetch('/api/user?action=update-avatar', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body:    JSON.stringify({ avatar: emoji }),
    })
    if (res.ok) {
      currentAvatar.value = emoji
      localStorage.setItem('user_avatar', emoji)
      emit('avatar-updated', emoji)
    }
  } catch { }
  avatarSaving.value = false
}

const fetchAndShowEmail = async () => {
  if (emailLoading.value) return
  if (userEmail.value) { showEmailModal.value = true; return }
  emailLoading.value = true
  try {
    const token = localStorage.getItem('user_token')
    const res   = await fetch('/api/user?action=get-email', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    const data = await res.json()
    userEmail.value = res.ok ? (data.email || '—') : '—'
  } catch { userEmail.value = '—' }
  emailLoading.value   = false
  showEmailModal.value = true
}
</script>

<style scoped>
/* ══ BASE OVERLAY & MODAL ══════════════════════════════════════ */
.ovl {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, .6);
  backdrop-filter: blur(2px);
  display: flex; place-content: center; place-items: center;
  z-index: 2500;
}
.ovl.on  { display: flex; }
.ovl.off { animation: kFade .4s forwards; }

.mdl {
  border-radius: 32px; padding: 44px 24px 32px;
  width: 88%; max-width: 360px; position: relative;
  color: #fff9e0;
  background: linear-gradient(160deg, #0f4a82 0%, #071e3d 100%);
  border: 2px solid rgba(255, 220, 100, 0.15);
  box-shadow: 0 24px 64px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.06) inset;
}

.on  .mdl { animation: kZoom .4s ease-out forwards; }
.off .mdl { animation: kOut  .4s ease-in  forwards; }

@keyframes kZoom {
  0%   { opacity: 0; transform: scale(.5); }
  50%  { opacity: 1; transform: scale(1.05); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes kOut  {
  0%   { transform: scale(1);  opacity: 1; }
  100% { transform: scale(.4); opacity: 0; }
}
@keyframes kFade { to { opacity: 0; } }

/* ══ CLOSE BUTTON ══════════════════════════════════════════════ */
.x {
  position: absolute; top: 16px; right: 18px;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(220, 80, 70, .8); border: none;
  color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: .2s;
}
.x:hover { background: #e06a5a; transform: scale(1.15) rotate(90deg); }

/* ══ TITLE ═════════════════════════════════════════════════════ */
.mtitle {
  font-family: 'Chicle', cursive; font-size: 36px;
  color: #fffacd; text-align: center; letter-spacing: 3px;
  text-shadow: 0 4px 12px rgba(0,0,0,.6); margin-bottom: 22px;
}

/* ══ PROFILE HEADER ════════════════════════════════════════════ */
.profile-header {
  display: flex; align-items: center;
  gap: 18px; margin-bottom: 20px;
}

.avatar-wrap { position: relative; flex-shrink: 0; }

.avatar-ring {
  position: relative;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,217,102,.18) 0%, rgba(10,30,60,.6) 100%);
  border: 3px solid rgba(255, 217, 102, .45);
  box-shadow: 0 0 24px rgba(255,200,60,.18), 0 6px 18px rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
}

.avatar-emoji { font-size: 46px; line-height: 1; user-select: none; }

.avatar-saving-spin {
  position: absolute; inset: -4px; border-radius: 50%;
  border: 3px solid transparent; border-top-color: #ffd966;
  animation: spin .7s linear infinite;
}

.btn-edit-avatar {
  position: absolute; bottom: -3px; right: -3px;
  width: 26px; height: 26px; border-radius: 50%; border: none;
  background: linear-gradient(135deg, #c9a83a, #ffd966);
  color: #07192e;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: .2s;
  box-shadow: 0 2px 8px rgba(0,0,0,.5);
}
.btn-edit-avatar .material-icons { font-size: 14px; }
.btn-edit-avatar:hover:not(:disabled) { transform: scale(1.15); box-shadow: 0 4px 14px rgba(255,200,60,.4); }
.btn-edit-avatar:disabled { opacity: .5; cursor: not-allowed; }

/* ── Viewer: statut badge sur avatar ── */
.viewer-status {
  position: absolute; bottom: -2px; right: -2px;
  width: 20px; height: 20px; border-radius: 50%;
  border: 2.5px solid #071e3d;
  display: flex; align-items: center; justify-content: center;
  font-size: 8px; font-weight: 900;
}
.vstatus-on  { background: #1adb6a; color: #052010; }
.vstatus-off { background: rgba(255,255,255,.15); color: rgba(255,245,200,.4); }
.vstatus-dot { line-height: 1; }

/* ── Identity ── */
.identity-block {
  display: flex; flex-direction: column;
  justify-content: center; gap: 6px; min-width: 0;
}

.p-name {
  font-size: 22px; font-weight: 900; color: #fffbe6;
  letter-spacing: .5px; text-shadow: 0 2px 8px rgba(0,0,0,.4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ── UID row: badge + copy button ── */
.p-uid-row {
  display: flex; align-items: center; gap: 6px; align-self: flex-start;
}

.p-uid {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 20px;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,220,100,.15);
  font-size: 12px; font-weight: 600; color: rgba(255,245,200,.5);
  letter-spacing: 1.5px;
}
.uid-label {
  font-size: 9px; font-weight: 800; color: rgba(255,220,100,.4);
  text-transform: uppercase; letter-spacing: 1px;
}
.uid-val { color: rgba(255,245,200,.65); }

.btn-copy-uid {
  width: 26px; height: 26px; border-radius: 50%; border: none;
  background: rgba(255,255,255,.07);
  border: 1px solid rgba(255,255,255,.12);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background .2s, transform .15s;
  flex-shrink: 0;
}
.btn-copy-uid:hover:not(:disabled) { background: rgba(255,255,255,.14); transform: scale(1.1); }
.btn-copy-uid:disabled { cursor: default; }
.btn-copy-uid .copy-icon { font-size: 14px; color: rgba(255,245,200,.4); transition: color .25s; }
.btn-copy-uid.copied .copy-icon { color: #2bef7a; }

/* ── Viewer: presence text ── */
.viewer-presence {
  font-size: 11px; font-weight: 700; letter-spacing: .3px;
}
.vpres-on  { color: #3ddc84; }
.vpres-off { color: rgba(255,245,200,.3); font-weight: 500; }

/* ══ BALANCE CARD ══════════════════════════════════════════════ */
.balance-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-radius: 18px; margin-bottom: 18px;
  background: linear-gradient(135deg, rgba(255,200,50,.1), rgba(255,160,20,.06));
  border: 1px solid rgba(255,200,80,.2);
  box-shadow: 0 4px 16px rgba(0,0,0,.3);
}
.balance-icon   { font-size: 26px; color: #ffd966; flex-shrink: 0; }
.balance-info   { display: flex; flex-direction: column; flex: 1; }
.balance-label  { font-size: 10px; font-weight: 700; color: rgba(255,245,200,.4); text-transform: uppercase; letter-spacing: 1.5px; }
.balance-amount { font-size: 26px; font-weight: 900; color: #ffd966; line-height: 1.1; }
.balance-unit   { font-size: 11px; font-weight: 700; color: rgba(255,217,102,.4); text-transform: uppercase; letter-spacing: 1px; align-self: flex-end; padding-bottom: 4px; }

/* ══ ACTION BUTTONS (mode propre) ══════════════════════════════ */
.action-btns { display: flex; flex-direction: column; gap: 10px; }

.abtn {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px; border-radius: 16px; border: none;
  cursor: pointer; transition: .25s; font-size: 14px; font-weight: 700;
  letter-spacing: .5px; text-align: left; width: 100%;
}
.abtn .material-icons:first-child { font-size: 20px; flex-shrink: 0; }
.abtn span:nth-child(2)            { flex: 1; }
.abtn-arrow { font-size: 18px !important; opacity: .5; margin-left: auto; }

.abtn-friends {
  background: linear-gradient(135deg, rgba(43,239,122,.12), rgba(15,168,68,.08));
  border: 1px solid rgba(43,239,122,.25); color: #7fffc4;
}
.abtn-friends:hover {
  background: linear-gradient(135deg, rgba(43,239,122,.22), rgba(15,168,68,.16));
  box-shadow: 0 6px 20px rgba(43,200,100,.2); transform: translateY(-1px);
}
.abtn-friends .material-icons:first-child { color: #2bef7a; }

.abtn-email {
  background: linear-gradient(135deg, rgba(57,185,255,.12), rgba(15,100,200,.08));
  border: 1px solid rgba(57,185,255,.25); color: #a8d8ff;
}
.abtn-email:hover {
  background: linear-gradient(135deg, rgba(57,185,255,.22), rgba(15,100,200,.16));
  box-shadow: 0 6px 20px rgba(57,150,255,.2); transform: translateY(-1px);
}
.abtn-email .material-icons:first-child { color: #39b9ff; }

.email-spin {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2.5px solid rgba(57,185,255,.25); border-top-color: #39b9ff;
  animation: spin .65s linear infinite; flex-shrink: 0;
}

/* ══ VIEWER ACTIONS ════════════════════════════════════════════ */
.viewer-actions {
  display: flex; flex-direction: column; gap: 9px;
  margin-top: 4px;
}

.vbtn {
  display: flex; align-items: center; gap: 10px;
  padding: 13px 18px; border-radius: 16px; border: none;
  cursor: pointer; transition: .2s; font-size: 13.5px; font-weight: 700;
  letter-spacing: .3px; width: 100%;
  min-height: 46px;
}
.vbtn .material-icons { font-size: 19px; flex-shrink: 0; }
.vbtn:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
.vbtn:disabled { opacity: .45; cursor: not-allowed; transform: none !important; filter: none !important; }

.vbtn-challenge {
  background: linear-gradient(135deg, rgba(255,200,60,.18), rgba(200,140,10,.1));
  border: 1px solid rgba(255,200,60,.35); color: #ffd966;
  box-shadow: 0 4px 14px rgba(255,180,30,.12);
}
.vbtn-challenge .material-icons { color: #ffd966; }

.vbtn-chat {
  background: linear-gradient(135deg, rgba(57,185,255,.12), rgba(15,100,200,.07));
  border: 1px solid rgba(57,185,255,.2); color: rgba(168,216,255,.55);
}
.vbtn-chat .material-icons { color: rgba(57,185,255,.5); }

.vbtn-add {
  background: linear-gradient(135deg, rgba(60,180,255,.16), rgba(15,80,200,.09));
  border: 1px solid rgba(60,180,255,.3); color: #7dd4ff;
}
.vbtn-add .material-icons { color: #7dd4ff; }

.vbtn-accept {
  background: linear-gradient(135deg, rgba(43,239,122,.16), rgba(15,168,68,.09));
  border: 1px solid rgba(43,239,122,.3); color: #6cfa8e;
}
.vbtn-accept .material-icons { color: #6cfa8e; }

.vbtn-decline {
  background: linear-gradient(135deg, rgba(220,80,80,.13), rgba(160,30,30,.07));
  border: 1px solid rgba(220,80,80,.28); color: #ff8080;
}
.vbtn-decline .material-icons { color: #ff8080; }

.vbtn-remove {
  background: linear-gradient(135deg, rgba(220,50,50,.12), rgba(150,20,20,.07));
  border: 1px solid rgba(220,50,50,.28); color: #ff6b6b;
}
.vbtn-remove .material-icons { color: #ff6b6b; }

.vbtn-report {
  background: rgba(255,140,0,.08);
  border: 1px solid rgba(255,140,0,.2); color: rgba(255,180,60,.6);
  margin-top: 2px;
}
.vbtn-report .material-icons { color: rgba(255,140,0,.5); }
.vbtn-report:hover:not(:disabled) { background: rgba(255,140,0,.14); color: rgba(255,180,60,.85); transform: none; }

/* ── Viewer spinners ── */
@keyframes vSpin { to { transform: rotate(360deg); } }
.vbtn-spin {
  display: inline-block; width: 16px; height: 16px;
  border-radius: 50%; border: 2.5px solid transparent;
  animation: vSpin .6s linear infinite; flex-shrink: 0;
}
.vbtn-spin-gold  { border-color: rgba(255,217,102,.25); border-top-color: #ffd966; }
.vbtn-spin-green { border-color: rgba(108,250,142,.25); border-top-color: #6cfa8e; }

/* ══ SUB-MODAL BASE ════════════════════════════════════════════ */
.sub-ovl {
  position: fixed; inset: 0; z-index: 9200;
  background: rgba(0,0,0,.72); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.sub-box {
  position: relative;
  background: linear-gradient(160deg, #102d50 0%, #071828 100%);
  border: 2px solid rgba(255,220,100,.15); border-radius: 28px;
  padding: 40px 20px 28px;
  width: 100%; max-width: 340px;
  box-shadow: 0 24px 60px rgba(0,0,0,.8);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
}
.sub-box-sm { max-width: 300px; }
.x-sub { position: absolute; top: 14px; right: 14px; width: 34px; height: 34px; }

.sub-title {
  font-family: 'Chicle', cursive; font-size: 22px;
  color: #fffacd; text-align: center; letter-spacing: 2px;
  text-shadow: 0 2px 8px rgba(0,0,0,.5); margin-bottom: 4px;
}

/* ══ AVATAR PICKER ═════════════════════════════════════════════ */
.sub-hint { font-size: 11px; color: rgba(255,245,200,.35); text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px; }

.emoji-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; width: 100%; margin-top: 4px; }

.emoji-btn {
  font-size: 30px; line-height: 1; width: 52px; height: 52px;
  border-radius: 14px; border: none; background: rgba(255,255,255,.06);
  cursor: pointer; transition: .18s;
  display: flex; align-items: center; justify-content: center;
}
.emoji-btn:hover { background: rgba(255,217,102,.18); transform: scale(1.15); box-shadow: 0 4px 12px rgba(255,200,60,.2); }
.emoji-active {
  background: rgba(255,217,102,.25) !important;
  border: 2px solid rgba(255,217,102,.6) !important;
  box-shadow: 0 0 14px rgba(255,200,60,.3) !important;
  transform: scale(1.1);
}

/* ══ EMAIL MODAL ═══════════════════════════════════════════════ */
.email-icon-wrap {
  width: 64px; height: 64px; border-radius: 50%;
  background: radial-gradient(circle, rgba(57,185,255,.18), rgba(10,30,60,.5));
  border: 2px solid rgba(57,185,255,.3);
  display: flex; align-items: center; justify-content: center; margin-bottom: 4px;
}
.email-big-icon { font-size: 32px; color: #39b9ff; }

.email-display {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 18px; border-radius: 14px; width: 100%;
  background: rgba(57,185,255,.08); border: 1px solid rgba(57,185,255,.2); margin: 6px 0;
}
.email-text { font-size: 14px; font-weight: 700; color: #c8e8ff; word-break: break-all; }
.email-note { font-size: 11.5px; color: rgba(255,245,200,.3); text-align: center; line-height: 1.5; padding: 0 8px; margin-bottom: 4px; }

.btn-close-email {
  margin-top: 8px; padding: 10px 32px; border-radius: 20px;
  border: 1px solid rgba(255,255,255,.15); background: rgba(255,255,255,.07);
  color: rgba(255,245,200,.6); font-size: 13px; font-weight: 700; cursor: pointer; transition: .2s;
}
.btn-close-email:hover { background: rgba(255,255,255,.14); color: #fff; }

/* ══ SUB-MODAL TRANSITION ══════════════════════════════════════ */
.sub-fade-enter-active { transition: opacity .3s; }
.sub-fade-leave-active { transition: opacity .25s; }
.sub-fade-enter-from, .sub-fade-leave-to { opacity: 0; }
.sub-fade-enter-active .sub-box { animation: subZoom .3s ease-out; }
.sub-fade-leave-active .sub-box { animation: subOut  .25s ease-in forwards; }

@keyframes subZoom { from { opacity:0; transform:scale(.6); } to { opacity:1; transform:scale(1); } }
@keyframes subOut  { from { opacity:1; transform:scale(1);  } to { opacity:0; transform:scale(.6); } }
@keyframes spin    { to { transform: rotate(360deg); } }
</style>
