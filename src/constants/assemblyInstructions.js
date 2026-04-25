// 指令集定义 - 16位指令格式
// 通用格式: [15:12] = opcode (4位)
//           [11:8]  = register A (4位)
//           [7:0]   = 地址/寄存器B+立即数 (8位)
//
// 寄存器指令 (ADD/SUB/AND/OR/MOV/CMP):
//   [15:12]=opcode [11:8]=Ra [7:4]=Rb [3:0]=0
//
// 立即数指令 (LDI):
//   [15:12]=opcode [11:8]=Ra [7:4]=0  [3:0]=imm4
//
// 地址指令 (LOAD/STORE):
//   [15:12]=opcode [11:8]=Ra [7:0]=addr8 (bit7=1表示I/O端口)
//
// 跳转指令 (JMP):
//   [15:12]=opcode [11:8]=0  [7:0]=addr8
//
// 条件跳转 (JZ/JNZ):
//   [15:12]=opcode [11:8]=Ra [7:0]=addr8
//
// 单操作数 (NOT/SHL/SHR):
//   [15:12]=opcode [11:8]=Ra [7:0]=0
//
// 无操作数 (HALT):
//   [15:12]=opcode [11:8]=0  [7:0]=0

export const OPCODES = {
  LOAD:   0x0,  // LOAD Ra, [addr8]   - 从内存地址加载 (addr8 bit7=1为I/O)
  STORE:  0x1,  // STORE Ra, [addr8]  - 存储到内存地址 (addr8 bit7=1为I/O)
  ADD:    0x2,  // ADD Ra, Rb         - Ra = Ra + Rb
  SUB:    0x3,  // SUB Ra, Rb         - Ra = Ra - Rb
  AND:    0x4,  // AND Ra, Rb         - Ra = Ra & Rb
  OR:     0x5,  // OR Ra, Rb          - Ra = Ra | Rb
  NOT:    0x6,  // NOT Ra             - Ra = ~Ra
  JMP:    0x7,  // JMP addr8          - 无条件跳转
  JZ:     0x8,  // JZ Ra, addr8       - 如果Ra==0则跳转
  JNZ:    0x9,  // JNZ Ra, addr8      - 如果Ra!=0则跳转
  MOV:    0xA,  // MOV Ra, Rb         - Ra = Rb
  LDI:    0xB,  // LDI Ra, imm4       - 加载4位立即数
  SHL:    0xC,  // SHL Ra             - Ra = Ra << 1
  SHR:    0xD,  // SHR Ra             - Ra = Ra >> 1
  CMP:    0xE,  // CMP Ra, Rb         - 比较Ra和Rb，设置标志
  HALT:   0xF   // HALT               - 停机
}

export const INSTRUCTION_NAMES = {
  0x0: 'LOAD',
  0x1: 'STORE',
  0x2: 'ADD',
  0x3: 'SUB',
  0x4: 'AND',
  0x5: 'OR',
  0x6: 'NOT',
  0x7: 'JMP',
  0x8: 'JZ',
  0x9: 'JNZ',
  0xA: 'MOV',
  0xB: 'LDI',
  0xC: 'SHL',
  0xD: 'SHR',
  0xE: 'CMP',
  0xF: 'HALT'
}

export const INSTRUCTION_FORMATS = {
  LOAD:   { opcode: 0x0, format: 'LOAD R{a}, [0x{addr}]', operands: ['reg', 'addr'] },
  STORE:  { opcode: 0x1, format: 'STORE R{a}, [0x{addr}]', operands: ['reg', 'addr'] },
  ADD:    { opcode: 0x2, format: 'ADD R{a}, R{b}', operands: ['reg', 'reg'] },
  SUB:    { opcode: 0x3, format: 'SUB R{a}, R{b}', operands: ['reg', 'reg'] },
  AND:    { opcode: 0x4, format: 'AND R{a}, R{b}', operands: ['reg', 'reg'] },
  OR:     { opcode: 0x5, format: 'OR R{a}, R{b}', operands: ['reg', 'reg'] },
  NOT:    { opcode: 0x6, format: 'NOT R{a}', operands: ['reg'] },
  JMP:    { opcode: 0x7, format: 'JMP 0x{addr}', operands: ['addr'] },
  JZ:     { opcode: 0x8, format: 'JZ R{a}, 0x{addr}', operands: ['reg', 'addr'] },
  JNZ:    { opcode: 0x9, format: 'JNZ R{a}, 0x{addr}', operands: ['reg', 'addr'] },
  MOV:    { opcode: 0xA, format: 'MOV R{a}, R{b}', operands: ['reg', 'reg'] },
  LDI:    { opcode: 0xB, format: 'LDI R{a}, 0x{imm}', operands: ['reg', 'imm'] },
  SHL:    { opcode: 0xC, format: 'SHL R{a}', operands: ['reg'] },
  SHR:    { opcode: 0xD, format: 'SHR R{a}', operands: ['reg'] },
  CMP:    { opcode: 0xE, format: 'CMP R{a}, R{b}', operands: ['reg', 'reg'] },
  HALT:   { opcode: 0xF, format: 'HALT', operands: [] }
}

// CPU寄存器名称
export const REGISTERS = ['R0', 'R1', 'R2', 'R3']

// 将指令编码为16位整数
export function encodeInstruction(opcode, operands) {
  let instruction = (opcode & 0xF) << 12
  
  if (operands.length >= 1) {
    const regA = typeof operands[0] === 'string' && operands[0].startsWith('R') 
      ? parseInt(operands[0][1]) 
      : (operands[0] & 0xF)
    instruction |= (regA & 0xF) << 8
  }
  
  if (operands.length >= 2) {
    const regB = typeof operands[1] === 'string' && operands[1].startsWith('R')
      ? parseInt(operands[1][1])
      : (operands[1] & 0xF)
    instruction |= (regB & 0xF) << 4
  }
  
  if (operands.length >= 3) {
    instruction |= (operands[2] & 0xF)
  }
  
  return instruction & 0xFFFF
}

// 解码16位整数为指令
export function decodeInstruction(instruction) {
  const opcode = (instruction >> 12) & 0xF
  const regA = (instruction >> 8) & 0xF
  const regB = (instruction >> 4) & 0xF
  const imm = instruction & 0xF
  const addr8 = instruction & 0xFF  // 8位地址字段
  
  return {
    opcode,
    name: INSTRUCTION_NAMES[opcode] || 'UNKNOWN',
    regA,
    regB,
    imm,
    addr8,
    raw: instruction
  }
}
