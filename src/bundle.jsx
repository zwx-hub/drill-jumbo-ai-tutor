

// ===== Scene3D.jsx =====
/* ============================================================
   三臂凿岩台车 3D 场景组件
   支持爆炸视图、部件点击高亮、教学引导
   基于中铁装备DJ3G三臂凿岩台车结构
   ============================================================ */

const DrillScene = (() => {
  let scene, camera, renderer, controls;
  let drillRigGroup;
  let leftArm, centerArm, rightArm;
  let tunnelGroup;
  let animationId;
  let isSimulating = false;
  let simTime = 0;
  let raycaster, mouse;
  let selectedPart = null;
  let onPartSelect = null;
  let hasWebGL = true;
  let explosionMode = false;
  let explosionProgress = 0;

  // All parts with metadata for structural education
  const PARTS_METADATA = {
    chassis: {
      name: '轮式底盘',
      function: '承载整机，提供行走动力，采用四驱铰接式底盘，适应隧道内复杂路面条件。整机重量约50吨，底盘功率180kW。',
      connection: '螺栓连接 4处（底盘与主机架）',
      sensors: '车速传感器、转向角度传感器',
    },
    cabin: {
      name: '操作驾驶室',
      function: '操作员控制中心，配备全景玻璃窗，内有主控制台、座椅、方向盘，可观察掌子面作业情况。',
      connection: '减震螺栓连接 6处',
      sensors: '驾驶室倾角传感器、空调压力传感器',
    },
    baseJoint: {
      name: '大臂连接座',
      function: '钻臂与主机的连接基础，承受钻臂作业时的全部反力与力矩，采用高强度铸钢件。',
      connection: '胀销连接 2处 + 螺栓连接 8处',
      sensors: '底座压力传感器',
    },
    boom: {
      name: '基本臂体（大臂）',
      function: '钻臂主承载结构，采用高强度钢焊接箱型结构，可实现俯仰、摆动、伸缩三种运动。最大举升角度+65°/-30°，左右摆动±45°。',
      connection: '胀销连接 6处、螺栓连接 2处',
      sensors: '大臂竖直角度传感器、大臂水平角度传感器',
    },
    cylinder: {
      name: '大臂伸缩油缸',
      function: '驱动伸缩臂在基本臂体内伸缩，最大伸缩量≥2.5m。采用双作用液压油缸，带位移传感器实时反馈伸缩量。',
      connection: '销轴连接 2处',
      sensors: '油缸位移传感器、油压传感器',
    },
    telescopicArm: {
      name: '伸缩臂',
      function: '嵌套在基本臂体内的可伸缩结构，用于扩大作业范围，表面镀铬防腐，带有导向滑块。',
      connection: '滑动配合（导向铜套）',
      sensors: '伸缩位移传感器',
    },
    shortArm: {
      name: '短臂（T型梁连接臂）',
      function: '连接伸缩臂前端与T型梁，实现推进梁的俯仰与翻转补偿。',
      connection: '铰轴连接 2处',
      sensors: '短臂角度传感器',
    },
    tBeam: {
      name: 'T型梁（推进梁翻转架）',
      function: '推进梁的支撑与翻转机构，可使推进梁实现±180°翻转，满足不同角度钻孔需求。',
      connection: '回转支承连接',
      sensors: '推进梁翻转角度传感器',
    },
    feedBeam: {
      name: '推进梁',
      function: '凿岩机的导轨与推进机构，总长≥7000mm，推进补偿1800mm，钻臂补偿1600mm。通过液压马达驱动链条带动凿岩机沿导轨运动。',
      connection: '滑块导轨配合',
      sensors: '推进位移传感器、推进压力传感器',
    },
    rockDrill: {
      name: '凿岩机',
      function: '钻孔作业核心部件，冲击功率27~31kW，冲击频率≥4300次/min（约70Hz），旋转扭矩≥650N·m。将冲击能与旋转扭矩传递给钻杆。',
      connection: '螺栓连接 4处',
      sensors: '冲击压力传感器、回转压力传感器、转速传感器',
    },
    drillRod: {
      name: '钻杆与钻头',
      function: '传递冲击能量和旋转力矩至岩石，前端钻头采用硬质合金球齿，耐磨耐冲击。钻孔直径45~127mm。',
      connection: '螺纹连接（R32/T38/T45/T51）',
      sensors: '无（消耗件）',
    },
  };

  let params = {
    drillDepth: 5.0,
    drillDiameter: 48,
    thrustForce: 21,
    impactPower: 29,
    liftAngle: 30,
    swingAngle: 0,
    rockGrade: 3,
  };

  let drillState = {
    left: { progress: 0, status: 'idle', currentHole: 0 },
    center: { progress: 0, status: 'idle', currentHole: 0 },
    right: { progress: 0, status: 'idle', currentHole: 0 },
  };

  // Store part meshes for picking
  let pickableParts = [];

  function init(containerId, callbacks = {}) {
    onPartSelect = callbacks.onPartSelect || null;
    const container = document.getElementById(containerId);
    if (!container) return;

    // Check WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        hasWebGL = false;
        showNoWebGLMessage(container);
        return {
          updateParams, startSimulation, stopSimulation, getDrillState,
          setDrillProgress, hasWebGL: false,
          setExplosionMode: () => {},
          getExplosionMode: () => false,
        };
      }
    } catch (e) {
      hasWebGL = false;
      showNoWebGLMessage(container);
      return {
        updateParams, startSimulation, stopSimulation, getDrillState,
        setDrillProgress, hasWebGL: false,
        setExplosionMode: () => {},
        getExplosionMode: () => false,
      };
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c10);
    scene.fog = new THREE.Fog(0x0a0c10, 30, 80);

    // Camera
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 500);
    camera.position.set(14, 9, 20);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('three-canvas') });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 60;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.target.set(0, 3, 0);

    // Raycaster for picking
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    renderer.domElement.addEventListener('click', onCanvasClick);

    // Lighting
    setupLighting();

    // Tunnel environment
    createTunnel();

    // Drill rig
    createDrillRig();

    // Ground
    createGround();

    // Start animation loop
    animate();

    // Resize
    window.addEventListener('resize', onResize);

    return {
      updateParams,
      startSimulation,
      stopSimulation,
      getDrillState,
      setDrillProgress,
      hasWebGL: true,
      setExplosionMode,
      getExplosionMode: () => explosionMode,
      setArmPose,
      getSelectedPart: () => selectedPart,
      clearSelection: () => { selectedPart = null; updatePartHighlights(); },
      selectPartByName: (name) => {
        const part = pickableParts.find(p => p.userData.partId === name);
        if (part) {
          selectedPart = part;
          updatePartHighlights();
        }
      },
    };
  }

  function setupLighting() {
    const ambient = new THREE.AmbientLight(0x404550, 0.45);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff0e0, 0.85);
    dirLight.position.set(10, 20, 15);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -10;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x6b8cff, 0.3);
    fillLight.position.set(-10, 8, -10);
    scene.add(fillLight);

    const spot1 = new THREE.PointLight(0xffd699, 1.2, 30);
    spot1.position.set(0, 6, -8);
    scene.add(spot1);

    const spot2 = new THREE.PointLight(0xffaa55, 0.8, 20);
    spot2.position.set(-4, 3, -12);
    scene.add(spot2);

    const spot3 = new THREE.PointLight(0xffaa55, 0.8, 20);
    spot3.position.set(4, 3, -12);
    scene.add(spot3);
  }

  function createGround() {
    const geo = new THREE.PlaneGeometry(100, 100);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a2d33,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(60, 60, 0x3a3f4a, 0x2a2d33);
    grid.position.y = 0.01;
    scene.add(grid);
  }

  function createTunnel() {
    tunnelGroup = new THREE.Group();
    const tunnelLength = 40;
    const tunnelRadius = 7.5;
    const tunnelWidth = 14;

    const archGeo = new THREE.CylinderGeometry(tunnelRadius, tunnelRadius, tunnelLength, 32, 1, true, 0, Math.PI);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x4a4238,
      roughness: 0.95,
      metalness: 0.05,
      side: THREE.BackSide,
    });
    const arch = new THREE.Mesh(archGeo, rockMat);
    arch.rotation.z = Math.PI / 2;
    arch.rotation.y = Math.PI / 2;
    arch.position.set(0, tunnelRadius * 0.3, -tunnelLength / 2);
    tunnelGroup.add(arch);

    const leftWallGeo = new THREE.PlaneGeometry(tunnelLength, tunnelRadius * 0.7);
    const leftWall = new THREE.Mesh(leftWallGeo, rockMat);
    leftWall.position.set(-tunnelWidth / 2, tunnelRadius * 0.35, -tunnelLength / 2);
    leftWall.rotation.y = Math.PI / 2;
    tunnelGroup.add(leftWall);

    const rightWall = new THREE.Mesh(leftWallGeo, rockMat);
    rightWall.position.set(tunnelWidth / 2, tunnelRadius * 0.35, -tunnelLength / 2);
    rightWall.rotation.y = -Math.PI / 2;
    tunnelGroup.add(rightWall);

    // Tunnel face
    const faceShape = new THREE.Shape();
    faceShape.moveTo(-tunnelWidth / 2, 0);
    faceShape.lineTo(tunnelWidth / 2, 0);
    faceShape.lineTo(tunnelWidth / 2, tunnelRadius * 0.5);
    const archSteps = 16;
    for (let i = 0; i <= archSteps; i++) {
      const angle = (i / archSteps) * Math.PI;
      const x = Math.cos(angle) * tunnelRadius;
      const y = Math.sin(angle) * tunnelRadius + tunnelRadius * 0.5;
      faceShape.lineTo(x, y);
    }
    faceShape.lineTo(-tunnelWidth / 2, tunnelRadius * 0.5);
    faceShape.lineTo(-tunnelWidth / 2, 0);

    const faceGeo = new THREE.ShapeGeometry(faceShape);
    const faceMat = new THREE.MeshStandardMaterial({
      color: 0x5a4f40,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const tunnelFace = new THREE.Mesh(faceGeo, faceMat);
    tunnelFace.position.set(0, 0, -tunnelLength + 0.5);
    tunnelGroup.add(tunnelFace);

    // Rock bumps
    for (let i = 0; i < 25; i++) {
      const bumpGeo = new THREE.SphereGeometry(0.2 + Math.random() * 0.5, 6, 6);
      const bumpMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.2, 0.25 + Math.random() * 0.1),
        roughness: 0.95,
      });
      const bump = new THREE.Mesh(bumpGeo, bumpMat);
      const angle = Math.random() * Math.PI;
      const r = tunnelRadius - 0.3;
      bump.position.set(
        Math.cos(angle) * r,
        Math.sin(angle) * r + tunnelRadius * 0.5,
        -tunnelLength + 1 + Math.random() * 8
      );
      tunnelGroup.add(bump);
    }

    scene.add(tunnelGroup);
  }

  function createDrillRig() {
    drillRigGroup = new THREE.Group();

    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.6,
      metalness: 0.4,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x2a2d33,
      roughness: 0.5,
      metalness: 0.6,
    });

    // === Chassis ===
    const bodyGeo = new THREE.BoxGeometry(3, 1.8, 6);
    const body = new THREE.Mesh(bodyGeo, chassisMat);
    body.position.set(0, 1.4, 0);
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData = { partId: 'chassis', basePos: body.position.clone() };
    drillRigGroup.add(body);
    pickableParts.push(body);

    // Cabin
    const cabinGeo = new THREE.BoxGeometry(1.8, 1.6, 2);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.5,
      metalness: 0.3,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, 3.1, 1);
    cabin.castShadow = true;
    cabin.userData = { partId: 'cabin', basePos: cabin.position.clone() };
    drillRigGroup.add(cabin);
    pickableParts.push(cabin);

    // Cabin windows
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x1a2530,
      roughness: 0.2,
      metalness: 0.8,
    });
    const winGeo = new THREE.BoxGeometry(1.7, 0.8, 0.05);
    const winFront = new THREE.Mesh(winGeo, windowMat);
    winFront.position.set(0, 3.3, 2.02);
    drillRigGroup.add(winFront);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.5, 16);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.2,
    });
    const wheelPositions = [
      [-1.5, 0.7, 2], [1.5, 0.7, 2],
      [-1.5, 0.7, -2], [1.5, 0.7, -2],
    ];
    wheelPositions.forEach(pos => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(pos[0], pos[1], pos[2]);
      wheel.castShadow = true;
      drillRigGroup.add(wheel);
    });

    // Base platform
    const basePlatformGeo = new THREE.CylinderGeometry(1.2, 1.4, 0.4, 16);
    const basePlatform = new THREE.Mesh(basePlatformGeo, darkMat);
    basePlatform.position.set(0, 2.4, -1.5);
    basePlatform.castShadow = true;
    basePlatform.userData = { partId: 'baseJoint', basePos: basePlatform.position.clone() };
    drillRigGroup.add(basePlatform);
    pickableParts.push(basePlatform);

    // === Three Drill Arms ===
    leftArm = createDrillArm('left');
    leftArm.position.set(-1.5, 2.6, -1.5);
    leftArm.rotation.y = Math.PI / 6;
    leftArm.userData.baseYaw = Math.PI / 6;
    drillRigGroup.add(leftArm);

    centerArm = createDrillArm('center');
    centerArm.position.set(0, 3, -1.5);
    centerArm.userData.baseYaw = 0;
    drillRigGroup.add(centerArm);

    rightArm = createDrillArm('right');
    rightArm.position.set(1.5, 2.6, -1.5);
    rightArm.rotation.y = -Math.PI / 6;
    rightArm.userData.baseYaw = -Math.PI / 6;
    drillRigGroup.add(rightArm);

    drillRigGroup.position.set(0, 0, 8);
    scene.add(drillRigGroup);
  }

  function createDrillArm(side) {
    const armGroup = new THREE.Group();
    armGroup.name = `arm-${side}`;

    const armColor = side === 'left' ? 0xdc2626 : side === 'right' ? 0x2563eb : 0xf59e0b;
    const armMat = new THREE.MeshStandardMaterial({
      color: armColor,
      roughness: 0.5,
      metalness: 0.5,
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.6,
      metalness: 0.4,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.3,
      metalness: 0.8,
    });

    // Base joint
    const baseJointGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const baseJoint = new THREE.Mesh(baseJointGeo, darkMat);
    baseJoint.userData = { partId: 'baseJoint', isArmPart: true, armSide: side };
    armGroup.add(baseJoint);
    pickableParts.push(baseJoint);

    // Boom pivot
    const boomPivot = new THREE.Group();
    boomPivot.name = 'boomPivot';
    boomPivot.rotation.x = -Math.PI / 6;
    armGroup.add(boomPivot);

    // Boom (基本臂体)
    const boomGeo = new THREE.BoxGeometry(0.5, 0.5, 3);
    const boom = new THREE.Mesh(boomGeo, armMat);
    boom.position.set(0, 0, 1.5);
    boom.castShadow = true;
    boom.userData = { partId: 'boom', isArmPart: true, armSide: side, basePos: new THREE.Vector3(0, 0, 1.5) };
    boomPivot.add(boom);
    pickableParts.push(boom);

    // Hydraulic cylinder
    const cylGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.5, 8);
    const cyl = new THREE.Mesh(cylGeo, steelMat);
    cyl.rotation.x = Math.PI / 2;
    cyl.position.set(0.4, 0.2, 1.5);
    cyl.userData = { partId: 'cylinder', isArmPart: true, armSide: side, basePos: new THREE.Vector3(0.4, 0.2, 1.5) };
    boomPivot.add(cyl);
    pickableParts.push(cyl);

    // Elbow pivot
    const elbowPivot = new THREE.Group();
    elbowPivot.name = 'elbowPivot';
    elbowPivot.position.set(0, 0, 3);
    elbowPivot.rotation.x = Math.PI / 8;
    boomPivot.add(elbowPivot);

    const elbowGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const elbow = new THREE.Mesh(elbowGeo, darkMat);
    elbowPivot.add(elbow);

    // Telescopic arm (伸缩臂 - dipper)
    const dipperGeo = new THREE.BoxGeometry(0.4, 0.4, 2);
    const dipper = new THREE.Mesh(dipperGeo, armMat);
    dipper.position.set(0, 0, 1);
    dipper.castShadow = true;
    dipper.userData = { partId: 'telescopicArm', isArmPart: true, armSide: side, basePos: new THREE.Vector3(0, 0, 1) };
    elbowPivot.add(dipper);
    pickableParts.push(dipper);

    // Short arm + T-beam pivot
    const feedPivot = new THREE.Group();
    feedPivot.name = 'feedPivot';
    feedPivot.position.set(0, 0, 2);
    feedPivot.rotation.x = -Math.PI / 8;
    elbowPivot.add(feedPivot);

    // T-beam (T型梁)
    const tBeamGeo = new THREE.BoxGeometry(0.6, 0.3, 0.4);
    const tBeam = new THREE.Mesh(tBeamGeo, darkMat);
    tBeam.position.set(0, 0, 0.2);
    tBeam.userData = { partId: 'tBeam', isArmPart: true, armSide: side, basePos: new THREE.Vector3(0, 0, 0.2) };
    feedPivot.add(tBeam);
    pickableParts.push(tBeam);

    // Feed beam group (推进梁)
    const feedBeamGroup = new THREE.Group();
    feedBeamGroup.name = 'feedBeam';
    feedPivot.add(feedBeamGroup);

    const feedBeamGeo = new THREE.BoxGeometry(0.3, 0.6, 4);
    const feedBeam = new THREE.Mesh(feedBeamGeo, darkMat);
    feedBeam.position.set(0, 0, 2);
    feedBeam.castShadow = true;
    feedBeam.userData = { partId: 'feedBeam', isArmPart: true, armSide: side, basePos: new THREE.Vector3(0, 0, 2) };
    feedBeamGroup.add(feedBeam);
    pickableParts.push(feedBeam);

    // Rails
    const railGeo = new THREE.BoxGeometry(0.08, 0.1, 3.8);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.4,
      metalness: 0.7,
    });
    [-0.12, 0.12].forEach(x => {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(x, 0.25, 2);
      feedBeamGroup.add(rail);
    });

    // Carriage
    const carriageGroup = new THREE.Group();
    carriageGroup.name = 'carriage';
    carriageGroup.position.set(0, 0, 0.5);
    feedBeamGroup.add(carriageGroup);

    const carriageGeo = new THREE.BoxGeometry(0.35, 0.7, 0.8);
    const carriage = new THREE.Mesh(carriageGeo, steelMat);
    carriage.position.set(0, 0, 0.4);
    carriage.castShadow = true;
    carriageGroup.add(carriage);

    // Rock drill (凿岩机)
    const drillGeo = new THREE.CylinderGeometry(0.15, 0.12, 1.2, 12);
    const drillMat = new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.4,
      metalness: 0.7,
    });
    const drill = new THREE.Mesh(drillGeo, drillMat);
    drill.rotation.x = Math.PI / 2;
    drill.position.set(0, 0, 1);
    drill.userData = { partId: 'rockDrill', isArmPart: true, armSide: side, basePos: new THREE.Vector3(0, 0, 1) };
    carriageGroup.add(drill);
    pickableParts.push(drill);

    // Bit group
    const bitGroup = new THREE.Group();
    bitGroup.name = 'bitGroup';
    bitGroup.position.set(0, 0, 1.6);
    carriageGroup.add(bitGroup);

    // Drill rod
    const rodGeo = new THREE.CylinderGeometry(0.04, 0.04, 2.5, 8);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.3,
      metalness: 0.9,
    });
    const rod = new THREE.Mesh(rodGeo, rodMat);
    rod.rotation.x = Math.PI / 2;
    rod.position.set(0, 0, 0.8);
    rod.userData = { partId: 'drillRod', isArmPart: true, armSide: side, basePos: new THREE.Vector3(0, 0, 0.8) };
    bitGroup.add(rod);
    pickableParts.push(rod);

    // Drill bit head
    const bitHeadGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
    const bitHeadMat = new THREE.MeshStandardMaterial({
      color: 0xf3f4f6,
      roughness: 0.2,
      metalness: 0.9,
    });
    const bitHead = new THREE.Mesh(bitHeadGeo, bitHeadMat);
    bitHead.rotation.x = Math.PI / 2;
    bitHead.position.set(0, 0, 2.1);
    bitGroup.add(bitHead);

    armGroup.userData = {
      boomPivot,
      elbowPivot,
      feedPivot,
      feedBeam: feedBeamGroup,
      carriage: carriageGroup,
      bitGroup,
    };

    return armGroup;
  }

  function setArmPose(arm, liftAngle, swingAngle, extension) {
    const data = arm.userData;
    if (!data) return;

    const liftRad = THREE.MathUtils.degToRad(liftAngle);
    const swingRad = THREE.MathUtils.degToRad(swingAngle);

    arm.rotation.y = (arm.userData.baseYaw || 0) + swingRad * 0.5;
    data.boomPivot.rotation.x = -liftRad * 0.6;
    data.elbowPivot.rotation.x = liftRad * 0.8;
    data.feedPivot.rotation.x = -liftRad * 0.3;

    const maxTravel = 2.5;
    data.carriage.position.z = 0.5 + extension * maxTravel;
  }

  function setExplosionMode(enabled) {
    explosionMode = enabled;
    if (!enabled) {
      explosionProgress = 0;
      resetPartPositions();
    }
  }

  function resetPartPositions() {
    // Reset all parts to base positions
    pickableParts.forEach(part => {
      if (part.userData.basePos && !part.userData.isArmPart) {
        part.position.copy(part.userData.basePos);
      }
    });
  }

  function updateExplosion() {
    if (!explosionMode) return;

    if (explosionProgress < 1) {
      explosionProgress = Math.min(1, explosionProgress + 0.02);
    }

    // Apply explosion offsets to main components
    const t = explosionProgress;
    const explodeFactor = t * 1.5;

    // Only explode non-arm parts that have basePos
    pickableParts.forEach(part => {
      if (part.userData.basePos && !part.userData.isArmPart) {
        const id = part.userData.partId;
        const base = part.userData.basePos.clone();

        switch (id) {
          case 'chassis':
            // stays
            break;
          case 'cabin':
            part.position.set(base.x, base.y + t * 3, base.z + t * 2);
            break;
          case 'baseJoint':
            part.position.set(base.x, base.y + t * 1.5, base.z - t * 2);
            break;
        }
      }
    });
  }

  function updatePartHighlights() {
    pickableParts.forEach(part => {
      const isSelected = selectedPart === part;
      if (part.material.emissive) {
        part.material.emissive.setHex(isSelected ? 0x442200 : 0x000000);
      }
    });
  }

  function onCanvasClick(event) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(pickableParts);

    if (intersects.length > 0) {
      const clickedPart = intersects[0].object;
      selectedPart = clickedPart;
      updatePartHighlights();

      const partId = clickedPart.userData.partId;
      const metadata = PARTS_METADATA[partId];
      const armSide = clickedPart.userData.armSide;

      if (onPartSelect && metadata) {
        // Convert 3D position to screen position
        const screenPos = clickedPart.getWorldPosition(new THREE.Vector3()).clone();
        screenPos.project(camera);
        const x = (screenPos.x * 0.5 + 0.5) * rect.width;
        const y = (-screenPos.y * 0.5 + 0.5) * rect.height;

        onPartSelect({
          partId,
          metadata,
          armSide,
          screenX: x,
          screenY: y,
        });
      }
    } else {
      selectedPart = null;
      updatePartHighlights();
      if (onPartSelect) onPartSelect(null);
    }
  }

  function updateParams(newParams) {
    params = { ...params, ...newParams };
  }

  function setDrillProgress(armName, progress, status) {
    if (drillState[armName]) {
      drillState[armName].progress = progress;
      if (status) drillState[armName].status = status;
    }
  }

  function getDrillState() {
    return { ...drillState };
  }

  function startSimulation() {
    isSimulating = true;
    simTime = 0;
    Object.keys(drillState).forEach(k => {
      drillState[k].progress = 0;
      drillState[k].status = 'positioning';
    });
  }

  function stopSimulation() {
    isSimulating = false;
    Object.keys(drillState).forEach(k => {
      drillState[k].status = 'idle';
      drillState[k].progress = 0;
    });
    // Reset arm poses
    if (leftArm) setArmPose(leftArm, 20, 15, 0);
    if (centerArm) setArmPose(centerArm, 25, 0, 0);
    if (rightArm) setArmPose(rightArm, 20, -15, 0);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    if (isSimulating && !explosionMode) {
      simTime += 0.016;
      updateDrillSimulation();
    }

    // Explosion view animation
    if (explosionMode) {
      updateExplosion();
    }

    // Drill bit rotation
    if (leftArm?.userData?.bitGroup) {
      if (drillState.left.status === 'drilling') {
        leftArm.userData.bitGroup.rotation.z -= 0.3;
      }
    }
    if (centerArm?.userData?.bitGroup) {
      if (drillState.center.status === 'drilling') {
        centerArm.userData.bitGroup.rotation.z -= 0.3;
      }
    }
    if (rightArm?.userData?.bitGroup) {
      if (drillState.right.status === 'drilling') {
        rightArm.userData.bitGroup.rotation.z -= 0.3;
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }

  function updateDrillSimulation() {
    const cycleDuration = 12;
    const t = (simTime % cycleDuration) / cycleDuration;

    updateArmPhase('left', t, 0.0);
    updateArmPhase('center', t, 0.1);
    updateArmPhase('right', t, 0.2);
  }

  function updateArmPhase(armName, t, offset) {
    const adjustedT = (t + offset) % 1;
    const arm = armName === 'left' ? leftArm : armName === 'right' ? rightArm : centerArm;
    if (!arm) return;

    let lift, swing, extension, status;

    if (adjustedT < 0.15) {
      const p = adjustedT / 0.15;
      const ease = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      lift = -10 + ease * (params.liftAngle + 10);
      swing = (armName === 'left' ? -1 : armName === 'right' ? 1 : 0) * (params.swingAngle + 10);
      extension = 0;
      status = 'positioning';
    } else if (adjustedT < 0.65) {
      const p = (adjustedT - 0.15) / 0.5;
      lift = params.liftAngle + Math.sin(p * Math.PI * 2) * 2;
      swing = (armName === 'left' ? -1 : armName === 'right' ? 1 : 0) * params.swingAngle;
      extension = p;
      drillState[armName].progress = p * 100;
      status = 'drilling';
    } else if (adjustedT < 0.8) {
      const p = (adjustedT - 0.65) / 0.15;
      lift = params.liftAngle * (1 - p) + 10 * p;
      swing = (armName === 'left' ? -1 : armName === 'right' ? 1 : 0) * params.swingAngle * (1 - p);
      extension = 1 - p;
      drillState[armName].progress = (1 - p) * 100;
      status = 'returning';
    } else {
      lift = 10;
      swing = (armName === 'left' ? -1 : armName === 'right' ? 1 : 0) * 5;
      extension = 0;
      drillState[armName].progress = 0;
      status = 'idle';
    }

    drillState[armName].status = status;
    setArmPose(arm, lift, swing, extension);
  }

  function showNoWebGLMessage(container) {
    const canvas = document.getElementById('three-canvas');
    if (canvas) canvas.style.display = 'none';
    const msg = document.createElement('div');
    msg.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #9aa0a6;
      font-size: 13px;
      background: #0a0c10;
      text-align: center;
      padding: 20px;
    `;
    msg.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.4;">⚙</div>
      <div style="font-size: 15px; color: #e8eaed; margin-bottom: 8px;">3D 场景无法加载</div>
      <div style="font-size: 12px; color: #6b7280; max-width: 300px;">当前环境不支持 WebGL 硬件加速，请使用支持 WebGL 的现代浏览器以查看 3D 仿真场景。其他功能不受影响。</div>
    `;
    container.appendChild(msg);
  }

  function onResize() {
    if (!renderer || !camera) return;
    const canvas = document.getElementById('three-canvas');
    if (!canvas || !canvas.parentElement) return;
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function dispose() {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onResize);
    if (renderer) renderer.dispose();
  }

  return {
    init,
    updateParams,
    startSimulation,
    stopSimulation,
    getDrillState,
    setDrillProgress,
    dispose,
    PARTS_METADATA,
  };
})();

Object.assign(window, { DrillScene });


// ===== ChatPanel.jsx =====
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


// ===== ControlPanel.jsx =====
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
