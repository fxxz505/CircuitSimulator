// 共享工具函数

/**
 * 计算文本组件的高度（基于字符数自动换行）
 * @param {string} text - 文本内容
 * @param {number} maxCharsPerLine - 每行最大字符数，默认 30
 * @returns {number} 计算得到的高度（像素）
 */
export function calculateTextHeight(text, maxCharsPerLine = 30) {
  const lineHeight = 24
  const padding = 20

  if (!text) {
    return padding + lineHeight
  }

  let lines = 1
  let currentLineLength = 0

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '\n') {
      lines++
      currentLineLength = 0
    } else if (currentLineLength >= maxCharsPerLine) {
      lines++
      currentLineLength = 1
    } else {
      currentLineLength++
    }
  }

  return padding + lines * lineHeight
}

/**
 * 防抖函数
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟毫秒数
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 200) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 要执行的函数
 * @param {number} interval - 间隔毫秒数
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, interval = 100) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= interval) {
      lastTime = now
      fn.apply(this, args)
    }
  }
}

/**
 * 生成唯一 ID
 * @param {string} prefix - ID 前缀
 * @returns {string} 唯一 ID
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 格式化十六进制
 * @param {number} v - 数值
 * @param {number} len - 长度
 * @returns {string} 格式化后的十六进制字符串
 */
export function formatHex(v, len = 2) {
  return (v || 0).toString(16).toUpperCase().padStart(len, '0')
}
