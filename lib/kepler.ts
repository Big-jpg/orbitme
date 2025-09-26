// Placeholder: later we can compute analytic positions from orbital elements.
// For MVP, we'll just keep this file to wire a toggle in UI.
export type KeplerElements = {
  a: number;     // semi-major axis (AU)
  e: number;     // eccentricity
  i: number;     // inclination (rad)
  Omega: number; // RAAN (rad)
  w: number;     // argument of periapsis (rad)
  M0: number;    // mean anomaly at epoch (rad)
};
