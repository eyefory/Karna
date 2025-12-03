import React, { useEffect, useRef } from 'react';
import { AppState } from '../types';

interface OceanVisualizerProps {
  state: AppState;
  getFrequencyData: () => Uint8Array;
}

const OceanVisualizer: React.FC<OceanVisualizerProps> = ({ state, getFrequencyData }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  // Particles for Thinking state
  const particlesRef = useRef<{x: number, y: number, r: number, speed: number, angle: number}[]>([]);

  useEffect(() => {
    // Initialize particles
    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 50; i++) {
        particlesRef.current.push({
          x: 0, 
          y: 0, 
          r: Math.random() * 2 + 1, 
          speed: Math.random() * 0.02 + 0.01,
          angle: Math.random() * Math.PI * 2
        });
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.scale(dpr, dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    window.addEventListener('resize', resize);
    resize();

    let time = 0;

    // Layer config: Deep Blue Palette
    const layers = [
      { color: 'rgba(2, 6, 23, 0.9)', speedMod: 0.2, ampMod: 0.4, yOffset: 0.1 }, // Darkest base
      { color: 'rgba(23, 37, 84, 0.6)', speedMod: 0.4, ampMod: 0.6, yOffset: 0.25 }, // Deep Blue
      { color: 'rgba(30, 58, 138, 0.5)', speedMod: 0.6, ampMod: 0.8, yOffset: 0.4 }, // Blue 800
      { color: 'rgba(37, 99, 235, 0.4)', speedMod: 0.8, ampMod: 1.0, yOffset: 0.5 }, // Blue 600
    ];

    const render = () => {
      if (!canvas || !ctx) return;
      
      const width = window.innerWidth;
      const height = window.innerHeight;
      const centerX = width / 2;
      const centerY = height / 2;

      // CLEAR - PURE BLACK
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      const isSpeaking = state === AppState.SPEAKING;
      const isThinking = state === AppState.THINKING;
      // We consider listening active for visuals if we are connected and not speaking
      // This includes IDLE state because getFrequencyData now returns Mic input in IDLE
      const isListening = state === AppState.LISTENING || state === AppState.IDLE;

      // Audio Reactivity
      let audioData = new Uint8Array(0);
      let audioAmp = 0;
      
      try {
        audioData = getFrequencyData();
        if (audioData.length > 0) {
          let sum = 0;
          const bassRange = Math.floor(audioData.length * 0.5); // Check more frequencies
          for(let i = 0; i < bassRange; i++) sum += audioData[i];
          audioAmp = (sum / bassRange) / 255; 
        }
      } catch (e) { audioAmp = 0; }

      // Boost amplitude for more "alive" feel
      audioAmp = Math.pow(audioAmp, 0.8) * 1.5; 
      if (audioAmp > 1) audioAmp = 1;

      // --- GLOBAL SWAY & ROTATION ---
      ctx.save();
      
      let swayAmount = 0.01 + (audioAmp * 0.02);
      if (isSpeaking) swayAmount = 0.03;
      
      const swayX = Math.sin(time * 0.01) * width * swayAmount;
      const rotation = Math.cos(time * 0.005) * (0.005 + audioAmp * 0.01);
      
      ctx.translate(centerX + swayX, centerY);
      ctx.rotate(rotation);
      ctx.translate(-centerX, -centerY);


      // --- FLUID WAVE BACKGROUND ---
      
      let baseAmplitude = 30 + (audioAmp * 50);
      let baseSpeed = 0.005 + (audioAmp * 0.02);

      if (isSpeaking) {
        baseAmplitude = 60 + (audioAmp * 120); 
        baseSpeed = 0.02 + (audioAmp * 0.05);
      } 

      layers.forEach((layer, index) => {
        ctx.beginPath();
        ctx.fillStyle = layer.color;
        
        // Deepening the colors when thinking
        if (isThinking) ctx.fillStyle = layer.color.replace('0.6', '0.2').replace('0.5', '0.15');

        const baseline = height * (1 - (layer.yOffset * 0.5));
        const amplitude = baseAmplitude * layer.ampMod;
        const speed = baseSpeed * layer.speedMod;
        const frequency = 0.002 + (index * 0.001);

        ctx.moveTo(0, height);
        
        const step = 20; 
        for (let x = -100; x <= width + 100; x += step) {
          const y = baseline + 
                    Math.sin(x * frequency + time * speed) * amplitude + 
                    Math.cos(x * (frequency * 1.5) - time * (speed * 0.5)) * (amplitude * 0.5);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.fill();
      });

      // --- THINKING PARTICLES ---
      if (isThinking) {
        ctx.fillStyle = 'rgba(147, 197, 253, 0.6)'; // Light blue
        particlesRef.current.forEach((p, i) => {
           p.angle += p.speed;
           const radius = 100 + Math.sin(time * 0.02 + i) * 20;
           const px = centerX + Math.cos(p.angle) * radius;
           const py = centerY + Math.sin(p.angle) * radius;
           
           ctx.beginPath();
           ctx.arc(px, py, p.r, 0, Math.PI * 2);
           ctx.fill();
        });
        
        const pulse = 50 + Math.sin(time * 0.05) * 10;
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, pulse);
        gradient.addColorStop(0, 'rgba(30, 58, 138, 0.8)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- CENTRAL WAVEFORM (ALWAYS ACTIVE IF AUDIO PRESENT) ---
      if (audioData.length > 0 && audioAmp > 0.01) {
        ctx.beginPath();
        // Brighter blue when speaking, slightly deeper when listening
        const color = isSpeaking ? '191, 219, 254' : '59, 130, 246'; 
        const opacity = isSpeaking ? 0.9 : 0.6;
        
        ctx.strokeStyle = `rgba(${color}, ${opacity})`;
        ctx.lineWidth = isSpeaking ? 3 : 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const sliceWidth = width / audioData.length;
        let x = 0;
        const midY = centerY;

        for (let i = 0; i < audioData.length; i++) {
          const v = audioData[i] / 128.0; 
          const y = v * (isSpeaking ? 120 : 60); 
          
          if (i === 0) {
            ctx.moveTo(x, midY - y + (isSpeaking ? 120 : 60)); 
          } else {
             const yOffset = (audioData[i] - 128) * (isSpeaking ? 1.8 : 0.8);
             ctx.lineTo(x, midY + yOffset);
          }
          x += sliceWidth;
        }
        ctx.stroke();

        // Glow line
        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color}, ${opacity * 0.4})`;
        ctx.lineWidth = 8;
        x = 0;
        for (let i = 0; i < audioData.length; i++) {
             const yOffset = (audioData[i] - 128) * (isSpeaking ? 1.8 : 0.8);
             if (i===0) ctx.moveTo(x, midY + yOffset);
             else ctx.lineTo(x, midY + yOffset);
             x += sliceWidth;
        }
        ctx.stroke();
      }

      ctx.restore();

      time += 1;
      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [state, getFrequencyData]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 z-0 pointer-events-none"
    />
  );
};

export default OceanVisualizer;