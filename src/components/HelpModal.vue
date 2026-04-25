<template>
  <div class="modal-overlay" :class="{ show }" @click.self="$emit('close')">
    <div class="modal help-modal">
      <div class="modal-header">
        <span>📖 元器件说明书</span>
        <button class="close-btn" @click="$emit('close')" title="关闭 (Esc)">✕</button>
      </div>
      <div class="help-layout">
        <nav class="help-nav">
          <a v-for="sec in sections" :key="sec.id" :href="'#' + sec.id" 
             class="nav-item" :class="{ active: activeSection === sec.id }"
             @click.prevent="scrollToSection(sec.id)">
            {{ sec.icon }} {{ sec.label }}
          </a>
        </nav>
        <div class="modal-body help-body" ref="helpBodyRef">
          <div class="help-section" id="sec-logic">
            <div class="section-title">🔌 逻辑门</div>
          
          <div class="component-card">
            <div class="component-name">AND (与门)</div>
            <div class="component-desc">所有输入都为1时输出1，否则输出0</div>
            <div class="component-formula">Y = A · B</div>
            <div class="component-truth">
              <div class="truth-title">真值表:</div>
              <div class="truth-row">0 + 0 → 0</div>
              <div class="truth-row">0 + 1 → 0</div>
              <div class="truth-row">1 + 0 → 0</div>
              <div class="truth-row">1 + 1 → 1</div>
            </div>
          </div>
          
          <div class="component-card">
            <div class="component-name">AND3 (三输入与门)</div>
            <div class="component-desc">三个输入都为1时输出1</div>
            <div class="component-formula">Y = A · B · C</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">OR (或门)</div>
            <div class="component-desc">任意一个输入为1时输出1</div>
            <div class="component-formula">Y = A + B</div>
            <div class="component-truth">
              <div class="truth-title">真值表:</div>
              <div class="truth-row">0 + 0 → 0</div>
              <div class="truth-row">0 + 1 → 1</div>
              <div class="truth-row">1 + 0 → 1</div>
              <div class="truth-row">1 + 1 → 1</div>
            </div>
          </div>
          
          <div class="component-card">
            <div class="component-name">OR3 (三输入或门)</div>
            <div class="component-desc">任意一个输入为1时输出1</div>
            <div class="component-formula">Y = A + B + C</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">NOT (非门)</div>
            <div class="component-desc">输入取反</div>
            <div class="component-formula">Y = ¬A</div>
            <div class="component-truth">
              <div class="truth-title">真值表:</div>
              <div class="truth-row">0 → 1</div>
              <div class="truth-row">1 → 0</div>
            </div>
          </div>
          
          <div class="component-card">
            <div class="component-name">BUFFER (缓冲器)</div>
            <div class="component-desc">输入等于输出</div>
            <div class="component-formula">Y = A</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">NAND (与非门)</div>
            <div class="component-desc">与门取反</div>
            <div class="component-formula">Y = ¬(A · B)</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">NOR (或非门)</div>
            <div class="component-desc">或门取反</div>
            <div class="component-formula">Y = ¬(A + B)</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">XOR (异或门)</div>
            <div class="component-desc">输入不同时输出1</div>
            <div class="component-formula">Y = A ⊕ B</div>
            <div class="component-truth">
              <div class="truth-title">真值表:</div>
              <div class="truth-row">0 + 0 → 0</div>
              <div class="truth-row">0 + 1 → 1</div>
              <div class="truth-row">1 + 0 → 1</div>
              <div class="truth-row">1 + 1 → 0</div>
            </div>
          </div>
          
          <div class="component-card">
            <div class="component-name">XNOR (同或门)</div>
            <div class="component-desc">输入相同时输出1</div>
            <div class="component-formula">Y = A ⊙ B</div>
          </div>
        </div>
        
          <div class="help-section" id="sec-io">
            <div class="section-title">🎮 输入输出</div>
          
          <div class="component-card">
            <div class="component-name">SWITCH (开关)</div>
            <div class="component-desc">可手动切换的输入源，0或1</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">CONST0 (常量0)</div>
            <div class="component-desc">始终输出0</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">CONST1 (常量1)</div>
            <div class="component-desc">始终输出1</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">LED (发光二极管)</div>
            <div class="component-desc">输入为1时点亮</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">CLOCK (时钟)</div>
            <div class="component-desc">仿真运行时自动在0和1之间切换</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">SEGDISPLAY8 (8位数码管)</div>
            <div class="component-desc">8位七段数码管，每位使用4位BCD码输入（0-15）显示0-F</div>
            <div class="component-truth">
              <div class="truth-row">• 每4个输入对应一位数字（D0-D3是第1位，D4-D7是第2位，依此类推）</div>
              <div class="truth-row">• 0-9显示对应数字，10-15显示A-F</div>
            </div>
          </div>
          
          <div class="component-card">
            <div class="component-name">LCD1602 (1602液晶屏)</div>
            <div class="component-desc">16x2字符液晶屏，支持显示ASCII字符</div>
            <div class="component-truth">
              <div class="truth-row">• RS: 0=指令模式，1=数据模式</div>
              <div class="truth-row">• E: 上升沿触发数据写入</div>
              <div class="truth-row">• D7-D0: 8位数据总线</div>
              <div class="truth-row">• 常用指令: 0x01=清屏，0x02=归位，0x80+地址=设置光标位置</div>
            </div>
          </div>
        </div>
        
          <div class="help-section" id="sec-comb">
            <div class="section-title">🔢 组合逻辑</div>
          
          <div class="component-card">
            <div class="component-name">HALFADDER (半加器)</div>
            <div class="component-desc">无进位输入的加法器，输出和与进位</div>
            <div class="component-formula">S = A ⊕ B</div>
            <div class="component-formula">C = A · B</div>
            <div class="component-truth">
              <div class="truth-title">真值表:</div>
              <div class="truth-row">A=0, B=0 → S=0, C=0</div>
              <div class="truth-row">A=0, B=1 → S=1, C=0</div>
              <div class="truth-row">A=1, B=0 → S=1, C=0</div>
              <div class="truth-row">A=1, B=1 → S=0, C=1</div>
            </div>
          </div>
          
          <div class="component-card">
            <div class="component-name">FULLADDER (全加器)</div>
            <div class="component-desc">有进位输入的加法器</div>
            <div class="component-formula">S = A ⊕ B ⊕ Cin</div>
            <div class="component-formula">Cout = (A·B) + (Cin·(A⊕B))</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">MUX2 (2选1多路器)</div>
            <div class="component-desc">选择信号S：S=0选A，S=1选B</div>
            <div class="component-formula">Y = (¬S·A) + (S·B)</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">MUX4 (4选1多路器)</div>
            <div class="component-desc">2位选择信号S0/S1，从4个输入中选择一个</div>
            <div class="component-formula">Y = (¬S1·¬S0·A) + (¬S1·S0·B) + (S1·¬S0·C) + (S1·S0·D)</div>
          </div>
          
          <div class="component-card">
            <div class="component-name">DEMUX2 (1对2解复用器)</div>
            <div class="component-desc">选择信号决定输入输出到哪个端口</div>
            <div class="component-formula">Y0 = ¬S·In</div>
            <div class="component-formula">Y1 = S·In</div>
          </div>
        </div>
        
          <div class="help-section" id="sec-seq">
            <div class="section-title">⏰ 时序电路</div>
          
          <div class="component-card">
            <div class="component-name">DFF (D触发器)</div>
            <div class="component-desc">上升沿触发的存储单元</div>
            <div class="component-formula">Q(t+1) = D (当CLK上升沿)</div>
            <div class="component-formula">Q' = ¬Q</div>
            <div class="component-truth">
              <div class="truth-row">D: 数据输入</div>
              <div class="truth-row">CLK: 时钟输入</div>
              <div class="truth-row">Q: 输出</div>
              <div class="truth-row">Q': 反向输出</div>
            </div>
          </div>
          
          <div class="component-card">
            <div class="component-name">DLATCH (D锁存器)</div>
            <div class="component-desc">高电平触发的存储单元</div>
            <div class="component-formula">Q(t+1) = D (当EN=1)</div>
            <div class="component-formula">Q(t+1) = Q(t) (当EN=0)</div>
          </div>
        </div>
        
          <div class="help-section" id="sec-other">
            <div class="section-title">📝 其他</div>
          
          <div class="component-card">
            <div class="component-name">TEXT (文本说明)</div>
            <div class="component-desc">用于在画布上显示说明文字</div>
            <div class="component-truth">
              <div class="truth-row">• 双击文本组件可以编辑文字</div>
              <div class="truth-row">• 按 Enter 保存，按 Esc 取消编辑</div>
              <div class="truth-row">• 文本框高度会根据内容自动调整</div>
            </div>
          </div>
        </div>
        
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
              • 双击文本组件可编辑文字
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
            <div class="component-formula">EQ=(A1=B1)AND(A0=B0); GT=(A1> B1)OR((A1=B1)AND(A0> B0))</div>
            <div class="component-truth">
              <div class="truth-row">EQ=1 → A1=B1, A0=B0 (4种可能)</div>
              <div class="truth-row">GT=1 → A> B (6种可能)</div>
              <div class="truth-row">LT=1 → A&lt; B (6种可能)</div>
            </div>
          </div>
        </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="$emit('close')">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const helpBodyRef = ref(null)
const activeSection = ref('sec-logic')

const sections = [
  { id: 'sec-logic', icon: '🔌', label: '逻辑门' },
  { id: 'sec-io', icon: '🎮', label: '输入输出' },
  { id: 'sec-comb', icon: '🔢', label: '组合逻辑' },
  { id: 'sec-seq', icon: '⏰', label: '时序电路' },
  { id: 'sec-other', icon: '📝', label: '其他' },
  { id: 'sec-ops', icon: '⌨️', label: '操作说明' },
  { id: 'sec-reverse', icon: '📐', label: '反推公式' }
]

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

function handleEsc(e) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

const emit = defineEmits(['close'])

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
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
  max-width: 900px;
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

.help-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.help-nav {
  width: 160px;
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

.component-name {
  font-weight: 600;
  color: #e0e0e0;
  margin-bottom: 4px;
  font-size: 13px;
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

.modal-footer {
  padding: 12px 18px;
  border-top: 1px solid #3c3c3c;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #2a2a2a;
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
</style>
