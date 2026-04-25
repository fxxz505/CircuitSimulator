<template>
  <div v-if="visible" class="memory-editor-overlay" @click.self="close">
    <div class="memory-editor-dialog" :style="{ maxWidth: dataSize === 8 ? '700px' : '500px' }">
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="dialog-body">
        <div class="memory-info">
          <span>容量: {{ size }} × {{ dataSize }}位</span>
          <span v-if="isROM">只读存储器</span>
          <span v-else>随机存取存储器</span>
        </div>
        <div class="memory-grid" :class="{ 'grid-8bit': dataSize === 8 }">
          <div class="grid-header">
            <div class="addr-col">地址</div>
            <div class="hex-col">十六进制</div>
            <div class="dec-col">十进制</div>
            <div class="bin-col">二进制</div>
          </div>
          <div v-for="(_, idx) in memoryData" :key="idx" class="grid-row" :class="{ active: activeAddr === idx }">
            <div class="addr-col">{{ formatAddr(idx) }}</div>
            <div class="hex-col">
              <input
                v-if="editable"
                type="text"
                :value="formatHex(memoryData[idx])"
                @change="onHexInput(idx, $event)"
                class="mem-input"
                :maxlength="dataSize === 8 ? 2 : 1"
              />
              <span v-else>{{ formatHex(memoryData[idx]) }}</span>
            </div>
            <div class="dec-col">{{ memoryData[idx] }}</div>
            <div class="bin-col">{{ formatBin(memoryData[idx]) }}</div>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button v-if="editable" class="btn btn-primary" @click="fillSequential">顺序填充</button>
        <button v-if="editable" class="btn btn-warning" @click="clearAll">清空</button>
        <button class="btn" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  component: Object
})

const emit = defineEmits(['close'])

const visible = ref(true)
const activeAddr = ref(-1)

const comp = computed(() => props.component)

const size = computed(() => {
  if (!comp.value) return 16
  if (comp.value.type === 'ROM256' || comp.value.type === 'EXT_RAM') return 256
  return 16
})

const dataSize = computed(() => {
  if (!comp.value) return 4
  if (comp.value.type === 'ROM256' || comp.value.type === 'EXT_RAM') return 8
  return 4
})

const isROM = computed(() => {
  return comp.value?.type?.startsWith('ROM')
})

const editable = computed(() => {
  return isROM.value
})

const title = computed(() => {
  if (!comp.value) return '存储器查看器'
  const names = {
    ROM164: 'ROM 16×4 数据编辑器',
    RAM164: 'RAM 16×4 数据查看器',
    ROM256: 'ROM 256×8 数据编辑器',
    EXT_RAM: '外部RAM 256×8 数据查看器'
  }
  return names[comp.value.type] || '存储器查看器'
})

const memoryData = computed(() => {
  if (!comp.value) return []
  if (comp.value.type === 'EXT_RAM') return comp.value.state?.memory || []
  return comp.value.state
})

function formatAddr(idx) {
  if (size.value <= 16) return idx.toString(16).toUpperCase().padStart(1, '0')
  return idx.toString(16).toUpperCase().padStart(2, '0')
}

function formatHex(val) {
  if (dataSize.value === 8) return (val & 0xFF).toString(16).toUpperCase().padStart(2, '0')
  return (val & 0xF).toString(16).toUpperCase().padStart(1, '0')
}

function formatBin(val) {
  if (dataSize.value === 8) return (val & 0xFF).toString(2).padStart(8, '0')
  return (val & 0xF).toString(2).padStart(4, '0')
}

function onHexInput(idx, event) {
  const val = event.target.value.trim()
  const num = parseInt(val, 16)
  if (!isNaN(num)) {
    const maxVal = dataSize.value === 8 ? 255 : 15
    const clamped = Math.max(0, Math.min(maxVal, num))
    if (comp.value.type === 'EXT_RAM') {
      comp.value.state.memory[idx] = clamped
    } else {
      comp.value.state[idx] = clamped
    }
  }
  event.target.value = formatHex(comp.value.type === 'EXT_RAM' ? comp.value.state.memory[idx] : comp.value.state[idx])
}

function fillSequential() {
  const arr = comp.value.type === 'EXT_RAM' ? comp.value.state.memory : comp.value.state
  for (let i = 0; i < size.value; i++) {
    arr[i] = i % (dataSize.value === 8 ? 256 : 16)
  }
}

function clearAll() {
  const arr = comp.value.type === 'EXT_RAM' ? comp.value.state.memory : comp.value.state
  for (let i = 0; i < size.value; i++) {
    arr[i] = 0
  }
}

function close() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.memory-editor-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.memory-editor-dialog {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #2a2a2a;
  border-bottom: 1px solid #3c3c3c;
}

.dialog-header h3 {
  margin: 0;
  color: #e0e0e0;
  font-size: 14px;
  font-weight: 600;
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

.dialog-body {
  padding: 16px 18px;
  overflow-y: auto;
  flex: 1;
}

.memory-info {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  color: #888;
  font-size: 12px;
}

.memory-grid {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
}

.grid-8bit {
  font-size: 12px;
}

.grid-header {
  display: flex;
  padding: 6px 8px;
  background: #333;
  border-radius: 4px 4px 0 0;
  color: #888;
  font-weight: bold;
  position: sticky;
  top: 0;
  z-index: 1;
}

.grid-row {
  display: flex;
  padding: 4px 8px;
  border-bottom: 1px solid #2d2d2d;
  align-items: center;
}

.grid-row:hover {
  background: #2d2d2d;
}

.grid-row.active {
  background: #0078d420;
}

.addr-col {
  width: 50px;
  color: #888;
}

.hex-col {
  width: 60px;
  color: #ff6b6b;
}

.dec-col {
  width: 50px;
  color: #4ec9b0;
}

.bin-col {
  flex: 1;
  color: #dcdcaa;
}

.mem-input {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  color: #ff6b6b;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  width: 40px;
  padding: 2px 4px;
  border-radius: 3px;
  text-align: center;
}

.mem-input:focus {
  outline: none;
  border-color: #0078d4;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 18px;
  background: #2a2a2a;
  border-top: 1px solid #3c3c3c;
}

.btn {
  padding: 7px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  background: #3c3c3c;
  color: #ccc;
  transition: all 0.15s;
}

.btn:hover {
  background: #4c4c4c;
}

.btn-primary {
  background: #0078d4;
  color: #fff;
}

.btn-primary:hover {
  background: #1a8ae8;
}

.btn-warning {
  background: #e17055;
  color: #fff;
}

.btn-warning:hover {
  background: #d35440;
}
</style>
