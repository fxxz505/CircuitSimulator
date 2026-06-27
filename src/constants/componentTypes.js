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
    color: '#4a9eff',
    label: 'OR',
    evaluate: (inputs) => [inputs[0] | inputs[1]]
  },
  OR3: {
    name: 'OR3',
    inputs: 3,
    outputs: 1,
    width: 80,
    height: 80,
    color: '#4a9eff',
    label: 'OR3',
    evaluate: (inputs) => [inputs[0] | inputs[1] | inputs[2]]
  },
  NOT: {
    name: 'NOT',
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#4a9eff',
    label: 'NOT',
    evaluate: (inputs) => [1 - inputs[0]]
  },
  BUFFER: {
    name: 'BUFFER',
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#4a9eff',
    label: 'BUF',
    evaluate: (inputs) => [inputs[0]]
  },
  NAND: {
    name: 'NAND',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#4a9eff',
    label: 'NAND',
    evaluate: (inputs) => [1 - (inputs[0] & inputs[1])]
  },
  NOR: {
    name: 'NOR',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#4a9eff',
    label: 'NOR',
    evaluate: (inputs) => [1 - (inputs[0] | inputs[1])]
  },
  XOR: {
    name: 'XOR',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#4a9eff',
    label: 'XOR',
    evaluate: (inputs) => [inputs[0] ^ inputs[1]]
  },
  XNOR: {
    name: 'XNOR',
    inputs: 2,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#4a9eff',
    label: 'XNOR',
    evaluate: (inputs) => [1 - (inputs[0] ^ inputs[1])]
  },
  SWITCH: {
    name: '开关',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 60,
    color: '#99cc33',
    label: 'SW',
    isInput: true,
    state: 0,
    isToggle: true
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
    color: '#3399cc',
    label: 'LED',
    isOutput: true
  },

  CLOCK: {
    name: '时钟',
    inputs: 1,
    outputs: 1,
    width: 60,
    height: 60,
    color: '#cc6699',
    label: 'CLK',
    isInput: true,
    state: 0,
    frequency: 1,
    dutyCycle: 50,
    phase: 0,
    enabled: true,
    waveformHistory: new Array(64).fill(0),
    portLabels: { inputs: ['EN'], outputs: ['CLK'] },
    // P1-5: evaluate 让 simulate() 内部也能传播 CLOCK 输出（状态仍由主循环驱动）
    evaluate: (inputs, state) => [state || 0]
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
    lastClock: 0,
    portLabels: { inputs: ['D', 'CLK'], outputs: ['Q', 'Q̄'] }
  },
  DLATCH: {
    name: 'D锁存器',
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#33cc99',
    label: 'DLAT',
    isMemory: true,
    state: 0,
    isLatch: true,
    portLabels: { inputs: ['D', 'EN'], outputs: ['Q', 'Q̄'] }
  },
  HALFADDER: {
    name: '半加器',
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 60,
    color: '#ff9933',
    label: 'HA',
    evaluate: (inputs) => {
      const a = inputs[0] || 0
      const b = inputs[1] || 0
      return [a ^ b, a & b]  // [S, C]
    }
  },
  FULLADDER: {
    name: '全加器',
    inputs: 3,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#ff9933',
    label: 'FA',
    evaluate: (inputs) => {
      const a = inputs[0] || 0
      const b = inputs[1] || 0
      const cin = inputs[2] || 0
      return [a ^ b ^ cin, (a & b) | (cin & (a ^ b))]  // [S, Cout]
    }
  },
  MUX2: {
    name: '2选1多路器',
    inputs: 3,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#ff9933',
    label: 'MUX2',
    portLabels: { inputs: ['A', 'B', 'S'], outputs: ['Y'] },
    evaluate: (inputs) => {
      const a = inputs[0] || 0
      const b = inputs[1] || 0
      const sel = inputs[2] || 0
      return [sel ? b : a]
    }
  },
  MUX4: {
    name: '4选1多路器',
    inputs: 6,
    outputs: 1,
    width: 90,
    height: 100,
    color: '#ff9933',
    label: 'MUX4',
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'S0', 'S1'], outputs: ['Y'] },
    evaluate: (inputs) => {
      const a = inputs[0] || 0
      const b = inputs[1] || 0
      const c = inputs[2] || 0
      const d = inputs[3] || 0
      const s0 = inputs[4] || 0
      const s1 = inputs[5] || 0
      let out = a
      if (!s1 && !s0) out = a
      else if (!s1 && s0) out = b
      else if (s1 && !s0) out = c
      else out = d
      return [out]
    }
  },
  DEMUX2: {
    name: '1转2解复用器',
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 60,
    color: '#ff9933',
    label: 'DMUX2',
    portLabels: { inputs: ['D', 'S'], outputs: ['Y0', 'Y1'] },
    evaluate: (inputs) => {
      const inp = inputs[0] || 0
      const sel = inputs[1] || 0
      return [sel ? 0 : inp, sel ? inp : 0]
    }
  },
  // ==================== 触发器类 ====================
  JKFF: {
    name: 'JK触发器',
    inputs: 3,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#33cc99',
    label: 'JKFF',
    isMemory: true,
    state: 0,
    lastClock: 0,
    portLabels: { inputs: ['J', 'CLK', 'K'], outputs: ['Q', 'Q̄'] }
  },
  TFF: {
    name: 'T触发器',
    inputs: 2,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#33cc99',
    label: 'TFF',
    isMemory: true,
    state: 0,
    lastClock: 0,
    portLabels: { inputs: ['T', 'CLK'], outputs: ['Q', 'Q̄'] }
  },
  SRFF: {
    name: 'SR触发器',
    inputs: 3,
    outputs: 2,
    width: 80,
    height: 80,
    color: '#33cc99',
    label: 'SRFF',
    isMemory: true,
    state: 0,
    lastClock: 0,
    portLabels: { inputs: ['S', 'CLK', 'R'], outputs: ['Q', 'Q̄'] }
  },

  // ==================== 译码编码类 ====================
  DEC38: {
    name: '3-to-8译码器',
    inputs: 3,
    outputs: 8,
    width: 80,
    height: 140,
    color: '#cc9933',
    label: 'DEC38',
    portLabels: { inputs: ['A0', 'A1', 'A2'], outputs: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'] },
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
    color: '#cc9933',
    label: 'DEC24',
    portLabels: { inputs: ['A0', 'A1'], outputs: ['Y0', 'Y1', 'Y2', 'Y3'] },
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
    color: '#cc9933',
    label: 'ENC42',
    portLabels: { inputs: ['I0', 'I1', 'I2', 'I3'], outputs: ['A0', 'A1', 'VALID'] },
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
    color: '#00cccc',
    label: 'CNT4',
    isMemory: true,
    state: 0,
    lastClock: 0,
    portLabels: { inputs: ['UP/DOWN', 'CLK', 'RST'], outputs: ['Q0', 'Q1', 'Q2', 'Q3'] }
  },
  RING4: {
    name: '环形计数器',
    inputs: 2,
    outputs: 4,
    width: 80,
    height: 100,
    color: '#00cccc',
    label: 'RING',
    isMemory: true,
    state: 1,  // 初始状态 0001
    lastClock: 0,
    portLabels: { inputs: ['CLK', 'RST'], outputs: ['Q0', 'Q1', 'Q2', 'Q3'] }
  },

  // ==================== 运算器类 ====================
  ALU4: {
    name: '4位ALU',
    inputs: 12,
    outputs: 6,
    width: 100,
    height: 180,
    color: '#ff9933',
    label: 'ALU4',
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'S0', 'S1', 'S2', 'CIN'], outputs: ['F0', 'F1', 'F2', 'F3', 'COUT', 'ZERO'] },
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
    color: '#ff9933',
    label: '+/-4',
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'MODE'], outputs: ['S0', 'S1', 'S2', 'S3', 'COUT'] },
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
    color: '#ff9933',
    label: 'CMP4',
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3'], outputs: ['GT', 'EQ', 'LT'] },
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
    color: '#ff9933',
    label: 'SHFT',
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'S0', 'S1', 'DIR'], outputs: ['Q0', 'Q1', 'Q2', 'Q3'] },
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
    color: '#9966cc',
    label: 'REG4',
    isMemory: true,
    state: 0,
    lastClock: 0,
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'CLK', 'LOAD'], outputs: ['Q0', 'Q1', 'Q2', 'Q3'] }
  },
  RAM164: {
    name: '16x4 RAM',
    inputs: 10,
    outputs: 4,
    width: 100,
    height: 140,
    color: '#9966cc',
    label: 'RAM16',
    isMemory: true,
    state: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    lastClock: 0,
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'A0', 'A1', 'A2', 'A3', 'WE', 'CLK'], outputs: ['Q0', 'Q1', 'Q2', 'Q3'] }
  },
  ROM164: {
    name: '16x4 ROM',
    inputs: 4,
    outputs: 4,
    width: 100,
    height: 140,
    color: '#9966cc',
    label: 'ROM16',
    isMemory: true,
    state: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    isROM: true,
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3'], outputs: ['Q0', 'Q1', 'Q2', 'Q3'] }
  },

  // ==================== 总线类 ====================
  TRISTATE: {
    name: '三态缓冲器',
    inputs: 2,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#6699aa',
    label: 'TRI',
    portLabels: { inputs: ['A', 'EN'], outputs: ['Y'] },
    evaluate: (inputs) => [(inputs[1] || 0) ? (inputs[0] || 0) : 0]
  },
  BUSSWITCH: {
    name: '总线开关',
    inputs: 5,
    outputs: 4,
    width: 80,
    height: 80,
    color: '#6699aa',
    label: 'BUS',
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'EN'], outputs: ['B0', 'B1', 'B2', 'B3'] },
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
    color: '#666666',
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
    color: '#3399cc',
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
    color: '#3399cc',
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
    color: '#3399cc',
    label: 'DOT',
    isOutput: true,
    isDotMatrix: true,
    charROM: null,
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3'], outputs: [] }
  },
  LCD1602: {
    name: '1602液晶屏',
    inputs: 10,
    outputs: 0,
    width: 320,
    height: 100,
    color: '#3399cc',
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
    color: '#cc6699',
    label: 'DIV',
    isMemory: true,
    state: {
      output: 0,
      counter: 0
    },
    lastClock: 0,
    divideBy: 2,
    portLabels: { inputs: ['CLK', 'RST'], outputs: ['OUT'] }
  },

  // ==================== 分支节点 ====================
  TJUNCTION: {
    name: 'T型分支',
    inputs: 1,
    outputs: 2,
    width: 30,
    height: 30,
    color: '#888888',
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
    color: '#888888',
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
    color: '#663399',
    label: 'CPU',
    isCPU: true,
    isMemory: true,
    state: {
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
    },
    ioOutputs: {},
    lastClock: 0,
    portLabels: { inputs: ['CLK', 'RST', 'INT'], outputs: ['IO_WR', 'ADDR', 'DATA', 'HALT'] }
  },
  ROM256: {
    name: '256x16 程序ROM',
    inputs: 8,
    outputs: 16,
    width: 120,
    height: 180,
    color: '#663399',
    label: 'PROM',
    isMemory: true,
    isProgramROM: true,
    state: Array(256).fill(0),
    isROM: true,
    assemblySource: '',
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7'], outputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15'] }
  },
  INSTRUCTION_EXECUTOR: {
    name: '指令执行器',
    inputs: 16,
    outputs: 20,
    width: 140,
    height: 240,
    color: '#663399',
    label: 'EXEC',
    isMemory: true,
    isInstructionExecutor: true,
    state: {
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
    },
    lastClock: 0,
    ioOutputs: {},
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15'], outputs: [] }
  },

  // === I/O 桥接组件 ===
  IO_BRIDGE: {
    name: 'I/O桥接器',
    inputs: 2,
    outputs: 5,
    width: 150,
    height: 160,
    color: '#996633',
    label: 'IOBRIDGE',
    isIOBridge: true,
    state: {
      transferCount: 0,
      lastActivity: null,
      activePorts: [],
      lastData: {},
      lastClk: 0
    },
    portLabels: { inputs: ['CLK', 'RST'], outputs: [] }
  },

  EXT_RAM: {
    name: '256x8 外部RAM',
    inputs: 10,
    outputs: 8,
    width: 140,
    height: 200,
    color: '#996633',
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
    },
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'WE', 'CLK'], outputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'] }
  },

  IO_PORT: {
    name: '通用I/O端口',
    inputs: 8,
    outputs: 8,
    width: 100,
    height: 200,
    color: '#996633',
    label: 'IOPORT',
    isIoPort: true,
    portConfig: {
      portNumber: 0x90
    },
    state: {
      outputReg: 0,
      inputReg: 0,
      lastWrittenValue: 0
    },
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'], outputs: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'] }
  },

  TIMER: {
    name: '定时器',
    inputs: 1,
    outputs: 1,
    width: 100,
    height: 80,
    color: '#996633',
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
    },
    portLabels: { inputs: ['CLK'], outputs: ['IRQ'] }
  },

  // ==================== 扩展电源元件 ====================
  GND: {
    name: '接地',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#ff3333',
    label: 'GND',
    isInput: true,
    state: 0,
    isConstant: true,
    isPower: true
  },
  VCC: {
    name: '电源(5V)',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#ff3333',
    label: 'VCC',
    isInput: true,
    state: 1,
    isConstant: true,
    isPower: true
  },
  PULLUP: {
    name: '上拉电阻',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#ff3333',
    label: 'PU',
    isInput: true,
    state: 1,
    isConstant: true,
    isPower: true,
    isPullResistor: true
  },
  PULLDOWN: {
    name: '下拉电阻',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 40,
    color: '#ff3333',
    label: 'PD',
    isInput: true,
    state: 0,
    isConstant: true,
    isPower: true,
    isPullResistor: true
  },

  // ==================== 4输入逻辑门 ====================
  AND4: {
    name: '4输入与门',
    inputs: 4,
    outputs: 1,
    width: 80,
    height: 100,
    color: '#4a9eff',
    label: 'AND4',
    evaluate: (inputs) => [(inputs[0] || 0) & (inputs[1] || 0) & (inputs[2] || 0) & (inputs[3] || 0)]
  },
  OR4: {
    name: '4输入或门',
    inputs: 4,
    outputs: 1,
    width: 80,
    height: 100,
    color: '#4a9eff',
    label: 'OR4',
    evaluate: (inputs) => [(inputs[0] || 0) | (inputs[1] || 0) | (inputs[2] || 0) | (inputs[3] || 0)]
  },
  NAND4: {
    name: '4输入与非门',
    inputs: 4,
    outputs: 1,
    width: 80,
    height: 100,
    color: '#4a9eff',
    label: 'NAND4',
    evaluate: (inputs) => [1 - ((inputs[0] || 0) & (inputs[1] || 0) & (inputs[2] || 0) & (inputs[3] || 0))]
  },
  NOR4: {
    name: '4输入或非门',
    inputs: 4,
    outputs: 1,
    width: 80,
    height: 100,
    color: '#4a9eff',
    label: 'NOR4',
    evaluate: (inputs) => [1 - ((inputs[0] || 0) | (inputs[1] || 0) | (inputs[2] || 0) | (inputs[3] || 0))]
  },

  // ==================== 扩展输入元件 ====================
  BUTTON: {
    name: '按键(瞬时)',
    inputs: 0,
    outputs: 1,
    width: 60,
    height: 60,
    color: '#99cc33',
    label: 'BTN',
    isInput: true,
    state: 0,
    isButton: true,
    pulseTicks: 0
  },
  DIPSW4: {
    name: '4位拨码开关',
    inputs: 0,
    outputs: 4,
    width: 100,
    height: 100,
    color: '#99cc33',
    label: 'DIP4',
    isInput: true,
    state: [0, 0, 0, 0],
    isDipSwitch: true
  },

  // ==================== 总线显示元件 ====================
  BUS4: {
    name: '4位总线显示',
    inputs: 4,
    outputs: 0,
    width: 100,
    height: 60,
    color: '#6699aa',
    label: 'BUS4',
    isOutput: true,
    isBusDisplay: true,
    busWidth: 4,
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3'], outputs: [] }
  },
  BUS8: {
    name: '8位总线显示',
    inputs: 8,
    outputs: 0,
    width: 120,
    height: 60,
    color: '#6699aa',
    label: 'BUS8',
    isOutput: true,
    isBusDisplay: true,
    busWidth: 8,
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'], outputs: [] }
  },

  // ==================== BCD译码与七段显示 ====================
  BCD7SEG: {
    name: 'BCD-七段译码器',
    inputs: 4,
    outputs: 7,
    width: 80,
    height: 100,
    color: '#cc9933',
    label: 'BCD7',
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3'], outputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] },
    evaluate: (inputs) => {
      const v = (inputs[0] || 0) + ((inputs[1] || 0) << 1) + ((inputs[2] || 0) << 2) + ((inputs[3] || 0) << 3)
      // 标准七段编码 [a,b,c,d,e,f,g]，共阴高电平点亮
      const seg = [
        [1, 1, 1, 1, 1, 1, 0], // 0
        [0, 1, 1, 0, 0, 0, 0], // 1
        [1, 1, 0, 1, 1, 0, 1], // 2
        [1, 1, 1, 1, 0, 0, 1], // 3
        [0, 1, 1, 0, 0, 1, 1], // 4
        [1, 0, 1, 1, 0, 1, 1], // 5
        [1, 0, 1, 1, 1, 1, 1], // 6
        [1, 1, 1, 0, 0, 0, 0], // 7
        [1, 1, 1, 1, 1, 1, 1], // 8
        [1, 1, 1, 1, 0, 1, 1], // 9
        [1, 1, 1, 0, 1, 1, 1], // A
        [0, 0, 1, 1, 1, 1, 1], // b
        [1, 0, 0, 1, 1, 1, 0], // C
        [0, 1, 1, 1, 1, 0, 1], // d
        [1, 0, 0, 1, 1, 1, 1], // E
        [1, 0, 0, 0, 1, 1, 1]  // F
      ]
      return seg[v & 0xF] || [0, 0, 0, 0, 0, 0, 0]
    }
  },
  SEG7CC: {
    name: '七段数码管(共阴)',
    inputs: 7,
    outputs: 0,
    width: 80,
    height: 100,
    color: '#3399cc',
    label: '7CC',
    isOutput: true,
    isSegDisplay7: true,
    segType: 'CC',
    portLabels: { inputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], outputs: [] }
  },
  SEG7CA: {
    name: '七段数码管(共阳)',
    inputs: 7,
    outputs: 0,
    width: 80,
    height: 100,
    color: '#3399cc',
    label: '7CA',
    isOutput: true,
    isSegDisplay7: true,
    segType: 'CA',
    portLabels: { inputs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], outputs: [] }
  },

  // ==================== 8位系列元件 ====================
  REG8: {
    name: '8位寄存器',
    inputs: 10,
    outputs: 8,
    width: 140,
    height: 220,
    color: '#9966cc',
    label: 'REG8',
    isMemory: true,
    state: 0,
    lastClock: 0,
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'CLK', 'LOAD'], outputs: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'] }
  },
  SHIFT_REG8: {
    name: '8位移位寄存器',
    inputs: 11,
    outputs: 8,
    width: 140,
    height: 240,
    color: '#9966cc',
    label: 'SREG8',
    isMemory: true,
    state: 0,
    lastClock: 0,
    portLabels: { inputs: ['DIN', 'CLK', 'RST', 'S0', 'S1', 'MODE', 'D0', 'D1', 'D2', 'D3', 'D4'], outputs: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'] }
  },
  COUNTER8: {
    name: '8位计数器',
    inputs: 3,
    outputs: 8,
    width: 140,
    height: 200,
    color: '#00cccc',
    label: 'CNT8',
    isMemory: true,
    state: 0,
    lastClock: 0,
    portLabels: { inputs: ['UP/DOWN', 'CLK', 'RST'], outputs: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'] }
  },
  ALU8: {
    name: '8位ALU',
    inputs: 19,
    outputs: 10,
    width: 160,
    height: 280,
    color: '#ff9933',
    label: 'ALU8',
    isMemory: false,
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'op0', 'op1', 'op2'], outputs: ['R0', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'Carry', 'Zero'] },
    evaluate: (inputs) => {
      let a = 0, b = 0
      for (let i = 0; i < 8; i++) { a |= (inputs[i] || 0) << i; b |= (inputs[i + 8] || 0) << (i) }
      const op = (inputs[16] || 0) | ((inputs[17] || 0) << 1) | ((inputs[18] || 0) << 2)
      let result = 0, carry = 0, zero = 0
      switch (op) {
        case 0: result = a & b; break
        case 1: result = a | b; break
        case 2: result = a ^ b; break
        case 3: result = (~a) & 0xFF; break
        case 4: { const r = a + b; result = r & 0xFF; carry = r > 255 ? 1 : 0; break }
        case 5: { const r = a - b; result = r & 0xFF; carry = r < 0 ? 1 : 0; break }
        case 6: result = (a << 1) & 0xFF; break
        case 7: result = a >> 1; break
      }
      zero = result === 0 ? 1 : 0
      const outs = []
      for (let i = 0; i < 8; i++) outs.push((result >> i) & 1)
      outs.push(carry)
      outs.push(zero)
      return outs
    }
  },
  ADD8: {
    name: '8位加法器',
    inputs: 17,
    outputs: 9,
    width: 140,
    height: 220,
    color: '#ff9933',
    label: 'ADD8',
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'CIN'], outputs: ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'COUT'] },
    evaluate: (inputs) => {
      let a = 0, b = 0
      for (let i = 0; i < 8; i++) { a |= (inputs[i] || 0) << i; b |= (inputs[i + 8] || 0) << i }
      const cin = inputs[16] || 0
      const r = a + b + cin
      const outs = []
      for (let i = 0; i < 8; i++) outs.push((r >> i) & 1)
      outs.push(r > 255 ? 1 : 0)
      return outs
    }
  },
  COMP8: {
    name: '8位比较器',
    inputs: 16,
    outputs: 3,
    width: 140,
    height: 220,
    color: '#ff9933',
    label: 'CMP8',
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7'], outputs: ['LT', 'EQ', 'GT'] },
    evaluate: (inputs) => {
      let a = 0, b = 0
      for (let i = 0; i < 8; i++) { a |= (inputs[i] || 0) << i; b |= (inputs[i + 8] || 0) << i }
      return [a < b ? 1 : 0, a === b ? 1 : 0, a > b ? 1 : 0]
    }
  },
  MUX8: {
    name: '8选1选择器',
    inputs: 11,
    outputs: 1,
    width: 120,
    height: 220,
    color: '#ff9933',
    label: 'MUX8',
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'S0', 'S1', 'S2'], outputs: ['Y'] },
    evaluate: (inputs) => {
      const sel = (inputs[8] || 0) | ((inputs[9] || 0) << 1) | ((inputs[10] || 0) << 2)
      return [inputs[sel] || 0]
    }
  },
  DEMUX8: {
    name: '1转8分配器',
    inputs: 4,
    outputs: 8,
    width: 120,
    height: 200,
    color: '#ff9933',
    label: 'DMX8',
    portLabels: { inputs: ['D', 'S0', 'S1', 'S2'], outputs: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7'] },
    evaluate: (inputs) => {
      const data = inputs[0] || 0
      const sel = (inputs[1] || 0) | ((inputs[2] || 0) << 1) | ((inputs[3] || 0) << 2)
      const outs = [0, 0, 0, 0, 0, 0, 0, 0]
      outs[sel] = data
      return outs
    }
  },
  DEC4_16: {
    name: '4-16译码器',
    inputs: 4,
    outputs: 16,
    width: 120,
    height: 280,
    color: '#cc9933',
    label: 'DEC16',
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3'], outputs: ['Y0', 'Y1', 'Y2', 'Y3', 'Y4', 'Y5', 'Y6', 'Y7', 'Y8', 'Y9', 'Y10', 'Y11', 'Y12', 'Y13', 'Y14', 'Y15'] },
    evaluate: (inputs) => {
      const sel = (inputs[0] || 0) | ((inputs[1] || 0) << 1) | ((inputs[2] || 0) << 2) | ((inputs[3] || 0) << 3)
      const outs = new Array(16).fill(0)
      outs[sel] = 1
      return outs
    }
  },
  ENC8_3: {
    name: '8-3优先编码器',
    inputs: 8,
    outputs: 3,
    width: 120,
    height: 200,
    color: '#cc9933',
    label: 'ENC83',
    portLabels: { inputs: ['I0', 'I1', 'I2', 'I3', 'I4', 'I5', 'I6', 'I7'], outputs: ['A0', 'A1', 'A2'] },
    evaluate: (inputs) => {
      let priority = -1
      for (let i = 7; i >= 0; i--) {
        if (inputs[i]) { priority = i; break }
      }
      if (priority < 0) return [0, 0, 0]
      return [(priority >> 0) & 1, (priority >> 1) & 1, (priority >> 2) & 1]
    }
  },

  // ==================== 接口元件 ====================
  SCHMITT: {
    name: '施密特触发器',
    inputs: 1,
    outputs: 1,
    width: 70,
    height: 50,
    color: '#4a9eff',
    label: 'SCH',
    isMemory: true,
    state: 0,
    evaluate: (inputs) => {
      // 施密特触发器带迟滞：输入>0.7→1，输入<0.3→0，中间保持
      // 二值化下简化为：1→1，0→0，但通过 state 保持迟滞
      return [inputs[0] || 0]
    }
  },
  OSCILLATOR: {
    name: '独立振荡器',
    inputs: 0,
    outputs: 1,
    width: 80,
    height: 60,
    color: '#cc6699',
    label: 'OSC',
    isInput: true,
    state: 0,
    frequency: 2,
    dutyCycle: 50,
    phase: 0,
    enabled: true,
    waveformHistory: new Array(64).fill(0),
    portLabels: { inputs: [], outputs: ['OUT'] },
    evaluate: (inputs, state) => [state || 0]
  },
  TRI_BUFFER_8: {
    name: '8位三态缓冲器',
    inputs: 9,
    outputs: 8,
    width: 100,
    height: 200,
    color: '#6699aa',
    label: '3BUF8',
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'EN'], outputs: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'] },
    evaluate: (inputs) => {
      const en = inputs[8] || 0
      if (en) {
        return [inputs[0] || 0, inputs[1] || 0, inputs[2] || 0, inputs[3] || 0, inputs[4] || 0, inputs[5] || 0, inputs[6] || 0, inputs[7] || 0]
      }
      return [0, 0, 0, 0, 0, 0, 0, 0]
    }
  },
  BUS_TRANSCEIVER: {
    name: '8位总线收发器',
    inputs: 18,
    outputs: 16,
    width: 140,
    height: 240,
    color: '#6699aa',
    label: 'XCVR',
    portLabels: { inputs: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'B0', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'DIR', 'EN'], outputs: ['XA0', 'XA1', 'XA2', 'XA3', 'XA4', 'XA5', 'XA6', 'XA7', 'XB0', 'XB1', 'XB2', 'XB3', 'XB4', 'XB5', 'XB6', 'XB7'] },
    evaluate: (inputs) => {
      const dir = inputs[16] || 0
      const en = inputs[17] || 0
      const outs = new Array(16).fill(0)
      if (!en) return outs
      if (dir === 0) {
        // A→B
        for (let i = 0; i < 8; i++) outs[i + 8] = inputs[i] || 0
      } else {
        // B→A
        for (let i = 0; i < 8; i++) outs[i] = inputs[i + 8] || 0
      }
      return outs
    }
  },
  LATCH_8: {
    name: '8位透明锁存器',
    inputs: 9,
    outputs: 8,
    width: 140,
    height: 200,
    color: '#9966cc',
    label: 'LAT8',
    isMemory: true,
    state: 0,
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'EN'], outputs: ['Q0', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7'] }
  },

  // ==================== 显示交互元件 ====================
  HEXDISPLAY: {
    name: '双十六进制显示',
    inputs: 8,
    outputs: 0,
    width: 100,
    height: 80,
    color: '#3399cc',
    label: 'HEX',
    isOutput: true,
    isHexDisplay: true,
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'], outputs: [] }
  },
  ASCII_DISPLAY: {
    name: 'ASCII字符显示',
    inputs: 7,
    outputs: 0,
    width: 80,
    height: 80,
    color: '#3399cc',
    label: 'ASCII',
    isOutput: true,
    isAsciiDisplay: true,
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'], outputs: [] }
  },
  LED_BAR8: {
    name: '8路LED条',
    inputs: 8,
    outputs: 0,
    width: 60,
    height: 200,
    color: '#3399cc',
    label: 'BAR8',
    isOutput: true,
    isLedBar: true,
    portLabels: { inputs: ['D0', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'], outputs: [] }
  },
  SCOPE: {
    name: '示波器',
    inputs: 1,
    outputs: 0,
    width: 200,
    height: 120,
    color: '#3399cc',
    label: 'SCOPE',
    isOutput: true,
    isScope: true,
    state: { history: new Array(128).fill(0) },
    portLabels: { inputs: ['IN'], outputs: [] }
  },
  KEYPAD_4x4: {
    name: '4x4矩阵键盘',
    inputs: 4,
    outputs: 4,
    width: 140,
    height: 140,
    color: '#99cc33',
    label: 'KEY',
    isInput: true,
    isKeypad: true,
    state: { pressed: -1, scanRow: 0 },
    portLabels: { inputs: ['R0', 'R1', 'R2', 'R3'], outputs: ['C0', 'C1', 'C2', 'C3'] },
    evaluate: (inputs) => {
      // 扫描行输入，输出列
      let rowActive = -1
      for (let i = 0; i < 4; i++) { if (inputs[i]) { rowActive = i; break } }
      if (rowActive < 0) return [0, 0, 0, 0]
      // 简化：返回当前行的按键状态（实际需配合扫描码）
      return [0, 0, 0, 0]
    }
  },

  // ==================== 高级元件 ====================
  ROM32K: {
    name: '32KB ROM',
    inputs: 15,
    outputs: 8,
    width: 140,
    height: 240,
    color: '#9966cc',
    label: 'ROM32K',
    isMemory: true,
    isROM: true,
    state: new Array(32768).fill(0),
    assemblySource: ''
  },
  SRAM32K: {
    name: '32KB SRAM',
    inputs: 25,
    outputs: 8,
    width: 160,
    height: 280,
    color: '#9966cc',
    label: 'SRAM',
    isMemory: true,
    state: {
      memory: new Array(32768).fill(0),
      addressReg: 0,
      dataReg: 0,
      lastClock: 0
    },
    lastClock: 0
  },
  UART: {
    name: 'UART串口',
    inputs: 3,
    outputs: 2,
    width: 120,
    height: 120,
    color: '#996633',
    label: 'UART',
    isMemory: true,
    state: {
      txBuffer: [],
      rxBuffer: [],
      txReg: 0,
      rxReg: 0,
      txBusy: false,
      rxReady: false,
      baudDiv: 8,
      bitCount: 0,
      lastClk: 0
    },
    lastClock: 0,
    portLabels: { inputs: ['TX_DATA', 'CLK', 'RX'], outputs: ['TX', 'RX_READY'] }
  },
  PWM_GENERATOR: {
    name: 'PWM发生器',
    inputs: 2,
    outputs: 1,
    width: 100,
    height: 80,
    color: '#cc6699',
    label: 'PWM',
    isMemory: true,
    state: { counter: 0, output: 0 },
    frequency: 4,
    dutyCycle: 50,
    lastClock: 0,
    portLabels: { inputs: ['DUTY', 'CLK'], outputs: ['OUT'] }
  }
}

export let CATEGORIES = [
  {
    name: '逻辑门',
    icon: '🔌',
    components: ['AND', 'AND3', 'AND4', 'OR', 'OR3', 'OR4', 'NOT', 'BUFFER', 'NAND', 'NAND4', 'NOR', 'NOR4', 'XOR', 'XNOR', 'SCHMITT']
  },
  {
    name: '输入输出',
    icon: '🎮',
    components: ['SWITCH', 'BUTTON', 'DIPSW4', 'CONST0', 'CONST1', 'LED', 'SEGDISPLAY1', 'SEGDISPLAY8', 'SEG7CC', 'SEG7CA', 'DOTMATRIX16', 'LCD1602', 'HEXDISPLAY', 'ASCII_DISPLAY', 'LED_BAR8', 'SCOPE', 'KEYPAD_4x4']
  },
  {
    name: '电源',
    icon: '⚡',
    components: ['GND', 'VCC', 'PULLUP', 'PULLDOWN']
  },
  {
    name: '触发器',
    icon: '🔄',
    components: ['DFF', 'DLATCH', 'JKFF', 'TFF', 'SRFF']
  },
  {
    name: '译码编码',
    icon: '🔢',
    components: ['DEC38', 'DEC24', 'ENC42', 'BCD7SEG', 'DEC4_16', 'ENC8_3']
  },
  {
    name: '计数器',
    icon: '⏱️',
    components: ['COUNTER4', 'RING4', 'COUNTER8']
  },
  {
    name: '运算器',
    icon: '🧮',
    components: ['HALFADDER', 'FULLADDER', 'MUX2', 'MUX4', 'DEMUX2', 'ALU4', 'ADDSUB4', 'COMP4', 'SHIFT4', 'ALU8', 'ADD8', 'COMP8', 'MUX8', 'DEMUX8']
  },
  {
    name: '存储器',
    icon: '💾',
    components: ['REG4', 'RAM164', 'ROM164', 'REG8', 'SHIFT_REG8', 'LATCH_8', 'ROM32K', 'SRAM32K']
  },
  {
    name: '总线',
    icon: '🔗',
    components: ['TRISTATE', 'BUSSWITCH', 'BUS4', 'BUS8', 'TRI_BUFFER_8', 'BUS_TRANSCEIVER']
  },
  {
    name: '时钟控制',
    icon: '⏰',
    components: ['CLOCK', 'CLOCKDIVIDER', 'OSCILLATOR', 'PWM_GENERATOR']
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
    components: ['IO_BRIDGE', 'EXT_RAM', 'IO_PORT', 'TIMER', 'UART']
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
