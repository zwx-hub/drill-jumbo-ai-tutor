// ===== bundle part 3/3 =====
   </span>
      </div>

      {/* Teaching bubble */}
      <div className="teaching-bubble" style={{
        top: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
      }}>
        <div className="teaching-bubble-header">
          <span style={{ fontSize: '16px' }}>👨‍🏫</span>
          AI 实训导师
        </div>
        <div style={{
          fontSize: '13px',
          fontWeight: '700',
          color: 'var(--accent-amber)',
          marginBottom: '6px',
        }}>
          {step.id}. {step.title}
        </div>
        <div className="teaching-bubble-content">
          {step.description}
        </div>
        <div className="knowledge-card" style={{ marginTop: '8px' }}>
          <div className="knowledge-card-title">💡 实训知识要点</div>
          <div className="knowledge-card-content">{step.knowledge}</div>
        </div>
        <div className="teaching-bubble-footer">
          <span className="teaching-step-indicator">
            进度 {currentStep + 1}/{TEACHING_STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {currentStep > 0 && (
              <button
                className="teaching-next-btn"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                onClick={handlePrevStep}
              >
                上一步
              </button>
            )}
            <button className="teaching-next-btn" onClick={handleNextStep}>
              {currentStep < TEACHING_STEPS.length - 1 ? '下一步' : '完成学习'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Radar chart for exam results
function ExamRadarChart({ results }) {
  const option = React.useMemo(() => {
    return {
      backgroundColor: 'transparent',
      tooltip: {
        backgroundColor: 'rgba(26, 29, 36, 0.95)',
        borderColor: '#363c4a',
        textStyle: { color: '#e8eaed', fontSize: 11 },
      },
      radar: {
        indicator: results.criteria.map(c => ({
          name: c.name,
          max: 100,
        })),
        center: ['50%', '55%'],
        radius: '65%',
        axisName: {
          color: '#9aa0a6',
          fontSize: 10,
        },
        splitLine: {
          lineStyle: { color: '#2a2f3a' },
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(42, 47, 58, 0.3)', 'rgba(42, 47, 58, 0.1)'],
          },
        },
        axisLine: {
          lineStyle: { color: '#363c4a' },
        },
      },
      series: [{
        type: 'radar',
        data: [{
          value: results.criteria.map(c => c.score),
          name: '考核成绩',
          areaStyle: {
            color: 'rgba(245, 158, 11, 0.2)',
          },
          lineStyle: {
            color: '#f59e0b',
            width: 2,
          },
          itemStyle: {
            color: '#f59e0b',
          },
        }],
      }],
    };
  }, [results]);

  return <EChart option={option} style={{ height: '240px' }} />;
}

Object.assign(window, { TrainingMode, TEACHING_STEPS, EXAM_CRITERIA, ExamRadarChart });


// ===== ExamModule.jsx =====
/* ============================================================
   中铁七局隧道工竞赛考核评分系统
   100分制 · 5大项目 · 完全对标真实职业技能竞赛标准
   ============================================================ */

// 完整评分细则 - 100分制
const EXAM_ITEMS = [
  {
    id: 'safety',
    name: '安全基本素养',
    score: 5,
    children: [
      { id: 's1', name: '正确穿着工服（非半袖）', score: 1, type: 'deduct' },
      { id: 's2', name: '安全帽正确佩戴固定牢固', score: 2, type: 'deduct' },
      { id: 's3', name: '防护手套穿戴合适', score: 1, type: 'deduct' },
      { id: 's4', name: '防护鞋穿戴符合要求', score: 1, type: 'deduct' },
    ],
  },
  {
    id: 'preparation',
    name: '设备基本操作及安全驾驶-作业准备',
    score: 24,
    children: [
      { id: 'p1', name: '行车前说明前后有无障碍物', score: 1, type: 'deduct' },
      { id: 'p2', name: '行车前检查各操作手柄、按钮、旋钮状态', score: 2, type: 'deduct' },
      { id: 'p3', name: '臂架收至行车状态，行驶中无碰撞', score: 1, type: 'deduct' },
      { id: 'p4', name: '按流程开机（9步流程，漏1项扣1分）', score: 5, type: 'process', steps: 9 },
      { id: 'p5', name: '正确使用工作灯', score: 1, type: 'deduct' },
      { id: 'p6', name: '开启电缆卷盘和水管卷盘', score: 1, type: 'deduct' },
      { id: 'p7', name: '顺利通过栈桥（计时评分）', score: 5, type: 'timed', timeLimit: 240, fullTime: 120, mediumTime: 180 },
      { id: 'p8', name: '台车定位：摆位2-2.5米距掌子面', score: 1, type: 'deduct' },
      { id: 'p9', name: '台车定位：开启支腿', score: 1, type: 'deduct' },
      { id: 'p10', name: '台车定位：关闭液压加载开关', score: 1, type: 'deduct' },
      { id: 'p11', name: '台车定位：保持空挡开启手刹', score: 1, type: 'deduct' },
      { id: 'p12', name: '台车定位：关闭行车灯', score: 1, type: 'deduct' },
      { id: 'p13', name: '掌子面排险：机械臂冲击回转清理碎石', score: 2, type: 'deduct' },
      { id: 'p14', name: '掌子面排险：确认拱顶已无危石', score: 1, type: 'deduct' },
    ],
  },
  {
    id: 'drilling',
    name: '凿岩操作能力鉴定-标准凿岩',
    score: 44,
    children: [
      { id: 'd1', name: '正确选择钻臂（周边孔1号臂、底板掏槽2号臂）', score: 5, type: 'deduct' },
      { id: 'd2', name: '凿岩流程正确（展臂→顶梁→水冲→润滑→低回转→低冲击→推进）', score: 3, type: 'deduct' },
      { id: 'd3', name: '压力调节正确（低冲击80-90bar、低推进40-50bar）', score: 3, type: 'deduct' },
      { id: 'd4', name: '钻进30-50cm后开高冲', score: 2, type: 'deduct' },
      { id: 'd5', name: '退杆流程正确（关冲击→退杆→退至尾部→复位→关汽水）', score: 2, type: 'deduct' },
      { id: 'd6', name: '钻孔技巧：周边孔平行边墙', score: 1, type: 'deduct' },
      { id: 'd7', name: '钻孔技巧：掏槽孔推进梁偏转>45°', score: 1, type: 'deduct' },
      { id: 'd8', name: '钻孔技巧：底板孔推进梁回转>90°', score: 2, type: 'deduct' },
      { id: 'd9', name: '钻孔准度（偏离1cm内满分）', score: 5, type: 'precision' },
      { id: 'd10', name: '钻孔效率（10分钟内满分）', score: 20, type: 'timed', timeLimit: 900, fullTime: 600, mediumTime: 720 },
    ],
  },
  {
    id: 'recovery',
    name: '收车',
    score: 12,
    children: [
      { id: 'r1', name: '臂架收回行车状态、无碰撞', score: 2, type: 'deduct' },
      { id: 'r2', name: '收车计时（2分钟内满分）', score: 10, type: 'timed', timeLimit: 300, fullTime: 120, mediumTime: 240 },
    ],
  },
  {
    id: 'qa',
    name: '问答',
    score: 15,
    children: [
      { id: 'q1', name: '推进梁日常保养知识问答', score: 15, type: 'qa' },
    ],
  },
];

// 开机9步流程
const STARTUP_STEPS = [
  '打开蓄电池开关',
  '挡位开关置于空挡0档',
  '按下复位按钮',
  '按喇叭示意',
  '启动发动机',
  '启动液压加载开关',
  '调大手动油门',
  '收支腿',
  '关闭液压加载',
];

// 7个保养知识点（问答题目）
const MAINTENANCE_QUESTIONS = [
  {
    keyword: '螺栓',
    question: '推进梁日常保养中，螺栓检查的要求是什么？',
    answer: '推进梁螺栓全部检查有无松动，确保所有连接螺栓紧固到位，特别是推进梁导轨固定螺栓和T型梁连接螺栓。',
    scorePoints: '推进梁螺栓全部检查有无松动',
  },
  {
    keyword: '润滑脂-钢丝绳',
    question: '钢丝绳滑轮的润滑保养如何操作？',
    answer: '在钢丝绳滑轮两侧加注新润滑脂，确保滑轮转动灵活，钢丝绳得到充分润滑。加注时应观察到新润滑脂从另一侧溢出为止。',
    scorePoints: '钢丝绳滑轮两侧新润滑脂打出',
  },
  {
    keyword: '润滑脂-油管',
    question: '油管卷盘的润滑保养要点是什么？',
    answer: '油管卷盘上下部位均需加注新润滑脂，保证卷盘回转灵活，防止锈蚀卡滞。定期检查油管有无磨损、老化现象。',
    scorePoints: '油管卷盘上下新润滑脂打出',
  },
  {
    keyword: '张紧度',
    question: '如何检查钢丝绳张紧度是否正常？',
    answer: '用手掌用力按压钢丝绳，相对水平方向应有约5mm左右的运动量。过松需要张紧，过紧则需要放松，以保证推进平稳、延长寿命。',
    scorePoints: '手掌用力按压钢丝绳相对水平方向5mm左右运动量',
  },
  {
    keyword: '保护条',
    question: '推进梁保护条及耐磨块的维护方法？',
    answer: '涂润滑油对推进梁保护条及耐磨块进行日常维护，减少凿岩机滑架与推进梁之间的摩擦磨损，延长使用寿命。定期检查磨损量，超差及时更换。',
    scorePoints: '涂润滑油对推进梁保护条及耐磨块日常维护',
  },
  {
    keyword: '空推压力',
    question: '钻机空推压力的标准是多少？为什么要检查？',
    answer: '保证钻机空推压力不高于30bar。空推压力过高说明推进阻力大，可能是保护条磨损过大、导轨变形或润滑不良，需及时排查处理。',
    scorePoints: '保证钻机空推压力不高于30bar',
  },
  {
    keyword: '水封',
    question: '凿岩机水封安装有什么要求？',
    answer: '水封安装正确无误，方向不能装反，密封面应完好无损伤。水封失效会导致进水进油，严重影响凿岩机使用寿命，必须定期检查更换。',
    scorePoints: '水封安装正确无误',
  },
];

const EXAM_TASK_DESCRIPTION = `
某铁路隧道IV级围岩全断面开挖断面，断面尺寸宽14m×高10m。
请驾驶三臂凿岩台车进行打孔操作，要求完成：
  ① 周边孔 1个（使用1号左臂）
  ② 掏槽孔 1个（使用2号中臂）
  ③ 底板孔 1个（使用2号中臂）
打孔完成后按规范收车至行车状态。
`;

// 计算计时项目得分
function calcTimedScore(maxScore, actualTime, fullTime, mediumTime, lowTime) {
  if (actualTime <= fullTime) return maxScore;
  if (actualTime <= mediumTime) return Math.round(maxScore * 0.8);
  if (actualTime <= lowTime) return Math.round(maxScore * 0.6);
  return 0;
}

// 计算精度项目得分
function calcPrecisionScore(maxScore, deviationCm) {
  if (deviationCm <= 1) return maxScore;
  if (deviationCm <= 3) return Math.round(maxScore * 0.8);
  if (deviationCm <= 5) return Math.round(maxScore * 0.6);
  return 0;
}

function ExamModule({ mode, onExit, drillState, params, sceneRef }) {
  // 考试阶段: intro / prep / operating / qa / result
  const [examPhase, setExamPhase] = React.useState('intro');
  const [prepTime, setPrepTime] = React.useState(120); // 准备时间2分钟
  const [operateTime, setOperateTime] = React.useState(0); // 正式操作时间
  const [maxOperateTime] = React.useState(1500); // 25分钟

  // 评分状态
  const [scores, setScores] = React.useState({});
  const [deductions, setDeductions] = React.useState({});
  const [startupChecked, setStartupChecked] = React.useState([]);
  const [deviation, setDeviation] = React.useState(1.5); // 模拟孔位偏差
  const [drillStartTime, setDrillStartTime] = React.useState(null);
  const [drillEndTime, setDrillEndTime] = React.useState(null);
  const [recoveryStartTime, setRecoveryStartTime] = React.useState(null);
  const [recoveryEndTime, setRecoveryEndTime] = React.useState(null);

  // 问答
  const [qaQuestions, setQaQuestions] = React.useState([]);
  const [currentQIndex, setCurrentQIndex] = React.useState(0);
  const [qaAnswer, setQaAnswer] = React.useState('');
  const [qaResults, setQaResults] = React.useState([]);
  const [qaSubmitted, setQaSubmitted] = React.useState(false);

  // 栈桥通过
  const [trestlePassed, setTrestlePassed] = React.useState(false);
  const [trestleTime, setTrestleTime] = React.useState(0);

  // 初始化考试 - 随机选3道题
  React.useEffect(() => {
    if (mode === 'exam' && examPhase === 'intro') {
      const shuffled = [...MAINTENANCE_QUESTIONS].sort(() => Math.random() - 0.5);
      setQaQuestions(shuffled.slice(0, 3));
    }
  }, [mode, examPhase]);

  // 准备倒计时
  React.useEffect(() => {
    if (examPhase !== 'prep') return;
    if (prepTime <= 0) {
      setExamPhase('operating');
      return;
    }
    const timer = setInterval(() => {
      setPrepTime(t => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [examPhase, prepTime]);

  // 操作计时
  React.useEffect(() => {
    if (examPhase !== 'operating') return;
    const timer = setInterval(() => {
      setOperateTime(t => {
        if (t >= maxOperateTime) {
          // Time's up - auto move to QA
          setExamPhase('qa');
          return t;
        }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [examPhase, maxOperateTime]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startExam = () => {
    setExamPhase('prep');
    setPrepTime(120);
    // 初始化安全项默认全对
    setScores({
      s1: 1, s2: 2, s3: 1, s4: 1, // 安全全给
      p1: 0, p2: 0, p3: 1, // 行车准备需要操作
      p4: 0, p5: 0, p6: 0, p7: 0,
      p8: 0, p9: 0, p10: 0, p11: 0, p12: 0,
      p13: 0, p14: 0,
      d1: 0, d2: 0, d3: 0, d4: 0, d5: 0,
      d6: 0, d7: 0, d8: 0,
      d9: 0, d10: 0,
      r1: 0, r2: 0,
      q1: 0,
    });
    setDeductions({});
    setStartupChecked([]);
    setOperateTime(0);
    setCurrentQIndex(0);
    setQaResults([]);
    setQaSubmitted(false);
    setTrestlePassed(false);
    setTrestleTime(0);
    setDrillStartTime(null);
    setDrillEndTime(null);
  };

  // 模拟操作按钮 - 记录操作步骤完成情况
  const markItemComplete = (itemId, scoreValue, note = '') => {
    setScores(prev => ({ ...prev, [itemId]: scoreValue }));
    if (note) {
      setDeductions(prev => ({ ...prev, [itemId]: note }));
    }
  };

  const toggleStartupStep = (stepIndex) => {
    setStartupChecked(prev => {
      if (prev.includes(stepIndex)) {
        return prev.filter(s => s !== stepIndex);
      }
      const newChecked = [...prev, stepIndex];
      // 开机9步完成度评分
      const p4Score = Math.round((newChecked.length / 9) * 5);
      setScores(s => ({ ...s, p4: p4Score }));
      return newChecked;
    });
  };

  // 进入问答环节
  const goToQA = () => {
    // 在此之前计算钻孔时间得分
    if (drillStartTime && drillEndTime) {
      const drillTime = drillEndTime - drillStartTime;
      const d10Score = calcTimedScore(20, drillTime, 600, 720, 900);
      setScores(prev => ({ ...prev, d10: d10Score }));
    }
    setExamPhase('qa');
  };

  // 提交问答答案
  const submitQaAnswer = () => {
    const currentQ = qaQuestions[currentQIndex];
    if (!currentQ) return;

    // 模拟评分 - 检查答案是否包含关键词
    const answerLower = qaAnswer.toLowerCase();
    const keywordHits = currentQ.scorePoints.split('').filter(c =>
      answerLower.includes(c)
    ).length;

    const perQuestionScore = 15 / 3; // 3道题共15分
    const hitRatio = Math.min(1, keywordHits / Math.max(1, currentQ.scorePoints.length * 0.3));
    const gotScore = Math.round(perQuestionScore * hitRatio);

    const newResult = {
      question: currentQ.question,
      correctAnswer: currentQ.answer,
      userAnswer: qaAnswer,
      gotScore,
      maxScore: perQuestionScore,
      scorePoints: currentQ.scorePoints,
    };

    setQaResults(prev => [...prev, newResult]);
    setScores(prev => ({
      ...prev,
      q1: (prev.q1 || 0) + gotScore,
    }));
    setQaAnswer('');
    setQaSubmitted(true);
  };

  const nextQaQuestion = () => {
    setQaSubmitted(false);
    if (currentQIndex < qaQuestions.length - 1) {
      setCurrentQIndex(i => i + 1);
    } else {
      // 所有问答完成，进入结果页
      finalizeExam();
    }
  };

  // 收车完成
  const finishRecovery = () => {
    const recoveryTime = Math.floor(Math.random() * 120) + 60; // 模拟1-3分钟
    setRecoveryEndTime(Date.now());
    const r2Score = calcTimedScore(10, recoveryTime, 120, 240, 300);
    setScores(prev => ({ ...prev, r1: 2, r2: r2Score }));
    goToQA();
  };

  // 最终计算成绩
  const finalizeExam = () => {
    setExamPhase('result');
  };

  // 计算总分
  const totalScore = React.useMemo(() => {
    return Object.values(scores).reduce((sum, s) => sum + (s || 0), 0);
  }, [scores]);

  const grade = totalScore >= 90 ? '优秀' : totalScore >= 80 ? '良好' : totalScore >= 60 ? '合格' : '不合格';
  const gradeColor = totalScore >= 90 ? '#10b981' : totalScore >= 80 ? '#3b82f6' : totalScore >= 60 ? '#f59e0b' : '#ef4444';

  // === 渲染各个阶段 ===

  if (mode !== 'exam') return null;

  // 介绍页
  if (examPhase === 'intro') {
    return (
      <div className="modal-overlay">
        <div style={{
          width: '560px', maxWidth: '92%', maxHeight: '88vh',
          background: 'var(--bg-panel)',
          border: '2px solid var(--accent-amber)',
          borderRadius: '12px',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #78350f, var(--accent-amber-dim))',
            textAlign: 'center',
            flexShrink: 0,
          }}>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', letterSpacing: '2px', marginBottom: '6px' }}>
              中铁七局 · 隧道工职业技能竞赛
            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>
              三臂凿岩台车操作考核
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              满分 100 分 · 100分制裁判评分表
            </div>
          </div>

          <div style={{ padding: '18px 24px', overflowY: 'auto', flex: 1 }}>
            <div style={{
              padding: '12px 14px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid var(--accent-blue-dim)',
              borderRadius: '6px',
              marginBottom: '14px',
            }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-blue)', marginBottom: '6px' }}>
                📋 考核任务
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                {EXAM_TASK_DESCRIPTION.trim()}
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
              考核项目与分值
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {EXAM_ITEMS.map((item, i) => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  fontSize: '11px',
                }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                    {i + 1}. {item.name}
                  </span>
                  <span style={{ color: 'var(--accent-amber)', fontWeight: '700' }}>
                    {item.score}分
                  </span>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: '14px', padding: '10px 12px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid #7f1d1d',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'var(--accent-red)',
              lineHeight: '1.6',
            }}>
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>⚠ 考核规则</div>
              · 准备时间：2分钟（不计入操作时间）<br />
              · 正式操作时间：25分钟，超时自动交卷<br />
              · 问答环节：随机抽取3道推进梁保养题<br />
              · 作弊或严重违规直接判0分
            </div>
          </div>

          <div style={{
            display: 'flex', gap: '10px',
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            flexShrink: 0,
          }}>
            <button className="sim-btn" style={{ flex: 1 }} onClick={onExit}>返回练习</button>
            <button className="sim-btn primary" style={{ flex: 1 }} onClick={startExam}>
              进入考场
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 准备阶段
  if (examPhase === 'prep') {
    return (
      <div style={{
        gridColumn: '1 / -1',
        background: 'linear-gradient(135deg, #1e3a5f, #1a1d24)',
        borderBottom: '1px solid var(--border-color)',
        padding: '8px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
      }}>
        <div style={{
          padding: '4px 12px',
          background: 'var(--accent-blue-dim)',
          color: '#fff',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '700',
        }}>
          准备阶段
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>
          熟悉操作台布局与3D场景，准备开始操作
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>准备倒计时</div>
        <div style={{
          fontSize: '28px', fontWeight: '800', fontFamily: 'monospace',
          color: prepTime <= 30 ? 'var(--accent-red)' : 'var(--accent-amber)',
          minWidth: '80px', textAlign: 'right',
        }}>
          {formatTime(prepTime)}
        </div>
        <button className="sim-btn primary" style={{ padding: '6px 14px' }} onClick={() => setExamPhase('operating')}>
          开始操作 →
        </button>
      </div>
    );
  }

  // 操作阶段
  if (examPhase === 'operating') {
    const timeLeft = maxOperateTime - operateTime;
    const timePercent = (timeLeft / maxOperateTime) * 100;

    return (
      <div style={{
        gridColumn: '1 / -1',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        padding: '6px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <div style={{
          padding: '4px 10px',
          background: 'var(--accent-red)',
          color: '#fff',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '700',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}>
          ● 考核进行中
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          剩余时间
        </div>
        <div style={{
          fontSize: '22px', fontWeight: '800', fontFamily: 'monospace',
          color: timeLeft < 300 ? 'var(--accent-red)' : timeLeft < 600 ? 'var(--accent-amber)' : 'var(--accent-green)',
          minWidth: '75px',
        }}>
          {formatTime(Math.max(0, timeLeft))}
        </div>

        {/* Progress bar */}
        <div style={{
          flex: 1, maxWidth: '200px', height: '6px',
          background: 'var(--bg-deep)', borderRadius: '3px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${timePercent}%`,
            height: '100%',
            background: timeLeft < 300 ? 'var(--accent-red)' : timeLeft < 600 ? 'var(--accent-amber)' : 'var(--accent-green)',
            transition: 'all 1s linear',
          }} />
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <ExamStepBadge label="安全" done={scores.s1 > 0} />
          <ExamStepBadge label="开机" done={scores.p4 > 0} />
          <ExamStepBadge label="定位" done={scores.p8 > 0} />
          <ExamStepBadge label="钻孔" done={scores.d1 > 0} />
          <ExamStepBadge label="收车" done={scores.r1 > 0} />
          <ExamStepBadge label="问答" done={examPhase === 'qa'} />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="sim-btn" style={{ padding: '5px 10px', fontSize: '10px' }}
            onClick={() => {
              // 模拟完成钻孔
              setDrillStartTime(Date.now() - 660000);
              setDrillEndTime(Date.now());
              setScores(prev => ({
                ...prev,
                d1: 5, d2: 3, d3: 3, d4: 2, d5: 2,
                d6: 1, d7: 1, d8: 2,
                d9: calcPrecisionScore(5, deviation),
                d10: calcTimedScore(20, 660, 600, 720, 900),
              }));
            }}>
            完成钻孔
          </button>
          <button className="sim-btn primary" style={{ padding: '5px 10px', fontSize: '10px' }}
            onClick={finishRecovery}>
            完成收车 →
          </button>
        </div>
      </div>
    );
  }

  // 问答阶段
  if (examPhase === 'qa' && !qaSubmitted) {
    const currentQ = qaQuestions[currentQIndex];
    return (
      <div className="modal-overlay">
        <div style={{
          width: '520px', maxWidth: '92%',
          background: 'var(--bg-panel)',
          border: '2px solid var(--accent-purple)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(59, 130, 246, 0.1))',
            borderBottom: '1px solid var(--border-color)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>👨‍🏫</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-purple)' }}>
                AI 导师提问环节
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                第 {currentQIndex + 1} / {qaQuestions.length} 题
              </span>
            </div>
          </div>

          <div style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              请回答关于推进梁日常保养的问题：
            </div>
            <div style={{
              padding: '12px 14px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
              marginBottom: '14px',
            }}>
              Q：{currentQ?.question}
            </div>

            <textarea
              style={{
                width: '100%', minHeight: '120px',
                padding: '10px 12px',
                background: 'var(--bg-deep)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                lineHeight: '1.6',
              }}
              placeholder="请输入你的回答..."
              value={qaAnswer}
              onChange={e => setQaAnswer(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                每题5分 · 共3题 · 问答满分15分
              </span>
              <button
                className="sim-btn primary"
                style={{ padding: '6px 18px' }}
                disabled={!qaAnswer.trim()}
                onClick={submitQaAnswer}
              >
                提交答案
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 问答结果展示
  if (examPhase === 'qa' && qaSubmitted) {
    const currentQ = qaQuestions[currentQIndex];
    const lastResult = qaResults[qaResults.length - 1];
    return (
      <div className="modal-overlay">
        <div style={{
          width: '520px', maxWidth: '92%',
          background: 'var(--bg-panel)',
          border: `2px solid ${lastResult.gotScore > lastResult.maxScore * 0.6 ? 'var(--accent-green)' : 'var(--accent-red)'}`,
          borderRadius: '12px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 20px',
            background: lastResult.gotScore > lastResult.maxScore * 0.6
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.05))'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.05))',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
              {lastResult.gotScore >= lastResult.maxScore ? '✅ 回答正确' : lastResult.gotScore > lastResult.maxScore * 0.6 ? '⚠ 部分正确' : '❌ 回答不完整'}
            </span>
            <span style={{
              fontSize: '18px', fontWeight: '800',
              color: lastResult.gotScore > lastResult.maxScore * 0.6 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {lastResult.gotScore} / {lastResult.maxScore}分
            </span>
          </div>

          <div style={{ padding: '16px 20px', maxHeight: '50vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              题目：{currentQ?.question}
            </div>

            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: '600', marginBottom: '4px' }}>
                你的回答
              </div>
              <div style={{
                padding: '8px 10px',
                background: 'var(--bg-card)',
                borderRadius: '4px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}>
                {lastResult.userAnswer || '（未作答）'}
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '600', marginBottom: '4px' }}>
                参考答案（得分要点：{lastResult.scorePoints}）
              </div>
              <div style={{
                padding: '8px 10px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '4px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: '1.6',
              }}>
                {lastResult.correctAnswer}
              </div>
            </div>
          </div>

          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              已完成 {currentQIndex + 1} / {qaQuestions.length} 题
              （问答累计 {scores.q1 || 0} / 15分）
            </span>
            <button className="sim-btn primary" onClick={nextQaQuestion}>
              {currentQIndex < qaQuestions.length - 1 ? '下一题 →' : '查看最终成绩'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 结果页 - 裁判评分表样式
  if (examPhase === 'result') {
    return (
      <div className="modal-overlay" style={{ alignItems: 'flex-start', padding: '20px', overflowY: 'auto' }}>
        <div style={{
          width: '720px', maxWidth: '96%',
          background: 'var(--bg-panel)',
          border: '2px solid var(--accent-amber)',
          borderRadius: '10px',
          overflow: 'hidden',
          margin: 'auto',
        }}>
          {/* 成绩头部 */}
          <div style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #78350f, var(--accent-amber-dim))',
            textAlign: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: '10px', right: '14px',
              fontSize: '10px', color: 'rgba(255,255,255,0.6)',
            }}>
              中铁七局隧道工竞赛评分表
            </div>
            <div style={{
              position: 'absolute', top: '10px', left: '14px',
              fontSize: '10px', color: 'rgba(255,255,255,0.6)',
            }}>
              参赛号：TJ-2026-001
            </div>
            <div style={{ fontSize: '36px', fontWeight: '900', color: '#fff', letterSpacing: '2px' }}>
              {totalScore.toFixed(0)}
              <span style={{ fontSize: '14px', fontWeight: '400', opacity: 0.7 }}> / 100</span>
            </div>
            <div style={{
              display: 'inline-block',
              marginTop: '6px',
              padding: '3px 16px',
              background: gradeColor,
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '700',
              color: '#fff',
            }}>
              {grade}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '6px' }}>
              操作时长：{formatTime(operateTime)}
            </div>
          </div>

          {/* 评分表 */}
          <div style={{ padding: '16px 20px', maxHeight: '50vh', overflowY: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '11px',
            }}>
              <thead>
                <tr style={{ background: 'var(--bg-card)' }}>
                  <th style={{
                    padding: '8px 10px', textAlign: 'left',
                    borderBottom: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)', fontWeight: '700',
                    width: '5%',
                  }}>序号</th>
                  <th style={{
                    padding: '8px 10px', textAlign: 'left',
                    borderBottom: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)', fontWeight: '700',
                    width: '55%',
                  }}>考核项目及评分标准</th>
                  <th style={{
                    padding: '8px 10px', textAlign: 'center',
                    borderBottom: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)', fontWeight: '700',
                    width: '10%',
                  }}>配分</th>
                  <th style={{
                    padding: '8px 10px', textAlign: 'center',
                    borderBottom: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)', fontWeight: '700',
                    width: '10%',
                  }}>得分</th>
                  <th style={{
                    padding: '8px 10px', textAlign: 'left',
                    borderBottom: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)', fontWeight: '700',
                    width: '20%',
                  }}>扣分说明</th>
                </tr>
              </thead>
              <tbody>
                {EXAM_ITEMS.map((group, gi) => (
                  <React.Fragment key={group.id}>
                    <tr style={{ background: 'rgba(245, 158, 11, 0.08)' }}>
                      <td colSpan="2" style={{
                        padding: '6px 10px', fontWeight: '700',
                        color: 'var(--accent-amber)',
                        borderBottom: '1px solid var(--border-color)',
                      }}>
                        {gi + 1}、{group.name}
                      </td>
                      <td style={{
                        padding: '6px 10px', textAlign: 'center',
                        fontWeight: '700', color: 'var(--accent-amber)',
                        borderBottom: '1px solid var(--border-color)',
                      }}>
                        {group.score}
                      </td>
                      <td style={{
                        padding: '6px 10px', textAlign: 'center',
                        fontWeight: '700', color: group.children.reduce((sum, c) => sum + (scores[c.id] || 0), 0) === group.score
                          ? 'var(--accent-green)' : 'var(--accent-amber)',
                        borderBottom: '1px solid var(--border-color)',
                      }}>
                        {group.children.reduce((sum, c) => sum + (scores[c.id] || 0), 0)}
                      </td>
                      <td style={{
                        borderBottom: '1px solid var(--border-color)',
                      }} />
                    </tr>
                    {group.children.map((item, ii) => {
                      const itemScore = scores[item.id] || 0;
                      const isFull = itemScore >= item.score;
                      const deduction = deductions[item.id];
                      return (
                        <tr key={item.id}>
                          <td style={{
                            padding: '5px 10px 5px 20px',
                            color: 'var(--text-muted)',
                            borderBottom: '1px solid rgba(54, 60, 74, 0.5)',
                          }}>
                            {gi + 1}.{ii + 1}
                          </td>
                          <td style={{
                            padding: '5px 10px',
                            color: 'var(--text-secondary)',
                            borderBottom: '1px solid rgba(54, 60, 74, 0.5)',
                          }}>
                            {item.name}
                          </td>
                          <td style={{
                            padding: '5px 10px', textAlign: 'center',
                            color: 'var(--text-muted)',
                            borderBottom: '1px solid rgba(54, 60, 74, 0.5)',
                          }}>
                            {item.score}
                          </td>
                          <td style={{
                            padding: '5px 10px', textAlign: 'center',
                            fontWeight: '700',
                            color: isFull ? 'var(--accent-green)' : 'var(--accent-red)',
                            borderBottom: '1px solid rgba(54, 60, 74, 0.5)',
                          }}>
                            {itemScore}
                          </td>
                          <td style={{
                            padding: '5px 10px',
                            fontSize: '10px',
                            color: isFull ? 'var(--accent-green)' : 'var(--accent-red)',
                            borderBottom: '1px solid rgba(54, 60, 74, 0.5)',
                          }}>
                            {isFull ? '达标' : (deduction || `扣${item.score - itemScore}分`)}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
                <tr style={{ background: 'var(--bg-card)', fontWeight: '700' }}>
                  <td colSpan="2" style={{
                    padding: '10px',
                    textAlign: 'right',
                    borderTop: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)',
                  }}>
                    合计
                  </td>
                  <td style={{
                    padding: '10px', textAlign: 'center',
                    borderTop: '2px solid var(--accent-amber)',
                    color: 'var(--accent-amber)',
                  }}>
                    100
                  </td>
                  <td style={{
                    padding: '10px', textAlign: 'center',
                    borderTop: '2px solid var(--accent-amber)',
                    color: gradeColor,
                    fontSize: '14px',
                  }}>
                    {totalScore.toFixed(0)}
                  </td>
                  <td style={{
                    padding: '10px',
                    borderTop: '2px solid var(--accent-amber)',
                    color: gradeColor,
                    fontWeight: '700',
                  }}>
                    {grade}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 裁判签字区 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '20px',
              paddingTop: '12px',
              borderTop: '1px dashed var(--border-color)',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}>
              <div>参赛选手签字：______________</div>
              <div>裁判签字：______________</div>
              <div>日期：____年__月__日</div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div style={{
            display: 'flex',
            gap: '10px',
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
          }}>
            <button className="sim-btn" style={{ flex: 1 }} onClick={() => setExamPhase('intro')}>
              重新考核
            </button>
            <button className="sim-btn" style={{ flex: 1 }} onClick={onExit}>
              返回自由练习
            </button>
            <button className="sim-btn primary" style={{ flex: 1 }} onClick={() => window.print()}>
              打印评分表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ExamStepBadge({ label, done }) {
  return (
    <div style={{
      padding: '3px 8px',
      background: done ? 'var(--accent-green)' : 'var(--bg-elevated)',
      color: done ? '#fff' : 'var(--text-muted)',
      borderRadius: '3px',
      fontSize: '9px',
      fontWeight: '600',
    }}>
      {done ? '✓ ' : ''}{label}
    </div>
  );
}

Object.assign(window, {
  ExamModule,
  EXAM_ITEMS,
  EXAM_ITEMS_FLAT: EXAM_ITEMS.flatMap(g => g.children.map(c => ({ ...c, group: g.name, groupId: g.id }))),
  MAINTENANCE_QUESTIONS,
  STARTUP_STEPS,
  calcTimedScore,
  calcPrecisionScore,
});


// ===== App.jsx =====
/* ============================================================
   主应用组件 - 三臂凿岩台车仿真实训AI导师
   电信杯校园智能体应用创新大赛参赛作品
   ============================================================ */

function App() {
  const [currentTab, setCurrentTab] = React.useState('qwen');
  const [apiKeys, setApiKeys] = React.useState({});
  const [isSimulating, setIsSimulating] = React.useState(false);
  const [drillState, setDrillState] = React.useState({
    left: { progress: 0, status: 'idle', currentHole: 0 },
    center: { progress: 0, status: 'idle', currentHole: 0 },
    right: { progress: 0, status: 'idle', currentHole: 0 },
  });
  const [params, setParams] = React.useState({
    drillDepth: 5.0,
    drillDiameter: 48,
    thrustForce: 21,
    impactPower: 29,
    liftAngle: 30,
    swingAngle: 15,
    rockGrade: 3,
    chassisPower: 180,
  });

  // View mode: normal / explode / console
  const [viewMode, setViewMode] = React.useState('normal');
  const [trainingMode, setTrainingMode] = React.useState('free'); // teaching / free / exam
  const [selectedPart, setSelectedPart] = React.useState(null);
  const [partPopupPos, setPartPopupPos] = useStateSafe({ x: 0, y: 0 });
  const [sceneRef, setSceneRef] = React.useState(null);

  const sceneInitialized = React.useRef(false);
  const statePollRef = React.useRef(null);

  // Load saved API keys
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('drillRig_apiKeys');
      if (saved) setApiKeys(JSON.parse(saved));
    } catch (e) {}
  }, []);

  // Initialize 3D scene
  React.useEffect(() => {
    if (sceneInitialized.current) return;
    sceneInitialized.current = true;

    const initScene = () => {
      if (window.DrillScene) {
        const ref = DrillScene.init('three-canvas', {
          onPartSelect: (partInfo) => {
            if (partInfo) {
              setSelectedPart(partInfo);
              setPartPopupPos({ x: partInfo.screenX, y: partInfo.screenY });
            } else {
              setSelectedPart(null);
            }
          },
        });
        setSceneRef(ref);
        DrillScene.updateParams({
          drillDepth: params.drillDepth,
          liftAngle: params.liftAngle,
          swingAngle: params.swingAngle,
        });
      }
    };

    if (document.readyState === 'complete') {
      setTimeout(initScene, 100);
    } else {
      window.addEventListener('load', initScene);
    }

    return () => {
      if (statePollRef.current) clearInterval(statePollRef.current);
    };
  }, []);

  // Update scene params
  React.useEffect(() => {
    if (window.DrillScene && sceneInitialized.current && sceneRef) {
      DrillScene.updateParams({
        drillDepth: params.drillDepth,
        liftAngle: params.liftAngle,
        swingAngle: params.swingAngle,
        rockGrade: params.rockGrade,
      });
    }
  }, [params.drillDepth, params.liftAngle, params.swingAngle, params.rockGrade]);

  // Handle explode mode
  React.useEffect(() => {
    if (sceneRef && sceneRef.hasWebGL !== false) {
      DrillScene.setExplosionMode(viewMode === 'explode');
    }
  }, [viewMode, sceneRef]);

  // Poll drill state
  React.useEffect(() => {
    if (isSimulating || viewMode === 'console') {
      statePollRef.current = setInterval(() => {
        if (window.DrillScene) {
          const state = DrillScene.getDrillState();
          setDrillState(prev => ({
            left: { ...prev.left, ...state.left },
            center: { ...prev.center, ...state.center },
            right: { ...prev.right, ...state.right },
          }));
        }
      }, 100);
    } else {
      if (statePollRef.current) {
        clearInterval(statePollRef.current);
        statePollRef.current = null;
      }
    }
    return () => {
      if (statePollRef.current) clearInterval(statePollRef.current);
    };
  }, [isSimulating, viewMode]);

  const handleSimulate = () => {
    if (isSimulating) {
      DrillScene.stopSimulation();
      setIsSimulating(false);
    } else {
      DrillScene.startSimulation();
      setIsSimulating(true);
    }
  };

  const handleSendQuestion = (question) => {
    if (question.includes('硬岩') || question.includes('花岗岩')) {
      setParams(prev => ({ ...prev, rockGrade: 1, impactPower: 31 }));
    } else if (question.includes('软岩') || question.includes('泥岩')) {
      setParams(prev => ({ ...prev, rockGrade: 5, impactPower: 24 }));
    } else if (question.includes('光面爆破') || question.includes('周边眼')) {
      setParams(prev => ({ ...prev, drillDiameter: 45 }));
    } else if (question.includes('掏槽眼') || question.includes('掏槽')) {
      setParams(prev => ({ ...prev, drillDiameter: 89 }));
    }
  };

  const handleSelectPart = (partId) => {
    if (sceneRef) {
      DrillScene.selectPartByName(partId);
      // The onPartSelect callback will update selectedPart state
    }
  };

  const handleTrainingModeChange = (mode) => {
    setTrainingMode(mode);
    if (mode === 'teaching') {
      setIsSimulating(false);
      if (sceneRef) DrillScene.stopSimulation();
    } else if (mode === 'exam') {
      // Exam mode will show start dialog
    }
  };

  const modeLabels = {
    teaching: '教学引导',
    free: '自由练习',
    exam: '考核评分',
  };

  return (
    <div className="app-container" style={{
      gridTemplateRows: (trainingMode === 'teaching' || trainingMode === 'exam') ? '100px 1fr 300px' : '56px 1fr 300px',
    }}>
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
              <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" />
              <path d="M12 22V12" />
              <path d="M4 7l8 5 8-5" />
            </svg>
          </div>
          <div>
            <span className="header-title">三臂凿岩台车仿真实训AI导师</span>
            <span className="header-subtitle">AI赋能校园实训 · 智创美好未来</span>
          </div>
          <div className="competition-badge">
            🏆 电信杯参赛作品
          </div>
        </div>
        <div className="header-right">
          {/* Training mode switcher */}
          <div className="mode-switcher">
            <button
              className={`mode-btn ${trainingMode === 'teaching' ? 'active' : ''}`}
              onClick={() => handleTrainingModeChange('teaching')}
            >
              📚 教学引导
            </button>
            <button
              className={`mode-btn ${trainingMode === 'free' ? 'active' : ''}`}
              onClick={() => handleTrainingModeChange('free')}
            >
              🔧 自由练习
            </button>
            <button
              className={`mode-btn ${trainingMode === 'exam' ? 'active' : ''}`}
              onClick={() => handleTrainingModeChange('exam')}
            >
              📝 考核评分
            </button>
          </div>
          <div className="header-badge">
            <span className="badge-dot"></span>
            {modeLabels[trainingMode]}模式
          </div>
        </div>
      </header>

      {/* Teaching mode progress bar */}
      {trainingMode === 'teaching' && (
        <div style={{
          gridColumn: '1 / -1',
          gridRow: '2 / 2',
          position: 'relative',
          zIndex: 50,
        }}>
          <TrainingMode
            mode="teaching"
            drillState={drillState}
            params={params}
            onExit={() => setTrainingMode('free')}
          />
        </div>
      )}

      {/* Exam mode - 中铁七局竞赛评分 */}
      {trainingMode === 'exam' && (
        <ExamModule
          mode="exam"
          drillState={drillState}
          params={params}
          sceneRef={sceneRef}
          onExit={() => setTrainingMode('free')}
        />
      )}

      {/* Left: AI Tutor Chat Panel */}
      <ChatPanel
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        apiKeys={apiKeys}
        setApiKeys={setApiKeys}
        onSendQuestion={handleSendQuestion}
        selectedPart={selectedPart}
        trainingMode={trainingMode}
      />

      {/* Center: 3D Scene */}
      <div className="scene-panel">
        <canvas id="three-canvas"></canvas>

        {/* Scene toolbar */}
        <div className="scene-toolbar">
          <button
            className={`scene-tool-btn ${viewMode === 'normal' ? 'active' : ''}`}
            onClick={() => setViewMode('normal')}
          >
            🏗 整体视图
          </button>
          <button
            className={`scene-tool-btn ${viewMode === 'explode' ? 'active' : ''}`}
            onClick={() => setViewMode('explode')}
          >
            💥 结构拆解
          </button>
          <button
            className={`scene-tool-btn ${isSimulating ? 'active' : ''}`}
            onClick={handleSimulate}
          >
            {isSimulating ? '⏹ 停止仿真' : '▶ 开始仿真'}
          </button>
        </div>

        {/* Scene info overlay */}
        <div className="scene-overlay">
          <div className="scene-info-card">
            <div className="scene-info-row">
              <span className="scene-info-label">钻孔深度</span>
              <span className="scene-info-value">{params.drillDepth.toFixed(1)} m</span>
            </div>
            <div className="scene-info-row">
              <span className="scene-info-label">钻孔直径</span>
              <span className="scene-info-value">{params.drillDiameter} mm</span>
            </div>
            <div className="scene-info-row">
              <span className="scene-info-label">围岩等级</span>
              <span className="scene-info-value">{'ⅠⅡⅢⅣⅤ'[params.rockGrade - 1]}级</span>
            </div>
            <div className="scene-info-row">
              <span className="scene-info-label">冲击功率</span>
              <span className="scene-info-value">{params.impactPower} kW</span>
            </div>
          </div>

          <div className="scene-info-card">
            <div className="scene-info-row">
              <span className="scene-info-label">作业状态</span>
              <span className="scene-info-value" style={{ color: isSimulating ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {isSimulating ? '仿真运行中' : '待机'}
              </span>
            </div>
            <div className="scene-info-row">
              <span className="scene-info-label">实训模式</span>
              <span className="scene-info-value" style={{ color: 'var(--accent-purple)' }}>
                {modeLabels[trainingMode]}
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="scene-legend">
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            钻臂编号
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ef4444' }}></div>
            1号臂（左）
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f59e0b' }}></div>
            2号臂（中）
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#3b82f6' }}></div>
            3号臂（右）
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '6px', paddingTop: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
            炮孔类型
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ef4444' }}></div>
            掏槽眼
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f59e0b' }}></div>
            辅助眼
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#10b981' }}></div>
            周边眼
          </div>
        </div>

        {/* Part info popup */}
        {selectedPart && viewMode === 'explode' && (
          <div
            className="part-popup"
            style={{
              left: Math.min(partPopupPos.x + 20, window.innerWidth - 280),
              top: Math.max(60, partPopupPos.y - 50),
            }}
          >
            <div className="part-popup-title">
              {selectedPart.metadata.name}
            </div>
            <div className="part-popup-text">
              {selectedPart.metadata.function}
            </div>
            <div className="part-popup-section">
              <div className="part-popup-label">连接方式</div>
              <div className="part-popup-text">{selectedPart.metadata.connection}</div>
            </div>
            <div className="part-popup-section">
              <div className="part-popup-label">传感器配置</div>
              <div className="part-popup-text">{selectedPart.metadata.sensors}</div>
            </div>
            <div style={{
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid var(--border-color)',
              fontSize: '10px',
              color: 'var(--accent-amber)',
              cursor: 'pointer',
            }}
            onClick={() => {
              // Ask AI tutor to explain
              const chatPanel = document.querySelector('.chat-panel');
              if (chatPanel) chatPanel.scrollTop = chatPanel.scrollHeight;
            }}
            >
              💡 AI导师详细讲解 →
            </div>
          </div>
        )}

        <div className="scene-controls-hint">
          拖拽旋转视角 · 滚轮缩放 · 点击部件查看结构{viewMode === 'explode' ? '（爆炸视图）' : ''}
        </div>
      </div>

      {/* Right: Control Panel */}
      <ControlPanel
        params={params}
        setParams={setParams}
        onSimulate={handleSimulate}
        isSimulating={isSimulating}
        drillState={drillState}
        viewMode={viewMode}
        setViewMode={setViewMode}
        isExplodeMode={viewMode === 'explode'}
        onSelectPart={handleSelectPart}
      />

      {/* Bottom: Dashboard */}
      <DataDashboard
        params={params}
        drillState={drillState}
        isSimulating={isSimulating}
        trainingMode={trainingMode}
      />
    </div>
  );
}

// Helper: useState but safe for SSR
function useStateSafe(initial) {
  return React.useState(initial);
}

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
