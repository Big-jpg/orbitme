"use client";
import { Line } from "@react-three/drei";
import type { KeplerElements } from "~/lib/kepler";
import { ellipsePoints } from "~/lib/kepler";

export default function KeplerOrbit({
  parentPos,    // [x,y,z] AU of the primary body (e.g., Earth)
  elements,     // Kepler elements relative to parent
  color = "#7dd3fc",
  samples = 512,
  linewidth = 1,
  opacity = 0.8,
}: {
  parentPos: [number,number,number];
  elements: KeplerElements;
  color?: string;
  samples?: number;
  linewidth?: number;
  opacity?: number;
}) {
  const pts = ellipsePoints(elements, samples).map(([x,y,z]) => [
    x + parentPos[0], y + parentPos[1], z + parentPos[2],
  ]) as [number,number,number][];

  return (
    <Line
      points={pts}
      color={color}
      linewidth={linewidth}
      transparent
      opacity={opacity}
      depthWrite={false}
    />
  );
}
