import { ref, reactive } from 'vue'
import { COMPONENT_TYPES, getCustomComponentDef } from '../constants/componentTypes'

function calculateTextHeight(text, maxWidth) {
  const maxCharsPerLine = 30
  const lineHeight = 24
  const padding = 20
  
  if (!text) {
    return padding + lineHeight
  }
  
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

export function useCircuit() {
  const components = ref([])
  const wires = ref([])
  const junctionPoints = ref([])
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
        flags: { ZERO: false, CARRY: false, HALT: false },
        running: false,
        cyclesExecuted: 0
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
        flags: { ZERO: false, CARRY: false, HALT: false },
        running: false,
        cyclesExecuted: 0
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
      comp.outputs = [0, 0, 0, 0, 0]
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
        w.startPoint = null
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
    junctionPoints.value = []
    clearSelection()
  }

  function addJunctionPoint(x, y, wireIds = []) {
    const junction = {
      id: `junction_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      x,
      y,
      connectedWires: wireIds,
      value: 0
    }
    junctionPoints.value.push(junction)
    return junction
  }

  function removeJunctionPoint(junction) {
    const idx = junctionPoints.value.findIndex(j => j.id === junction.id)
    if (idx > -1) {
      junctionPoints.value.splice(idx, 1)
    }
  }

  function findJunctionAt(x, y, tolerance = 10) {
    return junctionPoints.value.find(j => {
      const dist = Math.sqrt((x - j.x) ** 2 + (y - j.y) ** 2)
      return dist < tolerance
    })
  }

  return {
    components,
    wires,
    junctionPoints,
    selection,
    viewport,
    addComponent,
    removeComponent,
    addWire,
    removeWire,
    addJunctionPoint,
    removeJunctionPoint,
    findJunctionAt,
    clearSelection,
    deleteSelected,
    getComponentById,
    reset
  }
}
