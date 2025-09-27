"use client";
import * as THREE from "three";
import PlanetMesh from "~/components/PlanetMesh";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Line, Stars, Billboard, Text } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, Fragment } from "react";
import { Body, makeCircularBodies /*, ensurePayloadGEO */ } from "~/lib/bodies";
// import KeplerOrbit from "~/components/KeplerOrbit"; // keep if/when you render analytic orbits
import { useSim } from "~/state/sim";
import {
  seedCircularVelocities,
  zeroSystemMomentum,
  stepLeapfrog,
  stepRK4,
  type ExtraAccel,
} from "~/lib/physics";

/** Camera-locked starfield (true 3D background). */
function StarBackground() {
  const starsRef = useRef<THREE.Points | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const { camera } = useThree();

  useFrame(() => {
    if (groupRef.current)
      groupRef.current.position.copy((camera as THREE.PerspectiveCamera).position);
  });

  useEffect(() => {
    const s = starsRef.current;
    if (!s) return;
    s.renderOrder = -1;
    const mat = s.material as THREE.PointsMaterial;
    if (mat) {
      // Let planets occlude stars (fixes "stars visible through bodies")
      mat.depthWrite = false; // don't write to depth buffer to avoid z-fighting
      mat.depthTest = true;   // DO test depth so stars sit "behind" bodies
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

function Scene({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
  const {
    running, dt, timeScale, integrator, trails, massScale, velScale,
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

  // Publish latest body positions to OrbitControls via the ref for O(1) lookup
  useEffect(() => {
    if (!controlsRef.current) return;
    const map = new Map<string, [number, number, number]>();
    for (const b of bodies) {
      // store a copy to avoid accidental mutation side-effects
      map.set(b.id, [b.position[0], b.position[1], b.position[2]]);
    }
    (controlsRef.current as any).__bodiesMap = map;
  }, [bodies, controlsRef]);

  const PLANET_SCALE = 8.5;
  const LABEL_Z_OFFSET = 0.20;

  return (
    <>
      <color attach="background" args={["#020409"]} />
      <StarBackground />

      {/* Bodies rendered via PlanetMesh + labels */}
      {bodies.map(b => {
        const bodyForView = { ...b, radius: b.radius * PLANET_SCALE };
        const fontSize =
          b.id === "sun" ? 0.06 :
          b.id === "jupiter" || b.id === "saturn" ? 0.08 :
          0.06;

        return (
          <Fragment key={b.id}>
            <PlanetMesh body={bodyForView} />
            <Billboard position={[
              b.position[0],
              b.position[1],
              b.position[2] + LABEL_Z_OFFSET
            ]}>
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
          </Fragment>
        );
      })}

      {/* Trails */}
      {useMemo(
        () =>
          bodies.map(b => {
            const arr = (trailsRef.current as Map<string, Float32Array>).get(b.id);
            if (!trails || !arr) return null;
            const desired = Math.max(0, Math.floor(trailLen[b.id] ?? 2000));
            if (desired === 0) return null;

            const idx = (trailIdxRef.current as Map<string, number>).get(b.id) ?? 0;
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

/** Forward-only smoothing of OrbitControls.target toward the focused body (no camera.position fiddling). */
function CameraFocusController({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
  const focusId = useSim(s => s.focusId);
  const focusLerp = useSim(s => s.focusLerp ?? 0.12);
  const maxStepPerSec = 2.5; // clamp how far the target can move per second

  // internal smoothed target, starts at current controls.target on first frame
  const smoothRef = useRef<THREE.Vector3 | null>(null);

  useFrame((_, dt) => {
    const controls = controlsRef.current;
    if (!controls) return;

    // init smooth target once to current orbit target
    if (!smoothRef.current) {
      smoothRef.current = controls.target.clone();
    }
    const smooth = smoothRef.current;

    // where we want to go (focused body or origin)
    const map = controls.__bodiesMap as Map<string, [number, number, number]> | undefined;
    const desired = new THREE.Vector3(0, 0, 0);
    if (focusId && map?.has(focusId)) {
      const p = map.get(focusId)!;
      desired.set(p[0], p[1], p[2]);
    }

    // forward-only step: clamp step length per frame to avoid overshoot/oscillation
    let delta: THREE.Vector3;
    if (smooth) {
      delta = desired.clone().sub(smooth);
      const dist = delta.length();
      if (dist > 0) {
        const maxStep = Math.max(0.00001, maxStepPerSec * dt);
        const step = Math.min(dist, maxStep);
        delta.multiplyScalar(step / dist);
        smooth.add(delta);
      }
    }

    // optional extra easing
    if (focusLerp > 0 && focusLerp < 1 && smooth) {
      // frame-rate friendly EMA; cap so it doesn't fight the clamp
      smooth.lerp(desired, Math.min(0.5, focusLerp * dt * 60));
    }

    // only update controls.target; let OrbitControls handle the camera with damping
    controls.target.copy(smooth);
    controls.update();
  });

  return null;
}

export default function OrbitCanvas() {
  // Camera settings and reset pulse
  const {
    camMinDist, camMaxDist, camZoomSpeed,
    camAutoRotate, camAutoRotateSpeed,
    camResetPulse,
  } = useSim();
  const controlsRef = useRef<any>(null);

  // Reset camera whenever the pulse increments
  useEffect(() => {
    controlsRef.current?.reset?.();
  }, [camResetPulse]);

  return (
    <Canvas
      camera={{ position: [0, 15, 28], near: 0.05, far: 1000 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        logarithmicDepthBuffer: true,
      }}
      // Prefer viewpoint selection via UI; if you still want click-to-clear, re-enable:
      // onPointerMissed={() => set({ focusId: null })}
    >
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableDamping
        dampingFactor={0.08}
        target={[0, 0, 0]}
        minDistance={camMinDist}
        maxDistance={camMaxDist}
        zoomSpeed={camZoomSpeed}
        autoRotate={camAutoRotate}
        autoRotateSpeed={camAutoRotateSpeed}
      />

      <CameraFocusController controlsRef={controlsRef} />
      <Scene controlsRef={controlsRef} />
    </Canvas>
  );
}
