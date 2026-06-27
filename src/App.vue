﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿<template>
  <div class="app">
    <Toolbar 
      :is-simulating="simulation.isSimulating.value"
      :clock-speed="simulation.clockSpeed.value"
      :has-selection="hasSelection"
      @toggle-simulation="toggleSimulation"
      @step-simulation="simulation.stepSimulation"
      @reset-simulation="simulation.resetSimulation"
      @new-circuit="newCircuit"
      @save-circuit="saveCircuit"
      @load-circuit="loadCircuit"
      @undo="undo"
      @redo="redo"
      @zoom-in="zoomIn"
      @zoom-out="zoomOut"
      @show-help="showHelp"
      @package-component="showPackageModal"
      @toggle-cpu-debug="showCpuDebugger = !showCpuDebugger"
      @update:clock-speed="simulation.setClockSpeed($event)"
      @show-truth-table="showTruthTable"
      @show-expression-to-circuit="showExpressionToCircuitPanel"
      @show-error-detection="showErrorDetection"
      @toggle-command-console="showCommandConsole = !showCommandConsole"
    />
    
    <div class="main-container">
      <ComponentLibrary 
        :component-types="COMPONENT_TYPES"
        :categories="CATEGORIES"
      />
      
      <div class="canvas-with-panels">
        <Canvas 
          ref="canvasRef"
          :circuit="circuit"
          :simulation="simulation"
          @component-added="onComponentAdded"
          @open-clock-settings="openClockSettings"
          @open-cpu-debugger="openCPUDbgger"
          @open-exec-debugger="openExecDebugger"
          @open-instruction-editor="openInstructionEditor"
          @open-divider-settings="openDividerSettings"
          @open-memory-editor="openMemoryEditor"
          @open-dotmatrix-editor="openDotMatrixEditor"
          @open-state-viewer="openStateViewer"
          @open-io-config="openIoConfig"
          @open-component-detail="showComponentDetails"
        />
        
        <!-- CPU调试器面板 -->
        <CPUDbgPanel
          v-if="showCpuDebugger && cpuComponent && cpuComponent.state"
          :cpu-state="cpuComponent.state"
          :rom-data="cpuRomData"
          :changed-regs="changedRegisters"
          :component-id="cpuComponent.id ? cpuComponent.id.substring(0, 8) : ''"
          :io-outputs="cpuComponent.ioOutputs || {}"
          @close="showCpuDebugger = false"
          @run="startCPU"
          @step="stepCPU"
          @pause="pauseCPU"
          @reset="resetCPU"
          @toggle-breakpoint="toggleCPUBreakpoint"
        />
        
        <!-- 指令执行器调试器面板 -->
        <ExecDbgPanel
          v-if="showExecDebugger && execComponent && execComponent.state"
          :exec-state="execComponent.state"
          :rom-data="execRomData"
          :changed-regs="changedRegisters"
          :component-id="execComponent.id ? execComponent.id.substring(0, 8) : ''"
          @close="showExecDebugger = false"
          @run="startExec"
          @step="stepExec"
          @pause="pauseExec"
          @reset="resetExec"
        />
      </div>
    </div>

    <HelpModal 
      :show="showHelpModal" 
      @close="showHelpModal = false" 
    />
    <PackageModal 
      :show="showPackageModalValue" 
      :selected-components="circuit.selection.components"
      :selected-wires="circuit.selection.wires"
      @close="showPackageModalValue = false"
      @create="onPackageCreate"
    />
    
    <!-- 时钟设置对话框 -->
    <ClockSettingsDialog
      v-if="showClockSettings && clockComponentForSettings"
      :clock-component="clockComponentForSettings"
      :clock-speed="simulation.clockSpeed.value"
      @close="showClockSettings = false"
      @update="updateClockSettings"
    />
    
    <!-- 指令编辑器 -->
    <InstructionEditor
      v-if="showInstructionEditor && romComponentForEditor"
      :rom-component="romComponentForEditor"
      @close="showInstructionEditor = false"
      @load="loadToROM"
    />
    
    <!-- I/O端口配置对话框 -->
    <IoConfigDialog
      v-if="showIoConfig && ioComponentForConfig"
      :component="ioComponentForConfig"
      @close="showIoConfig = false"
      @update="updateIoConfig"
    />

    <!-- 存储器编辑器 -->
    <MemoryEditor
      v-if="showMemoryEditor && memoryComponentForEditor"
      :component="memoryComponentForEditor"
      @close="showMemoryEditor = false"
    />

    <!-- 点阵屏字模编辑器 -->
    <DotMatrixEditor
      v-if="showDotMatrixEditor && dotMatrixComponentForEditor"
      :component="dotMatrixComponentForEditor"
      @close="showDotMatrixEditor = false"
    />

    <!-- 元器件状态查看器 -->
    <StateViewer
      v-if="showStateViewer && stateViewerComponent"
      :component="stateViewerComponent"
      @close="showStateViewer = false"
    />

    <!-- 时钟分频器设置对话框 -->
    <div v-if="showDividerSettings && dividerComponentForSettings" class="divider-settings-overlay" @click.self="showDividerSettings = false">
      <div class="divider-settings-dialog">
        <div class="dialog-header">
          <h3>时钟分频器设置</h3>
          <button class="close-btn" @click="showDividerSettings = false">×</button>
        </div>
        <div class="dialog-body">
          <div class="setting-group">
            <label>分频系数: {{ dividerComponentForSettings.divideBy }}</label>
            <input type="range" v-model.number="dividerComponentForSettings.divideBy" min="1" max="256" step="1" />
            <div class="range-labels"><span>1</span><span>256</span></div>
          </div>
          <div class="setting-group">
            <label>快速选择:</label>
            <div class="preset-buttons">
              <button v-for="p in [2, 4, 8, 16, 32, 64, 128]" :key="p"
                      :class="{ active: dividerComponentForSettings.divideBy === p }"
                      @click="dividerComponentForSettings.divideBy = p">
                ÷{{ p }}
              </button>
            </div>
          </div>
        </div>
        <div class="dialog-footer">
          <button @click="showDividerSettings = false">关闭</button>
        </div>
      </div>
    </div>

    <!-- 真值表和逻辑表达式面板 -->
    <div v-if="showTruthTablePanel" class="truth-table-panel" @click.self="showTruthTablePanel = false">
      <div class="truth-table-dialog">
        <div class="dialog-header">
          <h3>真值表与逻辑表达式</h3>
          <button class="close-btn" @click="showTruthTablePanel = false">×</button>
        </div>
        <div class="dialog-body">
          <button class="btn-analyze" @click="truthTableAnalyzer.analyzeCircuit()">分析电路</button>
          
          <div v-if="truthTableAnalyzer.truthTable.value" class="truth-table-section">
            <h4>真值表</h4>
            <div v-if="truthTableAnalyzer.truthTable.value.isSequential || truthTableAnalyzer.truthTable.value.isTooLarge" class="truth-table-message">
              <p>{{ truthTableAnalyzer.truthTable.value.message }}</p>
            </div>
            <template v-else>
              <table class="truth-table">
                <thead>
                  <tr>
                    <th v-for="inp in truthTableAnalyzer.truthTable.value.inputs" :key="inp">{{ inp }}</th>
                    <th v-for="out in truthTableAnalyzer.truthTable.value.outputs" :key="out">{{ out }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(row, idx) in truthTableAnalyzer.truthTable.value.rows" :key="idx">
                    <td v-for="(v, i) in row.inputs" :key="'i'+i">{{ v }}</td>
                    <td v-for="(v, i) in row.outputs" :key="'o'+i">{{ v }}</td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>

          <div v-if="truthTableAnalyzer.logicExpression.value" class="expression-section">
            <h4>逻辑表达式</h4>
            <pre>{{ truthTableAnalyzer.logicExpression.value }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- 逻辑表达式转电路 -->
    <div v-if="showExpressionToCircuit" class="expression-to-circuit-panel" @click.self="showExpressionToCircuit = false">
      <div class="expression-to-circuit-dialog">
        <div class="dialog-header">
          <h3>逻辑表达式转电路</h3>
          <button class="close-btn" @click="showExpressionToCircuit = false">×</button>
        </div>
        <div class="dialog-body">
          <div class="expression-input-group">
            <label>输入布尔表达式:</label>
            <textarea v-model="expressionInput" placeholder="例如: (A & B) | (!A & C)" rows="3"></textarea>
            <div class="expression-hint">支持运算符: & (与), | (或), ! (非)</div>
          </div>
          <button class="btn-generate" @click="handleGenerateCircuitFromExpression">生成电路</button>
        </div>
      </div>
    </div>

    <!-- 组件详情面板 -->
    <ComponentDetailPanel
      v-if="showComponentDetail && selectedComponentForDetail"
      :selected-component="selectedComponentForDetail"
      @close="showComponentDetail = false"
    />

    <!-- 错误检测面板 -->
    <ErrorPanel
      v-if="showErrorPanel"
      :error-detector="errorDetector"
      @close="showErrorPanel = false"
    />

    <!-- 命令控制台 -->
    <CommandConsole
      v-if="showCommandConsole"
      :command-handler="handleCommand"
      @close="showCommandConsole = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { COMPONENT_TYPES, CATEGORIES, updateCategoriesWithCustom } from './constants/componentTypes'
import { useCircuit } from './composables/useCircuit'
import { useSimulation } from './composables/useSimulation'
import { useTruthTable } from './composables/useTruthTable'
import { useErrorDetection } from './composables/useErrorDetection'
import { generateCircuitFromExpression as generateCircuitFromExpr } from './composables/useExpressionToCircuit'
import { createCustomComponent } from './composables/useCustomComponents'
import { calculateTextHeight } from './utils/textUtils'
import Toolbar from './components/Toolbar.vue'
import ComponentLibrary from './components/ComponentLibrary.vue'
import Canvas from './components/Canvas.vue'
import HelpModal from './components/HelpModal.vue'
import PackageModal from './components/PackageModal.vue'
import CPUDbgPanel from './components/CPUDbgPanel.vue'
import ExecDbgPanel from './components/ExecDbgPanel.vue'
import ClockSettingsDialog from './components/ClockSettingsDialog.vue'
import InstructionEditor from './components/InstructionEditor.vue'
import IoConfigDialog from './components/IoConfigDialog.vue'
import MemoryEditor from './components/MemoryEditor.vue'
import DotMatrixEditor from './components/DotMatrixEditor.vue'
import StateViewer from './components/StateViewer.vue'
import ComponentDetailPanel from './components/ComponentDetailPanel.vue'
import ErrorPanel from './components/ErrorPanel.vue'
import CommandConsole from './components/CommandConsole.vue'

const circuit = useCircuit()
const simulation = useSimulation(circuit)
const truthTableAnalyzer = useTruthTable(circuit)
const errorDetector = useErrorDetection(circuit)
const canvasRef = ref(null)

const history = ref([])
const historyIndex = ref(-1)
const MAX_HISTORY = 50
const showHelpModal = ref(false)
const showPackageModalValue = ref(false)

// 新面板状态
const showCpuDebugger = ref(false)
const showExecDebugger = ref(false)
const showClockSettings = ref(false)
const showInstructionEditor = ref(false)
const showDividerSettings = ref(false)
const showMemoryEditor = ref(false)
const showDotMatrixEditor = ref(false)
const showStateViewer = ref(false)
const showIoConfig = ref(false)
const showTruthTablePanel = ref(false)
const showExpressionToCircuit = ref(false)
const showComponentDetail = ref(false)
const showErrorPanel = ref(false)
const showCommandConsole = ref(false)
const expressionInput = ref('')
const selectedComponentForDetail = ref(null)

// 选中的组件
const clockComponentForSettings = ref(null)
const dividerComponentForSettings = ref(null)
const cpuComponent = ref(null)
const execComponent = ref(null)
const romComponentForEditor = ref(null)
const memoryComponentForEditor = ref(null)
const dotMatrixComponentForEditor = ref(null)
const stateViewerComponent = ref(null)
const ioComponentForConfig = ref(null)
const changedRegisters = ref([])

// ROM数据用于调试器 - CPU关联的ROM
const cpuRomData = computed(() => {
  if (!cpuComponent.value) return []
  const rom = findAssociatedROM(cpuComponent.value)
  return rom && rom.state ? rom.state : []
})

// ROM数据用于调试器 - EXEC关联的ROM
const execRomData = computed(() => {
  if (!execComponent.value) return []
  const rom = findAssociatedROM(execComponent.value)
  return rom && rom.state ? rom.state : []
})

// ROM数据用于通用调试器
const romDataForDebugger = computed(() => {
  const roms = circuit.components.value.filter(c => c.type === 'ROM256')
  return roms.length > 0 && roms[0].state ? roms[0].state : []
})

// 查找与CPU/EXEC关联的ROM（查找电路中最近的ROM256）
function findAssociatedROM(comp) {
  // 查找电路中的ROM256
  const roms = circuit.components.value.filter(c => c.type === 'ROM256')
  if (roms.length > 0) return roms[0]
  return null
}

const hasSelection = computed(() => {
  return circuit.selection.components.length > 0
})

function showPackageModal() {
  showPackageModalValue.value = true
}

function onPackageCreate({ name, components, wires }) {
  createCustomComponent(name, components, wires)
  updateCategoriesWithCustom()
  showPackageModalValue.value = false
  circuit.clearSelection()
}

function saveState() {
  // P2-11: 序列化时排除运行态字段 _internalState（自定义组件内部状态，需重新初始化）
  const components = circuit.components.value.map(c => {
    const clone = JSON.parse(JSON.stringify(c))
    delete clone._internalState
    return clone
  })
  const state = {
    components: components,
    wires: JSON.parse(JSON.stringify(circuit.wires.value))
  }
  history.value = history.value.slice(0, historyIndex.value + 1)
  history.value.push(state)
  if (history.value.length > MAX_HISTORY) {
    history.value.shift()
  } else {
    historyIndex.value++
  }
}

function handleSaveHistory() {
  saveState()
}

function undo() {
  if (historyIndex.value > 0) {
    historyIndex.value--
    const state = history.value[historyIndex.value]
    circuit.components.value = JSON.parse(JSON.stringify(state.components))
    circuit.wires.value = JSON.parse(JSON.stringify(state.wires))
    circuit.clearSelection()
    simulation.simulate()
  } else if (historyIndex.value === 0 && history.value.length > 1) {
    historyIndex.value = 0
    const state = history.value[0]
    circuit.components.value = JSON.parse(JSON.stringify(state.components))
    circuit.wires.value = JSON.parse(JSON.stringify(state.wires))
    circuit.clearSelection()
    simulation.simulate()
  }
}

function redo() {
  if (historyIndex.value < history.value.length - 1) {
    historyIndex.value++
    const state = history.value[historyIndex.value]
    circuit.components.value = JSON.parse(JSON.stringify(state.components))
    circuit.wires.value = JSON.parse(JSON.stringify(state.wires))
    circuit.clearSelection()
    simulation.simulate()
  }
}

function toggleSimulation() {
  if (simulation.isSimulating.value) {
    simulation.stopSimulation()
  } else {
    simulation.startSimulation()
  }
}

function newCircuit() {
  if (confirm('确定要新建电路吗？当前进度将丢失。')) {
    circuit.reset()
    history.value = []
    historyIndex.value = -1
    saveState()
    simulation.simulate()
    cpuComponent.value = null
    romComponentForEditor.value = null
  }
}

function saveCircuit() {
  // P2-11: 序列化时排除运行态字段 _internalState
  const components = circuit.components.value.map(c => {
    const clone = JSON.parse(JSON.stringify(c))
    delete clone._internalState
    return clone
  })
  const data = JSON.stringify({
    components: components,
    wires: circuit.wires.value
  })
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'circuit.json'
  a.click()
}

function loadCircuit() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        if (data.components && data.wires) {
          circuit.reset()
          circuit.components.value = JSON.parse(JSON.stringify(data.components))
          circuit.wires.value = JSON.parse(JSON.stringify(data.wires))

          circuit.components.value.forEach(comp => {
            // P2-11: 加载时清除运行态字段，让自定义组件重新初始化内部状态
            delete comp._internalState
            if (comp.type === 'TEXT') {
              comp.height = calculateTextHeight(comp.text, comp.width)
            }
          })
          
          history.value = []
          historyIndex.value = -1
          saveState()
          simulation.simulate()
          updateCPUAndROMRefs()
        } else {
          alert('无效的电路文件格式')
        }
      } catch (err) {
        alert('导入失败：' + err.message)
      }
    }
    reader.readAsText(file)
  }
  input.click()
}

function zoomIn() {
  circuit.viewport.zoom = Math.min(3, circuit.viewport.zoom * 1.2)
}

function zoomOut() {
  circuit.viewport.zoom = Math.max(0.3, circuit.viewport.zoom / 1.2)
}

function showHelp() {
  showHelpModal.value = true
}

function onComponentAdded() {
  saveState()
  simulation.simulate()
  updateCPUAndROMRefs()
}

function updateCPUAndROMRefs() {
  const cpus = circuit.components.value.filter(c => c.type === 'CPU')
  const execs = circuit.components.value.filter(c => c.type === 'INSTRUCTION_EXECUTOR')
  const roms = circuit.components.value.filter(c => c.type === 'ROM256')
  
  cpuComponent.value = cpus.length > 0 ? cpus[0] : null
  execComponent.value = execs.length > 0 ? execs[0] : null
  romComponentForEditor.value = roms.length > 0 ? roms[0] : null
}

// 时钟设置
function openClockSettings(clockComp) {
  clockComponentForSettings.value = clockComp
  showClockSettings.value = true
}

function updateClockSettings(clockId, settings) {
  const clock = circuit.components.value.find(c => c.id === clockId)
  if (clock) {
    Object.assign(clock, settings)
  }
}

function openDividerSettings(dividerComp) {
  dividerComponentForSettings.value = dividerComp
  showDividerSettings.value = true
}

// CPU调试
function openCPUDbgger(cpuComp) {
  cpuComponent.value = cpuComp
  showCpuDebugger.value = true
}

function startCPU() {
  if (cpuComponent.value && cpuComponent.value.state) {
    cpuComponent.value.state.running = true
  }
}

function stepCPU() {
  if (cpuComponent.value && cpuComponent.value.state) {
    const roms = circuit.components.value.filter(c => c.type === 'ROM256')
    if (roms.length > 0 && roms[0].state) {
      changedRegisters.value = []
      simulation.stepCPU(cpuComponent.value, roms[0].state)
      changedRegisters.value = ['R0', 'R1', 'R2', 'R3']
      setTimeout(() => { changedRegisters.value = [] }, 500)
    }
  }
}

function pauseCPU() {
  if (cpuComponent.value && cpuComponent.value.state) {
    cpuComponent.value.state.running = false
  }
}

function resetCPU() {
  if (cpuComponent.value && cpuComponent.value.state) {
    const state = cpuComponent.value.state
    state.registers = { R0: 0, R1: 0, R2: 0, R3: 0 }
    state.pc = 0
    state.ir = 0
    state.flags = { ZERO: false, CARRY: false, HALT: false }
    state.running = false
    state.cyclesExecuted = 0
    cpuComponent.value.ioOutputs = {}
  }
}

function toggleCPUBreakpoint(addr, enabled) {
  if (!cpuComponent.value) return
  if (!cpuComponent.value.breakpoints) {
    cpuComponent.value.breakpoints = []
  }
  const bp = cpuComponent.value.breakpoints
  const idx = bp.indexOf(addr)
  if (enabled && idx === -1) {
    bp.push(addr)
  } else if (!enabled && idx !== -1) {
    bp.splice(idx, 1)
  }
}

// 指令执行器调试
function openExecDebugger(execComp) {
  execComponent.value = execComp
  showExecDebugger.value = true
}

function startExec() {
  if (execComponent.value && execComponent.value.state) {
    execComponent.value.state.running = true
  }
}

function stepExec() {
  if (execComponent.value && execComponent.value.state) {
    const roms = circuit.components.value.filter(c => c.type === 'ROM256')
    if (roms.length > 0 && roms[0].state) {
      changedRegisters.value = []
      simulation.stepInstructionExecutor(execComponent.value, roms[0].state)
      changedRegisters.value = ['R0', 'R1', 'R2', 'R3']
      setTimeout(() => { changedRegisters.value = [] }, 500)
    }
  }
}

function pauseExec() {
  if (execComponent.value && execComponent.value.state) {
    execComponent.value.state.running = false
  }
}

function resetExec() {
  if (execComponent.value && execComponent.value.state) {
    const state = execComponent.value.state
    state.registers = { R0: 0, R1: 0, R2: 0, R3: 0 }
    state.pc = 0
    state.ir = 0
    state.flags = { ZERO: false, CARRY: false, HALT: false }
    state.running = false
  }
}

// 指令编辑器
function openInstructionEditor(romComp) {
  romComponentForEditor.value = romComp
  showInstructionEditor.value = true
}

function openMemoryEditor(comp) {
  memoryComponentForEditor.value = comp
  showMemoryEditor.value = true
}

function openDotMatrixEditor(comp) {
  dotMatrixComponentForEditor.value = comp
  showDotMatrixEditor.value = true
}

function openStateViewer(comp) {
  stateViewerComponent.value = comp
  showStateViewer.value = true
}

function openIoConfig(comp) {
  ioComponentForConfig.value = comp
  showIoConfig.value = true
}

function updateIoConfig() {
  // 配置已通过 v-model 双向绑定到 component.portConfig，这里仅触发状态保存
  saveState()
}

function loadToROM(machineCode, romComp) {
  if (romComp && romComp.state) {
    romComp.state.fill(0)
    for (let i = 0; i < machineCode.length && i < 256; i++) {
      romComp.state[i] = machineCode[i]
    }
  }
}

function showTruthTable() {
  showTruthTablePanel.value = true
}

function showExpressionToCircuitPanel() {
  showExpressionToCircuit.value = true
}

function handleGenerateCircuitFromExpression() {
  if (!expressionInput.value.trim()) return
  try {
    generateCircuitFromExpr(expressionInput.value.trim(), circuit)
    showExpressionToCircuit.value = false
    saveState()
    simulation.simulate()
  } catch (e) {
    alert('表达式解析错误: ' + e.message)
  }
}

function showComponentDetails(comp) {
  selectedComponentForDetail.value = comp
  showComponentDetail.value = true
}

function showErrorDetection() {
  showErrorPanel.value = true
}

// ==================== 命令控制台处理器 ====================
function handleCommand(cmd) {
  const parts = cmd.trim().split(/\s+/)
  const op = parts[0].toLowerCase()

  switch (op) {
    case 'help':
      return [
        '可用命令:',
        '  help              显示帮助',
        '  list              列出所有元件',
        '  types             列出所有元件类型',
        '  get <id>          查看元件状态/输出',
        '  set <id> <val>    设置开关/按键状态 (0/1)',
        '  run               开始仿真',
        '  pause             暂停仿真',
        '  step              单步执行',
        '  reset             复位仿真',
        '  clock <hz>        设置时钟频率 (1-60)',
        '  probe <id>        探测元件输出值',
        '  wire <fid> <fp> <tid> <tp>  连线',
        '  count             统计元件/连线数',
        '  clear             清屏 (在控制台内输入)'
      ].join('\n')

    case 'list': {
      const comps = circuit.components.value
      if (comps.length === 0) return '电路中没有元件'
      return comps.map((c, i) => {
        const id = c.id ? c.id.substring(0, 8) : `#${i}`
        const def = COMPONENT_TYPES[c.type]
        const name = def ? def.name : c.type
        return `${id}  ${c.type}  (${name})  @(${c.x},${c.y})`
      }).join('\n')
    }

    case 'types': {
      return Object.keys(COMPONENT_TYPES).join(', ')
    }

    case 'count': {
      return `元件: ${circuit.components.value.length}  连线: ${circuit.wires.value.length}`
    }

    case 'get': {
      if (!parts[1]) return '用法: get <id>'
      const comp = findCompById(parts[1])
      if (!comp) return `未找到元件: ${parts[1]}`
      const def = COMPONENT_TYPES[comp.type] || {}
      const ins = comp.inputs.map(i => i.value).join(',')
      const outs = comp.outputs.map(o => o.value).join(',')
      let info = `类型: ${comp.type} (${def.name || '?'})\n`
      info += `位置: (${comp.x}, ${comp.y})\n`
      info += `输入: [${ins}]\n`
      info += `输出: [${outs}]`
      if (comp.state !== undefined) {
        const s = Array.isArray(comp.state) ? `[${comp.state.join(',')}]` : comp.state
        info += `\n状态: ${s}`
      }
      return info
    }

    case 'set': {
      if (!parts[1] || parts[2] === undefined) return '用法: set <id> <value>'
      const comp = findCompById(parts[1])
      if (!comp) return `未找到元件: ${parts[1]}`
      const val = parseInt(parts[2])
      const def = COMPONENT_TYPES[comp.type]
      if (!def) return `未知类型: ${comp.type}`
      if (def.isInput && comp.outputs[0] !== undefined) {
        comp.state = val ? 1 : 0
        comp.outputs[0].value = comp.state
        simulation.simulate()
        return `${comp.type} 已设置为 ${comp.state}`
      }
      if (comp.type === 'DIPSW4') {
        const idx = parts[3] !== undefined ? parseInt(parts[3]) - 1 : -1
        if (!Array.isArray(comp.state)) comp.state = [0, 0, 0, 0]
        if (idx >= 0 && idx < 4) {
          comp.state[idx] = val ? 1 : 0
          if (comp.outputs[idx]) comp.outputs[idx].value = comp.state[idx]
        } else {
          for (let i = 0; i < 4; i++) {
            comp.state[i] = (val >> i) & 1
            if (comp.outputs[i]) comp.outputs[i].value = comp.state[i]
          }
        }
        simulation.simulate()
        return `DIPSW4 状态: [${comp.state.join(',')}]`
      }
      return `${comp.type} 不支持 set 操作`
    }

    case 'run':
      simulation.startSimulation()
      return '仿真已开始'
    case 'pause':
      simulation.stopSimulation()
      return '仿真已暂停'
    case 'step':
      simulation.stepSimulation()
      return '已执行单步'
    case 'reset':
      simulation.resetSimulation()
      return '仿真已复位'

    case 'clock': {
      const hz = parseInt(parts[1])
      if (isNaN(hz)) return '用法: clock <hz>'
      simulation.setClockSpeed(hz)
      return `时钟频率: ${simulation.clockSpeed.value} Hz`
    }

    case 'probe': {
      if (!parts[1]) return '用法: probe <id>'
      const comp = findCompById(parts[1])
      if (!comp) return `未找到元件: ${parts[1]}`
      const outs = comp.outputs.map((o, i) => `out[${i}]=${o.value}`)
      return `${comp.type} 输出: ${outs.join('  ')}`
    }

    case 'wire': {
      if (parts.length < 5) return '用法: wire <from-id> <from-port> <to-id> <to-port>'
      const fromComp = findCompById(parts[1])
      const toComp = findCompById(parts[3])
      if (!fromComp) return `未找到源元件: ${parts[1]}`
      if (!toComp) return `未找到目标元件: ${parts[3]}`
      const fp = parseInt(parts[2])
      const tp = parseInt(parts[4])
      if (!fromComp.outputs[fp]) return `源端口 ${fp} 不存在`
      if (!toComp.inputs[tp]) return `目标端口 ${tp} 不存在`
      circuit.wires.value.push({
        id: `wire_${Date.now()}`,
        from: { componentId: fromComp.id, port: fp },
        to: { componentId: toComp.id, port: tp },
        value: 0
      })
      simulation.simulate()
      return `已连接 ${parts[1]}:${fp} → ${parts[3]}:${tp}`
    }

    default:
      return `未知命令: ${op}。输入 help 查看帮助。`
  }
}

function findCompById(idStr) {
  if (!idStr) return null
  const lower = idStr.toLowerCase()
  return circuit.components.value.find(c =>
    (c.id && c.id.toLowerCase().startsWith(lower)) ||
    c.id === idStr
  ) || null
}

onMounted(() => {
  window.addEventListener('save-history', handleSaveHistory)
  window.addEventListener('show-truth-table', showTruthTable)
  window.addEventListener('show-expression-to-circuit', showExpressionToCircuitPanel)
  window.addEventListener('show-error-detection', showErrorDetection)
  saveState()
})

onUnmounted(() => {
  window.removeEventListener('save-history', handleSaveHistory)
  window.removeEventListener('show-truth-table', showTruthTable)
  window.removeEventListener('show-expression-to-circuit', showExpressionToCircuitPanel)
  window.removeEventListener('show-error-detection', showErrorDetection)
})
</script>

<style scoped>
.app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-container {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-with-panels {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
}

.divider-settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.divider-settings-dialog {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  padding: 0;
  min-width: 320px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  color: #e0e0e0;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid #3c3c3c;
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
  padding: 16px;
}

.setting-group {
  margin-bottom: 16px;
}

.setting-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  color: #ccc;
}

.setting-group input[type="range"] {
  width: 100%;
  margin: 4px 0;
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
  background: #4a9eff;
  cursor: pointer;
  border: none;
}

.range-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: #888;
}

.preset-buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.preset-buttons button {
  padding: 4px 10px;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  background: #2d2d2d;
  color: #ccc;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.preset-buttons button:hover {
  background: #3c3c3c;
  border-color: #4c4c4c;
}

.preset-buttons button.active {
  background: #0078d4;
  border-color: #0078d4;
  color: #fff;
}

.dialog-footer {
  padding: 12px 18px;
  border-top: 1px solid #3c3c3c;
  text-align: right;
}

.dialog-footer button {
  padding: 7px 18px;
  border: 1px solid #4c4c4c;
  border-radius: 4px;
  background: #3c3c3c;
  color: #e0e0e0;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.15s;
}

.dialog-footer button:hover {
  background: #4c4c4c;
}

.truth-table-panel,
.expression-to-circuit-panel {
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

.truth-table-dialog,
.expression-to-circuit-dialog {
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

.btn-analyze,
.btn-generate {
  background: #0078d4;
  border: none;
  color: #fff;
  padding: 8px 18px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 16px;
  transition: background 0.15s;
}

.btn-analyze:hover,
.btn-generate:hover {
  background: #1a8ae8;
}

.truth-table-section,
.expression-section {
  margin-top: 16px;
}

.truth-table-section h4,
.expression-section h4 {
  margin: 0 0 12px 0;
  color: #4a9eff;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.truth-table-message {
  background: #1a2e2a;
  border: 1px solid #2a4a3a;
  border-radius: 4px;
  padding: 14px;
  margin: 12px 0;
}

.truth-table-message p {
  margin: 0;
  color: #4ec9b0;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-line;
}

.truth-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
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

.truth-table td {
  color: #ccc;
  background: #2a2a2a;
}

.truth-table tr:hover td {
  background: #333;
}

.expression-section pre {
  background: #1e1e1e;
  padding: 14px;
  border-radius: 4px;
  color: #4ec9b0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
  border: 1px solid #3c3c3c;
}

.expression-input-group {
  margin-bottom: 16px;
}

.expression-input-group label {
  display: block;
  margin-bottom: 8px;
  color: #ccc;
  font-size: 12px;
}

.expression-input-group textarea {
  width: 100%;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  color: #4ec9b0;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  padding: 12px;
  resize: vertical;
}

.expression-input-group textarea:focus {
  outline: none;
  border-color: #0078d4;
}

.expression-hint {
  margin-top: 8px;
  color: #666;
  font-size: 11px;
}
</style>
