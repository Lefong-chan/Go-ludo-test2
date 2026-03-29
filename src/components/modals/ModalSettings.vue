<template>
  <div 
    v-if="localVisible" 
    :class="['ovl', closing ? 'off' : 'on']"
    id="modal-settings"
    @click.self="handleClose"
  >
    <div class="mdl gl">
      <button class="x" @click="handleClose">
        <span class="material-icons">close</span>
      </button>
      
      <h2 class="mtitle mtitle-lg">OPTIONS</h2>

      <div class="settings-list">
        <div class="si">
          <span class="si-lbl">
            <span class="material-icons" style="vertical-align: middle;">language</span>
            <span>Region</span>
          </span>
          <span id="lang" @click="toggleLang">{{ lang }}</span>
        </div>

        <div class="si">
          <span class="si-lbl">
            <span class="material-icons" style="vertical-align: middle;">volume_up</span>
            <span>SFX</span>
          </span>
          <label class="tgl">
            <input type="checkbox" v-model="sfx">
            <span class="sldr"></span>
          </label>
        </div>

        <div class="si">
          <span class="si-lbl">
            <span class="material-icons" style="vertical-align: middle;">bolt</span>
            <span>VFX</span>
          </span>
          <label class="tgl">
            <input type="checkbox" v-model="vfx">
            <span class="sldr"></span>
          </label>
        </div>
      </div>

      <div class="signout-wrap">
        <button class="btn-signout" @click="handleSignOut">
          <span class="material-icons">logout</span>
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  </div>

  <ModalConfirm
    v-model="showConfirm"
    title="Hivoaka ny kaonty ianao?"
    message="Hadinoina ny session ary tsy maintsy hiditra indray ianao."
    confirmLabel="MIVOAKA"
    cancelLabel="FOANA"
    icon="logout"
    type="danger"
    :loading="logoutLoading"
    @confirm="doLogout"
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import ModalConfirm   from './ModalConfirm.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const localVisible  = ref(false)
const closing       = ref(false)
const lang          = ref('English')
const sfx           = ref(true)
const vfx           = ref(true)

// ── Sign Out state ────────────────────────────────────────────
const showConfirm   = ref(false)
const logoutLoading = ref(false)

watch(() => props.show, (val) => {
  if (val) {
    localVisible.value = true
    closing.value      = false
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

const handleClose = () => {
  emit('close')
}

const toggleLang = () => {
  lang.value = lang.value === 'English' ? 'Malagasy' : 'English'
}

const handleSignOut = () => {
  showConfirm.value = true
}

const doLogout = async () => {
  logoutLoading.value = true

  try {
    const token = localStorage.getItem('user_token')
    await fetch('/api/auth?action=logout', {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    })
  } catch {
  }

  localStorage.clear()

  window.location.replace('/')
}
</script>

<style scoped>

.ovl {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .6);
  backdrop-filter: blur(1px);
  display: flex;
  place-content: center;
  place-items: center;
  z-index: 2000;
  transition: .3s;
}

.ovl.on { display: flex; }
.ovl.off { animation: kFade .4s forwards; }

.mdl {
  border-radius: 32px;
  padding: 40px 24px 30px;
  width: 85%;
  max-width: 340px;
  position: relative;
  color: #fff9e0;
  background: linear-gradient(to bottom, #0f4a82, #08264a);
  border: 4px solid rgba(255, 255, 255, 0.1);
}

/* Animations */
.on .mdl { animation: kZoom .4s ease-out forwards; }
.off .mdl { animation: kOut .4s ease-in forwards; }

@keyframes kZoom {
  0%   { opacity: 0; transform: scale(.5); }
  50%  { opacity: 1; transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes kOut {
  0%   { transform: scale(1); opacity: 1; }
  100% { transform: scale(.4); opacity: 0; }
}
@keyframes kFade { to { opacity: 0; } }

/* Close Button (X) */
.x {
  position: absolute; top: 16px; right: 18px; width: 38px; height: 38px;
  border-radius: 50%; background: rgba(220, 80, 70, .8);
  border: 2px solid rgba(255, 255, 200, .8); font-size: 28px; color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: .2s;
  border: none;
}
.x:hover { background: #e06a5a; transform: scale(1.15) rotate(90deg); border-color: #fff; }

.mtitle {
  color: #fffacd;
  font-family: 'Chicle', cursive;
  text-align: center;
  letter-spacing: 2px;
  text-shadow: 0 4px 8px rgba(0,0,0,0.5);
  margin-bottom: 25px;
}
.mtitle-lg { font-size: 38px; }

.settings-list {
  margin-bottom: 8px;
}

.si {
  display: flex; 
  justify-content: space-between; 
  align-items: center;
  padding: 15px 8px; 
  border-bottom: 1px solid rgba(255, 255, 200, .2);
}
.si:last-child { border-bottom: none; }

.si-lbl { 
  color: #fffce0; 
  font-size: 20px; 
  font-weight: 600; 
  display: flex; 
  align-items: center; 
  gap: 10px; 
}
.si-lbl .material-icons { color: #ffecaa; }

#lang {
  background: rgba(10, 30, 18, .7); 
  padding: 8px 20px; 
  border-radius: 40px;
  font-weight: bold; 
  color: #fff3b3; 
  border: 1px solid #dbb56b; 
  cursor: pointer;
  transition: .2s;
}
#lang:hover { background: #1e4f36; color: #fff; }

/* Toggle Switch Styles */
.tgl { position: relative; display: inline-block; width: 58px; height: 30px; }
.tgl input { opacity: 0; width: 0; height: 0; }

.sldr {
  position: absolute; 
  inset: 0; 
  background: #574e3c;
  border: 1px solid #ab9e70; 
  border-radius: 30px; 
  transition: .3s; 
  cursor: pointer;
}
.sldr::before {
  content: ''; 
  position: absolute; 
  width: 24px; 
  height: 24px; 
  left: 3px; 
  bottom: 2px;
  background: #fffbd6; 
  border-radius: 50%; 
  transition: .3s;
}
input:checked + .sldr { background: #58b368; }
input:checked + .sldr::before { transform: translateX(28px); background: #fff; }


/* ─── 3. NY BOKOTRA SIGN OUT (Design manokana) ─── */

.signout-wrap {
  margin-top: 22px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 100, 80, .15);
  display: flex;
  justify-content: center;
}

.btn-signout {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 15px 24px;
  border-radius: 18px;
  border: none;
  background: linear-gradient(135deg, #7a1a10 0%, #b02a1a 50%, #8c1e12 100%);
  color: #ffe0db;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  cursor: pointer;
  transition: .3s;
  overflow: hidden;
  box-shadow:
    0 6px 22px rgba(180, 30, 15, .45),
    0 1px 0 rgba(255,160,140,.18) inset,
    0 -2px 0 rgba(0,0,0,.3) inset;
}

.btn-signout::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255, 200, 180, .18) 50%, transparent 65%);
  transform: translateX(-100%);
  transition: transform .55s ease;
}
.btn-signout:hover::before { transform: translateX(100%); }

.btn-signout:hover {
  background: linear-gradient(135deg, #961f13 0%, #cc3320 50%, #a82316 100%);
  color: #fff;
  box-shadow: 0 10px 30px rgba(180, 30, 15, .6);
  transform: translateY(-2px);
}
.btn-signout .material-icons {
  font-size: 19px;
  color: #ffb8aa;
}
.btn-signout:active {
  transform: translateY(0) scale(.97);
}

</style>
