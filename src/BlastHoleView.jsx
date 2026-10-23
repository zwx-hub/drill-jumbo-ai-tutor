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
