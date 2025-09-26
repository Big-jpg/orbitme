"use client";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line, Stars, Billboard, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { Body, makeCircularBodies /*, ensurePayloadGEO */ } from "~/lib/bodies";
import { useSim } from "~/components/Controls";
import {
  seedCircularVelocities,
  zeroSystemMomentum,
  stepLeapfrog,
  stepRK4,
  type ExtraAccel,
  M_PER_S_TO_AU_PER_DAY,
} from "~/lib/physics";

/** Camera-locked starfield (true 3D background). */
function StarBackground() {
  const starsRef = useRef<THREE.Points | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current) groupRef.current.position.copy((camera as THREE.PerspectiveCamera).position);
  });

  useEffect(() => {
    const s = starsRef.current;
    if (!s) return;
    s.renderOrder = -1;
    const mat = s.material as THREE.PointsMaterial;
    if (mat) {
      mat.depthWrite = false;
      mat.depthTest = false;
      mat.needsUpdate = true;
    }
  }, []);

  return (
    <group ref={groupRef}>
      <Stars
        ref={starsRef as any}
        radius={15}
        depth={20}
        count={4000}
        factor={2.0}
        saturation={0}
        fade
        speed={0}
      />
    </group>
  );
}

// Prefill trail buffer with current position so first frame isn't a line from (0,0,0)
function initTrail(arr: Float32Array, pos: [number, number, number]) {
  for (let i = 0; i < arr.length; i += 3) {
    arr[i + 0] = pos[0];
    arr[i + 1] = pos[1];
    arr[i + 2] = pos[2];
  }
}

function Scene() {
  const {
    running, dt, timeScale, integrator, trails, massScale, velScale,
    // payloadEnabled, dvMps, thrustPulse, payloadReset,   // <-- payload disabled
    resetSignal, trailLen,
  } = useSim();

  const [bodies, setBodies] = useState<Body[]>(() => {
    const init = makeCircularBodies();
    seedCircularVelocities(init, "sun", false);
    zeroSystemMomentum(init);
    return init;
  });

  // trails
  const trailsRef = useRef<Map<string, Float32Array>>(new Map());
  const trailIdxRef = useRef<Map<string, number>>(new Map());

  // Reset
  useEffect(() => {
    const reset = makeCircularBodies();
    seedCircularVelocities(reset, "sun", false);
    zeroSystemMomentum(reset);
    setBodies(reset);
    trailsRef.current = new Map();
    trailIdxRef.current = new Map();
  }, [resetSignal]);

  // --- PAYLOAD LOGIC DISABLED ---
  // useEffect(() => { /* ensurePayloadGEO(next) */ }, [payloadEnabled, payloadReset]);
  // useEffect(() => { /* apply Δv to payload */ }, [thrustPulse]);

  // Reallocate trail buffers when length changes
  useEffect(() => {
    if (!trails) return;
    for (const b of bodies) {
      const desired = Math.max(0, Math.floor(trailLen[b.id] ?? 2000));
      const existing = trailsRef.current.get(b.id);
      const have = existing ? existing.length / 3 : 0;
      if (have !== desired) {
        if (desired === 0) {
          trailsRef.current.delete(b.id);
          trailIdxRef.current.delete(b.id);
        } else {
          const arr = new Float32Array(desired * 3);
          initTrail(arr, b.position);
          trailsRef.current.set(b.id, arr);
          trailIdxRef.current.set(b.id, 0);
        }
      }
    }
  }, [trailLen, bodies, trails]);

  useFrame(() => {
    if (!running) return;

    const next = bodies.map(b => ({
      ...b,
      position: [...b.position] as [number, number, number],
      velocity: [...b.velocity] as [number, number, number],
    }));

    const extra: ExtraAccel = undefined;
    const safeDt = Math.min(dt, 0.25);
    const safeScale = Math.min(timeScale, 100);

    if (integrator === "rk4") {
      stepRK4(next, safeDt, safeScale, massScale, velScale, false, 0, extra);
    } else {
      stepLeapfrog(next, safeDt, safeScale, massScale, velScale, false, 0, extra);
    }

    setBodies(next);

    if (trails) {
      for (const b of next) {
        const desired = Math.max(0, Math.floor(trailLen[b.id] ?? 2000));
        if (desired === 0) continue;

        let arr = trailsRef.current.get(b.id);
        let idx = trailIdxRef.current.get(b.id) ?? 0;

        if (!arr || arr.length !== desired * 3) {
          arr = new Float32Array(desired * 3);
          initTrail(arr, b.position);
          trailsRef.current.set(b.id, arr);
          idx = 0;
        }

        arr[idx * 3 + 0] = b.position[0];
        arr[idx * 3 + 1] = b.position[1];
        arr[idx * 3 + 2] = b.position[2];
        idx = desired > 0 ? (idx + 1) % desired : 0;
        trailIdxRef.current.set(b.id, idx);
      }
    }
  });

  // Tunables for visual scale & labels
  const PLANET_SCALE = 8.5;
  const LABEL_Z_OFFSET = 0.20;

  return (
    <>
      <color attach="background" args={["#020409"]} />
      <StarBackground />

      {/* Bodies + labels */}
      {bodies.map(b => {
        const r = b.radius * PLANET_SCALE;
        const fontSize =
          b.id === "sun" ? 0.06 :
          b.id === "jupiter" || b.id === "saturn" ? 0.08 :
          0.06;

        return (
          <group key={b.id} position={b.position as any}>
            <mesh>
              <sphereGeometry args={[r, 32, 32]} />
              <meshStandardMaterial
                color={b.color}
                emissive={b.id === "sun" ? b.color : undefined}
                emissiveIntensity={b.id === "sun" ? 0.9 : 0}
                roughness={0.35}
                metalness={0.08}
              />
            </mesh>
            <Billboard position={[0, 0, LABEL_Z_OFFSET]}>
              <Text
                fontSize={fontSize}
                color={b.id === "sun" ? "#ffe9a6" : "#e5e7eb"}
                outlineWidth={0.004}
                outlineColor="rgba(0,0,0,0.85)"
                anchorX="center"
                anchorY="middle"
              >
                {b.name ?? b.id}
              </Text>
            </Billboard>
          </group>
        );
      })}

      {/* Trails */}
      {useMemo(
        () =>
          bodies.map(b => {
            const arr = trailsRef.current.get(b.id);
            if (!trails || !arr) return null;
            const desired = Math.max(0, Math.floor(trailLen[b.id] ?? 2000));
            if (desired === 0) return null;

            const idx = trailIdxRef.current.get(b.id) ?? 0;
            const ordered = new Float32Array(arr.length);
            ordered.set(arr.slice(idx * 3));
            ordered.set(arr.slice(0, idx * 3), arr.length - idx * 3);

            const pts: [number, number, number][] = [];
            for (let i = 0; i < ordered.length; i += 3) {
              pts.push([ordered[i], ordered[i + 1], ordered[i + 2]]);
            }
            return (
              <Line
                key={`trail-${b.id}`}
                points={pts}
                linewidth={1}
                color={b.color}
                opacity={0.9}
                transparent
                depthWrite={false}
              />
            );
          }),
        [bodies, trails, trailLen, resetSignal]
      )}

      <ambientLight intensity={0.35} />
      <pointLight position={[0, 0, 0]} intensity={2.0} />
    </>
  );
}

export default function OrbitCanvas() {
  return (
    <Canvas
      // Allow very close zoom without clipping
      camera={{ position: [0, 15, 28], near: 0.05, far: 1000 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        logarithmicDepthBuffer: true,
      }}
    >
      <OrbitControls
        enablePan
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
        minDistance={0.05}   // <-- zoom much closer
        maxDistance={800}    // plenty of room to zoom out
        zoomSpeed={0.9}
      />
      <Scene />
    </Canvas>
  );
}
