import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Tower3DProps {
  multiplier: number;
  gameState: 'waiting' | 'running' | 'crashed' | 'results';
  integrity: number;
}

const Tower3D: React.FC<Tower3DProps> = ({ multiplier, gameState, integrity }) => {
  const groupRef = useRef<THREE.Group>(null);
  const blocksRef = useRef<THREE.Mesh[]>([]);
  const crashAnimationRef = useRef<number>(0);
  const isCrashedRef = useRef(false);
  const finalMultiplierRef = useRef<number>(1.0);

  // Reset crash animation when game state changes
  useEffect(() => {
    if (gameState === 'crashed') {
      isCrashedRef.current = true;
      crashAnimationRef.current = 0;
      finalMultiplierRef.current = multiplier; // Store final multiplier
    } else if (gameState === 'waiting') {
      isCrashedRef.current = false;
      crashAnimationRef.current = 0;
      finalMultiplierRef.current = 1.0;
    }
  }, [gameState, multiplier]);

  // Calculate number of blocks based on multiplier and game state
  const numBlocks = useMemo(() => {
    if (gameState === 'crashed' || gameState === 'results') {
      // When crashed or in results, show final tower height and stop growing
      return Math.min(Math.floor(finalMultiplierRef.current * 2), 15);
    }
    // During game, calculate based on current multiplier
    return Math.min(Math.floor(multiplier * 2), 15);
  }, [multiplier, gameState]);

  // Compute a scale factor so the tower stays within view height
  const groupScale = useMemo(() => {
    const blockHeight = 0.8;
    const margin = 1.8; // space for texts
    const actualHeight = Math.max(0.1, numBlocks * blockHeight + margin);
    const desiredHeight = 8.0; // keep within ~8 units in view for better tower visibility
    const scale = Math.min(1, desiredHeight / actualHeight);
    return scale;
  }, [numBlocks]);

  // Create blocks with proper positioning
  const blocks = useMemo(() => {
    const blockArray = [];
    for (let i = 0; i < numBlocks; i++) {
      blockArray.push({
        id: i,
        position: [0, i * 0.8, 0],
        color: i === numBlocks - 1 ? '#22c55e' : '#10b981', // Green colors
        opacity: 0.8,
        originalPosition: [0, i * 0.8, 0],
      });
    }
    return blockArray;
  }, [numBlocks]);

  // Animation - optimized for faster updates
  useFrame((state) => {
    if (groupRef.current) {
      // Apply dynamic scale
      groupRef.current.scale.set(groupScale, groupScale, groupScale);
      
      // Gentle rotation only when not crashed - smoother for faster updates
      if (!isCrashedRef.current && gameState === 'running') {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
      }
      
      // Handle crash animation - faster for better responsiveness
      if (isCrashedRef.current) {
        crashAnimationRef.current += 0.08; // Increased from 0.05 for faster crash animation
        
        // Animate blocks falling
        blocks.forEach((block, index) => {
          if (blocksRef.current[index]) {
            const mesh = blocksRef.current[index];
            const fallProgress = Math.min(crashAnimationRef.current, 1);
            
            // Add random fall direction
            const fallX = (Math.random() - 0.5) * 2 * fallProgress;
            const fallZ = (Math.random() - 0.5) * 2 * fallProgress;
            const fallY = -fallProgress * 2; // Fall down
            
            mesh.position.x = block.originalPosition[0] + fallX;
            mesh.position.y = block.originalPosition[1] + fallY;
            mesh.position.z = block.originalPosition[2] + fallZ;
            
            // Add rotation during fall
            mesh.rotation.x += 0.1 * fallProgress;
            mesh.rotation.z += 0.1 * fallProgress;
          }
        });
      } else {
        // Normal floating animation for blocks when not crashed
        blocks.forEach((block, index) => {
          if (blocksRef.current[index]) {
            const mesh = blocksRef.current[index];
            // Reset to original position
            mesh.position.x = block.originalPosition[0];
            mesh.position.z = block.originalPosition[2];
            
            // Floating animation
            mesh.position.y = block.originalPosition[1] + Math.sin(state.clock.elapsedTime * 2 + index * 0.5) * 0.05;
            
            // Reset rotation
            mesh.rotation.x = 0;
            mesh.rotation.z = 0;
          }
        });
      }
    }
  });

  // Safety check to ensure all props are defined - AFTER all hooks
  if (!gameState || multiplier === undefined || integrity === undefined) {
    console.warn('Tower3D: Missing props:', { gameState, multiplier, integrity });
    return null; // Don't render until props are ready
  }

  // Get color based on game state and integrity
  const getTowerColor = (blockIndex: number) => {
    if (gameState === 'crashed' || gameState === 'results') {
      return '#ef4444'; // Red when crashed or in results
    }
    
    if (gameState === 'running') {
      // Color based on integrity and position
      if (integrity > 80) {
        return blockIndex === numBlocks - 1 ? '#22c55e' : '#10b981'; // Green
      } else if (integrity > 50) {
        return blockIndex === numBlocks - 1 ? '#eab308' : '#ca8a04'; // Yellow
      } else if (integrity > 20) {
        return blockIndex === numBlocks - 1 ? '#f97316' : '#ea580c'; // Orange
      } else {
        return blockIndex === numBlocks - 1 ? '#ef4444' : '#dc2626'; // Red
      }
    }
    
    return '#6b7280'; // Gray when waiting
  };

  // Get material properties based on game state
  const getMaterialProps = (blockIndex: number) => {
    const color = getTowerColor(blockIndex);
    
    if (gameState === 'crashed' || gameState === 'results') {
      return {
        color,
        transparent: true,
        opacity: 0.6,
        roughness: 0.8,
        metalness: 0.2
      };
    }
    
    return {
      color,
      transparent: true,
      opacity: 0.8,
      roughness: 0.3,
      metalness: 0.7
    };
  };

  // Get display multiplier based on game state
  const getDisplayMultiplier = () => {
    if (gameState === 'crashed' || gameState === 'results') {
      return finalMultiplierRef.current;
    }
    return multiplier;
  };

  return (
    <group ref={groupRef}>
      {/* Base platform */}
      <Box args={[4, 0.2, 4]} position={[0, -0.1, 0]}>
        <meshStandardMaterial color="#1f2937" />
      </Box>

      {/* Tower blocks */}
      {blocks.map((block, index) => (
        <Box
          key={block.id}
          ref={(el) => {
            if (el) blocksRef.current[index] = el;
          }}
          args={[1.5, 0.6, 1.5]}
          position={block.position as [number, number, number]}
        >
          <meshStandardMaterial {...getMaterialProps(index)} />
        </Box>
      ))}

      {/* Multiplier text */}
      <Text
        position={[0, numBlocks * 0.8 + 1, 0]}
        fontSize={0.5}
        color={gameState === 'crashed' || gameState === 'results' ? '#ef4444' : '#22c55e'}
        anchorX="center"
        anchorY="middle"
      >
        {getDisplayMultiplier().toFixed(2)}x
      </Text>

      {/* Integrity text */}
      <Text
        position={[0, numBlocks * 0.8 + 0.5, 0]}
        fontSize={0.3}
        color={gameState === 'crashed' || gameState === 'results' ? '#ef4444' : '#9ca3af'}
        anchorX="center"
        anchorY="middle"
      >
        Integrity: {gameState === 'crashed' || gameState === 'results' ? '0' : integrity}%
      </Text>

      {/* Game state indicator */}
      <Text
        position={[0, -1, 0]}
        fontSize={0.4}
        color={gameState === 'running' ? '#22c55e' : 
               gameState === 'crashed' ? '#ef4444' : 
               gameState === 'results' ? '#eab308' : '#6b7280'}
        anchorX="center"
        anchorY="middle"
      >
        {gameState === 'crashed' ? 'CRASHED!' : 
         gameState === 'results' ? 'VICTORY LAP!' : 
         (gameState || 'WAITING').toUpperCase()}
      </Text>

      {/* Crash effect particles when crashed */}
      {(gameState === 'crashed' || gameState === 'results') && (
        <>
          {/* Red glow effect */}
          <Box args={[6, 0.1, 6]} position={[0, -0.2, 0]}>
            <meshStandardMaterial 
              color="#ef4444" 
              transparent 
              opacity={0.3}
              emissive="#ef4444"
              emissiveIntensity={0.5}
            />
          </Box>
        </>
      )}
    </group>
  );
};

export default Tower3D;
