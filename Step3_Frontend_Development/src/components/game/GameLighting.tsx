import React from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

const GameLighting: React.FC = () => {
  const { scene } = useThree();

  React.useEffect(() => {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Add point light
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    return () => {
      scene.remove(ambientLight);
      scene.remove(pointLight);
    };
  }, [scene]);

  return null;
};

export default GameLighting;
