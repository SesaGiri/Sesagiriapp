
import React, { useEffect, useRef, useState } from 'react';
import { Mic, Video, VideoOff, Activity, XCircle, Send, ChevronDown, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { getGeminiLiveClient } from '../services/geminiService';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../services/audioUtils';
import { Student, AttendanceStatus } from '../types';
import { LiveServerMessage, Modality } from '@google/genai';

interface LiveAttendanceProps {
  students: Student[];
  onLiveUpdate: (rollNo: string, status: AttendanceStatus) => void;
  onBulkUpdate: (status: AttendanceStatus) => void;
  onClose: () => void;
}

// Convert "one", "two" -> "1", "2"
const wordToNumber = (text: string): string => {
    const map: {[key: string]: string} = {
        'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
        'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
        'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15',
        'sixteen': '16', 'seventeen': '17', 'eighteen': '18', 'nineteen': '19', 'twenty': '20'
    };
    return text.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\b/gi, matched => map[matched.toLowerCase()] || matched);
};

const LiveAttendance: React.FC<LiveAttendanceProps> = ({ students, onLiveUpdate, onBulkUpdate, onClose }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false); 
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [textInput, setTextInput] = useState('');
  const [lastAction, setLastAction] = useState<string | null>(null);
  
  // Refs for Audio
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSessionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Refs for Callbacks (CRITICAL for fixing "not updating" bug)
  const onLiveUpdateRef = useRef(onLiveUpdate);
  const onBulkUpdateRef = useRef(onBulkUpdate);

  // Keep refs updated with latest props
  useEffect(() => {
      onLiveUpdateRef.current = onLiveUpdate;
      onBulkUpdateRef.current = onBulkUpdate;
  }, [onLiveUpdate, onBulkUpdate]);

  const markAttendanceTool = {
    name: 'markAttendance',
    description: 'Marks a student as present or absent based on their roll number.',
    parameters: {
      type: 'OBJECT',
      properties: {
        rollNo: { type: 'STRING', description: 'The roll number of the student' },
        status: { type: 'STRING', enum: ['PRESENT', 'ABSENT', 'LATE'] }
      },
      required: ['rollNo', 'status']
    }
  };

  const markAllTool = {
      name: 'markAllAttendance',
      description: 'Marks all students in the class with a specific status.',
      parameters: {
          type: 'OBJECT',
          properties: {
              status: { type: 'STRING', enum: ['PRESENT', 'ABSENT', 'LATE'] }
          },
          required: ['status']
      }
  };

  const toolsConfig = [{ functionDeclarations: [markAttendanceTool as any, markAllTool as any] }];
  
  const studentContextList = students.map(s => `Roll ${s.rollNo}: ${s.name}`).join(', ');
  
  const systemInstruction = `You are an attendance assistant. 
      Current Class List: ${studentContextList}.
      
      RULES:
      1. For "Mark all present except 1", FIRST call 'markAllAttendance(PRESENT)', THEN call 'markAttendance(1, ABSENT)'.
      2. For "Mark 1 and 2 present", call 'markAttendance' twice.
      3. Confirm actions concisely.
  `;

  // FORCE RESET FUNCTION
  const resetConnection = () => {
      console.log("Resetting connection state...");
      isConnectedRef.current = false;
      setIsConnected(false);
      setIsConnecting(false);

      if (activeSessionRef.current) {
          try { activeSessionRef.current.close(); } catch(e) { console.error(e); }
          activeSessionRef.current = null;
      }
      
      if (streamRef.current) {
          try { streamRef.current.getTracks().forEach(track => track.stop()); } catch(e) {}
          streamRef.current = null;
      }
      
      if (audioContextRef.current) {
          try { 
              if (audioContextRef.current.state !== 'closed') {
                  audioContextRef.current.close();
              }
          } catch(e) {}
          audioContextRef.current = null;
      }
      
      if (inputContextRef.current) {
          try { 
              if (inputContextRef.current.state !== 'closed') {
                  inputContextRef.current.close();
              }
          } catch(e) {}
          inputContextRef.current = null;
      }
  };

  const startSession = async () => {
    // If stuck in connecting state, force reset first
    if (isConnecting) {
        resetConnection();
        return;
    }
    if (isConnected) return;
    
    if (!navigator.onLine) {
        alert("No internet connection. Please check your network.");
        return;
    }

    let aiClient;
    try {
        aiClient = getGeminiLiveClient();
    } catch (e: any) {
        alert(e.message);
        return;
    }
    
    setIsConnecting(true);
    
    // Safety timeout
    const connectionTimeout = setTimeout(() => {
        if (!isConnectedRef.current && isConnecting) {
            console.warn("Connection timeout triggered");
            resetConnection();
            alert("Connection timed out. Please check your network and try again.");
        }
    }, 10000);

    try {
      // 1. Get Media Stream (with race timeout)
      const streamPromise = navigator.mediaDevices.getUserMedia({ audio: true });
      const timeoutPromise = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Mic permission timeout")), 8000));
      const stream = await Promise.race([streamPromise, timeoutPromise]) as MediaStream;
      
      if (!mountedRef.current) {
          stream.getTracks().forEach(t => t.stop());
          return; 
      }

      streamRef.current = stream;

      // 2. Setup Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      
      // CRITICAL: Resume audio context if suspended (browser autoplay policy)
      if (outputCtx.state === 'suspended') {
          await outputCtx.resume();
      }
      
      audioContextRef.current = outputCtx;
      inputContextRef.current = inputCtx;

      // 3. Connect to Gemini
      const session = await aiClient.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            if (!mountedRef.current) {
                resetConnection();
                return;
            }
            console.log("Live Session Opened");
            clearTimeout(connectionTimeout);
            isConnectedRef.current = true;
            setIsConnected(true);
            setIsConnecting(false);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (!mountedRef.current) return;

            if (msg.serverContent?.inputTranscription) {
                const transcript = msg.serverContent.inputTranscription.text;
                if (transcript) {
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'user' && !last.text.endsWith('.')) {
                             return [...prev.slice(0, -1), { role: 'user', text: transcript }];
                        }
                        return [...prev, { role: 'user', text: transcript }];
                    });
                    // Execute local command immediately for responsiveness
                    executeLocalCommand(transcript);
                }
            }

            if (msg.toolCall) {
                const responses = [];
                for (const fc of msg.toolCall.functionCalls) {
                    if (fc.name === 'markAttendance') {
                        const { rollNo, status } = fc.args as any;
                        const normalizedStatus = status.toUpperCase() as AttendanceStatus;
                        onLiveUpdateRef.current(String(rollNo), normalizedStatus);
                        setLastAction(`Marked Roll ${rollNo} ${normalizedStatus}`);
                        responses.push({ id: fc.id, name: fc.name, response: { result: "Success" } });
                        setMessages(prev => [...prev, { role: 'ai', text: `Marked Roll ${rollNo} as ${normalizedStatus}` }]);
                    } else if (fc.name === 'markAllAttendance') {
                        const { status } = fc.args as any;
                        const normalizedStatus = status.toUpperCase() as AttendanceStatus;
                        onBulkUpdateRef.current(normalizedStatus);
                        setLastAction(`Marked All ${normalizedStatus}`);
                        responses.push({ id: fc.id, name: fc.name, response: { result: "Success" } });
                        setMessages(prev => [...prev, { role: 'ai', text: `Marked everyone as ${normalizedStatus}` }]);
                    }
                }
                if (activeSessionRef.current && responses.length > 0) {
                    activeSessionRef.current.sendToolResponse({ functionResponses: responses });
                }
            }

            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextRef.current;
              if (ctx && ctx.state === 'running') {
                try {
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                    const buffer = await decodeAudioData(base64ToUint8Array(audioData), ctx);
                    const source = ctx.createBufferSource();
                    source.buffer = buffer;
                    source.connect(ctx.destination);
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += buffer.duration;
                } catch (e) { console.error(e); }
              }
            }
          },
          onclose: () => {
             console.log("Live Session Closed");
             resetConnection();
          },
          onerror: (err) => {
            console.error("Live Session Error", err);
            resetConnection();
            alert("Connection interrupted. Check network/API Key.");
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {}, 
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: systemInstruction,
          tools: toolsConfig
        }
      });
      activeSessionRef.current = session;

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        if (!isConnectedRef.current || !activeSessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        try { activeSessionRef.current.sendRealtimeInput({ media: pcmBlob }); } catch (err) {}
      };
      source.connect(processor);
      processor.connect(inputCtx.destination);

    } catch (e: any) {
      console.error(e);
      clearTimeout(connectionTimeout);
      resetConnection();
      alert("Failed to start voice session: " + (e.message || "Unknown error"));
    }
  };

  const executeLocalCommand = (text: string): boolean => {
      const normalizedText = wordToNumber(text).toLowerCase();
      
      // If the command is complex (e.g., "except", "but"), delegate to AI
      if (normalizedText.includes('except') || normalizedText.includes('but') || (normalizedText.includes('present') && normalizedText.includes('absent'))) {
          return false;
      }

      const hasPresent = normalizedText.includes('present') || normalizedText.includes('pres') || normalizedText.includes(' p ');
      const hasAbsent = normalizedText.includes('absent') || normalizedText.includes('abs') || normalizedText.includes(' a ');
      
      let status: AttendanceStatus | null = null;
      if (hasPresent) status = AttendanceStatus.PRESENT;
      else if (hasAbsent) status = AttendanceStatus.ABSENT;
      
      if (!status) return false;

      // Bulk All
      if (normalizedText.includes('all') || normalizedText.includes('everyone')) {
          onBulkUpdateRef.current(status);
          setMessages(prev => [...prev, { role: 'ai', text: `(Local) Marked everyone as ${status}.` }]);
          setLastAction(`Bulk Update: ${status}`);
          return true;
      }

      // Numbers (Roll numbers) - Matches "3, 4", "3 and 4", "3 4"
      const numbers = normalizedText.match(/\d+/g);
      if (numbers && numbers.length > 0) {
          let successCount = 0;
          numbers.forEach(num => {
              onLiveUpdateRef.current(num, status!);
              successCount++;
          });
          setMessages(prev => [...prev, { role: 'ai', text: `(Local) Marked Roll(s) ${numbers.join(', ')} as ${status}.` }]);
          setLastAction(`Updated Roll(s): ${numbers.join(', ')}`);
          return true;
      }
      return false;
  };

  const sendText = async () => {
      if (!textInput.trim()) return;
      const textToSend = textInput;
      setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
      setTextInput('');

      // Try local parsing first for instant response
      if (executeLocalCommand(textToSend)) return;

      if (isConnected && activeSessionRef.current) {
          try {
             await activeSessionRef.current.sendRealtimeInput({ content: [{ text: textToSend }] });
          } catch (e) { }
      } else {
          // Fallback to text-only model if not connected to live voice
          try {
              const aiClient = getGeminiLiveClient();
              const chat = aiClient.chats.create({
                  model: 'gemini-2.5-flash',
                  config: { systemInstruction, tools: toolsConfig }
              });
              const result = await chat.sendMessage({ message: textToSend });
              const calls = result.functionCalls;
              
              if (calls && calls.length > 0) {
                  let responseText = "";
                  for (const fc of calls) {
                      if (fc.name === 'markAttendance') {
                           const { rollNo, status } = fc.args as any;
                           onLiveUpdateRef.current(String(rollNo), status.toUpperCase());
                           responseText += `Marked ${rollNo} ${status}. `;
                      } else if (fc.name === 'markAllAttendance') {
                           const { status } = fc.args as any;
                           onBulkUpdateRef.current(status.toUpperCase());
                           responseText += `Marked all ${status}. `;
                      }
                  }
                  setMessages(prev => [...prev, { role: 'ai', text: responseText || "Done." }]);
                  setLastAction("AI Update Complete");
              } else if (result.text) {
                  setMessages(prev => [...prev, { role: 'ai', text: result.text }]);
              }
          } catch (e) {
              setMessages(prev => [...prev, { role: 'ai', text: "Error: Could not process text." }]);
          }
      }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { 
        mountedRef.current = false;
        resetConnection(); 
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-slate-900/95 backdrop-blur-md animate-fade-in">
        <div className="p-4 flex justify-between items-center text-white bg-slate-900/50">
            <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="font-bold">Live Attendance Agent</span>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full"><ChevronDown size={24} /></button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {lastAction && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 animate-bounce">
                    <Activity size={12} /> {lastAction}
                </div>
            )}

            <div className="relative w-64 h-64 mb-8 flex items-center justify-center">
                {isConnected && (
                    <>
                    <div className="absolute w-full h-full bg-indigo-500 opacity-20 rounded-full animate-ping"></div>
                    <div className="absolute w-48 h-48 bg-indigo-500 opacity-30 rounded-full animate-pulse"></div>
                    </>
                )}
                <div className="z-10 bg-slate-800 border-4 border-indigo-500 p-8 rounded-full shadow-lg shadow-indigo-500/50 transition-all duration-500">
                    <Activity size={64} className={`text-indigo-400 ${isConnecting ? 'animate-spin' : ''}`} />
                </div>
            </div>

            <div className="flex items-center gap-4 z-20">
                {!isConnected ? (
                    <button 
                        onClick={startSession}
                        disabled={isConnecting}
                        className={`px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-3 ${isConnecting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isConnecting ? <Loader2 className="animate-spin" /> : <Mic size={24} />}
                        {isConnecting ? 'Connecting...' : 'Start Voice Attendance'}
                    </button>
                ) : (
                    <button 
                        onClick={resetConnection}
                        className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-lg transition-all shadow-lg flex items-center gap-3"
                    >
                        <XCircle size={24} />
                        End Session
                    </button>
                )}
                <button onClick={resetConnection} className="p-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full" title="Force Reset">
                    <RefreshCw size={20} />
                </button>
            </div>

            <div className="mt-8 w-full max-w-md bg-slate-800/50 p-4 rounded-xl border border-slate-700 h-40 overflow-y-auto backdrop-blur-sm">
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2 sticky top-0 bg-slate-800/90 p-1">Transcript</h4>
                {messages.length === 0 && <p className="text-slate-500 text-sm italic">Conversation will appear here...</p>}
                {messages.map((m, i) => (
                    <div key={i} className={`mb-2 text-sm ${m.role === 'ai' ? 'text-indigo-300' : 'text-slate-200'}`}>
                        <span className="font-bold opacity-50 text-xs mr-2">{m.role.toUpperCase()}:</span>
                        {m.text}
                    </div>
                ))}
            </div>
        </div>

        <div className="p-4 bg-slate-800 border-t border-slate-700 safe-pb">
            <div className="flex gap-2 max-w-2xl mx-auto">
                <input 
                    type="text" 
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendText()}
                    placeholder="Type or speak (e.g. 'Mark 1, 2 present')"
                    className="flex-1 bg-slate-700 border-none rounded-full px-5 py-3 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button onClick={sendText} className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-500 transition-colors">
                    <Send size={20} />
                </button>
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">Text mode active. Start Voice for real-time conversation.</p>
        </div>
    </div>
  );
};
export default LiveAttendance;
