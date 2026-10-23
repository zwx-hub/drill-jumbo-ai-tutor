// ===== bundle part 1/3 =====


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

       