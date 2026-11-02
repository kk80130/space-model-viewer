import * as THREE from "./vendor/build/three.module.js";
import { OrbitControls } from "./vendor/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./vendor/examples/jsm/loaders/GLTFLoader.js";

const canvas = document.querySelector("#scene-canvas");
const canvasWrap = document.querySelector("#canvas-wrap");
const loadingState = document.querySelector("#loading-state");
const errorState = document.querySelector("#error-state");
const errorText = document.querySelector("#error-text");
const statusPill = document.querySelector("#status-pill");
const statusText = document.querySelector("#status-text");
const assetName = document.querySelector("#asset-name");
const assetMeta = document.querySelector("#asset-meta");
const modelInput = document.querySelector("#model-input");
const uploadButton = document.querySelector("#upload-button");
const dropTarget = document.querySelector("#drop-target");
const dropOverlay = document.querySelector("#drop-overlay");
const resetButton = document.querySelector("#reset-button");
const exportButton = document.querySelector("#export-button");
const modeLabel = document.querySelector("#mode-label");
const presetButtons = [...document.querySelectorAll("[data-render-mode]")];
const environmentToggle = document.querySelector("#environment-toggle");
const environmentInput = document.querySelector("#environment-input");
const environmentMeta = document.querySelector("#environment-meta");
const environmentIntensity = document.querySelector("#environment-intensity");
const environmentIntensityValue = document.querySelector("#environment-intensity-value");
const environmentRotation = document.querySelector("#environment-rotation");
const environmentRotationValue = document.querySelector("#environment-rotation-value");
const keyToggle = document.querySelector("#key-toggle");
const keyAzimuth = document.querySelector("#key-azimuth");
const keyAzimuthValue = document.querySelector("#key-azimuth-value");
const keyElevation = document.querySelector("#key-elevation");
const keyElevationValue = document.querySelector("#key-elevation-value");
const keyIntensity = document.querySelector("#key-intensity");
const keyIntensityValue = document.querySelector("#key-intensity-value");
const modelLightsToggle = document.querySelector("#model-lights-toggle");
const modelLightsMeta = document.querySelector("#model-lights-meta");
const objectList = document.querySelector("#object-list");
const objectCount = document.querySelector("#object-count");
const objectSearch = document.querySelector("#object-search");
const selectedObjectCard = document.querySelector("#selected-object");
const selectedName = document.querySelector("#selected-name");
const selectedMeta = document.querySelector("#selected-meta");
const clearSelectionButton = document.querySelector("#clear-selection-button");
const animationCount = document.querySelector("#animation-count");
const animationEmpty = document.querySelector("#animation-empty");
const animationControls = document.querySelector("#animation-controls");
const animationSelect = document.querySelector("#animation-select");
const animationPlayButton = document.querySelector("#animation-play-button");
const animationRestartButton = document.querySelector("#animation-restart-button");
const animationSpeed = document.querySelector("#animation-speed");
const animationSpeedValue = document.querySelector("#animation-speed-value");
const autoRotateButton = document.querySelector("#auto-rotate-button");
const focusButton = document.querySelector("#focus-button");
const screenshotButton = document.querySelector("#screenshot-button");
const gridToggle = document.querySelector("#grid-toggle");
const shadowToggle = document.querySelector("#shadow-toggle");
const exposure = document.querySelector("#exposure");
const exposureValue = document.querySelector("#exposure-value");
const cameraViewButtons = [...document.querySelectorAll("[data-camera-view]")];
const backgroundButtons = [...document.querySelectorAll("[data-background]")];
const sceneStats = document.querySelector("#scene-stats");
const selectionFocusButton = document.querySelector("#selection-focus-button");
const selectionVisibilityButton = document.querySelector("#selection-visibility-button");
const animationProgress = document.querySelector("#animation-progress");
const animationProgressValue = document.querySelector("#animation-progress-value");

const scene = new THREE.Scene();
scene.background = new THREE.Color("#e3e5e2");

const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 1000);
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
const isSmallScreen = window.matchMedia("(max-width: 700px)").matches;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSmallScreen ? 1.25 : 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.enablePan = true;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI;
controls.rotateSpeed = isSmallScreen ? 0.55 : 0.72;
controls.zoomSpeed = isSmallScreen ? 0.7 : 0.85;

const modelRoot = new THREE.Group();
const webLights = new THREE.Group();
scene.add(modelRoot, webLights);

const gradientMap = createGradientMap();
const sketchGradientMap = createSketchGradientMap();
const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const meshes = [];
const nprOverlays = [];
const modelLights = [];
const modeMaterialCache = new Map();
const selectionBounds = new THREE.Box3();
const selectionBox = new THREE.Box3Helper(selectionBounds, "#c94435");
selectionBox.material.depthTest = false;
selectionBox.material.depthWrite = false;
selectionBox.renderOrder = 10;
selectionBox.visible = false;
scene.add(selectionBox);

let model = null;
const dinerModelUrl = "./assets/diner-cutaway.glb?v=materials-2";
const dinerProfile = {
  direction: [20.2, 28.55, -23.5],
  environment: 0.55,
  keyIntensity: 1.8,
  keyAzimuth: 125,
  keyElevation: 58,
};
let modelUrl = new URLSearchParams(location.search).get("scene") === "booth" ? "./booth.glb" : dinerModelUrl;
let modelObjectUrl = null;
let modelFileName = modelUrl === dinerModelUrl ? "餐厅剖切场景.glb" : "展台.glb";
let activeModelProfile = null;
let selectedObject = null;
let ground = null;
let grid = null;
let backgroundMode = "light";
let cameraView = "perspective";
let cameraWasAdjusted = false;
let fittingCamera = false;
let sceneCenter = new THREE.Vector3();
let sceneSize = new THREE.Vector3(4, 3, 4);
let pointerDown = null;
let renderMode = "pbr";
let ambientLight = null;
let environmentFillLight = null;
let keyLight = null;
let keyLightTarget = null;
let environmentTexture = null;
let environmentRenderTarget = null;
let environmentSourceTexture = null;
let mixer = null;
let animationClips = [];
let activeAnimationAction = null;
let loadRequestId = 0;
let environmentRequestId = 0;
let disposed = false;
let animationFrameId = 0;
let lastFrameTime = null;
let rgbeLoaderPromise = null;
let contactAo = null;

const modeNames = {
  pbr: "贴图 / PBR",
  toon: "三渲二",
  sketch: "素描",
  clay: "白模",
};

function createContactAo() {
  const target = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    samples: isSmallScreen ? 0 : Math.min(renderer.capabilities.maxSamples, 4),
  });
  const material = new THREE.ShaderMaterial({
    depthTest: false,
    depthWrite: false,
    defines: { AO_SAMPLES: isSmallScreen ? 8 : 16 },
    uniforms: {
      colorBuffer: { value: target.texture },
      depthBuffer: { value: target.depthTexture },
      inverseProjection: { value: camera.projectionMatrixInverse },
      viewProjection: { value: camera.projectionMatrix },
      pixelSize: { value: new THREE.Vector2(1, 1) },
      backgroundColor: { value: scene.background },
      radius: { value: 0.03 },
    },
    vertexShader: `
      varying vec2 screenUv;
      void main() {
        screenUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D colorBuffer;
      uniform sampler2D depthBuffer;
      uniform mat4 inverseProjection;
      uniform mat4 viewProjection;
      uniform vec2 pixelSize;
      uniform vec3 backgroundColor;
      uniform float radius;
      varying vec2 screenUv;

      vec3 viewPosition(vec2 coord) {
        float depth = texture2D(depthBuffer, coord).r;
        vec4 point = inverseProjection * vec4(coord * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
        return point.xyz / point.w;
      }

      void main() {
        float depth = texture2D(depthBuffer, screenUv).r;
        if (depth >= 1.0) {
          // 背景不经过曝光或遮蔽，保证 light/dark 的指定颜色。
          gl_FragColor = vec4(backgroundColor, 1.0);
          #include <colorspace_fragment>
          return;
        }
        vec3 center = viewPosition(screenUv);
        vec3 left = viewPosition(screenUv - vec2(pixelSize.x, 0.0));
        vec3 right = viewPosition(screenUv + vec2(pixelSize.x, 0.0));
        vec3 down = viewPosition(screenUv - vec2(0.0, pixelSize.y));
        vec3 up = viewPosition(screenUv + vec2(0.0, pixelSize.y));
        // 在深度断层选择更连续的一侧，避免轮廓边缘形成明显黑晕。
        vec3 dx = abs(right.z - center.z) < abs(left.z - center.z) ? right - center : center - left;
        vec3 dy = abs(up.z - center.z) < abs(down.z - center.z) ? up - center : center - down;
        vec3 crossNormal = cross(dx, dy);
        vec3 normal = dot(crossNormal, crossNormal) > 1e-18
          ? normalize(crossNormal) : vec3(0.0, 0.0, 1.0);
        if (dot(normal, -center) < 0.0) normal = -normal;
        vec3 axis = abs(normal.z) < 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
        vec3 tangent = normalize(cross(axis, normal));
        vec3 bitangent = cross(normal, tangent);
        float occlusion = 0.0;
        float bias = radius * 0.035;
        for (int i = 0; i < AO_SAMPLES; i++) {
          float fraction = (float(i) + 0.5) / float(AO_SAMPLES);
          float angle = float(i) * 2.39996323;
          float spread = sqrt(fraction);
          vec3 hemisphere = tangent * cos(angle) * spread + bitangent * sin(angle) * spread;
          hemisphere += normal * sqrt(1.0 - fraction);
          vec3 probe = center + hemisphere * radius * (0.25 + 0.75 * fraction);
          vec4 projected = viewProjection * vec4(probe, 1.0);
          if (projected.w <= 0.0) continue;
          vec2 coord = projected.xy / projected.w * 0.5 + 0.5;
          if (any(lessThan(coord, vec2(0.0))) || any(greaterThan(coord, vec2(1.0)))) continue;
          if (texture2D(depthBuffer, coord).r >= 1.0) continue;
          vec3 surface = viewPosition(coord);
          float rangeWeight = 1.0 - smoothstep(radius * 0.5, radius * 2.0, length(surface - center));
          occlusion += step(probe.z + bias, surface.z) * rangeWeight;
        }
        float shade = max(0.48, 1.0 - occlusion / float(AO_SAMPLES) * 1.3);
        gl_FragColor = vec4(texture2D(colorBuffer, screenUv).rgb * shade, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const postScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  postScene.add(quad);
  return { target, material, quad, scene: postScene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
}

function renderScene() {
  const useAo = model && (shadowToggle?.checked ?? true)
    && (renderMode === "pbr" || renderMode === "clay")
    && renderer.extensions.has("EXT_color_buffer_float");
  if (!useAo) {
    renderer.render(scene, camera);
    return;
  }
  if (!contactAo) contactAo = createContactAo();
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  if (contactAo.target.width !== size.x || contactAo.target.height !== size.y) {
    contactAo.target.setSize(size.x, size.y);
    contactAo.material.uniforms.pixelSize.value.set(1 / size.x, 1 / size.y);
  }
  contactAo.material.uniforms.radius.value = Math.max(sceneSize.x, sceneSize.y, sceneSize.z)
    * (activeModelProfile ? 0.012 : 0.035);
  renderer.setRenderTarget(contactAo.target);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(contactAo.scene, contactAo.camera);
}

function createGradientMap() {
  const data = new Uint8Array([32, 92, 166, 232]);
  const texture = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function createSketchGradientMap() {
  const data = new Uint8Array([24, 74, 132, 208]);
  const texture = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

function addSketchShader(material) {
  material.onBeforeCompile = (shader) => {
    const sketchFunctions = `
      // 素描笔触只作用于模型表面，避免把背景和地面一起处理成噪声。
      float sketchHash(vec2 point) {
        return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float sketchNoise(vec2 point) {
        vec2 cell = floor(point);
        vec2 local = fract(point);
        local = local * local * (3.0 - 2.0 * local);
        float bottomLeft = sketchHash(cell);
        float bottomRight = sketchHash(cell + vec2(1.0, 0.0));
        float topLeft = sketchHash(cell + vec2(0.0, 1.0));
        float topRight = sketchHash(cell + vec2(1.0, 1.0));
        return mix(
          mix(bottomLeft, bottomRight, local.x),
          mix(topLeft, topRight, local.x),
          local.y
        );
      }

      float sketchStroke(vec2 point, vec2 direction, float scale, float softness) {
        float line = abs(fract(dot(point, direction) * scale) - 0.5);
        return 1.0 - smoothstep(0.08, softness, line);
      }
    `;
    shader.fragmentShader = shader.fragmentShader.replace(
      "void main() {",
      `${sketchFunctions}
      void main() {`,
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `
        float sketchLight = clamp(dot(outgoingLight, vec3(0.299, 0.587, 0.114)), 0.0, 1.0);
        float sketchShadow = 1.0 - smoothstep(0.26, 0.78, sketchLight);
        float sketchMidtone = 1.0 - smoothstep(0.42, 0.92, sketchLight);
        vec2 sketchPoint = gl_FragCoord.xy * 0.42;
        float paperGrain = sketchNoise(sketchPoint * 0.22);
        float fineGrain = sketchNoise(sketchPoint * 1.15);
        float diagonalStroke = sketchStroke(sketchPoint, vec2(0.86, 0.50), 0.082, 0.16);
        float crossStroke = sketchStroke(sketchPoint, vec2(-0.68, 0.74), 0.067, 0.15);
        float stipple = smoothstep(
          0.78,
          0.97,
          sketchNoise(sketchPoint * 0.34 + vec2(12.0, 4.0))
        );
        float shortStroke = smoothstep(
          0.74,
          0.95,
          sketchNoise(sketchPoint * vec2(0.80, 0.56) + vec2(21.0, 7.0))
        );
        float hatch = diagonalStroke * 0.70 + crossStroke * 0.30;
        float graphite = sketchShadow * (hatch * 0.22 + shortStroke * 0.12);
        graphite += sketchMidtone * (fineGrain * 0.08 + paperGrain * 0.06);
        graphite += (0.10 + sketchShadow * 0.24) * stipple;
        graphite += sketchShadow * fineGrain * 0.10;
        graphite = clamp(graphite, 0.0, 0.76);

        vec3 paperLight = vec3(0.49, 0.48, 0.44);
        vec3 paperShade = vec3(0.76, 0.75, 0.70);
        vec3 paper = mix(paperLight, paperShade, smoothstep(0.08, 0.92, sketchLight));
        paper *= 0.965 + (paperGrain - 0.5) * 0.055;
        vec3 pencil = vec3(0.16, 0.18, 0.17);
        outgoingLight = mix(paper, pencil, graphite);

        #include <opaque_fragment>
      `,
    );
  };
  material.customProgramCacheKey = () => "sketch-pencil-v2";
  return material;
}

function materialFor(sourceMaterial, mode) {
  // PBR 直接使用导入材质，保留自发光、扩展 PBR、贴图通道及动画绑定。
  if (mode === "pbr") {
    return sourceMaterial;
  }
  let cachedModes = modeMaterialCache.get(sourceMaterial);
  if (!cachedModes) {
    cachedModes = new Map();
    modeMaterialCache.set(sourceMaterial, cachedModes);
  }
  if (cachedModes.has(mode)) {
    return cachedModes.get(mode);
  }
  if (Array.isArray(sourceMaterial)) {
    const materials = sourceMaterial.map((source) => materialFor(source, mode));
    cachedModes.set(mode, materials);
    return materials;
  }
  const source = Array.isArray(sourceMaterial) ? sourceMaterial[0] : sourceMaterial;
  const sourceColor = source?.color ? source.color.clone() : new THREE.Color("#e8e4db");
  const sourceHsl = sourceColor.getHSL({ h: 0, s: 0, l: 0 });
  const neutralColor = sourceHsl.s < 0.08 ? new THREE.Color("#e8e4db") : sourceColor;

  if (mode === "clay") {
    const material = new THREE.MeshStandardMaterial({
      color: "#f0efeb",
      roughness: 0.85,
      metalness: 0,
      side: source?.side ?? THREE.FrontSide,
      transparent: Boolean(source?.transparent),
      opacity: source?.opacity ?? 1,
    });
    cachedModes.set(mode, material);
    return material;
  }

  const material = new THREE.MeshToonMaterial({
    color: mode === "sketch" ? new THREE.Color("#d6d3c8") : neutralColor,
    map: mode === "toon" ? source?.map || null : null,
    gradientMap: mode === "sketch" ? sketchGradientMap : gradientMap,
    transparent: Boolean(source?.transparent),
    opacity: source?.opacity ?? 1,
    alphaMap: source?.alphaMap || null,
    alphaTest: source?.alphaTest ?? 0,
    side: source?.side ?? THREE.FrontSide,
  });
  const result = mode === "sketch" ? addSketchShader(material) : material;
  cachedModes.set(mode, result);
  return result;
}

function createNprLine(mesh) {
  // 静态边缘无法跟随骨骼、形变或实例；这些网格保留原有动画，跳过静态描边。
  if (mesh.isSkinnedMesh || mesh.isInstancedMesh || mesh.morphTargetInfluences?.length) {
    return;
  }
  const vertexCount = mesh.geometry.attributes.position?.count || 0;
  let overlay;

  if (vertexCount <= 20000) {
    const geometry = new THREE.EdgesGeometry(mesh.geometry, 48);
    const material = new THREE.LineBasicMaterial({
      color: "#11191b",
      transparent: true,
      opacity: 0.92,
      depthTest: true,
      depthWrite: false,
    });
    overlay = new THREE.LineSegments(geometry, material);
    overlay.userData.ownsGeometry = true;
  } else {
    const material = new THREE.MeshBasicMaterial({
      color: "#11191b",
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.92,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    overlay = new THREE.Mesh(mesh.geometry, material);
    overlay.scale.setScalar(1.014);
  }

  overlay.name = `${mesh.name || "object"}__npr-outline`;
  overlay.userData.nprOverlay = true;
  overlay.visible = false;
  overlay.renderOrder = -1;
  mesh.add(overlay);
  nprOverlays.push(overlay);
}

function applyRenderMode(nextMode) {
  if (!Object.hasOwn(modeNames, nextMode)) {
    return;
  }
  renderMode = nextMode;
  modeLabel.textContent = modeNames[nextMode];
  presetButtons.forEach((button) => {
    const selected = button.dataset.renderMode === nextMode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  meshes.forEach((mesh) => {
    const source = mesh.userData.viewerSourceMaterial;
    if (source) {
      mesh.material = materialFor(source, renderMode);
    }
  });

  const outlined = nextMode === "toon" || nextMode === "sketch";
  if (outlined && !nprOverlays.length) {
    meshes.forEach(createNprLine);
  }
  nprOverlays.forEach((overlay) => {
    overlay.visible = outlined;
    overlay.material.color.set(nextMode === "sketch" ? "#3b403e" : "#11191b");
    overlay.material.opacity = nextMode === "sketch" ? 0.56 : 0.92;
  });
}

function disposeObjectResources(root, extraMaterials = []) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const skeletons = new Set();
  const collectMaterial = (material) => {
    if (Array.isArray(material)) {
      material.forEach(collectMaterial);
    } else if (material) {
      materials.add(material);
    }
  };
  root?.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    collectMaterial(object.material);
    collectMaterial(object.userData.viewerSourceMaterial);
    if (object.skeleton) skeletons.add(object.skeleton);
    object.shadow?.dispose();
  });
  extraMaterials.forEach(collectMaterial);
  materials.forEach((material) => {
    Object.values(material).forEach((value) => {
      if (value?.isTexture && value !== gradientMap && value !== sketchGradientMap
          && value !== environmentTexture && value !== environmentSourceTexture) {
        textures.add(value);
      }
    });
    material.dispose();
  });
  const images = new Set();
  textures.forEach((texture) => {
    texture.dispose();
    if (texture.source?.data?.close) images.add(texture.source.data);
  });
  images.forEach((image) => image.close());
  geometries.forEach((geometry) => geometry.dispose());
  skeletons.forEach((skeleton) => skeleton.dispose());
}

function clearModel() {
  if (mixer) {
    mixer.stopAllAction();
    if (model) mixer.uncacheRoot(model);
    mixer = null;
  }
  const cachedMaterials = [...modeMaterialCache.values()].flatMap((modes) => [...modes.values()]);
  disposeObjectResources(model, cachedMaterials);
  modeMaterialCache.clear();
  if (model) modelRoot.remove(model);
  model = null;
  meshes.length = 0;
  nprOverlays.length = 0;
  modelLights.length = 0;
  animationClips = [];
  activeAnimationAction = null;
  selectedObject = null;
  if (ground) {
    ground.geometry.dispose();
    ground.material.dispose();
    scene.remove(ground);
    ground = null;
  }
  if (grid) {
    grid.dispose();
    scene.remove(grid);
    grid = null;
  }
  selectionBox.visible = false;
  updateSelectionPanel();
  renderObjectList();
  renderAnimationPanel();
  updateSceneStats();
}

function loadModel(url, name, sizeLabel = "本地模型") {
  const requestId = ++loadRequestId;
  clearModel();
  activeModelProfile = url === dinerModelUrl || /diner[-_]cutaway/i.test(name) ? dinerProfile : null;
  if (activeModelProfile) {
    environmentIntensity.value = String(activeModelProfile.environment);
    keyIntensity.value = String(activeModelProfile.keyIntensity);
    keyAzimuth.value = String(activeModelProfile.keyAzimuth);
    keyElevation.value = String(activeModelProfile.keyElevation);
    modelLightsToggle.checked = true;
    setBackground("dark");
  }
  const context = document.querySelector(".workspace-context > span:last-child");
  if (context) context.textContent = activeModelProfile ? "科幻餐厅 · 剖切展示" : "模型空间 · 交互预览";
  setLoadingState();
  modelUrl = url;
  modelFileName = name;
  assetName.textContent = name;
  assetMeta.textContent = sizeLabel;

  loader.load(
    url,
    (gltf) => {
      if (disposed || requestId !== loadRequestId) {
        disposeObjectResources(gltf.scene);
        return;
      }

      model = gltf.scene;
      modelRoot.add(model);
      model.traverse((object) => {
        if (object.userData.nprOverlay) {
          return;
        }
        if (object.isLight) {
          modelLights.push(object);
          object.visible = modelLightsToggle.checked;
          return;
        }

        if (!object.isMesh) {
          return;
        }

        object.castShadow = true;
        object.receiveShadow = true;
        object.userData.viewerSourceMaterial = object.material;
        meshes.push(object);
      });
      if (activeModelProfile) addDinerLighting();
      setupAnimations(gltf.animations || []);

      const bounds = new THREE.Box3().setFromObject(model);
      sceneCenter = bounds.getCenter(new THREE.Vector3());
      sceneSize = bounds.getSize(new THREE.Vector3());
      const maxDimension = Math.max(sceneSize.x, sceneSize.y, sceneSize.z, 0.001);
      if (bounds.isEmpty() || !Number.isFinite(maxDimension)) {
        clearModel();
        setErrorState("模型没有可显示的有效几何数据。");
        return;
      }

      createGround(bounds, maxDimension);
      updateLightRig(bounds, maxDimension);
      applyRenderMode(renderMode);

      objectCount.textContent = String(meshes.length);
      renderObjectList();
      setLoadedState();
      resize();
      frameModel();
      updateSceneStats();
    },
    (event) => {
      if (requestId !== loadRequestId || !event.lengthComputable) return;
      statusText.textContent = `正在加载模型 ${Math.round(event.loaded / event.total * 100)}%`;
    },
    (error) => {
      if (requestId !== loadRequestId) {
        return;
      }
      console.error(error);
      const message = String(error?.message || error);
      const compression = /DRACOLoader/.test(message) ? "Draco" : /MeshoptDecoder/.test(message) ? "Meshopt" : /KTX2Loader/.test(message) ? "KTX2" : null;
      setErrorState(compression
        ? `这个模型使用 ${compression} 压缩，当前请在导出时关闭压缩后重新导入。`
        : "无法读取 GLB 模型，请确认文件完整，并将贴图打包进 GLB 后重新导入。");
    },
  );
}

function addDinerLighting() {
  // Blender 的面光源不随 GLB 导出，沿原中央吊灯的位置补充可实时投影的照明。
  const light = new THREE.SpotLight("#ffd6ad", 22, 8, Math.PI / 3, 0.85, 2);
  light.name = "中央用餐照明";
  light.position.set(2.15, 4.55, 4.2);
  light.target.position.set(2.15, 2.6, 4.2);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 0.1;
  light.shadow.camera.far = 8;
  light.shadow.normalBias = 0.008;
  model.add(light, light.target);
  modelLights.push(light);
}

function createGround(bounds, maxDimension) {
  const material = new THREE.MeshStandardMaterial({
    color: backgroundMode === "light" ? "#d5d7d2" : "#383d38",
    roughness: 0.95,
    metalness: 0,
  });
  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(maxDimension * 4, maxDimension * 4),
    material,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(sceneCenter.x, bounds.min.y - maxDimension * 0.005, sceneCenter.z);
  ground.receiveShadow = true;
  scene.add(ground);
  grid = new THREE.GridHelper(maxDimension * 4, 40, "#a4aaa0", "#bdc3b9");
  grid.position.copy(ground.position);
  grid.position.y += maxDimension * 0.0005;
  grid.material.transparent = true;
  grid.material.opacity = 0.4;
  grid.material.depthWrite = false;
  scene.add(grid);
  updateGridState();
}

function updateGridState() {
  const visible = gridToggle?.checked ?? true;
  if (grid) grid.visible = visible;
  // 网格关闭不应取消接触阴影；地面只在网格和阴影都关闭时隐藏。
  if (ground) ground.visible = visible || (shadowToggle?.checked ?? true);
}

function updateShadowState() {
  renderer.shadowMap.enabled = shadowToggle?.checked ?? true;
  updateGridState();
  if (keyLight) keyLight.castShadow = renderer.shadowMap.enabled;
  scene.traverse((object) => {
    if (object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => { material.needsUpdate = true; });
    }
  });
}

function setBackground(mode) {
  if (mode !== "light" && mode !== "dark") return;
  backgroundMode = mode;
  document.querySelector("#canvas-wrap").classList.toggle("is-dark", mode === "dark");
  scene.background.set(mode === "light" ? "#e3e5e2" : "#303431");
  if (ground) ground.material.color.set(mode === "light" ? "#d5d7d2" : "#383d38");
  backgroundButtons.forEach((button) => {
    const selected = button.dataset.background === mode;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function updateLightRig(bounds, maxDimension) {
  if (!ambientLight) {
    ambientLight = new THREE.AmbientLight("#fffdfa", 0.25);
    webLights.add(ambientLight);
  }

  if (!environmentFillLight) {
    environmentFillLight = new THREE.HemisphereLight("#fffdfa", "#b0b4ab", 0.5);
    webLights.add(environmentFillLight);
  }

  if (!keyLight) {
    keyLight = new THREE.DirectionalLight("#fff8ee", Number(keyIntensity.value));
    keyLight.castShadow = true;
    keyLight.shadow.bias = -0.00035;
    keyLightTarget = new THREE.Object3D();
    keyLight.target = keyLightTarget;
    webLights.add(keyLight, keyLightTarget);
  }

  updateKeyLightPosition(maxDimension);
  keyLight.shadow.mapSize.set(isSmallScreen ? 1024 : 2048, isSmallScreen ? 1024 : 2048);
  keyLight.shadow.radius = 2;
  // 阴影投影集中在模型附近，避免大面积空地消耗精度、抹掉家具接触细节。
  const shadowRadius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, maxDimension * 0.1);
  const shadowExtent = shadowRadius * 1.25;
  const lightDistance = maxDimension * 3.2;
  keyLight.shadow.camera.near = Math.max(lightDistance - shadowExtent * 1.5, maxDimension * 0.01);
  keyLight.shadow.camera.far = lightDistance + shadowExtent * 1.5;
  keyLight.shadow.camera.left = -shadowExtent;
  keyLight.shadow.camera.right = shadowExtent;
  keyLight.shadow.camera.top = shadowExtent;
  keyLight.shadow.camera.bottom = -shadowExtent;
  keyLight.shadow.bias = activeModelProfile ? -0.0005 : -0.00008;
  keyLight.shadow.normalBias = maxDimension * (activeModelProfile ? 0.0015 : 0.00025);
  keyLight.shadow.camera.updateProjectionMatrix();
  updateLightState();
  updateShadowState();
}

function updateKeyLightPosition(maxDimension = Math.max(sceneSize.x, sceneSize.y, sceneSize.z, 0.001)) {
  if (!keyLight || !keyLightTarget) {
    return;
  }

  const azimuth = THREE.MathUtils.degToRad(Number(keyAzimuth.value));
  const elevation = THREE.MathUtils.degToRad(Number(keyElevation.value));
  const distance = maxDimension * 3.2;
  const horizontal = Math.cos(elevation) * distance;
  keyLight.position.set(
    sceneCenter.x + Math.cos(azimuth) * horizontal,
    sceneCenter.y + Math.sin(elevation) * distance,
    sceneCenter.z + Math.sin(azimuth) * horizontal,
  );
  keyLightTarget.position.copy(sceneCenter);
  keyAzimuthValue.textContent = `${keyAzimuth.value}°`;
  keyElevationValue.textContent = `${keyElevation.value}°`;
}

function updateLightState() {
  if (ambientLight) {
    ambientLight.intensity = environmentToggle.checked
      ? Number(environmentIntensity.value) * 0.08
      : 0;
  }
  if (environmentFillLight) {
    environmentFillLight.intensity = environmentToggle.checked
      ? Number(environmentIntensity.value) * 0.20
      : 0;
  }
  if (keyLight) {
    keyLight.intensity = keyToggle.checked ? Number(keyIntensity.value) : 0;
  }
  modelLights.forEach((light) => {
    light.visible = modelLightsToggle.checked;
  });
  if (scene.environment) {
    scene.environmentIntensity = environmentToggle.checked ? Number(environmentIntensity.value) : 0;
  }
  environmentIntensityValue.textContent = Number(environmentIntensity.value).toFixed(2);
  environmentRotationValue.textContent = `${environmentRotation.value}°`;
  scene.environmentRotation.y = THREE.MathUtils.degToRad(Number(environmentRotation.value));
  keyIntensityValue.textContent = Number(keyIntensity.value).toFixed(2);
  modelLightsMeta.textContent = modelLights.length
    ? (activeModelProfile ? "中央用餐区照明" : `${modelLights.length} 个 GLB 灯光节点`)
    : "当前 GLB 未包含灯光节点";
}

function createDefaultEnvironment() {
  const panorama = document.createElement("canvas");
  panorama.width = 512;
  panorama.height = 256;
  const context = panorama.getContext("2d");
  const gradient = context.createLinearGradient(0, 0, 0, panorama.height);
  // 白色粗糙金属主要依赖环境反射；保留明暗方向，不能用均匀亮环境填平。
  gradient.addColorStop(0, "#a6ada4");
  gradient.addColorStop(0.35, "#858c82");
  gradient.addColorStop(0.52, "#535c51");
  gradient.addColorStop(1, "#30382f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, panorama.width, panorama.height);
  context.fillStyle = "rgba(255, 250, 239, 0.9)";
  context.fillRect(55, 24, 120, 78);
  context.fillStyle = "rgba(255, 255, 255, 0.3)";
  context.fillRect(320, 45, 65, 48);

  const texture = new THREE.CanvasTexture(panorama);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  applyEnvironmentTexture(texture, "默认棚拍环境");
}

function applyEnvironmentTexture(texture, name) {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  let pmrem;
  try {
    pmrem = pmremGenerator.fromEquirectangular(texture);
  } catch (error) {
    texture.dispose();
    throw error;
  }
  // PMREM 的纹理由渲染目标拥有，释放完整目标才能回收帧缓冲资源。
  environmentRenderTarget?.dispose();
  if (environmentSourceTexture !== texture) environmentSourceTexture?.dispose();
  environmentRenderTarget = pmrem;
  environmentTexture = environmentRenderTarget.texture;
  environmentSourceTexture = texture;
  scene.environment = environmentTexture;
  scene.environmentIntensity = Number(environmentIntensity.value);
  environmentMeta.textContent = name;
  updateLightState();
}

function parseHdr(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let offset = 0;
  const readLine = () => {
    const end = bytes.indexOf(10, offset);
    if (end < 0) throw new Error("HDR 文件头不完整");
    const line = new TextDecoder().decode(bytes.subarray(offset, end)).trim();
    offset = end + 1;
    return line;
  };
  if (!/^#\?(RADIANCE|RGBE)$/.test(readLine())) throw new Error("HDR 文件头无效");
  let line;
  let format = false;
  while ((line = readLine()) !== "") {
    if (line === "FORMAT=32-bit_rle_rgbe") format = true;
  }
  if (!format) throw new Error("不支持该 HDR 色彩编码");
  do { line = readLine(); } while (!line);
  const resolution = line.match(/^([+-])Y\s+(\d+)\s+([+-])X\s+(\d+)$/);
  if (!resolution) throw new Error("HDR 分辨率信息无效");
  const height = Number(resolution[2]);
  const width = Number(resolution[4]);
  if (!width || !height || width * height > 16777216) {
    throw new Error("HDR 分辨率过大或无效");
  }
  const data = new Float32Array(width * height * 4);
  const scanline = new Uint8Array(width * 4);
  const readByte = () => {
    if (offset >= bytes.length) throw new Error("HDR 像素数据不完整");
    return bytes[offset++];
  };
  const writePixel = (x, y, red, green, blue, exponent) => {
    const targetX = resolution[3] === "+" ? x : width - 1 - x;
    const targetY = resolution[1] === "-" ? y : height - 1 - y;
    const target = (targetY * width + targetX) * 4;
    const scale = exponent ? 2 ** (exponent - 136) : 0;
    data[target] = red * scale;
    data[target + 1] = green * scale;
    data[target + 2] = blue * scale;
    data[target + 3] = 1;
  };

  for (let y = 0; y < height; y += 1) {
    const modernRle = width >= 8 && width <= 32767
      && bytes[offset] === 2 && bytes[offset + 1] === 2 && !(bytes[offset + 2] & 128);
    if (modernRle) {
      readByte();
      readByte();
      if ((readByte() << 8 | readByte()) !== width) throw new Error("HDR 扫描线宽度不一致");
      for (let channel = 0; channel < 4; channel += 1) {
        let x = 0;
        while (x < width) {
          const count = readByte();
          const length = count > 128 ? count - 128 : count;
          if (!length || x + length > width) throw new Error("HDR 数据段长度无效");
          if (count > 128) {
            scanline.fill(readByte(), channel * width + x, channel * width + x + length);
          } else {
            // 普通段首字节是长度，后面必须读取 length 个值，不能当作像素。
            for (let index = 0; index < length; index += 1) {
              scanline[channel * width + x + index] = readByte();
            }
          }
          x += length;
        }
      }
      for (let x = 0; x < width; x += 1) {
        writePixel(x, y, scanline[x], scanline[width + x], scanline[2 * width + x], scanline[3 * width + x]);
      }
    } else {
      // 旧式编码允许重复前一个 RGBE 像素；限制长度和移位，拒绝损坏数据。
      let x = 0;
      let previous = null;
      let shift = 0;
      while (x < width) {
        const pixel = [readByte(), readByte(), readByte(), readByte()];
        if (pixel[0] === 1 && pixel[1] === 1 && pixel[2] === 1) {
          const count = pixel[3] * 2 ** shift;
          if (!previous || shift > 24 || x + count > width) throw new Error("HDR 旧式数据段无效");
          for (let index = 0; index < count; index += 1) writePixel(x++, y, ...previous);
          shift += 8;
        } else {
          writePixel(x++, y, ...pixel);
          previous = pixel;
          shift = 0;
        }
      }
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.FloatType);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.flipY = true;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

async function parseEnvironmentHdr(buffer) {
  // 加载器可由项目后续补入；缺失时不增加依赖，使用受边界检查保护的解析器。
  if (!rgbeLoaderPromise) {
    const url = new URL("./vendor/examples/jsm/loaders/RGBELoader.js", import.meta.url);
    rgbeLoaderPromise = fetch(url, { method: "HEAD" })
      .then((response) => response.ok ? import(url.href) : null)
      .catch(() => null);
  }
  const module = await rgbeLoaderPromise;
  if (!module?.RGBELoader) return parseHdr(buffer);
  const parsed = new module.RGBELoader().setDataType(THREE.FloatType).parse(buffer);
  const texture = new THREE.DataTexture(parsed.data, parsed.width, parsed.height, THREE.RGBAFormat, parsed.type);
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.flipY = true;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
}

async function loadEnvironmentFile(file) {
  if (!file) {
    return;
  }

  const requestId = ++environmentRequestId;
  let url = null;
  try {
    const extension = file.name.split(".").pop()?.toLowerCase();
    let texture;
    if (extension === "hdr") {
      texture = await parseEnvironmentHdr(await file.arrayBuffer());
    } else {
      url = URL.createObjectURL(file);
      texture = await textureLoader.loadAsync(url);
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    if (disposed || requestId !== environmentRequestId) {
      texture.dispose();
      return;
    }
    applyEnvironmentTexture(texture, file.name);
  } catch (error) {
    console.error(error);
    if (!disposed && requestId === environmentRequestId) environmentMeta.textContent = "环境贴图读取失败";
  } finally {
    if (url) URL.revokeObjectURL(url);
  }
}

function setupAnimations(clips) {
  animationClips = clips;
  animationCount.textContent = String(clips.length);
  animationSelect.replaceChildren();
  activeAnimationAction = null;

  if (mixer) {
    mixer.stopAllAction();
  }
  mixer = clips.length && model ? new THREE.AnimationMixer(model) : null;
  if (mixer) mixer.timeScale = Number(animationSpeed.value);
  updateAnimationProgress();

  if (!clips.length) {
    animationEmpty.classList.remove("is-hidden");
    animationControls.classList.add("is-hidden");
    return;
  }

  animationEmpty.classList.add("is-hidden");
  animationControls.classList.remove("is-hidden");
  clips.forEach((clip, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = clip.name || `动画 ${index + 1}`;
    animationSelect.append(option);
  });
  updateAnimationButton();
}

function selectedAnimationClip() {
  return animationClips[Number(animationSelect.value)] || null;
}

function playAnimation(restart = false) {
  if (!mixer) {
    return;
  }

  const clip = selectedAnimationClip();
  if (!clip) {
    return;
  }

  if (activeAnimationAction && !restart) {
    if (activeAnimationAction.isRunning()) {
      activeAnimationAction.paused = true;
    } else {
      activeAnimationAction.paused = false;
      activeAnimationAction.play();
    }
  } else {
    activeAnimationAction?.stop();
    activeAnimationAction = mixer.clipAction(clip);
    activeAnimationAction.reset();
    activeAnimationAction.setLoop(THREE.LoopRepeat, Infinity);
    activeAnimationAction.clampWhenFinished = false;
    activeAnimationAction.play();
  }
  updateAnimationButton();
}

function updateAnimationButton() {
  const label = animationPlayButton.lastElementChild;
  if (!label) {
    return;
  }
  label.textContent = activeAnimationAction?.isRunning() && !activeAnimationAction.paused ? "暂停" : "播放";
}

function restartAnimation() {
  if (!mixer) {
    return;
  }
  playAnimation(true);
}

function updateSelectionPanel() {
  selectedObjectCard.classList.toggle("empty", !selectedObject);
  selectedName.textContent = selectedObject ? getObjectName(selectedObject) : "选择一个对象";
  selectedMeta.textContent = selectedObject
    ? `${selectedObject.geometry?.attributes?.position?.count || 0} 个顶点`
    : "点击画布或下方对象列表";
  if (selectionFocusButton) selectionFocusButton.disabled = !selectedObject;
  if (selectionVisibilityButton) {
    selectionVisibilityButton.disabled = !selectedObject;
    selectionVisibilityButton.setAttribute("aria-pressed", String(selectedObject?.visible === false));
    selectionVisibilityButton.title = selectedObject?.visible === false ? "显示对象" : "隐藏对象";
    const label = selectionVisibilityButton.querySelector("span:last-child");
    if (label && selectionVisibilityButton.children.length > 1) {
      label.textContent = selectedObject?.visible === false ? "显示对象" : "隐藏对象";
    }
  }
  updateSelectionBox();
}

function isObjectVisible(object) {
  for (let current = object; current; current = current.parent) {
    if (!current.visible) return false;
  }
  return true;
}

function updateSelectionBox() {
  selectionBox.visible = Boolean(selectedObject && meshes.includes(selectedObject) && isObjectVisible(selectedObject));
  if (!selectionBox.visible) return;
  if (selectedObject.isSkinnedMesh) selectedObject.computeBoundingBox();
  selectionBounds.copy(getMeshBounds(selectedObject));
  selectionBox.visible = !selectionBounds.isEmpty();
}

function updateSceneStats() {
  if (!sceneStats) return;
  let triangles = 0;
  meshes.forEach((mesh) => {
    const count = mesh.geometry.index?.count ?? mesh.geometry.attributes.position?.count ?? 0;
    triangles += Math.floor(count / 3) * (mesh.isInstancedMesh ? mesh.count : 1);
  });
  sceneStats.textContent = `${meshes.length} 个对象 · ${triangles.toLocaleString()} 个三角面 · ${animationClips.length} 段动画`;
}

function updateAnimationProgress() {
  const duration = activeAnimationAction?.getClip().duration || selectedAnimationClip()?.duration || 0;
  const time = activeAnimationAction?.time || 0;
  if (animationProgress) {
    animationProgress.min = "0";
    animationProgress.max = String(duration || 1);
    animationProgress.step = "0.01";
    animationProgress.value = String(time);
    animationProgress.disabled = !duration;
  }
  if (animationProgressValue) animationProgressValue.textContent = `${time.toFixed(1)} / ${duration.toFixed(1)} 秒`;
}

function renderAnimationPanel() {
  animationCount.textContent = String(animationClips.length);
  animationEmpty.classList.toggle("is-hidden", animationClips.length > 0);
  animationControls.classList.toggle("is-hidden", animationClips.length === 0);
  updateAnimationProgress();
  updateAnimationButton();
}

function renderObjectList() {
  const query = objectSearch.value.trim().toLowerCase();
  const visibleObjects = meshes.filter((mesh) => getObjectName(mesh).toLowerCase().includes(query));
  objectList.replaceChildren();

  if (!visibleObjects.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list";
    empty.textContent = meshes.length ? "没有匹配的对象" : "模型加载后显示可配置对象";
    objectList.append(empty);
    return;
  }

  // 整厅含数百个独立组件，列表不能截断，否则部分对象无法直接选取。
  visibleObjects.forEach((mesh) => {
    const row = document.createElement("button");
    row.className = "object-row";
    row.type = "button";
    row.dataset.uuid = mesh.uuid;
    row.classList.toggle("is-selected", mesh === selectedObject);

    const icon = document.createElement("span");
    icon.className = "object-icon";
    icon.textContent = mesh === selectedObject ? "◆" : "◇";
    icon.setAttribute("aria-hidden", "true");

    const name = document.createElement("span");
    name.className = "object-name";
    name.textContent = getObjectName(mesh);

    row.append(icon, name);
    row.addEventListener("click", () => selectObject(mesh));
    objectList.append(row);
  });
}

function getObjectName(object) {
  return object.name || `对象 ${meshes.indexOf(object) + 1}`;
}

function selectObject(object) {
  if (!object || !meshes.includes(object)) return;
  selectedObject = object;
  updateSelectionPanel();
  renderObjectList();
}

function clearSelection() {
  selectedObject = null;
  updateSelectionPanel();
  renderObjectList();
}

function exportConfiguration() {
  const config = {
    version: 1,
    model: modelFileName,
    renderMode,
    lights: {
      environment: environmentToggle.checked,
      environmentIntensity: Number(environmentIntensity.value),
      environmentRotation: Number(environmentRotation.value),
      key: keyToggle.checked,
      keyAzimuth: Number(keyAzimuth.value),
      keyElevation: Number(keyElevation.value),
      keyIntensity: Number(keyIntensity.value),
      modelLights: modelLightsToggle.checked,
    },
    environment: environmentMeta.textContent,
    animation: {
      clip: selectedAnimationClip()?.name || null,
      speed: Number(animationSpeed.value),
    },
  };
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${modelFileName.replace(/\.glb$/i, "") || "scene"}-config.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function setLoadingState() {
  loadingState.style.display = "grid";
  loadingState.classList.remove("is-hidden");
  errorState.style.display = "grid";
  errorState.classList.add("is-hidden");
  statusPill.classList.remove("is-ready", "is-error");
  statusPill.classList.add("is-loading");
  statusText.textContent = "正在加载模型";
}

function setLoadedState() {
  loadingState.style.display = "none";
  loadingState.classList.add("is-hidden");
  errorState.style.display = "none";
  statusPill.classList.remove("is-loading", "is-error");
  statusPill.classList.add("is-ready");
  statusText.textContent = "模型已就绪";
  assetMeta.textContent = `${meshes.length} 个可配置对象`;
}

function setErrorState(message) {
  loadingState.style.display = "none";
  loadingState.classList.add("is-hidden");
  errorState.style.display = "grid";
  errorText.textContent = message;
  errorState.classList.remove("is-hidden");
  statusPill.classList.remove("is-loading", "is-ready");
  statusPill.classList.add("is-error");
  statusText.textContent = "加载失败";
}

function resetView() {
  selectCameraView("perspective");
}

function frameModel() {
  if (!model) {
    return;
  }

  const bounds = new THREE.Box3();
  model.updateWorldMatrix(true, true);
  meshes.forEach((mesh) => bounds.union(getMeshBounds(mesh)));
  if (bounds.isEmpty()) return;
  const viewDirection = cameraView === "front"
    ? new THREE.Vector3(0, 0, 1)
    : cameraView === "side"
      ? new THREE.Vector3(1, 0, 0)
      : cameraView === "top"
        ? new THREE.Vector3(0, 1, 0.001)
        : new THREE.Vector3(...(activeModelProfile?.direction || [1, 0.32, -1]));
  viewDirection.normalize();

  sceneCenter.copy(bounds.getCenter(new THREE.Vector3()));
  fitBounds(bounds, viewDirection, activeModelProfile ? meshes : null);
  cameraWasAdjusted = false;
  updateSelectionBox();
}

function getMeshBounds(mesh) {
  mesh.updateWorldMatrix(true, false);
  if (mesh.isSkinnedMesh || mesh.isInstancedMesh) {
    mesh.computeBoundingBox();
    return mesh.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
  }
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
}

function fitBounds(bounds, direction, fitObjects = null) {
  const center = bounds.getCenter(new THREE.Vector3());
  const radius = Math.max(bounds.getBoundingSphere(new THREE.Sphere()).radius, 0.00001);
  const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const tanH = tanV * Math.max(camera.aspect, 0.01);
  const forward = direction.clone().normalize();
  const right = new THREE.Vector3().crossVectors(camera.up, forward).normalize();
  const up = new THREE.Vector3().crossVectors(forward, right).normalize();
  let distance = radius * 0.2;
  const fitPoint = (point) => {
    const offset = point.clone().sub(center);
    const depth = offset.dot(forward);
    distance = Math.max(distance,
      depth + Math.abs(offset.dot(right)) / tanH * 1.12,
      depth + Math.abs(offset.dot(up)) / tanV * 1.12);
  };
  if (fitObjects) {
    // 不规则剖切轮廓的总包围盒包含大量空角，按真实顶点取景才能充分利用画布。
    const point = new THREE.Vector3();
    fitObjects.forEach((mesh) => {
      if (!mesh.visible) return;
      const positions = mesh.geometry.attributes.position;
      for (let index = 0; index < positions.count; index += 1) {
        point.fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
        fitPoint(point);
      }
    });
  } else {
    // 普通模型及单对象聚焦仍按包围盒取景。
    for (const x of [bounds.min.x, bounds.max.x]) {
      for (const y of [bounds.min.y, bounds.max.y]) {
        for (const z of [bounds.min.z, bounds.max.z]) {
          fitPoint(new THREE.Vector3(x, y, z));
        }
      }
    }
  }
  fittingCamera = true;
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(forward, distance);
  // 整厅包含贴合的面板与地面，收紧深度范围可避免远景深度精度不足导致条纹。
  camera.near = Math.max(radius * (activeModelProfile ? 0.01 : 0.0001), 0.000001);
  camera.far = activeModelProfile
    ? Math.max(distance * 8 + radius * 2, radius * 22)
    : Math.max(distance + radius * 20, radius * 100);
  controls.minDistance = radius * 0.05;
  controls.maxDistance = Math.max(distance * 8, radius * 20);
  camera.updateProjectionMatrix();
  controls.update();
  controls.enableDamping = damping;
  fittingCamera = false;
}

function resize() {
  if (canvasWrap.clientWidth === 0 || canvasWrap.clientHeight === 0) return;
  const width = Math.max(canvasWrap.clientWidth, 1);
  const height = Math.max(canvasWrap.clientHeight, 1);
  const previousAspect = camera.aspect;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  if (model && !cameraWasAdjusted && Math.abs(previousAspect - camera.aspect) > 0.001) frameModel();
}

function handleModelFile(file) {
  if (!file) return;
  if (!file.name.toLowerCase().endsWith(".glb")) {
    setErrorState("请选择 .glb 文件；Blender 工程、FBX 和 OBJ 请先导出为 GLB。");
    return;
  }
  if (file.size === 0) {
    setErrorState("这个文件是空的，请重新导出模型后再导入。");
    return;
  }

  if (modelObjectUrl) {
    URL.revokeObjectURL(modelObjectUrl);
  }
  modelObjectUrl = URL.createObjectURL(file);
  loadModel(modelObjectUrl, file.name, `${(file.size / 1024 / 1024).toFixed(1)} MB`);
}

function handlePointerDown(event) {
  if (event.isPrimary && event.button === 0) {
    pointerDown = { x: event.clientX, y: event.clientY, id: event.pointerId };
  } else {
    pointerDown = null;
  }
}

function handlePointerUp(event) {
  if (!pointerDown || pointerDown.id !== event.pointerId) {
    return;
  }
  const distance = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
  pointerDown = null;
  if (distance > 6 || !meshes.length) {
    return;
  }

  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(meshes.filter(isObjectVisible), false)[0];
  if (hit?.object) {
    selectObject(hit.object);
  } else {
    clearSelection();
  }
}

function focusSelection() {
  if (!selectedObject) return;
  const bounds = getMeshBounds(selectedObject);
  if (bounds.isEmpty()) return;
  const direction = camera.position.clone().sub(controls.target).normalize();
  fitBounds(bounds, direction);
  cameraWasAdjusted = true;
}

function toggleSelectedVisibility() {
  if (!selectedObject) return;
  selectedObject.visible = !selectedObject.visible;
  updateSelectionPanel();
  renderObjectList();
}

function takeScreenshot() {
  renderScene();
  const link = document.createElement("a");
  link.download = `${modelFileName.replace(/\.glb$/i, "") || "scene"}-preview.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function selectCameraView(view) {
  if (!["perspective", "front", "side", "top"].includes(view)) return;
  cameraView = view;
  cameraViewButtons.forEach((button) => {
    const selected = button.dataset.cameraView === view;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  frameModel();
}

uploadButton.addEventListener("click", () => modelInput.click());
dropTarget.addEventListener("click", () => modelInput.click());
document.querySelectorAll("[data-import-model]").forEach((button) => {
  button.disabled = false;
  button.addEventListener("click", () => modelInput.click());
});
modelInput.addEventListener("change", () => {
  const file = modelInput.files[0];
  // 清空选择后，同一个文件修正后仍能再次触发导入。
  modelInput.value = "";
  handleModelFile(file);
});
document.querySelector("#demo-model-button").addEventListener("click", () => {
  if (modelObjectUrl) URL.revokeObjectURL(modelObjectUrl);
  modelObjectUrl = null;
  loadModel(dinerModelUrl, "餐厅剖切场景.glb");
});
exportButton.addEventListener("click", exportConfiguration);
resetButton.addEventListener("click", resetView);
autoRotateButton?.addEventListener("click", () => {
  controls.autoRotate = !controls.autoRotate;
  autoRotateButton.classList.toggle("is-selected", controls.autoRotate);
  autoRotateButton.setAttribute("aria-pressed", String(controls.autoRotate));
});
focusButton?.addEventListener("click", frameModel);
screenshotButton?.addEventListener("click", takeScreenshot);
gridToggle?.addEventListener("change", updateGridState);
shadowToggle?.addEventListener("change", updateShadowState);
exposure?.addEventListener("input", () => {
  renderer.toneMappingExposure = Number(exposure.value);
  if (exposureValue) exposureValue.textContent = Number(exposure.value).toFixed(2);
});
cameraViewButtons.forEach((button) => {
  button.addEventListener("click", () => selectCameraView(button.dataset.cameraView));
});
backgroundButtons.forEach((button) => {
  button.addEventListener("click", () => setBackground(button.dataset.background));
});
selectionFocusButton?.addEventListener("click", focusSelection);
selectionVisibilityButton?.addEventListener("click", toggleSelectedVisibility);
clearSelectionButton.addEventListener("click", clearSelection);
objectSearch.addEventListener("input", renderObjectList);
presetButtons.forEach((button) => {
  button.addEventListener("click", () => applyRenderMode(button.dataset.renderMode));
});
environmentToggle.addEventListener("change", updateLightState);
environmentInput.addEventListener("change", () => loadEnvironmentFile(environmentInput.files[0]));
environmentIntensity.addEventListener("input", updateLightState);
environmentRotation.addEventListener("input", updateLightState);
keyToggle.addEventListener("change", updateLightState);
keyAzimuth.addEventListener("input", () => {
  updateKeyLightPosition();
  updateLightState();
});
keyElevation.addEventListener("input", () => {
  updateKeyLightPosition();
  updateLightState();
});
keyIntensity.addEventListener("input", updateLightState);
modelLightsToggle.addEventListener("change", updateLightState);
animationSelect.addEventListener("change", () => {
  activeAnimationAction?.stop();
  activeAnimationAction = null;
  updateAnimationButton();
  updateAnimationProgress();
});
animationPlayButton.addEventListener("click", () => playAnimation());
animationRestartButton.addEventListener("click", restartAnimation);
animationSpeed.addEventListener("input", () => {
  animationSpeedValue.textContent = `${Number(animationSpeed.value).toFixed(2)}×`;
  if (mixer) {
    mixer.timeScale = Number(animationSpeed.value);
  }
});
animationProgress?.addEventListener("input", () => {
  if (!mixer || !selectedAnimationClip()) return;
  if (!activeAnimationAction) playAnimation(true);
  activeAnimationAction.time = Number(animationProgress.value);
  activeAnimationAction.paused = true;
  mixer.update(0);
  updateSelectionBox();
  updateAnimationProgress();
  updateAnimationButton();
});
canvas.addEventListener("pointerdown", handlePointerDown);
canvas.addEventListener("pointerup", handlePointerUp);
canvas.addEventListener("pointercancel", () => { pointerDown = null; });
controls.addEventListener("start", () => { if (!fittingCamera) cameraWasAdjusted = true; });

["dragenter", "dragover"].forEach((eventName) => {
  canvasWrap.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropOverlay.classList.remove("is-hidden");
    dropTarget.classList.add("is-dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  canvasWrap.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropOverlay.classList.add("is-hidden");
    dropTarget.classList.remove("is-dragging");
  });
});

canvasWrap.addEventListener("drop", (event) => {
  handleModelFile(event.dataTransfer.files[0]);
});

window.addEventListener("resize", resize, { passive: true });
const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(canvasWrap);

function animate(now) {
  animationFrameId = requestAnimationFrame(animate);
  // 播放视频时暂停三维渲染，避免两种展示同时占用显卡。
  if (document.querySelector(".app-shell").classList.contains("is-video")) {
    lastFrameTime = null;
    return;
  }
  const delta = lastFrameTime === null ? 0 : Math.min((now - lastFrameTime) / 1000, 0.1);
  if (mixer) {
    mixer.update(delta);
    model?.updateMatrixWorld(true);
    updateAnimationProgress();
  }
  updateSelectionBox();
  controls.update(delta);
  renderScene();
  lastFrameTime = now;
}

// 初始化只同步场景控制的默认值，材质本身保持导入值。
environmentIntensity.value = "0.65";
keyIntensity.value = "2.4";
keyElevation.value = "40";
if (exposure) renderer.toneMappingExposure = Number(exposure.value);
if (exposureValue && exposure) exposureValue.textContent = Number(exposure.value).toFixed(2);
setBackground("light");
createDefaultEnvironment();
loadModel(modelUrl, modelFileName);
resize();
animate(performance.now());

window.addEventListener("beforeunload", () => {
  disposed = true;
  loadRequestId += 1;
  environmentRequestId += 1;
  cancelAnimationFrame(animationFrameId);
  resizeObserver.disconnect();
  clearModel();
  gradientMap.dispose();
  sketchGradientMap.dispose();
  environmentRenderTarget?.dispose();
  environmentSourceTexture?.dispose();
  pmremGenerator.dispose();
  selectionBox.geometry.dispose();
  selectionBox.material.dispose();
  webLights.traverse((light) => light.shadow?.dispose());
  controls.dispose();
  if (contactAo) {
    contactAo.target.dispose();
    contactAo.quad.geometry.dispose();
    contactAo.material.dispose();
  }
  renderer.dispose();
  if (modelObjectUrl) URL.revokeObjectURL(modelObjectUrl);
});
