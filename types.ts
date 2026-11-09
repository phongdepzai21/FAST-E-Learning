
export interface Lesson {
  title: string;
  videoUrl?: string;
  isHidden?: boolean;
  content?: string;
}

export interface LessonNote {
  id: string;
  text: string;
  date: string;
  lessonIdx: number;
  lessonTitle: string;
  tag?: 'important' | 'concept' | 'warning' | 'question' | 'general';
  createdAt?: number;
}

export interface Course {
  id: string;
  title: string;
  price: string;
  originalPrice?: string;
  discountPercent?: number;
  duration?: string;
  image: string;
  category: string;
  description?: string;
  status?: 'active' | 'draft' | 'inactive';
  curriculum?: any;
  authorEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  startDate?: string;
  trainingType?: 'zoom' | 'direct' | 'all';
  isDirectTraining?: boolean;
}

export interface DirectRegistration {
  id: string;
  studentName: string;
  studentEmail: string;
  phone: string;
  companyName?: string;
  courseId: string;
  courseTitle: string;
  price: string;
  trainingType: 'zoom' | 'direct';
  startDate: string;
  zoomLink?: string;
  zoomMeetingId?: string;
  zoomPasscode?: string;
  registeredAt: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  notes?: string;
}

export interface TeamMember {
  name: string;
  role: string;
  image: string;
}

export interface NavLink {
  label: string;
  path: string;
}
