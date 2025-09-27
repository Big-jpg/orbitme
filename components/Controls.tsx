"use client";

import { useState, useMemo } from "react";
import { useSim } from "~/state/sim";

/* ---------- Small helpers ---------- */
function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  scroll = false,
  maxHeight,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  /** Make the body scrollable (used by Planets) */
  scroll?: boolean;
  /** Max height for scrollable body (e.g., "44vh" or 420) */
  maxHeight?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      style={{
        border: "1px solid rgba(148,163,184,.12)",
        borderRadius: 8,
        background: "rgba(8,10,16,.35)",
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          padding: "8px 10px",
          userSelect: "none",
          color: "#cbd5e1",
          fontSize: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ opacity: 0.85 }}>{title}</span>
      </summary>
      <div
        style={{
          padding: "8px 10px",
          display: "grid",
          gap: 10,
          maxWidth: "100%",
          boxSizing: "border-box",
          ...(scroll
            ? {
                overflowY: "auto",
                // Sensible default that won’t overwhelm the sidebar
                maxHeight: maxHeight ?? "44vh",
                overscrollBehavior: "contain",
              }
            : {}),
        }}
      >
        {children}
      </div>
    </details>
  );
}

/* ---------- UI styles ---------- */
const row = { display: "grid", gap: 4, alignItems: "center" } as const;
const label = { fontSize: 12, color: "#cbd5e1" } as const;
const value = { fontVariantNumeric: "tabular-nums" } as const;
const sliderStyle = { width: "100%" } as const;
const chipRow = { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" } as const;
const chip = {
  fontSize: 12,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,.25)",
  background: "rgba(2,6,12,.6)",
  color: "#e5e7eb",
  cursor: "pointer",
} as const;
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

/* ---------- Constants ---------- */
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

const TIME_MULTS = [0.25, 1, 2, 5, 10, 25] as const;
const REAL_WORLD_DPS = [1, 7, 30, 90, 365] as const; // days per second presets

export default function Controls() {
  const {
    // core physics
    running, dt, timeScale, integrator, trails, massScale, velScale,
    // actions
    set, pokeReset, trailLen, setTrailLen,
    // camera
    camMinDist, camMaxDist, camZoomSpeed, camAutoRotate, camAutoRotateSpeed, bumpCamReset,
    // focus
    focusId,
  } = useSim();

  // Local UI state: which planet row is expanded (for showing its trail slider)
  const [expandedPlanet, setExpandedPlanet] = useState<string | null>(null);

  // ---- derived text for real-world preset estimate (just a hint) ----
  const estDps = useMemo(() => 60 /*fps*/ * dt * timeScale, [dt, timeScale]); // ~days/sec

  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        height: "100%",
        overflowY: "auto",
        width: "100%",
        maxWidth: 420,           // keeps content snug inside the sidebar
        boxSizing: "border-box",
        margin: 0,
      }}
    >
      {/* QUICK CONTROLS (always visible) */}
      <div
        style={{
          display: "grid",
          gap: 10,
          padding: "8px 10px",
          border: "1px solid rgba(148,163,184,.12)",
          borderRadius: 8,
          background: "rgba(8,10,16,.35)",
        }}
      >
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={btn} onClick={() => set({ running: !running })}>
            {running ? "Pause" : "Play"}
          </button>
          <button style={btn} onClick={pokeReset}>Reset System</button>
        </div>

        {/* Time scale chips */}
        <label style={row}>
          <span style={label}>Time scale (multipliers)</span>
          <div style={chipRow}>
            {TIME_MULTS.map((m) => (
              <button
                key={m}
                style={{
                  ...chip,
                  background: timeScale === m ? "rgba(88,28,135,.65)" : chip.background,
                  borderColor: timeScale === m ? "rgba(147,51,234,.6)" : (chip as any).border,
                }}
                onClick={() => set({ timeScale: m })}
              >
                {m}×
              </button>
            ))}
          </div>
        </label>

        {/* Real-world presets */}
        <label style={row}>
          <span style={label}>Real-world presets (≈ days/sec)</span>
          <div style={chipRow}>
            {REAL_WORLD_DPS.map((dps) => (
              <button
                key={dps}
                style={chip}
                onClick={() => {
                  // solve for timescale to roughly hit desired days/sec: dps ≈ 60 * dt * timeScale
                  const ts = Math.max(0.1, Math.min(400, dps / (60 * dt)));
                  set({ timeScale: ts });
                }}
              >
                {dps === 365 ? "1 yr/s" : `${dps} d/s`}
              </button>
            ))}
          </div>
          <small style={{ color: "#94a3b8" }}>
            Est. sim rate: <strong>{estDps.toFixed(1)}</strong> days/sec (assumes ~60 FPS)
          </small>
        </label>
      </div>

      {/* CAMERA (collapsed by default) */}
      <CollapsibleSection title="Camera" defaultOpen={false}>
        <label style={row}>
          <span style={label}>
            Min distance: <span style={value}>{camMinDist.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.01}
            max={5}
            step={0.01}
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
            type="range"
            min={50}
            max={5000}
            step={10}
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
            type="range"
            min={0.1}
            max={3}
            step={0.05}
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
            type="range"
            min={0.1}
            max={5}
            step={0.1}
            value={camAutoRotateSpeed}
            onChange={(e) => set({ camAutoRotateSpeed: Number(e.target.value) })}
            disabled={!camAutoRotate}
            style={sliderStyle}
          />
        </label>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button style={btn} onClick={() => set({ camAutoRotate: !camAutoRotate })}>
            {camAutoRotate ? "Disable auto-rotate" : "Enable auto-rotate"}
          </button>
          <button style={btn} onClick={bumpCamReset}>Reset Camera</button>
        </div>
      </CollapsibleSection>

      {/* PLANETS (scrollable, collapsed by default) */}
      <CollapsibleSection title="Planets" defaultOpen={false} scroll maxHeight="46vh">
        {/* “None” option */}
        <PlanetRow
          id=""
          name="None (system barycenter)"
          focused={focusId == null}
          onFocus={() => set({ focusId: null })}
          onSnap={bumpCamReset}
          showDetails={false}
          trailValue={0}
          onTrail={() => {}}
        />

        {PLANET_LIST.map(([id, name]) => {
          const isFocused = focusId === id;
          const showDetails = isFocused || expandedPlanet === id;
          return (
            <PlanetRow
              key={id}
              id={id}
              name={name}
              focused={isFocused}
              onFocus={() => set({ focusId: id })}
              onSnap={bumpCamReset}
              showDetails={showDetails}
              onToggle={() => setExpandedPlanet((cur) => (cur === id ? null : id))}
              trailValue={(trailLen as any)[id] ?? 0}
              onTrail={(v) => setTrailLen(id, v)}
            />
          );
        })}
      </CollapsibleSection>

      {/* ADVANCED / PHYSICS (collapsed by default) */}
      <CollapsibleSection title="Advanced (Physics)" defaultOpen={false}>
        <label style={row}>
          <span style={label}>
            dt (days/tick): <span style={value}>{dt.toFixed(2)}</span>
          </span>
          <input
            type="range"
            min={0.05}
            max={1}
            step={0.05}
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
            type="range"
            min={0.1}
            max={5}
            step={0.1}
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
            type="range"
            min={0.5}
            max={1.5}
            step={0.01}
            value={velScale}
            onChange={(e) => set({ velScale: Number(e.target.value) })}
            style={sliderStyle}
          />
        </label>
      </CollapsibleSection>
    </div>
  );
}

/* ---------- Planet row (compact) ---------- */
function PlanetRow({
  id,
  name,
  focused,
  onFocus,
  onSnap,
  showDetails,
  onToggle,
  trailValue,
  onTrail,
}: {
  id: string;
  name: string;
  focused: boolean;
  onFocus: () => void;
  onSnap: () => void;
  showDetails: boolean;
  onToggle?: () => void;
  trailValue: number;
  onTrail: (v: number) => void;
}) {
  return (
    <div
      style={{
        border: "1px solid rgba(148,163,184,.15)",
        borderRadius: 8,
        padding: 10,
        display: "grid",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto auto",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input type="radio" checked={focused} onChange={onFocus} name="focusPlanet" style={{ margin: 0 }} />
        <span style={{ fontSize: 12, color: "#e5e7eb" }}>{name}</span>
        {id && (
          <button style={btn} onClick={onSnap} title="Snap camera to target">
            Snap
          </button>
        )}
        {id && (
          <button
            style={{ ...btn, padding: "6px 8px" }}
            onClick={onToggle}
            title={showDetails ? "Hide details" : "Show details"}
          >
            {showDetails ? "−" : "⋯"}
          </button>
        )}
      </div>

      {/* Per-planet controls are shown only for the focused/expanded one */}
      {id && showDetails && (
        <label style={{ ...row, marginTop: 4 }}>
          <span style={label}>
            Trail length: <span style={value}>{trailValue}</span>
          </span>
          <input
            type="range"
            min={0}
            max={10000}
            step={100}
            value={trailValue}
            onChange={(e) => onTrail(Number(e.target.value))}
            style={sliderStyle}
          />
        </label>
      )}
    </div>
  );
}
