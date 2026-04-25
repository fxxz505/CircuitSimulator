export const COMPONENT_DETAILS = {
  AND: {
    name: '与门 (AND Gate)',
    description: '当所有输入都为高电平(1)时，输出为高电平(1)，否则输出为低电平(0)。',
    truthTable: [
      { inputs: [0, 0], output: [0] },
      { inputs: [0, 1], output: [0] },
      { inputs: [1, 0], output: [0] },
      { inputs: [1, 1], output: [1] }
    ],
    expression: 'Y = A · B',
    timingDiagram: 'A: ──┐   ┌───┐   ┌──\nB: ────┐   ┌───┐   ┌─\nY: ────┘   └───┘   └─',
    example: '用于检测多个条件是否同时满足。例如：只有当两个开关都打开时，LED才亮起。',
    pins: ['A: 输入A', 'B: 输入B', 'Y: 输出']
  },
  OR: {
    name: '或门 (OR Gate)',
    description: '当任一输入为高电平(1)时，输出为高电平(1)，否则输出为低电平(0)。',
    truthTable: [
      { inputs: [0, 0], output: [0] },
      { inputs: [0, 1], output: [1] },
      { inputs: [1, 0], output: [1] },
      { inputs: [1, 1], output: [1] }
    ],
    expression: 'Y = A + B',
    timingDiagram: 'A: ──┐   ┌───┐   ┌──\nB: ────┐   ┌───┐   ┌─\nY: ──┐   ┌─────┐   ┌─',
    example: '用于检测多个条件中是否有任意一个满足。例如：任一开关打开时，LED亮起。',
    pins: ['A: 输入A', 'B: 输入B', 'Y: 输出']
  },
  NOT: {
    name: '非门 (NOT Gate / Inverter)',
    description: '输出为输入的反相值。输入为1时输出0，输入为0时输出1。',
    truthTable: [
      { inputs: [0], output: [1] },
      { inputs: [1], output: [0] }
    ],
    expression: 'Y = ¬A',
    timingDiagram: 'A: ──┐   ┌───┐   ┌──\nY: ──└───┘   └───┘',
    example: '用于信号反相。例如：开关关闭时LED亮起，开关打开时LED熄灭。',
    pins: ['A: 输入', 'Y: 输出(反相)']
  },
  NAND: {
    name: '与非门 (NAND Gate)',
    description: '与门的反相输出。当所有输入都为1时输出0，否则输出1。是功能完备的门，可以构建任何逻辑电路。',
    truthTable: [
      { inputs: [0, 0], output: [1] },
      { inputs: [0, 1], output: [1] },
      { inputs: [1, 0], output: [1] },
      { inputs: [1, 1], output: [0] }
    ],
    expression: 'Y = ¬(A · B)',
    timingDiagram: 'A: ──┐   ┌───┐   ┌──\nB: ────┐   ┌───┐   ┌─\nY: ──┐   └───┘   └─',
    example: 'NAND门是通用门，可以用它构建AND、OR、NOT等所有其他逻辑门。',
    pins: ['A: 输入A', 'B: 输入B', 'Y: 输出']
  },
  NOR: {
    name: '或非门 (NOR Gate)',
    description: '或门的反相输出。当所有输入都为0时输出1，否则输出0。也是功能完备的门。',
    truthTable: [
      { inputs: [0, 0], output: [1] },
      { inputs: [0, 1], output: [0] },
      { inputs: [1, 0], output: [0] },
      { inputs: [1, 1], output: [0] }
    ],
    expression: 'Y = ¬(A + B)',
    timingDiagram: 'A: ──┐   ┌───┐   ┌──\nB: ────┐   ┌───┐   ┌─\nY: ──┘   └───┘   └─',
    example: 'NOR门也是通用门，常用于SR锁存器等存储电路的构建。',
    pins: ['A: 输入A', 'B: 输入B', 'Y: 输出']
  },
  XOR: {
    name: '异或门 (XOR Gate)',
    description: '当两个输入不同时输出1，相同时输出0。常用于比较器和加法器。',
    truthTable: [
      { inputs: [0, 0], output: [0] },
      { inputs: [0, 1], output: [1] },
      { inputs: [1, 0], output: [1] },
      { inputs: [1, 1], output: [0] }
    ],
    expression: 'Y = A ⊕ B',
    timingDiagram: 'A: ──┐   ┌───┐   ┌──\nB: ────┐   ┌───┐   ┌─\nY: ──┐   └───┘   └─',
    example: '用于半加器的和位计算、奇偶校验、数据比较等场景。',
    pins: ['A: 输入A', 'B: 输入B', 'Y: 输出']
  },
  XNOR: {
    name: '同或门 (XNOR Gate)',
    description: '当两个输入相同时输出1，不同时输出0。是XOR的反相。',
    truthTable: [
      { inputs: [0, 0], output: [1] },
      { inputs: [0, 1], output: [0] },
      { inputs: [1, 0], output: [0] },
      { inputs: [1, 1], output: [1] }
    ],
    expression: 'Y = ¬(A ⊕ B)',
    timingDiagram: 'A: ──┐   ┌───┐   ┌──\nB: ────┐   ┌───┐   ┌─\nY: ──┘   ┌───┐   ┌─',
    example: '用于相等检测、奇偶校验等场景。',
    pins: ['A: 输入A', 'B: 输入B', 'Y: 输出']
  },
  DFF: {
    name: 'D触发器 (D Flip-Flop)',
    description: '在时钟上升沿捕获D输入的值并保持到下一个时钟沿。是最基本的存储元件。',
    truthTable: [
      { inputs: [0, 0], output: [0, 1] },
      { inputs: [1, 0], output: [1, 0] },
      { inputs: [0, 1], output: [0, 1] },
      { inputs: [1, 1], output: [1, 0] }
    ],
    expression: 'Q(n+1) = D (在CLK上升沿)',
    timingDiagram: 'CLK: ─┐ ┌─┐ ┌─┐ ┌─\nD:   ──┐   ┌───┐   ┌─\nQ:   ────┐   ┌───┐   ┌',
    example: '用于构建寄存器、计数器、状态机等时序电路。',
    pins: ['D: 数据输入', 'CLK: 时钟输入', 'Q: 输出', 'Q̄: 反相输出']
  },
  SWITCH: {
    name: '开关 (Toggle Switch)',
    description: '手动控制的输入源，点击可切换0/1状态。用于模拟外部输入信号。',
    truthTable: [],
    expression: '手动控制',
    timingDiagram: 'SW: ──┐   ┌───┐   ┌──',
    example: '作为电路的输入信号源，模拟按钮、传感器等外部输入。',
    pins: ['OUT: 输出(0或1)']
  },
  LED: {
    name: 'LED指示灯',
    description: '输出显示组件，输入为1时亮起(绿色发光)，为0时熄灭。用于观察电路输出状态。',
    truthTable: [],
    expression: '显示输入值',
    timingDiagram: 'IN: ──┐   ┌───┐   ┌──\nLED: ●   ○   ●   ○',
    example: '用于显示电路输出状态，是最常用的调试和观察工具。',
    pins: ['IN: 输入']
  },
  CLOCK: {
    name: '时钟信号发生器 (Clock)',
    description: '产生周期性的高低电平交替信号，为时序电路提供时钟驱动。可配置频率、占空比和相位。',
    truthTable: [],
    expression: '周期性方波',
    timingDiagram: 'CLK: ┐ ┌─┐ ┌─┐ ┌─┐ ┌─\n     └─┘ └─┘ └─┘ └─┘',
    example: '为触发器、计数器、CPU等时序组件提供时钟信号。',
    pins: ['OUT: 时钟输出']
  },
  MUX2: {
    name: '2选1多路选择器 (2-to-1 Multiplexer)',
    description: '根据选择信号S从两个输入中选择一个输出。S=0时输出I0，S=1时输出I1。',
    truthTable: [
      { inputs: [0, 0, 0], output: [0] },
      { inputs: [1, 0, 0], output: [1] },
      { inputs: [0, 1, 0], output: [0] },
      { inputs: [1, 1, 0], output: [1] },
      { inputs: [0, 0, 1], output: [0] },
      { inputs: [1, 0, 1], output: [0] },
      { inputs: [0, 1, 1], output: [1] },
      { inputs: [1, 1, 1], output: [1] }
    ],
    expression: 'Y = (¬S · I0) + (S · I1)',
    timingDiagram: 'S: ──┐   ┌───┐   ┌──\nI0:──┐   ┌───┐   ┌──\nI1:────┐   ┌───┐   ┌\nY: ──┐   └───┐   ┌─',
    example: '用于数据选择、总线切换、条件信号路由等场景。',
    pins: ['I0: 输入0', 'I1: 输入1', 'S: 选择信号', 'Y: 输出']
  },
  HALFADDER: {
    name: '半加器 (Half Adder)',
    description: '计算两个1位二进制数的和。S为和位，C为进位。',
    truthTable: [
      { inputs: [0, 0], output: [0, 0] },
      { inputs: [0, 1], output: [1, 0] },
      { inputs: [1, 0], output: [1, 0] },
      { inputs: [1, 1], output: [0, 1] }
    ],
    expression: 'S = A ⊕ B, C = A · B',
    timingDiagram: 'A: ──┐   ┌───┐   ┌──\nB: ────┐   ┌───┐   ┌─\nS: ──┐   └───┐   ┌─\nC: ──────┐   ┌───┐ ─',
    example: '是构建多位加法器的基本单元，用于ALU中的加法运算。',
    pins: ['A: 输入A', 'B: 输入B', 'S: 和(Sum)', 'C: 进位(Carry)']
  },
  FULLADDER: {
    name: '全加器 (Full Adder)',
    description: '计算三个1位二进制数的和（两个加数和一个进位输入）。',
    truthTable: [
      { inputs: [0, 0, 0], output: [0, 0] },
      { inputs: [1, 0, 0], output: [1, 0] },
      { inputs: [0, 1, 0], output: [1, 0] },
      { inputs: [1, 1, 0], output: [0, 1] },
      { inputs: [0, 0, 1], output: [1, 0] },
      { inputs: [1, 0, 1], output: [0, 1] },
      { inputs: [0, 1, 1], output: [0, 1] },
      { inputs: [1, 1, 1], output: [1, 1] }
    ],
    expression: 'S = A ⊕ B ⊕ Cin, Cout = (A·B) + (Cin·(A⊕B))',
    timingDiagram: 'A: ──┐   ┌───┐   ┌──\nB: ────┐   ┌───┐   ┌─\nS: ──┐   └───┐   ┌─\nC: ──────┐   ┌───┐ ─',
    example: '级联多个全加器可以构建多位加法器，是CPU ALU的核心组件。',
    pins: ['A: 输入A', 'B: 输入B', 'Cin: 进位输入', 'S: 和', 'Cout: 进位输出']
  }
}
