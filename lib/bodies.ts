// lib/bodies.ts

export type Body = {
  id: string;
  name: string;
  color: string;
  mass: number;                           // in solar masses
  position: [number, number, number];     // AU
  velocity: [number, number, number];     // AU/day
  radius: number;                         // *visual* radius (scene units)

  // Optional visuals
  texture?: {
    map?: string;
    normalMap?: string;
    roughnessMap?: string;
    emissiveMap?: string;
  };
  ring?: {
    inner: number;          // inner radius (scene units)
    outer: number;          // outer radius (scene units)
    map?: string;           // ring color texture
    alphaMap?: string;      // alpha (transparency) texture
    tiltDeg?: number;       // ring inclination (deg)
  };
  model?: {
    url: string;            // "/models/saturn.glb"
    scale?: number;
    yUp?: boolean;
  };
};

export const G = 0.00029591220828559104;       // AU^3 / (Msun * day^2)
export const SOFTENING2 = 1e-9;                 // (AU)^2 tiny Plummer softening

// ---- Visual/orbital config used to CREATE bodies (no position/velocity here) ----
type PlanetCfg = {
  id: string;
  name: string;
  color: string;
  mass: number;        // Msun
  a: number;           // semi-major axis in AU (we start them on +X at distance a)
  visRadius: number;   // visual sphere radius (scene units)
  texture?: Body["texture"];
  ring?: Body["ring"];
  model?: Body["model"];
};

// Circular, coplanar (i=0, e=0) “toy” orbits. a in AU, masses in Msun.
// NOTE: texture paths match your files under /public/tex/planets/
const PLANETS: PlanetCfg[] = [
  {
    id: "mercury", name: "Mercury", color: "#9ca3af",
    mass: 1.651e-7, a: 0.39, visRadius: 0.006,
    texture: { map: "/tex/planets/mercury.jpg" },
  },
  {
    id: "venus", name: "Venus", color: "#fbbf24",
    mass: 2.447e-6, a: 0.723, visRadius: 0.008,
    texture: { map: "/tex/planets/venus.jpg" },
    // Optional later: separate cloud layer using /tex/planets/venus_atmosphere.jpg
  },
  {
    id: "earth", name: "Earth", color: "#60a5fa",
    mass: 3.003e-6, a: 1.0, visRadius: 0.009,
    texture: { map: "/tex/planets/earth.jpg" },
  },
  {
    id: "mars", name: "Mars", color: "#ef4444",
    mass: 3.213e-7, a: 1.524, visRadius: 0.007,
    texture: { map: "/tex/planets/mars.jpg" },
  },
  {
    id: "jupiter", name: "Jupiter", color: "#eab308",
    mass: 9.545e-4, a: 5.204, visRadius: 0.020,
    texture: { map: "/tex/planets/jupiter.jpg" },
  },
  {
    id: "saturn", name: "Saturn", color: "#fde047",
    mass: 2.858e-4, a: 9.58, visRadius: 0.018,
    texture: { map: "/tex/planets/saturn.jpg" },
    ring: {
      inner: 0.025,                // tweak visually as you like
      outer: 0.045,
      map: "/tex/planets/saturn_ring.png",
      alphaMap: "/tex/planets/saturn_ring.png", // reuse same PNG for alpha
      tiltDeg: 27,
    },
  },
  {
    id: "uranus", name: "Uranus", color: "#22d3ee",
    mass: 4.365e-5, a: 19.2, visRadius: 0.016,
    texture: { map: "/tex/planets/uranus.jpg" },
  },
  {
    id: "neptune", name: "Neptune", color: "#3b82f6",
    mass: 5.148e-5, a: 30.05, visRadius: 0.016,
    texture: { map: "/tex/planets/neptune.jpg" },
  },
];

export function makeCircularBodies(): Body[] {
  const bodies: Body[] = [];

  // Sun (uses your sun.jpg for a diffuse look; emissive is still handled in material)
  bodies.push({
    id: "sun",
    name: "Sun",
    color: "#f59e0b",
    mass: 1.0,
    position: [0, 0, 0],
    velocity: [0, 0, 0],
    radius: 0.022,
    texture: { map: "/tex/planets/sun.jpg" },
  });

  // Planets
  for (const p of PLANETS) {
    const body: Body = {
      id: p.id,
      name: p.name,
      color: p.color,
      mass: p.mass,
      position: [p.a, 0, 0],  // start on +X axis
      velocity: [0, 0, 0],    // velocities will be seeded later
      radius: p.visRadius,
    };
    if (p.texture) body.texture = { ...p.texture };
    if (p.ring) body.ring = { ...p.ring };
    if (p.model) body.model = { ...p.model };
    bodies.push(body);
  }

  return bodies;
}

/** Optional: zero-mass payload helpers (safe to keep even if UI disabled) */
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
    mass: 0,
    position: startAt ? [...startAt] as [number,number,number] : [1,0,0],
    velocity: v0 ? [...v0] as [number,number,number] : [0,0,0],
    radius: 0.006,
  };
  if (i >= 0) bodies[i] = payload; else bodies.push(payload);
}

export function ensurePayloadGEO(bodies: Body[]) {
  const earth = bodies.find(b => b.id === "earth");
  if (!earth) return;
  const R_GEO_AU = 42164_000 / 1.495978707e11; // ≈ 2.818e-4 AU
  const pos: [number, number, number] = [earth.position[0], earth.position[1] + R_GEO_AU, earth.position[2]];
  const vCirc = Math.sqrt(G * earth.mass / R_GEO_AU); // AU/day
  const vel: [number, number, number] = [earth.velocity[0] + vCirc, earth.velocity[1], earth.velocity[2]];
  ensurePayload(bodies, pos, vel);
}
