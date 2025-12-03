
import React, { useState, useEffect, useRef } from 'react';
import { X, Download, User, Save, FileSpreadsheet, Eye, Plus, Edit3, Trash2, Check, Info, Upload, LogOut } from 'lucide-react';
import { ClassInfo, Student, AttendanceRecord, SessionType } from '../types';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    teacherName: string;
    setTeacherName: (name: string) => void;
    classes: ClassInfo[];
    onAddClass: (name: string) => void;
    onRenameClass: (name: string, id: string) => void;
    onDeleteClass: (id: string) => void;
    onViewClass: (classId: string) => void;
    onImportClass: (file: File) => void;
    onExportClass: (classId: string) => void;
    students: Student[];
    records: AttendanceRecord[];
    onLogout: () => void; // Added logout handler
}

const ProfileModal: React.FC<ProfileModalProps> = ({ 
    isOpen, onClose, teacherName, setTeacherName, classes, onAddClass, onRenameClass, onDeleteClass, onViewClass, onImportClass, onExportClass, students, records, onLogout 
}) => {
    const [isManageMode, setIsManageMode] = useState(false);
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [tempClassName, setTempClassName] = useState('');
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempTeacherName, setTempTeacherName] = useState(teacherName);
    const [showAbout, setShowAbout] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = () => fileInputRef.current?.click();
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) onImportClass(e.target.files[0]);
    };

    const startEditing = (cls: ClassInfo) => {
        setEditingClassId(cls.id);
        setTempClassName(cls.name);
    };

    const saveRename = (id: string) => {
        if (tempClassName.trim()) onRenameClass(tempClassName, id);
        setEditingClassId(null);
    };

    const saveTeacherName = () => {
        if (tempTeacherName.trim()) setTeacherName(tempTeacherName);
        setIsEditingName(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="bg-indigo-600 p-6 text-white flex justify-between items-center">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm"><User size={24} /></div>
                          {isEditingName ? (
                              <div className="flex items-center gap-2">
                                  <input 
                                    className="bg-white/10 border border-white/30 rounded px-2 py-1 text-white font-bold outline-none placeholder-white/50 w-40" 
                                    value={tempTeacherName} 
                                    onChange={(e) => setTempTeacherName(e.target.value)} 
                                    autoFocus
                                  />
                                  <button onClick={saveTeacherName} className="p-1 hover:bg-white/20 rounded"><Check size={18}/></button>
                              </div>
                          ) : (
                              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => { setIsEditingName(true); setTempTeacherName(teacherName); }}>
                                  <div>
                                      <h2 className="text-xl font-bold">{teacherName}</h2>
                                      <p className="text-xs text-indigo-200">Teacher Profile</p>
                                  </div>
                                  <Edit3 size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                          )}
                      </div>
                      <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><X size={20} /></button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto flex-1 space-y-6">
                      {/* About Me Section (Static for now, could be editable) */}
                      <div>
                          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">About Me</h3>
                          <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 italic">
                              Mathematics teacher with 10 years of experience. Passionate about leveraging AI to simplify classroom management.
                          </div>
                      </div>

                      {/* Excel Sheets List */}
                      <div>
                          <div className="flex justify-between items-end mb-3">
                              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Final Excel Sheets <span className="bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full text-[10px] ml-1">{classes.length}</span></h3>
                              <div className="flex gap-2">
                                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv" onChange={handleFileChange} />
                                  <button onClick={handleImportClick} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded transition-colors" title="Import"><Upload size={16} /></button>
                                  <button onClick={() => setIsManageMode(!isManageMode)} className={`p-1.5 rounded transition-colors ${isManageMode ? 'bg-red-50 text-red-600' : 'text-slate-400 hover:bg-slate-50'}`}><Edit3 size={16} /></button>
                              </div>
                          </div>
                          <div className="space-y-3">
                              {classes.map(cls => (
                                  <div key={cls.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-all">
                                      <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                          <div className="p-2 bg-green-100 text-green-700 rounded-lg"><FileSpreadsheet size={18} /></div>
                                          {editingClassId === cls.id ? (
                                              <div className="flex gap-2 w-full"><input className="border border-indigo-500 rounded px-2 py-1 text-sm w-full outline-none" value={tempClassName} onChange={(e) => setTempClassName(e.target.value)} autoFocus /><button onClick={() => saveRename(cls.id)} className="text-green-600"><Check size={16}/></button></div>
                                          ) : (
                                              <div className="flex-1 min-w-0">
                                                  <p className="font-bold text-slate-800 text-sm truncate">{cls.name}</p>
                                                  <p className="text-[10px] text-slate-500">{cls.totalStudents} Students</p>
                                              </div>
                                          )}
                                      </div>
                                      <div className="flex gap-2 items-center">
                                          {isManageMode && <button onClick={() => startEditing(cls)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded"><Edit3 size={14} /></button>}
                                          {isManageMode ? (
                                              <button onClick={() => onDeleteClass(cls.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                                          ) : (
                                              <>
                                                <button onClick={() => onExportClass(cls.id)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors" title="Download"><Download size={16} /></button>
                                                <button onClick={() => onViewClass(cls.id)} className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors">View</button>
                                              </>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2">
                      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3 text-red-600 font-bold bg-white border border-red-100 hover:bg-red-50 rounded-xl transition-colors shadow-sm hover:shadow-md">
                          <LogOut size={18} /> Sign Out
                      </button>
                      <button onClick={() => setShowAbout(!showAbout)} className="text-xs text-slate-400 hover:text-slate-600 flex items-center justify-center gap-1 py-2">
                          <Info size={12} /> About App
                      </button>
                      {showAbout && (
                          <div className="text-[10px] text-slate-400 text-center px-4 pb-2 animate-fade-in">
                              <p>I Rig - AI Powered Attendance System v1.0.0</p>
                              <p>Built with Google Gemini & React.</p>
                          </div>
                      )}
                  </div>
             </div>
        </div>
    );
};
export default ProfileModal;
