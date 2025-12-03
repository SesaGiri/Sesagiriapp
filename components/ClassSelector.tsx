
import React, { useState } from 'react';
import { ClassInfo, SessionType } from '../types';
import { Calendar, Users, ChevronRight, Sun, Moon } from 'lucide-react';

interface ClassSelectorProps {
    classes: ClassInfo[];
    onSelect: (classId: string, date: string, session: SessionType) => void;
}

const ClassSelector: React.FC<ClassSelectorProps> = ({ classes, onSelect }) => {
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [session, setSession] = useState<SessionType>(SessionType.FORENOON);

    const handleStart = () => {
        if (selectedClassId && date) {
            onSelect(selectedClassId, new Date(date).toDateString(), session);
        } else {
            alert("Please select a class and date.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 animate-fade-in pb-24">
             <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                
                <h2 className="text-2xl font-black text-slate-800 mb-2 text-center">Take Attendance</h2>
                <p className="text-slate-500 text-center text-sm mb-8">Select class details to open the register</p>
                
                <div className="space-y-6">
                    {/* Class Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Class Name</label>
                        <div className="relative group">
                            <Users className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <select 
                                value={selectedClassId} 
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none appearance-none transition-all cursor-pointer"
                            >
                                <option value="">Select a Class</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-4 pointer-events-none">
                                <ChevronRight className="rotate-90 text-slate-400" size={16} />
                            </div>
                        </div>
                    </div>

                    {/* Date Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date</label>
                        <div className="relative group">
                            <Calendar className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                            />
                        </div>
                    </div>

                    {/* Session Selection */}
                    <div>
                         <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Session Type</label>
                         <div className="grid grid-cols-2 gap-3">
                             <button 
                                onClick={() => setSession(SessionType.FORENOON)}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border ${
                                    session === SessionType.FORENOON 
                                    ? 'bg-orange-50 border-orange-200 text-orange-600 ring-1 ring-orange-200' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                             >
                                <Sun size={18} />
                                FN
                             </button>
                             <button 
                                onClick={() => setSession(SessionType.AFTERNOON)}
                                className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all border ${
                                    session === SessionType.AFTERNOON 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600 ring-1 ring-indigo-200' 
                                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                }`}
                             >
                                <Moon size={18} />
                                AN
                             </button>
                         </div>
                    </div>

                    <button 
                        onClick={handleStart}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all mt-4 flex items-center justify-center gap-2"
                    >
                        <span>Open Excel Attendance</span>
                        <ChevronRight size={20} />
                    </button>
                </div>
             </div>
        </div>
    );
};
export default ClassSelector;
