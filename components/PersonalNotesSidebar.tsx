import React, { useState, useEffect, useMemo, useRef } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { LessonNote } from '../types';

interface PersonalNotesSidebarProps {
  courseId: string;
  courseTitle?: string;
  currentLessonIdx: number;
  currentLessonTitle: string;
  userEmail?: string | null;
  onSelectLesson?: (lessonIdx: number) => void;
  onClose?: () => void;
}

const TAG_CONFIG = {
  general: { label: 'Ghi chú', icon: '📝', color: 'text-slate-300 bg-slate-800/80 border-slate-700' },
  important: { label: 'Quan trọng', icon: '⭐', color: 'text-amber-300 bg-amber-500/15 border-amber-500/30' },
  concept: { label: 'Ý chính', icon: '💡', color: 'text-teal-300 bg-teal-500/15 border-teal-500/30' },
  warning: { label: 'Lưu ý', icon: '📌', color: 'text-rose-300 bg-rose-500/15 border-rose-500/30' },
  question: { label: 'Câu hỏi', icon: '❓', color: 'text-sky-300 bg-sky-500/15 border-sky-500/30' },
};

type TagKey = keyof typeof TAG_CONFIG;

export const PersonalNotesSidebar: React.FC<PersonalNotesSidebarProps> = ({
  courseId,
  courseTitle = 'Khóa học',
  currentLessonIdx,
  currentLessonTitle,
  userEmail,
  onSelectLesson,
  onClose,
}) => {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedTag, setSelectedTag] = useState<TagKey>('general');
  const [filterMode, setFilterMode] = useState<'current' | 'all'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'saving' | 'offline'>('synced');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load from local storage initially
  useEffect(() => {
    if (!courseId) return;
    try {
      const local = localStorage.getItem(`notes_${courseId}`);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) {
          const standardized: LessonNote[] = parsed.map((item: any, i: number) => {
            if (typeof item === 'string') {
              return {
                id: `legacy-${i}-${Date.now()}`,
                text: item,
                date: 'Gần đây',
                lessonIdx: currentLessonIdx,
                lessonTitle: currentLessonTitle,
                tag: 'general',
                createdAt: Date.now() - (parsed.length - i) * 60000,
              };
            }
            return {
              id: item.id || `note-${i}-${Date.now()}`,
              text: item.text || '',
              date: item.date || 'Gần đây',
              lessonIdx: typeof item.lessonIdx === 'number' ? item.lessonIdx : currentLessonIdx,
              lessonTitle: item.lessonTitle || currentLessonTitle,
              tag: item.tag || 'general',
              createdAt: item.createdAt || Date.now(),
            };
          });
          setNotes(standardized);
        }
      }
    } catch (e) {
      console.warn('Lỗi đọc local notes:', e);
    }
  }, [courseId]);

  // Real-time Cloud Firestore synchronization
  useEffect(() => {
    if (!courseId || !userEmail) {
      setSyncStatus('offline');
      return;
    }

    const normalizedEmail = userEmail.toLowerCase().trim();
    const docRef = doc(db, 'users', normalizedEmail, 'purchased_courses', courseId);

    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.notes)) {
            setNotes(data.notes);
            localStorage.setItem(`notes_${courseId}`, JSON.stringify(data.notes));
            setSyncStatus('synced');
          }
        }
      },
      (error) => {
        console.error('Lỗi lắng nghe ghi chú Firestore:', error);
        setSyncStatus('offline');
      }
    );

    return () => unsubscribe();
  }, [courseId, userEmail]);

  // Helper to persist notes to both local storage and Firestore
  const persistNotes = async (updatedNotes: LessonNote[]) => {
    setNotes(updatedNotes);
    localStorage.setItem(`notes_${courseId}`, JSON.stringify(updatedNotes));

    if (userEmail && courseId) {
      setSyncStatus('saving');
      try {
        const normalizedEmail = userEmail.toLowerCase().trim();
        const docRef = doc(db, 'users', normalizedEmail, 'purchased_courses', courseId);
        await setDoc(
          docRef,
          {
            notes: updatedNotes,
            lastNotesUpdatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        setSyncStatus('synced');
      } catch (err) {
        console.error('Lỗi lưu ghi chú lên Cloud Firestore:', err);
        setSyncStatus('offline');
      }
    }
  };

  // Add new note
  const handleAddNote = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const now = new Date();
    const formattedDate = `${now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • ${now.toLocaleDateString('vi-VN')}`;

    const newNote: LessonNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text: trimmed,
      date: formattedDate,
      lessonIdx: currentLessonIdx,
      lessonTitle: currentLessonTitle || `Bài ${currentLessonIdx + 1}`,
      tag: selectedTag,
      createdAt: Date.now(),
    };

    const updated = [newNote, ...notes];
    persistNotes(updated);
    setInputText('');
    setSelectedTag('general');
  };

  // Delete note
  const handleDeleteNote = (noteId: string) => {
    const updated = notes.filter((n) => n.id !== noteId);
    persistNotes(updated);
  };

  // Save edited note
  const handleSaveEdit = (noteId: string) => {
    if (!editingText.trim()) return;
    const updated = notes.map((n) => {
      if (n.id === noteId) {
        return {
          ...n,
          text: editingText.trim(),
          date: `${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} (đã sửa)`,
        };
      }
      return n;
    });
    persistNotes(updated);
    setEditingNoteId(null);
    setEditingText('');
  };

  // Copy note content
  const handleCopyNote = (note: LessonNote) => {
    const textToCopy = `[${note.lessonTitle}] (${note.date})\n${note.text}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(note.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export all notes to .txt/.md file
  const handleExportNotes = () => {
    if (notes.length === 0) return;
    const content = notes
      .map(
        (n, i) =>
          `### ${i + 1}. ${n.lessonTitle} (${n.date})\n[Loại: ${TAG_CONFIG[n.tag as TagKey]?.label || 'Ghi chú'}]\n${n.text}\n\n`
      )
      .join('---\n\n');

    const fullDoc = `# GHI CHÚ KHÓA HỌC: ${courseTitle.toUpperCase()}\nNgười học: ${userEmail || 'Học viên'}\nThời gian xuất: ${new Date().toLocaleString('vi-VN')}\nTổng số ghi chú: ${notes.length}\n\n${content}`;

    const blob = new Blob([fullDoc], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ghi-chu-${courseId}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchLesson = filterMode === 'all' || n.lessonIdx === currentLessonIdx;
      const matchSearch =
        !searchQuery.trim() ||
        n.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.lessonTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLesson && matchSearch;
    });
  }, [notes, filterMode, currentLessonIdx, searchQuery]);

  const currentLessonNotesCount = useMemo(() => {
    return notes.filter((n) => n.lessonIdx === currentLessonIdx).length;
  }, [notes, currentLessonIdx]);

  return (
    <div className="flex flex-col h-full bg-[#111827]/95 backdrop-blur-md rounded-3xl border border-white/[0.08] shadow-2xl p-4 sm:p-5 overflow-hidden">
      {/* HEADER */}
      <div className="pb-3 border-b border-white/[0.08] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold border border-teal-500/30">
              📝
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-2">
                Ghi chú cá nhân
              </h3>
              <div className="flex items-center gap-1.5 text-[10px] font-medium">
                {syncStatus === 'synced' ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Đồng bộ Cloud Firestore
                  </span>
                ) : syncStatus === 'saving' ? (
                  <span className="text-amber-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                    Đang lưu lên Cloud...
                  </span>
                ) : (
                  <span className="text-slate-400">Lưu trữ cục bộ</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {notes.length > 0 && (
              <button
                onClick={handleExportNotes}
                title="Tải về file ghi chú Markdown/Text"
                className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-teal-300 transition-all text-xs font-bold flex items-center gap-1 border border-white/[0.08]"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">Xuất file</span>
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-400 hover:text-white flex items-center justify-center transition-all"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* FILTER BUTTONS & SEARCH */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] rounded-2xl border border-white/[0.06]">
          <button
            onClick={() => setFilterMode('current')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              filterMode === 'current'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Bài hiện tại</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterMode === 'current' ? 'bg-black/30 text-slate-900' : 'bg-white/10 text-slate-300'}`}>
              {currentLessonNotesCount}
            </span>
          </button>

          <button
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              filterMode === 'all'
                ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-slate-950 shadow-md shadow-teal-950/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Tất cả bài học</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${filterMode === 'all' ? 'bg-black/30 text-slate-900' : 'bg-white/10 text-slate-300'}`}>
              {notes.length}
            </span>
          </button>
        </div>

        {/* SEARCH BOX IF MULTIPLE NOTES */}
        {notes.length > 2 && (
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nội dung ghi chú..."
              className="w-full bg-[#090d16] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 transition-all pl-8"
            />
            <svg className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1.5 text-[10px] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* INPUT FORM FOR CURRENT LESSON */}
      <div className="py-3 border-b border-white/[0.08] space-y-2 shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-bold">
          <span className="truncate max-w-[240px] text-teal-300">
            📍 Ghi chú cho: Bài {currentLessonIdx + 1}
          </span>
          <span className="text-[10px] text-slate-500">Enter để lưu</span>
        </div>

        <div className="relative">
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAddNote();
              }
            }}
            placeholder="Viết ghi chú kiến thức, ý quan trọng, công thức..."
            className="w-full bg-[#090d16] border border-white/[0.1] rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-500/30 transition-all resize-none"
          />
        </div>

        {/* TAG SELECTION & SUBMIT BUTTON */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 custom-scrollbar">
            {(Object.keys(TAG_CONFIG) as TagKey[]).map((key) => {
              const cfg = TAG_CONFIG[key];
              const isSelected = selectedTag === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTag(key)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
                    isSelected
                      ? `${cfg.color} border-current shadow-sm scale-105`
                      : 'bg-white/[0.02] border-white/[0.06] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{cfg.icon}</span>
                  <span>{cfg.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddNote}
            disabled={!inputText.trim()}
            className="px-3.5 py-1.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black text-xs rounded-xl transition-all shadow-md shadow-teal-950/30 active:scale-95 shrink-0"
          >
            Lưu
          </button>
        </div>
      </div>

      {/* NOTES LIST */}
      <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 pr-1 custom-scrollbar min-h-0">
        {filteredNotes.length > 0 ? (
          filteredNotes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const tagCfg = TAG_CONFIG[note.tag as TagKey] || TAG_CONFIG.general;
            const isCurrentLessonNote = note.lessonIdx === currentLessonIdx;

            return (
              <div
                key={note.id}
                className={`p-3 rounded-2xl border transition-all space-y-2 group ${
                  isCurrentLessonNote
                    ? 'bg-white/[0.03] hover:bg-white/[0.06] border-white/[0.08] hover:border-teal-500/30'
                    : 'bg-slate-900/40 hover:bg-slate-900/80 border-white/[0.04]'
                }`}
              >
                {/* NOTE HEADER */}
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`px-1.5 py-0.5 rounded-md border font-bold flex items-center gap-1 shrink-0 ${tagCfg.color}`}>
                      <span>{tagCfg.icon}</span>
                      <span>{tagCfg.label}</span>
                    </span>

                    <span className="text-slate-400 font-medium truncate">
                      {note.date}
                    </span>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCopyNote(note)}
                      title="Sao chép ghi chú"
                      className="p-1 rounded text-slate-400 hover:text-teal-300 hover:bg-white/[0.08] transition-all"
                    >
                      {copiedId === note.id ? (
                        <span className="text-emerald-400 font-bold text-[10px]">✓</span>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setEditingNoteId(note.id);
                        setEditingText(note.text);
                      }}
                      title="Sửa nội dung"
                      className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-white/[0.08] transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>

                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      title="Xóa ghi chú"
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-white/[0.08] transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* LESSON BADGE (IF IN 'ALL' MODE AND FROM DIFFERENT LESSON) */}
                {filterMode === 'all' && (
                  <div className="flex items-center justify-between text-[10px] bg-black/30 px-2 py-1 rounded-lg border border-white/[0.04]">
                    <span className="text-slate-300 truncate font-semibold">
                      📚 {note.lessonTitle || `Bài ${note.lessonIdx + 1}`}
                    </span>
                    {!isCurrentLessonNote && onSelectLesson && (
                      <button
                        onClick={() => onSelectLesson(note.lessonIdx)}
                        className="text-teal-400 hover:text-teal-300 font-bold underline ml-2 shrink-0"
                      >
                        Chuyển tới bài này →
                      </button>
                    )}
                  </div>
                )}

                {/* NOTE TEXT OR EDIT INPUT */}
                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={2}
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full bg-[#090d16] border border-teal-500/50 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingNoteId(null)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-[11px] font-bold"
                      >
                        Hủy
                      </button>
                      <button
                        onClick={() => handleSaveEdit(note.id)}
                        className="px-2.5 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-[11px] font-black"
                      >
                        Lưu thay đổi
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-200 leading-relaxed font-normal whitespace-pre-wrap">
                    {note.text}
                  </p>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 px-4 border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01] my-auto space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] text-slate-500 flex items-center justify-center mx-auto text-lg">
              📝
            </div>
            <p className="text-xs text-slate-300 font-bold">
              {filterMode === 'current'
                ? `Chưa có ghi chú nào cho Bài ${currentLessonIdx + 1}`
                : 'Chưa có ghi chú nào trong khóa học này'}
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              Viết ghi chú ngắn vào khung phía trên để lưu lại những điểm quan trọng cần nhớ nhé.
            </p>
          </div>
        )}
      </div>

      {/* FOOTER STATS */}
      {notes.length > 0 && (
        <div className="pt-3 border-t border-white/[0.06] mt-2 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0">
          <span>Tổng số: <strong className="text-white">{notes.length}</strong> ghi chú</span>
          <span className="text-teal-400 font-bold">Tự động đồng bộ</span>
        </div>
      )}
    </div>
  );
};
