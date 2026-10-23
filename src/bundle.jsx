

// ===== src/Scene3D.jsx =====
/* ============================================================
   涓夎噦鍑垮博鍙拌溅 3D 鍦烘櫙缁勪欢
   鏀寔鐖嗙偢瑙嗗浘銆侀儴浠剁偣鍑婚珮浜€佹暀瀛﹀紩瀵?   鍩轰簬涓搧瑁呭DJ3G涓夎噦鍑垮博鍙拌溅缁撴瀯
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
      name: '杞紡搴曠洏',
      function: '鎵胯浇鏁存満锛屾彁渚涜璧板姩鍔涳紝閲囩敤鍥涢┍閾版帴寮忓簳鐩橈紝閫傚簲闅ч亾鍐呭鏉傝矾闈㈡潯浠躲€傛暣鏈洪噸閲忕害50鍚紝搴曠洏鍔熺巼180kW銆?,
      connection: '铻烘爴杩炴帴 4澶勶紙搴曠洏涓庝富鏈烘灦锛?,
      sensors: '杞﹂€熶紶鎰熷櫒銆佽浆鍚戣搴︿紶鎰熷櫒',
    },
    cabin: {
      name: '鎿嶄綔椹鹃┒瀹?,
      function: '鎿嶄綔鍛樻帶鍒朵腑蹇冿紝閰嶅鍏ㄦ櫙鐜荤拑绐楋紝鍐呮湁涓绘帶鍒跺彴銆佸骇妞呫€佹柟鍚戠洏锛屽彲瑙傚療鎺屽瓙闈綔涓氭儏鍐点€?,
      connection: '鍑忛渿铻烘爴杩炴帴 6澶?,
      sensors: '椹鹃┒瀹ゅ€捐浼犳劅鍣ㄣ€佺┖璋冨帇鍔涗紶鎰熷櫒',
    },
    baseJoint: {
      name: '澶ц噦杩炴帴搴?,
      function: '閽昏噦涓庝富鏈虹殑杩炴帴鍩虹锛屾壙鍙楅捇鑷備綔涓氭椂鐨勫叏閮ㄥ弽鍔涗笌鍔涚煩锛岄噰鐢ㄩ珮寮哄害閾搁挗浠躲€?,
      connection: '鑳€閿€杩炴帴 2澶?+ 铻烘爴杩炴帴 8澶?,
      sensors: '搴曞骇鍘嬪姏浼犳劅鍣?,
    },
    boom: {
      name: '鍩烘湰鑷備綋锛堝ぇ鑷傦級',
      function: '閽昏噦涓绘壙杞界粨鏋勶紝閲囩敤楂樺己搴﹂挗鐒婃帴绠卞瀷缁撴瀯锛屽彲瀹炵幇淇话銆佹憜鍔ㄣ€佷几缂╀笁绉嶈繍鍔ㄣ€傛渶澶т妇鍗囪搴?65掳/-30掳锛屽乏鍙虫憜鍔?5掳銆?,
      connection: '鑳€閿€杩炴帴 6澶勩€佽灪鏍撹繛鎺?2澶?,
      sensors: '澶ц噦绔栫洿瑙掑害浼犳劅鍣ㄣ€佸ぇ鑷傛按骞宠搴︿紶鎰熷櫒',
    },
    cylinder: {
      name: '澶ц噦浼哥缉娌圭几',
      function: '椹卞姩浼哥缉鑷傚湪鍩烘湰鑷備綋鍐呬几缂╋紝鏈€澶т几缂╅噺鈮?.5m銆傞噰鐢ㄥ弻浣滅敤娑插帇娌圭几锛屽甫浣嶇Щ浼犳劅鍣ㄥ疄鏃跺弽棣堜几缂╅噺銆?,
      connection: '閿€杞磋繛鎺?2澶?,
      sensors: '娌圭几浣嶇Щ浼犳劅鍣ㄣ€佹补鍘嬩紶鎰熷櫒',
    },
    telescopicArm: {
      name: '浼哥缉鑷?,
      function: '宓屽鍦ㄥ熀鏈噦浣撳唴鐨勫彲浼哥缉缁撴瀯锛岀敤浜庢墿澶т綔涓氳寖鍥达紝琛ㄩ潰闀€閾槻鑵愶紝甯︽湁瀵煎悜婊戝潡銆?,
      connection: '婊戝姩閰嶅悎锛堝鍚戦摐濂楋級',
      sensors: '浼哥缉浣嶇Щ浼犳劅鍣?,
    },
    shortArm: {
      name: '鐭噦锛圱鍨嬫杩炴帴鑷傦級',
      function: '杩炴帴浼哥缉鑷傚墠绔笌T鍨嬫锛屽疄鐜版帹杩涙鐨勪刊浠颁笌缈昏浆琛ュ伩銆?,
      connection: '閾拌酱杩炴帴 2澶?,
      sensors: '鐭噦瑙掑害浼犳劅鍣?,
    },
    tBeam: {
      name: 'T鍨嬫锛堟帹杩涙缈昏浆鏋讹級',
      function: '鎺ㄨ繘姊佺殑鏀拺涓庣炕杞満鏋勶紝鍙娇鎺ㄨ繘姊佸疄鐜奥?80掳缈昏浆锛屾弧瓒充笉鍚岃搴﹂捇瀛旈渶姹傘€?,
      connection: '鍥炶浆鏀壙杩炴帴',
      sensors: '鎺ㄨ繘姊佺炕杞搴︿紶鎰熷櫒',
    },
    feedBeam: {
      name: '鎺ㄨ繘姊?,
      function: '鍑垮博鏈虹殑瀵艰建涓庢帹杩涙満鏋勶紝鎬婚暱鈮?000mm锛屾帹杩涜ˉ鍋?800mm锛岄捇鑷傝ˉ鍋?600mm銆傞€氳繃娑插帇椹揪椹卞姩閾炬潯甯﹀姩鍑垮博鏈烘部瀵艰建杩愬姩銆?,
      connection: '婊戝潡瀵艰建閰嶅悎',
      sensors: '鎺ㄨ繘浣嶇Щ浼犳劅鍣ㄣ€佹帹杩涘帇鍔涗紶鎰熷櫒',
    },
    rockDrill: {
      name: '鍑垮博鏈?,
      function: '閽诲瓟浣滀笟鏍稿績閮ㄤ欢锛屽啿鍑诲姛鐜?7~31kW锛屽啿鍑婚鐜団墺4300娆?min锛堢害70Hz锛夛紝鏃嬭浆鎵煩鈮?50N路m銆傚皢鍐插嚮鑳戒笌鏃嬭浆鎵煩浼犻€掔粰閽绘潌銆?,
      connection: '铻烘爴杩炴帴 4澶?,
      sensors: '鍐插嚮鍘嬪姏浼犳劅鍣ㄣ€佸洖杞帇鍔涗紶鎰熷櫒銆佽浆閫熶紶鎰熷櫒',
    },
    drillRod: {
      name: '閽绘潌涓庨捇澶?,
      function: '浼犻€掑啿鍑昏兘閲忓拰鏃嬭浆鍔涚煩鑷冲博鐭筹紝鍓嶇閽诲ご閲囩敤纭川鍚堥噾鐞冮娇锛岃€愮（鑰愬啿鍑汇€傞捇瀛旂洿寰?5~127mm銆?,
      connection: '铻虹汗杩炴帴锛圧32/T38/T45/T51锛?,
      sensors: '鏃狅紙娑堣€椾欢锛?,
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

    // Boom (鍩烘湰鑷備綋)
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

    // Telescopic arm (浼哥缉鑷?- dipper)
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

    // T-beam (T鍨嬫)
    const tBeamGeo = new THREE.BoxGeometry(0.6, 0.3, 0.4);
    const tBeam = new THREE.Mesh(tBeamGeo, darkMat);
    tBeam.position.set(0, 0, 0.2);
    tBeam.userData = { partId: 'tBeam', isArmPart: true, armSide: side, basePos: new THREE.Vector3(0, 0, 0.2) };
    feedPivot.add(tBeam);
    pickableParts.push(tBeam);

    // Feed beam group (鎺ㄨ繘姊?
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

    // Rock drill (鍑垮博鏈?
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
      <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.4;">鈿?/div>
      <div style="font-size: 15px; color: #e8eaed; margin-bottom: 8px;">3D 鍦烘櫙鏃犳硶鍔犺浇</div>
      <div style="font-size: 12px; color: #6b7280; max-width: 300px;">褰撳墠鐜涓嶆敮鎸?WebGL 纭欢鍔犻€燂紝璇蜂娇鐢ㄦ敮鎸?WebGL 鐨勭幇浠ｆ祻瑙堝櫒浠ユ煡鐪?3D 浠跨湡鍦烘櫙銆傚叾浠栧姛鑳戒笉鍙楀奖鍝嶃€?/div>
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


// ===== src/ChatPanel.jsx =====
/* ============================================================
   AI瀵煎笀鏅鸿兘浣撳璇濋潰鏉?   瀹炶鏁欑粌瑙掕壊 - 鍥寸粫鏁欏鍦烘櫙鍥炵瓟
   ============================================================ */

const TUTOR_MODELS = [
  { id: 'qwen', name: '閫氫箟鍗冮棶', shortName: 'Qwen', color: '#818cf8', keyName: 'qwenApiKey', role: '缁撴瀯鍘熺悊瀵煎笀' },
  { id: 'deepseek', name: 'DeepSeek', shortName: 'DeepSeek', color: '#60a5fa', keyName: 'deepseekApiKey', role: '鏁呴殰鎺掓煡涓撳' },
  { id: 'doubao', name: '璞嗗寘', shortName: 'Doubao', color: '#a78bfa', keyName: 'doubaoApiKey', role: '鎿嶄綔瑕侀鏁欑粌' },
  { id: 'kimi', name: 'Kimi', shortName: 'Kimi', color: '#22d3ee', keyName: 'kimiApiKey', role: '瀹夊叏瑙勮寖璁插笀' },
];

const TUTOR_QUICK_QUESTIONS = [
  '鍩烘湰鑷備綋缁撴瀯缁勬垚锛?,
  '澶ц噦鎿嶄綔瑕侀鏄粈涔堬紵',
  '甯歌鏁呴殰濡備綍鎺掓煡锛?,
  '鍥涜鐐规槸浠€涔堬紵',
  '鍏夐潰鐖嗙牬鎬庝箞鎿嶄綔锛?,
  '瀹夊叏娉ㄦ剰浜嬮」鏈夊摢浜涳紵',
];

// 瀹炶鐭ヨ瘑鐭ヨ瘑搴?const TRAINING_KNOWLEDGE = {
  '涓€蹇冧簲鐐?: {
    title: '涓€蹇冧簲鐐?瀹氫綅娉?,
    content: '鎺у埗闅ч亾涓績浣嶇疆鍜屼簲涓紑鎸栬疆寤撶偣锛堟嫳椤剁偣銆佸乏鎷辫偐銆佸彸鎷辫偐銆佸乏杈瑰銆佸彸杈瑰锛夛紝纭繚鍙拌溅瀹氫綅鍑嗙‘銆傚畾浣嶆椂鍏堝鍑嗕腑蹇冪嚎锛屽啀璋冩暣涓婁笅楂樺害锛屼繚璇佷簲涓疆寤撶偣鍧囧寑鍒嗗竷銆?,
    category: '鎿嶄綔瑕侀',
  },
  '涓€绾夸袱绔?: {
    title: '涓€绾夸袱绔?骞宠娉?,
    content: '鍙拌溅澶ц噦涓庨毀閬撲腑蹇冪嚎骞宠锛堜竴绾匡級锛屾帹杩涙鍓嶅悗绔偣浣嶇疆鍑嗙‘锛堜袱绔級銆備繚璇侀捇瀛旀柟鍚戜笌闅ч亾杞寸嚎骞宠锛屾槸淇濊瘉閽诲瓟璐ㄩ噺鐨勫叧閿€傛鏌ユ柟娉曪細浠庝晶闈㈣瀵熸帹杩涙鏄惁涓庨毀閬撹叞绾垮钩琛屻€?,
    category: '鎿嶄綔瑕侀',
  },
  '涓€楂樹竴浣?: {
    title: '涓€楂樹竴浣?瑙掑害娉?,
    content: '鎺ㄨ繘姊佸熬閮ㄩ珮搴︼紙涓€楂橈級鍐冲畾閽诲瓟浠拌锛屽紑瀛斿鏈€浣庝綅缃紙涓€浣庯級纭繚閽诲瓟璧峰鐐瑰噯纭€傝皟鏁存椂鍏堝畾寮€瀛旂偣浣嶇疆锛屽啀璋冩暣灏鹃儴楂樺害鎺у埗閽诲瓟瑙掑害銆傚懆杈圭溂寮€瀛旂簿搴︾洿鎺ュ奖鍝嶅厜闈㈢垎鐮存晥鏋溿€?,
    category: '鎿嶄綔瑕侀',
  },
  '涓€蹇竴鎱?: {
    title: '涓€蹇竴鎱?璋冭妭娉?,
    content: '纭博鎱㈡帹杩涖€侀珮鍐插嚮锛涜蒋宀╁揩鎺ㄨ繘銆佷綆鍐插嚮銆傛牴鎹洿宀╂儏鍐电伒娲昏皟鏁村啿鍑讳笌鎺ㄨ繘閫熷害鐨勫尮閰嶅叧绯汇€傜‖宀╋紙鑺卞矖宀┿€佺煶鑻卞博锛夛細鍐插嚮鍔熺巼29~31kW锛屾帹杩涘姏22~23kN锛涜蒋宀╋紙娉ュ博銆侀〉宀╋級锛氬啿鍑诲姛鐜?2~25kW锛屾帹杩涘姏16~18kN銆?,
    category: '鎿嶄綔瑕侀',
  },
  '澶ц噦杩炴帴搴?: {
    title: '澶ц噦杩炴帴搴?,
    content: '閽昏噦涓庝富鏈虹殑杩炴帴鍩虹锛屾壙鍙楅捇鑷備綔涓氭椂鐨勫叏閮ㄥ弽鍔涗笌鍔涚煩銆傞噰鐢ㄩ珮寮哄害閾搁挗浠讹紝鏄暣涓捇鑷傜殑"鏍瑰熀"銆傝繛鎺ユ柟寮忥細鑳€閿€杩炴帴2澶?+ 铻烘爴杩炴帴8澶勩€?,
    category: '缁撴瀯鍘熺悊',
  },
  '鍩烘湰鑷備綋': {
    title: '鍩烘湰鑷備綋锛堝ぇ鑷傦級',
    content: '閽昏噦涓绘壙杞界粨鏋勶紝閲囩敤楂樺己搴﹂挗鐒婃帴绠卞瀷缁撴瀯銆傚彲瀹炵幇淇话锛?65掳/-30掳锛夈€佸乏鍙虫憜鍔紙卤45掳锛夈€佷几缂╀笁绉嶈繍鍔ㄣ€傝閰嶆柟寮忥細鑳€閿€杩炴帴6澶勩€佽灪鏍撹繛鎺?澶勩€佽搴︿紶鎰熷櫒2涓紙绔栫洿瑙掑害+姘村钩瑙掑害锛夈€佹満姊伴檺浣嶃€?,
    category: '缁撴瀯鍘熺悊',
  },
  '澶ц噦浼哥缉娌圭几': {
    title: '澶ц噦浼哥缉娌圭几',
    content: '椹卞姩浼哥缉鑷傚湪鍩烘湰鑷備綋鍐呬几缂╃殑鎵ц鍏冧欢锛屾渶澶т几缂╅噺鈮?.5m銆傞噰鐢ㄥ弻浣滅敤娑插帇娌圭几锛屽唴缃綅绉讳紶鎰熷櫒瀹炴椂鍙嶉浼哥缉閲忥紝閰嶅悎娑插帇閿佸疄鐜颁换鎰忎綅缃攣瀹氥€?,
    category: '缁撴瀯鍘熺悊',
  },
  '鎺ㄨ繘姊?: {
    title: '鎺ㄨ繘姊?,
    content: '鍑垮博鏈虹殑瀵艰建涓庢帹杩涙満鏋勶紝鎬婚暱鈮?000mm锛屾帹杩涜ˉ鍋?800mm锛岄捇鑷傝ˉ鍋?600mm銆傞€氳繃娑插帇椹揪椹卞姩閾炬潯甯﹀姩鍑垮博鏈烘部瀵艰建杩愬姩銆傛帹杩涚炕杞搴β?80掳銆?,
    category: '缁撴瀯鍘熺悊',
  },
  '鍑垮博鏈?: {
    title: '鍑垮博鏈?,
    content: '閽诲瓟浣滀笟鏍稿績閮ㄤ欢锛屽啿鍑诲姛鐜?7~31kW锛屽啿鍑婚鐜団墺4300娆?min锛堢害70Hz锛夛紝鏃嬭浆鎵煩鈮?50N路m銆傞噰鐢ㄦ恫鍘嬮┍鍔紝鍐插嚮鏈烘瀯涓庢棆杞満鏋勭嫭绔嬫帶鍒讹紝鍙牴鎹博鎬ц皟鏁村弬鏁板尮閰嶃€?,
    category: '缁撴瀯鍘熺悊',
  },
  '鍗￠捇': {
    title: '鍗￠捇鏁呴殰鎺掓煡',
    content: '銆愮幇璞°€戦捇鏉嗘棤娉曟帹杩涙垨鍥為€€锛屼即鏈夊紓鍝嶃€俓n銆愬師鍥犮€戔憼宀╃煶鐮寸甯﹀崱閽?鈶￠捇鏉嗗集鏇?鈶㈠瓟澹佹帀鍧梊n銆愬鐞嗘柟娉曘€慭n1. 绔嬪嵆鍋滄鎺ㄨ繘锛屼繚鎸佹棆杞琝n2. 缂撴參姝ｅ弽杞椿鍔ㄩ捇鏉哱n3. 閰嶅悎鍐插嚮杞绘帹杞绘媺\n4. 涓ョ寮鸿鎷旀潌\n5. 涓ラ噸鏃跺彲鍙嶅悜閽绘繁2~3cm鍐嶅皾璇曢€€鍑?,
    category: '鏁呴殰鎺掓煡',
  },
  '鏂拵': {
    title: '鏂拵鏁呴殰鎺掓煡',
    content: '銆愮幇璞°€戝啿鍑诲０绐佸彉锛岄捇杩涢€熷害楠ら檷銆俓n銆愬師鍥犮€戔憼閽绘潌鐤插姵瑁傜汗 鈶＄‖宀╁啿鍑昏繃澶?鈶㈣繛鎺ヨ灪绾圭（鎹焅n銆愬鐞嗐€慭n1. 绔嬪嵆鍋滄満\n2. 鐢ㄤ笓鐢ㄥ伐鍏峰彇鍑烘柇鏉哱n3. 妫€鏌ヨ灪绾广€佹洿鎹㈡柊閽绘潌\n4. 纭博娈甸€傚綋闄嶄綆鍐插嚮棰戠巼',
    category: '鏁呴殰鎺掓煡',
  },
};

// 妯℃嫙瀵煎笀鍥炲
const TUTOR_RESPONSES = {
  qwen: `鍚屽浠ソ锛佹垜鏄粨鏋勫師鐞嗗甯堥€氫箟鍗冮棶銆?
鍏充簬浣犳彁鍑虹殑闂锛屼粠**缁撴瀯鍘熺悊**瑙掑害鏉ュ垎鏋愶細

涓夎噦鍑垮博鍙拌溅鐨勯捇鑷傜郴缁熸槸涓€涓吀鍨嬬殑澶氳嚜鐢卞害骞惰仈鏈烘瀯锛屾瘡涓捇鑷傛湁5涓繍鍔ㄨ嚜鐢卞害锛?1. 澶ц噦淇话锛?65掳/-30掳锛?2. 澶ц噦鎽嗗姩锛埪?5掳锛?3. 閽昏噦浼哥缉锛堚墺2.5m锛?4. 鎺ㄨ繘姊佷刊浠?5. 鎺ㄨ繘姊佺炕杞紙卤180掳锛?
**鍏抽敭鐭ヨ瘑鐐癸細鍩烘湰鑷傝閰嶆柟寮?*
- 鑳€閿€杩炴帴 6澶勶細鎵垮彈寰勫悜杞借嵎锛屽畾浣嶇簿搴﹂珮
- 铻烘爴杩炴帴 2澶勶細鎵垮彈杞村悜杞借嵎锛屼究浜庢媶瑁?- 瑙掑害浼犳劅鍣?2涓細澶ц噦绔栫洿瑙掑害浼犳劅鍣?+ 澶ц噦姘村钩瑙掑害浼犳劅鍣?- 鏈烘闄愪綅锛氶槻姝㈣秴绋嬭繍鍔?
瀹氫綅绮惧害鍙揪瀛斾綅璇樊<卤1.8cm锛岃搴﹀亸宸?0.8掳鏃惰嚜鍔ㄨЕ鍙慞ID闂幆绾犲亸銆?
鏈変粈涔堢粨鏋勬柟闈㈢殑闂锛屾杩庨殢鏃舵彁闂紒`,

  deepseek: `澶у濂斤紝鎴戞槸鏁呴殰鎺掓煡涓撳DeepSeek銆?
浠?*鏁呴殰璇婃柇**瑙掑害鏉ュ垎鏋愯繖涓棶棰橈細

銆愬父瑙佹晠闅?TOP3銆?
**1. 鍗￠捇锛堝彂鐢熺巼绾?5%锛?*
鐥囩姸锛氶捇鏉嗘棤娉曡繘閫€銆佸紓鍝?鍘熷洜锛氱牬纰庡甫銆佸瓟澹佹帀鍧椼€侀捇鏉嗗集鏇?澶勭悊锛氬仠鎺ㄤ繚杞啋姝ｅ弽杞椿鍔ㄢ啋閰嶅悎鍐插嚮杞绘媺鈫掍弗绂佺‖鎷?
**2. 鍐插嚮鏃犲姏锛堝彂鐢熺巼绾?5%锛?*
鐥囩姸锛氶捇杩涢€熷害鏄庢樉涓嬮檷
鍘熷洜锛氣憼娑插帇娌逛笉瓒?鈶″啿鍑绘椿濉炵（鎹?鈶㈣搫鑳藉櫒姘皵鍘嬪姏涓嶈冻
妫€鏌ワ細鍏堟煡娌逛綅鈫掑啀鏌ユ补鍘嬧啋鏈€鍚庢媶妫€鍐插嚮鏈烘瀯

**3. 鍥炶浆鏃犲姏锛堝彂鐢熺巼绾?0%锛?*
鐥囩姸锛氶捇鏉嗕笉杞垨杞€熸參
鍘熷洜锛氣憼鍥炶浆椹揪纾ㄦ崯 鈶″噺閫熺榻胯疆鎹熷潖 鈶㈠洖杞帇鍔涗笉瓒?鎺掓煡锛氭祴鍥炶浆鍘嬪姏鈫掑惉鍑忛€熺澹伴煶鈫掓媶妫€椹揪

銆愬彛璇€銆戝厛鐪嬭〃銆佸啀鍚０銆佹寜搴忔帓鏌ヤ笉杩斿伐銆?鏈夊叿浣撴晠闅滅幇璞″彲浠ュ憡璇夋垜锛屾垜鏉ュ府浣犲垎鏋愶紒`,

  doubao: `鍚屽浠ソ鍛€锝炴垜鏄搷浣滆棰嗘暀缁冭眴鍖咃紒

鍏充簬**鎿嶄綔瑕侀**锛屾垜鏉ョ粰浣犺缁嗚瑙ｏ細

馃幆 **瀹炶鎿嶄綔鍥涜鐐癸紙蹇呰儗锛侊級**

**鈶?涓€蹇冧簲鐐?* 鈥?瀹氫綅娉?瀵瑰噯闅ч亾涓績锛屾帶鍒舵嫳椤躲€佸乏鍙虫嫳鑲┿€佸乏鍙宠竟澧欎簲涓疆寤撶偣銆?
**鈶?涓€绾夸袱绔?* 鈥?骞宠娉?澶ц噦涓庨毀閬撲腑蹇冪嚎骞宠锛堜竴绾匡級锛屾帹杩涙鍓嶅悗绔綅缃噯纭紙涓ょ锛夈€?
**鈶?涓€楂樹竴浣?* 鈥?瑙掑害娉?鎺ㄨ繘姊佸熬閮ㄩ珮搴︼紙涓€楂橈級鍐冲畾浠拌锛屽紑瀛斿浣嶇疆锛堜竴浣庯級鍐冲畾璧风偣銆?
**鈶?涓€蹇竴鎱?* 鈥?璋冭妭娉?纭博鎱㈡帹楂樺啿鍑伙紝杞博蹇帹浣庡啿鍑伙紝鐏垫椿鍖归厤鏄叧閿€?
馃憜 **鎿嶄綔灏忔妧宸?*
- 寮€瀛旈樁娈碉細浣庡啿鍑汇€佹參鎺ㄨ繘锛岀ǔ涓轰富
- 姝ｅ父閽昏繘锛氬叏鍔熺巼銆佺ǔ鎺ㄨ繘锛屾晥鐜囦紭鍏?- 鍒板瓟搴曞墠锛氭彁鍓嶉檷閫燂紝闃叉瓒呴捇
- 閫€鏉嗭細淇濇寔鏃嬭浆锛岄€熷害鏄捇杩涚殑1.5~2鍊?
鎿嶄綔涓€瀹氳鑳嗗ぇ蹇冪粏锛屽畨鍏ㄧ涓€锛佹湁鎿嶄綔涓婄殑闂灏界闂垜锝瀈,

  kimi: `鍚屽浠ソ锛屾垜鏄畨鍏ㄨ鑼冭甯圞imi銆?
浠?*瀹夊叏瑙勮寖**瑙掑害锛屾垜浠繀椤荤墷璁帮細

鈿狅笍 **涓夎噦鍑垮博鍙拌溅浣滀笟瀹夊叏瀹堝垯**

**銆愪綔涓氬墠銆戜笁妫€鏌?*
1. 妫€鏌ユ恫鍘嬬郴缁燂細娌逛綅銆佹补娓┿€佹湁鏃犳笚婕?2. 妫€鏌ラ捇鍏凤細閽绘潌纾ㄦ崯銆侀捇澶寸（鎹熴€佽灪绾圭姸鎬?3. 妫€鏌ュ畨鍏ㄨ缃細鎬ュ仠鎸夐挳銆侀檺浣嶅紑鍏炽€侀槻鎶よ缃?
**銆愪綔涓氫腑銆戜簲涓嶅噯**
1. 涓嶅噯鍦ㄩ捇鑷備笅鏂圭珯浜?2. 涓嶅噯鍦ㄩ捇瀛旀椂姝ｅ瀛斿彛瑙傚療
3. 涓嶅噯甯﹀帇鎷嗗嵏娑插帇绠¤矾
4. 涓嶅噯瓒呰寖鍥翠綔涓氾紙瓒呰搴︺€佽秴琛岀▼锛?5. 涓嶅噯鍦ㄦ晠闅滄湭鎺掗櫎鏃跺己琛屼綔涓?
**銆愪綔涓氬悗銆戜笁纭**
1. 纭閽昏噦鏀舵嫝鍒板畨鍏ㄤ綅缃?2. 纭鍚勭郴缁熷帇鍔涘凡鍗歌嵎
3. 纭鐢垫簮銆佹按婧愬叧闂?
**銆愮揣鎬ユ儏鍐靛缃€?*
閬囧崱閽汇€佹柇閽庛€佺璺垎瑁傜瓑绱ф€ユ儏鍐碉細
鈶?绔嬪嵆鎸変笅鎬ュ仠 鈫?鈶?鎾ょ鍗遍櫓鍖哄煙 鈫?鈶?鎶ュ憡鐝粍闀?
瀹夊叏姘歌繙鏄涓€浣嶇殑锛屾瘡涓€娆℃搷浣滈兘瑕侀伒瀹堣鑼冿紒`,
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
      ? `濂界殑锛屾垜鏉ョ粰浣犺瑙?*${part.metadata.name}**锛歕n\n${knowledge.content}\n\n**杩炴帴鏂瑰紡**锛?{part.metadata.connection}\n**浼犳劅鍣?*锛?{part.metadata.sensors}`
      : `浣犵偣鍑讳簡**${part.metadata.name}**銆俓n\n${part.metadata.function}\n\n杩炴帴鏂瑰紡锛?{part.metadata.connection}\n浼犳劅鍣細${part.metadata.sensors}`;

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
    let baseResponse = TUTOR_RESPONSES[modelId] || '鏆傛棤鐩稿叧鏁欏鍐呭銆?;

    // Check for keyword matches in knowledge base
    let knowledgeInsert = '';
    Object.keys(TRAINING_KNOWLEDGE).forEach(key => {
      if (question.includes(key)) {
        const k = TRAINING_KNOWLEDGE[key];
        knowledgeInsert += `\n\n馃摎 **${k.title}**\n${k.content}`;
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
          AI 瀹炶瀵煎笀
        </div>
        <button
          className="chat-settings-btn"
          onClick={() => setShowSettings(true)}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          璁剧疆
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
          title="鍥涘甯堣仈鍚堟巿璇?
        >
          鑱旀巿
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
          <span style={{ fontSize: '14px' }}>馃懆鈥嶐煆?/span>
          <span style={{ color: 'var(--accent-amber)', fontWeight: '600' }}>{currentModel.name}</span>
          路 {currentModel.role}
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
          <span style={{ fontSize: '14px' }}>馃帗</span>
          鍥涗綅瀵煎笀鑱斿悎鎺堣 路 缁撴瀯/鎿嶄綔/鏁呴殰/瀹夊叏鍏ㄦ柟浣嶈瑙?        </div>
      )}

      {/* Unconfigured hint */}
      {currentTab !== 'multi' && !isConfigured(currentTab) && (
        <div className="unconfigured-hint" style={{ margin: '8px 10px 0' }}>
          婕旂ず妯″紡 路 閰嶇疆 API Key 鍚庡彲鐪熷疄璋冪敤
        </div>
      )}

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px 10px', fontSize: '11px' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px', opacity: '0.3' }}>馃懆鈥嶐煆?/div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '6px' }}>娆㈣繋鏉ュ埌浠跨湡瀹炶璇惧爞</div>
            <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
              鐐瑰嚮3D鍦烘櫙涓殑浠绘剰閮ㄤ欢<br />
              AI瀵煎笀浼氳嚜鍔ㄨ瑙ｅ搴旂煡璇?            </div>
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
                  {msg.isTutor && ' 路 瀵煎笀'}
                </span>
                {!isConfigured(msg.model) && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>婕旂ず</span>
                )}
              </div>
              <div className="chat-msg-bubble" style={{ whiteSpace: 'pre-wrap' }}>
                {msg.content || <span className="pulse">璁茶В涓?..</span>}
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
            placeholder="鍚慉I瀵煎笀鎻愰棶..."
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
            鎻愰棶
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
          <div className="modal-title">API Key 閰嶇疆</div>
          <button className="modal-close" onClick={onClose}>脳</button>
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
              馃懆鈥嶐煆?鍥涗綅AI瀵煎笀鍒嗗伐
            </div>
            {TUTOR_MODELS.map(m => (
              <div key={m.id} style={{ fontSize: '10px', marginTop: '2px' }}>
                路 <span style={{ color: m.color, fontWeight: '600' }}>{m.name}</span>锛歿m.role}
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
                placeholder={`杈撳叆 ${model.name} 鐨?API Key`}
                value={localKeys[model.keyName] || ''}
                onChange={e => handleChange(model.keyName, e.target.value)}
              />
              <div className="api-hint">
                浠呬繚瀛樺湪鏈湴娴忚鍣紝閰嶇疆鍚庡彲鐪熷疄璋冪敤妯″瀷API
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button className="sim-btn" onClick={onClose} style={{ flex: 1 }}>鍙栨秷</button>
            <button className="sim-btn primary" onClick={handleSave} style={{ flex: 1 }}>淇濆瓨閰嶇疆</button>
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


// ===== src/ControlPanel.jsx =====
/* ============================================================
   鍙傛暟鍖栦豢鐪熸帶鍒堕潰鏉?+ 瑙嗗浘妯″紡鍒囨崲
   ============================================================ */

const ROCK_GRADES = [
  { value: 1, label: '鈪犵骇锛堟瀬纭博锛?, factor: 0.5 },
  { value: 2, label: '鈪＄骇锛堢‖宀╋級', factor: 0.7 },
  { value: 3, label: '鈪㈢骇锛堜腑纭博锛?, factor: 1.0 },
  { value: 4, label: '鈪ｇ骇锛堣蒋宀╋級', factor: 1.4 },
  { value: 5, label: '鈪ょ骇锛堟瀬杞博锛?, factor: 2.0 },
];

const VIEW_MODES = [
  { id: 'normal', label: '鏁翠綋瑙嗗浘', icon: '馃彈' },
  { id: 'explode', label: '缁撴瀯鎷嗚В', icon: '馃挜' },
  { id: 'console', label: '鎿嶄綔鍙?, icon: '馃帥' },
];

const PARTS_LIST = [
  { id: 'chassis', name: '杞紡搴曠洏', category: '琛岃蛋绯荤粺' },
  { id: 'cabin', name: '鎿嶄綔椹鹃┒瀹?, category: '鎿嶆帶绯荤粺' },
  { id: 'baseJoint', name: '澶ц噦杩炴帴搴?, category: '閽昏噦绯荤粺' },
  { id: 'boom', name: '鍩烘湰鑷備綋锛堝ぇ鑷傦級', category: '閽昏噦绯荤粺' },
  { id: 'cylinder', name: '澶ц噦浼哥缉娌圭几', category: '娑插帇绯荤粺' },
  { id: 'telescopicArm', name: '浼哥缉鑷?, category: '閽昏噦绯荤粺' },
  { id: 'tBeam', name: 'T鍨嬫锛堢炕杞灦锛?, category: '閽昏噦绯荤粺' },
  { id: 'feedBeam', name: '鎺ㄨ繘姊?, category: '閽昏噦绯荤粺' },
  { id: 'rockDrill', name: '鍑垮博鏈?, category: '宸ヤ綔瑁呯疆' },
  { id: 'drillRod', name: '閽绘潌涓庨捇澶?, category: '宸ヤ綔瑁呯疆' },
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
      idle: '寰呮満',
      positioning: '瀹氫綅涓?,
      drilling: '閽诲瓟涓?,
      returning: '鍥炵▼涓?,
    };
    return map[status] || status;
  };

  return (
    <div className="panel control-panel">
      <div className="panel-header">
        <div className="panel-title">
          <div className="panel-title-icon"></div>
          瀹炶鎺у埗鍙?        </div>
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
            {/* 閽昏噦鐘舵€?*/}
            <div className="control-group">
              <div className="control-group-title">閽昏噦鐘舵€?/div>
              <div className="arm-status-grid">
                <div className="arm-status-card left">
                  <div className="arm-status-name">1鍙疯噦锛堝乏锛?/div>
                  <div className={`arm-status-state ${drillState.left.status}`}>
                    {getStatusLabel(drillState.left.status)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {drillState.left.progress.toFixed(0)}%
                  </div>
                </div>
                <div className="arm-status-card center">
                  <div className="arm-status-name">2鍙疯噦锛堜腑锛?/div>
                  <div className={`arm-status-state ${drillState.center.status}`}>
                    {getStatusLabel(drillState.center.status)}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                    {drillState.center.progress.toFixed(0)}%
                  </div>
                </div>
                <div className="arm-status-card right">
                  <div className="arm-status-name">3鍙疯噦锛堝彸锛?/div>
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
                <div className="control-group-title">閮ㄤ欢缁撴瀯璁ょ煡</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.5' }}>
                  鐐瑰嚮涓嬫柟閮ㄤ欢鍚嶇О鎴栫洿鎺ョ偣鍑?D妯″瀷涓殑閮ㄤ欢锛屾煡鐪嬭缁嗙粨鏋勮鏄?                </div>
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

            {/* 閽诲瓟鍙傛暟 */}
            <div className="control-group">
              <div className="control-group-title">閽诲瓟鍙傛暟</div>

              <div className="control-item">
                <div className="control-label-row">
                  <span className="control-label">閽诲瓟娣卞害</span>
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
                  <span className="control-label">閽诲瓟鐩村緞</span>
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
                  <span className="control-label">鎺ㄨ繘鍔?/span>
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
                  <span className="control-label">鍐插嚮鍔熺巼</span>
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

            {/* 閽昏噦濮挎€?*/}
            <div className="control-group">
              <div className="control-group-title">閽昏噦濮挎€?/div>

              <div className="control-item">
                <div className="control-label-row">
                  <span className="control-label">涓惧崌瑙掑害 (+65掳/-30掳)</span>
                  <span className="control-value">{params.liftAngle}掳</span>
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
                  <span className="control-label">鎽嗗姩瑙掑害 (卤45掳)</span>
                  <span className="control-value">{params.swingAngle}掳</span>
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

            {/* 鍥村博鍙傛暟 */}
            <div className="control-group">
              <div className="control-group-title">鍥村博鍙傛暟</div>

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

            {/* 浠跨湡鎸囨爣 */}
            <div className="control-group">
              <div className="control-group-title">浠跨湡鎸囨爣</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <MetricMini label="鍗曞瓟鏃堕棿" value={metrics.singleHoleTimeStr} unit="min" color="amber" />
                <MetricMini label="閽昏繘閫熷害" value={metrics.actualSpeed} unit="m/min" color="amber" />
                <MetricMini label="鎬诲瓟鏁? value={metrics.totalHoles} unit="涓? color="blue" />
                <MetricMini label="鎬绘椂闀? value={metrics.totalDrillTime} unit="min" color="blue" />
                <MetricMini label="鑳借€? value={metrics.energyConsumption} unit="kWh" color="green" />
                <MetricMini label="鐖嗙牬鏂归噺" value={metrics.blastingVolume} unit="m鲁" color="green" />
              </div>
            </div>

            {/* 浠跨湡鎺у埗鎸夐挳 */}
            <div className="sim-btn-group">
              <button
                className={`sim-btn primary ${isSimulating ? 'running' : ''}`}
                onClick={onSimulate}
              >
                {isSimulating ? '鍋滄浠跨湡' : '寮€濮嬩豢鐪?}
              </button>
            </div>
          </>
        )}

        {/* Console mode: show console panel */}
        {viewMode === 'console' && (
          <div style={{ padding: '4px 0' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: '1.5' }}>
              鎷栧姩鎿嶇旱鏉嗘帶鍒堕捇鑷傝繍鍔紝鐐瑰嚮鎸夐挳鍜屾棆閽皟鏁村弬鏁?            </div>
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


// ===== src/DataDashboard.jsx =====
/* ============================================================
   鏁版嵁鍒嗘瀽鐪嬫澘缁勪欢
   鍖呭惈閽诲瓟鏁堢巼鏇茬嚎銆佷笁鑷傚崗鍚屾椂闂磋酱銆佽秴娆犳寲鎺у埗銆佽兘鑰楃粺璁?   ============================================================ */

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
          let html = `<div style="font-weight:600;margin-bottom:4px">娣卞害 ${depth} m</div>`;
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
        data: ['宸﹂捇鑷?, '涓捇鑷?, '鍙抽捇鑷?],
        top: 2,
        right: 8,
        textStyle: { color: '#9aa0a6', fontSize: 10 },
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: 'category',
        data: depthPoints,
        name: '娣卞害 (m)',
        nameTextStyle: { color: '#6b7280', fontSize: 10 },
        axisLine: { lineStyle: { color: '#363c4a' } },
        axisLabel: { color: '#6b7280', fontSize: 10 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        name: '閽昏繘閫熷害 m/min',
        nameTextStyle: { color: '#6b7280', fontSize: 10 },
        axisLine: { lineStyle: { color: '#363c4a' } },
        axisLabel: { color: '#6b7280', fontSize: 10 },
        splitLine: { lineStyle: { color: '#2a2f3a', type: 'dashed' } },
      },
      series: [
        {
          name: '宸﹂捇鑷?,
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
          name: '涓捇鑷?,
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
          name: '鍙抽捇鑷?,
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
      { name: '鍙拌溅瀹氫綅', start: 0, duration: 3, color: '#6b7280' },
      { name: '灞曞紑閽昏噦', start: 3, duration: 2, color: '#8b5cf6' },
      { name: '寮€瀛斿畾浣?, start: 5, duration: 3, color: '#f59e0b' },
      { name: '鎺忔Ы鐪?, start: 8, duration: 15, color: '#ef4444' },
      { name: '杈呭姪鐪?, start: 23, duration: 30, color: '#f59e0b' },
      { name: '鍛ㄨ竟鐪?, start: 53, duration: 20, color: '#10b981' },
      { name: '娓呭瓟绉讳綅', start: 73, duration: 5, color: '#3b82f6' },
    ];

    const armNames = ['宸﹂捇鑷?, '涓捇鑷?, '鍙抽捇鑷?];
    const seriesData = [];

    // Each arm does similar sequence but with slight offsets
    armNames.forEach((arm, armIdx) => {
      const offset = armIdx * 0.5; // stagger start
      phases.forEach((phase, phaseIdx) => {
        // Some phases are shared, some are arm-specific
        let actualStart = phase.start + offset;
        let actualDur = phase.duration;

        // Center arm doesn't do cut holes (left+right do)
        if (phase.name === '鎺忔Ы鐪? && armIdx === 1) {
          actualDur = phase.duration * 0.3;
        }
        // Center arm does more perimeter (top)
        if (phase.name === '鍛ㄨ竟鐪? && armIdx === 1) {
          actualDur = phase.duration * 1.2;
        }
        // Left/right do more bottom perimeter
        if (phase.name === '鍛ㄨ竟鐪? && armIdx !== 1) {
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
            <div>寮€濮? ${d.value[1].toFixed(1)} min</div>
            <div>缁撴潫: ${d.value[2].toFixed(1)} min</div>
            <div>鏃堕暱: ${(d.value[2] - d.value[1]).toFixed(1)} min</div>`;
        }
      },
      xAxis: {
        type: 'value',
        name: '鏃堕棿 (min)',
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
        data: ['瓒呮寲鐜?, '娆犳寲鐜?],
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
              { xAxis: 5, label: { formatter: '鍚堟牸绾?, color: '#10b981', fontSize: 9, position: 'insideEndTop' } }
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
            { value: impactEnergy, name: '鍐插嚮绯荤粺', itemStyle: { color: '#ef4444' } },
            { value: rotationEnergy, name: '鏃嬭浆绯荤粺', itemStyle: { color: '#f59e0b' } },
            { value: hydraulicEnergy, name: '娑插帇绯荤粺', itemStyle: { color: '#3b82f6' } },
            { value: chassisEnergy, name: '搴曠洏鍔ㄥ姏', itemStyle: { color: '#10b981' } },
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
            text: 'kWh/寰幆',
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
      {/* KPI 鍗＄墖 */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span>鏍稿績鎸囨爣</span>
        </div>
        <div className="dash-card-body">
          <div className="kpi-grid">
            <div className="kpi-item">
              <div className="kpi-value">{metrics.cycleAdvance}<span className="kpi-unit">m</span></div>
              <div className="kpi-label">鍗曞惊鐜繘灏?/div>
            </div>
            <div className="kpi-item">
              <div className="kpi-value">{metrics.totalDrillTime.toFixed(0)}<span className="kpi-unit">min</span></div>
              <div className="kpi-label">寰幆鎬绘椂闀?/div>
            </div>
            <div className="kpi-item">
              <div className="kpi-value">{metrics.blastingVolume.toFixed(0)}<span className="kpi-unit">m鲁</span></div>
              <div className="kpi-label">鐖嗙牬鏂归噺</div>
            </div>
            <div className="kpi-item">
              <div className="kpi-value">{metrics.totalHoles}<span className="kpi-unit">瀛?/span></div>
              <div className="kpi-label">鎬荤偖瀛旀暟</div>
            </div>
          </div>
        </div>
      </div>

      {/* Drilling efficiency curve */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span>閽诲瓟鏁堢巼鏇茬嚎</span>
        </div>
        <div className="dash-card-body">
          <EChart option={efficiencyOption} />
        </div>
      </div>

      {/* Three-arm timeline */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span>涓夎噦鍗忓悓鏃堕棿杞?/span>
        </div>
        <div className="dash-card-body">
          <EChart option={timelineOption} />
        </div>
      </div>

      {/* Energy + overbreak combined - use blast hole view here */}
      <div className="dash-card">
        <div className="dash-card-header">
          <span>鎺屽瓙闈㈠竷瀛斿浘</span>
        </div>
        <div className="dash-card-body">
          <BlastHoleView params={params} />
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DataDashboard, EChart });


// ===== src/BlastHoleView.jsx =====
/* ============================================================
   鎺屽瓙闈㈠竷瀛斿彲瑙嗗寲缁勪欢
   灞曠ず鎺忔Ы鐪笺€佽緟鍔╃溂銆佸懆杈圭溂甯冪疆锛屼互鍙婁笁鑷傚垎宸?
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

    // Cut holes (鎺忔Ы鐪? - 涓績鍖哄煙锛屾褰?鐩寸溂
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

    // Assist holes (杈呭姪鐪? - 涓棿鐜舰鍖哄煙
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

    // Perimeter holes (鍛ㄨ竟鐪? - 杞粨绾夸笂
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
          鎬诲瓟鏁? {counts.total}
        </text>
      </svg>
    </div>
  );
}

Object.assign(window, { BlastHoleView });


// ===== src/ConsolePanel.jsx =====
/* ============================================================
   涓夎噦鍑垮博鍙拌溅鎿嶄綔鍙版暟瀛楀鐢熼潰鏉?   鍩轰簬涓搧瑁呭DJ3G鐪熷疄鎿嶄綔鍙板竷灞€
   ============================================================ */

function ConsolePanel({ selectedArm = 'center', onArmChange, onAction, params }) {
  const [gauges, setGauges] = React.useState({
    rotary: 120,    // 鍥炶浆鍘嬪姏 bar
    impact: 180,    // 鍐插嚮鍘嬪姏 bar
    thrust: 150,    // 鎺ㄨ繘鍘嬪姏 bar
    air: 6,         // 姘斿帇 bar
    water: 12,      // 姘村帇 MPa
  });

  const [buttons, setButtons] = React.useState({
    pumpOn: false,
    lubrication: false,
    highImpact: false, // 楂樺啿/浣庡啿
    emergencyStop: false,
    bigHole: false,
    water: false,
    forceImpact: false,
  });

  const [knobs, setKnobs] = React.useState({
    rotary: 50,    // 鍥炶浆妯″紡 0-100
    impact: 60,    // 鍐插嚮妯″紡
    thrust: 70,    // 鎺ㄨ繘妯″紡
    thrustAdjust: 40, // 鎺ㄨ繘鍘嬪姏璋冭妭
  });

  const [joysticks, setJoysticks] = React.useState({
    main: { x: 0, y: 0 }, // 涓绘搷绾垫潌锛堝ぇ鑷備笂涓?宸﹀彸锛?  });

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
    const angle = -120 + percentage * 240; // -120掳 to 120掳

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
        1鍙疯噦 路 2鍙疯噦 路 3鍙疯噦 鎿嶄綔鎺у埗鍙?      </div>

      <div className="console-main">
        {/* Pressure gauge row - 5 gauges per arm */}
        <div className="gauge-row">
          <PressureGauge value={gauges.rotary} max={250} label="鍥炶浆鍘嬪姏" color="#ef4444" />
          <PressureGauge value={gauges.impact} max={250} label="鍐插嚮鍘嬪姏" color="#f59e0b" />
          <PressureGauge value={gauges.thrust} max={250} label="鎺ㄨ繘鍘嬪姏" color="#3b82f6" />
          <PressureGauge value={gauges.air} max={10} label="姘斿帇琛? unit="MPa" color="#10b981" />
          <PressureGauge value={gauges.water} max={20} label="姘村帇琛? unit="MPa" color="#06b6d4" />
        </div>

        {/* Main joystick */}
        <div className="joystick-row">
          <div className="joystick-col">
            <div className="joystick-main-label">澶ц噦鎿嶇旱鏉?/div>
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
              <span>宸?/span>
              <span>鍙?/span>
            </div>
          </div>
        </div>

        {/* Sub-controls: 4 lever row + buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
          {/* 4 small levers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center' }}>鍔ㄤ綔閫夋嫨</div>
            <div style={{ display: 'flex', gap: 3 }}>
              {['姊佸洖杞?, '姊佷刊浠?, '鑷備几缂?, '姊佷几缂?].map((label, i) => (
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
                  {buttons.pumpOn ? '鈼? : '鈼?}
                </button>
                <div className="console-btn-label">娉祘buttons.pumpOn ? '璧? : '鍋?}</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  className={`console-btn red`}
                  onClick={() => toggleButton('pumpOn')}
                  style={{ opacity: !buttons.pumpOn ? 1 : 0.5 }}
                >
                  鈼?                </button>
                <div className="console-btn-label">娉靛仠</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ textAlign: 'center' }}>
                <button
                  className={`console-btn ${buttons.lubrication ? 'green' : ''}`}
                  style={{ opacity: buttons.lubrication ? 1 : 0.6, width: '22px', height: '22px', fontSize: '8px' }}
                  onClick={() => toggleButton('lubrication')}
                >
                  馃挧
                </button>
                <div className="console-btn-label">娑︽粦</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <button
                  className={`console-btn emergency`}
                  style={{ fontSize: '8px' }}
                  onClick={() => toggleButton('emergencyStop')}
                >
                  鎬ュ仠
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
              楂樺啿 / 浣庡啿
            </div>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {buttons.highImpact ? '楂橀鍐插嚮' : '浣庨鍐插嚮'}
            </div>
          </div>

          {/* Mode knobs */}
          <div className="knob-row">
            {[
              { key: 'rotary', label: '鍥炶浆' },
              { key: 'impact', label: '鍐插嚮' },
              { key: 'thrust', label: '鎺ㄨ繘' },
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
            <div className="knob-label">鎺ㄨ繘璋冭妭</div>
          </div>
        </div>

        {/* Bottom switches */}
        <div className="switch-panel" style={{ marginTop: '6px' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginBottom: '4px' }}>鍔熻兘寮€鍏?/div>
          <div className="switch-grid">
            {[
              { key: 'bigHole', label: '澶у瓟' },
              { key: 'water', label: '姘存皵' },
              { key: 'forceImpact', label: '寮哄埗鍐插嚮' },
              { key: 'lubrication2', label: '娑︽粦' },
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


// ===== src/TrainingMode.jsx =====
/* ============================================================
   鏁欏妯″紡缁勪欢 - 鏁欏寮曞 / 鑰冩牳璇勫垎
   ============================================================ */

const TEACHING_STEPS = [
  {
    id: 1,
    title: '鍙拌溅瀹氫綅',
    description: '灏嗕笁鑷傚嚳宀╁彴杞﹁椹惰嚦鎺屽瓙闈㈠墠鏂瑰悎閫備綅缃紝纭繚鍙拌溅涓績绾夸笌闅ч亾涓績绾垮榻愩€傛敞鎰忚瀵熸帉瀛愰潰鎯呭喌锛岄鐣欏畨鍏ㄤ綔涓氳窛绂汇€?,
    knowledge: '銆愪竴蹇冧簲鐐广€戞帶鍒堕毀閬撲腑蹇冧綅缃拰浜斾釜寮€鎸栬疆寤撶偣锛堟嫳椤躲€佸乏鍙虫嫳鑲┿€佸乏鍙宠竟澧欙級锛岀‘淇濆彴杞﹀畾浣嶅噯纭€?,
    action: '瀹氫綅',
  },
  {
    id: 2,
    title: '灞曞紑閽昏噦',
    description: '渚濇灞曞紑涓変釜閽昏噦锛?鍙峰乏鑷傘€?鍙蜂腑鑷傘€?鍙峰彸鑷傦級锛屾敞鎰忓悇鑷備箣闂寸殑瀹夊叏璺濈锛岄槻姝㈢鎾炪€傚厛灞曞紑宸﹀彸鑷傦紝鍐嶅睍寮€涓噦銆?,
    knowledge: '銆愪竴绾夸袱绔€戝彴杞﹀ぇ鑷備笌闅ч亾涓績绾垮钩琛岋紙涓€绾匡級锛屾帹杩涙鍓嶅悗绔偣浣嶇疆鍑嗙‘锛堜袱绔級锛屼繚璇侀捇瀛旀柟鍚戞纭€?,
    action: '灞曞紑',
  },
  {
    id: 3,
    title: '璋冩暣閽绘潌瑙掑害',
    description: '鏍规嵁甯冨瓟璁捐锛岃皟鏁村悇閽昏噦鐨勪妇鍗囪搴︺€佹憜鍔ㄨ搴﹀拰鎺ㄨ繘姊佷刊浠拌搴︺€備娇鐢ㄨ搴︿紶鎰熷櫒璇绘暟杩涜绮剧‘璋冩暣锛屽厑璁稿亸宸墹0.8掳銆?,
    knowledge: '瑙掑害鍋忓樊>0.8掳鏃惰嚜鍔≒ID闂幆绾犲亸銆傚懆杈圭溂瑙掑害鎺у埗绮惧害鐩存帴褰卞搷鍏夐潰鐖嗙牬鏁堟灉鍜岃秴娆犳寲閲忋€?,
    action: '璋冩暣瑙掑害',
  },
  {
    id: 4,
    title: '寮€瀛斿畾浣?,
    description: '灏嗛捇閽诲ご瀵瑰噯瀛斾綅鏍囪锛岀紦鎱㈡帹杩涘紑瀛斻€傚紑瀛旈樁娈甸噰鐢ㄤ綆鍐插嚮銆佷綆鎺ㄨ繘妯″紡锛岀‘璁ゅ瓟浣嶅噯纭悗鍐嶈浆鍏ュ叏鍔熺巼閽诲瓟銆?,
    knowledge: '銆愪竴楂樹竴浣庛€戞帹杩涙灏鹃儴楂樺害锛堜竴楂橈級鍐冲畾閽诲瓟浠拌锛屽紑瀛斿鏈€浣庝綅缃紙涓€浣庯級纭繚閽诲瓟璧峰鐐瑰噯纭€?,
    action: '寮€瀛?,
  },
  {
    id: 5,
    title: '鍏ㄥ姛鐜囬捇瀛?,
    description: '纭寮€瀛旀甯稿悗锛屽垏鎹㈣嚦鍏ㄥ姛鐜囬捇杩涙ā寮忋€傛牴鎹博鐭宠蒋纭疄鏃惰皟鏁村啿鍑诲姛鐜囧拰鎺ㄨ繘閫熷害锛屼繚鎸佹渶浣抽捇杩涙晥鐜囥€?,
    knowledge: '銆愪竴蹇竴鎱€戠‖宀╂參鎺ㄨ繘銆侀珮鍐插嚮锛涜蒋宀╁揩鎺ㄨ繘銆佷綆鍐插嚮銆傛牴鎹洿宀╂儏鍐电伒娲昏皟鏁村啿鍑讳笌鎺ㄨ繘閫熷害鐨勫尮閰嶅叧绯汇€?,
    action: '閽诲瓟',
  },
  {
    id: 6,
    title: '閫€鏉嗚繑鍥?,
    description: '閽诲瓟杈惧埌璁捐娣卞害鍚庯紝鍋滄鍐插嚮锛岀紦鎱㈠洖閫€閽绘潌銆傞€€鏉嗚繃绋嬩腑淇濇寔鏃嬭浆锛岄槻姝㈠崱閽汇€傞€€鏉嗗畬鎴愬悗鎺ㄨ繘姊佽繑鍥炲垵濮嬩綅缃€?,
    knowledge: '閫€鏉嗛€熷害绾︿负閽昏繘閫熷害鐨?.5~2鍊嶃€傚閬囧崱閽伙紝搴斿厛姝ｅ弽杞椿鍔ㄩ捇鏉嗭紝涓ョ寮鸿鎷旀潌銆?,
    action: '閫€鏉?,
  },
];

const EXAM_CRITERIA = [
  { name: '瀛斾綅绮惧害', weight: 25, score: 92, desc: '瀛斾綅鍋忓樊<卤1.8cm杈炬爣' },
  { name: '瑙掑害鎺у埗', weight: 20, score: 88, desc: '瑙掑害鍋忓樊鈮?.8掳杈炬爣' },
  { name: '浣滀笟鏁堢巼', weight: 20, score: 95, desc: '鍗曞瓟鏃堕棿浼樹簬鏍囧噯鍊? },
  { name: '鎿嶄綔瑙勮寖', weight: 15, score: 85, desc: '鎿嶄綔娴佺▼瀹屽叏姝ｇ‘' },
  { name: '瀹夊叏鎰忚瘑', weight: 10, score: 100, desc: '鏃犺繚瑙勬搷浣? },
  { name: '鏁呴殰澶勭悊', weight: 10, score: 78, desc: '鍗￠捇澶勭悊姝ｇ‘' },
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
      grade: totalScore >= 90 ? '浼樼' : totalScore >= 80 ? '鑹ソ' : totalScore >= 70 ? '鍚堟牸' : '涓嶅悎鏍?,
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
            <div className="exam-score-label">缁煎悎璇勫垎</div>
            <div className="exam-grade">{examResults.grade}</div>
          </div>
          <div className="exam-result-body">
            <div className="exam-result-section">
              <div className="exam-result-title">鑰冩牳璇︽儏</div>
              <div className="score-breakdown">
                {examResults.criteria.map((c, i) => (
                  <div key={i} className="score-item">
                    <span className="score-item-name">{c.name}锛坽c.weight}%锛?/span>
                    <span className="score-item-value">{c.score}鍒?/span>
                  </div>
                ))}
              </div>
            </div>
            <div className="exam-result-section">
              <div className="exam-result-title">鑰冩牳鐢ㄦ椂</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--accent-blue)', fontFamily: 'monospace' }}>
                {formatTime(examResults.time)}
              </div>
            </div>
          </div>
          <div className="exam-actions">
            <button className="exam-action-btn" onClick={resetExam}>閲嶆柊鑰冩牳</button>
            <button className="exam-action-btn" onClick={onExit}>杩斿洖缁冧範</button>
            <button className="exam-action-btn primary" onClick={() => window.print && window.print()}>瀵煎嚭鎶ュ憡</button>
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
            鑰冩牳杩涜涓?          </span>
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
            鎻愪氦鑰冩牳
          </button>
        </div>
        <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderBottom: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--accent-red)' }}>
          馃搵 鑰冩牳浠诲姟锛氬畬鎴愭爣鍑嗘柇闈?150 涓偖瀛旂殑閽诲瓟浣滀笟锛岃€冩牳瀛斾綅绮惧害銆佽搴︽帶鍒躲€佷綔涓氭晥鐜囧拰鎿嶄綔瑙勮寖搴?        </div>
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
              鎿嶄綔鑰冩牳妯″紡
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)' }}>
              瀹屾垚鏍囧噯浠诲姟锛岀郴缁熻嚜鍔ㄨ瘎鍒?            </div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>
              鑰冩牳鍐呭
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
                    鏉冮噸 {c.weight}%
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
            <button className="sim-btn" style={{ flex: 1 }} onClick={onExit}>杩斿洖</button>
            <button className="sim-btn primary" style={{ flex: 1 }} onClick={startExam}>
              寮€濮嬭€冩牳
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
              {i < currentStep ? '鉁? : i + 1}
            </div>
            {i < TEACHING_STEPS.length - 1 && (
              <div className={`step-line ${i < currentStep ? 'completed' : ''}`}></div>
            )}
          </React.Fragment>
        ))}
        <span className="step-label">
          姝ラ {currentStep + 1}/{TEACHING_STEPS.length}锛歿step.title}
        </span>
      </div>

      {/* Teaching bubble */}
      <div className="teaching-bubble" style={{
        top: '70px',
        left: '50%',
        transform: 'translateX(-50%)',
      }}>
        <div className="teaching-bubble-header">
          <span style={{ fontSize: '16px' }}>馃懆鈥嶐煆?/span>
          AI 瀹炶瀵煎笀
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
          <div className="knowledge-card-title">馃挕 瀹炶鐭ヨ瘑瑕佺偣</div>
          <div className="knowledge-card-content">{step.knowledge}</div>
        </div>
        <div className="teaching-bubble-footer">
          <span className="teaching-step-indicator">
            杩涘害 {currentStep + 1}/{TEACHING_STEPS.length}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            {currentStep > 0 && (
              <button
                className="teaching-next-btn"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                onClick={handlePrevStep}
              >
                涓婁竴姝?              </button>
            )}
            <button className="teaching-next-btn" onClick={handleNextStep}>
              {currentStep < TEACHING_STEPS.length - 1 ? '涓嬩竴姝? : '瀹屾垚瀛︿範'}
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
          name: '鑰冩牳鎴愮哗',
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


// ===== src/ExamModule.jsx =====
/* ============================================================
   涓搧涓冨眬闅ч亾宸ョ珵璧涜€冩牳璇勫垎绯荤粺
   100鍒嗗埗 路 5澶ч」鐩?路 瀹屽叏瀵规爣鐪熷疄鑱屼笟鎶€鑳界珵璧涙爣鍑?   ============================================================ */

// 瀹屾暣璇勫垎缁嗗垯 - 100鍒嗗埗
const EXAM_ITEMS = [
  {
    id: 'safety',
    name: '瀹夊叏鍩烘湰绱犲吇',
    score: 5,
    children: [
      { id: 's1', name: '姝ｇ‘绌跨潃宸ユ湇锛堥潪鍗婅锛?, score: 1, type: 'deduct' },
      { id: 's2', name: '瀹夊叏甯芥纭僵鎴村浐瀹氱墷鍥?, score: 2, type: 'deduct' },
      { id: 's3', name: '闃叉姢鎵嬪绌挎埓鍚堥€?, score: 1, type: 'deduct' },
      { id: 's4', name: '闃叉姢闉嬬┛鎴寸鍚堣姹?, score: 1, type: 'deduct' },
    ],
  },
  {
    id: 'preparation',
    name: '璁惧鍩烘湰鎿嶄綔鍙婂畨鍏ㄩ┚椹?浣滀笟鍑嗗',
    score: 24,
    children: [
      { id: 'p1', name: '琛岃溅鍓嶈鏄庡墠鍚庢湁鏃犻殰纰嶇墿', score: 1, type: 'deduct' },
      { id: 'p2', name: '琛岃溅鍓嶆鏌ュ悇鎿嶄綔鎵嬫焺銆佹寜閽€佹棆閽姸鎬?, score: 2, type: 'deduct' },
      { id: 'p3', name: '鑷傛灦鏀惰嚦琛岃溅鐘舵€侊紝琛岄┒涓棤纰版挒', score: 1, type: 'deduct' },
      { id: 'p4', name: '鎸夋祦绋嬪紑鏈猴紙9姝ユ祦绋嬶紝婕?椤规墸1鍒嗭級', score: 5, type: 'process', steps: 9 },
      { id: 'p5', name: '姝ｇ‘浣跨敤宸ヤ綔鐏?, score: 1, type: 'deduct' },
      { id: 'p6', name: '寮€鍚數缂嗗嵎鐩樺拰姘寸鍗风洏', score: 1, type: 'deduct' },
      { id: 'p7', name: '椤哄埄閫氳繃鏍堟ˉ锛堣鏃惰瘎鍒嗭級', score: 5, type: 'timed', timeLimit: 240, fullTime: 120, mediumTime: 180 },
      { id: 'p8', name: '鍙拌溅瀹氫綅锛氭憜浣?-2.5绫宠窛鎺屽瓙闈?, score: 1, type: 'deduct' },
      { id: 'p9', name: '鍙拌溅瀹氫綅锛氬紑鍚敮鑵?, score: 1, type: 'deduct' },
      { id: 'p10', name: '鍙拌溅瀹氫綅锛氬叧闂恫鍘嬪姞杞藉紑鍏?, score: 1, type: 'deduct' },
      { id: 'p11', name: '鍙拌溅瀹氫綅锛氫繚鎸佺┖鎸″紑鍚墜鍒?, score: 1, type: 'deduct' },
      { id: 'p12', name: '鍙拌溅瀹氫綅锛氬叧闂杞︾伅', score: 1, type: 'deduct' },
      { id: 'p13', name: '鎺屽瓙闈㈡帓闄╋細鏈烘鑷傚啿鍑诲洖杞竻鐞嗙鐭?, score: 2, type: 'deduct' },
      { id: 'p14', name: '鎺屽瓙闈㈡帓闄╋細纭鎷遍《宸叉棤鍗辩煶', score: 1, type: 'deduct' },
    ],
  },
  {
    id: 'drilling',
    name: '鍑垮博鎿嶄綔鑳藉姏閴村畾-鏍囧噯鍑垮博',
    score: 44,
    children: [
      { id: 'd1', name: '姝ｇ‘閫夋嫨閽昏噦锛堝懆杈瑰瓟1鍙疯噦銆佸簳鏉挎帍妲?鍙疯噦锛?, score: 5, type: 'deduct' },
      { id: 'd2', name: '鍑垮博娴佺▼姝ｇ‘锛堝睍鑷傗啋椤舵鈫掓按鍐测啋娑︽粦鈫掍綆鍥炶浆鈫掍綆鍐插嚮鈫掓帹杩涳級', score: 3, type: 'deduct' },
      { id: 'd3', name: '鍘嬪姏璋冭妭姝ｇ‘锛堜綆鍐插嚮80-90bar銆佷綆鎺ㄨ繘40-50bar锛?, score: 3, type: 'deduct' },
      { id: 'd4', name: '閽昏繘30-50cm鍚庡紑楂樺啿', score: 2, type: 'deduct' },
      { id: 'd5', name: '閫€鏉嗘祦绋嬫纭紙鍏冲啿鍑烩啋閫€鏉嗏啋閫€鑷冲熬閮ㄢ啋澶嶄綅鈫掑叧姹芥按锛?, score: 2, type: 'deduct' },
      { id: 'd6', name: '閽诲瓟鎶€宸э細鍛ㄨ竟瀛斿钩琛岃竟澧?, score: 1, type: 'deduct' },
      { id: 'd7', name: '閽诲瓟鎶€宸э細鎺忔Ы瀛旀帹杩涙鍋忚浆>45掳', score: 1, type: 'deduct' },
      { id: 'd8', name: '閽诲瓟鎶€宸э細搴曟澘瀛旀帹杩涙鍥炶浆>90掳', score: 2, type: 'deduct' },
      { id: 'd9', name: '閽诲瓟鍑嗗害锛堝亸绂?cm鍐呮弧鍒嗭級', score: 5, type: 'precision' },
      { id: 'd10', name: '閽诲瓟鏁堢巼锛?0鍒嗛挓鍐呮弧鍒嗭級', score: 20, type: 'timed', timeLimit: 900, fullTime: 600, mediumTime: 720 },
    ],
  },
  {
    id: 'recovery',
    name: '鏀惰溅',
    score: 12,
    children: [
      { id: 'r1', name: '鑷傛灦鏀跺洖琛岃溅鐘舵€併€佹棤纰版挒', score: 2, type: 'deduct' },
      { id: 'r2', name: '鏀惰溅璁℃椂锛?鍒嗛挓鍐呮弧鍒嗭級', score: 10, type: 'timed', timeLimit: 300, fullTime: 120, mediumTime: 240 },
    ],
  },
  {
    id: 'qa',
    name: '闂瓟',
    score: 15,
    children: [
      { id: 'q1', name: '鎺ㄨ繘姊佹棩甯镐繚鍏荤煡璇嗛棶绛?, score: 15, type: 'qa' },
    ],
  },
];

// 寮€鏈?姝ユ祦绋?const STARTUP_STEPS = [
  '鎵撳紑钃勭數姹犲紑鍏?,
  '鎸′綅寮€鍏崇疆浜庣┖鎸?妗?,
  '鎸変笅澶嶄綅鎸夐挳',
  '鎸夊枃鍙ず鎰?,
  '鍚姩鍙戝姩鏈?,
  '鍚姩娑插帇鍔犺浇寮€鍏?,
  '璋冨ぇ鎵嬪姩娌归棬',
  '鏀舵敮鑵?,
  '鍏抽棴娑插帇鍔犺浇',
];

// 7涓繚鍏荤煡璇嗙偣锛堥棶绛旈鐩級
const MAINTENANCE_QUESTIONS = [
  {
    keyword: '铻烘爴',
    question: '鎺ㄨ繘姊佹棩甯镐繚鍏讳腑锛岃灪鏍撴鏌ョ殑瑕佹眰鏄粈涔堬紵',
    answer: '鎺ㄨ繘姊佽灪鏍撳叏閮ㄦ鏌ユ湁鏃犳澗鍔紝纭繚鎵€鏈夎繛鎺ヨ灪鏍撶揣鍥哄埌浣嶏紝鐗瑰埆鏄帹杩涙瀵艰建鍥哄畾铻烘爴鍜孴鍨嬫杩炴帴铻烘爴銆?,
    scorePoints: '鎺ㄨ繘姊佽灪鏍撳叏閮ㄦ鏌ユ湁鏃犳澗鍔?,
  },
  {
    keyword: '娑︽粦鑴?閽笣缁?,
    question: '閽笣缁虫粦杞殑娑︽粦淇濆吇濡備綍鎿嶄綔锛?,
    answer: '鍦ㄩ挗涓濈怀婊戣疆涓や晶鍔犳敞鏂版鼎婊戣剛锛岀‘淇濇粦杞浆鍔ㄧ伒娲伙紝閽笣缁冲緱鍒板厖鍒嗘鼎婊戙€傚姞娉ㄦ椂搴旇瀵熷埌鏂版鼎婊戣剛浠庡彟涓€渚ф孩鍑轰负姝€?,
    scorePoints: '閽笣缁虫粦杞袱渚ф柊娑︽粦鑴傛墦鍑?,
  },
  {
    keyword: '娑︽粦鑴?娌圭',
    question: '娌圭鍗风洏鐨勬鼎婊戜繚鍏昏鐐规槸浠€涔堬紵',
    answer: '娌圭鍗风洏涓婁笅閮ㄤ綅鍧囬渶鍔犳敞鏂版鼎婊戣剛锛屼繚璇佸嵎鐩樺洖杞伒娲伙紝闃叉閿堣殌鍗℃粸銆傚畾鏈熸鏌ユ补绠℃湁鏃犵（鎹熴€佽€佸寲鐜拌薄銆?,
    scorePoints: '娌圭鍗风洏涓婁笅鏂版鼎婊戣剛鎵撳嚭',
  },
  {
    keyword: '寮犵揣搴?,
    question: '濡備綍妫€鏌ラ挗涓濈怀寮犵揣搴︽槸鍚︽甯革紵',
    answer: '鐢ㄦ墜鎺岀敤鍔涙寜鍘嬮挗涓濈怀锛岀浉瀵规按骞虫柟鍚戝簲鏈夌害5mm宸﹀彸鐨勮繍鍔ㄩ噺銆傝繃鏉鹃渶瑕佸紶绱э紝杩囩揣鍒欓渶瑕佹斁鏉撅紝浠ヤ繚璇佹帹杩涘钩绋炽€佸欢闀垮鍛姐€?,
    scorePoints: '鎵嬫帉鐢ㄥ姏鎸夊帇閽笣缁崇浉瀵规按骞虫柟鍚?mm宸﹀彸杩愬姩閲?,
  },
  {
    keyword: '淇濇姢鏉?,
    question: '鎺ㄨ繘姊佷繚鎶ゆ潯鍙婅€愮（鍧楃殑缁存姢鏂规硶锛?,
    answer: '娑傛鼎婊戞补瀵规帹杩涙淇濇姢鏉″強鑰愮（鍧楄繘琛屾棩甯哥淮鎶わ紝鍑忓皯鍑垮博鏈烘粦鏋朵笌鎺ㄨ繘姊佷箣闂寸殑鎽╂摝纾ㄦ崯锛屽欢闀夸娇鐢ㄥ鍛姐€傚畾鏈熸鏌ョ（鎹熼噺锛岃秴宸強鏃舵洿鎹€?,
    scorePoints: '娑傛鼎婊戞补瀵规帹杩涙淇濇姢鏉″強鑰愮（鍧楁棩甯哥淮鎶?,
  },
  {
    keyword: '绌烘帹鍘嬪姏',
    question: '閽绘満绌烘帹鍘嬪姏鐨勬爣鍑嗘槸澶氬皯锛熶负浠€涔堣妫€鏌ワ紵',
    answer: '淇濊瘉閽绘満绌烘帹鍘嬪姏涓嶉珮浜?0bar銆傜┖鎺ㄥ帇鍔涜繃楂樿鏄庢帹杩涢樆鍔涘ぇ锛屽彲鑳芥槸淇濇姢鏉＄（鎹熻繃澶с€佸杞ㄥ彉褰㈡垨娑︽粦涓嶈壇锛岄渶鍙婃椂鎺掓煡澶勭悊銆?,
    scorePoints: '淇濊瘉閽绘満绌烘帹鍘嬪姏涓嶉珮浜?0bar',
  },
  {
    keyword: '姘村皝',
    question: '鍑垮博鏈烘按灏佸畨瑁呮湁浠€涔堣姹傦紵',
    answer: '姘村皝瀹夎姝ｇ‘鏃犺锛屾柟鍚戜笉鑳借鍙嶏紝瀵嗗皝闈㈠簲瀹屽ソ鏃犳崯浼ゃ€傛按灏佸け鏁堜細瀵艰嚧杩涙按杩涙补锛屼弗閲嶅奖鍝嶅嚳宀╂満浣跨敤瀵垮懡锛屽繀椤诲畾鏈熸鏌ユ洿鎹€?,
    scorePoints: '姘村皝瀹夎姝ｇ‘鏃犺',
  },
];

const EXAM_TASK_DESCRIPTION = `
鏌愰搧璺毀閬揑V绾у洿宀╁叏鏂潰寮€鎸栨柇闈紝鏂潰灏哄瀹?4m脳楂?0m銆?璇烽┚椹朵笁鑷傚嚳宀╁彴杞﹁繘琛屾墦瀛旀搷浣滐紝瑕佹眰瀹屾垚锛?  鈶?鍛ㄨ竟瀛?1涓紙浣跨敤1鍙峰乏鑷傦級
  鈶?鎺忔Ы瀛?1涓紙浣跨敤2鍙蜂腑鑷傦級
  鈶?搴曟澘瀛?1涓紙浣跨敤2鍙蜂腑鑷傦級
鎵撳瓟瀹屾垚鍚庢寜瑙勮寖鏀惰溅鑷宠杞︾姸鎬併€?`;

// 璁＄畻璁℃椂椤圭洰寰楀垎
function calcTimedScore(maxScore, actualTime, fullTime, mediumTime, lowTime) {
  if (actualTime <= fullTime) return maxScore;
  if (actualTime <= mediumTime) return Math.round(maxScore * 0.8);
  if (actualTime <= lowTime) return Math.round(maxScore * 0.6);
  return 0;
}

// 璁＄畻绮惧害椤圭洰寰楀垎
function calcPrecisionScore(maxScore, deviationCm) {
  if (deviationCm <= 1) return maxScore;
  if (deviationCm <= 3) return Math.round(maxScore * 0.8);
  if (deviationCm <= 5) return Math.round(maxScore * 0.6);
  return 0;
}

function ExamModule({ mode, onExit, drillState, params, sceneRef }) {
  // 鑰冭瘯闃舵: intro / prep / operating / qa / result
  const [examPhase, setExamPhase] = React.useState('intro');
  const [prepTime, setPrepTime] = React.useState(120); // 鍑嗗鏃堕棿2鍒嗛挓
  const [operateTime, setOperateTime] = React.useState(0); // 姝ｅ紡鎿嶄綔鏃堕棿
  const [maxOperateTime] = React.useState(1500); // 25鍒嗛挓

  // 璇勫垎鐘舵€?  const [scores, setScores] = React.useState({});
  const [deductions, setDeductions] = React.useState({});
  const [startupChecked, setStartupChecked] = React.useState([]);
  const [deviation, setDeviation] = React.useState(1.5); // 妯℃嫙瀛斾綅鍋忓樊
  const [drillStartTime, setDrillStartTime] = React.useState(null);
  const [drillEndTime, setDrillEndTime] = React.useState(null);
  const [recoveryStartTime, setRecoveryStartTime] = React.useState(null);
  const [recoveryEndTime, setRecoveryEndTime] = React.useState(null);

  // 闂瓟
  const [qaQuestions, setQaQuestions] = React.useState([]);
  const [currentQIndex, setCurrentQIndex] = React.useState(0);
  const [qaAnswer, setQaAnswer] = React.useState('');
  const [qaResults, setQaResults] = React.useState([]);
  const [qaSubmitted, setQaSubmitted] = React.useState(false);

  // 鏍堟ˉ閫氳繃
  const [trestlePassed, setTrestlePassed] = React.useState(false);
  const [trestleTime, setTrestleTime] = React.useState(0);

  // 鍒濆鍖栬€冭瘯 - 闅忔満閫?閬撻
  React.useEffect(() => {
    if (mode === 'exam' && examPhase === 'intro') {
      const shuffled = [...MAINTENANCE_QUESTIONS].sort(() => Math.random() - 0.5);
      setQaQuestions(shuffled.slice(0, 3));
    }
  }, [mode, examPhase]);

  // 鍑嗗鍊掕鏃?  React.useEffect(() => {
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

  // 鎿嶄綔璁℃椂
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
    // 鍒濆鍖栧畨鍏ㄩ」榛樿鍏ㄥ
    setScores({
      s1: 1, s2: 2, s3: 1, s4: 1, // 瀹夊叏鍏ㄧ粰
      p1: 0, p2: 0, p3: 1, // 琛岃溅鍑嗗闇€瑕佹搷浣?      p4: 0, p5: 0, p6: 0, p7: 0,
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

  // 妯℃嫙鎿嶄綔鎸夐挳 - 璁板綍鎿嶄綔姝ラ瀹屾垚鎯呭喌
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
      // 寮€鏈?姝ュ畬鎴愬害璇勫垎
      const p4Score = Math.round((newChecked.length / 9) * 5);
      setScores(s => ({ ...s, p4: p4Score }));
      return newChecked;
    });
  };

  // 杩涘叆闂瓟鐜妭
  const goToQA = () => {
    // 鍦ㄦ涔嬪墠璁＄畻閽诲瓟鏃堕棿寰楀垎
    if (drillStartTime && drillEndTime) {
      const drillTime = drillEndTime - drillStartTime;
      const d10Score = calcTimedScore(20, drillTime, 600, 720, 900);
      setScores(prev => ({ ...prev, d10: d10Score }));
    }
    setExamPhase('qa');
  };

  // 鎻愪氦闂瓟绛旀
  const submitQaAnswer = () => {
    const currentQ = qaQuestions[currentQIndex];
    if (!currentQ) return;

    // 妯℃嫙璇勫垎 - 妫€鏌ョ瓟妗堟槸鍚﹀寘鍚叧閿瘝
    const answerLower = qaAnswer.toLowerCase();
    const keywordHits = currentQ.scorePoints.split('').filter(c =>
      answerLower.includes(c)
    ).length;

    const perQuestionScore = 15 / 3; // 3閬撻鍏?5鍒?    const hitRatio = Math.min(1, keywordHits / Math.max(1, currentQ.scorePoints.length * 0.3));
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
      // 鎵€鏈夐棶绛斿畬鎴愶紝杩涘叆缁撴灉椤?      finalizeExam();
    }
  };

  // 鏀惰溅瀹屾垚
  const finishRecovery = () => {
    const recoveryTime = Math.floor(Math.random() * 120) + 60; // 妯℃嫙1-3鍒嗛挓
    setRecoveryEndTime(Date.now());
    const r2Score = calcTimedScore(10, recoveryTime, 120, 240, 300);
    setScores(prev => ({ ...prev, r1: 2, r2: r2Score }));
    goToQA();
  };

  // 鏈€缁堣绠楁垚缁?  const finalizeExam = () => {
    setExamPhase('result');
  };

  // 璁＄畻鎬诲垎
  const totalScore = React.useMemo(() => {
    return Object.values(scores).reduce((sum, s) => sum + (s || 0), 0);
  }, [scores]);

  const grade = totalScore >= 90 ? '浼樼' : totalScore >= 80 ? '鑹ソ' : totalScore >= 60 ? '鍚堟牸' : '涓嶅悎鏍?;
  const gradeColor = totalScore >= 90 ? '#10b981' : totalScore >= 80 ? '#3b82f6' : totalScore >= 60 ? '#f59e0b' : '#ef4444';

  // === 娓叉煋鍚勪釜闃舵 ===

  if (mode !== 'exam') return null;

  // 浠嬬粛椤?  if (examPhase === 'intro') {
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
              涓搧涓冨眬 路 闅ч亾宸ヨ亴涓氭妧鑳界珵璧?            </div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#fff' }}>
              涓夎噦鍑垮博鍙拌溅鎿嶄綔鑰冩牳
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>
              婊″垎 100 鍒?路 100鍒嗗埗瑁佸垽璇勫垎琛?            </div>
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
                馃搵 鑰冩牳浠诲姟
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.7', whiteSpace: 'pre-line' }}>
                {EXAM_TASK_DESCRIPTION.trim()}
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '10px' }}>
              鑰冩牳椤圭洰涓庡垎鍊?            </div>
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
                    {item.score}鍒?                  </span>
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
              <div style={{ fontWeight: '700', marginBottom: '4px' }}>鈿?鑰冩牳瑙勫垯</div>
              路 鍑嗗鏃堕棿锛?鍒嗛挓锛堜笉璁″叆鎿嶄綔鏃堕棿锛?br />
              路 姝ｅ紡鎿嶄綔鏃堕棿锛?5鍒嗛挓锛岃秴鏃惰嚜鍔ㄤ氦鍗?br />
              路 闂瓟鐜妭锛氶殢鏈烘娊鍙?閬撴帹杩涙淇濆吇棰?br />
              路 浣滃紛鎴栦弗閲嶈繚瑙勭洿鎺ュ垽0鍒?            </div>
          </div>

          <div style={{
            display: 'flex', gap: '10px',
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            flexShrink: 0,
          }}>
            <button className="sim-btn" style={{ flex: 1 }} onClick={onExit}>杩斿洖缁冧範</button>
            <button className="sim-btn primary" style={{ flex: 1 }} onClick={startExam}>
              杩涘叆鑰冨満
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 鍑嗗闃舵
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
          鍑嗗闃舵
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>
          鐔熸倝鎿嶄綔鍙板竷灞€涓?D鍦烘櫙锛屽噯澶囧紑濮嬫搷浣?        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>鍑嗗鍊掕鏃?/div>
        <div style={{
          fontSize: '28px', fontWeight: '800', fontFamily: 'monospace',
          color: prepTime <= 30 ? 'var(--accent-red)' : 'var(--accent-amber)',
          minWidth: '80px', textAlign: 'right',
        }}>
          {formatTime(prepTime)}
        </div>
        <button className="sim-btn primary" style={{ padding: '6px 14px' }} onClick={() => setExamPhase('operating')}>
          寮€濮嬫搷浣?鈫?        </button>
      </div>
    );
  }

  // 鎿嶄綔闃舵
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
          鈼?鑰冩牳杩涜涓?        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
          鍓╀綑鏃堕棿
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
          <ExamStepBadge label="瀹夊叏" done={scores.s1 > 0} />
          <ExamStepBadge label="寮€鏈? done={scores.p4 > 0} />
          <ExamStepBadge label="瀹氫綅" done={scores.p8 > 0} />
          <ExamStepBadge label="閽诲瓟" done={scores.d1 > 0} />
          <ExamStepBadge label="鏀惰溅" done={scores.r1 > 0} />
          <ExamStepBadge label="闂瓟" done={examPhase === 'qa'} />
        </div>

        <div style={{ display: 'flex', gap: '6px' }}>
          <button className="sim-btn" style={{ padding: '5px 10px', fontSize: '10px' }}
            onClick={() => {
              // 妯℃嫙瀹屾垚閽诲瓟
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
            瀹屾垚閽诲瓟
          </button>
          <button className="sim-btn primary" style={{ padding: '5px 10px', fontSize: '10px' }}
            onClick={finishRecovery}>
            瀹屾垚鏀惰溅 鈫?          </button>
        </div>
      </div>
    );
  }

  // 闂瓟闃舵
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
              <span style={{ fontSize: '18px' }}>馃懆鈥嶐煆?/span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent-purple)' }}>
                AI 瀵煎笀鎻愰棶鐜妭
              </span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                绗?{currentQIndex + 1} / {qaQuestions.length} 棰?              </span>
            </div>
          </div>

          <div style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
              璇峰洖绛斿叧浜庢帹杩涙鏃ュ父淇濆吇鐨勯棶棰橈細
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
              Q锛歿currentQ?.question}
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
              placeholder="璇疯緭鍏ヤ綘鐨勫洖绛?.."
              value={qaAnswer}
              onChange={e => setQaAnswer(e.target.value)}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                姣忛5鍒?路 鍏?棰?路 闂瓟婊″垎15鍒?              </span>
              <button
                className="sim-btn primary"
                style={{ padding: '6px 18px' }}
                disabled={!qaAnswer.trim()}
                onClick={submitQaAnswer}
              >
                鎻愪氦绛旀
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 闂瓟缁撴灉灞曠ず
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
              {lastResult.gotScore >= lastResult.maxScore ? '鉁?鍥炵瓟姝ｇ‘' : lastResult.gotScore > lastResult.maxScore * 0.6 ? '鈿?閮ㄥ垎姝ｇ‘' : '鉂?鍥炵瓟涓嶅畬鏁?}
            </span>
            <span style={{
              fontSize: '18px', fontWeight: '800',
              color: lastResult.gotScore > lastResult.maxScore * 0.6 ? 'var(--accent-green)' : 'var(--accent-red)',
            }}>
              {lastResult.gotScore} / {lastResult.maxScore}鍒?            </span>
          </div>

          <div style={{ padding: '16px 20px', maxHeight: '50vh', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
              棰樼洰锛歿currentQ?.question}
            </div>

            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--accent-amber)', fontWeight: '600', marginBottom: '4px' }}>
                浣犵殑鍥炵瓟
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
                {lastResult.userAnswer || '锛堟湭浣滅瓟锛?}
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--accent-green)', fontWeight: '600', marginBottom: '4px' }}>
                鍙傝€冪瓟妗堬紙寰楀垎瑕佺偣锛歿lastResult.scorePoints}锛?              </div>
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
              宸插畬鎴?{currentQIndex + 1} / {qaQuestions.length} 棰?              锛堥棶绛旂疮璁?{scores.q1 || 0} / 15鍒嗭級
            </span>
            <button className="sim-btn primary" onClick={nextQaQuestion}>
              {currentQIndex < qaQuestions.length - 1 ? '涓嬩竴棰?鈫? : '鏌ョ湅鏈€缁堟垚缁?}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 缁撴灉椤?- 瑁佸垽璇勫垎琛ㄦ牱寮?  if (examPhase === 'result') {
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
          {/* 鎴愮哗澶撮儴 */}
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
              涓搧涓冨眬闅ч亾宸ョ珵璧涜瘎鍒嗚〃
            </div>
            <div style={{
              position: 'absolute', top: '10px', left: '14px',
              fontSize: '10px', color: 'rgba(255,255,255,0.6)',
            }}>
              鍙傝禌鍙凤細TJ-2026-001
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
              鎿嶄綔鏃堕暱锛歿formatTime(operateTime)}
            </div>
          </div>

          {/* 璇勫垎琛?*/}
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
                  }}>搴忓彿</th>
                  <th style={{
                    padding: '8px 10px', textAlign: 'left',
                    borderBottom: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)', fontWeight: '700',
                    width: '55%',
                  }}>鑰冩牳椤圭洰鍙婅瘎鍒嗘爣鍑?/th>
                  <th style={{
                    padding: '8px 10px', textAlign: 'center',
                    borderBottom: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)', fontWeight: '700',
                    width: '10%',
                  }}>閰嶅垎</th>
                  <th style={{
                    padding: '8px 10px', textAlign: 'center',
                    borderBottom: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)', fontWeight: '700',
                    width: '10%',
                  }}>寰楀垎</th>
                  <th style={{
                    padding: '8px 10px', textAlign: 'left',
                    borderBottom: '2px solid var(--accent-amber)',
                    color: 'var(--text-primary)', fontWeight: '700',
                    width: '20%',
                  }}>鎵ｅ垎璇存槑</th>
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
                        {gi + 1}銆亄group.name}
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
                            {isFull ? '杈炬爣' : (deduction || `鎵?{item.score - itemScore}鍒哷)}
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
                    鍚堣
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

            {/* 瑁佸垽绛惧瓧鍖?*/}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '20px',
              paddingTop: '12px',
              borderTop: '1px dashed var(--border-color)',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}>
              <div>鍙傝禌閫夋墜绛惧瓧锛歘_____________</div>
              <div>瑁佸垽绛惧瓧锛歘_____________</div>
              <div>鏃ユ湡锛歘___骞確_鏈坃_鏃?/div>
            </div>
          </div>

          {/* 鎿嶄綔鎸夐挳 */}
          <div style={{
            display: 'flex',
            gap: '10px',
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
          }}>
            <button className="sim-btn" style={{ flex: 1 }} onClick={() => setExamPhase('intro')}>
              閲嶆柊鑰冩牳
            </button>
            <button className="sim-btn" style={{ flex: 1 }} onClick={onExit}>
              杩斿洖鑷敱缁冧範
            </button>
            <button className="sim-btn primary" style={{ flex: 1 }} onClick={() => window.print()}>
              鎵撳嵃璇勫垎琛?            </button>
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
      {done ? '鉁?' : ''}{label}
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


// ===== src/App.jsx =====
/* ============================================================
   涓诲簲鐢ㄧ粍浠?- 涓夎噦鍑垮博鍙拌溅浠跨湡瀹炶AI瀵煎笀
   鐢典俊鏉牎鍥櫤鑳戒綋搴旂敤鍒涙柊澶ц禌鍙傝禌浣滃搧
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
    if (question.includes('纭博') || question.includes('鑺卞矖宀?)) {
      setParams(prev => ({ ...prev, rockGrade: 1, impactPower: 31 }));
    } else if (question.includes('杞博') || question.includes('娉ュ博')) {
      setParams(prev => ({ ...prev, rockGrade: 5, impactPower: 24 }));
    } else if (question.includes('鍏夐潰鐖嗙牬') || question.includes('鍛ㄨ竟鐪?)) {
      setParams(prev => ({ ...prev, drillDiameter: 45 }));
    } else if (question.includes('鎺忔Ы鐪?) || question.includes('鎺忔Ы')) {
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
    teaching: '鏁欏寮曞',
    free: '鑷敱缁冧範',
    exam: '鑰冩牳璇勫垎',
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
            <span className="header-title">涓夎噦鍑垮博鍙拌溅浠跨湡瀹炶AI瀵煎笀</span>
            <span className="header-subtitle">AI璧嬭兘鏍″洯瀹炶 路 鏅哄垱缇庡ソ鏈潵</span>
          </div>
          <div className="competition-badge">
            馃弳 鐢典俊鏉弬璧涗綔鍝?
          </div>
        </div>
        <div className="header-right">
          {/* Training mode switcher */}
          <div className="mode-switcher">
            <button
              className={`mode-btn ${trainingMode === 'teaching' ? 'active' : ''}`}
              onClick={() => handleTrainingModeChange('teaching')}
            >
              馃摎 鏁欏寮曞
            </button>
            <button
              className={`mode-btn ${trainingMode === 'free' ? 'active' : ''}`}
              onClick={() => handleTrainingModeChange('free')}
            >
              馃敡 鑷敱缁冧範
            </button>
            <button
              className={`mode-btn ${trainingMode === 'exam' ? 'active' : ''}`}
              onClick={() => handleTrainingModeChange('exam')}
            >
              馃摑 鑰冩牳璇勫垎
            </button>
          </div>
          <div className="header-badge">
            <span className="badge-dot"></span>
            {modeLabels[trainingMode]}妯″紡
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

      {/* Exam mode - 涓搧涓冨眬绔炶禌璇勫垎 */}
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
            馃彈 鏁翠綋瑙嗗浘
          </button>
          <button
            className={`scene-tool-btn ${viewMode === 'explode' ? 'active' : ''}`}
            onClick={() => setViewMode('explode')}
          >
            馃挜 缁撴瀯鎷嗚В
          </button>
          <button
            className={`scene-tool-btn ${isSimulating ? 'active' : ''}`}
            onClick={handleSimulate}
          >
            {isSimulating ? '鈴?鍋滄浠跨湡' : '鈻?寮€濮嬩豢鐪?}
          </button>
        </div>

        {/* Scene info overlay */}
        <div className="scene-overlay">
          <div className="scene-info-card">
            <div className="scene-info-row">
              <span className="scene-info-label">閽诲瓟娣卞害</span>
              <span className="scene-info-value">{params.drillDepth.toFixed(1)} m</span>
            </div>
            <div className="scene-info-row">
              <span className="scene-info-label">閽诲瓟鐩村緞</span>
              <span className="scene-info-value">{params.drillDiameter} mm</span>
            </div>
            <div className="scene-info-row">
              <span className="scene-info-label">鍥村博绛夌骇</span>
              <span className="scene-info-value">{'鈪犫叀鈪⑩叄鈪?[params.rockGrade - 1]}绾?/span>
            </div>
            <div className="scene-info-row">
              <span className="scene-info-label">鍐插嚮鍔熺巼</span>
              <span className="scene-info-value">{params.impactPower} kW</span>
            </div>
          </div>

          <div className="scene-info-card">
            <div className="scene-info-row">
              <span className="scene-info-label">浣滀笟鐘舵€?/span>
              <span className="scene-info-value" style={{ color: isSimulating ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {isSimulating ? '浠跨湡杩愯涓? : '寰呮満'}
              </span>
            </div>
            <div className="scene-info-row">
              <span className="scene-info-label">瀹炶妯″紡</span>
              <span className="scene-info-value" style={{ color: 'var(--accent-purple)' }}>
                {modeLabels[trainingMode]}
              </span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="scene-legend">
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
            閽昏噦缂栧彿
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ef4444' }}></div>
            1鍙疯噦锛堝乏锛?
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f59e0b' }}></div>
            2鍙疯噦锛堜腑锛?
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#3b82f6' }}></div>
            3鍙疯噦锛堝彸锛?
          </div>
          <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '6px', paddingTop: '6px', fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)' }}>
            鐐瓟绫诲瀷
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#ef4444' }}></div>
            鎺忔Ы鐪?
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#f59e0b' }}></div>
            杈呭姪鐪?
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ background: '#10b981' }}></div>
            鍛ㄨ竟鐪?
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
              <div className="part-popup-label">杩炴帴鏂瑰紡</div>
              <div className="part-popup-text">{selectedPart.metadata.connection}</div>
            </div>
            <div className="part-popup-section">
              <div className="part-popup-label">浼犳劅鍣ㄩ厤缃?/div>
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
              馃挕 AI瀵煎笀璇︾粏璁茶В 鈫?
            </div>
          </div>
        )}

        <div className="scene-controls-hint">
          鎷栨嫿鏃嬭浆瑙嗚 路 婊氳疆缂╂斁 路 鐐瑰嚮閮ㄤ欢鏌ョ湅缁撴瀯{viewMode === 'explode' ? '锛堢垎鐐歌鍥撅級' : ''}
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
