<template>
  <div v-if="visible" class="clock-settings-overlay" @click.self="close">
    <div class="clock-settings-dialog">
      <div class="dialog-header">
        <h3>时钟参数设置</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      <div class="dialog-body">
        <div class="setting-group">
          <label>频率: {{ settings.frequency }} Hz</label>
          <input type="range" v-model.number="settings.frequency" min="1" max="100" @input="updateClock" />
          <div class="range-labels"><span>1 Hz</span><span>100 Hz</span></div>
        </div>
        <div class="setting-group">
          <label>占空比: {{ settings.dutyCycle }}%</label>
          <input type="range" v-model.number="settings.dutyCycle" min="10" max="90" @input="updateClock" />
          <div class="range-labels"><span>10%</span><span>90%</span></div>
        </div>
        <div class="setting-group">
          <label>相位:</label>
          <div class="phase-selector">
            <button v-for="p in [0, 90, 180, 270]" :key="p" 
                    :class="{ active: settings.phase === p }"
                    @click="settings.phase = p; updateClock()">
              {{ p }}°
            </button>
          </div>
        </div>
        <div class="setting-group">
          <label class="toggle-label">
            <input type="checkbox" v-model="settings.enabled" @change="updateClock" />
            启用时钟
          </label>
        </div>
        <div class="waveform-preview">
          <canvas ref="waveformCanvas" width="300" height="80"></canvas>
        </div>
      </div>
      <div class="dialog-footer">
        <button @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

const props = defineProps({
  clockComponent: Object
})

const emit = defineEmits(['close', 'update'])

const visible = ref(!!props.clockComponent)
const waveformCanvas = ref(null)
const settings = ref({
  frequency: props.clockComponent?.frequency || 1,
  dutyCycle: props.clockComponent?.dutyCycle || 50,
  phase: props.clockComponent?.phase || 0,
  enabled: props.clockComponent?.enabled !== false
})

watch(() => props.clockComponent, (newComp) => {
  if (newComp) {
    visible.value = true
    settings.value = {
      frequency: newComp.frequency || 1,
      dutyCycle: newComp.dutyCycle || 50,
      phase: newComp.phase || 0,
      enabled: newComp.enabled !== false
    }
    nextTick(() => drawWaveform())
  }
})

function updateClock() {
  if (props.clockComponent) {
    Object.assign(props.clockComponent, settings.value)
    emit('update', props.clockComponent.id, settings.value)
    drawWaveform()
  }
}

function drawWaveform() {
  if (!waveformCanvas.value) return
  const canvas = waveformCanvas.value
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const { frequency, dutyCycle, phase } = settings.value
  const period = Math.max(4, Math.round(64 / frequency))
  const cycles = Math.min(4, Math.ceil(64 / period))
  
  ctx.strokeStyle = '#00ff00'
  ctx.lineWidth = 2
  ctx.beginPath()

  for (let x = 0; x < canvas.width; x++) {
    const t = (x / canvas.width) * period * cycles + (phase / 360) * period
    const pos = t % period
    const y = pos < (period * dutyCycle / 100) ? 15 : 65
    
    if (x === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.stroke()

  // Grid
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  ctx.setLineDash([2, 4])
  ctx.beginPath()
  ctx.moveTo(0, 40)
  ctx.lineTo(canvas.width, 40)
  ctx.stroke()
  ctx.setLineDash([])
}

function close() {
  visible.value = false
  emit('close')
}
</script>

<style scoped>
.clock-settings-overlay {
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

.clock-settings-dialog {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  padding: 0;
  min-width: 360px;
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

.dialog-body { padding: 16px 18px; }

.setting-group { margin-bottom: 20px; }

.setting-group label {
  display: block;
  color: #ccc;
  margin-bottom: 8px;
  font-size: 12px;
}

.setting-group input[type="range"] {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #3c3c3c;
  border-radius: 2px;
  outline: none;
}

.setting-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #0078d4;
  cursor: pointer;
  border: none;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  color: #666;
  font-size: 11px;
  margin-top: 4px;
}

.phase-selector {
  display: flex;
  gap: 6px;
}

.phase-selector button {
  flex: 1;
  padding: 7px;
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  color: #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.phase-selector button:hover {
  background: #3c3c3c;
}

.phase-selector button.active {
  background: #0078d4;
  border-color: #0078d4;
  color: #fff;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.waveform-preview {
  background: #1e1e1e;
  border-radius: 4px;
  padding: 10px;
  border: 1px solid #3c3c3c;
}

.dialog-footer {
  padding: 12px 18px;
  background: #2a2a2a;
  border-top: 1px solid #3c3c3c;
  text-align: right;
}

.dialog-footer button {
  padding: 7px 18px;
  background: #3c3c3c;
  border: 1px solid #4c4c4c;
  color: #e0e0e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.dialog-footer button:hover {
  background: #4c4c4c;
}
</style>
