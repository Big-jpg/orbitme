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
  // v_{t+1} = v_t + a(x_t)*h ; x_{t+1} = x_t + v_{t+1}*h
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const a = accelFor(bodies, i, massScale);
    b.velocity[0] += a[0] * h;
    b.velocity[1] += a[1] * h;
    b.velocity[2] += a[2] * h;
    // velocity scaling knob
    b.velocity[0] *= velScale;
    b.velocity[1] *= velScale;
    b.velocity[2] *= velScale;
  }
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    b.position[0] += bodies[i].velocity[0] * h;
    b.position[1] += bodies[i].velocity[1] * h;
    b.position[2] += bodies[i].velocity[2] * h;
  }
}

export function stepRK4(bodies: Body[], dt: number, timeScale: number, massScale: number, velScale: number) {
  // Classical RK4 on state (x,v). For simplicity, treat velocity scaling as a post-step damping.
  const h = dt * timeScale;

  const N = bodies.length;
  const x0 = bodies.map(b => [...b.position] as [number, number, number]);
  const v0 = bodies.map(b => [...b.velocity] as [number, number, number]);

  const a = (x: [number, number, number][]) => {
    // temporarily assign positions to bodies to reuse accelFor
    for (let i = 0; i < N; i++) bodies[i].position = [...x[i]];
    return Array.from({ length: N }, (_, i) => accelFor(bodies, i, massScale));
  };

  const add = (A: [number, number, number][], B: [number, number, number][], s: number) =>
    A.map((v, i) => [v[0] + B[i][0] * s, v[1] + B[i][1] * s, v[2] + B[i][2] * s] as [number, number, number]);

  const k1x = v0;
  const k1v = a(x0);

  const k2x = add(v0, k1v, h / 2);
  const k2v = a(add(x0, k1x, h / 2));

  const k3x = add(v0, k2v, h / 2);
  const k3v = a(add(x0, k2x, h / 2));

  const k4x = add(v0, k3v, h);
  const k4v = a(add(x0, k3x, h));

  for (let i = 0; i < N; i++) {
    const xi = x0[i];
    const vi = v0[i];
    const dx = [
      (k1x[i][0] + 2 * k2x[i][0] + 2 * k3x[i][0] + k4x[i][0]) * (h / 6),
      (k1x[i][1] + 2 * k2x[i][1] + 2 * k3x[i][1] + k4x[i][1]) * (h / 6),
      (k1x[i][2] + 2 * k2x[i][2] + 2 * k3x[i][2] + k4x[i][2]) * (h / 6)
    ] as [number, number, number];

    const dv = [
      (k1v[i][0] + 2 * k2v[i][0] + 2 * k3v[i][0] + k4v[i][0]) * (h / 6),
      (k1v[i][1] + 2 * k2v[i][1] + 2 * k3v[i][1] + k4v[i][1]) * (h / 6),
      (k1v[i][2] + 2 * k2v[i][2] + 2 * k3v[i][2] + k4v[i][2]) * (h / 6)
    ] as [number, number, number];

    bodies[i].position = [xi[0] + dx[0], xi[1] + dx[1], xi[2] + dx[2]];
    bodies[i].velocity = [vi[0] + dv[0], vi[1] + dv[1], vi[2] + dv[2]];
    bodies[i].velocity = [
      bodies[i].velocity[0] * velScale,
      bodies[i].velocity[1] * velScale,
      bodies[i].velocity[2] * velScale
    ];
  }
}
