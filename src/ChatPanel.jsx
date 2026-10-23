/* ============================================================
   AI导师智能体对话面板
   实训教练角色 - 围绕教学场景回答
   ============================================================ */

const TUTOR_MODELS = [
  { id: 'qwen', name: '通义千问', shortName: 'Qwen', color: '#818cf8', keyName: 'qwenApiKey', role: '结构原理导师' },
  { id: 'deepseek', name: 'DeepSeek', shortName: 'DeepSeek', color: '#60a5fa', keyName: 'deepseekApiKey', role: '故障排查专家' },
  { id: 'doubao', name: '豆包', shortName: 'Doubao', color: '#a78bfa', keyName: 'doubaoApiKey', role: '操作要领教练' },
  { id: 'kimi', name: 'Kimi', shortName: 'Kimi', color: '#22d3ee', keyName: 'kimiApiKey', role: '安全规范讲师' },
];

const TUTOR_QUICK_QUESTIONS = [
  '基本臂体结构组成？',
  '大臂操作要领是什么？',
  '常见故障如何排查？',
  '四要点是什么？',
  '光面爆破怎么操作？',
  '安全注意事项有哪些？',
];

// 实训知识知识库
const TRAINING_KNOWLEDGE = {
  '一心五点': {
    title: '一心五点 定位法',
    content: '控制隧道中心位置和五个开挖轮廓点（拱顶点、左拱肩、右拱肩、左边墙、右边墙），确保台车定位准确。定位时先对准中心线，再调整上下高度，保证五个轮廓点均匀分布。',
    category: '操作要领',
  },
  '一线两端': {
    title: '一线两端 平行法',
    content: '台车大臂与隧道中心线平行（一线），推进梁前后端点位置准确（两端）。保证钻孔方向与隧道轴线平行，是保证钻孔质量的关键。检查方法：从侧面观察推进梁是否与隧道腰线平行。',
    category: '操作要领',
  },
  '一高一低': {
    title: '一高一低 角度法',
    content: '推进梁尾部高度（一高）决定钻孔仰角，开孔处最低位置（一低）确保钻孔起始点准确。调整时先定开孔点位置，再调整尾部高度控制钻孔角度。周边眼开孔精度直接影响光面爆破效果。',
    category: '操作要领',
  },
  '一快一慢': {
    title: '一快一慢 调节法',
    content: '硬岩慢推进、高冲击；软岩快推进、低冲击。根据围岩情况灵活调整冲击与推进速度的匹配关系。硬岩（花岗岩、石英岩）：冲击功率29~31kW，推进力22~23kN；软岩（泥岩、页岩）：冲击功率22~25kW，推进力16~18kN。',
    category: '操作要领',
  },
  '大臂连接座': {
    title: '大臂连接座',
    content: '钻臂与主机的连接基础，承受钻臂作业时的全部反力与力矩。采用高强度铸钢件，是整个钻臂的"根基"。连接方式：胀销连接2处 + 螺栓连接8处。',
    category: '结构原理',
  },
  '基本臂体': {
    title: '基本臂体（大臂）',
    content: '钻臂主承载结构，采用高强度钢焊接箱型结构。可实现俯仰（+65°/-30°）、左右摆动（±45°）、伸缩三种运动。装配方式：胀销连接6处、螺栓连接2处、角度传感器2个（竖直角度+水平角度）、机械限位。',
    category: '结构原理',
  },
  '大臂伸缩油缸': {
    title: '大臂伸缩油缸',
    content: '驱动伸缩臂在基本臂体内伸缩的执行元件，最大伸缩量≥2.5m。采用双作用液压油缸，内置位移传感器实时反馈伸缩量，配合液压锁实现任意位置锁定。',
    category: '结构原理',
  },
  '推进梁': {
    title: '推进梁',
    content: '凿岩机的导轨与推进机构，总长≥7000mm，推进补偿1800mm，钻臂补偿1600mm。通过液压马达驱动链条带动凿岩机沿导轨运动。推进翻转角度±180°。',
    category: '结构原理',
  },
  '凿岩机': {
    title: '凿岩机',
    content: '钻孔作业核心部件，冲击功率27~31kW，冲击频率≥4300次/min（约70Hz），旋转扭矩≥650N·m。采用液压驱动，冲击机构与旋转机构独立控制，可根据岩性调整参数匹配。',
    category: '结构原理',
  },
  '卡钻': {
    title: '卡钻故障排查',
    content: '【现象】钻杆无法推进或回退，伴有异响。\n【原因】①岩石破碎带卡钻 ②钻杆弯曲 ③孔壁掉块\n【处理方法】\n1. 立即停止推进，保持旋转\n2. 缓慢正反转活动钻杆\n3. 配合冲击轻推轻拉\n4. 严禁强行拔杆\n5. 严重时可反向钻深2~3cm再尝试退出',
    category: '故障排查',
  },
  '断钎': {
    title: '断钎故障排查',
    content: '【现象】冲击声突变，钻进速度骤降。\n【原因】①钻杆疲劳裂纹 ②硬岩冲击过大 ③连接螺纹磨损\n【处理】\n1. 立即停机\n2. 用专用工具取出断杆\n3. 检查螺纹、更换新钻杆\n4. 硬岩段适当降低冲击频率',
    category: '故障排查',
  },
};

// 模拟导师回复
const TUTOR_RESPONSES = {
  qwen: `同学们好！我是结构原理导师通义千问。

关于你提出的问题，从**结构原理**角度来分析：

三臂凿岩台车的钻臂系统是一个典型的多自由度并联机构，每个钻臂有5个运动自由度：
1. 大臂俯仰（+65°/-30°）
2. 大臂摆动（±45°）
3. 钻臂伸缩（≥2.5m）
4. 推进梁俯仰
5. 推进梁翻转（±180°）

**关键知识点：基本臂装配方式**
- 胀销连接 6处：承受径向载荷，定位精度高
- 螺栓连接 2处：承受轴向载荷，便于拆装
- 角度传感器 2个：大臂竖直角度传感器 + 大臂水平角度传感器
- 机械限位：防止超程运动

定位精度可达孔位误差<±1.8cm，角度偏差>0.8°时自动触发PID闭环纠偏。

有什么结构方面的问题，欢迎随时提问！`,

  deepseek: `大家好，我是故障排查专家DeepSeek。

从**故障诊断**角度来分析这个问题：

【常见故障 TOP3】

**1. 卡钻（发生率约35%）**
症状：钻杆无法进退、异响
原因：破碎带、孔壁掉块、钻杆弯曲
处理：停推保转→正反转活动→配合冲击轻拉→严禁硬拔

**2. 冲击无力（发生率约25%）**
症状：钻进速度明显下降
原因：①液压油不足 ②冲击活塞磨损 ③蓄能器氮气压力不足
检查：先查油位→再查油压→最后拆检冲击机构

**3. 回转无力（发生率约20%）**
症状：钻杆不转或转速慢
原因：①回转马达磨损 ②减速箱齿轮损坏 ③回转压力不足
排查：测回转压力→听减速箱声音→拆检马达

【口诀】先看表、再听声、按序排查不返工。
有具体故障现象可以告诉我，我来帮你分析！`,

  doubao: `同学们好呀～我是操作要领教练豆包！

关于**操作要领**，我来给你详细讲解：

🎯 **实训操作四要点（必背！）**

**① 一心五点** — 定位法
对准隧道中心，控制拱顶、左右拱肩、左右边墙五个轮廓点。

**② 一线两端** — 平行法
大臂与隧道中心线平行（一线），推进梁前后端位置准确（两端）。

**③ 一高一低** — 角度法
推进梁尾部高度（一高）决定仰角，开孔处位置（一低）决定起点。

**④ 一快一慢** — 调节法
硬岩慢推高冲击，软岩快推低冲击，灵活匹配是关键。

👆 **操作小技巧**
- 开孔阶段：低冲击、慢推进，稳为主
- 正常钻进：全功率、稳推进，效率优先
- 到孔底前：提前降速，防止超钻
- 退杆：保持旋转，速度是钻进的1.5~2倍

操作一定要胆大心细，安全第一！有操作上的问题尽管问我～`,

  kimi: `同学们好，我是安全规范讲师Kimi。

从**安全规范**角度，我们必须牢记：

⚠️ **三臂凿岩台车作业安全守则**

**【作业前】三检查**
1. 检查液压系统：油位、油温、有无渗漏
2. 检查钻具：钻杆磨损、钻头磨损、螺纹状态
3. 检查安全装置：急停按钮、限位开关、防护装置

**【作业中】五不准**
1. 不准在钻臂下方站人
2. 不准在钻孔时正对孔口观察
3. 不准带压拆卸液压管路
4. 不准超范围作业（超角度、超行程）
5. 不准在故障未排除时强行作业

**【作业后】三确认**
1. 确认钻臂收拢到安全位置
2. 确认各系统压力已卸荷
3. 确认电源、水源关闭

**【紧急情况处置】**
遇卡钻、断钎、管路爆裂等紧急情况：
① 立即按下急停 → ② 撤离危险区域 → ③ 报告班组长

安全永远是第一位的，每一次操作都要遵守规范！`,
};

function ChatPanel({
  onSendQuestion,
  currentTab,
  setCurrentTab,
  apiKeys,
  setApiKeys,
  selectedPart,
  trainingMode,
}) {
  const [messages, setMessages] = React.useState([]);
  const [inputText, setInputText] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const messagesEndRef = React.useRef(null);

  const isConfigured = (modelId) => {
    const keyName = TUTOR_MODELS.find(m => m.id === modelId)?.keyName;
    return !!(keyName && apiKeys[keyName]);
  };

  const activeModels = React.useMemo(() => {
    if (currentTab === 'multi') return TUTOR_MODELS;
    return TUTOR_MODELS.filter(m => m.id === currentTab);
  }, [currentTab]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-explain when a part is selected in scene
  React.useEffect(() => {
    if (selectedPart && selectedPart.metadata) {
      // Only auto-explain if no recent message about this part
      const partId = selectedPart.partId;
      const lastMsg = messages[messages.length - 1];
      if (lastMsg?.partId !== partId) {
        explainPart(selectedPart);
      }
    }
  }, [selectedPart?.partId]);

  const explainPart = (part) => {
    const knowledge = TRAINING_KNOWLEDGE[part.partId] || TRAINING_KNOWLEDGE[part.metadata.name];
    const response = knowledge
      ? `好的，我来给你讲解**${part.metadata.name}**：\n\n${knowledge.content}\n\n**连接方式**：${part.metadata.connection}\n**传感器**：${part.metadata.sensors}`
      : `你点击了**${part.metadata.name}**。\n\n${part.metadata.function}\n\n连接方式：${part.metadata.connection}\n传感器：${part.metadata.sensors}`;

    const msg = {
      id: Date.now() + Math.random(),
      role: 'assistant',
      model: currentTab === 'multi' ? 'qwen' : currentTab,
      content: response,
      isTutor: true,
      partId: part.partId,
    };
    setMessages(prev => [...prev, msg]);
  };

  const handleSend = async () => {
    const question = inputText.trim();
    if (!question || isLoading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: question,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    if (currentTab === 'multi') {
      for (const model of TUTOR_MODELS) {
        await simulateTutorResponse(model.id, question);
      }
    } else {
      await simulateTutorResponse(currentTab, question);
    }

    setIsLoading(false);
    if (onSendQuestion) onSendQuestion(question);
  };

  const simulateTutorResponse = async (modelId, question) => {
    let baseResponse = TUTOR_RESPONSES[modelId] || '暂无相关教学内容。';

    // Check for keyword matches in knowledge base
    let knowledgeInsert = '';
    Object.keys(TRAINING_KNOWLEDGE).forEach(key => {
      if (question.includes(key)) {
        const k = TRAINING_KNOWLEDGE[key];
        knowledgeInsert += `\n\n📚 **${k.title}**\n${k.content}`;
      }
    });

    const fullResponse = baseResponse + knowledgeInsert;
    const msgId = Date.now() + Math.random();

    setMessages(prev => [...prev, {
      id: msgId,
      role: 'assistant',
      model: modelId,
      content: '',
      isTutor: true,
    }]);

    // Simulate streaming
    let displayed = '';
    const chars = fullResponse.split('');
    for (let i = 0; i < chars.length; i++) {
      displayed += chars[i];
      if (i % 3 === 0) {
        await new Promise(r => setTimeout(r, 8));
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: displayed } : m));
      }
    }
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: fullResponse } : m));
  };

  const handleQuickQuestion = (q) => {
    setInputText(q);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const configuredCount = TUTOR_MODELS.filter(m => isConfigured(m.id)).length;
  const currentModel = TUTOR_MODELS.find(m => m.id === currentTab);

  return (
    <div className="chat-panel">
      <div className="panel-header">
        <div className="panel-title">
          <div className="panel-title-icon"></div>
          AI 实训导师
        </div>
        <button
          className="chat-settings-btn"
          onClick={() => setShowSettings(true)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          设置
        </button>
      </div>

      {/* Model tabs */}
      <div className="chat-tabs">
        {TUTOR_MODELS.map(model => (
          <div
            key={model.id}
            className={`chat-tab ${currentTab === model.id ? 'active' : ''}`}
            onClick={() => setCurrentTab(model.id)}
            title={`${model.name} - ${model.role}`}
          >
            {model.shortName}
            <span className={`status-dot ${isConfigured(model.id) ? 'configured' : 'unconfigured'}`}></span>
          </div>
        ))}
        <div
          className={`chat-tab ${currentTab === 'multi' ? 'multi' : ''}`}
          onClick={() => setCurrentTab('multi')}
          style={{ flex: '0 0 40px' }}
          title="四导师联合授课"
        >
          联授
        </div>
      </div>

      {/* Current tutor role */}
      {currentTab !== 'multi' && currentModel && (
        <div style={{
          padding: '6px 12px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(139, 92, 246, 0.1))',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '14px' }}>👨‍🏫</span>
          <span style={{ color: 'var(--accent-amber)', fontWeight: '600' }}>{currentModel.name}</span>
          · {currentModel.role}
        </div>
      )}
      {currentTab === 'multi' && (
        <div style={{
          padding: '6px 12px',
          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(59, 130, 246, 0.1))',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{ fontSize: '14px' }}>🎓</span>
          四位导师联合授课 · 结构/操作/故障/安全全方位讲解
        </div>
      )}

      {/* Unconfigured hint */}
      {currentTab !== 'multi' && !isConfigured(currentTab) && (
        <div className="unconfigured-hint" style={{ margin: '8px 10px 0' }}>
          演示模式 · 配置 API Key 后可真实调用
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 10px', fontSize: '11px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px', opacity: '0.3' }}>👨‍🏫</div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>欢迎来到仿真实训课堂</div>
            <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
              点击3D场景中的任意部件<br />
              AI导师会自动讲解对应知识
            </div>
          </div>
        )}

        {messages.map(msg => (
          msg.role === 'user' ? (
            <div key={msg.id} className="chat-msg user">
              <div className="chat-msg-bubble">{msg.content}</div>
            </div>
          ) : (
            <div key={msg.id} className={`chat-msg assistant model-${msg.model}`}>
              <div className="chat-msg-header">
                <span className={`msg-model-tag ${msg.isTutor ? 'tutor-badge' : ''}`}>
                  {TUTOR_MODELS.find(m => m.id === msg.model)?.shortName || 'AI'}
                  {msg.isTutor && ' · 导师'}
                </span>
                {!isConfigured(msg.model) && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>演示</span>
                )}
              </div>
              <div className="chat-msg-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content || <span className="pulse">讲解中...</span>}
              </div>
            </div>
          )
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-quick-q">
          {TUTOR_QUICK_QUESTIONS.slice(0, 4).map((q, i) => (
            <button key={i} className="quick-q-btn" onClick={() => handleQuickQuestion(q)}>
              {q}
            </button>
          ))}
        </div>
        <div className="chat-input-row" style={{ marginTop: '8px' }}>
          <textarea
            className="chat-input"
            placeholder="向AI导师提问..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            rows={2}
            disabled={isLoading}
          />
          <button
            className="chat-send-btn"
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
          >
            提问
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          apiKeys={apiKeys}
          setApiKeys={setApiKeys}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function SettingsModal({ apiKeys, setApiKeys, onClose }) {
  const [localKeys, setLocalKeys] = React.useState({ ...apiKeys });

  const handleSave = () => {
    setApiKeys(localKeys);
    try {
      localStorage.setItem('drillRig_apiKeys', JSON.stringify(localKeys));
    } catch (e) {}
    onClose();
  };

  const handleChange = (keyName, value) => {
    setLocalKeys(prev => ({ ...prev, [keyName]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">API Key 配置</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{
            padding: '10px 12px',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid var(--accent-purple)',
            borderRadius: '6px',
            marginBottom: '14px',
            fontSize: '11px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
          }}>
            <div style={{ fontWeight: '600', color: 'var(--accent-purple)', marginBottom: '4px' }}>
              👨‍🏫 四位AI导师分工
            </div>
            {TUTOR_MODELS.map(m => (
              <div key={m.id} style={{ fontSize: '10px', marginTop: '2px' }}>
                · <span style={{ color: m.color, fontWeight: '600' }}>{m.name}</span>：{m.role}
              </div>
            ))}
          </div>

          {TUTOR_MODELS.map(model => (
            <div key={model.id} className="api-key-item">
              <div className="api-key-label">
                <span className={`api-key-badge model-${model.id}-color`}></span>
                {model.name} API Key
                <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {model.role}
                </span>
              </div>
              <input
                type="password"
                className="api-key-input"
                placeholder={`输入 ${model.name} 的 API Key`}
                value={localKeys[model.keyName] || ''}
                onChange={e => handleChange(model.keyName, e.target.value)}
              />
              <div className="api-hint">
                仅保存在本地浏览器，配置后可真实调用模型API
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="sim-btn" onClick={onClose} style={{ flex: 1 }}>取消</button>
            <button className="sim-btn primary" onClick={handleSave} style={{ flex: 1 }}>保存配置</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  ChatPanel,
  TUTOR_MODELS,
  TUTOR_RESPONSES,
  TRAINING_KNOWLEDGE,
  TUTOR_QUICK_QUESTIONS,
});
