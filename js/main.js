import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import gsap from "gsap";
import { createWatch } from "./watch.js?v=20261115d";

const canvas = document.getElementById("c");
const slider = document.getElementById("explode");
const card = document.getElementById("info-card");
const cardTitle = document.getElementById("card-title");
const cardEn = document.getElementById("card-en");
const cardFact = document.getElementById("card-fact");
const btnExplode = document.getElementById("btn-explode");
const btnAssemble = document.getElementById("btn-assemble");
const btnXray = document.getElementById("btn-xray");
const btnRotate = document.getElementById("btn-rotate");
const loader = document.getElementById("loader");

function showFatal(message, err) {
  if (!loader) return;
  loader.classList.add("fatal");
  loader.classList.remove("hide");
  const name = loader.querySelector(".load-name");
  if (name) name.textContent = message;
  const spin = loader.querySelector(".spinner");
  if (spin) spin.style.display = "none";
  let detail = loader.querySelector(".load-detail");
  if (!detail) {
    detail = document.createElement("div");
    detail.className = "load-detail";
    loader.appendChild(detail);
  }
  const text = err && (err.message || String(err));
  detail.textContent = text || "";
  detail.hidden = !text;
}

function isSoftwareGL(renderer) {
  try {
    const gl = renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const info = [
      dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "",
      gl.getParameter(gl.RENDERER),
      gl.getParameter(gl.VENDOR),
    ].join(" ");
    return /swiftshader|llvmpipe|softpipe|microsoft basic|virtualbox|angel[ -]?llvm|cpu/i.test(info);
  } catch {
    return false;
  }
}

function probeWebGL() {
  const c = document.createElement("canvas");
  const attrs = { alpha: false, antialias: false, failIfMajorPerformanceCaveat: false };
  try {
    return !!(c.getContext("webgl2", attrs) || c.getContext("webgl", attrs) || c.getContext("experimental-webgl", attrs));
  } catch {
    return false;
  }
}

function createRenderer() {
  if (!probeWebGL()) {
    const err = new Error("WebGL context unavailable");
    err.code = "NO_WEBGL";
    throw err;
  }
  const attempts = [
    { antialias: true, alpha: false, powerPreference: "high-performance", failIfMajorPerformanceCaveat: false },
    { antialias: false, alpha: false, powerPreference: "default", failIfMajorPerformanceCaveat: false },
    { antialias: false, alpha: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: false },
  ];
  let lastErr = null;
  for (const params of attempts) {
    try {
      const renderer = new THREE.WebGLRenderer({ canvas, ...params });
      if (renderer.getContext()) return renderer;
    } catch (err) {
      lastErr = err;
    }
  }
  try {
    const attrs = {
      alpha: false,
      antialias: false,
      depth: true,
      stencil: false,
      failIfMajorPerformanceCaveat: false,
      powerPreference: "default",
    };
    const gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs);
    if (gl) {
      return new THREE.WebGLRenderer({ canvas, context: gl, antialias: false, alpha: false });
    }
  } catch (err) {
    lastErr = err;
  }
  const err = lastErr || new Error("WebGL context unavailable");
  err.code = "NO_WEBGL";
  throw err;
}

function init() {
  let renderer;
  try {
    renderer = createRenderer();
  } catch (err) {
    console.error("WebGL unavailable:", err);
    showFatal("เบราว์เซอร์นี้ใช้ WebGL ไม่ได้ จึงแสดงภาพ 3 มิติไม่ได้ค่ะ ลองเปิดด้วย Chrome หรือ Edge แล้วเปิดการเร่งกราฟิกในตั้งค่า", err);
    return;
  }

  const software = isSoftwareGL(renderer);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, software ? 1 : 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !software;
  if (!software) renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x070709);
  scene.fog = new THREE.FogExp2(0x070709, 0.018);

  const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 80);
  function defaultCamPos() {
    const portrait = window.innerHeight > window.innerWidth * 1.05;
    return portrait ? new THREE.Vector3(6.4, 3.8, 10.2) : new THREE.Vector3(6.6, 3.2, 7.1);
  }
  camera.position.copy(defaultCamPos());

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 4.5;
  controls.maxDistance = 22;
  controls.target.set(0, 0, 0);
  controls.maxPolarAngle = Math.PI * 0.9;
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.9;

  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();
  } catch (err) {
    console.warn("Environment map unavailable, using lights only.", err);
    scene.environment = null;
  }

  const key = new THREE.DirectionalLight(0xfff4e5, software ? 1.6 : 1.35);
  key.position.set(6, 8, 10);
  key.castShadow = !software;
  if (!software) {
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = key.shadow.camera.bottom = -8;
    key.shadow.camera.right = key.shadow.camera.top = 8;
    key.shadow.bias = -0.0002;
  }
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9bb7ff, 0.35);
  fill.position.set(-7, 2, -4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe0a0, 0.45);
  rim.position.set(-2, 4, 8);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0x404048, software ? 0.55 : 0.35));

  (function makeFloor() {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(256, 256, 20, 256, 256, 256);
    g.addColorStop(0, "rgba(30, 26, 20, 1)");
    g.addColorStop(0.4, "rgba(14, 12, 10, 0.9)");
    g.addColorStop(1, "rgba(7, 7, 9, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(c);
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(9, 64),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.9, metalness: 0.1, depthWrite: false })
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -6.2;
    mesh.receiveShadow = !software;
    scene.add(mesh);
  })();

  const watch = createWatch(THREE);
  scene.add(watch.group);

  let composer = null;
  let useComposer = false;
  if (!software) {
    try {
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.22, 0.4, 0.88);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      useComposer = true;
    } catch (err) {
      console.warn("Bloom unavailable, falling back to standard renderer.", err);
      useComposer = false;
      composer = null;
    }
  }

  const state = {
    explode: 0,
    xray: false,
    autoRotate: false,
    selected: null,
    hovered: null,
    tween: null,
  };

  function applyExplode(t) {
    const k = gsap.parseEase("power2.inOut")(THREE.MathUtils.clamp(t, 0, 1));
    for (const p of watch.parts) {
      p.object.position.lerpVectors(p.assembled, p.exploded, k);
    }
    slider.value = String(Math.round(t * 100));
    slider.style.setProperty("--pct", `${t * 100}%`);
  }

  function setExplode(t, animate = false, dur = 1.7) {
    t = THREE.MathUtils.clamp(t, 0, 1);
    if (state.tween) state.tween.kill();
    if (!animate) {
      state.explode = t;
      applyExplode(t);
      return;
    }
    state.tween = gsap.to(state, {
      explode: t,
      duration: dur,
      ease: "power2.inOut",
      onUpdate: () => applyExplode(state.explode),
    });
  }

  slider.addEventListener("input", () => {
    if (state.tween) state.tween.kill();
    state.explode = Number(slider.value) / 100;
    applyExplode(state.explode);
  });

  window.addEventListener(
    "wheel",
    (e) => {
      if (e.target && (e.target.closest("button") || e.target.closest("input") || e.target.closest("#info-card"))) return;
      e.preventDefault();
      if (state.tween) state.tween.kill();
      state.explode = THREE.MathUtils.clamp(state.explode + e.deltaY * 0.00115, 0, 1);
      applyExplode(state.explode);
    },
    { passive: false }
  );

  btnExplode.addEventListener("click", () => setExplode(1, true, 1.85));
  btnAssemble.addEventListener("click", () => setExplode(0, true, 1.7));

  const xrayColor = new THREE.Color(0x7ec8e3);

  function eachMaterial(root, fn) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m && fn(m, o));
    });
  }

  function stashBase(m) {
    if (!m.userData._base) {
      m.userData._base = {
        color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
        opacity: m.opacity,
        transparent: m.transparent,
        depthWrite: m.depthWrite,
        metalness: m.metalness,
        roughness: m.roughness,
      };
    }
  }

  function setXray(on) {
    state.xray = on;
    btnXray.classList.toggle("active", on);
    eachMaterial(watch.group, (m) => {
      stashBase(m);
      const b = m.userData._base;
      if (on) {
        m.transparent = true;
        m.depthWrite = false;
        m.opacity = Math.min(0.3, b.opacity * 0.9 + 0.12);
        if (typeof m.metalness === "number") m.metalness = 0.2;
        if (typeof m.roughness === "number") m.roughness = 0.28;
        if (m.color) m.color.copy(b.color).lerp(xrayColor, 0.55);
      } else {
        if (m.color) m.color.copy(b.color);
        m.opacity = b.opacity;
        m.transparent = b.transparent;
        m.depthWrite = b.depthWrite;
        if (typeof m.metalness === "number") m.metalness = b.metalness;
        if (typeof m.roughness === "number") m.roughness = b.roughness;
      }
      m.needsUpdate = true;
    });
  }

  btnXray.addEventListener("click", () => setXray(!state.xray));

  btnRotate.addEventListener("click", () => {
    state.autoRotate = !state.autoRotate;
    controls.autoRotate = state.autoRotate;
    btnRotate.classList.toggle("active", state.autoRotate);
  });

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let downPos = null;
  let highlighted = null;

  function partFromObject(obj) {
    let o = obj;
    while (o) {
      if (o.userData && o.userData.partId) {
        return watch.parts.find((p) => p.id === o.userData.partId) || null;
      }
      o = o.parent;
    }
    return null;
  }

  function setHighlight(part, on) {
    if (!part) return;
    eachMaterial(part.object, (m) => {
      if (!m.emissive) return;
      if (on) {
        if (!m.userData._e0) {
          m.userData._e0 = m.emissive.clone();
          m.userData._ei0 = m.emissiveIntensity ?? 1;
        }
        m.emissive.setHex(0xc9a24a);
        m.emissiveIntensity = 0.55;
      } else if (m.userData._e0) {
        m.emissive.copy(m.userData._e0);
        m.emissiveIntensity = m.userData._ei0;
      }
    });
  }

  function showCard(part) {
    if (!part) {
      card.classList.remove("visible");
      return;
    }
    cardTitle.textContent = part.nameTh;
    cardEn.textContent = part.nameEn;
    cardFact.textContent = part.fact;
    card.classList.add("visible");
  }

  function selectPart(part) {
    if (highlighted && highlighted !== part) setHighlight(highlighted, false);
    state.selected = part ? part.id : null;
    highlighted = part;
    if (part) setHighlight(part, true);
    showCard(part);
  }

  function pointerToNdc(e) {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  }

  function hitPart(e) {
    pointerToNdc(e);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(watch.group, true);
    return hits.length ? partFromObject(hits[0].object) : null;
  }

  canvas.addEventListener("pointerdown", (e) => {
    downPos = { x: e.clientX, y: e.clientY };
    canvas.classList.add("is-dragging");
  });

  canvas.addEventListener("pointerup", (e) => {
    canvas.classList.remove("is-dragging");
    if (!downPos) return;
    const dx = e.clientX - downPos.x;
    const dy = e.clientY - downPos.y;
    downPos = null;
    if (dx * dx + dy * dy > 25) return;
    const part = hitPart(e);
    selectPart(part);
  });

  canvas.addEventListener("pointermove", (e) => {
    const part = hitPart(e);
    canvas.classList.toggle("is-hot", !!part);
    if (state.selected) return;
    if (state.hovered === (part && part.id)) return;
    if (state.hovered) {
      const prev = watch.parts.find((p) => p.id === state.hovered);
      if (prev) setHighlight(prev, false);
    }
    state.hovered = part ? part.id : null;
    if (part) {
      setHighlight(part, true);
      showCard(part);
    } else {
      showCard(null);
    }
  });

  canvas.addEventListener("pointerleave", () => {
    canvas.classList.remove("is-hot");
    if (state.selected) return;
    if (state.hovered) {
      const prev = watch.parts.find((p) => p.id === state.hovered);
      if (prev) setHighlight(prev, false);
    }
    state.hovered = null;
    showCard(null);
  });

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    showFatal("การ์ดจอคืนบริบท WebGL ไม่สำเร็จค่ะ ลองรีเฟรชหน้านี้", new Error("webglcontextlost"));
  });

  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (composer) composer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  const clock = new THREE.Clock();
  let firstFrameOk = false;
  let stopped = false;

  function render() {
    if (stopped) return;
    requestAnimationFrame(render);
    clock.getDelta();
    controls.update();
    watch.tick(performance.now());
    try {
      if (useComposer && composer) composer.render();
      else renderer.render(scene, camera);
      if (!firstFrameOk) {
        firstFrameOk = true;
        loader.classList.add("hide");
        window.__WATCH_READY__ = true;
      }
    } catch (err) {
      if (useComposer) {
        useComposer = false;
        console.warn("Composer failed, using raw renderer.", err);
        try {
          renderer.render(scene, camera);
        } catch (err2) {
          console.error(err2);
          stopped = true;
          showFatal("แสดงภาพ 3 มิติไม่สำเร็จค่ะ ลองรีเฟรชหน้านี้", err2);
        }
      } else {
        console.error(err);
        stopped = true;
        showFatal("แสดงภาพ 3 มิติไม่สำเร็จค่ะ ลองรีเฟรชหน้านี้", err);
      }
    }
  }

  applyExplode(0);
  render();

  function projectPart(id) {
    const p = watch.parts.find((x) => x.id === id);
    if (!p) return null;
    const v = new THREE.Vector3();
    p.object.updateWorldMatrix(true, false);
    p.object.getWorldPosition(v);
    v.project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
    };
  }

  window.__WATCH__ = {
    ready: true,
    setExplode: (t, animate = false) => setExplode(t, animate),
    explode: () => setExplode(1, true),
    assemble: () => setExplode(0, true),
    setXray,
    setAutoRotate: (on) => {
      state.autoRotate = on;
      controls.autoRotate = on;
      btnRotate.classList.toggle("active", on);
    },
    select: (id) => selectPart(watch.parts.find((p) => p.id === id) || null),
    projectPart,
    getState: () => ({ ...state, software }),
    source: window.__WATCH_SOURCE__ || "unknown",
    parts: watch.parts.map((p) => p.id),
  };
}

try {
  init();
} catch (err) {
  console.error(err);
  showFatal("เริ่มแอปไม่สำเร็จค่ะ ลองรีเฟรชหน้านี้", err);
}
