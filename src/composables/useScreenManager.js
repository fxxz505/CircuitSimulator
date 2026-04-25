import { ref } from 'vue'

const GRID_SIZE = 60

export function useScreenManager() {
  const screenGroups = ref([])

  function findAdjacentScreens(screens, targetScreen) {
    const adjacent = []
    const targetGridX = Math.round(targetScreen.x / GRID_SIZE)
    const targetGridY = Math.round(targetScreen.y / GRID_SIZE)

    screens.forEach(screen => {
      if (screen.id === targetScreen.id) return
      
      const screenGridX = Math.round(screen.x / GRID_SIZE)
      const screenGridY = Math.round(screen.y / GRID_SIZE)
      
      const dx = Math.abs(targetGridX - screenGridX)
      const dy = Math.abs(targetGridY - screenGridY)
      
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        adjacent.push(screen)
      }
    })

    return adjacent
  }

  function groupScreens(screens) {
    const groups = []
    const visited = new Set()

    screens.forEach(screen => {
      if (visited.has(screen.id)) return

      const group = []
      const queue = [screen]
      
      while (queue.length > 0) {
        const current = queue.shift()
        if (visited.has(current.id)) continue
        
        visited.add(current.id)
        group.push(current)
        
        const adjacent = findAdjacentScreens(screens, current)
        adjacent.forEach(adj => {
          if (!visited.has(adj.id)) {
            queue.push(adj)
          }
        })
      }

      if (group.length > 0) {
        groups.push(group)
      }
    })

    return groups
  }

  function getGroupBounds(group) {
    if (group.length === 0) return null

    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity

    group.forEach(screen => {
      minX = Math.min(minX, screen.x)
      minY = Math.min(minY, screen.y)
      maxX = Math.max(maxX, screen.x + screen.width)
      maxY = Math.max(maxY, screen.y + screen.height)
    })

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  function getGroupPixelData(group) {
    if (group.length === 0) return []

    const bounds = getGroupBounds(group)
    const cols = Math.round(bounds.width / GRID_SIZE)
    const rows = Math.round(bounds.height / GRID_SIZE)
    
    const pixels = []
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = bounds.x + col * GRID_SIZE
        const y = bounds.y + row * GRID_SIZE
        
        const screen = group.find(s => 
          Math.abs(s.x - x) < 1 && Math.abs(s.y - y) < 1
        )
        
        if (screen) {
          pixels.push({
            x,
            y,
            value: screen.screenPixel || 0
          })
        }
      }
    }

    return pixels
  }

  return {
    groupScreens,
    getGroupBounds,
    getGroupPixelData,
    findAdjacentScreens
  }
}