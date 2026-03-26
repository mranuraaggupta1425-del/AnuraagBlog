"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import * as THREE from "three";

/* Animated particle field */
function ParticleField() {
  const count = 800;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const mouse = useRef({ x: 0, y: 0 });

  const particles = useMemo(() => {
    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20,
        speed: 0.2 + Math.random() * 0.5,
        offset: Math.random() * Math.PI * 2,
        scale: 0.02 + Math.random() * 0.04,
      });
    }
    return positions;
  }, []);

  const { viewport } = useThree();

  useFrame(({ clock, pointer }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    mouse.current.x += (pointer.x * viewport.width * 0.05 - mouse.current.x) * 0.02;
    mouse.current.y += (pointer.y * viewport.height * 0.05 - mouse.current.y) * 0.02;

    particles.forEach((p, i) => {
      const px = p.x + Math.sin(t * p.speed + p.offset) * 0.5 + mouse.current.x;
      const py = p.y + Math.cos(t * p.speed + p.offset) * 0.5 + mouse.current.y;
      const pz = p.z + Math.sin(t * p.speed * 0.5) * 0.3;

      dummy.position.set(px, py, pz);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color="#8b5cf6" transparent opacity={0.6} />
    </instancedMesh>
  );
}

/* Central glowing sphere */
function GlowingSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    meshRef.current.rotation.x = t * 0.1;
    meshRef.current.rotation.y = t * 0.15;
    meshRef.current.scale.setScalar(1 + Math.sin(t * 0.5) * 0.05);
  });

  return (
    <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.5, 1]} />
        <meshBasicMaterial
          color="#8b5cf6"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
      {/* Inner glow */}
      <mesh>
        <icosahedronGeometry args={[1.4, 2]} />
        <meshBasicMaterial
          color="#3b82f6"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>
    </Float>
  );
}

/* Connecting lines */
function ConnectionLines() {
  const ref = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < 40; i++) {
      const p1 = new THREE.Vector3(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 12
      );
      const p2 = p1.clone().add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3,
          (Math.random() - 0.5) * 3
        )
      );
      points.push(p1, p2);
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.y = clock.getElapsedTime() * 0.02;
  });

  return (
    <lineSegments ref={ref} geometry={geometry}>
      <lineBasicMaterial color="#8b5cf6" transparent opacity={0.06} />
    </lineSegments>
  );
}

export default function Hero3D() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 1.5]}
        gl={{ antialias: false, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <fog attach="fog" args={["#0a0a0a", 8, 25]} />

        <ambientLight intensity={0.5} />

        <ParticleField />
        <GlowingSphere />
        <ConnectionLines />
        <Stars
          radius={50}
          depth={50}
          count={1000}
          factor={2}
          saturation={0}
          fade
          speed={0.5}
        />
      </Canvas>
    </div>
  );
}
