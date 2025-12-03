
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
  ON_DUTY = 'ON_DUTY',
  UNMARKED = 'UNMARKED'
}

export enum SessionType {
  FORENOON = 'FORENOON',
  AFTERNOON = 'AFTERNOON'
}

export interface Student {
  id: string;
  classId: string;
  name: string;
  rollNo: string;
}

export interface AttendanceRecord {
  studentId: string;
  date: string; // ISO string YYYY-MM-DD or human readable
  session: SessionType;
  status: AttendanceStatus;
}

export interface ClassInfo {
    id: string;
    name: string;
    totalStudents: number;
}

export interface UploadedFile {
    id: string;
    name: string;
    type: 'image' | 'audio' | 'video' | 'note' | 'document';
    date: string;
    url?: string;
    content?: string;
    size?: string;
}

export type ViewMode = 'dashboard' | 'roster' | 'media-upload' | 'live-agent' | 'search' | 'student-history';

// For Gemini JSON responses
export interface AIAnalysisResult {
  rollNo?: string;
  name?: string; // fuzzy match fallback
  status: AttendanceStatus;
  date?: string; // Extracted date from media
  session?: string; // Extracted session from media
  className?: string; // Extracted class name
}
