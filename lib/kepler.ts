// lib/kepler.ts
export type KeplerElements = {
  a: number;     // semi-major axis (AU)
  e: number;     // eccentricity [0..1)
  i: number;     // inclination (rad)
  Omega: number; // RAAN (rad)
  w: number;     // argument of periapsis (rad)
};

function rotZ(v: [number,number,number], a: number): [number,number,number] {
  const [x,y,z] = v; const c = Math.cos(a), s = Math.sin(a);
  return [c*x - s*y, s*x + c*y, z];
}
function rotX(v: [number,number,number], a: number): [number,number,number] {
  const [x,y,z] = v; const c = Math.cos(a), s = Math.sin(a);
  return [x, c*y - s*z, s*y + c*z];
}

/** Return 3D points of an orbit ellipse in inertial frame centered on the parent. */
export function ellipsePoints(el: KeplerElements, samples = 512): [number,number,number][] {
  const { a, e, i, Omega, w } = el;
  const b = a * Math.sqrt(1 - e*e);

  // Build ellipse in its orbital plane (periapsis on +x)
  const pts: [number,number,number][] = [];
  for (let k = 0; k < samples; k++) {
    const theta = (k / samples) * Math.PI * 2;
    const r = (a*(1 - e*e)) / (1 + e*Math.cos(theta)); // polar form
    let p: [number,number,number] = [r*Math.cos(theta), r*Math.sin(theta), 0];

    // Rotate by argument of periapsis, inclination, RAAN:  Rz(Ω) * Rx(i) * Rz(ω) * p
    p = rotZ(p, w);
    p = rotX(p, i);
    p = rotZ(p, Omega);

    pts.push(p);
  }
  return pts;
}
