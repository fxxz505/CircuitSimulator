<template>
  <div class="modal-overlay" :class="{ show }" @click.self="$emit('close')">
    <div class="modal help-modal">
      <div class="modal-header">
        <span>📖 元器件说明书</span>
        <button class="close-btn" @click="$emit('close')" title="关闭 (Esc)">✕</button>
      </div>
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input
          ref="searchInputRef"
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索元器件名称、描述、引脚、公式... (例如: 与门、CPU、CLK、ALU)"
        />
        <button v-if="searchQuery" class="search-clear" @click="clearSearch" title="清除">✕</button>
      </div>
      <div class="help-layout">
        <nav class="help-nav" v-show="!searchQuery">
          <a v-for="sec in sections" :key="sec.id" :href="'#' + sec.id"
             class="nav-item" :class="{ active: activeSection === sec.id }"
             @click.prevent="scrollToSection(sec.id)">
            {{ sec.icon }} {{ sec.label }}
            <span class="nav-count">{{ sec.count }}</span>
          </a>
        </nav>
        <div class="modal-body help-body" ref="helpBodyRef">
          <!-- 搜索结果模式 -->
          <template v-if="searchQuery">
            <div class="search-results-header">
              <span>搜索 "<strong>{{ searchQuery }}</strong>" 找到 {{ filteredComponents.length }} 个结果</span>
            </div>
            <div v-if="filteredComponents.length === 0" class="no-results">
              <div class="no-results-icon">😕</div>
              <div>未找到匹配的元器件</div>
              <div class="no-results-hint">试试搜索：与门、或门、CPU、时钟、触发器、ALU、译码器...</div>
            </div>
            <div v-else>
              <div v-for="comp in filteredComponents" :key="comp.id" class="component-card">
                <div class="component-header">
                  <span class="component-name" v-html="highlight(comp.id + ' — ' + comp.name)"></span>
                  <span class="component-cat-tag">{{ comp.categoryName }}</span>
                </div>
                <div class="component-desc" v-html="highlight(comp.description)"></div>
                <div v-if="comp.expression" class="component-formula" v-html="highlight(comp.expression)"></div>
                <div v-if="comp.pins && comp.pins.length" class="component-truth">
                  <div class="truth-title">引脚:</div>
                  <div v-for="(pin, i) in comp.pins" :key="i" class="truth-row" v-html="highlight(pin)"></div>
                </div>
                <div v-if="comp.example" class="component-example">
                  <span class="example-label">使用示例:</span>
                  <span v-html="highlight(comp.example)"></span>
                </div>
                <div v-if="comp.truthTable && comp.truthTable.length" class="component-truth">
                  <div class="truth-title">真值表:</div>
                  <div v-for="(row, i) in comp.truthTable" :key="i" class="truth-row">
                    {{ row.inputs.join(' ') }} → {{ formatOutput(row.output) }}
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- 浏览模式：按分类显示 -->
          <template v-else>
            <div v-for="cat in categorizedComponents" :key="cat.name" class="help-section" :id="'sec-' + cat.key">
              <div class="section-title">{{ cat.icon }} {{ cat.name }} <span class="section-count">({{ cat.components.length }})</span></div>
              <div v-for="comp in cat.components" :key="comp.id" class="component-card">
                <div class="component-header">
                  <span class="component-name">{{ comp.id }} — {{ comp.name }}</span>
                </div>
                <div class="component-desc">{{ comp.description }}</div>
                <div v-if="comp.expression" class="component-formula">{{ comp.expression }}</div>
                <div v-if="comp.pins && comp.pins.length" class="component-truth">
                  <div class="truth-title">引脚:</div>
                  <div v-for="(pin, i) in comp.pins" :key="i" class="truth-row">{{ pin }}</div>
                </div>
                <div v-if="comp.example" class="component-example">
                  <span class="example-label">使用示例:</span>
                  <span>{{ comp.example }}</span>
                </div>
                <div v-if="comp.truthTable && comp.truthTable.length" class="component-truth">
                  <div class="truth-title">真值表:</div>
                  <div v-for="(row, i) in comp.truthTable" :key="i" class="truth-row">
                    {{ row.inputs.join(' ') }} → {{ formatOutput(row.output) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 操作说明 -->
            <div class="help-section" id="sec-ops">
              <div class="section-title">⌨️ 操作说明</div>
              <div class="component-card">
                <div class="component-desc">
                  <strong>选择操作:</strong><br/>
                  • 点击元器件或线路可选中<br/>
                  • 按住Ctrl点击可添加/移除选择<br/>
                  • 在空白处拖拽可框选多个对象<br/>
                  • 选中多个对象后可一起拖动
                </div>
              </div>
              <div class="component-card">
                <div class="component-desc">
                  <strong>元器件操作:</strong><br/>
                  • 从左侧面板拖拽元器件到画布<br/>
                  • 拖拽选中的元器件可移动<br/>
                  • 按 Delete 键删除选中的对象<br/>
                  • 双击文本组件可编辑文字<br/>
                  • 双击时钟/振荡器可打开参数设置<br/>
                  • 双击CPU/分频器/存储器可打开专用编辑器
                </div>
              </div>
              <div class="component-card">
                <div class="component-desc">
                  <strong>文件操作:</strong><br/>
                  • 点击「保存」按钮导出电路图为 JSON 文件<br/>
                  • 点击「加载」按钮导入 JSON 格式的电路图
                </div>
              </div>
              <div class="component-card">
                <div class="component-desc">
                  <strong>连线操作:</strong><br/>
                  • 点击元器件的端口开始连线<br/>
                  • 单击空白处添加中间点<br/>
                  • 点击另一个端口完成连线<br/>
                  • 双击线路进入编辑模式<br/>
                  • 编辑模式下：拖动中间点调整线路，右键添加/删除中间点
                </div>
              </div>
              <div class="component-card">
                <div class="component-desc">
                  <strong>画布操作:</strong><br/>
                  • 按住鼠标中键或右键拖动平移<br/>
                  • 滚轮缩放<br/>
                  • 所有元器件和线路自动对齐20px网格
                </div>
              </div>
              <div class="component-card">
                <div class="component-desc">
                  <strong>快捷键:</strong><br/>
                  • Ctrl+Z: 撤销<br/>
                  • Ctrl+Y: 重做<br/>
                  • Delete: 删除选中的对象<br/>
                  • Esc: 取消操作<br/>
                  • Space: 暂停/继续仿真
                </div>
              </div>
            </div>

            <!-- 反推公式 -->
            <div class="help-section" id="sec-reverse">
              <div class="section-title">📐 反推公式 (从输出反推输入)</div>
              <div class="component-card">
                <div class="component-name">NOT (非门)</div>
                <div class="component-desc">已知输出，反推输入</div>
                <div class="component-formula">A = NOT Y</div>
                <div class="component-truth">
                  <div class="truth-row">Y=0 → A=1</div>
                  <div class="truth-row">Y=1 → A=0</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">AND (与门)</div>
                <div class="component-desc">已知输出 Y=1，反推输入</div>
                <div class="component-formula">A=1 AND B=1</div>
                <div class="component-truth">
                  <div class="truth-row">Y=1 → 必须 A=1 且 B=1</div>
                  <div class="truth-row">Y=0 → 至少一个输入为0 (A=0 或 B=0)</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">NAND (与非门)</div>
                <div class="component-desc">已知输出 Y=0，反推输入</div>
                <div class="component-formula">A=1 AND B=1</div>
                <div class="component-truth">
                  <div class="truth-row">Y=0 → 必须 A=1 且 B=1</div>
                  <div class="truth-row">Y=1 → 至少一个输入为0</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">OR (或门)</div>
                <div class="component-desc">已知输出 Y=0，反推输入</div>
                <div class="component-formula">A=0 AND B=0</div>
                <div class="component-truth">
                  <div class="truth-row">Y=0 → 必须 A=0 且 B=0</div>
                  <div class="truth-row">Y=1 → 至少一个输入为1 (A=1 或 B=1)</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">NOR (或非门)</div>
                <div class="component-desc">已知输出 Y=1，反推输入</div>
                <div class="component-formula">A=0 AND B=0</div>
                <div class="component-truth">
                  <div class="truth-row">Y=1 → 必须 A=0 且 B=0</div>
                  <div class="truth-row">Y=0 → 至少一个输入为1</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">XOR (异或门)</div>
                <div class="component-desc">已知输出，反推输入关系</div>
                <div class="component-formula">Y = (A AND NOT B) OR (NOT A AND B)</div>
                <div class="component-truth">
                  <div class="truth-row">Y=1 → A ≠ B (A和B不同)</div>
                  <div class="truth-row">Y=0 → A = B (A和B相同)</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">XNOR (同或门)</div>
                <div class="component-desc">已知输出，反推输入关系</div>
                <div class="component-formula">Y = (A AND B) OR (NOT A AND NOT B)</div>
                <div class="component-truth">
                  <div class="truth-row">Y=1 → A = B (A和B相同)</div>
                  <div class="truth-row">Y=0 → A ≠ B (A和B不同)</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">DLATCH (D锁存器)</div>
                <div class="component-desc">已知输出 Q，反推历史输入</div>
                <div class="component-formula">Q = (EN=1时的D值) 或 (EN=0时保持的旧值)</div>
                <div class="component-truth">
                  <div class="truth-row">EN=1 → Q = D (透明状态)</div>
                  <div class="truth-row">EN=0 → Q 保持不变 (锁存状态)</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">组合电路 - 半加器</div>
                <div class="component-desc">已知输出 S(和)和C(进位)，反推输入</div>
                <div class="component-formula">S = A XOR B; C = A AND B</div>
                <div class="component-truth">
                  <div class="truth-row">S=0, C=0 → A=0, B=0</div>
                  <div class="truth-row">S=1, C=0 → A=0, B=1 或 A=1, B=0</div>
                  <div class="truth-row">S=0, C=1 → A=1, B=1</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">组合电路 - 全加器</div>
                <div class="component-desc">已知输出 S(和)和Cout(进位)，反推输入</div>
                <div class="component-formula">S = A XOR B XOR Cin; Cout = (A AND B) OR (A AND Cin) OR (B AND Cin)</div>
                <div class="component-truth">
                  <div class="truth-row">S=0, Cout=0 → (0,0,0)</div>
                  <div class="truth-row">S=1, Cout=0 → (0,0,1), (0,1,0), (1,0,0)</div>
                  <div class="truth-row">S=0, Cout=1 → (0,1,1), (1,0,1), (1,1,0)</div>
                  <div class="truth-row">S=1, Cout=1 → (1,1,1)</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">2选1多路选择器 (MUX)</div>
                <div class="component-desc">已知输出 Y，反推输入条件</div>
                <div class="component-formula">Y = (S AND A) OR (NOT S AND B)</div>
                <div class="component-truth">
                  <div class="truth-row">Y=1, S=0 → B=1 (A任意)</div>
                  <div class="truth-row">Y=1, S=1 → A=1 (B任意)</div>
                  <div class="truth-row">Y=0, S=0 → B=0 (A任意)</div>
                  <div class="truth-row">Y=0, S=1 → A=0 (B任意)</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">1选2多路分配器 (DEMUX)</div>
                <div class="component-desc">已知输出 Y0和Y1，反推输入条件</div>
                <div class="component-formula">Y0 = NOT S AND A; Y1 = S AND A</div>
                <div class="component-truth">
                  <div class="truth-row">Y0=1, Y1=0 → S=0, A=1</div>
                  <div class="truth-row">Y0=0, Y1=1 → S=1, A=1</div>
                  <div class="truth-row">Y0=0, Y1=0 → A=0 (S任意)</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">组合电路 - 奇偶校验器</div>
                <div class="component-desc">已知校验位 P，反推输入中1的个数</div>
                <div class="component-formula">P = A XOR B XOR C (奇校验)</div>
                <div class="component-truth">
                  <div class="truth-row">P=1 → 输入中有奇数个1</div>
                  <div class="truth-row">P=0 → 输入中有偶数个1</div>
                  <div class="truth-row">可能的组合数量：2^(n-1) 种</div>
                </div>
              </div>
              <div class="component-card">
                <div class="component-name">组合电路 - 比较器 (2位)</div>
                <div class="component-desc">已知比较结果 EQ、GT、LT，反推输入 A、B</div>
                <div class="component-formula">EQ=(A1=B1)AND(A0=B0); GT=(A1&gt;B1)OR((A1=B1)AND(A0&gt;B0))</div>
                <div class="component-truth">
                  <div class="truth-row">EQ=1 → A1=B1, A0=B0 (4种可能)</div>
                  <div class="truth-row">GT=1 → A&gt;B (6种可能)</div>
                  <div class="truth-row">LT=1 → A&lt;B (6种可能)</div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
      <div class="modal-footer">
        <span class="footer-hint">共 {{ totalComponents }} 个元器件 · 在搜索框输入关键词快速查找</span>
        <button class="btn" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { COMPONENT_DETAILS } from '../constants/componentDetails'
import { CATEGORIES } from '../constants/componentTypes'

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const helpBodyRef = ref(null)
const searchInputRef = ref(null)
const activeSection = ref('')
const searchQuery = ref('')

// 构建分类 -> 元器件详情的映射（去重：每个元器件只出现在第一个分类中）
const categorizedComponents = computed(() => {
  const result = []
  const seen = new Set()
  for (const cat of CATEGORIES) {
    if (cat.name === '自定义') continue
    const comps = []
    for (const id of cat.components) {
      if (seen.has(id)) continue
      const detail = COMPONENT_DETAILS[id]
      if (detail) {
        comps.push({ id, ...detail, categoryName: cat.name })
        seen.add(id)
      }
    }
    if (comps.length > 0) {
      result.push({
        key: cat.name.replace(/\s+/g, ''),
        name: cat.name,
        icon: cat.icon,
        components: comps
      })
    }
  }
  return result
})

const totalComponents = computed(() => categorizedComponents.value.reduce((s, c) => s + c.components.length, 0))

// 左侧导航 sections
const sections = computed(() => {
  const list = categorizedComponents.value.map(c => ({
    id: 'sec-' + c.key,
    icon: c.icon,
    label: c.name,
    count: c.components.length
  }))
  list.push({ id: 'sec-ops', icon: '⌨️', label: '操作说明', count: null })
  list.push({ id: 'sec-reverse', icon: '📐', label: '反推公式', count: null })
  return list
})

// 搜索过滤
const filteredComponents = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return []
  const results = []
  for (const cat of categorizedComponents.value) {
    for (const comp of cat.components) {
      const haystack = [
        comp.id,
        comp.name,
        comp.description,
        comp.expression || '',
        comp.example || '',
        ...(comp.pins || [])
      ].join(' ').toLowerCase()
      if (haystack.includes(q)) {
        results.push(comp)
      }
    }
  }
  return results
})

// 关键词高亮
function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(text) {
  const q = searchQuery.value.trim()
  if (!q) return escapeHtml(text)
  const escaped = escapeHtml(text)
  const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp('(' + safeQ + ')', 'gi')
  return escaped.replace(re, '<mark>$1</mark>')
}

function clearSearch() {
  searchQuery.value = ''
  nextTick(() => searchInputRef.value?.focus())
}

// 安全格式化真值表输出（兼容数组和字符串）
function formatOutput(output) {
  if (Array.isArray(output)) return output.join(' ')
  return output
}

function scrollToSection(id) {
  activeSection.value = id
  const el = document.getElementById(id)
  if (el && helpBodyRef.value) {
    helpBodyRef.value.scrollTo({
      top: el.offsetTop - helpBodyRef.value.offsetTop - 10,
      behavior: 'smooth'
    })
  }
}

// 滚动时更新激活的 section
function handleScroll() {
  if (searchQuery.value) return
  const ids = sections.value.map(s => s.id)
  for (let i = ids.length - 1; i >= 0; i--) {
    const el = document.getElementById(ids[i])
    if (el && el.offsetTop - 20 <= helpBodyRef.value.scrollTop + helpBodyRef.value.offsetTop) {
      activeSection.value = ids[i]
      return
    }
  }
}

function handleEsc(e) {
  if (e.key === 'Escape') {
    if (searchQuery.value) {
      clearSearch()
    } else {
      emit('close')
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
  if (helpBodyRef.value) {
    helpBodyRef.value.addEventListener('scroll', handleScroll, { passive: true })
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
  if (helpBodyRef.value) {
    helpBodyRef.value.removeEventListener('scroll', handleScroll)
  }
})

watch(() => searchQuery.value, (q) => {
  if (q) {
    nextTick(() => {
      if (helpBodyRef.value) helpBodyRef.value.scrollTop = 0
    })
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.modal-overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.modal {
  background: #252526;
  border: 1px solid #3c3c3c;
  border-radius: 8px;
  max-width: 700px;
  width: 90%;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  transform: scale(0.95);
  transition: transform 0.2s ease;
  overflow: hidden;
}

.modal-overlay.show .modal {
  transform: scale(1);
}

.help-modal {
  max-width: 960px;
}

.modal-header {
  padding: 14px 18px;
  border-bottom: 1px solid #3c3c3c;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 600;
  background: #2a2a2a;
  color: #e0e0e0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #888;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.15s;
}

.close-btn:hover {
  background: #c42b1c;
  color: #fff;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: 10px 18px;
  background: #1e1e1e;
  border-bottom: 1px solid #3c3c3c;
  gap: 8px;
}

.search-icon {
  font-size: 14px;
  opacity: 0.7;
}

.search-input {
  flex: 1;
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  color: #e0e0e0;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: #4a9eff;
}

.search-input::placeholder {
  color: #666;
}

.search-clear {
  background: #3c3c3c;
  border: none;
  color: #aaa;
  cursor: pointer;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.search-clear:hover {
  background: #c42b1c;
  color: #fff;
}

.help-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.help-nav {
  width: 170px;
  background: #1e1e1e;
  border-right: 1px solid #3c3c3c;
  padding: 12px 0;
  overflow-y: auto;
  flex-shrink: 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12px;
  color: #999;
  text-decoration: none;
  transition: all 0.15s;
  cursor: pointer;
  border-left: 2px solid transparent;
}

.nav-item:hover {
  color: #e0e0e0;
  background: #2a2a2a;
}

.nav-item.active {
  color: #4a9eff;
  border-left-color: #4a9eff;
  background: #2a2a3a;
}

.nav-count {
  margin-left: auto;
  background: #3c3c3c;
  color: #aaa;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 8px;
  min-width: 18px;
  text-align: center;
}

.help-body {
  flex: 1;
  padding: 18px 20px;
  overflow-y: auto;
}

.help-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #4a9eff;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #3c3c3c;
}

.section-count {
  color: #666;
  font-weight: 400;
  font-size: 12px;
}

.component-card {
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  padding: 12px 16px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
}

.component-card:hover {
  border-color: #4c4c4c;
}

.component-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.component-name {
  font-weight: 600;
  color: #e0e0e0;
  font-size: 13px;
}

.component-cat-tag {
  background: #3a3a3a;
  color: #aaa;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  flex-shrink: 0;
}

.component-desc {
  color: #aaa;
  line-height: 1.6;
  font-size: 13px;
}

.component-formula {
  font-family: 'Consolas', 'Monaco', monospace;
  background: #1e1e1e;
  padding: 6px 12px;
  border-radius: 4px;
  margin-top: 8px;
  font-size: 13px;
  color: #4ec9b0;
  border: 1px solid #3c3c3c;
  word-break: break-all;
}

.component-example {
  margin-top: 8px;
  font-size: 12px;
  color: #999;
  line-height: 1.6;
}

.example-label {
  color: #c586c0;
  font-weight: 600;
  margin-right: 4px;
}

.component-truth {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #3c3c3c;
}

.truth-title {
  font-weight: 500;
  color: #ccc;
  margin-bottom: 4px;
  font-size: 12px;
}

.truth-row {
  color: #999;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  line-height: 1.6;
}

.search-results-header {
  color: #888;
  font-size: 12px;
  margin-bottom: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #3c3c3c;
}

.search-results-header strong {
  color: #4a9eff;
}

.no-results {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.no-results-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.no-results-hint {
  font-size: 12px;
  color: #555;
  margin-top: 8px;
}

.modal-footer {
  padding: 12px 18px;
  border-top: 1px solid #3c3c3c;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  background: #2a2a2a;
}

.footer-hint {
  font-size: 11px;
  color: #666;
}

.btn {
  padding: 8px 20px;
  border: 1px solid #4c4c4c;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  background: #3c3c3c;
  color: #e0e0e0;
}

.btn:hover {
  background: #4c4c4c;
}

.btn:active {
  background: #555;
}

:deep(mark) {
  background: #f0a020;
  color: #000;
  border-radius: 2px;
  padding: 0 2px;
}
</style>
