
import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import { AttendanceRecord, AttendanceStatus, Student, SessionType, ClassInfo } from '../types';
import { ChevronDown, Calendar } from 'lucide-react';

interface DashboardProps {
  students: Student[];
  records: AttendanceRecord[];
  currentDate: string;
  onSessionChange: (session: SessionType) => void;
  currentSession: SessionType;
  onEditSession: (session: SessionType) => void;
  classes: ClassInfo[];
  selectedClassId: string;
  onClassChange: (classId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  students, records, currentDate, onSessionChange, currentSession, onEditSession,
  classes, selectedClassId, onClassChange 
}) => {
  const [isMonthly, setIsMonthly] = useState(false);
  
  const getStats = (session: SessionType) => {
    const sessionRecords = records.filter(r => r.date === currentDate && r.session === session && students.some(s => s.id === r.studentId));
    const isFilled = sessionRecords.length > 0;
    const present = sessionRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
    const absent = sessionRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
    const total = students.length;
    const percentage = isFilled && total > 0 ? Math.round((present / total) * 100) : 0;
    return { isFilled, present, absent, total, percentage };
  };

  const fnStats = getStats(SessionType.FORENOON);
  const anStats = getStats(SessionType.AFTERNOON);

  const fnPieData = [
    { name: 'Present', value: fnStats.present },
    { name: 'Absent', value: fnStats.absent },
    { name: 'Remaining', value: fnStats.total - fnStats.present - fnStats.absent }
  ];
  const anPieData = [
    { name: 'Present', value: anStats.present },
    { name: 'Absent', value: anStats.absent },
    { name: 'Remaining', value: anStats.total - anStats.present - anStats.absent }
  ];

  const COLORS = ['#10b981', '#ef4444', '#e2e8f0'];
  const weeklyData = [
    { name: 'Mon', FN: 55, AN: 52 }, { name: 'Tue', FN: 58, AN: 56 }, { name: 'Wed', FN: 50, AN: 48 }, { name: 'Thu', FN: 56, AN: 55 }, { name: 'Fri', FN: 59, AN: 0 },
  ];
  const monthlyData = [
    { name: 'Week 1', FN: 250, AN: 240 }, { name: 'Week 2', FN: 260, AN: 255 }, { name: 'Week 3', FN: 245, AN: 230 }, { name: 'Week 4', FN: 255, AN: 250 },
  ];
  const barData = isMonthly ? monthlyData : weeklyData;

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.name === 'Remaining') return null; 
      const isPresent = data.name === 'Present';
      return (
        <div className={`text-xs p-2 rounded-lg shadow-xl font-bold border ${isPresent ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          <p>{isPresent ? `Number of present: ${data.value}` : `No of absent: ${data.value}`}</p>
        </div>
      );
    }
    return null;
  };

  const renderSessionCard = (session: SessionType, stats: any, pieData: any) => (
      <div onClick={() => onEditSession(session)} className="relative p-4 rounded-2xl border bg-white border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer overflow-hidden group">
        <div className="flex justify-between items-start mb-2">
           <span className="text-lg font-bold text-slate-700 group-hover:text-indigo-600">{session === SessionType.FORENOON ? 'FN' : 'AN'}</span>
           {stats.isFilled && <span className="text-xs font-medium bg-slate-100 px-2 py-1 rounded-full text-slate-600">{stats.present}/{stats.total}</span>}
        </div>
        <div className="h-32 w-full flex items-center justify-center relative">
          {stats.isFilled ? (
             <>
               <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value" startAngle={90} endAngle={-270}>
                    {pieData.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index]} stroke="none" />)}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><span className="text-xl font-bold text-slate-700">{stats.percentage}%</span></div>
             </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
               <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-300 group-hover:border-indigo-400 flex items-center justify-center mb-2"><span className="text-xl">+</span></div>
               <span className="text-xs">Not yet filled</span>
            </div>
          )}
        </div>
        <p className="text-xs text-center text-slate-500 mt-2">{stats.isFilled ? `${stats.absent} Absent` : 'Tap to fill'}</p>
      </div>
  );

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-20 lg:pb-0">
      <div>
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Today's Attendance</h3>
            <div className="relative mt-1 group">
                <select value={selectedClassId} onChange={(e) => onClassChange(e.target.value)} className="appearance-none bg-white border border-slate-300 hover:border-indigo-500 text-slate-700 text-sm font-semibold py-1.5 pl-3 pr-8 rounded-lg shadow-sm outline-none cursor-pointer transition-all focus:ring-2 focus:ring-indigo-200 min-w-[150px]">
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-2 top-2 text-slate-400 pointer-events-none group-hover:text-indigo-500" size={16} />
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100 text-slate-500">
              <Calendar size={14} />
              <span className="text-xs font-medium">{currentDate}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {renderSessionCard(SessionType.FORENOON, fnStats, fnPieData)}
          {renderSessionCard(SessionType.AFTERNOON, anStats, anPieData)}
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-lg font-bold text-slate-800">{isMonthly ? 'Monthly Trend' : 'Weekly Trend'}</h3>
           <button onClick={() => setIsMonthly(!isMonthly)} className={`text-xs font-medium px-2 py-1 rounded transition-colors ${isMonthly ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>{isMonthly ? 'View Weekly' : 'View Monthly'}</button>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barGap={4}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b'}} />
              <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f8fafc'}} />
              <Bar dataKey="FN" fill="#818cf8" radius={[2, 2, 0, 0]} name="Forenoon" />
              <Bar dataKey="AN" fill="#c7d2fe" radius={[2, 2, 0, 0]} name="Afternoon" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
