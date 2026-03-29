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

      <h2 class="mtitle">PROFILE</h2>

      <!-- ── Avatar + Identity (flex row) ──────────────────── -->
      <div class="profile-header">

        <!-- Avatar avec bouton edit coin bas-droit -->
        <div class="avatar-wrap">
          <div class="avatar-ring">
            <div class="avatar-emoji">{{ currentAvatar }}</div>
            <div v-if="avatarSaving" class="avatar-saving-spin"></div>
          </div>
          <button
            class="btn-edit-avatar"
            @click="showAvatarPicker = true"
            :disabled="avatarSaving"
            title="Change avatar"
          >
            <span class="material-icons">edit</span>
          </button>
        </div>

        <!-- Username + UID flex amin'ilay avatar -->
        <div class="identity-block">
          <div class="p-name">{{ username }}</div>
          <div class="p-uid">
            <span class="material-icons uid-icon">tag</span>
            {{ userUid }}
          </div>
        </div>

      </div>

      <!-- ── Balance ───────────────────────────────────────── -->
      <div class="balance-card">
        <span class="material-icons balance-icon">account_balance_wallet</span>
        <div class="balance-info">
          <span class="balance-label">Balance</span>
          <span class="balance-amount">{{ Number(wallet).toLocaleString() }}</span>
        </div>
        <span class="balance-unit">pts</span>
      </div>

      <!-- ── Action Buttons ─────────────────────────────────── -->
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

    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       AVATAR PICKER SUB-MODAL
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
import { ref, watch } from 'vue'

const props = defineProps({
  show:     { type: Boolean, default: false },
  username: { type: String,  default: 'Player' },
  userUid:  { type: String,  default: '000000000' },
  wallet:   { type: [Number, String], default: 0 },
  avatar:   { type: String,  default: '👨' },
})

const emit = defineEmits(['close', 'open-social', 'avatar-updated'])

const localVisible    = ref(false)
const closing         = ref(false)
const currentAvatar   = ref(props.avatar)
const showAvatarPicker = ref(false)
const avatarSaving    = ref(false)
const showEmailModal  = ref(false)
const userEmail       = ref('')
const emailLoading    = ref(false)

const AVATARS = [
  // People
  '👨','👩','🧔','👱','🧑','👴','👵','👦','👧','🧕',
  // Fantasy / Roles
  '🧙','🧝','🦸','🦹','🧑‍🚀','👮','🕵️','👷','🤴','👸',
  // Animals
  '🦁','🐯','🐺','🦊','🐻','🐼','🐨','🦝','🐮','🐧',
  // Fun / Wild
  '😎','🤩','😈','💀','👽','🤖','🃏','🎭','🔥','⚡',
]

watch(() => props.show, (val) => {
  if (val) {
    currentAvatar.value = props.avatar
    localVisible.value  = true
    closing.value       = false
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
  } catch { /* keep previous on error */ }
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
  z-index: 2000;
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

/* ══ PROFILE HEADER — flex row: avatar gauche + identity droite ═ */
.profile-header {
  display: flex; align-items: center;
  gap: 18px; margin-bottom: 20px;
}

/* ── Avatar wrap (relative pour positionner le btn edit) ── */
.avatar-wrap {
  position: relative; flex-shrink: 0;
}

.avatar-ring {
  position: relative;
  width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,217,102,.18) 0%, rgba(10,30,60,.6) 100%);
  border: 3px solid rgba(255, 217, 102, .45);
  box-shadow: 0 0 24px rgba(255,200,60,.18), 0 6px 18px rgba(0,0,0,.5);
  display: flex; align-items: center; justify-content: center;
}

.avatar-emoji {
  font-size: 46px; line-height: 1; user-select: none;
}

.avatar-saving-spin {
  position: absolute; inset: -4px; border-radius: 50%;
  border: 3px solid transparent; border-top-color: #ffd966;
  animation: spin .7s linear infinite;
}

/* ── Bouton edit: icône seule, coin bas-droit du ring ── */
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
.btn-edit-avatar:hover:not(:disabled) {
  transform: scale(1.15);
  box-shadow: 0 4px 14px rgba(255,200,60,.4);
}
.btn-edit-avatar:disabled { opacity: .5; cursor: not-allowed; }

/* ── Identity (flex column, centré verticalement) ── */
.identity-block {
  display: flex; flex-direction: column;
  justify-content: center; gap: 6px; min-width: 0;
}

.p-name {
  font-size: 22px; font-weight: 900; color: #fffbe6;
  letter-spacing: .5px; text-shadow: 0 2px 8px rgba(0,0,0,.4);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.p-uid {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 12px; border-radius: 20px; align-self: flex-start;
  background: rgba(255,255,255,.06);
  border: 1px solid rgba(255,220,100,.15);
  font-size: 12px; font-weight: 600; color: rgba(255,245,200,.5);
  letter-spacing: 1.5px;
}
.uid-icon { font-size: 13px; color: rgba(255,220,100,.4); }

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

/* ══ ACTION BUTTONS ════════════════════════════════════════════ */
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
