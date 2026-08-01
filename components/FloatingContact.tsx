
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { COURSES, CONSULTING_SERVICES, TEAM, getMergedCourses } from '../constants';
import { Course } from '../types';

interface Message {
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

const FloatingContact: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model', 
      text: 'Chào bạn! Tôi là trợ lý AI của FAST E-Learning. 🤖\n\nTôi có thể giúp bạn tìm hiểu về **các khóa học ISO/HACCP**, **dịch vụ tư vấn**, hoặc giải đáp thắc mắc về **An toàn thực phẩm**. \n\nBạn đang quan tâm đến nội dung nào?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isOpen]);

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

  // Focus vào ô nhập liệu khi mở chat
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Render nội dung tin nhắn (Hỗ trợ Markdown cơ bản: In đậm, Xuống dòng)
  const renderMessageContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Xử lý list item
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;
      
      // Xử lý in đậm (**text**)
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      
      const content = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-bold text-inherit">{part.slice(2, -2)}</strong>;
        }
        return <span key={j}>{part}</span>;
      });

      if (isBullet) {
        return (
          <div key={i} className="flex items-start gap-2 mb-1 pl-1">
            <span className="text-current opacity-70 mt-1.5 w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
            <span className="leading-relaxed">{content}</span>
          </div>
        );
      }
      
      // Xử lý dòng trống
      if (line.trim() === '') return <div key={i} className="h-2"></div>;

      return <p key={i} className="mb-1 leading-relaxed">{content}</p>;
    });
  };

  // Tạo System Prompt thông minh dựa trên dữ liệu thật
  const systemContext = useMemo(() => {
    const courseData = liveCourses.map(c => `- Khóa học: "${c.title}" (Giá: ${c.price}). Danh mục: ${c.category}. Mô tả: ${c.description || 'Chưa cập nhật'}.`).join('\n');
    const serviceData = CONSULTING_SERVICES.map(s => `- Dịch vụ tư vấn: "${s.title}". Mô tả: ${s.description}.`).join('\n');
    const teamData = TEAM.map(t => `- Chuyên gia: ${t.name} (${t.role})`).join('\n');
    
    return `
      Bạn là Trợ lý AI Chuyên nghiệp của FAST E-Learning (Website: 2fast.com.vn).
      Nhiệm vụ của bạn là tư vấn bán hàng, giải đáp thắc mắc về khóa học và dịch vụ tư vấn ISO/HACCP/QA-QC.

      THÔNG TIN LIÊN HỆ CÔNG TY:
      - Hotline/Zalo: 0898 419 149
      - Email: hkc.qms@gmail.com
      - Địa chỉ: Cityland Park Hills, Gò Vấp, TP.HCM

      DANH SÁCH KHÓA HỌC HIỆN CÓ:
      ${courseData}

      DỊCH VỤ TƯ VẤN DOANH NGHIỆP:
      ${serviceData}

      ĐỘI NGŨ CHUYÊN GIA:
      ${teamData}

      QUY TẮC TRẢ LỜI:
      1. Trả lời NGẮN GỌN, SÚC TÍCH, đi thẳng vào vấn đề.
      2. Luôn lịch sự, xưng "mình" hoặc "FAST" và gọi khách là "bạn".
      3. Nếu khách hỏi giá, hãy cung cấp giá chính xác từ dữ liệu trên.
      4. Nếu khách hỏi vấn đề chuyên môn sâu không có trong dữ liệu, hãy gợi ý họ liên hệ Hotline hoặc Zalo.
      5. Sử dụng định dạng **in đậm** cho các thông tin quan trọng (Tên khóa học, Giá, Số điện thoại).
      6. Không bịa đặt thông tin không có trong dữ liệu.
      7. Nếu học viên hỏi về cách học: Hướng dẫn họ chọn bài học trong chương trình, video sẽ tự động phát. Có thể thả tim (Like) bài học. Tiến độ sẽ tự động cập nhật khi xem hết video.
    `;
  }, [liveCourses]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    const updatedMessages = [...messages, { role: 'user' as const, text: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

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

      // Tạo tin nhắn placeholder cho model
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

      while (reader) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.error) {
                throw new Error(data.error);
              }
              if (data.text) {
                fullText += data.text;
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg.role === 'model') {
                    updated[updated.length - 1] = { ...lastMsg, text: fullText };
                  }
                  return updated;
                });
              }
            } catch (e) {
              // ignore parse errors
            }
          }
        }
      }
    } catch (error: any) {
      console.error("AI Chat Error Full Details:", error);
      
      let errorMessage = "Xin lỗi, hệ thống đang bận. Vui lòng thử lại sau.";
      
      // Xử lý các lỗi cụ thể
      if (error.message?.includes('API_KEY') || error.toString().includes('API Key') || error.toString().includes('process is not defined')) {
        errorMessage = "Hệ thống chưa cấu hình API Key. Vui lòng liên hệ Admin.";
      } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
         errorMessage = "Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền.";
      }

      setMessages(prev => [...prev, { role: 'model', text: errorMessage, isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Z-index adjusted to 90 to sit below PaymentModal (100) but above content
    <div className="fixed bottom-6 right-4 md:right-8 z-[90] font-sans flex flex-col items-end pointer-events-none">
      
      {/* Chat Window */}
      <div className={`pointer-events-auto w-[92vw] md:w-[380px] bg-white rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 origin-bottom-right mb-4 flex flex-col ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-90 h-0 invisible'}`}>
        
        {/* Header */}
        <div className="bg-[#007c76] p-4 flex items-center justify-between text-white shadow-md z-10">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">Trợ lý ảo FAST</h3>
                <div className="flex items-center gap-1.5">
                   <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                   <span className="text-[10px] text-white/90 font-medium">Đang hoạt động</span>
                </div>
              </div>
           </div>
           <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        {/* Message List */}
        <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-[#f8fafc] scroll-smooth custom-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                
                {msg.role === 'model' && (
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#007c76] flex items-center justify-center text-white text-[10px] font-black mr-2 shrink-0 mt-1 shadow-sm">
                    AI
                  </div>
                )}

                <div className={`max-w-[85%] p-3.5 text-sm shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-[#007c76] text-white rounded-2xl rounded-br-none' 
                    : msg.isError 
                        ? 'bg-red-50 text-red-600 border border-red-100 rounded-2xl rounded-bl-none'
                        : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-none'
                  }`}>
                  {renderMessageContent(msg.text)}
                </div>
              </div>
            ))}
            
            {isLoading && (
               <div className="flex justify-start animate-pulse">
                  <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-[#007c76] flex items-center justify-center text-white text-[10px] font-black mr-2 shrink-0 mt-1">AI</div>
                  <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none p-3.5 flex items-center gap-1 shadow-sm">
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
               </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 bg-white border-t border-gray-100 flex items-center gap-2">
           <input 
              ref={inputRef}
              value={input} 
              onChange={(e) => setInput(e.target.value)} 
              placeholder="Nhập câu hỏi..." 
              disabled={isLoading}
              className="flex-1 bg-gray-50 text-gray-800 rounded-xl px-4 py-3 border border-transparent focus:bg-white focus:border-[#007c76] outline-none text-sm transition-all" 
           />
           <button 
              type="submit" 
              disabled={!input.trim() || isLoading}
              className="text-white bg-[#007c76] hover:bg-[#00605b] disabled:bg-gray-300 disabled:cursor-not-allowed p-3 rounded-xl transition-all shadow-md active:scale-95"
           >
              {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              ) : (
                  <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              )}
           </button>
        </form>
      </div>

      {/* Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`pointer-events-auto flex items-center justify-center w-14 h-14 md:w-16 md:h-16 bg-[#007c76] rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-[#007c76]/40 z-[9999] ${isOpen ? 'rotate-90 bg-red-500 hover:bg-red-600' : ''}`}
      >
        {isOpen ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        ) : (
            <div className="relative">
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
        )}
      </button>
    </div>
  );
};

export default FloatingContact;
