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
//
// ===== 扩展指令集 (opcode 0x10-0x1F) =====
// opcode从4位扩展到8位，高4位为0时兼容旧指令(0x00-0x0F)
// 16位指令格式: [15:8]=opcode(8位) [7:0]=操作数
//
// 子程序调用/返回 (CALL/RET):
//   CALL: [15:8]=0x10 [7:0]=addr8        - PC入栈后跳转到addr8
//   RET:  [15:8]=0x11 [7:0]=0            - PC=栈顶
//
// 栈操作 (PUSH/POP):
//   [15:8]=0x12/0x13 [7:4]=Ra [3:0]=0
//   PUSH: SP--后mem[SP]=Ra   POP: Ra=mem[SP]后SP++
//
// 中断 (INT/IRET/EI/DI):
//   INT:  [15:8]=0x14 [7:4]=0  [3:0]=imm4  - 中断使能则PC入栈跳转中断向量
//   IRET: [15:8]=0x15 [7:0]=0              - PC=栈顶，重开中断
//   EI:   [15:8]=0x1E [7:0]=0              - interruptEnable=true
//   DI:   [15:8]=0x1F [7:0]=0              - interruptEnable=false
//
// 自增自减 (INC/DEC):
//   [15:8]=0x16/0x17 [7:4]=Ra [3:0]=0
//
// 立即数运算 (ADDI/SUBI):
//   [15:8]=0x18/0x19 [7:4]=Ra [3:0]=imm4
//   ADDI: Ra+=imm   SUBI: Ra-=imm
//
// 条件跳转 (JC/JNC):
//   JC:  [15:8]=0x1A [7:0]=addr8  - CARRY=1则PC=addr8
//   JNC: [15:8]=0x1B [7:0]=addr8  - CARRY=0则PC=addr8
//
// 8位立即数 (LDI8/CMPI):
//   [15:8]=0x1C/0x1D [7:4]=Ra [3:0]=imm8低4位
//   imm8 = regB<<4 | imm (8位立即数由regB与imm字段拼接)
//   LDI8: Ra=imm8   CMPI: 比较Ra与imm8设置标志位

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
  HALT:   0xF,  // HALT               - 停机
  // ===== 扩展指令 (opcode 0x10-0x1F, 8位opcode) =====
  CALL:   0x10, // CALL addr8         - 调用子程序，PC入栈后跳转到addr8
  RET:    0x11, // RET                - 子程序返回，PC=栈顶
  PUSH:   0x12, // PUSH Ra            - 寄存器入栈，SP--后mem[SP]=Ra
  POP:    0x13, // POP Ra             - 寄存器出栈，Ra=mem[SP]后SP++
  INT:    0x14, // INT n              - 软件中断，中断使能则PC入栈跳转中断向量
  IRET:   0x15, // IRET               - 中断返回，PC=栈顶并重开中断
  INC:    0x16, // INC Ra             - 寄存器自增1
  DEC:    0x17, // DEC Ra             - 寄存器自减1
  ADDI:   0x18, // ADDI Ra, imm       - 立即数加，Ra+=imm
  SUBI:   0x19, // SUBI Ra, imm       - 立即数减，Ra-=imm
  JC:     0x1A, // JC addr8           - 进位跳转，CARRY=1则PC=addr8
  JNC:    0x1B, // JNC addr8          - 无进位跳转，CARRY=0则PC=addr8
  LDI8:   0x1C, // LDI8 Ra, imm8      - 8位立即数加载，Ra=imm8
  CMPI:   0x1D, // CMPI Ra, imm8      - 立即数比较，比较Ra与imm8设置标志
  EI:     0x1E, // EI                 - 开中断，interruptEnable=true
  DI:     0x1F  // DI                 - 关中断，interruptEnable=false
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
  0xF: 'HALT',
  // 扩展指令 (0x10-0x1F)
  0x10: 'CALL',
  0x11: 'RET',
  0x12: 'PUSH',
  0x13: 'POP',
  0x14: 'INT',
  0x15: 'IRET',
  0x16: 'INC',
  0x17: 'DEC',
  0x18: 'ADDI',
  0x19: 'SUBI',
  0x1A: 'JC',
  0x1B: 'JNC',
  0x1C: 'LDI8',
  0x1D: 'CMPI',
  0x1E: 'EI',
  0x1F: 'DI'
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
  HALT:   { opcode: 0xF, format: 'HALT', operands: [] },
  // 扩展指令 (8位opcode，高4位为0兼容旧指令)
  CALL:   { opcode: 0x10, format: 'CALL 0x{addr}', operands: ['addr'] },
  RET:    { opcode: 0x11, format: 'RET', operands: [] },
  PUSH:   { opcode: 0x12, format: 'PUSH R{a}', operands: ['reg'] },
  POP:    { opcode: 0x13, format: 'POP R{a}', operands: ['reg'] },
  INT:    { opcode: 0x14, format: 'INT {imm}', operands: ['imm'] },
  IRET:   { opcode: 0x15, format: 'IRET', operands: [] },
  INC:    { opcode: 0x16, format: 'INC R{a}', operands: ['reg'] },
  DEC:    { opcode: 0x17, format: 'DEC R{a}', operands: ['reg'] },
  ADDI:   { opcode: 0x18, format: 'ADDI R{a}, 0x{imm}', operands: ['reg', 'imm'] },
  SUBI:   { opcode: 0x19, format: 'SUBI R{a}, 0x{imm}', operands: ['reg', 'imm'] },
  JC:     { opcode: 0x1A, format: 'JC 0x{addr}', operands: ['addr'] },
  JNC:    { opcode: 0x1B, format: 'JNC 0x{addr}', operands: ['addr'] },
  LDI8:   { opcode: 0x1C, format: 'LDI8 R{a}, 0x{imm8}', operands: ['reg', 'imm8'] },
  CMPI:   { opcode: 0x1D, format: 'CMPI R{a}, 0x{imm8}', operands: ['reg', 'imm8'] },
  EI:     { opcode: 0x1E, format: 'EI', operands: [] },
  DI:     { opcode: 0x1F, format: 'DI', operands: [] }
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
