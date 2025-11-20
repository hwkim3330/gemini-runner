/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store';
import { LANE_WIDTH, GameStatus } from '../../types';
import { audio } from '../System/Audio';

// Physics Constants
const GRAVITY = 50;
const JUMP_FORCE = 16; 

export const Player: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyMeshRef = useRef<THREE.Group>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  
  // Penguin Parts
  const leftFlipperRef = useRef<THREE.Mesh>(null);
  const rightFlipperRef = useRef<THREE.Mesh>(null);
  const leftFootRef = useRef<THREE.Mesh>(null);
  const rightFootRef = useRef<THREE.Mesh>(null);

  const { status, laneCount, takeDamage, hasDoubleJump, activateImmortality, isImmortalityActive } = useStore();
  
  const [lane, setLane] = React.useState(0);
  const targetX = useRef(0);
  
  const isJumping = useRef(false);
  const velocityY = useRef(0);
  const jumpsPerformed = useRef(0); 
  const spinRotation = useRef(0); 
  const waddleTime = useRef(0);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const isInvincible = useRef(false);
  const lastDamageTime = useRef(0);

  // --- Reset State on Game Start ---
  useEffect(() => {
      if (status === GameStatus.PLAYING) {
          isJumping.current = false;
          jumpsPerformed.current = 0;
          velocityY.current = 0;
          spinRotation.current = 0;
          if (groupRef.current) groupRef.current.position.y = 0;
          if (bodyMeshRef.current) bodyMeshRef.current.rotation.x = 0;
      }
  }, [status]);
  
  useEffect(() => {
      const maxLane = Math.floor(laneCount / 2);
      if (Math.abs(lane) > maxLane) {
          setLane(l => Math.max(Math.min(l, maxLane), -maxLane));
      }
  }, [laneCount, lane]);

  // --- Controls ---
  const triggerJump = () => {
    const maxJumps = hasDoubleJump ? 2 : 1;

    if (!isJumping.current) {
        audio.playJump(false);
        isJumping.current = true;
        jumpsPerformed.current = 1;
        velocityY.current = JUMP_FORCE;
    } else if (jumpsPerformed.current < maxJumps) {
        audio.playJump(true);
        jumpsPerformed.current += 1;
        velocityY.current = JUMP_FORCE; 
        spinRotation.current = 0; 
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (status !== GameStatus.PLAYING) return;
      const maxLane = Math.floor(laneCount / 2);

      if (e.key === 'ArrowLeft') setLane(l => Math.max(l - 1, -maxLane));
      else if (e.key === 'ArrowRight') setLane(l => Math.min(l + 1, maxLane));
      else if (e.key === 'ArrowUp' || e.key === 'w') triggerJump();
      else if (e.key === ' ' || e.key === 'Enter') activateImmortality();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (status !== GameStatus.PLAYING) return;
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        const deltaY = e.changedTouches[0].clientY - touchStartY.current;
        const maxLane = Math.floor(laneCount / 2);

        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
             if (deltaX > 0) setLane(l => Math.min(l + 1, maxLane));
             else setLane(l => Math.max(l - 1, -maxLane));
        } else if (Math.abs(deltaY) > Math.abs(deltaX) && deltaY < -30) {
            triggerJump();
        } else if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            activateImmortality();
        }
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [status, laneCount, hasDoubleJump, activateImmortality]);

  // --- Animation Loop ---
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    if (status !== GameStatus.PLAYING && status !== GameStatus.SHOP) return;

    // 1. Horizontal Position
    targetX.current = lane * LANE_WIDTH;
    groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x, 
        targetX.current, 
        delta * 12 // Softer slide
    );

    // 2. Physics (Jump)
    if (isJumping.current) {
        groupRef.current.position.y += velocityY.current * delta;
        velocityY.current -= GRAVITY * delta;

        if (groupRef.current.position.y <= 0) {
            groupRef.current.position.y = 0;
            isJumping.current = false;
            jumpsPerformed.current = 0;
            velocityY.current = 0;
            if (bodyMeshRef.current) bodyMeshRef.current.rotation.x = 0;
        }

        // Double Jump Flip
        if (jumpsPerformed.current === 2 && bodyMeshRef.current) {
             spinRotation.current -= delta * 15;
             if (spinRotation.current < -Math.PI * 2) spinRotation.current = -Math.PI * 2;
             bodyMeshRef.current.rotation.x = spinRotation.current;
        }
    }

    // Banking Rotation (Cute tilt)
    const xDiff = targetX.current - groupRef.current.position.x;
    groupRef.current.rotation.z = -xDiff * 0.15; 

    // 3. Cute Waddle Animation
    waddleTime.current += delta * 15;
    if (bodyMeshRef.current && !isJumping.current) {
        // Rocking side to side
        bodyMeshRef.current.rotation.z = Math.sin(waddleTime.current) * 0.1;
        bodyMeshRef.current.position.y = 0.7 + Math.abs(Math.sin(waddleTime.current)) * 0.05; // Bobbing
        
        // Feet movement
        if (leftFootRef.current) leftFootRef.current.position.y = -0.6 + Math.max(0, Math.sin(waddleTime.current)) * 0.1;
        if (rightFootRef.current) rightFootRef.current.position.y = -0.6 + Math.max(0, Math.sin(waddleTime.current + Math.PI)) * 0.1;
        
        // Flippers flapping
        if (leftFlipperRef.current) leftFlipperRef.current.rotation.z = 0.5 + Math.sin(waddleTime.current) * 0.2;
        if (rightFlipperRef.current) rightFlipperRef.current.rotation.z = -0.5 - Math.sin(waddleTime.current) * 0.2;
    } else if (isJumping.current) {
        // Jump Pose: Flippers up!
         if (leftFlipperRef.current) leftFlipperRef.current.rotation.z = 2.5;
         if (rightFlipperRef.current) rightFlipperRef.current.rotation.z = -2.5;
         if (bodyMeshRef.current && jumpsPerformed.current !== 2) {
             bodyMeshRef.current.rotation.z = 0;
             bodyMeshRef.current.position.y = 0.7;
         }
    }

    // 4. Dynamic Shadow
    if (shadowRef.current) {
        const height = groupRef.current.position.y;
        const scale = Math.max(0.2, 1 - (height / 2.5) * 0.5); 
        shadowRef.current.scale.set(scale, scale, scale);
        (shadowRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0.1, 0.3 - (height / 2.5) * 0.2);
    }

    // Invincibility / Immortality Visual
    const showFlicker = isInvincible.current || isImmortalityActive;
    if (showFlicker) {
        if (isInvincible.current) {
             if (Date.now() - lastDamageTime.current > 1500) {
                isInvincible.current = false;
                groupRef.current.visible = true;
             } else {
                groupRef.current.visible = Math.floor(Date.now() / 50) % 2 === 0;
             }
        } 
        if (isImmortalityActive) {
            groupRef.current.visible = true;
            // Add a glow shield effect or just simple visible
        }
    } else {
        groupRef.current.visible = true;
    }
  });

  useEffect(() => {
     const checkHit = (e: any) => {
        if (isInvincible.current || isImmortalityActive) return;
        audio.playDamage(); 
        takeDamage();
        isInvincible.current = true;
        lastDamageTime.current = Date.now();
     };
     window.addEventListener('player-hit', checkHit);
     return () => window.removeEventListener('player-hit', checkHit);
  }, [takeDamage, isImmortalityActive]);

  // Colors
  const bodyColor = isImmortalityActive ? '#FFFACD' : '#2C3E50'; // Gold if immortal, Dark Blue/Black otherwise
  const bellyColor = '#FFFFFF';
  const beakColor = '#FFA500';
  const flipperColor = bodyColor;
  const scarfColor = '#FF69B4'; // Hot pink scarf

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <group ref={bodyMeshRef} position={[0, 0.7, 0]}> 
        
        {/* Body (Capsule-ish) */}
        <mesh castShadow position={[0, 0, 0]}>
             <capsuleGeometry args={[0.35, 0.5, 4, 8]} />
             <meshStandardMaterial color={bodyColor} roughness={0.5} />
        </mesh>
        
        {/* Belly (White Patch) */}
        <mesh position={[0, -0.05, 0.25]} scale={[0.8, 0.8, 0.5]}>
             <sphereGeometry args={[0.32, 16, 16]} />
             <meshStandardMaterial color={bellyColor} roughness={0.8} />
        </mesh>

        {/* Head Group */}
        <group position={[0, 0.4, 0]}>
            {/* Eyes */}
            <mesh position={[0.12, 0.05, 0.28]}>
                <sphereGeometry args={[0.05]} />
                <meshStandardMaterial color="black" />
            </mesh>
             <mesh position={[-0.12, 0.05, 0.28]}>
                <sphereGeometry args={[0.05]} />
                <meshStandardMaterial color="black" />
            </mesh>
            {/* Beak */}
            <mesh position={[0, -0.05, 0.35]} rotation={[Math.PI/2, 0, 0]}>
                <coneGeometry args={[0.08, 0.2, 8]} />
                <meshStandardMaterial color={beakColor} />
            </mesh>
        </group>

        {/* Scarf */}
        <mesh position={[0, 0.25, 0]}>
            <torusGeometry args={[0.36, 0.08, 8, 16]} />
            <meshStandardMaterial color={scarfColor} />
        </mesh>
        {/* Scarf Tail */}
        <mesh position={[0, 0.2, -0.35]} rotation={[-0.5, 0, 0]}>
             <boxGeometry args={[0.15, 0.4, 0.05]} />
             <meshStandardMaterial color={scarfColor} />
        </mesh>

        {/* Flippers */}
        <mesh ref={leftFlipperRef} position={[-0.35, 0.0, 0]} rotation={[0, 0, 0.5]}>
             <boxGeometry args={[0.1, 0.4, 0.2]} />
             <meshStandardMaterial color={flipperColor} />
        </mesh>
        <mesh ref={rightFlipperRef} position={[0.35, 0.0, 0]} rotation={[0, 0, -0.5]}>
             <boxGeometry args={[0.1, 0.4, 0.2]} />
             <meshStandardMaterial color={flipperColor} />
        </mesh>

        {/* Feet */}
        <mesh ref={leftFootRef} position={[-0.15, -0.6, 0.1]}>
             <boxGeometry args={[0.15, 0.1, 0.3]} />
             <meshStandardMaterial color={beakColor} />
        </mesh>
        <mesh ref={rightFootRef} position={[0.15, -0.6, 0.1]}>
             <boxGeometry args={[0.15, 0.1, 0.3]} />
             <meshStandardMaterial color={beakColor} />
        </mesh>

      </group>
      
      {/* Shadow */}
      <mesh ref={shadowRef} position={[0, 0.02, 0]} rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[0.45, 32]} />
          <meshBasicMaterial color="#000000" opacity={0.2} transparent />
      </mesh>
    </group>
  );
};