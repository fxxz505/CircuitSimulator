<template>
  <div class="component-detail-panel" v-if="selectedComponent" @click.self="$emit('close')" @keydown.esc="$emit('close')">
    <div class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
      <div class="dialog-header">
        <div class="dialog-title-group">
          <span class="dialog-icon" :style="{ background: componentColor + '30' }">{{ componentIcon }}</span>
          <h3 id="detail-title">{{ componentInfo.name }}</h3>
        </div>
        <button class="close-btn" @click="$emit('close')" title="关闭 (Esc)" aria-label="关闭">✕</button>
      </div>
      
      <div class="dialog-body">
        <div class="detail-section">
          <h4>📋 功能说明</h4>
          <p>{{ componentInfo.description }}</p>
        </div>

        <div class="detail-section" v-if="componentInfo.truthTable && componentInfo.truthTable.length > 0">
          <h4>📊 真值表</h4>
          <div class="table-wrapper">
            <table class="truth-table">
              <thead>
                <tr>
                  <th v-for="(pin, i) in inputPins" :key="'in'+i" class="input-col">{{ pin.split(':')[0] }}</th>
                  <th v-for="(pin, i) in outputPins" :key="'out'+i" class="output-col">{{ pin.split(':')[0] }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in componentInfo.truthTable" :key="idx">
                  <td v-for="(val, i) in row.inputs" :key="'v'+i" class="input-col">{{ val }}</td>
                  <td v-for="(val, i) in row.output" :key="'vo'+i" class="output-col">{{ val }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="detail-section" v-if="componentInfo.expression && componentInfo.expression !== 'N/A'">
          <h4>🔢 逻辑表达式</h4>
          <code>{{ componentInfo.expression }}</code>
        </div>

        <div class="detail-section" v-if="componentInfo.timingDiagram && componentInfo.timingDiagram !== 'N/A'">
          <h4>📈 时序图</h4>
          <pre class="timing-diagram">{{ componentInfo.timingDiagram }}</pre>
        </div>

        <div class="detail-section" v-if="componentInfo.example && componentInfo.example !== '暂无示例'">
          <h4>💡 使用示例</h4>
          <p>{{ componentInfo.example }}</p>
        </div>

        <div class="detail-section" v-if="componentInfo.pins && componentInfo.pins.length > 0">
          <h4>🔌 引脚说明</h4>
          <div class="pin-grid">
            <div v-for="(pin, i) in componentInfo.pins" :key="i" class="pin-item"
                 :class="{ 'pin-input': pin.includes('输入'), 'pin-output': pin.includes('输出') }">
              {{ pin }}
            </div>
          </div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn-close" @click="$emit('close')">关闭 <kbd>Esc</kbd></button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { COMPONENT_DETAILS } from '../constants/componentDetails'
import { COMPONENT_TYPES } from '../constants/componentTypes'

const props = defineProps({
  selectedComponent: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const componentInfo = computed(() => {
  if (!props.selectedComponent) return {}
  return COMPONENT_DETAILS[props.selectedComponent.type] || {
    name: props.selectedComponent.type,
    description: '暂无详细说明',
    truthTable: [],
    expression: '',
    timingDiagram: '',
    example: '',
    pins: []
  }
})

const componentColor = computed(() => {
  if (!props.selectedComponent) return '#666'
  return COMPONENT_TYPES[props.selectedComponent.type]?.color || '#666'
})

const componentIcon = computed(() => {
  if (!props.selectedComponent) return '?'
  const type = props.selectedComponent.type
  const icons = {
    AND: '&', OR: '≥1', NOT: '¬', NAND: '↑', NOR: '↓', XOR: '⊕',
    SWITCH: '⚡', LED: '💡', CLOCK: '⏱', DFF: 'D', HALFADDER: '+',
    FULLADDER: '++', MUX2: 'MUX', CPU: 'CPU', ROM256: 'PROM'
  }
  return icons[type] || type.substring(0, 2)
})

const inputPins = computed(() => {
  return componentInfo.value.pins?.filter(p => p.toLowerCase().includes('输入')) || []
})

const outputPins = computed(() => {
  return componentInfo.value.pins?.filter(p => p.toLowerCase().includes('输出')) || []
})

function handleEsc(e) {
  if (e.key === 'Escape') {
    props.selectedComponent && emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
})
</script>

<style scoped>
.component-detail-panel {
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

.detail-dialog {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  width: 90%;
  max-width: 680px;
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
  border-bottom: 1px solid #3c3c3c;
}

.dialog-title-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dialog-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: bold;
  color: #fff;
  border: 1px solid #3c3c3c;
}

.dialog-header h3 {
  margin: 0;
  color: #e0e0e0;
  font-size: 15px;
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
  line-height: 1;
  transition: all 0.15s;
}

.close-btn:hover {
  color: #fff;
  background: #c42b1c;
}

.dialog-body {
  padding: 18px;
  overflow-y: auto;
  flex: 1;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section:last-child {
  margin-bottom: 0;
}

.detail-section h4 {
  margin: 0 0 10px 0;
  color: #4a9eff;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.detail-section p {
  margin: 0;
  color: #ccc;
  line-height: 1.6;
  font-size: 13px;
}

.table-wrapper {
  overflow-x: auto;
  border-radius: 4px;
  border: 1px solid #3c3c3c;
}

.truth-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.truth-table th,
.truth-table td {
  padding: 7px 12px;
  text-align: center;
  border: 1px solid #3c3c3c;
}

.truth-table th {
  background: #333;
  color: #e0e0e0;
  font-weight: 600;
  font-size: 12px;
}

.truth-table .input-col {
  background: #2a2a3a;
}

.truth-table .output-col {
  background: #2a3a2a;
}

.truth-table th.input-col {
  background: #2a2a4a;
  color: #7aa2f7;
}

.truth-table th.output-col {
  background: #2a4a2a;
  color: #4ec9b0;
}

.truth-table td {
  color: #ccc;
}

.truth-table tr:hover td {
  background: #333;
}

code {
  display: block;
  background: #1e1e1e;
  padding: 12px 16px;
  border-radius: 4px;
  color: #4ec9b0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  border: 1px solid #3c3c3c;
}

.timing-diagram {
  background: #1e1e1e;
  padding: 14px;
  border-radius: 4px;
  color: #4ec9b0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre;
  border: 1px solid #3c3c3c;
}

.pin-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pin-item {
  padding: 4px 10px;
  background: #2a2a2a;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  font-family: 'Consolas', monospace;
  border: 1px solid #3c3c3c;
}

.pin-input {
  border-left: 3px solid #7aa2f7;
}

.pin-output {
  border-left: 3px solid #4ec9b0;
}

.dialog-footer {
  padding: 12px 18px;
  border-top: 1px solid #3c3c3c;
  display: flex;
  justify-content: flex-end;
}

.btn-close {
  background: #3c3c3c;
  border: 1px solid #4c4c4c;
  color: #e0e0e0;
  padding: 7px 18px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;
}

.btn-close:hover {
  background: #4c4c4c;
}

kbd {
  background: #1e1e1e;
  border: 1px solid #555;
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: 'Consolas', monospace;
  color: #999;
}
</style>
