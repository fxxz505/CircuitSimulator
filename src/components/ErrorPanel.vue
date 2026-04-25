<template>
  <div class="error-panel" v-if="visible" ref="panelRef" :style="panelStyle">
    <div class="panel-header" @mousedown="startDrag">
      <div class="panel-title">
        <span class="panel-icon">⚠️</span>
        <h3>电路诊断</h3>
      </div>
      <div class="panel-controls">
        <button class="ctrl-btn minimize-btn" @click="minimized = !minimized" :title="minimized ? '展开' : '最小化'">
          {{ minimized ? '▢' : '—' }}
        </button>
        <button class="ctrl-btn close-btn" @click="$emit('close')" title="关闭">✕</button>
      </div>
    </div>
    
    <div class="panel-body" v-show="!minimized">
      <div class="panel-actions">
        <button class="btn-scan" @click="scan">
          <span>🔄</span> 重新扫描
        </button>
        <span class="scan-time" v-if="lastScanTime">上次扫描: {{ lastScanTime }}</span>
      </div>

      <div v-if="errors.length === 0 && warnings.length === 0" class="no-issues">
        <div class="no-issues-icon">✓</div>
        <div>未检测到问题</div>
      </div>

      <div v-if="errors.length > 0" class="issue-list error-list">
        <div class="list-header">
          <span class="list-icon">✗</span>
          <h4>错误 ({{ errors.length }})</h4>
        </div>
        <div v-for="(err, idx) in errors" :key="'err'+idx" class="issue-item error-item">
          <div class="issue-icon">✗</div>
          <div class="issue-content">
            <div class="issue-message">{{ err.message }}</div>
            <div class="issue-suggestion">💡 {{ err.suggestion }}</div>
          </div>
        </div>
      </div>

      <div v-if="warnings.length > 0" class="issue-list warning-list">
        <div class="list-header">
          <span class="list-icon">!</span>
          <h4>警告 ({{ warnings.length }})</h4>
        </div>
        <div v-for="(warn, idx) in warnings" :key="'warn'+idx" class="issue-item warning-item">
          <div class="issue-icon">!</div>
          <div class="issue-content">
            <div class="issue-message">{{ warn.message }}</div>
            <div class="issue-suggestion">💡 {{ warn.suggestion }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  errorDetector: {
    type: Object,
    required: true
  }
})

defineEmits(['close'])

const errors = ref([])
const warnings = ref([])
const visible = ref(true)
const minimized = ref(false)
const lastScanTime = ref('')
const panelRef = ref(null)

const dragState = ref({ dragging: false, offsetX: 0, offsetY: 0 })
const panelPos = ref({ x: 0, y: 0 })
const hasMoved = ref(false)

const panelStyle = computed(() => {
  if (!hasMoved.value) return {}
  return {
    left: panelPos.value.x + 'px',
    top: panelPos.value.y + 'px',
    right: 'auto'
  }
})

function startDrag(e) {
  if (e.target.closest('.panel-controls')) return
  dragState.value = {
    dragging: true,
    offsetX: e.clientX - (panelPos.value.x || panelRef.value?.getBoundingClientRect().left || 0),
    offsetY: e.clientY - (panelPos.value.y || panelRef.value?.getBoundingClientRect().top || 0)
  }
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

function onDrag(e) {
  if (!dragState.value.dragging) return
  hasMoved.value = true
  panelPos.value = {
    x: e.clientX - dragState.value.offsetX,
    y: e.clientY - dragState.value.offsetY
  }
}

function stopDrag() {
  dragState.value.dragging = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

function scan() {
  const result = props.errorDetector.detectErrors()
  errors.value = result.errors
  warnings.value = result.warnings
  const now = new Date()
  lastScanTime.value = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
}

scan()
</script>

<style scoped>
.error-panel {
  position: fixed;
  top: 60px;
  right: 20px;
  width: 400px;
  max-height: calc(100vh - 100px);
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  z-index: 999;
  overflow: hidden;
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
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-icon {
  font-size: 14px;
}

.panel-header h3 {
  margin: 0;
  color: #e0e0e0;
  font-size: 13px;
  font-weight: 600;
}

.panel-controls {
  display: flex;
  gap: 4px;
}

.ctrl-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 3px;
  line-height: 1;
  transition: all 0.15s;
}

.ctrl-btn:hover {
  color: #fff;
  background: #3c3c3c;
}

.close-btn:hover {
  background: #c42b1c;
  color: #fff;
}

.panel-body {
  padding: 12px 14px;
  overflow-y: auto;
  flex: 1;
}

.panel-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.btn-scan {
  background: #0078d4;
  border: none;
  color: #fff;
  padding: 6px 14px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s;
}

.btn-scan:hover {
  background: #1a8ae8;
}

.scan-time {
  font-size: 11px;
  color: #666;
}

.no-issues {
  text-align: center;
  padding: 20px;
  color: #4ec9b0;
  font-size: 13px;
  background: #1a2e2a;
  border-radius: 6px;
  border: 1px solid #2a4a3a;
}

.no-issues-icon {
  font-size: 24px;
  margin-bottom: 6px;
}

.issue-list {
  margin-bottom: 12px;
}

.list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.list-header h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.error-list .list-header h4 {
  color: #f44747;
}

.error-list .list-icon {
  color: #f44747;
  font-weight: bold;
}

.warning-list .list-header h4 {
  color: #cca700;
}

.warning-list .list-icon {
  color: #cca700;
  font-weight: bold;
}

.issue-item {
  display: flex;
  gap: 10px;
  padding: 10px 12px;
  margin-bottom: 6px;
  border-radius: 4px;
  transition: background 0.15s;
}

.error-item {
  background: #2d1a1a;
  border-left: 3px solid #f44747;
}

.warning-item {
  background: #2d2a1a;
  border-left: 3px solid #cca700;
}

.issue-item:hover {
  background: #333;
}

.issue-icon {
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
  margin-top: 1px;
}

.error-item .issue-icon {
  color: #f44747;
}

.warning-item .issue-icon {
  color: #cca700;
}

.issue-content {
  flex: 1;
  min-width: 0;
}

.issue-message {
  color: #e0e0e0;
  font-size: 12px;
  margin-bottom: 4px;
  line-height: 1.4;
}

.issue-suggestion {
  color: #888;
  font-size: 11px;
  line-height: 1.4;
}
</style>
