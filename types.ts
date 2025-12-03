export enum AppState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  IDLE = 'IDLE',      // Connected, waiting for user
  LISTENING = 'LISTENING', // User is speaking (managed via logic, though Live API is continuous)
  THINKING = 'THINKING',   // Model is processing
  SPEAKING = 'SPEAKING',   // Model is outputting audio
}

export interface VisualizerData {
  volume: number; // 0 to 1
  frequencyData: Uint8Array;
}

export interface AppConfig {
  appOpenAction?: (appName: string) => void;
}
