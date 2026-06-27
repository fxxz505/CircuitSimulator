# DLOW-CircuitSimulator

> 基于 Vue 3 + Canvas 2D 的数字电路设计与实时仿真平台，内置 90+ 元器件、8 位 CPU 调试器、汇编指令编辑器与真值表分析工具，支持图灵完备的电路构建。

一个类似《Turing Complete》与《Logisim》的网页版数字电路仿真器，纯前端实现，无需后端服务，开箱即用。

🌐 **在线演示**: https://fxxz505.github.io/CircuitSimulator/

## 功能特性

### 电路设计与仿真
- **实时仿真** — 连续仿真与单步执行，时钟频率 1–60 Hz 可调
- **交互式布线** — 拖拽连线、直角布线、分支节点、中间节点编辑、连线信号流动动画
- **探针模式** — 悬停任意连线即时显示信号值（0/1）与电平颜色
- **错误检测** — 实时检测输入悬空、输出短路、反馈环路、多驱动冲突，连线过程中即时阻止短路
- **撤销/重做** — 完整的历史栈，支持 Ctrl+Z / Ctrl+Y
- **复制/粘贴** — 跨电路复制元器件与连线
- **自定义组件** — 将选中电路打包为自定义组件，支持导入/导出复用

### 分析工具
- **真值表分析** — 自动生成组合逻辑电路的真值表与简化逻辑表达式
- **表达式转电路** — 输入布尔表达式（如 `A·B + C`）自动生成对应电路
- **元器件说明书** — 内置帮助系统，覆盖所有元器件的引脚、真值表、公式与使用示例，支持关键词搜索

### CPU 与编程
- **8 位 CPU 调试器** — 内置 CPU 面板，支持断点、单步、寄存器查看、I/O 输出监视
- **指令执行器** — 独立的指令执行调试面板
- **汇编编辑器** — 汇编代码编辑、ROM 烧录、指令模板
- **存储器编辑器** — RAM / ROM / SRAM 可视化编辑
- **点阵编辑器** — 16×16 点阵图案编辑

### 视觉与交互
- **暗色主题** — 全局统一的深色 UI
- **元器件悬停反馈** — 蓝色高亮边框 + 可配置组件齿轮提示
- **选中辉光** — 选中元器件带阴影发光
- **拖拽对齐参考线** — 拖动时与其它元器件左/右/上/下/中心对齐显示橙色虚线
- **端口标签** — 悬停端口显示引脚名，多引脚侧显示编号
- **分支节点悬停** — 连线节点悬停高亮，便于编辑
- **数码管上电过渡** — 数码管值变化时辉光衰减动画
- **CLOCK 呼吸动画** — 时钟高电平脉动呼吸环

## 元器件库（90+）

| 分类 | 元器件 |
|------|--------|
| **逻辑门** | AND / AND3 / AND4 / OR / OR3 / OR4 / NOT / BUFFER / NAND / NAND4 / NOR / NOR4 / XOR / XNOR / SCHMITT |
| **输入输出** | SWITCH / BUTTON / DIPSW4 / CONST0 / CONST1 / LED / SEGDISPLAY1 / SEGDISPLAY8 / SEG7CC / SEG7CA / DOTMATRIX16 / LCD1602 / HEXDISPLAY / ASCII_DISPLAY / LED_BAR8 / SCOPE / KEYPAD_4x4 |
| **电源** | GND / VCC / PULLUP / PULLDOWN |
| **触发器** | DFF / DLATCH / JKFF / TFF / SRFF |
| **译码编码** | DEC38 / DEC24 / ENC42 / BCD7SEG / DEC4_16 / ENC8_3 |
| **计数器** | COUNTER4 / RING4 / COUNTER8 |
| **运算器** | HALFADDER / FULLADDER / MUX2 / MUX4 / DEMUX2 / ALU4 / ADDSUB4 / COMP4 / SHIFT4 / ALU8 / ADD8 / COMP8 / MUX8 / DEMUX8 |
| **存储器** | REG4 / RAM164 / ROM164 / REG8 / SHIFT_REG8 / LATCH_8 / ROM32K / SRAM32K |
| **总线** | TRISTATE / BUSSWITCH / BUS4 / BUS8 / TRI_BUFFER_8 / BUS_TRANSCEIVER |
| **时钟控制** | CLOCK / CLOCKDIVIDER / OSCILLATOR / PWM_GENERATOR |
| **分支节点** | TJUNCTION / CROSSJUNCTION |
| **CPU 与编程** | CPU / ROM256 / INSTRUCTION_EXECUTOR |
| **I/O 设备** | IO_BRIDGE / EXT_RAM / IO_PORT / TIMER / UART |
| **其他** | TEXT |

## 技术栈

- **Vue 3** + Composition API（`ref` / `computed` / `watch` / 组合式函数）
- **Vite 5** 构建工具，支持 HMR 热更新
- **Canvas 2D** 电路渲染（60fps 渲染循环、变换矩阵支持旋转/翻转）
- 纯前端实现，零后端依赖

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（默认 http://localhost:3000）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 项目结构

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
│   ├── useCircuit.js            # 电路数据管理（元器件/连线/选择/历史）
│   ├── useSimulation.js         # 仿真引擎（信号传播/时钟驱动）
│   ├── useTruthTable.js         # 真值表自动生成
│   ├── useErrorDetection.js     # 错误检测（悬空/短路/环路）
│   ├── useExpressionToCircuit.js# 表达式转电路
│   ├── useCPU.js                # CPU 执行引擎
│   ├── useAssembler.js          # 汇编器
│   ├── useCustomComponents.js   # 自定义组件管理
│   └── useScreenManager.js      # 屏幕管理
├── constants/                   # 常量定义
│   ├── componentTypes.js        # 元器件类型与分类定义
│   ├── componentDetails.js      # 元器件详情（真值表/公式/示例）
│   ├── assemblyInstructions.js  # 汇编指令集定义
│   └── asmTemplates.js          # 汇编代码模板
├── utils/
│   └── textUtils.js             # 文本工具
├── App.vue                      # 根组件
├── main.js                      # 入口文件
└── style.css                    # 全局样式
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+C` | 复制选中组件 |
| `Ctrl+V` | 粘贴组件 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |
| `Delete` | 删除选中 |
| `Space` | 开始/暂停仿真 |
| `R` | 旋转组件 |
| `H` | 水平翻转 |
| `V` | 垂直翻转 |
| `S` | 单步执行 |
| `P` | 探针模式 |
| `Escape` | 取消当前操作 |
| 鼠标滚轮 | 缩放画布 |
| 中键/右键拖动 | 平移画布 |
| 双击元器件 | 打开配置（时钟/CPU/存储器等） |
| 右键元器件 | 上下文菜单（旋转/翻转/复制/删除） |

## 核心能力

### 仿真引擎
基于拓扑排序的信号传播算法，从输入源出发按依赖顺序计算每个元器件的输出，循环迭代直至电路稳定。支持边沿触发（DFF/JKFF/TFF/SRFF）与电平触发（DLATCH）两类时序元件，时钟驱动可配置频率、占空比与相位。

### 布线系统
支持直角布线与任意中间节点，连线根据信号类型自动着色（时钟线/控制线/总线/数据线），高电平流动动画直观展示信号流向。分支节点（TJUNCTION）允许同一输出驱动多个输入，连线过程中实时检测短路冲突。

### CPU 与编程
内置 8 位 CPU 支持完整指令集（算术/逻辑/跳转/访存/I/O），可编写汇编代码并通过汇编器烧录到 ROM。调试器支持断点设置、单步执行、寄存器与内存监视，可用于教学演示从逻辑门到处理器的完整构建过程。

### 元器件扩展
通过自定义组件功能，可将任意子电路封装为可复用的黑盒元件，自动生成引脚并出现在元器件库的"自定义"分类中，支持导出为 JSON 与他人分享。

## 示例电路

### 半加器（Half Adder）
计算两个 1 位二进制数的和与进位。

```
A ──┬──→ XOR ──→ S  （和）
    │
    └──→ AND ──→ C  （进位）
B ──┘
```

**所需元器件**：XOR × 1、AND × 1、SWITCH × 2、LED × 2

### 全加器（Full Adder）
计算三个 1 位二进制数（含进位输入）的和与进位。

```
         ┌──→ XOR ──┐
A ──┬────┘          ├──→ XOR ──→ S  （和）
    │               │
B ──┼──→ XOR ───────┘
    │
    └──→ AND ──┐
              ├──→ OR ──→ Cout （进位）
Cin ──→ AND ──┘
```

**所需元器件**：XOR × 2、AND × 2、OR × 1、SWITCH × 3、LED × 2

### SR 锁存器
最基础的 1 位存储元件，使用两个 NOR 门交叉连接。

```
S ──→ NOR ──→ Q
       ↑│
       └┘  （交叉反馈）
       ┌│
       ↓└
R ──→ NOR ──→ Q̄
```

**所需元器件**：NOR × 2、SWITCH × 2、LED × 2

### 4 位计数器
使用 COUNTER4 元器件，时钟驱动递增计数，4 个 LED 显示计数值。

**所需元器件**：CLOCK × 1、COUNTER4 × 1、LED × 4

## CPU 指令集

内置 8 位 CPU 支持 32 条指令，16 位指令编码。

### 基础指令（opcode 0x0–0xF）

| 指令 | 格式 | 说明 |
|------|------|------|
| `LOAD` | `LOAD Ra, [addr]` | 从内存加载到寄存器 |
| `STORE` | `STORE Ra, [addr]` | 寄存器值存入内存 |
| `ADD` | `ADD Ra, Rb` | Ra = Ra + Rb |
| `SUB` | `SUB Ra, Rb` | Ra = Ra - Rb |
| `AND` | `AND Ra, Rb` | Ra = Ra AND Rb |
| `OR` | `OR Ra, Rb` | Ra = Ra OR Rb |
| `NOT` | `NOT Ra` | Ra = NOT Ra |
| `JMP` | `JMP addr` | 无条件跳转 |
| `JZ` | `JZ Ra, addr` | Ra=0 时跳转 |
| `JNZ` | `JNZ Ra, addr` | Ra≠0 时跳转 |
| `MOV` | `MOV Ra, Rb` | Ra = Rb |
| `LDI` | `LDI Ra, imm` | 加载 4 位立即数 |
| `SHL` | `SHL Ra` | 左移 |
| `SHR` | `SHR Ra` | 右移 |
| `CMP` | `CMP Ra, Rb` | 比较（影响标志位） |
| `HALT` | `HALT` | 停机 |

### 扩展指令（opcode 0x10–0x1F）

| 指令 | 格式 | 说明 |
|------|------|------|
| `CALL` | `CALL addr` | 函数调用 |
| `RET` | `RET` | 函数返回 |
| `PUSH` | `PUSH Ra` | 压栈 |
| `POP` | `POP Ra` | 出栈 |
| `INC` | `INC Ra` | 自增 |
| `DEC` | `DEC Ra` | 自减 |
| `ADDI` | `ADDI Ra, imm` | 加立即数 |
| `SUBI` | `SUBI Ra, imm` | 减立即数 |
| `JC` | `JC addr` | 进位跳转 |
| `JNC` | `JNC addr` | 无进位跳转 |
| `LDI8` | `LDI8 Ra, imm8` | 加载 8 位立即数 |
| `CMPI` | `CMPI Ra, imm8` | 与立即数比较 |
| `EI` | `EI` | 开中断 |
| `DI` | `DI` | 关中断 |
| `INT` | `INT imm` | 软中断 |
| `IRET` | `IRET` | 中断返回 |

### 汇编示例：1 到 10 求和

```asm
LDI R0, 0       ; 累加器清零
LDI R1, 1       ; 计数器 = 1
LDI R2, 10      ; 上限 = 10

loop:
ADD R0, R1      ; 累加
INC R1          ; 计数器 +1
CMP R1, R2      ; 比较
JNZ loop        ; 未到 10 继续
STORE R0, [0x10]; 结果存入内存
HALT            ; 停机
```

## 快速上手

1. **启动** — `npm run dev` 打开浏览器访问显示的地址
2. **放置元器件** — 从左侧元器件库拖拽元器件到画布
3. **连线** — 点击元器件端口开始连线，单击空白添加拐点，点击另一端口完成
4. **配置** — 双击 CLOCK 可设置频率，双击 CPU 可打开调试器
5. **仿真** — 点击工具栏 ▶ 开始仿真，观察 LED/数码管等输出
6. **保存** — 点击 💾 导出电路 JSON 文件，📂 可导入已保存的电路

## 部署到 GitHub Pages

项目已配置 GitHub Actions 自动部署，推送 `main` 分支即自动构建发布。

### 自动部署（已配置）

1. 推送代码到 `main` 分支
2. GitHub Actions 自动触发构建（见 `.github/workflows/deploy.yml`）
3. 进入仓库 **Settings → Pages → Source**，选择 **GitHub Actions**
4. 等待 Action 完成后访问 `https://<用户名>.github.io/<仓库名>/`

### 手动部署（备用）

```bash
npm run build                          # 构建到 dist/
npx gh-pages -d dist                    # 推送 dist/ 到 gh-pages 分支
```

> **注意**：`vite.config.js` 中 `base` 需设置为 `'/<仓库名>/'`，否则资源路径会 404。

## License

MIT
