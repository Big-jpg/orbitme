export type Body = {
  id: string;
  name: string;
  color: string;
  mass: number;                                // solar masses
  position: [number, number, number];          // AU
  velocity: [number, number, number];          // AU/day
  radius: number;                              // visual only
};

export const G = 0.00029591220828559104;       // AU^3 / (Msun * day^2)
// Slightly larger softening for extra stability at high dt
export const SOFTENING2 = 1e-5;

type PlanetCfg = {
  id: string; name: string; color: string; mass: number; a: number; visRadius: number;
};

// Circular, coplanar (i=0, e=0) “toy” orbits. a in AU, masses in Msun.
const PLANETS: PlanetCfg[] = [
  { id: "mercury", name: "Mercury", color: "#9ca3af", mass: 1.651e-7, a: 0.39,  visRadius: 0.006 },
  { id: "venus",   name: "Venus",   color: "#fbbf24", mass: 2.447e-6, a: 0.723, visRadius: 0.008 },
  { id: "earth",   name: "Earth",   color: "#60a5fa", mass: 3.003e-6, a: 1.0,   visRadius: 0.009 },
  { id: "mars",    name: "Mars",    color: "#ef4444", mass: 3.213e-7, a: 1.524, visRadius: 0.007 },
  { id: "jupiter", name: "Jupiter", color: "#eab308", mass: 9.545e-4, a: 5.204, visRadius: 0.020 },
  { id: "saturn",  name: "Saturn",  color: "#fde047", mass: 2.858e-4, a: 9.58,  visRadius: 0.018 },
  { id: "uranus",  name: "Uranus",  color: "#22d3ee", mass: 4.365e-5, a: 19.2,  visRadius: 0.016 },
  { id: "neptune", name: "Neptune", color: "#3b82f6", mass: 5.148e-5, a: 30.05, visRadius: 0.016 },
];

export function makeCircularBodies(): Body[] {
  const bodies: Body[] = [];
  bodies.push({
    id: "sun",
    name: "Sun",
    color: "#f59e0b",
    mass: 1.0,
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    radius: 0.022
  });

  for (const p of PLANETS) {
    bodies.push({
      id: p.id,
      name: p.name,
      color: p.color,
      mass: p.mass,
      position: [p.a, 0, 0],           // start on +X axis
      velocity: [0, 0, 0],             // velocities will be seeded
      radius: p.visRadius
    });
  }
  return bodies;
}

/** Create/replace a zero-mass payload (test particle). */
export function ensurePayload(
  bodies: Body[],
  startAt?: [number, number, number],
  v0?: [number, number, number]
) {
  const i = bodies.findIndex(b => b.id === "payload");
  const payload: Body = {
    id: "payload",
    name: "Payload",
    color: "#ff2d55",
    mass: 0, // test particle; no gravity on others
    position: startAt ? [...startAt] as [number,number,number] : [1,0,0],
    velocity: v0 ? [...v0] as [number,number,number] : [0,0,0],
    radius: 0.006
  };
  if (i >= 0) bodies[i] = payload; else bodies.push(payload);
}

/** Spawn/respawn payload into circular GEO around Earth (prograde, XY plane). */
export function ensurePayloadGEO(bodies: Body[]) {
  const earth = bodies.find(b => b.id === "earth");
  if (!earth) return;
  const R_GEO_AU = 42164_000 / 1.495978707e11; // ≈ 2.818e-4 AU
  // Place +Y from Earth; tangential prograde along +X (relative frame)
  const pos: [number, number, number] = [
    earth.position[0] + 0,
    earth.position[1] + R_GEO_AU,
    earth.position[2] + 0,
  ];
  const vCirc = Math.sqrt(G * earth.mass / R_GEO_AU); // AU/day
  const vel: [number, number, number] = [
    earth.velocity[0] + vCirc,
    earth.velocity[1] + 0,
    earth.velocity[2] + 0,
  ];
  ensurePayload(bodies, pos, vel);
}
