export const metadata = {
  title: "Orbit Visualizer",
  description: "Simple Newtonian/Keplerian solar system viewer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: "100%" }}>
      <body
        style={{
          height: "100%",
          margin: 0,
          overflow: "hidden", // prevent page scrollbars
          fontFamily: "ui-sans-serif, system-ui",
          color: "#e5e7eb",
          background:
            "radial-gradient(1200px 800px at 30% 15%, #0d1220 0%, #070b15 35%, #05070c 60%, #020308 100%)",
          backgroundColor: "#020308",
        }}
      >
        {children}
      </body>
    </html>
  );
}
