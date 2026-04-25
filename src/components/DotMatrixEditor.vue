<template>
  <div v-if="visible" class="dotmatrix-editor-overlay" @click.self="close">
    <div class="dotmatrix-editor-dialog">
      <div class="dialog-header">
        <h3>16×16 点阵屏字模编辑器</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="dialog-body">
        <div class="editor-layout">
          <div class="char-selector">
            <div class="selector-label">选择字模地址:</div>
            <div class="char-grid">
              <button
                v-for="i in 16"
                :key="i - 1"
                :class="{ active: selectedChar === i - 1, hasdata: hasCharData(i - 1) }"
                @click="selectedChar = i - 1"
              >
                {{ i - 1 }}
              </button>
            </div>
            <div class="preset-section">
              <div class="selector-label">预设字模:</div>
              <div class="preset-grid">
                <button v-for="ch in presetChars" :key="ch" class="preset-btn" @click="loadPreset(ch)">
                  {{ ch }}
                </button>
              </div>
            </div>
            <div class="actions-section">
              <button class="btn btn-warning" @click="clearChar">清空当前</button>
              <button class="btn btn-danger" @click="clearAll">清空全部</button>
            </div>
          </div>
          <div class="pixel-editor">
            <div class="editor-title">地址 {{ selectedChar }} 的字模</div>
            <div class="pixel-grid">
              <div
                v-for="r in 16"
                :key="'r' + r"
                class="pixel-row"
              >
                <div
                  v-for="c in 16"
                  :key="'c' + c"
                  class="pixel-cell"
                  :class="{ on: isPixelOn(r - 1, c - 1) }"
                  @mousedown.prevent="startPaint(r - 1, c - 1)"
                  @mouseenter="continuePaint(r - 1, c - 1)"
                  @mouseup="stopPaint"
                >
                </div>
              </div>
            </div>
            <div class="preview-section">
              <div class="preview-title">预览</div>
              <div class="preview-grid">
                <div v-for="r in 16" :key="'pr' + r" class="preview-row">
                  <div
                    v-for="c in 16"
                    :key="'pc' + c"
                    class="preview-dot"
                    :class="{ on: isPixelOn(r - 1, c - 1) }"
                  ></div>
                </div>
              </div>
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
import { ref, computed, watch } from 'vue'

const props = defineProps({
  component: Object
})

const emit = defineEmits(['close'])

const visible = ref(true)
const selectedChar = ref(0)
const isPainting = ref(false)
const paintValue = ref(true)

const comp = computed(() => props.component)

const charROM = computed(() => {
  if (!comp.value) return []
  return comp.value.charROM || []
})

const presetChars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

const CHAR_PATTERNS_5X7 = {
  'A': ['..XXX..','..X.X..','..X.X..','..XXXXX','..X.X..','..X.X..','..X.X..'],
  'B': ['..XXXX.','..X..X.','..X..X.','..XXXX.','..X..X.','..X..X.','..XXXX.'],
  'C': ['...XXXX','..X....','..X....','..X....','..X....','..X....','...XXXX'],
  'D': ['..XXXX.','..X..X.','..X..X.','..X..X.','..X..X.','..X..X.','..XXXX.'],
  'E': ['..XXXXX','..X....','..X....','..XXXX.','..X....','..X....','..XXXXX'],
  'F': ['..XXXXX','..X....','..X....','..XXXX.','..X....','..X....','..X....'],
  'G': ['...XXXX','..X....','..X....','..X.XXX','..X..X.','..X..X.','...XXXX'],
  'H': ['..X..X.','..X..X.','..X..X.','..XXXXX','..X..X.','..X..X.','..X..X.'],
  'I': ['..XXXXX','...XX..','...XX..','...XX..','...XX..','...XX..','..XXXXX'],
  'J': ['....XXX','.....X.','.....X.','.....X.','.....X.','..X..X.','...XX..'],
  'K': ['..X..X.','..X..X.','..X.X..','..XX...','..X.X..','..X..X.','..X..X.'],
  'L': ['..X....','..X....','..X....','..X....','..X....','..X....','..XXXXX'],
  'M': ['..X...X','.XX.XXX.','..X.X.X.','..X...X.','..X...X.','..X...X.','..X...X.'],
  'N': ['..X...X.','..XX..X.','..X.X.X.','..X..XX.','..X...X.','..X...X.','..X...X.'],
  'O': ['..XXXXX.','..X...X.','..X...X.','..X...X.','..X...X.','..X...X.','..XXXXX.'],
  'P': ['..XXXX.','..X..X.','..X..X.','..XXXX.','..X....','..X....','..X....'],
  'Q': ['..XXXXX.','..X...X.','..X...X.','..X...X.','..X.X.X.','..X..X..','..XXXX.X'],
  'R': ['..XXXX.','..X..X.','..X..X.','..XXXX.','..X.X..','..X..X.','..X..X.'],
  'S': ['...XXXX','..X....','..X....','...XXX.','.....X.','.....X.','..XXXX.'],
  'T': ['..XXXXX','...X...','...X...','...X...','...X...','...X...','...X...'],
  'U': ['..X...X.','..X...X.','..X...X.','..X...X.','..X...X.','..X...X.','..XXXXX.'],
  'V': ['..X...X.','..X...X.','..X...X.','..X...X.','..X.X.X.','..XX.XX.','...X.X..'],
  'W': ['..X...X.','..X...X.','..X...X.','..X.X.X.','..X.X.X.','..X.X.X.','..XX.XX.'],
  'X': ['..X...X.','..X...X.','...X.X..','....X...','...X.X..','..X...X.','..X...X.'],
  'Y': ['..X...X.','..X...X.','...X.X..','....X...','....X...','....X...','....X...'],
  'Z': ['..XXXXX','.....X.','....X..','...X...','..X....','..X....','..XXXXX'],
  '0': ['..XXXX.','..X..X.','..X.XX.','..XX.X.','..X..X.','..X..X.','..XXXX.'],
  '1': ['...XX..','..XXX..','...XX..','...XX..','...XX..','...XX..','..XXXXX'],
  '2': ['..XXXX.','..X..X.','.....X.','...XX..','..X....','..X..X.','..XXXXX'],
  '3': ['..XXXX.','..X..X.','.....X.','...XXX.','.....X.','..X..X.','..XXXX.'],
  '4': ['....XX.','...X.X.','..X..X.','..X..X.','..XXXXX','.....X.','.....X.'],
  '5': ['..XXXXX','..X....','..XXXX.','.....X.','.....X.','..X..X.','..XXXX.'],
  '6': ['...XXX.','..X....','..X....','..XXXX.','..X..X.','..X..X.','..XXXX.'],
  '7': ['..XXXXX','.....X.','....X..','...X...','..X....','..X....','..X....'],
  '8': ['..XXXX.','..X..X.','..X..X.','..XXXX.','..X..X.','..X..X.','..XXXX.'],
  '9': ['..XXXX.','..X..X.','..X..X.','..XXXXX','.....X.','....X..','..XXX..'],
}

function getCharData(addr) {
  if (!charROM.value || !charROM.value[addr]) return new Array(16).fill(0)
  return charROM.value[addr]
}

function hasCharData(addr) {
  const data = getCharData(addr)
  return data.some(row => row !== 0)
}

function isPixelOn(row, col) {
  const data = getCharData(selectedChar.value)
  return ((data[row] || 0) >> (15 - col)) & 1
}

function togglePixel(row, col) {
  if (!comp.value.charROM) return
  if (!comp.value.charROM[selectedChar.value]) {
    comp.value.charROM[selectedChar.value] = new Array(16).fill(0)
  }
  const data = comp.value.charROM[selectedChar.value]
  const mask = 1 << (15 - col)
  data[row] ^= mask
}

function startPaint(row, col) {
  isPainting.value = true
  paintValue.value = !isPixelOn(row, col)
  if (!comp.value.charROM) {
    comp.value.charROM = []
    for (let i = 0; i < 16; i++) {
      comp.value.charROM[i] = new Array(16).fill(0)
    }
  }
  if (!comp.value.charROM[selectedChar.value]) {
    comp.value.charROM[selectedChar.value] = new Array(16).fill(0)
  }
  const data = comp.value.charROM[selectedChar.value]
  const mask = 1 << (15 - col)
  if (paintValue.value) {
    data[row] |= mask
  } else {
    data[row] &= ~mask
  }
}

function continuePaint(row, col) {
  if (!isPainting.value) return
  if (!comp.value.charROM || !comp.value.charROM[selectedChar.value]) return
  const data = comp.value.charROM[selectedChar.value]
  const mask = 1 << (15 - col)
  const currentlyOn = (data[row] >> (15 - col)) & 1
  if (paintValue.value && !currentlyOn) {
    data[row] |= mask
  } else if (!paintValue.value && currentlyOn) {
    data[row] &= ~mask
  }
}

function stopPaint() {
  isPainting.value = false
}

function loadPreset(ch) {
  if (!comp.value.charROM) {
    comp.value.charROM = []
    for (let i = 0; i < 16; i++) {
      comp.value.charROM[i] = new Array(16).fill(0)
    }
  }
  if (!comp.value.charROM[selectedChar.value]) {
    comp.value.charROM[selectedChar.value] = new Array(16).fill(0)
  }

  const pattern = CHAR_PATTERNS_5X7[ch]
  if (!pattern) return

  const data = new Array(16).fill(0)

  const rowOffset = 4
  const colOffset = 5

  for (let r = 0; r < pattern.length; r++) {
    const line = pattern[r]
    let rowVal = 0
    for (let c = 0; c < line.length; c++) {
      if (line[c] === 'X') {
        const actualCol = colOffset + c
        if (actualCol < 16) {
          rowVal |= (1 << (15 - actualCol))
        }
      }
    }
    const actualRow = rowOffset + r
    if (actualRow < 16) {
      data[actualRow] = rowVal
    }
  }

  comp.value.charROM[selectedChar.value] = data
}

function clearChar() {
  if (!comp.value.charROM) return
  comp.value.charROM[selectedChar.value] = new Array(16).fill(0)
}

function clearAll() {
  if (!comp.value.charROM) {
    comp.value.charROM = []
  }
  for (let i = 0; i < 16; i++) {
    comp.value.charROM[i] = new Array(16).fill(0)
  }
}

function close() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.dotmatrix-editor-overlay {
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

.dotmatrix-editor-dialog {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 85vh;
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

.editor-layout {
  display: flex;
  gap: 20px;
}

.char-selector {
  width: 200px;
  flex-shrink: 0;
}

.selector-label {
  color: #888;
  font-size: 12px;
  margin-bottom: 8px;
  margin-top: 12px;
}

.selector-label:first-child {
  margin-top: 0;
}

.char-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}

.char-grid button {
  padding: 8px 4px;
  border-radius: 4px;
  border: 1px solid #3c3c3c;
  background: #2d2d2d;
  color: #ccc;
  cursor: pointer;
  font-size: 13px;
  font-family: 'Consolas', monospace;
  transition: all 0.15s;
}

.char-grid button:hover {
  background: #3c3c3c;
}

.char-grid button.active {
  background: #0078d4;
  border-color: #0078d4;
  color: #fff;
}

.char-grid button.hasdata {
  border-color: #4ec9b0;
  color: #4ec9b0;
}

.preset-section {
  margin-top: 12px;
}

.preset-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.preset-btn {
  padding: 4px 8px;
  border-radius: 3px;
  border: 1px solid #3c3c3c;
  background: #2d2d2d;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  font-family: 'Consolas', monospace;
  transition: all 0.15s;
}

.preset-btn:hover {
  background: #3c3c3c;
  border-color: #0078d4;
}

.actions-section {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pixel-editor {
  flex: 1;
}

.editor-title {
  color: #e0e0e0;
  font-size: 13px;
  margin-bottom: 12px;
  font-family: 'Consolas', monospace;
}

.pixel-grid {
  display: inline-block;
  border: 2px solid #3c3c3c;
  border-radius: 4px;
  padding: 2px;
  background: #1e1e1e;
  user-select: none;
}

.pixel-row {
  display: flex;
}

.pixel-cell {
  width: 24px;
  height: 24px;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  cursor: crosshair;
  transition: background 0.1s;
}

.pixel-cell.on {
  background: #4ec9b0;
  box-shadow: 0 0 4px #4ec9b0;
}

.pixel-cell:hover {
  border-color: #555;
}

.preview-section {
  margin-top: 16px;
}

.preview-title {
  color: #888;
  font-size: 12px;
  margin-bottom: 6px;
}

.preview-grid {
  display: inline-block;
  border: 1px solid #3c3c3c;
  border-radius: 3px;
  padding: 2px;
  background: #0a0a0a;
}

.preview-row {
  display: flex;
}

.preview-dot {
  width: 6px;
  height: 6px;
  background: #1a1a1a;
  margin: 0.5px;
}

.preview-dot.on {
  background: #4ec9b0;
  box-shadow: 0 0 2px #4ec9b0;
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

.btn-warning {
  background: #e17055;
  color: #fff;
}

.btn-warning:hover {
  background: #d35440;
}

.btn-danger {
  background: #d63031;
  color: #fff;
}

.btn-danger:hover {
  background: #c0392b;
}
</style>
