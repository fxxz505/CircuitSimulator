import { ref, reactive } from 'vue'
import { decodeInstruction, OPCODES, INSTRUCTION_NAMES } from '../constants/assemblyInstructions'

export function useCPU() {
  // CPU状态
  const cpuState = reactive({
    registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
    pc: 0,           // 程序计数器
    ir: 0,           // 指令寄存器
    flags: {
      ZERO: false,
      CARRY: false,
      HALT: false
    },
    running: false,
    stepMode: false,
    cyclesExecuted: 0,
    lastInstruction: null,
    ioPorts: reactive({}),  // I/O端口状态
    error: null
  })

  // 重置CPU
  function reset() {
    cpuState.registers = { R0: 0, R1: 0, R2: 0, R3: 0 }
    cpuState.pc = 0
    cpuState.ir = 0
    cpuState.flags = { ZERO: false, CARRY: false, HALT: false }
    cpuState.running = false
    cpuState.cyclesExecuted = 0
    cpuState.lastInstruction = null
    cpuState.error = null
  }

  // 单步执行一条指令
  function step(programROM) {
    if (cpuState.flags.HALT) return false

    // 获取指令
    if (cpuState.pc >= programROM.length) {
      cpuState.flags.HALT = true
      return false
    }

    cpuState.ir = programROM[cpuState.pc] || 0
    const decoded = decodeInstruction(cpuState.ir)
    cpuState.lastInstruction = decoded
    cpuState.pc++

    // 执行指令
    try {
      executeInstruction(decoded, programROM)
    } catch (e) {
      cpuState.error = e.message
      cpuState.flags.HALT = true
      return false
    }

    cpuState.cyclesExecuted++
    return !cpuState.flags.HALT
  }

  // 执行解码后的指令
  function executeInstruction(decoded, programROM) {
    const { opcode, regA, regB, imm } = decoded
    const regs = cpuState.registers

    switch (opcode) {
      case OPCODES.LOAD: {
        // LOAD Ra, [addr]
        const addr = (regB << 4) | imm
        const isIO = (regB & 0x80) !== 0  // I/O端口标记
        
        if (isIO) {
          const port = regB & 0x7F
          regs[regA] = cpuState.ioPorts[`in_${port}`] || 0
        } else {
          regs[regA] = programROM[addr] ? (programROM[addr] & 0xFF) : 0
        }
        
        // 更新ZERO标志
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.STORE: {
        // STORE Ra, [addr] 或 OUT Ra, port
        const addr = (regB << 4) | imm
        const isIO = (regB & 0x80) !== 0

        if (isIO) {
          const port = regB & 0x7F
          cpuState.ioPorts[`out_${port}`] = regs[regA] & 0xFF
        } else {
          // 这里简化处理，实际应该写入外部RAM
          if (programROM[addr] !== undefined) {
            programROM[addr] = regs[regA] & 0xFF
          }
        }
        break
      }

      case OPCODES.ADD: {
        // ADD Ra, Rb: Ra = Ra + Rb
        const result = regs[regA] + regs[regB]
        cpuState.flags.CARRY = result > 255
        regs[regA] = result & 0xFF
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.SUB: {
        // SUB Ra, Rb: Ra = Ra - Rb
        const result = regs[regA] - regs[regB]
        cpuState.flags.CARRY = result < 0
        regs[regA] = result & 0xFF
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.AND: {
        // AND Ra, Rb
        regs[regA] = regs[regA] & regs[regB]
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.OR: {
        // OR Ra, Rb
        regs[regA] = regs[regA] | regs[regB]
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.NOT: {
        // NOT Ra
        regs[regA] = (~regs[regA]) & 0xFF
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.JMP: {
        // JMP addr
        const addr = (regA << 8) | (regB << 4) | imm
        cpuState.pc = addr
        break
      }

      case OPCODES.JZ: {
        // JZ Ra, addr
        if (regs[regA] === 0) {
          const addr = (regA << 8) | (regB << 4) | imm
          cpuState.pc = addr
        }
        break
      }

      case OPCODES.JNZ: {
        // JNZ Ra, addr
        if (regs[regA] !== 0) {
          const addr = (regA << 8) | (regB << 4) | imm
          cpuState.pc = addr
        }
        break
      }

      case OPCODES.MOV: {
        // MOV Ra, Rb
        regs[regA] = regs[regB]
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.LDI: {
        // LDI Ra, imm
        regs[regA] = imm
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.SHL: {
        // SHL Ra
        cpuState.flags.CARRY = (regs[regA] & 0x80) !== 0
        regs[regA] = (regs[regA] << 1) & 0xFF
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.SHR: {
        // SHR Ra
        cpuState.flags.CARRY = (regs[regA] & 0x01) !== 0
        regs[regA] = regs[regA] >> 1
        cpuState.flags.ZERO = (regs[regA] === 0)
        break
      }

      case OPCODES.CMP: {
        // CMP Ra, Rb
        const result = regs[regA] - regs[regB]
        cpuState.flags.ZERO = (regs[regA] === regs[regB])
        cpuState.flags.CARRY = result < 0
        break
      }

      case OPCODES.HALT: {
        cpuState.flags.HALT = true
        cpuState.running = false
        break
      }

      default:
        break
    }
  }

  // 设置I/O端口值
  function setIOPort(port, value) {
    cpuState.ioPorts[`in_${port}`] = value & 0xFF
  }

  // 获取I/O端口输出值
  getIOPort(port) {
    return cpuState.ioPorts[`out_${port}`] || 0
  }

  // 获取寄存器值的多种表示
  function getRegisterDisplay(reg, format = 'hex') {
    const value = cpuState.registers[reg] || 0
    switch (format) {
      case 'hex': return '0x' + value.toString(16).toUpperCase().padStart(2, '0')
      case 'dec': return value.toString()
      case 'bin': return value.toString(2).padStart(8, '0')
      default: return value
    }
  }

  return {
    cpuState,
    reset,
    step,
    setIOPort,
    getIOPort,
    getRegisterDisplay
  }
}
