<template>
  <div class="component-library">
    <div class="panel-header">
      <span>📦 组件库</span>
    </div>

    <div class="search-box">
      <span class="search-icon">🔍</span>
      <input 
        type="text" 
        v-model="searchQuery" 
        placeholder="搜索组件..." 
        class="search-input"
      />
      <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
    </div>
    
    <input 
      ref="importInputRef"
      type="file" 
      accept=".json" 
      style="display: none"
      @change="onImport"
    >
    
    <div 
      v-for="category in displayCategories" 
      :key="category.name"
      class="component-category"
      v-show="category.components.length > 0"
    >
      <div class="category-title" @click="toggleCategory(category.name)">
        <span class="category-toggle">{{ collapsedCategories.has(category.name) ? '▶' : '▼' }}</span>
        {{ category.icon }} {{ category.name }}
        <span class="category-count">{{ category.components.length }}</span>
        <template v-if="category.name === '自定义'">
          <div class="custom-actions" @click.stop>
            <button class="icon-btn" @click="onClearAll" title="清除所有自定义组件">🗑️</button>
            <button class="icon-btn" @click="onExportAll" title="导出全部自定义组件">💾</button>
            <button class="icon-btn" @click="onExportSelected" title="导出选中的自定义组件" :disabled="selectedCustomComponents.size === 0">📦</button>
            <button class="icon-btn" @click="onImportClick" title="导入自定义组件">📂</button>
          </div>
        </template>
      </div>
      <div class="component-list" v-show="!collapsedCategories.has(category.name)">
        <div 
          v-for="type in category.components" 
          :key="type"
          class="component-item"
          :class="{ 
            'custom-comp': category.name === '自定义',
            'selected': category.name === '自定义' && selectedCustomComponents.has(type)
          }"
          draggable="true"
          @dragstart="onDragStart($event, type)"
          @contextmenu.prevent="onRightClick($event, type, category.name)"
          @click="onComponentClick($event, type, category.name)"
        >
          <template v-if="category.name === '自定义'">
            <div class="select-checkbox" @click.stop="toggleSelect(type)">
              <span v-if="selectedCustomComponents.has(type)">✓</span>
            </div>
          </template>
          <div class="component-icon" :style="{ background: getComponentColor(type) + '40' }">
            {{ getIcon(type) }}
          </div>
          <div class="component-info">
            <div class="component-name">{{ getComponentName(type) }}</div>
            <div class="component-desc">{{ getDesc(type) }}</div>
          </div>
          <template v-if="category.name === '自定义'">
            <button class="export-btn" @click.stop="onExportSingle(type)" title="单独导出">⬇️</button>
          </template>
        </div>
      </div>
    </div>

    <div v-if="displayCategories.every(c => c.components.length === 0)" class="no-results">
      <span>🔍</span>
      <p>未找到匹配的组件</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { COMPONENT_TYPES, updateCategoriesWithCustom, getCustomComponentDef } from '../constants/componentTypes'
import { customComponents, exportCustomComponents, importCustomComponents, removeCustomComponent, clearAllCustomComponents, exportSingleCustomComponent, exportSelectedCustomComponents } from '../composables/useCustomComponents'

const props = defineProps({
  categories: {
    type: Array,
    required: true
  }
})

const importInputRef = ref(null)
const selectedCustomComponents = ref(new Set())
const refreshKey = ref(0)
const searchQuery = ref('')
const collapsedCategories = ref(new Set())

const displayCategories = computed(() => {
  refreshKey.value
  updateCategoriesWithCustom()
  const query = searchQuery.value.toLowerCase().trim()
  return props.categories.map(cat => {
    if (!query) return cat
    const filtered = cat.components.filter(type => {
      const name = getComponentName(type).toLowerCase()
      const desc = getDesc(type).toLowerCase()
      const icon = getIcon(type).toLowerCase()
      return name.includes(query) || desc.includes(query) || icon.includes(query) || type.toLowerCase().includes(query)
    })
    return { ...cat, components: filtered }
  })
})

function toggleCategory(name) {
  const newSet = new Set(collapsedCategories.value)
  if (newSet.has(name)) {
    newSet.delete(name)
  } else {
    newSet.add(name)
  }
  collapsedCategories.value = newSet
}

function getComponentColor(type) {
  const def = COMPONENT_TYPES[type]
  if (def) return def.color
  const customDef = getCustomComponentDef(type)
  if (customDef) return customDef.color
  return '#666'
}

function getComponentName(type) {
  const def = COMPONENT_TYPES[type]
  if (def) return def.name
  const customDef = getCustomComponentDef(type)
  if (customDef) return customDef.name
  return '未知'
}

function getIcon(type) {
  const icons = {
    AND: '&',
    OR: '≥1',
    NOT: '¬',
    NAND: '↑',
    NOR: '↓',
    XOR: '⊕',
    SWITCH: '⚡',
    LED: '💡',
    CLOCK: '⏱',
    DFF: 'D',
    DLATCH: 'DL',
    HALFADDER: '+',
    FULLADDER: '++',
    MUX2: 'MUX',
    MUX4: 'MUX4',
    DEMUX2: 'DMX',
    JKFF: 'JK',
    TFF: 'T',
    SRFF: 'SR',
    DEC38: '3→8',
    DEC24: '2→4',
    ENC42: 'ENC',
    COUNTER4: 'CNT',
    RING4: 'RING',
    ALU4: 'ALU',
    ADDSUB4: '+/-',
    COMP4: 'CMP',
    SHIFT4: 'SFT',
    REG4: 'REG',
    RAM164: 'RAM',
    ROM164: 'ROM',
    TRISTATE: 'TRI',
    BUSSWITCH: 'BUS',
    CLOCKDIVIDER: 'DIV',
    TJUNCTION: '●',
    CROSSJUNCTION: '●',
    CPU: 'CPU',
    ROM256: 'PROM',
    IO_BRIDGE: '🌉',
    EXT_RAM: 'RAM',
    IO_PORT: 'IO',
    TIMER: '⏱'
  }
  const customDef = getCustomComponentDef(type)
  if (customDef) return customDef.label?.substring(0, 2) || '🧩'
  return icons[type] || '?'
}

function getDesc(type) {
  const descs = {
    AND: '2输入与',
    OR: '2输入或',
    NOT: '1输入非',
    NAND: '2输入与非',
    NOR: '2输入或非',
    XOR: '2输入异或',
    XNOR: '2输入同或',
    BUFFER: '缓冲器',
    AND3: '3输入与',
    OR3: '3输入或',
    SWITCH: '点击切换',
    LED: '显示输出',
    CLOCK: '周期性信号',
    DFF: 'D触发器',
    DLATCH: 'D锁存器',
    HALFADDER: '1位加法',
    FULLADDER: '带进位加法',
    MUX2: '2选1选择器',
    MUX4: '4选1选择器',
    DEMUX2: '1转2分配器',
    JKFF: 'JK触发器',
    TFF: 'T触发器',
    SRFF: 'SR触发器',
    DEC38: '3转8译码器',
    DEC24: '2转4译码器',
    ENC42: '4转2优先编码',
    COUNTER4: '4位加减计数',
    RING4: '环形计数器',
    ALU4: '4位ALU',
    ADDSUB4: '4位加减法',
    COMP4: '4位比较器',
    SHIFT4: '4位移位器',
    REG4: '4位寄存器',
    RAM164: '16x4 RAM',
    ROM164: '16x4 ROM',
    TRISTATE: '三态缓冲器',
    BUSSWITCH: '总线开关',
    CLOCKDIVIDER: '时钟分频器',
    TJUNCTION: 'T型分支',
    CROSSJUNCTION: '十字分支',
    CPU: '8位CPU',
    ROM256: '256x16程序ROM',
    IO_BRIDGE: 'I/O桥接器',
    EXT_RAM: '256x8外部RAM',
    IO_PORT: '通用I/O端口',
    TIMER: '定时器/中断'
  }
  const customDef = getCustomComponentDef(type)
  if (customDef) {
    return `${customDef.inputs}输入/${customDef.outputs}输出`
  }
  return descs[type] || ''
}

function onDragStart(e, type) {
  e.dataTransfer.setData('componentType', type)
}

function toggleSelect(type) {
  const newSet = new Set(selectedCustomComponents.value)
  if (newSet.has(type)) {
    newSet.delete(type)
  } else {
    newSet.add(type)
  }
  selectedCustomComponents.value = newSet
}

function onComponentClick(e, type, categoryName) {
  if (categoryName === '自定义') {
    toggleSelect(type)
  }
}

function onExportAll() {
  exportCustomComponents()
}

function onExportSelected() {
  exportSelectedCustomComponents(Array.from(selectedCustomComponents.value))
}

function onExportSingle(type) {
  const comp = customComponents.value.find(c => c.id === type)
  if (comp) {
    exportSingleCustomComponent(comp)
  }
}

function onImportClick() {
  importInputRef.value?.click()
}

async function onImport(e) {
  const file = e.target.files?.[0]
  if (file) {
    try {
      await importCustomComponents(file)
      updateCategoriesWithCustom()
      refreshKey.value++
    } catch (err) {
      console.error('Import failed:', err)
      alert('导入失败: ' + err.message)
    }
  }
  e.target.value = ''
}

function onClearAll() {
  if (confirm('确定要清除所有自定义组件吗？此操作不可撤销！')) {
    clearAllCustomComponents()
    updateCategoriesWithCustom()
    refreshKey.value++
    selectedCustomComponents.value = new Set()
  }
}

function onRightClick(e, type, categoryName) {
  if (categoryName === '自定义') {
    if (confirm('确定要删除这个自定义组件吗？')) {
      removeCustomComponent(type)
      updateCategoriesWithCustom()
      refreshKey.value++
      const newSet = new Set(selectedCustomComponents.value)
      newSet.delete(type)
      selectedCustomComponents.value = newSet
    }
  }
}
</script>

<style scoped>
.component-library {
  width: 240px;
  background: #252526;
  border-right: 1px solid #3c3c3c;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.panel-header {
  padding: 10px 12px;
  background: #252526;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #3c3c3c;
  position: sticky;
  top: 0;
  z-index: 10;
}

.search-box {
  padding: 8px 10px;
  border-bottom: 1px solid #3c3c3c;
  display: flex;
  align-items: center;
  gap: 6px;
  background: #2a2a2a;
  position: sticky;
  top: 36px;
  z-index: 10;
}

.search-icon {
  font-size: 12px;
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  border-radius: 4px;
  color: #ccc;
  font-size: 12px;
  padding: 5px 8px;
  outline: none;
}

.search-input:focus {
  border-color: #4a9eff;
}

.search-input::placeholder {
  color: #666;
}

.search-clear {
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
}

.search-clear:hover {
  color: #fff;
  background: #3c3c3c;
}

.no-results {
  text-align: center;
  padding: 32px 16px;
  color: #666;
}

.no-results span {
  font-size: 24px;
  display: block;
  margin-bottom: 8px;
}

.no-results p {
  font-size: 13px;
  margin: 0;
}

.component-category {
  border-bottom: 1px solid #2a2a2a;
}

.category-title {
  padding: 8px 12px;
  font-size: 12px;
  color: #999;
  background: #2a2a2a;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
  transition: background 0.15s;
}

.category-title:hover {
  background: #333;
}

.category-toggle {
  font-size: 8px;
  width: 12px;
  text-align: center;
  color: #666;
}

.category-count {
  font-size: 10px;
  color: #555;
  background: #1e1e1e;
  padding: 1px 6px;
  border-radius: 8px;
  margin-left: auto;
}

.custom-actions {
  display: flex;
  gap: 2px;
  margin-left: 4px;
}

.component-list {
  padding: 4px 6px;
}

.component-item {
  padding: 8px 10px;
  background: #2d2d2d;
  border: 1px solid transparent;
  border-radius: 4px;
  margin: 3px 0;
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.15s;
}

.component-item:hover {
  background: #383838;
  border-color: #4a9eff40;
}

.component-item.selected {
  border-color: #0078d4;
  background: #0078d420;
}

.component-item:active {
  cursor: grabbing;
}

.component-icon {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #fff;
  border: 1px solid #3c3c3c;
  flex-shrink: 0;
}

.component-info {
  flex: 1;
  min-width: 0;
}

.component-name {
  font-weight: 500;
  font-size: 12px;
  margin-bottom: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.component-desc {
  font-size: 10px;
  color: #777;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.icon-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.15s;
}

.icon-btn:hover:not(:disabled) {
  background: #404040;
  color: #fff;
}

.icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.select-checkbox {
  width: 16px;
  height: 16px;
  border: 2px solid #404040;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 10px;
  color: #fff;
  flex-shrink: 0;
}

.select-checkbox:hover {
  border-color: #0078d4;
}

.component-item.selected .select-checkbox {
  background: #0078d4;
  border-color: #0078d4;
}

.export-btn {
  background: none;
  border: none;
  color: #888;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.15s;
}

.export-btn:hover {
  background: #404040;
  color: #fff;
}

.custom-comp:hover {
  border-color: #9b59b640 !important;
}

.custom-comp:hover .component-icon {
  background: #9b59b640 !important;
}
</style>
