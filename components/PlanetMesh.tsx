"use client";
import * as THREE from "three";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import type { Body } from "~/lib/bodies";
import { useSim } from "~/state/sim"; 

type Props = {
  body: Body; // includes visual radius, color, optional texture & ring
};

/**
 * PlanetMesh
 * - Spheres are rendered OPAQUE (transparent={false}, depthWrite={true}) so they occlude the starfield.
 * - Rings (if present) remain transparent with alphaMap and depthWrite disabled.
 * - Textures are loaded only when URLs are present (prevents "Could not load: undefined").
 */
export default function PlanetMesh({ body }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const set = useSim(s => s.set);
  const focusSnapOnSelect = useSim(s => s.focusSnapOnSelect);

  const handlePick = (e: any) => {
    e.stopPropagation();
    set({ focusId: body.id });
    // optional: immediate snap (skip lerp for one frame)
    if (focusSnapOnSelect) {
      set({ camResetPulse: Math.random() }); 
    }
  };

  // Build a texture-url object without undefined values.
  const texUrls = useMemo(() => {
    const out: Record<string, string> = {};
    const t = body.texture;
    if (!t) return out;
    if (t.map) out.map = t.map;
    if (t.normalMap) out.normalMap = t.normalMap;
    if (t.roughnessMap) out.roughnessMap = t.roughnessMap;
    if (t.emissiveMap) out.emissiveMap = t.emissiveMap;
    return out;
  }, [body.texture]);

  // Load only provided maps.
  const tex = useTexture(texUrls) as Partial<Record<keyof typeof texUrls, THREE.Texture>>;

  useMemo(() => {
    Object.values(tex).forEach((tx) => {
      if (tx) {
        tx.anisotropy = 8;
        tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
        tx.needsUpdate = true;
      }
    });
  }, [tex]);

  // Visual spin (subtle).
  useFrame((_, d) => {
    if (groupRef.current) groupRef.current.rotation.y += d * 0.02;
  });

  // Ring textures (optional)
  const ringTexUrls = useMemo(() => {
    if (!body.ring) return {};
    const o: Record<string, string> = {};
    if (body.ring.map) o.map = body.ring.map;
    if (body.ring.alphaMap) o.alphaMap = body.ring.alphaMap;
    return o;
  }, [body.ring]);

  const ringTex = useTexture(ringTexUrls) as Partial<Record<keyof typeof ringTexUrls, THREE.Texture>>;

  useMemo(() => {
    Object.values(ringTex).forEach((tx) => {
      if (tx) {
        tx.anisotropy = 8;
        tx.wrapS = tx.wrapT = THREE.ClampToEdgeWrapping;
        tx.needsUpdate = true;
      }
    });
  }, [ringTex]);

  const r = body.radius;

  return (
    <group
      ref={groupRef}
      name={`planet-${body.id}`}
      position={body.position as any}
      onPointerDown={handlePick}
    >
      {/* OPAQUE sphere (occludes stars) */}
      <mesh>
        <sphereGeometry args={[r, 48, 48]} />
        <meshStandardMaterial
          color={body.color}
          roughness={0.45}
          metalness={0.08}
          emissive={body.id === "sun" ? new THREE.Color(body.color) : undefined}
          emissiveIntensity={body.id === "sun" ? 0.9 : 0}
          map={("map" in tex ? (tex as any).map : undefined)}
          normalMap={("normalMap" in tex ? (tex as any).normalMap : undefined)}
          roughnessMap={("roughnessMap" in tex ? (tex as any).roughnessMap : undefined)}
          emissiveMap={("emissiveMap" in tex ? (tex as any).emissiveMap : undefined)}
          transparent={false}
          depthWrite={true}
          depthTest={true}
        />
      </mesh>

      {/* Transparent ring (e.g., Saturn). Drawn as a tilted annulus. */}
      {body.ring && (
        <mesh
          rotation={[
            THREE.MathUtils.degToRad(90 - (body.ring.tiltDeg ?? 0)), // tilt ring around X
            0,
            0,
          ]}
        >
          <ringGeometry args={[body.ring.inner, body.ring.outer, 128]} />
          <meshBasicMaterial
            map={("map" in ringTex ? (ringTex as any).map : undefined)}
            alphaMap={("alphaMap" in ringTex ? (ringTex as any).alphaMap : undefined)}
            color="white"
            transparent
            opacity={1}
            side={THREE.DoubleSide}
            depthWrite={false} // keep ring from punching holes into the planet
            depthTest={true}
          />
        </mesh>
      )}
    </group>
  );
}
