
// ... existing imports ...
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileInput, Mic, UserCircle, LogOut, MessageSquare } from 'lucide-react';
import StudentTable from './components/StudentTable';
import Dashboard from './components/Dashboard';
import MediaUpload from './components/MediaUpload';
import LiveAttendance from './components/LiveAttendance';
import AuthPage from './components/AuthPage';
import BottomNav from './components/BottomNav';
import ProfileModal from './components/ProfileModal';
import ClassSelector from './components/ClassSelector';
import SearchPage from './components/SearchPage';
import StudentHistory from './components/StudentHistory';
import { Student, AttendanceRecord, AttendanceStatus, SessionType, ViewMode, AIAnalysisResult, ClassInfo, UploadedFile } from './types';

// ... existing INITIAL_CLASSES, INITIAL_STUDENTS and component setup ...
const INITIAL_CLASSES: ClassInfo[] = [
    { id: 'c1', name: 'Class 10-A', totalStudents: 15 },
    { id: 'c2', name: 'Class 11-B', totalStudents: 0 },
];

const INITIAL_STUDENTS: Student[] = Array.from({ length: 15 }, (_, i) => ({
  id: `s-${i + 1}`,
  classId: 'c1',
  name: [`Aarav Patel`, `Vivaan Singh`, `Aditya Sharma`, `Vihaan Gupta`, `Arjun Kumar`, `Sai Iyer`, `Reyansh Reddy`, `Krishna Das`, `Ishaan Joshi`, `Shaurya Verma`, `Rohan Mehta`, `Atharv Malhotra`, `Kabir Saxena`, `Rudra Bhat`, `Ayan Nair`][i],
  rollNo: (i + 1).toString()
}));

const App: React.FC = () => {
  // ... state declarations ...
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [view, setView] = useState<ViewMode>('dashboard');
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [teacherName, setTeacherName] = useState("Mr. Anderson");
  const [classes, setClasses] = useState<ClassInfo[]>(INITIAL_CLASSES);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedClass, setSelectedClass] = useState<{id: string, name: string} | null>(null);
  const [dashboardClassId, setDashboardClassId] = useState<string>(INITIAL_CLASSES[0]?.id || '');
  const [currentDate, setCurrentDate] = useState<string>(new Date().toDateString());
  const [currentSession, setCurrentSession] = useState<SessionType>(
    new Date().getHours() < 12 ? SessionType.FORENOON : SessionType.AFTERNOON
  );
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChatOverlayOpen, setIsChatOverlayOpen] = useState(false);
  const [hasChatStarted, setHasChatStarted] = useState(false);

  // ... existing useEffects and handlers ...
  useEffect(() => {
    if (records.length === 0 && isAuthenticated) {
      const demoRecords: AttendanceRecord[] = students.map(s => ({
        studentId: s.id,
        date: new Date().toDateString(),
        session: SessionType.FORENOON,
        status: Math.random() > 0.1 ? AttendanceStatus.PRESENT : AttendanceStatus.ABSENT
      }));
      setRecords(demoRecords);
    }
  }, [isAuthenticated, records.length, students]);

  useEffect(() => {
      if (classes.length > 0 && !classes.find(c => c.id === dashboardClassId)) {
          setDashboardClassId(classes[0].id);
      }
  }, [classes, dashboardClassId]);

  // Handlers
  const handleLogin = () => setIsAuthenticated(true);
  const handleLogout = () => { setIsAuthenticated(false); goHome(); setIsChatOverlayOpen(false); setHasChatStarted(false); };
  const goHome = () => { setView('dashboard'); setSelectedClass(null); setSelectedStudent(null); setCurrentDate(new Date().toDateString()); };

  const handleUpdateStatus = (studentId: string, status: AttendanceStatus, date?: string, session?: SessionType) => {
    const targetDate = date || currentDate;
    const targetSession = session || currentSession;

    setRecords(prev => {
      const existing = prev.findIndex(r => r.studentId === studentId && r.date === targetDate && r.session === targetSession);
      if (existing >= 0) {
        const newRecords = [...prev];
        newRecords[existing] = { ...newRecords[existing], status };
        return newRecords;
      }
      return [...prev, { studentId, date: targetDate, session: targetSession, status }];
    });
  };

  const handleBulkUpdateStatus = (status: AttendanceStatus) => {
      const targetClassId = (selectedClass && selectedClass.id) || dashboardClassId || classes[0]?.id;
      if (!targetClassId) { console.warn("No target class"); return; }

      setRecords(prev => {
          const currentClassStudents = students.filter(s => s.classId === targetClassId);
          const newRecords = [...prev];
          let updatedCount = 0;
          currentClassStudents.forEach(student => {
              const existingIdx = newRecords.findIndex(r => r.studentId === student.id && r.date === currentDate && r.session === currentSession);
              if (existingIdx >= 0) { newRecords[existingIdx] = { ...newRecords[existingIdx], status }; } 
              else { newRecords.push({ studentId: student.id, date: currentDate, session: currentSession, status }); }
              updatedCount++;
          });
          if(updatedCount > 0) alert(`Bulk update: Marked ${updatedCount} students as ${status}`);
          return newRecords;
      });
  };

  const handleAIAnalysisComplete = (results: AIAnalysisResult[], targetClassId: string, date: string, session: SessionType) => {
    const targetClass = classes.find(c => c.id === targetClassId);
    if (!targetClass) { alert("Error: Target class not found."); return; }

    setSelectedClass({ id: targetClass.id, name: targetClass.name });
    setCurrentDate(date);
    setCurrentSession(session);

    setRecords(prevRecords => {
        const newRecords = [...prevRecords];
        const classStudents = students.filter(s => s.classId === targetClassId);
        let matchCount = 0;
        results.forEach(res => {
            const resRoll = String(res.rollNo).replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
            const student = classStudents.find(s => {
                const sRoll = String(s.rollNo).replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
                return sRoll === resRoll;
            });
            if (student) {
                 const existingIdx = newRecords.findIndex(r => r.studentId === student.id && r.date === date && r.session === session);
                 const status = (res.status || 'PRESENT').toUpperCase() as AttendanceStatus;
                 const newRecord: AttendanceRecord = { studentId: student.id, date: date, session: session, status: status };
                 if (existingIdx >= 0) newRecords[existingIdx] = newRecord;
                 else newRecords.push(newRecord);
                 matchCount++;
            }
        });
        if (matchCount > 0) setTimeout(() => alert(`Updated ${matchCount} students in ${targetClass.name}.`), 200);
        else setTimeout(() => alert(`No matches found in ${targetClass.name}.`), 200);
        return newRecords;
    });
    setView('roster'); 
  };

  const handleLiveUpdate = (rollNo: string, status: AttendanceStatus) => {
      let targetClassId = selectedClass?.id;
      if (view === 'dashboard') targetClassId = dashboardClassId;
      if (!targetClassId && classes.length > 0) targetClassId = classes[0].id;
      if (!targetClassId) return;

      const normalizedRoll = String(rollNo).trim();
      const student = students.find(s => String(s.rollNo).trim() === normalizedRoll && s.classId === targetClassId);
      
      if (student) {
          handleUpdateStatus(student.id, status, currentDate, currentSession); 
          console.log(`Live Update: ${student.name} -> ${status}`);
      } else {
          const studentFuzzy = students.find(s => parseInt(s.rollNo) === parseInt(normalizedRoll) && s.classId === targetClassId);
          if (studentFuzzy) handleUpdateStatus(studentFuzzy.id, status, currentDate, currentSession);
          else console.warn(`Student ${rollNo} not found`);
      }
  };

  const handleClassSelection = (classId: string, date: string, session: SessionType) => {
      const cls = classes.find(c => c.id === classId);
      if (cls) { setSelectedClass({ id: cls.id, name: cls.name }); setCurrentDate(date); setCurrentSession(session); }
  };
  const handleSwitchClass = (classId: string) => { const cls = classes.find(c => c.id === classId); if (cls) setSelectedClass({ id: cls.id, name: cls.name }); };
  const handleContextUpdate = (date: string, session: SessionType) => { setCurrentDate(date); setCurrentSession(session); };
  const handleNavigate = (newView: ViewMode) => { 
      if (newView === 'live-agent') { setIsChatOverlayOpen(true); setHasChatStarted(true); return; } 
      if (newView === 'roster') { if (!selectedClass) setSelectedClass(null); } 
      setView(newView); setIsChatOverlayOpen(false); 
  };
  const handleEditSessionFromDashboard = (session: SessionType) => { setCurrentSession(session); if (!selectedClass && classes.length > 0) { const clsToSelect = classes.find(c => c.id === dashboardClassId) || classes[0]; setSelectedClass({ id: clsToSelect.id, name: clsToSelect.name }); } setView('roster'); };
  const handleStudentClick = (student: Student) => { setSelectedStudent(student); setView('student-history'); };
  const handleSaveAttendance = () => { alert("Attendance Saved! Redirecting to Home..."); goHome(); };
  const handleViewClassFromProfile = (classId: string) => { const cls = classes.find(c => c.id === classId); if (cls) { setSelectedClass({ id: cls.id, name: cls.name }); setView('roster'); setIsProfileOpen(false); } };
  const handleAddClass = (name: string) => { setClasses(prev => [...prev, { id: Math.random().toString(), name, totalStudents: 0 }]); };
  const handleRenameClass = (newName: string, classId?: string) => { const targetId = classId || selectedClass?.id; if (targetId) { setClasses(prev => prev.map(c => c.id === targetId ? { ...c, name: newName } : c)); if (selectedClass && selectedClass.id === targetId) setSelectedClass(prev => prev ? { ...prev, name: newName } : null); } };
  const handleDeleteClass = (id: string) => { setClasses(prev => prev.filter(c => c.id !== id)); setStudents(prev => prev.filter(s => s.classId !== id)); if (selectedClass?.id === id) { setSelectedClass(null); setView('dashboard'); } };
  
  const handleImportClass = async (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
          const data = e.target?.result;
          if (data) {
              const XLSX = (window as any).XLSX;
              if (XLSX) {
                  const workbook = XLSX.read(data, { type: 'array' });
                  const sheetName = workbook.SheetNames[0];
                  const sheet = workbook.Sheets[sheetName];
                  const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                  let headerRowIndex = 0;
                  if (rawData.length > 0) {
                      for(let i=0; i<Math.min(20, rawData.length); i++) {
                          const row = (rawData[i] as any[]).map(c => String(c).toLowerCase());
                          if (row.some(c => c.includes('roll') || c.includes('id') || c.includes('no')) && row.some(c => c.includes('name') || c.includes('student'))) { headerRowIndex = i; break; }
                      }
                  }
                  const jsonData = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });
                  const newClassId = Math.random().toString();
                  const newClassName = file.name.split('.')[0] || "Imported Class";
                  const newStudents: Student[] = [];
                  jsonData.forEach((row: any, index: number) => {
                      const keys = Object.keys(row);
                      const rollKey = keys.find(k => /roll|id|no/i.test(k));
                      const nameKey = keys.find(k => /name|student/i.test(k) && !/roll|id|no/i.test(k));
                      const rollNo = rollKey ? row[rollKey] : (index + 1).toString();
                      const name = nameKey ? row[nameKey] : "Unknown";
                      if (name && name !== "Unknown" && String(rollNo).trim() !== '') {
                          newStudents.push({ id: `s-${Date.now()}-${index}`, classId: newClassId, name: String(name), rollNo: String(rollNo).trim() });
                      }
                  });
                  if (newStudents.length > 0) {
                      const newClass: ClassInfo = { id: newClassId, name: newClassName, totalStudents: newStudents.length };
                      setClasses(prev => [...prev, newClass]);
                      setStudents(prev => [...prev, ...newStudents]);
                      const blobUrl = URL.createObjectURL(file);
                      const uploadedFile: UploadedFile = { id: Math.random().toString(), name: file.name, type: 'document', date: new Date().toDateString(), size: (file.size / 1024).toFixed(1) + ' KB', url: blobUrl };
                      setUploadedFiles(prev => [uploadedFile, ...prev]);
                      alert(`Imported ${newStudents.length} students into '${newClassName}'`);
                  } else { alert("Could not find valid student data."); }
              } else { alert("Excel parser not loaded."); }
          }
      };
      reader.readAsArrayBuffer(file);
  };

  const handleExportClass = (classId: string) => {
      const cls = classes.find(c => c.id === classId);
      if (!cls) return;
      const classStudents = students.filter(s => s.classId === classId);
      const exportData = classStudents.map(student => {
          const row: any = { 'Roll No': student.rollNo, 'Name': student.name };
          const studentRecords = records.filter(r => r.studentId === student.id);
          studentRecords.forEach(r => { const key = `${r.date} (${r.session === SessionType.FORENOON ? 'FN' : 'AN'})`; row[key] = r.status; });
          return row;
      });
      const XLSX = (window as any).XLSX;
      if (XLSX) {
          const ws = XLSX.utils.json_to_sheet(exportData);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, cls.name.substring(0, 30));
          XLSX.writeFile(wb, `${cls.name}_Attendance.xlsx`);
      }
  };

  const handleUpdateStudent = (studentId: string, field: 'name' | 'rollNo', value: string) => { setStudents(prev => prev.map(s => s.id === studentId ? { ...s, [field]: value } : s)); };
  const handleFileUpload = (file: UploadedFile) => { setUploadedFiles(prev => [file, ...prev]); };
  const handleDeleteFile = (fileId: string) => { setUploadedFiles(prev => prev.filter(f => f.id !== fileId)); };
  const handleUpdateFile = (updatedFile: UploadedFile) => { setUploadedFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f)); };

  const activeClassId = view === 'dashboard' ? dashboardClassId : selectedClass?.id;
  const activeStudents = students.filter(s => s.classId === activeClassId);
  const dashboardStudents = students.filter(s => s.classId === dashboardClassId);

  if (!isAuthenticated) return <AuthPage onLogin={handleLogin} />;

  const MobileHeader = () => (
    <div className="bg-white p-4 pb-2 border-b border-slate-100 flex justify-between items-center lg:hidden sticky top-0 z-30">
        <div onClick={goHome} className="cursor-pointer">
            <h1 className="text-xl font-black text-indigo-700 tracking-tight">I Rig</h1>
            <p className="text-xs text-slate-500 font-medium">AI powered attendance</p>
        </div>
        <div className="flex items-center gap-3">
             <button onClick={() => setIsProfileOpen(true)} className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border border-slate-300 active:scale-95 transition-transform"><UserCircle className="text-slate-500" size={36} /></button>
        </div>
    </div>
  );

  const DesktopSidebar = () => (
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-screen sticky top-0 z-40">
        <div className="p-6 border-b border-slate-100 cursor-pointer" onClick={goHome}>
           <div className="flex items-center gap-2 text-indigo-700 font-bold text-xl"><Users size={28} /><span>I Rig</span></div>
           <p className="text-xs text-slate-400 mt-1">AI powered attendance</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => handleNavigate('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'dashboard' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard size={20} /> Dashboard</button>
          <button onClick={() => handleNavigate('roster')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'roster' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={20} /> Class Roster</button>
          <button onClick={() => handleNavigate('media-upload')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'media-upload' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><FileInput size={20} /> Upload Media</button>
          <button onClick={() => handleNavigate('search')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${view === 'search' ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}><Users size={20} /> Search</button>
        </nav>
        <div className="p-4 border-t border-slate-100">
           <button onClick={() => setIsProfileOpen(true)} className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"><UserCircle size={32} className="text-slate-400"/><div className="flex-1 overflow-hidden text-left"><p className="text-sm font-semibold text-slate-700 truncate">{teacherName}</p><p className="text-xs text-slate-500 truncate">View Profile</p></div></button>
           <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 mt-2 text-xs text-slate-400 hover:text-red-500 py-2"><LogOut size={14} /> Logout</button>
        </div>
      </aside>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      <DesktopSidebar />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <MobileHeader />
        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
            <div className="max-w-5xl mx-auto h-full flex flex-col">
                <div className="flex-1 min-h-0">
                    {view === 'dashboard' && <Dashboard students={dashboardStudents} records={records} currentDate={currentDate} currentSession={currentSession} onSessionChange={setCurrentSession} onEditSession={handleEditSessionFromDashboard} classes={classes} selectedClassId={dashboardClassId} onClassChange={setDashboardClassId} />}
                    {view === 'roster' && (!selectedClass ? <ClassSelector classes={classes} onSelect={handleClassSelection} /> : <StudentTable students={activeStudents} records={records} initialDate={currentDate} initialSession={currentSession} classNameStr={selectedClass.name} classes={classes} selectedClassId={selectedClass.id} onSwitchClass={handleSwitchClass} onUpdateStatus={handleUpdateStatus} onUpdateStudent={handleUpdateStudent} onRenameClass={handleRenameClass} onBack={() => setSelectedClass(null)} onSave={handleSaveAttendance} onContextUpdate={handleContextUpdate} />)}
                    {view === 'media-upload' && <MediaUpload students={activeStudents} classes={classes} onAnalysisComplete={handleAIAnalysisComplete} onFileUpload={handleFileUpload}/>}
                    {view === 'search' && <SearchPage classes={classes} files={uploadedFiles} students={students} onOpenClass={handleViewClassFromProfile} onStudentClick={handleStudentClick} onDeleteFile={handleDeleteFile} onUpdateFile={handleUpdateFile} onImportClass={handleImportClass} onDeleteClass={handleDeleteClass}/>}
                    {view === 'student-history' && selectedStudent && <StudentHistory student={selectedStudent} records={records} onBack={() => setView('search')} />}
                </div>
            </div>
        </div>
        {!isChatOverlayOpen && (
            <button onClick={() => { setIsChatOverlayOpen(true); setHasChatStarted(true); }} className="fixed bottom-20 lg:bottom-10 right-4 lg:right-10 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-xl shadow-indigo-500/30 z-50 flex items-center gap-2 transition-transform hover:scale-105">
                <MessageSquare size={24} /> <span className="font-bold hidden md:inline">AI Chat</span>
            </button>
        )}
        <div className={`${isChatOverlayOpen ? 'block' : 'hidden'} fixed inset-0 z-[70]`}>
             {hasChatStarted && <LiveAttendance students={activeStudents} onLiveUpdate={handleLiveUpdate} onBulkUpdate={handleBulkUpdateStatus} onClose={() => setIsChatOverlayOpen(false)} />}
        </div>
        <BottomNav currentView={view} onNavigate={handleNavigate} />
        <ProfileModal 
            isOpen={isProfileOpen} 
            onClose={() => setIsProfileOpen(false)} 
            teacherName={teacherName} 
            setTeacherName={setTeacherName} 
            classes={classes} 
            onAddClass={handleAddClass} 
            onRenameClass={handleRenameClass} 
            onDeleteClass={handleDeleteClass} 
            onViewClass={handleViewClassFromProfile} 
            onImportClass={handleImportClass} 
            students={students} 
            records={records}
            onExportClass={handleExportClass}
            onLogout={handleLogout} // Pass the handler
        />
      </main>
    </div>
  );
};
export default App;
