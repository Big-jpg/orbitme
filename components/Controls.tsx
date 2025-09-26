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

  payloadEnabled: boolean;
  dvMps: number;
  thrustPulse: number;
  payloadReset: number;

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

const row = { display: "grid", gap: 4, alignItems: "center" } as const;
const label = { fontSize: 12, color: "#cbd5e1" } as const;
const value = { fontVariantNumeric: "tabular-nums" } as const;
const sliderStyle = { width: "100%" } as const;
const section = {
  display: "grid",
  gap: 8,
  padding: "8px 10px",
  border: "1px solid rgba(148,163,184,.12)",
  borderRadius: 8,
  background: "rgba(8,10,16,.35)",
} as const;
const legend = { margin: 0, fontSize: 12, color: "#94a3b8", letterSpacing: 0.2 } as const;
const buttonRow = { display: "flex", gap: 6, flexWrap: "wrap" } as const;
const btn = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(2,6,12,.6)",
  color: "#e5e7eb",
  cursor: "pointer",
} as const;
const select = {
  fontSize: 12,
  padding: "4px 6px",
  borderRadius: 6,
  background: "rgba(2,6,12,.6)",
  color: "#e5e7eb",
  border: "1px solid rgba(148,163,184,.25)",
} as const;
const checkbox = { marginLeft: 6 } as const;

export default function Controls() {
  const {
    running, dt, timeScale, integrator, trails, massScale, velScale,
    payloadEnabled, dvMps, set, pokeReset, fireThrust, resetPayload,
    trailLen, setTrailLen
  } = useSim();

  return (
    <div style={{ display: "grid", gap: 8, height: "100%", overflow: "hidden" }}>
      {/* CORE */}
      <fieldset style={section}>
        <legend style={legend}>Core</legend>

        <div style={buttonRow}>
          <button style={btn} onClick={() => set({ running: !running })}>
            {running ? "Pause" : "Play"}
          </button>
          <button style={btn} onClick={pokeReset}>Reset System</button>
        </div>

        <label style={row}>
          <span style={label}>Time scale: <span style={value}>{timeScale.toFixed(1)}×</span></span>
          <input
            type="range" min={0.1} max={200} step={0.1}
            value={timeScale} onChange={e => set({ timeScale: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>

        <label style={row}>
          <span style={label}>dt (days/tick): <span style={value}>{dt.toFixed(2)}</span></span>
          <input
            type="range" min={0.05} max={1} step={0.05}
            value={dt} onChange={e => set({ dt: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>

        <label style={row}>
          <span style={label}>Integrator</span>
          <select
            value={integrator}
            onChange={e => set({ integrator: e.target.value as any })}
            style={select}
          >
            <option value="leapfrog">Leapfrog</option>
            <option value="rk4">RK4</option>
          </select>
        </label>

        <label style={{ ...row, display: "flex", justifyContent: "space-between" }}>
          <span style={label}>Trails</span>
          <input
            type="checkbox" checked={trails}
            onChange={e => set({ trails: e.target.checked })}
            style={checkbox}
          />
        </label>

        <label style={row}>
          <span style={label}>Mass scale: <span style={value}>{massScale.toFixed(2)}</span></span>
          <input
            type="range" min={0.1} max={5} step={0.1}
            value={massScale} onChange={e => set({ massScale: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>

        <label style={row}>
          <span style={label}>Velocity scale: <span style={value}>{velScale.toFixed(2)}</span></span>
          <input
            type="range" min={0.5} max={1.5} step={0.01}
            value={velScale} onChange={e => set({ velScale: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>
      </fieldset>

      {/* PAYLOAD */}
      <fieldset style={section}>
        <legend style={legend}>Payload</legend>

        <label style={{ ...row, display: "flex", justifyContent: "space-between" }}>
          <span style={label}>Enable payload</span>
          <input
            type="checkbox" checked={payloadEnabled}
            onChange={e => set({ payloadEnabled: e.target.checked })}
            style={checkbox}
          />
        </label>

        <div style={buttonRow}>
          <button style={btn} onClick={resetPayload}>Reset to GEO</button>
          <button style={btn} onClick={fireThrust}>Apply Thrust (Δv)</button>
        </div>

        <label style={row}>
          <span style={label}>Δv (m/s): <span style={value}>{dvMps.toFixed(0)}</span></span>
          <input
            type="range" min={10} max={4000} step={10}
            value={dvMps} onChange={e => set({ dvMps: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>
      </fieldset>

      {/* TRAILS (compact two-column grid) */}
      <fieldset style={{ ...section, paddingBottom: 6 }}>
        <legend style={legend}>Trails (length)</legend>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {([
            ["sun","Sun"],["mercury","Mercury"],["venus","Venus"],["earth","Earth"],
            ["mars","Mars"],["jupiter","Jupiter"],["saturn","Saturn"],
            ["uranus","Uranus"],["neptune","Neptune"],["payload","Payload"],
          ] as const).map(([id, name]) => (
            <label key={id} style={row}>
              <span style={label}>{name}: <span style={value}>{trailLen[id]}</span></span>
              <input
                type="range" min={0} max={10000} step={100}
                value={trailLen[id] ?? 0}
                onChange={(e) => setTrailLen(id, Number(e.target.value))}
                style={sliderStyle}
              />
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
