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

      <div style="text-align:center; margin-bottom:25px;">
        <span class="material-icons" style="font-size:56px; color:#ffde9e; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));">
          account_balance_wallet
        </span>
        <h3 style="font-family:'Chicle', cursive; font-size:28px; margin:10px 0 0; color:#fff3bf; letter-spacing: 1px;">
          Bankroll: {{ balance }} Ar
        </h3>
      </div>

      <div class="mdl-btns">
        <button class="mdl-btn btn-dep" @click="addFunds">
          <span class="material-icons">add_circle</span>
          <span>Add Funds</span>
        </button>

        <button class="mdl-btn btn-out" @click="cashOut">
          <span class="material-icons">remove_circle</span>
          <span>Cash Out</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ show: Boolean })
const emit  = defineEmits(['close'])

const localVisible = ref(false)
const closing      = ref(false)
const balance      = ref(0)

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

const handleClose = () => emit('close')

const addFunds = () => {
  const amount = prompt('Firy Ar no ampidirina?')
  if (amount && !isNaN(amount) && +amount > 0) balance.value += +amount
}

const cashOut = () => {
  const amount = prompt('Firy Ar no esorina?')
  if (amount && !isNaN(amount) && +amount > 0 && +amount <= balance.value) {
    balance.value -= +amount
  }
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
  border: 2px solid rgba(255, 255, 200, .8); font-size: 28px; color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: .2s;
}
.x:hover { background: #e06a5a; transform: scale(1.15) rotate(90deg); border-color: #fff; }

.mdl-btns {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 10px;
}

.mdl-btn {
  padding: 18px 10px;
  border-radius: 60px;
  font-size: 24px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  transition: .2s;
  box-shadow: 0 10px 15px rgba(0,0,0,0.37);
  letter-spacing: 2px;
  gap: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: 'Chicle', cursive, sans-serif;
}

.mdl-btn .material-icons { font-size: 32px; }

.btn-out {
  background: #f4acb7;
  color: #3f2a2a;
}
.btn-out:hover {
  background: #f9bec8;
  transform: scale(1.03);
}

.btn-dep {
  background: #ffd966;
  color: #1e3522;
}
.btn-dep:hover {
  background: #ffe085;
  transform: scale(1.03);
  box-shadow: 0 12px 20px rgba(0,0,0,0.5);
}

.flex-c {
  display: flex;
  align-items: center;
  justify-content: center;
}

</style>
