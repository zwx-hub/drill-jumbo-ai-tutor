/* ============================================================
   参数化仿真控制面板 + 视图模式切换
   ============================================================ */

const ROCK_GRADES = [
  { value: 1, label: 'Ⅰ级（极硬岩）', factor: 0.5 },
  { value: 2, label: 'Ⅱ级（硬岩）', factor: 0.7 },
  { value: 3, label: 'Ⅲ级（中硬岩）', factor: 1.0 },
  { value: 4, label: 'Ⅳ级（软岩）', factor: 1.4 },
  { value: 5, label: 'Ⅴ级（极软岩）', factor: 2.0 },
];

const VIEW_MODES = [
  { id: 'normal', label: '整体视图', icon: '🏗' },
  { id: 'explode', label: '结构拆解', icon: '💥' },
  { id: 'console', label: '操作台', icon: '🎛' },
];

const PARTS_LIST = [
  { id: 'chassis', name: '轮式底盘', category: '行走系统' },
  { id: 'cabin', name: '操作驾驶室', category: '操控系统' },
  { id: 'baseJoint', name: '大臂连接座', category: '钻臂系统' },
  { id: 'boom', name: '基本臂体（大臂）', category: '钻臂系统' },
  { id: 'cylinder', name: '大臂伸缩油缸', category: '液压系统' },
  { id: 'telescopicArm', name: '伸缩臂', category: '钻臂系统' },
  { id: 'tBeam', name: 'T型梁（翻转架）', category: '钻臂系统' },
  { id: 'feedBeam', name: '推进梁', category: '钻臂系统' },
  { id: 'rockDrill', name: '凿岩机', category: '工作装置' },
  { id: 'drillRod', name: '钻杆与钻头', category: '工作装置' },
];

function ControlPanel({
  params,
  setParams,
  onSimulate,
  isSimulating,
  drillState,
  viewMode,
  setViewMode,
  onExplodeMode,
  isExplodeMode,
  onSelectPart,
}) {
  const updateParam = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const metrics = React.useMemo(() => {
    const rockGrade = ROCK_GRADES.find(g => g.value === params.rockGrade) || ROCK_GRADES[2];
    const depthM = params.drillDepth;
    const diameterMm = params.drillDiameter;

    const baseSpeed = 1.0;
    const powerFactor = params.impactPower / 29;
    const thrustFactor = params.thrustForce / 21;
    const speed = baseSpeed * powerFactor * thrustFactor * 0.4 / rockGrade.factor;
    const actualSpeed = Math.max(0.2, Math.min(2.5, speed));

    const singleHoleTime = depthM / actualSpeed;

    const holeSpacing = params.drillDiameter < 60 ? 0.6 : 0.8;
    const sectionArea = 120;
    const totalHoles = Math.round(sectionArea / (holeSpacing * holeSpacing) * 0.4);

    const coordinationFactor = 0.88;
    const totalDrillTime = (totalHoles * singleHoleTime / 3) / coordinationFactor;

    const powerKW = params.impactPower * 3 + 180 * 0.3;
    const energyConsumption = powerKW * (totalDrillTime / 60);

    const blastingVolume = sectionArea * depthM * 0.85;
    const overbreakRate = params.drillDiameter > 55 ? 8 : 5;

    return {
      singleHoleTime,
      singleHoleTimeStr: singleHoleTime.toFixed(1),
      totalHoles,
      totalDrillTime: totalDrillTime.toFixed(0),
      energyConsumption: energyConsumption.toFixed(1),
      blastingVolume: blastingVolume.toFixed(0),
      actualSpeed: actualSpeed.toFixed(2),
      overbreakRate,
      cycleAdvance: (depthM * 0.92).toFixed(2),
    };
  }, [params]);

  const getStatusLabel = (status) => {
    const map = {
      idle: '待机',
      positioning: '定位中',
      drilling: '钻孔中',
      returning: '回程中',
    };
    return map[status] || status;
  };

  return (
    <div className="panel control-panel">
      <div className="panel-header">
        <div className="panel-title">
          <div className="panel-title-icon"></div>
          实训控制台
        </div>
      </div>

      {/* View mode tabs */}
      <div className="panel-tabs">
        {VIEW_MODES.map(mode => (
          <button
            key={mode.id}
            className={`panel-tab ${viewMode === mode.id ? 'active' : ''}`}
            onClick={() => setViewMode(mode.id)}
          >
            {mode.icon} {mode.label}
          </button>
        ))}
      </div>

      <div className="panel-body">
        {/* Normal/Explode mode: drill params */}
        {viewMode !== 'console' && (
          <>
            {/* 钻臂状态 */}
            <div className="control-group">
              <div className="control-group-title">钻臂状态</div>
              <div className="arm-status-grid">
                <div className="arm-status-card left">
                  <div className="arm-status-name">1号臂（左）</div>
                  <div className={`arm-status-state ${drillState.left.status}`}>
                    {getStatusLabel(drillState.left.status)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {drillState.left.progress.toFixed(0)}%
                  </div>
                </div>
                <div className="arm-status-card center">
                  <div className="arm-status-name">2号臂（中）</div>
                  <div className={`arm-status-state ${drillState.center.status}`}>
                    {getStatusLabel(drillState.center.status)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {drillState.center.progress.toFixed(0)}%
                  </div>
                </div>
                <div className="arm-status-card right">
                  <div className="arm-status-name">3号臂（右）</div>
                  <div className={`arm-status-state ${drillState.right.status}`}>
                    {getStatusLabel(drillState.right.status)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {drillState.right.progress.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Explode mode specific: parts list */}
            {viewMode === 'explode' && (
              <div className="control-group">
                <div className="control-group-title">部件结构认知</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.5' }}>
                  点击下方部件名称或直接点击3D模型中的部件，查看详细结构说明
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}>
                  {PARTS_LIST.map(part => (
                    <div
                      key={part.id}
                      style={{
                        padding: '6px 10px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.15s',
                      }}
                      onClick={() => onSelectPart && onSelectPart(part.id)}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'var(--accent-amber)';
                        e.currentTarget.style.background = 'var(--bg-elevated)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.background = 'var(--bg-card)';
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)' }}>{part.name}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{part.category}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 钻孔参数 */}
            <div className="control-group">
              <div className="control-group-title">钻孔参数</div>

              <div className="control-item">
                <div className="control-label-row">
                  <span className="control-label">钻孔深度</span>
                  <span className="control-value">{params.drillDepth.toFixed(1)} m</span>
                </div>
                <input
                  type="range"
                  className="control-slider"
                  min="3"
                  max="6.18"
                  step="0.1"
                  value={params.drillDepth}
                  onChange={e => updateParam('drillDepth', parseFloat(e.target.value))}
                />
              </div>

              <div className="control-item">
                <div className="control-label-row">
                  <span className="control-label">钻孔直径</span>
                  <span className="control-value">{params.drillDiameter} mm</span>
                </div>
                <input
                  type="range"
                  className="control-slider"
                  min="45"
                  max="127"
                  step="1"
                  value={params.drillDiameter}
                  onChange={e => updateParam('drillDiameter', parseFloat(e.target.value))}
                />
              </div>

              <div className="control-item">
                <div className="control-label-row">
                  <span className="control-label">推进力</span>
                  <span className="control-value">{params.thrustForce.toFixed(1)} kN</span>
                </div>
                <input
                  type="range"
                  className="control-slider"
                  min="15"
                  max="23"
                  step="0.5"
                  value={params.thrustForce}
                  onChange={e => updateParam('thrustForce', parseFloat(e.target.value))}
                />
              </div>

              <div className="control-item">
                <div className="control-label-row">
                  <span className="control-label">冲击功率</span>
                  <span className="control-value">{params.impactPower} kW</span>
                </div>
                <input
                  type="range"
                  className="control-slider"
                  min="20"
                  max="31"
                  step="0.5"
                  value={params.impactPower}
                  onChange={e => updateParam('impactPower', parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* 钻臂姿态 */}
            <div className="control-group">
              <div className="control-group-title">钻臂姿态</div>

              <div className="control-item">
                <div className="control-label-row">
                  <span className="control-label">举升角度 (+65°/-30°)</span>
                  <span className="control-value">{params.liftAngle}°</span>
                </div>
                <input
                  type="range"
                  className="control-slider"
                  min="-30"
                  max="65"
                  step="1"
                  value={params.liftAngle}
                  onChange={e => updateParam('liftAngle', parseFloat(e.target.value))}
                />
              </div>

              <div className="control-item">
                <div className="control-label-row">
                  <span className="control-label">摆动角度 (±45°)</span>
                  <span className="control-value">{params.swingAngle}°</span>
                </div>
                <input
                  type="range"
                  className="control-slider"
                  min="-45"
                  max="45"
                  step="1"
                  value={params.swingAngle}
                  onChange={e => updateParam('swingAngle', parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* 围岩参数 */}
            <div className="control-group">
              <div className="control-group-title">围岩参数</div>

              <div className="control-item">
                <select
                  className="control-select"
                  value={params.rockGrade}
                  onChange={e => updateParam('rockGrade', parseInt(e.target.value))}
                >
                  {ROCK_GRADES.map(g => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 仿真指标 */}
            <div className="control-group">
              <div className="control-group-title">仿真指标</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <MetricMini label="单孔时间" value={metrics.singleHoleTimeStr} unit="min" color="amber" />
                <MetricMini label="钻进速度" value={metrics.actualSpeed} unit="m/min" color="amber" />
                <MetricMini label="总孔数" value={metrics.totalHoles} unit="个" color="blue" />
                <MetricMini label="总时长" value={metrics.totalDrillTime} unit="min" color="blue" />
                <MetricMini label="能耗" value={metrics.energyConsumption} unit="kWh" color="green" />
                <MetricMini label="爆破方量" value={metrics.blastingVolume} unit="m³" color="green" />
              </div>
            </div>

            {/* 仿真控制按钮 */}
            <div className="sim-btn-group">
              <button
                className={`sim-btn primary ${isSimulating ? 'running' : ''}`}
                onClick={onSimulate}
              >
                {isSimulating ? '停止仿真' : '开始仿真'}
              </button>
            </div>
          </>
        )}

        {/* Console mode: show console panel */}
        {viewMode === 'console' && (
          <div style={{ padding: '4px 0' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.5' }}>
              拖动操纵杆控制钻臂运动，点击按钮和旋钮调整参数
            </div>
            <ConsolePanel
              selectedArm="center"
              params={params}
              onAction={(action, value) => {
                // Handle console actions
                if (action === 'joystick' && value) {
                  // Map joystick to arm pose
                  updateParam('liftAngle', Math.round(20 + value.y * 35));
                  updateParam('swingAngle', Math.round(value.x * 30));
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function MetricMini({ label, value, unit, color = 'amber' }) {
  const colorMap = {
    amber: 'var(--accent-amber)',
    blue: 'var(--accent-blue)',
    green: 'var(--accent-green)',
  };
  return (
    <div style={{
      background: 'var(--bg-card)',
      padding: '6px 8px',
      borderRadius: '4px',
      border: '1px solid var(--border-color)',
    }}>
      <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{
        fontSize: '14px',
        fontWeight: '700',
        color: colorMap[color],
        fontFamily: 'monospace',
        lineHeight: '1.2',
      }}>
        {value}<span style={{ fontSize: '9px', fontWeight: '400', color: 'var(--text-muted)' }}> {unit}</span>
      </div>
    </div>
  );
}

Object.assign(window, { ControlPanel, ROCK_GRADES, VIEW_MODES, PARTS_LIST });
