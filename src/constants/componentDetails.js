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
  },

  // ==================== 扩展元器件详情 ====================
  AND3: {
    name: '3输入与门 (3-Input AND Gate)',
    description: '三个输入全部为1时输出1，否则输出0。常用于多条件同时判断。',
    truthTable: [],
    expression: 'Y = A · B · C',
    example: '用于3条件同时满足的逻辑判断。',
    pins: ['A: 输入A', 'B: 输入B', 'C: 输入C', 'Y: 输出']
  },
  AND4: {
    name: '4输入与门 (4-Input AND Gate)',
    description: '四个输入全部为1时输出1，否则输出0。',
    truthTable: [],
    expression: 'Y = A · B · C · D',
    example: '用于4位地址译码或多条件判断。',
    pins: ['A: 输入A', 'B: 输入B', 'C: 输入C', 'D: 输入D', 'Y: 输出']
  },
  OR3: {
    name: '3输入或门 (3-Input OR Gate)',
    description: '三个输入中任一为1即输出1。',
    truthTable: [],
    expression: 'Y = A + B + C',
    example: '用于多源中断请求合并。',
    pins: ['A: 输入A', 'B: 输入B', 'C: 输入C', 'Y: 输出']
  },
  OR4: {
    name: '4输入或门 (4-Input OR Gate)',
    description: '四个输入中任一为1即输出1。',
    truthTable: [],
    expression: 'Y = A + B + C + D',
    example: '用于4源中断合并、错误检测等。',
    pins: ['A/B/C/D: 输入', 'Y: 输出']
  },
  NAND4: {
    name: '4输入与非门 (4-Input NAND Gate)',
    description: '4输入与门的反相输出，是通用门。',
    truthTable: [],
    expression: 'Y = ¬(A · B · C · D)',
    example: '用于构建任意逻辑函数。',
    pins: ['A/B/C/D: 输入', 'Y: 输出']
  },
  NOR4: {
    name: '4输入或非门 (4-Input NOR Gate)',
    description: '4输入或门的反相输出，是通用门。',
    truthTable: [],
    expression: 'Y = ¬(A + B + C + D)',
    example: '常用于地址译码、低电平有效片选。',
    pins: ['A/B/C/D: 输入', 'Y: 输出']
  },
  BUFFER: {
    name: '缓冲器 (Buffer)',
    description: '输出等于输入，用于信号驱动增强或隔离。',
    truthTable: [
      { inputs: [0], output: [0] },
      { inputs: [1], output: [1] }
    ],
    expression: 'Y = A',
    example: '用于增加扇出、隔离前后级。',
    pins: ['A: 输入', 'Y: 输出']
  },
  CONST0: {
    name: '常量0 (Constant 0)',
    description: '持续输出低电平0。',
    truthTable: [],
    expression: 'Y = 0',
    example: '用于电路固定接地或禁用信号。',
    pins: ['Y: 输出(0)']
  },
  CONST1: {
    name: '常量1 (Constant 1)',
    description: '持续输出高电平1。',
    truthTable: [],
    expression: 'Y = 1',
    example: '用于使能信号或上拉。',
    pins: ['Y: 输出(1)']
  },
  GND: {
    name: '接地 (Ground)',
    description: '电路参考地电位，持续输出0。',
    truthTable: [],
    expression: 'Y = 0',
    example: '为电路提供0V参考。',
    pins: ['Y: 输出(0)']
  },
  VCC: {
    name: '电源 (VCC, 5V)',
    description: '电源正极，持续输出1（高电平）。',
    truthTable: [],
    expression: 'Y = 1',
    example: '为电路提供电源/使能信号。',
    pins: ['Y: 输出(1)']
  },
  PULLUP: {
    name: '上拉电阻 (Pull-Up Resistor)',
    description: '当节点悬空时将其拉至高电平1。',
    truthTable: [],
    expression: '默认1，外部强下拉时为0',
    example: '用于开漏输出、按键默认高电平。',
    pins: ['Y: 输出(默认1)']
  },
  PULLDOWN: {
    name: '下拉电阻 (Pull-Down Resistor)',
    description: '当节点悬空时将其拉至低电平0。',
    truthTable: [],
    expression: '默认0，外部强上拉时为1',
    example: '用于按键默认低电平。',
    pins: ['Y: 输出(默认0)']
  },
  BUTTON: {
    name: '按键 (Momentary Button)',
    description: '瞬时按键：按下时输出1，松开后自动复位为0。',
    truthTable: [],
    expression: '按下=1, 松开=0',
    example: '用于复位脉冲、用户输入。',
    pins: ['Y: 输出']
  },
  DIPSW4: {
    name: '4位拨码开关 (4-Bit DIP Switch)',
    description: '4个独立拨码开关，每位可手动切换0/1。',
    truthTable: [],
    expression: '4位独立状态',
    example: '用于地址设置、配置输入。',
    pins: ['O0/O1/O2/O3: 4位输出']
  },
  BUS4: {
    name: '4位总线显示 (4-Bit Bus Display)',
    description: '以十六进制显示4位输入信号值。',
    truthTable: [],
    expression: '显示4位输入',
    example: '用于观察4位总线数据。',
    pins: ['D0/D1/D2/D3: 输入']
  },
  BUS8: {
    name: '8位总线显示 (8-Bit Bus Display)',
    description: '以十六进制显示8位输入信号值。',
    truthTable: [],
    expression: '显示8位输入',
    example: '用于观察8位数据总线。',
    pins: ['D0~D7: 输入']
  },
  DLATCH: {
    name: 'D锁存器 (D Latch)',
    description: '电平敏感：EN=1时Q跟随D，EN=0时Q保持。是电平触发的存储元件。',
    truthTable: [
      { inputs: [0, 0], output: [0, 1] },
      { inputs: [1, 0], output: [0, 1] },
      { inputs: [0, 1], output: [0, 1] },
      { inputs: [1, 1], output: [1, 0] }
    ],
    expression: 'EN=1: Q(n+1)=D; EN=0: Q(n+1)=Q(n)',
    example: '用于地址锁存、透明锁存设计。',
    pins: ['D: 数据', 'EN: 使能', 'Q: 输出', 'Q̄: 反相输出']
  },
  JKFF: {
    name: 'JK触发器 (JK Flip-Flop)',
    description: '边沿触发：J=K=0保持，J=K=1翻转，J=1/K=0置1，J=0/K=1置0。',
    truthTable: [
      { inputs: [0, 0, 1], output: '保持' },
      { inputs: [0, 1, 1], output: '置0' },
      { inputs: [1, 0, 1], output: '置1' },
      { inputs: [1, 1, 1], output: '翻转' }
    ],
    expression: 'Q(n+1) = J·Q̄ + K̄·Q (CLK上升沿)',
    example: '用于构建计数器、状态机。',
    pins: ['J: 置位输入', 'CLK: 时钟', 'K: 复位输入', 'Q: 输出', 'Q̄: 反相输出']
  },
  TFF: {
    name: 'T触发器 (T Flip-Flop)',
    description: '边沿触发：T=1时翻转，T=0时保持。常用于计数器构建。',
    truthTable: [
      { inputs: [0, 1], output: '保持' },
      { inputs: [1, 1], output: '翻转' }
    ],
    expression: 'T=1: Q(n+1)=Q̄; T=0: Q(n+1)=Q',
    example: '用于分频、二进制计数。',
    pins: ['T: 翻转控制', 'CLK: 时钟', 'Q: 输出', 'Q̄: 反相输出']
  },
  SRFF: {
    name: 'SR触发器 (SR Flip-Flop)',
    description: '边沿触发：S=1置1，R=1置0，S=R=0保持，S=R=1禁止。',
    truthTable: [
      { inputs: [0, 0, 1], output: '保持' },
      { inputs: [0, 1, 1], output: '置0' },
      { inputs: [1, 0, 1], output: '置1' },
      { inputs: [1, 1, 1], output: '禁止' }
    ],
    expression: 'Q(n+1) = S + R̄·Q (S·R=0约束)',
    example: '用于基本存储、控制电路。',
    pins: ['S: 置位', 'CLK: 时钟', 'R: 复位', 'Q: 输出', 'Q̄: 反相输出']
  },
  COUNTER4: {
    name: '4位计数器 (4-Bit Counter)',
    description: 'CLK上升沿触发：UP/DN=0递增，=1递减。RST=1时清零。模16。',
    truthTable: [],
    expression: 'Q(n+1) = (Q ± 1) mod 16',
    example: '用于计时、地址生成、频率分频。',
    pins: ['UP/DN: 加减控制', 'CLK: 时钟', 'RST: 复位', 'Q0~Q3: 4位输出']
  },
  RING4: {
    name: '4位环形计数器 (4-Bit Ring Counter)',
    description: 'CLK上升沿移位；初始值0001，循环输出0001→0010→0100→1000→0001。',
    truthTable: [],
    expression: '状态循环: 0001→0010→0100→1000',
    example: '用于状态机one-hot编码、节拍发生器。',
    pins: ['CLK: 时钟', 'RST: 复位(置0001)', 'Q0~Q3: 输出']
  },
  REG4: {
    name: '4位寄存器 (4-Bit Register)',
    description: 'CLK上升沿且LOAD=1时加载D0~D3，否则保持。',
    truthTable: [],
    expression: 'LOAD=1 & CLK↑: Q <= D',
    example: '用于数据暂存、流水线。',
    pins: ['D0~D3: 数据', 'CLK: 时钟', 'LOAD: 加载', 'Q0~Q3: 输出']
  },
  RAM164: {
    name: '16×4 RAM',
    description: '16字×4位读写存储器。WE=1且CLK上升沿写入；地址变化时输出对应数据。',
    truthTable: [],
    expression: 'WE=1,CLK↑: mem[addr] <= D; Q <= mem[addr]',
    example: '用于小型数据存储、缓存设计。',
    pins: ['D0~D3: 数据输入', 'A0~A3: 地址', 'WE: 写使能', 'CLK: 时钟', 'Q0~Q3: 数据输出']
  },
  ROM164: {
    name: '16×4 ROM',
    description: '16字×4位只读存储器，内容预置为0..15，按地址读取。',
    truthTable: [],
    expression: 'Q <= mem[addr]',
    example: '用于查表、固定码本。',
    pins: ['A0~A3: 地址', 'Q0~Q3: 数据输出']
  },
  MUX4: {
    name: '4选1多路选择器 (4-to-1 MUX)',
    description: '根据S0、S1从4个输入中选择一个输出。',
    truthTable: [],
    expression: 'Y = S1S0 ? D3 : S1 ? D2 : S0 ? D1 : D0',
    example: '用于数据总线选择、ALU操作数选择。',
    pins: ['D0~D3: 数据', 'S0/S1: 选择', 'Y: 输出']
  },
  DEMUX2: {
    name: '1转2解复用器 (1-to-2 DEMUX)',
    description: '根据SEL将输入送到Y0或Y1。',
    truthTable: [],
    expression: 'SEL=0: Y0=D; SEL=1: Y1=D',
    example: '用于数据路由、地址译码。',
    pins: ['D: 数据', 'SEL: 选择', 'Y0/Y1: 输出']
  },
  DEC38: {
    name: '3-to-8译码器 (3-to-8 Decoder)',
    description: '3位输入译为8路低电平有效输出（其中1路为1）。',
    truthTable: [],
    expression: 'Y[i] = 1 iff i = A',
    example: '用于地址译码、外设片选。',
    pins: ['A0/A1/A2: 3位输入', 'Y0~Y7: 8路输出']
  },
  DEC24: {
    name: '2-to-4译码器 (2-to-4 Decoder)',
    description: '2位输入译为4路输出（其中1路为1）。',
    truthTable: [],
    expression: 'Y[i] = 1 iff i = A',
    example: '用于简化地址译码。',
    pins: ['A0/A1: 输入', 'Y0~Y3: 输出']
  },
  ENC42: {
    name: '4-to-2优先编码器 (Priority Encoder)',
    description: '4路输入按优先级（I3>I2>I1>I0）编码为2位输出，附加VALID位。',
    truthTable: [],
    expression: 'Y = 最高优先级输入的索引',
    example: '用于中断优先级仲裁。',
    pins: ['I0~I3: 输入', 'Y0/Y1: 2位输出', 'V: 有效位']
  },
  BCD7SEG: {
    name: 'BCD-七段译码器 (BCD to 7-Segment)',
    description: '4位BCD码译为7段显示信号[a,b,c,d,e,f,g]，共阴高电平点亮。',
    truthTable: [],
    expression: '7段输出 = seg[BCD]',
    example: '驱动七段数码管显示0~9、A~F。',
    pins: ['D0~D3: BCD输入', 'a~g: 七段输出']
  },
  SEG7CC: {
    name: '七段数码管 共阴 (Common Cathode)',
    description: '共阴七段数码管，输入高电平点亮对应段。',
    truthTable: [],
    expression: '段=1时点亮',
    example: '配合BCD7SEG显示数字。',
    pins: ['a~g: 七段输入']
  },
  SEG7CA: {
    name: '七段数码管 共阳 (Common Anode)',
    description: '共阳七段数码管，输入低电平点亮对应段。',
    truthTable: [],
    expression: '段=0时点亮',
    example: '配合译码器显示数字。',
    pins: ['a~g: 七段输入']
  },
  SEGDISPLAY1: {
    name: '1位数码管 (1-Digit Display)',
    description: '4位BCD输入直接显示为1位十六进制数字。',
    truthTable: [],
    expression: '显示 = HEX(D0~D3)',
    example: '用于简单数字显示。',
    pins: ['D0~D3: BCD输入']
  },
  SEGDISPLAY8: {
    name: '8位数码管 (8-Digit Display)',
    description: '8位数码管，共32位输入（每字4位BCD）。',
    truthTable: [],
    expression: '8位独立BCD显示',
    example: '用于多字数字显示。',
    pins: ['D0~D31: 8字×4位BCD']
  },
  DOTMATRIX16: {
    name: '16×16点阵屏 (16×16 Dot Matrix)',
    description: '16×16 LED点阵，可显示汉字/图形。4位输入选择字模。',
    truthTable: [],
    expression: '显示 = charROM[idx]',
    example: '用于汉字显示、图形输出。',
    pins: ['A0~A3: 字模地址']
  },
  LCD1602: {
    name: '1602液晶屏 (LCD 1602)',
    description: '2行×16字符液晶屏，支持ASCII字符显示。',
    truthTable: [],
    expression: '字符显示控制器',
    example: '用于CPU输出文本信息。',
    pins: ['RS/E/D4~D7: 控制与数据']
  },
  ALU4: {
    name: '4位ALU (4-Bit ALU)',
    description: '4位算术逻辑单元，3位S选择8种运算：加/减/与/或/异或/非/左移/右移。',
    truthTable: [],
    expression: '结果由S选择: 0=A+B+Cin 1=A-B-Cin 2=A&B 3=A|B 4=A^B 5=~A 6=A<<1 7=A>>1',
    example: 'CPU核心运算部件。',
    pins: ['A0~A3: 操作数A', 'B0~B3: 操作数B', 'S0~S2: 操作选择', 'CIN: 进位输入', 'Y0~Y3: 结果', 'COUT: 进位', 'ZERO: 零标志']
  },
  ADDSUB4: {
    name: '4位加减法器 (4-Bit Add/Sub)',
    description: 'MODE=0做加法，MODE=1做减法（补码实现）。',
    truthTable: [],
    expression: 'MODE=0: Y=A+B; MODE=1: Y=A-B',
    example: '用于ALU算术单元。',
    pins: ['A0~A3: A', 'B0~B3: B', 'MODE: 模式', 'Y0~Y3: 结果', 'COUT: 进位']
  },
  COMP4: {
    name: '4位比较器 (4-Bit Comparator)',
    description: '比较两个4位数：输出GT(大于)、EQ(等于)、LT(小于)。',
    truthTable: [],
    expression: 'GT=A>B, EQ=A=B, LT=A<B',
    example: '用于条件判断、排序。',
    pins: ['A0~A3: A', 'B0~B3: B', 'GT/EQ/LT: 输出']
  },
  SHIFT4: {
    name: '4位移位器 (4-Bit Shifter)',
    description: 'DIR=0左移，DIR=1右移，移位量0~3。',
    truthTable: [],
    expression: 'DIR=0: Y=D<<S; DIR=1: Y=D>>S',
    example: '用于快速乘除2的幂。',
    pins: ['D0~D3: 数据', 'S0/S1: 移位量', 'DIR: 方向', 'Y0~Y3: 结果']
  },
  TRISTATE: {
    name: '三态缓冲器 (Tri-State Buffer)',
    description: 'EN=1时输出等于输入，EN=0时输出高阻态。',
    truthTable: [
      { inputs: [0, 0], output: ['Z'] },
      { inputs: [1, 0], output: ['Z'] },
      { inputs: [0, 1], output: [0] },
      { inputs: [1, 1], output: [1] }
    ],
    expression: 'EN=1: Y=D; EN=0: Y=Z(高阻)',
    example: '用于总线共享、多路驱动。',
    pins: ['D: 数据', 'EN: 使能', 'Y: 输出/Z']
  },
  BUSSWITCH: {
    name: '总线开关 (Bus Switch)',
    description: 'EN=1时4位输入透传到输出，EN=0时输出为0。',
    truthTable: [],
    expression: 'EN=1: Y=D; EN=0: Y=0',
    example: '用于总线隔离。',
    pins: ['D0~D3: 输入', 'EN: 使能', 'Y0~Y3: 输出']
  },
  CLOCKDIVIDER: {
    name: '时钟分频器 (Clock Divider)',
    description: '对输入CLK分频，分频比可配置（默认2）。',
    truthTable: [],
    expression: 'f_out = f_in / divideBy',
    example: '用于降低时钟频率、产生节拍。',
    pins: ['CLK: 输入时钟', 'RST: 复位', 'Q: 分频输出']
  },
  TJUNCTION: {
    name: 'T型分支节点 (T-Junction)',
    description: '1输入2输出的分支节点，用于信号分叉。',
    truthTable: [],
    expression: 'Y0 = Y1 = IN',
    example: '用于一根线分叉到两路。',
    pins: ['IN: 输入', 'Y0/Y1: 输出']
  },
  CROSSJUNCTION: {
    name: '十字分支节点 (Cross Junction)',
    description: '1输入3输出的分支节点，用于信号三路分叉。',
    truthTable: [],
    expression: 'Y0 = Y1 = Y2 = IN',
    example: '用于一根线分叉到三路。',
    pins: ['IN: 输入', 'Y0/Y1/Y2: 输出']
  },
  CPU: {
    name: '8位CPU (8-Bit CPU)',
    description: '8位CPU核心，4个8位寄存器R0~R3，16条指令，PC、IR、标志位。',
    truthTable: [],
    expression: '执行ROM256中的机器码',
    example: '可运行汇编程序，访问I/O端口。',
    pins: ['CLK: 时钟', 'RST: 复位', 'STEP: 单步', 'ZERO/CARRY/HALT/RUN: 状态输出']
  },
  ROM256: {
    name: '256×16程序ROM (Program ROM)',
    description: '256字×16位程序存储器，CPU通过PC读取指令。可由汇编器烧录。',
    truthTable: [],
    expression: 'Q = mem[A]',
    example: '存储CPU执行的程序。',
    pins: ['A0~A7: 地址', 'Q0~Q15: 16位指令']
  },
  INSTRUCTION_EXECUTOR: {
    name: '指令执行器 (Instruction Executor)',
    description: '与CPU等价的指令执行单元，提供寄存器/标志位输出。',
    truthTable: [],
    expression: '执行ROM256机器码',
    example: '用于CPU调试与可视化。',
    pins: ['CLK/RST/STEP', 'R0~R1: 寄存器输出', 'ZERO/CARRY/HALT/RUN: 标志']
  },
  IO_BRIDGE: {
    name: 'I/O桥接器 (I/O Bridge)',
    description: '连接CPU与外设的总线桥，统计端口活动。ACT=有活跃端口，D0~D3=首个端口号低4位。',
    truthTable: [],
    expression: '监控 io_out_* / io_in_* 端口',
    example: '用于调试I/O活动。',
    pins: ['ACT: 活跃指示', 'D0~D3: 端口号']
  },
  EXT_RAM: {
    name: '256×8外部RAM (External RAM)',
    description: '256字节外部RAM，端口映射到0x80/0x81/0x82。支持directMode=位级直连。',
    truthTable: [],
    expression: '端口: 0x80=地址 0x81=数据 0x82=控制',
    example: 'CPU扩展数据存储器。',
    pins: ['端口模式: 由CPU读写', '直连模式: A0~A7/WE/CLK/D0~D7']
  },
  IO_PORT: {
    name: '通用I/O端口 (GPIO Port)',
    description: '8位通用I/O，端口映射0x90。CPU可读写，外部可连接输入/输出。',
    truthTable: [],
    expression: '端口: 0x90, outputReg/inputReg',
    example: '连接LED/按键等外设。',
    pins: ['D0~D7: 外部输入', 'Q0~Q7: 外部输出', '端口0x90: CPU访问']
  },
  TIMER: {
    name: '定时器 (Timer)',
    description: '可编程定时器，端口0x20/0x21/0x22。CLK上升沿递减，到0产生中断。',
    truthTable: [],
    expression: '端口: 0x20=状态 0x21=预载 0x22=控制',
    example: '用于周期性中断、计时。',
    pins: ['CLK: 时钟', 'INT: 中断输出']
  },
  TEXT: {
    name: '文本说明 (Text Annotation)',
    description: '电路图上的文本注释，不影响仿真。',
    truthTable: [],
    expression: '无',
    example: '用于电路图标注、说明。',
    pins: []
  },

  // ==================== 第三批扩展元器件详情 ====================
  REG8: {
    name: '8位寄存器 (8-Bit Register)',
    description: '8位并行寄存器，在CLK上升沿且LOAD=1时锁存8位数据。',
    truthTable: [],
    expression: 'LOAD=1 & CLK↑: Q <= D',
    example: '用于8位数据暂存、CPU寄存器、流水线级。',
    pins: ['D0~D7: 数据位0-7', 'CLK: 时钟', 'LOAD: 加载使能', 'Q0~Q7: 数据位0-7']
  },
  SHIFT_REG8: {
    name: '8位移位寄存器 (8-Bit Shift Register)',
    description: '支持串行/并行加载的8位移位寄存器，CLK上升沿移位。',
    truthTable: [],
    expression: 'LOAD=1: Q<=D; LOAD=0, CLK↑: 串入右移',
    example: '用于串并转换、延时线、LED驱动。',
    pins: ['SER: 串行输入', 'CLK: 时钟', 'LOAD: 并行加载', 'D0~D7: 并行数据', 'Q0~Q7: 输出']
  },
  COUNTER8: {
    name: '8位计数器 (8-Bit Counter)',
    description: '8位可逆计数器，UP/DOWN控制方向，RST复位。模256。',
    truthTable: [],
    expression: 'Q(n+1) = (Q ± 1) mod 256',
    example: '用于地址生成、频率分频、事件计数。',
    pins: ['UP/DOWN: 方向', 'CLK: 时钟', 'RST: 复位', 'Q0~Q7: 8位输出']
  },
  ALU8: {
    name: '8位ALU (8-Bit ALU)',
    description: '8位算术逻辑单元，3位操作码选择8种运算(AND/OR/XOR/NOT/ADD/SUB/SHL/SHR)。',
    truthTable: [],
    expression: 'OP=0:AND 1:OR 2:XOR 3:NOT 4:ADD 5:SUB 6:SHL 7:SHR',
    example: '8位CPU核心运算部件，用于执行算术与逻辑运算。',
    pins: ['A0~A7: 操作数A', 'B0~B7: 操作数B', 'OP0~OP2: 操作码', 'R0~R7: 结果', 'CARRY: 进位', 'ZERO: 零标志']
  },
  ADD8: {
    name: '8位加法器 (8-Bit Adder)',
    description: '8位带进位加法器，输出8位和与进位。',
    truthTable: [],
    expression: 'S = A + B + CIN, COUT = 进位',
    example: '用于8位算术加法、地址计算。',
    pins: ['A0~A7: 加数A', 'B0~B7: 加数B', 'CIN: 进位输入', 'S0~S7: 和', 'COUT: 进位输出']
  },
  COMP8: {
    name: '8位比较器 (8-Bit Comparator)',
    description: '8位数值比较器，输出LT/EQ/GT。',
    truthTable: [],
    expression: 'GT=A>B, EQ=A=B, LT=A<B',
    example: '用于条件判断、数值比较、排序。',
    pins: ['A0~A7: 操作数A', 'B0~B7: 操作数B', 'LT: 小于', 'EQ: 等于', 'GT: 大于']
  },
  MUX8: {
    name: '8选1多路选择器 (8-to-1 Multiplexer)',
    description: '8路数据选择器，3位选择信号。',
    truthTable: [],
    expression: 'Y = D[S2S1S0]',
    example: '用于数据总线选择、ALU操作数选择。',
    pins: ['D0~D7: 数据', 'S0~S2: 选择', 'Y: 输出']
  },
  DEMUX8: {
    name: '1转8多路分配器 (1-to-8 Demultiplexer)',
    description: '1路输入转8路输出，3位选择信号。',
    truthTable: [],
    expression: 'Y[S] = D, 其余为0',
    example: '用于数据路由、地址译码。',
    pins: ['D: 数据', 'S0~S2: 选择', 'Y0~Y7: 输出']
  },
  DEC4_16: {
    name: '4-16译码器 (4-to-16 Decoder)',
    description: '4位输入译码为16路独热输出。',
    truthTable: [],
    expression: 'Y[i] = 1 iff i = A',
    example: '用于地址译码、外设片选。',
    pins: ['A0~A3: 4位输入', 'Y0~Y15: 16路输出']
  },
  ENC8_3: {
    name: '8-3优先编码器 (8-to-3 Priority Encoder)',
    description: '8路输入优先编码为3位二进制，高优先级。',
    truthTable: [],
    expression: 'Y = 最高优先级输入的索引',
    example: '用于中断优先级仲裁、地址编码。',
    pins: ['D0~D7: 输入', 'Y0~Y2: 3位输出']
  },
  SCHMITT: {
    name: '施密特触发器 (Schmitt Trigger)',
    description: '带迟滞的反相器，用于信号去抖和整形。',
    truthTable: [],
    expression: '上升阈值V_T+ / 下降阈值V_T-，带迟滞反相',
    example: '用于按键去抖、慢边沿整形、振荡器。',
    pins: ['IN: 输入', 'OUT: 输出(反相)']
  },
  OSCILLATOR: {
    name: '独立振荡器 (Oscillator)',
    description: '可调频率的方波振荡器，无需外部时钟。',
    truthTable: [],
    expression: 'f_out = 可配置频率',
    example: '为电路提供独立时钟源，频率可调。',
    pins: ['OUT: 方波输出']
  },
  TRI_BUFFER_8: {
    name: '8位三态缓冲器 (8-Bit Tri-State Buffer)',
    description: '8位三态缓冲器，EN=0时输出高阻。',
    truthTable: [],
    expression: 'EN=1: Q=D; EN=0: Q=Z(高阻)',
    example: '用于总线共享、多路驱动。',
    pins: ['D0~D7: 数据输入', 'EN: 使能', 'Q0~Q7: 输出/高阻']
  },
  BUS_TRANSCEIVER: {
    name: '8位总线收发器 (8-Bit Bus Transceiver)',
    description: '双向8位总线收发器，DIR控制方向，EN使能。',
    truthTable: [],
    expression: 'EN=1,DIR=0: A→B; DIR=1: B→A; EN=0: 高阻',
    example: '用于双向总线驱动、CPU与外设互联。',
    pins: ['A0~A7: A端口', 'B0~B7: B端口', 'DIR: 方向', 'EN: 使能']
  },
  LATCH_8: {
    name: '8位透明锁存器 (8-Bit Transparent Latch)',
    description: '8位电平触发锁存器，EN=1时透明(跟随输入)，EN=0时保持。',
    truthTable: [],
    expression: 'EN=1: Q=D; EN=0: Q=Q(保持)',
    example: '用于地址锁存、I/O端口输出锁存。',
    pins: ['D0~D7: 数据', 'EN: 使能', 'Q0~Q7: 输出']
  },
  HEXDISPLAY: {
    name: '双十六进制显示 (Dual Hex Display)',
    description: '8位输入显示为两位十六进制数(00-FF)。',
    truthTable: [],
    expression: '显示 = HEX(D0~D7)',
    example: '用于观察8位总线数据。',
    pins: ['D0~D7: 输入']
  },
  ASCII_DISPLAY: {
    name: 'ASCII字符显示 (ASCII Display)',
    description: '7位输入显示对应ASCII字符。',
    truthTable: [],
    expression: '显示 = ASCII(D0~D6)',
    example: '用于串口输出、字符调试显示。',
    pins: ['D0~D6: 7位ASCII输入']
  },
  LED_BAR8: {
    name: '8路LED条 (8-Bar LED Array)',
    description: '8个垂直排列的LED指示灯。',
    truthTable: [],
    expression: 'D[i]=1时点亮',
    example: '用于电平指示、并行数据可视化。',
    pins: ['D0~D7: 输入']
  },
  SCOPE: {
    name: '示波器 (Oscilloscope)',
    description: '单通道信号波形采集与显示，持续记录128个采样点。',
    truthTable: [],
    expression: '显示 = 最近128个IN采样',
    example: '用于观察时序信号波形、调试时钟与脉冲。',
    pins: ['IN: 输入']
  },
  KEYPAD_4x4: {
    name: '4x4矩阵键盘 (4x4 Matrix Keypad)',
    description: '4x4矩阵扫描键盘，4行扫描输入，4列状态输出。',
    truthTable: [],
    expression: '行扫描 + 列读取 = 按键坐标',
    example: '用于16键输入、计算器、密码锁。',
    pins: ['ROW0~ROW3: 行扫描', 'COL0~COL3: 列状态']
  },
  ROM32K: {
    name: '32KB ROM (32K Byte ROM)',
    description: '32KB只读存储器，15位地址，8位数据。',
    truthTable: [],
    expression: 'Q = mem[A]',
    example: '用于程序存储、固件、查表。',
    pins: ['A0~A14: 15位地址', 'D0~D7: 8位数据输出']
  },
  SRAM32K: {
    name: '32KB SRAM (32K Byte SRAM)',
    description: '32KB静态RAM，15位地址，8位数据，支持读写。',
    truthTable: [],
    expression: 'WE=1,CLK↑: mem[A]<=D; OE=1: Q=mem[A]',
    example: '用于程序数据存储、显存、缓存。',
    pins: ['A0~A14: 地址', 'D0~D7: 数据输入', 'WE: 写使能', 'OE: 输出使能', 'CLK: 时钟', 'Q0~Q7: 数据输出']
  },
  UART: {
    name: 'UART串口 (UART Serial Port)',
    description: '通用异步收发器，支持发送/接收缓冲。',
    truthTable: [],
    expression: 'TX/RX串行异步通信，可配置波特率',
    example: '用于串口通信、调试输出、模块互联。',
    pins: ['CLK: 时钟', 'TX_DATA: 发送数据', 'TX_START: 发送启动', 'TX: 串行输出', 'RX_READY: 接收就绪']
  },
  PWM_GENERATOR: {
    name: 'PWM发生器 (PWM Generator)',
    description: '可调频率和占空比的PWM信号发生器。',
    truthTable: [],
    expression: 'OUT占空比 = DUTY / FREQ',
    example: '用于电机调速、LED调光、D/A转换。',
    pins: ['FREQ: 频率控制', 'DUTY: 占空比控制', 'OUT: PWM输出']
  }
}
