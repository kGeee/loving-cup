"use client";

import { ContactShadows } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import type {
  ToppingKind,
  ToppingSpec,
  YogurtPalette,
} from "@/lib/cup-build-order";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

function PaperCup({
  logoTex,
  visible,
}: {
  logoTex: THREE.Texture | null;
  visible: number;
}) {
  const group = useRef<THREE.Group>(null);
  const cupGeo = useMemo(() => {
    const pts: THREE.Vector2[] = [];
    pts.push(new THREE.Vector2(0.4, 0));
    pts.push(new THREE.Vector2(0.46, 0.015));
    pts.push(new THREE.Vector2(0.54, 0.88));
    pts.push(new THREE.Vector2(0.575, 0.94));
    pts.push(new THREE.Vector2(0.555, 0.97));
    return new THREE.LatheGeometry(pts, 96);
  }, []);

  useFrame(() => {
    if (!group.current) return;
    const s = 0.88 + 0.12 * visible;
    group.current.scale.setScalar(s);
    group.current.position.y = -0.12 + (1 - visible) * 0.4;
  });

  return (
    <group ref={group}>
      <mesh geometry={cupGeo} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#faf6f0"
          roughness={0.62}
          metalness={0.02}
          clearcoat={0.15}
          clearcoatRoughness={0.8}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 64]} />
        <meshStandardMaterial color="#f0e8de" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.96, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.555, 0.024, 16, 80]} />
        <meshPhysicalMaterial color="#ffffff" roughness={0.35} clearcoat={0.4} />
      </mesh>
      {logoTex ? (
        <mesh position={[0, 0.44, 0.5]} renderOrder={2}>
          <planeGeometry args={[0.78, 0.34]} />
          <meshBasicMaterial
            map={logoTex}
            transparent
            opacity={0.95 * visible}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ) : null}
    </group>
  );
}

function SoftServe({
  palette,
  grow,
}: {
  palette: YogurtPalette;
  grow: number;
}) {
  const group = useRef<THREE.Group>(null);
  const coils = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5].map((i) => ({
        y: 0.95 + i * 0.145,
        r: 0.4 - i * 0.048,
        tube: 0.105 - i * 0.007,
        rot: i * 0.65,
      })),
    [],
  );

  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.22 * grow;
  });

  const g = easeOutCubic(clamp01(grow));

  return (
    <group ref={group} scale={[g, g, g]} position={[0, (1 - g) * -0.15, 0]}>
      <mesh position={[0, 0.72, 0]} castShadow>
        <sphereGeometry
          args={[0.46, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.58]}
        />
        <meshPhysicalMaterial
          color={palette.mid}
          roughness={0.42}
          clearcoat={0.25}
          clearcoatRoughness={0.55}
        />
      </mesh>
      {coils.map((c, i) => (
        <mesh
          key={i}
          position={[0, c.y, 0]}
          rotation={[0.12, c.rot, 0.06]}
          castShadow
        >
          <torusGeometry args={[c.r, c.tube, 24, 64]} />
          <meshPhysicalMaterial
            color={i % 2 === 0 ? palette.light : palette.mid}
            roughness={0.38}
            clearcoat={0.3}
            clearcoatRoughness={0.5}
          />
        </mesh>
      ))}
      <mesh position={[0.05, 1.82, 0.02]} rotation={[0.35, 0.25, 0.55]} castShadow>
        <sphereGeometry args={[0.11, 28, 20]} />
        <meshPhysicalMaterial
          color={palette.light}
          roughness={0.35}
          clearcoat={0.35}
        />
      </mesh>
      <mesh position={[0.13, 1.92, 0.05]} rotation={[0.15, 0, 0.35]} castShadow>
        <capsuleGeometry args={[0.04, 0.09, 8, 16]} />
        <meshPhysicalMaterial color={palette.light} roughness={0.35} />
      </mesh>
      {palette.fleck
        ? Array.from({ length: 22 }).map((_, i) => {
            const a = (i / 22) * Math.PI * 2;
            const r = 0.2 + (i % 4) * 0.07;
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(a) * r,
                  1.0 + (i % 6) * 0.11,
                  Math.sin(a) * r,
                ]}
              >
                <sphereGeometry args={[0.016, 10, 10]} />
                <meshStandardMaterial color={palette.fleck} roughness={0.65} />
              </mesh>
            );
          })
        : null}
    </group>
  );
}

function PourStream({ active, color }: { active: number; color: string }) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!mesh.current) return;
    const a = clamp01(active);
    mesh.current.scale.set(1, Math.max(0.001, a * 1.35), 1);
    mesh.current.position.y = 2.35 - a * 0.5;
    const mat = mesh.current.material as THREE.MeshPhysicalMaterial;
    mat.opacity = a * 0.9;
  });
  return (
    <mesh ref={mesh} position={[0, 2.15, 0]}>
      <cylinderGeometry args={[0.035, 0.05, 1.05, 16]} />
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={0}
        roughness={0.3}
        clearcoat={0.4}
      />
    </mesh>
  );
}

function ToppingMesh({
  kind,
  colors,
}: {
  kind: ToppingKind;
  colors: [string, string];
}) {
  if (kind === "berry") {
    return (
      <group>
        <mesh castShadow>
          <sphereGeometry args={[0.085, 20, 16]} />
          <meshPhysicalMaterial
            color={colors[0]}
            roughness={0.45}
            clearcoat={0.2}
          />
        </mesh>
        <mesh position={[0, 0.075, 0]}>
          <coneGeometry args={[0.022, 0.035, 7]} />
          <meshStandardMaterial color="#3d6b2e" />
        </mesh>
      </group>
    );
  }
  if (kind === "cookie") {
    return (
      <group>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.095, 0.095, 0.032, 28]} />
          <meshStandardMaterial color={colors[0]} roughness={0.65} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.036, 24]} />
          <meshStandardMaterial color={colors[1]} roughness={0.4} />
        </mesh>
      </group>
    );
  }
  if (kind === "sprinkle") {
    return (
      <mesh rotation={[0.5, 0.25, 0.9]} castShadow>
        <capsuleGeometry args={[0.012, 0.075, 4, 8]} />
        <meshStandardMaterial color={colors[0]} roughness={0.35} />
      </mesh>
    );
  }
  if (kind === "sauce") {
    return (
      <mesh castShadow scale={[1, 1.35, 1]}>
        <sphereGeometry args={[0.065, 16, 12]} />
        <meshPhysicalMaterial
          color={colors[0]}
          roughness={0.2}
          clearcoat={0.5}
        />
      </mesh>
    );
  }
  if (kind === "mint") {
    return (
      <mesh castShadow>
        <boxGeometry args={[0.085, 0.04, 0.085]} />
        <meshStandardMaterial color={colors[0]} roughness={0.4} />
      </mesh>
    );
  }
  if (kind === "chip") {
    return (
      <mesh rotation={[0.55, 0.3, 0.2]} castShadow scale={[1.3, 0.55, 1]}>
        <sphereGeometry args={[0.048, 12, 10]} />
        <meshStandardMaterial color={colors[0]} roughness={0.55} />
      </mesh>
    );
  }
  if (kind === "nut") {
    return (
      <mesh scale={[1.25, 0.7, 0.95]} castShadow>
        <sphereGeometry args={[0.05, 14, 12]} />
        <meshStandardMaterial color={colors[0]} roughness={0.7} />
      </mesh>
    );
  }
  if (kind === "gummy") {
    return (
      <mesh castShadow>
        <capsuleGeometry args={[0.038, 0.045, 6, 12]} />
        <meshPhysicalMaterial
          color={colors[0]}
          roughness={0.25}
          transparent
          opacity={0.88}
          clearcoat={0.4}
        />
      </mesh>
    );
  }
  return (
    <mesh castShadow>
      <dodecahedronGeometry args={[0.05]} />
      <meshStandardMaterial color={colors[0]} roughness={0.6} />
    </mesh>
  );
}

function FallingTopping({
  bit,
  index,
  total,
  land,
}: {
  bit: ToppingSpec & { bitKey: string; seed: number };
  index: number;
  total: number;
  land: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const nest = useMemo(() => {
    const a = (index / Math.max(total, 1)) * Math.PI * 2 + bit.seed * 0.35;
    const r = 0.16 + (bit.seed % 4) * 0.065;
    return {
      x: Math.cos(a) * r,
      y: 1.32 + (bit.seed % 3) * 0.09,
      z: Math.sin(a) * r * 0.85,
      rot: bit.seed * 0.65,
    };
  }, [bit.seed, index, total]);

  useFrame(() => {
    if (!ref.current) return;
    const t = easeOutCubic(clamp01(land));
    const startY = 2.55 + (bit.seed % 5) * 0.07;
    ref.current.position.set(nest.x, startY + (nest.y - startY) * t, nest.z);
    ref.current.rotation.set(nest.rot * t, nest.rot * 1.3 * t, nest.rot * 0.5 * t);
    ref.current.scale.setScalar(0.35 + 0.65 * t);
    ref.current.visible = t > 0.02;
  });

  return (
    <group ref={ref} visible={false}>
      <ToppingMesh kind={bit.kind} colors={bit.colors} />
    </group>
  );
}

function SceneContent({
  progress,
  palette,
  bits,
  logoTex,
}: {
  progress: number;
  palette: YogurtPalette;
  bits: Array<ToppingSpec & { bitKey: string; seed: number }>;
  logoTex: THREE.Texture | null;
}) {
  const swirl = useRef<THREE.Group>(null);

  const cupVis = clamp01(progress / 0.18);
  const pourActive =
    progress > 0.16 && progress < 0.42
      ? clamp01((progress - 0.16) / 0.12) *
        (1 - clamp01((progress - 0.34) / 0.08))
      : 0;
  const grow = clamp01((progress - 0.18) / 0.28);
  const landBase = clamp01((progress - 0.38) / 0.32);
  const mix = clamp01((progress - 0.7) / 0.2);

  useFrame((state) => {
    if (!swirl.current) return;
    swirl.current.rotation.y = mix * -0.85 + Math.sin(state.clock.elapsedTime * 0.7) * 0.02;
  });

  return (
    <>
      <color attach="background" args={["#efe6d8"]} />
      <fog attach="fog" args={["#efe6d8", 5.5, 12]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#fffaf2", "#d4c4b0", 0.7]} />
      <directionalLight
        position={[2.8, 5.5, 3]}
        intensity={1.55}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
      />
      <directionalLight position={[-2.5, 1.8, -1.5]} intensity={0.28} color="#f84030" />
      <pointLight position={[0, 2.2, 1.5]} intensity={0.35} color="#fff5eb" />

      <group position={[0, -0.9, 0]}>
        <PaperCup logoTex={logoTex} visible={easeOutCubic(cupVis)} />
        <PourStream active={pourActive} color={palette.mid} />
        <group ref={swirl}>
          <SoftServe palette={palette} grow={grow} />
          {bits.map((b, i) => {
            const stagger = i / Math.max(bits.length, 1);
            const land = clamp01((landBase - stagger * 0.35) / 0.65);
            return (
              <FallingTopping
                key={b.bitKey}
                bit={b}
                index={i}
                total={bits.length}
                land={land}
              />
            );
          })}
        </group>
      </group>

      <ContactShadows
        position={[0, -0.9, 0]}
        opacity={0.38}
        scale={5}
        blur={2.8}
        far={4}
        color="#3c2f29"
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.91, 0]} receiveShadow>
        <circleGeometry args={[2.6, 64]} />
        <meshStandardMaterial color="#e8dfd2" roughness={0.92} />
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

function CameraRig({ progress }: { progress: number }) {
  useFrame((state) => {
    const p = easeInOut(clamp01(progress));
    const z = 3.35 - p * 0.4;
    const y = 1.4 - p * 0.1;
    state.camera.position.lerp(new THREE.Vector3(1.35, y, z), 0.07);
    state.camera.lookAt(0, 0.2, 0);
  });
  return null;
}

export function CupBuildScene({
  progress,
  palette,
  bits,
}: {
  progress: number;
  palette: YogurtPalette;
  bits: Array<ToppingSpec & { bitKey: string; seed: number }>;
}) {
  const logoTex = useLogoTexture();

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [1.35, 1.4, 3.35], fov: 30, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ width: "100%", height: "100%", borderRadius: 2 }}
    >
      <Suspense fallback={null}>
        <SceneContent
          progress={progress}
          palette={palette}
          bits={bits}
          logoTex={logoTex}
        />
        <CameraRig progress={progress} />
      </Suspense>
    </Canvas>
  );
}
