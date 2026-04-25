import { ref, reactive } from 'vue'
import { decodeInstruction, OPCODES, REGISTERS } from '../constants/assemblyInstructions'

export function useAssembler() {
  const errors = ref([])
  const machineCode = ref([])
  const labels = reactive({})

  // 解析汇编源代码
  function assemble(source) {
    errors.value = []
    machineCode.value = []
    Object.keys(labels).forEach(k => delete labels[k])

    const lines = source.split('\n')
    const parsedLines = []

    // 第一遍：解析指令和收集标签
    let address = 0
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim()
      const lineNum = i + 1

      // 移除注释
      const commentIdx = line.indexOf(';')
      if (commentIdx >= 0) {
        line = line.substring(0, commentIdx).trim()
      }

      if (!line) continue

      // 检查是否是标签
      if (line.endsWith(':')) {
        const labelName = line.substring(0, line.length - 1).trim()
        if (labels[labelName] !== undefined) {
          errors.value.push({ line: lineNum, message: `重复的标签: ${labelName}` })
        }
        labels[labelName] = address
        continue
      }

      // 解析指令
      const parsed = parseInstruction(line, lineNum)
      if (parsed) {
        parsed.address = address
        parsedLines.push(parsed)
        address++
      }
    }

    if (errors.value.length > 0) return null

    // 第二遍：解析地址和生成机器码
    const code = new Array(address).fill(0)
    for (const parsed of parsedLines) {
      const instruction = resolveInstruction(parsed, labels)
      if (instruction === null) {
        errors.value.push({ line: parsed.lineNum, message: `无法解析指令` })
        return null
      }
      code[parsed.address] = instruction
    }

    if (errors.value.length > 0) return null

    machineCode.value = code
    return code
  }

  // 解析单条指令
  function parseInstruction(line, lineNum) {
    const parts = line.split(/[\s,]+/).filter(p => p)
    if (parts.length === 0) return null

    const mnemonic = parts[0].toUpperCase()
    const operands = parts.slice(1)

    return {
      mnemonic,
      operands: operands.map(parseOperand),
      lineNum,
      raw: line
    }
  }

  // 解析操作数
  function parseOperand(op) {
    op = op.trim()
    
    // 寄存器
    if (op.startsWith('R') && op.length === 2 && '0123'.includes(op[1])) {
      return { type: 'reg', value: parseInt(op[1]) }
    }
    
    // 内存地址 [addr] 或 [Rn]
    if (op.startsWith('[') && op.endsWith(']')) {
      const inner = op.substring(1, op.length - 1).trim()
      if (inner.startsWith('R')) {
        return { type: 'mem_reg', value: parseInt(inner[1]) }
      }
      return { type: 'mem_addr', value: parseNumber(inner) }
    }
    
    // 立即数
    return { type: 'imm', value: parseNumber(op) }
  }

  // 解析数字 (支持十进制、十六进制0x、二进制0b)
  function parseNumber(str) {
    if (!str) return 0
    str = str.trim()
    
    if (str.startsWith('0x') || str.startsWith('0X')) {
      return parseInt(str.substring(2), 16) || 0
    }
    if (str.startsWith('0b') || str.startsWith('0B')) {
      return parseInt(str.substring(2), 2) || 0
    }
    return parseInt(str, 10) || 0
  }

  // 将解析后的指令转换为机器码
  function resolveInstruction(parsed, labels) {
    const { mnemonic, operands } = parsed
    
    switch (mnemonic) {
      case 'LOAD': {
        // LOAD Ra, [addr8] - 8位地址字段
        const regA = operands[0]?.value || 0
        if (operands[1]?.type === 'mem_reg') {
          // 寄存器间接寻址 - 将Rb编码到regB字段
          return (OPCODES.LOAD << 12) | ((regA & 0xF) << 8) | ((operands[1].value & 0xF) << 4)
        }
        // 直接地址 - 编码到8位地址字段 (regB << 4) | imm
        const addr8 = operands[1]?.value || 0
        return (OPCODES.LOAD << 12) | ((regA & 0xF) << 8) | (addr8 & 0xFF)
      }
      
      case 'STORE': {
        // STORE Ra, [addr8] - 8位地址字段
        const regA = operands[0]?.value || 0
        const addr8 = operands[1]?.value || 0
        return (OPCODES.STORE << 12) | ((regA & 0xF) << 8) | (addr8 & 0xFF)
      }
      
      case 'ADD': {
        const regA = operands[0]?.value || 0
        const regB = operands[1]?.value || 0
        return (OPCODES.ADD << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
      }
      
      case 'SUB': {
        const regA = operands[0]?.value || 0
        const regB = operands[1]?.value || 0
        return (OPCODES.SUB << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
      }
      
      case 'AND': {
        const regA = operands[0]?.value || 0
        const regB = operands[1]?.value || 0
        return (OPCODES.AND << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
      }
      
      case 'OR': {
        const regA = operands[0]?.value || 0
        const regB = operands[1]?.value || 0
        return (OPCODES.OR << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
      }
      
      case 'NOT': {
        const regA = operands[0]?.value || 0
        return (OPCODES.NOT << 12) | ((regA & 0xF) << 8)
      }
      
      case 'JMP': {
        // JMP addr8 - 8位地址
        const addr8 = resolveLabel(operands[0], labels) & 0xFF
        return (OPCODES.JMP << 12) | (addr8 & 0xFF)
      }
      
      case 'JZ': {
        // JZ Ra, addr8 - 8位地址
        const regA = operands[0]?.value || 0
        const addr8 = resolveLabel(operands[1], labels) & 0xFF
        return (OPCODES.JZ << 12) | ((regA & 0xF) << 8) | (addr8 & 0xFF)
      }
      
      case 'JNZ': {
        // JNZ Ra, addr8 - 8位地址
        const regA = operands[0]?.value || 0
        const addr8 = resolveLabel(operands[1], labels) & 0xFF
        return (OPCODES.JNZ << 12) | ((regA & 0xF) << 8) | (addr8 & 0xFF)
      }
      
      case 'MOV': {
        const regA = operands[0]?.value || 0
        const regB = operands[1]?.value || 0
        return (OPCODES.MOV << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
      }
      
      case 'LDI': {
        const regA = operands[0]?.value || 0
        const imm = operands[1]?.value || 0
        return (OPCODES.LDI << 12) | ((regA & 0xF) << 8) | (imm & 0xF)
      }
      
      case 'SHL': {
        const regA = operands[0]?.value || 0
        return (OPCODES.SHL << 12) | ((regA & 0xF) << 8)
      }
      
      case 'SHR': {
        const regA = operands[0]?.value || 0
        return (OPCODES.SHR << 12) | ((regA & 0xF) << 8)
      }
      
      case 'CMP': {
        const regA = operands[0]?.value || 0
        const regB = operands[1]?.value || 0
        return (OPCODES.CMP << 12) | ((regA & 0xF) << 8) | ((regB & 0xF) << 4)
      }
      
      case 'HALT': {
        return OPCODES.HALT << 12
      }

      case 'OUT': {
        // OUT Ra, port - 输出到I/O端口 (使用STORE的特殊地址0x80|port)
        const regA = operands[0]?.value || 0
        const port = operands[1]?.value || 0
        return (OPCODES.STORE << 12) | ((regA & 0xF) << 8) | ((port | 0x80) & 0xFF)
      }

      case 'IN': {
        // IN Ra, port - 从I/O端口读取 (使用LOAD的特殊地址0x80|port)
        const regA = operands[0]?.value || 0
        const port = operands[1]?.value || 0
        return (OPCODES.LOAD << 12) | ((regA & 0xF) << 8) | ((port | 0x80) & 0xFF)
      }
      
      default:
        return null
    }
  }

  // 解析标签或数字
  function resolveLabel(operand, labels) {
    if (!operand) return 0
    if (operand.type === 'imm') return operand.value
    if (typeof operand === 'string') {
      if (operand.startsWith('0x')) return parseNumber(operand)
      return labels[operand] || 0
    }
    return operand.value || 0
  }

  // 将机器码转换为汇编文本（反汇编）
  function disassemble(code) {
    const lines = []
    for (let i = 0; i < code.length; i++) {
      const decoded = decodeInstruction(code[i])
      lines.push({
        address: i,
        instruction: decoded,
        hex: '0x' + code[i].toString(16).toUpperCase().padStart(4, '0')
      })
    }
    return lines
  }

  return {
    errors,
    machineCode,
    labels,
    assemble,
    disassemble
  }
}
