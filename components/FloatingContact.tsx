import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { CONSULTING_SERVICES, TEAM, getMergedCourses } from '../constants';
import { Course } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
  timestamp?: string;
}

const INITIAL_GREETING = `Xin chào! Tôi là **Trợ lý ảo Trần Hạnh** của FAST E-Learning. 🌸\n\nBạn cần hỗ trợ gì về các khóa học ISO, HACCP hay dịch vụ tư vấn?`;

export const FloatingContact: React.FC = () => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model', 
      text: INITIAL_GREETING,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = (smooth = false) => {
    if (messagesContainerRef.current) {
      if (smooth) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      } else {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
    }
  }, [isOpen]);

  const [liveCourses, setLiveCourses] = useState<Course[]>(() => getMergedCourses([]));

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'courses'),
      (querySnapshot) => {
        const firestoreCourses: Course[] = [];
        querySnapshot.forEach((doc) => {
          firestoreCourses.push({
            id: doc.id,
            ...doc.data()
          } as Course);
        });
        setLiveCourses(getMergedCourses(firestoreCourses));
      },
      (error) => {
        console.warn("Error listening to courses in FloatingContact:", error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Focus input field when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Render markdown content (Bold, bullet lists, breaks)
  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;
      
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      
      const content = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-extrabold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });

      if (isBullet) {
        return (
          <div key={i} className="flex items-start gap-2 mb-1 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#007c76] shrink-0 mt-1.5"></span>
            <span className="leading-relaxed">{content}</span>
          </div>
        );
      }
      
      if (line.trim() === '') return <div key={i} className="h-1.5"></div>;

      return <p key={i} className="mb-1 leading-relaxed">{content}</p>;
    });
  };

  // Build System Prompt for Trợ lý ảo Trần Hạnh (Gemini style: concise, direct, short answers)
  const systemContext = useMemo(() => {
    const courseData = liveCourses
      .filter(c => c && c.status !== 'inactive' && c.status !== 'draft')
      .map(c => `- Khóa học: "${c.title}" | Học phí: ${c.price} | Danh mục: ${c.category} | Mô tả: ${c.description || 'Chưa cập nhật'}.`)
      .join('\n');
    const serviceData = CONSULTING_SERVICES.map(s => `- Dịch vụ: "${s.title}" - ${s.description}`).join('\n');
    const teamData = TEAM.map(t => `- Chuyên gia: ${t.name} (${t.role})`).join('\n');
    
    return `
      Bạn là Trợ lý ảo Trần Hạnh của FAST E-Learning.
      PHONG CÁCH TRẢ LỜI: Giống như Gemini - cực kỳ súc tích, ngắn gọn, đi thẳng vào trọng tâm câu hỏi ("nhỏ gì trả lời đó", hỏi gì đáp nấy), không dùng lời chào rườm rà hay văn phong quảng cáo dài dòng.
      Tối đa 2-3 câu hoặc các gạch đầu dòng ngắn gọn.
      Nếu hỏi học phí hay nội dung khóa học, nêu ngay số liệu cụ thể.

      THÔNG TIN CƠ SỞ:
      - Hotline/Zalo: 0927 002 668
      - Website: 2fast.com.vn

      DANH SÁCH KHÓA HỌC:
      ${courseData}

      DỊCH VỤ TƯ VẤN:
      ${serviceData}

      ĐỘI NGŨ:
      ${teamData}
    `.trim();
  }, [liveCourses]);

  const handleSend = async (customText?: string) => {
    const textToSend = (customText || input).trim();
    if (!textToSend || isLoading) return;
    
    setInput('');
    const userTimestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const updatedMessages = [...messages, { role: 'user' as const, text: textToSend, timestamp: userTimestamp }];
    setMessages(updatedMessages);
    setIsLoading(true);

    setTimeout(() => scrollToBottom(false), 50);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, systemContext }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = "";
      let buffer = "";

      const modelTimestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, { role: 'model', text: '', timestamp: modelTimestamp }]);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || "";
        
        let hasNewContent = false;
        for (const part of parts) {
          const line = part.trim();
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                fullText += data.text;
                hasNewContent = true;
              }
            } catch (e) {
              // ignore json parse chunk errors
            }
          }
        }

        if (hasNewContent) {
          setMessages(prev => {
            const updated = [...prev];
            const lastMsg = updated[updated.length - 1];
            if (lastMsg && lastMsg.role === 'model') {
              updated[updated.length - 1] = { ...lastMsg, text: fullText };
            }
            return updated;
          });
          // Instant direct scroll prevents text jumping/jitter
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }
      }
    } catch (error: any) {
      console.error("Trợ lý Trần Hạnh Error:", error);
      
      let errorMessage = "Hệ thống bận. Vui lòng liên hệ Zalo 0927 002 668.";
      if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorMessage = "Lỗi kết nối mạng.";
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMessage, isError: true }]);
      setTimeout(() => scrollToBottom(false), 50);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        role: 'model', 
        text: INITIAL_GREETING,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const SUGGESTED_PROMPTS = [
    "Khóa học ISO 22000 gồm gì?",
    "Học phí các khóa HACCP",
    "Tư vấn An toàn thực phẩm",
    "Gói Combo ưu đãi"
  ];

  if (location.pathname.startsWith('/account')) {
    return null;
  }

  return (
    <div className="print:hidden fixed bottom-6 right-4 md:right-8 z-[90] font-sans flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      <div className={`pointer-events-auto w-[92vw] sm:w-[390px] bg-white rounded-3xl shadow-2xl border border-teal-100 overflow-hidden transition-all duration-300 origin-bottom-right mb-3 flex flex-col ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 h-0 invisible'}`}>
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#007c76] to-teal-700 p-4 flex items-center justify-between text-white shadow-md relative z-10">
           <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white text-[#007c76] font-black text-sm flex items-center justify-center border-2 border-teal-200 shadow-md">
                  TH
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h3 className="font-extrabold text-sm leading-tight flex items-center gap-1.5">
                  <span>Trợ lý ảo Trần Hạnh</span>
                  <span className="text-[10px] bg-teal-800/60 text-teal-100 px-1.5 py-0.5 rounded font-mono">AI</span>
                </h3>
                <p className="text-[11px] text-teal-100/90 font-medium">Hỏi đáp trực tuyến</p>
              </div>
           </div>

           <div className="flex items-center gap-1">
              <button 
                type="button"
                onClick={handleResetChat} 
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 hover:bg-white/15 rounded-full transition-colors text-teal-100 hover:text-white cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="p-1.5 hover:bg-white/15 rounded-full transition-colors text-white cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
           </div>
        </div>

        {/* Message List */}
        <div ref={messagesContainerRef} className="h-[390px] overflow-y-auto p-4 space-y-4 bg-slate-50/80 custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-[#007c76] text-white flex items-center justify-center text-[10px] font-black mr-2 shrink-0 mt-0.5 shadow-xs border border-teal-600">
                    TH
                  </div>
                )}

                <div className={`max-w-[85%] text-xs sm:text-sm shadow-xs ${
                    msg.role === 'user' 
                    ? 'bg-[#007c76] text-white p-3.5 rounded-2xl rounded-br-none font-medium' 
                    : msg.isError 
                        ? 'bg-red-50 text-red-600 border border-red-200 p-3.5 rounded-2xl rounded-bl-none'
                        : 'bg-white text-slate-800 border border-slate-200/80 p-3.5 rounded-2xl rounded-bl-none'
                  }`}>
                  {renderMessageContent(msg.text)}
                  {msg.timestamp && (
                    <div className={`text-[9px] mt-1 text-right font-mono ${msg.role === 'user' ? 'text-teal-200' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
               <div className="flex justify-start animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-[#007c76] text-white flex items-center justify-center text-[10px] font-black mr-2 shrink-0 mt-0.5">TH</div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none p-3.5 flex items-center gap-1.5 shadow-xs">
                     <span className="text-xs text-slate-400 font-medium mr-1">Đang trả lời</span>
                     <div className="w-1.5 h-1.5 bg-[#007c76] rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-[#007c76] rounded-full animate-bounce [animation-delay:0.2s]"></div>
                     <div className="w-1.5 h-1.5 bg-[#007c76] rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        {messages.length <= 4 && !isLoading && (
          <div className="px-3 py-2 bg-slate-100/90 border-t border-slate-200/60 flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((promptText, pIdx) => (
              <button
                key={pIdx}
                type="button"
                onClick={() => handleSend(promptText)}
                className="px-2.5 py-1 bg-white hover:bg-teal-50 text-teal-900 hover:text-[#007c76] border border-teal-200/80 rounded-xl text-[11px] font-bold transition-all cursor-pointer shadow-2xs active:scale-98"
              >
                💡 {promptText}
              </button>
            ))}
          </div>
        )}

        {/* Input Form Area (Zalo button removed as requested) */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-white border-t border-slate-200/80 flex items-center gap-2">
           <input 
              ref={inputRef}
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Nhập câu hỏi..." 
              disabled={isLoading}
              className="flex-1 bg-slate-50 text-slate-900 rounded-xl px-4 py-2.5 border border-slate-200 focus:bg-white focus:border-[#007c76] outline-none text-xs sm:text-sm transition-all" 
           />
           <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="text-white bg-[#007c76] hover:bg-[#00605b] disabled:bg-slate-300 disabled:cursor-not-allowed p-2.5 rounded-xl transition-all shadow-md active:scale-95 shrink-0 cursor-pointer"
           >
              {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                  <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              )}
           </button>
        </form>
      </div>

      {/* Simple Clean Floating Round AI Button */}
      <div className="pointer-events-auto">
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)} 
          title={isOpen ? "Đóng Trợ lý AI" : "Mở Trợ lý AI"}
          className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 z-[9999] border-2 border-white cursor-pointer ${
            isOpen 
              ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20' 
              : 'bg-[#007c76] hover:bg-[#005f5b] text-white shadow-[#007c76]/30'
          }`}
        >
          {isOpen ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <div className="flex items-center justify-center gap-1 font-black text-white text-sm">
              <svg className="w-5 h-5 text-amber-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L14.4 7.6L20 8.4L15.8 12.5L17 18.2L12 15.2L7 18.2L8.2 12.5L4 8.4L9.6 7.6L12 2Z"/>
              </svg>
              <span>AI</span>
            </div>
          )}
        </button>
      </div>
    </div>
  );
};

export default FloatingContact;
