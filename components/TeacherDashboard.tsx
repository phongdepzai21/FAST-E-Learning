import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, getDocs, getDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { ADMIN_EMAILS, COURSES as HARDCODED_COURSES, getMergedCourses, formatPriceSubmit, extractLessonsFlat, DEFAULT_LESSONS } from '../constants';
import { useToast } from '../contexts/ToastContext';
import { Course } from '../types';
import { parseFirestoreError } from '../utils/firestoreErrors';

interface TeacherDashboardProps {
  userEmail: string;
}

const Categories = ['ISO', 'HACCP', 'QA/QC', 'VietGAP', 'Sản xuất', 'Lean', 'Quản trị', 'Testing', 'Khác'];

const DEFAULT_FLAT_LESSONS = DEFAULT_LESSONS;

const extractFlatLessons = extractLessonsFlat;

// Helper to sanitize any object for Firestore, strictly removing any undefined fields
const cleanForFirestore = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) return obj.map(cleanForFirestore);
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    Object.keys(obj).forEach((key) => {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    });
    return cleaned;
  }
  return obj;
};

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ userEmail }) => {
  const toast = useToast();
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
  const [status, setStatus] = useState<'active' | 'draft' | 'inactive'>('active');

  // Curriculum State (Flat Lessons with videoUrl)
  const [flatLessons, setFlatLessons] = useState<{ title: string; videoUrl: string }[]>(DEFAULT_FLAT_LESSONS);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportText, setBulkImportText] = useState('');
  const [bulkImportMode, setBulkImportMode] = useState<'append' | 'replace'>('append');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Auto-sync any local custom courses to Firestore on mount
  const syncLocalEditsToFirestore = async (currentFsList: Course[]) => {
    try {
      const localStr = localStorage.getItem('local_custom_courses');
      if (!localStr) return;
      const localList: Course[] = JSON.parse(localStr);
      if (!Array.isArray(localList) || localList.length === 0) return;

      const fsMap = new Map(currentFsList.map(c => [c.id, c]));
      let syncedCount = 0;

      for (const localCourse of localList) {
        if (!localCourse || !localCourse.id) continue;
        const fsCourse = fsMap.get(localCourse.id);
        const localTime = new Date(localCourse.updatedAt || localCourse.createdAt || 0).getTime();
        const fsTime = fsCourse ? new Date(fsCourse.updatedAt || fsCourse.createdAt || 0).getTime() : 0;

        // If local course is newer or missing in Firestore, upload to Firestore!
        if (!fsCourse || localTime > fsTime) {
          const currLessons = extractLessonsFlat(localCourse.curriculum);
          const payload = cleanForFirestore({
            id: String(localCourse.id),
            title: String(localCourse.title || '').trim(),
            price: formatPriceSubmit(localCourse.price || '0đ'),
            image: String(localCourse.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591'),
            category: String(localCourse.category || 'Khác'),
            description: String(localCourse.description || '').trim(),
            status: localCourse.status || 'active',
            curriculum: [{ title: "Danh sách bài giảng", lessons: currLessons }],
            authorEmail: localCourse.authorEmail || userEmail || '',
            updatedAt: localCourse.updatedAt || new Date().toISOString()
          });
          await setDoc(doc(db, 'courses', localCourse.id), payload, { merge: true });
          syncedCount++;
        }
      }

      if (syncedCount > 0) {
        console.log(`Đã đồng bộ ${syncedCount} khóa học từ máy lên cơ sở dữ liệu Cloud.`);
      }
    } catch (e) {
      console.warn("Lỗi auto-sync local sang cloud:", e);
    }
  };

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
        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          firestoreCourses.push({
            id: docSnap.id,
            ...data
          } as Course);
        });

        syncCourses(firestoreCourses);
        // Also check if any local custom edits need to be pushed
        syncLocalEditsToFirestore(firestoreCourses);
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
  }, [userEmail]);

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
      if (courseDocSnap.exists()) {
        const cData = courseDocSnap.data();
        if (cData.curriculum) {
          setFlatLessons(extractLessonsFlat(cData.curriculum));
        } else {
          setFlatLessons(extractLessonsFlat(course.curriculum));
        }
      } else {
        setFlatLessons(extractLessonsFlat(course.curriculum));
      }
    } catch (err) {
      console.error("Lỗi lấy thông tin giáo trình:", err);
      setFlatLessons(extractLessonsFlat(course.curriculum));
    }

    setActiveTab('edit');
  };

  // Helper validation function for course input fields
  const validateCourseInput = (): boolean => {
    if (!title.trim()) {
      setMessage({ type: 'error', text: 'Tên khóa học bắt buộc không được để trống.' });
      return false;
    }

    if (!price.trim()) {
      setMessage({ type: 'error', text: 'Học phí bắt buộc không được để trống (nhập "Miễn phí" nếu không thu phí).' });
      return false;
    }

    if (imageUrlInput.trim() && !imageUrlInput.trim().startsWith('http://') && !imageUrlInput.trim().startsWith('https://')) {
      setImageUrlInput('https://' + imageUrlInput.trim().replace(/^\/+/, ''));
    }

    return true;
  };

  // Helper to sanitize curriculum data ensuring no undefined values are sent to Firestore
  const sanitizeCurriculum = (inputLessons: any[]) => {
    if (!Array.isArray(inputLessons) || inputLessons.length === 0) {
      return [{ title: "Danh sách bài giảng", lessons: [] }];
    }
    const cleanLessons = inputLessons.map((les, lIdx) => {
      const vUrl = les?.videoUrl ? String(les.videoUrl).trim() : '';
      return {
        title: String(les?.title || `Bài học ${lIdx + 1}`).trim(),
        videoUrl: vUrl
      };
    });
    return [{ title: "Danh sách bài giảng", lessons: cleanLessons }];
  };

  // Create a brand new Custom Course
  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

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

    const rawCurriculum = flatLessons.length > 0 ? flatLessons : DEFAULT_FLAT_LESSONS;
    const sanitizedCurriculum = sanitizeCurriculum(rawCurriculum);

    const nowIso = new Date().toISOString();
    const newCourse = cleanForFirestore({
      id: courseId,
      title: title.trim(),
      price: finalPrice,
      image: finalImageUrl,
      category: category || 'Khác',
      description: description.trim(),
      status: status || 'active',
      curriculum: sanitizedCurriculum,
      authorEmail: userEmail || '',
      createdAt: nowIso,
      updatedAt: nowIso
    });

    // 1. Save to Firestore (Master Cloud Database)
    try {
      await setDoc(doc(db, 'courses', courseId), newCourse);
      toast.success(`✨ Đã thêm khóa học "${title}" lên máy chủ Cloud thành công!`);
    } catch (firestoreErr: any) {
      console.error('Firestore add course error:', firestoreErr);
      const errorInfo = parseFirestoreError(firestoreErr, `Thêm khóa học "${title}"`);
      toast.error(errorInfo.fullToastMessage, 8000);
    }

    // 2. Save to LocalStorage backup
    try {
      const localStr = localStorage.getItem('local_custom_courses');
      let localList: any[] = localStr ? JSON.parse(localStr) : [];
      localList.push(newCourse);
      localStorage.setItem('local_custom_courses', JSON.stringify(localList));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }

    setMessage({ type: 'success', text: `Tạo khóa học mới "${title}" với học phí ${finalPrice} thành công trên toàn hệ thống!` });
    window.dispatchEvent(new CustomEvent('courses_updated'));
    window.dispatchEvent(new Event('storage'));
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

    const sanitizedCurriculum = sanitizeCurriculum(flatLessons);
    const nowIso = new Date().toISOString();

    const updatedCourse = cleanForFirestore({
      id: editingCourseId,
      title: title.trim(),
      price: finalPrice,
      image: finalImageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
      category: category || 'Khác',
      description: description.trim(),
      status: status || 'active',
      curriculum: sanitizedCurriculum,
      updatedAt: nowIso
    });

    // Optimistically update React state immediately
    setCourses(prev => prev.map(c => c.id === editingCourseId ? { ...c, ...updatedCourse } : c));

    // 1. Update Firestore
    try {
      await setDoc(doc(db, 'courses', editingCourseId), updatedCourse, { merge: true });
      toast.success(`✨ Đã cập nhật giá "${finalPrice}" và thông tin khóa học lên Cloud Firestore!`);
    } catch (firestoreErr: any) {
      console.error('Firestore setDoc update error:', firestoreErr);
      const errorInfo = parseFirestoreError(firestoreErr, `Cập nhật khóa học "${title}"`);
      toast.error(errorInfo.fullToastMessage, 8000);
    }

    // 2. Save to LocalStorage backup
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

    setMessage({ type: 'success', text: `Cập nhật thông tin khóa học & học phí "${title}" thành công trên toàn hệ thống!` });
    window.dispatchEvent(new CustomEvent('courses_updated'));
    window.dispatchEvent(new Event('storage'));
    setIsSubmitting(false);
    setTimeout(() => {
      setActiveTab('list');
      resetForm();
    }, 1200);
  };

  // Toggle Course Visibility / Active Status
  const handleToggleCourseStatus = async (course: Course) => {
    const isCurrentlyActive = course.status !== 'draft' && course.status !== 'inactive';
    const newStatus: 'active' | 'inactive' = isCurrentlyActive ? 'inactive' : 'active';
    const actionText = isCurrentlyActive ? 'ẩn khóa học (đổi sang "Không hoạt động")' : 'kích hoạt khóa học (đổi sang "Hoạt động")';
    
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionText} "${course.title}"?`)) {
      return;
    }

    const nowIso = new Date().toISOString();

    // 1. Optimistically update local React state
    setCourses(prev => prev.map(c => c.id === course.id ? { ...c, status: newStatus, updatedAt: nowIso } : c));

    // 2. Always persist to LocalStorage backup
    try {
      const localStr = localStorage.getItem('local_custom_courses');
      let localList: any[] = localStr ? JSON.parse(localStr) : [];
      const idx = localList.findIndex((c: any) => c.id === course.id);
      if (idx !== -1) {
        localList[idx] = {
          ...localList[idx],
          ...course,
          status: newStatus,
          updatedAt: nowIso
        };
      } else {
        localList.push({
          id: course.id,
          title: course.title || '',
          price: course.price || '0đ',
          image: course.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591',
          category: course.category || 'Khác',
          description: course.description || '',
          status: newStatus,
          updatedAt: nowIso
        });
      }
      localStorage.setItem('local_custom_courses', JSON.stringify(localList));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    // 3. Update Firestore master collection
    try {
      const docRef = doc(db, 'courses', course.id);
      const updatePayload: Record<string, any> = cleanForFirestore({
        id: String(course.id),
        title: String(course.title || ''),
        price: formatPriceSubmit(course.price || '0đ'),
        image: String(course.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591'),
        category: String(course.category || 'Khác'),
        description: String(course.description || ''),
        status: newStatus,
        updatedAt: nowIso
      });
      if (course.curriculum && Array.isArray(course.curriculum) && course.curriculum.length > 0) {
        updatePayload.curriculum = cleanForFirestore(course.curriculum);
      }

      await setDoc(docRef, updatePayload, { merge: true });
      toast.success(newStatus === 'inactive' 
        ? `🔒 Đã ẩn khóa học "${course.title}" trên tất cả thiết bị và người dùng!` 
        : `✨ Đã hiển thị khóa học "${course.title}" trên tất cả thiết bị!`
      );
    } catch (firestoreErr: any) {
      console.error('Firestore toggle status error:', firestoreErr);
      const errorInfo = parseFirestoreError(firestoreErr, `Đổi trạng thái khóa học "${course.title}"`);
      toast.error(errorInfo.fullToastMessage, 8000);
    }

    window.dispatchEvent(new CustomEvent('courses_updated'));
    window.dispatchEvent(new Event('storage'));
    setMessage({
      type: 'success',
      text: newStatus === 'inactive'
        ? `Đã ẩn khóa học "${course.title}" (Đồng bộ mọi thiết bị: Không hoạt động)`
        : `Đã kích hoạt khóa học "${course.title}" (Đồng bộ mọi thiết bị: Hoạt động)`
    });
    setTimeout(() => setMessage(null), 4000);
  };

  // Delete / Reset Course Trigger
  const handleDeleteCourse = async (courseId: string, courseTitle: string) => {
    const isSystemCourse = HARDCODED_COURSES.some(c => c.id === courseId);
    let confirmMsg = `Bạn có chắc chắn muốn xóa khóa học "${courseTitle}"?`;
    if (isSystemCourse) {
      confirmMsg = `Khóa học "${courseTitle}" là tài liệu mẫu mặc định của hệ thống. Nhấn OK sẽ xóa bỏ tất cả các chỉnh sửa tùy biến cũ và reset về nội dung gốc hệ thống ban đầu. Bạn có muốn thực hiện không?`;
    }

    if (window.confirm(confirmMsg)) {
      let firestoreSuccess = false;
      try {
        await deleteDoc(doc(db, 'courses', courseId));
        firestoreSuccess = true;
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

      // Clean up unlocks if any
      try {
        localStorage.removeItem(`course_unlocked_${courseId}`);
      } catch (e) {}

      if (firestoreSuccess) {
        toast.success(`✨ Đã xóa khóa học "${courseTitle}" trên hệ thống Cloud và thiết bị!`);
      } else {
        toast.success(`✨ Đã xóa thành công khóa học "${courseTitle}" trên hệ thống!`);
      }

      setMessage({ type: 'success', text: isSystemCourse ? `Đã reset khóa học hệ thống "${courseTitle}" về mặc định` : `Xóa thành công khóa học "${courseTitle}" trên mọi thiết bị!` });
      window.dispatchEvent(new CustomEvent('courses_updated'));
      window.dispatchEvent(new Event('storage'));
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
    setFlatLessons(DEFAULT_FLAT_LESSONS);
    const fileInput = document.getElementById('cover-upload-form') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Helper methods for dynamic flat lesson list builder
  const addFlatLesson = () => {
    setFlatLessons(prev => [
      ...prev,
      { title: `Bài giảng ${prev.length + 1}`, videoUrl: '' }
    ]);
  };

  const handleProcessBulkImport = () => {
    if (!bulkImportText.trim()) {
      setShowBulkImportModal(false);
      return;
    }

    const lines = bulkImportText.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedLessons: { title: string; videoUrl: string }[] = [];

    lines.forEach((line, idx) => {
      // Formats supported:
      // 1. "Tiêu đề | https://youtube.com/..."
      // 2. "Tiêu đề - https://youtube.com/..."
      // 3. "Tiêu đề \t https://youtube.com/..."
      // 4. "https://youtube.com/..."
      // 5. "Tiêu đề bài học"
      let parsedTitle = '';
      let parsedUrl = '';

      if (line.includes('|')) {
        const parts = line.split('|');
        parsedTitle = parts[0].trim();
        parsedUrl = parts.slice(1).join('|').trim();
      } else if (line.includes('\t')) {
        const parts = line.split('\t');
        parsedTitle = parts[0].trim();
        parsedUrl = parts.slice(1).join('\t').trim();
      } else if (line.includes(' - http://') || line.includes(' - https://')) {
        const separatorIdx = line.indexOf(' - http');
        parsedTitle = line.substring(0, separatorIdx).trim();
        parsedUrl = line.substring(separatorIdx + 3).trim();
      } else if (line.startsWith('http://') || line.startsWith('https://') || line.startsWith('<iframe')) {
        parsedUrl = line.trim();
        parsedTitle = `Bài giảng ${idx + 1}`;
      } else {
        parsedTitle = line.trim();
        parsedUrl = '';
      }

      parsedLessons.push({
        title: parsedTitle || `Bài giảng ${idx + 1}`,
        videoUrl: parsedUrl
      });
    });

    if (parsedLessons.length > 0) {
      if (bulkImportMode === 'replace') {
        setFlatLessons(parsedLessons);
      } else {
        setFlatLessons(prev => [...prev, ...parsedLessons]);
      }
      toast.showToast(`Đã nhập thành công ${parsedLessons.length} bài giảng vào danh sách!`, 'success');
    }

    setBulkImportText('');
    setShowBulkImportModal(false);
  };

  const deleteFlatLesson = (lIdx: number) => {
    setFlatLessons(prev => prev.filter((_, idx) => idx !== lIdx));
  };

  const moveFlatLesson = (lIdx: number, direction: 'up' | 'down') => {
    setFlatLessons(prev => {
      const nextIdx = direction === 'up' ? lIdx - 1 : lIdx + 1;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const result = [...prev];
      const temp = result[lIdx];
      result[lIdx] = result[nextIdx];
      result[nextIdx] = temp;
      return result;
    });
  };

  const updateFlatLesson = (lIdx: number, field: 'title' | 'videoUrl', value: string) => {
    setFlatLessons(prev => {
      const result = [...prev];
      result[lIdx] = { ...result[lIdx], [field]: value };
      return result;
    });
  };

  const loadDefaultTemplate = () => {
    setFlatLessons(JSON.parse(JSON.stringify(DEFAULT_FLAT_LESSONS)));
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

        {/* Tab Controls & Cloud Sync Status */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50/80 border border-emerald-200/70 rounded-xl text-xs font-bold text-emerald-800 shadow-2xs select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Tự động đồng bộ Cloud</span>
          </div>

          <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto">
            <button
              onClick={() => { setActiveTab('list'); resetForm(); setMessage(null); }}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'list' ? 'bg-white text-[#007c76] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Danh sách khóa học
            </button>
            <button
              onClick={() => { setActiveTab('add'); resetForm(); setMessage(null); setFlatLessons(JSON.parse(JSON.stringify(DEFAULT_FLAT_LESSONS))); }}
              className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${activeTab === 'add' ? 'bg-white text-[#007c76] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              Thêm khóa học mới
            </button>
          </div>
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
                onClick={() => { setActiveTab('add'); setFlatLessons(JSON.parse(JSON.stringify(DEFAULT_FLAT_LESSONS))); }}
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
                    <th className="py-4 px-6 whitespace-nowrap">Ảnh bìa</th>
                    <th className="py-4 px-6 min-w-[200px]">Tiêu đề khóa học</th>
                    <th className="py-4 px-6 whitespace-nowrap">Danh mục</th>
                    <th className="py-4 px-6 whitespace-nowrap">Học phí</th>
                    <th className="py-4 px-6 whitespace-nowrap">Trạng thái</th>
                    <th className="py-4 px-6 text-right whitespace-nowrap">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {courses.map((course) => {
                    const isSystem = HARDCODED_COURSES.some(c => c.id === course.id);
                    const isHiddenOrInactive = course.status === 'draft' || course.status === 'inactive';
                    return (
                      <tr key={course.id} className="hover:bg-gray-50/40 transition-colors text-xs sm:text-sm text-gray-700">
                        <td className="py-4 px-6 whitespace-nowrap">
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
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#007c76]/10 text-[#007c76]">
                            {course.category}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-extrabold text-[#007c76] whitespace-nowrap">
                          {course.price}
                        </td>
                        <td className="py-4 px-6 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap ${
                            course.status === 'draft' 
                              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                              : course.status === 'inactive'
                              ? 'bg-rose-50 text-rose-600 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              course.status === 'draft'
                                ? 'bg-amber-500'
                                : course.status === 'inactive'
                                ? 'bg-rose-500'
                                : 'bg-emerald-500'
                            }`}></span>
                            <span>
                              {course.status === 'draft' ? 'Nháp' : course.status === 'inactive' ? 'Không hoạt động' : 'Hoạt động'}
                            </span>
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 text-xs font-black">
                            {/* Nút Ẩn / Hiện (Chuyển trạng thái hoạt động <-> không hoạt động) */}
                            {isHiddenOrInactive ? (
                              <button
                                onClick={() => handleToggleCourseStatus(course)}
                                title="Kích hoạt để khóa học hiển thị công khai cho học viên"
                                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-xl uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                <span>Hiện</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleCourseStatus(course)}
                                title="Ẩn khóa học khỏi danh sách học viên (chuyển sang Không hoạt động)"
                                className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 rounded-xl uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                <span>Ẩn</span>
                              </button>
                            )}

                            {/* Nút Sửa */}
                            <button
                              onClick={() => startEditCourse(course)}
                              className="px-3.5 py-2 bg-gray-50 border border-gray-100 hover:border-[#007c76]/20 text-[#007c76] hover:bg-[#007c76]/5 rounded-xl uppercase tracking-wider cursor-pointer transition-colors"
                            >
                              Sửa
                            </button>

                            {/* Nút Xóa / Reset */}
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
                  onChange={e => setStatus(e.target.value as 'active' | 'draft' | 'inactive')}
                  className="w-full py-3 px-4 bg-white border border-gray-200 rounded-xl font-medium text-gray-700 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/10 outline-none transition-all"
                >
                  <option value="active">Hoạt động (Hiển thị công khai cho học viên)</option>
                  <option value="inactive">Không hoạt động (Ẩn khỏi danh sách học viên)</option>
                  <option value="draft">Bản nháp (Đang biên soạn, ẩn khỏi học viên)</option>
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

          {/* Section 2: Dynamic Flat Lesson List */}
          <div className="bg-gray-50/50 p-6 md:p-8 rounded-[32px] border border-gray-100 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-6 bg-[#007c76] rounded-full"></span>
                  2. Danh sách bài giảng ({flatLessons.length} bài)
                </h3>
                <p className="text-gray-400 text-xs font-semibold mt-1">
                  Quản lý và sắp xếp các bài giảng hiển thị trực tiếp trong khóa học.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Nhập hàng loạt video
                </button>
                <button
                  type="button"
                  onClick={addFlatLesson}
                  className="px-4 py-2 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                >
                  + Thêm 1 bài giảng
                </button>
              </div>
            </div>

            {/* Flat Lesson List */}
            {flatLessons.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-gray-200">
                <p className="text-gray-400 text-sm font-semibold">Khóa học chưa có bài giảng nào.</p>
                <button
                  type="button"
                  onClick={addFlatLesson}
                  className="mt-3 text-xs font-black text-[#007c76] uppercase tracking-wider hover:underline cursor-pointer"
                >
                  + Thêm bài giảng đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {flatLessons.map((lesson, lIdx) => (
                  <div key={lIdx} className="bg-white p-4 md:p-5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <span className="w-8 h-8 rounded-xl bg-[#007c76]/10 text-[#007c76] font-black text-xs flex items-center justify-center shrink-0">
                        {lIdx + 1}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                      {/* Lesson Title Input */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Tên bài giảng</span>
                        <input
                          type="text"
                          value={lesson.title}
                          onChange={(e) => updateFlatLesson(lIdx, 'title', e.target.value)}
                          placeholder="Nhập tên bài giảng..."
                          className="w-full bg-gray-50 text-xs font-bold text-gray-800 py-2.5 px-3 border border-gray-200 rounded-xl focus:border-[#007c76] focus:bg-white outline-none transition-all"
                        />
                      </div>

                      {/* Lesson Video URL Input */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Đường dẫn Video bài giảng</span>
                        <input
                          type="text"
                          value={lesson.videoUrl || ''}
                          onChange={(e) => updateFlatLesson(lIdx, 'videoUrl', e.target.value)}
                          placeholder="Link Youtube (watch, shorts, youtu.be), Google Drive, Dropbox, MP4..."
                          className="w-full bg-gray-50 text-xs font-medium text-gray-600 py-2.5 px-3 border border-gray-200 rounded-xl focus:border-[#007c76] focus:bg-white outline-none transition-all"
                        />
                      </div>
                    </div>

                    {/* Lesson Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto pt-2 md:pt-4">
                      <button
                        type="button"
                        disabled={lIdx === 0}
                        onClick={() => moveFlatLesson(lIdx, 'up')}
                        className="p-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl disabled:opacity-30 cursor-pointer text-xs font-bold transition-all"
                        title="Di chuyển lên"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={lIdx === flatLessons.length - 1}
                        onClick={() => moveFlatLesson(lIdx, 'down')}
                        className="p-2 bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-xl disabled:opacity-30 cursor-pointer text-xs font-bold transition-all"
                        title="Di chuyển xuống"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteFlatLesson(lIdx)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl cursor-pointer transition-all"
                        title="Xóa bài giảng"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addFlatLesson}
                  className="w-full py-3 bg-white border-2 border-dashed border-[#007c76]/30 hover:border-[#007c76] text-[#007c76] hover:bg-[#007c76]/5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer text-center mt-4"
                >
                  + Thêm bài giảng mới
                </button>
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

      {/* MODAL: NHẬP HÀNG LOẠT BÀI GIẢNG / VIDEO (TIẾT KIỆM THỜI GIAN KHI CÓ 10, 50, 153 VIDEO) */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full border border-gray-100 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                  Nhập Hàng Loạt Video / Bài Giảng
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-1">
                  Dán danh sách video YouTube, MP4, Google Drive... để tự động tạo danh sách bài giảng trong vài giây.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center font-bold transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Guide box */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs space-y-1.5 text-indigo-950 font-medium">
              <p className="font-bold text-indigo-900">Hỗ trợ các định dạng (mỗi bài 1 dòng):</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-700 font-mono text-[11px]">
                <li><span className="text-indigo-700 font-bold">Bài 1: Giới thiệu khóa học</span> | https://www.youtube.com/watch?v=...</li>
                <li><span className="text-indigo-700 font-bold">Bài 2: Hướng dẫn cơ bản</span> - https://storage.googleapis.com/.../video.mp4</li>
                <li>https://youtu.be/xyz123 (Chỉ dán link - hệ thống sẽ tự đặt tên Bài 1, Bài 2...)</li>
              </ul>
            </div>

            {/* Mode selector */}
            <div className="flex items-center gap-4 text-xs font-bold text-gray-700">
              <span className="text-gray-500 font-medium">Chế độ nhập:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={bulkImportMode === 'append'}
                  onChange={() => setBulkImportMode('append')}
                  className="accent-indigo-600"
                />
                Thêm tiếp vào sau ({flatLessons.length} bài hiện có)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={bulkImportMode === 'replace'}
                  onChange={() => setBulkImportMode('replace')}
                  className="accent-indigo-600"
                />
                Thay thế toàn bộ danh sách
              </label>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                rows={9}
                placeholder={`Dán danh sách bài giảng tại đây...\n\nVí dụ:\nBài 1: Tổng quan an toàn thực phẩm | https://www.youtube.com/watch?v=abc\nBài 2: Các mối nguy hại vi sinh | https://www.youtube.com/watch?v=def\nBài 3: 5 Chìa khóa WHO | https://www.youtube.com/watch?v=ghi`}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-xs font-mono text-gray-800 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all"
              />
              <div className="flex justify-between items-center mt-1.5 text-[11px] text-gray-400 font-semibold">
                <span>Số dòng nhận diện: {bulkImportText.split('\n').filter(l => l.trim()).length} bài</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(false)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleProcessBulkImport}
                disabled={!bulkImportText.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                Nhập bài giảng
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeacherDashboard;
