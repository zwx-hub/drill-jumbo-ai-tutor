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
