"use client";
import { create } from "zustand";

type Store = {
  running: boolean;
  dt: number;
  timeScale: number;
  integrator: "leapfrog" | "rk4";
  trails: boolean;
  massScale: number;
  velScale: number;

  // Brachistochrone controls
  brachistochrone: boolean;
  thrustAccel: number; // AU/day^2

  resetSignal: number;

  set: (p: Partial<Store>) => void;
  pokeReset: () => void;
};

export const useSim = create<Store>((set) => ({
  running: true,
  dt: 0.25,
  timeScale: 20,
  integrator: "leapfrog",
  trails: true,
  massScale: 1,
  velScale: 1,

  brachistochrone: false,
  thrustAccel: 0.00002, // gentle by default; tune in UI

  resetSignal: 0,

  set: (p) => set(p),
  pokeReset: () => set((s) => ({ resetSignal: s.resetSignal + 1 })),
}));

export default function Controls() {
  const {
    running, dt, timeScale, integrator, trails, massScale, velScale,
    brachistochrone, thrustAccel, set, pokeReset
  } = useSim();

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => set({ running: !running })}>{running ? "Pause" : "Play"}</button>
        <button onClick={pokeReset}>Reset</button>
      </div>

      <label>Time scale: {timeScale.toFixed(1)}×
        <input type="range" min={0.1} max={200} step={0.1}
               value={timeScale}
               onChange={e => set({ timeScale: Number(e.target.value) })} />
      </label>

      <label>dt (days/tick): {dt.toFixed(2)}
        <input type="range" min={0.05} max={1} step={0.05}
               value={dt}
               onChange={e => set({ dt: Number(e.target.value) })} />
      </label>

      <label>Integrator:
        <select value={integrator} onChange={e => set({ integrator: e.target.value as any })}>
          <option value="leapfrog">Leapfrog</option>
          <option value="rk4">RK4</option>
        </select>
      </label>

      <label>Trails:
        <input type="checkbox" checked={trails}
               onChange={e => set({ trails: e.target.checked })} />
      </label>

      <label>Mass scale: {massScale.toFixed(2)}
        <input type="range" min={0.1} max={5} step={0.1}
               value={massScale}
               onChange={e => set({ massScale: Number(e.target.value) })} />
      </label>

      <label>Velocity scale: {velScale.toFixed(2)}
        <input type="range" min={0.5} max={1.5} step={0.01}
               value={velScale}
               onChange={e => set({ velScale: Number(e.target.value) })} />
      </label>

      <hr />

      <label>Brachistochrone (Earth → Mars):
        <input type="checkbox" checked={brachistochrone}
               onChange={e => set({ brachistochrone: e.target.checked })} />
      </label>

      <label>Thrust accel (AU/day²): {thrustAccel.toExponential(2)}
        <input type="range" min={1e-6} max={8e-5} step={1e-6}
               value={thrustAccel}
               onChange={e => set({ thrustAccel: Number(e.target.value) })} />
      </label>
    </div>
  );
}
