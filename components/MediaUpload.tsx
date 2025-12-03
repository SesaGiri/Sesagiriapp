
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Camera, Mic, Loader2, Save, Check, X, Calendar, FileText, Image as ImageIcon, FileAudio } from 'lucide-react';
import { analyzeAttendanceAudio, analyzeAttendanceImage, analyzeAttendanceText } from '../services/geminiService';
import { AIAnalysisResult, Student, UploadedFile, ClassInfo, SessionType, AttendanceStatus } from '../types';

interface MediaUploadProps {
  students: Student[];
  classes: ClassInfo[];
  onAnalysisComplete: (results: AIAnalysisResult[], targetClassId: string, date: string, session: SessionType) => void;
  onFileUpload: (file: UploadedFile) => void;
}

const MediaUpload: React.FC<MediaUploadProps> = ({ students, classes, onAnalysisComplete, onFileUpload }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [noteName, setNoteName] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Refs for file inputs to ensure reliable clicking
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const noteImageInputRef = useRef<HTMLInputElement>(null);

  // Confirmation Modal State
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingResults, setPendingResults] = useState<AIAnalysisResult[]>([]);
  const [detectedClassId, setDetectedClassId] = useState<string>('');
  const [detectedDate, setDetectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [detectedSession, setDetectedSession] = useState<SessionType>(SessionType.FORENOON);
  const [detectedClassName, setDetectedClassName] = useState<string>('');

  // Reset state on mount to prevent stuck loading
  useEffect(() => {
      setIsProcessing(false);
  }, []);

  const processAnalysisResults = (results: AIAnalysisResult[]) => {
      if (results.length > 0) {
          const first = results[0];
          
          // Match class
          let matchedClassId = classes[0]?.id || '';
          if (first.className) {
              const match = classes.find(c => c.name.toLowerCase().includes((first.className || '').toLowerCase()));
              if (match) matchedClassId = match.id;
              setDetectedClassName(first.className);
          }

          if (first.date) setDetectedDate(first.date);
          
          if (first.session) {
              const sess = first.session.toUpperCase();
              if (sess.includes('AFTER') || sess.includes('AN')) setDetectedSession(SessionType.AFTERNOON);
              else setDetectedSession(SessionType.FORENOON);
          }
          
          setDetectedClassId(matchedClassId);
          // Normalize roll numbers (remove 'Roll', '.', etc)
          const normalizedResults = results.map(r => ({
              ...r,
              rollNo: String(r.rollNo).replace(/[^0-9a-zA-Z]/g, '')
          }));
          
          setPendingResults(normalizedResults);
          setShowConfirm(true);
      } else {
          alert("Analysis completed but no attendance data was found. Please check the file content.");
      }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'audio' | 'document') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    event.target.value = '';

    const url = URL.createObjectURL(file);
    let finalType: UploadedFile['type'] = type === 'document' ? 'document' : type;
    
    // Auto-detect audio from generic upload
    if (type === 'audio' || file.type.startsWith('audio/') || file.name.endsWith('.mp3') || file.name.endsWith('.wav') || file.name.endsWith('.m4a')) {
        finalType = 'audio';
    } else if (type === 'image' || file.type.startsWith('image/')) {
        finalType = 'image';
    }
    
    // Store file reference
    onFileUpload({
        id: Math.random().toString(),
        name: file.name,
        type: finalType,
        date: new Date().toDateString(),
        size: (file.size / 1024).toFixed(1) + ' KB',
        url: url
    });

    setIsProcessing(true);
    try {
      // 1. Handle EXCEL / CSV
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
          const reader = new FileReader();
          reader.onload = (e) => {
              const data = e.target?.result;
              const XLSX = (window as any).XLSX;
              if (XLSX && data) {
                  const workbook = XLSX.read(data, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const sheet = workbook.Sheets[sheetName];
                  const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                  
                  let headerIndex = 0;
                  // Find header row
                  for(let i=0; i<Math.min(20, jsonData.length); i++) {
                      const row = (jsonData[i] as any[]).map(c => String(c).toLowerCase());
                      if (row.some(c => c.includes('roll') || c.includes('name'))) {
                          headerIndex = i;
                          break;
                      }
                  }
                  
                  const rows = XLSX.utils.sheet_to_json(sheet, { range: headerIndex });
                  const results: AIAnalysisResult[] = [];
                  
                  rows.forEach((row: any) => {
                      const keys = Object.keys(row);
                      const rollKey = keys.find(k => /roll|id|no/i.test(k));
                      const statusKey = keys.find(k => /status|attend|p\/a/i.test(k));
                      
                      const rollNo = rollKey ? String(row[rollKey]).trim() : '';
                      let status = AttendanceStatus.PRESENT; 
                      
                      if (statusKey) {
                          const val = String(row[statusKey]).toUpperCase();
                          if (val.startsWith('A') || val.includes('ABSENT')) status = AttendanceStatus.ABSENT;
                          else if (val.startsWith('P') || val.includes('PRESENT')) status = AttendanceStatus.PRESENT;
                      }
                      
                      if (rollNo) {
                          results.push({
                              rollNo: rollNo,
                              status: status,
                              className: file.name.split('.')[0] 
                          });
                      }
                  });
                  
                  processAnalysisResults(results);
                  setIsProcessing(false);
              } else {
                  alert("Excel parser not ready. Try again.");
                  setIsProcessing(false);
              }
          };
          reader.readAsArrayBuffer(file);
          return; 
      }

      // 2. Handle TEXT
      if (file.name.endsWith('.txt')) {
          const results = await analyzeAttendanceText(file, students);
          processAnalysisResults(results);
          setIsProcessing(false);
          return;
      }

      // 3. Handle IMAGE / AUDIO
      let results: AIAnalysisResult[] = [];
      if (finalType === 'image') {
        results = await analyzeAttendanceImage(file, students);
      } else if (finalType === 'audio') {
        results = await analyzeAttendanceAudio(file, students);
      }
      processAnalysisResults(results);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to process file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmUpdate = () => {
      // Normalize dates
      const parts = detectedDate.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const formattedDate = d.toDateString();

      // Pass the confirmed context back to App
      onAnalysisComplete(pendingResults, detectedClassId, formattedDate, detectedSession);
      setShowConfirm(false);
  };

  const toggleResultStatus = (rollNo: string) => {
      setPendingResults(prev => prev.map(r => {
          if (r.rollNo === rollNo) {
              return { 
                  ...r, 
                  status: r.status === AttendanceStatus.PRESENT ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT 
              };
          }
          return r;
      }));
  };

  const handleNoteImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          onFileUpload({
            id: Math.random().toString(),
            name: "Note Capture " + new Date().toLocaleTimeString(),
            type: 'image',
            date: new Date().toDateString(),
            url: url
          });
          alert("Note image captured!");
      }
  };

  const handleSaveNote = () => {
      if (!noteName.trim() || !noteContent.trim()) {
          alert("Please enter a title and content for the note.");
          return;
      }
      
      onFileUpload({
          id: Math.random().toString(),
          name: noteName,
          type: 'note',
          date: new Date().toDateString(),
          content: noteContent
      });
      
      setNoteName('');
      setNoteContent('');
      alert("Note saved successfully!");
  };

  // Stats
  const absentees = pendingResults.filter(r => r.status === AttendanceStatus.ABSENT);
  const presentees = pendingResults.filter(r => r.status === AttendanceStatus.PRESENT);

  return (
    <div className="flex flex-col h-full animate-fade-in pb-24 lg:pb-0 relative">
      
      {showConfirm && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-indigo-600 p-4 text-white flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2"><Check size={20}/> Review & Confirm</h3>
                      <button onClick={() => setShowConfirm(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
                  </div>
                  
                  <div className="p-6 space-y-4 overflow-y-auto">
                      <p className="text-xs text-slate-500 italic text-center">Tap any roll number below to toggle status before confirming.</p>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                              <input type="date" value={detectedDate} onChange={(e) => setDetectedDate(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm font-bold outline-none" />
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Session</label>
                              <select value={detectedSession} onChange={(e) => setDetectedSession(e.target.value as SessionType)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm font-bold outline-none">
                                  <option value={SessionType.FORENOON}>Forenoon</option>
                                  <option value={SessionType.AFTERNOON}>Afternoon</option>
                              </select>
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Target Class</label>
                          <select value={detectedClassId} onChange={(e) => setDetectedClassId(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-sm font-bold outline-none">
                              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-red-50 border border-red-100 rounded p-2">
                              <h4 className="font-bold text-red-700 mb-2">Absent ({absentees.length})</h4>
                              <div className="flex flex-wrap gap-1">
                                  {absentees.length > 0 ? absentees.map(a => (
                                      <span key={a.rollNo} onClick={() => toggleResultStatus(a.rollNo || '')} className="bg-red-200 text-red-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-red-300 transition-colors">{a.rollNo}</span>
                                  )) : <span className="text-slate-400">-</span>}
                              </div>
                          </div>
                          <div className="bg-green-50 border border-green-100 rounded p-2">
                              <h4 className="font-bold text-green-700 mb-2">Present ({presentees.length})</h4>
                              <div className="flex flex-wrap gap-1">
                                  {presentees.length > 0 ? presentees.map(p => (
                                      <span key={p.rollNo} onClick={() => toggleResultStatus(p.rollNo || '')} className="bg-green-200 text-green-800 px-1.5 py-0.5 rounded cursor-pointer hover:bg-green-300 transition-colors">{p.rollNo}</span>
                                  )) : <span className="text-slate-400">-</span>}
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3">
                      <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                      <button onClick={handleConfirmUpdate} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors">Confirm Update</button>
                  </div>
              </div>
          </div>
      )}

      <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800">AI Attendance Process</h2>
          <p className="text-sm text-slate-500">{new Date().toDateString()}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {/* Hidden inputs triggered via Ref */}
        <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*,audio/*,.xlsx,.xls,.csv,.txt,.pdf" 
            className="hidden" 
            onChange={(e) => !isProcessing && handleFileUpload(e, 'document')}
            disabled={isProcessing}
        />
        <input 
            type="file" 
            ref={cameraInputRef}
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={(e) => !isProcessing && handleFileUpload(e, 'image')}
            disabled={isProcessing}
        />
        <input 
            type="file" 
            ref={audioInputRef}
            accept="audio/*" 
            className="hidden" 
            onChange={(e) => !isProcessing && handleFileUpload(e, 'audio')}
            disabled={isProcessing}
        />

        <div onClick={() => fileInputRef.current?.click()} className={`relative aspect-square bg-white rounded-2xl border-2 border-dashed ${isProcessing ? 'border-gray-200 opacity-50 cursor-wait' : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer'} transition-all flex flex-col items-center justify-center gap-3 p-4 shadow-sm group`}>
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                {isProcessing ? <Loader2 className="animate-spin" /> : <Upload size={24} />}
            </div>
            <span className="text-sm font-semibold text-slate-700 text-center">Upload File<br/><span className="text-xs font-normal text-slate-400">Excel, Audio, Image</span></span>
        </div>

        <div onClick={() => cameraInputRef.current?.click()} className={`relative aspect-square bg-white rounded-2xl border-2 border-dashed ${isProcessing ? 'border-gray-200 opacity-50 cursor-wait' : 'border-slate-300 hover:border-indigo-500 hover:bg-indigo-50 cursor-pointer'} transition-all flex flex-col items-center justify-center gap-3 p-4 shadow-sm group`}>
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                {isProcessing ? <Loader2 className="animate-spin" /> : <Camera size={24} />}
            </div>
            <span className="text-sm font-semibold text-slate-700 text-center">Capture Photo<br/><span className="text-xs font-normal text-slate-400">Live Camera</span></span>
        </div>

         <div onClick={() => audioInputRef.current?.click()} className={`col-span-2 relative bg-white rounded-2xl border border-slate-200 ${isProcessing ? 'opacity-50 cursor-wait' : 'hover:border-indigo-500 hover:shadow-md cursor-pointer'} transition-all flex items-center gap-4 p-4 shadow-sm group`}>
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                {isProcessing ? <Loader2 className="animate-spin" size={20} /> : <Mic size={20} />}
            </div>
            <div className="flex-1 text-left">
                <span className="block text-sm font-semibold text-slate-700">Upload Voice Note</span>
                <span className="block text-xs text-slate-400">"Roll 1, 5, 9 are absent..."</span>
            </div>
             <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Upload size={16} />
             </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>Notes</span>
                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded-full">Your Updates</span>
            </h3>
            <label className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 cursor-pointer transition-colors" title="Capture Note Photo">
                <input ref={noteImageInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleNoteImageUpload} />
                <Camera size={18} />
            </label>
        </div>
        
        <div className="space-y-4 flex-1">
            <input 
                type="text" 
                placeholder="Name / Title" 
                value={noteName}
                onChange={(e) => setNoteName(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <textarea 
                placeholder="Type your observations here..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm h-32 resize-none focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            ></textarea>
        </div>

        <div className="flex gap-3 mt-4">
             <button onClick={handleSaveNote} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                <Save size={16} /> Save Note
             </button>
        </div>
      </div>

    </div>
  );
};

export default MediaUpload;
