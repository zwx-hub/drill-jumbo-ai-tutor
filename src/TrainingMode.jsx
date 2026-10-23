/* ============================================================
   教学模式组件 - 教学引导 / 考核评分
   ============================================================ */

const TEACHING_STEPS = [
  {
    id: 1,
    title: '台车定位',
    description: '将三臂凿岩台车行驶至掌子面前方合适位置，确保台车中心线与隧道中心线对齐。注意观察掌子面情况，预留安全作业距离。',
    knowledge: '【一心五点】控制隧道中心位置和五个开挖轮廓点（拱顶、左右拱肩、左右边墙），确保台车定位准确。',
    action: '定位',
  },
  {
    id: 2,
    title: '展开钻臂',
    description: '依次展开三个钻臂（1号左臂、2号中臂、3号右臂），注意各臂之间的安全距离，防止碰撞。先展开左右臂，再展开中臂。',
    knowledge: '【一线两端】台车大臂与隧道中心线平行（一线），推进梁前后端点位置准确（两端），保证钻孔方向正确。',
    action: '展开',
  },
  {
    id: 3,
    title: '调整钻杆角度',
    description: '根据布孔设计，调整各钻臂的举升角度、摆动角度和推进梁俯仰角度。使用角度传感器读数进行精确调整，允许偏差≤0.8°。',
    knowledge: '角度偏差>0.8°时自动PID闭环纠偏。周边眼角度控制精度直接影响光面爆破效果和超欠挖量。',
    action: '调整角度',
  },
  {
    id: 4,
    title: '开孔定位',
    description: '将钻钻头对准孔位标记，缓慢推进开孔。开孔阶段采用低冲击、低推进模式，确认孔位准确后再转入全功率钻孔。',
    knowledge: '【一高一低】推进梁尾部高度（一高）决定钻孔仰角，开孔处最低位置（一低）确保钻孔起始点准确。',
    action: '开孔',
  },
  {
    id: 5,
    title: '全功率钻孔',
    description: '确认开孔正常后，切换至全功率钻进模式。根据岩石软硬实时调整冲击功率和推进速度，保持最佳钻进效率。',
    knowledge: '【一快一慢】硬岩慢推进、高冲击；软岩快推进、低冲击。根据围岩情况灵活调整冲击与推进速度的匹配关系。',
    action: '钻孔',
  },
  {
    id: 6,
    title: '退杆返回',
    description: '钻孔达到设计深度后，停止冲击，缓慢回退钻杆。退杆过程中保持旋转，防止卡钻。退杆完成后推进梁返回初始位置。',
    knowledge: '退杆速度约为钻进速度的1.5~2倍。如遇卡钻，应先正反转活动钻杆，严禁强行拔杆。',
    action: '退杆',
  },
];

const EXAM_CRITERIA = [
  { name: '孔位精度', weight: 25, score: 92, desc: '孔位偏差<±1.8cm达标' },
  { name: '角度控制', weight: 20, score: 88, desc: '角度偏差≤0.8°达标' },
  { name: '作业效率', weight: 20, score: 95, desc: '单孔时间优于标准值' },
  { name: '操作规范', weight: 15, score: 85, desc: '操作流程完全正确' },
  { name: '安全意识', weight: 10, score: 100, desc: '无违规操作' },
  { name: '故障处理', weight: 10, score: 78, desc: '卡钻处理正确' },
];

function TrainingMode({ mode, onExit, onComplete, drillState, params }) {
  // Teaching mode state
  const [currentStep, setCurrentStep] = React.useState(0);
  const [completedSteps, setCompletedSteps] = React.useState([]);
  const [examStarted, setExamStarted] = React.useState(false);
  const [examFinished, setExamFinished] = React.useState(false);
  const [examTime, setExamTime] = React.useState(0);
  const [examResults, setExamResults] = React.useState(null);

  // Teaching mode
  React.useEffect(() => {
    if (mode === 'teaching' && currentStep > 0) {
      // Auto-trigger simulation for current step
    }
  }, [mode, currentStep]);

  // Exam timer
  React.useEffect(() => {
    if (mode === 'exam' && examStarted && !examFinished) {
      const timer = setInterval(() => {
        setExamTime(t => t + 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode, examStarted, examFinished]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNextStep = () => {
    setCompletedSteps(prev => [...prev, currentStep]);
    if (currentStep < TEACHING_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // All steps completed
      if (onComplete) onComplete();
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const startExam = () => {
    setExamStarted(true);
    setExamTime(0);
  };

  const finishExam = () => {
    setExamFinished(true);
    // Calculate results
    const totalScore = EXAM_CRITERIA.reduce((sum, c) => sum + c.score * c.weight / 100, 0);
    setExamResults({
      score: Math.round(totalScore),
      criteria: EXAM_CRITERIA,
      time: examTime,
      grade: totalScore >= 90 ? '优秀' : totalScore >= 80 ? '良好' : totalScore >= 70 ? '合格' : '不合格',
    });
  };

  const resetExam = () => {
    setExamStarted(false);
    setExamFinished(false);
    setExamTime(0);
    setExamResults(null);
  };

  if (mode === 'free') {
    return null; // Free practice - no overlay
  }

  // Exam finished - show result
  if (mode === 'exam' && examFinished && examResults) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onExit()}>
        <div className="exam-result-panel" onClick={e => e.stopPropagation()}>
          <div className="exam-result-header">
            <div className="exam-score">{examResults.score}</div>
            <div className="exam-score-label">综合评分</div>
            <div className="exam-grade">{examResults.grade}</div>
          </div>
          <div className="exam-result-body">
            <div className="exam-result-section">
              <div className="exam-result-title">考核详情</div>
              <div className="score-breakdown">
                {examResults.criteria.map((c, i) => (
                  <div key={i} className="score-item">
                    <span className="score-item-name">{c.name}（{c.weight}%）</span>
                    <span className="score-item-value">{c.score}分</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="exam-result-section">
              <div className="exam-result-title">考核用时</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                {formatTime(examResults.time)}
              </div>
            </div>
          </div>
          <div className="exam-actions">
            <button className="exam-action-btn" onClick={resetExam}>重新考核</button>
            <button className="exam-action-btn" onClick={onExit}>返回练习</button>
            <button className="exam-action-btn primary" onClick={() => window.print && window.print()}>导出报告</button>
          </div>
        </div>
      </div>
    );
  }

  // Exam in progress
  if (mode === 'exam' && examStarted) {
    return (
      <>
        <div className="step-progress-bar">
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-amber)', marginRight: '10px' }}>
            考核进行中
          </span>
          <span style={{
            fontSize: '18px',
            fontWeight: '700',
            fontFamily: 'monospace',
            color: 'var(--accent-amber)',
          }}>
            {formatTime(examTime)}
          </span>
          <div style={{ flex: 1 }} />
          <button
            className="sim-btn primary"
            style={{ padding: '5px 12px', fontSize: '11px' }}
            onClick={finishExam}
          >
            提交考核
          </button>
        </div>
        <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--accent-red)' }}>
          📋 考核任务：完成标准断面 150 个炮孔的钻孔作业，考核孔位精度、角度控制、作业效率和操作规范度
        </div>
      </>
    );
  }

  // Exam start screen
  if (mode === 'exam' && !examStarted) {
    return (
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onExit()}>
        <div style={{
          width: '480px',
          maxWidth: '90%',
          background: 'var(--bg-panel)',
          border: '2px solid var(--accent-amber)',
          borderRadius: '12px',
          overflow: 'hidden',
        }} onClick={e => e.stopPropagation()}>
          <div style={{
            padding: '24px',
            background: 'linear-gradient(135deg, var(--accent-amber-dim), #78350f)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#fff', marginBottom: '4px' }}>
              操作考核模式
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              完成标准任务，系统自动评分
            </div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              考核内容
            </div>
            <div style={{ display: 'grid', gap: '8px' }}>
              {EXAM_CRITERIA.map((c, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: '4px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                  <span style={{ color: 'var(--accent-amber)', fontWeight: '600' }}>
                    权重 {c.weight}%
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            display: 'flex',
            gap: '10px',
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
          }}>
            <button className="sim-btn" style={{ flex: 1 }} onClick={onExit}>返回</button>
            <button className="sim-btn primary" style={{ flex: 1 }} onClick={startExam}>
              开始考核
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Teaching mode - progress bar + bubble
  const step = TEACHING_STEPS[currentStep];

  return (
    <>
      {/* Progress bar */}
      <div className="step-progress-bar">
        {TEACHING_STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`step-dot ${i === currentStep ? 'active' : i < currentStep ? 'completed' : ''}`}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            {i < TEACHING_STEPS.length - 1 && (
              <div className={`step-line ${i < currentStep ? 'completed' : ''}`}></div>
            )}
          </React.Fragment>
        ))}
        <span className="step-label">
          步骤 {currentStep + 1}/{TEACHING_STEPS.length}：{step.title}
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
