import React from 'react';
import { AppState } from '../types';

interface WhaleIconProps {
  state: AppState;
}

const WhaleIcon: React.FC<WhaleIconProps> = ({ state }) => {
  const isThinking = state === AppState.THINKING;
  const isSpeaking = state === AppState.SPEAKING;
  
  return (
    <div className={`relative z-10 w-64 h-64 md:w-96 md:h-96 transition-transform duration-700 ${isThinking ? 'animate-whale-think' : ''} ${isSpeaking ? 'animate-sway' : ''}`}>
      {/* Whale SVG Silhouette */}
      <svg 
        viewBox="0 0 512 512" 
        className="w-full h-full drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]"
        fill="currentColor"
      >
         <defs>
            <linearGradient id="whaleGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.95" /> {/* Blue 900 */}
              <stop offset="100%" stopColor="#172554" stopOpacity="0.8" /> {/* Blue 950 */}
            </linearGradient>
          </defs>
        <path 
          d="M416.2,168.6c-4.4-1.5-8.9-2.6-13.6-3.2c-15.6-2.1-31.1,2.8-44.4,11.5c-9.6,6.3-18.4,14-26.6,22.3
          c-11.4,11.5-22.1,23.8-32.9,35.8c-10.7,11.9-21.6,23.7-33.8,33.9c-10.3,8.7-21.7,15.6-33.9,20.5c-3.1,1.2-6.2,2.3-9.4,3.1
          c-29.3,7.6-60.5-0.3-84.6-19.6c-2.8-2.3-5.5-4.7-8-7.3c-1.8-1.8-3.4-3.8-5-5.8c-13.3-17.1-16.7-40-8.8-60.2
          c2.3-6,5.6-11.6,9.6-16.6c1.3-1.6,2.7-3.1,4.1-4.6c20.3-21.2,50.7-30.2,79.5-25.1c4.8,0.9,9.4,2.3,13.9,4.2
          c16.3,6.8,29.9,18.9,38.8,33.9c1.6,2.7,4.3,4.4,7.4,4.7c3.1,0.3,6.2-1.1,8.1-3.6c2.7-3.6,5.8-7,9.2-10.1
          c13.7-12.8,32.2-19.3,50.8-18.3c15.8,0.8,30.8,7,42.4,17.4c0.8,0.7,1.6,1.4,2.4,2.1c0.7-1.1,1.5-2.2,2.3-3.2
          c9-11.2,20.8-19.8,34.2-24.8c4.2-1.6,8.6-2.8,13-3.6c24.6-4.5,49.9,2.8,67.6,19.9c10.3,10,17.2,23.1,19.6,37.3
          c0.6,3.4,0.8,6.8,0.7,10.2C508.4,209,484,192.1,416.2,168.6z M125.6,366.1c-15,0-29.8-3.6-43.2-10.6
          c-18.6-9.7-33.3-24.7-41.9-43.6c-8.6-18.9-10.7-40.1-5.9-60.4c4.8-20.3,16.5-38.1,33.2-50.6c2.8-2.1,5.8-4,8.8-5.8
          c1.6-0.9,3.1-1.9,4.7-2.7c1.5-0.8,3.1-1.5,4.7-2.2c36.1-15.6,78.2-8.3,107.5,18.7c2,1.8,3.9,3.7,5.7,5.7
          c12.3,13.6,21.9,29.2,29.2,46.1c1.3,3,2.4,6.1,3.4,9.2c2,6.5,3.1,13.3,3.3,20.1c0.2,8.9-1.4,17.7-4.6,26
          C217.4,346,173.8,366.1,125.6,366.1z"
          fill="url(#whaleGradient)"
          className="text-blue-900"
        />
      </svg>
    </div>
  );
};

export default WhaleIcon;