<template>
  <Teleport to="body">
    <Transition name="cfm-fade">
      <div v-if="visible" class="cfm-ovl" @click.self="!loading && cancel()">
        <div class="cfm-box">
          <div class="cfm-icon">
            <span class="material-icons">{{ icon }}</span>
          </div>
          <p class="cfm-title">{{ title }}</p>
          <p v-if="message" class="cfm-msg">{{ message }}</p>
          <div class="cfm-btns">
            <button class="cfm-btn cfm-cancel" :disabled="loading" @click="cancel">{{ cancelLabel }}</button>
            <button
              class="cfm-btn cfm-confirm"
              :class="'cfm-' + type"
              :disabled="loading"
              @click="confirm"
            >
              <span v-if="loading" class="cfm-spin"></span>
              <span v-else>{{ confirmLabel }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue:   { type: Boolean, default: false },
  title:        { type: String,  default: 'Are you sure?' },
  message:      { type: String,  default: '' },
  confirmLabel: { type: String,  default: 'Confirm' },
  cancelLabel:  { type: String,  default: 'Cancel' },
  type:         { type: String,  default: 'danger' },
  icon:         { type: String,  default: 'warning_amber' },
  // loading: true rehefa miandry ny API response — miseho spinner eo amin'ny confirm button
  loading:      { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = v })

// Tsy mikatona automatique — ny parent no mikatona rehefa vita ny API call
const confirm = () => {
  if (props.loading) return
  emit('confirm')
}
const cancel = () => {
  if (props.loading) return
  visible.value = false
  emit('update:modelValue', false)
  emit('cancel')
}
</script>

<style scoped>
.cfm-ovl {
  position: fixed; inset: 0; z-index: 9100;
  background: rgba(0,0,0,.65); backdrop-filter: blur(3px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}

.cfm-box {
  background: linear-gradient(to bottom, #0f2a4a, #071828);
  border: 2px solid rgba(255,255,255,.12);
  border-radius: 24px;
  padding: 32px 24px 24px;
  width: 100%; max-width: 320px;
  display: flex; flex-direction: column; align-items: center;
  gap: 10px; text-align: center;
  box-shadow: 0 20px 60px rgba(0,0,0,.7);
}

.cfm-icon .material-icons { font-size: 44px; opacity: .85; }
.cfm-box .cfm-icon { color: #ff6b6b; }

.cfm-title { color: #fff9e0; font-size: 16px; font-weight: 800; margin: 4px 0 0; }
.cfm-msg   { color: rgba(255,245,200,.45); font-size: 12.5px; line-height: 1.5; }

.cfm-btns { display: flex; gap: 10px; margin-top: 14px; width: 100%; }

.cfm-btn {
  flex: 1; height: 40px; border: none; border-radius: 20px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: filter .2s, transform .15s;
}
.cfm-btn:hover:not(:disabled) { filter: brightness(1.15); transform: scale(1.03); }
.cfm-btn:disabled { opacity: .65; cursor: not-allowed; }

.cfm-cancel {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  color: rgba(255,245,200,.6);
}

.cfm-danger  { background: rgba(220,50,50,.85);  border: 1px solid rgba(255,80,80,.5);   color: #fff; }
.cfm-warning { background: rgba(200,140,0,.85);  border: 1px solid rgba(255,200,50,.5);  color: #fff; }
.cfm-info    { background: rgba(30,120,220,.85); border: 1px solid rgba(80,160,255,.5);  color: #fff; }

/* Spinner eo amin'ny confirm button */
@keyframes cfmSpin { to { transform: rotate(360deg); } }
.cfm-spin {
  display: inline-block; width: 16px; height: 16px;
  border-radius: 50%; border: 2.5px solid rgba(255,255,255,.25);
  border-top-color: #fff;
  animation: cfmSpin .65s linear infinite;
}

/* Transition */
.cfm-fade-enter-active { transition: opacity .4s; }
.cfm-fade-leave-active { transition: opacity .4s; }
.cfm-fade-enter-from, .cfm-fade-leave-to { opacity: 0; }

.cfm-fade-enter-active .cfm-box { animation: cfmZoom .4s ease-out forwards; }
.cfm-fade-leave-active .cfm-box { animation: cfmOut  .4s ease-in  forwards; }

@keyframes cfmZoom {
  0%   { opacity: 0; transform: scale(.5); }
  50%  { opacity: 1; transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes cfmOut {
  0%   { transform: scale(1);  opacity: 1; }
  100% { transform: scale(.4); opacity: 0; }
}
</style>
