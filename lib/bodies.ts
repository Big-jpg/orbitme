export type Body = {
  id: string;
  name: string;
  color: string;
  mass: number;      // solar masses
  position: [number, number, number]; // AU
  velocity: [number, number, number]; // AU/day
  radius: number;    // visual radius (not physical)
};

export const G = 0.00029591220828559104; // AU^3 / (Msun * day^2)
export const SOFTENING2 = 1e-6;

export const initialBodies: Body[] = [
  // Extremely simplified near-circular starting state in XY plane; z=0
  // Values tuned for a decent-looking demo; not ephemeris-accurate.
  // Visual radii are exaggerated for visibility
  { id: "sun", name: "Sun", color: "#f59e0b", mass: 1.0, position: [0,0,0], velocity: [0,0,0], radius: 0.5 },
  { id: "mercury", name: "Mercury", color: "#9ca3af", mass: 1.651e-7, position: [0.39,0,0], velocity: [0, 0.010, 0], radius: 0.08 },
  { id: "venus",   name: "Venus",   color: "#fbbf24", mass: 2.447e-6, position: [0.723,0,0], velocity: [0, 0.0074, 0], radius: 0.12 },
  { id: "earth",   name: "Earth",   color: "#60a5fa", mass: 3.003e-6, position: [1.0,0,0], velocity: [0, 0.006283, 0], radius: 0.13 },
  { id: "mars",    name: "Mars",    color: "#ef4444", mass: 3.213e-7, position: [1.524,0,0], velocity: [0, 0.0051,  0], radius: 0.09 },
  { id: "jupiter", name: "Jupiter", color: "#eab308", mass: 9.545e-4, position: [5.2,0,0], velocity: [0, 0.00275, 0], radius: 0.4 },
  { id: "saturn",  name: "Saturn",  color: "#fde047", mass: 2.858e-4, position: [9.58,0,0], velocity: [0, 0.00205, 0], radius: 0.35 },
  { id: "uranus",  name: "Uranus",  color: "#22d3ee", mass: 4.365e-5, position: [19.2,0,0], velocity: [0, 0.00145, 0], radius: 0.25 },
  { id: "neptune", name: "Neptune", color: "#3b82f6", mass: 5.148e-5, position: [30.05,0,0], velocity: [0, 0.00115, 0], radius: 0.24 }
];
