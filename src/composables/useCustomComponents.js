import { ref } from 'vue'
import { COMPONENT_TYPES } from '../constants/componentTypes'

export const customComponents = ref([])

let customComponentIdCounter = 0

export function loadCustomComponents() {
  try {
    const saved = localStorage.getItem('customComponents')
    if (saved) {
      let data = JSON.parse(saved)
      if (Array.isArray(data)) {
        customComponents.value = data
        customComponentIdCounter = Math.max(0, ...customComponents.value.map(c => {
          const match = c.id.match(/CUSTOM_(\d+)/)
          return match ? parseInt(match[1]) : 0
        }))
      }
    }
  } catch (e) {
    console.error('Failed to load custom components:', e)
  }
}

export function clearAllCustomComponents() {
  customComponents.value = []
  customComponentIdCounter = 0
  localStorage.removeItem('customComponents')
}

export function saveCustomComponents() {
  try {
    localStorage.setItem('customComponents', JSON.stringify(customComponents.value))
  } catch (e) {
    console.error('Failed to save custom components:', e)
  }
}

export function createCustomComponent(name, components, wires) {
  const id = `CUSTOM_${++customComponentIdCounter}`
  
  const minX = Math.min(...components.map(c => c.x))
  const minY = Math.min(...components.map(c => c.y))
  const maxX = Math.max(...components.map(c => c.x + c.width))
  const maxY = Math.max(...components.map(c => c.y + c.height))
  
  const width = maxX - minX + 60
  const height = maxY - minY + 40
  
  const inputPorts = []
  const outputPorts = []
  
  components.forEach(comp => {
    const def = COMPONENT_TYPES[comp.type]
    if (!def) return
    
    for (let i = 0; i < def.inputs; i++) {
      const hasWire = wires.some(w => 
        w.to.componentId === comp.id && w.to.port === i
      )
      if (!hasWire) {
        inputPorts.push({
          componentId: comp.id,
          port: i,
          label: `IN${inputPorts.length}`
        })
      }
    }
    
    for (let i = 0; i < def.outputs; i++) {
      const hasWire = wires.some(w => 
        w.from.componentId === comp.id && w.from.port === i
      )
      if (!hasWire) {
        outputPorts.push({
          componentId: comp.id,
          port: i,
          label: `OUT${outputPorts.length}`
        })
      }
    }
  })
  
  const GRID_SIZE = 20
  
  function snapToGrid(x, y) {
    return {
      x: Math.round(x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(y / GRID_SIZE) * GRID_SIZE
    }
  }
  
  const internalWires = wires.map(w => ({
    from: { componentId: w.from.componentId, port: w.from.port },
    to: { componentId: w.to.componentId, port: w.to.port },
    points: (w.points || []).map(p => {
      const snapped = snapToGrid(p.x - minX + 30, p.y - minY + 20)
      return snapped
    })
  }))
  
  const internalComponents = components.map(c => {
    const snapped = snapToGrid(c.x - minX + 30, c.y - minY + 20)
    return {
      ...c,
      x: snapped.x,
      y: snapped.y
    }
  })
  
  const customComp = {
    id,
    name: name || id,
    width,
    height,
    color: '#9b59b6',
    label: name?.substring(0, 4) || 'CUST',
    inputs: inputPorts.length,
    outputs: outputPorts.length,
    isCustom: true,
    internalComponents,
    internalWires,
    inputPorts,
    outputPorts,
    expanded: false
  }
  
  customComponents.value.push(customComp)
  saveCustomComponents()
  
  return customComp
}

export function removeCustomComponent(id) {
  const idx = customComponents.value.findIndex(c => c.id === id)
  if (idx > -1) {
    customComponents.value.splice(idx, 1)
    saveCustomComponents()
  }
}

export function exportCustomComponents(components = null, filename = null) {
  const data = JSON.stringify(components || customComponents.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename || 'custom-components.json'
  a.click()
}

export function exportSingleCustomComponent(component) {
  const safeName = component.name.replace(/[<>:"/\\|?*]/g, '_')
  exportCustomComponents([component], `${safeName}.json`)
}

export function exportSelectedCustomComponents(selectedIds) {
  const selected = customComponents.value.filter(c => selectedIds.includes(c.id))
  if (selected.length === 0) return
  
  if (selected.length === 1) {
    exportSingleCustomComponent(selected[0])
  } else {
    selected.forEach(comp => {
      exportSingleCustomComponent(comp)
    })
  }
}

export function importCustomComponents(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        let data = JSON.parse(event.target.result)
        let componentsToImport = []
        
        if (Array.isArray(data)) {
          componentsToImport = data
        } else if (data && data.id) {
          componentsToImport = [data]
        }
        
        if (componentsToImport.length > 0) {
          componentsToImport.forEach(comp => {
            if (comp.id) {
              const existingIdx = customComponents.value.findIndex(c => c.id === comp.id)
              if (existingIdx > -1) {
                customComponents.value[existingIdx] = comp
              } else {
                customComponents.value.push(comp)
              }
              const match = comp.id.match(/CUSTOM_(\d+)/)
              if (match) {
                const num = parseInt(match[1])
                if (num > customComponentIdCounter) {
                  customComponentIdCounter = num
                }
              }
            }
          })
          saveCustomComponents()
          resolve()
        } else {
          reject(new Error('Invalid file format'))
        }
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}

loadCustomComponents()
