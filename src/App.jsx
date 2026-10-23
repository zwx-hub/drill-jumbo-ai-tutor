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
