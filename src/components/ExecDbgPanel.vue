<template>
  <div class="exec-dbg-panel" ref="panelRef" :style="panelStyle">
    <div class="panel-header" @mousedown="startDrag">
      <h3>指令执行器调试器 <span class="comp-id" v-if="componentId">[{{ componentId }}]</span></h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    <div class="panel-body">
      <div class="cpu-status">
        <div class="status-indicator" :class="{ running: execState.running, halted: execState.flags.HALT }">
          {{ execState.running ? '运行中' : (execState.flags.HALT ? '已停机' : '已停止') }}
        </div>
      </div>

      <div class="registers-section">
        <h4>寄存器</h4>
        <div class="register-grid">
          <div v-for="(val, name) in execState.registers" :key="name" class="register-item">
            <span class="reg-name">{{ name }}</span>
            <span class="reg-value" :class="{ changed: changedRegs.includes(name) }">
              {{ formatValue(val) }}
            </span>
          </div>
        </div>
      </div>

      <div class="flags-section">
        <h4>标志位</h4>
        <div class="flag-grid">
          <div class="flag-item" :class="{ active: execState.flags.ZERO }">
            <span class="flag-name">Z</span>
            <span class="flag-desc">零标志</span>
          </div>
          <div class="flag-item" :class="{ active: execState.flags.CARRY }">
            <span class="flag-name">C</span>
            <span class="flag-desc">进位标志</span>
          </div>
          <div class="flag-item" :class="{ active: execState.flags.HALT }">
            <span class="flag-name">H</span>
            <span class="flag-desc">停机标志</span>
          </div>
        </div>
      </div>

      <div class="pc-section">
        <h4>程序计数器</h4>
        <div class="pc-value">PC = {{ formatValue(execState.pc) }}</div>
      </div>

      <div class="ir-section">
        <h4>当前指令</h4>
        <div class="ir-value">IR = {{ formatHex(execState.ir) }}</div>
        <div class="ir-decode">{{ decodedInstruction }}</div>
      </div>

      <div class="controls-section">
        <button class="btn btn-run" @click="$emit('run')" :disabled="execState.running || execState.flags.HALT">
          运行
        </button>
        <button class="btn btn-step" @click="$emit('step')" :disabled="execState.flags.HALT">
          单步
        </button>
        <button class="btn btn-pause" @click="$emit('pause')" :disabled="!execState.running">
          暂停
        </button>
        <button class="btn btn-reset" @click="$emit('reset')">
          复位
        </button>
      </div>

      <div class="memory-section">
        <h4>ROM 内容</h4>
        <div class="memory-view">
          <div v-for="(row, idx) in memoryRows" :key="idx" class="mem-row">
            <span class="mem-addr">{{ formatHex(row.addr) }}</span>
            <span class="mem-words">
              <span v-for="(word, wIdx) in row.words" :key="wIdx" 
                    class="mem-word" 
                    :class="{ current: row.addr + wIdx === execState.pc }">
                {{ formatHex(word) }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onUnmounted } from 'vue'
import { decodeInstruction } from '../constants/assemblyInstructions'

const props = defineProps({
  execState: {
    type: Object,
    required: true
  },
  romData: {
    type: Array,
    default: () => []
  },
  changedRegs: {
    type: Array,
    default: () => []
  },
  componentId: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['close', 'run', 'step', 'pause', 'reset'])

// 拖动功能
const panelRef = ref(null)
const dragPos = ref({ x: 340, y: 0 })
const isDragging = ref(false)
const dragStartPos = ref({ x: 0, y: 0 })
const dragStartOffset = ref({ x: 0, y: 0 })

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
  const dx = e.clientX - dragStartPos.value.x
  const dy = e.clientY - dragStartPos.value.y
  dragPos.value = {
    x: dragStartOffset.value.x + dx,
    y: dragStartOffset.value.y + dy
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

const decodedInstruction = computed(() => {
  if (props.execState.ir === 0) return 'NOP'
  try {
    const decoded = decodeInstruction(props.execState.ir)
    const name = decoded.name
    const a = decoded.regA
    const b = decoded.regB
    const imm = decoded.imm
    const addr8 = (b << 4) | imm

    switch (name) {
      case 'LOAD': return `LOAD R${a}, [0x${addr8.toString(16).toUpperCase()}]`
      case 'STORE': return `STORE R${a}, [0x${addr8.toString(16).toUpperCase()}]`
      case 'ADD': return `ADD R${a}, R${b}`
      case 'SUB': return `SUB R${a}, R${b}`
      case 'AND': return `AND R${a}, R${b}`
      case 'OR': return `OR R${a}, R${b}`
      case 'NOT': return `NOT R${a}`
      case 'JMP': return `JMP 0x${addr8.toString(16).toUpperCase()}`
      case 'JZ': return `JZ R${a}, 0x${addr8.toString(16).toUpperCase()}`
      case 'JNZ': return `JNZ R${a}, 0x${addr8.toString(16).toUpperCase()}`
      case 'MOV': return `MOV R${a}, R${b}`
      case 'LDI': return `LDI R${a}, 0x${imm.toString(16).toUpperCase()}`
      case 'SHL': return `SHL R${a}`
      case 'SHR': return `SHR R${a}`
      case 'CMP': return `CMP R${a}, R${b}`
      case 'HALT': return 'HALT'
      default: return name
    }
  } catch {
    return '未知指令'
  }
})

const memoryRows = computed(() => {
  const rows = []
  const wordsPerRow = 4
  const data = props.romData || []

  for (let i = 0; i < Math.min(data.length, 64); i += wordsPerRow) {
    const addr = i
    const words = []
    for (let j = 0; j < wordsPerRow; j++) {
      words.push(data[i + j] || 0)
    }
    rows.push({ addr, words })
  }
  return rows
})

function formatValue(val) {
  const hex = '0x' + val.toString(16).toUpperCase().padStart(4, '0')
  return `${hex} (${val})`
}

function formatHex(val) {
  return '0x' + (val || 0).toString(16).toUpperCase().padStart(4, '0')
}
</script>

<style scoped>
.exec-dbg-panel {
  position: absolute;
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  width: 320px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  z-index: 100;
  max-height: 80vh;
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

.panel-header h3 {
  margin: 0;
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}

.comp-id {
  font-size: 10px;
  color: #666;
  font-weight: 400;
  margin-left: 4px;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.close-btn:hover {
  color: #fff;
  background: #c42b1c;
}

.panel-body {
  padding: 12px;
  flex: 1;
  overflow-y: auto;
}

h4 {
  color: #4a9eff;
  font-size: 10px;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.cpu-status {
  margin-bottom: 12px;
}

.status-indicator {
  padding: 6px 12px;
  border-radius: 4px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  background: #2d2d2d;
  color: #888;
  border: 1px solid #3c3c3c;
}

.status-indicator.running {
  background: #00aa4418;
  color: #4ec9b0;
  border-color: #00aa44;
}

.status-indicator.halted {
  background: #ff444418;
  color: #ff6b6b;
  border-color: #ff4444;
}

.registers-section,
.flags-section,
.pc-section,
.ir-section,
.memory-section {
  margin-bottom: 16px;
}

.register-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
}

.register-item {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  padding: 6px 8px;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.reg-name {
  color: #4a9eff;
  font-family: monospace;
  font-weight: 600;
  font-size: 11px;
}

.reg-value {
  color: #e0e0e0;
  font-family: monospace;
  font-size: 11px;
}

.reg-value.changed {
  color: #dcdcaa;
  animation: flash 0.3s ease-in-out;
}

@keyframes flash {
  0%, 100% { background: transparent; }
  50% { background: #dcdcaa30; }
}

.flag-grid {
  display: flex;
  gap: 5px;
}

.flag-item {
  flex: 1;
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  padding: 6px 4px;
  border-radius: 4px;
  text-align: center;
}

.flag-item.active {
  background: #4ec9b015;
  border-color: #4ec9b0;
}

.flag-name {
  color: #e0e0e0;
  font-family: monospace;
  font-size: 14px;
  font-weight: 600;
  display: block;
}

.flag-desc {
  color: #888;
  font-size: 8px;
  display: block;
  margin-top: 2px;
}

.pc-value,
.ir-value {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  padding: 6px 8px;
  border-radius: 4px;
  font-family: monospace;
  color: #e0e0e0;
  font-size: 12px;
  margin-bottom: 4px;
}

.ir-decode {
  color: #4ec9b0;
  font-family: monospace;
  font-size: 11px;
  padding: 6px 8px;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
}

.controls-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-bottom: 16px;
}

.btn {
  padding: 8px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-run { background: #00aa44; color: #fff; }
.btn-run:hover:not(:disabled) { background: #00cc55; }

.btn-step { background: #0078d4; color: #fff; }
.btn-step:hover:not(:disabled) { background: #1a8ae8; }

.btn-pause { background: #dcdcaa; color: #000; }
.btn-pause:hover:not(:disabled) { background: #e0e0b0; }

.btn-reset { background: #ff6b6b; color: #fff; }
.btn-reset:hover:not(:disabled) { background: #ff8080; }

.memory-view {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 6px;
  max-height: 200px;
  overflow-y: auto;
}

.mem-row {
  display: flex;
  gap: 8px;
  padding: 2px 4px;
  font-family: monospace;
  font-size: 10px;
}

.mem-addr {
  color: #dcdcaa;
  min-width: 50px;
}

.mem-words {
  display: flex;
  gap: 6px;
}

.mem-word {
  color: #888;
  padding: 2px 4px;
  border-radius: 2px;
}

.mem-word.current {
  color: #4ec9b0;
  background: #4ec9b020;
}
</style>
