# 数字电路仿真游戏 - 设计文档

## 项目概述
一个类似《Turing Complete》和《Logisim》的网页版数字电路设计与仿真游戏，支持图灵完备的电路构建。

## 技术栈
- 纯前端实现（HTML5 + CSS3 + JavaScript）
- Canvas 2D 渲染
- 无需后端服务器

## 核心功能

### 1. 电路组件库
#### 基础逻辑门
- AND 与门
- OR 或门
- NOT 非门
- NAND 与非门
- NOR 或非门
- XOR 异或门
- XNOR 同或门

#### 输入/输出组件
- 开关（Toggle Switch）- 手动切换 0/1
- 按钮（Button）- 瞬时输入
- LED灯 - 显示输出状态
- 七段数码管 - 显示数字
- 时钟信号 - 周期性脉冲

#### 存储组件
- D触发器
- JK触发器
- 寄存器
- RAM（随机存取存储器）

#### 高级组件
- 多路选择器（MUX）
- 多路分配器（DEMUX）
- 加法器
- 比较器
- 解码器
- 编码器

### 2. 画布系统
- 无限滚动画布
- 网格对齐
- 缩放功能
- 平移功能
- 多选/框选
- 复制/粘贴
- 删除
- 撤销/重做

### 3. 连线系统
- 自动连接节点
- 直角布线
- 拖拽调整连线
- 连线高亮显示信号状态
- 避免交叉（可选）

### 4. 仿真引擎
- 实时仿真
- 步进仿真
- 暂停/继续
- 时钟频率调节
- 信号传播延迟模拟

### 5. 关卡系统
#### 教程关卡
1. 基础逻辑门入门
2. 组合逻辑电路
3. 时序逻辑入门
4. 构建简单CPU

#### 挑战关卡
- 半加器
- 全加器
- 多位加法器
- ALU（算术逻辑单元）
- 简单处理器
- 图灵机实现

### 6. UI界面
#### 左侧面板 - 组件库
- 分类显示所有可用组件
- 拖拽到画布放置
- 搜索功能

#### 顶部工具栏
- 新建/打开/保存
- 撤销/重做
- 仿真控制（播放/暂停/步进/重置）
- 缩放控制
- 视图模式（正常/仅连线/仅组件）

#### 右侧面板
- 属性面板 - 选中组件的属性
- 信号监视器 - 显示选中节点的信号历史
- 关卡目标 - 当前关卡要求

#### 底部状态栏
- 仿真状态
- 帧率
- 组件数量
- 连线数量

## 文件结构

```
circuit-simulator/
├── index.html          # 主入口
├── css/
│   ├── main.css        # 主样式
│   ├── components.css  # 组件样式
│   └── ui.css          # UI样式
├── js/
│   ├── main.js         # 入口逻辑
│   ├── core/
│   │   ├── Circuit.js  # 电路核心
│   │   ├── Component.js # 组件基类
│   │   ├── Wire.js     # 连线类
│   │   └── Simulation.js # 仿真引擎
│   ├── components/
│   │   ├── Gates.js    # 逻辑门
│   │   ├── IO.js       # 输入输出
│   │   └── Memory.js   # 存储组件
│   ├── ui/
│   │   ├── Canvas.js   # 画布管理
│   │   ├── Toolbar.js  # 工具栏
│   │   └── Panels.js   # 面板管理
│   ├── levels/
│   │   └── Levels.js   # 关卡数据
│   └── utils/
│       ├── History.js  # 撤销/重做
│       └── Storage.js  # 本地存储
└── assets/
    └── icons/          # 图标资源
```

## 数据结构

### 组件 (Component)
```javascript
{
  id: string,
  type: string, // 'AND', 'OR', 'NOT', ...
  x: number,
  y: number,
  width: number,
  height: number,
  inputs: [
    { id: string, connectedTo: string|wireId, value: 0|1 }
  ],
  outputs: [
    { id: string, connectedTo: string|wireId, value: 0|1 }
  ],
  properties: {
    // 组件特定属性
  }
}
```

### 连线 (Wire)
```javascript
{
  id: string,
  from: { componentId: string, portId: string },
  to: { componentId: string, portId: string },
  points: [ {x, y} ], // 中间拐点
  value: 0|1
}
```

### 电路 (Circuit)
```javascript
{
  components: [ Component ],
  wires: [ Wire ],
  viewport: { x, y, zoom }
}
```

## 核心算法

### 信号传播算法
1. 从输入组件开始
2. 按拓扑顺序计算每个组件
3. 更新输出值
4. 传播到相连组件
5. 重复直到稳定

### 布线算法
- A* 寻路算法用于自动布线
- 网格对齐
- 避免重叠

## 快捷键
- `Ctrl+Z` - 撤销
- `Ctrl+Y` - 重做
- `Ctrl+C` - 复制
- `Ctrl+V` - 粘贴
- `Delete` - 删除
- `Space` - 暂停/继续
- `R` - 重置
- `+/-` - 缩放
- 中键拖动 - 平移画布

## 实现计划
1. 基础框架和画布系统
2. 核心组件（逻辑门、输入输出）
3. 连线系统
4. 仿真引擎
5. UI界面
6. 关卡系统
7. 高级组件（存储、ALU等）
8. 优化和测试
