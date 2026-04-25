# DLOW-CircuitSimulator

基于 Vue 3 的数字电路模拟器，支持实时仿真、交互式布线和丰富的逻辑门元器件库。

## 功能特性

- **丰富的元器件库** — 基础逻辑门（AND/OR/NOT/NAND/NOR/XOR/XNOR）、触发器（D/JK/T/SR）、加法器、ALU、多路选择器、译码器、编码器、计数器、移位寄存器、RAM、ROM、CPU 等
- **实时仿真** — 支持连续仿真与单步执行，可调节时钟频率（1-60 Hz）
- **交互式布线** — 拖拽连线、分支节点、中间节点编辑
- **真值表分析** — 自动生成组合逻辑电路的真值表与简化逻辑表达式
- **表达式转电路** — 输入布尔表达式自动生成对应电路
- **错误检测** — 实时检测输入悬空、输出短路、反馈环路等常见电路错误
- **自定义组件** — 将选中电路打包为自定义组件，支持导入/导出
- **CPU 调试器** — 内置 8 位 CPU 调试面板，支持断点、单步、寄存器查看
- **指令编辑器** — 汇编代码编辑与 ROM 烧录
- **快捷键体系** — Ctrl+C/V 复制粘贴、Ctrl+Z/Y 撤销重做、Delete 删除、Space 暂停/继续、R 旋转等
- **暗色主题** — 全局统一的深色 UI 设计

## 技术栈

- **Vue 3** + Composition API
- **Vite** 构建工具
- **Canvas 2D** 电路渲染

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+C | 复制选中组件 |
| Ctrl+V | 粘贴组件 |
| Ctrl+Z | 撤销 |
| Ctrl+Y | 重做 |
| Delete | 删除选中 |
| Space | 开始/暂停仿真 |
| R | 旋转组件 |
| S | 单步执行 |
| P | 探针模式 |
| Escape | 取消当前操作 |

## 项目结构

```
src/
├── components/          # Vue 组件
│   ├── Canvas.vue       # 画布（电路渲染与交互）
│   ├── Toolbar.vue      # 工具栏
│   ├── ComponentLibrary.vue  # 元器件库
│   └── ...
├── composables/         # 组合式函数
│   ├── useCircuit.js    # 电路数据管理
│   ├── useSimulation.js # 仿真引擎
│   ├── useTruthTable.js # 真值表生成
│   ├── useErrorDetection.js # 错误检测
│   └── ...
├── constants/           # 常量定义
│   └── componentTypes.js # 元器件类型定义
├── style.css            # 全局样式
├── App.vue              # 根组件
└── main.js              # 入口文件
```

## License

MIT
