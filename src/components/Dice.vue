<!--
  Dice.vue — kazy 3D azo tsindriana (roll). Nalaina avy amin'ny
  prototype HTML/CSS/JS nomena, nadika ho fomba Vue fotsiny
  (<script setup>, reactive state, v-for ho an'ny "face"/"dot" mba tsy
  hamerina fanindroany ny markup mitovy) — TSY niova ny lojika (curX/
  curY cumulative, "front" face ihany no miova valeur tsy hita mandritra
  ny fihodinana, 500ms rolling, "pressed"/"bounce" animation) na ny
  design (transform 3D, couleur) an'ilay dice, afa-tsy ny habe (nasiana
  ambony kely), ny "interactive" prop (jereo Game.vue: ny mpilalao
  ihany no mahazo mitsindry ny dice-ny manokana, tsy azo atsindrian'ny
  adversaire, ary tsy azo atsindrina mandritra ny fihodinana), ary ny
  "valin'ny roll": TSY io Dice.vue io intsony no mamorona (Math.random)
  ilay isa 1-6 — ny SERVER (api/game.js) no manapa-kevitra izany.
  Solon'izay dia "playRoll(value)" (defineExpose, antsoin'i Game.vue)
  no mampiseho ilay valiny NAPETRAKY ny backend tamin'ny animation
  mitovy amin'ny teo aloha; ny "press" (fitsindriana ny mpampiasa) dia
  "emit" fotsiny ankehitriny (@roll-request), Game.vue no mandray izay
  hatao (mijery ny valiny efa "prefetch", mampiantso ny playRoll, ary
  mandefa ny fangatahana any amin'ny server).
-->
<template>
  <div class="scene" :class="{ pressed, bounce: bouncing }">
    <div
      class="cube"
      :class="{ rolling, 'not-interactive': !interactive }"
      :style="{ transform: `rotateX(${rotX}deg) rotateY(${rotY}deg)` }"
      @mousedown="press"
      @touchstart.passive="press"
    >
      <div
        v-for="face in faces"
        :key="face.key"
        :class="['face', face.key]"
        :data-value="face.value"
      >
        <span v-for="d in DOT_KEYS" :key="d" class="dot" :class="d"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, onUnmounted } from 'vue'

// "interactive" — ny mpampiasa ihany no tokony hahazo mitsindry ny
// dice-ny manokana (jereo Game.vue: isMine.<couleur> + tour-ny), tsy
// azo atsindrian'ny adversaire ny an'ny hafa.
const props = defineProps({
  interactive: { type: Boolean, default: true },
})
// "roll-request" — tsindrian'ny mpampiasa ilay dice (mousedown/touchstart
// + release), fa TSY io Dice.vue io no manapaka izay hatao amin'izany
// (tsy mamorona valiny, tsy manomboka animation) — Game.vue no mandray
// io "signal" io, mijery ny valiny efa "prefetch" avy amin'ny server,
// dia miantso ny "playRoll(value)" eto ambany.
const emit = defineEmits(['roll-request'])

const DOT_KEYS = ['tl', 'tr', 'ml', 'c', 'mr', 'bl', 'br']

const faces = reactive([
  { key: 'front',  value: 6 },
  { key: 'right',  value: 2 },
  { key: 'top',    value: 3 },
  { key: 'bottom', value: 4 },
  { key: 'left',   value: 5 },
  { key: 'back',   value: 6 },
])

const pressed  = ref(false)
const bouncing = ref(false)
const rolling  = ref(false)
const rotX     = ref(0)
const rotY     = ref(0)

let bounceTimer = null
let rollTimer   = null

const press = () => {
  // Tsy azo atsindrina: 1) ny dice an'ny adversaire na ny tsy tour-ny
  // (jereo "interactive"), na 2) mandritra ny fihodinana mbola tsy vita
  // (jereo "rolling" — mba tsy hisy hetsika (na dia ny "pressed" squish
  // animation fotsiny aza) mandritra izany, ka tena tapitra tsara ny
  // movement vao azo atsindrina indray, na dia tsindrina haingana
  // indroa aza).
  if (!props.interactive || rolling.value) return
  bouncing.value = false
  pressed.value = true
}

const release = () => {
  if (!pressed.value) return
  pressed.value = false
  bouncing.value = true
  clearTimeout(bounceTimer)
  bounceTimer = setTimeout(() => { bouncing.value = false }, 180)
  emit('roll-request')
}

// "playRoll(value)" — antsoin'i Game.vue (defineExpose eo ambany), tsy
// io Dice.vue io no mifidy ny isa (efa napetraky ny server/prefetch,
// jereo Game.vue) — ny animation ihany (rotation cumulative sy ny
// 500ms "rolling") no mijanona eto.
const playRoll = (value) => {
  if (rolling.value) return
  rolling.value = true

  const front = faces.find(f => f.key === 'front')
  front.value = value

  // Fihetsehana tokana mitovy hatrany (cumulative — tsy averina ho 0).
  rotX.value += 360
  rotY.value += 720

  clearTimeout(rollTimer)
  rollTimer = setTimeout(() => { rolling.value = false }, 500)
}
defineExpose({ playRoll })

onMounted(() => {
  window.addEventListener('mouseup', release)
  window.addEventListener('touchend', release)
  window.addEventListener('touchcancel', release)
})
onUnmounted(() => {
  window.removeEventListener('mouseup', release)
  window.removeEventListener('touchend', release)
  window.removeEventListener('touchcancel', release)
  clearTimeout(bounceTimer)
  clearTimeout(rollTimer)
})
</script>

<style scoped>
.scene {
  perspective: 900px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(0) scale(1);
  transition: transform 0.15s ease-out;
}

.scene.pressed {
  transform: translateY(2px) scale(0.92);
  transition: transform 0.08s ease-out;
}

.scene.bounce {
  transform: translateY(-10px) scale(1.02);
  transition: transform 0.18s cubic-bezier(.34, 1.56, .64, 1);
}

.cube {
  position: relative;
  width: 40px;
  height: 40px;
  transform-style: preserve-3d;
  transition: transform 0.5s cubic-bezier(.34, 1.15, .64, 1);
  cursor: pointer;
}

.cube.not-interactive {
  cursor: default;
}

.cube.rolling {
  transition: transform 0.5s cubic-bezier(.45, 0, .3, 1);
}

.face {
  position: absolute;
  width: 40px;
  height: 40px;
  background: #f3f0ea;
  border: 1px solid #cfc9bb;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgba(0,0,0,0.03);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 5px;
  box-sizing: border-box;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2b2622;
  align-self: center;
  justify-self: center;
  visibility: hidden;
}

.tl { grid-area: 1 / 1; } .tr { grid-area: 1 / 3; }
.ml { grid-area: 2 / 1; } .c  { grid-area: 2 / 2; } .mr { grid-area: 2 / 3; }
.bl { grid-area: 3 / 1; } .br { grid-area: 3 / 3; }

.face[data-value="1"] .c { visibility: visible; }
.face[data-value="1"] .dot.c {
  background: #9c2020;
  width: 12px;
  height: 12px;
}
.face[data-value="2"] .tl,
.face[data-value="2"] .br { visibility: visible; }
.face[data-value="3"] .tl,
.face[data-value="3"] .c,
.face[data-value="3"] .br { visibility: visible; }
.face[data-value="4"] .tl,
.face[data-value="4"] .tr,
.face[data-value="4"] .bl,
.face[data-value="4"] .br { visibility: visible; }
.face[data-value="5"] .tl,
.face[data-value="5"] .tr,
.face[data-value="5"] .c,
.face[data-value="5"] .bl,
.face[data-value="5"] .br { visibility: visible; }
.face[data-value="6"] .tl,
.face[data-value="6"] .tr,
.face[data-value="6"] .ml,
.face[data-value="6"] .mr,
.face[data-value="6"] .bl,
.face[data-value="6"] .br { visibility: visible; }

.front  { transform: translateZ(20px); }
.back   { transform: rotateY(180deg) translateZ(20px); }
.right  { transform: rotateY(90deg) translateZ(20px); }
.left   { transform: rotateY(-90deg) translateZ(20px); }
.top    { transform: rotateX(90deg) translateZ(20px); }
.bottom { transform: rotateX(-90deg) translateZ(20px); }
</style>
