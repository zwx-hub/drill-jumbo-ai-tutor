// ===== bundle part 2/3 =====
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


// ===== DataDashboard.jsx =====
/* ============================================================
   数据分析看板组件
   包含钻孔效率曲线、三臂协同时间轴、超欠挖控制、能耗统计
   ============================================================ */

function EChart({ option, style }) {
  const ref = React.useRef(null);
  const chartRef = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !window.echarts) return;
    const chart = echarts.init(el);
    chartRef.current = chart;
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(el);
    return () => {
      resizeObserver.disconnect();
      chart.dispose();
    };
  }, []);
  React.useEffect(() => {
    if (chartRef.current && option) {
      chartRef.current.setOption(option, true);
    }
  }, [option]);
  return <div ref={ref} style={{ width: '100%', height: '100%', minHeight: 200, ...style }} />;
}

function DataDashboard({ params, drillState, isSimulating, trainingMode = 'free' }) {
  // Calculate metrics
  const metrics = React.useMemo(() => {
    const rockFactors = { 1: 0.5, 2: 0.7, 3: 1.0, 4: 1.4, 5: 2.0 };
    const rf = rockFactors[params.rockGrade] || 1.0;
    const baseSpeed = 1.0;
    const powerFactor = params.impactPower / 29;
    const thrustFactor = params.thrustForce / 21;
    const speed = baseSpeed * powerFactor * thrustFactor * 0.4 / rf;
    const actualSpeed = Math.max(0.2, Math.min(2.5, speed));
    const singleHoleTime = params.drillDepth / actualSpeed;

    const sectionArea = 120;
    const holeSpacing = params.drillDiameter < 60 ? 0.6 : 0.8;
    const totalHoles = Math.round(sectionArea / (holeSpacing * holeSpacing) * 0.4);
    const coordinationFactor = 0.88;
    const totalDrillTime = (totalHoles * singleHoleTime / 3) / coordinationFactor;
    const powerKW = params.impactPower * 3 + 180 * 0.3;
    const energyConsumption = powerKW * (totalDrillTime / 60);
    const blastingVolume = sectionArea * params.drillDepth * 0.92;
    const cycleAdvance = params.drillDepth * 0.92;

    return {
      actualSpeed,
      singleHoleTime,
      totalHoles,
      totalDrillTime,
      energyConsumption,
      blastingVolume,
      cycleAdvance,
      overbreakRate: params.drillDiameter > 55 ? 7.5 : 4.8,
      underbreakRate: 2.1,
    };
  }, [params]);

  // Drilling efficiency curve
  const efficiencyOption = React.useMemo(() => {
    // Generate efficiency curve: drilling speed vs depth for 3 arms
    const depthPoints = [];
    const leftSpeed = [];
    const centerSpeed = [];
    const rightSpeed = [];

    for (let d = 0; d <= params.drillDepth; d += 0.2) {
      depthPoints.push(d.toFixed(1));
      // Speed varies slightly with depth due to increased friction
      const depthFactor = 1 - d * 0.02;
      const base = metrics.actualSpeed;
      leftSpeed.push(+(base * depthFactor * 0.95 + Math.random() * 0.05).toFixed(2));
      centerSpeed.push(+(base * depthFactor * 1.02 + Math.random() * 0.05).toFixed(2));
      rightSpeed.push(+(base * depthFactor * 0.97 + Math.random() * 0.05).toFixed(2));
    }

    return {
      backgroundColor: 'transparent',
      grid: { left: '12%', right: '5%', top: '15%', bottom: '18%' },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(26, 29, 36, 0.95)',
        borderColor: '#363c4a',
        textStyle: { color: '#e8eaed', fontSize: 11 },
        formatter: (params) => {
          const depth = params[0].axisValue;
          let html = `<div style="font-weight:600;margin-bottom:4px">深度 ${depth} m</div>`;
          params.forEach(p => {
            html += `<div style="display:flex;align-items:center;gap:6px">
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
              <span>${p.seriesName}: ${p.value} m/min</span>
            </div>`;
          });
          return html;
        }
      },
      legend: {
        data: ['左钻臂', '中钻臂', '右钻臂'],
        top: 2,
        right: 8,
        textStyle: { color: '#9aa0a6', fontSize: 10 },
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: 'category',
        data: depthPoints,
        name: '深度 (m)',
        nameTextStyle: { color: '#6b7280', fontSize: 10 },
        axisLine: { lineStyle: { color: '#363c4a' } },
        axisLabel: { color: '#6b7280', fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '钻进速度 m/min',
        nameTextStyle: { color: '#6b7280', fontSize: 10 },
        axisLine: { lineStyle: { color: '#363c4a' } },
        axisLabel: { color: '#6b7280', fontSize: 10 },
        splitLine: { lineStyle: { color: '#2a2f3a', type: 'dashed' } },
      },
      series: [
        {
          name: '左钻臂',
          type: 'line',
          data: leftSpeed,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#ef4444', width: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239, 68, 68, 0.3)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.02)' },
            ]),
          },
        },
        {
          name: '中钻臂',
          type: 'line',
          data: centerSpeed,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#f59e0b', width: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.02)' },
            ]),
          },
        },
        {
          name: '右钻臂',
          type: 'line',
          data: rightSpeed,
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#3b82f6', width: 1.5 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.02)' },
            ]),
          },
        },
      ],
    };
  }, [params.drillDepth, metrics.actualSpeed, params.rockGrade, params.impactPower]);

  // Three-arm timeline (Gantt-style)
  const timelineOption = React.useMemo(() => {
    // Simulated timeline for one cycle
    const phases = [
      { name: '台车定位', start: 0, duration: 3, color: '#6b7280' },
      { name: '展开钻臂', start: 3, duration: 2, color: '#8b5cf6' },
      { name: '开孔定位', start: 5, duration: 3, color: '#f59e0b' },
      { name: '掏槽眼', start: 8, duration: 15, color: '#ef4444' },
      { name: '辅助眼', start: 23, duration: 30, color: '#f59e0b' },
      { name: '周边眼', start: 53, duration: 20, color: '#10b981' },
      { name: '清孔移位', start: 73, duration: 5, color: '#3b82f6' },
    ];

    const armNames = ['左钻臂', '中钻臂', '右钻臂'];
    const seriesData = [];

    // Each arm does similar sequence but with slight offsets
    armNames.forEach((arm, armIdx) => {
      const offset = armIdx * 0.5; // stagger start
      phases.forEach((phase, phaseIdx) => {
        // Some phases are shared, some are arm-specific
        let actualStart = phase.start + offset;
        let actualDur = phase.duration;

        // Center arm doesn't do cut holes (left+right do)
        if (phase.name === '掏槽眼' && armIdx === 1) {
          actualDur = phase.duration * 0.3;
        }
        // Center arm does more perimeter (top)
        if (phase.name === '周边眼' && armIdx === 1) {
          actualDur = phase.duration * 1.2;
        }
        // Left/right do more bottom perimeter
        if (phase.name === '周边眼' && armIdx !== 1) {
          actualDur = phase.duration * 0.9;
        }

        seriesData.push({
          name: `${arm} - ${phase.name}`,
          value: [armIdx, actualStart, actualStart + actualDur],
          itemStyle: { color: phase.color, opacity: 0.85 },
        });
      });
    });

    return {
      backgroundColor: 'transparent',
      grid: { left: '18%', right: '5%', top: '10%', bottom: '18%' },
      tooltip: {
        backgroundColor: 'rgba(26, 29, 36, 0.95)',
        borderColor: '#363c4a',
        textStyle: { color: '#e8eaed', fontSize: 11 },
        formatter: (params) => {
          const d = params.data;
          return `<div style="font-weight:600">${d.name}</div>
            <div>开始: ${d.value[1].toFixed(1)} min</div>
            <div>结束: ${d.value[2].toFixed(1)} min</div>
            <div>时长: ${(d.value[2] - d.value[1]).toFixed(1)} min</div>`;
        }
      },
      xAxis: {
        type: 'value',
        name: '时间 (min)',
        nameTextStyle: { color: '#6b7280', fontSize: 10 },
        min: 0,
        max: 80,
        axisLine: { lineStyle: { color: '#363c4a' } },
        axisLabel: { color: '#6b7280', fontSize: 10 },
        splitLine: { lineStyle: { color: '#2a2f3a', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: armNames,
        axisLine: { lineStyle: { color: '#363c4a' } },
        axisLabel: { color: '#9aa0a6', fontSize: 10 },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'custom',
          renderItem: (params, api) => {
            const categoryIndex = api.value(0);
            const start = api.coord([api.value(1), categoryIndex]);
            const end = api.coord([api.value(2), categoryIndex]);
            const height = api.size([0, 1])[1] * 0.6;
            return {
              type: 'rect',
              shape: {
                x: start[0],
                y: start[1] - height / 2,
                width: end[0] - start[0],
                height: height,
              },
              style: api.style(),
            };
          },
          encode: {
            x: [1, 2],
            y: 0,
          },
          data: seriesData,
        },
      ],
    };
  }, [params.drillDepth, params.rockGrade]);

  // Overbreak / Underbreak control (gauge-style bar)
  const overbreakOption = React.useMemo(() => {
    return {
      backgroundColor: 'transparent',
      grid: { left: '5%', right: '15%', top: '10%', bottom: '10%' },
      tooltip: {
        backgroundColor: 'rgba(26, 29, 36, 0.95)',
        borderColor: '#363c4a',
        textStyle: { color: '#e8eaed', fontSize: 11 },
      },
      xAxis: {
        type: 'value',
        max: 15,
        axisLine: { lineStyle: { color: '#363c4a' } },
        axisLabel: { color: '#6b7280', fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#2a2f3a', type: 'dashed' } },
      },
      yAxis: {
        type: 'category',
        data: ['超挖率', '欠挖率'],
        axisLine: { lineStyle: { color: '#363c4a' } },
        axisLabel: { color: '#9aa0a6', fontSize: 11 },
        splitLine: { show: false },
      },
      series: [
        {
          type: 'bar',
          data: [
            { value: metrics.overbreakRate, itemStyle: { color: '#ef4444' } },
            { value: metrics.underbreakRate, itemStyle: { color: '#f59e0b' } },
          ],
          barWidth: 16,
          label: {
            show: true,
            position: 'right',
            color: '#e8eaed',
            fontSize: 11,
            formatter: '{c}%',
          },
          markLine: {
            silent: true,
            symbol: 'none',
            lineStyle: { color: '#10b981', type: 'dashed', width: 1 },
            data: [
              { xAxis: 5, label: { formatter: '合格线', color: '#10b981', fontSize: 9, position: 'insideEndTop' } }
            ],
          },
        },
      ],
    };
  }, [metrics.overbreakRate, metrics.underbreakRate]);

  // Energy consumption stats
  const energyOption = React.useMemo(() => {
    const totalKWh = metrics.energyConsumption;
    const impactEnergy = totalKWh * 0.55;
    const rotationEnergy = totalKWh * 0.2;
    const hydraulicEnergy = totalKWh * 0.15;
    const chassisEnergy = totalKWh * 0.1;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(26, 29, 36, 0.95)',
        borderColor: '#363c4a',
        textStyle: { color: '#e8eaed', fontSize: 11 },
        formatter: (params) => `${params.name}: ${params.value.toFixed(1)} kWh (${params.percent}%)`,
      },
      legend: {
        orient: 'vertical',
        right: 5,
        top: 'center',
        textStyle: { color: '#9aa0a6', fontSize: 10 },
        itemWidth: 10,
        itemHeight: 10,
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: true,
          label: { show: false },
          labelLine: { show: false },
          data: [
            { value: impactEnergy, name: '冲击系统', itemStyle: { color: '#ef4444' } },
            { value: rotationEnergy, name: '旋转系统', itemStyle: { color: '#f59e0b' } },
            { value: hydraulicEnergy, name: '液压系统', itemStyle: { color: '#3b82f6' } },
            { value: chassisEnergy, name: '底盘动力', itemStyle: { color: '#10b981' } },
          ],
        },
      ],
      graphic: [
        {
          type: 'text',
          left: '30%',
          top: '42%',
          style: {
            text: totalKWh.toFixed(1),
            fill: '#e8eaed',
            fontSize: 16,
            fontWeight: 'bold',
            textAlign: 'center',
          },
        },
        {
          type: 'text',
          left: '30%',
          top: '55%',
          style: {
            text: 'kWh/循环',
            fill: '#6b7280',
            fontSize: 9,
            textAlign: 'center',
          },
        },
      ],
    };
  }, [metrics.energyConsumption]);

  return (
    <div className="dashboard-panel">
      {/* KPI 卡片 */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span>核心指标</span>
        </div>
        <div className="dash-card-body">
          <div className="kpi-grid">
            <div className="kpi-item">
              <div className="kpi-value">{metrics.cycleAdvance}<span className="kpi-unit">m</span></div>
              <div className="kpi-label">单循环进尺</div>
            </div>
            <div className="kpi-item">
              <div className="kpi-value">{metrics.totalDrillTime.toFixed(0)}<span className="kpi-unit">min</span></div>
              <div className="kpi-label">循环总时长</div>
            </div>
            <div className="kpi-item">
              <div className="kpi-value">{metrics.blastingVolume.toFixed(0)}<span className="kpi-unit">m³</span></div>
              <div className="kpi-label">爆破方量</div>
            </div>
            <div className="kpi-item">
              <div className="kpi-value">{metrics.totalHoles}<span className="kpi-unit">孔</span></div>
              <div className="kpi-label">总炮孔数</div>
            </div>
          </div>
        </div>
      </div>

      {/* Drilling efficiency curve */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span>钻孔效率曲线</span>
        </div>
        <div className="dash-card-body">
          <EChart option={efficiencyOption} />
        </div>
      </div>

      {/* Three-arm timeline */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span>三臂协同时间轴</span>
        </div>
        <div className="dash-card-body">
          <EChart option={timelineOption} />
        </div>
      </div>

      {/* Energy + overbreak combined - use blast hole view here */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span>掌子面布孔图</span>
        </div>
        <div className="dash-card-body">
          <BlastHoleView params={params} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DataDashboard, EChart });


// ===== BlastHoleView.jsx =====
/* ============================================================
   掌子面布孔可视化组件
   展示掏槽眼、辅助眼、周边眼布置，以及三臂分工
   ============================================================ */

function BlastHoleView({ params }) {
  // Tunnel face dimensions (mm -> scale to view)
  const viewWidth = 280;
  const viewHeight = 240;
  const cx = viewWidth / 2;
  const cy = viewHeight / 2 + 10;
  const scale = 0.018; // mm to px

  // Tunnel section parameters (mm)
  const tunnelWidth = 14000;
  const tunnelHeight = 13000;
  const archRadius = 6500;
  const sideWallHeight = 3500;

  const scaledWidth = tunnelWidth * scale;
  const scaledSideWall = sideWallHeight * scale;
  const scaledArchR = archRadius * scale;

  // Generate hole patterns
  const holes = React.useMemo(() => generateHoles(params), [params.drillDiameter, params.rockGrade]);

  function generateHoles(params) {
    const result = {
      cut: { left: [], center: [], right: [] },
      assist: { left: [], center: [], right: [] },
      perimeter: { left: [], center: [], right: [] },
    };

    // Cut holes (掏槽眼) - 中心区域，楔形/直眼
    const cutRowCount = 4;
    const cutColCount = 5;
    const cutSpacingX = 500; // mm
    const cutSpacingY = 500;
    const cutStartY = -1500;

    for (let row = 0; row < cutRowCount; row++) {
      for (let col = 0; col < cutColCount; col++) {
        const x = (col - (cutColCount - 1) / 2) * cutSpacingX;
        const y = cutStartY + row * cutSpacingY;
        // Assign to left/center/right arms
        let arm = 'center';
        if (x < -400) arm = 'left';
        else if (x > 400) arm = 'right';
        result.cut[arm].push({ x, y, type: 'cut', arm });
      }
    }

    // Assist holes (辅助眼) - 中间环形区域
    const assistRings = 3;
    for (let ring = 0; ring < assistRings; ring++) {
      const ringRadius = 2500 + ring * 1000;
      const numHoles = Math.floor(2 * Math.PI * ringRadius / 800);
      for (let i = 0; i < numHoles; i++) {
        const angle = (i / numHoles) * Math.PI * 2;
        const x = Math.cos(angle) * ringRadius;
        const y = Math.sin(angle) * ringRadius * 0.7;
        // Only upper 2/3 of the ellipse (below arch)
        if (y > -2500 && y < 3000) {
          let arm = 'center';
          if (x < -1000) arm = 'left';
          else if (x > 1000) arm = 'right';
          result.assist[arm].push({ x, y, type: 'assist', arm });
        }
      }
    }

    // Perimeter holes (周边眼) - 轮廓线上
    // Bottom
    const bottomY = -3000;
    const bottomWidth = 6500;
    const perimSpacing = 500;
    const numBottom = Math.floor(bottomWidth * 2 / perimSpacing);
    for (let i = 0; i <= numBottom; i++) {
      const x = -bottomWidth + (i / numBottom) * bottomWidth * 2;
      const y = bottomY;
      let arm = x < 0 ? 'left' : 'right';
      result.perimeter[arm].push({ x, y, type: 'perimeter', arm });
    }

    // Arch
    const archNum = 24;
    for (let i = 0; i <= archNum; i++) {
      const angle = (i / archNum) * Math.PI;
      const x = Math.cos(Math.PI - angle) * scaledArchR / scale;
      const y = Math.sin(angle) * scaledArchR / scale + 1000;
      let arm;
      if (i < archNum * 0.3) arm = 'left';
      else if (i > archNum * 0.7) arm = 'right';
      else arm = 'center';
      result.perimeter[arm].push({ x, y, type: 'perimeter', arm });
    }

    // Side walls
    for (let side of [-1, 1]) {
      const wallX = side * 6500;
      const numWallHoles = 6;
      for (let i = 1; i < numWallHoles; i++) {
        const y = -3000 + (i / numWallHoles) * 4000;
        const arm = side < 0 ? 'left' : 'right';
        result.perimeter[arm].push({ x: wallX, y, type: 'perimeter', arm });
      }
    }

    return result;
  }

  // Convert tunnel coordinates to view coordinates
  const toViewX = (xMm) => cx + xMm * scale;
  const toViewY = (yMm) => cy - yMm * scale;

  const getHoleColor = (type) => {
    if (type === 'cut') return '#ef4444';
    if (type === 'assist') return '#f59e0b';
    return '#10b981';
  };

  const getArmStroke = (arm) => {
    if (arm === 'left') return '#ef4444';
    if (arm === 'right') return '#3b82f6';
    return '#f59e0b';
  };

  // Build tunnel profile path
  const tunnelPath = React.useMemo(() => {
    const bottomLeftX = toViewX(-6500);
    const bottomRightX = toViewX(6500);
    const bottomY = toViewY(-3000);
    const archTopY = toViewY(5500);
    const archCx = cx;
    const archCy = toViewY(-1000);

    return `M ${bottomLeftX} ${bottomY}
            L ${bottomLeftX} ${toViewY(1000)}
            A ${scaledArchR} ${scaledArchR} 0 0 1 ${bottomRightX} ${toViewY(1000)}
            L ${bottomRightX} ${bottomY}
            Z`;
  }, []);

  // Count holes
  const countHoles = () => {
    let cut = 0, assist = 0, perimeter = 0;
    ['left', 'center', 'right'].forEach(arm => {
      cut += holes.cut[arm].length;
      assist += holes.assist[arm].length;
      perimeter += holes.perimeter[arm].length;
    });
    return { cut, assist, perimeter, total: cut + assist + perimeter };
  };
  const counts = countHoles();

  return (
    <div className="blasthole-view">
      <svg className="blast-hole-svg" viewBox={`0 0 ${viewWidth} ${viewHeight}`} preserveAspectRatio="xMidYMid meet">
        {/* Background grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#2a2f3a" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width={viewWidth} height={viewHeight} fill="url(#grid)" />

        {/* Tunnel outline */}
        <path
          d={tunnelPath}
          fill="#1a1d24"
          stroke="#4b5563"
          strokeWidth="1.5"
        />

        {/* Center line (vertical) */}
        <line x1={cx} y1={viewHeight - 20} x2={cx} y2={20} stroke="#374151" strokeWidth="0.5" strokeDasharray="4,4" />

        {/* Perimeter holes */}
        {['left', 'center', 'right'].map(arm =>
          holes.perimeter[arm].map((hole, i) => (
            <circle
              key={`perim-${arm}-${i}`}
              cx={toViewX(hole.x)}
              cy={toViewY(hole.y)}
              r="3"
              fill={getHoleColor('perimeter')}
              stroke={getArmStroke(arm)}
              strokeWidth="1"
              opacity="0.9"
            />
          ))
        )}

        {/* Assist holes */}
        {['left', 'center', 'right'].map(arm =>
          holes.assist[arm].map((hole, i) => (
            <circle
              key={`assist-${arm}-${i}`}
              cx={toViewX(hole.x)}
              cy={toViewY(hole.y)}
              r="3"
              fill={getHoleColor('assist')}
              stroke={getArmStroke(arm)}
              strokeWidth="1"
              opacity="0.9"
            />
          ))
        )}

        {/* Cut holes */}
        {['left', 'center', 'right'].map(arm =>
          holes.cut[arm].map((hole, i) => (
            <circle
              key={`cut-${arm}-${i}`}
              cx={toViewX(hole.x)}
              cy={toViewY(hole.y)}
              r="4"
              fill={getHoleColor('cut')}
              stroke={getArmStroke(arm)}
              strokeWidth="1.5"
              opacity="0.95"
            />
          ))
        )}

        {/* Drill arm zone boundaries (subtle) */}
        <line x1={cx - 50} y1={viewHeight - 10} x2={cx - 50} y2={20} stroke="#ef4444" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.3" />
        <line x1={cx + 50} y1={viewHeight - 10} x2={cx + 50} y2={20} stroke="#3b82f6" strokeWidth="0.5" strokeDasharray="2,3" opacity="0.3" />

        {/* Scale bar */}
        <g transform={`translate(${viewWidth - 70}, ${viewHeight - 15})`}>
          <line x1="0" y1="0" x2="50" y2="0" stroke="#6b7280" strokeWidth="1" />
          <line x1="0" y1="-3" x2="0" y2="3" stroke="#6b7280" strokeWidth="1" />
          <line x1="50" y1="-3" x2="50" y2="3" stroke="#6b7280" strokeWidth="1" />
          <text x="25" y="-5" fill="#6b7280" fontSize="8" textAnchor="middle">2.5m</text>
        </g>

        {/* Hole count label */}
        <text x="10" y="18" fill="#9ca3af" fontSize="10">
          总孔数: {counts.total}
        </text>
      </svg>
    </div>
  );
}

Object.assign(window, { BlastHoleView });


// ===== ConsolePanel.jsx =====
/* ============================================================
   三臂凿岩台车操作台数字孪生面板
   基于中铁装备DJ3G真实操作台布局
   ============================================================ */

function ConsolePanel({ selectedArm = 'center', onArmChange, onAction, params }) {
  const [gauges, setGauges] = React.useState({
    rotary: 120,    // 回转压力 bar
    impact: 180,    // 冲击压力 bar
    thrust: 150,    // 推进压力 bar
    air: 6,         // 气压 bar
    water: 12,      // 水压 MPa
  });

  const [buttons, setButtons] = React.useState({
    pumpOn: false,
    lubrication: false,
    highImpact: false, // 高冲/低冲
    emergencyStop: false,
    bigHole: false,
    water: false,
    forceImpact: false,
  });

  const [knobs, setKnobs] = React.useState({
    rotary: 50,    // 回转模式 0-100
    impact: 60,    // 冲击模式
    thrust: 70,    // 推进模式
    thrustAdjust: 40, // 推进压力调节
  });

  const [joysticks, setJoysticks] = React.useState({
    main: { x: 0, y: 0 }, // 主操纵杆（大臂上下/左右）
  });

  // Simulate gauge pressure changes
  React.useEffect(() => {
    if (!buttons.pumpOn) {
      setGauges({ rotary: 0, impact: 0, thrust: 0, air: 0, water: 0 });
      return;
    }
    const interval = setInterval(() => {
      setGauges(prev => ({
        rotary: buttons.rotaryMode === 0 ? 0 : 80 + Math.random() * 60,
        impact: buttons.highImpact ? 160 + Math.random() * 50 : 100 + Math.random() * 40,
        thrust: 100 + Math.random() * 80,
        air: 5.5 + Math.random() * 1.5,
        water: 10 + Math.random() * 4,
      }));
    }, 300);
    return () => clearInterval(interval);
  }, [buttons.pumpOn, buttons.highImpact]);

  const toggleButton = (key) => {
    if (key === 'emergencyStop') {
      // Emergency stop - toggle with confirmation feel
      setButtons(prev => ({
        ...prev,
        emergencyStop: !prev.emergencyStop,
        pumpOn: prev.emergencyStop ? prev.pumpOn : false,
      }));
      if (onAction) onAction('emergency', !buttons.emergencyStop);
      return;
    }
    setButtons(prev => ({ ...prev, [key]: !prev[key] }));
    if (onAction) onAction(key, !buttons[key]);
  };

  const handleKnob = (key, delta) => {
    setKnobs(prev => ({
      ...prev,
      [key]: Math.max(0, Math.min(100, prev[key] + delta))
    }));
  };

  // Pressure gauge SVG component
  const PressureGauge = ({ value, max, label, unit = 'bar', color = '#ef4444' }) => {
    const percentage = Math.min(value / max, 1);
    const angle = -120 + percentage * 240; // -120° to 120°

    // Tick marks
    const ticks = [];
    for (let i = 0; i <= 10; i++) {
      const tAngle = -120 + i * 24;
      const rad = (tAngle - 90) * Math.PI / 180;
      const innerR = 18;
      const outerR = 22;
      ticks.push(
        <line
          key={i}
          x1={30 + Math.cos(rad) * innerR}
          y1={30 + Math.sin(rad) * innerR}
          x2={30 + Math.cos(rad) * outerR}
          y2={30 + Math.sin(rad) * outerR}
          stroke={i % 5 === 0 ? '#e8eaed' : '#6b7280'}
          strokeWidth={i % 5 === 0 ? 1.5 : 0.8}
        />
      );
    }

    // Needle
    const needleRad = (angle - 90) * Math.PI / 180;
    const needleLen = 16;

    return (
      <div className="pressure-gauge">
        <svg className="gauge-svg" viewBox="0 0 60 36">
          {/* Gauge face */}
          <path
            d="M 8 30 A 22 22 0 0 1 52 30"
            fill="none"
            stroke="#2a1a1a"
            strokeWidth="5"
          />
          {/* Colored arc */}
          <path
            d="M 8 30 A 22 22 0 0 1 52 30"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${percentage * 70} 100`}
            opacity="0.8"
          />
          {/* Ticks */}
          {ticks}
          {/* Needle */}
          <line
            x1="30"
            y1="30"
            x2={30 + Math.cos(needleRad) * needleLen}
            y2={30 + Math.sin(needleRad) * needleLen}
            stroke="#f59e0b"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Center cap */}
          <circle cx="30" cy="30" r="2.5" fill="#1a1d24" stroke="#f59e0b" strokeWidth="1" />
          {/* Value text */}
          <text x="30" y="26" textAnchor="middle" fill="#e8eaed" fontSize="7" fontWeight="bold">
            {value.toFixed(0)}
          </text>
        </svg>
        <div className="gauge-label">{label}</div>
      </div>
    );
  };

  return (
    <div className="console-panel-container">
      <div className="console-frame-top">
        1号臂 · 2号臂 · 3号臂 操作控制台
      </div>

      <div className="console-main">
        {/* Pressure gauge row - 5 gauges per arm */}
        <div className="gauge-row">
          <PressureGauge value={gauges.rotary} max={250} label="回转压力" color="#ef4444" />
          <PressureGauge value={gauges.impact} max={250} label="冲击压力" color="#f59e0b" />
          <PressureGauge value={gauges.thrust} max={250} label="推进压力" color="#3b82f6" />
          <PressureGauge value={gauges.air} max={10} label="气压表" unit="MPa" color="#10b981" />
          <PressureGauge value={gauges.water} max={20} label="水压表" unit="MPa" color="#06b6d4" />
        </div>

        {/* Main joystick */}
        <div className="joystick-row">
          <div className="joystick-col">
            <div className="joystick-main-label">大臂操纵杆</div>
            <div
              className="joystick-main"
              onMouseDown={(e) => startJoystickDrag(e, 'main')}
            >
              <div className="joystick-base"></div>
              <div
                className="joystick-stick"
                style={{
                  transform: `translateX(calc(-50% + ${joysticks.main.x * 12}px)) translateY(${ -joysticks.main.y * 10}px)`,
                }}
              >
                <div className="joystick-knob"></div>
              </div>
            </div>
            <div className="joystick-label-row">
              <span>左</span>
              <span>右</span>
            </div>
          </div>
        </div>

        {/* Sub-controls: 4 lever row + buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          {/* 4 small levers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center' }}>动作选择</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {['梁回转', '梁俯仰', '臂伸缩', '梁伸缩'].map((label, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div
                    style={{
                      width: '18px',
                      height: '24px',
                      background: 'radial-gradient(ellipse at center, #4a4d52, #1a1b1f)',
                      borderRadius: '3px',
                      border: '1px solid #2a2d32',
                      position: 'relative',
                      margin: '0 auto',
                      cursor: 'pointer',
                    }}
                    onClick={() => onAction && onAction('selectAction', label)}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '6px',
                        height: '10px',
                        background: '#6b7280',
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width: '1px', height: '40px', background: 'var(--border-color)' }} />

          {/* Pump buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ textAlign: 'center' }}>
                <button
                  className={`console-btn ${buttons.pumpOn ? 'green' : ''}`}
                  style={{ opacity: buttons.pumpOn ? 1 : 0.7 }}
                  onClick={() => toggleButton('pumpOn')}
                >
                  {buttons.pumpOn ? '●' : '○'}
                </button>
                <div className="console-btn-label">泵{buttons.pumpOn ? '起' : '停'}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  className={`console-btn red`}
                  onClick={() => toggleButton('pumpOn')}
                  style={{ opacity: !buttons.pumpOn ? 1 : 0.5 }}
                >
                  ●
                </button>
                <div className="console-btn-label">泵停</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ textAlign: 'center' }}>
                <button
                  className={`console-btn ${buttons.lubrication ? 'green' : ''}`}
                  style={{ opacity: buttons.lubrication ? 1 : 0.6, width: '22px', height: '22px', fontSize: '8px' }}
                  onClick={() => toggleButton('lubrication')}
                >
                  💧
                </button>
                <div className="console-btn-label">润滑</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  className={`console-btn emergency`}
                  style={{ fontSize: '8px' }}
                  onClick={() => toggleButton('emergencyStop')}
                >
                  急停
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* High/low impact + mode knobs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginTop: '4px' }}>
          {/* High/low impact toggle */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                padding: '4px 8px',
                background: buttons.highImpact
                  ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                  : 'var(--bg-elevated)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                fontSize: '9px',
                color: buttons.highImpact ? '#fff' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: '600',
              }}
              onClick={() => toggleButton('highImpact')}
            >
              高冲 / 低冲
            </div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {buttons.highImpact ? '高频冲击' : '低频冲击'}
            </div>
          </div>

          {/* Mode knobs */}
          <div className="knob-row">
            {[
              { key: 'rotary', label: '回转' },
              { key: 'impact', label: '冲击' },
              { key: 'thrust', label: '推进' },
            ].map(k => (
              <div key={k.key} className="knob-group">
                <div
                  className="knob"
                  style={{ transform: `rotate(${-135 + knobs[k.key] * 2.7}deg)` }}
                  onClick={() => handleKnob(k.key, 20)}
                  onContextMenu={(e) => { e.preventDefault(); handleKnob(k.key, -20); }}
                />
                <div className="knob-label">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Thrust pressure adjust */}
          <div className="knob-group">
            <div
              className="knob"
              style={{
                transform: `rotate(${-135 + knobs.thrustAdjust * 2.7}deg)`,
                background: 'radial-gradient(circle at 30% 30%, #f59e0b, #92400e)',
                borderColor: '#78350f',
              }}
              onClick={() => handleKnob('thrustAdjust', 10)}
              onContextMenu={(e) => { e.preventDefault(); handleKnob('thrustAdjust', -10); }}
            />
            <div className="knob-label">推进调节</div>
          </div>
        </div>

        {/* Bottom switches */}
        <div className="switch-panel" style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px' }}>功能开关</div>
          <div className="switch-grid">
            {[
              { key: 'bigHole', label: '大孔' },
              { key: 'water', label: '水气' },
              { key: 'forceImpact', label: '强制冲击' },
              { key: 'lubrication2', label: '润滑' },
            ].map(s => (
              <div key={s.key} className="switch-item">
                <div
                  className={`toggle-switch ${buttons[s.key] ? 'on' : ''}`}
                  onClick={() => toggleButton(s.key)}
                />
                <span className="switch-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  function startJoystickDrag(e, joystickKey) {
    e.preventDefault();
    const updateJoystick = (clientX, clientY) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = (clientX - cx) / (rect.width / 2);
      let dy = (clientY - cy) / (rect.height / 2);
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, -dy)); // invert Y
      setJoysticks(prev => ({
        ...prev,
        [joystickKey]: { x: dx, y: dy },
      }));
      // Notify parent
      if (onAction) onAction('joystick', { arm: selectedArm, x: dx, y: dy });
    };

    updateJoystick(e.clientX, e.clientY);

    const handleMove = (ev) => updateJoystick(ev.clientX, ev.clientY);
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      setJoysticks(prev => ({
        ...prev,
        [joystickKey]: { x: 0, y: 0 },
      }));
      if (onAction) onAction('joystick', { arm: selectedArm, x: 0, y: 0 });
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }
}

Object.assign(window, { ConsolePanel });


// ===== TrainingMode.jsx =====
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
     