"use client";
import { create } from "zustand";

export type Integrator = "leapfrog" | "rk4";

type Store = {
  // Sim core
  running: boolean;
  dt: number;
  timeScale: number;
  integrator: Integrator;
  trails: boolean;
  massScale: number;
  velScale: number;
  resetSignal: number;

  // Trail length per body (id -> count)
  trailLen: Record<string, number>;

  // Camera
  camMinDist: number;
  camMaxDist: number;
  camZoomSpeed: number;
  camAutoRotate: boolean;
  camAutoRotateSpeed: number;
  camResetPulse: number;

  focusId: string | null;       
  focusLerp: number;            
  focusSnapOnSelect: boolean;   

  // Actions
  set: (p: Partial<Store>) => void;
  pokeReset: () => void;
  setTrailLen: (id: string, n: number) => void;
  bumpCamReset: () => void;
};

export const useSim = create<Store>((set) => ({
  // --- core
  running: true,
  dt: 0.25,
  timeScale: 1,
  integrator: "leapfrog",
  trails: true,
  massScale: 1,
  velScale: 1,
  resetSignal: 0,

  trailLen: {
    sun: 1200,
    mercury: 1200,
    venus: 1500,
    earth: 2000,
    mars: 2000,
    jupiter: 1500,
    saturn: 1200,
    uranus: 1000,
    neptune: 1000,
  },

  // --- camera
  camMinDist: 0.05,
  camMaxDist: 800,
  camZoomSpeed: 0.9,
  camAutoRotate: false,
  camAutoRotateSpeed: 0.6,
  camResetPulse: 0,

  focusId: null,
  focusLerp: 0.12,
  focusSnapOnSelect: false,

  // --- actions
  set: (p) => set(p),
  pokeReset: () => set((s) => ({ resetSignal: s.resetSignal + 1 })),
  setTrailLen: (id, n) =>
    set((s) => ({ trailLen: { ...s.trailLen, [id]: Math.max(0, Math.floor(n)) } })),
  bumpCamReset: () => set((s) => ({ camResetPulse: s.camResetPulse + 1 })),
}));
