import { ref } from 'vue'
import { COMPONENT_TYPES, getCustomComponentDef } from '../constants/componentTypes'

export function useSimulation(circuit) {
  const isSimulating = ref(false)
  const tickCount = ref(0)
  const clockSpeed = ref(5)
  let simulationInterval = null
  
  function setClockSpeed(speed) {
    clockSpeed.value = Math.max(1, Math.min(60, speed))
    if (isSimulating.value) {
      stopSimulation()
      startSimulation()
    }
  }

  function simulate() {
    for (let i = 0; i < 10; i++) {
      let changed = false
      
      const inputBefore = []
      circuit.components.value.forEach(comp => {
        const inputs = comp.inputs.map(i => i.value)
        inputBefore.push({ id: comp.id, inputs })
      })
      
      circuit.components.value.forEach(comp => {
        comp.inputs.forEach(input => {
          input.value = 0
        })
      })
      
      circuit.wires.value.forEach(wire => {
        const fromComp = circuit.getComponentById(wire.from.componentId)
        const toComp = circuit.getComponentById(wire.to.componentId)
        
        if (fromComp && fromComp.outputs[wire.from.port]) {
          wire.value = fromComp.outputs[wire.from.port].value
          
          if (toComp && toComp.inputs[wire.to.port]) {
            if (wire.value === 1) {
              toComp.inputs[wire.to.port].value = 1
            }
          }
        }
      })
      
      circuit.components.value.forEach((comp, idx) => {
        const before = inputBefore[idx]
        if (before.id === comp.id) {
          comp.inputs.forEach((input, j) => {
            if (input.value !== before.inputs[j]) {
              changed = true
            }
          })
        }
      })



      // === I/O 桥接阶段 ===
      processIOBridge(circuit)

      circuit.components.value.forEach(comp => {
        const def = COMPONENT_TYPES[comp.type]
        
        if (def && def.evaluate) {
          const vals = comp.inputs.map(i => i.value)
          const outs = def.evaluate(vals)
          outs.forEach((v, i) => {
            if (comp.outputs[i] && comp.outputs[i].value !== v) {
              comp.outputs[i].value = v
              changed = true
            }
          })
        }
        
        const customDef = getCustomComponentDef(comp.type)
        if (customDef && customDef.isCustom) {
          simulateCustomComponent(comp, customDef, circuit)
          changed = true
        }
        
        if (comp.type === 'HALFADDER') {
          const a = comp.inputs[0].value
          const b = comp.inputs[1].value
          const s = a ^ b
          const c = a & b
          if (comp.outputs[0] && comp.outputs[0].value !== s) {
            comp.outputs[0].value = s
            changed = true
          }
          if (comp.outputs[1] && comp.outputs[1].value !== c) {
            comp.outputs[1].value = c
            changed = true
          }
        }
        
        if (comp.type === 'FULLADDER') {
          const a = comp.inputs[0].value
          const b = comp.inputs[1].value
          const cin = comp.inputs[2].value
          const sum = a ^ b ^ cin
          const cout = (a & b) | (cin & (a ^ b))
          if (comp.outputs[0] && comp.outputs[0].value !== sum) {
            comp.outputs[0].value = sum
            changed = true
          }
          if (comp.outputs[1] && comp.outputs[1].value !== cout) {
            comp.outputs[1].value = cout
            changed = true
          }
        }
        
        if (comp.type === 'MUX2') {
          const a = comp.inputs[0].value
          const b = comp.inputs[1].value
          const sel = comp.inputs[2].value
          const out = sel ? b : a
          if (comp.outputs[0] && comp.outputs[0].value !== out) {
            comp.outputs[0].value = out
            changed = true
          }
        }
        
        if (comp.type === 'MUX4') {
          const a = comp.inputs[0].value
          const b = comp.inputs[1].value
          const c = comp.inputs[2].value
          const d = comp.inputs[3].value
          const s0 = comp.inputs[4].value
          const s1 = comp.inputs[5].value
          let out = 0
          if (!s1 && !s0) out = a
          else if (!s1 && s0) out = b
          else if (s1 && !s0) out = c
          else out = d
          if (comp.outputs[0] && comp.outputs[0].value !== out) {
            comp.outputs[0].value = out
            changed = true
          }
        }
        
        if (comp.type === 'DEMUX2') {
          const inp = comp.inputs[0].value
          const sel = comp.inputs[1].value
          const out0 = sel ? 0 : inp
          const out1 = sel ? inp : 0
          if (comp.outputs[0] && comp.outputs[0].value !== out0) {
            comp.outputs[0].value = out0
            changed = true
          }
          if (comp.outputs[1] && comp.outputs[1].value !== out1) {
            comp.outputs[1].value = out1
            changed = true
          }
        }
        
        if (comp.type === 'DFF') {
          const d = comp.inputs[0].value
          const clk = comp.inputs[1].value
          if (clk === 1 && comp.lastClock === 0) {
            comp.state = d
            changed = true
          }
          comp.lastClock = clk
          if (comp.outputs[0] && comp.outputs[0].value !== comp.state) {
            comp.outputs[0].value = comp.state
            changed = true
          }
          if (comp.outputs[1] && comp.outputs[1].value !== (1 - comp.state)) {
            comp.outputs[1].value = 1 - comp.state
            changed = true
          }
        }
        
        if (comp.type === 'DLATCH') {
          const d = comp.inputs[0].value
          const en = comp.inputs[1].value
          if (en === 1) {
            comp.state = d
            changed = true
          }
          if (comp.outputs[0] && comp.outputs[0].value !== comp.state) {
            comp.outputs[0].value = comp.state
            changed = true
          }
          if (comp.outputs[1] && comp.outputs[1].value !== (1 - comp.state)) {
            comp.outputs[1].value = 1 - comp.state
            changed = true
          }
        }
        
        // ==================== 新增触发器和存储器 ====================
        
        // JK触发器
        if (comp.type === 'JKFF') {
          const j = comp.inputs[0].value
          const clk = comp.inputs[1].value
          const k = comp.inputs[2].value
          if (clk === 1 && comp.lastClock === 0) {
            if (j === 1 && k === 0) {
              comp.state = 1
            } else if (j === 0 && k === 1) {
              comp.state = 0
            } else if (j === 1 && k === 1) {
              comp.state = 1 - comp.state
            }
            changed = true
          }
          comp.lastClock = clk
          if (comp.outputs[0] && comp.outputs[0].value !== comp.state) {
            comp.outputs[0].value = comp.state
            changed = true
          }
          if (comp.outputs[1] && comp.outputs[1].value !== (1 - comp.state)) {
            comp.outputs[1].value = 1 - comp.state
            changed = true
          }
        }

        // T触发器
        if (comp.type === 'TFF') {
          const t = comp.inputs[0].value
          const clk = comp.inputs[1].value
          if (clk === 1 && comp.lastClock === 0) {
            if (t === 1) {
              comp.state = 1 - comp.state
            }
            changed = true
          }
          comp.lastClock = clk
          if (comp.outputs[0] && comp.outputs[0].value !== comp.state) {
            comp.outputs[0].value = comp.state
            changed = true
          }
          if (comp.outputs[1] && comp.outputs[1].value !== (1 - comp.state)) {
            comp.outputs[1].value = 1 - comp.state
            changed = true
          }
        }

        // SR触发器
        if (comp.type === 'SRFF') {
          const s = comp.inputs[0].value
          const clk = comp.inputs[1].value
          const r = comp.inputs[2].value
          if (clk === 1 && comp.lastClock === 0) {
            if (s === 1 && r === 0) {
              comp.state = 1
            } else if (s === 0 && r === 1) {
              comp.state = 0
            } else if (s === 1 && r === 1) {
              comp.state = 1
            }
            changed = true
          }
          comp.lastClock = clk
          if (comp.outputs[0] && comp.outputs[0].value !== comp.state) {
            comp.outputs[0].value = comp.state
            changed = true
          }
          if (comp.outputs[1] && comp.outputs[1].value !== (1 - comp.state)) {
            comp.outputs[1].value = 1 - comp.state
            changed = true
          }
        }

        // 4位计数器
        if (comp.type === 'COUNTER4') {
          const upDown = comp.inputs[0].value
          const clk = comp.inputs[1].value
          const reset = comp.inputs[2].value

          if (reset === 1) {
            if (comp.state !== 0) {
              comp.state = 0
              changed = true
            }
          } else if (clk === 1 && comp.lastClock === 0) {
            const oldState = comp.state
            if (upDown === 1) {
              comp.state = (comp.state + 1) % 16
            } else {
              comp.state = (comp.state - 1 + 16) % 16
            }
            if (comp.state !== oldState) changed = true
          }
          comp.lastClock = clk

          for (let i = 0; i < 4; i++) {
            const bitValue = (comp.state >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bitValue) {
              comp.outputs[i].value = bitValue
              changed = true
            }
          }
        }

        // 环形计数器
        if (comp.type === 'RING4') {
          const clk = comp.inputs[0].value
          const reset = comp.inputs[1].value

          if (reset === 1) {
            if (comp.state !== 1) {
              comp.state = 1
              changed = true
            }
          } else if (clk === 1 && comp.lastClock === 0) {
            const oldState = comp.state
            comp.state = ((comp.state << 1) | (comp.state >> 3)) & 0xF
            if (comp.state !== oldState) changed = true
          }
          comp.lastClock = clk

          for (let i = 0; i < 4; i++) {
            const bitValue = (comp.state >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bitValue) {
              comp.outputs[i].value = bitValue
              changed = true
            }
          }
        }

        // 4位寄存器
        if (comp.type === 'REG4') {
          const d0 = comp.inputs[0].value
          const d1 = comp.inputs[1].value
          const d2 = comp.inputs[2].value
          const d3 = comp.inputs[3].value
          const clk = comp.inputs[4].value
          const load = comp.inputs[5].value

          if (clk === 1 && comp.lastClock === 0 && load === 1) {
            const newValue = d0 + (d1 << 1) + (d2 << 2) + (d3 << 3)
            if (comp.state !== newValue) {
              comp.state = newValue
              changed = true
            }
          }
          comp.lastClock = clk

          for (let i = 0; i < 4; i++) {
            const bitValue = (comp.state >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bitValue) {
              comp.outputs[i].value = bitValue
              changed = true
            }
          }
        }

        // 16x4 RAM
        if (comp.type === 'RAM164') {
          const d0 = comp.inputs[0].value
          const d1 = comp.inputs[1].value
          const d2 = comp.inputs[2].value
          const d3 = comp.inputs[3].value
          const a0 = comp.inputs[4].value
          const a1 = comp.inputs[5].value
          const a2 = comp.inputs[6].value
          const a3 = comp.inputs[7].value
          const we = comp.inputs[8].value
          const clk = comp.inputs[9].value

          const address = a0 + (a1 << 1) + (a2 << 2) + (a3 << 3)
          const dataIn = d0 + (d1 << 1) + (d2 << 2) + (d3 << 3)

          if (clk === 1 && comp.lastClock === 0 && we === 1) {
            if (comp.state[address] !== dataIn) {
              comp.state[address] = dataIn
              changed = true
            }
          }
          comp.lastClock = clk

          const dataOut = comp.state[address]
          for (let i = 0; i < 4; i++) {
            const bitValue = (dataOut >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bitValue) {
              comp.outputs[i].value = bitValue
              changed = true
            }
          }
        }

        // 16x4 ROM
        if (comp.type === 'ROM164') {
          const a0 = comp.inputs[0].value
          const a1 = comp.inputs[1].value
          const a2 = comp.inputs[2].value
          const a3 = comp.inputs[3].value
          const address = a0 + (a1 << 1) + (a2 << 2) + (a3 << 3)
          const dataOut = comp.state[address]

          for (let i = 0; i < 4; i++) {
            const bitValue = (dataOut >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bitValue) {
              comp.outputs[i].value = bitValue
              changed = true
            }
          }
        }

        if (comp.type === 'EXT_RAM' && comp.inputs.length >= 10) {
          let address = 0
          for (let i = 0; i < 8; i++) {
            address |= (comp.inputs[i]?.value || 0) << i
          }
          const we = comp.inputs[8]?.value || 0
          const clk = comp.inputs[9]?.value || 0

          if (!comp.state) {
            comp.state = {
              memory: new Array(256).fill(0),
              addressReg: 0,
              dataReg: 0,
              controlReg: 0
            }
          }

          if (clk === 1 && (comp.lastClock || 0) === 0 && we === 1) {
            const dataFromIO = comp.state.dataReg || 0
            comp.state.memory[address & 0xFF] = dataFromIO & 0xFF
            changed = true
          }
          comp.lastClock = clk

          const dataOut = comp.state.memory[address & 0xFF] || 0
          for (let i = 0; i < 8; i++) {
            const bitValue = (dataOut >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bitValue) {
              comp.outputs[i].value = bitValue
              changed = true
            }
          }
        }

        if (comp.type === 'IO_PORT' && comp.inputs.length >= 8 && comp.outputs.length >= 8) {
          let inputVal = 0
          for (let i = 0; i < 8; i++) {
            if (comp.inputs[i]?.value === 1) {
              inputVal |= (1 << i)
            }
          }
          if (!comp.state) {
            comp.state = { outputReg: 0, inputReg: 0 }
          }
          comp.state.inputReg = inputVal

          for (let i = 0; i < 8; i++) {
            const bitValue = (comp.state.outputReg >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bitValue) {
              comp.outputs[i].value = bitValue
              changed = true
            }
          }
        }

        if (comp.type === 'TIMER' && comp.inputs.length >= 1 && comp.outputs.length >= 1) {
          const clk = comp.inputs[0]?.value || 0
          if (!comp.state) {
            comp.state = {
              counter: 0,
              preload: 255,
              controlReg: 0,
              interruptFlag: 0,
              running: false,
              tickCount: 0
            }
          }
          if (clk === 1 && (comp.lastClock || 0) === 0 && comp.state.running) {
            comp.state.counter--
            if (comp.state.counter <= 0) {
              comp.state.interruptFlag = 1
              comp.state.running = false
            }
          }
          comp.lastClock = clk

          if (comp.outputs[0] && comp.outputs[0].value !== comp.state.interruptFlag) {
            comp.outputs[0].value = comp.state.interruptFlag
            changed = true
          }
        }

        // 时钟分频器
        if (comp.type === 'CLOCKDIVIDER') {
          const clk = comp.inputs[0]?.value || 0
          const rst = comp.inputs[1]?.value || 0
          const divideBy = comp.divideBy || 2

          if (!comp.state || typeof comp.state === 'number') {
            comp.state = { output: 0, counter: 0 }
          }

          if (rst === 1) {
            comp.state.output = 0
            comp.state.counter = 0
            comp.lastClock = 0
            changed = true
          } else if (clk === 1 && comp.lastClock === 0) {
            comp.state.counter = (comp.state.counter || 0) + 1
            if (comp.state.counter >= divideBy) {
              comp.state.counter = 0
              comp.state.output = 1 - comp.state.output
              changed = true
            }
          }
          comp.lastClock = clk

          if (comp.outputs[0] && comp.outputs[0].value !== comp.state.output) {
            comp.outputs[0].value = comp.state.output
            changed = true
          }
        }

        // CPU执行
        if (comp.type === 'CPU') {
          // 确保state已初始化
          if (!comp.state) {
            comp.state = {
              registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
              pc: 0, ir: 0,
              flags: { ZERO: false, CARRY: false, HALT: false },
              running: false,
              cyclesExecuted: 0
            }
            comp.ioOutputs = {}
          }
          
          const clk = comp.inputs[0]?.value || 0
          const reset = comp.inputs[1]?.value || 0
          const step = comp.inputs[2]?.value || 0
          
          if (reset === 1) {
            comp.state = {
              registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
              pc: 0, ir: 0,
              flags: { ZERO: false, CARRY: false, HALT: false },
              running: false,
              cyclesExecuted: 0
            }
            comp.ioOutputs = {}
            changed = true
          } else if (clk === 1 && comp.lastClock === 0) {
            if (!comp.state.flags.HALT && (step === 1 || comp.state.running)) {
              executeCPUInstruction(comp, circuit)
              if (comp.breakpoints && comp.breakpoints.size > 0 && comp.breakpoints.has(comp.state.pc)) {
                comp.state.running = false
              }
              changed = true
            }
          }
          comp.lastClock = clk
          
          // 更新状态输出
          if (comp.outputs[0]) {
            const newVal = comp.state.flags.ZERO ? 1 : 0
            if (comp.outputs[0].value !== newVal) { comp.outputs[0].value = newVal; changed = true }
          }
          if (comp.outputs[1]) {
            const newVal = comp.state.flags.CARRY ? 1 : 0
            if (comp.outputs[1].value !== newVal) { comp.outputs[1].value = newVal; changed = true }
          }
          if (comp.outputs[2]) {
            const newVal = comp.state.flags.HALT ? 1 : 0
            if (comp.outputs[2].value !== newVal) { comp.outputs[2].value = newVal; changed = true }
          }
          if (comp.outputs[3]) {
            const newVal = comp.state.running ? 1 : 0
            if (comp.outputs[3].value !== newVal) { comp.outputs[3].value = newVal; changed = true }
          }
        }

        // ROM256读取
        if (comp.type === 'ROM256') {
          let address = 0
          for (let i = 0; i < 8 && comp.inputs[i]; i++) {
            address |= (comp.inputs[i].value << i)
          }
          const dataOut = comp.state[address] || 0
          
          for (let i = 0; i < 16 && comp.outputs[i]; i++) {
            const bitValue = (dataOut >> i) & 1
            if (comp.outputs[i].value !== bitValue) {
              comp.outputs[i].value = bitValue
              changed = true
            }
          }
        }

        // INSTRUCTION_EXECUTOR执行
        if (comp.type === 'INSTRUCTION_EXECUTOR') {
          // 确保state已初始化
          if (!comp.state) {
            comp.state = {
              registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
              pc: 0, ir: 0,
              flags: { ZERO: false, CARRY: false, HALT: false },
              running: false,
              cyclesExecuted: 0
            }
            comp.ioOutputs = {}
          }
          
          const clk = comp.inputs[0]?.value || 0
          const reset = comp.inputs[1]?.value || 0
          const step = comp.inputs[2]?.value || 0
          
          if (reset === 1) {
            comp.state = {
              registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
              pc: 0, ir: 0,
              flags: { ZERO: false, CARRY: false, HALT: false },
              running: false,
              cyclesExecuted: 0
            }
            comp.ioOutputs = {}
            changed = true
          } else if (clk === 1 && comp.lastClock === 0) {
            if (!comp.state.flags.HALT && (step === 1 || comp.state.running)) {
              executeInstructionExecutor(comp, circuit)
              changed = true
            }
          }
          comp.lastClock = clk
          
          // 更新状态输出 - 寄存器值通过输出端口显示
          // 输出R0 (bits 0-7)
          if (comp.outputs[0]) {
            const newVal = comp.state.registers.R0 & 0xFF
            if (comp.outputs[0].value !== newVal) { comp.outputs[0].value = newVal; changed = true }
          }
          // 输出R1 (bits 8-15) - 使用16位输出
          for (let i = 0; i < 8 && comp.outputs[i + 8]; i++) {
            const bitValue = (comp.state.registers.R1 >> i) & 1
            if (comp.outputs[i + 8].value !== bitValue) { comp.outputs[i + 8].value = bitValue; changed = true }
          }
          // 标志位输出
          if (comp.outputs[16]) {
            const newVal = comp.state.flags.ZERO ? 1 : 0
            if (comp.outputs[16].value !== newVal) { comp.outputs[16].value = newVal; changed = true }
          }
          if (comp.outputs[17]) {
            const newVal = comp.state.flags.CARRY ? 1 : 0
            if (comp.outputs[17].value !== newVal) { comp.outputs[17].value = newVal; changed = true }
          }
          if (comp.outputs[18]) {
            const newVal = comp.state.flags.HALT ? 1 : 0
            if (comp.outputs[18].value !== newVal) { comp.outputs[18].value = newVal; changed = true }
          }
          if (comp.outputs[19]) {
            const newVal = comp.state.running ? 1 : 0
            if (comp.outputs[19].value !== newVal) { comp.outputs[19].value = newVal; changed = true }
          }
        }

      })
      
      if (!changed) break
    }
  }

  function executeCPUInstruction(cpuComp, circuit) {
    const state = cpuComp.state
    // 确保state存在
    if (!state) return
    if (state.flags.HALT) return

    // 每次重新查找ROM以获取最新数据
    const rom = circuit.components.value.find(c => c.type === 'ROM256')
    if (!rom || !rom.state) return

    if (state.pc >= 256) {
      state.flags.HALT = true
      return
    }
    state.ir = rom.state[state.pc] || 0
    state.pc++

    const opcode = (state.ir >> 12) & 0xF
    const regA = (state.ir >> 8) & 0xF
    const regB = (state.ir >> 4) & 0xF
    const imm = state.ir & 0xF
    const addr8 = (regB << 4) | imm  // 8位地址字段
    const regs = state.registers
    const regNames = ['R0', 'R1', 'R2', 'R3']

    switch (opcode) {
      case 0x0: { // LOAD Ra, [addr8]
        const isIO = (addr8 & 0x80) !== 0
        if (isIO) {
          const port = addr8 & 0x7F
          regs[regNames[regA]] = cpuComp.ioOutputs[`io_in_${port}`] || 0
        } else if (rom) {
          regs[regNames[regA]] = rom.state[addr8 & 0x7F] || 0
        }
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x1: { // STORE Ra, [addr8]
        const isIO = (addr8 & 0x80) !== 0
        if (isIO) {
          const port = addr8 & 0x7F
          cpuComp.ioOutputs[`io_out_${port}`] = regs[regNames[regA]] & 0xFF
        } else if (rom) {
          rom.state[addr8 & 0x7F] = regs[regNames[regA]] & 0xFF
        }
        break
      }
      case 0x2: { // ADD Ra, Rb
        const result = regs[regNames[regA]] + regs[regNames[regB]]
        state.flags.CARRY = result > 255
        regs[regNames[regA]] = result & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x3: { // SUB Ra, Rb
        const result = regs[regNames[regA]] - regs[regNames[regB]]
        state.flags.CARRY = result < 0
        regs[regNames[regA]] = result & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x4: { // AND Ra, Rb
        regs[regNames[regA]] = regs[regNames[regA]] & regs[regNames[regB]]
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x5: { // OR Ra, Rb
        regs[regNames[regA]] = regs[regNames[regA]] | regs[regNames[regB]]
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x6: { // NOT Ra
        regs[regNames[regA]] = (~regs[regNames[regA]]) & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x7: { // JMP addr8
        state.pc = addr8
        break
      }
      case 0x8: { // JZ Ra, addr8
        if (regs[regNames[regA]] === 0) state.pc = addr8
        break
      }
      case 0x9: { // JNZ Ra, addr8
        if (regs[regNames[regA]] !== 0) state.pc = addr8
        break
      }
      case 0xA: { // MOV Ra, Rb
        regs[regNames[regA]] = regs[regNames[regB]]
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0xB: { // LDI Ra, imm
        regs[regNames[regA]] = imm
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0xC: { // SHL Ra
        state.flags.CARRY = (regs[regNames[regA]] & 0x80) !== 0
        regs[regNames[regA]] = (regs[regNames[regA]] << 1) & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0xD: { // SHR Ra
        state.flags.CARRY = (regs[regNames[regA]] & 0x01) !== 0
        regs[regNames[regA]] = regs[regNames[regA]] >> 1
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0xE: { // CMP Ra, Rb
        state.flags.ZERO = (regs[regNames[regA]] === regs[regNames[regB]])
        state.flags.CARRY = regs[regNames[regA]] < regs[regNames[regB]]
        break
      }
      case 0xF: { // HALT
        state.flags.HALT = true
        state.running = false
        break
      }
    }
    state.cyclesExecuted++
  }

  function executeInstructionExecutor(execComp, circuit) {
    const state = execComp.state
    // 确保state存在
    if (!state) return
    if (state.flags.HALT) return

    // 每次重新查找ROM以获取最新数据
    const rom = circuit.components.value.find(c => c.type === 'ROM256')
    if (!rom || !rom.state) return

    if (state.pc >= 256) {
      state.flags.HALT = true
      return
    }
    state.ir = rom.state[state.pc] || 0
    state.pc++

    const opcode = (state.ir >> 12) & 0xF
    const regA = (state.ir >> 8) & 0xF
    const regB = (state.ir >> 4) & 0xF
    const imm = state.ir & 0xF
    const addr8 = (regB << 4) | imm  // 8位地址字段
    const regs = state.registers
    const regNames = ['R0', 'R1', 'R2', 'R3']

    switch (opcode) {
      case 0x0: { // LOAD Ra, [addr8]
        const isIO = (addr8 & 0x80) !== 0
        if (isIO) {
          const port = addr8 & 0x7F
          regs[regNames[regA]] = execComp.ioOutputs[`io_in_${port}`] || 0
        } else if (rom) {
          regs[regNames[regA]] = rom.state[addr8 & 0x7F] || 0
        }
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x1: { // STORE Ra, [addr8]
        const isIO = (addr8 & 0x80) !== 0
        if (isIO) {
          const port = addr8 & 0x7F
          execComp.ioOutputs[`io_out_${port}`] = regs[regNames[regA]] & 0xFF
        } else if (rom) {
          rom.state[addr8 & 0x7F] = regs[regNames[regA]] & 0xFF
        }
        break
      }
      case 0x2: { // ADD Ra, Rb
        const result = regs[regNames[regA]] + regs[regNames[regB]]
        state.flags.CARRY = result > 255
        regs[regNames[regA]] = result & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x3: { // SUB Ra, Rb
        const result = regs[regNames[regA]] - regs[regNames[regB]]
        state.flags.CARRY = result < 0
        regs[regNames[regA]] = result & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x4: { // AND Ra, Rb
        regs[regNames[regA]] = regs[regNames[regA]] & regs[regNames[regB]]
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x5: { // OR Ra, Rb
        regs[regNames[regA]] = regs[regNames[regA]] | regs[regNames[regB]]
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x6: { // NOT Ra
        regs[regNames[regA]] = (~regs[regNames[regA]]) & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x7: { // JMP addr8
        state.pc = addr8
        break
      }
      case 0x8: { // JZ Ra, addr8
        if (regs[regNames[regA]] === 0) state.pc = addr8
        break
      }
      case 0x9: { // JNZ Ra, addr8
        if (regs[regNames[regA]] !== 0) state.pc = addr8
        break
      }
      case 0xA: { // MOV Ra, Rb
        regs[regNames[regA]] = regs[regNames[regB]]
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0xB: { // LDI Ra, imm
        regs[regNames[regA]] = imm
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0xC: { // SHL Ra
        state.flags.CARRY = (regs[regNames[regA]] & 0x80) !== 0
        regs[regNames[regA]] = (regs[regNames[regA]] << 1) & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0xD: { // SHR Ra
        state.flags.CARRY = (regs[regNames[regA]] & 0x01) !== 0
        regs[regNames[regA]] = regs[regNames[regA]] >> 1
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0xE: { // CMP Ra, Rb
        state.flags.ZERO = (regs[regNames[regA]] === regs[regNames[regB]])
        state.flags.CARRY = regs[regNames[regA]] < regs[regNames[regB]]
        break
      }
      case 0xF: { // HALT
        state.flags.HALT = true
        state.running = false
        break
      }
    }
    state.cyclesExecuted++
  }

  function simulateCustomComponent(comp, customDef, circuit) {
    const customData = customDef.customData
    if (!customData) return
    
    const internalComps = []
    customData.internalComponents.forEach(ic => {
      const icDef = COMPONENT_TYPES[ic.type]
      if (icDef) {
        internalComps.push({
          ...ic,
          inputs: ic.inputs ? ic.inputs.map(i => ({ value: 0 })) : Array(icDef.inputs).fill(0).map(() => ({ value: 0 })),
          outputs: ic.outputs ? ic.outputs.map(o => ({ value: 0 })) : Array(icDef.outputs).fill(0).map(() => ({ value: 0 })),
          state: ic.state || 0,
          lastClock: ic.lastClock || 0
        })
      }
    })
    
    if (customData.inputPorts) {
      customData.inputPorts.forEach((port, i) => {
        const targetComp = internalComps.find(ic => ic.id === port.componentId)
        if (targetComp && comp.inputs[i]) {
          targetComp.inputs[port.port].value = comp.inputs[i].value
        }
      })
    }
    
    for (let iter = 0; iter < 5; iter++) {
      internalComps.forEach(ic => {
        const icDef = COMPONENT_TYPES[ic.type]
        if (!icDef) return
        ic.inputs.forEach(i => i.value = 0)
      })
      
      if (customData.inputPorts) {
        customData.inputPorts.forEach((port, i) => {
          const targetComp = internalComps.find(ic => ic.id === port.componentId)
          if (targetComp && comp.inputs[i]) {
            targetComp.inputs[port.port].value = comp.inputs[i].value
          }
        })
      }
      
      customData.internalWires.forEach(wire => {
        const fromComp = internalComps.find(ic => ic.id === wire.from.componentId)
        const toComp = internalComps.find(ic => ic.id === wire.to.componentId)
        if (fromComp && toComp && fromComp.outputs[wire.from.port]) {
          if (toComp.inputs[wire.to.port]) {
            toComp.inputs[wire.to.port].value = fromComp.outputs[wire.from.port].value
          }
        }
      })
      
      internalComps.forEach(ic => {
        const icDef = COMPONENT_TYPES[ic.type]
        if (!icDef) return
        
        if (icDef.evaluate) {
          const vals = ic.inputs.map(i => i.value)
          const outs = icDef.evaluate(vals)
          outs.forEach((v, i) => {
            if (ic.outputs[i]) {
              ic.outputs[i].value = v
            }
          })
        }
        
        if (ic.type === 'HALFADDER') {
          const a = ic.inputs[0].value
          const b = ic.inputs[1].value
          if (ic.outputs[0]) ic.outputs[0].value = a ^ b
          if (ic.outputs[1]) ic.outputs[1].value = a & b
        }
        
        if (ic.type === 'FULLADDER') {
          const a = ic.inputs[0].value
          const b = ic.inputs[1].value
          const cin = ic.inputs[2].value
          if (ic.outputs[0]) ic.outputs[0].value = a ^ b ^ cin
          if (ic.outputs[1]) ic.outputs[1].value = (a & b) | (cin & (a ^ b))
        }
        
        if (ic.type === 'MUX2') {
          const a = ic.inputs[0].value
          const b = ic.inputs[1].value
          const sel = ic.inputs[2].value
          if (ic.outputs[0]) ic.outputs[0].value = sel ? b : a
        }
      })
    }
    
    if (customData.outputPorts) {
      customData.outputPorts.forEach((port, i) => {
        const sourceComp = internalComps.find(ic => ic.id === port.componentId)
        if (sourceComp && sourceComp.outputs[port.port] && comp.outputs[i]) {
          comp.outputs[i].value = sourceComp.outputs[port.port].value
        }
      })
    }
  }

  function startSimulation() {
    if (isSimulating.value) return
    isSimulating.value = true
    simulationInterval = setInterval(() => {
      tickCount.value++
      circuit.components.value.filter(c => c.type === 'CLOCK').forEach(c => {
        if (c.enabled === false) return
        const freq = c.frequency || 1
        const duty = c.dutyCycle || 50
        const phase = c.phase || 0
        const period = Math.max(1, Math.round(clockSpeed.value / freq))
        const phaseOffset = Math.round((phase / 360) * period)
        const pos = ((tickCount.value + phaseOffset) % period)
        const newState = pos < (period * duty / 100) ? 1 : 0
        c.state = newState
        if (c.outputs[0]) c.outputs[0].value = c.state
        // Record waveform
        if (!c.waveformHistory) c.waveformHistory = []
        c.waveformHistory.push(newState)
        if (c.waveformHistory.length > 64) c.waveformHistory.shift()
      })
      simulate()
    }, 1000 / clockSpeed.value)
  }

  function stopSimulation() {
    isSimulating.value = false
    if (simulationInterval) {
      clearInterval(simulationInterval)
      simulationInterval = null
    }
  }

  function stepSimulation() {
    tickCount.value++
    circuit.components.value.filter(c => c.type === 'CLOCK').forEach(c => {
      if (c.enabled === false) return
      const freq = c.frequency || 1
      const duty = c.dutyCycle || 50
      const phase = c.phase || 0
      const period = Math.max(1, Math.round(clockSpeed.value / freq))
      const phaseOffset = Math.round((phase / 360) * period)
      const pos = ((tickCount.value + phaseOffset) % period)
      c.state = pos < (period * duty / 100) ? 1 : 0
      if (c.outputs[0]) c.outputs[0].value = c.state
      if (!c.waveformHistory) c.waveformHistory = []
      c.waveformHistory.push(c.state)
      if (c.waveformHistory.length > 64) c.waveformHistory.shift()
    })
    simulate()
  }

  function stepCPU(cpuComp, romState) {
    if (!cpuComp.state) return
    executeCPUInstruction(cpuComp, { components: { value: [{ type: 'ROM256', state: romState }] } })
  }

  function stepInstructionExecutor(execComp, romState) {
    if (!execComp.state) return
    executeInstructionExecutor(execComp, { components: { value: [{ type: 'ROM256', state: romState }] } })
  }

  function resetSimulation() {
    tickCount.value = 0
    circuit.components.value.forEach(c => {
      const def = COMPONENT_TYPES[c.type]
      if (c.type === 'CLOCK' || c.type === 'SWITCH') {
        c.state = 0
        if (c.outputs[0]) c.outputs[0].value = 0
      }
      if (c.type === 'DFF' || c.type === 'DLATCH') {
        c.state = 0
        c.lastClock = 0
      }
      if (c.type === 'JKFF' || c.type === 'TFF' || c.type === 'SRFF') {
        c.state = 0
        c.lastClock = 0
      }
      if (c.type === 'COUNTER4') {
        c.state = 0
        c.lastClock = 0
      }
      if (c.type === 'RING4') {
        c.state = 1
        c.lastClock = 0
      }
      if (c.type === 'REG4') {
        c.state = 0
        c.lastClock = 0
      }
      if (c.type === 'RAM164') {
        c.state = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        c.lastClock = 0
      }
      if (c.type === 'ROM164') {
        c.state = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
      }
      if (c.type === 'CONST0') {
        c.state = 0
        if (c.outputs[0]) c.outputs[0].value = 0
      }
      if (c.type === 'CONST1') {
        c.state = 1
        if (c.outputs[0]) c.outputs[0].value = 1
      }
      if (c.type === 'CLOCKDIVIDER') {
        c.state = { output: 0, counter: 0 }
        c.lastClock = 0
      }
      if (c.type === 'CPU') {
        c.state = {
          registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
          pc: 0, ir: 0,
          flags: { ZERO: false, CARRY: false, HALT: false },
          running: false,
          cyclesExecuted: 0
        }
        c.lastClock = 0
        c.ioOutputs = {}
      }
      if (c.type === 'INSTRUCTION_EXECUTOR') {
        c.state = {
          registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
          pc: 0, ir: 0,
          flags: { ZERO: false, CARRY: false, HALT: false },
          running: false,
          cyclesExecuted: 0
        }
        c.lastClock = 0
        c.ioOutputs = {}
      }
      c.inputs.forEach(i => i.value = 0)
      c.outputs.forEach(o => o.value = 0)
    })
    simulate()
  }

  // === I/O 桥接：连接 CPU/EXEC 与外部硬件 ===
  function processIOBridge(circuit) {
    const ioBus = { outputs: {}, inputs: {} }

    // 1. 收集所有 CPU/EXEC 的 ioOutputs['io_out_*']
    circuit.components.value.forEach(comp => {
      if ((comp.type === 'CPU' || comp.type === 'INSTRUCTION_EXECUTOR') && comp.ioOutputs) {
        for (const [key, value] of Object.entries(comp.ioOutputs)) {
          if (key.startsWith('io_out_')) {
            const port = parseInt(key.replace('io_out_', ''))
            ioBus.outputs[port] = value
          }
        }
      }
    })

    // 2. 分发到外设组件
    circuit.components.value.forEach(comp => {
      if (comp.type === 'EXT_RAM' && comp.portConfig) {
        handleExtRamIO(comp, ioBus)
      }
      if (comp.type === 'IO_PORT' && comp.portConfig) {
        handleIoPortIO(comp, ioBus)
      }
      if (comp.type === 'TIMER' && comp.portConfig) {
        handleTimerIO(comp, ioBus)
      }
    })

    // 3. 写回 CPU/EXEC 的 io_in_*
    circuit.components.value.forEach(comp => {
      if ((comp.type === 'CPU' || comp.type === 'INSTRUCTION_EXECUTOR') && comp.ioOutputs) {
        for (const [port, value] of Object.entries(ioBus.inputs)) {
          comp.ioOutputs[`io_in_${port}`] = value
        }
      }
    })

    // 4. TIMER计数器递减（关键修复：从组件循环移到这里）
    circuit.components.value.forEach(comp => {
      if (comp.type === 'TIMER' && comp.state) {
        if (comp.state.running && comp.state.counter > 0) {
          comp.state.counter--
          if (comp.state.counter === 0) {
            comp.state.interruptFlag = 1
            comp.state.running = false
          }
        }
      }
    })

    // 5. 更新 IO_BRIDGE 统计
    circuit.components.value.forEach(comp => {
      if (comp.type === 'IO_BRIDGE' && comp.state) {
        const activePortKeys = Object.keys(ioBus.outputs)
        comp.state.transferCount = (comp.state.transferCount || 0) + activePortKeys.length
        if (activePortKeys.length > 0) {
          comp.state.lastActivity = `活跃端口: ${activePortKeys.join(', ')}`
          comp.state.activePorts = activePortKeys.map(k => `0x${parseInt(k).toString(16).toUpperCase().padStart(2, '0')}`)
          
          activePortKeys.forEach(k => {
            comp.state.lastData[k] = ioBus.outputs[k]
          })
        }
        
        comp.outputs = comp.outputs || []
        comp.outputs[0] = activePortKeys.length > 0 ? 1 : 0
        const firstPort = activePortKeys.length > 0 ? parseInt(activePortKeys[0]) : 0
        comp.outputs[1] = (firstPort >> 0) & 0x1
        comp.outputs[2] = (firstPort >> 1) & 0x1
        comp.outputs[3] = (firstPort >> 2) & 0x1
        comp.outputs[4] = (firstPort >> 3) & 0x1
      }
    })
  }

  // EXT_RAM I/O 处理
  function handleExtRamIO(comp, ioBus) {
    if (!comp.state) {
      comp.state = {
        memory: new Array(256).fill(0),
        addressReg: 0,
        dataReg: 0,
        controlReg: 0,
        lastAccessedAddr: -1
      }
    }

    const state = comp.state
    const ADDR_PORT = 0x80
    const DATA_PORT = 0x81
    const CTRL_PORT = 0x82

    // 处理 STORE 到地址寄存器
    if (ioBus.outputs[ADDR_PORT] !== undefined) {
      state.addressReg = ioBus.outputs[ADDR_PORT] & 0xFF
      state.lastAccessedAddr = state.addressReg
    }

    // 处理 STORE 到数据寄存器（写入 RAM）
    if (ioBus.outputs[DATA_PORT] !== undefined) {
      state.memory[state.addressReg] = ioBus.outputs[DATA_PORT] & 0xFF
      state.dataReg = ioBus.outputs[DATA_PORT] & 0xFF
      state.lastAccessedAddr = state.addressReg
      // 块模式：自动递增地址
      if (state.controlReg & 0x02) {
        state.addressReg = (state.addressReg + 1) & 0xFF
      }
    }

    // 处理 STORE 到控制寄存器
    if (ioBus.outputs[CTRL_PORT] !== undefined) {
      const ctrl = ioBus.outputs[CTRL_PORT] & 0xFF
      // bit2: 清零 RAM
      if (ctrl & 0x04) {
        state.memory.fill(0)
      }
      state.controlReg = ctrl
    }

    // 准备 LOAD 响应数据
    if (ioBus.outputs[DATA_PORT] === undefined) {
      // 只有当没有 STORE 到数据端口时，才准备读取数据
      ioBus.inputs[DATA_PORT] = state.memory[state.addressReg] || 0
    } else {
      // STORE 之后也准备数据，供下一个周期读取
      ioBus.inputs[DATA_PORT] = state.memory[state.addressReg] || 0
      if (state.controlReg & 0x02) {
        state.addressReg = (state.addressReg + 1) & 0xFF
      }
    }

    // 地址寄存器也可读
    ioBus.inputs[ADDR_PORT] = state.addressReg
    // 控制寄存器也可读
    ioBus.inputs[CTRL_PORT] = state.controlReg
  }

  // IO_PORT I/O 处理
  function handleIoPortIO(comp, ioBus) {
    if (!comp.state) {
      comp.state = {
        outputReg: 0,
        inputReg: 0,
        direction: 0xFF
      }
    }
    if (!comp.portNumber) {
      comp.portNumber = 0x90
    }

    const port = comp.portNumber
    const state = comp.state

    // CPU 写入 IO_PORT（STORE 指令）
    if (ioBus.outputs[port] !== undefined) {
      state.outputReg = ioBus.outputs[port] & 0xFF
      // 更新硬件输出端口
      for (let i = 0; i < 8 && comp.outputs[i]; i++) {
        comp.outputs[i].value = (state.outputReg >> i) & 1
      }
    }

    // 读取硬件输入端口
    let inputVal = 0
    for (let i = 0; i < 8 && comp.inputs[i]; i++) {
      if (comp.inputs[i].value === 1) {
        inputVal |= (1 << i)
      }
    }
    state.inputReg = inputVal

    // 准备 LOAD 响应数据
    ioBus.inputs[port] = state.inputReg
  }

  // TIMER I/O 处理
  function handleTimerIO(comp, ioBus) {
    if (!comp.state) {
      comp.state = {
        counter: 0,
        preload: 255,
        controlReg: 0,
        interruptFlag: 0
      }
    }
    if (!comp.portNumber) {
      comp.portNumber = 0x20
    }

    const port = comp.portNumber
    const state = comp.state

    // 端口映射：port=状态/控制，port+1=预加载值，port+2=控制命令
    const STATUS_PORT = port
    const PRELOAD_PORT = port + 1
    const CMD_PORT = port + 2

    // 处理预加载值写入
    if (ioBus.outputs[PRELOAD_PORT] !== undefined) {
      state.preload = ioBus.outputs[PRELOAD_PORT] & 0xFF
    }

    // 处理控制命令
    if (ioBus.outputs[CMD_PORT] !== undefined) {
      const cmd = ioBus.outputs[CMD_PORT] & 0xFF
      if (cmd & 0x01) {
        // 启动定时器
        state.counter = state.preload
        state.controlReg |= 0x01
      }
      if (cmd & 0x02) {
        // 停止定时器
        state.controlReg &= ~0x01
      }
      if (cmd & 0x04) {
        // 清除中断标志
        state.interruptFlag = 0
      }
    }

    // 准备 LOAD 响应
    ioBus.inputs[STATUS_PORT] = state.interruptFlag | (state.controlReg << 7)
    ioBus.inputs[PRELOAD_PORT] = state.preload
    ioBus.inputs[CMD_PORT] = state.controlReg
  }

  return {
    isSimulating,
    tickCount,
    clockSpeed,
    setClockSpeed,
    simulate,
    startSimulation,
    stopSimulation,
    stepSimulation,
    resetSimulation,
    stepCPU,
    stepInstructionExecutor
  }
}
