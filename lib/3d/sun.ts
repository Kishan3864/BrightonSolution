/**
 * The logo's sun as a 3D object: the ring and the eight rays of the mark, extruded, in the logo's own
 * orange and amber. Mount it into a sized container that already shows the flat SVG poster; the canvas
 * fades in over it after the first frame, so LCP and CLS stay on the poster.
 *
 * Guardrails (from the taste-3d templates): WebGL2 check, DPR clamp, loop paused off-screen and in hidden
 * tabs, one still frame under prefers-reduced-motion, damped pointer follow on fine pointers only,
 * ResizeObserver sizing, full GPU cleanup in dispose().
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** Logo colours (components/Logo.tsx). */
const RING = "#ed943b";
const RAY = "#edb43b";

/* Proportions taken from the logo artwork: ring centre radius 7.66, tube 2.15 wide, rays 2.19 x 2.84 at 12.05. */
const R = 1;
const TUBE = 1.075 / 7.658;
const RAY_W = 2.194 / 7.658;
const RAY_L = 2.84 / 7.658;
const RAY_D = 12.05 / 7.658;

export interface Sun3D {
  dispose(): void;
}

export function supportsWebGL2(): boolean {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function mountSun(container: HTMLElement): Sun3D | null {
  if (!supportsWebGL2()) return null;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const maxDpr = window.innerWidth < 768 ? 1.5 : 2;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxDpr));
  renderer.toneMapping = THREE.NeutralToneMapping;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;opacity:0;transition:opacity .8s ease";
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 8.4);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  scene.environmentIntensity = 0.55;

  // Dark page: low ambient, one warm key, an amber rim from behind.
  const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
  key.position.set(3, 4, 6);
  const rim = new THREE.DirectionalLight(RAY, 1.4);
  rim.position.set(-4, -2, -4);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.15));

  const sun = new THREE.Group();
  scene.add(sun);

  const ringMat = new THREE.MeshPhysicalMaterial({
    color: RING,
    metalness: 0.15,
    roughness: 0.32,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    emissive: RING,
    emissiveIntensity: 0.12,
  });
  const rayMat = new THREE.MeshPhysicalMaterial({
    color: RAY,
    metalness: 0.15,
    roughness: 0.35,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
    emissive: RAY,
    emissiveIntensity: 0.1,
  });

  const ringGeo = new THREE.TorusGeometry(R, TUBE, 48, 160);
  const ring = new THREE.Mesh(ringGeo, ringMat);
  sun.add(ring);

  const rayGeo = new RoundedBox(RAY_W, RAY_L, TUBE * 0.9);
  const rays: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const ray = new THREE.Mesh(rayGeo, rayMat);
    ray.rotation.z = angle;
    ray.position.set(-Math.sin(angle) * RAY_D, Math.cos(angle) * RAY_D, 0);
    ray.userData.angle = angle;
    rays.push(ray);
    sun.add(ray);
  }

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);

  const target = new THREE.Vector2();
  const onPointer = (e: PointerEvent) => {
    const r = container.getBoundingClientRect();
    target.set(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };
  if (finePointer && !reduced) window.addEventListener("pointermove", onPointer, { passive: true });

  let shown = false;
  function render() {
    renderer.render(scene, camera);
    if (!shown) {
      shown = true;
      canvas.style.opacity = "1";
      container.classList.add("is-3d-live");
    }
  }

  // Slow turn, a damped lean toward the pointer, and the rays breathing out and in like a sunrise.
  const clock = new THREE.Clock();
  let t = 0;
  const tick = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    t += dt;
    sun.rotation.z -= 0.12 * dt;
    sun.rotation.x = THREE.MathUtils.damp(sun.rotation.x, 0.18 + target.y * 0.35, 4, dt);
    sun.rotation.y = THREE.MathUtils.damp(sun.rotation.y, -0.32 + target.x * 0.45, 4, dt);
    const breath = 1 + Math.sin(t * 1.2) * 0.045;
    for (const ray of rays) {
      const a = ray.userData.angle as number;
      ray.position.set(-Math.sin(a) * RAY_D * breath, Math.cos(a) * RAY_D * breath, 0);
    }
    render();
  };

  // Resting pose: tipped slightly so the extrusion reads, even when nothing moves.
  sun.rotation.set(0.18, -0.32, 0);

  let visible = false;
  const syncLoop = () => {
    const run = visible && !document.hidden && !reduced;
    renderer.setAnimationLoop(run ? tick : null);
    if (run) clock.getDelta();
  };
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    syncLoop();
  });
  io.observe(container);
  document.addEventListener("visibilitychange", syncLoop);

  resize();
  render();

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", syncLoop);
      window.removeEventListener("pointermove", onPointer);
      ringGeo.dispose();
      rayGeo.dispose();
      ringMat.dispose();
      rayMat.dispose();
      envMap.dispose();
      pmrem.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}

/** Box with softly bevelled edges, extruded from a rounded rectangle (keeps the logo's crisp block shape). */
class RoundedBox extends THREE.ExtrudeGeometry {
  constructor(width: number, height: number, depth: number) {
    const r = Math.min(width, height) * 0.12;
    const x = -width / 2;
    const y = -height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    super(shape, { depth, bevelEnabled: true, bevelThickness: depth * 0.2, bevelSize: r * 0.6, bevelSegments: 3 });
    this.translate(0, 0, -depth / 2);
  }
}
