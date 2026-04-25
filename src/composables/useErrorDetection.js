import { ref } from 'vue'

export function useErrorDetection(circuit) {
  const errors = ref([])
  const warnings = ref([])

  function detectErrors() {
    errors.value = []
    warnings.value = []

    detectFloatingInputs()
    detectShortCircuits()
    detectFeedbackLoops()
    detectUnconnectedOutputs()
    detectMultipleDrivers()

    return {
      errors: [...errors.value],
      warnings: [...warnings.value]
    }
  }

  function detectFloatingInputs() {
    circuit.components.value.forEach(comp => {
      if (comp.type === 'TEXT' || comp.type === 'LED' || comp.type === 'SEGDISPLAY8' || 
          comp.type === 'SEGDISPLAY1' || comp.type === 'DOTMATRIX16' || comp.type === 'LCD1602') {
        return
      }

      comp.inputs.forEach((input, idx) => {
        const isConnected = circuit.wires.value.some(w => 
          w.to.componentId === comp.id && w.to.port === idx
        )

        if (!isConnected && comp.type !== 'SWITCH' && comp.type !== 'CLOCK' && 
            comp.type !== 'CONST0' && comp.type !== 'CONST1') {
          errors.value.push({
            type: 'floating_input',
            severity: 'error',
            component: comp,
            message: `组件 "${comp.type}" 的输入引脚 ${idx} 悬空`,
            suggestion: `请将引脚 ${idx} 连接到高电平或低电平信号源`
          })
        }
      })
    })
  }

  function detectShortCircuits() {
    const outputConnections = new Map()

    circuit.wires.value.forEach(wire => {
      const fromComp = circuit.getComponentById(wire.from.componentId)
      if (!fromComp) return

      const key = `${wire.to.componentId}:${wire.to.port}`
      if (!outputConnections.has(key)) {
        outputConnections.set(key, [])
      }
      outputConnections.get(key).push(wire)
    })

    outputConnections.forEach((wires, key) => {
      if (wires.length > 1) {
        const [compId, port] = key.split(':')
        const comp = circuit.getComponentById(compId)
        if (comp) {
          warnings.value.push({
            type: 'multiple_drivers',
            severity: 'warning',
            component: comp,
            message: `组件 "${comp.type}" 的输入引脚 ${port} 被多个输出驱动`,
            suggestion: '多个输出连接到同一输入可能导致冲突，请检查连线'
          })
        }
      }
    })
  }

  function detectFeedbackLoops() {
    const visited = new Set()
    const recursionStack = new Set()

    function dfs(compId, path) {
      if (recursionStack.has(compId)) {
        const loopStart = path.indexOf(compId)
        if (loopStart !== -1) {
          const loopComponents = path.slice(loopStart).map(id => circuit.getComponentById(id)).filter(Boolean)
          errors.value.push({
            type: 'feedback_loop',
            severity: 'error',
            component: loopComponents[0],
            message: `检测到组合逻辑环路: ${loopComponents.map(c => c.type).join(' -> ')}`,
            suggestion: '组合逻辑中不允许存在环路，请添加触发器或移除反馈连接'
          })
        }
        return
      }

      if (visited.has(compId)) return

      visited.add(compId)
      recursionStack.add(compId)

      const comp = circuit.getComponentById(compId)
      if (!comp) return

      const outputWires = circuit.wires.value.filter(w => w.from.componentId === compId)
      outputWires.forEach(wire => {
        const nextComp = circuit.getComponentById(wire.to.componentId)
        if (nextComp && !nextComp.type.includes('FF') && !nextComp.type.includes('LATCH') && 
            nextComp.type !== 'REG4' && nextComp.type !== 'COUNTER4' && nextComp.type !== 'RAM164') {
          dfs(wire.to.componentId, [...path, compId])
        }
      })

      recursionStack.delete(compId)
    }

    const inputComps = circuit.components.value.filter(c => 
      c.type === 'SWITCH' || c.type === 'CLOCK' || c.type === 'CONST0' || c.type === 'CONST1'
    )

    inputComps.forEach(comp => {
      visited.clear()
      recursionStack.clear()
      dfs(comp.id, [])
    })
  }

  function detectUnconnectedOutputs() {
    circuit.components.value.forEach(comp => {
      if (comp.type === 'SWITCH' || comp.type === 'CLOCK' || comp.type === 'CONST0' || 
          comp.type === 'CONST1' || comp.type === 'TEXT') {
        return
      }

      comp.outputs.forEach((output, idx) => {
        const isConnected = circuit.wires.value.some(w => 
          w.from.componentId === comp.id && w.from.port === idx
        )

        if (!isConnected && comp.type !== 'LED' && comp.type !== 'SEGDISPLAY8' && 
            comp.type !== 'SEGDISPLAY1' && comp.type !== 'DOTMATRIX16' && comp.type !== 'LCD1602') {
          warnings.value.push({
            type: 'unconnected_output',
            severity: 'warning',
            component: comp,
            message: `组件 "${comp.type}" 的输出引脚 ${idx} 未连接`,
            suggestion: `请将输出引脚 ${idx} 连接到后续电路或LED进行观察`
          })
        }
      })
    })
  }

  function detectMultipleDrivers() {
    const inputDrivers = new Map()

    circuit.wires.value.forEach(wire => {
      const key = `${wire.to.componentId}:${wire.to.port}`
      if (!inputDrivers.has(key)) {
        inputDrivers.set(key, [])
      }
      inputDrivers.get(key).push(wire.from.componentId)
    })

    inputDrivers.forEach((drivers, key) => {
      const uniqueDrivers = [...new Set(drivers)]
      if (uniqueDrivers.length > 1) {
        const [compId, port] = key.split(':')
        const comp = circuit.getComponentById(compId)
        if (comp) {
          errors.value.push({
            type: 'output_short',
            severity: 'error',
            component: comp,
            message: `输出短路：多个组件驱动同一输入点`,
            suggestion: '不允许将多个输出直接连接到同一输入，请使用逻辑门或三态缓冲器'
          })
        }
      }
    })
  }

  return {
    errors,
    warnings,
    detectErrors
  }
}
