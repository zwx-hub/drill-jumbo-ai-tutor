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
