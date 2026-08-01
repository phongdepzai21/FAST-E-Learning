import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { ADMIN_EMAILS, COURSES as HARDCODED_COURSES, getMergedCourses } from '../constants';
import { Course } from '../types';

interface TeacherDashboardProps {
  userEmail: string;
}

const Categories = ['ISO', 'HACCP', 'QA/QC', 'VietGAP', 'Sản xuất', 'Lean', 'Quản trị', 'Testing', 'Khác'];

const DUMMY_CURRICULUM_TEMPLATE = [
  { 
    title: "Chương 1: Tổng quan và Cơ sở pháp lý", 
    lessons: [
      { title: "Giới thiệu về khóa học", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
      { title: "Tầm quan trọng của tiêu chuẩn an toàn", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }
    ] 
  }
];

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ userEmail }) => {
  // Navigation internal tab
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'edit'>('list');

  // Course management states
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);

  // Form input states
  const [editingCourseId, setEditingCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(Categories[0]);
  const [description, setDescription] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'active' | 'draft'>('active');

  // Curriculum State
  const [chapters, setChapters] = useState<{ title: string; lessons: { title: string; videoUrl: string }[] }[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Load all courses with real-time Firestore sync across all accounts
  useEffect(() => {
    setIsLoadingCourses(true);
    let latestFirestoreCourses: Course[] = [];

    const syncCourses = (fsList?: Course[]) => {
      if (fsList) latestFirestoreCourses = fsList;
      setCourses(getMergedCourses(latestFirestoreCourses));
      setIsLoadingCourses(false);
    };

    const unsubscribe = onSnapshot(
      collection(db, 'courses'),
      (querySnapshot) => {
        const firestoreCourses: Course[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          firestoreCourses.push({
            id: doc.id,
            ...data
          } as Course);
        });

        syncCourses(firestoreCourses);
      },
      (error) => {
        console.warn("Lỗi đồng bộ danh sách khóa học ở TeacherDashboard:", error);
        syncCourses();
      }
    );

    const handleCustomUpdate = () => {
      syncCourses();
    };

    window.addEventListener('courses_updated', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('courses_updated', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  // Open Edit Mode for a selected Course
  const startEditCourse = async (course: Course) => {
    setEditingCourseId(course.id);
    setTitle(course.title);
    setPrice(course.price);
    setCategory(course.category);
    setDescription(course.description || '');
    setImageUrlInput(course.image);
    setImageFile(null);
    setStatus(course.status || 'active');
    setMessage(null);

    // Fetch curriculum content or revert to template if empty
    try {
      const courseDocSnap = await getDoc(doc(db, 'courses', course.id));
      if (courseDocSnap.exists() && courseDocSnap.data().curriculum && Array.isArray(courseDocSnap.data().curriculum) && courseDocSnap.data().curriculum.length > 0) {
        setChapters(courseDocSnap.data().curriculum);
      } else if (course.curriculum && Array.isArray(course.curriculum) && course.curriculum.length > 0) {
        setChapters(course.curriculum);
      } else {
        setChapters(JSON.parse(JSON.stringify(DUMMY_CURRICULUM_TEMPLATE)));
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin giáo trình:", err);
      if (course.curriculum && Array.isArray(course.curriculum) && course.curriculum.length > 0) {
        setChapters(course.curriculum);
      } else {
        setChapters(JSON.parse(JSON.stringify(DUMMY_CURRICULUM_TEMPLATE)));
      }
    }

    setActiveTab('edit');
  };

  // Format price helper (e.g. converting 500000 -> 500.000đ)
  const formatPriceSubmit = (rawPrice: string): string => {
    const clean = rawPrice.trim();
    if (!clean) return '0đ';
    if (
      clean.toLowerCase() === 'miễn phí' || 
      clean.toLowerCase() === 'free' || 
      clean === '0đ' || 
      clean === '0'
    ) {
      return 'Miễn phí';
    }
    
    // Remove "đ", "VND", ".", " " and check if it consists only of digits
    const digitsOnly = clean.replace(/[đĐvVnNdD.\s,]/g, '');
    if (/^\d+$/.test(digitsOnly)) {
      const num = parseInt(digitsOnly, 10);
      return num.toLocaleString('vi-VN') + 'đ';
    }
    return clean;
  };

  // Helper validation function for course input fields
  const validateCourseInput = (): boolean => {
    // 1. Title verification
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Tên khóa học bắt buộc không được để trống.' });
      return false;
    }

    // 2. Price/Học phí verification
    if (!price.trim()) {
      setMessage({ type: 'error', text: 'Học phí bắt buộc không được để trống (nhập "Miễn phí" nếu không thu phí).' });
      return false;
    }

    // Auto fix image URL if missing protocol
    if (imageUrlInput.trim() && !imageUrlInput.trim().startsWith('http://') && !imageUrlInput.trim().startsWith('https://')) {
      setImageUrlInput('https://' + imageUrlInput.trim().replace(/^\/+/, ''));
    }

    // Auto format video URLs in chapters if missing protocol
    if (chapters.length > 0) {
      setChapters(prev => prev.map((chap, cIdx) => ({
        ...chap,
        title: chap.title.trim() || `Chương ${cIdx + 1}`,
        lessons: chap.lessons.map((les, lIdx) => {
          let vUrl = les.videoUrl ? les.videoUrl.trim() : '';
          if (!vUrl) {
            vUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
          } else if (!vUrl.startsWith('http://') && !vUrl.startsWith('https://')) {
            vUrl = 'https://' + vUrl.replace(/^\/+/, '');
          }
          return {
            title: les.title.trim() || `Bài học ${lIdx + 1}`,
            videoUrl: vUrl
          };
        })
      })));
    }

    return true;
  };

  // Helper to sanitize curriculum data ensuring no undefined values are sent to Firestore
  const sanitizeCurriculum = (inputChapters: any[]) => {
    if (!Array.isArray(inputChapters)) return [];
    return inputChapters.map((chap, cIdx) => ({
      title: String(chap?.title || `Chương ${cIdx + 1}`).trim(),
      lessons: Array.isArray(chap?.lessons) 
        ? chap.lessons.map((les: any, lIdx: number) => ({
            title: String(les?.title || `Bài học ${lIdx + 1}`).trim(),
            videoUrl: String(les?.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4').trim()
          }))
        : []
    }));
  };

  // Create a brand new Custom Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    // Run input validation
    if (!validateCourseInput()) {
      setIsSubmitting(false);
      return;
    }

    const finalPrice = formatPriceSubmit(price);
    const courseId = `course-${Date.now()}`;
    let finalImageUrl = imageUrlInput.trim() || 'https://images.unsplash.com/photo-1513104890138-7c749659a591';

    if (imageFile) {
      try {
        const storageRef = ref(storage, `course_covers/${courseId}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      } catch (storageError: any) {
        console.warn('Storage upload warning:', storageError);
        finalImageUrl = imageUrlInput.trim() || 'https://images.unsplash.com/photo-1513104890138-7c749659a591';
      }
    }

    const rawCurriculum = chapters.length > 0 ? chapters : DUMMY_CURRICULUM_TEMPLATE;
    const sanitizedCurriculum = sanitizeCurriculum(rawCurriculum);

    const newCourse = {
      id: courseId,
      title: title.trim(),
      price: finalPrice,
      image: finalImageUrl,
      category: category || 'Khác',
      description: description.trim(),
      status: status || 'active',
      curriculum: sanitizedCurriculum,
      authorEmail: userEmail || '',
      createdAt: new Date().toISOString()
    };

    // 1. Save to Firestore
    try {
      await setDoc(doc(db, 'courses', courseId), newCourse);
    } catch (firestoreErr: any) {
      console.warn('Firestore add course warning:', firestoreErr);
    }

    // 2. Save to LocalStorage backup for offline/permission resilience
    try {
      const localStr = localStorage.getItem('local_custom_courses');
      let localList: any[] = localStr ? JSON.parse(localStr) : [];
      localList.push(newCourse);
      localStorage.setItem('local_custom_courses', JSON.stringify(localList));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    setMessage({ type: 'success', text: `Tạo khóa học mới "${title}" với đầy đủ chương trình học thành công!` });
    window.dispatchEvent(new CustomEvent('courses_updated'));
    resetForm();
    setIsSubmitting(false);
    setTimeout(() => setActiveTab('list'), 1200);
  };

  // Save changes to an existing Course
  const handleSaveCourseEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    if (!editingCourseId) {
      setMessage({ type: 'error', text: 'Không tìm thấy ID khóa học cần chỉnh sửa. Vui lòng chọn lại khóa học từ danh sách.' });
      setIsSubmitting(false);
      return;
    }

    // Run input validation
    if (!validateCourseInput()) {
      setIsSubmitting(false);
      return;
    }

    const finalPrice = formatPriceSubmit(price);
    let finalImageUrl = imageUrlInput.trim();

    if (imageFile) {
      try {
        const storageRef = ref(storage, `course_covers/${editingCourseId}_${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        finalImageUrl = await getDownloadURL(storageRef);
      } catch (storageError: any) {
        console.warn('Storage edit upload warning:', storageError);
        finalImageUrl = imageUrlInput.trim() || 'https://images.unsplash.com/photo-1513104890138-7c749659a591';
      }
    }

    const sanitizedCurriculum = sanitizeCurriculum(chapters);

    const updatedCourse = {
      id: editingCourseId,
      title: title.trim(),
      price: finalPrice,
      image: finalImageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
      category: category || 'Khác',
      description: description.trim(),
      status: status || 'active',
      curriculum: sanitizedCurriculum,
      updatedAt: new Date().toISOString()
    };

    // 1. Try Firestore setDoc
    try {
      await setDoc(doc(db, 'courses', editingCourseId), updatedCourse, { merge: true });
    } catch (firestoreErr: any) {
      console.warn('Firestore setDoc update warning:', firestoreErr);
    }

    // 2. Save to LocalStorage backup for guaranteed persistence
    try {
      const localStr = localStorage.getItem('local_custom_courses');
      let localList: any[] = localStr ? JSON.parse(localStr) : [];
      const existingIdx = localList.findIndex((item: any) => item.id === editingCourseId);
      if (existingIdx !== -1) {
        localList[existingIdx] = { ...localList[existingIdx], ...updatedCourse };
      } else {
        localList.push(updatedCourse);
      }
      localStorage.setItem('local_custom_courses', JSON.stringify(localList));
    } catch (e) {
      console.warn('LocalStorage edit error:', e);
    }

    setMessage({ type: 'success', text: `Cập nhật thông tin khóa học & giáo trình "${title}" thành công!` });
    window.dispatchEvent(new CustomEvent('courses_updated'));
    setIsSubmitting(false);
    setTimeout(() => {
      setActiveTab('list');
      resetForm();
    }, 1200);
  };

  // Delete / Reset Course Trigger
  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    const isSystemCourse = HARDCODED_COURSES.some(c => c.id === courseId);
    let confirmMsg = `Bạn có chắc chắn muốn xóa khóa học "${courseTitle}"?`;
    if (isSystemCourse) {
      confirmMsg = `Khóa học "${courseTitle}" là tài liệu mẫu mặc định của hệ thống. Nhấn OK sẽ xóa bỏ tất cả các chỉnh sửa tùy biến cũ và reset về nội dung gốc hệ thống ban đầu. Bạn có muốn thực hiện không?`;
    }

    if (window.confirm(confirmMsg)) {
      try {
        await deleteDoc(doc(db, 'courses', courseId));
      } catch (err: any) {
        console.warn('Firestore delete course warning:', err);
      }

      // Also clean up from LocalStorage
      try {
        const localStr = localStorage.getItem('local_custom_courses');
        if (localStr) {
          let localList: any[] = JSON.parse(localStr);
          localList = localList.filter((item: any) => item.id !== courseId);
          localStorage.setItem('local_custom_courses', JSON.stringify(localList));
        }
      } catch (e) {}

      setMessage({ type: 'success', text: isSystemCourse ? `Đã reset khóa học hệ thống "${courseTitle}" về mặc định` : `Xóa thành công khóa học "${courseTitle}"!` });
      window.dispatchEvent(new CustomEvent('courses_updated'));
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const resetForm = () => {
    setEditingCourseId('');
    setTitle('');
    setPrice('');
    setCategory(Categories[0]);
    setDescription('');
    setImageUrlInput('');
    setImageFile(null);
    setStatus('active');
    setChapters([]);
    const fileInput = document.getElementById('cover-upload-form') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Helper methods for interactive dynamic curriculum builder
  const addChapter = () => {
    setChapters(prev => [
      ...prev,
      { title: `Chương ${prev.length + 1}: [Nhập tiêu đề chương]`, lessons: [] }
    ]);
  };

  const deleteChapter = (cIdx: number) => {
    setChapters(prev => prev.filter((_, idx) => idx !== cIdx));
  };

  const moveChapter = (cIdx: number, direction: 'up' | 'down') => {
    setChapters(prev => {
      const nextIdx = direction === 'up' ? cIdx - 1 : cIdx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const result = [...prev];
      const temp = result[cIdx];
      result[cIdx] = result[nextIdx];
      result[nextIdx] = temp;
      return result;
    });
  };

  const addLesson = (cIdx: number) => {
    setChapters(prev => {
      const result = [...prev];
      result[cIdx].lessons.push({ 
        title: `Bài học ${result[cIdx].lessons.length + 1}`, 
        videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' 
      });
      return result;
    });
  };

  const updateChapterTitle = (cIdx: number, value: string) => {
    setChapters(prev => {
      const result = [...prev];
      result[cIdx].title = value;
      return result;
    });
  };

  const updateLessonValue = (cIdx: number, lIdx: number, field: 'title' | 'videoUrl', value: string) => {
    setChapters(prev => {
      const result = [...prev];
      result[cIdx].lessons[lIdx][field] = value;
      return result;
    });
  };

  const deleteLesson = (cIdx: number, lIdx: number) => {
    setChapters(prev => {
      const result = [...prev];
      result[cIdx].lessons = result[cIdx].lessons.filter((_, idx) => idx !== lIdx);
      return result;
    });
  };

  const moveLesson = (cIdx: number, lIdx: number, direction: 'up' | 'down') => {
    setChapters(prev => {
      const nextIdx = direction === 'up' ? lIdx - 1 : lIdx + 1;
      if (nextIdx < 0 || nextIdx >= prev[cIdx].lessons.length) return prev;
      const result = [...prev];
      const lessons = [...result[cIdx].lessons];
      const temp = lessons[lIdx];
      lessons[lIdx] = lessons[nextIdx];
      lessons[nextIdx] = temp;
      result[cIdx].lessons = lessons;
      return result;
    });
  };

  const loadDefaultTemplate = () => {
    setChapters([
      {
        title: "Chương 1: Khởi động và Cơ sở học tập",
        lessons: [
          { title: "Bài 1: Giới thiệu hệ thống học trực tuyến", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { title: "Bài 2: Tầm quan trọng của An toàn & Tiêu chuẩn Vệ sinh", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }
        ]
      },
      {
        title: "Chương 2: Kiến Thức Chuyên Sâu Cốt Lõi",
        lessons: [
          { title: "Bài 3: Các quy tắc phân tích rủi ro và quản trị", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" },
          { title: "Bài 4: Thực hành quy trình giám sát độc lập", videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4" }
        ]
      }
    ]);
  };

  return (
    <div className="bg-white rounded-[40px] p-6 md:p-10 border border-gray-100 shadow-sm animate-in slide-in-from-bottom-5 duration-700">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
            <span className="w-2 h-8 bg-[#007c76] rounded-full shrink-0"></span>
            Hệ thống Quản lý khóa học
          </h2>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">
            Bảng điều khiển cho Giáo viên & Quản trị viên
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => { setActiveTab('list'); resetForm(); setMessage(null); }}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'list' ? 'bg-white text-[#007c76] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Danh sách khóa học
          </button>
          <button
            onClick={() => { setActiveTab('add'); resetForm(); setMessage(null); setChapters(JSON.parse(JSON.stringify(DUMMY_CURRICULUM_TEMPLATE))); }}
            className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'add' ? 'bg-white text-[#007c76] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Thêm khóa học mới
          </button>
        </div>
      </div>

      {/* Notifications bar */}
      {message && (
        <div className={`mb-8 p-4 rounded-2xl text-xs sm:text-sm font-bold border flex items-center gap-3 animate-in fade-in ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
          {message.type === 'success' ? (
            <svg className="w-5 h-5 shrink-0 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-5 h-5 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {message.text}
        </div>
      )}

      {/* VIEW 1: COURSES LIST SCHEDULER */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {isLoadingCourses ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-[#007c76] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider animate-pulse">Đang tải cơ sở khóa học...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-[32px] border-2 border-dashed border-gray-100">
              <p className="text-gray-400 font-bold mb-2">Chưa có khóa học nào trên hệ thống.</p>
              <button 
                onClick={() => { setActiveTab('add'); setChapters(JSON.parse(JSON.stringify(DUMMY_CURRICULUM_TEMPLATE))); }}
                className="mt-2 text-xs font-black text-[#007c76] uppercase tracking-widest hover:underline"
              >
                + Bấm vào đây để tạo mới
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[24px] border border-gray-100 bg-white shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                    <th className="py-4 px-6">Ảnh bìa</th>
                    <th className="py-4 px-6">Tiêu đề khóa học</th>
                    <th className="py-4 px-6">Danh mục</th>
                    <th className="py-4 px-6">Học phí</th>
                    <th className="py-4 px-6">Trạng thái</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {courses.map((course) => {
                    const isSystem = HARDCODED_COURSES.some(c => c.id === course.id);
                    return (
                      <tr key={course.id} className="hover:bg-gray-50/40 transition-colors text-xs sm:text-sm text-gray-700">
                        <td className="py-4 px-6">
                          <img 
                            src={course.image} 
                            alt={course.title} 
                            className="w-16 h-10 object-cover rounded-lg border border-gray-150 shadow-sm"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1513104890138-7c749659a591';
                            }}
                          />
                        </td>
                        <td className="py-4 px-6 max-w-xs">
                          <span className="font-extrabold text-gray-800 line-clamp-2 leading-snug">{course.title}</span>
                          <span className="text-[10px] font-bold text-gray-400 block mt-1 uppercase tracking-wider">
                            ID: {course.id} {isSystem && <span className="bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded text-[9px] ml-1">Gốc</span>}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#007c76]/10 text-[#007c76]">
                            {course.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-extrabold text-[#007c76]">
                          {course.price}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            course.status === 'draft' 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            {course.status === 'draft' ? 'Nháp' : 'Hoạt động'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2 text-xs font-black">
                            <button
                              onClick={() => startEditCourse(course)}
                              className="px-3.5 py-2 bg-gray-50 border border-gray-100 hover:border-[#007c76]/20 text-[#007c76] hover:bg-[#007c76]/5 rounded-xl uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course.id, course.title)}
                              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-transparent hover:border-red-200 text-red-600 rounded-xl uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              {isSystem ? 'Reset' : 'Xóa'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2 & 3: FORM WITH EMBEDDED CURRICULUM DESIGNER */}
      {(activeTab === 'add' || activeTab === 'edit') && (
        <form onSubmit={activeTab === 'add' ? handleCreateCourse : handleSaveCourseEdit} className="space-y-10">
          
          {activeTab === 'edit' && (
            <div className="bg-teal-50 border border-teal-150 p-4 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-teal-800 font-bold mb-4">
              <svg className="w-5 h-5 shrink-0 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Đang chỉnh sửa khóa học ID: <span className="underline font-black">{editingCourseId}</span>
            </div>
          )}

          {/* Section 1: General Info */}
          <div className="bg-gray-50/50 p-6 md:p-8 rounded-[32px] border border-gray-100 space-y-6">
            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#007c76] rounded-full"></span>
              1. Thông tin chung khóa học
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Tên khóa học *</label>
                <input 
                  required
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Nhập tên khóa học..."
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Học phí (VD: 599.000đ) *</label>
                <input 
                  required
                  type="text" 
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="Nhập giá bán hiển thị..."
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Danh mục phân loại *</label>
                <select 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all"
                >
                  {Categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Trạng thái khóa học *</label>
                <select 
                  value={status}
                  onChange={e => setStatus(e.target.value as 'active' | 'draft')}
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all"
                >
                  <option value="active">Hoạt động (Xuất bản công khai)</option>
                  <option value="draft">Bản nháp (Lưu nháp và ẩn khỏi học viên)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Đường dẫn URL ảnh bìa (Nhanh và tiện nhất)</label>
                <input 
                  type="text" 
                  value={imageUrlInput}
                  onChange={e => setImageUrlInput(e.target.value)}
                  placeholder="VD: https://images.unsplash.com/photo-..."
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-gray-700">Hoặc tải lên từ máy tính (Tải file cục bộ)</label>
                <input 
                  id="cover-upload-form"
                  type="file" 
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-[#007c76]/10 file:text-[#007c76] hover:file:bg-[#007c76]/20 cursor-pointer"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Nhà quản trị khuyên dùng sử dụng ảnh từ Unsplash để đảm bảo hiệu suất truyền tải tuyệt vời nhất.
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-bold text-gray-700">Mô tả bài giảng chi tiết *</label>
                <textarea 
                  required
                  rows={4}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Nhập các lợi ích, mục tiêu học tập và đối tượng hướng đến của khóa học này..."
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all resize-none"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Section 2: Dynamic Curriculum Designer */}
          <div className="bg-gray-50/50 p-6 md:p-8 rounded-[32px] border border-gray-100 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-[#007c76] rounded-full"></span>
                  2. Thiết kế chương trình đào tạo & Bài học
                </h3>
                <p className="text-gray-400 text-xs font-semibold mt-1">
                  Kéo, thả, sắp xếp danh sách các chương mục và tải tài liệu tương tác trực quan.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadDefaultTemplate}
                  className="px-4 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer"
                >
                  ⚡ Điền nhanh bố cục mẫu
                </button>
                <button
                  type="button"
                  onClick={addChapter}
                  className="px-4 py-2 bg-[#007c76]/10 hover:bg-[#007c76]/20 text-[#007c76] rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  + Thêm chương mới
                </button>
              </div>
            </div>

            {/* Curriculum Drag List mockup */}
            {chapters.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-semibold">Chương trình học trống. Thêm chương và bài giảng để học viên bắt đầu.</p>
                <button
                  type="button"
                  onClick={addChapter}
                  className="mt-3 text-xs font-black text-[#007c76] uppercase tracking-wider hover:underline"
                >
                  + Thêm chương học đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {chapters.map((chapter, cIdx) => (
                  <div key={cIdx} className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200/80 shadow-xs relative group/chap animate-in fade-in duration-300">
                    
                    {/* Chapter Header editing */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-gray-100 pb-4 mb-4 justify-between">
                      <div className="flex items-center gap-2 w-full sm:max-w-xl">
                        <span className="bg-gray-100 text-gray-500 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0">
                          {cIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={chapter.title}
                          onChange={(e) => updateChapterTitle(cIdx, e.target.value)}
                          placeholder="Nhập tên chương (Ví dụ: Chương 1: Giới thiệu chung)"
                          className="w-full text-sm font-black text-gray-800 border-b border-transparent hover:border-gray-300 focus:border-[#007c76] focus:ring-0 outline-none py-1 transition-all"
                        />
                      </div>

                      {/* Chapter Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          disabled={cIdx === 0}
                          onClick={() => moveChapter(cIdx, 'up')}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg disabled:opacity-30 cursor-pointer"
                          title="Di chuyển lên"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>
                        </button>
                        <button
                          type="button"
                          disabled={cIdx === chapters.length - 1}
                          onClick={() => moveChapter(cIdx, 'down')}
                          className="p-1.5 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-lg disabled:opacity-30 cursor-pointer"
                          title="Di chuyển xuống"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteChapter(cIdx)}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-bold transition-all cursor-pointer"
                        >
                          Xóa chương
                        </button>
                      </div>
                    </div>

                    {/* Lessons inside Chapter */}
                    <div className="space-y-3 pl-2 sm:pl-10">
                      {chapter.lessons && chapter.lessons.map((lesson, lIdx) => (
                        <div key={lIdx} className="bg-gray-50/50 p-4 rounded-xl border border-gray-150 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                            {/* Lesson Title Input */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Tiêu đề bài học mục {lIdx + 1}</span>
                              <input
                                type="text"
                                value={lesson.title}
                                onChange={(e) => updateLessonValue(cIdx, lIdx, 'title', e.target.value)}
                                placeholder="Tên bài giảng... (Ví dụ: Giới thiệu tầm quan trọng)"
                                className="w-full bg-white text-xs font-bold text-gray-700 py-2 px-3 border border-gray-200 rounded-lg focus:border-[#007c76] outline-none"
                              />
                            </div>

                            {/* Lesson Video URL Input */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Đường dẫn Video bài giảng (Youtube, MP4, v.v.)</span>
                              <input
                                type="text"
                                value={lesson.videoUrl || ''}
                                onChange={(e) => updateLessonValue(cIdx, lIdx, 'videoUrl', e.target.value)}
                                placeholder="Paster link video: https://..."
                                className="w-full bg-white text-xs font-medium text-gray-600 py-2 px-3 border border-gray-200 rounded-lg focus:border-[#007c76] outline-none"
                              />
                            </div>
                          </div>

                          {/* Lesson Actions */}
                          <div className="flex items-center gap-1 shrink-0 self-end md:self-auto pt-1 md:pt-4">
                            <button
                              type="button"
                              disabled={lIdx === 0}
                              onClick={() => moveLesson(cIdx, lIdx, 'up')}
                              className="p-1 px-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 rounded disabled:opacity-30 cursor-pointer"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              disabled={lIdx === chapter.lessons.length - 1}
                              onClick={() => moveLesson(cIdx, lIdx, 'down')}
                              className="p-1 px-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-500 rounded disabled:opacity-30 cursor-pointer"
                            >
                              ▼
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteLesson(cIdx, lIdx)}
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg cursor-pointer"
                              title="Xóa bài học"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>

                        </div>
                      ))}

                      {/* Add lesson button within chapter */}
                      <button
                        type="button"
                        onClick={() => addLesson(cIdx)}
                        className="w-full py-2 bg-dashed border border-dashed border-[#007c76]/30 hover:border-[#007c76] text-[#007c76] hover:bg-[#007c76]/5 rounded-xl text-xs font-bold transition-all cursor-pointer mt-2 text-center"
                      >
                        + Bấm để thêm bài giảng vào chương này
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex gap-4 border-t border-gray-100">
            <button 
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg shadow-teal-700/20 hover:scale-105 transition-all disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? 'Đang thực hiện lưu tải dữ liệu...' : (activeTab === 'add' ? 'Đăng khóa học & Giáo trình' : 'Lưu Thay Đổi Khóa Học')}
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('list'); resetForm(); }}
              className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black uppercase text-xs tracking-widest cursor-pointer transition-all"
            >
              Hủy
            </button>
          </div>
        </form>
      )}

    </div>
  );
};

export default TeacherDashboard;
