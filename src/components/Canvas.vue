<template>
  <div class="canvas-container" ref="containerRef">
    <canvas 
      ref="canvasRef" 
      @mousedown="onMouseDown"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      @mouseleave="onMouseUp"
      @wheel="onWheel"
      @dragover.prevent
      @drop="onDrop"
      @contextmenu.prevent="onContextMenu"
      @dblclick="onMouseDblClick"
    ></canvas>
    
    <div v-if="showContextMenu" class="context-menu" :style="contextMenuStyle" @click="hideContextMenu">
      <div v-if="contextMenuTarget?.type === 'custom'" class="menu-item menu-item-green" @mousedown="onUnpackage">
        <span class="menu-icon">🔓</span> 解除打包
      </div>
      <template v-if="contextMenuTarget?.type === 'component' || contextMenuTarget?.type === 'custom'">
        <div class="menu-item" @mousedown="rotateContextComp(90)">
          <span class="menu-icon">🔄</span> 旋转 90° <span class="menu-hint">R</span>
        </div>
        <div class="menu-item" @mousedown="flipContextComp('X')">
          <span class="menu-icon">↔</span> 水平翻转 <span class="menu-hint">H</span>
        </div>
        <div class="menu-item" @mousedown="flipContextComp('Y')">
          <span class="menu-icon">↕</span> 垂直翻转 <span class="menu-hint">V</span>
        </div>
        <div class="menu-item menu-item-blue" @mousedown="onCopyContextComp">
          <span class="menu-icon">📋</span> 复制 <span class="menu-hint">Ctrl+C</span>
        </div>
        <div class="menu-item menu-item-blue" @mousedown="onShowComponentDetail">
          <span class="menu-icon">📖</span> 查看详情
        </div>
        <div class="menu-item menu-item-red" @mousedown="onDeleteContextComp">
          <span class="menu-icon">🗑️</span> 删除 <span class="menu-hint">Del</span>
        </div>
      </template>
      <div v-if="contextMenuTarget?.type === 'wirePoint' || contextMenuTarget?.type === 'wireSegment'" class="menu-item menu-item-green" @mousedown="onStartBranch">
        <span class="menu-icon">🌿</span> 从此处分支
      </div>
      <div v-if="contextMenuTarget?.type === 'wireSegment'" class="menu-item menu-item-blue" @mousedown="onAddWirePoint">
        <span class="menu-icon">➕</span> 添加节点
      </div>
      <div v-if="contextMenuTarget?.type === 'wirePoint'" class="menu-item menu-item-red" @mousedown="onDeleteWirePoint">
        <span class="menu-icon">🗑️</span> 删除节点
      </div>
    </div>
    
    <div v-if="editingText" class="text-editor" :style="textEditorStyle">
      <textarea ref="textAreaRef" v-model="editingText.text" @blur="saveTextEdit" @keydown.enter="saveTextEdit" @keydown.esc="cancelTextEdit"></textarea>
    </div>
    
    <div class="status-bar">
      <div class="status-item">
        <span class="status-label">仿真:</span>
        <span class="status-value">{{ simulation.isSimulating ? '运行' : '暂停' }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">组件:</span>
        <span class="status-value">{{ circuit.components.value.length }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">连线:</span>
        <span class="status-value">{{ circuit.wires.value.length }}</span>
      </div>
      <div class="status-item">
        <span class="status-label">缩放:</span>
        <span class="status-value">{{ Math.round(circuit.viewport.zoom * 100) }}%</span>
      </div>
      <div class="status-item">
        <span class="status-label">网格:</span>
        <span class="status-value">{{ GRID_SIZE }}px</span>
      </div>
      <div v-if="probeMode" class="status-item probe-active">
        <span class="status-label">🔍 探针模式</span>
        <span class="status-value">按 P 退出</span>
      </div>
      <div v-if="circuit.selection.components.length > 0" class="status-item">
        <span class="status-label">已选:</span>
        <span class="status-value">{{ circuit.selection.components.length }} 组件</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { COMPONENT_TYPES, getCustomComponentDef } from '../constants/componentTypes'
import { calculateTextHeight } from '../utils/textUtils'

// F3: 颜色常量表 — 所有接线视觉颜色统一管理，便于未来主题切换
const WIRE_COLORS = {
  high: '#00ff00',        // 高电平主线
  highGlow: '#00ff0060',  // 高电平辉光
  highFlow: '#ccffcc',    // 信号流动虚线
  low: '#666666',         // 低电平主线
  lowGlow: '#4a5568',     // 低电平微辉光
  selected: '#0078d4',    // 选中蓝
  hovered: '#ffaa0040',   // 悬停橙
  temp: '#0078d4',        // 临时连线蓝
  valid: '#00ff00',       // 合法目标绿
  invalid: '#ff4444',     // 非法目标红
  clock: '#00cccc',       // 时钟线青
  control: '#ff8800',     // 控制线橙
  bus: '#aa00ff',         // 总线紫
  branch: '#66ff99',      // 分支线浅绿
  nodeBranch: '#0078d4',  // 分支节点蓝
  nodeNormal: '#aaaaaa',  // 普通节点灰
  nodeEdit: '#ffffff',    // 编辑节点白
  nodeDrag: '#ffd700',    // 拖拽节点金
  portHigh: '#00ff00',    // 高电平端口
  portLow: '#555555',     // 低电平端口
  portHover: '#0078d4',   // 悬停端口蓝
  portUnconnected: '#888888', // 未连接端口
  xState: '#ff4444',      // X 不定态红
  zState: '#ff8800',      // Z 高阻态橙
  label: '#ffffff',       // 标签文字白
  labelBg: '#1e1e1e'      // 标签背景黑
}

// F1/V39: 缩放级别自适应
function getZoomLevel() {
  const z = props.circuit.viewport.zoom
  if (z < 0.5) return 'far'
  if (z > 2) return 'close'
  return 'normal'
}

// F2: DPI 感知线宽
function dpiLineWidth(base) {
  const dpr = window.devicePixelRatio || 1
  return base * (dpr > 1 ? 1 : 1) // Canvas 已按 dpr 缩放，此处保持 base
}

// V22/C1: 信号跳变光波 — 记录每条 wire 的跳变时间
const wireTransitions = new Map() // wireId -> { time, fromVal, toVal }

// V38: 连线值历史轨迹
const wireHistories = new Map() // wireId -> number[] (最近32tick)

const props = defineProps({
  circuit: {
    type: Object,
    required: true
  },
  simulation: {
    type: Object,
    required: true
  },
  history: Array,
  historyIndex: Number
})

const emit = defineEmits(['component-added', 'open-clock-settings', 'open-cpu-debugger', 'open-exec-debugger', 'open-instruction-editor', 'open-io-config', 'open-divider-settings', 'open-memory-editor', 'open-dotmatrix-editor', 'open-state-viewer', 'open-component-detail'])

defineExpose({})

const canvasRef = ref(null)
const containerRef = ref(null)
const ctx = ref(null)

const isDragging = ref(false)
const isPanning = ref(false)
const isWiring = ref(false)
const dragStart = ref({ x: 0, y: 0 })
const wiringStart = ref(null)
const wiringPoints = ref([])
const tempWireEnd = ref({ x: 0, y: 0 })
const lastMousePos = ref({ x: 0, y: 0 })
const dragOffset = ref({ x: 0, y: 0 })
const selectedComponent = ref(null)
const hoveredPort = ref(null)
const needsRender = ref(true)
const clickStartPos = ref(null)
const clickStartTime = ref(0)
const GRID_SIZE = 20
const editingWire = ref(null)
const draggingWirePoint = ref(null)
const dragPointIndex = ref(-1)
const isSelecting = ref(false)
const selectionStart = ref({ x: 0, y: 0 })
const selectionEnd = ref({ x: 0, y: 0 })
const selectedOriginalPositions = ref([])

const editingText = ref(null)
const textAreaRef = ref(null)

const showContextMenu = ref(false)
const contextMenuTarget = ref(null)
const contextMenuStyle = ref({})

const clipboard = ref({ components: [], wires: [] })
const probeMode = ref(false)
const hoveredWire = ref(null)
const hoveredComponent = ref(null)
// #31: 节点悬停检测
const hoveredNode = ref(null) // { wireId, pointIndex, x, y }
// #32: 拖拽对齐参考线 — 跟踪当前鼠标坐标
const currentMousePos = ref({ x: 0, y: 0 })

let animationId = null
let lastRenderTime = 0
let lastClickTime = 0
let lastClickPos = null
let lastDblClickTime = 0
let wireAnimOffset = 0  // V1/V18: 连线动画偏移量（信号流动 + 选中蚂蚁线）

function snapToGrid(x, y) {
  return {
    x: Math.round(x / GRID_SIZE) * GRID_SIZE,
    y: Math.round(y / GRID_SIZE) * GRID_SIZE
  }
}

function pointInRect(px, py, minX, minY, maxX, maxY) {
  return px >= minX && px <= maxX && py >= minY && py <= maxY
}

function lineIntersectsRect(p1, p2, minX, minY, maxX, maxY) {
  if (pointInRect(p1.x, p1.y, minX, minY, maxX, maxY)) return true
  if (pointInRect(p2.x, p2.y, minX, minY, maxX, maxY)) return true
  
  const edges = [
    [{ x: minX, y: minY }, { x: maxX, y: minY }],
    [{ x: maxX, y: minY }, { x: maxX, y: maxY }],
    [{ x: maxX, y: maxY }, { x: minX, y: maxY }],
    [{ x: minX, y: maxY }, { x: minX, y: minY }]
  ]
  
  for (const edge of edges) {
    if (lineIntersectsLine(p1, p2, edge[0], edge[1])) {
      return true
    }
  }
  
  return false
}

function lineIntersectsLine(a1, a2, b1, b2) {
  const denom = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y)
  if (Math.abs(denom) < 0.00001) return false
  
  const ua = ((b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)) / denom
  const ub = ((a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)) / denom
  
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
}

let resizeObserver = null

onMounted(() => {
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', onKeyDown)
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
      markDirty()
    })
    resizeObserver.observe(containerRef.value)
  }
  renderLoop()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', onKeyDown)
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})

const dpr = window.devicePixelRatio || 1

function resizeCanvas() {
  if (!containerRef.value || !canvasRef.value) return
  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight
  if (width <= 0 || height <= 0) return
  canvasRef.value.width = width * dpr
  canvasRef.value.height = height * dpr
  canvasRef.value.style.width = width + 'px'
  canvasRef.value.style.height = height + 'px'
  markDirty()
}

function renderLoop() {
  const now = Date.now()
  // V1/V18: 每帧递增动画偏移量，驱动信号流动和选中蚂蚁线
  wireAnimOffset = (wireAnimOffset + 1) % 1000
  if (needsRender.value || now - lastRenderTime > 100) {
    render()
    needsRender.value = false
    lastRenderTime = now
  }
  // 动画状态下持续重绘
  if (props.circuit.wires.value.some(w => w.value === 1 || props.circuit.selection.wires.includes(w))) {
    needsRender.value = true
  }
  animationId = requestAnimationFrame(renderLoop)
}

function markDirty() {
  needsRender.value = true
}

function getCanvasPos(e) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: (e.clientX - rect.left - props.circuit.viewport.x) / props.circuit.viewport.zoom,
    y: (e.clientY - rect.top - props.circuit.viewport.y) / props.circuit.viewport.zoom
  }
}

function findComponentAt(x, y) {
  for (let i = props.circuit.components.value.length - 1; i >= 0; i--) {
    const c = props.circuit.components.value[i]
    if (x >= c.x - 5 && x <= c.x + c.width + 5 && 
        y >= c.y - 5 && y <= c.y + c.height + 5) {
      return c
    }
  }
  return null
}

function findWirePointAt(x, y) {
  for (const wire of props.circuit.wires.value) {
    const fromComp = props.circuit.getComponentById(wire.from.componentId)
    const toComp = props.circuit.getComponentById(wire.to.componentId)
    if (!fromComp || !toComp) continue
    
    const from = getWireStartPoint(wire)
    const to = getInputPortPos(toComp, wire.to.port)
    const points = [from, ...(wire.points || []), to]
    
    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i]
      const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2)
      if (dist < 15) {
        return { 
          type: 'wirePoint', 
          wire: wire, 
          pointIndex: i - 1, 
          position: p
        }
      }
    }
  }
  return null
}

function findWireSegmentAt(x, y) {
  for (const wire of props.circuit.wires.value) {
    const fromComp = props.circuit.getComponentById(wire.from.componentId)
    const toComp = props.circuit.getComponentById(wire.to.componentId)
    if (!fromComp || !toComp) continue
    
    const from = getWireStartPoint(wire)
    const to = getInputPortPos(toComp, wire.to.port)
    const points = [from, ...(wire.points || []), to]
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const d = distToSeg(x, y, p1.x, p1.y, p2.x, p2.y)
      if (d < 12) {
        const A = x - p1.x
        const B = y - p1.y
        const C = p2.x - p1.x
        const D = p2.y - p1.y
        const dot = A * C + B * D
        const lenSq = C * C + D * D
        let param = lenSq !== 0 ? dot / lenSq : 0
        param = Math.max(0, Math.min(1, param))
        const projX = p1.x + param * (p2.x - p1.x)
        const projY = p1.y + param * (p2.y - p1.y)
        const snapped = snapToGrid(projX, projY)
        return {
          type: 'wireSegment',
          wire: wire,
          segmentIndex: i,
          position: snapped,
          dist: d
        }
      }
    }
  }
  return null
}

function findPortAt(x, y) {
  const size = Math.max(8, 18 / props.circuit.viewport.zoom)
  let bestPort = null
  let bestDist = Infinity
  
  for (const comp of props.circuit.components.value) {
    const def = COMPONENT_TYPES[comp.type]
    for (let i = 0; i < comp.inputs.length; i++) {
      const p = getInputPortPos(comp, i)
      const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2)
      if (dist < size && dist < bestDist) {
        bestDist = dist
        bestPort = { component: comp, portIndex: i, isOutput: false }
      }
    }
    for (let i = 0; i < comp.outputs.length; i++) {
      const p = getOutputPortPos(comp, i)
      const dist = Math.sqrt((x - p.x) ** 2 + (y - p.y) ** 2)
      if (dist < size && dist < bestDist) {
        bestDist = dist
        bestPort = { component: comp, portIndex: i, isOutput: true }
      }
    }
  }

  return bestPort
}

// Port layout config for new wide components: inputs on left, outputs on right
const WIDE_COMP_PORTS = {
  REG8:           { inputs: 10, outputs: 8 },
  SHIFT_REG8:     { inputs: 11, outputs: 8 },
  COUNTER8:       { inputs: 3,  outputs: 8 },
  ALU8:           { inputs: 19, outputs: 10 },
  ADD8:           { inputs: 17, outputs: 9 },
  COMP8:          { inputs: 16, outputs: 3 },
  MUX8:           { inputs: 11, outputs: 1 },
  DEMUX8:         { inputs: 4,  outputs: 8 },
  DEC4_16:        { inputs: 4,  outputs: 16 },
  ENC8_3:         { inputs: 8,  outputs: 3 },
  TRI_BUFFER_8:   { inputs: 9,  outputs: 8 },
  BUS_TRANSCEIVER:{ inputs: 18, outputs: 16 },
  LATCH_8:        { inputs: 9,  outputs: 8 },
  HEXDISPLAY:     { inputs: 8,  outputs: 0 },
  ASCII_DISPLAY:  { inputs: 7,  outputs: 0 },
  LED_BAR8:       { inputs: 8,  outputs: 0 },
  SCOPE:          { inputs: 1,  outputs: 0 },
  KEYPAD_4x4:     { inputs: 4,  outputs: 4 },
  ROM32K:         { inputs: 15, outputs: 8 },
  SRAM32K:        { inputs: 25, outputs: 8 },
  UART:           { inputs: 3,  outputs: 2 },
  PWM_GENERATOR:  { inputs: 2,  outputs: 1 },
  OSCILLATOR:     { inputs: 0,  outputs: 1 },
}

function _getInputPortPosRaw(comp, i) {
  const def = getCompDef(comp.type)

  // New wide components: inputs evenly distributed on the left side
  const wideConfig = WIDE_COMP_PORTS[comp.type]
  if (wideConfig) {
    const inputCount = wideConfig.inputs
    if (inputCount === 0) {
      return { x: comp.x, y: Math.round((comp.y + comp.height / 2) / GRID_SIZE) * GRID_SIZE }
    }
    const spacing = comp.height / (inputCount + 1)
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'SEGDISPLAY8') {
    const perCol = 16
    const col = i < perCol ? 0 : 1
    const idx = i < perCol ? i : i - perCol
    const spacing = comp.height / (perCol + 1)
    const y = comp.y + spacing * (idx + 1)
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE
    return { x: col === 0 ? comp.x : comp.x + comp.width, y: snappedY }
  }

  if (comp.type === 'SEGDISPLAY1') {
    const spacing = comp.height / 5
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'DOTMATRIX16') {
    const spacing = comp.height / 5
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }
  
  if (comp.type === 'LCD1602') {
    const perSide = 5
    const side = i < perSide ? 0 : 1
    const idx = i < perSide ? i : i - perSide
    const spacing = comp.height / (perSide + 1)
    const y = comp.y + spacing * (idx + 1)
    const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE
    return { x: side === 0 ? comp.x : comp.x + comp.width, y: snappedY }
  }

  // 新增宽组件的端口定位
  if (comp.type === 'DEC38') {
    // 3输入在左侧，8输出在右侧
    if (i < 3) {
      const spacing = comp.height / 4
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else {
      const outIdx = i - 3
      const spacing = comp.height / 9
      const y = comp.y + spacing * (outIdx + 1)
      return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    }
  }

  if (comp.type === 'DEC24' || comp.type === 'ENC42') {
    // 输入在左侧，输出在右侧
    const inputCount = comp.type === 'DEC24' ? 2 : 4
    const outputCount = comp.type === 'DEC24' ? 4 : 3
    if (i < inputCount) {
      const spacing = comp.height / (inputCount + 1)
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else {
      const outIdx = i - inputCount
      const spacing = comp.height / (outputCount + 1)
      const y = comp.y + spacing * (outIdx + 1)
      return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    }
  }

  // BCD7SEG: 4输入在左侧
  if (comp.type === 'BCD7SEG') {
    const spacing = comp.height / 5
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  // SEG7CC/SEG7CA: 7输入在左侧
  if (comp.type === 'SEG7CC' || comp.type === 'SEG7CA') {
    const spacing = comp.height / 8
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  // BUS4/BUS8: 输入在左侧
  if (comp.type === 'BUS4' || comp.type === 'BUS8') {
    const def = COMPONENT_TYPES[comp.type]
    const count = def.busWidth
    const spacing = comp.height / (count + 1)
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'ALU4') {
    // 12输入: A[0:3], B[0:3] 在左侧, S[0:2] 在顶部, CIN 在底部
    if (i < 8) {
      // 数据输入 A[0:3], B[0:3] 在左侧
      const spacing = comp.height / 9
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else if (i < 11) {
      // 选择信号 S[0:2] 在顶部
      const idx = i - 8
      const spacing = comp.width / 4
      const x = comp.x + spacing * (idx + 1)
      return { x: Math.round(x / GRID_SIZE) * GRID_SIZE, y: comp.y }
    } else {
      // CIN 输入在底部
      return { x: Math.round((comp.x + comp.width / 2) / GRID_SIZE) * GRID_SIZE, y: comp.y + comp.height }
    }
  }

  if (comp.type === 'ADDSUB4') {
    // 8数据输入在左侧，MODE在顶部，5输出在右侧
    if (i < 8) {
      const spacing = comp.height / 9
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else if (i === 8) {
      return { x: Math.round((comp.x + comp.width / 2) / GRID_SIZE) * GRID_SIZE, y: comp.y }
    } else {
      const outIdx = i - 9
      const spacing = comp.height / 6
      const y = comp.y + spacing * (outIdx + 1)
      return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    }
  }

  if (comp.type === 'COMP4' || comp.type === 'SHIFT4' || comp.type === 'BUSSWITCH') {
    // 多输入左侧，输出右侧
    const inputCount = comp.type === 'COMP4' ? 8 : (comp.type === 'SHIFT4' ? 7 : 5)
    const outputCount = comp.type === 'COMP4' ? 3 : 4
    if (i < inputCount) {
      const spacing = comp.height / (inputCount + 1)
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else {
      const outIdx = i - inputCount
      const spacing = comp.height / (outputCount + 1)
      const y = comp.y + spacing * (outIdx + 1)
      return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    }
  }

  if (comp.type === 'REG4' || comp.type === 'COUNTER4' || comp.type === 'RING4') {
    // 数据和控制在左侧/顶部，输出在右侧
    const inputCount = comp.type === 'REG4' ? 6 : (comp.type === 'COUNTER4' ? 3 : 2)
    const outputCount = 4
    if (i < inputCount) {
      const spacing = comp.height / (inputCount + 1)
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else {
      const outIdx = i - inputCount
      const spacing = comp.height / (outputCount + 1)
      const y = comp.y + spacing * (outIdx + 1)
      return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    }
  }

  if (comp.type === 'RAM164' || comp.type === 'ROM164') {
    // RAM: 10输入(数据+地址+控制)，4输出
    // ROM: 4地址输入，4数据输出
    const inputCount = comp.type === 'RAM164' ? 10 : 4
    const outputCount = 4
    if (i < inputCount) {
      const spacing = comp.height / (inputCount + 1)
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else {
      const outIdx = i - inputCount
      const spacing = comp.height / (outputCount + 1)
      const y = comp.y + spacing * (outIdx + 1)
      return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    }
  }

  if (comp.type === 'ROM256') {
    // ROM256: 8地址输入在左侧，16数据输出在右侧
    if (i < 8) {
      const spacing = comp.height / 9
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else {
      const outIdx = i - 8
      const spacing = comp.height / 17
      const y = comp.y + spacing * (outIdx + 1)
      return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    }
  }

  if (comp.type === 'CLOCKDIVIDER') {
    if (i === 0) {
      return { x: comp.x, y: Math.round((comp.y + comp.height / 3) / GRID_SIZE) * GRID_SIZE }
    } else {
      return { x: comp.x, y: Math.round((comp.y + comp.height * 2 / 3) / GRID_SIZE) * GRID_SIZE }
    }
  }

  if (comp.type === 'IO_PORT') {
    const spacing = comp.height / 9
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'EXT_RAM') {
    if (i < 8) {
      const spacing = comp.height / 11
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else if (i === 8) {
      return { x: comp.x, y: Math.round((comp.y + comp.height * 9 / 11) / GRID_SIZE) * GRID_SIZE }
    } else {
      return { x: comp.x, y: Math.round((comp.y + comp.height * 10 / 11) / GRID_SIZE) * GRID_SIZE }
    }
  }

  if (comp.type === 'IO_BRIDGE') {
    const spacing = comp.height / 8
    const yPositions = [3, 6]
    const y = comp.y + spacing * yPositions[i]
    return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'CPU') {
    const spacing = comp.height / 10
    const inputYPositions = [2, 4, 6]
    const y = comp.y + spacing * inputYPositions[i]
    return { x: comp.x, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'TIMER') {
    return { x: comp.x, y: Math.round((comp.y + comp.height / 2) / GRID_SIZE) * GRID_SIZE }
  }

  const spacing = comp.height / (def.inputs + 1)
  const y = comp.y + spacing * (i + 1)
  const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE
  return { x: comp.x, y: snappedY }
}

function _getOutputPortPosRaw(comp, i) {
  const def = getCompDef(comp.type)

  // New wide components: outputs evenly distributed on the right side
  const wideConfig = WIDE_COMP_PORTS[comp.type]
  if (wideConfig) {
    const outputCount = wideConfig.outputs
    if (outputCount === 0) {
      return { x: comp.x + comp.width, y: Math.round((comp.y + comp.height / 2) / GRID_SIZE) * GRID_SIZE }
    }
    const spacing = comp.height / (outputCount + 1)
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  // 新增宽组件的输出端口定位
  if (comp.type === 'DEC38') {
    const spacing = comp.height / 9
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'ALU4') {
    // Y[0:3]在右侧，COUT和ZERO在底部
    if (i < 4) {
      const spacing = comp.height / 7
      const y = comp.y + spacing * (i + 1)
      return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
    } else {
      const idx = i - 4
      const spacing = comp.width / 3
      const x = comp.x + spacing * (idx + 1)
      return { x: Math.round(x / GRID_SIZE) * GRID_SIZE, y: comp.y + comp.height }
    }
  }

  if (comp.type === 'ADDSUB4') {
    const spacing = comp.height / 6
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'DEC24' || comp.type === 'ENC42' || comp.type === 'COMP4' || 
      comp.type === 'SHIFT4' || comp.type === 'BUSSWITCH' || comp.type === 'REG4' ||
      comp.type === 'COUNTER4' || comp.type === 'RING4' || comp.type === 'RAM164' || 
      comp.type === 'ROM164') {
    const outputCount = comp.type === 'DEC24' ? 4 : (comp.type === 'ENC42' ? 3 : 
                       (comp.type === 'COMP4' ? 3 : (comp.type === 'ADDSUB4' ? 5 : 4)))
    const spacing = comp.height / (outputCount + 1)
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'ROM256') {
    const spacing = comp.height / 17
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'CPU') {
    const spacing = comp.height / 10
    const outputYPositions = [2, 3, 7, 8]
    const y = comp.y + spacing * outputYPositions[i]
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'IO_BRIDGE') {
    const spacing = comp.height / 8
    const outputYPositions = [1, 3, 4, 5, 7]
    const y = comp.y + spacing * outputYPositions[i]
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'IO_PORT') {
    const spacing = comp.height / 9
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'EXT_RAM') {
    const spacing = comp.height / 11
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  if (comp.type === 'CLOCKDIVIDER') {
    return { x: comp.x + comp.width, y: Math.round((comp.y + comp.height / 2) / GRID_SIZE) * GRID_SIZE }
  }

  // DIPSW4: 4输出在右侧
  if (comp.type === 'DIPSW4') {
    const spacing = comp.height / 5
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }

  // BCD7SEG: 7输出在右侧
  if (comp.type === 'BCD7SEG') {
    const spacing = comp.height / 8
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y: Math.round(y / GRID_SIZE) * GRID_SIZE }
  }
  
  const spacing = comp.height / (def.outputs + 1)
  const y = comp.y + spacing * (i + 1)
  const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE
  return { x: comp.x + comp.width, y: snappedY }
}

// #1/#6: 旋转+翻转后端口坐标变换（绕组件中心）
function transformPortPos(comp, pos) {
  const rot = comp.rotation || 0
  const fx = comp.flippedX
  const fy = comp.flippedY
  if (!rot && !fx && !fy) return pos
  const cx = comp.x + comp.width / 2
  const cy = comp.y + comp.height / 2
  let dx = pos.x - cx
  let dy = pos.y - cy
  if (fx) dx = -dx
  if (fy) dy = -dy
  if (rot) {
    const rad = -rot * Math.PI / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const ndx = dx * cos - dy * sin
    const ndy = dx * sin + dy * cos
    dx = ndx
    dy = ndy
  }
  return { x: cx + dx, y: cy + dy }
}

function getInputPortPos(comp, i) {
  return transformPortPos(comp, _getInputPortPosRaw(comp, i))
}

function getOutputPortPos(comp, i) {
  return transformPortPos(comp, _getOutputPortPosRaw(comp, i))
}

function getInternalPortPos(comp, i, isOutput) {
  const def = getCompDef(comp.type)
  if (isOutput) {
    const spacing = comp.height / (def.outputs + 1)
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x + comp.width, y }
  } else {
    const spacing = comp.height / (def.inputs + 1)
    const y = comp.y + spacing * (i + 1)
    return { x: comp.x, y }
  }
}

function getCompDef(type) {
  let def = COMPONENT_TYPES[type]
  if (!def) {
    def = getCustomComponentDef(type)
  }
  return def
}

function getWireStartPoint(wire) {
  if (wire.startPointRef) {
    const sourceWire = props.circuit.wires.value.find(w => w.id === wire.startPointRef.wireId)
    if (sourceWire && sourceWire.points && wire.startPointRef.pointIndex >= 0 && wire.startPointRef.pointIndex < sourceWire.points.length) {
      return { ...sourceWire.points[wire.startPointRef.pointIndex] }
    }
  }
  if (wire.startPoint) return wire.startPoint
  const fromComp = props.circuit.getComponentById(wire.from.componentId)
  return fromComp ? getOutputPortPos(fromComp, wire.from.port) : { x: 0, y: 0 }
}

function updateStartPointRefsAfterInsert(wireId, insertIndex) {
  for (const w of props.circuit.wires.value) {
    if (w.startPointRef && w.startPointRef.wireId === wireId && w.startPointRef.pointIndex >= insertIndex) {
      w.startPointRef.pointIndex++
    }
  }
}

function updateStartPointRefsAfterDelete(wireId, deleteIndex) {
  const sourceWire = props.circuit.wires.value.find(w => w.id === wireId)
  for (const w of props.circuit.wires.value) {
    if (w.startPointRef && w.startPointRef.wireId === wireId) {
      if (w.startPointRef.pointIndex === deleteIndex) {
        // P0 修复：冻结分支起点坐标，仅清空引用
        if (sourceWire && sourceWire.points && deleteIndex >= 0 && deleteIndex < sourceWire.points.length) {
          const pt = sourceWire.points[deleteIndex]
          w.startPoint = { x: pt.x, y: pt.y }
        }
        w.startPointRef = null
      } else if (w.startPointRef.pointIndex > deleteIndex) {
        w.startPointRef.pointIndex--
      }
    }
  }
}

function selectWireWithSource(wire) {
  if (!props.circuit.selection.wires.includes(wire)) {
    props.circuit.selection.wires.push(wire)
  }
  if (wire.startPointRef) {
    const sourceWire = props.circuit.wires.value.find(w => w.id === wire.startPointRef.wireId)
    if (sourceWire && !props.circuit.selection.wires.includes(sourceWire)) {
      props.circuit.selection.wires.push(sourceWire)
    }
  }
}

// P1: 反向选中 — 选中源 wire 时连带选中其所有分支
function selectWireWithBranches(wire) {
  if (!props.circuit.selection.wires.includes(wire)) {
    props.circuit.selection.wires.push(wire)
  }
  for (const w of props.circuit.wires.value) {
    if (w.startPointRef && w.startPointRef.wireId === wire.id && !props.circuit.selection.wires.includes(w)) {
      props.circuit.selection.wires.push(w)
    }
  }
}

function findWireAt(x, y) {
  for (const wire of props.circuit.wires.value) {
    const fromComp = props.circuit.getComponentById(wire.from.componentId)
    const toComp = props.circuit.getComponentById(wire.to.componentId)
    if (!fromComp || !toComp) continue

    const from = getWireStartPoint(wire)
    const to = getInputPortPos(toComp, wire.to.port)
    const points = [from, ...(wire.points || []), to]

    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const d = distToSeg(x, y, p1.x, p1.y, p2.x, p2.y)
      if (d < 12) return wire
    }
  }
  return null
}

// #31: 查找鼠标悬停的连线中间节点（仅 points 数组的中间项）
function findWireNodeAt(x, y) {
  for (const wire of props.circuit.wires.value) {
    const pts = wire.points || []
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      const d = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2)
      if (d < 8) {
        return { wireId: wire.id, pointIndex: i, x: p.x, y: p.y }
      }
    }
  }
  return null
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1
  const dot = A * C + B * D, lenSq = C * C + D * D
  let param = lenSq !== 0 ? dot / lenSq : -1
  let xx, yy
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  return Math.sqrt((px - xx) ** 2 + (py - yy) ** 2)
}

function onMouseDown(e) {
  hideContextMenu()
  
  if (!canvasRef.value) return
  const pos = getCanvasPos(e)
  lastMousePos.value = { x: e.clientX, y: e.clientY }
  
  if (e.button === 1) {
    isPanning.value = true
    canvasRef.value.style.cursor = 'grabbing'
    return
  }
  
  if ((editingWire.value || props.circuit.selection.wires.length > 0) && e.button === 0) {
    const wire = editingWire.value || props.circuit.selection.wires[0]
    const fromComp = props.circuit.getComponentById(wire.from.componentId)
    const toComp = props.circuit.getComponentById(wire.to.componentId)
    if (fromComp && toComp) {
      const from = getWireStartPoint(wire)
      const to = getInputPortPos(toComp, wire.to.port)
      const points = [from, ...(wire.points || []), to]
      
      for (let i = 1; i < points.length - 1; i++) {
        const d = Math.sqrt((pos.x - points[i].x) ** 2 + (pos.y - points[i].y) ** 2)
        if (d < 15) {
          draggingWirePoint.value = wire
          dragPointIndex.value = i - 1
          if (!editingWire.value) {
            editingWire.value = wire
          }
          return
        }
      }
    }
  }
  
  if (isWiring.value && e.button === 0) {
    const endPort = findPortAt(pos.x, pos.y)
    if (endPort && endPort !== wiringStart.value) {
      let valid = false
      let fromComp, fromPort
      let startPoint = null
      let startPointRef = null
      
      if (wiringStart.value.type === 'wirePoint') {
        const sourceWire = wiringStart.value.wire
        fromComp = props.circuit.getComponentById(sourceWire.from.componentId)
        fromPort = sourceWire.from.port
        valid = !endPort.type && !endPort.isOutput
        startPoint = wiringStart.value.position
        startPointRef = {
          wireId: sourceWire.id,
          pointIndex: wiringStart.value.pointIndex
        }
      } else if (wiringStart.value.isOutput) {
        fromComp = wiringStart.value.component
        fromPort = wiringStart.value.portIndex
        valid = !endPort.type && !endPort.isOutput && wiringStart.value.component !== endPort.component
      }
      
      if (valid) {
        // #10: 实时检测多驱动短路冲突
        const conflict = props.circuit.wires.value.some(w =>
          w.to.componentId === endPort.component.id && w.to.port === endPort.portIndex
        )
        if (conflict) {
          valid = false
        }
      }
      if (valid) {
        let wirePoints = [...wiringPoints.value]
        // 修复所见即所得：若布线时使用了 L 型智能路由（无手动折点），
        // 需将自动生成的 L 型折点保存到 wire.points 中
        if (wirePoints.length === 0) {
          const fromPos = startPoint || (wiringStart.value.isOutput
            ? getOutputPortPos(fromComp, fromPort)
            : getInputPortPos(fromComp, fromPort))
          const toPos = getInputPortPos(endPort.component, endPort.portIndex)
          if (fromPos.x !== toPos.x && fromPos.y !== toPos.y) {
            const dx = Math.abs(toPos.x - fromPos.x)
            const dy = Math.abs(toPos.y - fromPos.y)
            if (dx > dy) {
              wirePoints = [{ x: toPos.x, y: fromPos.y }]
            } else {
              wirePoints = [{ x: fromPos.x, y: toPos.y }]
            }
          }
        }
        props.circuit.addWire(
          fromComp,
          fromPort,
          endPort.component,
          endPort.portIndex,
          wirePoints,
          startPoint,
          startPointRef
        )
        saveHistory()
        props.simulation.simulate()
      }
      isWiring.value = false
      wiringStart.value = null
      wiringPoints.value = []
      editingWire.value = null
      return
    } else {
      const snapped = snapToGrid(pos.x, pos.y)
      wiringPoints.value.push(snapped)
      return
    }
  }
  
  const port = findPortAt(pos.x, pos.y)
  if (port && e.button === 0 && !editingWire.value) {
    if (port.type === 'wirePoint' || port.isOutput) {
      isWiring.value = true
      wiringStart.value = port
      wiringPoints.value = []
      tempWireEnd.value = pos
      return
    }
  }
  
  const comp = findComponentAt(pos.x, pos.y)
  const wire = findWireAt(pos.x, pos.y)
  const hasSelection = props.circuit.selection.components.length > 0 || props.circuit.selection.wires.length > 0
  const isOnSelected = (comp && props.circuit.selection.components.includes(comp)) || 
                       (wire && props.circuit.selection.wires.includes(wire))
  
  if (comp && e.button === 0 && !editingWire.value) {
    if (!e.ctrlKey && !props.circuit.selection.components.includes(comp)) {
      props.circuit.clearSelection()
    }
    
    if (!props.circuit.selection.components.includes(comp)) {
      props.circuit.selection.components.push(comp)
    }
    
    editingWire.value = null
    
    selectedOriginalPositions.value = {
      components: props.circuit.selection.components.map(c => ({
        id: c.id,
        x: c.x,
        y: c.y
      })),
      wires: props.circuit.selection.wires.map(w => ({
        id: w.id,
        points: [...(w.points || [])]
      }))
    }
    
    clickStartPos.value = { x: pos.x, y: pos.y }
    clickStartTime.value = Date.now()
    isDragging.value = true
    selectedComponent.value = comp
    canvasRef.value.style.cursor = 'grabbing'
    markDirty()
    return
  }
  
  if (isOnSelected && hasSelection && e.button === 0 && !editingWire.value) {
    selectedOriginalPositions.value = {
      components: props.circuit.selection.components.map(c => ({
        id: c.id,
        x: c.x,
        y: c.y
      })),
      wires: props.circuit.selection.wires.map(w => ({
        id: w.id,
        points: [...(w.points || [])]
      }))
    }
    
    clickStartPos.value = { x: pos.x, y: pos.y }
    clickStartTime.value = Date.now()
    isDragging.value = true
    selectedComponent.value = null
    canvasRef.value.style.cursor = 'grabbing'
    markDirty()
    return
  }
  
  if (wire && e.button === 0 && !comp) {
    const now = Date.now()
    if (now - lastClickTime < 300 && lastClickPos && 
        Math.abs(pos.x - lastClickPos.x) < 10 && 
        Math.abs(pos.y - lastClickPos.y) < 10) {
      editingWire.value = editingWire.value === wire ? null : wire
      if (editingWire.value) {
        props.circuit.clearSelection()
        selectWireWithSource(wire)
        selectWireWithBranches(wire)
      }
      lastClickTime = 0
      lastClickPos = null
      markDirty()
      return
    } else {
      if (!e.ctrlKey) {
        props.circuit.clearSelection()
        editingWire.value = null
      }
      selectWireWithSource(wire)
      selectWireWithBranches(wire)
      if (!editingWire.value || editingWire.value !== wire) {
        editingWire.value = null
      }
      lastClickTime = now
      lastClickPos = { x: pos.x, y: pos.y }
      markDirty()
      return
    }
  }
  
  if (e.button === 0) {
    if (!e.ctrlKey) {
      props.circuit.clearSelection()
      editingWire.value = null
    }
    editingWire.value = null
    isSelecting.value = true
    selectionStart.value = pos
    selectionEnd.value = pos
    markDirty()
    return
  }
}

function onMouseMove(e) {
  if (!canvasRef.value) return
  const pos = getCanvasPos(e)
  currentMousePos.value = pos

  if (probeMode.value) {
    hoveredWire.value = findWireAt(pos.x, pos.y)
    markDirty()
    return
  }
  
  if (isPanning.value) {
    props.circuit.viewport.x += e.clientX - lastMousePos.value.x
    props.circuit.viewport.y += e.clientY - lastMousePos.value.y
    lastMousePos.value = { x: e.clientX, y: e.clientY }
    markDirty()
    return
  }
  
  if (draggingWirePoint.value && dragPointIndex.value >= 0) {
    const snapped = snapToGrid(pos.x, pos.y)
    draggingWirePoint.value.points[dragPointIndex.value] = snapped
    markDirty()
    return
  }
  
  if (isWiring.value) {
    tempWireEnd.value = snapToGrid(pos.x, pos.y)
    markDirty()
    return
  }
  
  if (isSelecting.value) {
    selectionEnd.value = pos
    markDirty()
    return
  }
  
  if (isDragging.value && (props.circuit.selection.components.length > 0 || props.circuit.selection.wires.length > 0)) {
    const rawX = pos.x - clickStartPos.value.x
    const rawY = pos.y - clickStartPos.value.y
    const dx = Math.round(rawX / GRID_SIZE) * GRID_SIZE
    const dy = Math.round(rawY / GRID_SIZE) * GRID_SIZE
    
    if (selectedOriginalPositions.value.components) {
      selectedOriginalPositions.value.components.forEach(orig => {
        const comp = props.circuit.getComponentById(orig.id)
        if (comp) {
          comp.x = orig.x + dx
          comp.y = orig.y + dy
        }
      })
    }
    
    if (selectedOriginalPositions.value.wires) {
      selectedOriginalPositions.value.wires.forEach(orig => {
        const wire = props.circuit.wires.value.find(w => w.id === orig.id)
        if (wire && wire.points) {
          wire.points = orig.points.map(p => ({
            x: p.x + dx,
            y: p.y + dy
          }))
        }
      })
    }
    
    markDirty()
    return
  }
  
  hoveredPort.value = findPortAt(pos.x, pos.y)
  const comp = findComponentAt(pos.x, pos.y)
  hoveredComponent.value = comp
  // #31: 节点悬停检测（仅在不拖拽/连线时进行）
  if (!isDragging.value && !isWiring.value) {
    const node = findWireNodeAt(pos.x, pos.y)
    hoveredNode.value = node
    if (node && canvasRef.value) canvasRef.value.style.cursor = 'pointer'
  } else {
    hoveredNode.value = null
  }
  if (hoveredPort.value) {
    canvasRef.value.style.cursor = 'pointer'
  } else if (comp) {
    canvasRef.value.style.cursor = 'move'
  } else if (!hoveredNode.value) {
    canvasRef.value.style.cursor = 'crosshair'
  }
  markDirty()
}

function onMouseUp(e) {
  if (!canvasRef.value) return
  const pos = getCanvasPos(e)
  
  if (draggingWirePoint.value) {
    draggingWirePoint.value = null
    dragPointIndex.value = -1
    saveHistory()
    markDirty()
    return
  }
  
  if (isPanning.value) {
    isPanning.value = false
    canvasRef.value.style.cursor = 'crosshair'
    markDirty()
    return
  }
  
  if (isSelecting.value) {
    isSelecting.value = false
    
    const minX = Math.min(selectionStart.value.x, selectionEnd.value.x)
    const maxX = Math.max(selectionStart.value.x, selectionEnd.value.x)
    const minY = Math.min(selectionStart.value.y, selectionEnd.value.y)
    const maxY = Math.max(selectionStart.value.y, selectionEnd.value.y)
    
    if (Math.abs(maxX - minX) > 5 && Math.abs(maxY - minY) > 5) {
      props.circuit.components.value.forEach(comp => {
        if (comp.x + comp.width >= minX && comp.x <= maxX &&
            comp.y + comp.height >= minY && comp.y <= maxY) {
          if (!props.circuit.selection.components.includes(comp)) {
            props.circuit.selection.components.push(comp)
          }
        }
      })
      
      props.circuit.wires.value.forEach(wire => {
        const fromComp = props.circuit.getComponentById(wire.from.componentId)
        const toComp = props.circuit.getComponentById(wire.to.componentId)
        if (fromComp && toComp) {
          const from = getWireStartPoint(wire)
          const to = getInputPortPos(toComp, wire.to.port)
          const points = [from, ...(wire.points || []), to]
          
          let intersects = false
          for (let i = 0; i < points.length - 1; i++) {
            if (lineIntersectsRect(points[i], points[i + 1], minX, minY, maxX, maxY)) {
              intersects = true
              break
            }
          }
          
          if (intersects) {
            selectWireWithSource(wire)
          }
        }
      })
    }
    
    markDirty()
    return
  }
  
  if (isDragging.value && clickStartPos.value) {
    const dx = pos.x - clickStartPos.value.x
    const dy = pos.y - clickStartPos.value.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const timeDiff = Date.now() - clickStartTime.value
    
    if (distance < 5 && timeDiff < 300 && selectedComponent.value) {
      const comp = selectedComponent.value
      if (comp.type === 'SWITCH') {
        comp.state = 1 - comp.state
        if (comp.outputs[0]) {
          comp.outputs[0].value = comp.state
        }
        props.simulation.simulate()
        markDirty()
      } else if (comp.type === 'BUTTON') {
        // 瞬时按键: 按下输出1，200ms后自动复位
        comp.state = 1
        if (comp.outputs[0]) comp.outputs[0].value = 1
        props.simulation.simulate()
        markDirty()
        if (comp._btnTimer) clearTimeout(comp._btnTimer)
        comp._btnTimer = setTimeout(() => {
          comp.state = 0
          if (comp.outputs[0]) comp.outputs[0].value = 0
          props.simulation.simulate()
          markDirty()
        }, 200)
      } else if (comp.type === 'DIPSW4') {
        // #38: 精确点击区域 — 限定在滑槽范围内（含序号标签可点）
        const pad = 12
        const swH = (comp.height - pad * 2) / 4
        // 滑槽 X 范围与渲染保持一致：comp.x + 30 .. comp.x + comp.width - 20
        const trackX1 = comp.x + 26 // 含序号标签
        const trackX2 = comp.x + comp.width - 16
        const relY = pos.y - (comp.y + pad)
        if (relY >= 0 && relY < pad * 2 + swH * 4 &&
            pos.x >= trackX1 && pos.x <= trackX2) {
          const idx = Math.min(3, Math.floor(relY / swH))
          if (idx >= 0 && idx < 4) {
            if (!Array.isArray(comp.state)) comp.state = [0, 0, 0, 0]
            comp.state[idx] = comp.state[idx] ? 0 : 1
            if (comp.outputs[idx]) comp.outputs[idx].value = comp.state[idx]
            props.simulation.simulate()
            markDirty()
          }
        }
      }
      // 注意：PARALLEL_IO 类型已在 componentTypes.js 中移除，本分支为历史代码已删除
    } else if (distance > 5) {
      saveHistory()
      props.simulation.simulate()
    }
    
    isDragging.value = false
    selectedComponent.value = null
    clickStartPos.value = null
    canvasRef.value.style.cursor = 'crosshair'
    markDirty()
  }
}

function onKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  
  if (e.key === 'Escape') {
    if (isWiring.value) {
      isWiring.value = false
      wiringStart.value = null
      wiringPoints.value = []
    }
    if (editingWire.value) {
      editingWire.value = null
    }
    if (probeMode.value) {
      probeMode.value = false
    }
    markDirty()
    return
  }

  if (e.key === 'p' || e.key === 'P') {
    probeMode.value = !probeMode.value
    if (canvasRef.value) {
      canvasRef.value.style.cursor = probeMode.value ? 'crosshair' : 'crosshair'
    }
    markDirty()
    return
  }

  if (e.key === 'r' || e.key === 'R') {
    if (props.circuit.selection.components.length > 0) {
      props.circuit.selection.components.forEach(comp => {
        comp.rotation = ((comp.rotation || 0) + 90) % 360
      })
      saveHistory()
      markDirty()
    }
    return
  }

  // #6: 水平翻转 (H) / 垂直翻转 (V)
  if (e.key === 'h' || e.key === 'H') {
    if (props.circuit.selection.components.length > 0) {
      props.circuit.selection.components.forEach(comp => {
        comp.flippedX = !comp.flippedX
      })
      saveHistory()
      markDirty()
    }
    return
  }
  if (e.key === 'v' || e.key === 'V') {
    if (props.circuit.selection.components.length > 0) {
      props.circuit.selection.components.forEach(comp => {
        comp.flippedY = !comp.flippedY
      })
      saveHistory()
      markDirty()
    }
    return
  }

  if (e.key === 's' || e.key === 'S') {
    if (!e.ctrlKey && !e.metaKey) {
      props.simulation.stepSimulation()
      return
    }
  }

  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault()
    if (props.simulation.isSimulating.value) {
      props.simulation.stopSimulation()
    } else {
      props.simulation.startSimulation()
    }
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
    e.preventDefault()
    copySelection()
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
    e.preventDefault()
    pasteSelection()
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('undo'))
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
    e.preventDefault()
    window.dispatchEvent(new CustomEvent('redo'))
    return
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (editingWire.value && draggingWirePoint.value && dragPointIndex.value >= 0) {
      const wire = editingWire.value
      if (wire.points && dragPointIndex.value < wire.points.length) {
        updateStartPointRefsAfterDelete(wire.id, dragPointIndex.value)
        wire.points.splice(dragPointIndex.value, 1)
        draggingWirePoint.value = null
        dragPointIndex.value = -1
        saveHistory()
        markDirty()
        return
      }
    }
    props.circuit.deleteSelected()
    saveHistory()
    props.simulation.simulate()
    markDirty()
  }
}

function copySelection() {
  if (props.circuit.selection.components.length === 0) return

  const compIdMap = new Map()
  const copiedComponents = props.circuit.selection.components.map(comp => {
    const newId = `comp_copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    compIdMap.set(comp.id, newId)
    return {
      ...JSON.parse(JSON.stringify(comp)),
      id: newId,
      _originalId: comp.id
    }
  })

  const copiedWires = props.circuit.selection.wires.map(wire => {
    const newFromId = compIdMap.get(wire.from.componentId)
    const newToId = compIdMap.get(wire.to.componentId)
    if (newFromId && newToId) {
      return {
        ...JSON.parse(JSON.stringify(wire)),
        id: `wire_copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        from: { ...wire.from, componentId: newFromId },
        to: { ...wire.to, componentId: newToId }
      }
    }
    return null
  }).filter(Boolean)

  clipboard.value = {
    components: copiedComponents,
    wires: copiedWires
  }
}

function pasteSelection() {
  if (clipboard.value.components.length === 0) return

  props.circuit.clearSelection()

  const idMap = new Map()
  const pastedComponents = clipboard.value.components.map(comp => {
    const newComp = props.circuit.addComponent(comp.type, comp.x + 40, comp.y + 40)
    if (newComp) {
      const compData = JSON.parse(JSON.stringify(comp))
      delete compData.id
      delete compData._originalId
      Object.assign(newComp, compData)
      newComp.x = comp.x + 40
      newComp.y = comp.y + 40
      idMap.set(comp.id, newComp)
      props.circuit.selection.components.push(newComp)
    }
    return newComp
  }).filter(Boolean)

  clipboard.value.wires.forEach(wire => {
    const fromComp = idMap.get(wire.from.componentId)
    const toComp = idMap.get(wire.to.componentId)
    if (fromComp && toComp) {
      const offsetPoints = wire.points 
        ? wire.points.map(p => ({ x: p.x + 40, y: p.y + 40 }))
        : []
      const newWire = props.circuit.addWire(
        fromComp, wire.from.port,
        toComp, wire.to.port,
        offsetPoints
      )
      props.circuit.selection.wires.push(newWire)
    }
  })

  saveHistory()
  props.simulation.simulate()
  markDirty()
}

function onContextMenu(e) {
  e.preventDefault()
  if (!canvasRef.value) return
  const pos = getCanvasPos(e)
  
  if (isWiring.value) {
    isWiring.value = false
    wiringStart.value = null
    wiringPoints.value = []
    editingWire.value = null
    markDirty()
    return
  }
  
  hideContextMenu()
  
  const comp = findComponentAt(pos.x, pos.y)
  if (comp) {
    const def = getCompDef(comp.type)
    showContextMenu.value = true
    contextMenuTarget.value = {
      type: def && def.isCustom ? 'custom' : 'component',
      component: comp
    }
    contextMenuStyle.value = {
      left: `${e.clientX}px`,
      top: `${e.clientY}px`
    }
    return
  }
  
  const wirePoint = findWirePointAt(pos.x, pos.y)
  if (wirePoint) {
    showContextMenu.value = true
    contextMenuTarget.value = wirePoint
    contextMenuStyle.value = {
      left: `${e.clientX}px`,
      top: `${e.clientY}px`
    }
    return
  }
  
  const wireSegment = findWireSegmentAt(pos.x, pos.y)
  if (wireSegment) {
    showContextMenu.value = true
    contextMenuTarget.value = wireSegment
    contextMenuStyle.value = {
      left: `${e.clientX}px`,
      top: `${e.clientY}px`
    }
    return
  }
  
  const wire = editingWire.value || (props.circuit.selection.wires.length > 0 ? props.circuit.selection.wires[0] : null)
  if (!wire) return
  
  const fromComp = props.circuit.getComponentById(wire.from.componentId)
  const toComp = props.circuit.getComponentById(wire.to.componentId)
  if (!fromComp || !toComp) return
  
  if (!editingWire.value) {
    editingWire.value = wire
  }
  
  const from = getWireStartPoint(wire)
  const to = getInputPortPos(toComp, wire.to.port)
  const points = [from, ...(wire.points || []), to]
  
  let pointToRemove = -1
  for (let i = 1; i < points.length - 1; i++) {
    const d = Math.sqrt((pos.x - points[i].x) ** 2 + (pos.y - points[i].y) ** 2)
    if (d < 15) {
      pointToRemove = i - 1
      break
    }
  }
  
  if (pointToRemove >= 0) {
    updateStartPointRefsAfterDelete(wire.id, pointToRemove)
    wire.points.splice(pointToRemove, 1)
  } else {
    for (let i = 0; i < points.length - 1; i++) {
      const d = distToSeg(pos.x, pos.y, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y)
      if (d < 15) {
        const snapped = snapToGrid(pos.x, pos.y)
        updateStartPointRefsAfterInsert(wire.id, i)
        wire.points.splice(i, 0, snapped)
        break
      }
    }
  }
  
  saveHistory()
  markDirty()
}

function hideContextMenu() {
  showContextMenu.value = false
  contextMenuTarget.value = null
}

// #5: 右键菜单增强
function rotateContextComp(deg) {
  if (!contextMenuTarget.value?.component) return
  const comp = contextMenuTarget.value.component
  comp.rotation = ((comp.rotation || 0) + deg) % 360
  saveHistory()
  markDirty()
  hideContextMenu()
}
function flipContextComp(axis) {
  if (!contextMenuTarget.value?.component) return
  const comp = contextMenuTarget.value.component
  if (axis === 'X') comp.flippedX = !comp.flippedX
  else comp.flippedY = !comp.flippedY
  saveHistory()
  markDirty()
  hideContextMenu()
}
function onCopyContextComp() {
  if (!contextMenuTarget.value?.component) return
  props.circuit.clearSelection()
  props.circuit.selection.components.push(contextMenuTarget.value.component)
  copySelection()
  hideContextMenu()
}
function onDeleteContextComp() {
  if (!contextMenuTarget.value?.component) return
  props.circuit.clearSelection()
  props.circuit.selection.components.push(contextMenuTarget.value.component)
  props.circuit.deleteSelected()
  saveHistory()
  props.simulation.simulate()
  markDirty()
  hideContextMenu()
}

function onShowComponentDetail(e) {
  e.stopPropagation()
  if (!contextMenuTarget.value || contextMenuTarget.value.type !== 'component') return
  const comp = contextMenuTarget.value.component
  emit('open-component-detail', comp)
  hideContextMenu()
}

function onUnpackage(e) {
  e.stopPropagation()
  if (!contextMenuTarget.value || contextMenuTarget.value.type !== 'custom') return
  
  const comp = contextMenuTarget.value.component
  const def = getCompDef(comp.type)
  if (!def || !def.isCustom || !def.customData) return
  
  const customData = def.customData
  const offsetX = comp.x - 30
  const offsetY = comp.y - 20
  
  const idMap = new Map()
  customData.internalComponents.forEach(ic => {
    const newId = `unpack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    idMap.set(ic.id, newId)
    
    const newComp = props.circuit.addComponent(
      ic.type,
      ic.x + offsetX,
      ic.y + offsetY
    )
    if (newComp) {
      newComp.id = newId
      newComp.state = ic.state || 0
      if (ic.text !== undefined) {
        newComp.text = ic.text
      }
    }
  })
  
  customData.internalWires.forEach(wire => {
    const fromId = idMap.get(wire.from.componentId)
    const toId = idMap.get(wire.to.componentId)
    if (fromId && toId) {
      const fromComp = props.circuit.getComponentById(fromId)
      const toComp = props.circuit.getComponentById(toId)
      if (fromComp && toComp) {
        const points = wire.points.map(p => ({
          x: p.x + offsetX,
          y: p.y + offsetY
        }))
        props.circuit.addWire(fromComp, wire.from.port, toComp, wire.to.port, points)
      }
    }
  })
  
  if (customData.inputPorts) {
    customData.inputPorts.forEach((port, i) => {
      const toId = idMap.get(port.componentId)
      if (toId && comp.inputs[i]) {
        const oldValue = comp.inputs[i].value
        const toComp = props.circuit.getComponentById(toId)
        if (toComp && toComp.inputs[port.port]) {
          toComp.inputs[port.port].value = oldValue
        }
      }
    })
  }
  
  if (customData.outputPorts) {
    customData.outputPorts.forEach((port, i) => {
      const fromId = idMap.get(port.componentId)
      if (fromId && comp.outputs[i]) {
        const oldValue = comp.outputs[i].value
        const fromComp = props.circuit.getComponentById(fromId)
        if (fromComp && fromComp.outputs[port.port]) {
          fromComp.outputs[port.port].value = oldValue
        }
      }
    })
  }
  
  props.circuit.removeComponent(comp)
  hideContextMenu()
  saveHistory()
  emit('component-added')
  markDirty()
}

function onStartBranch(e) {
  e.stopPropagation()
  if (!contextMenuTarget.value) return
  
  const target = contextMenuTarget.value
  let branchTarget = target
  
  if (target.type === 'wireSegment') {
    const wire = target.wire
    if (!wire.points) wire.points = []
    updateStartPointRefsAfterInsert(wire.id, target.segmentIndex)
    wire.points.splice(target.segmentIndex, 0, { x: target.position.x, y: target.position.y })
    branchTarget = {
      type: 'wirePoint',
      wire: wire,
      pointIndex: target.segmentIndex,
      position: target.position
    }
    saveHistory()
    markDirty()
  } else if (target.type !== 'wirePoint') {
    return
  }
  
  isWiring.value = true
  wiringStart.value = branchTarget
  wiringPoints.value = []
  tempWireEnd.value = branchTarget.position
  hideContextMenu()
}

function onDeleteWirePoint(e) {
  e.stopPropagation()
  if (!contextMenuTarget.value || contextMenuTarget.value.type !== 'wirePoint') return
  
  const wirePoint = contextMenuTarget.value
  if (wirePoint.wire.points && wirePoint.pointIndex >= 0 && wirePoint.pointIndex < wirePoint.wire.points.length) {
    updateStartPointRefsAfterDelete(wirePoint.wire.id, wirePoint.pointIndex)
    wirePoint.wire.points.splice(wirePoint.pointIndex, 1)
    saveHistory()
    markDirty()
  }
  hideContextMenu()
}

function onAddWirePoint(e) {
  e.stopPropagation()
  if (!contextMenuTarget.value || contextMenuTarget.value.type !== 'wireSegment') return
  
  const seg = contextMenuTarget.value
  const wire = seg.wire
  if (!wire.points) wire.points = []
  updateStartPointRefsAfterInsert(wire.id, seg.segmentIndex)
  wire.points.splice(seg.segmentIndex, 0, { x: seg.position.x, y: seg.position.y })
  saveHistory()
  markDirty()
  hideContextMenu()
}

function onWheel(e) {
  if (!canvasRef.value) return
  e.preventDefault()
  const delta = e.deltaY > 0 ? 0.95 : 1.05
  const newZoom = Math.max(0.3, Math.min(3, props.circuit.viewport.zoom * delta))
  
  const rect = canvasRef.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top
  
  props.circuit.viewport.x = mouseX - (mouseX - props.circuit.viewport.x) * (newZoom / props.circuit.viewport.zoom)
  props.circuit.viewport.y = mouseY - (mouseY - props.circuit.viewport.y) * (newZoom / props.circuit.viewport.zoom)
  props.circuit.viewport.zoom = newZoom
  markDirty()
}

function onDrop(e) {
  e.preventDefault()
  const type = e.dataTransfer.getData('componentType')
  if (type) {
    const pos = getCanvasPos(e)
    const def = getCompDef(type)
    // #17: 锚点居中（减去宽高一半，使元器件中心落在鼠标位置）
    const w = def ? def.width : 60
    const h = def ? def.height : 60
    let snapped = snapToGrid(pos.x - w / 2, pos.y - h / 2)
    // #2: 碰撞检测，重叠时阶梯偏移
    let attempts = 0
    const maxAttempts = 30
    while (attempts < maxAttempts) {
      const overlap = props.circuit.components.value.some(c =>
        snapped.x < c.x + c.width && snapped.x + w > c.x &&
        snapped.y < c.y + c.height && snapped.y + h > c.y
      )
      if (!overlap) break
      snapped = snapToGrid(snapped.x + 20, snapped.y + 20)
      attempts++
    }
    props.circuit.addComponent(type, snapped.x, snapped.y)
    saveHistory()
    emit('component-added')
    markDirty()
  }
}

function saveHistory() {
  const event = new CustomEvent('save-history')
  window.dispatchEvent(event)
}

const textEditorStyle = computed(() => {
  if (!editingText.value || !editingText.value.component) return {}
  const comp = editingText.value.component
  return {
    left: `${comp.x * props.circuit.viewport.zoom + props.circuit.viewport.x}px`,
    top: `${comp.y * props.circuit.viewport.zoom + props.circuit.viewport.y}px`,
    width: `${comp.width * props.circuit.viewport.zoom}px`,
    height: `${comp.height * props.circuit.viewport.zoom}px`,
    fontSize: `${15 * props.circuit.viewport.zoom}px`
  }
})

function onMouseDblClick(e) {
  if (!canvasRef.value) return
  const pos = getCanvasPos(e)
  
  const comp = findComponentAt(pos.x, pos.y)
  if (comp) {
    const def = getCompDef(comp.type)
    if (def && def.isCustom) {
      comp.expanded = !comp.expanded
      markDirty()
      return
    }
    
    // 双击CLOCK/OSCILLATOR打开时钟设置
    if (comp.type === 'CLOCK' || comp.type === 'OSCILLATOR') {
      emit('open-clock-settings', comp)
      return
    }

    // 双击CLOCKDIVIDER打开分频设置
    if (comp.type === 'CLOCKDIVIDER') {
      emit('open-divider-settings', comp)
      return
    }
    
    // 双击CPU打开CPU调试器
    if (comp.type === 'CPU') {
      emit('open-cpu-debugger', comp)
      return
    }
    
    // 双击INSTRUCTION_EXECUTOR打开执行器调试器
    if (comp.type === 'INSTRUCTION_EXECUTOR') {
      emit('open-exec-debugger', comp)
      return
    }
    
    // 双击ROM256打开指令编辑器
    if (comp.type === 'ROM256') {
      emit('open-instruction-editor', comp)
      return
    }

    // 双击ROM164/RAM164打开存储器编辑器
    if (comp.type === 'ROM164' || comp.type === 'RAM164' || comp.type === 'EXT_RAM') {
      emit('open-memory-editor', comp)
      return
    }

    // 双击DOTMATRIX16打开字模编辑器
    if (comp.type === 'DOTMATRIX16') {
      emit('open-dotmatrix-editor', comp)
      return
    }

    // 双击COUNTER4/RING4/SHIFT4/REG4打开状态查看器
    if (comp.type === 'COUNTER4' || comp.type === 'RING4' || comp.type === 'SHIFT4' || comp.type === 'REG4') {
      emit('open-state-viewer', comp)
      return
    }

    // 双击LCD1602/SEGDISPLAY8/SEGDISPLAY1打开状态查看器
    if (comp.type === 'LCD1602' || comp.type === 'SEGDISPLAY8' || comp.type === 'SEGDISPLAY1') {
      emit('open-state-viewer', comp)
      return
    }

    // 双击IO_PORT/TIMER/IO_BRIDGE打开I/O配置
    if (comp.type === 'IO_PORT' || comp.type === 'TIMER' || comp.type === 'IO_BRIDGE') {
      emit('open-io-config', comp)
      return
    }
  }
  
  if (comp && comp.type === 'TEXT') {
    editingText.value = {
      component: comp,
      text: comp.text || ''
    }
    nextTick(() => {
      if (textAreaRef.value) {
        textAreaRef.value.focus()
      }
    })
    return
  }
  
  const wire = findWireAt(pos.x, pos.y)
  if (wire && !isWiring.value) {
    const fromComp = props.circuit.getComponentById(wire.from.componentId)
    const toComp = props.circuit.getComponentById(wire.to.componentId)
    if (fromComp && toComp) {
      const from = getWireStartPoint(wire)
      const to = getInputPortPos(toComp, wire.to.port)
      const points = [from, ...(wire.points || []), to]
      
      let closestSeg = -1
      let closestDist = Infinity
      let closestParam = 0
      
      for (let i = 0; i < points.length - 1; i++) {
        const p1 = points[i]
        const p2 = points[i + 1]
        const d = distToSeg(pos.x, pos.y, p1.x, p1.y, p2.x, p2.y)
        if (d < closestDist) {
          closestDist = d
          closestSeg = i
          
          const A = pos.x - p1.x
          const B = pos.y - p1.y
          const C = p2.x - p1.x
          const D = p2.y - p1.y
          const dot = A * C + B * D
          const lenSq = C * C + D * D
          closestParam = lenSq !== 0 ? dot / lenSq : 0
          closestParam = Math.max(0, Math.min(1, closestParam))
        }
      }
      
      if (closestSeg !== -1) {
        const p1 = points[closestSeg]
        const p2 = points[closestSeg + 1]
        const newX = p1.x + closestParam * (p2.x - p1.x)
        const newY = p1.y + closestParam * (p2.y - p1.y)
        const snapped = snapToGrid(newX, newY)
        
        if (!wire.points) {
          wire.points = []
        }
        updateStartPointRefsAfterInsert(wire.id, closestSeg)
        wire.points.splice(closestSeg, 0, { x: snapped.x, y: snapped.y })
        
        editingWire.value = wire
        saveHistory()
        markDirty()
      }
    }
  }
}

function saveTextEdit(e) {
  if (!editingText.value) return
  
  const comp = editingText.value.component
  comp.text = editingText.value.text
  comp.height = calculateTextHeight(comp.text, comp.width)
  editingText.value = null
  saveHistory()
  markDirty()
}

function cancelTextEdit() {
  editingText.value = null
}

function render() {
  if (!canvasRef.value) return
  
  const context = canvasRef.value.getContext('2d')
  context.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  context.save()
  context.scale(dpr, dpr)
  context.translate(props.circuit.viewport.x, props.circuit.viewport.y)
  context.scale(props.circuit.viewport.zoom, props.circuit.viewport.zoom)
  
  drawGrid(context)
  // A4: 总线束视觉聚合 — 检测同源同目标的并行连线组并绘制包围框
  drawBusBundles(context)
  props.circuit.wires.value.forEach(wire => drawWire(context, wire, false))
  if (isWiring.value && wiringStart.value) drawTempWire(context)
  
  props.circuit.components.value.forEach(comp => drawComponent(context, comp))

  props.circuit.wires.value.forEach(wire => drawWire(context, wire, true))
  
  if (isSelecting.value) {
    drawSelectionBox(context)
  }

  // #32: 拖拽时显示对齐参考线
  drawAlignmentGuides(context)

  context.restore()
}

function drawSelectionBox(ctx) {
  const x1 = selectionStart.value.x
  const y1 = selectionStart.value.y
  const x2 = selectionEnd.value.x
  const y2 = selectionEnd.value.y

  const x = Math.min(x1, x2)
  const y = Math.min(y1, y2)
  const w = Math.abs(x2 - x1)
  const h = Math.abs(y2 - y1)

  ctx.fillStyle = 'rgba(0, 120, 212, 0.1)'
  ctx.fillRect(x, y, w, h)

  ctx.strokeStyle = '#0078d4'
  ctx.lineWidth = 1
  ctx.setLineDash([5, 5])
  ctx.strokeRect(x, y, w, h)
  ctx.setLineDash([])
}

// #32: 拖拽对齐参考线 — 当拖动选中元器件时，与其它元器件中心对齐绘制虚线
function drawAlignmentGuides(ctx) {
  if (!isDragging.value || props.circuit.selection.components.length === 0) return
  const threshold = 6 // 中心对齐容差(px)
  const selectedIds = new Set(props.circuit.selection.components.map(c => c.id))
  ctx.save()
  ctx.strokeStyle = '#ff6a00'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])

  for (const sel of props.circuit.selection.components) {
    const scx = sel.x + sel.width / 2
    const scy = sel.y + sel.height / 2
    // 同时检查左/右/上/下边缘对齐
    const selEdges = {
      left: sel.x, right: sel.x + sel.width,
      top: sel.y, bottom: sel.y + sel.height,
      cx: scx, cy: scy
    }
    for (const other of props.circuit.components.value) {
      if (selectedIds.has(other.id)) continue
      const ocx = other.x + other.width / 2
      const ocy = other.y + other.height / 2
      const otherEdges = {
        left: other.x, right: other.x + other.width,
        top: other.y, bottom: other.y + other.height,
        cx: ocx, cy: ocy
      }
      // 垂直对齐线（X 相同）：左/右/中心
      const xCandidates = [
        ['cx', selEdges.cx, otherEdges.cx],
        ['left', selEdges.left, otherEdges.left],
        ['right', selEdges.right, otherEdges.right],
        ['left-right', selEdges.left, otherEdges.right],
        ['right-left', selEdges.right, otherEdges.left]
      ]
      for (const [, sx, ox] of xCandidates) {
        if (Math.abs(sx - ox) < threshold) {
          const y1 = Math.min(sel.y, other.y)
          const y2 = Math.max(sel.y + sel.height, other.y + other.height)
          ctx.beginPath()
          ctx.moveTo(ox, y1 - 10)
          ctx.lineTo(ox, y2 + 10)
          ctx.stroke()
          break
        }
      }
      // 水平对齐线（Y 相同）
      const yCandidates = [
        ['cy', selEdges.cy, otherEdges.cy],
        ['top', selEdges.top, otherEdges.top],
        ['bottom', selEdges.bottom, otherEdges.bottom],
        ['top-bottom', selEdges.top, otherEdges.bottom],
        ['bottom-top', selEdges.bottom, otherEdges.top]
      ]
      for (const [, sy, oy] of yCandidates) {
        if (Math.abs(sy - oy) < threshold) {
          const x1 = Math.min(sel.x, other.x)
          const x2 = Math.max(sel.x + sel.width, other.x + other.width)
          ctx.beginPath()
          ctx.moveTo(x1 - 10, oy)
          ctx.lineTo(x2 + 10, oy)
          ctx.stroke()
          break
        }
      }
    }
  }
  ctx.setLineDash([])
  ctx.restore()
}

function drawGrid(ctx) {
  const grid = GRID_SIZE
  const majorGrid = GRID_SIZE * 5
  const startX = Math.floor(-props.circuit.viewport.x / props.circuit.viewport.zoom / grid) * grid - grid
  const startY = Math.floor(-props.circuit.viewport.y / props.circuit.viewport.zoom / grid) * grid - grid
  const endX = startX + (canvasRef.value.width / dpr) / props.circuit.viewport.zoom + grid * 2
  const endY = startY + (canvasRef.value.height / dpr) / props.circuit.viewport.zoom + grid * 2
  
  ctx.strokeStyle = '#252525'
  ctx.lineWidth = 1
  
  for (let x = startX; x < endX; x += grid) {
    ctx.beginPath()
    ctx.moveTo(x, startY)
    ctx.lineTo(x, endY)
    ctx.stroke()
  }
  for (let y = startY; y < endY; y += grid) {
    ctx.beginPath()
    ctx.moveTo(startX, y)
    ctx.lineTo(endX, y)
    ctx.stroke()
  }
  
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  
  for (let x = startX; x < endX; x += majorGrid) {
    if (x % majorGrid === 0) {
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
      ctx.stroke()
    }
  }
  for (let y = startY; y < endY; y += majorGrid) {
    if (y % majorGrid === 0) {
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
    }
  }
  
  ctx.strokeStyle = '#4a4a4a'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(startX, 0)
  ctx.lineTo(endX, 0)
  ctx.moveTo(0, startY)
  ctx.lineTo(0, endY)
  ctx.stroke()
}

// V4: 绘制带圆角折弯的路径（在折点处用二次贝塞尔曲线平滑过渡）
function drawRoundedPath(ctx, points, radius = 12) {
  if (points.length < 2) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  if (points.length === 2 || radius <= 0) {
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
    return
  }
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const dx1 = p1.x - p0.x, dy1 = p1.y - p0.y
    const dx2 = p2.x - p1.x, dy2 = p2.y - p1.y
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1)
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2)
    const r = Math.min(radius, len1 / 2, len2 / 2)
    const ax = p1.x - (dx1 / len1) * r
    const ay = p1.y - (dy1 / len1) * r
    const bx = p1.x + (dx2 / len2) * r
    const by = p1.y + (dy2 / len2) * r
    ctx.lineTo(ax, ay)
    ctx.quadraticCurveTo(p1.x, p1.y, bx, by)
  }
  const last = points[points.length - 1]
  ctx.lineTo(last.x, last.y)
}

// A4: 总线束视觉聚合 — 检测同源同目标的并行连线组并绘制半透明包围框
function drawBusBundles(ctx) {
  const wires = props.circuit.wires.value
  if (wires.length < 4) return

  // 按 from.componentId + to.componentId 分组
  const groups = new Map()
  for (const wire of wires) {
    const key = `${wire.from.componentId}->${wire.to.componentId}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(wire)
  }

  for (const [, groupWires] of groups) {
    if (groupWires.length < 4) continue  // 仅对 4+ 位总线束绘制

    // 计算包围框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const wire of groupWires) {
      const fromComp = props.circuit.getComponentById(wire.from.componentId)
      const toComp = props.circuit.getComponentById(wire.to.componentId)
      if (!fromComp || !toComp) continue
      const from = getWireStartPoint(wire)
      const to = getInputPortPos(toComp, wire.to.port)
      const points = [from, ...(wire.points || []), to]
      for (const p of points) {
        if (p.x < minX) minX = p.x
        if (p.y < minY) minY = p.y
        if (p.x > maxX) maxX = p.x
        if (p.y > maxY) maxY = p.y
      }
    }

    if (minX === Infinity) continue

    // 绘制半透明包围框
    const pad = 8
    ctx.fillStyle = 'rgba(170, 0, 255, 0.06)'
    ctx.strokeStyle = 'rgba(170, 0, 255, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.roundRect(minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2, 6)
    ctx.fill()
    ctx.stroke()
    ctx.setLineDash([])

    // 位宽文字标签 — 已移除（不显示文字/数字）
  }
}

// A1: 判断连线类型（clock/data/control/bus）
function getWireType(wire) {
  const fromComp = props.circuit.getComponentById(wire.from.componentId)
  if (!fromComp) return 'data'
  if (fromComp.type === 'CLOCK' || fromComp.type === 'OSCILLATOR') return 'clock'
  // 连接到触发器 CLK 端口的控制线
  const toComp = props.circuit.getComponentById(wire.to.componentId)
  if (toComp) {
    const seqTypes = ['DFF','DLATCH','JKFF','TFF','SRFF','COUNTER4','RING4','REG4','RAM164','CLOCKDIVIDER']
    if (seqTypes.includes(toComp.type)) {
      // 判断是否连到 CLK 端口（通常第 2 个输入）
      const def = COMPONENT_TYPES[toComp.type]
      if (def && wire.to.port === 1) return 'control'
    }
  }
  return 'data'
}

// V3: 按类型获取连线颜色和粗细
function getWireStyle(wire) {
  const type = getWireType(wire)
  switch (type) {
    case 'clock':   return { color: WIRE_COLORS.clock, width: 4 }
    case 'control': return { color: WIRE_COLORS.control, width: 5 }
    case 'bus':     return { color: WIRE_COLORS.bus, width: 8 }
    default:        return { color: WIRE_COLORS.high, width: 5 }
  }
}

// V29: 末端渐细路径
function drawTaperedPath(ctx, points, baseWidth) {
  if (points.length < 2) return
  for (let i = 0; i < points.length - 1; i++) {
    const t1 = i / (points.length - 1)
    const t2 = (i + 1) / (points.length - 1)
    // 两端渐细：中间最粗，两端 60%
    const w1 = baseWidth * (0.6 + 0.4 * Math.sin(t1 * Math.PI))
    const w2 = baseWidth * (0.6 + 0.4 * Math.sin(t2 * Math.PI))
    ctx.lineWidth = (w1 + w2) / 2
    ctx.beginPath()
    ctx.moveTo(points[i].x, points[i].y)
    if (i < points.length - 2) {
      // 圆角过渡
      const p0 = points[i], p1 = points[i + 1], p2 = points[i + 2]
      const dx1 = p1.x - p0.x, dy1 = p1.y - p0.y
      const dx2 = p2.x - p1.x, dy2 = p2.y - p1.y
      const len1 = Math.sqrt(dx1*dx1 + dy1*dy1)
      const len2 = Math.sqrt(dx2*dx2 + dy2*dy2)
      const r = Math.min(12, len1/2, len2/2)
      const ax = p1.x - (dx1/len1) * r
      const ay = p1.y - (dy1/len1) * r
      ctx.lineTo(ax, ay)
    } else {
      ctx.lineTo(points[i + 1].x, points[i + 1].y)
    }
    ctx.stroke()
  }
}

function drawWire(ctx, wire, onlyPoints = false) {
  const fromComp = props.circuit.getComponentById(wire.from.componentId)
  const toComp = props.circuit.getComponentById(wire.to.componentId)
  if (!fromComp || !toComp) return

  const from = getWireStartPoint(wire)
  const to = getInputPortPos(toComp, wire.to.port)
  const points = [from, ...(wire.points || []), to]

  const isSelected = props.circuit.selection.wires.includes(wire)
  const isEditing = editingWire.value === wire
  const isHovered = probeMode.value && hoveredWire.value === wire
  const wireStyle = getWireStyle(wire)
  const zoomLevel = getZoomLevel()
  const showLabels = zoomLevel !== 'far'

  // V22/C1: 检测信号跳变
  const prevVal = wire._lastValue
  const currVal = wire.value
  if (prevVal !== undefined && prevVal !== currVal) {
    wireTransitions.set(wire.id, { time: Date.now(), fromVal: prevVal, toVal: currVal })
  }
  wire._lastValue = currVal

  // V38: 更新连线值历史
  if (!wireHistories.has(wire.id)) wireHistories.set(wire.id, [])
  const hist = wireHistories.get(wire.id)
  hist.push(currVal)
  if (hist.length > 32) hist.shift()

  if (!onlyPoints) {
    // V18: 选中连线 — 行进蚂蚁动画（蓝色虚线滚动）
    if (isSelected) {
      ctx.strokeStyle = WIRE_COLORS.selected
      ctx.lineWidth = 4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.setLineDash([10, 6])
      ctx.lineDashOffset = -wireAnimOffset * 0.5
      drawRoundedPath(ctx, points)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.lineDashOffset = 0
    }

    if (isHovered) {
      ctx.strokeStyle = WIRE_COLORS.hovered
      ctx.lineWidth = 14
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      drawRoundedPath(ctx, points)
      ctx.stroke()
    }

    // V30/C2: 高电平微脉冲（正弦呼吸 alpha）
    const pulseAlpha = currVal ? (0.3 + 0.2 * Math.sin(Date.now() / 1000)) : 0

    // V2/V28: 发光辉光 + 阴影层次感
    if (currVal) {
      // 外层柔光
      ctx.shadowBlur = 15
      ctx.shadowColor = wireStyle.color
      ctx.strokeStyle = wireStyle.color + '60'
      ctx.lineWidth = wireStyle.width + 6
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.globalAlpha = pulseAlpha + 0.3
      drawRoundedPath(ctx, points)
      ctx.stroke()
      ctx.globalAlpha = 1.0
      ctx.shadowBlur = 0
    }

    // 主线条 — V4 圆角折弯 + V3 类型着色（移除渐变色，分支线颜色区分）
    const isBranch = !!wire.startPointRef
    const mainColor = currVal ? (isBranch ? WIRE_COLORS.branch : wireStyle.color) : WIRE_COLORS.low
    ctx.strokeStyle = mainColor
    // P1/P2: 分支线略细于源线
    const widthAdj = isBranch ? -0.5 : 0
    ctx.lineWidth = isSelected ? wireStyle.width + 3 + widthAdj : (isHovered ? wireStyle.width + 2 + widthAdj : wireStyle.width + widthAdj)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    // V28: 低电平连线阴影（贴地感）
    if (!currVal) {
      ctx.shadowOffsetY = 1
      ctx.shadowBlur = 2
      ctx.shadowColor = 'rgba(0,0,0,0.2)'
    }
    drawRoundedPath(ctx, points)
    ctx.stroke()
    ctx.shadowOffsetY = 0
    ctx.shadowBlur = 0

    // V1: 信号流动动画 — 高电平时流动虚线沿方向滚动
    if (currVal) {
      ctx.strokeStyle = WIRE_COLORS.highFlow
      ctx.lineWidth = 3
      ctx.setLineDash([6, 14])
      ctx.lineDashOffset = -wireAnimOffset * 0.8
      drawRoundedPath(ctx, points)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.lineDashOffset = 0
    }

    // V22/C1: 信号跳变光波
    const transition = wireTransitions.get(wire.id)
    if (transition) {
      const elapsed = Date.now() - transition.time
      const duration = 300
      if (elapsed < duration) {
        const progress = elapsed / duration
        // 计算光波当前位置
        let totalLen = 0
        const segLens = []
        for (let i = 0; i < points.length - 1; i++) {
          const sl = Math.sqrt((points[i+1].x - points[i].x)**2 + (points[i+1].y - points[i].y)**2)
          segLens.push(sl)
          totalLen += sl
        }
        const targetLen = totalLen * progress
        let accLen = 0
        let waveX = points[0].x, waveY = points[0].y
        for (let i = 0; i < segLens.length; i++) {
          if (accLen + segLens[i] >= targetLen) {
            const t = (targetLen - accLen) / segLens[i]
            waveX = points[i].x + (points[i+1].x - points[i].x) * t
            waveY = points[i].y + (points[i+1].y - points[i].y) * t
            break
          }
          accLen += segLens[i]
        }
        const alpha = 1 - progress
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`
        ctx.shadowBlur = 20
        ctx.shadowColor = transition.toVal ? WIRE_COLORS.high : WIRE_COLORS.low
        ctx.beginPath()
        ctx.arc(waveX, waveY, 8 * (1 - progress * 0.5), 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        wireTransitions.delete(wire.id)
      }
    }

    // C3: 连线值内联标签 — 已移除（不显示文字/数字）

    // V38: 连线值历史迷你波形（仅悬停时显示，无文字）
    if (isHovered && hist.length > 2) {
      const midIdx = Math.floor(points.length / 2)
      const mid = points[midIdx]
      const waveW = 80, waveH = 20
      const wx = mid.x - waveW / 2
      const wy = mid.y + 12
      ctx.fillStyle = WIRE_COLORS.labelBg
      ctx.strokeStyle = '#444'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.roundRect(wx, wy, waveW, waveH, 3)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = currVal ? WIRE_COLORS.high : '#666'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      for (let i = 0; i < hist.length; i++) {
        const px = wx + (i / (hist.length - 1)) * waveW
        const py = wy + waveH - 4 - hist[i] * (waveH - 8)
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
    }

    // #14: 探针模式悬停 — 显示信号值内联标签（0/1 + 类型颜色）
    if (isHovered) {
      const midIdx = Math.floor(points.length / 2)
      const mid = points[midIdx]
      const color = currVal ? WIRE_COLORS.high : WIRE_COLORS.lowGlow
      const valText = currVal ? '1' : '0'
      // 颜色指示圆点
      ctx.fillStyle = color
      ctx.shadowBlur = 8
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.arc(mid.x, mid.y - 12, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      // 信号值文字标签
      ctx.font = 'bold 11px Consolas, monospace'
      const textW = ctx.measureText(valText).width
      const pad = 4
      const boxW = textW + pad * 2
      const boxH = 16
      const bx = mid.x - boxW / 2
      const by = mid.y - 12 - boxH - 4
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
      roundRect(ctx, bx, by, boxW, boxH, 4)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(valText, mid.x, by + boxH / 2)
    }
  } else {
    // V12/V13/V31/V32/V33: 节点视觉增强
    const allWires = props.circuit.wires.value
    // V33: 检查此连线是否有关联分支（用于联动高亮）
    const hasRelatedBranch = allWires.some(w => w !== wire && w.startPointRef && w.startPointRef.wireId === wire.id)

    for (let i = 1; i < points.length - 1; i++) {
      const p = points[i]
      const nodeIdx = i - 1
      const hasBranch = allWires.some(w => w !== wire && w.startPointRef &&
                          w.startPointRef.wireId === wire.id && w.startPointRef.pointIndex === nodeIdx)
      const isNodeEditing = isEditing || isSelected
      // #31: 节点悬停检测 — 当前节点的 wireId 与 pointIndex 命中
      const isNodeHovered = hoveredNode.value && hoveredNode.value.wireId === wire.id &&
                            hoveredNode.value.pointIndex === nodeIdx

      // V32: 拖拽中节点金色（无坐标文字）
      if (draggingWirePoint.value && draggingWirePoint.value.wire === wire && dragPointIndex.value === nodeIdx) {
        ctx.fillStyle = WIRE_COLORS.nodeDrag
        ctx.shadowBlur = 8
        ctx.shadowColor = WIRE_COLORS.nodeDrag
        ctx.beginPath()
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      } else if (hasBranch) {
        // V13/P2: 有分支的节点 — 蓝色实心圆 + 白色描边 + 呼吸环动画
        // 呼吸环
        const breathR = 7 + 3 * Math.sin(Date.now() / 800)
        ctx.strokeStyle = WIRE_COLORS.nodeBranch + '60'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(p.x, p.y, breathR, 0, Math.PI * 2)
        ctx.stroke()
        // 实心圆
        ctx.fillStyle = WIRE_COLORS.nodeBranch
        ctx.beginPath()
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 1.5
        ctx.stroke()
      } else if (isNodeEditing) {
        ctx.fillStyle = WIRE_COLORS.nodeEdit
        ctx.beginPath()
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = isEditing ? WIRE_COLORS.nodeBranch : '#888'
        ctx.lineWidth = isEditing ? 3 : 2
        ctx.beginPath()
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
        ctx.stroke()
      } else if (isNodeHovered) {
        // #31: 节点悬停高亮 — 蓝色环 + 提示可拖拽
        ctx.fillStyle = WIRE_COLORS.nodeBranch
        ctx.shadowBlur = 8
        ctx.shadowColor = WIRE_COLORS.nodeBranch
        ctx.beginPath()
        ctx.arc(p.x, p.y, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.strokeStyle = '#fff'
        ctx.lineWidth = 2
        ctx.stroke()
      } else {
        // V12: 普通节点始终显示灰色小圆
        ctx.fillStyle = WIRE_COLORS.nodeNormal
        ctx.beginPath()
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // V13: T型/十字型连接标识 — 在连线交叉且共享节点处绘制实心圆点
    // （已通过上面的 hasBranch 分支处理）
  }
}

function drawTempWire(ctx) {
  let from
  if (wiringStart.value.type === 'wirePoint') {
    from = wiringStart.value.position
  } else {
    from = wiringStart.value.isOutput
      ? getOutputPortPos(wiringStart.value.component, wiringStart.value.portIndex)
      : getInputPortPos(wiringStart.value.component, wiringStart.value.portIndex)
  }

  // V35/B1: 起点端口呼吸脉冲圈
  if (wiringStart.value.component || wiringStart.value.type === 'wirePoint') {
    const pulseR = 14 + 8 * Math.sin(Date.now() / 400)
    const pulseAlpha = 0.4 - 0.3 * Math.sin(Date.now() / 400)
    ctx.strokeStyle = `rgba(0, 120, 212, ${Math.max(0, pulseAlpha)})`
    ctx.lineWidth = 2
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.arc(from.x, from.y, pulseR, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // B4: 终点磁吸 — 接近合法端口 20px 内自动吸附
  let endPoint = { ...tempWireEnd.value }
  const hovered = hoveredPort.value
  let isValidTarget = false
  let isInvalidTarget = false

  if (hovered && !hovered.isOutput) {
    if ((wiringStart.value.isOutput || wiringStart.value.type === 'wirePoint') &&
        hovered.component !== wiringStart.value.component) {
      isValidTarget = true
      // B4: 磁吸吸附
      const targetPos = getInputPortPos(hovered.component, hovered.portIndex)
      const dist = Math.sqrt((endPoint.x - targetPos.x)**2 + (endPoint.y - targetPos.y)**2)
      if (dist < 20) {
        endPoint = targetPos
      }
    }
  } else if (hovered && hovered.isOutput) {
    if (wiringStart.value.isOutput || wiringStart.value.type === 'wirePoint') {
      isInvalidTarget = true
    }
  }

  // V16/B2: L 型智能路由 — 若无手动折点，自动生成 L 型路径
  let points = [from, ...wiringPoints.value, endPoint]
  if (wiringPoints.value.length === 0 && from.x !== endPoint.x && from.y !== endPoint.y) {
    // 根据鼠标移动方向智能选择先水平还是先垂直
    const dx = Math.abs(endPoint.x - from.x)
    const dy = Math.abs(endPoint.y - from.y)
    if (dx > dy) {
      // 先水平后垂直
      points = [from, { x: endPoint.x, y: from.y }, endPoint]
    } else {
      // 先垂直后水平
      points = [from, { x: from.x, y: endPoint.y }, endPoint]
    }
  }

  // V15/B5: 颜色根据命中状态变化
  let strokeColor = WIRE_COLORS.temp
  if (isValidTarget) strokeColor = WIRE_COLORS.valid
  else if (isInvalidTarget) strokeColor = WIRE_COLORS.invalid

  // V17: 网格吸附提示 — 在终点附近网格点绘制十字标记
  const snappedEnd = snapToGrid(endPoint.x, endPoint.y)
  if (snappedEnd.x !== endPoint.x || snappedEnd.y !== endPoint.y) {
    ctx.strokeStyle = 'rgba(0, 120, 212, 0.3)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(snappedEnd.x - 4, snappedEnd.y)
    ctx.lineTo(snappedEnd.x + 4, snappedEnd.y)
    ctx.moveTo(snappedEnd.x, snappedEnd.y - 4)
    ctx.lineTo(snappedEnd.x, snappedEnd.y + 4)
    ctx.stroke()
  }

  ctx.strokeStyle = strokeColor
  ctx.lineWidth = isValidTarget ? 6 : 5
  ctx.setLineDash(isValidTarget ? [] : [8, 6])
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  drawRoundedPath(ctx, points)
  ctx.stroke()
  ctx.setLineDash([])

  // 转折点
  for (let i = 1; i < points.length - 1; i++) {
    ctx.fillStyle = strokeColor
    ctx.beginPath()
    ctx.arc(points[i].x, points[i].y, 5, 0, Math.PI * 2)
    ctx.fill()
    // V17: 转折点蓝色方块高亮
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  // V15/B5: 终点提示 — 命中合法端口时绘制绿色磁吸圈
  if (isValidTarget && hovered) {
    const targetPos = getInputPortPos(hovered.component, hovered.portIndex)
    ctx.strokeStyle = WIRE_COLORS.valid
    ctx.lineWidth = 2
    ctx.setLineDash([4, 4])
    ctx.lineDashOffset = -wireAnimOffset * 0.5
    ctx.beginPath()
    ctx.arc(targetPos.x, targetPos.y, 16, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.lineDashOffset = 0
  }
  // B5: 命中非法端口时绘制红色禁止圈 ⊘
  if (isInvalidTarget && hovered) {
    const targetPos = getOutputPortPos(hovered.component, hovered.portIndex)
    ctx.strokeStyle = WIRE_COLORS.invalid
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(targetPos.x, targetPos.y, 12, 0, Math.PI * 2)
    ctx.stroke()
    // 禁止斜线
    ctx.beginPath()
    ctx.moveTo(targetPos.x - 8, targetPos.y - 8)
    ctx.lineTo(targetPos.x + 8, targetPos.y + 8)
    ctx.stroke()
  }
}

// #9: 标签显示判断（替代超长排除列表）
const EXTRA_HIDE_LABEL = new Set(['CLOCK','IO_BRIDGE','EXT_RAM','IO_PORT','TIMER','CPU','ROM256','INSTRUCTION_EXECUTOR','BCD7SEG','HEXDISPLAY','ASCII_DISPLAY','LED_BAR8','SCOPE','KEYPAD_4x4','OSCILLATOR'])
function shouldHideLabel(comp, def) {
  return def.isSegDisplay || def.isSegDisplay1 || def.isSegDisplay7 || def.isBusDisplay || def.isDotMatrix || def.isLCD || def.isText || def.isConstant || EXTRA_HIDE_LABEL.has(comp.type)
}

// #18: 支持双击配置的元器件类型集合
const CONFIGURABLE_TYPES = new Set([
  'CLOCK', 'OSCILLATOR', 'CLOCKDIVIDER',
  'CPU', 'INSTRUCTION_EXECUTOR', 'ROM256',
  'ROM164', 'RAM164', 'EXT_RAM',
  'DOTMATRIX16',
  'COUNTER4', 'RING4', 'SHIFT4', 'REG4',
  'LCD1602', 'SEGDISPLAY8', 'SEGDISPLAY1',
  'IO_PORT', 'TIMER', 'IO_BRIDGE',
  'TEXT'
])

function drawComponent(ctx, comp) {
  let def = COMPONENT_TYPES[comp.type]
  if (!def) {
    def = getCustomComponentDef(comp.type)
  }
  if (!def) return
  
  const isSelected = props.circuit.selection.components.includes(comp)
  const rotation = comp.rotation || 0

  ctx.save()
  if (rotation || comp.flippedX || comp.flippedY) {
    const cx = comp.x + comp.width / 2
    const cy = comp.y + comp.height / 2
    ctx.translate(cx, cy)
    ctx.rotate(rotation * Math.PI / 180)
    if (comp.flippedX) ctx.scale(-1, 1)
    if (comp.flippedY) ctx.scale(1, -1)
    ctx.translate(-cx, -cy)
  }
  
  if (def.isCustom && comp.expanded) {
    ctx.fillStyle = '#252525'
    ctx.strokeStyle = isSelected ? '#0078d4' : def.color
    ctx.lineWidth = isSelected ? 4 : 2
    roundRect(ctx, comp.x, comp.y, comp.width, comp.height, 10)
    ctx.fill()
    ctx.stroke()
    
    ctx.save()
    const customData = def.customData
    customData.internalWires.forEach(wire => {
      const fromComp = customData.internalComponents.find(c => c.id === wire.from.componentId)
      const toComp = customData.internalComponents.find(c => c.id === wire.to.componentId)
      if (fromComp && toComp) {
        const from = getInternalPortPos(fromComp, wire.from.port, true)
        const to = getInternalPortPos(toComp, wire.to.port, false)
        const points = [from, ...(wire.points || []), to]
        
        ctx.strokeStyle = '#666'
        ctx.lineWidth = 2
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y)
        }
        ctx.stroke()
      }
    })
    ctx.restore()
    
    ctx.save()
    customData.internalComponents.forEach(ic => {
      const icDef = COMPONENT_TYPES[ic.type]
      if (!icDef) return
      
      ctx.fillStyle = '#2d2d2d'
      ctx.strokeStyle = icDef.color
      ctx.lineWidth = 2
      roundRect(ctx, ic.x, ic.y, ic.width, ic.height, 8)
      ctx.fill()
      ctx.stroke()
      
      if (!icDef.isSegDisplay && !icDef.isSegDisplay1 && !icDef.isSegDisplay7 && !icDef.isDotMatrix && !icDef.isLCD && !icDef.isText && !icDef.isConstant && !icDef.isBusDisplay && ic.type !== 'CLOCK') {
        ctx.fillStyle = '#888'
        ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(icDef.label, ic.x + ic.width / 2, ic.y + ic.height / 2)
      }
    })
    ctx.restore()
  } else {
    ctx.fillStyle = '#2d2d2d'
    ctx.strokeStyle = isSelected ? '#0078d4' : def.color
    ctx.lineWidth = isSelected ? 4 : 2
    // #24: 选中态辉光增强
    if (isSelected) {
      ctx.shadowColor = '#0078d4'
      ctx.shadowBlur = 12
    }

    roundRect(ctx, comp.x, comp.y, comp.width, comp.height, 10)
    ctx.fill()
    ctx.stroke()
    ctx.shadowBlur = 0

    // #4: 元器件悬停高亮反馈
    if (hoveredComponent.value === comp && !isSelected) {
      ctx.strokeStyle = '#4a9eff'
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6
      roundRect(ctx, comp.x - 2, comp.y - 2, comp.width + 4, comp.height + 4, 12)
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    // #18: 可配置组件悬停时显示双击提示图标（齿轮⚙）
    if (hoveredComponent.value === comp && CONFIGURABLE_TYPES.has(comp.type)) {
      const ix = comp.x + comp.width - 14
      const iy = comp.y + 4
      ctx.save()
      // 背景圆
      ctx.fillStyle = 'rgba(0, 120, 212, 0.85)'
      ctx.beginPath()
      ctx.arc(ix, iy, 8, 0, Math.PI * 2)
      ctx.fill()
      // 齿轮图标（简化为 ⚙ 字符）
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('⚙', ix, iy + 1)
      ctx.restore()
    }

    // #9: 标签显示用标志位判断（替代超长排除列表）
    if (!shouldHideLabel(comp, def)) {
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(def.label, comp.x + comp.width / 2, comp.y + comp.height / 2)
    }
    
    if (def.isCustom) {
      ctx.fillStyle = '#666'
      ctx.font = '12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'bottom'
      ctx.fillText('双击展开', comp.x + comp.width - 10, comp.y + comp.height - 10)
    }
  }

  // 时序元件状态可视化：在组件底部显示当前 state
  drawSequentialState(ctx, comp)

  ctx.restore()
  
  // V7/V8/V9/V10/V11/V26/V27: 端口全视觉增强
  const zoomLevel = getZoomLevel()
  const showDetails = zoomLevel !== 'far'

  // 检查端口是否已连接
  const isInputConnected = (compId, portIdx) =>
    props.circuit.wires.value.some(w => w.to.componentId === compId && w.to.port === portIdx)
  const isOutputConnected = (compId, portIdx) =>
    props.circuit.wires.value.some(w => w.from.componentId === compId && w.from.port === portIdx)

  // 获取端口标签名
  const getPortLabel = (comp, idx, isOutput) => {
    const def = COMPONENT_TYPES[comp.type]
    if (def && def.portLabels) {
      const labels = isOutput ? def.portLabels.outputs : def.portLabels.inputs
      if (labels && labels[idx]) return labels[idx]
    }
    return isOutput ? `O${idx}` : `I${idx}`
  }

  // V11: 绘制多位端口组方括号（无文字标签）
  const drawBitWidthBracket = (comp, isOutput, count) => {
    if (count <= 1) return
    const def = COMPONENT_TYPES[comp.type]
    if (!def) return
    if (count < 4) return
    const x = isOutput ? comp.x + comp.width + 14 : comp.x - 14
    const firstPos = isOutput ? getOutputPortPos(comp, 0) : getInputPortPos(comp, 0)
    const lastPos = isOutput ? getOutputPortPos(comp, count - 1) : getInputPortPos(comp, count - 1)
    ctx.strokeStyle = '#888'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    if (isOutput) {
      ctx.moveTo(x, firstPos.y - 4)
      ctx.lineTo(x + 4, firstPos.y - 4)
      ctx.lineTo(x + 4, lastPos.y + 4)
      ctx.lineTo(x, lastPos.y + 4)
    } else {
      ctx.moveTo(x, firstPos.y - 4)
      ctx.lineTo(x - 4, firstPos.y - 4)
      ctx.lineTo(x - 4, lastPos.y + 4)
      ctx.lineTo(x, lastPos.y + 4)
    }
    ctx.stroke()
    // 位宽文字标签 — 已移除（不显示文字/数字）
  }

  // 输入端口
  for (let i = 0; i < comp.inputs.length; i++) {
    const pos = getInputPortPos(comp, i)
    const val = comp.inputs[i].value
    const isHovered = hoveredPort.value &&
                      hoveredPort.value.component === comp &&
                      hoveredPort.value.portIndex === i &&
                      !hoveredPort.value.isOutput
    const connected = isInputConnected(comp.id, i)
    const sz = isHovered ? 10 : 7

    // V27: 已连接高电平端口辉光
    if (connected && val) {
      ctx.shadowBlur = 10
      ctx.shadowColor = WIRE_COLORS.portHigh
    }

    if (isHovered) {
      ctx.fillStyle = '#0078d440'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2)
      ctx.fill()
    }

    // V10: 未连接端口虚线+半透明+问号；已连接实线
    ctx.fillStyle = val ? WIRE_COLORS.portHigh : (connected ? WIRE_COLORS.portLow : WIRE_COLORS.portUnconnected)
    ctx.globalAlpha = connected ? 1.0 : 0.5
    ctx.beginPath()
    ctx.roundRect(pos.x - sz, pos.y - sz, sz * 2, sz * 2, 2)
    ctx.fill()
    ctx.strokeStyle = isHovered ? WIRE_COLORS.portHover : '#888'
    ctx.lineWidth = isHovered ? 3 : 2
    if (!connected) ctx.setLineDash([3, 2])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1.0
    ctx.shadowBlur = 0

    // V26: 输入端口方向凹槽 ◀
    if (showDetails) {
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.moveTo(pos.x - sz - 3, pos.y)
      ctx.lineTo(pos.x - sz, pos.y - 3)
      ctx.lineTo(pos.x - sz, pos.y + 3)
      ctx.closePath()
      ctx.fill()
    }

    // #34: 引脚编号（仅多引脚侧显示）
    if (showDetails && comp.inputs.length > 1) {
      ctx.fillStyle = '#888'
      ctx.font = '8px Consolas, monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i + 1), pos.x + sz + 3, pos.y)
    }

    // #3: 端口悬停时显示标签
    if (isHovered) {
      const label = getPortLabel(comp, i, false)
      ctx.font = '10px Consolas, monospace'
      ctx.fillStyle = '#4a9eff'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, pos.x - 14, pos.y)
    }
  }

  // V11: 输入端口位宽括号
  drawBitWidthBracket(comp, false, comp.inputs.length)

  // 输出端口
  for (let i = 0; i < comp.outputs.length; i++) {
    const pos = getOutputPortPos(comp, i)
    const val = comp.outputs[i].value
    const isHovered = hoveredPort.value &&
                      hoveredPort.value.component === comp &&
                      hoveredPort.value.portIndex === i &&
                      hoveredPort.value.isOutput
    const connected = isOutputConnected(comp.id, i)
    const sz = isHovered ? 9 : 7

    // V27: 已连接高电平端口辉光
    if (connected && val) {
      ctx.shadowBlur = 10
      ctx.shadowColor = WIRE_COLORS.portHigh
    }

    if (isHovered) {
      ctx.fillStyle = '#0078d440'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2)
      ctx.fill()
    }

    // V10: 未连接端口虚线+半透明
    ctx.fillStyle = val ? WIRE_COLORS.portHigh : (connected ? WIRE_COLORS.portLow : WIRE_COLORS.portUnconnected)
    ctx.globalAlpha = connected ? 1.0 : 0.5
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, sz, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = isHovered ? WIRE_COLORS.portHover : '#888'
    ctx.lineWidth = isHovered ? 3 : 2
    if (!connected) ctx.setLineDash([3, 2])
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1.0
    ctx.shadowBlur = 0

    // V26: 输出端口方向箭头 ▶
    if (showDetails) {
      ctx.fillStyle = '#333'
      ctx.beginPath()
      ctx.moveTo(pos.x + sz + 3, pos.y)
      ctx.lineTo(pos.x + sz, pos.y - 3)
      ctx.lineTo(pos.x + sz, pos.y + 3)
      ctx.closePath()
      ctx.fill()
    }

    // #34: 引脚编号（仅多引脚侧显示）
    if (showDetails && comp.outputs.length > 1) {
      ctx.fillStyle = '#888'
      ctx.font = '8px Consolas, monospace'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillText(String(i + 1), pos.x - sz - 3, pos.y)
    }

    // #3: 端口悬停时显示标签
    if (isHovered) {
      const label = getPortLabel(comp, i, true)
      ctx.font = '10px Consolas, monospace'
      ctx.fillStyle = '#4a9eff'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, pos.x + 14, pos.y)
    }
  }

  // V11: 输出端口位宽括号
  drawBitWidthBracket(comp, true, comp.outputs.length)
  
  if (comp.type === 'SWITCH') {
    const cx = comp.x + comp.width / 2
    const cy = comp.y + comp.height / 2
    ctx.fillStyle = comp.state ? '#00ff00' : '#444'
    ctx.beginPath()
    ctx.arc(cx, cy - 5, 14, 0, Math.PI * 2)
    ctx.fill()
  }

  if (comp.type === 'LED') {
    const cx = comp.x + comp.width / 2
    const cy = comp.y + comp.height / 2
    ctx.fillStyle = comp.inputs[0].value ? '#ff0000' : '#440000'
    ctx.beginPath()
    ctx.arc(cx, cy - 5, 16, 0, Math.PI * 2)
    ctx.fill()
    if (comp.inputs[0].value) {
      ctx.fillStyle = '#ff000040'
      ctx.beginPath()
      ctx.arc(cx, cy - 5, 24, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  if (comp.type === 'CLOCK') {
    // #8/#19: 高低电平呼吸脉冲 + 颜色与 def.color 一致
    const cx = comp.x + comp.width / 2
    const cy = comp.y + comp.height / 2
    const high = !!comp.state
    const baseColor = def.color || '#cc6699'
    // 呼吸环（仅高电平时显示脉动）
    if (high) {
      const breathR = 18 + 4 * Math.sin(Date.now() / 350)
      const alpha = 0.25 + 0.15 * Math.sin(Date.now() / 350)
      ctx.strokeStyle = hexToRgba(baseColor, Math.max(0, alpha))
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy - 5, breathR, 0, Math.PI * 2)
      ctx.stroke()
    }
    // 实心指示圆
    ctx.fillStyle = high ? baseColor : '#3a2230'
    ctx.shadowColor = high ? baseColor : 'transparent'
    ctx.shadowBlur = high ? 10 : 0
    ctx.beginPath()
    ctx.arc(cx, cy - 5, 12, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
    // 内部 CLK 字标
    ctx.fillStyle = high ? '#fff' : '#888'
    ctx.font = 'bold 9px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('CLK', cx, cy - 5)
    // 频率
    ctx.fillStyle = '#ccc'
    ctx.font = '9px monospace'
    ctx.fillText(`${comp.frequency || 1}Hz`, cx, cy + 14)
  }

  if (comp.type === 'OSCILLATOR') {
    const cx = comp.x + comp.width / 2
    const cy = comp.y + comp.height / 2
    // 方波图标
    ctx.strokeStyle = comp.state ? '#00ff88' : '#225533'
    ctx.lineWidth = 2
    ctx.beginPath()
    const sw = 8
    ctx.moveTo(cx - sw * 2, cy + 5)
    ctx.lineTo(cx - sw * 2, cy - 5)
    ctx.lineTo(cx - sw, cy - 5)
    ctx.lineTo(cx - sw, cy + 5)
    ctx.lineTo(cx, cy + 5)
    ctx.lineTo(cx, cy - 5)
    ctx.lineTo(cx + sw, cy - 5)
    ctx.lineTo(cx + sw, cy + 5)
    ctx.lineTo(cx + sw * 2, cy + 5)
    ctx.stroke()
    // 中心圆点指示当前状态
    ctx.fillStyle = comp.state ? '#00ff88' : '#225533'
    ctx.beginPath()
    ctx.arc(cx + sw * 2 + 6, cy, 3, 0, Math.PI * 2)
    ctx.fill()
  }
  
  if (comp.type === 'CONST0') {
    ctx.fillStyle = '#666666'
    ctx.font = 'bold 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('0', comp.x + comp.width / 2, comp.y + comp.height / 2)
  }
  
  if (comp.type === 'CONST1') {
    ctx.fillStyle = '#00ff00'
    ctx.font = 'bold 26px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('1', comp.x + comp.width / 2, comp.y + comp.height / 2)
  }
  
  if (comp.type === 'TEXT') {
    ctx.fillStyle = '#ffffff'
    ctx.font = '15px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    
    const text = comp.text || def.text
    const maxCharsPerLine = 30
    const lineHeight = 24
    let y = comp.y + 10
    
    let currentLine = ''
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      if (char === '\n' || currentLine.length >= maxCharsPerLine) {
        if (currentLine.length > 0) {
          ctx.fillText(currentLine, comp.x + 10, y)
          y += lineHeight
        }
        if (char === '\n') {
          currentLine = ''
        } else {
          currentLine = char
        }
      } else {
        currentLine += char
      }
    }
    if (currentLine.length > 0) {
      ctx.fillText(currentLine, comp.x + 10, y)
    }
  }

  if (comp.type === 'SEGDISPLAY8') {
    drawSegDisplay8(ctx, comp)
  }

  if (comp.type === 'SEGDISPLAY1') {
    drawSegDisplay1(ctx, comp)
  }

  if (comp.type === 'DOTMATRIX16') {
    drawDotMatrix16(ctx, comp)
  }

  if (comp.type === 'LCD1602') {
    drawLCD1602(ctx, comp)
  }

  if (comp.type === 'CPU') {
    drawCPU(ctx, comp)
  }

  if (comp.type === 'ROM256') {
    drawROM256(ctx, comp)
  }

  if (comp.type === 'INSTRUCTION_EXECUTOR') {
    drawInstructionExecutor(ctx, comp)
  }

  if (comp.type === 'CLOCKDIVIDER') {
    drawClockDivider(ctx, comp)
  }

  if (comp.type === 'TJUNCTION' || comp.type === 'CROSSJUNCTION') {
    drawJunctionComponent(ctx, comp)
  }

  if (comp.type === 'IO_BRIDGE') {
    drawIOBridge(ctx, comp)
  }

  if (comp.type === 'EXT_RAM') {
    drawExtRam(ctx, comp)
  }

  if (comp.type === 'IO_PORT') {
    drawIoPort(ctx, comp)
  }

  if (comp.type === 'TIMER') {
    drawTimer(ctx, comp)
  }

  if (comp.type === 'GND' || comp.type === 'VCC' || comp.type === 'PULLUP' || comp.type === 'PULLDOWN') {
    drawPowerSource(ctx, comp)
  }

  if (comp.type === 'BUTTON') {
    drawButton(ctx, comp)
  }

  if (comp.type === 'DIPSW4') {
    drawDipSwitch4(ctx, comp)
  }

  if (comp.type === 'BUS4' || comp.type === 'BUS8') {
    drawBusDisplay(ctx, comp)
  }

  if (comp.type === 'BCD7SEG') {
    drawBCD7Seg(ctx, comp)
  }

  if (comp.type === 'SEG7CC' || comp.type === 'SEG7CA') {
    drawSeg7(ctx, comp)
  }

  if (comp.type === 'HEXDISPLAY') {
    drawHexDisplay(ctx, comp)
  }

  if (comp.type === 'ASCII_DISPLAY') {
    drawAsciiDisplay(ctx, comp)
  }

  if (comp.type === 'LED_BAR8') {
    drawLedBar8(ctx, comp)
  }

  if (comp.type === 'SCOPE') {
    drawScope(ctx, comp)
  }

  if (comp.type === 'KEYPAD_4x4') {
    drawKeypad4x4(ctx, comp)
  }

}

const SEGMENTS = {
  0: [1, 1, 1, 1, 1, 1, 0],
  1: [0, 1, 1, 0, 0, 0, 0],
  2: [1, 1, 0, 1, 1, 0, 1],
  3: [1, 1, 1, 1, 0, 0, 1],
  4: [0, 1, 1, 0, 0, 1, 1],
  5: [1, 0, 1, 1, 0, 1, 1],
  6: [1, 0, 1, 1, 1, 1, 1],
  7: [1, 1, 1, 0, 0, 0, 0],
  8: [1, 1, 1, 1, 1, 1, 1],
  9: [1, 1, 1, 1, 0, 1, 1],
  A: [1, 1, 1, 0, 1, 1, 1],
  B: [0, 0, 1, 1, 1, 1, 1],
  C: [1, 0, 0, 1, 1, 1, 0],
  D: [0, 1, 1, 1, 1, 0, 1],
  E: [1, 0, 0, 1, 1, 1, 1],
  F: [1, 0, 0, 0, 1, 1, 1]
}

// #29: 数码管上电过渡 — 跟踪每个数码管组件的值变化时间，用于绘制点亮过渡辉光
const segDisplayState = new Map() // key: `${comp.id}` -> { lastValue, changeTime }

function getSegPowerOnGlow(comp, currentValue) {
  const key = comp.id
  const now = Date.now()
  const state = segDisplayState.get(key)
  if (!state) {
    segDisplayState.set(key, { lastValue: currentValue, changeTime: now })
    return 0
  }
  if (state.lastValue !== currentValue) {
    state.lastValue = currentValue
    state.changeTime = now
  }
  const elapsed = now - state.changeTime
  if (elapsed < 300) {
    // 0..1 衰减
    return 1 - elapsed / 300
  }
  return 0
}

function drawSegDigit(ctx, x, y, segments, dp, color, glowBoost = 0) {
  const segWidth = 18
  const segHeight = 8
  const gap = 3
  const digitWidth = 32
  const digitHeight = 56

  ctx.fillStyle = '#0a0a0a'
  roundRect(ctx, x - 1, y - 1, digitWidth + 2, digitHeight + 2, 4)
  ctx.fill()

  ctx.fillStyle = '#121212'
  roundRect(ctx, x, y, digitWidth, digitHeight, 3)
  ctx.fill()

  const onColor = color
  const offColor = '#222222'

  function drawSeg(sx, sy, w, h, on) {
    const fillColor = on ? onColor : offColor

    if (on) {
      const gradient = ctx.createLinearGradient(sx, sy, sx, sy + h)
      gradient.addColorStop(0, fillColor)
      gradient.addColorStop(0.5, glowBoost > 0 ? '#ffffffcc' : '#ffffff60')
      gradient.addColorStop(1, fillColor)
      ctx.fillStyle = gradient
    } else {
      ctx.fillStyle = fillColor
    }

    ctx.beginPath()
    ctx.moveTo(sx + 3, sy)
    ctx.lineTo(sx + w - 3, sy)
    ctx.lineTo(sx + w, sy + h / 2)
    ctx.lineTo(sx + w - 3, sy + h)
    ctx.lineTo(sx + 3, sy + h)
    ctx.lineTo(sx, sy + h / 2)
    ctx.closePath()
    ctx.fill()

    if (on) {
      ctx.shadowColor = fillColor
      // #29: 上电过渡期间辉光更强
      ctx.shadowBlur = 8 + glowBoost * 14
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  drawSeg(x + 7, y + 2, segWidth, segHeight, segments[0])
  drawSeg(x + digitWidth - segHeight + 1, y + 7, segHeight, segWidth, segments[1])
  drawSeg(x + digitWidth - segHeight + 1, y + digitHeight / 2 + gap / 2, segHeight, segWidth, segments[2])
  drawSeg(x + 7, y + digitHeight - segHeight - 2, segWidth, segHeight, segments[3])
  drawSeg(x - 1, y + digitHeight / 2 + gap / 2, segHeight, segWidth, segments[4])
  drawSeg(x - 1, y + 7, segHeight, segWidth, segments[5])
  drawSeg(x + 7, y + digitHeight / 2 - segHeight / 2, segWidth, segHeight, segments[6])

  if (dp) {
    ctx.fillStyle = onColor
    ctx.shadowColor = onColor
    ctx.shadowBlur = 6 + glowBoost * 10
    ctx.beginPath()
    ctx.arc(x + digitWidth - 5, y + digitHeight - 8, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0
  }
}

function drawSegDisplay8(ctx, comp) {
  const startX = comp.x + 8
  const startY = comp.y + 12
  const digitSpacing = 38

  ctx.fillStyle = '#0f0f0f'
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.fill()

  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.stroke()

  // #29: 计算整体值用于上电过渡检测
  let totalValue = 0
  for (let i = 0; i < 8; i++) {
    let value = 0
    let dp = false

    if (comp.inputs[i * 4] && comp.inputs[i * 4 + 1] && comp.inputs[i * 4 + 2] && comp.inputs[i * 4 + 3]) {
      const b0 = comp.inputs[i * 4].value
      const b1 = comp.inputs[i * 4 + 1].value
      const b2 = comp.inputs[i * 4 + 2].value
      const b3 = comp.inputs[i * 4 + 3].value
      value = b0 + b1 * 2 + b2 * 4 + b3 * 8
    }
    totalValue = totalValue * 16 + value

    let segments
    if (value < 10) {
      segments = SEGMENTS[value] || SEGMENTS[0]
    } else if (value < 16) {
      const hex = 'ABCDEF'[value - 10]
      segments = SEGMENTS[hex] || SEGMENTS[0]
    } else {
      segments = SEGMENTS[0]
    }

    drawSegDigit(ctx, startX + i * digitSpacing, startY, segments, dp, '#ff4500', 0)
  }
  // 整体过渡辉光：值变化时所有数码管轻微闪烁
  const glow = getSegPowerOnGlow(comp, totalValue)
  if (glow > 0) {
    ctx.fillStyle = `rgba(255, 69, 0, ${glow * 0.08})`
    roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
    ctx.fill()
  }
}

function drawSegDisplay1(ctx, comp) {
  const startX = comp.x + 14
  const startY = comp.y + 12

  ctx.fillStyle = '#0f0f0f'
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.fill()

  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.stroke()

  let value = 0
  if (comp.inputs[0] && comp.inputs[1] && comp.inputs[2] && comp.inputs[3]) {
    const b0 = comp.inputs[0].value
    const b1 = comp.inputs[1].value
    const b2 = comp.inputs[2].value
    const b3 = comp.inputs[3].value
    value = b0 + b1 * 2 + b2 * 4 + b3 * 8
  }

  let segments
  if (value < 10) {
    segments = SEGMENTS[value] || SEGMENTS[0]
  } else if (value < 16) {
    const hex = 'ABCDEF'[value - 10]
    segments = SEGMENTS[hex] || SEGMENTS[0]
  } else {
    segments = SEGMENTS[0]
  }

  // #29: 上电过渡辉光
  const glow = getSegPowerOnGlow(comp, value)
  drawSegDigit(ctx, startX, startY, segments, false, '#ff4500', glow)
}

const DOTMATRIX_CHARS = {}

function initDotMatrixChars() {
  // 5x7 font glyphs (5 wide, 7 tall), placed at columns 5-9 in the 16x16 grid.
  // Rows 0-6 hold the character, rows 7-15 are blank.
  const charPatterns = {
    ' ': ['     ', '     ', '     ', '     ', '     ', '     ', '     '],
    '!': ['  X  ', '  X  ', '  X  ', '  X  ', '  X  ', '     ', '  X  '],
    '?': [' XXX ', 'X   X', '    X', '   X ', '  X  ', '     ', '  X  '],
    '-': ['     ', '     ', '     ', 'XXXXX', '     ', '     ', '     '],
    '+': ['     ', '  X  ', '  X  ', 'XXXXX', '  X  ', '  X  ', '     '],
    '=': ['     ', '     ', 'XXXXX', '     ', '     ', 'XXXXX', '     '],
    '*': ['     ', ' X X ', '  X  ', 'XXXXX', '  X  ', ' X X ', '     '],
    '.': ['     ', '     ', '     ', '     ', '     ', '     ', '  X  '],
    ':': ['     ', '     ', '  X  ', '     ', '     ', '  X  ', '     '],
    '(': ['   X ', '  X  ', '  X  ', '  X  ', '  X  ', '  X  ', '   X '],
    ')': [' X   ', '  X  ', '  X  ', '  X  ', '  X  ', '  X  ', ' X   '],
    '0': [' XXX ', 'X   X', 'X  XX', 'X X X', 'XX  X', 'X   X', ' XXX '],
    '1': ['  X  ', ' XX  ', '  X  ', '  X  ', '  X  ', '  X  ', ' XXX '],
    '2': [' XXX ', 'X   X', '    X', '   X ', '  X  ', ' X   ', 'XXXXX'],
    '3': [' XXX ', 'X   X', '    X', '  XX ', '    X', 'X   X', ' XXX '],
    '4': ['   X ', '  XX ', ' X X ', 'X  X ', 'XXXXX', '   X ', '   X '],
    '5': ['XXXXX', 'X    ', 'XXXX ', '    X', '    X', 'X   X', ' XXX '],
    '6': [' XXX ', 'X   X', 'X    ', 'XXXX ', 'X   X', 'X   X', ' XXX '],
    '7': ['XXXXX', '    X', '   X ', '  X  ', ' X   ', ' X   ', ' X   '],
    '8': [' XXX ', 'X   X', 'X   X', ' XXX ', 'X   X', 'X   X', ' XXX '],
    '9': [' XXX ', 'X   X', 'X   X', ' XXXX', '    X', 'X   X', ' XXX '],
    'A': [' XXX ', 'X   X', 'X   X', 'XXXXX', 'X   X', 'X   X', 'X   X'],
    'B': ['XXXX ', 'X   X', 'X   X', 'XXXX ', 'X   X', 'X   X', 'XXXX '],
    'C': [' XXX ', 'X   X', 'X    ', 'X    ', 'X    ', 'X   X', ' XXX '],
    'D': ['XXXX ', 'X   X', 'X   X', 'X   X', 'X   X', 'X   X', 'XXXX '],
    'E': ['XXXXX', 'X    ', 'X    ', 'XXXX ', 'X    ', 'X    ', 'XXXXX'],
    'F': ['XXXXX', 'X    ', 'X    ', 'XXXX ', 'X    ', 'X    ', 'X    '],
    'G': [' XXX ', 'X   X', 'X    ', 'X  XX', 'X   X', 'X   X', ' XXX '],
    'H': ['X   X', 'X   X', 'X   X', 'XXXXX', 'X   X', 'X   X', 'X   X'],
    'I': [' XXX ', '  X  ', '  X  ', '  X  ', '  X  ', '  X  ', ' XXX '],
    'J': ['  XXX', '    X', '    X', '    X', '    X', 'X   X', ' XXX '],
    'K': ['X   X', 'X  X ', 'X X  ', 'XX   ', 'X X  ', 'X  X ', 'X   X'],
    'L': ['X    ', 'X    ', 'X    ', 'X    ', 'X    ', 'X    ', 'XXXXX'],
    'M': ['X   X', 'XX XX', 'X X X', 'X   X', 'X   X', 'X   X', 'X   X'],
    'N': ['X   X', 'X   X', 'XX  X', 'X X X', 'X  XX', 'X   X', 'X   X'],
    'O': [' XXX ', 'X   X', 'X   X', 'X   X', 'X   X', 'X   X', ' XXX '],
    'P': ['XXXX ', 'X   X', 'X   X', 'XXXX ', 'X    ', 'X    ', 'X    '],
    'Q': [' XXX ', 'X   X', 'X   X', 'X   X', 'X X X', 'X  X ', ' XX X'],
    'R': ['XXXX ', 'X   X', 'X   X', 'XXXX ', 'X X  ', 'X  X ', 'X   X'],
    'S': [' XXXX', 'X    ', 'X    ', ' XXX ', '    X', '    X', 'XXXX '],
    'T': ['XXXXX', '  X  ', '  X  ', '  X  ', '  X  ', '  X  ', '  X  '],
    'U': ['X   X', 'X   X', 'X   X', 'X   X', 'X   X', 'X   X', ' XXX '],
    'V': ['X   X', 'X   X', 'X   X', 'X   X', 'X   X', ' X X ', '  X  '],
    'W': ['X   X', 'X   X', 'X   X', 'X   X', 'X X X', 'XX XX', 'X   X'],
    'X': ['X   X', 'X   X', ' X X ', '  X  ', ' X X ', 'X   X', 'X   X'],
    'Y': ['X   X', 'X   X', ' X X ', '  X  ', '  X  ', '  X  ', '  X  '],
    'Z': ['XXXXX', '    X', '   X ', '  X  ', ' X   ', 'X    ', 'XXXXX'],
  }

  for (const [ch, glyph] of Object.entries(charPatterns)) {
    const rows = new Array(16).fill(0)
    for (let r = 0; r < Math.min(glyph.length, 16); r++) {
      let rowVal = 0
      const g = glyph[r]
      for (let c = 0; c < 5; c++) {
        if (g[c] === 'X') {
          // Glyph occupies columns 5-9 in the 16-wide grid
          rowVal |= (1 << (15 - (5 + c)))
        }
      }
      rows[r] = rowVal
    }
    DOTMATRIX_CHARS[ch] = rows
  }
}

initDotMatrixChars()

function getDotMatrixCharROM() {
  // All characters in ASCII order; ROM includes all entries.
  // 4-bit addressing (0-15) accesses the first 16 slots.
  const charOrder = [
    ' ', '!', '(', ')', '*', '+', '-', '.', '0', '1',
    '2', '3', '4', '5', '6', '7', '8', '9', ':', '=',
    '?', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I',
    'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S',
    'T', 'U', 'V', 'W', 'X', 'Y', 'Z'
  ]
  const rom = []
  for (let i = 0; i < charOrder.length; i++) {
    rom.push(DOTMATRIX_CHARS[charOrder[i]] || new Array(16).fill(0))
  }
  return rom
}

function drawDotMatrix16(ctx, comp) {
  const padding = 8
  const gridX = comp.x + padding
  const gridY = comp.y + padding
  const gridW = comp.width - padding * 2
  const gridH = comp.height - padding * 2 - 20
  const cellW = gridW / 16
  const cellH = gridH / 16

  ctx.fillStyle = '#0a0a0a'
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.fill()

  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.stroke()

  let address = 0
  if (comp.inputs[0] && comp.inputs[1] && comp.inputs[2] && comp.inputs[3]) {
    address = (comp.inputs[0].value || 0) +
              ((comp.inputs[1].value || 0) << 1) +
              ((comp.inputs[2].value || 0) << 2) +
              ((comp.inputs[3].value || 0) << 3)
  }

  const rom = comp.charROM || getDotMatrixCharROM()
  const charData = rom[address] || new Array(16).fill(0)

  for (let r = 0; r < 16; r++) {
    for (let c = 0; c < 16; c++) {
      const bitOn = (charData[r] >> (15 - c)) & 1
      const cx = gridX + c * cellW
      const cy = gridY + r * cellH

      if (bitOn) {
        ctx.fillStyle = '#00ff88'
        ctx.shadowColor = '#00ff88'
        ctx.shadowBlur = 4
        roundRect(ctx, cx + 1, cy + 1, cellW - 2, cellH - 2, 2)
        ctx.fill()
        ctx.shadowBlur = 0
      } else {
        ctx.fillStyle = '#1a1a1a'
        roundRect(ctx, cx + 1, cy + 1, cellW - 2, cellH - 2, 1)
        ctx.fill()
      }
    }
  }

  ctx.fillStyle = '#666'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.fillText(`ADDR:${address}`, comp.x + comp.width / 2, comp.y + comp.height - 6)
  ctx.textAlign = 'left'
}

function drawLCD1602(ctx, comp) {
  const lcdWidth = 300
  const lcdHeight = 70
  const x = comp.x + 10
  const y = comp.y + 15

  ctx.fillStyle = '#1a1a1a'
  roundRect(ctx, x - 4, y - 4, lcdWidth + 8, lcdHeight + 8, 10)
  ctx.fill()
  
  ctx.strokeStyle = '#444444'
  ctx.lineWidth = 3
  roundRect(ctx, x - 4, y - 4, lcdWidth + 8, lcdHeight + 8, 10)
  ctx.stroke()

  const screenGradient = ctx.createLinearGradient(x, y, x, y + lcdHeight)
  screenGradient.addColorStop(0, '#002200')
  screenGradient.addColorStop(1, '#001500')
  ctx.fillStyle = screenGradient
  roundRect(ctx, x, y, lcdWidth, lcdHeight, 6)
  ctx.fill()

  ctx.fillStyle = '#00330030'
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 16; col++) {
      roundRect(ctx, x + 10 + col * 18, y + 12 + row * 30, 12, 22, 2)
      ctx.fill()
    }
  }

  ctx.fillStyle = '#00cc00'
  ctx.font = 'bold 18px "Courier New", monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'

  if (comp.lcdBuffer) {
    for (let row = 0; row < 2; row++) {
      const line = comp.lcdBuffer[row] || '                '
      for (let col = 0; col < 16 && col < line.length; col++) {
        const char = line[col] || ' '
        if (char !== ' ') {
          ctx.shadowColor = '#00ff00'
          ctx.shadowBlur = 4
          ctx.fillText(char, x + 11 + col * 18, y + 14 + row * 30)
          ctx.shadowBlur = 0
        }
      }
    }
  }

  processLCDInput(comp)
}

function processLCDInput(comp) {
  if (!comp.inputs || comp.inputs.length < 10) return

  const rs = comp.inputs[0]?.value || 0
  const e = comp.inputs[1]?.value || 0

  if (e === 1 && comp.lcdLastE === 0) {
    let data = 0
    for (let i = 0; i < 8; i++) {
      data = (data << 1) | (comp.inputs[2 + i]?.value || 0)
    }

    if (rs === 0) {
      if (data === 0x01) {
        comp.lcdBuffer = ['                ', '                ']
        comp.lcdCursor = { x: 0, y: 0 }
      } else if (data === 0x02) {
        comp.lcdCursor = { x: 0, y: 0 }
      }
    } else {
      if (comp.lcdCursor && comp.lcdBuffer) {
        const row = comp.lcdCursor.y
        const col = comp.lcdCursor.x
        if (row >= 0 && row < 2 && col >= 0 && col < 16) {
          const char = String.fromCharCode(data >= 32 && data <= 126 ? data : 32)
          comp.lcdBuffer[row] = comp.lcdBuffer[row].substring(0, col) + char + comp.lcdBuffer[row].substring(col + 1)
        }
        comp.lcdCursor.x++
        if (comp.lcdCursor.x >= 16) {
          comp.lcdCursor.x = 0
          comp.lcdCursor.y = 1 - comp.lcdCursor.y
        }
      }
    }
  }
  comp.lcdLastE = e
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

// #8/#19: 将 #RRGGBB 转为 rgba() 字符串
function hexToRgba(hex, alpha) {
  if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${alpha})`
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const r = parseInt(h.slice(0, 2), 16) || 0
  const g = parseInt(h.slice(2, 4), 16) || 0
  const b = parseInt(h.slice(4, 6), 16) || 0
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function decodeAsmShort(instruction) {
  if (!instruction || instruction === 0) return 'NOP'
  try {
    const opcode = (instruction >> 12) & 0xF
    const regA = (instruction >> 8) & 0xF
    const regB = (instruction >> 4) & 0xF
    const imm = instruction & 0xF
    const addr8 = instruction & 0xFF
    const r = ['R0', 'R1', 'R2', 'R3']
    switch (opcode) {
      case 0x0: return `LD ${r[regA]},[${addr8.toString(16).toUpperCase()}]`
      case 0x1: return `ST ${r[regA]},[${addr8.toString(16).toUpperCase()}]`
      case 0x2: return `ADD ${r[regA]},${r[regB]}`
      case 0x3: return `SUB ${r[regA]},${r[regB]}`
      case 0x4: return `AND ${r[regA]},${r[regB]}`
      case 0x5: return `OR ${r[regA]},${r[regB]}`
      case 0x6: return `NOT ${r[regA]}`
      case 0x7: return `JMP ${addr8.toString(16).toUpperCase()}`
      case 0x8: return `JZ ${r[regA]},${addr8.toString(16).toUpperCase()}`
      case 0x9: return `JNZ ${r[regA]},${addr8.toString(16).toUpperCase()}`
      case 0xA: return `MOV ${r[regA]},${r[regB]}`
      case 0xB: return `LDI ${r[regA]},${imm.toString(16).toUpperCase()}`
      case 0xC: return `SHL ${r[regA]}`
      case 0xD: return `SHR ${r[regA]}`
      case 0xE: return `CMP ${r[regA]},${r[regB]}`
      case 0xF: return 'HALT'
      default: return '???'
    }
  } catch {
    return '???'
  }
}

function drawCPU(ctx, comp) {
  const isSelected = props.circuit.selection.components.includes(comp)
  const w = comp.width
  const h = comp.height
  const x = comp.x
  const y = comp.y

  ctx.fillStyle = '#1a1a3a'
  ctx.strokeStyle = isSelected ? '#0078d4' : '#6644cc'
  ctx.lineWidth = isSelected ? 4 : 2
  roundRect(ctx, x, y, w, h, 10)
  ctx.fill()
  ctx.stroke()

  if (comp.state && comp.state.running) {
    ctx.fillStyle = '#00ff0010'
    roundRect(ctx, x, y, w, h, 10)
    ctx.fill()
  } else if (comp.state && comp.state.flags?.HALT) {
    ctx.fillStyle = '#ff000010'
    roundRect(ctx, x, y, w, h, 10)
    ctx.fill()
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CPU', x + w / 2, y + 12)

  const spacing = h / 10
  const inputYPositions = [2, 4, 6]
  const inputLabels = ['C', 'R', 'U']
  ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  inputLabels.forEach((label, idx) => {
    const ly = y + spacing * inputYPositions[idx]
    ctx.fillStyle = '#aaccff'
    ctx.fillText(label, x + 8, ly)
  })

  const outputYPositions = [2, 3, 7, 8]
  const outputLabels = ['Z', 'C', 'H', 'R']
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  outputLabels.forEach((label, idx) => {
    const ly = y + spacing * outputYPositions[idx]
    ctx.fillStyle = '#ffccaa'
    ctx.fillText(label, x + w - 8, ly)
  })

  if (comp.state && comp.state.flags) {
    const f = comp.state.flags
    ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    const flagVals = [f.ZERO, f.CARRY, f.HALT, comp.state.running]
    const flagColors = ['#00ff00', '#00ff00', '#ff4444', '#00ff00']
    const offColors = ['#333', '#333', '#333', '#333']
    outputYPositions.forEach((yp, idx) => {
      ctx.fillStyle = flagVals[idx] ? flagColors[idx] : offColors[idx]
      ctx.fillText(flagVals[idx] ? '1' : '0', x + w - 20, y + spacing * yp)
    })
  }

  if (comp.state && comp.state.registers) {
    const regs = comp.state.registers
    const regNames = ['R0', 'R1', 'R2', 'R3']
    const regStartY = y + spacing * 3.2
    const regSpacing = 16

    regNames.forEach((name, idx) => {
      const ry = regStartY + idx * regSpacing
      const value = regs[name] || 0

      ctx.fillStyle = '#00ffff'
      ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(name, x + 25, ry)

      ctx.fillStyle = '#00ff00'
      ctx.textAlign = 'right'
      ctx.fillText(value.toString(16).toUpperCase().padStart(2, '0'), x + w / 2 + 12, ry)
    })
  }

  if (comp.state && comp.state.ir) {
    ctx.fillStyle = '#aaa'
    ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const asmText = decodeAsmShort(comp.state.ir)
    ctx.fillText(asmText, x + w / 2, y + h - 22)
  }

  if (comp.state && comp.state.pc !== undefined) {
    ctx.fillStyle = '#ffaa00'
    ctx.font = 'bold 8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('PC=' + (comp.state.pc || 0).toString(16).toUpperCase().padStart(2, '0'), x + w / 2, y + h - 10)
  }

  if (comp.state) {
    if (comp.state.running) {
      ctx.fillStyle = '#00ff00'
    } else if (comp.state.flags?.HALT) {
      ctx.fillStyle = '#ff4444'
    } else {
      ctx.fillStyle = '#555'
    }
    ctx.beginPath()
    ctx.arc(x + w - 12, y + 12, 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

function drawROM256(ctx, comp) {
  const def = COMPONENT_TYPES[comp.type]
  const isSelected = props.circuit.selection.components.includes(comp)
  
  ctx.fillStyle = '#1a2a1a'
  ctx.strokeStyle = isSelected ? '#0078d4' : '#44aa44'
  ctx.lineWidth = isSelected ? 4 : 2
  roundRect(ctx, comp.x, comp.y, comp.width, comp.height, 10)
  ctx.fill()
  ctx.stroke()

  // ROM标签
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 14px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ROM 256', comp.x + comp.width / 2, comp.y + 20)

  // 地址输入标签
  ctx.fillStyle = '#888'
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('ADDR[7:0]', comp.x + 5, comp.y + comp.height / 2 - 10)

  // 数据输出标签
  ctx.textAlign = 'right'
  ctx.fillText('DATA[15:0]', comp.x + comp.width - 5, comp.y + comp.height / 2 - 10)

  // 容量信息
  ctx.fillStyle = '#666'
  ctx.font = '9px monospace'
  ctx.textAlign = 'center'
  ctx.fillText('256×16bit', comp.x + comp.width / 2, comp.y + comp.height - 12)
}

function drawClockDivider(ctx, comp) {
  const def = COMPONENT_TYPES[comp.type]
  const isSelected = props.circuit.selection.components.includes(comp)
  const divideBy = comp.divideBy || 2
  const outputState = comp.state?.output || 0

  ctx.fillStyle = '#2a1a2a'
  ctx.strokeStyle = isSelected ? '#0078d4' : '#aa44aa'
  ctx.lineWidth = isSelected ? 4 : 2
  roundRect(ctx, comp.x, comp.y, comp.width, comp.height, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#fff'
  ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('÷' + divideBy, comp.x + comp.width / 2, comp.y + comp.height / 2)

  ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#aaa'
  ctx.textAlign = 'left'
  ctx.fillText('CLK', comp.x + 6, comp.y + comp.height / 3)
  ctx.fillText('RST', comp.x + 6, comp.y + comp.height * 2 / 3)

  ctx.textAlign = 'right'
  ctx.fillText('Q', comp.x + comp.width - 6, comp.y + comp.height / 2)

  ctx.fillStyle = outputState ? '#00ff00' : '#555'
  ctx.beginPath()
  ctx.arc(comp.x + comp.width - 10, comp.y + 10, 4, 0, Math.PI * 2)
  ctx.fill()
}

// 在元件下方绘制波形历史条（CLOCK / OSCILLATOR）
function drawWaveformHistory(ctx, comp) {
  const wfW = comp.width
  const wfH = 20
  const wfX = comp.x
  const wfY = comp.y + comp.height + 2

  ctx.save()
  // 背景
  ctx.fillStyle = '#000000'
  roundRect(ctx, wfX, wfY, wfW, wfH, 3)
  ctx.fill()
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 1
  roundRect(ctx, wfX, wfY, wfW, wfH, 3)
  ctx.stroke()

  // 中线
  const midY = wfY + wfH / 2
  ctx.strokeStyle = '#1a3a1a'
  ctx.beginPath()
  ctx.moveTo(wfX, midY)
  ctx.lineTo(wfX + wfW, midY)
  ctx.stroke()

  // 用 comp.waveformHistory（64个采样点）绘制绿色折线
  const history = comp.waveformHistory || []
  if (history.length > 1) {
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const sampleCount = Math.min(history.length, 64)
    const pad = 2
    for (let i = 0; i < sampleCount; i++) {
      const x = wfX + pad + (i / 63) * (wfW - pad * 2)
      const val = history[history.length - sampleCount + i]
      // 高电平在上，低电平在下
      const y = val ? wfY + 4 : wfY + wfH - 4
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.restore()
}

// 时序元件状态可视化：在组件右上角显示当前 state
function drawSequentialState(ctx, comp) {
  // CLOCK 和 OSCILLATOR：在元件下方绘制波形历史条
  if (comp.type === 'CLOCK' || comp.type === 'OSCILLATOR') {
    drawWaveformHistory(ctx, comp)
  }
  // P3-18: CLOCKDIVIDER 也绘制波形历史条
  if (comp.type === 'CLOCKDIVIDER') {
    drawWaveformHistory(ctx, comp)
  }

  const seqTypes = ['DFF', 'DLATCH', 'JKFF', 'TFF', 'SRFF', 'COUNTER4', 'RING4', 'REG4',
    'RAM164', 'ROM164', 'COUNTER8', 'REG8', 'SHIFT_REG8', 'LATCH_8', 'SCHMITT',
    'SRAM32K', 'EXT_RAM', 'UART', 'PWM_GENERATOR']
  if (!seqTypes.includes(comp.type)) return

  let stateText = ''
  try {
    if (comp.type === 'DFF' || comp.type === 'DLATCH' || comp.type === 'JKFF' ||
        comp.type === 'TFF' || comp.type === 'SRFF' || comp.type === 'SCHMITT') {
      stateText = `Q=${comp.state ?? 0}`
    } else if (comp.type === 'COUNTER4' || comp.type === 'RING4' || comp.type === 'REG4') {
      const v = typeof comp.state === 'number' ? comp.state : 0
      stateText = `0x${v.toString(16).toUpperCase().padStart(2, '0')}`
    } else if (comp.type === 'COUNTER8' || comp.type === 'REG8' || comp.type === 'SHIFT_REG8' || comp.type === 'LATCH_8') {
      const v = typeof comp.state === 'number' ? comp.state : 0
      stateText = `0x${v.toString(16).toUpperCase().padStart(2, '0')}`
    } else if (comp.type === 'RAM164' || comp.type === 'ROM164') {
      if (Array.isArray(comp.state)) {
        const preview = comp.state.slice(0, 4).map(v => v.toString(16).toUpperCase()).join(' ')
        stateText = `[${preview}...]`
      }
    } else if (comp.type === 'SRAM32K' || comp.type === 'EXT_RAM') {
      const mem = comp.state?.memory
      if (Array.isArray(mem)) stateText = `[${mem.length}B]`
    } else if (comp.type === 'UART') {
      stateText = `TX:${comp.state?.txBuffer?.length || 0} RX:${comp.state?.rxBuffer?.length || 0}`
    } else if (comp.type === 'PWM_GENERATOR') {
      stateText = `D:${comp.state?.output ?? 0}`
    }
  } catch (e) {
    stateText = ''
  }

  if (!stateText) return

  ctx.save()
  // 在组件右上角画一个小的状态标签
  ctx.font = '9px Consolas, "Courier New", monospace'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  const padding = 4
  const metrics = ctx.measureText(stateText)
  const labelW = metrics.width + padding * 2
  const labelH = 12
  const lx = comp.x + comp.width - labelW - 2
  const ly = comp.y + 2

  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)'
  roundRect(ctx, lx, ly, labelW, labelH, 3)
  ctx.fill()

  ctx.fillStyle = '#00ff88'
  ctx.fillText(stateText, lx + labelW - padding, ly + 1)
  ctx.restore()
}

function drawJunctionComponent(ctx, comp) {
  const isT = comp.type === 'TJUNCTION'
  const isSelected = props.circuit.selection.components.includes(comp)
  
  // 节点背景
  ctx.fillStyle = '#1a1a1a'
  ctx.strokeStyle = isSelected ? '#0078d4' : '#666'
  ctx.lineWidth = isSelected ? 3 : 2
  roundRect(ctx, comp.x, comp.y, comp.width, comp.height, 6)
  ctx.fill()
  ctx.stroke()

  // 节点图标
  const cx = comp.x + comp.width / 2
  const cy = comp.y + comp.height / 2
  
  ctx.fillStyle = isT ? '#ffaa00' : '#00aaff'
  ctx.beginPath()
  ctx.arc(cx, cy, 8, 0, Math.PI * 2)
  ctx.fill()

  // 节点类型标签
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 9px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(isT ? 'T' : 'X', cx, cy)
}

// === I/O 桥接组件渲染 ===
function drawIOBridge(ctx, comp) {
  const w = comp.width
  const h = comp.height
  const x = comp.x
  const y = comp.y
  const cx = x + w / 2
  const isSelected = props.circuit.selection.components.includes(comp)

  ctx.fillStyle = '#2a1a0a'
  ctx.strokeStyle = isSelected ? '#0078d4' : '#e67e22'
  ctx.lineWidth = isSelected ? 4 : 2
  roundRect(ctx, x, y, w, h, 10)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('IOBRIDGE', cx, y + 12)

  const spacing = h / 8
  const inputYPositions = [3, 6]
  const inputLabels = ['CLK', 'EN']
  ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  inputLabels.forEach((label, idx) => {
    const ly = y + spacing * inputYPositions[idx]
    ctx.fillStyle = '#aaccff'
    ctx.fillText(label, x + 8, ly)
  })

  const outputYPositions = [1, 3, 4, 5, 7]
  const outputLabels = ['ACT', 'D0', 'D1', 'D2', 'D3']
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  outputLabels.forEach((label, idx) => {
    const ly = y + spacing * outputYPositions[idx]
    ctx.fillStyle = '#ffccaa'
    ctx.fillText(label, x + w - 8, ly)
  })

  if (comp.state) {
    ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

    const cnt = comp.state.transferCount || 0
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffaa00'
    ctx.fillText(`计数: ${cnt}`, cx, y + spacing * 2)

    const actPorts = comp.state.activePorts || []
    ctx.fillStyle = '#aaa'
    ctx.font = '7px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textBaseline = 'middle'
    if (actPorts.length > 0) {
      const portStr = actPorts.slice(0, 3).join(', ') + (actPorts.length > 3 ? '...' : '')
      ctx.fillText(portStr, cx, y + spacing * 2.5)
    }

    const lastData = comp.state.lastData || {}
    const dataKeys = Object.keys(lastData).slice(0, 3)
    let yy = y + spacing * 2.8
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.font = '7px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    dataKeys.forEach((key) => {
      const val = lastData[key]
      ctx.fillStyle = '#88ffff'
      ctx.fillText(`0x${parseInt(key).toString(16).toUpperCase().padStart(2, '0')}`, x + 8, yy)
      ctx.fillStyle = '#00ff00'
      ctx.fillText(`=0x${(val || 0).toString(16).toUpperCase().padStart(2, '0')}`, x + 52, yy)
      yy += 14
    })
  }
}

function drawExtRam(ctx, comp) {
  const cx = comp.x + comp.width / 2

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('RAM', cx, comp.y + 12)

  ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#aaccff'
  ctx.textAlign = 'left'

  const spacing = comp.height / 11
  for (let i = 0; i < 8; i++) {
    const y = comp.y + spacing * (i + 1)
    ctx.fillText(`A${i}`, comp.x + 8, y)
  }

  ctx.fillText('WE', comp.x + 8, comp.y + spacing * 9)
  ctx.fillText('CLK', comp.x + 8, comp.y + spacing * 10)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#ffccaa'
  for (let i = 0; i < 8; i++) {
    const y = comp.y + spacing * (i + 1)
    ctx.fillText(`D${i}`, comp.x + comp.width - 8, y)
  }

  // 内部寄存器可视化：ADDR / DATA / CTRL 和前8个内存单元
  ctx.fillStyle = '#999'
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  let ry = comp.y + comp.height + 4
  const s = comp.state || {}
  const addr = s.address || s.addr || 0
  const data = s.dataOut || s.data || 0
  const ctrl = s.control || s.ctrl || 0
  ctx.fillText(`ADDR:0x${addr.toString(16).toUpperCase().padStart(2, '0')} DATA:0x${data.toString(16).toUpperCase().padStart(2, '0')} CTRL:0x${ctrl.toString(16).toUpperCase().padStart(2, '0')}`, comp.x, ry)
  ry += 12
  if (Array.isArray(s.memory)) {
    const preview = s.memory.slice(0, 8).map(v => (v || 0).toString(16).toUpperCase().padStart(2, '0')).join(' ')
    ctx.fillText(`MEM:[${preview}]`, comp.x, ry)
  }
}

function drawIoPort(ctx, comp) {
  const cx = comp.x + comp.width / 2

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('I/O', cx, comp.y + 12)

  ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#aaffcc'
  const spacing = comp.height / 9
  for (let i = 0; i < 8; i++) {
    const y = comp.y + spacing * (i + 1)
    ctx.fillText(`D${i}`, comp.x + 8, y)
  }

  ctx.textAlign = 'right'
  ctx.fillStyle = '#ffccaa'
  for (let i = 0; i < 8; i++) {
    const y = comp.y + spacing * (i + 1)
    ctx.fillText(`Q${i}`, comp.x + comp.width - 8, y)
  }

  // 内部寄存器可视化：OUT / IN
  const s = comp.state || {}
  const outVal = s.output || s.out || 0
  const inVal = s.input || s.in || 0
  ctx.fillStyle = '#999'
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(`OUT:0x${outVal.toString(16).toUpperCase().padStart(2, '0')} IN:0x${inVal.toString(16).toUpperCase().padStart(2, '0')}`, comp.x, comp.y + comp.height + 4)
}

function drawTimer(ctx, comp) {
  const cx = comp.x + comp.width / 2
  const cy = comp.y + comp.height / 2

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('TIMER', cx, cy)

  ctx.font = '9px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#aaa'
  ctx.textAlign = 'left'
  ctx.fillText('CLK', comp.x + 10, cy)
  ctx.textAlign = 'right'
  ctx.fillText('INT', comp.x + comp.width - 10, cy)

  // 内部寄存器可视化：CNT / PRE / CTRL / RUN / INT
  const s = comp.state || {}
  const cnt = s.counter || s.cnt || 0
  const pre = s.prescaler || s.pre || 0
  const ctrl = s.control || s.ctrl || 0
  const run = s.running !== undefined ? (s.running ? 1 : 0) : 0
  const intr = s.interrupt !== undefined ? (s.interrupt ? 1 : 0) : (s.intFlag ? 1 : 0)
  ctx.fillStyle = '#999'
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(`CNT:${cnt} PRE:${pre} CTRL:0x${ctrl.toString(16).toUpperCase()} RUN:${run} INT:${intr}`, comp.x, comp.y + comp.height + 4)
}

// ==================== 新增元件绘制函数 ====================

function drawPowerSource(ctx, comp) {
  const cx = comp.x + comp.width / 2
  const cy = comp.y + comp.height / 2
  const def = COMPONENT_TYPES[comp.type]

  // 圆形主体
  ctx.fillStyle = def.color
  ctx.beginPath()
  ctx.arc(cx, cy, 14, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#000'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 内部符号
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 12px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (comp.type === 'GND' || comp.type === 'PULLDOWN') {
    // 接地横线符号
    ctx.fillText(comp.type === 'GND' ? '⏚' : 'PD', cx, cy)
  } else {
    ctx.fillText(comp.type === 'VCC' ? '+5' : 'PU', cx, cy)
  }

  // 状态值显示
  ctx.fillStyle = comp.outputs[0] && comp.outputs[0].value ? '#0f0' : '#666'
  ctx.font = '10px monospace'
  ctx.fillText(comp.outputs[0] ? comp.outputs[0].value : '?', cx, comp.y + comp.height - 4)
}

function drawButton(ctx, comp) {
  const cx = comp.x + comp.width / 2
  const cy = comp.y + comp.height / 2
  const pressed = !!comp.state

  // 按钮底座
  ctx.fillStyle = '#2a2a2a'
  roundRect(ctx, comp.x + 8, comp.y + 8, comp.width - 16, comp.height - 16, 6)
  ctx.fill()

  // 按钮帽
  ctx.fillStyle = pressed ? '#ffaa00' : '#555'
  ctx.beginPath()
  ctx.arc(cx, cy, pressed ? 14 : 12, 0, Math.PI * 2)
  ctx.fill()

  if (pressed) {
    ctx.strokeStyle = '#fff6'
    ctx.lineWidth = 2
    ctx.stroke()
    // 高光
    ctx.fillStyle = '#fff4'
    ctx.beginPath()
    ctx.arc(cx - 3, cy - 3, 5, 0, Math.PI * 2)
    ctx.fill()
  }

  // 标签
  ctx.fillStyle = '#fff'
  ctx.font = '9px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('BTN', cx, comp.y + comp.height - 6)
}

function drawDipSwitch4(ctx, comp) {
  const pad = 12
  const swH = (comp.height - pad * 2) / 4
  if (!comp.state || !Array.isArray(comp.state)) comp.state = [0, 0, 0, 0]

  for (let i = 0; i < 4; i++) {
    const sy = comp.y + pad + i * swH
    const on = !!comp.state[i]
    // 滑槽
    ctx.fillStyle = '#1a1a1a'
    roundRect(ctx, comp.x + 30, sy + 4, comp.width - 50, swH - 8, 4)
    ctx.fill()
    // 滑块
    ctx.fillStyle = on ? '#4a9eff' : '#666'
    if (on) {
      roundRect(ctx, comp.x + comp.width - 28, sy + 6, 16, swH - 12, 3)
    } else {
      roundRect(ctx, comp.x + 32, sy + 6, 16, swH - 12, 3)
    }
    ctx.fill()
    // 序号
    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(i + 1), comp.x + 26, sy + swH / 2)
  }

  // 标签
  ctx.fillStyle = '#fff'
  ctx.font = '9px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'top'
  ctx.fillText('DIP4', comp.x + comp.width - 6, comp.y + 2)
}

function drawBusDisplay(ctx, comp) {
  const def = COMPONENT_TYPES[comp.type]
  const w = def.busWidth
  let value = 0
  for (let i = 0; i < w; i++) {
    if (comp.inputs[i] && comp.inputs[i].value) value |= (1 << i)
  }

  const cx = comp.x + comp.width / 2
  const cy = comp.y + comp.height / 2

  // 显示框
  ctx.fillStyle = '#0a0a1a'
  roundRect(ctx, comp.x + 6, comp.y + 8, comp.width - 12, comp.height - 16, 4)
  ctx.fill()
  ctx.strokeStyle = '#00ccff'
  ctx.lineWidth = 1
  roundRect(ctx, comp.x + 6, comp.y + 8, comp.width - 12, comp.height - 16, 4)
  ctx.stroke()

  // 数值显示
  const hex = value.toString(16).toUpperCase().padStart(Math.ceil(w / 4), '0')
  const bin = value.toString(2).padStart(w, '0')
  ctx.fillStyle = '#00ccff'
  ctx.font = 'bold 18px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = '#00ccff'
  ctx.shadowBlur = 6
  ctx.fillText('0x' + hex, cx, cy - 6)
  ctx.shadowBlur = 0

  ctx.fillStyle = '#888'
  ctx.font = '10px monospace'
  ctx.fillText(bin, cx, cy + 10)

  // 标签
  ctx.fillStyle = '#fff'
  ctx.font = '9px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(def.label, comp.x + 8, comp.y + 2)
}

function drawBCD7Seg(ctx, comp) {
  // 4输入在左侧，7输出在右侧 - 由getInputPortPos/getOutputPortPos处理
  const cx = comp.x + comp.width / 2
  const cy = comp.y + comp.height / 2

  ctx.fillStyle = '#fff'
  ctx.font = 'bold 11px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('BCD', cx, cy - 8)
  ctx.fillText('7SEG', cx, cy + 8)

  // 输入位标记
  ctx.fillStyle = '#888'
  ctx.font = '10px monospace'
  ctx.textAlign = 'right'
  for (let i = 0; i < 4; i++) {
    const y = comp.y + (comp.height / 5) * (i + 1)
    ctx.fillText('D' + i, comp.x + 16, y)
  }
  // 输出段标记
  ctx.textAlign = 'left'
  for (let i = 0; i < 7; i++) {
    const y = comp.y + (comp.height / 8) * (i + 1)
    ctx.fillText('abcdefg'[i], comp.x + comp.width - 16, y)
  }
}

function drawSeg7(ctx, comp) {
  const isCA = comp.type === 'SEG7CA'
  // 7段输入: a,b,c,d,e,f,g
  const seg = []
  let segValue = 0
  for (let i = 0; i < 7; i++) {
    const v = comp.inputs[i] ? comp.inputs[i].value : 0
    // 共阳(CA): 低电平点亮 → 取反；共阴(CC): 高电平点亮
    const lit = isCA ? (v ? 0 : 1) : (v ? 1 : 0)
    seg.push(lit)
    if (lit) segValue |= (1 << i)
  }

  const startX = comp.x + 14
  const startY = comp.y + 12

  ctx.fillStyle = '#0f0f0f'
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.fill()
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 2
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.stroke()

  // 段标记
  ctx.fillStyle = isCA ? '#88ccff' : '#ff8844'
  ctx.font = '10px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(isCA ? 'CA' : 'CC', comp.x + comp.width / 2, comp.y + comp.height - 12)

  // #29: 上电过渡辉光
  const glow = getSegPowerOnGlow(comp, segValue)
  drawSegDigit(ctx, startX, startY, seg, false, '#ff4500', glow)
}

function drawInstructionExecutor(ctx, comp) {
  const isSelected = props.circuit.selection.components.includes(comp)
  const w = comp.width
  const h = comp.height
  const x = comp.x
  const y = comp.y

  ctx.fillStyle = '#2a1a0a'
  ctx.strokeStyle = isSelected ? '#0078d4' : '#cc6633'
  ctx.lineWidth = isSelected ? 4 : 2
  roundRect(ctx, x, y, w, h, 10)
  ctx.fill()
  ctx.stroke()

  if (comp.state && comp.state.running) {
    ctx.fillStyle = '#00ff0010'
    roundRect(ctx, x, y, w, h, 10)
    ctx.fill()
  }

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('EXEC', x + w / 2, y + 12)

  const spacing = h / 10
  
  if (comp.state && comp.state.registers) {
    const regs = comp.state.registers
    const regNames = ['R0', 'R1', 'R2', 'R3']
    const regStartY = y + spacing * 2.5
    const regSpacing = 16

    regNames.forEach((name, idx) => {
      const ry = regStartY + idx * regSpacing
      const value = regs[name] || 0

      ctx.fillStyle = '#ffaa00'
      ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(name, x + 14, ry)

      ctx.fillStyle = '#00ff00'
      ctx.textAlign = 'right'
      ctx.fillText(value.toString(16).toUpperCase().padStart(2, '0'), x + w / 2 + 10, ry)
    })
  }

  if (comp.state && comp.state.ir !== undefined) {
    ctx.fillStyle = '#aaa'
    ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    const asmText = decodeAsmShort(comp.state.ir)
    ctx.fillText(asmText, x + w / 2, y + h - 25)
  }

  if (comp.state && comp.state.pc !== undefined) {
    ctx.fillStyle = '#00ffff'
    ctx.font = 'bold 8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('PC=' + (comp.state.pc || 0).toString(16).toUpperCase().padStart(2, '0'), x + w / 2, y + h - 12)
  }
}

// ==================== 新增显示元件绘制函数 ====================

function drawHexDisplay(ctx, comp) {
  // 黑色背景
  ctx.fillStyle = '#0f0f0f'
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.fill()
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.stroke()

  // 从8个输入计算字节值
  let value = 0
  for (let i = 0; i < 8; i++) {
    if (comp.inputs[i] && comp.inputs[i].value) value |= (1 << i)
  }

  const hi = (value >> 4) & 0xF
  const lo = value & 0xF

  const digitSpacing = 38
  const totalW = digitSpacing * 2
  const startX = comp.x + (comp.width - totalW) / 2 + 6
  const startY = comp.y + (comp.height - 56) / 2

  function getSegments(nibble) {
    if (nibble < 10) return SEGMENTS[nibble] || SEGMENTS[0]
    const hex = 'ABCDEF'[nibble - 10]
    return SEGMENTS[hex] || SEGMENTS[0]
  }

  // #29: 上电过渡辉光
  const glow = getSegPowerOnGlow(comp, value)

  // 红色7段样式字体
  drawSegDigit(ctx, startX, startY, getSegments(hi), false, '#ff4500', glow)
  drawSegDigit(ctx, startX + digitSpacing, startY, getSegments(lo), false, '#ff4500', glow)

  // 标签
  ctx.fillStyle = '#666'
  ctx.font = '9px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillText('HEX', comp.x + comp.width / 2, comp.y + comp.height - 4)
}

function drawAsciiDisplay(ctx, comp) {
  // 黑色背景
  ctx.fillStyle = '#0f0f0f'
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.fill()
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 2
  roundRect(ctx, comp.x + 4, comp.y + 4, comp.width - 8, comp.height - 8, 8)
  ctx.stroke()

  // 从7个输入计算ASCII值
  let value = 0
  for (let i = 0; i < 7; i++) {
    if (comp.inputs[i] && comp.inputs[i].value) value |= (1 << i)
  }

  const ch = (value >= 32 && value <= 126) ? String.fromCharCode(value) : ' '
  const cx = comp.x + comp.width / 2
  const cy = comp.y + comp.height / 2

  // 绿色字体
  ctx.fillStyle = '#00ff00'
  ctx.font = 'bold 28px "Courier New", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowColor = '#00ff00'
  ctx.shadowBlur = 6
  ctx.fillText(ch, cx, cy)
  ctx.shadowBlur = 0

  // 标签
  ctx.fillStyle = '#666'
  ctx.font = '9px monospace'
  ctx.textBaseline = 'bottom'
  ctx.fillText('ASCII ' + value, cx, comp.y + comp.height - 4)
}

function drawLedBar8(ctx, comp) {
  const pad = 10
  const ledH = (comp.height - pad * 2) / 8
  const cx = comp.x + comp.width / 2

  for (let i = 0; i < 8; i++) {
    const ly = comp.y + pad + i * ledH
    const on = comp.inputs[i] ? comp.inputs[i].value : 0
    const cy = ly + ledH / 2
    const radius = Math.min(ledH, comp.width) / 3

    // LED圆点：红色亮/灰色灭
    if (on) {
      ctx.fillStyle = '#ff0000'
      ctx.shadowColor = '#ff0000'
      ctx.shadowBlur = 8
    } else {
      ctx.fillStyle = '#333333'
    }
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // 序号标签
    ctx.fillStyle = '#888'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText('D' + i, comp.x + 16, cy)
  }
}

function drawScope(ctx, comp) {
  // 黑色波形显示区域
  const px = comp.x + 4
  const py = comp.y + 4
  const pw = comp.width - 8
  const ph = comp.height - 8

  ctx.fillStyle = '#000000'
  roundRect(ctx, px, py, pw, ph, 4)
  ctx.fill()
  ctx.strokeStyle = '#333333'
  ctx.lineWidth = 1
  roundRect(ctx, px, py, pw, ph, 4)
  ctx.stroke()

  const innerX = px + 4
  const innerY = py + 4
  const innerW = pw - 8
  const innerH = ph - 8
  const midY = innerY + innerH / 2

  // 中线
  ctx.strokeStyle = '#0a330a'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(innerX, midY)
  ctx.lineTo(innerX + innerW, midY)
  ctx.stroke()

  // 用绿色折线绘制 comp.state.history 中的128个采样点波形
  const history = (comp.state && comp.state.history) ? comp.state.history : []
  if (history.length > 1) {
    ctx.strokeStyle = '#00ff00'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    const sampleCount = Math.min(history.length, 128)
    for (let i = 0; i < sampleCount; i++) {
      const x = innerX + (i / 127) * innerW
      const val = history[history.length - sampleCount + i]
      const y = val ? innerY + 4 : innerY + innerH - 4
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // 标签
  ctx.fillStyle = '#00ff00'
  ctx.font = '10px monospace'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('SCOPE', comp.x + 8, comp.y + 6)
}

function drawKeypad4x4(ctx, comp) {
  const pad = 8
  const gridW = comp.width - pad * 2
  const gridH = comp.height - pad * 2
  const cellW = gridW / 4
  const cellH = gridH / 4

  const labels = [
    ['1', '2', '3', 'A'],
    ['4', '5', '6', 'B'],
    ['7', '8', '9', 'C'],
    ['*', '0', '#', 'D'],
  ]

  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const bx = comp.x + pad + c * cellW
      const by = comp.y + pad + r * cellH

      ctx.fillStyle = '#3a3a3a'
      roundRect(ctx, bx + 3, by + 3, cellW - 6, cellH - 6, 6)
      ctx.fill()
      ctx.strokeStyle = '#666'
      ctx.lineWidth = 1
      ctx.stroke()

      ctx.fillStyle = '#fff'
      ctx.font = 'bold 12px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(labels[r][c], bx + cellW / 2, by + cellH / 2)
    }
  }
}
</script>

<style scoped>
.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #1e1e1e;
}

canvas {
  display: block;
  cursor: crosshair;
}

.status-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 28px;
  background: #0078d4;
  display: flex;
  align-items: center;
  padding: 0 15px;
  font-size: 12px;
  gap: 25px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.status-label {
  color: #ffffff80;
}

.status-value {
  color: #fff;
  font-weight: 500;
}

.status-item.probe-active {
  background: #ffaa0020;
  padding: 2px 8px;
  border-radius: 4px;
}

.status-item.probe-active .status-label {
  color: #ffaa00;
  font-weight: 600;
}

.text-editor {
  position: absolute;
  z-index: 100;
}

.text-editor textarea {
  width: 100%;
  height: 100%;
  border: 3px solid #0078d4;
  border-radius: 12px;
  padding: 15px;
  font-size: 15px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  background: #1e1e1e;
  color: #ffffff;
  resize: none;
  outline: none;
  box-sizing: border-box;
  line-height: 1.6;
}

.text-editor textarea:focus {
  border-color: #0099ff;
  box-shadow: 0 0 0 4px rgba(0, 120, 212, 0.4);
}

.context-menu {
  position: fixed;
  z-index: 1000;
  background: #2d2d2d;
  border: 1px solid #404040;
  border-radius: 8px;
  padding: 4px 0;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.menu-item {
  padding: 10px 16px;
  cursor: pointer;
  color: #fff;
  font-size: 14px;
  transition: background 0.15s, border-left-color 0.15s;
  border-left: 3px solid transparent;
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.menu-hint {
  margin-left: auto;
  font-size: 10px;
  color: #666;
  background: #2a2a2a;
  padding: 1px 5px;
  border-radius: 3px;
}

/* V37: 右键菜单图标着色 */
.menu-item-green { border-left-color: #00aa00; }
.menu-item-green:hover { background: rgba(0, 170, 0, 0.15); }
.menu-item-blue { border-left-color: #0078d4; }
.menu-item-blue:hover { background: rgba(0, 120, 212, 0.15); }
.menu-item-red { border-left-color: #d4380d; }
.menu-item-red:hover { background: rgba(212, 56, 13, 0.15); }

.menu-item:hover {
  background: #3d3d3d;
}
</style>
