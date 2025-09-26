"use client";
import Controls from "~/components/Controls";
import OrbitCanvas from "~/components/OrbitCanvas";

export default function Page() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100dvh" }}>
      <aside style={{ borderRight: "1px solid #e5e7eb", padding: 16, overflowY: "auto" }}>
        <h1 style={{ margin: "0 0 12px", fontSize: 18 }}>Orbit Visualizer</h1>
        <Controls />
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 16 }}>
          Units: AU, days, solar masses. "Good enough" accuracy; not ephemeris-grade.
        </p>
      </aside>
      <main style={{ position: "relative" }}>
        <OrbitCanvas />
      </main>
    </div>
  );
}
