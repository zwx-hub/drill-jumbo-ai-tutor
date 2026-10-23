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
