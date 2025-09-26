"use client";
import Controls from "~/components/Controls";
import OrbitCanvas from "~/components/OrbitCanvas";

export default function Page() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "300px 1fr",
        height: "100dvh",
        width: "100vw",
      }}
    >
      <aside
        style={{
          padding: 12,
          background: "linear-gradient(180deg, rgba(16,18,28,.85), rgba(8,10,16,.85))",
          borderRight: "1px solid rgba(148,163,184,.15)",
          boxShadow: "0 0 0 1px rgba(2,6,12,.3) inset",
          display: "grid",
          gridTemplateRows: "auto 1fr",
          gap: 8,
          // no scrolling: we’ll make content fit by design
          overflow: "hidden",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 16, color: "#f1f5f9", letterSpacing: 0.2 }}>
          Orbit Visualizer
        </h1>
        <Controls />
      </aside>

      <main
        style={{
          position: "relative",
          overflow: "hidden", // ensure the 3D canvas never creates scrollbars
        }}
      >
        <OrbitCanvas />
      </main>
    </div>
  );
}
