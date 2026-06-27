<template>
  <div class="cpu-dbg-panel" ref="panelRef" :style="panelStyle">
    <div class="panel-header" @mousedown="startDrag">
      <h3>CPU 调试器 <span class="comp-id" v-if="componentId">[{{ componentId }}]</span></h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    <div class="panel-body">
      <div class="status-row">
        <div class="status-ind" :class="{ running: cpuState.running, halted: cpuState.flags.HALT }">
          {{ cpuState.running ? '运行中' : (cpuState.flags.HALT ? '已停机' : '已停止') }}
        </div>
        <div class="cycle-ind" v-if="cpuState.cyclesExecuted">
          <span class="cycle-lbl">周期</span>
          <span class="cycle-val">{{ cpuState.cyclesExecuted }}</span>
        </div>
      </div>

      <div class="reg-section">
        <div class="sec-title">寄存器</div>
        <div class="reg-grid">
          <div v-for="(val, name) in cpuState.registers" :key="name" class="reg-item">
            <span class="reg-n">{{ name }}</span>
            <span class="reg-h" :class="{ ch: changedRegs.includes(name) }">0x{{ formatHex2(val) }}</span>
            <span class="reg-b">{{ formatBin8(val) }}</span>
          </div>
        </div>
      </div>

      <div class="flag-pc-section">
        <div class="flags-wrap">
          <div class="sec-title">标志</div>
          <div class="flags">
            <div class="f" :class="{ on: cpuState.flags.ZERO }"><span class="fn">Z</span><span class="fd">零</span></div>
            <div class="f" :class="{ on: cpuState.flags.CARRY }"><span class="fn">C</span><span class="fd">进</span></div>
            <div class="f halt" :class="{ on: cpuState.flags.HALT }"><span class="fn">H</span><span class="fd">停</span></div>
          </div>
        </div>
        <div class="pcir-wrap">
          <div class="sec-title">PC/IR</div>
          <div class="pcir">
            <div class="pc"><span class="l">PC</span><span class="v">0x{{ formatHex2(cpuState.pc || 0) }}</span></div>
            <div class="ir"><span class="l">IR</span><span class="v">0x{{ formatHex4(cpuState.ir || 0) }}</span></div>
          </div>
        </div>
      </div>

      <div class="asm-section" v-if="decodedInstruction">
        <div class="asm-box">{{ decodedInstruction }}</div>
      </div>

      <div class="ctrl-section">
        <button class="ctrl-btn run" @click="$emit('run')" :disabled="cpuState.running || cpuState.flags.HALT">
          <span class="ico">▶</span><span class="txt">运行</span>
        </button>
        <button class="ctrl-btn step" @click="$emit('step')" :disabled="cpuState.flags.HALT">
          <span class="ico">⏭</span><span class="txt">单步</span>
        </button>
        <button class="ctrl-btn pause" @click="$emit('pause')" :disabled="!cpuState.running">
          <span class="ico">⏸</span><span class="txt">暂停</span>
        </button>
        <button class="ctrl-btn reset" @click="$emit('reset')">
          <span class="ico">⏹</span><span class="txt">复位</span>
        </button>
      </div>

      <div class="io-section" v-if="ioPorts.length > 0">
        <div class="sec-title">I/O 端口</div>
        <div class="io-list">
          <div v-for="port in ioPorts" :key="port.name" class="io-item">
            <span class="p-n">{{ port.name }}</span>
            <span class="p-d">{{ port.direction }}</span>
            <span class="p-v">0x{{ formatHex2(port.value) }}</span>
          </div>
        </div>
      </div>

      <div class="mem-section">
        <div class="mem-head">
          <div class="sec-title">ROM</div>
          <div class="mem-opt">
            <button class="mo-btn" :class="{ act: memViewMode === 'asm' }" @click="memViewMode = 'asm'">ASM</button>
            <button class="mo-btn" :class="{ act: memViewMode === 'hex' }" @click="memViewMode = 'hex'">HEX</button>
          </div>
        </div>
        <div class="mem-view" ref="memoryViewRef">
          <div v-for="(row, idx) in memLines" :key="idx"
               class="ml"
               :class="{ cur: row.addr === (cpuState.pc || 0), bp: breakpoints.includes(row.addr) }">
              <span class="bp-dot" @click.stop="toggleBP(row.addr)">
              {{ breakpoints.includes(row.addr) ? '●' : '○' }}
            </span>
            <span class="ml-a">0x{{ formatHex2(row.addr) }}</span>
            <template v-if="memViewMode === 'hex'">
              <span class="ml-h">0x{{ formatHex4(row.word) }}</span>
            </template>
            <template v-else>
              <span class="ml-asm">{{ row.asm }}</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onUnmounted, watch, nextTick } from 'vue'
import { decodeInstruction } from '../constants/assemblyInstructions'

const props = defineProps({
  cpuState: { type: Object, required: true },
  romData: { type: Array, default: () => [] },
  changedRegs: { type: Array, default: () => [] },
  componentId: { type: String, default: '' },
  ioOutputs: { type: Object, default: () => ({}) }
})

const emit = defineEmits(['close', 'run', 'step', 'pause', 'reset', 'toggle-breakpoint'])

const panelRef = ref(null)
const memoryViewRef = ref(null)
const dragPos = ref({ x: 0, y: 0 })
const isDragging = ref(false)
const dragStartPos = ref({ x: 0, y: 0 })
const dragStartOffset = ref({ x: 0, y: 0 })
const memViewMode = ref('asm')
const breakpoints = ref([])

const panelStyle = computed(() => ({
  left: `${dragPos.value.x}px`,
  top: `${dragPos.value.y}px`
}))

function startDrag(e) {
  if (e.target.closest('.close-btn')) return
  isDragging.value = true
  dragStartPos.value = { x: e.clientX, y: e.clientY }
  dragStartOffset.value = { ...dragPos.value }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

function onDrag(e) {
  if (!isDragging.value) return
  dragPos.value = {
    x: dragStartOffset.value.x + e.clientX - dragStartPos.value.x,
    y: dragStartOffset.value.y + e.clientY - dragStartPos.value.y
  }
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

function decodeAsm(instruction) {
  if (!instruction || instruction === 0) return 'NOP'
  try {
    const d = decodeInstruction(instruction)
    const a = d.regA
    const b = d.regB
    const imm = d.imm
    const addr8 = (b << 4) | imm
    const r = ['R0', 'R1', 'R2', 'R3']
    switch (d.name) {
      case 'LOAD': return `LOAD ${r[a]}, [0x${addr8.toString(16).toUpperCase()}]`
      case 'STORE': return `STOR ${r[a]}, [0x${addr8.toString(16).toUpperCase()}]`
      case 'ADD': return `ADD ${r[a]}, ${r[b]}`
      case 'SUB': return `SUB ${r[a]}, ${r[b]}`
      case 'AND': return `AND ${r[a]}, ${r[b]}`
      case 'OR': return `OR ${r[a]}, ${r[b]}`
      case 'NOT': return `NOT ${r[a]}`
      case 'JMP': return `JMP 0x${addr8.toString(16).toUpperCase()}`
      case 'JZ': return `JZ ${r[a]}, 0x${addr8.toString(16).toUpperCase()}`
      case 'JNZ': return `JNZ ${r[a]}, 0x${addr8.toString(16).toUpperCase()}`
      case 'MOV': return `MOV ${r[a]}, ${r[b]}`
      case 'LDI': return `LDI ${r[a]}, 0x${imm.toString(16).toUpperCase()}`
      case 'SHL': return `SHL ${r[a]}`
      case 'SHR': return `SHR ${r[a]}`
      case 'CMP': return `CMP ${r[a]}, ${r[b]}`
      case 'HALT': return 'HALT'
      default: return d.name
    }
  } catch { return '???' }
}

const decodedInstruction = computed(() => decodeAsm(props.cpuState.ir))

const ioPorts = computed(() => {
  const ports = []
  const io = props.ioOutputs
  if (!io || Object.keys(io).length === 0) return ports
  for (const [key, value] of Object.entries(io)) {
    const isIn = key.startsWith('io_in_')
    const isOut = key.startsWith('io_out_')
    if (isIn || isOut) {
      const num = key.replace('io_in_', '').replace('io_out_', '')
      ports.push({
        name: `0x${parseInt(num).toString(16).toUpperCase()}`,
        direction: isIn ? '←' : '→',
        value: value || 0
      })
    }
  }
  return ports
})

const memLines = computed(() => {
  const lines = []
  const data = props.romData || []
  const max = Math.min(data.length, 256)
  for (let i = 0; i < max; i++) {
    const word = data[i] || 0
    lines.push({ addr: i, word, asm: decodeAsm(word) })
  }
  if (lines.length === 0) lines.push({ addr: 0, word: 0, asm: 'NOP' })
  return lines
})

function toggleBP(addr) {
  const idx = breakpoints.value.indexOf(addr)
  if (idx !== -1) {
    breakpoints.value.splice(idx, 1)
  } else {
    breakpoints.value.push(addr)
  }
  breakpoints.value = [...breakpoints.value]
  emit('toggle-breakpoint', addr, breakpoints.value.includes(addr))
}

function getBreakpoints() { return breakpoints.value }
defineExpose({ getBreakpoints })

function formatHex2(v) { return (v || 0).toString(16).toUpperCase().padStart(2, '0') }
function formatHex4(v) { return (v || 0).toString(16).toUpperCase().padStart(4, '0') }
function formatBin8(v) { return (v || 0).toString(2).padStart(8, '0') }

watch(() => props.cpuState.pc, () => {
  nextTick(() => {
    if (memoryViewRef.value) {
      const cur = memoryViewRef.value.querySelector('.cur')
      if (cur) cur.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  })
})
</script>

<style scoped>
.cpu-dbg-panel {
  position: absolute;
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  width: 340px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 6px 20px rgba(0,0,0,0.5);
  z-index: 100;
  max-height: 88vh;
  font-family: system-ui, -apple-system, sans-serif;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #3c3c3c;
  cursor: move;
  user-select: none;
  background: #2a2a2a;
  border-radius: 8px 8px 0 0;
}
.panel-header h3 { margin: 0; color: #e0e0e0; font-size: 13px; font-weight: 600; }
.comp-id { font-size: 10px; color: #666; font-weight: 400; margin-left: 4px; }
.close-btn { background: none; border: none; color: #888; font-size: 18px; cursor: pointer; padding: 4px 8px; border-radius: 4px; transition: all 0.15s; }
.close-btn:hover { color: #fff; background: #c42b1c; }

.panel-body { padding: 12px; flex: 1; overflow-y: auto; }

.sec-title {
  color: #4a9eff;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 6px;
  font-weight: 600;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}
.status-ind {
  flex: 1;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  background: #2d2d2d;
  color: #888;
  border: 1px solid #3c3c3c;
}
.status-ind.running {
  background: #00aa4418;
  color: #4ec9b0;
  border-color: #00aa44;
}
.status-ind.halted {
  background: #ff444418;
  color: #ff6b6b;
  border-color: #ff4444;
}
.cycle-ind {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 6px 10px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cycle-lbl {
  color: #888;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
}
.cycle-val {
  color: #dcdcaa;
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
}

.reg-section { margin-bottom: 12px; }
.reg-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}
.reg-item {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 6px 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: monospace;
}
.reg-n {
  color: #4a9eff;
  font-size: 11px;
  font-weight: 800;
  min-width: 22px;
}
.reg-h {
  color: #4ec9b0;
  font-size: 11px;
}
.reg-h.ch {
  color: #dcdcaa;
}
.reg-b {
  color: #666;
  font-size: 8px;
}

.flag-pc-section {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}
.flags-wrap, .pcir-wrap {
  flex: 1;
}
.flags {
  display: flex;
  gap: 5px;
}
.f {
  flex: 1;
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 6px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.f.on {
  background: #4ec9b015;
  border-color: #4ec9b0;
}
.f.halt.on {
  background: #ff6b6b15;
  border-color: #ff6b6b;
}
.fn {
  color: #e0e0e0;
  font-family: monospace;
  font-size: 12px;
  font-weight: 900;
  line-height: 1;
}
.fd {
  color: #888;
  font-size: 8px;
  line-height: 1;
}
.pcir {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 6px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.pcir .pc, .pcir .ir {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: monospace;
  font-size: 11px;
}
.pcir .l {
  color: #dcdcaa;
  font-weight: 800;
}
.pcir .v {
  color: #e0e0e0;
}

.asm-section { margin-bottom: 12px; }
.asm-box {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 8px 12px;
  color: #4ec9b0;
  font-family: monospace;
  font-size: 11px;
  text-align: center;
}

.ctrl-section {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr;
  gap: 5px;
  margin-bottom: 12px;
}
.ctrl-btn {
  padding: 8px 4px;
  border: none;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.ctrl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.ctrl-btn .ico { font-size: 14px; line-height: 1; }
.ctrl-btn .txt { font-size: 9px; line-height: 1; }
.ctrl-btn.run { background: #00aa44; color: #fff; }
.ctrl-btn.run:hover:not(:disabled) { background: #00cc55; }
.ctrl-btn.step { background: #0078d4; color: #fff; }
.ctrl-btn.step:hover:not(:disabled) { background: #1a8ae8; }
.ctrl-btn.pause { background: #dcdcaa; color: #000; }
.ctrl-btn.pause:hover:not(:disabled) { background: #e0e0b0; }
.ctrl-btn.reset { background: #ff6b6b; color: #fff; }
.ctrl-btn.reset:hover:not(:disabled) { background: #ff8080; }

.io-section { margin-bottom: 12px; }
.io-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.io-item {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 4px 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: monospace;
  font-size: 10px;
}
.p-n { color: #c586c0; }
.p-d { color: #888; }
.p-v { color: #e0e0e0; }

.mem-section { }
.mem-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.mem-opt { display: flex; gap: 4px; }
.mo-btn {
  padding: 3px 10px;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  background: #2d2d2d;
  color: #888;
  font-size: 10px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.15s;
}
.mo-btn.act {
  background: #0078d4;
  color: #fff;
  border-color: #0078d4;
}
.mem-view {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 6px;
  max-height: 240px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 10px;
}
.ml {
  display: flex;
  gap: 6px;
  padding: 2px 4px;
  border-radius: 3px;
  align-items: center;
  border-left: 2px solid transparent;
}
.ml.cur { background: #ffffff12; }
.ml.bp { border-left-color: #ff6b6b; }
.ml-bp {
  min-width: 14px;
  cursor: pointer;
  user-select: none;
  text-align: center;
  color: #ff6b6b;
  font-size: 9px;
}
.ml-a {
  color: #dcdcaa;
  min-width: 30px;
}
.ml-h {
  color: #888;
}
.ml-asm {
  color: #4ec9b0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
