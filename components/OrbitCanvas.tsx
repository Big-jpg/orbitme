"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { Body, makeCircularBodies, ensureProbe } from "~/lib/bodies";
import { useSim } from "~/components/Controls";
import {
  seedCircularVelocities,
  zeroSystemMomentum,
  stepLeapfrog,
  stepRK4,
  type ExtraAccel
} from "~/lib/physics";

function Scene() {
  const {
    running, dt, timeScale, integrator, trails, massScale, velScale,
    brachistochrone, thrustAccel, resetSignal
  } = useSim();

  const [bodies, setBodies] = useState<Body[]>(() => {
    const init = makeCircularBodies();
    seedCircularVelocities(init, "sun", false);
    zeroSystemMomentum(init);
    return init;
  });

  // Brachistochrone autopilot state
  const probeState = useRef<{ phase: "accel" | "decel"; halfDist: number; armed: boolean }>({
    phase: "accel",
    halfDist: 0,
    armed: false
  });

  // trails
  const maxTrail = 4000;
  const trailsRef = useRef<Map<string, Float32Array>>(new Map());
  const trailIdxRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const reset = makeCircularBodies();
    seedCircularVelocities(reset, "sun", false);
    zeroSystemMomentum(reset);
    setBodies(reset);
    trailsRef.current = new Map();
    trailIdxRef.current = new Map();
    probeState.current = { phase: "accel", halfDist: 0, armed: false };
  }, [resetSignal]);

  useFrame(() => {
    if (!running) return;

    const next = bodies.map(b => ({
      ...b,
      position: [...b.position] as [number, number, number],
      velocity: [...b.velocity] as [number, number, number]
    }));

    // Build sparse per-body thrust (if any)
    let extra: ExtraAccel = undefined;

    if (brachistochrone) {
      const earthIndex = next.findIndex(b => b.id === "earth");
      const marsIndex  = next.findIndex(b => b.id === "mars");
      if (earthIndex >= 0 && marsIndex >= 0) {
        if (!probeState.current.armed) {
          ensureProbe(next, next[earthIndex].position, next[earthIndex].velocity);
          const d0 = Math.hypot(
            next[marsIndex].position[0] - next[earthIndex].position[0],
            next[marsIndex].position[1] - next[earthIndex].position[1],
            next[marsIndex].position[2] - next[earthIndex].position[2]
          );
          probeState.current = { phase: "accel", halfDist: d0 * 0.5, armed: true };
        }
        const probeIndex = next.findIndex(b => b.id === "probe");
        if (probeIndex >= 0) {
          const p = next[probeIndex];
          const m = next[marsIndex];

          const dx = m.position[0] - p.position[0];
          const dy = m.position[1] - p.position[1];
          const dz = m.position[2] - p.position[2];
          const dist = Math.hypot(dx, dy, dz) || 1;

          if (probeState.current.phase === "accel" && dist <= probeState.current.halfDist) {
            probeState.current.phase = "decel";
          }

          let ax = 0, ay = 0, az = 0;
          if (probeState.current.phase === "accel") {
            // Thrust toward Mars
            ax = (dx / dist) * thrustAccel;
            ay = (dy / dist) * thrustAccel;
            az = (dz / dist) * thrustAccel;
          } else {
            // Retro-thrust to brake
            const vmag = Math.hypot(p.velocity[0], p.velocity[1], p.velocity[2]) || 1;
            ax = -(p.velocity[0] / vmag) * thrustAccel;
            ay = -(p.velocity[1] / vmag) * thrustAccel;
            az = -(p.velocity[2] / vmag) * thrustAccel;
          }

          const arr: ( [number, number, number] | undefined )[] = new Array(next.length);
          arr[probeIndex] = [ax, ay, az];
          extra = arr;
        }
      }
    }

    // Step physics
    const safeDt = Math.min(dt, 0.25);
    const safeScale = Math.min(timeScale, 100);

    if (integrator === "rk4") {
      stepRK4(next, safeDt, safeScale, massScale, velScale, /*centralSunOnly*/ false, 0, extra);
    } else {
      stepLeapfrog(next, safeDt, safeScale, massScale, velScale, /*centralSunOnly*/ false, 0, extra);
    }

    setBodies(next);

    // Update trails (including probe)
    if (trails) {
      for (const b of next) {
        if (!trailsRef.current.has(b.id)) {
          trailsRef.current.set(b.id, new Float32Array(maxTrail * 3));
          trailIdxRef.current.set(b.id, 0);
        }
        const arr = trailsRef.current.get(b.id)!;
        let idx = trailIdxRef.current.get(b.id)!;
        arr[idx * 3 + 0] = b.position[0];
        arr[idx * 3 + 1] = b.position[1];
        arr[idx * 3 + 2] = b.position[2];
        idx = (idx + 1) % maxTrail;
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
            color={b.id === "probe" ? "#ff2d55" : b.color}
            emissive={b.id === "sun" ? b.color : undefined}
          />
        </mesh>
      ))}

      {/* Trails */}
      {useMemo(() => bodies.map(b => {
        if (!trails || !trailsRef.current.has(b.id)) return null;
        const arr = trailsRef.current.get(b.id)!;
        const idx = trailIdxRef.current.get(b.id)!;
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
            linewidth={b.id === "probe" ? 2 : 1}
            color={b.id === "probe" ? "#ff2d55" : b.color}
          />
        );
      }), [bodies, trails, resetSignal])}

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
