
export interface Lesson {
  title: string;
  videoUrl?: string;
  vdohide?: string;
  videoHide?: string;
  isHidden?: boolean;
}

export interface Course {
  id: string;
  title: string;
  price: string;
  image: string;
  category: string;
  description?: string;
  status?: 'active' | 'draft' | 'inactive';
  curriculum?: any;
  vdohide?: string;
  videoHide?: string;
  authorEmail?: string;
  createdAt?: string;
  updatedAt?: string;
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
