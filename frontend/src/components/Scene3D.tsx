import React, { useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

const Building = ({ position, args }: { position: [number, number, number], args: [number, number, number] }) => {
  return (
    <mesh position={position}>
      <boxGeometry args={args} />
      <meshStandardMaterial
        color="#ffffff"
        metalness={0.5}
        roughness={0.2}
        envMapIntensity={0.5}
      />
    </mesh>
  );
};

const City = () => {
  const buildings = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = (Math.random() - 0.5) * 100;
      const w = 1 + Math.random() * 3;
      const h = 2 + Math.random() * 15;
      const d = 1 + Math.random() * 3;
      temp.push({
        position: [x, h / 2, z] as [number, number, number],
        args: [w, h, d] as [number, number, number]
      });
    }
    return temp;
  }, []);

  return (
    <group>
      {buildings.map((b, i) => (
        <Building key={i} position={b.position} args={b.args} />
      ))}
    </group>
  );
};

const SceneContent = ({ scrollYProgress, mouse }: { scrollYProgress: any, mouse: React.MutableRefObject<{ x: number, y: number }> }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useFrame((state) => {
    // Mouse rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, mouse.current.x * 0.1, 0.05);
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, mouse.current.y * 0.05, 0.05);
    }

    // Scroll zoom
    const zoom = 50 - scrollYProgress.get() * 40;
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, zoom, 0.1);
    camera.lookAt(0, 0, 0);
  });

  return (
    <group ref={groupRef}>
      <City />
      <gridHelper args={[200, 50, '#333333', '#222222']} position={[0, 0, 0]} />
    </group>
  );
};

export const Scene3D = ({ scrollYProgress }: { scrollYProgress: any }) => {
  const mouse = useRef({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    mouse.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: -(e.clientY / window.innerHeight) * 2 + 1
    };
  };

  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none"
      onMouseMove={handleMouseMove}
      style={{ background: '#000000' }}
    >
      <Canvas
        shadows
        gl={{ antialias: true }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000');
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 20, 50]} fov={60} />
        <fog attach="fog" args={['#000000', 30, 150]} />

        <ambientLight intensity={0.2} />
        <pointLight position={[10, 20, 10]} intensity={1.5} color="#ffffff" />
        <spotLight position={[-20, 40, 20]} angle={0.15} penumbra={1} intensity={2} castShadow />

        <SceneContent scrollYProgress={scrollYProgress} mouse={mouse} />
      </Canvas>

      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black to-transparent pointer-events-none" />
    </div>
  );
};
