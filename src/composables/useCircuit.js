import { ref, reactive } from 'vue'
import { COMPONENT_TYPES, getCustomComponentDef } from '../constants/componentTypes'
import { calculateTextHeight } from '../utils/textUtils'

export function useCircuit() {
  const components = ref([])
  const wires = ref([])
  const selection = reactive({
    components: [],
    wires: []
  })
  const viewport = reactive({
    x: 300,
    y: 300,
    zoom: 1
  })

  let componentIdCounter = 0
  let wireIdCounter = 0

  function addComponent(type, x, y, text = null) {
    let def = COMPONENT_TYPES[type]
    if (!def) {
      def = getCustomComponentDef(type)
    }
    if (!def) return null

    const comp = {
      id: `comp_${++componentIdCounter}`,
      type,
      x,
      y,
      width: def.width,
      height: def.height,
      inputs: [],
      outputs: [],
      state: def.state || 0,
      lastClock: 0,
      text: text !== null ? text : def.text,
      expanded: false
    }

    if (def.isLCD) {
      comp.lcdBuffer = [
        '                ',
        '                '
      ]
      comp.lcdCursor = { x: 0, y: 0 }
      comp.lcdLastE = 0
    }

    if (type === 'TEXT') {
      comp.height = calculateTextHeight(comp.text, comp.width)
    }

    // 新增存储器组件的初始化
    if (type === 'RAM164') {
      comp.state = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      comp.lastClock = 0
    }

    if (type === 'ROM164') {
      comp.state = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
    }

    if (type === 'COUNTER4') {
      comp.state = 0
      comp.lastClock = 0
    }

    if (type === 'DOTMATRIX16') {
      comp.charROM = null
    }

    if (type === 'RING4') {
      comp.state = 1  // 初始状态 0001
      comp.lastClock = 0
    }

    if (type === 'DIPSW4') {
      comp.state = [0, 0, 0, 0]
    }

    // 新增组件初始化
    if (type === 'CLOCK') {
      comp.frequency = 1
      comp.dutyCycle = 50
      comp.phase = 0
      comp.enabled = true
      comp.waveformHistory = new Array(64).fill(0)
    }

    if (type === 'CLOCKDIVIDER') {
      comp.divideBy = 2
      comp.state = {
        output: 0,
        counter: 0
      }
      comp.lastClock = 0
    }

    if (type === 'CPU') {
      comp.state = {
        registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
        pc: 0,
        ir: 0,
        sp: 0xFF,
        stack: new Array(256).fill(0),
        flags: { ZERO: false, CARRY: false, HALT: false, INT: false },
        running: false,
        cyclesExecuted: 0,
        interruptEnable: false,
        interruptVector: new Array(16).fill(0)
      }
      comp.lastClock = 0
      comp.ioOutputs = {}
    }

    if (type === 'ROM256') {
      comp.state = new Array(256).fill(0)
      comp.assemblySource = ''
      comp.instructions = []
    }

    if (type === 'INSTRUCTION_EXECUTOR') {
      comp.state = {
        registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
        pc: 0,
        ir: 0,
        sp: 0xFF,
        stack: new Array(256).fill(0),
        flags: { ZERO: false, CARRY: false, HALT: false, INT: false },
        running: false,
        cyclesExecuted: 0,
        interruptEnable: false,
        interruptVector: new Array(16).fill(0)
      }
      comp.lastClock = 0
      comp.ioOutputs = {}
    }

    if (type === 'IO_BRIDGE') {
      comp.state = {
        transferCount: 0,
        lastActivity: null,
        activePorts: [],
        lastData: {},
        lastClk: 0
      }
      // 注意：outputs 由下方统一循环创建，此处不再显式赋值（避免端口翻倍）
    }

    if (type === 'EXT_RAM') {
      comp.portConfig = {
        addressPort: 0x80,
        dataPort: 0x81,
        controlPort: 0x82
      }
      comp.state = {
        memory: new Array(256).fill(0),
        addressReg: 0,
        dataReg: 0,
        controlReg: 0
      }
      // directMode=true: 位级直连模式（独立使用）; false: 端口映射模式（与 CPU 配合）
      comp.directMode = false
    }

    if (type === 'IO_PORT') {
      comp.portConfig = {
        portNumber: 0x90
      }
      comp.state = {
        outputReg: 0,
        inputReg: 0,
        lastWrittenValue: 0
      }
      comp.directMode = false
    }

    if (type === 'TIMER') {
      comp.portConfig = {
        statusPort: 0x20,
        preloadPort: 0x21,
        controlPort: 0x22
      }
      comp.state = {
        counter: 0,
        preload: 255,
        controlReg: 0,
        interruptFlag: 0,
        running: false,
        tickCount: 0
      }
    }

    // ==================== 新增元件初始化 ====================
    if (type === 'REG8' || type === 'SHIFT_REG8' || type === 'COUNTER8') {
      comp.state = 0
      comp.lastClock = 0
    }

    if (type === 'LATCH_8') {
      comp.state = 0
    }

    if (type === 'SCHMITT') {
      comp.state = 0
    }

    if (type === 'OSCILLATOR') {
      comp.frequency = comp.frequency || 2
      comp.dutyCycle = comp.dutyCycle || 50
      comp.phase = comp.phase || 0
      comp.enabled = true
      comp.waveformHistory = new Array(64).fill(0)
    }

    if (type === 'SCOPE') {
      comp.state = { history: new Array(128).fill(0) }
    }

    if (type === 'ROM32K') {
      comp.state = new Array(32768).fill(0)
      comp.assemblySource = ''
    }

    if (type === 'SRAM32K') {
      comp.state = {
        memory: new Array(32768).fill(0),
        addressReg: 0,
        dataReg: 0
      }
      comp.lastClock = 0
    }

    if (type === 'UART') {
      comp.state = {
        txBuffer: [],
        rxBuffer: [],
        txReg: 0,
        rxReg: 0,
        txBusy: false,
        rxReady: false,
        baudDiv: 8,
        bitCount: 0,
        lastClk: 0
      }
      comp.lastClock = 0
    }

    if (type === 'PWM_GENERATOR') {
      comp.state = { counter: 0, output: 0 }
      comp.frequency = comp.frequency || 4
      comp.dutyCycle = comp.dutyCycle || 50
      comp.lastClock = 0
    }

    if (type === 'KEYPAD_4x4') {
      comp.state = { pressed: -1, scanRow: 0, keyMap: 0 }
    }

    for (let i = 0; i < def.inputs; i++) {
      comp.inputs.push({ value: 0 })
    }
    for (let i = 0; i < def.outputs; i++) {
      comp.outputs.push({ value: 0 })
    }
    if (def.isInput && comp.outputs[0]) {
      comp.outputs[0].value = comp.state
    }

    components.value.push(comp)
    return comp
  }

  function removeComponent(comp) {
    wires.value.forEach(wire => {
      if (wire.to.componentId === comp.id) {
        const toComp = getComponentById(wire.to.componentId)
        if (toComp && toComp.inputs[wire.to.port]) {
          toComp.inputs[wire.to.port].value = 0
        }
      }
    })
    wires.value = wires.value.filter(w => 
      w.from.componentId !== comp.id && w.to.componentId !== comp.id
    )
    const idx = components.value.indexOf(comp)
    if (idx > -1) {
      components.value.splice(idx, 1)
    }
  }

  function addWire(fromComp, fromPort, toComp, toPort, points = [], startPoint = null, startPointRef = null) {
    const wire = {
      id: `wire_${++wireIdCounter}`,
      from: { componentId: fromComp.id, port: fromPort },
      to: { componentId: toComp.id, port: toPort },
      value: 0,
      points: points,
      startPoint: startPoint,
      startPointRef: startPointRef
    }
    wires.value.push(wire)
    return wire
  }

  function removeWire(wire) {
    const idx = wires.value.indexOf(wire)
    if (idx > -1) {
      wires.value.splice(idx, 1)
    }
    for (const w of wires.value) {
      if (w.startPointRef && w.startPointRef.wireId === wire.id) {
        // P0 修复：冻结分支起点坐标，仅清空引用，避免视觉跳变回组件端口
        const sourceWire = wire
        if (sourceWire.points && w.startPointRef.pointIndex >= 0 && w.startPointRef.pointIndex < sourceWire.points.length) {
          const pt = sourceWire.points[w.startPointRef.pointIndex]
          w.startPoint = { x: pt.x, y: pt.y }
        }
        w.startPointRef = null
      }
    }
    const toComp = getComponentById(wire.to.componentId)
    if (toComp && toComp.inputs[wire.to.port]) {
      let hasActiveWire = false
      wires.value.forEach(w => {
        if (w.to.componentId === toComp.id && w.to.port === wire.to.port && w.value === 1) {
          hasActiveWire = true
        }
      })
      toComp.inputs[wire.to.port].value = hasActiveWire ? 1 : 0
    }
  }

  function clearSelection() {
    selection.components = []
    selection.wires = []
  }

  function deleteSelected() {
    selection.wires.forEach(w => removeWire(w))
    selection.components.forEach(c => removeComponent(c))
    clearSelection()
  }

  function getComponentById(id) {
    return components.value.find(c => c.id === id)
  }

  function reset() {
    components.value = []
    wires.value = []
    clearSelection()
  }

  return {
    components,
    wires,
    selection,
    viewport,
    addComponent,
    removeComponent,
    addWire,
    removeWire,
    clearSelection,
    deleteSelected,
    getComponentById,
    reset
  }
}
