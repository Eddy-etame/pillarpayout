import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';

interface GameCanvasProps {
  width: number;
  height: number;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { currentRound, isGameActive, roundTime, multiplier, integrity } = useGameStore();

  // Particle system for floating particles
  const particles = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
  }>>([]);

  // Initialize particles
  useEffect(() => {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
    particles.current = Array.from({ length: 50 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 3 + 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: Math.random() * 0.5 + 0.3
    }));
  }, [width, height]);

  // Update and draw particles
  const updateParticles = (ctx: CanvasRenderingContext2D) => {
    particles.current.forEach(particle => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Wrap around edges
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;

      // Draw particle
      ctx.save();
      ctx.globalAlpha = particle.alpha;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  };

  // Draw 3D tower with gradient and glow effect
  const drawTower = (ctx: CanvasRenderingContext2D) => {
    const centerX = width / 2;
    const baseY = height - 50;
    const towerHeight = 200;
    const towerWidth = 40;

    // Tower shadow
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(centerX - towerWidth/2 + 5, baseY + 5, towerWidth, towerHeight);
    ctx.restore();

    // Main tower body with gradient
    const gradient = ctx.createLinearGradient(centerX - towerWidth/2, baseY, centerX + towerWidth/2, baseY);
    gradient.addColorStop(0, '#00ff88');
    gradient.addColorStop(0.5, '#00cc66');
    gradient.addColorStop(1, '#00994d');

    ctx.save();
    ctx.fillStyle = gradient;
    ctx.fillRect(centerX - towerWidth/2, baseY - towerHeight, towerWidth, towerHeight);

    // Add 3D effect with highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(centerX - towerWidth/2, baseY - towerHeight, towerWidth/4, towerHeight);

    // Add glow effect
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 20;
    ctx.fillStyle = 'rgba(0, 255, 136, 0.1)';
    ctx.fillRect(centerX - towerWidth/2 - 10, baseY - towerHeight - 10, towerWidth + 20, towerHeight + 20);
    ctx.restore();

    // Tower base
    ctx.save();
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(centerX - towerWidth/2 - 10, baseY, towerWidth + 20, 20);
    ctx.restore();

    // Add tower segments for 3D effect
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const segmentHeight = towerHeight / segments;
      const segmentY = baseY - towerHeight + (i * segmentHeight);
      
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX - towerWidth/2, segmentY);
      ctx.lineTo(centerX + towerWidth/2, segmentY);
      ctx.stroke();
      ctx.restore();
    }
  };

  // Draw multiplier display
  const drawMultiplier = (ctx: CanvasRenderingContext2D) => {
    const centerX = width / 2;
    const displayY = 80;

    // Background panel
    ctx.save();
    ctx.fillStyle = '#2a2a2a';
    // Draw rounded rectangle manually
    const x = centerX - 80;
    const y = displayY - 30;
    const w = 160;
    const h = 60;
    const r = 10;
    
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Multiplier text
    ctx.save();
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${multiplier.toFixed(2)}x`, centerX, displayY);
    ctx.restore();

    // Integrity text
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Integrity: ${integrity}%`, centerX, displayY + 20);
    ctx.restore();
  };

  // Draw connection status
  const drawConnectionStatus = (ctx: CanvasRenderingContext2D) => {
    const statusX = 20;
    const statusY = 20;

    // Status background
    ctx.save();
    ctx.fillStyle = '#00ff88';
    // Draw rounded rectangle manually
    const x = statusX;
    const y = statusY;
    const w = 100;
    const h = 30;
    const r = 15;
    
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Status text
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Connected', statusX + 50, statusY + 20);
    ctx.restore();

    // Wi-Fi icon
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(statusX + 20, statusY + 15, 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(statusX + 20, statusY + 15, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(statusX + 20, statusY + 15, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);

      // Update and draw particles
      updateParticles(ctx);

      // Draw tower
      drawTower(ctx);

      // Draw UI elements
      drawMultiplier(ctx);
      drawConnectionStatus(ctx);

      // Request next frame
      requestAnimationFrame(render);
    };

    render();
  }, [width, height, multiplier, integrity, isGameActive]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg border border-slate-700"
      />
      
      {/* Round info overlay */}
      <div className="absolute top-4 right-4 bg-slate-800 bg-opacity-80 p-3 rounded-lg">
        <div className="text-center">
          <div className="text-slate-400 text-sm">Round</div>
          <div className="text-white font-bold">#{currentRound}</div>
        </div>
      </div>

      {/* Game state overlay */}
      {!isGameActive && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
          <div className="text-center">
            <div className="text-white text-2xl font-bold mb-2">
              {isGameActive ? 'Game Running' : 'Waiting for next round...'}
            </div>
            <div className="text-slate-300">
              Round time: {(roundTime / 1000).toFixed(1)}s
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas; 