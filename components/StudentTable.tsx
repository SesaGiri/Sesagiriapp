
import React, { useState, useEffect } from 'react';
import { AttendanceRecord, AttendanceStatus, SessionType, Student, ClassInfo } from '../types';
import { Check, X, Search, Save, Briefcase, ArrowLeft, Plus, Edit2, Calendar, ChevronDown } from 'lucide-react';

interface StudentTableProps {
  students: Student[];
  records: AttendanceRecord[];
  initialDate: string;
  initialSession: SessionType;
  classNameStr: string;
  classes: ClassInfo[];
  selectedClassId: string;
  onSwitchClass: (classId: string) => void;
  onUpdateStatus: (studentId: string, status: AttendanceStatus, date: string, session: SessionType) => void;
  onUpdateStudent: (studentId: string, field: 'name' | 'rollNo', value: string) => void;
  onRenameClass: (newName: string) => void;
  onBack: () => void;
  onSave: () => void;
  onContextUpdate: (date: string, session: SessionType) => void;
}

interface ColumnDef {
    id: string;
    date: string;
    session: SessionType;
}

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  records,
  initialDate,
  initialSession,
  classNameStr,
  classes,
  selectedClassId,
  onSwitchClass,
  onUpdateStatus,
  onUpdateStudent,
  onRenameClass,
  onBack,
  onSave,
  onContextUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isRenamingClass, setIsRenamingClass] = useState(false);
  const [tempClassName, setTempClassName] = useState(classNameStr);
  
  const [columns, setColumns] = useState<ColumnDef[]>([
      { id: '1', date: initialDate, session: initialSession }
  ]);

  useEffect(() => {
      onContextUpdate(initialDate, initialSession);
  }, []);

  useEffect(() => {
      setTempClassName(classNameStr);
  }, [classNameStr]);

  const addNextColumn = () => {
      const lastCol = columns[columns.length - 1];
      let newDateStr = lastCol.date;
      let newSession = lastCol.session;

      if (lastCol.session === SessionType.FORENOON) {
          newSession = SessionType.AFTERNOON;
      } else {
          newSession = SessionType.FORENOON;
          const d = new Date(lastCol.date);
          d.setDate(d.getDate() + 1);
          newDateStr = d.toDateString();
      }
      setColumns([...columns, { id: Math.random().toString(), date: newDateStr, session: newSession }]);
  };

  const handleDateChange = (id: string, newDateStr: string) => {
      if (!newDateStr) return;
      // Handle native input date format YYYY-MM-DD
      const parts = newDateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const dateString = d.toDateString();
      
      setColumns(prev => prev.map(c => c.id === id ? { ...c, date: dateString } : c));
      
      const col = columns.find(c => c.id === id);
      if (col) {
          onContextUpdate(dateString, col.session);
      }
  };

  const handleSessionChange = (id: string, newSession: string) => {
      setColumns(prev => prev.map(c => c.id === id ? { ...c, session: newSession as SessionType } : c));
      const col = columns.find(c => c.id === id);
      if (col) {
          onContextUpdate(col.date, newSession as SessionType);
      }
  };

  const saveClassName = () => {
      if (tempClassName.trim()) onRenameClass(tempClassName);
      setIsRenamingClass(false);
  }

  const getStatus = (studentId: string, date: string, session: SessionType) => {
    const record = records.find(r => r.studentId === studentId && r.date === date && r.session === session);
    return record ? record.status : AttendanceStatus.UNMARKED;
  };

  const getStatusLabel = (status: string) => {
      switch(status.toUpperCase()) {
          case 'PRESENT': return 'P';
          case 'ABSENT': return 'A';
          case 'ON_DUTY': return 'OD';
          case 'LATE': return 'L';
          default: return '-';
      }
  };

  const getStatusColor = (status: string) => {
      switch(status.toUpperCase()) {
          case 'PRESENT': return 'text-green-600';
          case 'ABSENT': return 'text-red-600';
          case 'ON_DUTY': return 'text-blue-600';
          default: return 'text-slate-400';
      }
  };

  const formatDateForInput = (dateStr: string) => {
      const d = new Date(dateStr);
      return d.toISOString().split('T')[0];
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase().trim()) || 
    s.rollNo.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="flex flex-col h-full bg-white lg:rounded-xl shadow-sm lg:border border-slate-200 overflow-hidden pb-24 lg:pb-0 animate-fade-in">
      <div className="p-4 border-b border-slate-200 flex flex-col gap-3 sticky top-0 bg-white z-20">
          <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 w-full max-w-lg">
                  <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full lg:hidden"><ArrowLeft size={20} className="text-slate-600" /></button>
                  <div className="flex-1">
                      <div className="flex items-center gap-2">
                          {isRenamingClass ? (
                              <div className="flex items-center gap-2 w-full">
                                  <input type="text" value={tempClassName} onChange={(e) => setTempClassName(e.target.value)} className="border border-indigo-500 rounded px-2 py-1 text-lg font-bold outline-none w-full" autoFocus onBlur={saveClassName} onKeyDown={(e) => e.key === 'Enter' && saveClassName()} />
                                  <button onClick={saveClassName} className="text-green-600"><Check size={20}/></button>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 group">
                                  <div className="relative group">
                                      <select value={selectedClassId} onChange={(e) => onSwitchClass(e.target.value)} className="appearance-none bg-transparent text-lg font-bold text-slate-800 pr-8 py-1 outline-none cursor-pointer hover:bg-slate-50 rounded">
                                          {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
                                      </select>
                                      <ChevronDown size={16} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                  </div>
                                  <button onClick={() => setIsRenamingClass(true)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"><Edit2 size={16} /></button>
                              </div>
                          )}
                      </div>
                      <p className="text-xs text-slate-500">Master Attendance Sheet</p>
                  </div>
              </div>
              <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"><Save size={14} /> Save</button>
          </div>
          
          <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input type="text" placeholder="Search name or roll no..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 outline-none" />
          </div>
      </div>

      <div className="overflow-auto flex-1 relative">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 text-xs font-bold text-slate-600 border border-slate-200 w-16 text-center bg-slate-100 sticky left-0 z-20">S.No</th>
              <th className="p-3 text-xs font-bold text-slate-600 border border-slate-200 w-20 text-center bg-slate-100 sticky left-16 z-20">Roll No</th>
              <th className="p-3 text-xs font-bold text-slate-600 border border-slate-200 min-w-[150px] bg-slate-100 sticky left-36 z-20">Name</th>
              
              {columns.map(col => (
                  <th key={col.id} className="p-1 text-xs font-bold text-slate-600 border border-slate-200 min-w-[120px] text-center bg-slate-50">
                      <div className="flex flex-col items-center justify-center gap-1 relative">
                          <div className="relative w-full flex justify-center">
                              <span className="text-[10px] text-slate-500 pointer-events-none absolute left-1/2 -translate-x-1/2 top-1.5 z-0">{new Date(col.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                              <input type="date" value={formatDateForInput(col.date)} className="w-24 h-6 opacity-0 cursor-pointer z-10" onChange={(e) => handleDateChange(col.id, e.target.value)} />
                              <Calendar size={12} className="absolute right-2 top-1.5 text-slate-400 pointer-events-none" />
                          </div>
                          <select value={col.session} onChange={(e) => handleSessionChange(col.id, e.target.value)} className={`text-[10px] font-bold py-0.5 px-2 rounded cursor-pointer outline-none border border-slate-200 bg-white hover:bg-slate-50 shadow-sm ${col.session === SessionType.FORENOON ? 'text-orange-600' : 'text-indigo-600'}`}>
                              <option value={SessionType.FORENOON}>FN</option>
                              <option value={SessionType.AFTERNOON}>AN</option>
                          </select>
                      </div>
                  </th>
              ))}
              <th className="p-2 border border-slate-200 bg-slate-50 w-12 text-center">
                  <button onClick={addNextColumn} className="p-1 hover:bg-slate-200 rounded text-slate-500"><Plus size={16} /></button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student, index) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-3 text-xs font-medium text-slate-500 border border-slate-200 text-center bg-white sticky left-0">{index + 1}</td>
                  <td className="p-0 border border-slate-200 bg-white sticky left-16">
                      <input type="text" value={student.rollNo} onChange={(e) => onUpdateStudent(student.id, 'rollNo', e.target.value)} className="w-full h-full p-2 text-xs font-bold text-slate-600 text-center bg-transparent outline-none focus:bg-indigo-50" />
                  </td>
                  <td className="p-0 border border-slate-200 bg-white sticky left-36">
                      <input type="text" value={student.name} onChange={(e) => onUpdateStudent(student.id, 'name', e.target.value)} className="w-full h-full p-2 text-sm font-medium text-slate-800 bg-transparent outline-none focus:bg-indigo-50" />
                  </td>
                  {columns.map(col => {
                      const status = getStatus(student.id, col.date, col.session);
                      return (
                        <td key={col.id} className="p-2 border border-slate-200 text-center relative group/cell">
                             <div className={`font-bold ${getStatusColor(status)}`}>{getStatusLabel(status)}</div>
                             <div className="absolute inset-0 bg-white hidden group-hover/cell:flex items-center justify-center gap-1 shadow-inner z-10">
                                <button onClick={() => onUpdateStatus(student.id, AttendanceStatus.PRESENT, col.date, col.session)} className="w-6 h-6 flex items-center justify-center rounded bg-green-50 text-green-600 hover:bg-green-100"><Check size={14} /></button>
                                <button onClick={() => onUpdateStatus(student.id, AttendanceStatus.ABSENT, col.date, col.session)} className="w-6 h-6 flex items-center justify-center rounded bg-red-50 text-red-600 hover:bg-red-100"><X size={14} /></button>
                                <button onClick={() => onUpdateStatus(student.id, AttendanceStatus.ON_DUTY, col.date, col.session)} className="w-6 h-6 flex items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-100"><Briefcase size={12} /></button>
                             </div>
                        </td>
                      );
                  })}
                   <td className="border border-slate-200 bg-slate-50"></td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default StudentTable;
