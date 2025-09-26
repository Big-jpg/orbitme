# orbitme# Orbit Visualizer

A real-time 3D solar system simulation built with Next.js, TypeScript, and Three.js, featuring accurate Newtonian n-body physics and interactive controls.

## 🌟 Features

### Physics Simulation
- **Newtonian n-body gravity** with proper gravitational forces between all bodies
- **Dual integrators**: Symplectic Euler (fast, stable) and RK4 (high accuracy)
- **Configurable parameters**: time scale, mass scale, velocity scale
- **Softening parameter** to prevent singularities in close encounters
- **Units**: AU (distance), days (time), solar masses (mass)

### 3D Visualization
- **Real-time 3D rendering** using Three.js and React Three Fiber
- **Orbital trails** showing historical paths of celestial bodies
- **Interactive camera** with orbit controls (zoom, pan, rotate)
- **Proper lighting** with ambient and point light sources
- **Orbital plane grid** for spatial reference

### Interactive Controls
- **Play/Pause/Reset** simulation controls
- **Time scale slider** (0.1× to 1000× speed)
- **Integration method selector** (Symplectic Euler vs RK4)
- **Trail toggle** to show/hide orbital paths
- **Mass and velocity scaling** for experimental scenarios
- **Time step adjustment** for simulation precision

### Solar System Bodies
- **Sun** (1 solar mass) - gravitational center
- **8 Planets** with realistic mass ratios:
  - Mercury, Venus, Earth, Mars (inner planets)
  - Jupiter, Saturn, Uranus, Neptune (outer planets)
- **Color-coded** for easy identification
- **Exaggerated visual sizes** for visibility at astronomical scales

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
# Clone or download the project
cd orbit-visualizer

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Visit `http://localhost:3000` to see the simulation.

### Build for Production
```bash
npm run build
npm start
```

## 🎮 Usage

### Basic Controls
1. **Play/Pause**: Start or stop the simulation
2. **Reset**: Return all planets to initial positions
3. **Time Scale**: Adjust simulation speed (higher = faster orbits)
4. **Integrator**: Choose between Symplectic Euler (fast) or RK4 (accurate)

### Advanced Parameters
- **dt (days/tick)**: Time step size for integration
- **Mass Scale**: Multiply all masses (affects orbital speeds)
- **Velocity Scale**: Multiply all velocities (affects orbital shapes)
- **Trails**: Toggle orbital path visualization

### 3D Navigation
- **Mouse drag**: Rotate camera around the solar system
- **Mouse wheel**: Zoom in/out
- **Right-click drag**: Pan camera position

## 🔧 Technical Details

### Architecture
- **Next.js 14** with App Router for modern React development
- **TypeScript** for type safety and better development experience
- **Zustand** for lightweight state management
- **Three.js + React Three Fiber** for 3D graphics
- **@react-three/drei** for additional 3D utilities

### Physics Implementation
- **Gravitational constant**: G = 0.00029591220828559104 (AU³/M☉/day²)
- **Symplectic Euler**: Fast, energy-conserving integrator
- **RK4**: Fourth-order Runge-Kutta for high precision
- **Softening**: ε² = 1e-6 to prevent numerical instabilities

### File Structure
```
orbit-visualizer/
├── app/
│   ├── layout.tsx          # Root layout component
│   └── page.tsx            # Main application page
├── components/
│   ├── Controls.tsx        # UI controls and state management
│   └── OrbitCanvas.tsx     # 3D scene and physics loop
├── lib/
│   ├── bodies.ts           # Planet data and constants
│   ├── physics.ts          # Integration algorithms
│   └── kepler.ts           # Placeholder for Keplerian orbits
└── public/
    └── favicon.ico
```

## 🎯 Future Enhancements

### Planned Features
- **Keplerian orbit overlay** for comparison with Newtonian integration
- **Real orbital elements** from NASA JPL data
- **Asteroid belt** and comet simulations
- **3D inclinations** (currently planets are in XY plane)
- **Per-planet controls** for individual mass/velocity adjustment
- **Preset scenarios** (inner planets only, outer planets, etc.)
- **Performance optimizations** for larger N-body systems

### Educational Extensions
- **Orbital mechanics tutorials** integrated into the UI
- **Kepler's laws demonstration** with measurement tools
- **Gravitational field visualization** with vector fields
- **Energy conservation tracking** and display

## 📊 Performance Notes

- **Optimized for 60 FPS** with efficient Three.js rendering
- **Trail length capped** at 2000 points per body for memory management
- **Symplectic Euler recommended** for real-time interaction
- **RK4 suitable** for high-accuracy scientific visualization

## 🔬 Scientific Accuracy

This simulation prioritizes **educational value** and **interactive exploration** over NASA-grade precision. The initial conditions are simplified for demonstration purposes, but the underlying physics is mathematically correct for n-body gravitational systems.

**Note**: "Good enough" accuracy for understanding orbital mechanics - not ephemeris-grade for mission planning!

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions welcome! Areas of interest:
- Real astronomical data integration
- Performance optimizations
- Educational content and tutorials
- Additional physics models (relativistic effects, etc.)

---

**Built with ❤️ for space enthusiasts and physics learners everywhere!**
