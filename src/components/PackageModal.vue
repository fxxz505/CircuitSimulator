<template>
  <div class="modal-overlay" :class="{ show }" @click.self="$emit('close')">
    <div class="modal">
      <div class="modal-header">
        <span>📦 打包为自定义元器件</span>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>元器件名称</label>
          <input 
            v-model="componentName" 
            type="text" 
            placeholder="输入元器件名称"
            class="input"
          />
        </div>
        
        <div class="info-box">
          <div class="info-item">
            <span class="info-label">选中元器件:</span>
            <span class="info-value">{{ selectedComponents.length }} 个</span>
          </div>
          <div class="info-item">
            <span class="info-label">输入端口:</span>
            <span class="info-value">{{ inputCount }} 个</span>
          </div>
          <div class="info-item">
            <span class="info-label">输出端口:</span>
            <span class="info-value">{{ outputCount }} 个</span>
          </div>
        </div>
        
        <div class="warning" v-if="selectedComponents.length === 0">
          ⚠️ 请先在画布上选择要打包的元器件
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="$emit('close')">取消</button>
        <button 
          class="btn btn-primary" 
          @click="onCreate"
          :disabled="!canCreate"
        >
          创建
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { COMPONENT_TYPES } from '../constants/componentTypes'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  selectedComponents: {
    type: Array,
    default: () => []
  },
  selectedWires: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'create'])

const componentName = ref('')

watch(() => props.show, (newVal) => {
  if (!newVal) {
    componentName.value = ''
  }
})

const inputCount = computed(() => {
  let count = 0
  props.selectedComponents.forEach(comp => {
    const def = COMPONENT_TYPES[comp.type]
    if (!def) return
    for (let i = 0; i < def.inputs; i++) {
      const hasWire = props.selectedWires.some(w => 
        w.to.componentId === comp.id && w.to.port === i
      )
      if (!hasWire) {
        count++
      }
    }
  })
  return count
})

const outputCount = computed(() => {
  let count = 0
  props.selectedComponents.forEach(comp => {
    const def = COMPONENT_TYPES[comp.type]
    if (!def) return
    for (let i = 0; i < def.outputs; i++) {
      const hasWire = props.selectedWires.some(w => 
        w.from.componentId === comp.id && w.from.port === i
      )
      if (!hasWire) {
        count++
      }
    }
  })
  return count
})

const canCreate = computed(() => {
  return props.selectedComponents.length > 0 && componentName.value.trim().length > 0
})

function onCreate() {
  if (canCreate.value) {
    emit('create', {
      name: componentName.value.trim(),
      components: props.selectedComponents,
      wires: props.selectedWires
    })
    componentName.value = ''
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-overlay.show {
  display: flex;
}

.modal {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  width: 400px;
  max-width: 90%;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: slideUp 0.2s ease;
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  padding: 14px 18px;
  background: #2a2a2a;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #3c3c3c;
  color: #e0e0e0;
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
  background: #c42b1c;
  color: #fff;
}

.modal-body {
  padding: 16px 18px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #ccc;
  margin-bottom: 8px;
}

.input {
  width: 100%;
  padding: 7px 12px;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  color: #e0e0e0;
  font-size: 13px;
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: #0078d4;
}

.info-box {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  font-size: 12px;
}

.info-label {
  color: #888;
}

.info-value {
  color: #e0e0e0;
  font-weight: 600;
}

.warning {
  background: #3a2a1a;
  border: 1px solid #5a4a2a;
  border-radius: 4px;
  padding: 10px;
  color: #e0a040;
  font-size: 12px;
}

.modal-footer {
  padding: 12px 18px;
  background: #2a2a2a;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid #3c3c3c;
}

.btn {
  padding: 7px 16px;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-secondary {
  background: #3c3c3c;
  color: #e0e0e0;
}

.btn-secondary:hover {
  background: #4c4c4c;
}

.btn-primary {
  background: #0078d4;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #1a8ae8;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
