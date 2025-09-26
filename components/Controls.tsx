import { create } from "zustand";
import { z } from "zod";

type Store = {
  running: boolean;
  dt: number;
  timeScale: number;
  integrator: "symplectic-euler" | "rk4";
  trails: boolean;
  massScale: number;
  velScale: number;
  set: (p: Partial<Store>) => void;
  resetSignal: number;
  pokeReset: () => void;
};

export const useSim = create<Store>((set) => ({
  running: true,
  dt: 0.5,          // days per tick
  timeScale: 10,    // 10x
  integrator: "symplectic-euler",
  trails: true,
  massScale: 1,
  velScale: 1,
  set: (p) => set(p),
  resetSignal: 0,
  pokeReset: () => set(s => ({ resetSignal: s.resetSignal + 1 }))
}));

export default function Controls() {
  const { running, dt, timeScale, integrator, trails, massScale, velScale, set, pokeReset } = useSim();

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => set({ running: !running })}>{running ? "Pause" : "Play"}</button>
        <button onClick={pokeReset}>Reset</button>
      </div>

      <label>Time scale: {timeScale}×
        <input type="range" min={0.1} max={1000} step={0.1}
               value={timeScale}
               onChange={e=>set({ timeScale: Number(e.target.value) })} />
      </label>

      <label>dt (days/tick): {dt.toFixed(2)}
        <input type="range" min={0.05} max={5} step={0.05}
               value={dt}
               onChange={e=>set({ dt: Number(e.target.value) })} />
      </label>

      <label>Integrator:
        <select value={integrator} onChange={e=>set({ integrator: e.target.value as any })}>
          <option value="symplectic-euler">Symplectic Euler</option>
          <option value="rk4">RK4</option>
        </select>
      </label>

      <label>Trails:
        <input type="checkbox" checked={trails} onChange={e=>set({ trails: e.target.checked })} />
      </label>

      <label>Mass scale: {massScale.toFixed(2)}
        <input type="range" min={0.1} max={5} step={0.1}
               value={massScale}
               onChange={e=>set({ massScale: Number(e.target.value) })} />
      </label>

      <label>Velocity scale: {velScale.toFixed(2)}
        <input type="range" min={0.5} max={1.5} step={0.01}
               value={velScale}
               onChange={e=>set({ velScale: Number(e.target.value) })} />
      </label>
    </div>
  );
}
