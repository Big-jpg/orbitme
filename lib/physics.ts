import { Body, G, SOFTENING2 } from "~/lib/bodies";

export type SimSettings = {
  integrator: "leapfrog" | "rk4";
  timeScale: number; // multiplier on dt
  dt: number;        // days per tick before timescale
  massScale: number; // global mass multiplier
  velScale: number;  // global velocity multiplier (keep ~1.0 for physical runs)
  running: boolean;
  trails: boolean;
};

// Handy: deep clone of position/velocity arrays
export function cloneBodies(bodies: Body[]): Body[] {
  return bodies.map(b => ({ ...b, position: [...b.position] as any, velocity: [...b.velocity] as any }));
}

/**
 * Seed simple circular velocities in the ecliptic (XY) plane around the Sun.
 * This is a convenience used by setup/reset code.
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
    const vmag = Math.sqrt(G * sun.mass / r); // in AU/day
    // tangent in XY plane (k × r)
    let tx = -ry, ty = rx, tz = 0;
    let tlen = Math.hypot(tx, ty, tz);
    if (tlen === 0) { tx = 0; ty = -rz; tz = ry; tlen = Math.hypot(tx, ty, tz); }
    tx /= tlen; ty /= tlen; tz /= tlen;
    const s = clockwise ? -1 : 1;
    b.velocity = [tx * vmag * s, ty * vmag * s, tz * vmag * s];
  }
}

/** Zero out linear momentum of whole system (recenters barycenter’s velocity). */
export function zeroSystemMomentum(bodies: Body[]) {
  let px = 0, py = 0, pz = 0, msum = 0;
  for (const b of bodies) { px += b.velocity[0] * b.mass; py += b.velocity[1] * b.mass; pz += b.velocity[2] * b.mass; msum += b.mass; }
  if (msum === 0) return;
  const vx = px / msum, vy = py / msum, vz = pz / msum;
  for (const b of bodies) { b.velocity[0] -= vx; b.velocity[1] -= vy; b.velocity[2] -= vz; }
}

/** Optional extra accelerations hook (e.g., thrust). */
export type ExtraAccel = ((bodies: Body[]) => ([number, number, number][])) | undefined;

/** Compute accelerations for all bodies (O(N^2)). */
function computeAccelerations(
  bodies: Body[],
  massScale: number
): [Float64Array, Float64Array, Float64Array] {
  const N = bodies.length;
  const ax = new Float64Array(N);
  const ay = new Float64Array(N);
  const az = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      const dx = bodies[j].position[0] - bodies[i].position[0];
      const dy = bodies[j].position[1] - bodies[i].position[1];
      const dz = bodies[j].position[2] - bodies[i].position[2];

      const r2 = dx*dx + dy*dy + dz*dz + SOFTENING2;
      const invR = 1.0 / Math.sqrt(r2);
      const invR3 = invR / r2;

      // acceleration magnitude factor
      const f = G * invR3;
      const s1 = f * bodies[j].mass * massScale;
      const s2 = f * bodies[i].mass * massScale;

      ax[i] += dx * s1; ay[i] += dy * s1; az[i] += dz * s1;
      ax[j] -= dx * s2; ay[j] -= dy * s2; az[j] -= dz * s2;
    }
  }
  return [ax, ay, az];
}

/**
 * Velocity–Verlet (leapfrog) with automatic substepping.
 * - Stable and time-reversible for conservative forces.
 * - Substeps ensure each micro-step stays below hMax (default 0.05 day).
 *
 * Notes on velScale:
 *   For physically meaningful runs keep velScale ~ 1.0. If you do change it,
 *   we treat it as stretching the DRIFT only (x update), not the KICK (v update),
 *   which is less destabilizing than scaling both.
 */
export function stepLeapfrog(
  bodies: Body[],
  dt: number,
  timeScale: number,
  massScale: number,
  velScale: number,
  _centralSunOnly = false,
  _sunIndex = 0,
  extra?: ExtraAccel,
  hMax = 0.05  // max substep in days  (~1.2 hours)
) {
  let H = Math.max(0, dt * timeScale);      // total step for this frame (days)
  if (H === 0) return;

  // number of substeps to keep each micro-step ≤ hMax
  const n = Math.max(1, Math.ceil(H / hMax));
  const h = H / n;
  const driftH = h * Math.max(0.0001, velScale); // only affect the drift

  for (let s = 0; s < n; s++) {
    // a(t)
    const [ax, ay, az] = computeAccelerations(bodies, massScale);
    // External/extra accelerations if provided
    if (extra) {
      const add = extra(bodies);
      for (let i = 0; i < bodies.length; i++) {
        ax[i] += add[i][0];
        ay[i] += add[i][1];
        az[i] += add[i][2];
      }
    }

    // KICK (half): v(t+½h) = v(t) + a(t)*½h
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].velocity[0] += ax[i] * (0.5 * h);
      bodies[i].velocity[1] += ay[i] * (0.5 * h);
      bodies[i].velocity[2] += az[i] * (0.5 * h);
    }

    // DRIFT: x(t+h) = x(t) + v(t+½h)*h   (apply velScale only to drift)
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].position[0] += bodies[i].velocity[0] * driftH;
      bodies[i].position[1] += bodies[i].velocity[1] * driftH;
      bodies[i].position[2] += bodies[i].velocity[2] * driftH;
    }

    // a(t+h)
    const [ax2, ay2, az2] = computeAccelerations(bodies, massScale);
    if (extra) {
      const add2 = extra(bodies);
      for (let i = 0; i < bodies.length; i++) {
        ax2[i] += add2[i][0];
        ay2[i] += add2[i][1];
        az2[i] += add2[i][2];
      }
    }

    // KICK (half): v(t+h) = v(t+½h) + a(t+h)*½h
    for (let i = 0; i < bodies.length; i++) {
      bodies[i].velocity[0] += ax2[i] * (0.5 * h);
      bodies[i].velocity[1] += ay2[i] * (0.5 * h);
      bodies[i].velocity[2] += az2[i] * (0.5 * h);
    }
  }
}

/** Classic RK4 with the same substep guard for parity/testing. */
export function stepRK4(
  bodies: Body[],
  dt: number,
  timeScale: number,
  massScale: number,
  velScale: number,
  _centralSunOnly = false,
  _sunIndex = 0,
  extra?: ExtraAccel,
  hMax = 0.05
) {
  let H = Math.max(0, dt * timeScale);
  if (H === 0) return;
  const n = Math.max(1, Math.ceil(H / hMax));
  const h = H / n;
  const driftH = h * Math.max(0.0001, velScale);

  const N = bodies.length;

  function accelAt(pos: number[][]): [number, number, number][] {
    const ax = Array(N).fill(0).map(() => [0,0,0] as [number,number,number]);
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pos[j][0] - pos[i][0];
        const dy = pos[j][1] - pos[i][1];
        const dz = pos[j][2] - pos[i][2];
        const r2 = dx*dx + dy*dy + dz*dz + SOFTENING2;
        const invR = 1/Math.sqrt(r2);
        const invR3 = invR / r2;
        const f = G * invR3;
        const s1 = f * bodies[j].mass * massScale;
        const s2 = f * bodies[i].mass * massScale;
        ax[i][0] += dx*s1; ax[i][1] += dy*s1; ax[i][2] += dz*s1;
        ax[j][0] -= dx*s2; ax[j][1] -= dy*s2; ax[j][2] -= dz*s2;
      }
    }
    if (extra) {
      const add = extra(bodies);
      for (let i = 0; i < N; i++) {
        ax[i][0] += add[i][0]; ax[i][1] += add[i][1]; ax[i][2] += add[i][2];
      }
    }
    return ax;
  }

  for (let s = 0; s < n; s++) {
    const x = bodies.map(b => [...b.position] as [number,number,number]);
    const v = bodies.map(b => [...b.velocity] as [number,number,number]);

    const a1 = accelAt(x);

    const x2 = x.map((xi,i)=>[xi[0]+0.5*driftH*v[i][0], xi[1]+0.5*driftH*v[i][1], xi[2]+0.5*driftH*v[i][2]]);
    const v2 = v.map((vi,i)=>[vi[0]+0.5*h*a1[i][0], vi[1]+0.5*h*a1[i][1], vi[2]+0.5*h*a1[i][2]]);
    const a2 = accelAt(x2);

    const x3 = x.map((xi,i)=>[xi[0]+0.5*driftH*v2[i][0], xi[1]+0.5*driftH*v2[i][1], xi[2]+0.5*driftH*v2[i][2]]);
    const v3 = v.map((vi,i)=>[vi[0]+0.5*h*a2[i][0], vi[1]+0.5*h*a2[i][1], vi[2]+0.5*h*a2[i][2]]);
    const a3 = accelAt(x3);

    const x4 = x.map((xi,i)=>[xi[0]+driftH*v3[i][0], xi[1]+driftH*v3[i][1], xi[2]+driftH*v3[i][2]]);
    const v4 = v.map((vi,i)=>[vi[0]+h*a3[i][0], vi[1]+h*a3[i][1], vi[2]+h*a3[i][2]]);
    const a4 = accelAt(x4);

    for (let i = 0; i < N; i++) {
      bodies[i].position = [
        x[i][0] + (driftH/6) * (v[i][0] + 2*v2[i][0] + 2*v3[i][0] + v4[i][0]),
        x[i][1] + (driftH/6) * (v[i][1] + 2*v2[i][1] + 2*v3[i][1] + v4[i][1]),
        x[i][2] + (driftH/6) * (v[i][2] + 2*v2[i][2] + 2*v3[i][2] + v4[i][2]),
      ];
      bodies[i].velocity = [
        v[i][0] + (h/6) * (a1[i][0] + 2*a2[i][0] + 2*a3[i][0] + a4[i][0]),
        v[i][1] + (h/6) * (a1[i][1] + 2*a2[i][1] + 2*a3[i][1] + a4[i][1]),
        v[i][2] + (h/6) * (a1[i][2] + 2*a2[i][2] + 2*a3[i][2] + a4[i][2]),
      ];
    }
  }
}

/** Unit helper if you want to convert DV sliders, etc. */
export const M_PER_S_TO_AU_PER_DAY = 1 / (149597870700 /* m/AU */) * (86400 /* s/day */);
