import { customComponents } from '../composables/useCustomComponents'

export const COMPONENT_TYPES = {
  AND: {
    name: 'AND',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#4a9eff',
    label: 'AND',
    evaluate: (inputs) => [inputs[0] & inputs[1]]
  },
  AND3: {
    name: 'AND3',
    inputs: 3,
    outputs: 1,
    width: 80,
    height: 80,
    color: '#4a9eff',
    label: 'AND3',
    evaluate: (inputs) => [inputs[0] & inputs[1] & inputs[2]]
  },
  OR: {
    name: 'OR',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#4aff6a',
    label: 'OR',
    evaluate: (inputs) => [inputs[0] | inputs[1]]
  },
  OR3: {
    name: 'OR3',
    inputs: 3,
    outputs: 1,
    width: 80,
    height: 80,
    color: '#4aff6a',
    label: 'OR3',
    evaluate: (inputs) => [inputs[0] | inputs[1] | inputs[2]]
  },
  NOT: {
    name: 'NOT',
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#ff4a4a',
    label: 'NOT',
    evaluate: (inputs) => [1 - inputs[0]]
  },
  BUFFER: {
    name: 'BUFFER',
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#4affff',
    label: 'BUF',
    evaluate: (inputs) => [inputs[0]]
  },
  NAND: {
    name: 'NAND',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#ff9e4a',
    label: 'NAND',
    evaluate: (inputs) => [1 - (inputs[0] & inputs[1])]
  },
  NOR: {
    name: 'NOR',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#a44aff',
    label: 'NOR',
    evaluate: (inputs) => [1 - (inputs[0] | inputs[1])]
  },
  XOR: {
    name: 'XOR',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#ff4aff',
    label: 'XOR',
    evaluate: (inputs) => [inputs[0] ^ inputs[1]]
  },
  XNOR: {
    name: 'XNOR',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#ff4a9e',
    label: 'XNOR',
    evaluate: (inputs) => [1 - (inputs[0] ^ inputs[1])]
  },
  SWITCH: {
    name: '开关',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 60,
    color: '#ffcc00',
    label: 'SW',
    isInput: true,
    state: 0
  },
  CONST0: {
    name: '常量0',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#666666',
    label: '0',
    isInput: true,
    state: 0,
    isConstant: true
  },
  CONST1: {
    name: '常量1',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#00ff00',
    label: '1',
    isInput: true,
    state: 1,
    isConstant: true
  },
  LED: {
    name: 'LED',
    inputs: 1,
    outputs: 0,
    width: 60,
    height: 60,
    color: '#ff3366',
    label: 'LED',
    isOutput: true
  },

  CLOCK: {
    name: '时钟',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 60,
    color: '#9933ff',
    label: 'CLK',
    isInput: true,
    state: 0,
    frequency: 1,
    dutyCycle: 50,
    phase: 0,
    enabled: true,
    waveformHistory: []
  },
  DFF: {
    name: 'D触发器',
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#33cc99',
    label: 'DFF',
    isMemory: true,
    state: 0,
    lastClock: 0
  },
  DLATCH: {
    name: 'D锁存器',
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#33cccc',
    label: 'DLAT',
    isMemory: true,
    state: 0,
    isLatch: true
  },
  HALFADDER: {
    name: '半加器',
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 60,
    color: '#66cc66',
    label: 'HA'
  },
  FULLADDER: {
    name: '全加器',
    inputs: 3,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#66cc66',
    label: 'FA'
  },
  MUX2: {
    name: '2选1多路器',
    inputs: 3,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#6699cc',
    label: 'MUX2'
  },
  MUX4: {
    name: '4选1多路器',
    inputs: 6,
    outputs: 1,
    width: 90,
    height: 100,
    color: '#6699cc',
    label: 'MUX4'
  },
  DEMUX2: {
    name: '1转2解复用器',
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 60,
    color: '#cc9966',
    label: 'DMUX2'
  },
  // ==================== 触发器类 ====================
  JKFF: {
    name: 'JK触发器',
    inputs: 3,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#33cc66',
    label: 'JKFF',
    isMemory: true,
    state: 0,
    lastClock: 0
  },
  TFF: {
    name: 'T触发器',
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#33cc33',
    label: 'TFF',
    isMemory: true,
    state: 0,
    lastClock: 0
  },
  SRFF: {
    name: 'SR触发器',
    inputs: 3,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#33b3cc',
    label: 'SRFF',
    isMemory: true,
    state: 0,
    lastClock: 0
  },

  // ==================== 译码编码类 ====================
  DEC38: {
    name: '3-to-8译码器',
    inputs: 3,
    outputs: 8,
    width: 80,
    height: 140,
    color: '#cc6699',
    label: 'DEC38',
    evaluate: (inputs) => {
      const value = (inputs[0] || 0) + ((inputs[1] || 0) << 1) + ((inputs[2] || 0) << 2)
      const outputs = [0, 0, 0, 0, 0, 0, 0, 0]
      outputs[value] = 1
      return outputs
    }
  },
  DEC24: {
    name: '2-to-4译码器',
    inputs: 2,
    outputs: 4,
    width: 80,
    height: 100,
    color: '#cc6699',
    label: 'DEC24',
    evaluate: (inputs) => {
      const value = (inputs[0] || 0) + ((inputs[1] || 0) << 1)
      const outputs = [0, 0, 0, 0]
      outputs[value] = 1
      return outputs
    }
  },
  ENC42: {
    name: '4-to-2优先编码器',
    inputs: 4,
    outputs: 3,
    width: 80,
    height: 100,
    color: '#cc9966',
    label: 'ENC42',
    evaluate: (inputs) => {
      // 优先级：I3 > I2 > I1 > I0
      if (inputs[3]) return [1, 1, 1]  // 二进制 11 = 3, VALID=1
      if (inputs[2]) return [0, 1, 1]  // 二进制 10 = 2, VALID=1
      if (inputs[1]) return [1, 0, 1]  // 二进制 01 = 1, VALID=1
      if (inputs[0]) return [0, 0, 1]  // 二进制 00 = 0, VALID=1
      return [0, 0, 0]  // 无输入, VALID=0
    }
  },

  // ==================== 计数器类 ====================
  COUNTER4: {
    name: '4位计数器',
    inputs: 3,
    outputs: 4,
    width: 80,
    height: 100,
    color: '#6699cc',
    label: 'CNT4',
    isMemory: true,
    state: 0,
    lastClock: 0
  },
  RING4: {
    name: '环形计数器',
    inputs: 2,
    outputs: 4,
    width: 80,
    height: 100,
    color: '#9966cc',
    label: 'RING',
    isMemory: true,
    state: 1,  // 初始状态 0001
    lastClock: 0
  },

  // ==================== 运算器类 ====================
  ALU4: {
    name: '4位ALU',
    inputs: 12,
    outputs: 6,
    width: 100,
    height: 180,
    color: '#cc3333',
    label: 'ALU4',
    evaluate: (inputs) => {
      // A[0:3], B[0:3], S[0:2], CIN
      const A = (inputs[0] || 0) + ((inputs[1] || 0) << 1) + ((inputs[2] || 0) << 2) + ((inputs[3] || 0) << 3)
      const B = (inputs[4] || 0) + ((inputs[5] || 0) << 1) + ((inputs[6] || 0) << 2) + ((inputs[7] || 0) << 3)
      const S = (inputs[8] || 0) + ((inputs[9] || 0) << 1) + ((inputs[10] || 0) << 2)
      const CIN = inputs[11] || 0

      let result = 0, COUT = 0
      switch (S) {
        case 0: // A + B + CIN
          result = A + B + CIN
          COUT = (result >> 4) & 1
          result &= 0xF
          break
        case 1: // A - B - CIN
          result = A - B - CIN
          if (result < 0) { COUT = 1; result += 16 }
          result &= 0xF
          break
        case 2: // A AND B
          result = A & B
          break
        case 3: // A OR B
          result = A | B
          break
        case 4: // A XOR B
          result = A ^ B
          break
        case 5: // NOT A
          result = (~A) & 0xF
          break
        case 6: // A << 1, CIN into LSB
          result = ((A << 1) | CIN) & 0xF
          COUT = (A >> 3) & 1
          break
        case 7: // A >> 1, CIN into MSB
          result = (A >> 1) | (CIN << 3)
          COUT = A & 1
          break
      }
      const ZERO = result === 0 ? 1 : 0
      return [result & 1, (result >> 1) & 1, (result >> 2) & 1, (result >> 3) & 1, COUT, ZERO]
    }
  },
  ADDSUB4: {
    name: '4位加减法器',
    inputs: 9,
    outputs: 5,
    width: 90,
    height: 120,
    color: '#66cc66',
    label: '+/-4',
    evaluate: (inputs) => {
      // A[0:3], B[0:3], MODE (0=add, 1=sub)
      const A = (inputs[0] || 0) + ((inputs[1] || 0) << 1) + ((inputs[2] || 0) << 2) + ((inputs[3] || 0) << 3)
      const B = (inputs[4] || 0) + ((inputs[5] || 0) << 1) + ((inputs[6] || 0) << 2) + ((inputs[7] || 0) << 3)
      const MODE = inputs[8] || 0

      let sum
      if (MODE === 0) {
        sum = A + B
      } else {
        sum = A + ((~B) & 0xF) + 1  // 二补数减法
      }
      const COUT = (sum >> 4) & 1
      sum &= 0xF
      return [sum & 1, (sum >> 1) & 1, (sum >> 2) & 1, (sum >> 3) & 1, COUT]
    }
  },
  COMP4: {
    name: '4位比较器',
    inputs: 8,
    outputs: 3,
    width: 80,
    height: 100,
    color: '#cccc66',
    label: 'CMP4',
    evaluate: (inputs) => {
      const A = (inputs[0] || 0) + ((inputs[1] || 0) << 1) + ((inputs[2] || 0) << 2) + ((inputs[3] || 0) << 3)
      const B = (inputs[4] || 0) + ((inputs[5] || 0) << 1) + ((inputs[6] || 0) << 2) + ((inputs[7] || 0) << 3)
      return [A > B ? 1 : 0, A === B ? 1 : 0, A < B ? 1 : 0]  // GT, EQ, LT
    }
  },
  SHIFT4: {
    name: '4位移位器',
    inputs: 7,
    outputs: 4,
    width: 80,
    height: 100,
    color: '#66cccc',
    label: 'SHFT',
    evaluate: (inputs) => {
      // D[0:3], S[0:1], DIR
      const D = (inputs[0] || 0) + ((inputs[1] || 0) << 1) + ((inputs[2] || 0) << 2) + ((inputs[3] || 0) << 3)
      const S = (inputs[4] || 0) + ((inputs[5] || 0) << 1)  // 移位量 0-3
      const DIR = inputs[6] || 0  // 0=左, 1=右

      let result
      if (DIR === 0) {
        result = (D << S) & 0xF
      } else {
        result = D >> S
      }
      return [result & 1, (result >> 1) & 1, (result >> 2) & 1, (result >> 3) & 1]
    }
  },

  // ==================== 存储器类 ====================
  REG4: {
    name: '4位寄存器',
    inputs: 6,
    outputs: 4,
    width: 80,
    height: 100,
    color: '#3399cc',
    label: 'REG4',
    isMemory: true,
    state: 0,
    lastClock: 0
  },
  RAM164: {
    name: '16x4 RAM',
    inputs: 10,
    outputs: 4,
    width: 100,
    height: 140,
    color: '#336699',
    label: 'RAM16',
    isMemory: true,
    state: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    lastClock: 0
  },
  ROM164: {
    name: '16x4 ROM',
    inputs: 4,
    outputs: 4,
    width: 100,
    height: 140,
    color: '#666699',
    label: 'ROM16',
    isMemory: true,
    state: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    isROM: true
  },

  // ==================== 总线类 ====================
  TRISTATE: {
    name: '三态缓冲器',
    inputs: 2,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#4affff',
    label: 'TRI',
    evaluate: (inputs) => [(inputs[1] || 0) ? (inputs[0] || 0) : 0]
  },
  BUSSWITCH: {
    name: '总线开关',
    inputs: 5,
    outputs: 4,
    width: 80,
    height: 80,
    color: '#ff9966',
    label: 'BUS',
    evaluate: (inputs) => {
      const EN = inputs[4] || 0
      if (EN) {
        return [inputs[0] || 0, inputs[1] || 0, inputs[2] || 0, inputs[3] || 0]
      }
      return [0, 0, 0, 0]
    }
  },

  // ==================== 其他 ====================
  TEXT: {
    name: '文本说明',
    inputs: 0,
    outputs: 0,
    width: 400,
    height: 120,
    color: '#888888',
    label: '',
    isText: true,
    text: '在这里输入说明文字'
  },
  SEGDISPLAY8: {
    name: '8位数码管',
    inputs: 32,
    outputs: 0,
    width: 320,
    height: 80,
    color: '#ff4500',
    label: '8SEG',
    isOutput: true,
    isSegDisplay: true
  },
  SEGDISPLAY1: {
    name: '1位数码管',
    inputs: 4,
    outputs: 0,
    width: 60,
    height: 80,
    color: '#ff4500',
    label: 'SEG',
    isOutput: true,
    isSegDisplay1: true
  },
  DOTMATRIX16: {
    name: '16x16点阵屏',
    inputs: 4,
    outputs: 0,
    width: 160,
    height: 180,
    color: '#00ff88',
    label: 'DOT',
    isOutput: true,
    isDotMatrix: true,
    charROM: null
  },
  LCD1602: {
    name: '1602液晶屏',
    inputs: 10,
    outputs: 0,
    width: 320,
    height: 100,
    color: '#00cc99',
    label: 'LCD',
    isOutput: true,
    isLCD: true,
    lcdBuffer: [
      '                ',
      '                '
    ]
  },

  // ==================== 时钟相关 ====================
  CLOCKDIVIDER: {
    name: '时钟分频器',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 80,
    color: '#9933cc',
    label: 'DIV',
    isMemory: true,
    state: {
      output: 0,
      counter: 0
    },
    lastClock: 0,
    divideBy: 2
  },

  // ==================== 分支节点 ====================
  TJUNCTION: {
    name: 'T型分支',
    inputs: 1,
    outputs: 2,
    width: 30,
    height: 30,
    color: '#00ff88',
    label: '●',
    isJunction: true,
    evaluate: (inputs) => [inputs[0] || 0, inputs[0] || 0]
  },
  CROSSJUNCTION: {
    name: '十字分支',
    inputs: 1,
    outputs: 3,
    width: 30,
    height: 30,
    color: '#00ff88',
    label: '●',
    isJunction: true,
    evaluate: (inputs) => [inputs[0] || 0, inputs[0] || 0, inputs[0] || 0]
  },

  // ==================== CPU和编程 ====================
  CPU: {
    name: '8位CPU',
    inputs: 3,
    outputs: 4,
    width: 160,
    height: 200,
    color: '#cc3366',
    label: 'CPU',
    isCPU: true,
    isMemory: true,
    state: {
      registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
      pc: 0,
      ir: 0,
      flags: { ZERO: false, CARRY: false, HALT: false },
      running: false,
      cyclesExecuted: 0
    },
    ioOutputs: {},
    lastClock: 0
  },
  ROM256: {
    name: '256x16 程序ROM',
    inputs: 8,
    outputs: 16,
    width: 120,
    height: 180,
    color: '#666699',
    label: 'PROM',
    isMemory: true,
    isProgramROM: true,
    state: Array(256).fill(0),
    isROM: true,
    assemblySource: ''
  },
  INSTRUCTION_EXECUTOR: {
    name: '指令执行器',
    inputs: 16,
    outputs: 16,
    width: 140,
    height: 200,
    color: '#cc6633',
    label: 'EXEC',
    isMemory: true,
    isInstructionExecutor: true,
    state: {
      registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
      pc: 0,
      ir: 0,
      flags: { ZERO: false, CARRY: false, HALT: false },
      running: false,
      cyclesExecuted: 0
    },
    lastClock: 0,
    ioOutputs: {}
  },

  // === I/O 桥接组件 ===
  IO_BRIDGE: {
    name: 'I/O桥接器',
    inputs: 2,
    outputs: 5,
    width: 150,
    height: 160,
    color: '#e67e22',
    label: 'IOBRIDGE',
    isIOBridge: true,
    state: {
      transferCount: 0,
      lastActivity: null,
      activePorts: [],
      lastData: {},
      lastClk: 0
    }
  },

  EXT_RAM: {
    name: '256x8 外部RAM',
    inputs: 10,
    outputs: 8,
    width: 140,
    height: 200,
    color: '#2980b9',
    label: 'EXT_RAM',
    isMemory: true,
    isExtRam: true,
    portConfig: {
      addressPort: 0x80,
      dataPort: 0x81,
      controlPort: 0x82
    },
    state: {
      memory: new Array(256).fill(0),
      addressReg: 0,
      dataReg: 0,
      controlReg: 0
    }
  },

  IO_PORT: {
    name: '通用I/O端口',
    inputs: 8,
    outputs: 8,
    width: 100,
    height: 200,
    color: '#16a085',
    label: 'IOPORT',
    isIoPort: true,
    portConfig: {
      portNumber: 0x90
    },
    state: {
      outputReg: 0,
      inputReg: 0,
      lastWrittenValue: 0
    }
  },

  TIMER: {
    name: '定时器',
    inputs: 1,
    outputs: 1,
    width: 100,
    height: 80,
    color: '#8e44ad',
    label: 'TIMER',
    isTimer: true,
    portConfig: {
      statusPort: 0x20,
      preloadPort: 0x21,
      controlPort: 0x22
    },
    state: {
      counter: 0,
      preload: 255,
      controlReg: 0,
      interruptFlag: 0,
      running: false,
      tickCount: 0
    }
  }
}

export let CATEGORIES = [
  {
    name: '逻辑门',
    icon: '🔌',
    components: ['AND', 'AND3', 'OR', 'OR3', 'NOT', 'BUFFER', 'NAND', 'NOR', 'XOR', 'XNOR']
  },
  {
    name: '输入输出',
    icon: '🎮',
    components: ['SWITCH', 'CONST0', 'CONST1', 'LED', 'CLOCK', 'SEGDISPLAY1', 'SEGDISPLAY8', 'DOTMATRIX16', 'LCD1602']
  },
  {
    name: '触发器',
    icon: '🔄',
    components: ['DFF', 'DLATCH', 'JKFF', 'TFF', 'SRFF']
  },
  {
    name: '译码编码',
    icon: '🔢',
    components: ['DEC38', 'DEC24', 'ENC42']
  },
  {
    name: '计数器',
    icon: '⏱️',
    components: ['COUNTER4', 'RING4']
  },
  {
    name: '运算器',
    icon: '🧮',
    components: ['HALFADDER', 'FULLADDER', 'MUX2', 'MUX4', 'DEMUX2', 'ALU4', 'ADDSUB4', 'COMP4', 'SHIFT4']
  },
  {
    name: '存储器',
    icon: '💾',
    components: ['REG4', 'RAM164', 'ROM164']
  },
  {
    name: '总线',
    icon: '🔗',
    components: ['TRISTATE', 'BUSSWITCH']
  },
  {
    name: '时钟控制',
    icon: '⏰',
    components: ['CLOCK', 'CLOCKDIVIDER']
  },
  {
    name: '分支节点',
    icon: '●',
    components: ['TJUNCTION', 'CROSSJUNCTION']
  },
  {
    name: 'CPU与编程',
    icon: '🖥️',
    components: ['CPU', 'ROM256', 'INSTRUCTION_EXECUTOR']
  },
  {
    name: 'I/O设备',
    icon: '🔌',
    components: ['IO_BRIDGE', 'EXT_RAM', 'IO_PORT', 'TIMER']
  },
  {
    name: '其他',
    icon: '📝',
    components: ['TEXT']
  },
  {
    name: '自定义',
    icon: '🧩',
    components: []
  }
]

export function updateCategoriesWithCustom() {
  const customCategory = {
    name: '自定义',
    icon: '🧩',
    components: customComponents.value.map(c => c.id)
  }
  
  const existingCustomIdx = CATEGORIES.findIndex(c => c.name === '自定义')
  if (existingCustomIdx > -1) {
    CATEGORIES[existingCustomIdx] = customCategory
  }
}

export function getCustomComponentDef(id) {
  const comp = customComponents.value.find(c => c.id === id)
  if (comp) {
    return {
      name: comp.name,
      inputs: comp.inputs,
      outputs: comp.outputs,
      width: comp.width,
      height: comp.height,
      color: comp.color,
      label: comp.label,
      isCustom: true,
      customData: comp
    }
  }
  return null
}

export function getAllComponentTypes() {
  const types = { ...COMPONENT_TYPES }
  customComponents.value.forEach(comp => {
    types[comp.id] = getCustomComponentDef(comp.id)
  })
  return types
}
