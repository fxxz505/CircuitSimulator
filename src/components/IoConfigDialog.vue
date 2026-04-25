<template>
  <div v-if="visible" class="io-config-overlay" @click.self="close">
    <div class="io-config-dialog">
      <div class="dialog-header">
        <h3>🔧 I/O 端口配置</h3>
        <button class="close-btn" @click="close">×</button>
      </div>
      
      <div class="dialog-body">
        <!-- EXT_RAM配置 -->
        <div v-if="component?.type === 'EXT_RAM'" class="config-section">
          <h4>EXT_RAM 端口配置</h4>
          <div class="form-group">
            <label>地址端口:</label>
            <input v-model.number="config.addressPort" type="text" class="hex-input" @input="updateComponent" />
          </div>
          <div class="form-group">
            <label>数据端口:</label>
            <input v-model.number="config.dataPort" type="text" class="hex-input" @input="updateComponent" />
          </div>
          <div class="form-group">
            <label>控制端口:</label>
            <input v-model.number="config.controlPort" type="text" class="hex-input" @input="updateComponent" />
          </div>
        </div>
        
        <!-- IO_PORT配置 -->
        <div v-if="component?.type === 'IO_PORT'" class="config-section">
          <h4>IO_PORT 端口配置</h4>
          <div class="form-group">
            <label>端口号:</label>
            <input v-model.number="config.portNumber" type="text" class="hex-input" @input="updateComponent" />
          </div>
          <div class="form-group">
            <label>输入值（模拟外部输入）:</label>
            <input v-model.number="config.inputReg" type="text" class="hex-input" @input="updateComponent" />
          </div>
          <div class="info-text">
            OUT值由CPU写入，IN值可通过此处设置模拟外部输入信号
          </div>
        </div>
        
        <!-- TIMER配置 -->
        <div v-if="component?.type === 'TIMER'" class="config-section">
          <h4>TIMER 端口配置</h4>
          <div class="form-group">
            <label>状态端口:</label>
            <input v-model.number="config.statusPort" type="text" class="hex-input" @input="updateComponent" />
          </div>
          <div class="form-group">
            <label>预加载端口:</label>
            <input v-model.number="config.preloadPort" type="text" class="hex-input" @input="updateComponent" />
          </div>
          <div class="form-group">
            <label>控制端口:</label>
            <input v-model.number="config.controlPort" type="text" class="hex-input" @input="updateComponent" />
          </div>
        </div>
        
        <button class="btn btn-reset" @click="resetDefaults">恢复默认</button>
      </div>
      
      <div class="dialog-footer">
        <button class="btn" @click="close">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  component: Object
})

const emit = defineEmits(['close', 'update'])

const visible = ref(!!props.component)
const config = ref({})

watch(() => props.component, (comp) => {
  if (comp) {
    visible.value = true
    config.value = JSON.parse(JSON.stringify(comp.portConfig || {}))
    if (comp.type === 'IO_PORT' && comp.state) {
      config.value.inputReg = comp.state.inputReg || 0
    }
  } else {
    visible.value = false
  }
}, { immediate: true })

function close() {
  emit('close')
}

function updateComponent() {
  if (props.component) {
    if (props.component.type === 'IO_PORT') {
      const { inputReg, ...portConfig } = config.value
      props.component.portConfig = portConfig
      if (props.component.state) {
        props.component.state.inputReg = inputReg
      }
    } else {
      props.component.portConfig = { ...config.value }
    }
    emit('update', props.component.id, props.component.portConfig)
  }
}

function resetDefaults() {
  const defaults = {
    EXT_RAM: { addressPort: 0x80, dataPort: 0x81, controlPort: 0x82 },
    IO_PORT: { portNumber: 0x90, inputReg: 0 },
    TIMER: { statusPort: 0x20, preloadPort: 0x21, controlPort: 0x22 }
  }
  config.value = { ...defaults[props.component?.type] || {} }
  updateComponent()
}
</script>

<style scoped>
.io-config-overlay {
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

.io-config-dialog {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  max-width: 420px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.dialog-header {
  padding: 14px 18px;
  background: #2a2a2a;
  border-bottom: 1px solid #3c3c3c;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dialog-header h3 {
  margin: 0;
  font-size: 14px;
  color: #e0e0e0;
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
  max-height: 60vh;
  overflow-y: auto;
}

.config-section {
  margin-bottom: 20px;
}

.config-section h4 {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: #4a9eff;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  border-bottom: 1px solid #3c3c3c;
  padding-bottom: 8px;
}

.form-group {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.form-group label {
  min-width: 100px;
  font-size: 12px;
  color: #ccc;
}

.hex-input {
  flex: 1;
  padding: 7px 12px;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
  font-family: monospace;
}

.hex-input:focus {
  outline: none;
  border-color: #0078d4;
}

.info-text {
  margin-top: 12px;
  padding: 10px;
  background: #1a2e2a;
  border: 1px solid #2a4a3a;
  border-radius: 4px;
  font-size: 11px;
  color: #4ec9b0;
  line-height: 1.5;
}

.btn {
  padding: 7px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
  border: 1px solid #3c3c3c;
  background: #3c3c3c;
  color: #e0e0e0;
}

.btn:hover {
  background: #4c4c4c;
}

.btn-reset {
  width: 100%;
  margin-top: 10px;
  border-color: #e17055;
  color: #e17055;
  background: transparent;
}

.btn-reset:hover {
  background: #e1705520;
}

.dialog-footer {
  padding: 12px 18px;
  background: #2a2a2a;
  border-top: 1px solid #3c3c3c;
  display: flex;
  justify-content: flex-end;
}
</style>
