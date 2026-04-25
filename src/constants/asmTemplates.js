// 预置汇编程序模板

export const ASM_TEMPLATES = [
  {
    id: 'led_blink',
    name: 'LED闪烁',
    description: '在I/O端口0上交替输出0和1',
    source: `; LED闪烁程序
; 通过I/O端口0控制LED闪烁
; R0用作延时计数器, R1用作LED状态

START:
    LDI R0, 0x5    ; 加载延时值
    LDI R1, 0x1    ; R1 = 1 (LED开)
    OUT R1, 0x0    ; 输出到端口0 (LED亮)

DELAY1:
    LDI R3, 0x1    ; R3 = 1 (减量)
    SUB R0, R0, R3 ; R0减1
    JNZ R0, DELAY1 ; 延时循环

    LDI R1, 0x0    ; R1 = 0 (LED关)
    OUT R1, 0x0    ; 输出到端口0 (LED灭)

    LDI R0, 0x5    ; 重置延时值
DELAY2:
    LDI R3, 0x1    ; R3 = 1 (减量)
    SUB R0, R0, R3 ; R0减1
    JNZ R0, DELAY2

    JMP START      ; 无限循环
`
  },
  {
    id: 'counter',
    name: '计数器',
    description: '递增计数器并显示',
    source: `; 计数器程序
; R0从0开始递增，结果输出到I/O端口

    LDI R0, 0x0    ; R0 = 0 (计数器初始值)
    LDI R1, 0x1    ; R1 = 1 (增量)
    LDI R2, 0xA    ; R2 = 10 (计数上限)

LOOP:
    OUT R0, 0x0    ; 输出当前值到端口0
    ADD R0, R0, R1 ; R0 = R0 + 1
    CMP R0, R2     ; 比较R0和上限
    JZ R0, RESET   ; 如果R0==10，重置
    JMP LOOP       ; 继续循环

RESET:
    LDI R0, 0x0    ; 重置计数器
    JMP LOOP
`
  },
  {
    id: 'memory_copy',
    name: '内存拷贝',
    description: '将ROM[0x00-0x0F]的值复制到RAM',
    source: `; 内存拷贝程序
; 将ROM中0x00-0x0F的数据读出并输出

    LDI R0, 0x0    ; R0 = 地址指针
    LDI R2, 0x10   ; R2 = 拷贝数量 (16字节)
    LDI R3, 0x1    ; R3 = 1 (地址增量)

COPY_LOOP:
    LOAD R1, [R0]  ; 从ROM地址读取
    OUT R1, 0x0    ; 输出数据
    ADD R0, R0, R3 ; 地址+1
    SUB R2, R2, R3 ; 计数-1
    JNZ R2, COPY_LOOP ; 如果还有数据，继续

    HALT           ; 完成
`
  },
  {
    id: 'calculator',
    name: '简单计算器',
    description: '计算两数之和并输出结果',
    source: `; 简单计算器
; 设置两个操作数，相加后输出结果

    LDI R0, 0x3    ; 第一个操作数 = 3
    LDI R1, 0x5    ; 第二个操作数 = 5
    ADD R2, R0, R1 ; R2 = R0 + R1 = 8
    OUT R2, 0x0    ; 输出结果到端口0

    HALT           ; 完成
`
  },
  {
    id: 'fibonacci',
    name: '斐波那契数列',
    description: '生成斐波那契数列并输出',
    source: `; 斐波那契数列生成器
; R0 = F(n-2), R1 = F(n-1), R2 = F(n)

    LDI R0, 0x0    ; F(0) = 0
    LDI R1, 0x1    ; F(1) = 1
    LDI R3, 0xA    ; 生成10个数
    LDI R4, 0x1    ; R4 = 1 (减量)

FIB_LOOP:
    OUT R1, 0x0    ; 输出当前斐波那契数
    ADD R2, R0, R1 ; F(n) = F(n-2) + F(n-1)
    MOV R0, R1     ; F(n-2) = F(n-1)
    MOV R1, R2     ; F(n-1) = F(n)
    SUB R3, R3, R4 ; 计数-1
    JNZ R3, FIB_LOOP ; 继续循环

    HALT
`
  },
  {
    id: 'ext_ram_rw',
    name: 'EXT_RAM读写',
    description: '通过I/O端口读写外部RAM',
    source: `; EXT_RAM读写程序
; 端口0x80: 地址寄存器
; 端口0x81: 数据寄存器
; 端口0x82: 控制寄存器

    ; 写数据到RAM地址0
    LDI R0, 0x0    ; 地址 = 0
    STORE R0, [0x80]  ; 写地址寄存器
    LDI R0, 0xAB   ; 数据 = 0xAB
    STORE R0, [0x81]  ; 写数据到RAM[0]

    ; 写数据到RAM地址1
    LDI R0, 0x1    ; 地址 = 1
    STORE R0, [0x80]
    LDI R0, 0xCD   ; 数据 = 0xCD
    STORE R0, [0x81]

    ; 从RAM读回验证
    LDI R0, 0x0    ; 地址 = 0
    STORE R0, [0x80]
    LOAD R1, [0x81]  ; R1 = RAM[0] (应为0xAB)

    LOAD R2, [0x81]  ; R2 = RAM[1] (应为0xCD)

    HALT
`
  },
  {
    id: 'timer_irq',
    name: '定时器中断',
    description: '配置定时器并等待中断',
    source: `; 定时器中断程序
; 端口0x20: 状态寄存器
; 端口0x21: 预加载值
; 端口0x22: 控制命令

    ; 配置定时器
    LDI R0, 0x5    ; preload = 5
    STORE R0, [0x21]  ; 设置预加载值
    LDI R0, 0x1    ; 启动命令
    STORE R0, [0x22]  ; 启动定时器

WAIT_IRQ:
    LOAD R0, [0x20]  ; 读状态寄存器
    JZ R0, WAIT_IRQ  ; 如果中断标志=0，继续等待

    ; 中断到达！
    ; 清除中断标志
    LDI R0, 0x4    ; 清除命令
    STORE R0, [0x22]

    HALT
`
  },
  {
    id: 'io_port_demo',
    name: 'I/O端口演示',
    description: '通过I/O端口控制外部设备',
    source: `; I/O端口控制演示
; 端口0x90: IO_PORT

LOOP:
    LDI R0, 0xFF   ; 全1
    STORE R0, [0x90]  ; 输出到IO_PORT

    ; 延时
    LDI R1, 0x5
DELAY1:
    LDI R2, 0x1
    SUB R1, R1, R2
    JNZ R1, DELAY1

    LDI R0, 0x00   ; 全0
    STORE R0, [0x90]  ; 关闭输出

    ; 延时
    LDI R1, 0x5
DELAY2:
    LDI R2, 0x1
    SUB R1, R1, R2
    JNZ R1, DELAY2

    JMP LOOP       ; 循环
`
  },
  {
    id: 'empty',
    name: '空白模板',
    description: '空的汇编程序模板',
    source: `; 在此编写你的汇编程序
;
; 可用指令:
;   LOAD/STORE - 内存读写
;   ADD/SUB/AND/OR/NOT - 算术逻辑运算
;   MOV - 寄存器传送
;   LDI - 加载立即数
;   JMP/JZ/JNZ - 跳转指令
;   SHL/SHR - 移位操作
;   CMP - 比较
;   HALT - 停机
;   IN/OUT - I/O操作

START:
    ; 在此编写代码

    HALT
`
  }
]

export function getTemplateById(id) {
  return ASM_TEMPLATES.find(t => t.id === id) || ASM_TEMPLATES[ASM_TEMPLATES.length - 1]
}

export function getTemplateList() {
  return ASM_TEMPLATES.map(t => ({ id: t.id, name: t.name, description: t.description }))
}
