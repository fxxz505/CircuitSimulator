<template>
  <div v-if="visible" class="instruction-editor-overlay" @click.self="close">
    <div class="instruction-editor">
      <div class="editor-header">
        <h3>汇编程序编辑器</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="editor-body">
        <div class="editor-sidebar">
          <div class="sidebar-section">
            <h4>程序模板</h4>
            <select v-model="selectedTemplate" @change="loadTemplate" class="template-select">
              <option v-for="tpl in templates" :key="tpl.id" :value="tpl.id">{{ tpl.name }}</option>
            </select>
            <p class="template-desc">{{ currentTemplateDesc }}</p>
          </div>
          <div class="sidebar-section">
            <h4>指令参考</h4>
            <div class="instruction-ref">
              <div v-for="instr in instructions" :key="instr.opcode" class="instr-item">
                <code>{{ instr.mnemonic }}</code>
                <span>{{ instr.desc }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="editor-main">
          <div class="editor-toolbar">
            <button class="btn btn-primary" @click="assemble">汇编</button>
            <button class="btn" @click="clear">清空</button>
            <span class="status-msg" :class="{ error: lastError }">{{ statusMessage }}</span>
          </div>
          <div class="code-editor-container">
            <div class="line-numbers">
              <div v-for="n in lineCount" :key="n">{{ n }}</div>
            </div>
            <textarea
              ref="codeTextarea"
              v-model="code"
              @input="onCodeChange"
              @keydown="handleKeydown"
              class="code-editor"
              spellcheck="false"
              placeholder="在此输入汇编代码..."
            ></textarea>
          </div>
          <div class="machine-code-output">
            <h4>机器码输出</h4>
            <div class="hex-display">
              <span v-for="(word, idx) in machineCode" :key="idx" class="hex-word">
                {{ formatHex(word) }}
              </span>
              <span v-if="machineCode.length === 0" class="empty-msg">等待汇编...</span>
            </div>
          </div>
        </div>
      </div>
      <div class="editor-footer">
        <button class="btn btn-success" @click="loadToROM" :disabled="machineCode.length === 0">
          加载到ROM
        </button>
        <span class="rom-info" v-if="romComponent">
          ROM: {{ romComponent.id.substring(0, 8) }}... | 已用 {{ machineCode.length }}/256 字节
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { ASM_TEMPLATES, getTemplateById } from '../constants/asmTemplates'
import { INSTRUCTION_FORMATS, REGISTERS } from '../constants/assemblyInstructions'

const props = defineProps({
  romComponent: Object
})

const emit = defineEmits(['close', 'load'])

const visible = ref(true)
const code = ref(props.romComponent?.assemblySource || '; 在此输入汇编代码\n\nSTART:\n    LDI R0, 0x0\n    HALT\n')
const machineCode = ref([])
const statusMessage = ref('')
const lastError = ref(false)
const selectedTemplate = ref('empty')
const currentTemplateDesc = ref('空白模板')
const codeTextarea = ref(null)

const lineCount = computed(() => {
  return code.value.split('\n').length
})

const templates = ASM_TEMPLATES
const instructions = Object.values(INSTRUCTION_FORMATS).map(f => ({
  opcode: f.opcode,
  mnemonic: f.format.split(' ')[0],
  desc: f.format
}))

function loadTemplate() {
  const tpl = getTemplateById(selectedTemplate.value)
  if (tpl) {
    code.value = tpl.source
    currentTemplateDesc.value = tpl.description
    machineCode.value = []
    statusMessage.value = ''
  }
}

function onCodeChange() {
  statusMessage.value = ''
  machineCode.value = []
}

function handleKeydown(e) {
  if (e.key === 'Tab') {
    e.preventDefault()
    const start = e.target.selectionStart
    const end = e.target.selectionEnd
    code.value = code.value.substring(0, start) + '    ' + code.value.substring(end)
    nextTick(() => {
      e.target.selectionStart = e.target.selectionEnd = start + 4
    })
  }
}

function assemble() {
  try {
    // 使用useAssembler的汇编逻辑，但内联实现
    const lines = code.value.split('\n')
    const labels = {}
    const parsedLines = []
    const validMnemonics = Object.keys(INSTRUCTION_FORMATS)

    // 第一遍：收集标签
    let addr = 0
    for (const line of lines) {
      let trimmed = line.trim()
      const commentIdx = trimmed.indexOf(';')
      if (commentIdx >= 0) {
        trimmed = trimmed.substring(0, commentIdx).trim()
      }
      if (!trimmed) continue

      // 检查是否是标签
      if (trimmed.endsWith(':')) {
        const labelName = trimmed.slice(0, -1).trim()
        if (labels[labelName] !== undefined) {
          statusMessage.value = `重复的标签: ${labelName}`
          lastError.value = true
          return
        }
        labels[labelName] = addr
        continue
      }

      // 解析指令
      const parts = trimmed.split(/[\s,]+/).filter(p => p)
      const mnemonic = parts[0].toUpperCase()

      // 支持所有指令 + IN/OUT 扩展
      if (validMnemonics.includes(mnemonic) || mnemonic === 'IN' || mnemonic === 'OUT') {
        parsedLines.push({ addr, mnemonic, operands: parts.slice(1), line: trimmed })
        addr++
      } else {
        statusMessage.value = `未知指令: ${mnemonic}`
        lastError.value = true
        return
      }
    }

    // 辅助函数：解析操作数
    function parseOperand(op) {
      if (!op) return null
      op = op.trim().toUpperCase()
      // 寄存器 R0-R3
      if (op.startsWith('R') && op.length === 2 && '0123'.includes(op[1])) {
        return { type: 'reg', value: parseInt(op[1]) }
      }
      // 内存地址 [addr] 或 [Rn]
      if (op.startsWith('[') && op.endsWith(']')) {
        const inner = op.substring(1, op.length - 1).trim()
        if (inner.startsWith('R') && inner.length === 2 && '0123'.includes(inner[1])) {
          return { type: 'mem_reg', value: parseInt(inner[1]) }
        }
        return { type: 'mem_addr', value: parseNumber(inner) }
      }
      // 标签引用
      if (labels[op] !== undefined) {
        return { type: 'label', value: labels[op] }
      }
      // 立即数
      return { type: 'imm', value: parseNumber(op) }
    }

    function parseNumber(str) {
      if (!str) return 0
      str = str.trim()
      if (str.startsWith('0X')) return parseInt(str.substring(2), 16) || 0
      if (str.startsWith('0B')) return parseInt(str.substring(2), 2) || 0
      return parseInt(str, 10) || 0
    }

    // 第二遍：生成机器码
    machineCode.value = []
    for (const pl of parsedLines) {
      const ops = pl.operands.map(parseOperand)
      const format = INSTRUCTION_FORMATS[pl.mnemonic]
      let instruction = 0

      switch (pl.mnemonic) {
        case 'LOAD': {
          const regA = ops[0]?.value || 0
          const addr8 = ops[1]?.type === 'mem_addr' ? (ops[1].value & 0xFF) : (ops[1]?.value || 0)
          instruction = (0x0 << 12) | ((regA & 0xF) << 8) | (addr8 & 0xFF)
          break
        }
        case 'STORE': {
          const regA = ops[0]?.value || 0
          const addr8 = ops[1]?.type === 'mem_addr' ? (ops[1].value & 0xFF) : (ops[1]?.value || 0)
          instruction = (0x1 << 12) | ((regA & 0xF) << 8) | (addr8 & 0xFF)
          break
        }
        case 'ADD': {
          const regA = ops[0]?.value || 0
          const regB = ops[1]?.value || 0
          instruction = (0x2 << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
          break
        }
        case 'SUB': {
          const regA = ops[0]?.value || 0
          const regB = ops[1]?.value || 0
          instruction = (0x3 << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
          break
        }
        case 'AND': {
          const regA = ops[0]?.value || 0
          const regB = ops[1]?.value || 0
          instruction = (0x4 << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
          break
        }
        case 'OR': {
          const regA = ops[0]?.value || 0
          const regB = ops[1]?.value || 0
          instruction = (0x5 << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
          break
        }
        case 'NOT': {
          const regA = ops[0]?.value || 0
          instruction = (0x6 << 12) | ((regA & 0xF) << 8)
          break
        }
        case 'JMP': {
          const addr8 = ops[0]?.type === 'label' ? (ops[0].value & 0xFF) : (ops[0]?.value || 0)
          instruction = (0x7 << 12) | (addr8 & 0xFF)
          break
        }
        case 'JZ': {
          const regA = ops[0]?.value || 0
          const addr8 = ops[1]?.type === 'label' ? (ops[1].value & 0xFF) : (ops[1]?.value || 0)
          instruction = (0x8 << 12) | ((regA & 0xF) << 8) | (addr8 & 0xFF)
          break
        }
        case 'JNZ': {
          const regA = ops[0]?.value || 0
          const addr8 = ops[1]?.type === 'label' ? (ops[1].value & 0xFF) : (ops[1]?.value || 0)
          instruction = (0x9 << 12) | ((regA & 0xF) << 8) | (addr8 & 0xFF)
          break
        }
        case 'MOV': {
          const regA = ops[0]?.value || 0
          const regB = ops[1]?.value || 0
          instruction = (0xA << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
          break
        }
        case 'LDI': {
          const regA = ops[0]?.value || 0
          const imm = ops[1]?.type === 'label' ? (ops[1].value & 0xF) : (ops[1]?.value || 0)
          instruction = (0xB << 12) | ((regA & 0xF) << 8) | (imm & 0xF)
          break
        }
        case 'SHL': {
          const regA = ops[0]?.value || 0
          instruction = (0xC << 12) | ((regA & 0xF) << 8)
          break
        }
        case 'SHR': {
          const regA = ops[0]?.value || 0
          instruction = (0xD << 12) | ((regA & 0xF) << 8)
          break
        }
        case 'CMP': {
          const regA = ops[0]?.value || 0
          const regB = ops[1]?.value || 0
          instruction = (0xE << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
          break
        }
        case 'HALT': {
          instruction = 0xF000
          break
        }
        case 'OUT': {
          const regA = ops[0]?.value || 0
          const port = ops[1]?.value || 0
          instruction = (0x1 << 12) | ((regA & 0xF) << 8) | ((port | 0x80) & 0xFF)
          break
        }
        case 'IN': {
          const regA = ops[0]?.value || 0
          const port = ops[1]?.value || 0
          instruction = (0x0 << 12) | ((regA & 0xF) << 8) | ((port | 0x80) & 0xFF)
          break
        }
        default: {
          statusMessage.value = `未知指令: ${pl.mnemonic}`
          lastError.value = true
          return
        }
      }

      machineCode.value.push(instruction & 0xFFFF)
    }

    statusMessage.value = `汇编成功! ${machineCode.value.length} 条指令`
    lastError.value = false
  } catch (err) {
    statusMessage.value = `汇编错误: ${err.message}`
    lastError.value = true
  }
}

function clear() {
  code.value = ''
  machineCode.value = []
  statusMessage.value = ''
}

function formatHex(word) {
  return '0x' + word.toString(16).toUpperCase().padStart(4, '0')
}

function loadToROM() {
  if (machineCode.value.length === 0 || !props.romComponent) return
  if (props.romComponent) {
    props.romComponent.assemblySource = code.value
  }
  emit('load', machineCode.value, props.romComponent)
  statusMessage.value = '已加载到ROM!'
  lastError.value = false
}

function close() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.instruction-editor-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
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

.instruction-editor {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  background: #2a2a2a;
  border-bottom: 1px solid #3c3c3c;
}

.editor-header h3 {
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

.editor-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-sidebar {
  width: 220px;
  background: #1e1e1e;
  border-right: 1px solid #3c3c3c;
  padding: 12px;
  overflow-y: auto;
}

.sidebar-section {
  margin-bottom: 20px;
}

.sidebar-section h4 {
  color: #4a9eff;
  font-size: 11px;
  margin: 0 0 8px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.template-select {
  width: 100%;
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  color: #e0e0e0;
  padding: 7px 8px;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 12px;
}

.template-desc {
  color: #666;
  font-size: 11px;
  margin: 0;
}

.instruction-ref {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.instr-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: #2d2d2d;
  border-radius: 4px;
  font-size: 10px;
}

.instr-item code {
  color: #4ec9b0;
  font-family: monospace;
  white-space: nowrap;
}

.instr-item span {
  color: #888;
  overflow: hidden;
  text-overflow: ellipsis;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-bottom: 1px solid #3c3c3c;
}

.btn {
  padding: 7px 14px;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  background: #2d2d2d;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.btn:hover { background: #3c3c3c; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { background: #0078d4; border-color: #0078d4; color: #fff; }
.btn-primary:hover { background: #1a8ae8; }

.btn-success { background: #00aa44; border-color: #00aa44; color: #fff; }
.btn-success:hover { background: #00cc55; }

.status-msg {
  color: #888;
  font-size: 12px;
}

.status-msg.error { color: #ff4444; }

.code-editor-container {
  flex: 1;
  display: flex;
  background: #1e1e1e;
  overflow: hidden;
  min-height: 200px;
}

.line-numbers {
  background: #1e1e1e;
  color: #555;
  padding: 12px 8px;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.5;
  text-align: right;
  user-select: none;
  border-right: 1px solid #3c3c3c;
}

.code-editor {
  flex: 1;
  background: transparent;
  color: #e0e0e0;
  border: none;
  padding: 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  resize: none;
  outline: none;
  tab-size: 4;
}

.machine-code-output {
  background: #1e1e1e;
  border-top: 1px solid #3c3c3c;
  padding: 12px 16px;
  max-height: 120px;
  overflow-y: auto;
}

.machine-code-output h4 {
  margin: 0 0 8px 0;
  color: #4a9eff;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.hex-display {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-family: monospace;
  font-size: 12px;
}

.hex-word {
  color: #4ec9b0;
  background: #2d2d2d;
  padding: 2px 6px;
  border-radius: 3px;
}

.empty-msg {
  color: #555;
  font-style: italic;
}

.editor-footer {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 18px;
  background: #2a2a2a;
  border-top: 1px solid #3c3c3c;
}

.rom-info {
  color: #888;
  font-size: 11px;
  font-family: monospace;
}
</style>
