# 数字电路仿真器 - 设计与实现文档

## 项目概述

基于 Vue 3 + Vite + Canvas 2D 的网页版数字电路设计与实时仿真平台。纯前端实现，无需后端服务，内置 90+ 元器件、8 位 CPU 调试器、汇编指令编辑器与真值表分析工具，支持图灵完备的电路构建。

## 技术栈

- **Vue 3** + Composition API（`ref` / `computed` / `watch` / 组合式函数）
- **Vite 5** 构建工具，支持 HMR 热更新
- **Canvas 2D** 电路渲染（60fps 渲染循环、变换矩阵支持旋转/翻转）
- 纯前端实现，零后端依赖

## 核心功能

### 1. 元器件库（90+）

#### 逻辑门
AND / AND3 / AND4 / OR / OR3 / OR4 / NOT / BUFFER / NAND / NAND4 / NOR / NOR4 / XOR / XNOR / SCHMITT（施密特触发器）

#### 输入输出
- **输入源**：SWITCH（拨动开关）/ BUTTON（瞬时按键）/ DIPSW4（4 位拨码）/ CONST0 / CONST1
- **显示**：LED / SEGDISPLAY1 / SEGDISPLAY8 / SEG7CC / SEG7CA / DOTMATRIX16 / LCD1602 / HEXDISPLAY / ASCII_DISPLAY / LED_BAR8 / SCOPE（示波器）
- **键盘**：KEYPAD_4x4（4×4 矩阵键盘）

#### 电源
GND / VCC / PULLUP / PULLDOWN

#### 触发器
DFF / DLATCH / JKFF / TFF / SRFF（支持边沿触发与电平触发）

#### 译码编码
DEC38 / DEC24 / ENC42 / BCD7SEG / DEC4_16 / ENC8_3

#### 计数器
COUNTER4 / RING4 / COUNTER8

#### 运算器
HALFADDER / FULLADDER / MUX2 / MUX4 / DEMUX2 / ALU4 / ADDSUB4 / COMP4 / SHIFT4 / ALU8 / ADD8 / COMP8 / MUX8 / DEMUX8

#### 存储器
REG4 / RAM164 / ROM164 / REG8 / SHIFT_REG8 / LATCH_8 / ROM32K / SRAM32K

#### 总线
TRISTATE / BUSSWITCH / BUS4 / BUS8 / TRI_BUFFER_8 / BUS_TRANSCEIVER

#### 时钟控制
CLOCK / CLOCKDIVIDER / OSCILLATOR / PWM_GENERATOR

#### 分支节点
TJUNCTION / CROSSJUNCTION

#### CPU 与编程
CPU / ROM256 / INSTRUCTION_EXECUTOR

#### I/O 设备
IO_BRIDGE / EXT_RAM / IO_PORT / TIMER / UART

#### 其他
TEXT（文本标注）

### 2. 画布系统
- 无限滚动画布，支持平移与缩放
- 20px 网格自动对齐
- 元器件拖拽放置（含碰撞检测与自动避让）
- 多选 / 框选 / 复制 / 粘贴 / 撤销 / 重做
- 旋转（0/90/180/270°）+ 水平/垂直翻转
- 右键上下文菜单（旋转/翻转/复制/删除）
- 元器件悬停高亮 + 可配置组件齿轮提示
- 选中辉光 + 拖拽对齐参考线

### 3. 连线系统
- 端口点击连线，单击空白添加中间节点
- 直角布线，支持任意中间节点编辑
- 连线根据信号类型自动着色：
  - 时钟线（紫）/ 控制线（橙）/ 总线（蓝粗）/ 数据线（绿/灰）
- 高电平信号流动动画
- 分支节点（TJUNCTION）支持一输出多驱动
- 连线过程中实时检测短路冲突
- 探针模式悬停显示信号值（0/1）
- 连线节点悬停高亮，便于编辑

### 4. 仿真引擎
- 实时连续仿真 + 单步执行
- 时钟频率 1–60 Hz 可调
- 基于拓扑排序的信号传播算法
- 支持边沿触发与电平触发时序元件
- 时钟可配置频率、占空比、相位
- 错误检测：输入悬空 / 输出短路 / 反馈环路 / 多驱动冲突

### 5. 分析工具
- **真值表**：自动生成组合逻辑电路真值表与简化逻辑表达式
- **表达式转电路**：输入布尔表达式自动生成电路
- **元器件说明书**：内置帮助系统，覆盖所有元器件的引脚、真值表、公式与使用示例，支持关键词搜索与高亮

### 6. CPU 与编程
- **8 位 CPU**：完整指令集（算术/逻辑/跳转/访存/I/O）
- **调试器**：断点、单步、寄存器查看、I/O 输出监视
- **指令执行器**：独立的指令执行调试面板
- **汇编编辑器**：汇编代码编辑、ROM 烧录、指令模板
- **存储器编辑器**：RAM / ROM / SRAM 可视化编辑
- **点阵编辑器**：16×16 点阵图案编辑

### 7. 自定义组件
- 将任意子电路封装为可复用黑盒元件
- 自动生成引脚
- 出现在元器件库"自定义"分类
- 支持导出为 JSON 分享

## 文件结构

```
src/
├── components/                  # Vue 组件
│   ├── Canvas.vue               # 画布（电路渲染与交互核心）
│   ├── Toolbar.vue              # 顶部工具栏
│   ├── ComponentLibrary.vue     # 左侧元器件库（含搜索/拼音别名）
│   ├── ComponentDetailPanel.vue # 元器件详情面板
│   ├── HelpModal.vue            # 帮助/说明书（含搜索高亮）
│   ├── PackageModal.vue         # 自定义组件打包
│   ├── CPUDbgPanel.vue          # CPU 调试器面板
│   ├── ExecDbgPanel.vue         # 指令执行器调试面板
│   ├── InstructionEditor.vue    # 汇编指令编辑器
│   ├── MemoryEditor.vue         # 存储器编辑器
│   ├── DotMatrixEditor.vue      # 点阵编辑器
│   ├── StateViewer.vue          # 时序状态查看器
│   ├── ClockSettingsDialog.vue  # 时钟参数设置
│   ├── IoConfigDialog.vue       # I/O 配置对话框
│   ├── ErrorPanel.vue           # 错误检测面板
│   └── CommandConsole.vue       # 命令控制台
├── composables/                 # 组合式函数
│   ├── useCircuit.js            # 电路数据管理
│   ├── useSimulation.js         # 仿真引擎
│   ├── useTruthTable.js         # 真值表生成
│   ├── useErrorDetection.js     # 错误检测
│   ├── useExpressionToCircuit.js# 表达式转电路
│   ├── useCPU.js                # CPU 执行引擎
│   ├── useAssembler.js          # 汇编器
│   ├── useCustomComponents.js   # 自定义组件管理
│   └── useScreenManager.js      # 屏幕管理
├── constants/                   # 常量定义
│   ├── componentTypes.js        # 元器件类型与分类
│   ├── componentDetails.js      # 元器件详情（真值表/公式/示例）
│   ├── assemblyInstructions.js  # 汇编指令集
│   └── asmTemplates.js          # 汇编代码模板
├── utils/
│   └── textUtils.js             # 文本工具
├── App.vue                      # 根组件
├── main.js                      # 入口文件
└── style.css                    # 全局样式
```

## 数据结构

### 元器件 (Component)
```javascript
{
  id: string,
  type: string,           // 'AND', 'OR', 'CPU', ...
  x: number, y: number,
  width: number, height: number,
  rotation: 0|90|180|270,
  flippedX: boolean,
  flippedY: boolean,
  inputs: [{ value: 0|1 }],
  outputs: [{ value: 0|1 }],
  state: any,             // 时序元件内部状态
  // 组件特定属性（频率、占空比、内存数据等）
}
```

### 连线 (Wire)
```javascript
{
  id: string,
  from: { componentId: string, port: number },
  to: { componentId: string, port: number },
  points: [{ x, y }],     // 中间拐点
  value: 0|1
}
```

### 电路 (Circuit)
```javascript
{
  components: ref([Component]),
  wires: ref([Wire]),
  selection: { components: [...], wires: [...] },
  viewport: { x, y, zoom }
}
```

## 核心算法

### 信号传播
1. 从输入源组件（SWITCH/CLOCK/CONST 等）出发
2. 按拓扑顺序计算每个组件的输出
3. 通过连线传播到相连组件的输入
4. 循环迭代直至电路稳定或达到最大迭代次数
5. 时序元件在时钟边沿捕获状态

### 端口位置变换
元器件旋转/翻转后，端口位置通过以中心为原点的坐标变换矩阵重新计算，保证连线始终对齐实际端口。

### 碰撞检测
拖拽放置时检测与现有元器件的重叠，自动偏移寻找空位，避免元器件堆叠。

### 短路检测
连线过程中实时检查目标端口是否已有驱动源，多驱动冲突时阻止连线并提示。

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+C` / `Ctrl+V` | 复制 / 粘贴 |
| `Ctrl+Z` / `Ctrl+Y` | 撤销 / 重做 |
| `Delete` | 删除选中 |
| `Space` | 开始 / 暂停仿真 |
| `R` | 旋转组件 |
| `H` / `V` | 水平 / 垂直翻转 |
| `S` | 单步执行 |
| `P` | 探针模式 |
| `Escape` | 取消当前操作 |
| 鼠标滚轮 | 缩放画布 |
| 中键 / 右键拖动 | 平移画布 |
| 双击元器件 | 打开配置 |
| 右键元器件 | 上下文菜单 |

## License

MIT
