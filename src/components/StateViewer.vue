<template>
  <div v-if="visible" class="state-viewer-overlay" @click.self="close">
    <div class="state-viewer-dialog">
      <div class="dialog-header">
        <h3>{{ title }}</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="dialog-body">
        <div v-if="compType === 'COUNTER4'" class="state-section">
          <div class="state-row">
            <span class="state-label">当前计数值</span>
            <span class="state-value dec">{{ stateValue }}</span>
            <span class="state-value hex">0x{{ stateValue.toString(16).toUpperCase() }}</span>
            <span class="state-value bin">{{ stateValue.toString(2).padStart(4, '0') }}</span>
          </div>
          <div class="bit-display">
            <div v-for="i in 4" :key="i" class="bit-cell" :class="{ on: (stateValue >> (4 - i)) & 1 }">
              <div class="bit-value">{{ (stateValue >> (4 - i)) & 1 }}</div>
              <div class="bit-name">Q{{ 4 - i }}</div>
            </div>
          </div>
        </div>

        <div v-if="compType === 'RING4'" class="state-section">
          <div class="state-row">
            <span class="state-label">当前状态</span>
            <span class="state-value dec">{{ stateValue }}</span>
            <span class="state-value bin">{{ stateValue.toString(2).padStart(4, '0') }}</span>
          </div>
          <div class="ring-display">
            <div v-for="i in 4" :key="i" class="ring-cell" :class="{ on: (stateValue >> (3 - i)) & 1 }">
              <div class="ring-value">{{ (stateValue >> (3 - i)) & 1 }}</div>
              <div class="ring-name">Q{{ i }}</div>
            </div>
          </div>
        </div>

        <div v-if="compType === 'SHIFT4'" class="state-section">
          <div class="state-row">
            <span class="state-label">移位寄存器值</span>
            <span class="state-value dec">{{ stateValue }}</span>
            <span class="state-value bin">{{ stateValue.toString(2).padStart(4, '0') }}</span>
          </div>
          <div class="shift-display">
            <div class="shift-arrow">→</div>
            <div v-for="i in 4" :key="i" class="shift-cell" :class="{ on: (stateValue >> (3 - i)) & 1 }">
              <div class="shift-value">{{ (stateValue >> (3 - i)) & 1 }}</div>
              <div class="shift-name">D{{ i }}</div>
            </div>
            <div class="shift-arrow">→</div>
          </div>
        </div>

        <div v-if="compType === 'REG4'" class="state-section">
          <div class="state-row">
            <span class="state-label">寄存器值</span>
            <span class="state-value dec">{{ stateValue }}</span>
            <span class="state-value hex">0x{{ stateValue.toString(16).toUpperCase() }}</span>
            <span class="state-value bin">{{ stateValue.toString(2).padStart(4, '0') }}</span>
          </div>
          <div class="bit-display">
            <div v-for="i in 4" :key="i" class="bit-cell" :class="{ on: (stateValue >> (3 - i)) & 1 }">
              <div class="bit-value">{{ (stateValue >> (3 - i)) & 1 }}</div>
              <div class="bit-name">D{{ i }}</div>
            </div>
          </div>
        </div>

        <div v-if="compType === 'LCD1602'" class="state-section">
          <div class="lcd-preview">
            <div class="lcd-frame">
              <div v-for="(line, idx) in lcdLines" :key="idx" class="lcd-line">{{ line }}</div>
            </div>
          </div>
          <div class="lcd-info">
            <span>光标位置: ({{ lcdCursor.x }}, {{ lcdCursor.y }})</span>
          </div>
        </div>

        <div v-if="compType === 'SEGDISPLAY8'" class="state-section">
          <div class="seg-info">8位数码管输入状态</div>
          <div class="seg-grid">
            <div v-for="d in 8" :key="d" class="seg-digit">
              <div class="seg-digit-label">位{{ d - 1 }}</div>
              <div class="seg-bits">
                <span v-for="b in 4" :key="b" class="seg-bit" :class="{ on: getSegBit(d - 1, b - 1) }">
                  {{ getSegBit(d - 1, b - 1) }}
                </span>
              </div>
              <div class="seg-val">{{ getSegValue(d - 1) }}</div>
            </div>
          </div>
        </div>

        <div v-if="compType === 'SEGDISPLAY1'" class="state-section">
          <div class="seg-info">1位数码管输入状态</div>
          <div class="seg-bits-large">
            <div v-for="b in 4" :key="b" class="seg-bit-item" :class="{ on: getSeg1Bit(b - 1) }">
              <div class="seg-bit-val">{{ getSeg1Bit(b - 1) }}</div>
              <div class="seg-bit-name">B{{ b - 1 }}</div>
            </div>
          </div>
          <div class="seg-val-large">显示值: {{ getSeg1Value() }}</div>
        </div>

        <div class="io-section">
          <div class="io-title">输入端口</div>
          <div class="io-grid">
            <div v-for="(input, idx) in inputPorts" :key="'in' + idx" class="io-row">
              <span class="io-name">{{ input.name }}</span>
              <span class="io-value" :class="{ high: input.value === 1 }">{{ input.value }}</span>
            </div>
          </div>
          <div class="io-title">输出端口</div>
          <div class="io-grid">
            <div v-for="(output, idx) in outputPorts" :key="'out' + idx" class="io-row">
              <span class="io-name">{{ output.name }}</span>
              <span class="io-value" :class="{ high: output.value === 1 }">{{ output.value }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  component: Object
})

const emit = defineEmits(['close'])

const visible = ref(true)

const comp = computed(() => props.component)
const compType = computed(() => comp.value?.type || '')

const stateValue = computed(() => {
  if (!comp.value) return 0
  if (typeof comp.value.state === 'number') return comp.value.state
  return 0
})

const title = computed(() => {
  if (!comp.value) return '元器件状态'
  const names = {
    COUNTER4: '4位计数器状态',
    RING4: '4位环形计数器状态',
    SHIFT4: '4位移位寄存器状态',
    REG4: '4位寄存器状态',
    LCD1602: '1602液晶屏状态',
    SEGDISPLAY8: '8位数码管状态',
    SEGDISPLAY1: '1位数码管状态'
  }
  return names[comp.value.type] || '元器件状态'
})

const INPUT_NAMES = {
  COUNTER4: ['UP/DOWN', 'CLK', 'RESET'],
  RING4: ['CLK', 'RESET'],
  SHIFT4: ['D_IN', 'DIR', 'CLK', 'EN'],
  REG4: ['D0', 'D1', 'D2', 'D3', 'EN'],
  LCD1602: ['D0-D3', 'D4-D7', 'RS', 'RW', 'E', 'EN'],
  SEGDISPLAY8: Array.from({length: 32}, (_, i) => `D${i}`),
  SEGDISPLAY1: ['B0', 'B1', 'B2', 'B3']
}

const OUTPUT_NAMES = {
  COUNTER4: ['Q0', 'Q1', 'Q2', 'Q3'],
  RING4: ['Q0', 'Q1', 'Q2', 'Q3'],
  SHIFT4: ['Q0', 'Q1', 'Q2', 'Q3'],
  REG4: ['Q0', 'Q1', 'Q2', 'Q3'],
  LCD1602: [],
  SEGDISPLAY8: [],
  SEGDISPLAY1: []
}

const lcdLines = computed(() => {
  if (!comp.value || comp.value.type !== 'LCD1602') return ['', '']
  return comp.value.lcdBuffer || ['                ', '                ']
})

const lcdCursor = computed(() => {
  if (!comp.value || comp.value.type !== 'LCD1602') return { x: 0, y: 0 }
  return comp.value.lcdCursor || { x: 0, y: 0 }
})

function getSegBit(digitIdx, bitIdx) {
  if (!comp.value || comp.value.type !== 'SEGDISPLAY8') return 0
  const inputIdx = digitIdx * 4 + bitIdx
  return comp.value.inputs[inputIdx]?.value || 0
}

function getSegValue(digitIdx) {
  let val = 0
  for (let b = 0; b < 4; b++) {
    val += getSegBit(digitIdx, b) << b
  }
  return val
}

function getSeg1Bit(bitIdx) {
  if (!comp.value || comp.value.type !== 'SEGDISPLAY1') return 0
  return comp.value.inputs[bitIdx]?.value || 0
}

function getSeg1Value() {
  let val = 0
  for (let b = 0; b < 4; b++) {
    val += getSeg1Bit(b) << b
  }
  return val
}

const inputPorts = computed(() => {
  if (!comp.value) return []
  const names = INPUT_NAMES[comp.value.type] || []
  return names.map((name, idx) => ({
    name,
    value: comp.value.inputs[idx]?.value || 0
  }))
})

const outputPorts = computed(() => {
  if (!comp.value) return []
  const names = OUTPUT_NAMES[comp.value.type] || []
  return names.map((name, idx) => ({
    name,
    value: comp.value.outputs[idx]?.value || 0
  }))
})

function close() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.state-viewer-overlay {
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

.state-viewer-dialog {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  width: 400px;
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

.state-section {
  margin-bottom: 20px;
}

.state-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.state-label {
  color: #888;
  font-size: 12px;
  min-width: 100px;
}

.state-value {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  padding: 4px 10px;
  border-radius: 4px;
  background: #2d2d2d;
}

.state-value.dec {
  color: #4ec9b0;
}

.state-value.hex {
  color: #ff6b6b;
}

.state-value.bin {
  color: #dcdcaa;
}

.bit-display, .ring-display, .shift-display {
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 12px;
}

.bit-cell, .ring-cell, .shift-cell {
  width: 50px;
  text-align: center;
  border-radius: 4px;
  padding: 8px 4px;
  background: #2d2d2d;
  border: 2px solid #3c3c3c;
  transition: all 0.2s;
}

.bit-cell.on, .ring-cell.on, .shift-cell.on {
  background: #1a3a2e;
  border-color: #4ec9b0;
}

.bit-value, .ring-value, .shift-value {
  font-family: 'Consolas', monospace;
  font-size: 20px;
  font-weight: bold;
  color: #888;
}

.bit-cell.on .bit-value, .ring-cell.on .ring-value, .shift-cell.on .shift-value {
  color: #4ec9b0;
  text-shadow: 0 0 8px #4ec9b0;
}

.bit-name, .ring-name, .shift-name {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.shift-arrow {
  display: flex;
  align-items: center;
  color: #666;
  font-size: 18px;
}

.lcd-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.lcd-frame {
  background: #003300;
  border: 3px solid #555;
  border-radius: 4px;
  padding: 12px 16px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 16px;
  color: #00ff00;
  letter-spacing: 2px;
  min-width: 280px;
}

.lcd-line {
  height: 24px;
  line-height: 24px;
  white-space: pre;
}

.lcd-info {
  color: #888;
  font-size: 12px;
  text-align: center;
}

.seg-info {
  color: #888;
  font-size: 12px;
  margin-bottom: 12px;
}

.seg-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.seg-digit {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 8px;
  text-align: center;
}

.seg-digit-label {
  color: #888;
  font-size: 11px;
  margin-bottom: 4px;
}

.seg-bits {
  display: flex;
  gap: 2px;
  justify-content: center;
  margin-bottom: 4px;
}

.seg-bit {
  font-family: 'Consolas', monospace;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 2px;
  background: #1e1e1e;
  color: #666;
}

.seg-bit.on {
  background: #1a3a2e;
  color: #4ec9b0;
}

.seg-val {
  font-family: 'Consolas', monospace;
  font-size: 14px;
  color: #ff6b6b;
  font-weight: bold;
}

.seg-bits-large {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.seg-bit-item {
  width: 50px;
  text-align: center;
  border-radius: 4px;
  padding: 8px 4px;
  background: #2d2d2d;
  border: 2px solid #3c3c3c;
}

.seg-bit-item.on {
  background: #1a3a2e;
  border-color: #4ec9b0;
}

.seg-bit-val {
  font-family: 'Consolas', monospace;
  font-size: 20px;
  font-weight: bold;
  color: #888;
}

.seg-bit-item.on .seg-bit-val {
  color: #4ec9b0;
  text-shadow: 0 0 8px #4ec9b0;
}

.seg-bit-name {
  font-size: 11px;
  color: #666;
  margin-top: 4px;
}

.seg-val-large {
  text-align: center;
  font-family: 'Consolas', monospace;
  font-size: 16px;
  color: #ff6b6b;
}

.io-section {
  border-top: 1px solid #3c3c3c;
  padding-top: 16px;
}

.io-title {
  color: #888;
  font-size: 12px;
  margin-bottom: 8px;
  margin-top: 12px;
}

.io-title:first-child {
  margin-top: 0;
}

.io-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 6px;
}

.io-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  background: #2d2d2d;
  border-radius: 4px;
}

.io-name {
  color: #aaa;
  font-size: 12px;
  font-family: 'Consolas', monospace;
}

.io-value {
  font-family: 'Consolas', monospace;
  font-size: 14px;
  color: #888;
  font-weight: bold;
}

.io-value.high {
  color: #4ec9b0;
  text-shadow: 0 0 4px #4ec9b0;
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
</style>
