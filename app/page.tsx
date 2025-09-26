"use client";
import Controls from "~/components/Controls";
import OrbitCanvas from "~/components/OrbitCanvas";
import StaticStarfield from "~/components/StaticStarfield";

export default function Page() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "320px 1fr",
        height: "100dvh",
      }}
    >
      <aside
        style={{
          padding: 16,
          overflowY: "auto",
          background: "linear-gradient(180deg, rgba(16,18,28,.85), rgba(8,10,16,.85))",
          backdropFilter: "blur(8px)",
          borderRight: "1px solid rgba(148,163,184,.15)",
          boxShadow: "0 0 0 1px rgba(2,6,12,.3) inset",
        }}
      >
        <h1 style={{ margin: "0 0 12px", fontSize: 18, color: "#f1f5f9" }}>Orbit Visualizer</h1>
        <Controls />
        <p style={{ fontSize: 12, color: "#94a3b8", marginTop: 16 }}>
          Units: AU, days, solar masses. "Good enough" accuracy; not ephemeris-grade.
        </p>
      </aside>

      <main style={{ position: "relative" }}>
        {/* Static 2D stars behind WebGL */}
        <StaticStarfield density={0.00012} maxSize={1.6} />
        {/* Transparent WebGL canvas on top */}
        <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
          <OrbitCanvas />
        </div>
      </main>
    </div>
  );
}
