"use client";

import { useSim } from "~/state/sim";

/* ---------- UI styles ---------- */
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
    // core
    running, dt, timeScale, integrator, trails, massScale, velScale,
    // actions
    set, pokeReset, trailLen, setTrailLen,
    // camera
    camMinDist, camMaxDist, camZoomSpeed, camAutoRotate, camAutoRotateSpeed, bumpCamReset,
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
          <span style={label}>
            Time scale: <span style={value}>{timeScale.toFixed(1)}×</span>
          </span>
          <input
            type="range" min={0.1} max={200} step={0.1}
            value={timeScale}
            onChange={(e) => set({ timeScale: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>

        <label style={row}>
          <span style={label}>
            dt (days/tick): <span style={value}>{dt.toFixed(2)}</span>
          </span>
          <input
            type="range" min={0.05} max={1} step={0.05}
            value={dt}
            onChange={(e) => set({ dt: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>

        <label style={row}>
          <span style={label}>Integrator</span>
          <select
            value={integrator}
            onChange={(e) => set({ integrator: e.target.value as "leapfrog" | "rk4" })}
            style={select}
          >
            <option value="leapfrog">Leapfrog</option>
            <option value="rk4">RK4</option>
          </select>
        </label>

        <label style={{ ...row, display: "flex", justifyContent: "space-between" }}>
          <span style={label}>Trails</span>
          <input
            type="checkbox"
            checked={trails}
            onChange={(e) => set({ trails: e.target.checked })}
            style={checkbox}
          />
        </label>

        <label style={row}>
          <span style={label}>
            Mass scale: <span style={value}>{massScale.toFixed(2)}</span>
          </span>
          <input
            type="range" min={0.1} max={5} step={0.1}
            value={massScale}
            onChange={(e) => set({ massScale: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>

        <label style={row}>
          <span style={label}>
            Velocity scale: <span style={value}>{velScale.toFixed(2)}</span>
          </span>
          <input
            type="range" min={0.5} max={1.5} step={0.01}
            value={velScale}
            onChange={(e) => set({ velScale: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>
      </fieldset>

      {/* CAMERA */}
      <fieldset style={section}>
        <legend style={legend}>Camera</legend>

        <label style={row}>
          <span style={label}>
            Min distance: <span style={value}>{camMinDist.toFixed(2)}</span>
          </span>
          <input
            type="range" min={0.01} max={5} step={0.01}
            value={camMinDist}
            onChange={(e) => set({ camMinDist: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>

        <label style={row}>
          <span style={label}>
            Max distance: <span style={value}>{camMaxDist.toFixed(0)}</span>
          </span>
          <input
            type="range" min={50} max={5000} step={10}
            value={camMaxDist}
            onChange={(e) => set({ camMaxDist: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>

        <label style={row}>
          <span style={label}>
            Zoom speed: <span style={value}>{camZoomSpeed.toFixed(2)}</span>
          </span>
          <input
            type="range" min={0.1} max={3} step={0.05}
            value={camZoomSpeed}
            onChange={(e) => set({ camZoomSpeed: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>

        <label style={{ ...row, display: "flex", justifyContent: "space-between" }}>
          <span style={label}>Auto-rotate</span>
          <input
            type="checkbox"
            checked={camAutoRotate}
            onChange={(e) => set({ camAutoRotate: e.target.checked })}
            style={checkbox}
          />
        </label>

        <label style={{ ...row, opacity: camAutoRotate ? 1 : 0.6 }}>
          <span style={label}>
            Auto-rotate speed: <span style={value}>{camAutoRotateSpeed.toFixed(2)}</span>
          </span>
          <input
            type="range" min={0.1} max={5} step={0.1}
            value={camAutoRotateSpeed}
            onChange={(e) => set({ camAutoRotateSpeed: Number(e.target.value) })}
            disabled={!camAutoRotate}
            style={sliderStyle}
          />
        </label>

        <div style={buttonRow}>
          <button style={btn} onClick={() => set({ camAutoRotate: !camAutoRotate })}>
            {camAutoRotate ? "Disable auto-rotate" : "Enable auto-rotate"}
          </button>
          <button style={btn} onClick={bumpCamReset}>Reset Camera</button>
        </div>
      </fieldset>

      {/* TRAILS */}
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
            ["sun", "Sun"], ["mercury", "Mercury"], ["venus", "Venus"], ["earth", "Earth"],
            ["mars", "Mars"], ["jupiter", "Jupiter"], ["saturn", "Saturn"],
            ["uranus", "Uranus"], ["neptune", "Neptune"],
          ] as const).map(([id, name]) => (
            <label key={id} style={row}>
              <span style={label}>
                {name}: <span style={value}>{(trailLen as any)[id]}</span>
              </span>
              <input
                type="range" min={0} max={10000} step={100}
                value={(trailLen as any)[id] ?? 0}
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
