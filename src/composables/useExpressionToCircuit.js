export function parseExpression(expr) {
  expr = expr.trim()
  
  const orTerms = expr.split(/\s*\|\s*|\s*\bor\b\s*/i)
  
  const andTermsList = orTerms.map(term => {
    term = term.trim().replace(/^\(|\)$/g, '')
    const andParts = term.split(/\s*&\s*|\s*and\s*|\s*\*\s*/i)
    return andParts.map(part => {
      part = part.trim()
      if (part.startsWith('!') || part.startsWith('¬') || part.startsWith('~')) {
        return { type: 'not', variable: part.substring(1).trim() }
      }
      return { type: 'var', variable: part }
    })
  })
  
  return { type: 'expression', terms: andTermsList }
}

export function generateCircuitFromExpression(expression, circuit) {
  const parsed = parseExpression(expression)
  
  const variablePositions = {}
  let currentX = -300
  let currentY = -200
  
  const variables = new Set()
  parsed.terms.forEach(term => {
    term.forEach(lit => {
      variables.add(lit.variable)
    })
  })
  
  const sortedVars = [...variables].sort()
  sortedVars.forEach((v, i) => {
    variablePositions[v] = { x: currentX, y: currentY + i * 80 }
  })
  
  const switches = {}
  sortedVars.forEach(v => {
    const pos = variablePositions[v]
    const sw = circuit.addComponent('SWITCH', pos.x, pos.y)
    switches[v] = sw
  })
  
  let outputY = -100
  const outputX = 300
  
  parsed.terms.forEach((term, termIdx) => {
    const termY = outputY + termIdx * 100
    
    if (term.length === 1) {
      const lit = term[0]
      if (lit.type === 'var') {
        const sw = switches[lit.variable]
        const led = circuit.addComponent('LED', outputX, termY)
        circuit.addWire(sw, 0, led, 0)
      } else if (lit.type === 'not') {
        const sw = switches[lit.variable]
        const notGate = circuit.addComponent('NOT', outputX - 100, termY)
        const led = circuit.addComponent('LED', outputX, termY)
        circuit.addWire(sw, 0, notGate, 0)
        circuit.addWire(notGate, 0, led, 0)
      }
    } else {
      let lastOutput = null
      let lastComp = null
      
      term.forEach((lit, litIdx) => {
        let inputComp = null
        let inputPort = 0
        
        if (lit.type === 'var') {
          inputComp = switches[lit.variable]
          inputPort = 0
        } else if (lit.type === 'not') {
          const notGate = circuit.addComponent('NOT', outputX - 200, termY + litIdx * 40)
          const sw = switches[lit.variable]
          circuit.addWire(sw, 0, notGate, 0)
          inputComp = notGate
          inputPort = 0
        }
        
        if (lastComp) {
          const andGate = circuit.addComponent('AND', outputX - 100 + litIdx * 50, termY)
          circuit.addWire(lastComp, lastPort, andGate, 0)
          circuit.addWire(inputComp, inputPort, andGate, 1)
          lastComp = andGate
          lastPort = 0
        } else {
          lastComp = inputComp
          lastPort = inputPort
        }
      })
      
      if (lastComp) {
        const led = circuit.addComponent('LED', outputX, termY)
        circuit.addWire(lastComp, lastPort, led, 0)
      }
    }
  })
  
  let yPos = -200 + sortedVars.length * 80 + 40
  const textComp = circuit.addComponent('TEXT', -200, yPos)
  textComp.text = `逻辑表达式: ${expression}`
  textComp.width = 400
  textComp.height = 60
}
