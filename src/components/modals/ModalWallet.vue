<template>
  <div 
    v-if="localVisible" 
    :class="['ovl', closing ? 'off' : 'on']" 
    id="modal-wallet" 
    @click.self="handleClose"
  >
    <div class="mdl gl">
      <button class="x flex-c" @click="handleClose">
        <span class="material-icons">close</span>
      </button>

      <h2 class="mtitle mtitle-lg">Portefeuille</h2>

      <div class="balance-card">
        <div class="balance-info">
          <span class="balance-label">Solde</span>
          <span class="balance-amount">{{ balance }}</span>
        </div>
        <span class="balance-unit">Ar</span>
      </div>

      <!-- Mbola tsy misy fonction ireto button roa ireto (jereo eo
           ambany) — tsy misy "alert"/"prompt" mihitsy raha tsindrina. -->
      <div class="mdl-btns">
        <button class="mdl-btn btn-dep">
          <span class="material-icons">add_circle</span>
          <span>Ajouter des fonds</span>
        </button>

        <button class="mdl-btn btn-out">
          <span class="material-icons">remove_circle</span>
          <span>Retirer des fonds</span>
        </button>
      </div>

      <div class="wallet-history-link">Historique des transactions</div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ show: Boolean, wallet: { type: [Number, String], default: 0 } })
const emit  = defineEmits(['close'])

const localVisible = ref(false)
const closing      = ref(false)
const balance      = ref(0)

watch(() => props.show, (val) => {
  if (val) {
    balance.value       = Number(props.wallet) || 0
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

const handleClose = () => emit('close')
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

.x {
  position: absolute; top: 16px; right: 18px; width: 38px; height: 38px;
  border-radius: 50%; background: rgba(220, 80, 70, .8);
  border: none; font-size: 28px; color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: .2s;
}
.x:hover { background: #e06a5a; transform: scale(1.15) rotate(90deg); }

/* ══ TITRE (mitovy design/habe amin'ny "OPTIONS" ao ModalSettings.vue) ══ */
.mtitle { color:#fffacd; font-family:'Chicle',cursive; text-align:center; letter-spacing:2px; text-shadow:0 4px 8px rgba(0,0,0,.5); }
.mtitle-lg { font-size:38px; margin-bottom:25px; }

/* ══ SOLDE (mitovy design amin'ny .balance-card ao ModalProfile.vue) ══ */
.balance-card {
  display: flex; align-items: center;
  padding: 14px 18px; border-radius: 18px; margin-bottom: 22px;
  background: linear-gradient(135deg, rgba(255,200,50,.1), rgba(255,160,20,.06));
  border: 1px solid rgba(255,200,80,.2);
  box-shadow: 0 4px 16px rgba(0,0,0,.3);
}
.balance-info   { display: flex; flex-direction: column; flex: 1; }
.balance-label  { font-size: 10px; font-weight: 700; color: rgba(255,245,200,.4); text-transform: uppercase; letter-spacing: 1.5px; }
.balance-amount { font-size: 26px; font-weight: 900; color: #ffd966; line-height: 1.1; }
.balance-unit   { font-size: 11px; font-weight: 700; color: rgba(255,217,102,.4); text-transform: uppercase; letter-spacing: 1px; align-self: flex-end; padding-bottom: 4px; }

/* ══ ACTION BUTTONS (mitovy design amin'ny .abtn/.vbtn ao ModalProfile.vue) ══ */
.mdl-btns {
  display: flex;
  flex-direction: column;
}
.mdl-btns > * + * { margin-top: 10px; }

.mdl-btn {
  display: flex; align-items: center;
  padding: 14px 18px; border-radius: 16px; border: none;
  cursor: pointer; transition: .25s; font-size: 14px; font-weight: 700;
  letter-spacing: .5px; text-align: left; width: 100%;
}
.mdl-btn > * + * { margin-left: 12px; }
.mdl-btn .material-icons { font-size: 20px; flex-shrink: 0; }

.btn-dep {
  background: linear-gradient(135deg, rgba(43,239,122,.12), rgba(15,168,68,.08));
  border: 1px solid rgba(43,239,122,.25); color: #7fffc4;
}
.btn-dep:hover {
  background: linear-gradient(135deg, rgba(43,239,122,.22), rgba(15,168,68,.16));
  box-shadow: 0 6px 20px rgba(43,200,100,.2); transform: translateY(-1px);
}
.btn-dep .material-icons { color: #2bef7a; }

.btn-out {
  background: linear-gradient(135deg, rgba(220,80,80,.13), rgba(160,30,30,.07));
  border: 1px solid rgba(220,80,80,.28); color: #ff8080;
}
.btn-out:hover {
  background: linear-gradient(135deg, rgba(220,80,80,.22), rgba(160,30,30,.14));
  box-shadow: 0 6px 20px rgba(220,80,80,.2); transform: translateY(-1px);
}
.btn-out .material-icons { color: #ff8080; }

/* ══ HISTORIQUE (soratra fotsiny, misy taipika — tsy endrika button,
   mbola tsy misy fonction hasina, jereo Home.vue/ModalWallet.vue) ══ */
.wallet-history-link {
  text-align: center;
  margin-top: 18px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,245,200,.55);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color .2s;
}
.wallet-history-link:hover { color: rgba(255,245,200,.85); }

.flex-c {
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>
