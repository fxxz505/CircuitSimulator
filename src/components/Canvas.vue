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
      <div v-if="contextMenuTarget?.type === 'custom'" class="menu-item" @mousedown="onUnpackage">
        🔓 解除打包
      </div>
      <div v-if="contextMenuTarget?.type === 'wirePoint' || contextMenuTarget?.type === 'wireSegment'" class="menu-item" @mousedown="onStartBranch">
        🌿 从此处分支
      </div>
      <div v-if="contextMenuTarget?.type === 'wireSegment'" class="menu-item" @mousedown="onAddWirePoint">
        ➕ 添加节点
      </div>
      <div v-if="contextMenuTarget?.type === 'wirePoint'" class="menu-item" @mousedown="onDeleteWirePoint">
        🗑️ 删除节点
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
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { COMPONENT_TYPES, getCustomComponentDef } from '../constants/componentTypes'

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

const emit = defineEmits(['component-added', 'open-clock-settings', 'open-cpu-debugger', 'open-exec-debugger', 'open-instruction-editor', 'open-io-config', 'open-divider-settings', 'open-memory-editor', 'open-dotmatrix-editor', 'open-state-viewer'])

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

let animationId = null
let lastRenderTime = 0
let lastClickTime = 0
let lastClickPos = null
let lastDblClickTime = 0

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
  if (needsRender.value || now - lastRenderTime > 100) {
    render()
    needsRender.value = false
    lastRenderTime = now
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
  const size = 18
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

function getInputPortPos(comp, i) {
  const def = getCompDef(comp.type)
  
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

function getOutputPortPos(comp, i) {
  const def = getCompDef(comp.type)

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
  
  const spacing = comp.height / (def.outputs + 1)
  const y = comp.y + spacing * (i + 1)
  const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE
  return { x: comp.x + comp.width, y: snappedY }
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
  for (const w of props.circuit.wires.value) {
    if (w.startPointRef && w.startPointRef.wireId === wireId) {
      if (w.startPointRef.pointIndex === deleteIndex) {
        w.startPoint = null
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
        const wirePoints = [...wiringPoints.value]
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
  if (hoveredPort.value) {
    canvasRef.value.style.cursor = 'pointer'
  } else if (comp) {
    canvasRef.value.style.cursor = 'move'
  } else {
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
      if (comp.type === 'SWITCH' || comp.type === 'BUTTON') {
        comp.state = 1 - comp.state
        if (comp.outputs[0]) {
          comp.outputs[0].value = comp.state
        }
        props.simulation.simulate()
        markDirty()
      } else if (comp.type === 'PARALLEL_IO') {
        const rightX = comp.x + comp.width - 25
        const cy = comp.y + 20
        const spacing = 12
        
        for (let i = 0; i < 8; i++) {
          const y = cy + i * spacing
          const dx = pos.x - rightX
          const dy = pos.y - y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 10) {
            if (!comp.parallelValues) {
              comp.parallelValues = [0, 0, 0, 0, 0, 0, 0, 0]
            }
            comp.parallelValues[i] = 1 - comp.parallelValues[i]
            props.simulation.simulate()
            markDirty()
            break
          }
        }
      }
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
    if (def && def.isCustom) {
      showContextMenu.value = true
      contextMenuTarget.value = {
        type: 'custom',
        component: comp
      }
      contextMenuStyle.value = {
        left: `${e.clientX}px`,
        top: `${e.clientY}px`
      }
      return
    }
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
    const snapped = snapToGrid(pos.x, pos.y)
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
    
    // 双击CLOCK打开时钟设置
    if (comp.type === 'CLOCK') {
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

function calculateTextHeight(text, maxWidth) {
  const maxCharsPerLine = 30
  const lineHeight = 24
  const padding = 20
  
  let lines = 1
  let currentLineLength = 0
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '\n') {
      lines++
      currentLineLength = 0
    } else if (currentLineLength >= maxCharsPerLine) {
      lines++
      currentLineLength = 1
    } else {
      currentLineLength++
    }
  }
  
  return padding + lines * lineHeight
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
  props.circuit.wires.value.forEach(wire => drawWire(context, wire, false))
  if (isWiring.value && wiringStart.value) drawTempWire(context)
  
  props.circuit.components.value.forEach(comp => drawComponent(context, comp))
  
  // 绘制分支节点
  if (props.circuit.junctionPoints && props.circuit.junctionPoints.value) {
    props.circuit.junctionPoints.value.forEach(junction => drawJunctionPoint(context, junction))
  }
  
  props.circuit.wires.value.forEach(wire => drawWire(context, wire, true))
  
  if (isSelecting.value) {
    drawSelectionBox(context)
  }
  
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
  
  if (!onlyPoints) {
    if (isSelected) {
      ctx.strokeStyle = '#0078d440'
      ctx.lineWidth = 12
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()
    }
    
    if (isHovered) {
      ctx.strokeStyle = '#ffaa0040'
      ctx.lineWidth = 14
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()
    }
    
    ctx.strokeStyle = wire.value ? '#00ff00' : '#666'
    ctx.lineWidth = isSelected ? 6 : (isHovered ? 5 : 3)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y)
    }
    ctx.stroke()
    
    if (wire.value) {
      ctx.strokeStyle = '#00ff0040'
      ctx.lineWidth = 10
      ctx.beginPath()
      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()
    }

    if (isHovered) {
      const midIdx = Math.floor(points.length / 2)
      const mid = points[midIdx]
      const val = wire.value ? 'HIGH (1)' : 'LOW (0)'
      const color = wire.value ? '#00ff00' : '#888888'
      
      ctx.font = 'bold 12px monospace'
      const textWidth = ctx.measureText(val).width
      const pad = 6
      const boxW = textWidth + pad * 2
      const boxH = 22
      const boxX = mid.x - boxW / 2
      const boxY = mid.y - boxH - 8
      
      ctx.fillStyle = '#1e1e1e'
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.roundRect(boxX, boxY, boxW, boxH, 4)
      ctx.fill()
      ctx.stroke()
      
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(val, mid.x, boxY + boxH / 2)
    }
  } else {
    if (isEditing || isSelected) {
      for (let i = 1; i < points.length - 1; i++) {
        const p = points[i]
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.strokeStyle = isEditing ? '#0078d4' : '#888888'
        ctx.lineWidth = isEditing ? 3 : 2
        ctx.beginPath()
        ctx.arc(p.x, p.y, 8, 0, Math.PI * 2)
        ctx.stroke()
      }
    }
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
  
  const points = [from, ...wiringPoints.value, tempWireEnd.value]
  
  ctx.strokeStyle = '#0078d4'
  ctx.lineWidth = 3
  ctx.setLineDash([8, 6])
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y)
  }
  ctx.stroke()
  ctx.setLineDash([])
  
  wiringPoints.value.forEach((p, idx) => {
    ctx.fillStyle = '#0078d4'
    ctx.beginPath()
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
    ctx.fill()
  })
}

function drawComponent(ctx, comp) {
  let def = COMPONENT_TYPES[comp.type]
  if (!def) {
    def = getCustomComponentDef(comp.type)
  }
  if (!def) return
  
  const isSelected = props.circuit.selection.components.includes(comp)
  const rotation = comp.rotation || 0

  ctx.save()
  if (rotation) {
    const cx = comp.x + comp.width / 2
    const cy = comp.y + comp.height / 2
    ctx.translate(cx, cy)
    ctx.rotate(rotation * Math.PI / 180)
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
      
      if (!icDef.isSegDisplay && !icDef.isSegDisplay1 && !icDef.isDotMatrix && !icDef.isLCD && !icDef.isText && !icDef.isConstant && ic.type !== 'CLOCK' && ic.type !== 'SCREEN' && ic.type !== 'PARALLEL_IO') {
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
    
    roundRect(ctx, comp.x, comp.y, comp.width, comp.height, 10)
    ctx.fill()
    ctx.stroke()
    
    if (!def.isSegDisplay && !def.isSegDisplay1 && !def.isDotMatrix && !def.isLCD && !def.isText && !def.isConstant && comp.type !== 'CLOCK' && comp.type !== 'SHIFT_REG' && comp.type !== 'IO_BRIDGE' && comp.type !== 'EXT_RAM' && comp.type !== 'IO_PORT' && comp.type !== 'TIMER' && comp.type !== 'CPU' && comp.type !== 'ROM256' && comp.type !== 'INSTRUCTION_EXECUTOR') {
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
  
  ctx.restore()
  
  for (let i = 0; i < comp.inputs.length; i++) {
    const pos = getInputPortPos(comp, i)
    const val = comp.inputs[i].value
    const isHovered = hoveredPort.value && 
                      hoveredPort.value.component === comp && 
                      hoveredPort.value.portIndex === i && 
                      !hoveredPort.value.isOutput
    
    if (isHovered) {
      ctx.fillStyle = '#0078d440'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.fillStyle = val ? '#00ff00' : '#555'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, isHovered ? 9 : 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = isHovered ? '#0078d4' : '#888'
    ctx.lineWidth = isHovered ? 3 : 2
    ctx.stroke()
  }
  
  for (let i = 0; i < comp.outputs.length; i++) {
    const pos = getOutputPortPos(comp, i)
    const val = comp.outputs[i].value
    const isHovered = hoveredPort.value && 
                      hoveredPort.value.component === comp && 
                      hoveredPort.value.portIndex === i && 
                      hoveredPort.value.isOutput
    
    if (isHovered) {
      ctx.fillStyle = '#0078d440'
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, 14, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.fillStyle = val ? '#00ff00' : '#555'
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, isHovered ? 9 : 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = isHovered ? '#0078d4' : '#888'
    ctx.lineWidth = isHovered ? 3 : 2
    ctx.stroke()
  }
  
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
    const cx = comp.x + comp.width / 2
    const cy = comp.y + comp.height / 2
    ctx.fillStyle = comp.state ? '#9933ff' : '#331155'
    ctx.beginPath()
    ctx.arc(cx, cy - 5, 14, 0, Math.PI * 2)
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

function drawSegDigit(ctx, x, y, segments, dp, color) {
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
      gradient.addColorStop(0.5, '#ffffff60')
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
      ctx.shadowBlur = 8
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
    ctx.shadowBlur = 6
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

    let segments
    if (value < 10) {
      segments = SEGMENTS[value] || SEGMENTS[0]
    } else if (value < 16) {
      const hex = 'ABCDEF'[value - 10]
      segments = SEGMENTS[hex] || SEGMENTS[0]
    } else {
      segments = SEGMENTS[0]
    }

    drawSegDigit(ctx, startX + i * digitSpacing, startY, segments, dp, '#ff4500')
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

  drawSegDigit(ctx, startX, startY, segments, false, '#ff4500')
}

const DOTMATRIX_CHARS = {}

function initDotMatrixChars() {
  const charPatterns = {
    'H': [
      '.....X...X......',
      '.....X...X......',
      '.....X...X......',
      '.....X...X......',
      '.....XXXXX......',
      '.....X...X......',
      '.....X...X......',
      '.....X...X......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    'E': [
      '.....XXXXX......',
      '.....X..........',
      '.....X..........',
      '.....XXXX.......',
      '.....X..........',
      '.....X..........',
      '.....XXXXX......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    'L': [
      '.....X..........',
      '.....X..........',
      '.....X..........',
      '.....X..........',
      '.....X..........',
      '.....X..........',
      '.....XXXXX......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
    'O': [
      '.....XXXXX......',
      '.....X...X......',
      '.....X...X......',
      '.....X...X......',
      '.....X...X......',
      '.....X...X......',
      '.....XXXXX......',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
    ],
  }

  for (const [ch, pattern] of Object.entries(charPatterns)) {
    const rows = []
    for (let r = 0; r < 16; r++) {
      let rowVal = 0
      const line = pattern[r] || '................'
      for (let c = 0; c < 16; c++) {
        if (line[c] === 'X') {
          rowVal |= (1 << (15 - c))
        }
      }
      rows.push(rowVal)
    }
    DOTMATRIX_CHARS[ch] = rows
  }
}

initDotMatrixChars()

function getDotMatrixCharROM() {
  const charOrder = ['H', 'E', 'L', 'L', 'O']
  const rom = []
  for (let i = 0; i < 16; i++) {
    if (i < charOrder.length) {
      rom.push(DOTMATRIX_CHARS[charOrder[i]])
    } else {
      rom.push(new Array(16).fill(0))
    }
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
  ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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
    ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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
      ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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
    ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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

  ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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

function drawJunctionPoint(ctx, junction) {
  const { x, y } = junction
  const radius = 6
  
  // 节点外圈
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fill()
  
  // 节点内圈
  ctx.fillStyle = '#0078d4'
  ctx.beginPath()
  ctx.arc(x, y, radius - 2, 0, Math.PI * 2)
  ctx.fill()
  
  // 节点中心
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, 2, 0, Math.PI * 2)
  ctx.fill()
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
  ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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
    ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'

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

  ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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
}

function drawIoPort(ctx, comp) {
  const cx = comp.x + comp.width / 2

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 10px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('I/O', cx, comp.y + 12)

  ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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
      ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(name, x + 14, ry)

      ctx.fillStyle = '#00ff00'
      ctx.textAlign = 'right'
      ctx.fillText(value.toString(16).toUpperCase().padStart(2, '0'), x + w / 2 + 10, ry)
    })
  }

  if (comp.state && comp.state.ir !== undefined) {
    ctx.fillStyle = '#aaa'
    ctx.font = '8px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
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
  transition: background 0.15s;
}

.menu-item:hover {
  background: #3d3d3d;
}
</style>
