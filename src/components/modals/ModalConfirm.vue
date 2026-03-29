<template>
  <Teleport to="body">
    <Transition name="cfm-fade">
      <div v-if="visible" class="cfm-ovl" @click.self="cancel">
        <div class="cfm-box">
          <div class="cfm-icon">
            <span class="material-icons">{{ icon }}</span>
          </div>
          <p class="cfm-title">{{ title }}</p>
          <p v-if="message" class="cfm-msg">{{ message }}</p>
          <div class="cfm-btns">
            <button class="cfm-btn cfm-cancel" @click="cancel">{{ cancelLabel }}</button>
            <button class="cfm-btn cfm-confirm" :class="'cfm-' + type" @click="confirm">{{ confirmLabel }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title:        { type: String,  default: 'Are you sure?' },
  message:      { type: String,  default: '' },
  confirmLabel: { type: String,  default: 'Confirm' },
  cancelLabel:  { type: String,  default: 'Cancel' },
  // type: 'danger' | 'warning' | 'info'
  type:         { type: String,  default: 'danger' },
  // icon material-icons name
  icon:         { type: String,  default: 'warning_amber' },
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const visible = ref(props.modelValue)
watch(() => props.modelValue, v => { visible.value = v })

const confirm = () => {
  visible.value = false
  emit('update:modelValue', false)
  emit('confirm')
}
const cancel = () => {
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

.cfm-icon .material-icons {
  font-size: 44px;
  opacity: .85;
}

/* icon color by type */
.cfm-title { color: #fff9e0; font-size: 16px; font-weight: 800; margin: 4px 0 0; }
.cfm-msg   { color: rgba(255,245,200,.45); font-size: 12.5px; line-height: 1.5; }

.cfm-btns {
  display: flex; gap: 10px; margin-top: 14px; width: 100%;
}

.cfm-btn {
  flex: 1; height: 40px; border: none; border-radius: 20px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  transition: filter .2s, transform .15s;
}
.cfm-btn:hover { filter: brightness(1.15); transform: scale(1.03); }

.cfm-cancel {
  background: rgba(255,255,255,.08);
  border: 1px solid rgba(255,255,255,.15);
  color: rgba(255,245,200,.6);
}

/* type=danger */
.cfm-danger {
  background: rgba(220,50,50,.85);
  border: 1px solid rgba(255,80,80,.5);
  color: #fff;
}

/* type=warning */
.cfm-warning {
  background: rgba(200,140,0,.85);
  border: 1px solid rgba(255,200,50,.5);
  color: #fff;
}

/* type=info */
.cfm-info {
  background: rgba(30,120,220,.85);
  border: 1px solid rgba(80,160,255,.5);
  color: #fff;
}

/* icon tint */
.cfm-box .cfm-icon { color: #ff6b6b; }

/* Transition */
.cfm-fade-enter-active, .cfm-fade-leave-active { transition: opacity .2s, transform .2s; }
.cfm-fade-enter-from, .cfm-fade-leave-to { opacity: 0; transform: scale(.92); }
</style>
