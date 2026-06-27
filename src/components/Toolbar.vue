<template>
  <div class="toolbar">
    <div class="toolbar-group file-group">
      <button class="btn btn-icon" @click="$emit('new-circuit')" title="新建电路 (Ctrl+N)">
        <span class="btn-emoji">📄</span>
        <span class="btn-label">新建</span>
      </button>
      <button class="btn btn-icon" @click="$emit('load-circuit')" title="导入电路 (Ctrl+O)">
        <span class="btn-emoji">📂</span>
        <span class="btn-label">导入</span>
      </button>
      <button class="btn btn-icon" @click="$emit('save-circuit')" title="保存电路 (Ctrl+S)">
        <span class="btn-emoji">💾</span>
        <span class="btn-label">保存</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group edit-group">
      <button class="btn btn-icon" @click="$emit('undo')" title="撤销 (Ctrl+Z)">
        <span class="btn-emoji">↶</span>
      </button>
      <button class="btn btn-icon" @click="$emit('redo')" title="重做 (Ctrl+Y)">
        <span class="btn-emoji">↷</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group sim-group">
      <button class="btn btn-icon btn-play" @click="$emit('toggle-simulation')" 
              :title="isSimulating ? '暂停仿真 (Space)' : '开始仿真 (Space)'"
              :class="{ active: isSimulating }">
        <span class="btn-emoji">{{ isSimulating ? '⏸' : '▶' }}</span>
      </button>
      <button class="btn btn-icon" @click="$emit('step-simulation')" title="单步执行 (S)">
        <span class="btn-emoji">⏭</span>
      </button>
      <button class="btn btn-icon" @click="$emit('reset-simulation')" title="重置仿真">
        <span class="btn-emoji">⏮</span>
      </button>
      <div class="speed-control">
        <button class="speed-btn" @click="$emit('update:clockSpeed', Math.max(1, clockSpeed - 1))" :disabled="clockSpeed <= 1" title="减速">−</button>
        <div class="speed-slider-wrap">
          <input 
            type="range" 
            :value="clockSpeed" 
            @input="$emit('update:clockSpeed', parseInt($event.target.value))"
            min="1" 
            max="60" 
            class="speed-slider"
          >
          <div class="speed-ticks">
            <span>1</span>
            <span>10</span>
            <span>30</span>
            <span>60</span>
          </div>
        </div>
        <button class="speed-btn" @click="$emit('update:clockSpeed', Math.min(60, clockSpeed + 1))" :disabled="clockSpeed >= 60" title="加速">+</button>
        <span class="speed-label">{{ clockSpeed }} Hz</span>
      </div>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group view-group">
      <button class="btn btn-icon" @click="$emit('zoom-in')" title="放大">
        <span class="btn-emoji">🔍+</span>
      </button>
      <button class="btn btn-icon" @click="$emit('zoom-out')" title="缩小">
        <span class="btn-emoji">🔍-</span>
      </button>
    </div>

    <div class="toolbar-divider"></div>

    <div class="toolbar-group tool-group">
      <button class="btn btn-icon" @click="$emit('show-truth-table')" title="真值表分析">
        <span class="btn-emoji">📊</span>
      </button>
      <button class="btn btn-icon" @click="$emit('show-expression-to-circuit')" title="表达式转电路">
        <span class="btn-emoji">🔤</span>
      </button>
      <button class="btn btn-icon" @click="$emit('show-error-detection')" title="电路错误检测">
        <span class="btn-emoji">⚠️</span>
      </button>
      <button class="btn btn-icon" @click="$emit('toggle-cpu-debug')" title="CPU调试器">
        <span class="btn-emoji">🔧</span>
      </button>
      <button class="btn btn-icon" @click="$emit('toggle-command-console')" title="命令控制台">
        <span class="btn-emoji">⌨</span>
      </button>
      <button class="btn btn-icon" @click="$emit('package-component')" :disabled="!hasSelection" title="打包为自定义组件">
        <span class="btn-emoji">📦</span>
      </button>
    </div>

    <div class="spacer"></div>

    <div class="toolbar-group nav-group">
      <button class="btn btn-text" @click="$emit('show-help')" title="帮助与说明">
        ❓ 帮助
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isSimulating: Boolean,
  clockSpeed: {
    type: Number,
    default: 5
  },
  hasSelection: {
    type: Boolean,
    default: false
  }
})

defineEmits([
  'toggle-simulation',
  'step-simulation',
  'reset-simulation',
  'new-circuit',
  'save-circuit',
  'load-circuit',
  'undo',
  'redo',
  'zoom-in',
  'zoom-out',
  'show-help',
  'update:clockSpeed',
  'package-component',
  'toggle-cpu-debug',
  'show-truth-table',
  'show-expression-to-circuit',
  'show-error-detection',
  'toggle-command-console'
])
</script>

<style scoped>
.toolbar {
  height: 48px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  display: flex;
  align-items: center;
  padding: 0 8px;
  gap: 0;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 4px;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #3c3c3c;
  margin: 0 6px;
}

.spacer {
  flex: 1;
}

.btn {
  background: transparent;
  border: 1px solid transparent;
  color: #ccc;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.btn:hover {
  background: #3c3c3c;
  border-color: #4c4c4c;
}

.btn:active {
  background: #2a2a2a;
}

.btn-icon {
  padding: 4px 6px;
  height: 32px;
  min-width: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.btn-icon .btn-emoji {
  font-size: 15px;
  line-height: 1;
}

.btn-icon .btn-label {
  font-size: 11px;
  color: #999;
  margin-left: 2px;
}

.btn-play {
  background: #1a3a1a;
  border-color: #2a5a2a;
}

.btn-play:hover {
  background: #2a4a2a;
  border-color: #3a6a3a;
}

.btn-play.active {
  background: #2a5a2a;
  border-color: #4a8a4a;
  color: #4aff4a;
}

.btn-text {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
}

.btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.btn:disabled:hover {
  background: transparent;
  border-color: transparent;
}

.speed-control {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 4px;
  padding-left: 8px;
  border-left: 1px solid #3c3c3c;
}

.speed-btn {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  color: #ccc;
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 0;
  line-height: 1;
}

.speed-btn:hover:not(:disabled) {
  background: #3c3c3c;
  border-color: #4a9eff;
  color: #4a9eff;
}

.speed-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.speed-slider-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.speed-label {
  font-size: 11px;
  color: #4a9eff;
  font-weight: 600;
  min-width: 48px;
  text-align: center;
  font-family: 'Consolas', monospace;
}

.speed-slider {
  width: 100px;
  cursor: pointer;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: #3c3c3c;
  border-radius: 2px;
  outline: none;
}

.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #4a9eff;
  cursor: pointer;
  border: 2px solid #1e1e1e;
  transition: all 0.15s;
}

.speed-slider::-webkit-slider-thumb:hover {
  background: #5abfff;
  transform: scale(1.15);
}

.speed-ticks {
  display: flex;
  justify-content: space-between;
  width: 100px;
  padding: 0 2px;
}

.speed-ticks span {
  font-size: 8px;
  color: #555;
  font-family: 'Consolas', monospace;
}
</style>
