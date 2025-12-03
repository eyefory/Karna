import React from 'react';
import { AppState } from '../types';

interface KarnaAvatarProps {
  state: AppState;
}

const KarnaAvatar: React.FC<KarnaAvatarProps> = ({ state }) => {
  const isSpeaking = state === AppState.SPEAKING;
  const isThinking = state === AppState.THINKING;
  const isListening = state === AppState.LISTENING || state === AppState.IDLE;

  return (
    <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center transition-all duration-700">
        
        {/* Glow behind the face - subtle aura */}
        <div className={`absolute inset-0 rounded-full blur-[60px] transition-opacity duration-1000 ${isSpeaking ? 'bg-blue-900/40 opacity-80' : 'bg-blue-900/10 opacity-30'}`} />

        {/* The Face Container */}
        <div 
          className={`
            relative w-full h-full rounded-full overflow-hidden border-0 border-blue-900/20 shadow-2xl
            transition-all duration-500
            ${isSpeaking ? 'scale-[1.02] grayscale-0' : 'grayscale-[20%] scale-100'}
            ${isThinking ? 'animate-pulse' : ''}
          `}
        >
          {/* Realistic Face Image */}
          {/* Using a high-quality Unsplash image of an intense, handsome Indian man with dark/moody lighting */}
          <img 
            src="https://images.unsplash.com/photo-1615813967515-e1838c1c5116?q=80&w=800&auto=format&fit=crop" 
            alt="Karna" 
            className={`
              w-full h-full object-cover transform transition-transform duration-[2000ms]
              ${isSpeaking ? 'scale-110' : 'scale-100'}
              ${isListening ? 'scale-105' : ''}
            `}
          />
          
          {/* Gradient Overlay for blending into black background */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/80 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
        </div>
    </div>
  );
};

export default KarnaAvatar;