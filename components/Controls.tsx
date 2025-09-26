"use client";
import { create } from "zustand";

type TrailLen = Record<string, number>;

type Store = {
  running: boolean;
  dt: number;
  timeScale: number;
  integrator: "leapfrog" | "rk4";
  trails: boolean;
  massScale: number;
  velScale: number;

  // Payload (Earth orbit)
  payloadEnabled: boolean;
  dvMps: number;
  thrustPulse: number;
  payloadReset: number;

  // NEW: Per-body trail lengths
  trailLen: TrailLen;

  resetSignal: number;

  set: (p: Partial<Store>) => void;
  pokeReset: () => void;
  fireThrust: () => void;
  resetPayload: () => void;
  setTrailLen: (id: string, len: number) => void;
};

const DEFAULT_TRAIL_LEN: TrailLen = {
  sun: 1200,
  mercury: 1200,
  venus: 1500,
  earth: 2000,
  mars: 2000,
  jupiter: 3000,
  saturn: 3000,
  uranus: 3000,
  neptune: 3000,
  payload: 2500,
};

export const useSim = create<Store>((set) => ({
  running: true,
  dt: 0.25,
  timeScale: 20,
  integrator: "leapfrog",
  trails: true,
  massScale: 1,
  velScale: 1,

  payloadEnabled: true,
  dvMps: 250,
  thrustPulse: 0,
  payloadReset: 0,

  trailLen: { ...DEFAULT_TRAIL_LEN },

  resetSignal: 0,

  set: (p) => set(p),
  pokeReset: () => set((s) => ({ resetSignal: s.resetSignal + 1 })),
  fireThrust: () => set((s) => ({ thrustPulse: s.thrustPulse + 1 })),
  resetPayload: () => set((s) => ({ payloadReset: s.payloadReset + 1 })),
  setTrailLen: (id, len) =>
    set((s) => ({ trailLen: { ...s.trailLen, [id]: Math.max(0, Math.floor(len)) } })),
}));

export default function Controls() {
  const {
    running, dt, timeScale, integrator, trails, massScale, velScale,
    payloadEnabled, dvMps, set, pokeReset, fireThrust, resetPayload,
    trailLen, setTrailLen,
  } = useSim();

  const slider = (id: string, label: string) => (
    <label key={id} style={{ display: "grid", gap: 4 }}>
      {label} trail: {trailLen[id] ?? 0}
      <input
        type="range"
        min={0}
        max={10000}
        step={100}
        value={trailLen[id] ?? 0}
        onChange={(e) => setTrailLen(id, Number(e.target.value))}
      />
    </label>
  );

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <h3>Orbit Visualizer</h3>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => set({ running: !running })}>{running ? "Pause" : "Play"}</button>
        <button onClick={pokeReset}>Reset System</button>
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

      <h4>Payload (Earth Orbit)</h4>
      <label>Enable payload:
        <input type="checkbox" checked={payloadEnabled}
               onChange={e => set({ payloadEnabled: e.target.checked })} />
      </label>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={resetPayload}>Reset to GEO</button>
        <button onClick={fireThrust}>Apply Thrust (Δv)</button>
      </div>

      <label>Δv magnitude (m/s): {dvMps.toFixed(0)}
        <input type="range" min={10} max={4000} step={10}
               value={dvMps}
               onChange={e => set({ dvMps: Number(e.target.value) })} />
      </label>

      <hr />

      <h4>Trail length per body</h4>
      <div style={{ display: "grid", gap: 6 }}>
        {[
          ["sun","Sun"],
          ["mercury","Mercury"],
          ["venus","Venus"],
          ["earth","Earth"],
          ["mars","Mars"],
          ["jupiter","Jupiter"],
          ["saturn","Saturn"],
          ["uranus","Uranus"],
          ["neptune","Neptune"],
          ["payload","Payload"],
        ].map(([id,label]) => slider(id, label))}
      </div>

      <p style={{ opacity: 0.6, fontSize: 12, marginTop: 8 }}>
        Units: AU, days, solar masses. “Good enough” accuracy; not ephemeris-grade.
      </p>
    </div>
  );
}
