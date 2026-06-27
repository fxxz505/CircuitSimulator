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
          const outs = def.evaluate(vals, comp.state)
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
        
        // HALFADDER / FULLADDER / MUX2 / MUX4 / DEMUX2 已通过 evaluate 函数统一处理

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

        // SR触发器（标准行为：S=R=1 为禁止态，保持原值）
        if (comp.type === 'SRFF') {
          const s = comp.inputs[0].value
          const clk = comp.inputs[1].value
          const r = comp.inputs[2].value
          if (clk === 1 && comp.lastClock === 0) {
            if (s === 1 && r === 0) {
              comp.state = 1
              changed = true
            } else if (s === 0 && r === 1) {
              comp.state = 0
              changed = true
            }
            // S=R=1: 保持原值（标准禁止态）
            // S=R=0: 保持原值
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

        if (comp.type === 'EXT_RAM' && comp.inputs.length >= 10 && comp.directMode === true) {
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

        if (comp.type === 'IO_PORT' && comp.inputs.length >= 8 && comp.outputs.length >= 8 && comp.directMode === true) {
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
            if (comp.state.counter > 0) {
              comp.state.counter--
              if (comp.state.counter === 0) {
                comp.state.interruptFlag = 1
                comp.state.running = false
              }
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
          // P3-18: 采集波形历史
          if (!comp.waveformHistory) comp.waveformHistory = new Array(64).fill(0)
          comp.waveformHistory.push(comp.state.output)
          if (comp.waveformHistory.length > 64) comp.waveformHistory.shift()
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

        // DIPSW4: 同步4位开关状态到输出
        if (comp.type === 'DIPSW4') {
          if (!Array.isArray(comp.state)) comp.state = [0, 0, 0, 0]
          for (let i = 0; i < 4; i++) {
            if (comp.outputs[i] && comp.outputs[i].value !== comp.state[i]) {
              comp.outputs[i].value = comp.state[i]
              changed = true
            }
          }
        }

        // 电源元件: 确保输出与状态一致
        if (comp.type === 'GND' || comp.type === 'PULLDOWN') {
          if (comp.outputs[0] && comp.outputs[0].value !== 0) {
            comp.outputs[0].value = 0
            changed = true
          }
        }
        if (comp.type === 'VCC' || comp.type === 'PULLUP') {
          if (comp.outputs[0] && comp.outputs[0].value !== 1) {
            comp.outputs[0].value = 1
            changed = true
          }
        }

        // ==================== 新增元件仿真逻辑 ====================

        // 8位寄存器 REG8: D0-D7, CLK, LOAD
        if (comp.type === 'REG8' && comp.inputs.length >= 10) {
          const clk = comp.inputs[8]?.value || 0
          const load = comp.inputs[9]?.value || 0
          if (clk === 1 && (comp.lastClock || 0) === 0 && load === 1) {
            let val = 0
            for (let i = 0; i < 8; i++) val |= (comp.inputs[i]?.value || 0) << i
            if (comp.state !== val) { comp.state = val; changed = true }
          }
          comp.lastClock = clk
          for (let i = 0; i < 8; i++) {
            const bit = (comp.state >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bit) { comp.outputs[i].value = bit; changed = true }
          }
        }

        // 8位移位寄存器 SHIFT_REG8: SER, CLK, LOAD, D0-D7
        if (comp.type === 'SHIFT_REG8' && comp.inputs.length >= 11) {
          const ser = comp.inputs[0]?.value || 0
          const clk = comp.inputs[1]?.value || 0
          const load = comp.inputs[2]?.value || 0
          if (clk === 1 && (comp.lastClock || 0) === 0) {
            if (load === 1) {
              let val = 0
              for (let i = 0; i < 8; i++) val |= (comp.inputs[3 + i]?.value || 0) << i
              comp.state = val
            } else {
              comp.state = ((comp.state << 1) | ser) & 0xFF
            }
            changed = true
          }
          comp.lastClock = clk
          for (let i = 0; i < 8; i++) {
            const bit = (comp.state >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bit) { comp.outputs[i].value = bit; changed = true }
          }
        }

        // 8位计数器 COUNTER8: UP/DOWN, CLK, RST
        if (comp.type === 'COUNTER8' && comp.inputs.length >= 3) {
          const upDown = comp.inputs[0]?.value || 0
          const clk = comp.inputs[1]?.value || 0
          const rst = comp.inputs[2]?.value || 0
          if (rst === 1) {
            if (comp.state !== 0) { comp.state = 0; changed = true }
          } else if (clk === 1 && (comp.lastClock || 0) === 0) {
            comp.state = upDown ? ((comp.state + 1) & 0xFF) : ((comp.state - 1) & 0xFF)
            changed = true
          }
          comp.lastClock = clk
          for (let i = 0; i < 8; i++) {
            const bit = (comp.state >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bit) { comp.outputs[i].value = bit; changed = true }
          }
        }

        // 8位透明锁存器 LATCH_8: D0-D7, EN
        if (comp.type === 'LATCH_8' && comp.inputs.length >= 9) {
          const en = comp.inputs[8]?.value || 0
          if (en === 1) {
            let val = 0
            for (let i = 0; i < 8; i++) val |= (comp.inputs[i]?.value || 0) << i
            if (comp.state !== val) { comp.state = val; changed = true }
          }
          for (let i = 0; i < 8; i++) {
            const bit = (comp.state >> i) & 1
            if (comp.outputs[i] && comp.outputs[i].value !== bit) { comp.outputs[i].value = bit; changed = true }
          }
        }

        // 施密特触发器 SCHMITT: 带迟滞
        if (comp.type === 'SCHMITT') {
          const inp = comp.inputs[0]?.value || 0
          // 迟滞逻辑：输入1→输出1，输入0→输出0，状态保持
          let newOut = comp.state
          if (inp === 1) newOut = 1
          else if (inp === 0) newOut = 0
          if (comp.state !== newOut) { comp.state = newOut; changed = true }
          if (comp.outputs[0] && comp.outputs[0].value !== newOut) { comp.outputs[0].value = newOut; changed = true }
        }

        // 示波器 SCOPE: 持续采集输入信号
        if (comp.type === 'SCOPE') {
          if (!comp.state || !comp.state.history) comp.state = { history: new Array(128).fill(0) }
          const inp = comp.inputs[0]?.value || 0
          comp.state.history.push(inp)
          if (comp.state.history.length > 128) comp.state.history.shift()
        }

        // ROM32K: 15位地址读取
        if (comp.type === 'ROM32K') {
          let addr = 0
          for (let i = 0; i < 15 && comp.inputs[i]; i++) addr |= (comp.inputs[i].value << i)
          const dataOut = comp.state[addr] || 0
          for (let i = 0; i < 8 && comp.outputs[i]; i++) {
            const bit = (dataOut >> i) & 1
            if (comp.outputs[i].value !== bit) { comp.outputs[i].value = bit; changed = true }
          }
        }

        // SRAM32K: 15位地址, 8位数据, WE, OE, CLK
        if (comp.type === 'SRAM32K' && comp.inputs.length >= 25) {
          let addr = 0
          for (let i = 0; i < 15; i++) addr |= (comp.inputs[i]?.value || 0) << i
          let dataIn = 0
          for (let i = 0; i < 8; i++) dataIn |= (comp.inputs[15 + i]?.value || 0) << i
          const we = comp.inputs[23]?.value || 0
          const oe = comp.inputs[24]?.value || 0
          const clk = comp.inputs[22]?.value || 0

          if (!comp.state || !comp.state.memory) {
            comp.state = { memory: new Array(32768).fill(0), addressReg: 0, dataReg: 0 }
          }
          if (clk === 1 && (comp.lastClock || 0) === 0 && we === 1) {
            comp.state.memory[addr] = dataIn & 0xFF
            changed = true
          }
          comp.lastClock = clk
          if (oe === 1) {
            const dataOut = comp.state.memory[addr] || 0
            for (let i = 0; i < 8; i++) {
              const bit = (dataOut >> i) & 1
              if (comp.outputs[i] && comp.outputs[i].value !== bit) { comp.outputs[i].value = bit; changed = true }
            }
          }
        }

        // UART: 简化串口
        if (comp.type === 'UART' && comp.inputs.length >= 3) {
          const clk = comp.inputs[0]?.value || 0
          const txData = comp.inputs[1]?.value || 0
          const txStart = comp.inputs[2]?.value || 0
          if (!comp.state) comp.state = { txBuffer: [], rxBuffer: [], txReg: 0, rxReg: 0, txBusy: false, rxReady: false, baudDiv: 8, bitCount: 0, lastClk: 0 }
          if (clk === 1 && (comp.lastClock || 0) === 0) {
            if (txStart === 1 && !comp.state.txBusy) {
              comp.state.txReg = txData & 0xFF
              comp.state.txBusy = true
              comp.state.bitCount = 0
            }
            if (comp.state.txBusy) {
              comp.state.bitCount++
              if (comp.state.bitCount >= comp.state.baudDiv) {
                comp.state.bitCount = 0
                comp.state.txReg >>= 1
                if (comp.state.txReg === 0) comp.state.txBusy = false
              }
            }
          }
          comp.lastClock = clk
          if (comp.outputs[0] && comp.outputs[0].value !== (comp.state.txBusy ? (comp.state.txReg & 1) : 1)) {
            comp.outputs[0].value = comp.state.txBusy ? (comp.state.txReg & 1) : 1; changed = true
          }
          if (comp.outputs[1] && comp.outputs[1].value !== (comp.state.rxReady ? 1 : 0)) {
            comp.outputs[1].value = comp.state.rxReady ? 1 : 0; changed = true
          }
        }

        // PWM发生器
        if (comp.type === 'PWM_GENERATOR' && comp.inputs.length >= 2) {
          const freqCtrl = comp.inputs[0]?.value || 0
          const dutyCtrl = comp.inputs[1]?.value || 0
          if (!comp.state || typeof comp.state === 'number') comp.state = { counter: 0, output: 0 }
          const freq = comp.frequency || 4
          const duty = comp.dutyCycle || 50
          const period = Math.max(2, Math.round(60 / freq))
          const highCycles = Math.max(1, Math.round(period * duty / 100))
          comp.state.counter = (comp.state.counter || 0) + 1
          if (comp.state.counter >= period) comp.state.counter = 0
          const newOut = comp.state.counter < highCycles ? 1 : 0
          if (comp.state.output !== newOut) { comp.state.output = newOut; changed = true }
          if (comp.outputs[0] && comp.outputs[0].value !== newOut) { comp.outputs[0].value = newOut; changed = true }
        }

        // KEYPAD_4x4: 扫描键盘
        if (comp.type === 'KEYPAD_4x4') {
          if (!comp.state) comp.state = { pressed: -1, scanRow: 0, keyMap: 0 }
          // 行扫描输入决定当前输出列状态
          for (let col = 0; col < 4; col++) {
            const bit = (comp.state.keyMap >> (comp.state.scanRow * 4 + col)) & 1
            if (comp.outputs[col] && comp.outputs[col].value !== bit) { comp.outputs[col].value = bit; changed = true }
          }
        }

      })
      
      if (!changed) break
    }
  }

  // 公共指令执行函数：CPU 与 INSTRUCTION_EXECUTOR 共用
  // 指令字 16 位。opcode 扩展至 8 位：
  //   - 旧指令 opcode 0x00-0x0F（高 4 位为 0，向后兼容）
  //   - 扩展指令 opcode 0x10-0x1F（CALL/RET/PUSH/POP/INT/IRET/SP 等）
  function executeOneInstruction(comp, circuit) {
    const state = comp.state
    if (!state) return
    if (state.flags.HALT) return

    // 每次重新查找 ROM 以获取最新数据
    const rom = circuit.components.value.find(c => c.type === 'ROM256')
    if (!rom || !rom.state) return

    if (state.pc >= 256) {
      state.flags.HALT = true
      return
    }
    state.ir = rom.state[state.pc] || 0
    state.pc++

    // 8 位 opcode：若高 4 位非 0 则为扩展指令
    const opcode8 = (state.ir >> 12) & 0xFF
    const regA = (state.ir >> 8) & 0xF
    const regB = (state.ir >> 4) & 0xF
    const imm = state.ir & 0xF
    const addr8 = (regB << 4) | imm  // 8位地址字段
    const imm8 = state.ir & 0xFF      // 8位立即数（扩展指令用）
    const regs = state.registers
    const regNames = ['R0', 'R1', 'R2', 'R3']

    // 确保栈与 SP 已初始化（兼容旧 state）
    if (state.sp === undefined) state.sp = 0xFF
    if (!state.stack) state.stack = new Array(256).fill(0)
    if (state.interruptEnable === undefined) state.interruptEnable = false
    if (!state.interruptVector) state.interruptVector = new Array(16).fill(0)

    switch (opcode8) {
      // ===== 旧指令 0x00-0x0F（完全兼容） =====
      case 0x0: { // LOAD Ra, [addr8]
        const isIO = (addr8 & 0x80) !== 0
        if (isIO) {
          const port = addr8 & 0x7F
          regs[regNames[regA]] = comp.ioOutputs[`io_in_${port}`] || 0
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
          comp.ioOutputs[`io_out_${port}`] = regs[regNames[regA]] & 0xFF
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

      // ===== 扩展指令 0x10-0x1F =====
      case 0x10: { // CALL addr8 — PC 入栈，跳转到 addr8
        state.stack[state.sp] = state.pc & 0xFF
        state.sp = (state.sp - 1) & 0xFF
        state.pc = addr8
        break
      }
      case 0x11: { // RET — PC = 栈顶
        state.sp = (state.sp + 1) & 0xFF
        state.pc = state.stack[state.sp] & 0xFF
        break
      }
      case 0x12: { // PUSH Ra — SP--, mem[SP] = Ra
        state.stack[state.sp] = regs[regNames[regA]] & 0xFF
        state.sp = (state.sp - 1) & 0xFF
        break
      }
      case 0x13: { // POP Ra — Ra = mem[SP], SP++
        state.sp = (state.sp + 1) & 0xFF
        regs[regNames[regA]] = state.stack[state.sp] & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x14: { // INT n — 触发软件中断 n (n = imm)
        if (state.interruptEnable) {
          // 保存现场：PC 入栈
          state.stack[state.sp] = state.pc & 0xFF
          state.sp = (state.sp - 1) & 0xFF
          // 跳转到中断向量
          state.pc = (state.interruptVector[imm] || 0) & 0xFF
          state.flags.INT = true
          state.interruptEnable = false
        }
        break
      }
      case 0x15: { // IRET — 中断返回
        state.sp = (state.sp + 1) & 0xFF
        state.pc = state.stack[state.sp] & 0xFF
        state.flags.INT = false
        state.interruptEnable = true
        break
      }
      case 0x16: { // INC Ra
        const result = regs[regNames[regA]] + 1
        state.flags.CARRY = result > 255
        regs[regNames[regA]] = result & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x17: { // DEC Ra
        const result = regs[regNames[regA]] - 1
        state.flags.CARRY = result < 0
        regs[regNames[regA]] = result & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x18: { // ADDI Ra, imm — Ra += imm
        const result = regs[regNames[regA]] + imm
        state.flags.CARRY = result > 255
        regs[regNames[regA]] = result & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x19: { // SUBI Ra, imm — Ra -= imm
        const result = regs[regNames[regA]] - imm
        state.flags.CARRY = result < 0
        regs[regNames[regA]] = result & 0xFF
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x1A: { // JC addr8 — if CARRY: PC = addr8
        if (state.flags.CARRY) state.pc = addr8
        break
      }
      case 0x1B: { // JNC addr8 — if !CARRY: PC = addr8
        if (!state.flags.CARRY) state.pc = addr8
        break
      }
      case 0x1C: { // LDI8 Ra, imm8 — Ra = 8位立即数（利用 regB<<4|imm）
        regs[regNames[regA]] = imm8
        state.flags.ZERO = (regs[regNames[regA]] === 0)
        break
      }
      case 0x1D: { // CMPI Ra, imm8 — 比较 Ra 与 imm8
        state.flags.ZERO = (regs[regNames[regA]] === imm8)
        state.flags.CARRY = regs[regNames[regA]] < imm8
        break
      }
      case 0x1E: { // EI — 开中断
        state.interruptEnable = true
        break
      }
      case 0x1F: { // DI — 关中断
        state.interruptEnable = false
        break
      }
    }
    state.cyclesExecuted++
  }

  // 兼容性别名：保留旧函数名供外部调用
  function executeCPUInstruction(cpuComp, circuit) {
    return executeOneInstruction(cpuComp, circuit)
  }

  function executeInstructionExecutor(execComp, circuit) {
    return executeOneInstruction(execComp, circuit)
  }

  // 处理自定义组件内部的时序元件（DFF/DLATCH/JKFF/TFF/SRFF/COUNTER4/RING4/REG4/CLOCKDIVIDER 等）
  // 注意：自定义组件内部组件是临时副本，state 通过 ic.state/ic.lastClock 保留（需要 customData 持久化）
  function simulateInternalSequential(ic, icDef) {
    const type = ic.type
    if (ic.state === undefined) ic.state = 0
    if (ic.lastClock === undefined) ic.lastClock = 0

    if (type === 'DFF') {
      const d = ic.inputs[0]?.value || 0
      const clk = ic.inputs[1]?.value || 0
      if (clk === 1 && ic.lastClock === 0) ic.state = d
      ic.lastClock = clk
      if (ic.outputs[0]) ic.outputs[0].value = ic.state
      if (ic.outputs[1]) ic.outputs[1].value = 1 - ic.state
    } else if (type === 'DLATCH') {
      const d = ic.inputs[0]?.value || 0
      const en = ic.inputs[1]?.value || 0
      if (en === 1) ic.state = d
      if (ic.outputs[0]) ic.outputs[0].value = ic.state
      if (ic.outputs[1]) ic.outputs[1].value = 1 - ic.state
    } else if (type === 'JKFF') {
      const j = ic.inputs[0]?.value || 0
      const clk = ic.inputs[1]?.value || 0
      const k = ic.inputs[2]?.value || 0
      if (clk === 1 && ic.lastClock === 0) {
        if (j && !k) ic.state = 1
        else if (!j && k) ic.state = 0
        else if (j && k) ic.state = 1 - ic.state
      }
      ic.lastClock = clk
      if (ic.outputs[0]) ic.outputs[0].value = ic.state
      if (ic.outputs[1]) ic.outputs[1].value = 1 - ic.state
    } else if (type === 'TFF') {
      const t = ic.inputs[0]?.value || 0
      const clk = ic.inputs[1]?.value || 0
      if (clk === 1 && ic.lastClock === 0 && t === 1) ic.state = 1 - ic.state
      ic.lastClock = clk
      if (ic.outputs[0]) ic.outputs[0].value = ic.state
      if (ic.outputs[1]) ic.outputs[1].value = 1 - ic.state
    } else if (type === 'SRFF') {
      const s = ic.inputs[0]?.value || 0
      const clk = ic.inputs[1]?.value || 0
      const r = ic.inputs[2]?.value || 0
      if (clk === 1 && ic.lastClock === 0) {
        if (s && !r) ic.state = 1
        else if (!s && r) ic.state = 0
        // S=R=1 保持原值（标准行为）
      }
      ic.lastClock = clk
      if (ic.outputs[0]) ic.outputs[0].value = ic.state
      if (ic.outputs[1]) ic.outputs[1].value = 1 - ic.state
    } else if (type === 'COUNTER4') {
      const upDown = ic.inputs[0]?.value || 0
      const clk = ic.inputs[1]?.value || 0
      const reset = ic.inputs[2]?.value || 0
      if (reset === 1) ic.state = 0
      else if (clk === 1 && ic.lastClock === 0) {
        ic.state = upDown ? (ic.state + 1) % 16 : (ic.state - 1 + 16) % 16
      }
      ic.lastClock = clk
      for (let i = 0; i < 4; i++) if (ic.outputs[i]) ic.outputs[i].value = (ic.state >> i) & 1
    } else if (type === 'RING4') {
      const clk = ic.inputs[0]?.value || 0
      const reset = ic.inputs[1]?.value || 0
      if (reset === 1) ic.state = 1
      else if (clk === 1 && ic.lastClock === 0) {
        ic.state = ((ic.state << 1) | (ic.state >> 3)) & 0xF
      }
      ic.lastClock = clk
      for (let i = 0; i < 4; i++) if (ic.outputs[i]) ic.outputs[i].value = (ic.state >> i) & 1
    } else if (type === 'REG4') {
      const clk = ic.inputs[4]?.value || 0
      const load = ic.inputs[5]?.value || 0
      if (clk === 1 && ic.lastClock === 0 && load === 1) {
        ic.state = (ic.inputs[0]?.value || 0) | ((ic.inputs[1]?.value || 0) << 1) |
                   ((ic.inputs[2]?.value || 0) << 2) | ((ic.inputs[3]?.value || 0) << 3)
      }
      ic.lastClock = clk
      for (let i = 0; i < 4; i++) if (ic.outputs[i]) ic.outputs[i].value = (ic.state >> i) & 1
    } else if (type === 'CLOCKDIVIDER') {
      const clk = ic.inputs[0]?.value || 0
      const rst = ic.inputs[1]?.value || 0
      const divideBy = ic.divideBy || 2
      if (typeof ic.state === 'number') ic.state = { output: 0, counter: 0 }
      if (rst === 1) { ic.state.output = 0; ic.state.counter = 0; ic.lastClock = 0 }
      else if (clk === 1 && ic.lastClock === 0) {
        ic.state.counter = (ic.state.counter || 0) + 1
        if (ic.state.counter >= divideBy) {
          ic.state.counter = 0
          ic.state.output = 1 - ic.state.output
        }
      }
      ic.lastClock = clk
      if (ic.outputs[0]) ic.outputs[0].value = ic.state.output
    }
  }

  function simulateCustomComponent(comp, customDef, circuit) {
    const customData = customDef.customData
    if (!customData) return

    // P0-2 修复：持久化内部组件运行态到 comp._internalState，避免每 tick 重建副本导致时序元件失忆
    // 首次调用时基于 customData.internalComponents 构建一份运行态副本并挂到 comp 上
    if (!comp._internalState || !comp._internalState.internalComps) {
      const internalComps = customData.internalComponents.map(ic => {
        const icDef = COMPONENT_TYPES[ic.type]
        if (!icDef) return null
        return {
          ...ic,
          inputs: Array(icDef.inputs).fill(0).map(() => ({ value: 0 })),
          outputs: Array(icDef.outputs).fill(0).map(() => ({ value: 0 })),
          // 深拷贝 state（处理对象/数组/数字）
          state: ic.state !== undefined ? JSON.parse(JSON.stringify(ic.state)) : (icDef.state !== undefined ? JSON.parse(JSON.stringify(icDef.state)) : 0),
          lastClock: ic.lastClock || 0,
          ioOutputs: {}
        }
      }).filter(Boolean)
      comp._internalState = { internalComps }
    }

    const internalComps = comp._internalState.internalComps

    // 外部输入端口 -> 内部组件
    if (customData.inputPorts) {
      customData.inputPorts.forEach((port, i) => {
        const targetComp = internalComps.find(ic => ic.id === port.componentId)
        if (targetComp && comp.inputs[i]) {
          targetComp.inputs[port.port].value = comp.inputs[i].value
        }
      })
    }

    // 迭代求解（组合逻辑收敛）
    for (let iter = 0; iter < 5; iter++) {
      internalComps.forEach(ic => {
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

        // 优先使用 evaluate 函数（覆盖逻辑门/译码器/HALFADDER/FULLADDER/MUX2 等）
        if (icDef.evaluate) {
          const vals = ic.inputs.map(i => i.value)
          const outs = icDef.evaluate(vals)
          outs.forEach((v, i) => {
            if (ic.outputs[i]) {
              ic.outputs[i].value = v
            }
          })
        }

        // 时序元件（isMemory）支持 - state 已持久化在 comp._internalState
        if (icDef.isMemory) {
          simulateInternalSequential(ic, icDef)
        }
      })
    }

    // 内部输出端口 -> 外部
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
      // 处理 CLOCK 元件
      circuit.components.value.filter(c => c.type === 'CLOCK').forEach(c => {
        if (c.enabled === false) return
        // P2-9: ENABLE 输入端口 — en=0 时暂停时钟（保持当前值）
        const en = c.inputs[0]?.value
        if (en === 0) {
          if (c.waveformHistory) {
            c.waveformHistory.push(c.state)
            if (c.waveformHistory.length > 64) c.waveformHistory.shift()
          }
          return
        }
        // P0-2: 高频钳制 — freq 上限 = clockSpeed/2，保证 period >= 2（有高低电平）
        const rawFreq = c.frequency || 1
        const freq = Math.min(rawFreq, Math.floor(clockSpeed.value / 2))
        const duty = c.dutyCycle || 50
        const phase = c.phase || 0
        const period = Math.max(2, Math.round(clockSpeed.value / freq))
        const phaseOffset = Math.round((phase / 360) * period)
        const pos = ((tickCount.value + phaseOffset) % period)
        const newState = pos < (period * duty / 100) ? 1 : 0
        c.state = newState
        if (c.outputs[0]) c.outputs[0].value = c.state
        if (!c.waveformHistory) c.waveformHistory = new Array(64).fill(0)
        c.waveformHistory.push(newState)
        if (c.waveformHistory.length > 64) c.waveformHistory.shift()
      })
      // 处理 OSCILLATOR 元件（P0-3: 补齐 dutyCycle/phase 支持）
      circuit.components.value.filter(c => c.type === 'OSCILLATOR').forEach(c => {
        if (c.enabled === false) return
        const rawFreq = c.frequency || 2
        const freq = Math.min(rawFreq, Math.floor(clockSpeed.value / 2))
        const duty = c.dutyCycle || 50
        const phase = c.phase || 0
        const period = Math.max(2, Math.round(clockSpeed.value / freq))
        const phaseOffset = Math.round((phase / 360) * period)
        const pos = ((tickCount.value + phaseOffset) % period)
        const newState = pos < (period * duty / 100) ? 1 : 0
        c.state = newState
        if (c.outputs[0]) c.outputs[0].value = c.state
        if (!c.waveformHistory) c.waveformHistory = new Array(64).fill(0)
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
      // P2-9: ENABLE 输入端口
      const en = c.inputs[0]?.value
      if (en === 0) return
      const rawFreq = c.frequency || 1
      const freq = Math.min(rawFreq, Math.floor(clockSpeed.value / 2))
      const duty = c.dutyCycle || 50
      const phase = c.phase || 0
      const period = Math.max(2, Math.round(clockSpeed.value / freq))
      const phaseOffset = Math.round((phase / 360) * period)
      const pos = ((tickCount.value + phaseOffset) % period)
      c.state = pos < (period * duty / 100) ? 1 : 0
      if (c.outputs[0]) c.outputs[0].value = c.state
      if (!c.waveformHistory) c.waveformHistory = new Array(64).fill(0)
      c.waveformHistory.push(c.state)
      if (c.waveformHistory.length > 64) c.waveformHistory.shift()
    })
    circuit.components.value.filter(c => c.type === 'OSCILLATOR').forEach(c => {
      if (c.enabled === false) return
      const rawFreq = c.frequency || 2
      const freq = Math.min(rawFreq, Math.floor(clockSpeed.value / 2))
      const duty = c.dutyCycle || 50
      const phase = c.phase || 0
      const period = Math.max(2, Math.round(clockSpeed.value / freq))
      const phaseOffset = Math.round((phase / 360) * period)
      const pos = ((tickCount.value + phaseOffset) % period)
      c.state = pos < (period * duty / 100) ? 1 : 0
      if (c.outputs[0]) c.outputs[0].value = c.state
      if (!c.waveformHistory) c.waveformHistory = new Array(64).fill(0)
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
        // P0-1: 清空波形历史
        if (c.type === 'CLOCK') c.waveformHistory = new Array(64).fill(0)
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
      // 电源元件
      if (c.type === 'GND' || c.type === 'PULLDOWN') {
        c.state = 0
        if (c.outputs[0]) c.outputs[0].value = 0
      }
      if (c.type === 'VCC' || c.type === 'PULLUP') {
        c.state = 1
        if (c.outputs[0]) c.outputs[0].value = 1
      }
      // 按键复位
      if (c.type === 'BUTTON') {
        c.state = 0
        if (c._btnTimer) { clearTimeout(c._btnTimer); c._btnTimer = null }
        if (c.outputs[0]) c.outputs[0].value = 0
      }
      // 4位拨码开关复位
      if (c.type === 'DIPSW4') {
        c.state = [0, 0, 0, 0]
        for (let i = 0; i < 4; i++) {
          if (c.outputs[i]) c.outputs[i].value = 0
        }
      }
      if (c.type === 'CLOCKDIVIDER') {
        c.state = { output: 0, counter: 0 }
        c.lastClock = 0
        if (c.outputs[0]) c.outputs[0].value = 0
        c.waveformHistory = new Array(64).fill(0)
      }
      if (c.type === 'CPU') {
        c.state = {
          registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
          pc: 0, ir: 0,
          sp: 0xFF,
          stack: new Array(256).fill(0),
          flags: { ZERO: false, CARRY: false, HALT: false, INT: false },
          running: false,
          cyclesExecuted: 0,
          interruptEnable: false,
          interruptVector: new Array(16).fill(0)
        }
        c.lastClock = 0
        c.ioOutputs = {}
        if (c._internalState) c._internalState = null
      }
      if (c.type === 'INSTRUCTION_EXECUTOR') {
        c.state = {
          registers: { R0: 0, R1: 0, R2: 0, R3: 0 },
          pc: 0, ir: 0,
          sp: 0xFF,
          stack: new Array(256).fill(0),
          flags: { ZERO: false, CARRY: false, HALT: false, INT: false },
          running: false,
          cyclesExecuted: 0,
          interruptEnable: false,
          interruptVector: new Array(16).fill(0)
        }
        c.lastClock = 0
        c.ioOutputs = {}
      }
      // ROM256 程序内容不应复位（用户烧录的程序），但 PC 由 CPU 自己管；这里仅清空运行时
      if (c.type === 'ROM256') {
        // 保留 state 数组（程序代码），不重置
      }
      // EXT_RAM 复位：清空内存与寄存器
      if (c.type === 'EXT_RAM') {
        c.state = {
          memory: new Array(256).fill(0),
          addressReg: 0,
          dataReg: 0,
          controlReg: 0
        }
        c.lastClock = 0
      }
      // IO_PORT 复位
      if (c.type === 'IO_PORT') {
        c.state = {
          outputReg: 0,
          inputReg: 0,
          lastWrittenValue: 0
        }
      }
      // TIMER 复位
      if (c.type === 'TIMER') {
        c.state = {
          counter: 0,
          preload: 255,
          controlReg: 0,
          interruptFlag: 0,
          running: false,
          tickCount: 0
        }
        c.lastClock = 0
      }
      // IO_BRIDGE 复位
      if (c.type === 'IO_BRIDGE') {
        c.state = {
          transferCount: 0,
          lastActivity: null,
          activePorts: [],
          lastData: {},
          lastClk: 0
        }
        // 修复：outputs 元素必须是 { value } 对象
        if (c.outputs && c.outputs.length === 5) {
          c.outputs.forEach(o => { o.value = 0 })
        } else {
          c.outputs = Array(5).fill(0).map(() => ({ value: 0 }))
        }
      }
      // 显示缓冲复位
      if (c.type === 'LCD1602') {
        c.lcdBuffer = ['                ', '                ']
        c.lcdCursor = { x: 0, y: 0 }
        c.lcdLastE = 0
      }
      if (c.type === 'DOTMATRIX16') {
        // 点阵显示状态由 charROM 与输入驱动，复位 charROM 缓存
        if (c.charROM) c.charROM = null
      }
      // 新增元件复位
      if (c.type === 'REG8' || c.type === 'SHIFT_REG8' || c.type === 'COUNTER8' || c.type === 'LATCH_8' || c.type === 'SCHMITT') {
        c.state = 0
        c.lastClock = 0
      }
      if (c.type === 'OSCILLATOR') {
        c.state = 0
        if (c.outputs[0]) c.outputs[0].value = 0
        c.waveformHistory = new Array(64).fill(0)
      }
      if (c.type === 'SCOPE') {
        c.state = { history: new Array(128).fill(0) }
      }
      if (c.type === 'ROM32K') {
        c.state = new Array(32768).fill(0)
      }
      if (c.type === 'SRAM32K') {
        c.state = { memory: new Array(32768).fill(0), addressReg: 0, dataReg: 0 }
        c.lastClock = 0
      }
      if (c.type === 'UART') {
        c.state = { txBuffer: [], rxBuffer: [], txReg: 0, rxReg: 0, txBusy: false, rxReady: false, baudDiv: 8, bitCount: 0, lastClk: 0 }
        c.lastClock = 0
      }
      if (c.type === 'PWM_GENERATOR') {
        c.state = { counter: 0, output: 0 }
        c.lastClock = 0
      }
      if (c.type === 'KEYPAD_4x4') {
        c.state = { pressed: -1, scanRow: 0, keyMap: 0 }
      }
      // 自定义组件内部状态复位
      if (c._internalState) c._internalState = null
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

    // 2. 分发到外设组件（仅处理端口模式 directMode !== true）
    circuit.components.value.forEach(comp => {
      if (comp.type === 'EXT_RAM' && comp.portConfig && comp.directMode !== true) {
        handleExtRamIO(comp, ioBus)
      }
      if (comp.type === 'IO_PORT' && comp.portConfig && comp.directMode !== true) {
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

    // 4. TIMER 计数器递减已移至主循环（按 CLK 上升沿触发），避免双重递减

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
        
        // 修复：outputs 元素必须是 { value } 对象，与项目约定一致
        if (!comp.outputs || comp.outputs.length < 5) {
          comp.outputs = Array(5).fill(0).map(() => ({ value: 0 }))
        }
        const firstPort = activePortKeys.length > 0 ? parseInt(activePortKeys[0]) : 0
        const newVals = [
          activePortKeys.length > 0 ? 1 : 0,
          (firstPort >> 0) & 0x1,
          (firstPort >> 1) & 0x1,
          (firstPort >> 2) & 0x1,
          (firstPort >> 3) & 0x1
        ]
        newVals.forEach((v, i) => {
          if (comp.outputs[i] && comp.outputs[i].value !== v) {
            comp.outputs[i].value = v
          }
        })
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
        interruptFlag: 0,
        running: false,
        tickCount: 0
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
        // 启动定时器：同步设置 running，与主循环 state.running 检查对齐
        state.counter = state.preload
        state.controlReg |= 0x01
        state.running = true
      }
      if (cmd & 0x02) {
        // 停止定时器
        state.controlReg &= ~0x01
        state.running = false
      }
      if (cmd & 0x04) {
        // 清除中断标志
        state.interruptFlag = 0
      }
      if (cmd & 0x08) {
        // 重载预加载值
        state.counter = state.preload
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
