"use client";

import { useId, useState } from "react";
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
const legendRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 } as const;
const toggleBtn = {
  background: "transparent",
  border: "none",
  padding: 0,
  margin: 0,
  color: "#94a3b8",
  fontSize: 12,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 6,
} as const;
const chevron = { display: "inline-block", width: 12, textAlign: "center" } as const;

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

// Card style for each planet block
const card = {
  display: "grid",
  gap: 8,
  padding: "8px",
  borderRadius: 8,
  border: "1px solid rgba(148,163,184,.12)",
  background: "rgba(2,6,12,.35)",
} as const;

const PLANET_LIST = [
  ["sun", "Sun"],
  ["mercury", "Mercury"],
  ["venus", "Venus"],
  ["earth", "Earth"],
  ["mars", "Mars"],
  ["jupiter", "Jupiter"],
  ["saturn", "Saturn"],
  ["uranus", "Uranus"],
  ["neptune", "Neptune"],
] as const;

/** Collapsible fieldset with a chevron toggle. Collapsed by default. */
function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  rightNode,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  rightNode?: React.ReactNode;
}) {
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const panelId = useId();
  return (
    <fieldset style={section}>
      <legend style={legend}>
        <div style={legendRow}>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            style={toggleBtn}
          >
            <span style={chevron}>{open ? "▾" : "▸"}</span>
            {title}
          </button>
          {rightNode ?? null}
        </div>
      </legend>
      <div id={panelId} style={{ display: open ? "grid" : "none", gap: 8 }}>
        {children}
      </div>
    </fieldset>
  );
}

export default function Controls() {
  const {
    // core
    running, dt, timeScale, integrator, trails, massScale, velScale,
    // actions
    set, pokeReset, trailLen, setTrailLen,
    // camera (global)
    camMinDist, camMaxDist, camZoomSpeed, camAutoRotate, camAutoRotateSpeed, bumpCamReset,
    // focus (per-planet selection)
    focusId,
  } = useSim();

  // ---- time presets (UI only; assumes ~60 FPS to estimate d/s) ----
  const fpsRef = 60;
  const setMultiplier = (m: number) => set({ timeScale: m });
  const applyDaysPerSec = (daysPerSec: number) => {
    const ts = Math.max(0.1, Math.min(200, daysPerSec / (dt * fpsRef)));
    set({ timeScale: ts });
  };
  const estimatedDaysPerSec = (dt * timeScale * fpsRef).toFixed(1);

  const SIDEBAR_WIDTH = 560; // <- wider, enforced even in flex/grid parents

  return (
    <div
      style={{
        display: "grid",
        gap: 8,
        height: "100%",
        overflowY: "auto",
        width: SIDEBAR_WIDTH,
        minWidth: SIDEBAR_WIDTH,
        flex: `0 0 ${SIDEBAR_WIDTH}px`,
        paddingRight: 4,
      }}
    >
      {/* CORE */}
      <CollapsibleSection title="Core" defaultOpen={false}>
        <div style={buttonRow}>
          <button style={btn} onClick={() => set({ running: !running })}>
            {running ? "Pause" : "Play"}
          </button>
          <button style={btn} onClick={pokeReset}>Reset System</button>
        </div>

        {/* Time scale presets */}
        <div style={{ display: "grid", gap: 6 }}>
          <span style={label}>Time scale (multipliers)</span>
          <div style={buttonRow}>
            {[0.25, 1, 2, 5, 10, 25, 50, 100].map(m => (
              <button
                key={m}
                style={{
                  ...btn,
                  background: timeScale === m ? "rgba(99,102,241,.25)" : (btn as any).background,
                  borderColor: timeScale === m ? "rgba(99,102,241,.55)" : (btn as any).borderColor,
                }}
                onClick={() => setMultiplier(m)}
              >
                {m}×
              </button>
            ))}
          </div>

          <span style={{ ...label, marginTop: 6 }}>Real-world presets (≈ days per second)</span>
          <div style={buttonRow}>
            {[
              { label: "1 d/s", dps: 1 },
              { label: "7 d/s", dps: 7 },
              { label: "30 d/s", dps: 30 },
              { label: "90 d/s", dps: 90 },
              { label: "1 yr/s", dps: 365 },
              { label: "5 yr/s", dps: 365 * 5 },
            ].map(p => (
              <button
                key={p.label}
                style={btn}
                onClick={() => applyDaysPerSec(p.dps)}
                title={`Sets ~${p.label} (assumes ~${fpsRef} FPS)`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div style={{ fontSize: 11, color: "#94a3b8" }}>
            Est. sim rate: <strong>{estimatedDaysPerSec}</strong> days/sec (assumes ~{fpsRef} FPS)
          </div>
        </div>

        {/* dt still adjustable */}
        <label style={{ ...row, marginTop: 6 }}>
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
      </CollapsibleSection>

      {/* CAMERA (global) */}
      <CollapsibleSection title="Camera" defaultOpen={false}>
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
      </CollapsibleSection>

      {/* PLANETS (responsive cards) */}
      <CollapsibleSection title="Planets" defaultOpen={false}>
        {/* "None" (system barycenter) */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="radio"
                name="viewpoint"
                checked={focusId == null}
                onChange={() => useSim.getState().set({ focusId: null })}
              />
              <span style={label}>None (system barycenter)</span>
            </label>
            <button style={btn} onClick={bumpCamReset} title="Snap camera to current target">
              Snap
            </button>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 8,
            // responsive: 1–2 columns depending on available width
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {PLANET_LIST.map(([id, name]) => {
            const { set: setState, bumpCamReset: snap } = useSim.getState();
            const length = (trailLen as any)[id] ?? 0;
            const focused = focusId === id;
            return (
              <div key={id} style={card}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="radio"
                      name="viewpoint"
                      checked={focused}
                      onChange={() => setState({ focusId: id })}
                    />
                    <span style={label}>{name}</span>
                  </label>
                  <button
                    style={btn}
                    onClick={() => {
                      setState({ focusId: id });
                      snap();
                    }}
                    title={`Snap camera to ${name}`}
                  >
                    Snap
                  </button>
                </div>

                <label style={row}>
                  <span style={label}>
                    Trail length: <span style={value}>{length}</span>
                  </span>
                  <input
                    type="range" min={0} max={10000} step={100}
                    value={length}
                    onChange={(e) => setTrailLen(id, Number(e.target.value))}
                    style={sliderStyle}
                  />
                </label>
              </div>
            );
          })}
        </div>
      </CollapsibleSection>
    </div>
  );
}
