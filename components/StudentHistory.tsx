
import React from 'react';
import { ArrowLeft, User, Calendar, TrendingUp } from 'lucide-react';
import { AttendanceRecord, AttendanceStatus, Student } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface StudentHistoryProps {
  student: Student;
  records: AttendanceRecord[];
  onBack: () => void;
}

const StudentHistory: React.FC<StudentHistoryProps> = ({ student, records, onBack }) => {
  // Filter records for this student
  const studentRecords = records.filter(r => r.studentId === student.id);
  
  const totalClasses = studentRecords.length;
  const presentCount = studentRecords.filter(r => r.status === AttendanceStatus.PRESENT).length;
  const absentCount = studentRecords.filter(r => r.status === AttendanceStatus.ABSENT).length;
  const odCount = studentRecords.filter(r => r.status === AttendanceStatus.ON_DUTY).length;
  
  const attendancePercentage = totalClasses > 0 
    ? Math.round(((presentCount + odCount) / totalClasses) * 100) 
    : 0;

  // Mock Monthly Data for Chart
  const monthlyData = [
    { name: 'Aug', present: 20, absent: 2 },
    { name: 'Sep', present: 22, absent: 1 },
    { name: 'Oct', present: 18, absent: 4 },
    { name: 'Nov', present: 21, absent: 1 },
    { name: 'Dec', present: presentCount > 5 ? 5 : presentCount, absent: absentCount },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 animate-fade-in pb-24 lg:pb-0">
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-lg font-bold text-slate-800">Student Record</h2>
          <p className="text-xs text-slate-500">Attendance Analytics</p>
        </div>
      </div>

      <div className="p-6 overflow-y-auto space-y-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
           <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-2xl">
              {student.name.charAt(0)}
           </div>
           <div>
              <h1 className="text-2xl font-black text-slate-800">{student.name}</h1>
              <p className="text-slate-500 font-medium">Roll Number: <span className="text-slate-800">{student.rollNo}</span></p>
           </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                 <TrendingUp size={16} />
                 <span className="text-xs font-bold uppercase">Overall</span>
              </div>
              <p className={`text-3xl font-black ${attendancePercentage >= 75 ? 'text-green-600' : 'text-red-500'}`}>
                 {attendancePercentage}%
              </p>
              <p className="text-xs text-slate-400 mt-1">Attendance Rate</p>
           </div>
           
           <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-slate-500">
                 <Calendar size={16} />
                 <span className="text-xs font-bold uppercase">Days</span>
              </div>
              <div className="flex items-end gap-1">
                 <span className="text-3xl font-black text-slate-800">{presentCount}</span>
                 <span className="text-sm text-slate-400 mb-1">/ {totalClasses}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Present Days</p>
           </div>
        </div>

        {/* Visualization */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
           <h3 className="text-sm font-bold text-slate-700 mb-4">Monthly Performance</h3>
           <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={monthlyData} margin={{top: 5, right: 5, bottom: 0, left: -20}}>
                    <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <YAxis tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="present" name="Present" stackId="a" fill="#4ade80" radius={[0,0,4,4]} />
                    <Bar dataKey="absent" name="Absent" stackId="a" fill="#f87171" radius={[4,4,0,0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-700">Recent History</h3>
           </div>
           <div className="divide-y divide-slate-100">
              {studentRecords.length > 0 ? (
                  [...studentRecords].reverse().slice(0, 10).map((record, idx) => (
                    <div key={idx} className="p-4 flex items-center justify-between">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-slate-800">{record.date}</span>
                           <span className="text-xs text-slate-500">{record.session}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            record.status === AttendanceStatus.PRESENT ? 'bg-green-100 text-green-700' :
                            record.status === AttendanceStatus.ABSENT ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                        }`}>
                            {record.status}
                        </span>
                    </div>
                  ))
              ) : (
                  <div className="p-8 text-center text-slate-400 text-sm">No records found.</div>
              )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default StudentHistory;
