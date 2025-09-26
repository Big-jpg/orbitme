"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { Body, makeCircularBodies, ensurePayloadGEO } from "~/lib/bodies";
import { useSim } from "~/components/Controls";
import {
  seedCircularVelocities,
  zeroSystemMomentum,
  stepLeapfrog,
  stepRK4,
  type ExtraAccel,
  M_PER_S_TO_AU_PER_DAY,
} from "~/lib/physics";

function Scene() {
  const {
    running, dt, timeScale, integrator, trails, massScale, velScale,
    payloadEnabled, dvMps, thrustPulse, payloadReset, resetSignal,
    trailLen,
  } = useSim();

  const [bodies, setBodies] = useState<Body[]>(() => {
    const init = makeCircularBodies();
    seedCircularVelocities(init, "sun", false);
    zeroSystemMomentum(init);
    return init;
  });

  // Each body’s Float32 buffer and current write index
  const trailsRef = useRef<Map<string, Float32Array>>(new Map());
  const trailIdxRef = useRef<Map<string, number>>(new Map());

  // Reset whole system
  useEffect(() => {
    const reset = makeCircularBodies();
    seedCircularVelocities(reset, "sun", false);
    zeroSystemMomentum(reset);
    setBodies(reset);
    trailsRef.current = new Map();
    trailIdxRef.current = new Map();
  }, [resetSignal]);

  // Spawn/reset payload into GEO
  useEffect(() => {
    if (!payloadEnabled) return;
    setBodies(prev => {
      const next = prev.map(b => ({
        ...b,
        position: [...b.position] as [number, number, number],
        velocity: [...b.velocity] as [number, number, number]
      }));
      ensurePayloadGEO(next);
      return next;
    });
  }, [payloadEnabled, payloadReset]);

  // One-shot Δv (instant burn) on payload (prograde)
  useEffect(() => {
    if (!payloadEnabled) return;
    setBodies(prev => {
      const next = prev.map(b => ({
        ...b,
        position: [...b.position] as [number, number, number],
        velocity: [...b.velocity] as [number, number, number]
      }));

      const i = next.findIndex(b => b.id === "payload");
      if (i >= 0) {
        const dv = dvMps * M_PER_S_TO_AU_PER_DAY;
        const v = next[i].velocity;
        const vmag = Math.hypot(v[0], v[1], v[2]) || 1;
        const u = [v[0] / vmag, v[1] / vmag, v[2] / vmag] as [number, number, number];
        next[i].velocity = [v[0] + u[0] * dv, v[1] + u[1] * dv, v[2] + u[2] * dv];
      } else {
        ensurePayloadGEO(next);
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thrustPulse]);

  // If a slider changed, reallocate a body’s trail buffer to the new length.
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
          trailsRef.current.set(b.id, new Float32Array(desired * 3));
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
      velocity: [...b.velocity] as [number, number, number]
    }));

    const extra: ExtraAccel = undefined;

    const safeDt = Math.min(dt, 0.25);
    const safeScale = Math.min(timeScale, 100);

    if (integrator === "rk4") {
      stepRK4(next, safeDt, safeScale, massScale, velScale, /*centralSunOnly*/ false, 0, extra);
    } else {
      stepLeapfrog(next, safeDt, safeScale, massScale, velScale, /*centralSunOnly*/ false, 0, extra);
    }

    setBodies(next);

    if (trails) {
      for (const b of next) {
        const desired = Math.max(0, Math.floor(trailLen[b.id] ?? 2000));
        if (desired === 0) continue;

        let arr = trailsRef.current.get(b.id);
        let idx = trailIdxRef.current.get(b.id) ?? 0;

        // Allocate on demand or when length mismatched (belt & suspenders)
        if (!arr || arr.length !== desired * 3) {
          arr = new Float32Array(desired * 3);
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

  return (
    <>
      {/* Ecliptic grid (XY plane) */}
      <gridHelper args={[80, 40, 0x333333, 0x222222]} position={[0,0,0]} rotation={[Math.PI/2,0,0]} />

      {/* Bodies */}
      {bodies.map(b => (
        <mesh key={b.id} position={b.position as any}>
          <sphereGeometry args={[b.radius, 24, 24]} />
          <meshStandardMaterial
            color={b.id === "payload" ? "#ff2d55" : b.color}
            emissive={b.id === "sun" ? b.color : undefined}
          />
        </mesh>
      ))}

      {/* Trails */}
      {useMemo(() => bodies.map(b => {
        const arr = trailsRef.current.get(b.id);
        if (!trails || !arr) return null;

        // Rebuild ordered vertices so the line is continuous
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
            linewidth={b.id === "payload" ? 2 : 1}
            color={b.id === "payload" ? "#ff2d55" : b.color}
          />
        );
      }), [bodies, trails, trailLen, resetSignal, payloadReset, thrustPulse])}

      <ambientLight intensity={0.6} />
      <pointLight position={[0,0,0]} intensity={2} />
    </>
  );
}

export default function OrbitCanvas() {
  return (
    <Canvas camera={{ position: [0, 40, 60], near: 0.1, far: 1000 }}>
      <OrbitControls enablePan enableDamping />
      <Scene />
    </Canvas>
  );
}
