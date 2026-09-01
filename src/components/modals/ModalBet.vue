<template>
  <Teleport to="body">
    <div
      v-if="localVisible"
      :class="['ovl', closing ? 'off' : 'on']"
      id="modal-multiplayer"
      @click.self="handleClose"
    >
      <div class="mdl" ref="mdlRef" @click="closeColorPopup">

        <button class="x flex-c" @click="handleClose">
          <span class="material-icons">close</span>
        </button>

        <h2 class="mtitle mtitle-sm">{{ modeTitle }}</h2>
        <p class="mp-sub">{{ modeSubtitle }}</p>

        <!-- ── Grille des mises (3 en haut / 3 en bas) ── -->
        <div class="stake-grid">
          <button
            v-for="s in STAKES"
            :key="s.value"
            type="button"
            :class="['stake-card', { 'stake-active': selectedStake === s.value, 'stake-unaffordable': !isAffordable(s.value) }]"
            :disabled="busy || isViewMode"
            @click="selectStake(s)"
          >
            <span class="stake-amount">{{ s.label }}</span>
          </button>
        </div>

        <!-- ── Mot de passe (mode "Créer"/"invite"/"settings"/"view", tsy
             miseho amin'ny Multijoueur) — amin'ny mode "view" (icône "i",
             utilisateur invité): tsy miseho ilay "mp-pwd-info" (S4), ary
             tsy miseho ny "mp-pwd-row" manontolo raha public ny salon
             (tsy activé ny mot de passe — "mise fotsiny" no miseho, jereo
             showPasswordSection/isViewMode) ── -->
        <template v-if="showPasswordSection">
          <p v-if="!isViewMode" class="mp-pwd-info">Mot de passe : table privée si défini.</p>
          <div v-if="!isViewMode || usePassword" class="mp-pwd-row">
            <div class="mp-pwd-check-wrap">
              <input
                id="mp-pwd-toggle"
                type="checkbox"
                class="mp-pwd-checkbox"
                v-model="usePassword"
                :disabled="busy || isViewMode"
              />
            </div>
            <div v-if="!isViewMode" class="mp-pwd-input-wrap">
              <input
                :type="passwordVisible ? 'text' : 'password'"
                class="mp-pwd-input"
                v-model="password"
                placeholder="Mot de passe du salon"
                :disabled="!usePassword || busy"
              />
              <button
                type="button"
                class="mp-pwd-eye"
                :disabled="!usePassword || busy"
                :aria-label="passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                @click="passwordVisible = !passwordVisible"
              >
                <span class="material-icons">{{ passwordVisible ? 'visibility_off' : 'visibility' }}</span>
              </button>
            </div>
            <!-- Mode "view": tsy ny input mot de passe (tsy fantatry ny
                 client ny valeur marina) no aseho, fa soratra manambara
                 fa privé ilay table. -->
            <span v-else class="mp-pwd-view-lbl">Protégé par un mot de passe.</span>
          </div>
        </template>

        <!-- ══════════════════════════════════════════════════════════
             Cadre "Utilisateur" (lisitry ny 4 emplacement) + checkbox
             "L'hôte choisit la couleur" : miasa raha PRIVÉ ihany. Miseho
             avy hatrany amin'ny mode "settings" (na manindry ny checkbox
             mot de passe na tsy manindry), fa amin'ny mode "create" kosa
             dia tsy miseho raha tsy efa voatsindry ilay checkbox
             "Mot de passe" (transition height) ──────────────────────────
             ══════════════════════════════════════════════════════════ -->
        <div
          v-if="isSettingsMode || isCreateOnlyMode || isViewMode"
          class="cfg-colorpick-wrap"
          :class="{ 'cfg-open': colorPickRowOpen }"
        >
          <div class="cfg-users">
            <div
              v-for="(u, i) in displaySlots"
              :key="'cfgu-' + i"
              :class="['cfg-user', { 'cfg-user-empty': !u, 'cfg-user-pickable': isSettingsMode && u && colorPickEnabled }]"
              :style="(colorPickEnabled && u) ? { borderColor: SLOT_COLORS[i].border, background: SLOT_COLORS[i].bg } : {}"
              @click.stop="toggleColorPopup(i, $event)"
            >
              <template v-if="u">
                <span class="cfg-user-ava">{{ u.avatar || '👤' }}</span>
                <span class="cfg-user-mid">
                  <span class="cfg-user-name">{{ u.username }}</span>
                  <span v-if="u.uid === displayHostUid" class="cfg-user-host">Hôte</span>
                </span>
              </template>
              <template v-else>
                <span class="cfg-user-ava cfg-user-ava-empty material-icons">person_outline</span>
                <span class="cfg-user-mid">
                  <span class="cfg-user-name cfg-user-name-empty">Emplacement libre</span>
                </span>
              </template>
            </div>
          </div>

          <!-- Mode "view": tsy miseho ity andalana ity mihitsy raha tsy
               activé ilay mot de passe (public ny salon — tsy misy
               dikany "L'hôte choisit la couleur" raha tsy privé). -->
          <div v-if="!isViewMode || usePassword" class="mp-pwd-row cfg-colorpick-row">
            <div class="mp-pwd-check-wrap">
              <input
                id="cfg-colorpick-toggle"
                type="checkbox"
                class="mp-pwd-checkbox"
                v-model="colorPickEnabled"
                :disabled="!usePassword || busy || isViewMode"
              />
            </div>
            <span class="cfg-colorpick-lbl">
              L'hôte choisit la couleur des joueurs
            </span>
          </div>
        </div>

        <!-- ══════════════════════════════════════════════════════════
             Popup cadre kely : mode "settings" ihany, rehefa manindry
             utilisateur (tsy raha place foana). Mampiseho ny anarany +
             button efatra couleur (✓ amin'ilay couleur ananany) —
             mitovy lojika amin'ilay "popup-card" ao amin'i
             ModalSocial.vue fa kely kokoa ny width ──────────────────
             ══════════════════════════════════════════════════════════ -->
        <Transition name="pop-anim">
          <div
            v-if="popupVisible"
            class="cfg-pop-card"
            :style="popupStyle"
            @click.stop
          >
            <div class="cfg-pop-name">{{ popupUser?.username }}</div>
            <div class="cfg-pop-grid">
              <button
                v-for="c in popupColors"
                :key="'pop-' + c.key"
                type="button"
                class="cfg-pop-btn"
                :style="{ borderColor: c.border }"
                @click="pickColor(c.key)"
              >
                <span>{{ c.label }}</span>
                <span v-if="popupUserColorKey === c.key" class="material-icons cfg-pop-check">check</span>
              </button>
            </div>
          </div>
        </Transition>

        <!-- ── Bouton recherche / confirmation (tsy miseho amin'ny mode
             "view" — mijery fotsiny, jereo isViewMode) ── -->
        <button
          v-if="!isViewMode"
          class="mp-search-btn"
          type="button"
          :disabled="!canConfirm || busy"
          @click="handleConfirm"
        >
          <span class="material-icons" :class="{ 'mp-spin': searching }">
            {{ (isCreateMode || isSettingsMode) ? 'check_circle' : (searching ? 'loop' : 'search') }}
          </span>
          {{ (isCreateMode || isSettingsMode) ? 'Confirmer' : (searching ? 'Recherche en cours…' : 'Rechercher un adversaire') }}
        </button>

      </div>
    </div>
  </Teleport>

  <!-- ── Confirmation avant d'appliquer les changements (mode "settings") ── -->
  <ModalConfirm
    v-model="showSettingsConfirm"
    title="Modifier les paramètres du salon ?"
    message="Les changements seront appliqués immédiatement pour tous les joueurs présents."
    icon="tune"
    type="info"
    confirm-label="Confirmer"
    cancel-label="Annuler"
    :loading="settingsSaving"
    @confirm="confirmSettingsChange"
    @cancel="cancelSettingsChange"
  />

  <!-- ── Erreurs ── -->
  <Notification
    :message="errorMsg"
    type="error"
    :duration="4000"
    @close="errorMsg = ''"
  />
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import Notification from './Notification.vue'
import ModalConfirm from './ModalConfirm.vue'
import { fetchWithTimeout } from '../../utils/network'

const API_ROOM = '/api/room'

const props = defineProps({
  show:     { type: Boolean, default: false },
  myUid:    { type: String,  default: '' },
  myName:   { type: String,  default: 'Player' },
  myAvatar: { type: String,  default: '👤' },
  mode:     { type: String,  default: 'search' },
  // "wallet" — solden'ny mpampiasa mandritra ny fotoana (Ar). Ampiasaina
  // hamantarana ny Mise tsy ampy azo, jereo isAffordable/selectStake eo
  // ambany — "null" (default) midika tsy misy fifehezana (fallback raha
  // tsy nampitaina io prop io na aiza na aiza).
  wallet:           { type: Number,  default: null },
  roomId:           { type: String,  default: '' },
  initialStake:     { type: Number,  default: null },
  initialPrivate:   { type: Boolean, default: false },
  initialColorPick: { type: Boolean, default: false },
  slots:            { type: Array,   default: () => [null, null, null, null] },
  hostUid:          { type: String,  default: '' },
})
const emit = defineEmits(['close', 'match-found', 'stake-confirmed', 'settings-updated'])
const isSettingsMode = computed(() => props.mode === 'settings')
// "view" — icône "i" ao amin'ny ModalRoom.vue (utilisateur invité, tsy
// Hôte): mitovy amin'ny "settings" ny fiaraha-mizara ny données (jereo
// displaySlots/displayHostUid/colorPickRowOpen etsy ambany, ary ny
// watch(props.show) ao ambany), fa "lecture seule" avokoa — tsy misy
// button "Confirmer", ary disabled avokoa ny input/stake.
const isViewMode = computed(() => props.mode === 'view')
const isCreateMode = computed(() => props.mode === 'create' || props.mode === 'invite')
const isCreateOnlyMode = computed(() => props.mode === 'create')
const showPasswordSection = computed(() => isCreateMode.value || isSettingsMode.value || isViewMode.value)
const modeTitle = computed(() => {
  if (isViewMode.value) return 'Informations du salon'
  if (isSettingsMode.value) return 'Paramètres du salon'
  return isCreateMode.value ? 'Créer une table' : 'Multijoueur'
})
const modeSubtitle = computed(() => {
  if (isViewMode.value) return 'Consultez les paramètres du salon.'
  if (isSettingsMode.value) return 'Choisissez la mise de la table.'
  return isCreateMode.value ? 'Choisissez la mise de la table' : 'Choisissez votre mise'
})

// ── Couleurs des emplacements ─────────────
const SLOT_COLORS = [
  { key: 'red',    label: 'Rouge', border: 'rgba(255,77,46,.7)',  bg: 'linear-gradient(160deg, rgba(255,77,46,.16), rgba(60,10,5,.3))'  },
  { key: 'green',  label: 'Vert',  border: 'rgba(43,239,122,.7)', bg: 'linear-gradient(160deg, rgba(43,239,122,.16), rgba(5,50,20,.3))' },
  { key: 'blue',   label: 'Bleu',  border: 'rgba(57,185,255,.7)', bg: 'linear-gradient(160deg, rgba(57,185,255,.16), rgba(5,25,50,.3))' },
  { key: 'yellow', label: 'Jaune', border: 'rgba(255,229,92,.7)', bg: 'linear-gradient(160deg, rgba(255,229,92,.16), rgba(50,40,5,.3))'  },
]

// ── Mises disponibles ─────────────────────────────────────────
const STAKES = [
  { value: 100,   label: '100ar'   },
  { value: 200,   label: '200ar'   },
  { value: 500,   label: '500ar'   },
  { value: 1000,  label: '1 000ar' },
  { value: 2000,  label: '2 000ar' },
  { value: 5000,  label: '5 000ar' },
]

const selectedStake = ref(null)
const searching       = ref(false)
const errorMsg         = ref('')

// ── Mise tsy ampy solde — jereo ny <button class="stake-card"> etsy
// ambony: TSY atao "disabled" HTML (mba hijanona ny effect "press" CSS
// ".stake-card:active"), fa ny selectStake eto no misakana ny fanoratana
// ilay Mise ho "selectedStake" ary mampiseho Notification kosa.
const isAffordable = (v) => props.wallet == null || v <= props.wallet
const selectStake = (s) => {
  if (busy.value || isViewMode.value) return
  if (!isAffordable(s.value)) {
    errorMsg.value = ''
    setTimeout(() => { errorMsg.value = 'Solde insuffisant pour cette mise.' }, 30)
    return
  }
  selectedStake.value = s.value
}
const usePassword = ref(false)
const password    = ref('')
const passwordVisible = ref(false)

// ── Mode "settings" : "L'hôte choisit la couleur" ──────────────────────
const colorPickEnabled = ref(false)
watch(usePassword, (val) => { if (!val) colorPickEnabled.value = false })
watch(colorPickEnabled, (val) => { if (!val) closeColorPopup() })
const colorPickRowOpen = computed(() => isSettingsMode.value || isViewMode.value || usePassword.value)

// Mode "settings"/"view"
const localOrder = ref([null, null, null, null])
const initialOrderVal = ref([null, null, null, null])

// Mode "create"
const displaySlots = computed(() => {
  if (isSettingsMode.value || isViewMode.value) {
    const byUid = {}
    props.slots.forEach(s => { if (s) byUid[s.uid] = s })
    return localOrder.value.map(u => u ? (byUid[u] || null) : null)
  }
  return [
    { uid: props.myUid, username: props.myName, avatar: props.myAvatar },
    null, null, null,
  ]
})
const displayHostUid = computed(() => (isSettingsMode.value || isViewMode.value) ? props.hostUid : props.myUid)

const initialStakeVal      = ref(null)
const initialPrivateVal    = ref(false)
const initialColorPickVal  = ref(false)

const stakeChanged      = computed(() => isSettingsMode.value && selectedStake.value !== initialStakeVal.value)
const privateChanged    = computed(() => isSettingsMode.value && usePassword.value !== initialPrivateVal.value)
const passwordProvided  = computed(() => isSettingsMode.value && usePassword.value && !!password.value.trim())
const colorPickChanged  = computed(() => isSettingsMode.value && colorPickEnabled.value !== initialColorPickVal.value)
const orderChanged = computed(() => isSettingsMode.value &&
  JSON.stringify(localOrder.value) !== JSON.stringify(initialOrderVal.value))
const hasSettingsChanges = computed(() => stakeChanged.value || privateChanged.value || passwordProvided.value || colorPickChanged.value || orderChanged.value)

const passwordMissing = computed(() => {
  if (!usePassword.value) return false
  if (password.value.trim()) return false
  return !(isSettingsMode.value && initialPrivateVal.value)
})

// ── Confirmation avant d'appliquer les changements (mode "settings") ──
const showSettingsConfirm = ref(false)
const settingsSaving      = ref(false)

const busy = computed(() => searching.value || settingsSaving.value)

const mdlRef = ref(null)
const popupIndex = ref(-1)
const popupTop  = ref(0)
const popupLeft = ref(0)
const POPUP_WIDTH = 132

const popupVisible = computed(() => popupIndex.value !== -1)
const popupUser = computed(() => popupIndex.value !== -1 ? displaySlots.value[popupIndex.value] : null)
const popupUserColorKey = computed(() => popupIndex.value !== -1 ? SLOT_COLORS[popupIndex.value].key : null)
const popupStyle = computed(() => ({ top: popupTop.value + 'px', left: popupLeft.value + 'px', width: POPUP_WIDTH + 'px' }))
const popupColors = ['red', 'green', 'blue', 'yellow'].map(key => SLOT_COLORS.find(c => c.key === key))

const closeColorPopup = () => { popupIndex.value = -1 }

const toggleColorPopup = async (i, event) => {
  if (!isSettingsMode.value || busy.value || !colorPickEnabled.value) return
  if (!displaySlots.value[i]) return
  if (popupIndex.value === i) { closeColorPopup(); return }
  popupIndex.value = i
  await nextTick()
  const mdlEl  = mdlRef.value
  const cardEl = event.currentTarget
  if (!mdlEl || !cardEl) return
  const mdlRect  = mdlEl.getBoundingClientRect()
  const cardRect = cardEl.getBoundingClientRect()
  const maxLeft = Math.max(mdlEl.clientWidth - POPUP_WIDTH - 12, 12)
  popupLeft.value = Math.min(Math.max((cardRect.left - mdlRect.left) + 20, 12), maxLeft)
  popupTop.value  = (cardRect.bottom - mdlRect.top) - 9
}

const pickColor = (colorKey) => {
  if (popupIndex.value === -1) return
  const targetIdx = SLOT_COLORS.findIndex(c => c.key === colorKey)
  if (targetIdx === -1 || targetIdx === popupIndex.value) { closeColorPopup(); return }
  const arr = localOrder.value.slice()
  const tmp = arr[popupIndex.value]
  arr[popupIndex.value] = arr[targetIdx]
  arr[targetIdx] = tmp
  localOrder.value = arr
  closeColorPopup()
}

const canConfirm = computed(() => {
  if (!selectedStake.value) return false
  if (passwordMissing.value) return false
  if (isSettingsMode.value) return hasSettingsChanges.value
  return true
})

const localVisible = ref(false)
const closing       = ref(false)

const handleClose = () => { if (!busy.value) emit('close') }

const authHeaders = () => {
  const token = localStorage.getItem('user_token')
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

const handleConfirm = async () => {
  if (!selectedStake.value || busy.value) return

  if (isSettingsMode.value) {
    if (!canConfirm.value) return
    showSettingsConfirm.value = true
    return
  }

  // ── Mode "Créer" ────────────────────────────────────────────
  if (isCreateMode.value) {
    if (!canConfirm.value) return
    const pwd = usePassword.value ? password.value.trim() : ''
    emit('stake-confirmed', {
      stake:             selectedStake.value,
      password:          pwd || null,
      colorPickEnabled:  isCreateOnlyMode.value ? colorPickEnabled.value : false,
    })
    return
  }

  searching.value = true
  try {
    const res = await fetchWithTimeout(`${API_ROOM}?action=find-match`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({
        uid:      props.myUid,
        username: props.myName,
        avatar:   props.myAvatar,
        stake:    selectedStake.value,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.roomId) {
      errorMsg.value = ''
      setTimeout(() => { errorMsg.value = data.message || "Impossible de trouver une partie. Réessayez." }, 30)
      return
    }
    emit('match-found', { roomId: data.roomId, stake: selectedStake.value })
  } catch (e) {
    setTimeout(() => { errorMsg.value = e?.message || 'Erreur réseau. Réessayez.' }, 30)
  } finally {
    searching.value = false
  }
}

// ── Mode "settings"
const confirmSettingsChange = async () => {
  if (settingsSaving.value) return
  settingsSaving.value = true
  try {
    const pwd = usePassword.value ? password.value.trim() : ''
    const res = await fetchWithTimeout(`${API_ROOM}?action=update-room-settings`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({
        uid:              props.myUid,
        roomId:           props.roomId,
        stake:            selectedStake.value,
        private:          usePassword.value,
        password:         pwd,
        colorPickEnabled: colorPickEnabled.value,
        slotsOrder:       localOrder.value,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok || !data.success) {
      showSettingsConfirm.value = false
      errorMsg.value = ''
      setTimeout(() => { errorMsg.value = data.message || "Impossible de modifier ce salon." }, 30)
      return
    }
    showSettingsConfirm.value = false
    emit('settings-updated', {
      stake:            selectedStake.value,
      private:          usePassword.value,
      colorPickEnabled: colorPickEnabled.value,
    })
    emit('close')
  } catch (e) {
    showSettingsConfirm.value = false
    setTimeout(() => { errorMsg.value = e?.message || 'Erreur réseau. Réessayez.' }, 30)
  } finally {
    settingsSaving.value = false
  }
}
const cancelSettingsChange = () => {
  showSettingsConfirm.value = false
}

watch(() => props.show, val => {
  if (val) {
    localVisible.value = true
    closing.value = false
    searching.value = false
    errorMsg.value = ''
    showSettingsConfirm.value = false
    settingsSaving.value = false
    document.body.style.overflow = 'hidden'
    popupIndex.value = -1

    if (isSettingsMode.value || isViewMode.value) {
      selectedStake.value    = props.initialStake ?? null
      usePassword.value      = !!props.initialPrivate
      password.value         = ''
      passwordVisible.value  = false
      colorPickEnabled.value = !!props.initialColorPick
      initialStakeVal.value     = props.initialStake ?? null
      initialPrivateVal.value   = !!props.initialPrivate
      initialColorPickVal.value = !!props.initialColorPick
      const order = props.slots.map(s => s ? s.uid : null)
      localOrder.value      = order
      initialOrderVal.value = [...order]
    } else {
      selectedStake.value    = null
      usePassword.value      = false
      password.value         = ''
      passwordVisible.value  = false
      colorPickEnabled.value = false
    }
  } else {
    closing.value = true
    popupIndex.value = -1
    setTimeout(() => {
      localVisible.value = false
      closing.value = false
      document.body.style.overflow = 'auto'
    }, 400)
  }
})
</script>

<style scoped>
/* ══ Thème mitovy amin'i ModalSocial.vue ══════════════════════ */
.ovl {
  position:fixed; inset:0; background:rgba(0,0,0,.6);
  backdrop-filter:blur(1px);
  /* z-index:5500 — mihoatra ny an'i ModalRoom.vue (.ovl { z-index:5000 }),
     satria ity ModalBet.vue ity dia miseho koa avy anaty ModalRoom.vue
     (icône "settings", mode="settings") ka tsy maintsy miseho ambony
     kokoa noho izy raha tsy izany dia takona any ambany ilay ModalRoom. */
  display:flex; place-content:center; place-items:center; z-index:5500;
}
.ovl.on  { display:flex; }
.ovl.off { animation:kFade .4s forwards; }

.mdl {
  border-radius:32px; padding:40px 22px 28px;
  width:90%; max-width:440px;
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

#modal-multiplayer { --gd:#ffd966; --tg:#fff9e0; }

.x {
  position:absolute; top:16px; right:18px;
  width:38px; height:38px; border-radius:50%;
  background:rgba(220,80,70,.8); border:none; color:#fff; cursor:pointer;
  display:flex; align-items:center; justify-content:center; transition:.2s;
}
.x:hover { background:#e06a5a; transform:scale(1.15) rotate(90deg); }

.mtitle { color:#fffacd; font-family:'Chicle',cursive; text-align:center; letter-spacing:2px; text-shadow:0 4px 8px rgba(0,0,0,.5); }
.mtitle-sm { font-size:28px; margin-bottom:6px; }

.mp-sub {
  text-align:left; font-size:11.5px; font-weight:800; line-height:1.3;
  color:rgba(255,245,200,.55); margin-bottom:10px;
}

.flex-c { display:flex; align-items:center; justify-content:center; }

/* ══ Grille des mises ══════════════════════════════════════════ */
.stake-grid {
  display:grid; grid-template-columns:repeat(3, 1fr);
  gap:10px; margin-bottom:22px;
}

.stake-card {
  display:flex; align-items:center; justify-content:center;
  padding:18px 6px;
  background:rgba(255,255,220,.07); border:1px solid rgba(255,240,160,.18);
  border-radius:16px; cursor:pointer;
  transition:background .15s, border-color .15s, transform .1s;
}
.stake-card:hover { background:rgba(255,255,220,.12); border-color:rgba(255,240,160,.3); }
.stake-card:active { transform:scale(.97); }
.stake-card:disabled { opacity:.5; cursor:not-allowed; }
.stake-active {
  background:rgba(255,220,100,.16) !important;
  border-color:rgba(255,220,100,.5) !important;
  box-shadow:0 0 14px rgba(255,200,60,.25);
}
/* Mise tsy ampy solde — ny loko (opacity) ihany no atao "disabled",
   fa mijanona azo tsindriana ny button (jereo selectStake ao <script>:
   TSY mamorona "selectedStake" fa mampiseho Notification kosa). */
.stake-unaffordable { opacity:.45; }
.stake-unaffordable:hover { background:rgba(255,255,220,.07); border-color:rgba(255,240,160,.18); }

.stake-amount { font-size:15px; font-weight:800; color:var(--tg); letter-spacing:.3px; }
.stake-active .stake-amount { color:var(--gd); }

/* ══ Mot de passe (mode "Créer") ═══════════════════════════════ */
.mp-pwd-info {
  font-size:11.5px; font-weight:800; line-height:1.3;
  color:rgba(255,245,200,.55); margin-bottom:10px;
}

.mp-pwd-row {
  display:flex; align-items:center;
  margin-bottom:22px;
}
.mp-pwd-row > * + * { margin-left:10px; }

/* Cadre fonosana ny checkbox, mitovy haavo amin'ilay input mot de passe */
.mp-pwd-check-wrap {
  flex-shrink:0; width:40px; height:40px; box-sizing:border-box;
  display:flex; align-items:center; justify-content:center;
  background:rgba(255,255,220,.07); border:1px solid rgba(255,240,160,.18);
  border-radius:12px;
}
.mp-pwd-checkbox {
  width:18px; height:18px; cursor:pointer;
  accent-color:#ffd966; opacity:.5;
}
.mp-pwd-checkbox:checked { opacity:1; }
.mp-pwd-checkbox:disabled { cursor:not-allowed; }

.mp-pwd-input-wrap { position:relative; flex:1; min-width:0; height:40px; }
/* Mode "view" — soratra fotsiny (tsy input), misolo ny .mp-pwd-input-wrap */
.mp-pwd-view-lbl { flex:1; min-width:0; font-size:12.5px; font-weight:700; color:rgba(255,245,200,.65); }
.mp-pwd-input {
  width:100%; height:40px; box-sizing:border-box;
  background:rgba(255,255,220,.07); border:1px solid rgba(255,240,160,.18);
  border-radius:12px; padding:0 40px 0 12px;
  color:#fff9e0; font-size:13px; font-weight:600;
}
.mp-pwd-input::placeholder { color:rgba(255,245,200,.35); }
.mp-pwd-input:disabled { opacity:.4; cursor:not-allowed; }
.mp-pwd-input:focus { outline:none; border-color:rgba(255,220,100,.5); }

.mp-pwd-eye {
  position:absolute; top:0; right:0; height:100%; width:38px;
  border:none; background:none; color:rgba(255,245,200,.5); cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.mp-pwd-eye:disabled { opacity:.4; cursor:not-allowed; }
.mp-pwd-eye .material-icons { font-size:18px; }

/* ══ Mode "settings" : lisitry ny utilisateur efatra ═══════════════ */
.cfg-users {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  margin-bottom: 18px;
}

/* Cadre : mitovy border/background amin'ilay bouton "Annuler" ao
   amin'i ModalConfirm.vue (.cfm-cancel) — miova ho couleur ny slot
   raha "colorPickEnabled" ary misy mpilalao ao anatiny. */
.cfg-user {
  display: flex; align-items: center;
  padding: 9px 12px;
  box-sizing: border-box; min-width: 0;
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  border-radius: 14px;
  transition: border-color .2s;
}
.cfg-user-empty { opacity: .6; }
.cfg-user-pickable { cursor: pointer; }
.cfg-user-pickable:hover { border-color: rgba(255,255,255,.35); }

.cfg-user-ava { font-size: 22px; width: 30px; text-align: center; flex-shrink: 0; margin-right: 10px; }
.cfg-user-ava-empty { font-size: 20px; color: rgba(255,245,200,.35); display: flex; align-items: center; justify-content: center; }

.cfg-user-mid { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.cfg-user-mid > * + * { margin-top: 2px; }
.cfg-user-name { font-size: 13px; font-weight: 700; color: var(--tg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cfg-user-name-empty { color: rgba(255,245,200,.4); font-weight: 600; font-style: italic; }
.cfg-user-host {
  align-self: flex-start; font-size: 9px; font-weight: 800; text-transform: uppercase;
  letter-spacing: .4px; color: var(--gd); background: rgba(255,220,100,.18);
  border-radius: 8px; padding: 1px 6px;
}

/* ══ Checkbox "L'hôte choisit la couleur" : accordéon (mode "create") ══ */
.cfg-colorpick-wrap {
  max-height: 0; opacity: 0; overflow: hidden;
  margin-bottom: 0;
  transition: max-height .3s ease, opacity .25s ease, margin-bottom .3s ease;
}
.cfg-colorpick-wrap.cfg-open {
  max-height: 320px; opacity: 1; margin-bottom: 22px;
}
.cfg-colorpick-row { margin-bottom: 0; }
.cfg-colorpick-lbl { flex: 1; font-size: 11.5px; font-weight: 800; line-height: 1.3; color: rgba(255,245,200,.55); }

/* ══ Popup cadre kely "couleur" (mitovy amin'i ModalSocial.vue,
     fa kely kokoa ny width — 132px fa tsy 180px) ══════════════════ */
.cfg-pop-card {
  position: absolute; z-index: 60;
  background: linear-gradient(to bottom, #0d3060, #071828);
  border: 1.5px solid rgba(255,220,100,.3);
  border-radius: 14px;
  padding: 8px; display: flex; flex-direction: column;
  box-shadow: 0 8px 30px rgba(0,0,0,.7);
}
.cfg-pop-card > * + * { margin-top: 5px; }
.pop-anim-enter-active, .pop-anim-leave-active { transition: opacity .15s, transform .15s; }
.pop-anim-enter-from, .pop-anim-leave-to { opacity: 0; transform: scaleY(.85); transform-origin: top left; }

.cfg-pop-name {
  font-size: 11.5px; font-weight: 800; color: var(--tg);
  padding: 4px 6px 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cfg-pop-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 5px;
}
.cfg-pop-btn {
  display: flex; align-items: center; justify-content: center;
  padding: 6px 2px; border-radius: 8px; width: 100%; box-sizing: border-box;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.15);
  color: var(--tg); font-size: 10px; font-weight: 700; cursor: pointer;
  transition: background .15s, transform .1s;
}
.cfg-pop-btn:hover { background: rgba(255,255,255,.12); transform: scale(1.02); }
.cfg-pop-btn > * + * { margin-left: 3px; }
.cfg-pop-check { font-size: 13px; color: var(--gd); }

/* ══ Bouton recherche ═══════════════════════════════════════════ */
.mp-search-btn {
  display:flex; align-items:center; justify-content:center;
  border:1px solid rgba(255,200,80,.4); border-radius:20px;
  background:rgba(255,200,80,.15); color:var(--gd);
  font-size:14px; font-weight:800; letter-spacing:.3px;
  padding:14px; cursor:pointer; transition:filter .2s, transform .15s;
}
.mp-search-btn:hover:not(:disabled) { filter:brightness(1.15); transform:scale(1.01); }
.mp-search-btn:disabled { opacity:.5; cursor:not-allowed; filter:none; transform:none; }
/* "margin-right" (fa tsy "gap"/"> * + *") satria soratra "bare" no
   manaraka ny icone anaty .mp-search-btn. */
.mp-search-btn .material-icons { font-size:19px; margin-right:8px; }
.mp-spin { animation:mpSpin 1.1s linear infinite; }
@keyframes mpSpin { to { transform:rotate(360deg); } }
</style>
