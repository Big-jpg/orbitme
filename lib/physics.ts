import { Body, G, SOFTENING2 } from "~/lib/bodies";

export type SimSettings = {
  integrator: "symplectic-euler" | "rk4";
  timeScale: number; // multiplier on dt
  dt: number;        // days per tick before timescale
  massScale: number; // global mass multiplier
  velScale: number;  // global velocity multiplier
  running: boolean;
  trails: boolean;
};

export function cloneBodies(bodies: Body[]): Body[] {
  return bodies.map(b => ({ ...b, position: [...b.position] as any, velocity: [...b.velocity] as any }));
}

/**
 * Seed simple circular velocities in the ecliptic (XY) plane for all non-Sun bodies,
 * based on their current distance from the Sun. Good-enough starting conditions.
 */
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
    // Circular speed around Sun in chosen units (AU, days, Msun):
    const vmag = Math.sqrt(G * sun.mass / r);
    // Tangent in XY plane: k × r  where k = (0,0,1)  → (-ry, rx, 0)
    let tx = -ry, ty = rx, tz = 0;
    let tlen = Math.hypot(tx, ty, tz);
    if (tlen === 0) { // degenerate if r || k; fall back to i × r = (0, -rz, ry)
      tx = 0; ty = -rz; tz = ry; tlen = Math.hypot(tx, ty, tz);
    }
    tx /= tlen; ty /= tlen; tz /= tlen;
    const s = clockwise ? -1 : 1;
    b.velocity = [tx * vmag * s, ty * vmag * s, tz * vmag * s];
  }
}

function accelFor(bodies: Body[], i: number, massScale: number): [number, number, number] {
  const a: [number, number, number] = [0, 0, 0];
  const bi = bodies[i];
  for (let j = 0; j < bodies.length; j++) {
    if (i === j) continue;
    const bj = bodies[j];
    const dx = bj.position[0] - bi.position[0];
    const dy = bj.position[1] - bi.position[1];
    const dz = bj.position[2] - bi.position[2];
    const r2 = dx * dx + dy * dy + dz * dz + SOFTENING2;
    const invR3 = 1 / (Math.sqrt(r2) * r2);
    const s = G * bj.mass * massScale * invR3;
    a[0] += dx * s; a[1] += dy * s; a[2] += dz * s;
  }
  return a;
}

export function stepSymplecticEuler(bodies: Body[], dt: number, timeScale: number, massScale: number, velScale: number) {
  const h = dt * timeScale;
  const N = bodies.length;

  // Allocate accelerations
  const ax = new Array(N).fill(0);
  const ay = new Array(N).fill(0);
  const az = new Array(N).fill(0);

  // Pairwise forces (symmetric)
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = bodies[j].position[0] - bodies[i].position[0];
      const dy = bodies[j].position[1] - bodies[i].position[1];
      const dz = bodies[j].position[2] - bodies[i].position[2];

      const r2 = dx*dx + dy*dy + dz*dz + SOFTENING2;
      const invR3 = 1.0 / (Math.sqrt(r2) * r2);

      const f = G * invR3;

      const s1 = f * bodies[j].mass * massScale;
      const s2 = f * bodies[i].mass * massScale;

      ax[i] += dx * s1;
      ay[i] += dy * s1;
      az[i] += dz * s1;

      ax[j] -= dx * s2;
      ay[j] -= dy * s2;
      az[j] -= dz * s2;
    }
  }

  // Update velocities
  for (let i = 0; i < N; i++) {
    bodies[i].velocity[0] = (bodies[i].velocity[0] + ax[i] * h) * velScale;
    bodies[i].velocity[1] = (bodies[i].velocity[1] + ay[i] * h) * velScale;
    bodies[i].velocity[2] = (bodies[i].velocity[2] + az[i] * h) * velScale;
  }

  // Update positions
  for (let i = 0; i < N; i++) {
    bodies[i].position[0] += bodies[i].velocity[0] * h;
    bodies[i].position[1] += bodies[i].velocity[1] * h;
    bodies[i].position[2] += bodies[i].velocity[2] * h;
  }
}


export function stepRK4(
  bodies: Body[],
  dt: number,
  timeScale: number,
  massScale: number,
  velScale: number
) {
  const h = dt * timeScale;
  const N = bodies.length;

  // Copy state
  const x = bodies.map(b => [...b.position] as [number, number, number]);
  const v = bodies.map(b => [...b.velocity] as [number, number, number]);

  // Helper: compute accelerations for all bodies given positions
  function computeAccel(pos: [number, number, number][]): [number, number, number][] {
    const ax = Array(N).fill(0).map(() => [0, 0, 0] as [number, number, number]);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pos[j][0] - pos[i][0];
        const dy = pos[j][1] - pos[i][1];
        const dz = pos[j][2] - pos[i][2];
        const r2 = dx * dx + dy * dy + dz * dz + SOFTENING2;
        const invR3 = 1 / (Math.sqrt(r2) * r2);
        const f = G * invR3;

        const s1 = f * bodies[j].mass * massScale;
        const s2 = f * bodies[i].mass * massScale;

        ax[i][0] += dx * s1; ax[i][1] += dy * s1; ax[i][2] += dz * s1;
        ax[j][0] -= dx * s2; ax[j][1] -= dy * s2; ax[j][2] -= dz * s2;
      }
    }
    return ax;
  }

  // k1
  const a1 = computeAccel(x);

  // k2
  const x2 = x.map((xi, i) => [
    xi[0] + 0.5 * h * v[i][0],
    xi[1] + 0.5 * h * v[i][1],
    xi[2] + 0.5 * h * v[i][2],
  ] as [number, number, number]);
  const v2 = v.map((vi, i) => [
    vi[0] + 0.5 * h * a1[i][0],
    vi[1] + 0.5 * h * a1[i][1],
    vi[2] + 0.5 * h * a1[i][2],
  ] as [number, number, number]);
  const a2 = computeAccel(x2);

  // k3
  const x3 = x.map((xi, i) => [
    xi[0] + 0.5 * h * v2[i][0],
    xi[1] + 0.5 * h * v2[i][1],
    xi[2] + 0.5 * h * v2[i][2],
  ] as [number, number, number]);
  const v3 = v.map((vi, i) => [
    vi[0] + 0.5 * h * a2[i][0],
    vi[1] + 0.5 * h * a2[i][1],
    vi[2] + 0.5 * h * a2[i][2],
  ] as [number, number, number]);
  const a3 = computeAccel(x3);

  // k4
  const x4 = x.map((xi, i) => [
    xi[0] + h * v3[i][0],
    xi[1] + h * v3[i][1],
    xi[2] + h * v3[i][2],
  ] as [number, number, number]);
  const v4 = v.map((vi, i) => [
    vi[0] + h * a3[i][0],
    vi[1] + h * a3[i][1],
    vi[2] + h * a3[i][2],
  ] as [number, number, number]);
  const a4 = computeAccel(x4);

  // Combine RK4 increments
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

