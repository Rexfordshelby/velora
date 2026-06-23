import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'

export default function MobilityScene({ variant = 'panel' }: { variant?: 'hero' | 'panel' }) {
  return (
    <Canvas
      className="!h-full !w-full"
      camera={{ position: [0, 2.8, 7.5], fov: 48 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.75} />
      <directionalLight position={[3, 5, 4]} intensity={1.8} />
      <pointLight color="#f6c94c" intensity={variant === 'hero' ? 95 : 35} position={[0, 2.6, 2.8]} />
      <AnimatedFleet scale={variant === 'hero' ? 1.16 : 0.78} />
    </Canvas>
  )
}

function AnimatedFleet({ scale }: { scale: number }) {
  const group = useRef<Group>(null)
  const pulse = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()

    if (group.current) {
      group.current.rotation.y = Math.sin(elapsed * 0.24) * 0.22
      group.current.position.y = Math.sin(elapsed * 0.8) * 0.05
    }

    if (pulse.current) {
      const pulseScale = 1 + Math.sin(elapsed * 1.8) * 0.08
      pulse.current.scale.set(pulseScale, pulseScale, pulseScale)
    }
  })

  return (
    <group ref={group} scale={scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, 0]}>
        <torusGeometry args={[2.2, 0.018, 16, 96]} />
        <meshStandardMaterial color="#0f766e" emissive="#0f766e" emissiveIntensity={0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 6]} position={[0, -1.2, 0]}>
        <torusGeometry args={[3.05, 0.012, 16, 112]} />
        <meshStandardMaterial color="#f6c94c" emissive="#f6c94c" emissiveIntensity={0.55} />
      </mesh>
      <mesh ref={pulse} position={[0, -1.05, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.08, 32]} />
        <meshStandardMaterial color="#f6c94c" emissive="#f6c94c" emissiveIntensity={1.5} />
      </mesh>
      {[
        [-1.5, -0.72, 0.55, '#0f766e'],
        [1.25, -0.62, -0.92, '#f6c94c'],
        [0.2, -0.48, 1.55, '#ffffff'],
      ].map(([x, y, z, color], index) => (
        <group key={`${x}-${z}`} position={[Number(x), Number(y), Number(z)]} rotation={[0, index * 0.75, 0]}>
          <mesh>
            <boxGeometry args={[0.58, 0.16, 0.34]} />
            <meshStandardMaterial color={String(color)} metalness={0.35} roughness={0.28} />
          </mesh>
          <mesh position={[0, 0.12, 0]}>
            <boxGeometry args={[0.34, 0.16, 0.24]} />
            <meshStandardMaterial color="#111816" metalness={0.2} roughness={0.18} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.7, 32, 16]} />
        <meshStandardMaterial color="#0f766e" transparent opacity={0.17} roughness={0.2} metalness={0.2} />
      </mesh>
    </group>
  )
}
