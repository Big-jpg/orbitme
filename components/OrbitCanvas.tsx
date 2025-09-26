import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { initialBodies, Body } from "~/lib/bodies";
import { useSim } from "~/components/Controls";
import { stepSymplecticEuler, stepRK4 } from "~/lib/physics";
import * as THREE from "three";

function Scene() {
  const { running, dt, timeScale, integrator, trails, massScale, velScale, resetSignal } = useSim();
  const [bodies, setBodies] = useState<Body[]>(() => initialBodies.map(b => ({ ...b, position: [...b.position], velocity: [...b.velocity] })));

  // trails
  const maxTrail = 2000;
  const trailsRef = useRef<Map<string, Float32Array>>(new Map());
  const trailIdxRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    // Reset bodies & trails
    setBodies(initialBodies.map(b => ({ ...b, position: [...b.position], velocity: [...b.velocity] })));
    trailsRef.current = new Map();
    trailIdxRef.current = new Map();
  }, [resetSignal]);

  useFrame(() => {
    if (!running) return;

    // Step physics
    const next = bodies.map(b => ({ ...b, position: [...b.position] as any, velocity: [...b.velocity] as any }));
    if (integrator === "rk4") {
      stepRK4(next, dt, timeScale, massScale, velScale);
    } else {
      stepSymplecticEuler(next, dt, timeScale, massScale, velScale);
    }
    setBodies(next);

    // Update trails
    if (trails) {
      for (const b of next) {
        if (!trailsRef.current.has(b.id)) {
          trailsRef.current.set(b.id, new Float32Array(maxTrail * 3));
          trailIdxRef.current.set(b.id, 0);
        }
        const arr = trailsRef.current.get(b.id)!;
        let idx = trailIdxRef.current.get(b.id)!;
        arr[idx*3+0] = b.position[0];
        arr[idx*3+1] = b.position[1];
        arr[idx*3+2] = b.position[2];
        idx = (idx + 1) % maxTrail;
        trailIdxRef.current.set(b.id, idx);
      }
    }
  });

  return (
    <>
      {/* Orbital plane grid */}
      <gridHelper args={[80, 40, 0x333333, 0x222222]} position={[0,0,0]} />

      {/* Bodies */}
      {bodies.map(b => (
        <mesh key={b.id} position={b.position as any}>
          <sphereGeometry args={[b.radius, 24, 24]} />
          <meshStandardMaterial color={b.color} emissive={b.id === "sun" ? b.color : undefined} />
        </mesh>
      ))}

      {/* Trails */}
      {useMemo(() => bodies.map(b => {
        if (!trails || !trailsRef.current.has(b.id)) return null;
        const arr = trailsRef.current.get(b.id)!;
        // Build ordered vertices starting at current index to form continuous loop
        const idx = trailIdxRef.current.get(b.id)!;
        const ordered = new Float32Array(arr.length);
        ordered.set(arr.slice(idx*3));
        ordered.set(arr.slice(0, idx*3), arr.length - idx*3);
        const pts: [number, number, number][] = [];
        for (let i=0; i<ordered.length; i+=3) {
          pts.push([ordered[i], ordered[i+1], ordered[i+2]]);
        }
        return <Line key={`trail-${b.id}`} points={pts} linewidth={1} color={b.color} />;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      }), [bodies, trails, resetSignal])}

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 0, 0]} intensity={2} />
    </>
  );
}

export default function OrbitCanvas() {
  // Scale: 1 unit = 1 AU. Camera distance suitable for outer planets.
  return (
    <Canvas camera={{ position: [0, 40, 60], near: 0.1, far: 1000 }}>
      <OrbitControls enablePan={true} enableDamping />
      <Scene />
    </Canvas>
  );
}
