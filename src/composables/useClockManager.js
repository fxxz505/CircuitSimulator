import { ref, reactive } from 'vue'

export function useClockManager() {
  // 时钟源管理
  const clockSources = reactive(new Map()) // comp.id -> clock config
  
  // 波形历史配置
  const MAX_WAVEFORM_HISTORY = 64
  
  // 注册时钟源
  function registerClock(compId, config = {}) {
    clockSources.set(compId, {
      id: compId,
      frequency: config.frequency || 1,    // Hz
      dutyCycle: config.dutyCycle || 50,   // %
      phase: config.phase || 0,            // degrees (0, 90, 180, 270)
      enabled: config.enabled !== undefined ? config.enabled : true,
      tickAccumulator: 0,
      waveformHistory: new Array(MAX_WAVEFORM_HISTORY).fill(0),
      historyIndex: 0,
      lastState: 0,
      color: config.color || '#9933ff'
    })
  }
  
  // 更新时钟配置
  function updateClockConfig(compId, config) {
    const clock = clockSources.get(compId)
    if (!clock) return
    
    if (config.frequency !== undefined) clock.frequency = config.frequency
    if (config.dutyCycle !== undefined) clock.dutyCycle = config.dutyCycle
    if (config.phase !== undefined) clock.phase = config.phase
    if (config.enabled !== undefined) clock.enabled = config.enabled
    if (config.color !== undefined) clock.color = config.color
  }
  
  // 计算时钟状态
  function calculateClockState(compId, baseClockSpeed) {
    const clock = clockSources.get(compId)
    if (!clock || !clock.enabled) {
      return clock?.lastState || 0
    }
    
    const period = baseClockSpeed / clock.frequency
    const phaseOffset = (clock.phase / 360) * period
    const dutyFraction = clock.dutyCycle / 100
    
    clock.tickAccumulator += 1
    const positionInCycle = (clock.tickAccumulator + phaseOffset) % period
    
    const newState = positionInCycle < (period * dutyFraction) ? 1 : 0
    clock.lastState = newState
    
    // 记录波形历史
    clock.waveformHistory[clock.historyIndex] = newState
    clock.historyIndex = (clock.historyIndex + 1) % MAX_WAVEFORM_HISTORY
    
    return newState
  }
  
  // 获取波形历史
  function getWaveformHistory(compId) {
    const clock = clockSources.get(compId)
    if (!clock) return []
    
    const history = []
    for (let i = 0; i < MAX_WAVEFORM_HISTORY; i++) {
      const idx = (clock.historyIndex + i) % MAX_WAVEFORM_HISTORY
      history.push(clock.waveformHistory[idx])
    }
    return history
  }
  
  // 获取所有时钟源
  function getAllClocks() {
    return Array.from(clockSources.values())
  }
  
  // 移除时钟源
  function removeClock(compId) {
    clockSources.delete(compId)
  }
  
  // 重置所有时钟
  function resetAll() {
    for (const [id, clock] of clockSources) {
      clock.tickAccumulator = 0
      clock.waveformHistory = new Array(MAX_WAVEFORM_HISTORY).fill(0)
      clock.historyIndex = 0
      clock.lastState = 0
    }
  }
  
  return {
    clockSources,
    registerClock,
    updateClockConfig,
    calculateClockState,
    getWaveformHistory,
    getAllClocks,
    removeClock,
    resetAll
  }
}
