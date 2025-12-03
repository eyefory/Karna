import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LiveClient } from './services/liveClient';
import { AppState } from './types';
import OceanVisualizer from './components/OceanVisualizer';

const API_KEY = process.env.API_KEY || '';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.DISCONNECTED);
  const [error, setError] = useState<string | null>(null);
  const [showIdleHelp, setShowIdleHelp] = useState(false);
  
  const liveClientRef = useRef<LiveClient | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fallback Text-to-Speech for system errors (Network/Mic)
  const speakSystemMessage = (text: string) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a deep male voice
    const voices = window.speechSynthesis.getVoices();
    const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('David') || v.name.includes('Daniel'));
    if (maleVoice) utterance.voice = maleVoice;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const handleStart = useCallback(async () => {
    if (!API_KEY) {
      const msg = "Missing API Key.";
      setError(msg);
      speakSystemMessage("I cannot function without an API key.");
      return;
    }
    
    // Prevent multiple calls
    if (appState === AppState.CONNECTING || appState === AppState.IDLE || appState === AppState.SPEAKING) return;

    setError(null);

    try {
      setAppState(AppState.CONNECTING);
      
      const client = new LiveClient(API_KEY);
      liveClientRef.current = client;

      client.onStateChange = (isSpeaking) => {
        setAppState(prev => {
          if (prev === AppState.DISCONNECTED) return prev;
          return isSpeaking ? AppState.SPEAKING : AppState.IDLE;
        });
      };

      client.onDisconnect = () => {
        setAppState(AppState.DISCONNECTED);
      };

      client.onError = (err) => {
        const msg = err.message || "Error occurred.";
        setError(msg);
        setAppState(AppState.DISCONNECTED);
        liveClientRef.current?.disconnect();
        
        // Voice feedback for system errors
        if (msg.includes("Microphone")) {
          speakSystemMessage("I need microphone access to hear you. Please enable it in your phone settings.");
        } else if (msg.includes("Network") || msg.includes("Failed to connect")) {
          speakSystemMessage("No connection detected. Working offline where possible.");
        } else {
          speakSystemMessage("Something went wrong. Let's try again.");
        }
      };

      await client.connect();
      setAppState(AppState.IDLE);
    } catch (err: any) {
      const msg = err.message || "Failed to start.";
      setError(msg);
      setAppState(AppState.DISCONNECTED);
      liveClientRef.current?.disconnect();
      speakSystemMessage("I could not connect. Please check your internet.");
    }
  }, [appState]);

  // Cleanup
  useEffect(() => {
    return () => {
      liveClientRef.current?.disconnect();
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, []);

  // Idle Timer Logic
  useEffect(() => {
    if (appState === AppState.IDLE) {
      idleTimerRef.current = setTimeout(() => {
        setShowIdleHelp(true);
      }, 5000);
    } else {
      setShowIdleHelp(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }
    return () => {
       if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [appState]);

  const getFrequencyData = useCallback(() => {
    if (liveClientRef.current) {
      return liveClientRef.current.getVisualData();
    }
    return new Uint8Array(0);
  }, []);

  const showActiveText = appState === AppState.IDLE && !showIdleHelp;

  return (
    <div 
      className="relative w-screen h-screen flex flex-col items-center justify-center overflow-hidden bg-black cursor-pointer select-none"
      onClick={handleStart} 
    >
      {/* Full Screen Background Visualizer */}
      <OceanVisualizer state={appState} getFrequencyData={getFrequencyData} />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end pb-12 transition-opacity duration-500">
        
        {/* Active Status */}
        {!error && showActiveText && (
            <div className="text-blue-200/50 text-[10px] font-light tracking-[0.4em] uppercase animate-pulse">
              KARNA IS ACTIVE
            </div>
        )}

        {/* Idle Help Text */}
        {!error && showIdleHelp && (
            <div className="text-blue-100/40 text-[12px] font-light tracking-widest text-center px-4 animate-fade-in">
              Speak "Hey Karna" or just start talking...
            </div>
        )}

        {/* Awakening Status */}
        {appState === AppState.CONNECTING && (
          <div className="text-blue-900/60 font-light tracking-[0.3em] text-[10px] animate-pulse">
            AWAKENING KARNA
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="text-red-500/80 font-mono text-[10px] tracking-widest text-center max-w-xs mb-8">
            {error} <br/> <span className="opacity-50 mt-2 block">TAP TO RETRY</span>
          </div>
        )}
        
        {/* Tap to Wake Prompt */}
        {appState === AppState.DISCONNECTED && !error && (
           <div className="text-blue-900/30 font-light tracking-[0.5em] text-[8px] animate-pulse mb-8">
             TAP TO WAKE
           </div>
        )}
      </div>
    </div>
  );
};

export default App;