
import React, { useState, useRef } from 'react';
import { Search, FileSpreadsheet, Mic, Image as ImageIcon, History, Trash2, Edit2, ChevronRight, Upload, X, Save, FileText, User } from 'lucide-react';
import { ClassInfo, UploadedFile, Student } from '../types';

interface SearchPageProps {
    classes: ClassInfo[];
    files: UploadedFile[];
    students: Student[];
    onOpenClass: (classId: string) => void;
    onStudentClick: (student: Student) => void;
    onDeleteFile: (fileId: string) => void;
    onUpdateFile: (file: UploadedFile) => void;
    onImportClass: (file: File) => void;
    onDeleteClass: (classId: string) => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ 
    classes, files, students, onOpenClass, onStudentClick, onDeleteFile, onUpdateFile, onImportClass, onDeleteClass
}) => {
    const [query, setQuery] = useState('');
    const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
    const [excelPreview, setExcelPreview] = useState<any[][]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Case-insensitive filtering
    const lowerQuery = query.toLowerCase();
    const filteredClasses = classes.filter(c => c.name.toLowerCase().includes(lowerQuery));
    const filteredFiles = files.filter(f => f.name.toLowerCase().includes(lowerQuery));
    
    // Filter Students
    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(lowerQuery) || 
        s.rollNo.toLowerCase().includes(lowerQuery)
    );

    const handleViewFile = async (file: UploadedFile) => {
        setSelectedFile(file);
        setExcelPreview([]); 
        
        if (file.type === 'document' && file.url) {
            try {
                const response = await fetch(file.url);
                const arrayBuffer = await response.arrayBuffer();
                const XLSX = (window as any).XLSX;
                if (XLSX) {
                    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const sheet = workbook.Sheets[sheetName];
                    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    setExcelPreview(json.slice(0, 20)); 
                }
            } catch (e) {
                console.error("Error reading excel file", e);
            }
        }
    };

    const handleDeleteFileFromList = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm("Delete this file?")) {
            onDeleteFile(id);
        }
    };

    const handleClassDelete = (id: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.confirm("Delete this class sheet?")) {
            onDeleteClass(id);
        }
    };

    const handleImportMaster = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = ''; 
            fileInputRef.current.click();
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) onImportClass(file);
    };

    return (
        <div className="flex flex-col h-full animate-fade-in pb-24 lg:pb-0 relative">
            <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.csv,.xls" onChange={handleFileChange} />

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4"><Search size={32} /></div>
                <h2 className="text-xl font-bold text-slate-800 mb-2">Search Everything</h2>
                <div className="relative max-w-lg mx-auto">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                    <input type="text" placeholder="Search students, classes, files..." value={query} onChange={(e) => setQuery(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6">
                
                {/* Students Results */}
                {query && filteredStudents.length > 0 && (
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Students</h3>
                        <div className="grid gap-3">
                            {filteredStudents.map(student => (
                                <div key={student.id} onClick={() => onStudentClick(student)} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">
                                            {student.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-sm">{student.name}</p>
                                            <p className="text-xs text-slate-500">Roll No: {student.rollNo}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-500 font-medium group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">View Report</span>
                                        <ChevronRight size={16} className="text-slate-300" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Master Sheets Results */}
                {(query === '' || filteredClasses.length > 0) && (
                    <div>
                        <div className="flex justify-between items-center mb-3 px-2">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Master Excel Sheets</h3>
                            {query === '' && <button onClick={handleImportMaster} className="text-xs flex items-center gap-1 text-indigo-600 hover:underline cursor-pointer"><Upload size={12} /> Import Master</button>}
                        </div>
                        <div className="grid gap-3">
                            {filteredClasses.map(cls => (
                                <div key={cls.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => onOpenClass(cls.id)}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 text-green-700 rounded-lg"><FileSpreadsheet size={20} /></div>
                                        <div><p className="font-bold text-slate-800">{cls.name}</p><p className="text-xs text-slate-500">{cls.totalStudents} Students</p></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => handleClassDelete(cls.id, e)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Files Results */}
                {(query === '' || filteredFiles.length > 0) && (
                    <div>
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Uploaded Files</h3>
                        <div className="grid gap-3">
                            {filteredFiles.map(file => (
                                <div key={file.id} onClick={() => handleViewFile(file)} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm cursor-pointer hover:border-indigo-300 transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${file.type === 'document' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {file.type === 'document' ? <FileText size={20} /> : <ImageIcon size={20} />}
                                        </div>
                                        <div><p className="font-bold text-slate-800">{file.name}</p><p className="text-xs text-slate-500">{file.date}</p></div>
                                    </div>
                                    <button onClick={(e) => handleDeleteFileFromList(file.id, e)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={16} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {selectedFile && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 truncate">{selectedFile.name}</h3>
                            <button onClick={() => setSelectedFile(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={18} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            {selectedFile.type === 'document' ? (
                                <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 overflow-x-auto">
                                    <div className="flex items-center gap-2 mb-2"><FileSpreadsheet size={18} className="text-green-600"/><span className="font-bold text-sm">Preview</span></div>
                                    {excelPreview.length > 0 ? (
                                        <table className="min-w-full text-left text-xs border-collapse"><tbody>{excelPreview.map((row, i) => <tr key={i} className="border-b border-slate-200">{row.map((c: any, j) => <td key={j} className="p-1 border-r border-slate-200">{String(c)}</td>)}</tr>)}</tbody></table>
                                    ) : <p className="text-xs text-center text-slate-400">Loading preview...</p>}
                                </div>
                            ) : selectedFile.url && <img src={selectedFile.url} alt="preview" className="w-full rounded-xl" />}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={() => { if(window.confirm('Delete?')) { onDeleteFile(selectedFile.id); setSelectedFile(null); }}} className="text-red-500 text-sm flex gap-2 items-center"><Trash2 size={16}/> Delete File</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default SearchPage;
