/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH } from '../../types';

const SnowFall: React.FC = () => {
  const speed = useStore(state => state.speed);
  const count = 2000; 
  const meshRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 100; // X
      pos[i * 3 + 1] = Math.random() * 40; // Y
      pos[i * 3 + 2] = -50 + Math.random() * 100; // Z
    }
    return pos;
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const positions = meshRef.current.geometry.attributes.position.array as Float32Array;
    const worldSpeed = speed > 0 ? speed : 2;

    for (let i = 0; i < count; i++) {
        // Move down
        positions[i * 3 + 1] -= delta * 2.0;
        // Move towards player (to simulate forward movement context)
        positions[i * 3 + 2] += worldSpeed * delta * 0.5;

        // Reset if too low or passed camera
        if (positions[i * 3 + 1] < 0 || positions[i * 3 + 2] > 20) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = 30 + Math.random() * 10;
            positions[i * 3 + 2] = -80 + Math.random() * 40;
        }
    }
    meshRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        color="#ffffff"
        transparent
        opacity={0.8}
      />
    </points>
  );
};

const LaneGuides: React.FC = () => {
    const { laneCount } = useStore();
    
    const separators = useMemo(() => {
        const lines: number[] = [];
        const startX = -(laneCount * LANE_WIDTH) / 2;
        
        for (let i = 0; i <= laneCount; i++) {
            lines.push(startX + (i * LANE_WIDTH));
        }
        return lines;
    }, [laneCount]);

    return (
        <group position={[0, 0.01, 0]}>
            {/* Ice Floor */}
            <mesh position={[0, -0.02, -40]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[100, 200]} />
                <meshStandardMaterial 
                    color="#e0f7fa" 
                    roughness={0.1} 
                    metalness={0.1}
                    transparent 
                    opacity={0.9} 
                />
            </mesh>

            {/* Lane Separators - Soft White Lines */}
            {separators.map((x, i) => (
                <mesh key={`sep-${i}`} position={[x, 0, -20]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.08, 200]} /> 
                    <meshBasicMaterial 
                        color="#ffffff" 
                        transparent 
                        opacity={0.5} 
                    />
                </mesh>
            ))}
        </group>
    );
};

const CuteSun: React.FC = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.position.y = 25 + Math.sin(state.clock.elapsedTime * 0.5) * 1.0;
            meshRef.current.rotation.z = state.clock.elapsedTime * 0.1;
        }
    });

    return (
        <group position={[0, 25, -120]}>
            {/* Sun/Moon Body */}
            <mesh ref={meshRef}>
                <circleGeometry args={[20, 32]} />
                <meshBasicMaterial color="#FFF9C4" transparent opacity={0.9} />
            </mesh>
            {/* Glow */}
             <mesh position={[0, 0, -1]}>
                <circleGeometry args={[25, 32]} />
                <meshBasicMaterial color="#FFF176" transparent opacity={0.4} />
            </mesh>
        </group>
    );
};

const IceMountains: React.FC = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = 20;
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    // Position mountains on sides
    const positions = useMemo(() => {
         const pos = [];
         for(let i=0; i<count; i++) {
             const isLeft = i % 2 === 0;
             const x = isLeft ? -30 - Math.random() * 20 : 30 + Math.random() * 20;
             const z = -10 - (i * 10); 
             const scale = 5 + Math.random() * 10;
             pos.push({ x, z, scale });
         }
         return pos;
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current) return;
        // Move mountains slowly to simulate distance
        const speed = useStore.getState().speed * 0.1; // Parallax factor
        
        positions.forEach((p, i) => {
            dummy.position.set(p.x, -2, p.z);
            dummy.scale.set(p.scale, p.scale * 1.5, p.scale);
            dummy.rotation.y = i; 
            dummy.updateMatrix();
            meshRef.current!.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <coneGeometry args={[1, 1, 4]} />
            <meshStandardMaterial color="#B2EBF2" flatShading />
        </instancedMesh>
    )
}

export const Environment: React.FC = () => {
  return (
    <>
      {/* Soft Pastel Blue Background */}
      <color attach="background" args={['#E1F5FE']} />
      <fog attach="fog" args={['#E1F5FE', 30, 100]} />
      
      {/* Bright Happy Lighting */}
      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight position={[10, 20, 5]} intensity={1.2} color="#fff" castShadow />
      <pointLight position={[0, 10, -10]} intensity={0.5} color="#81D4FA" />
      
      <SnowFall />
      <LaneGuides />
      <CuteSun />
      <IceMountains />
    </>
  );
};