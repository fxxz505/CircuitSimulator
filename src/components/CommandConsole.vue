<template>
  <div class="cmd-panel" ref="panelRef" :style="panelStyle">
    <div class="panel-header" @mousedown="startDrag">
      <h3>⌨ 命令控制台</h3>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>
    <div class="panel-body">
      <div class="log-area" ref="logRef">
        <div v-for="(line, i) in log" :key="i" class="log-line" :class="line.type">
          <span v-if="line.type === 'cmd'" class="prompt">&gt;</span>
          <span class="log-text">{{ line.text }}</span>
        </div>
      </div>
      <div class="input-row">
        <span class="prompt-icon">&gt;</span>
        <input
          ref="inputRef"
          v-model="currentInput"
          class="cmd-input"
          placeholder="输入命令 (help 查看帮助)"
          @keydown.enter="execute"
          @keydown.up.prevent="historyUp"
          @keydown.down.prevent="historyDown"
          @keydown.tab.prevent="autocomplete"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'

const props = defineProps({
  commandHandler: { type: Function, required: true },
  initialX: { type: Number, default: 60 },
  initialY: { type: Number, default: 80 }
})

const emit = defineEmits(['close'])

const log = ref([
  { type: 'info', text: '命令控制台已启动。输入 help 查看可用命令。' }
])
const currentInput = ref('')
const history = ref([])
const historyIndex = ref(-1)
const logRef = ref(null)
const inputRef = ref(null)

const panelRef = ref(null)
const panelStyle = ref({
  left: props.initialX + 'px',
  top: props.initialY + 'px'
})
let dragging = false
let dragOffset = { x: 0, y: 0 }

function startDrag(e) {
  if (e.target.classList.contains('close-btn')) return
  dragging = true
  const rect = panelRef.value.getBoundingClientRect()
  dragOffset.x = e.clientX - rect.left
  dragOffset.y = e.clientY - rect.top
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e) {
  if (!dragging) return
  panelStyle.value = {
    left: (e.clientX - dragOffset.x) + 'px',
    top: (e.clientY - dragOffset.y) + 'px'
  }
}

function stopDrag() {
  dragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

function pushLog(text, type = 'out') {
  log.value.push({ type, text })
  nextTick(() => {
    if (logRef.value) logRef.value.scrollTop = logRef.value.scrollHeight
  })
}

function execute() {
  const cmd = currentInput.value.trim()
  if (!cmd) return
  pushLog(cmd, 'cmd')
  history.value.push(cmd)
  historyIndex.value = history.value.length
  if (cmd.toLowerCase() === 'clear' || cmd.toLowerCase() === 'cls') {
    log.value = []
    currentInput.value = ''
    return
  }
  try {
    const result = props.commandHandler(cmd)
    if (result) pushLog(result, 'out')
  } catch (e) {
    pushLog('错误: ' + e.message, 'error')
  }
  currentInput.value = ''
  nextTick(() => {
    if (inputRef.value) inputRef.value.focus()
  })
}

function historyUp() {
  if (history.value.length === 0) return
  if (historyIndex.value > 0) historyIndex.value--
  currentInput.value = history.value[historyIndex.value] || ''
}

function historyDown() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    currentInput.value = history.value[historyIndex.value]
  } else {
    historyIndex.value = history.value.length
    currentInput.value = ''
  }
}

function autocomplete() {
  const known = ['help', 'list', 'get', 'set', 'run', 'pause', 'step', 'reset', 'clock', 'clear', 'probe', 'wire', 'count', 'types']
  const cur = currentInput.value.toLowerCase()
  const match = known.find(c => c.startsWith(cur) && c !== cur)
  if (match) currentInput.value = match
}

onMounted(() => {
  nextTick(() => inputRef.value && inputRef.value.focus())
})
</script>

<style scoped>
.cmd-panel {
  position: fixed;
  width: 480px;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
  z-index: 900;
  font-family: 'Consolas', 'Courier New', monospace;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 8px 14px;
  background: #2a2a2a;
  border-bottom: 1px solid #3c3c3c;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  user-select: none;
}

.panel-header h3 {
  margin: 0;
  font-size: 13px;
  color: #e0e0e0;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
}

.close-btn:hover {
  color: #fff;
  background: #c42b1c;
}

.panel-body {
  display: flex;
  flex-direction: column;
  height: 320px;
}

.log-area {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.6;
}

.log-line {
  white-space: pre-wrap;
  word-break: break-all;
}

.log-line.cmd {
  color: #4ec9b0;
}

.log-line.cmd .prompt {
  color: #569cd6;
  margin-right: 6px;
}

.log-line.out {
  color: #dcdcdc;
}

.log-line.info {
  color: #569cd6;
}

.log-line.error {
  color: #f44747;
}

.input-row {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-top: 1px solid #3c3c3c;
  background: #252526;
}

.prompt-icon {
  color: #569cd6;
  margin-right: 8px;
  font-weight: bold;
}

.cmd-input {
  flex: 1;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 6px 10px;
  color: #dcdcdc;
  font-family: inherit;
  font-size: 12px;
  outline: none;
}

.cmd-input:focus {
  border-color: #0078d4;
}
</style>
