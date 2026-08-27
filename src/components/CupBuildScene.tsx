"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import type {
  ToppingKind,
  ToppingSpec,
  YogurtPalette,
} from "@/lib/cup-build-order";
import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Cached procedural maps — hero soft-serve is matte, ridged, flecked. */
let creamCache: {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} | null = null;

function getCreamMaps() {
  if (creamCache) return creamCache;
  const size = 256;
  const albedo = document.createElement("canvas");
  albedo.width = size;
  albedo.height = size;
  const a = albedo.getContext("2d")!;
  const g = a.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, "#fffdf9");
  g.addColorStop(0.45, "#fff4e6");
  g.addColorStop(1, "#f3dcc0");
  a.fillStyle = g;
  a.fillRect(0, 0, size, size);
  for (let i = 0; i < 700; i++) {
    a.fillStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.18})`;
    a.beginPath();
    a.arc(
      Math.random() * size,
      Math.random() * size,
      0.5 + Math.random() * 1.8,
      0,
      Math.PI * 2,
    );
    a.fill();
  }
  for (let i = 0; i < 90; i++) {
    a.fillStyle = `rgba(200,140,80,${0.04 + Math.random() * 0.07})`;
    a.beginPath();
    a.arc(
      Math.random() * size,
      Math.random() * size,
      0.7 + Math.random() * 2,
      0,
      Math.PI * 2,
    );
    a.fill();
  }

  const bump = document.createElement("canvas");
  bump.width = size;
  bump.height = size;
  const b = bump.getContext("2d")!;
  b.fillStyle = "#787878";
  b.fillRect(0, 0, size, size);
  // Star-nozzle ridges (hero soft-serve) — high contrast for visible bump
  for (let y = 0; y < size; y++) {
    const wave =
      Math.sin(y * 0.28) * 22 +
      Math.sin(y * 0.09) * 12 +
      Math.sin(y * 0.55) * 6;
    const shade = 90 + Math.sin(y * 0.18) * 55;
    b.fillStyle = `rgb(${shade},${shade},${shade})`;
    b.fillRect(0, y, size, 1);
    b.fillStyle = "rgba(255,255,255,0.35)";
    b.fillRect(size * 0.5 + wave - 10, y, 14, 1);
    b.fillStyle = "rgba(20,20,20,0.28)";
    b.fillRect(size * 0.5 + wave + 8, y, 10, 1);
  }

  const map = new THREE.CanvasTexture(albedo);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(2.2, 3.2);
  const bumpMap = new THREE.CanvasTexture(bump);
  bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(3, 5);
  creamCache = { map, bumpMap };
  return creamCache;
}

let paperCache: THREE.CanvasTexture | null = null;
function getPaperMap() {
  if (paperCache) return paperCache;
  const size = 128;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#f7f2ea";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 1400; i++) {
    const v = 195 + Math.floor(Math.random() * 50);
    ctx.fillStyle = `rgba(${v},${v - 10},${v - 18},0.55)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.2, 1.2);
  }
  // Soft fiber streaks
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(180,160,140,${0.08 + Math.random() * 0.1})`;
    ctx.beginPath();
    const y = Math.random() * size;
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }
  paperCache = new THREE.CanvasTexture(c);
  paperCache.colorSpace = THREE.SRGBColorSpace;
  paperCache.wrapS = paperCache.wrapT = THREE.RepeatWrapping;
  paperCache.repeat.set(2.5, 2);
  return paperCache;
}

let cookieCache: THREE.CanvasTexture | null = null;
function getCookieMap() {
  if (cookieCache) return cookieCache;
  const size = 64;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#c4a06a";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 48; i++) {
    ctx.fillStyle = `rgba(70,40,20,${0.2 + Math.random() * 0.45})`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * size,
      Math.random() * size,
      1 + Math.random() * 2.8,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  cookieCache = new THREE.CanvasTexture(c);
  cookieCache.colorSpace = THREE.SRGBColorSpace;
  return cookieCache;
}

function CreamMaterial({
  color,
  bumpScale = 0.22,
}: {
  color: string;
  bumpScale?: number;
}) {
  const maps = useMemo(() => getCreamMaps(), []);
  return (
    <meshPhysicalMaterial
      color={color}
      map={maps.map}
      bumpMap={maps.bumpMap}
      bumpScale={bumpScale}
      roughness={0.72}
      metalness={0}
      clearcoat={0.12}
      clearcoatRoughness={0.65}
      sheen={0.35}
      sheenRoughness={0.85}
      sheenColor="#fff6ea"
      envMapIntensity={0.28}
    />
  );
}

/** One continuous soft-serve helix with star-nozzle cross-section (cached). */
let softServeHelix: THREE.ExtrudeGeometry | null = null;
function getSoftServeHelix() {
  if (softServeHelix) return softServeHelix;

  const lobes = 7;
  const shape = new THREE.Shape();
  const shapeSegs = 16;
  const tubeR = 0.11;
  for (let i = 0; i <= shapeSegs; i++) {
    const t = i / shapeSegs;
    const a = t * Math.PI * 2;
    const r = tubeR * (0.8 + 0.2 * Math.sin(t * lobes * Math.PI * 2));
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }

  const turns = 3.4;
  const pathSegs = 56;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= pathSegs; i++) {
    const t = i / pathSegs;
    const a = t * Math.PI * 2 * turns;
    const rad = 0.36 * (1 - t * 0.62);
    pts.push(
      new THREE.Vector3(
        Math.cos(a) * rad,
        0.78 + t * 0.95,
        Math.sin(a) * rad,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  softServeHelix = new THREE.ExtrudeGeometry(shape, {
    steps: pathSegs,
    bevelEnabled: false,
    extrudePath: curve,
  });
  return softServeHelix;
}

/** Scalloped soft-serve coil — kept for secondary accent rings. */
const coilGeoCache = new Map<string, THREE.ExtrudeGeometry>();
function makeRidgedCoil(radius: number, tubeR: number) {
  const key = `${radius.toFixed(3)}:${tubeR.toFixed(3)}`;
  const hit = coilGeoCache.get(key);
  if (hit) return hit;

  const lobes = 7;
  const shape = new THREE.Shape();
  const shapeSegs = 14;
  for (let i = 0; i <= shapeSegs; i++) {
    const t = i / shapeSegs;
    const a = t * Math.PI * 2;
    const r = tubeR * (0.78 + 0.22 * Math.sin(t * lobes * Math.PI * 2));
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const pathSegs = 20;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= pathSegs; i++) {
    const a = (i / pathSegs) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: pathSegs,
    bevelEnabled: false,
    extrudePath: curve,
  });
  coilGeoCache.set(key, geo);
  return geo;
}

function PaperCupStatic({ logoTex }: { logoTex: THREE.Texture | null }) {
  const paper = useMemo(() => getPaperMap(), []);
  const cupGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    pts.push(new THREE.Vector2(0.4, 0));
    pts.push(new THREE.Vector2(0.46, 0.015));
    pts.push(new THREE.Vector2(0.54, 0.88));
    pts.push(new THREE.Vector2(0.575, 0.94));
    pts.push(new THREE.Vector2(0.555, 0.97));
    return new THREE.LatheGeometry(pts, 48);
  }, []);

  return (
    <group>
      <mesh geometry={cupGeo} castShadow receiveShadow>
        <meshStandardMaterial
          color="#faf6f0"
          map={paper}
          roughness={0.9}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial color="#efe6dc" map={paper} roughness={0.92} />
      </mesh>
      <mesh position={[0, 0.96, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.555, 0.022, 10, 36]} />
        <meshStandardMaterial
          color="#fffdf8"
          roughness={0.55}
          metalness={0.04}
        />
      </mesh>
      {logoTex ? (
        <mesh position={[0, 0.44, 0.5]} renderOrder={2}>
          <planeGeometry args={[0.78, 0.34]} />
          <meshBasicMaterial
            map={logoTex}
            transparent
            opacity={0.95}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

/** Soft-serve — continuous ridged helix + cream maps (hero look). */
function SoftServeStatic({ palette }: { palette: YogurtPalette }) {
  const helix = useMemo(() => getSoftServeHelix(), []);
  // Two accent rings near the base for density (hero cups are brim-full)
  const baseRings = useMemo(
    () => [
      { y: 0.88, rot: 0.2, geo: makeRidgedCoil(0.38, 0.1) },
      { y: 1.0, rot: 0.9, geo: makeRidgedCoil(0.34, 0.095) },
    ],
    [],
  );

  const flecks = useMemo(() => {
    if (!palette.fleck) return [];
    return Array.from({ length: 24 }).map((_, i) => {
      const a = (i / 24) * Math.PI * 2 + (i % 5) * 0.2;
      const r = 0.12 + (i % 5) * 0.055;
      return {
        x: Math.cos(a) * r,
        y: 0.95 + (i % 8) * 0.1,
        z: Math.sin(a) * r,
        s: 0.011 + (i % 3) * 0.005,
      };
    });
  }, [palette.fleck]);

  return (
    <group>
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <sphereGeometry
          args={[0.46, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.58]}
        />
        <CreamMaterial color={palette.mid} bumpScale={0.16} />
      </mesh>
      {baseRings.map((c, i) => (
        <mesh
          key={i}
          geometry={c.geo}
          position={[0, c.y, 0]}
          rotation={[0.12, c.rot, 0.04]}
          castShadow
          receiveShadow
        >
          <CreamMaterial
            color={i % 2 === 0 ? palette.light : palette.mid}
            bumpScale={0.2}
          />
        </mesh>
      ))}
      <mesh geometry={helix} castShadow receiveShadow>
        <CreamMaterial color={palette.light} bumpScale={0.24} />
      </mesh>
      {/* Soft tip peak */}
      <mesh position={[0.03, 1.78, 0.02]} rotation={[0.35, 0.2, 0.5]} castShadow>
        <sphereGeometry args={[0.1, 14, 12]} />
        <CreamMaterial color={palette.light} bumpScale={0.16} />
      </mesh>
      <mesh position={[0.09, 1.88, 0.04]} rotation={[0.25, 0, 0.35]} castShadow>
        <capsuleGeometry args={[0.034, 0.07, 4, 10]} />
        <CreamMaterial color={palette.light} bumpScale={0.14} />
      </mesh>
      {palette.fleck
        ? flecks.map((f, i) => (
            <mesh key={i} position={[f.x, f.y, f.z]}>
              <sphereGeometry args={[f.s, 5, 5]} />
              <meshStandardMaterial
                color={palette.fleck}
                roughness={0.75}
                metalness={0}
              />
            </mesh>
          ))
        : null}
    </group>
  );
}

function ToppingMesh({
  kind,
  colors,
}: {
  kind: ToppingKind;
  colors: [string, string];
}) {
  const cookie = useMemo(() => getCookieMap(), []);

  if (kind === "berry") {
    return (
      <group>
        <mesh castShadow>
          <sphereGeometry args={[0.085, 16, 12]} />
          <meshStandardMaterial
            color={colors[0]}
            roughness={0.55}
            metalness={0.04}
          />
        </mesh>
        <mesh position={[0, 0.075, 0]}>
          <coneGeometry args={[0.022, 0.035, 6]} />
          <meshStandardMaterial color="#3d6b2e" roughness={0.8} />
        </mesh>
      </group>
    );
  }
  if (kind === "cookie") {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.095, 0.095, 0.032, 24]} />
          <meshStandardMaterial
            color={colors[0]}
            map={cookie}
            roughness={0.78}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.036, 20]} />
          <meshStandardMaterial color={colors[1]} roughness={0.45} />
        </mesh>
      </group>
    );
  }
  if (kind === "sprinkle") {
    return (
      <mesh rotation={[0.5, 0.25, 0.9]} castShadow>
        <capsuleGeometry args={[0.012, 0.075, 4, 8]} />
        <meshStandardMaterial color={colors[0]} roughness={0.4} />
      </mesh>
    );
  }
  if (kind === "sauce") {
    return (
      <mesh castShadow scale={[1, 1.35, 1]}>
        <sphereGeometry args={[0.065, 14, 10]} />
        <meshStandardMaterial
          color={colors[0]}
          roughness={0.35}
          metalness={0.08}
        />
      </mesh>
    );
  }
  if (kind === "mint") {
    return (
      <mesh castShadow>
        <boxGeometry args={[0.085, 0.04, 0.085]} />
        <meshStandardMaterial color={colors[0]} roughness={0.45} />
      </mesh>
    );
  }
  if (kind === "chip") {
    return (
      <mesh rotation={[0.55, 0.3, 0.2]} castShadow scale={[1.3, 0.55, 1]}>
        <sphereGeometry args={[0.048, 10, 8]} />
        <meshStandardMaterial color={colors[0]} roughness={0.6} />
      </mesh>
    );
  }
  if (kind === "nut") {
    return (
      <mesh scale={[1.25, 0.7, 0.95]} castShadow>
        <sphereGeometry args={[0.05, 12, 10]} />
        <meshStandardMaterial color={colors[0]} roughness={0.75} />
      </mesh>
    );
  }
  if (kind === "gummy") {
    return (
      <mesh castShadow>
        <capsuleGeometry args={[0.038, 0.045, 5, 10]} />
        <meshStandardMaterial
          color={colors[0]}
          roughness={0.3}
          transparent
          opacity={0.88}
        />
      </mesh>
    );
  }
  if (kind === "crumb") {
    return (
      <mesh castShadow>
        <boxGeometry args={[0.07, 0.025, 0.05]} />
        <meshStandardMaterial color={colors[0]} map={cookie} roughness={0.85} />
      </mesh>
    );
  }
  return (
    <mesh castShadow>
      <dodecahedronGeometry args={[0.05]} />
      <meshStandardMaterial color={colors[0]} roughness={0.65} />
    </mesh>
  );
}

function SceneContent({
  progressRef,
  palette,
  bits,
  logoTex,
}: {
  progressRef: MutableRefObject<number>;
  palette: YogurtPalette;
  bits: Array<ToppingSpec & { bitKey: string; seed: number }>;
  logoTex: THREE.Texture | null;
}) {
  const swirl = useRef<THREE.Group>(null);
  const cup = useRef<THREE.Group>(null);
  const serve = useRef<THREE.Group>(null);
  const pour = useRef<THREE.Mesh>(null);
  const toppings = useRef<THREE.Group>(null);
  const cream = useMemo(() => getCreamMaps(), []);

  // Drive motion from the ref inside useFrame — no React re-renders per tick.
  useFrame((state) => {
    const progress = progressRef.current;
    const cupVis = easeOutCubic(clamp01(progress / 0.18));
    const pourActive =
      progress > 0.16 && progress < 0.42
        ? clamp01((progress - 0.16) / 0.12) *
          (1 - clamp01((progress - 0.34) / 0.08))
        : 0;
    const grow = easeOutCubic(clamp01((progress - 0.18) / 0.28));
    const landBase = clamp01((progress - 0.38) / 0.32);
    const mix = clamp01((progress - 0.7) / 0.2);

    if (cup.current) {
      const s = 0.88 + 0.12 * cupVis;
      cup.current.scale.setScalar(s);
      cup.current.position.y = -0.12 + (1 - cupVis) * 0.4;
    }
    if (serve.current) {
      serve.current.scale.setScalar(Math.max(0.001, grow));
      serve.current.position.y = (1 - grow) * -0.15;
      serve.current.rotation.y += 0.0035 * grow;
    }
    if (pour.current) {
      const a = clamp01(pourActive);
      pour.current.visible = a > 0.02;
      pour.current.scale.set(1, Math.max(0.001, a * 1.35), 1);
      pour.current.position.y = 2.35 - a * 0.5;
      const mat = pour.current.material as THREE.MeshStandardMaterial;
      mat.opacity = a * 0.88;
    }
    if (swirl.current) {
      swirl.current.rotation.y =
        mix * -0.85 + Math.sin(state.clock.elapsedTime * 0.7) * 0.02;
    }
    if (toppings.current) {
      const total = Math.max(bits.length, 1);
      toppings.current.children.forEach((child, i) => {
        const bitSeed = bits[i]?.seed ?? i;
        const stagger = i / total;
        const land = easeOutCubic(
          clamp01((landBase - stagger * 0.35) / 0.65),
        );
        const a = (i / total) * Math.PI * 2 + bitSeed * 0.35;
        const r = 0.16 + (bitSeed % 4) * 0.065;
        const nestX = Math.cos(a) * r;
        const nestY = 1.32 + (bitSeed % 3) * 0.09;
        const nestZ = Math.sin(a) * r * 0.85;
        const startY = 2.55 + (bitSeed % 5) * 0.07;
        const rot = bitSeed * 0.65;
        child.visible = land > 0.02;
        child.position.set(nestX, startY + (nestY - startY) * land, nestZ);
        child.rotation.set(rot * land, rot * 1.3 * land, rot * 0.5 * land);
        child.scale.setScalar(0.35 + 0.65 * land);
      });
    }
  });

  return (
    <>
      <color attach="background" args={["#f3ebe0"]} />
      <fog attach="fog" args={["#f3ebe0", 6, 13]} />
      <ambientLight intensity={0.72} />
      <hemisphereLight args={["#fffaf4", "#d8c8b4", 0.85]} />
      <directionalLight
        position={[2.6, 5.8, 2.8]}
        intensity={1.45}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight
        position={[-2.2, 2.4, -1.2]}
        intensity={0.32}
        color="#ffe8d4"
      />
      <directionalLight position={[0.4, 1.5, 3]} intensity={0.4} color="#ffffff" />
      <pointLight position={[0, 2.1, 1.4]} intensity={0.28} color="#fff6ec" />

      <group position={[0, -0.9, 0]}>
        <group ref={cup}>
          <PaperCupStatic logoTex={logoTex} />
        </group>
        <mesh ref={pour} position={[0, 2.15, 0]} visible={false}>
          <cylinderGeometry args={[0.038, 0.052, 1.05, 12]} />
          <meshStandardMaterial
            color={palette.mid}
            map={cream.map}
            bumpMap={cream.bumpMap}
            bumpScale={0.03}
            transparent
            opacity={0}
            roughness={0.75}
            metalness={0}
          />
        </mesh>
        <group ref={swirl}>
          <group ref={serve} scale={0.001}>
            <SoftServeStatic palette={palette} />
          </group>
          <group ref={toppings}>
            {bits.map((b) => (
              <group key={b.bitKey} visible={false}>
                <ToppingMesh kind={b.kind} colors={b.colors} />
              </group>
            ))}
          </group>
        </group>
      </group>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.91, 0]}
        receiveShadow
      >
        <circleGeometry args={[2.4, 32]} />
        <meshStandardMaterial color="#e6ddd0" roughness={0.94} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.905, 0]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#3c2f29" transparent opacity={0.14} />
      </mesh>
    </>
  );
}

function useLogoTexture() {
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load("/logo.webp", (raw) => {
      if (cancelled) return;
      const img = raw.image as HTMLImageElement;
      const canvas = document.createElement("canvas");
      canvas.width = img.width || 512;
      canvas.height = img.height || 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setTex(raw);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < data.data.length; i += 4) {
        const r = data.data[i];
        const g = data.data[i + 1];
        const b = data.data[i + 2];
        if (r < 28 && g < 28 && b < 28) data.data[i + 3] = 0;
      }
      ctx.putImageData(data, 0, 0);
      const keyed = new THREE.CanvasTexture(canvas);
      keyed.colorSpace = THREE.SRGBColorSpace;
      keyed.anisotropy = 4;
      keyed.needsUpdate = true;
      setTex(keyed);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return tex;
}

function CameraRig({ progressRef }: { progressRef: MutableRefObject<number> }) {
  useFrame((state) => {
    const p = easeInOut(clamp01(progressRef.current));
    const z = 3.35 - p * 0.4;
    const y = 1.4 - p * 0.1;
    state.camera.position.lerp(new THREE.Vector3(1.35, y, z), 0.07);
    state.camera.lookAt(0, 0.2, 0);
  });
  return null;
}

export function CupBuildScene({
  progressRef,
  palette,
  bits,
  onReady,
}: {
  progressRef: MutableRefObject<number>;
  palette: YogurtPalette;
  bits: Array<ToppingSpec & { bitKey: string; seed: number }>;
  onReady?: () => void;
}) {
  const logoTex = useLogoTexture();
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const fired = useRef(false);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [1.35, 1.4, 3.35], fov: 30, near: 0.1, far: 40 }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.12,
      }}
      style={{ width: "100%", height: "100%", borderRadius: 2 }}
      className="cup-build__canvas"
      onCreated={() => {
        if (fired.current) return;
        fired.current = true;
        requestAnimationFrame(() => readyRef.current?.());
      }}
    >
      <Suspense fallback={null}>
        <SceneContent
          progressRef={progressRef}
          palette={palette}
          bits={bits}
          logoTex={logoTex}
        />
        <CameraRig progressRef={progressRef} />
      </Suspense>
    </Canvas>
  );
}
