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

    <!-- 收藏与最近使用 -->
    <div v-if="!searchQuery && favorites.length > 0" class="component-category">
      <div class="category-title" @click="toggleCategory('收藏')">
        <span class="category-toggle">{{ collapsedCategories.has('收藏') ? '▶' : '▼' }}</span>
        ⭐ 收藏
        <span class="category-count">{{ favorites.length }}</span>
      </div>
      <div class="component-list" v-show="!collapsedCategories.has('收藏')">
        <div 
          v-for="type in favorites" 
          :key="'fav-'+type"
          class="component-item"
          draggable="true"
          @dragstart="onDragStart($event, type)"
          @click="onComponentClick($event, type, '收藏')"
        >
          <div class="component-icon" :style="{ background: getComponentColor(type) + '40' }">
            {{ getIcon(type) }}
          </div>
          <div class="component-info">
            <div class="component-name">{{ getComponentName(type) }}</div>
            <div class="component-desc">{{ getDesc(type) }}</div>
          </div>
          <button class="fav-btn active" @click.stop="toggleFavorite(type)" title="取消收藏">★</button>
          <div class="pin-tooltip">{{ getPinInfo(type) }}</div>
        </div>
      </div>
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
          <button class="fav-btn" :class="{ active: favorites.includes(type) }" @click.stop="toggleFavorite(type)" title="收藏">★</button>
          <template v-if="category.name === '自定义'">
            <button class="export-btn" @click.stop="onExportSingle(type)" title="单独导出">⬇️</button>
          </template>
          <div class="pin-tooltip">{{ getPinInfo(type) }}</div>
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

// 收藏（localStorage 持久化）
const favorites = ref(JSON.parse(localStorage.getItem('circuit_favorites') || '[]'))

function toggleFavorite(type) {
  const idx = favorites.value.indexOf(type)
  if (idx > -1) {
    favorites.value.splice(idx, 1)
  } else {
    favorites.value.push(type)
  }
  localStorage.setItem('circuit_favorites', JSON.stringify(favorites.value))
}


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
      const keywords = getKeywords(type).toLowerCase()
      return name.includes(query) || desc.includes(query) || icon.includes(query) || type.toLowerCase().includes(query) || keywords.includes(query)
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
    AND3: '&3',
    AND4: '&4',
    OR: '≥1',
    OR3: '≥1³',
    OR4: '≥1⁴',
    NOT: '¬',
    BUFFER: '▷',
    NAND: '↑',
    NAND4: '⊼',
    NOR: '↓',
    NOR4: '⊽',
    XOR: '⊕',
    XNOR: '⊙',
    SCHMITT: '〰',
    SWITCH: '⚡',
    CONST0: '0',
    CONST1: '1',
    GND: '⏚',
    VCC: '⎓',
    PULLUP: '↑',
    PULLDOWN: '↓',
    BUTTON: '⏺',
    DIPSW4: '☰',
    LED: '💡',
    SEGDISPLAY1: '8',
    SEGDISPLAY8: '88',
    SEG7CC: '8',
    SEG7CA: '8',
    BCD7SEG: 'BCD',
    DOTMATRIX16: '🔲',
    LCD1602: '🖥',
    HEXDISPLAY: '#',
    ASCII_DISPLAY: '💬',
    LED_BAR8: '📊',
    SCOPE: '📈',
    KEYPAD_4x4: '🔢',
    CLOCK: '⏱',
    OSCILLATOR: '📶',
    CLOCKDIVIDER: 'DIV',
    PWM_GENERATOR: '〽',
    DFF: 'D',
    DLATCH: 'DL',
    JKFF: 'JK',
    TFF: 'T',
    SRFF: 'SR',
    HALFADDER: '+',
    FULLADDER: '++',
    MUX2: 'MUX',
    MUX4: 'MUX4',
    MUX8: '⊕',
    DEMUX2: 'DMX',
    DEMUX8: '⊘',
    DEC38: '3→8',
    DEC24: '2→4',
    DEC4_16: '4→16',
    ENC42: 'ENC',
    ENC8_3: '8→3',
    COUNTER4: 'CNT',
    COUNTER8: '🔢',
    RING4: 'RING',
    ALU4: 'ALU',
    ALU8: '🔢',
    ADD8: '+8',
    ADDSUB4: '+/-',
    COMP4: 'CMP',
    COMP8: '⚖',
    SHIFT4: 'SFT',
    SHIFT_REG8: '⇉',
    REG4: 'REG',
    REG8: '📦',
    LATCH_8: '🔒',
    RAM164: 'RAM',
    ROM164: 'ROM',
    ROM32K: '💾',
    SRAM32K: '💾',
    UART: '🔌',
    TRISTATE: 'TRI',
    TRI_BUFFER_8: '▷▷▷',
    BUSSWITCH: 'BUS',
    BUS_TRANSCEIVER: '⇄',
    BUS4: '║4',
    BUS8: '║8',
    TJUNCTION: '●',
    CROSSJUNCTION: '✛',
    CPU: 'CPU',
    ROM256: 'PROM',
    INSTRUCTION_EXECUTOR: '⚙',
    IO_BRIDGE: '🌉',
    EXT_RAM: 'RAM',
    IO_PORT: 'IO',
    TIMER: '⏱',
    TEXT: '📝'
  }
  const customDef = getCustomComponentDef(type)
  if (customDef) return customDef.label?.substring(0, 2) || '🧩'
  return icons[type] || '?'
}

function getDesc(type) {
  const descs = {
    AND: '2输入与',
    AND3: '3输入与',
    AND4: '4输入与门',
    OR: '2输入或',
    OR3: '3输入或',
    OR4: '4输入或门',
    NOT: '1输入非',
    BUFFER: '缓冲器',
    NAND: '2输入与非',
    NAND4: '4输入与非门',
    NOR: '2输入或非',
    NOR4: '4输入或非门',
    XOR: '2输入异或',
    XNOR: '2输入同或',
    SCHMITT: '施密特触发器(迟滞)',
    SWITCH: '点击切换',
    CONST0: '常量0输出',
    CONST1: '常量1输出',
    GND: '接地(0V)',
    VCC: '电源(+5V)',
    PULLUP: '上拉电阻',
    PULLDOWN: '下拉电阻',
    BUTTON: '瞬时按键',
    DIPSW4: '4位拨码开关',
    LED: '显示输出',
    SEGDISPLAY1: '1位数码管显示',
    SEGDISPLAY8: '8位数码管显示',
    SEG7CC: '七段数码管(共阴)',
    SEG7CA: '七段数码管(共阳)',
    BCD7SEG: 'BCD转七段译码',
    DOTMATRIX16: '16x16点阵屏',
    LCD1602: '1602液晶显示屏',
    HEXDISPLAY: '双十六进制显示',
    ASCII_DISPLAY: 'ASCII字符显示',
    LED_BAR8: '8路LED电平条',
    SCOPE: '示波器(波形显示)',
    KEYPAD_4x4: '4x4矩阵键盘',
    CLOCK: '周期性信号',
    OSCILLATOR: '独立方波振荡器',
    CLOCKDIVIDER: '时钟分频器',
    PWM_GENERATOR: 'PWM方波发生器',
    DFF: 'D触发器',
    DLATCH: 'D锁存器',
    JKFF: 'JK触发器',
    TFF: 'T触发器',
    SRFF: 'SR触发器',
    HALFADDER: '1位加法',
    FULLADDER: '带进位加法',
    MUX2: '2选1选择器',
    MUX4: '4选1选择器',
    MUX8: '8选1多路选择器',
    DEMUX2: '1转2分配器',
    DEMUX8: '1转8数据分配器',
    DEC38: '3转8译码器',
    DEC24: '2转4译码器',
    DEC4_16: '4转16译码器',
    ENC42: '4转2优先编码',
    ENC8_3: '8转3优先编码器',
    COUNTER4: '4位加减计数',
    COUNTER8: '8位计数器',
    RING4: '环形计数器',
    ALU4: '4位ALU',
    ALU8: '8位算术逻辑单元',
    ADD8: '8位加法器',
    ADDSUB4: '4位加减法',
    COMP4: '4位比较器',
    COMP8: '8位比较器',
    SHIFT4: '4位移位器',
    SHIFT_REG8: '8位移位寄存器',
    REG4: '4位寄存器',
    REG8: '8位寄存器',
    LATCH_8: '8位透明锁存器',
    RAM164: '16x4 RAM',
    ROM164: '16x4 ROM',
    ROM32K: '32KB只读存储器',
    SRAM32K: '32KB静态RAM',
    UART: 'UART串口收发器',
    TRISTATE: '三态缓冲器',
    TRI_BUFFER_8: '8位三态缓冲器',
    BUSSWITCH: '总线开关',
    BUS_TRANSCEIVER: '8位总线收发器',
    BUS4: '4位总线显示',
    BUS8: '8位总线显示',
    TJUNCTION: 'T型分支',
    CROSSJUNCTION: '十字分支',
    CPU: '8位CPU',
    ROM256: '256x16程序ROM',
    INSTRUCTION_EXECUTOR: '指令执行器',
    IO_BRIDGE: 'I/O桥接器',
    EXT_RAM: '256x8外部RAM',
    IO_PORT: '通用I/O端口',
    TIMER: '定时器/中断',
    TEXT: '文本说明注释'
  }
  const customDef = getCustomComponentDef(type)
  if (customDef) {
    return `${customDef.inputs}输入/${customDef.outputs}输出`
  }
  return descs[type] || ''
}

function getKeywords(type) {
  const keywords = {
    AND: '与门 yu yumen and gate 逻辑与',
    AND3: '与门 yu and3 三输入与 3输入与',
    AND4: '与门 yu and4 四输入与 4输入与',
    OR: '或门 huo huomen or gate 逻辑或',
    OR3: '或门 huo or3 三输入或 3输入或',
    OR4: '或门 huo or4 四输入或 4输入或',
    NOT: '非门 fei feimen not gate 反相器 inverter 取反',
    BUFFER: '缓冲器 huan chong qi buffer buf 缓冲 驱动',
    NAND: '与非门 yu fei men nand yufei nand gate',
    NAND4: '与非门 yu fei men nand4 四输入与非 4输入与非',
    NOR: '或非门 huo fei men nor huofei nor gate',
    NOR4: '或非门 huo fei men nor4 四输入或非 4输入或非',
    XOR: '异或门 yi huo men xor yihuo xor gate 异或',
    XNOR: '同或门 tong huo men xnor tonghuo xnor gate 同或',
    SCHMITT: '施密特触发器 schmitt shi mite te chufaqi 迟滞 hysteresis',
    SWITCH: '开关 kai guan switch kaiguan 切换',
    CONST0: '常量0 零 constant 0 ling changliang',
    CONST1: '常量1 一 constant 1 yi changliang',
    GND: '接地 ground gnd jie di 地 0v',
    VCC: '电源 power vcc 5v dian yuan 电源5v',
    PULLUP: '上拉电阻 pull up resistor shang la dian zu 上拉',
    PULLDOWN: '下拉电阻 pull down resistor xia la dian zu 下拉',
    BUTTON: '按键 button btn an jian 按钮瞬时',
    DIPSW4: '拨码开关 dip switch bo ma kai guan 拨码 dipsw',
    LED: '发光二极管 led 灯 light diode deng',
    SEGDISPLAY1: '1位数码管 1 digit 7 seg display shu ma guan 数码管',
    SEGDISPLAY8: '8位数码管 8 digit 7 seg display shu ma guan 数码管',
    SEG7CC: '七段数码管共阴 7 seg seven segment common cathode qi duan guan yin 共阴',
    SEG7CA: '七段数码管共阳 7 seg seven segment common anode qi duan guan yang 共阳',
    BCD7SEG: 'bcd转七段译码 bcd 7 seg seven segment qi duan yima 译码',
    DOTMATRIX16: '点阵屏 dot matrix dian zhen ping 16x16 点阵',
    LCD1602: '液晶屏 lcd liquid crystal ye jing ping 1602 液晶',
    HEXDISPLAY: '十六进制显示 hex display shi liu jin zhi hex',
    ASCII_DISPLAY: 'ascii字符显示 ascii character display zi fu xian shi 字符',
    LED_BAR8: 'led条 led bar dian ping tiao 电平条 8路',
    SCOPE: '示波器 oscilloscope scope shi bo qi 波形 waveform',
    KEYPAD_4x4: '矩阵键盘 keypad matrix keyboard ju zhen jian pan 4x4 键盘',
    CLOCK: '时钟 clock clk shi zhong 时钟信号',
    OSCILLATOR: '振荡器 oscillator osc zhen dang qi 振荡 方波',
    CLOCKDIVIDER: '时钟分频器 clock divider fen pin qi 分频',
    PWM_GENERATOR: 'pwm发生器 pulse width modulator pwm fa sheng qi 脉宽',
    DFF: 'D触发器 d flip flop dff d chufaqi 触发',
    DLATCH: 'D锁存器 d latch suo cun qi d锁存',
    JKFF: 'JK触发器 jk flip flop jkff jk chufaqi 触发',
    TFF: 'T触发器 t flip flop tff t chufaqi toggle 翻转',
    SRFF: 'SR触发器 sr flip flop srff sr chufaqi set reset',
    HALFADDER: '半加器 half adder ban jia qi banjia 半加',
    FULLADDER: '全加器 full adder quan jia qi quanjia 全加 带进位',
    MUX2: '2选1多路选择器 mux2 multiplexer duo lu xuan ze 多路',
    MUX4: '4选1多路选择器 mux4 multiplexer 4选1 多路',
    MUX8: '8选1多路选择器 mux8 multiplexer 8选1 多路',
    DEMUX2: '1转2解复用器 demux2 demultiplexer fen pei qi 分配器',
    DEMUX8: '1转8数据分配器 demux8 demultiplexer 1转8 分配器',
    DEC38: '3转8译码器 decoder 3 to 8 3-8 yi ma qi 译码',
    DEC24: '2转4译码器 decoder 2 to 4 2-4 译码',
    DEC4_16: '4转16译码器 decoder 4 to 16 4-16 译码',
    ENC42: '4转2优先编码器 encoder 4 to 2 4-2 bian ma qi 编码',
    ENC8_3: '8转3优先编码器 encoder 8 to 3 8-3 编码',
    COUNTER4: '4位计数器 counter cnt4 ji shu qi 计数',
    COUNTER8: '8位计数器 counter cnt8 ji shu qi 计数',
    RING4: '环形计数器 ring counter huan xing ji shu qi 环形',
    ALU4: '4位算术逻辑单元 alu arithmetic logic unit 4位 alu',
    ALU8: '8位算术逻辑单元 alu arithmetic logic unit 8位 alu',
    ADD8: '8位加法器 8 bit adder jia fa qi 加法',
    ADDSUB4: '4位加减法器 adder subtractor jia jian fa qi 加减',
    COMP4: '4位比较器 comparator cmp4 bi jiao qi 比较',
    COMP8: '8位比较器 comparator cmp8 bi jiao qi 比较',
    SHIFT4: '4位移位器 shifter shift4 yi wei qi 移位',
    SHIFT_REG8: '8位移位寄存器 shift register yi wei ji cun qi 移位寄存',
    REG4: '4位寄存器 register reg4 ji cun qi 寄存',
    REG8: '8位寄存器 register reg8 ji cun qi 寄存',
    LATCH_8: '8位锁存器 latch suo cun qi 锁存 透明',
    RAM164: '16x4 ram 随机存取存储器 sui ji cun qu memory 16x4',
    ROM164: '16x4 rom 只读存储器 zhi du cun chu 16x4',
    ROM32K: '32kb rom 只读存储器 32k zhi du cun chu',
    SRAM32K: '32kb sram 静态内存 static ram 32k jing tai nei cun',
    UART: 'uart串口 uart serial chuan kou 串口收发',
    TRISTATE: '三态缓冲器 tri state three state san tai huan chong 三态',
    TRI_BUFFER_8: '8位三态缓冲器 8 bit tri state buffer san tai 三态',
    BUSSWITCH: '总线开关 bus switch zong xian kai guan 总线',
    BUS_TRANSCEIVER: '8位总线收发器 bus transceiver zong xian shou fa 收发',
    BUS4: '4位总线显示 bus display zong xian xian shi 4位总线',
    BUS8: '8位总线显示 bus display zong xian xian shi 8位总线',
    TJUNCTION: 't型分支 t junction jiao dian 节点 分支 t型',
    CROSSJUNCTION: '十字分支 cross junction jiao dian 节点 十字',
    CPU: '8位cpu 处理器 processor central processing unit chu li qi 中央处理器',
    ROM256: '256x16程序rom prom 256x16 cheng xu rom 程序rom',
    INSTRUCTION_EXECUTOR: '指令执行器 instruction executor zhi ling zhi xing qi 指令执行',
    IO_BRIDGE: 'io桥接器 io bridge qiao jie qi 桥接 io桥',
    EXT_RAM: '外部ram external ram wai bu ram 外存',
    IO_PORT: 'io端口 io port duan kou 端口 io口',
    TIMER: '定时器 timer ding shi qi 定时 中断',
    TEXT: '文本说明 text label wen ben shuo ming 文本注释'
  }
  return keywords[type] || ''
}

function getPinInfo(type) {
  const def = COMPONENT_TYPES[type]
  if (def) return `输入: ${def.inputs}  输出: ${def.outputs}`
  const customDef = getCustomComponentDef(type)
  if (customDef) return `输入: ${customDef.inputs}  输出: ${customDef.outputs}`
  return ''
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
  position: relative;
}

.component-item:hover {
  background: #383838;
  border-color: #4a9eff40;
  z-index: 10;
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

.fav-btn {
  background: none;
  border: none;
  color: #555;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  transition: all 0.15s;
  opacity: 0.5;
}

.fav-btn:hover {
  opacity: 1;
  color: #f1c40f;
}

.fav-btn.active {
  opacity: 1;
  color: #f1c40f;
}

.custom-comp:hover {
  border-color: #9b59b640 !important;
}

.custom-comp:hover .component-icon {
  background: #9b59b640 !important;
}

.pin-tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-top: 4px;
  background: #1e1e1e;
  border: 1px solid #4a9eff;
  color: #ddd;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 50;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.component-item:hover .pin-tooltip {
  opacity: 1;
}
</style>
