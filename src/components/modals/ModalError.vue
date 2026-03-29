<template>
  <Teleport to="body">
    <Transition name="err-fade">
      <div
        v-if="visible"
        class="err-toast"
        :class="'err-toast--' + type"
        role="alert"
        aria-live="assertive"
      >
        <span class="material-icons err-icon">{{ icon }}</span>
        <span class="err-msg">{{ message }}</span>
        <button class="err-close" @click="close" aria-label="Close">
          <span class="material-icons">close</span>
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, computed, onBeforeUnmount } from 'vue'

const props = defineProps({
  message: { type: String, default: '' },

  type:    { type: String, default: 'error' },

  duration: { type: Number, default: 4000 },
})

const emit = defineEmits(['close'])

const visible = ref(false)
let   timer   = null

const icon = computed(() => {
  if (props.type === 'warning') return 'warning'
  if (props.type === 'info')    return 'info'
  return 'error_outline'
})

const show = () => {
  clearTimeout(timer)
  visible.value = true
  if (props.duration > 0) {
    timer = setTimeout(close, props.duration)
  }
}

const close = () => {
  visible.value = false
  emit('close')
}

watch(() => props.message, val => {
  if (val) show()
})

onBeforeUnmount(() => clearTimeout(timer))

defineExpose({ show, close })
</script>

<style scoped>
.err-toast {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 9999;
  min-width: 260px;
  max-width: min(380px, calc(100vw - 36px));
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 14px 13px 16px;
  border-radius: 16px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.55);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  backdrop-filter: blur(6px);
  border: 1.5px solid;
  pointer-events: auto;
}

/* ── Types ── */
.err-toast--error {
  background: rgba(140, 20, 20, 0.88);
  border-color: rgba(255, 90, 90, 0.5);
  color: #ffe0e0;
}
.err-toast--warning {
  background: rgba(120, 80, 0, 0.88);
  border-color: rgba(255, 200, 50, 0.5);
  color: #fff3c0;
}
.err-toast--info {
  background: rgba(10, 55, 110, 0.92);
  border-color: rgba(100, 180, 255, 0.4);
  color: #d0eaff;
}

/* ── Icon ── */
.err-icon {
  font-size: 22px;
  flex-shrink: 0;
  opacity: 0.9;
}

/* ── Message ── */
.err-msg {
  flex: 1;
  min-width: 0;
}

/* ── Close button ── */
.err-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: inherit;
  opacity: 0.6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  transition: opacity 0.2s, background 0.2s;
}
.err-close:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
}
.err-close .material-icons {
  font-size: 17px;
}

/* ── Transition ── */
.err-fade-enter-active,
.err-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.err-fade-enter-from,
.err-fade-leave-to {
  opacity: 0;
  transform: translateX(40px) scale(0.95);
}
</style>
