/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/


import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Text3D, Center } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from '../../store';
import { GameObject, ObjectType, LANE_WIDTH, SPAWN_DISTANCE, REMOVE_DISTANCE, GameStatus, GEMINI_COLORS } from '../../types';
import { audio } from '../System/Audio';

// --- Geometry Constants (Cuter Shapes) ---

// Snowman (Stacked Spheres)
const SPHERE_GEO = new THREE.SphereGeometry(1, 16, 16); // Scaled for parts

// Gem (Star/Diamond shape)
const GEM_GEO = new THREE.OctahedronGeometry(0.35, 0);

// Alien (Ice Drone)
const DRONE_BODY = new THREE.SphereGeometry(0.5, 16, 16);
const DRONE_RING = new THREE.TorusGeometry(0.7, 0.05, 8, 32);

// Missile (Snowball)
const SNOWBALL_GEO = new THREE.SphereGeometry(0.3, 8, 8);

// Shadows
const SHADOW_CIRCLE = new THREE.CircleGeometry(0.6, 16);

// Shop
const SHOP_ROOF = new THREE.ConeGeometry(3, 2, 4);
const SHOP_BASE = new THREE.CylinderGeometry(2, 2, 2, 8);

const PARTICLE_COUNT = 400;
const BASE_LETTER_INTERVAL = 150; 

const getLetterInterval = (level: number) => {
    return BASE_LETTER_INTERVAL * Math.pow(1.5, Math.max(0, level - 1));
};

const MISSILE_SPEED = 25;
const FONT_URL = "https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json";

// --- Particle System (Snow/Sparkles) ---
const ParticleSystem: React.FC = () => {
    const mesh = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    const particles = useMemo(() => new Array(PARTICLE_COUNT).fill(0).map(() => ({
        life: 0,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        color: new THREE.Color()
    })), []);

    useEffect(() => {
        const handleExplosion = (e: CustomEvent) => {
            const { position, color } = e.detail;
            let spawned = 0;
            const burstAmount = 30; 

            for(let i = 0; i < PARTICLE_COUNT; i++) {
                const p = particles[i];
                if (p.life <= 0) {
                    p.life = 0.8 + Math.random() * 0.4; 
                    p.pos.set(position[0], position[1], position[2]);
                    
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.random() * Math.PI;
                    const speed = 2 + Math.random() * 5;
                    
                    p.vel.set(
                        Math.sin(phi) * Math.cos(theta),
                        Math.sin(phi) * Math.sin(theta),
                        Math.cos(phi)
                    ).multiplyScalar(speed);
                    
                    p.color.set(color);
                    spawned++;
                    if (spawned >= burstAmount) break;
                }
            }
        };
        
        window.addEventListener('particle-burst', handleExplosion as any);
        return () => window.removeEventListener('particle-burst', handleExplosion as any);
    }, [particles]);

    useFrame((state, delta) => {
        if (!mesh.current) return;
        const safeDelta = Math.min(delta, 0.1);

        particles.forEach((p, i) => {
            if (p.life > 0) {
                p.life -= safeDelta;
                p.pos.addScaledVector(p.vel, safeDelta);
                p.vel.y -= safeDelta * 2; // Gravity
                
                dummy.position.copy(p.pos);
                const scale = p.life * 0.4;
                dummy.scale.set(scale, scale, scale);
                dummy.updateMatrix();
                
                mesh.current!.setMatrixAt(i, dummy.matrix);
                mesh.current!.setColorAt(i, p.color);
            } else {
                dummy.scale.set(0,0,0);
                dummy.updateMatrix();
                mesh.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        
        mesh.current.instanceMatrix.needsUpdate = true;
        if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    });

    return (
        <instancedMesh ref={mesh} args={[undefined, undefined, PARTICLE_COUNT]}>
            <sphereGeometry args={[0.5, 8, 8]} />
            <meshBasicMaterial toneMapped={false} transparent opacity={0.8} />
        </instancedMesh>
    );
};

const getRandomLane = (laneCount: number) => {
    const max = Math.floor(laneCount / 2);
    return Math.floor(Math.random() * (max * 2 + 1)) - max;
};

export const LevelManager: React.FC = () => {
  const { 
    status, 
    speed, 
    collectGem, 
    collectLetter, 
    collectedLetters,
    laneCount,
    setDistance,
    openShop,
    level
  } = useStore();
  
  const objectsRef = useRef<GameObject[]>([]);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const prevStatus = useRef(status);
  const prevLevel = useRef(level);

  const playerObjRef = useRef<THREE.Object3D | null>(null);
  const distanceTraveled = useRef(0);
  const nextLetterDistance = useRef(BASE_LETTER_INTERVAL);

  useEffect(() => {
    const isRestart = status === GameStatus.PLAYING && prevStatus.current === GameStatus.GAME_OVER;
    const isMenuReset = status === GameStatus.MENU;
    const isLevelUp = level !== prevLevel.current && status === GameStatus.PLAYING;
    const isVictoryReset = status === GameStatus.PLAYING && prevStatus.current === GameStatus.VICTORY;

    if (isMenuReset || isRestart || isVictoryReset) {
        objectsRef.current = [];
        setRenderTrigger(t => t + 1);
        distanceTraveled.current = 0;
        nextLetterDistance.current = getLetterInterval(1);
    } else if (isLevelUp && level > 1) {
        objectsRef.current = objectsRef.current.filter(obj => obj.position[2] > -80);
        objectsRef.current.push({
            id: uuidv4(),
            type: ObjectType.SHOP_PORTAL,
            position: [0, 0, -100], 
            active: true,
        });
        nextLetterDistance.current = distanceTraveled.current - SPAWN_DISTANCE + getLetterInterval(level);
        setRenderTrigger(t => t + 1);
    } else if (status === GameStatus.GAME_OVER || status === GameStatus.VICTORY) {
        setDistance(Math.floor(distanceTraveled.current));
    }
    prevStatus.current = status;
    prevLevel.current = level;
  }, [status, level, setDistance]);

  useFrame((state) => {
      if (!playerObjRef.current) {
          const group = state.scene.getObjectByName('PlayerGroup');
          if (group && group.children.length > 0) playerObjRef.current = group.children[0];
      }
  });

  useFrame((state, delta) => {
    if (status !== GameStatus.PLAYING) return;

    const safeDelta = Math.min(delta, 0.05); 
    const dist = speed * safeDelta;
    distanceTraveled.current += dist;

    let hasChanges = false;
    let playerPos = new THREE.Vector3(0, 0, 0);
    if (playerObjRef.current) playerObjRef.current.getWorldPosition(playerPos);

    const currentObjects = objectsRef.current;
    const keptObjects: GameObject[] = [];
    const newSpawns: GameObject[] = [];

    for (const obj of currentObjects) {
        let moveAmount = dist;
        if (obj.type === ObjectType.MISSILE) moveAmount += MISSILE_SPEED * safeDelta;

        const prevZ = obj.position[2];
        obj.position[2] += moveAmount;
        
        // Alien Shoot Logic
        if (obj.type === ObjectType.ALIEN && obj.active && !obj.hasFired) {
             if (obj.position[2] > -90) {
                 obj.hasFired = true;
                 newSpawns.push({
                     id: uuidv4(),
                     type: ObjectType.MISSILE,
                     position: [obj.position[0], 1.0, obj.position[2] + 2],
                     active: true,
                     color: '#ffffff'
                 });
                 hasChanges = true;
             }
        }

        let keep = true;
        if (obj.active) {
            const zThreshold = 2.0; 
            const inZZone = (prevZ < playerPos.z + zThreshold) && (obj.position[2] > playerPos.z - zThreshold);
            
            if (obj.type === ObjectType.SHOP_PORTAL) {
                if (Math.abs(obj.position[2] - playerPos.z) < 2) { 
                     openShop();
                     obj.active = false;
                     hasChanges = true;
                     keep = false; 
                }
            } else if (inZZone) {
                const dx = Math.abs(obj.position[0] - playerPos.x);
                if (dx < 0.8) { 
                     const isDamageSource = obj.type === ObjectType.OBSTACLE || obj.type === ObjectType.ALIEN || obj.type === ObjectType.MISSILE;
                     
                     if (isDamageSource) {
                         const playerBottom = playerPos.y;
                         const playerTop = playerPos.y + 1.5; 
                         let objBottom = obj.position[1] - 0.5;
                         let objTop = obj.position[1] + 0.5;

                         if (obj.type === ObjectType.OBSTACLE) {
                             objBottom = 0;
                             objTop = 1.5; // Snowman Height
                         } 
                         const isHit = (playerBottom < objTop) && (playerTop > objBottom);

                         if (isHit) { 
                             window.dispatchEvent(new Event('player-hit'));
                             obj.active = false; 
                             hasChanges = true;
                             window.dispatchEvent(new CustomEvent('particle-burst', { 
                                detail: { position: obj.position, color: '#ff9999' } 
                             }));
                         }
                     } else {
                         // Collect Item
                         const dy = Math.abs(obj.position[1] - playerPos.y);
                         if (dy < 2.5) {
                            if (obj.type === ObjectType.GEM) {
                                collectGem(obj.points || 50);
                                audio.playGemCollect();
                            }
                            if (obj.type === ObjectType.LETTER && obj.targetIndex !== undefined) {
                                collectLetter(obj.targetIndex);
                                audio.playLetterCollect();
                            }
                            window.dispatchEvent(new CustomEvent('particle-burst', { 
                                detail: { position: obj.position, color: obj.color || '#ffffff' } 
                            }));
                            obj.active = false;
                            hasChanges = true;
                         }
                     }
                }
            }
        }

        if (obj.position[2] > REMOVE_DISTANCE) {
            keep = false;
            hasChanges = true;
        }
        if (keep) keptObjects.push(obj);
    }

    if (newSpawns.length > 0) keptObjects.push(...newSpawns);

    // Spawning Logic
    let furthestZ = -20;
    const staticObjects = keptObjects.filter(o => o.type !== ObjectType.MISSILE);
    if (staticObjects.length > 0) furthestZ = Math.min(...staticObjects.map(o => o.position[2]));

    if (furthestZ > -SPAWN_DISTANCE) {
         const minGap = 12 + (speed * 0.4); 
         const spawnZ = Math.min(furthestZ - minGap, -SPAWN_DISTANCE);
         
         const isLetterDue = distanceTraveled.current >= nextLetterDistance.current;

         if (isLetterDue) {
             const lane = getRandomLane(laneCount);
             const target = ['G','E','M','I','N','I'];
             const availableIndices = target.map((_, i) => i).filter(i => !collectedLetters.includes(i));

             if (availableIndices.length > 0) {
                 const chosenIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                 keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.LETTER,
                    position: [lane * LANE_WIDTH, 1.0, spawnZ], 
                    active: true,
                    color: GEMINI_COLORS[chosenIndex],
                    value: target[chosenIndex],
                    targetIndex: chosenIndex
                 });
                 nextLetterDistance.current += getLetterInterval(level);
                 hasChanges = true;
             } else {
                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.GEM,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    color: '#FFD700',
                    points: 50
                });
                hasChanges = true;
             }
         } else if (Math.random() > 0.1) {
            const isObstacle = Math.random() > 0.25;
            if (isObstacle) {
                const spawnAlien = level >= 2 && Math.random() < 0.2; 

                if (spawnAlien) {
                    const lane = getRandomLane(laneCount);
                    keptObjects.push({
                        id: uuidv4(),
                        type: ObjectType.ALIEN,
                        position: [lane * LANE_WIDTH, 1.5, spawnZ],
                        active: true,
                        color: '#00BFFF',
                        hasFired: false
                    });
                } else {
                    const lane = getRandomLane(laneCount);
                    keptObjects.push({
                        id: uuidv4(),
                        type: ObjectType.OBSTACLE,
                        position: [lane * LANE_WIDTH, 0, spawnZ],
                        active: true,
                        color: '#ffffff'
                    });
                    // Random chance for gem above obstacle
                    if (Math.random() < 0.3) {
                        keptObjects.push({
                           id: uuidv4(),
                           type: ObjectType.GEM,
                           position: [lane * LANE_WIDTH, 2.5, spawnZ],
                           active: true,
                           color: '#FFD700',
                           points: 100
                       });
                    }
                }
            } else {
                const lane = getRandomLane(laneCount);
                keptObjects.push({
                    id: uuidv4(),
                    type: ObjectType.GEM,
                    position: [lane * LANE_WIDTH, 1.2, spawnZ],
                    active: true,
                    color: '#FFD700',
                    points: 50
                });
            }
            hasChanges = true;
         }
    }

    if (hasChanges) {
        objectsRef.current = keptObjects;
        setRenderTrigger(t => t + 1);
    }
  });

  return (
    <group>
      <ParticleSystem />
      {objectsRef.current.map(obj => {
        if (!obj.active) return null;
        return <GameEntity key={obj.id} data={obj} />;
      })}
    </group>
  );
};

const GameEntity: React.FC<{ data: GameObject }> = React.memo(({ data }) => {
    const groupRef = useRef<THREE.Group>(null);
    const visualRef = useRef<THREE.Group>(null);
    const { laneCount } = useStore();
    
    useFrame((state, delta) => {
        if (groupRef.current) groupRef.current.position.set(data.position[0], 0, data.position[2]);

        if (visualRef.current) {
            const baseHeight = data.position[1];
            if (data.type === ObjectType.MISSILE) {
                 visualRef.current.rotation.x += delta * 10; 
                 visualRef.current.position.y = baseHeight;
            } else if (data.type === ObjectType.ALIEN) {
                 visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 3) * 0.2;
                 visualRef.current.rotation.y += delta;
            } else if (data.type === ObjectType.GEM || data.type === ObjectType.LETTER) {
                visualRef.current.rotation.y += delta * 2;
                visualRef.current.position.y = baseHeight + Math.sin(state.clock.elapsedTime * 4 + data.position[0]) * 0.1;
            } else {
                visualRef.current.position.y = baseHeight;
            }
        }
    });

    return (
        <group ref={groupRef} position={[data.position[0], 0, data.position[2]]}>
            {data.type !== ObjectType.SHOP_PORTAL && (
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} geometry={SHADOW_CIRCLE}>
                    <meshBasicMaterial color="#000000" opacity={0.2} transparent />
                </mesh>
            )}

            <group ref={visualRef} position={[0, data.position[1], 0]}>
                {/* --- SHOP PORTAL (Igloo Store) --- */}
                {data.type === ObjectType.SHOP_PORTAL && (
                    <group scale={[1.5, 1.5, 1.5]}>
                         <mesh position={[0, 1, 0]} geometry={SHOP_BASE}>
                             <meshStandardMaterial color="#E1F5FE" />
                         </mesh>
                         <mesh position={[0, 2.5, 0]} geometry={SHOP_ROOF} rotation={[0, Math.PI/4, 0]}>
                              <meshStandardMaterial color="#81D4FA" />
                         </mesh>
                         <Center position={[0, 4, 0]}>
                             <Text3D font={FONT_URL} size={0.8} height={0.1}>
                                 STORE
                                 <meshBasicMaterial color="#FF69B4" />
                             </Text3D>
                         </Center>
                    </group>
                )}

                {/* --- OBSTACLE (Snowman) --- */}
                {data.type === ObjectType.OBSTACLE && (
                    <group>
                        {/* Bottom Ball */}
                        <mesh position={[0, 0.5, 0]} scale={[0.6, 0.5, 0.6]} geometry={SPHERE_GEO}>
                            <meshStandardMaterial color="white" />
                        </mesh>
                        {/* Middle Ball */}
                        <mesh position={[0, 1.2, 0]} scale={[0.45, 0.45, 0.45]} geometry={SPHERE_GEO}>
                            <meshStandardMaterial color="white" />
                        </mesh>
                         {/* Head Ball */}
                        <mesh position={[0, 1.8, 0]} scale={[0.3, 0.3, 0.3]} geometry={SPHERE_GEO}>
                            <meshStandardMaterial color="white" />
                        </mesh>
                        {/* Carrot Nose */}
                        <mesh position={[0, 1.8, 0.3]} rotation={[Math.PI/2, 0, 0]}>
                            <coneGeometry args={[0.05, 0.2, 8]} />
                            <meshStandardMaterial color="orange" />
                        </mesh>
                    </group>
                )}

                {/* --- ALIEN (Ice Drone) --- */}
                {data.type === ObjectType.ALIEN && (
                    <group>
                        <mesh geometry={DRONE_BODY}>
                            <meshStandardMaterial color="#E0F7FA" metalness={0.5} roughness={0.2} />
                        </mesh>
                        <mesh rotation={[Math.PI/2, 0, 0]} geometry={DRONE_RING}>
                            <meshStandardMaterial color={data.color} emissive={data.color} emissiveIntensity={0.5} />
                        </mesh>
                        {/* Eyes */}
                        <mesh position={[0.2, 0.1, 0.4]} scale={[0.1, 0.1, 0.1]} geometry={SPHERE_GEO}>
                            <meshBasicMaterial color="black" />
                        </mesh>
                        <mesh position={[-0.2, 0.1, 0.4]} scale={[0.1, 0.1, 0.1]} geometry={SPHERE_GEO}>
                            <meshBasicMaterial color="black" />
                        </mesh>
                    </group>
                )}

                {/* --- MISSILE (Snowball) --- */}
                {data.type === ObjectType.MISSILE && (
                    <mesh geometry={SNOWBALL_GEO}>
                        <meshStandardMaterial color="white" roughness={0.8} />
                    </mesh>
                )}

                {/* --- GEM (Star/Diamond) --- */}
                {data.type === ObjectType.GEM && (
                    <mesh castShadow geometry={GEM_GEO}>
                        <meshStandardMaterial 
                            color={data.color} 
                            metalness={0.9} 
                            roughness={0.1}
                            emissive={data.color} 
                            emissiveIntensity={0.4} 
                        />
                    </mesh>
                )}

                {/* --- LETTER --- */}
                {data.type === ObjectType.LETTER && (
                    <group scale={[1.5, 1.5, 1.5]}>
                         {/* Ice Block Container */}
                         <mesh position={[0, 0.3, -0.1]}>
                             <boxGeometry args={[0.8, 0.8, 0.1]} />
                             <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
                         </mesh>
                         <Center>
                             <Text3D 
                                font={FONT_URL} 
                                size={0.8} 
                                height={0.2} 
                                bevelEnabled
                                bevelThickness={0.02}
                                bevelSize={0.02}
                             >
                                {data.value}
                                <meshStandardMaterial color={data.color} />
                             </Text3D>
                         </Center>
                    </group>
                )}
            </group>
        </group>
    );
});