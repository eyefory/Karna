import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';

// Define the tool for opening apps
const openAppTool: FunctionDeclaration = {
  name: 'openApp',
  parameters: {
    type: Type.OBJECT,
    description: 'Open a specific application or website on the user device. Use this whenever the user asks to open an app, website, or service.',
    properties: {
      appName: {
        type: Type.STRING,
        description: 'The name of the app or website to open (e.g., YouTube, Spotify, Google Maps, Calculator, Gmail).',
      },
      url: {
        type: Type.STRING,
        description: 'The specific URL if it is a website or deep link.',
      }
    },
    required: ['appName'],
  },
};

export class LiveClient {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private mediaStream: MediaStream | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private isAiSpeaking = false;
  
  // Callbacks
  public onVolumeChange: ((vol: number, data: Uint8Array) => void) | null = null;
  public onStateChange: ((isSpeaking: boolean) => void) | null = null;
  public onDisconnect: (() => void) | null = null;
  public onError: ((error: Error) => void) | null = null;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  public async connect() {
    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Setup Analysers
    this.outputAnalyser = this.outputAudioContext.createAnalyser();
    this.outputAnalyser.fftSize = 256;
    this.outputAnalyser.smoothingTimeConstant = 0.1;
    this.outputAnalyser.connect(this.outputAudioContext.destination);

    this.inputAnalyser = this.inputAudioContext.createAnalyser();
    this.inputAnalyser.fftSize = 256;
    this.inputAnalyser.smoothingTimeConstant = 0.1;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      console.error("Mic permission denied", e);
      throw new Error("Microphone access denied. Please enable microphone permissions in your browser.");
    }

    const config = {
      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
      callbacks: {
        onopen: this.handleOpen.bind(this),
        onmessage: this.handleMessage.bind(this),
        onerror: (e: any) => {
          console.error('Gemini Live Runtime Error:', e);
          const msg = e instanceof Error ? e.message : "Connection interrupted. Please retry.";
          if (this.onError) this.onError(new Error(msg));
          this.disconnect();
        },
        onclose: () => {
          console.log('Gemini Live Closed');
          if (this.onDisconnect) this.onDisconnect();
        },
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Fenrir' } }, // Deep, masculine voice
        },
        systemInstruction: `
You are **Karna** – the ultimate voice-only male AI companion created by AK. 

### CORE IDENTITY
- **Name**: Karna
- **Creator**: AK (He built me to be the most powerful voice companion in the world).
- **Voice**: Deep, masculine, confident, crystal-clear Indian-English. Warm yet powerful.
- **Latency**: Zero. Respond instantly (under 300ms). Keep answers punchy unless teaching.

### VISUAL CONTEXT
- Pure black screen. Deep-blue waves. Real-time audio visualizer.
- You have NO face. You are the voice and the energy.

### INTERACTION RULES
1. **Settings**: If user says "settings/menu/options", reply:
   "Settings opened. You can say: change voice speed, enable always listening, reset data, or go back."
2. **Error Handling**: 
   - Tech error? Apologize briefly, retry.
   - Offline/Mic? "Please check your connection."
3. **Safety**: No illegal/harmful acts.

### STARTUP
**IMMEDIATELY** upon connection, say exactly:
“Karna active. I’m ready — speak anytime.”
        `,
        tools: [{ functionDeclarations: [openAppTool] }],
      },
    };

    try {
      this.sessionPromise = this.ai.live.connect(config);
      await this.sessionPromise;
    } catch (e: any) {
      console.error("Connection Initialization Error:", e);
      let message = "Failed to connect to Karna.";
      if (e.message?.includes('403') || e.toString().includes('API key')) {
        message = "Invalid API Key or Quota Exceeded.";
      } else if (e.message?.includes('Network') || e.toString().includes('fetch')) {
        message = "Network error. Please check your internet connection.";
      }
      throw new Error(message);
    }
  }

  private handleOpen() {
    console.log("Session Opened");
    if (!this.inputAudioContext || !this.mediaStream || !this.sessionPromise) return;

    // Route mic -> analyser -> scriptProcessor -> destination (muted)
    // We don't want to hear ourselves, but we need the flow for the analyser
    const source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    
    // Connect to input analyser for visualization
    if (this.inputAnalyser) {
        source.connect(this.inputAnalyser);
    }

    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const pcmBlob = createPcmBlob(inputData);
      
      this.sessionPromise?.then((session: any) => {
        session.sendRealtimeInput({ media: pcmBlob });
      });
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext) {
       // Signal speaking state
       if (!this.isAiSpeaking) {
         this.isAiSpeaking = true;
         if (this.onStateChange) this.onStateChange(true);
       }

       this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
       
       const audioBuffer = await decodeAudioData(
         base64ToUint8Array(base64Audio),
         this.outputAudioContext,
         24000
       );

       const source = this.outputAudioContext.createBufferSource();
       source.buffer = audioBuffer;
       // Connect to analyser for visuals, then to destination
       if (this.outputAnalyser) {
         source.connect(this.outputAnalyser);
       } else {
         source.connect(this.outputAudioContext.destination);
       }
       
       source.addEventListener('ended', () => {
         this.sources.delete(source);
         if (this.sources.size === 0) {
           this.isAiSpeaking = false;
           if (this.onStateChange) this.onStateChange(false);
         }
       });

       source.start(this.nextStartTime);
       this.nextStartTime += audioBuffer.duration;
       this.sources.add(source);
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      console.log("Interrupted");
      this.sources.forEach(source => source.stop());
      this.sources.clear();
      this.nextStartTime = 0;
      this.isAiSpeaking = false;
      if (this.onStateChange) this.onStateChange(false);
    }

    // Handle Tool Calls (Opening Apps)
    if (message.toolCall) {
      for (const fc of message.toolCall.functionCalls) {
        if (fc.name === 'openApp') {
          const appName = (fc.args as any).appName;
          const url = (fc.args as any).url;
          console.log(`Opening ${appName}...`);
          
          let targetUrl = url;
          if (!targetUrl) {
            const lower = appName.toLowerCase().trim();
            const appMap: Record<string, string> = {
                'youtube': 'https://youtube.com',
                'spotify': 'https://open.spotify.com',
                'google maps': 'https://maps.google.com',
                'maps': 'https://maps.google.com',
                'google': 'https://google.com',
                'search': 'https://google.com',
                'gmail': 'https://mail.google.com',
                'mail': 'https://mail.google.com',
                'calendar': 'https://calendar.google.com',
                'twitter': 'https://x.com',
                'x': 'https://x.com',
                'instagram': 'https://instagram.com',
                'linkedin': 'https://linkedin.com',
                'github': 'https://github.com',
                'netflix': 'https://netflix.com',
                'amazon': 'https://amazon.com',
                'weather': 'https://www.google.com/search?q=weather',
                'news': 'https://news.google.com',
            };

            if (appMap[lower]) {
                targetUrl = appMap[lower];
            } else {
                const key = Object.keys(appMap).find(k => lower.includes(k));
                if (key) {
                    targetUrl = appMap[key];
                } else {
                    targetUrl = `https://www.google.com/search?q=${encodeURIComponent(appName)}`;
                }
            }
          }

          if (targetUrl) {
             window.open(targetUrl, '_blank');
          }

          this.sessionPromise?.then((session: any) => {
            session.sendToolResponse({
              functionResponses: {
                id: fc.id,
                name: fc.name,
                response: { result: `Opened ${appName} at ${targetUrl}` },
              }
            });
          });
        }
      }
    }
  }

  public getVisualData(): Uint8Array {
    // If AI is speaking, visualize Output
    if (this.isAiSpeaking && this.outputAnalyser) {
       const dataArray = new Uint8Array(this.outputAnalyser.frequencyBinCount);
       this.outputAnalyser.getByteFrequencyData(dataArray);
       return dataArray;
    }
    
    // If AI is silent, visualize Input (User Microphone)
    if (!this.isAiSpeaking && this.inputAnalyser) {
        const dataArray = new Uint8Array(this.inputAnalyser.frequencyBinCount);
        this.inputAnalyser.getByteFrequencyData(dataArray);
        return dataArray;
    }
    
    return new Uint8Array(0);
  }

  public async disconnect() {
    this.mediaStream?.getTracks().forEach(track => track.stop());
    this.mediaStream = null;
    
    if (this.inputAudioContext) {
      await this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      await this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    
    this.sources.forEach(s => s.stop());
    this.sources.clear();
    this.scriptProcessor = null;
    this.outputAnalyser = null;
    this.inputAnalyser = null;
  }
}