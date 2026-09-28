import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Float } from '@react-three/drei';
import * as THREE from 'three';

declare global {
    namespace React {
        namespace JSX {
            interface IntrinsicElements {
                [elemName: string]: any;
            }
        }
    }
    namespace JSX {
        interface IntrinsicElements {
            [elemName: string]: any;
        }
    }
}

// ============================================================================
// 1. COMPOSANT DU MODÈLE 3D DE LA SERRE (MAQUETTE ARCHITECTURALE)
// ============================================================================

/**
 * Modélisation procédurale légère d'une serre horticole industrielle
 * posée sur un socle en bois clair/béton pour un rendu maquette épuré.
 */
export function GreenhouseModel() {
    const groupRef = useRef<THREE.Group>(null);

    // Matériaux optimisés Light Mode
    const materials = useMemo(() => ({
        woodPlinth: new THREE.MeshStandardMaterial({
            color: '#d2b48c',
            roughness: 0.85,
            metalness: 0.05
        }),
        aluminumFrame: new THREE.MeshStandardMaterial({
            color: '#94a3b8',
            metalness: 0.85,
            roughness: 0.25
        }),
        foundationConcrete: new THREE.MeshStandardMaterial({
            color: '#e2e8f0',
            roughness: 0.9,
            metalness: 0.1
        }),
        polycarbonateGlass: new THREE.MeshPhysicalMaterial({
            color: '#e0f2fe',
            transparent: true,
            opacity: 0.35,
            roughness: 0.15,
            transmission: 0.85,
            ior: 1.5,
            thickness: 0.5,
            depthWrite: false
        }),
        hydroBeds: new THREE.MeshStandardMaterial({
            color: '#475569',
            roughness: 0.7
        }),
        cropGreenDark: new THREE.MeshStandardMaterial({
            color: '#1e7a46',
            roughness: 0.6
        }),
        cropGreenLight: new THREE.MeshStandardMaterial({
            color: '#2ecc71',
            roughness: 0.5
        }),
        tomatoRed: new THREE.MeshStandardMaterial({
            color: '#ef4444',
            roughness: 0.3
        }),
        ledFixture: new THREE.MeshStandardMaterial({
            color: '#ffffff',
            emissive: '#ec4899',
            emissiveIntensity: 0.6
        })
    }), []);

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            {/* ---------------------------------------------------- */}
            {/* A. SOCLE DE LA MAQUETTE ARCHITECTURALE               */}
            {/* ---------------------------------------------------- */}
            <mesh position={[0, -0.2, 0]} receiveShadow material={materials.woodPlinth}>
                <boxGeometry args={[12, 0.4, 8]} />
            </mesh>

            {/* Bordure de finition du socle */}
            <mesh position={[0, -0.42, 0]} material={materials.foundationConcrete}>
                <boxGeometry args={[12.3, 0.05, 8.3]} />
            </mesh>

            {/* ---------------------------------------------------- */}
            {/* B. SOUBASSEMENT EN BÉTON & ALLÉES DE CIRCULATION     */}
            {/* ---------------------------------------------------- */}
            <mesh position={[0, 0.1, 0]} receiveShadow material={materials.foundationConcrete}>
                <boxGeometry args={[10, 0.2, 6.2]} />
            </mesh>

            {/* Allée centrale pavée */}
            <mesh position={[0, 0.21, 0]} material={materials.foundationConcrete}>
                <boxGeometry args={[1.2, 0.02, 5.8]} />
            </mesh>

            {/* ---------------------------------------------------- */}
            {/* C. TABLES HYDROPONIQUES & PLANTATIONS 3D              */}
            {/* ---------------------------------------------------- */}
            {[-2.6, 2.6].map((xOffset, bedIdx) => (
                <group key={bedIdx} position={[xOffset, 0.35, 0]}>
                    {/* Table de culture NFT */}
                    <mesh receiveShadow material={materials.hydroBeds}>
                        <boxGeometry args={[2.2, 0.25, 5.4]} />
                    </mesh>

                    {/* Rangs de culture foliaire */}
                    {[-1.8, -0.9, 0, 0.9, 1.8].map((zOffset, rowIdx) => (
                        <group key={rowIdx} position={[0, 0.25, zOffset]}>
                            {/* Végétation stylisée */}
                            <mesh castShadow material={rowIdx % 2 === 0 ? materials.cropGreenDark : materials.cropGreenLight}>
                                <cylinderGeometry args={[0.35, 0.2, 0.4, 6]} />
                            </mesh>
                            {/* Fruits (Tomates mûres) */}
                            <mesh position={[0.2, 0.2, 0.1]} material={materials.tomatoRed}>
                                <sphereGeometry args={[0.07, 8, 8]} />
                            </mesh>
                            <mesh position={[-0.2, 0.15, -0.1]} material={materials.tomatoRed}>
                                <sphereGeometry args={[0.06, 8, 8]} />
                            </mesh>
                        </group>
                    ))}
                </group>
            ))}

            {/* ---------------------------------------------------- */}
            {/* D. ARMATURE MÉTALLIQUE EN ALUMINIUM (POTEAUX & FERMES)*/}
            {/* ---------------------------------------------------- */}
            {/* Poteaux verticaux d'angle et intermédiaires */}
            {[-4.8, -1.6, 1.6, 4.8].map((x, i) => (
                <React.Fragment key={i}>
                    {[-2.9, 2.9].map((z, j) => (
                        <mesh key={`${i}-${j}`} position={[x, 1.4, z]} material={materials.aluminumFrame}>
                            <boxGeometry args={[0.08, 2.4, 0.08]} />
                        </mesh>
                    ))}
                </React.Fragment>
            ))}

            {/* Poutres sablières horizontales supérieures */}
            <mesh position={[0, 2.6, -2.9]} material={materials.aluminumFrame}>
                <boxGeometry args={[9.8, 0.08, 0.08]} />
            </mesh>
            <mesh position={[0, 2.6, 2.9]} material={materials.aluminumFrame}>
                <boxGeometry args={[9.8, 0.08, 0.08]} />
            </mesh>

            {/* Poutre faîtière (Sommet du toit) */}
            <mesh position={[0, 3.8, 0]} material={materials.aluminumFrame}>
                <boxGeometry args={[9.8, 0.08, 0.08]} />
            </mesh>

            {/* Chevrons inclinés du toit à deux versants */}
            {[-4.8, -1.6, 1.6, 4.8].map((x, i) => (
                <group key={i} position={[x, 0, 0]}>
                    {/* Versant avant */}
                    <mesh position={[0, 3.2, 1.45]} rotation={[Math.PI / 4.8, 0, 0]} material={materials.aluminumFrame}>
                        <boxGeometry args={[0.06, 3.2, 0.06]} />
                    </mesh>
                    {/* Versant arrière */}
                    <mesh position={[0, 3.2, -1.45]} rotation={[-Math.PI / 4.8, 0, 0]} material={materials.aluminumFrame}>
                        <boxGeometry args={[0.06, 3.2, 0.06]} />
                    </mesh>
                </group>
            ))}

            {/* ---------------------------------------------------- */}
            {/* E. PAROIS & TOITURE EN VERRE PHYSIQUE TRANSLUCIDE    */}
            {/* ---------------------------------------------------- */}
            {/* Murs latéraux en verre */}
            <mesh position={[0, 1.4, 2.9]} material={materials.polycarbonateGlass}>
                <boxGeometry args={[9.6, 2.3, 0.02]} />
            </mesh>
            <mesh position={[0, 1.4, -2.9]} material={materials.polycarbonateGlass}>
                <boxGeometry args={[9.6, 2.3, 0.02]} />
            </mesh>
            {/* Pignons en verre */}
            <mesh position={[-4.8, 1.4, 0]} material={materials.polycarbonateGlass}>
                <boxGeometry args={[0.02, 2.3, 5.7]} />
            </mesh>
            <mesh position={[4.8, 1.4, 0]} material={materials.polycarbonateGlass}>
                <boxGeometry args={[0.02, 2.3, 5.7]} />
            </mesh>

            {/* Pans de toiture inclinés */}
            <mesh position={[0, 3.2, 1.45]} rotation={[Math.PI / 4.8, 0, 0]} material={materials.polycarbonateGlass}>
                <boxGeometry args={[9.6, 3.1, 0.03]} />
            </mesh>
            <mesh position={[0, 3.2, -1.45]} rotation={[-Math.PI / 4.8, 0, 0]} material={materials.polycarbonateGlass}>
                <boxGeometry args={[9.6, 3.1, 0.03]} />
            </mesh>

            {/* Lucarne d'aération supérieure entrouverte (Ventilation dynamique) */}
            <group position={[1.6, 3.3, 1.45]} rotation={[Math.PI / 3.8, 0, 0]}>
                <mesh material={materials.polycarbonateGlass}>
                    <boxGeometry args={[2.8, 1.0, 0.03]} />
                </mesh>
                <mesh position={[0, 0, 0]} material={materials.aluminumFrame}>
                    <boxGeometry args={[2.84, 1.04, 0.04]} />
                </mesh>
            </group>

            {/* ---------------------------------------------------- */}
            {/* F. PROJECTEURS HORTICOLES SUSPENDUS (ÉCLAIRAGE LED)   */}
            {/* ---------------------------------------------------- */}
            {[-2.6, 2.6].map((x, i) => (
                <group key={i} position={[x, 2.7, 0]}>
                    {/* Rampe LED */}
                    <mesh material={materials.aluminumFrame}>
                        <boxGeometry args={[0.25, 0.08, 4.8]} />
                    </mesh>
                    {/* Émetteurs lumineux */}
                    <mesh position={[0, -0.05, 0]} material={materials.ledFixture}>
                        <boxGeometry args={[0.18, 0.02, 4.6]} />
                    </mesh>
                </group>
            ))}
        </group>
    );
}

// ============================================================================
// 2. COMPOSANT PRINCIPAL DU CANVAS 3D (LIGHT MODE OPTIMISÉ)
// ============================================================================

export interface Greenhouse3DSceneProps {
    className?: string;
}

/**
 * Scène 3D complète configurée selon les directives du Dashboard Light Mode :
 * - Fond transparent (alpha={true})
 * - Éclairage doux avec ombres portées
 * - Environnement HDR 'city' pour les reflets sur le verre
 * - OrbitControls à rotation automatique élégante
 * - Ombre de contact douce sous le socle
 */
export default function Greenhouse3DScene({ className }: Greenhouse3DSceneProps) {
    return (
        <div className={className || "relative w-full max-w-[600px] aspect-[4/3] flex items-center justify-center"}>
            <Canvas
                gl={{ alpha: true, antialias: true }}
                camera={{ position: [10, 8, 10], fov: 45 }}
                shadows
            >
                {/* Éclairage adapté au thème clair */}
                <ambientLight intensity={0.65} />
                <directionalLight
                    position={[5, 10, 5]}
                    intensity={1.5}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                    shadow-bias={-0.0001}
                />
                <directionalLight position={[-6, 8, -4]} intensity={0.4} />

                {/* Reflets environnementaux sur les vitres */}
                <Environment preset="city" />

                {/* Modèle de la serre sur son socle */}
                <Float speed={1.2} rotationIntensity={0.05} floatIntensity={0.15}>
                    <GreenhouseModel />
                </Float>

                {/* Ombre de contact douce sous le socle */}
                <ContactShadows
                    position={[0, -0.42, 0]}
                    opacity={0.4}
                    scale={20}
                    blur={2.2}
                    far={4.5}
                    color="#1e293b"
                />

                {/* Contrôles de caméra avec rotation douce */}
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate={true}
                    autoRotateSpeed={0.5}
                    maxPolarAngle={Math.PI / 2.2}
                    minPolarAngle={Math.PI / 4}
                />
            </Canvas>
        </div>
    );
}
