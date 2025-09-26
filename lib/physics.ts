// lib/physics.ts
import { Body, G, SOFTENING2 } from "~/lib/bodies";

export type SimSettings = {
  integrator: "leapfrog" | "rk4";
  timeScale: number; // multiplier on dt
  dt: number;        // days per tick before timescale
  massScale: number; // global mass multiplier
  velScale: number;  // global velocity multiplier
  running: boolean;
  trails: boolean;
};

export function cloneBodies(bodies: Body[]): Body[] {
  return bodies.map(b => ({
    ...b,
    position: [...b.position] as [number, number, number],
    velocity: [...b.velocity] as [number, number, number],
  }));
}

export function zeroSystemMomentum(bodies: Body[]): void {
  let mSum = 0, vx = 0, vy = 0, vz = 0;
  for (const b of bodies) {
    mSum += b.mass;
    vx += b.mass * b.velocity[0];
    vy += b.mass * b.velocity[1];
    vz += b.mass * b.velocity[2];
  }
  if (mSum === 0) return;
  vx /= mSum; vy /= mSum; vz /= mSum;
  for (const b of bodies) {
    b.velocity = [b.velocity[0] - vx, b.velocity[1] - vy, b.velocity[2] - vz];
  }
}

/** Seed circular tangential velocities (XY plane) around the Sun. */
export function seedCircularVelocities(bodies: Body[], sunId = "sun", clockwise = false): void {
  const sun = bodies.find(b => b.id === sunId);
  if (!sun) return;
  for (const b of bodies) {
    if (b === sun) continue;
    const rx = b.position[0] - sun.position[0];
    const ry = b.position[1] - sun.position[1];
    const rz = b.position[2] - sun.position[2];
    const r = Math.hypot(rx, ry, rz);
    if (r === 0) continue;
    const vmag = Math.sqrt(G * sun.mass / r); // circular vis-viva (sun-dominant)
    let tx = -ry, ty = rx, tz = 0;            // tangent in XY: k × r
    const tlen = Math.hypot(tx, ty, tz) || 1;
    tx /= tlen; ty /= tlen; tz /= tlen;
    const s = clockwise ? -1 : 1;
    b.velocity = [tx * vmag * s, ty * vmag * s, tz * vmag * s];
  }
}

function accumulateAccelerations(
  bodies: Body[],
  massScale: number,
  centralSunOnly = true,   // default to Sun-only for rock-solid circular starts
  sunIndex = 0
) {
  const N = bodies.length;
  const ax = new Array(N).fill(0);
  const ay = new Array(N).fill(0);
  const az = new Array(N).fill(0);

  if (centralSunOnly) {
    const s = sunIndex;
    for (let i = 0; i < N; i++) {
      if (i === s) continue;
      const dx = bodies[s].position[0] - bodies[i].position[0];
      const dy = bodies[s].position[1] - bodies[i].position[1];
      const dz = bodies[s].position[2] - bodies[i].position[2];
      const r2 = dx*dx + dy*dy + dz*dz + SOFTENING2;
      const invR3 = 1 / (Math.sqrt(r2) * r2);
      const s1 = G * bodies[s].mass * massScale * invR3;
      ax[i] += dx * s1; ay[i] += dy * s1; az[i] += dz * s1;
    }
    return { ax, ay, az };
  }

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = bodies[j].position[0] - bodies[i].position[0];
      const dy = bodies[j].position[1] - bodies[i].position[1];
      const dz = bodies[j].position[2] - bodies[i].position[2];
      const r2 = dx*dx + dy*dy + dz*dz + SOFTENING2;
      const invR3 = 1 / (Math.sqrt(r2) * r2);
      const f = G * invR3;
      const s1 = f * bodies[j].mass * massScale;
      const s2 = f * bodies[i].mass * massScale;
      ax[i] += dx * s1; ay[i] += dy * s1; az[i] += dz * s1;
      ax[j] -= dx * s2; ay[j] -= dy * s2; az[j] -= dz * s2;
    }
  }
  return { ax, ay, az };
}

/** Leapfrog (kick-drift-kick) — excellent energy behavior for orbital motion. */
export function stepLeapfrog(
  bodies: Body[],
  dt: number,
  timeScale: number,
  massScale: number,
  velScale: number,
  centralSunOnly = true,
  sunIndex = 0
) {
  const h = dt * timeScale;
  const N = bodies.length;

  // Kick #1 (half step)
  const { ax, ay, az } = accumulateAccelerations(bodies, massScale, centralSunOnly, sunIndex);
  for (let i = 0; i < N; i++) {
    bodies[i].velocity[0] += ax[i] * (h * 0.5);
    bodies[i].velocity[1] += ay[i] * (h * 0.5);
    bodies[i].velocity[2] += az[i] * (h * 0.5);
  }

  // Drift (full step)
  for (let i = 0; i < N; i++) {
    bodies[i].position[0] += bodies[i].velocity[0] * h;
    bodies[i].position[1] += bodies[i].velocity[1] * h;
    bodies[i].position[2] += bodies[i].velocity[2] * h;
  }

  // Kick #2 (half step) using accelerations at new positions
  const { ax: ax2, ay: ay2, az: az2 } = accumulateAccelerations(bodies, massScale, centralSunOnly, sunIndex);
  for (let i = 0; i < N; i++) {
    bodies[i].velocity[0] = (bodies[i].velocity[0] + ax2[i] * (h * 0.5)) * velScale;
    bodies[i].velocity[1] = (bodies[i].velocity[1] + ay2[i] * (h * 0.5)) * velScale;
    bodies[i].velocity[2] = (bodies[i].velocity[2] + az2[i] * (h * 0.5)) * velScale;
  }
}

/** Symmetric RK4 (kept for comparison / when you disable Sun-only). */
export function stepRK4(
  bodies: Body[],
  dt: number,
  timeScale: number,
  massScale: number,
  velScale: number,
  centralSunOnly = false,
  sunIndex = 0
) {
  const h = dt * timeScale;
  const N = bodies.length;

  const x = bodies.map(b => [...b.position] as [number, number, number]);
  const v = bodies.map(b => [...b.velocity] as [number, number, number]);

  function computeAccel(pos: [number, number, number][]): [number, number, number][] {
    for (let i = 0; i < N; i++) bodies[i].position = [pos[i][0], pos[i][1], pos[i][2]];
    const { ax, ay, az } = accumulateAccelerations(bodies, massScale, centralSunOnly, sunIndex);
    return ax.map((_, i) => [ax[i], ay[i], az[i]] as [number, number, number]);
  }

  const a1 = computeAccel(x);

  const x2 = x.map((xi, i) => [xi[0] + 0.5 * h * v[i][0], xi[1] + 0.5 * h * v[i][1], xi[2] + 0.5 * h * v[i][2]] as [number, number, number]);
  const v2 = v.map((vi, i) => [vi[0] + 0.5 * h * a1[i][0], vi[1] + 0.5 * h * a1[i][1], vi[2] + 0.5 * h * a1[i][2]] as [number, number, number]);
  const a2 = computeAccel(x2);

  const x3 = x.map((xi, i) => [xi[0] + 0.5 * h * v2[i][0], xi[1] + 0.5 * h * v2[i][1], xi[2] + 0.5 * h * v2[i][2]] as [number, number, number]);
  const v3 = v.map((vi, i) => [vi[0] + 0.5 * h * a2[i][0], vi[1] + 0.5 * h * a2[i][1], vi[2] + 0.5 * h * a2[i][2]] as [number, number, number]);
  const a3 = computeAccel(x3);

  const x4 = x.map((xi, i) => [xi[0] + h * v3[i][0], xi[1] + h * v3[i][1], xi[2] + h * v3[i][2]] as [number, number, number]);
  const v4 = v.map((vi, i) => [vi[0] + h * a3[i][0], vi[1] + h * a3[i][1], vi[2] + h * a3[i][2]] as [number, number, number]);
  const a4 = computeAccel(x4);

  for (let i = 0; i < N; i++) {
    bodies[i].position = [
      x[i][0] + (h / 6) * (v[i][0] + 2 * v2[i][0] + 2 * v3[i][0] + v4[i][0]),
      x[i][1] + (h / 6) * (v[i][1] + 2 * v2[i][1] + 2 * v3[i][1] + v4[i][1]),
      x[i][2] + (h / 6) * (v[i][2] + 2 * v2[i][2] + 2 * v3[i][2] + v4[i][2]),
    ];
    bodies[i].velocity = [
      v[i][0] + (h / 6) * (a1[i][0] + 2 * a2[i][0] + 2 * a3[i][0] + a4[i][0]),
      v[i][1] + (h / 6) * (a1[i][1] + 2 * a2[i][1] + 2 * a3[i][1] + a4[i][1]),
      v[i][2] + (h / 6) * (a1[i][2] + 2 * a2[i][2] + 2 * a3[i][2] + a4[i][2]),
    ].map(c => c * velScale) as [number, number, number];
  }
}
