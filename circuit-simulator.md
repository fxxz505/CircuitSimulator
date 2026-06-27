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

## 架构设计

### 模块关系

```
App.vue
  ├── Toolbar.vue ──── 仿真控制 / 文件操作 / 分析工具
  ├── ComponentLibrary.vue ──── 元器件拖拽源
  ├── Canvas.vue ──── 画布渲染 + 交互（核心）
  │     ├── useCircuit.js ──── 数据层（元器件/连线/选择/历史）
  │     ├── useSimulation.js ──── 仿真引擎
  │     ├── useErrorDetection.js ──── 错误检测
  │     └── useScreenManager.js ──── 视口管理
  ├── CPUDbgPanel.vue ──── useCPU.js + useAssembler.js
  ├── HelpModal.vue ──── componentDetails.js
  └── 各类编辑器对话框
```

### 数据流

```
用户操作 → useCircuit (数据变更) → Canvas (重绘)
                ↓
         useSimulation (仿真引擎)
                ↓
         更新 outputs[] → 连线传播 → 输入更新
                ↓
         Canvas 渲染循环 (60fps requestAnimationFrame)
```

### 渲染管线

Canvas.vue 使用 `requestAnimationFrame` 维护 60fps 渲染循环：
1. 清空画布，应用视口变换（平移 + 缩放）
2. 绘制网格背景
3. 按拓扑顺序绘制连线和元器件
4. 绘制选中态、悬停态、对齐参考线等覆盖层
5. 绘制临时连线（布线中）

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

## 扩展开发

### 添加新元器件

**步骤 1**：在 `src/constants/componentTypes.js` 定义元器件类型：

```javascript
MYGATE: {
  name: '我的门',
  inputs: 2,
  outputs: 1,
  width: 80,
  height: 60,
  color: '#4a9eff',
  label: 'MY',
  portLabels: { inputs: ['A', 'B'], outputs: ['Y'] },
  evaluate: (inputs) => [inputs[0] & inputs[1]]
}
```

关键字段说明：
- `inputs` / `outputs` — 输入输出端口数
- `evaluate` — 组合逻辑求值函数（输入数组 → 输出数组）
- `isMemory` — 设为 `true` 表示时序元件（有时钟输入和内部状态）
- `state` — 时序元件的初始状态
- `portLabels` — 端口标签（对象格式 `{ inputs: [...], outputs: [...] }`）
- `color` — 元器件颜色（按分类统一：逻辑门蓝/触发器绿/运算器橙/存储器紫等）

**步骤 2**：在 `src/constants/componentDetails.js` 添加帮助信息（真值表、公式、示例）。

**步骤 3**：在 `src/components/Canvas.vue` 的 `drawComponent` 函数中添加 `case 'MYGATE':` 绘制分支。

**步骤 4**：在 `componentTypes.js` 的 `CATEGORIES` 中将元器件加入对应分类。

**步骤 5**（时序元件）：在 `src/composables/useSimulation.js` 的仿真循环中添加状态更新逻辑。

### 添加新汇编指令

1. 在 `src/constants/assemblyInstructions.js` 添加指令定义（操作码、助记符、格式、描述）
2. 在 `src/composables/useCPU.js` 的 `executeInstruction` 添加 `case` 执行分支
3. 在 `src/composables/useAssembler.js` 添加汇编语法解析规则
4. 在 `src/constants/asmTemplates.js` 添加代码模板（可选）

### 自定义组件

通过 UI 打包自定义组件时，系统会：
1. 收集选中范围内的元器件和连线
2. 识别外部连接点作为引脚
3. 生成组件定义并注册到 `useCustomComponents.js`
4. 在元器件库"自定义"分类中显示

自定义组件可导出为 JSON 文件分享，导入时恢复完整内部电路。

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

## CPU 指令集

内置 8 位 CPU，16 位指令编码，支持 32 条指令。

### 指令格式

| 类型 | 编码格式 | 说明 |
|------|----------|------|
| 寄存器-寄存器 | `[15:12]=op [11:8]=Ra [7:4]=Rb [3:0]=0` | 双寄存器操作 |
| 立即数 | `[15:12]=op [11:8]=Ra [7:4]=0 [3:0]=imm4` | 4 位立即数 |
| 访存 | `[15:12]=op [11:8]=Ra [7:0]=addr8` | 8 位地址（bit7=1 为 I/O） |
| 跳转 | `[15:12]=op [11:8]=0 [7:0]=addr8` | 无条件跳转 |
| 单寄存器 | `[15:12]=op [11:8]=Ra [7:0]=0` | 单寄存器操作 |
| 无操作数 | `[15:12]=op [11:8]=0 [7:0]=0` | 无操作数 |

### 基础指令（0x0–0xF）

| 指令 | 操作码 | 格式 | 说明 |
|------|--------|------|------|
| LOAD | 0x0 | `LOAD Ra, [addr]` | 从内存/IO 加载到寄存器 |
| STORE | 0x1 | `STORE Ra, [addr]` | 寄存器存入内存/IO |
| ADD | 0x2 | `ADD Ra, Rb` | Ra = Ra + Rb |
| SUB | 0x3 | `SUB Ra, Rb` | Ra = Ra - Rb |
| AND | 0x4 | `AND Ra, Rb` | Ra = Ra AND Rb |
| OR | 0x5 | `OR Ra, Rb` | Ra = Ra OR Rb |
| NOT | 0x6 | `NOT Ra` | Ra = NOT Ra |
| JMP | 0x7 | `JMP addr` | 无条件跳转 |
| JZ | 0x8 | `JZ Ra, addr` | Ra=0 跳转 |
| JNZ | 0x9 | `JNZ Ra, addr` | Ra≠0 跳转 |
| MOV | 0xA | `MOV Ra, Rb` | Ra = Rb |
| LDI | 0xB | `LDI Ra, imm` | 加载 4 位立即数 |
| SHL | 0xC | `SHL Ra` | 左移 |
| SHR | 0xD | `SHR Ra` | 右移 |
| CMP | 0xE | `CMP Ra, Rb` | 比较（影响标志位） |
| HALT | 0xF | `HALT` | 停机 |

### 扩展指令（0x10–0x1F）

| 指令 | 操作码 | 格式 | 说明 |
|------|--------|------|------|
| CALL | 0x10 | `CALL addr` | 函数调用（保存 PC 到栈） |
| RET | 0x11 | `RET` | 函数返回 |
| PUSH | 0x12 | `PUSH Ra` | 压栈 |
| POP | 0x13 | `POP Ra` | 出栈 |
| INT | 0x14 | `INT imm` | 软中断 |
| IRET | 0x15 | `IRET` | 中断返回 |
| INC | 0x16 | `INC Ra` | Ra = Ra + 1 |
| DEC | 0x17 | `DEC Ra` | Ra = Ra - 1 |
| ADDI | 0x18 | `ADDI Ra, imm` | Ra = Ra + imm |
| SUBI | 0x19 | `SUBI Ra, imm` | Ra = Ra - imm |
| JC | 0x1A | `JC addr` | 进位标志=1 跳转 |
| JNC | 0x1B | `JNC addr` | 进位标志=0 跳转 |
| LDI8 | 0x1C | `LDI8 Ra, imm8` | 加载 8 位立即数 |
| CMPI | 0x1D | `CMPI Ra, imm8` | 与立即数比较 |
| EI | 0x1E | `EI` | 开中断 |
| DI | 0x1F | `DI` | 关中断 |

### 寄存器

| 寄存器 | 说明 |
|--------|------|
| R0–R7 | 8 个通用寄存器（8 位） |
| PC | 程序计数器（8 位） |
| SP | 栈指针（8 位） |
| FLAGS | 标志寄存器（零标志 Z、进位标志 C） |

### 内存与 I/O 映射

CPU 地址空间 8 位（0x00–0xFF），bit7 区分内存与 I/O：

| 地址范围 | 类型 | 说明 |
|----------|------|------|
| `0x00–0x7F` | RAM | 通用内存（128 字节） |
| `0x80–0xFF` | I/O | I/O 端口（bit7=1 标记） |

**I/O 端口访问**：
- `LOAD R0, [0x80]` — 读取 I/O 端口 0 的输入
- `STORE R0, [0x81]` — 写入 I/O 端口 1 的输出
- 配合 IO_BRIDGE / IO_PORT 元器件连接外部电路

### 汇编示例

#### 1 到 10 求和

```asm
LDI R0, 0        ; 累加器清零
LDI R1, 1        ; 计数器 = 1
LDI R2, 10       ; 上限 = 10

loop:
  ADD R0, R1     ; 累加
  INC R1         ; 计数器 +1
  CMP R1, R2     ; 比较
  JNZ loop       ; 未到 10 继续

STORE R0, [0x10] ; 结果存入内存
HALT             ; 停机
```

#### 函数调用示例

```asm
LDI R0, 5
CALL square      ; 调用求平方函数
STORE R0, [0x20]
HALT

square:
  MOV R1, R0     ; R1 = R0
  MUL R0, R1     ; R0 = R0 * R1（若支持）
  RET            ; 返回
```

## 示例电路搭建

### 半加器

使用 XOR 和 AND 门实现 1 位加法：

1. 放置 2 个 SWITCH（A、B 输入）
2. 放置 1 个 XOR 门，输入接 A、B，输出接 LED（Sum）
3. 放置 1 个 AND 门，输入接 A、B，输出接 LED（Carry）
4. 开始仿真，拨动开关验证真值表

### 全加器

使用 2 个 XOR、2 个 AND、1 个 OR 实现带进位的 1 位加法：

1. 放置 3 个 SWITCH（A、B、Cin）
2. XOR1：输入 A、B → 输出接 XOR2 第一输入
3. XOR2：输入 XOR1 输出、Cin → 输出接 LED（Sum）
4. AND1：输入 XOR1 输出、Cin
5. AND2：输入 A、B
6. OR：输入 AND1、AND2 输出 → 接 LED（Cout）

### SR 锁存器

使用 2 个 NOR 门实现 1 位存储：

1. 放置 2 个 SWITCH（S 置位、R 复位）
2. NOR1：输入 S、NOR2 输出 → 输出 Q
3. NOR2：输入 R、NOR1 输出 → 输出 Q̄
4. 放置 2 个 LED 显示 Q 和 Q̄

### 4 位递增计数器

1. 放置 1 个 CLOCK（设置频率 2Hz）
2. 放置 1 个 COUNTER4，CLK 接 CLOCK，UP/DN 接 GND（递增），RST 接 GND
3. 4 个输出 Q0–Q3 各接 1 个 LED
4. 开始仿真，观察 LED 按二进制递增

### CPU 读取开关控制 LED

演示 CPU 通过 I/O 端口读取输入并控制输出：

1. 放置 CPU、ROM256、IO_BRIDGE
2. 连接 ROM256 到 CPU 指令总线
3. 放置 8 个 SWITCH 连接到 IO_BRIDGE 输入端口
4. 放置 8 个 LED 连接到 IO_BRIDGE 输出端口
5. 在汇编编辑器中编写程序：

```asm
loop:
  LOAD R0, [0x80]    ; 读取输入端口 0（开关状态）
  STORE R0, [0x81]   ; 写入输出端口 1（LED）
  JMP loop           ; 循环
```

6. 烧录到 ROM，启动仿真，拨动开关即可控制 LED

## License

MIT
