import { ref, computed } from 'vue'
import { COMPONENT_TYPES } from '../constants/componentTypes'

export function useTruthTable(circuit) {
  const truthTable = ref(null)
  const logicExpression = ref('')
  const inputCount = ref(0)
  const outputCount = ref(0)

  function analyzeCircuit() {
    const inputComps = circuit.components.value.filter(c => 
      c.type === 'SWITCH' || c.type === 'CONST0' || c.type === 'CONST1'
    )
    const outputComps = circuit.components.value.filter(c => 
      c.type === 'LED' || c.type === 'SEGDISPLAY1' || c.type === 'SEGDISPLAY8'
    )

    if (inputComps.length === 0 || outputComps.length === 0) {
      truthTable.value = null
      logicExpression.value = ''
      return
    }

    const hasMemoryElements = circuit.components.value.some(c => 
      c.type === 'DFF' || c.type === 'DLATCH' || c.type === 'CLOCK' ||
      c.type === 'CPU' || c.type === 'ROM256' || c.type === 'EXT_RAM' ||
      c.type === 'IO_PORT' || c.type === 'IO_BRIDGE' || c.type === 'TIMER' ||
      c.type === 'SEGDISPLAY8' || c.type === 'DOTMATRIX16' || c.type === 'LCD1602'
    )

    if (hasMemoryElements) {
      truthTable.value = {
        inputs: [],
        outputs: [],
        rows: [],
        isSequential: true,
        message: '此电路包含时序元件（DFF/时钟/CPU等），无法生成真值表。\n真值表仅适用于纯组合逻辑电路。'
      }
      logicExpression.value = ''
      return
    }

    if (inputComps.length > 8) {
      truthTable.value = {
        inputs: [],
        outputs: [],
        rows: [],
        isTooLarge: true,
        message: `输入端口过多（${inputComps.length}个），真值表将有 ${Math.pow(2, inputComps.length)} 行，超出显示范围。\n建议减少输入数量或使用更简单的电路。`
      }
      logicExpression.value = ''
      return
    }

    inputCount.value = inputComps.length
    outputCount.value = outputComps.length

    const rows = []
    const totalCombinations = Math.pow(2, inputComps.length)

    for (let i = 0; i < totalCombinations; i++) {
      const inputValues = []
      for (let j = 0; j < inputComps.length; j++) {
        inputValues.push((i >> j) & 1)
      }

      const originalValues = inputComps.map(c => c.outputs[0]?.value || 0)
      inputComps.forEach((comp, idx) => {
        if (comp.outputs[0]) {
          comp.outputs[0].value = inputValues[idx]
        }
      })

      simulateOnce()

      const outputValues = outputComps.map(c => c.inputs[0]?.value || 0)
      rows.push({ inputs: [...inputValues], outputs: [...outputValues] })

      inputComps.forEach((comp, idx) => {
        if (comp.outputs[0]) {
          comp.outputs[0].value = originalValues[idx]
        }
      })
    }

    truthTable.value = {
      inputs: inputComps.map((c, i) => `In${i}`),
      outputs: outputComps.map((c, i) => `Out${i}`),
      rows
    }

    generateLogicExpressions(inputComps, outputComps, rows)
  }

  function simulateOnce() {
    for (let iter = 0; iter < 20; iter++) {
      let changed = false
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

      circuit.components.value.forEach(comp => {
        const def = COMPONENT_TYPES[comp.type]
        if (def && def.evaluate) {
          const inputVals = comp.inputs.map(i => i.value)
          const outputs = def.evaluate(inputVals)
          outputs.forEach((val, idx) => {
            if (comp.outputs[idx] && comp.outputs[idx].value !== val) {
              comp.outputs[idx].value = val
              changed = true
            }
          })
        }
      })

      if (!changed) break
    }
  }

  function generateLogicExpressions(inputComps, outputComps, rows) {
    const expressions = []

    for (let outIdx = 0; outIdx < outputComps.length; outIdx++) {
      const highRows = rows.filter(r => r.outputs[outIdx] === 1)
      if (highRows.length === 0) {
        expressions.push(`Out${outIdx} = 0`)
        continue
      }

      const terms = highRows.map(row => {
        const literals = []
        for (let i = 0; i < row.inputs.length; i++) {
          if (row.inputs[i] === 1) {
            literals.push(`In${i}`)
          } else {
            literals.push(`!In${i}`)
          }
        }
        return literals.length > 1 ? `(${literals.join(' & ')})` : literals[0]
      })

      expressions.push(`Out${outIdx} = ${terms.join(' | ')}`)
    }

    logicExpression.value = expressions.join('\n')
  }

  function simplifyExpression(expr) {
    let simplified = expr
    simplified = simplified.replace(/!In(\d+) & !In\1/g, '!In$1')
    simplified = simplified.replace(/In(\d+) & In\1/g, 'In$1')
    return simplified
  }

  return {
    truthTable,
    logicExpression,
    inputCount,
    outputCount,
    analyzeCircuit,
    simplifyExpression
  }
}
