export const metadata = { title: "Orbit Visualizer", description: "Simple Newtonian/Keplerian solar system viewer" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "ui-sans-serif, system-ui",
          color: "#e5e7eb",
          // Subtle spacey gradient w/ vignette-style radial fade
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
