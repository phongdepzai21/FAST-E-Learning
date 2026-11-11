import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { Bot } from 'lucide-react';
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

  const getExpertLocalReply = (query: string): string => {
    const q = query.toLowerCase().trim();

    if (q.includes('22000') || q.includes('iso 22000') || q.includes('iso22000')) {
      return `Khóa học **ISO 22000:2018 - Hệ Thống Quản Lý An Toàn Thực Phẩm** tại FAST gồm các học phần trọng tâm:
1. **Tổng quan tiêu chuẩn & Chu trình PDCA**: Nhận diện bối cảnh tổ chức, tư duy dựa trên rủi ro.
2. **Các chương trình tiên quyết (PRP)** theo ISO/TS 22002-1 cho sản xuất chế biến.
3. **Phân tích mối nguy & Điểm kiểm soát tới hạn (HACCP)**: 7 nguyên tắc & 12 bước thực hành.
4. **Kế hoạch OPRP & CCP**: Xác lập giới hạn tới hạn, giám sát và hành động khắc phục CAPA.
5. **Truy xuất nguồn gốc & Kiểm soát sự không phù hợp (NCR)**.
6. **Đánh giá nội bộ & Bộ Checklist audit điều khoản 4 - 10**.

Học phí ưu đãi: **599.000đ** (kèm chứng nhận điện tử bảo mật 10 chữ số).
👉 Bạn có thể đăng ký trực tuyến hoặc kết nối Hotline/Zalo **0927 002 668** để được hướng dẫn chi tiết!`;
    }

    if (q.includes('an toàn thực phẩm') || q.includes('attp') || q.includes('vệ sinh') || q.includes('tư vấn') || q.includes('giấy chứng nhận') || q.includes('bếp')) {
      return `FAST Consulting cung cấp dịch vụ **Tư vấn An toàn thực phẩm trọn gói** cho doanh nghiệp F&B:
1. **Khảo sát hiện trạng & Thiết kế bếp một chiều**: Phân luồng chống nhiễm chéo chuẩn quy định của Bộ Y tế.
2. **Soạn thảo toàn bộ hồ sơ pháp lý**: Đơn đề nghị Mẫu số 01, Bản thuyết minh cơ sở vật chất Mẫu 02a theo Nghị định 15/2018/NĐ-CP.
3. **Đào tạo & Cấp chứng nhận tập huấn kiến thức ATTP** cho chủ cơ sở và toàn bộ nhân sự.
4. **Kiểm soát nguồn gốc & Lập hồ sơ truy xuất nguyên liệu thực phẩm**.
5. **Đồng hành tiếp đoàn thẩm định** liên ngành Chi cục ATTP đến khi nhận Giấy chứng nhận.

👉 Đội ngũ chuyên gia luôn sẵn sàng hỗ trợ bạn qua Hotline/Zalo: **0927 002 668**!`;
    }

    if (q.includes('haccp') || q.includes('mối nguy') || q.includes('ccp')) {
      return `Khóa học **HACCP (Phân tích mối nguy và Điểm kiểm soát tới hạn)** tại FAST trang bị:
- 12 bước xây dựng hệ thống và 7 nguyên tắc HACCP theo tiêu chuẩn quốc tế Codex 2020.
- Ma trận nhận diện và phân tích mối nguy sinh học, hóa học, vật lý, chất gây dị ứng.
- Phương pháp xác lập CCP, OPRP và xây dựng bảng kế hoạch HACCP ứng dụng thực tế.
- Bộ biểu mẫu giám sát, thẩm tra và hành động khắc phục thực tế.

👉 Lớp đào tạo trực tiếp / Zoom học phí chỉ **199.000đ**. Liên hệ Hotline/Zalo **0927 002 668** để đăng ký ngay!`;
    }

    if (q.includes('học phí') || q.includes('giá') || q.includes('chi phí') || q.includes('bao nhiêu') || q.includes('tiền')) {
      return `Bảng học phí các chương trình đào tạo tại FAST E-Learning:
- **Khóa đào tạo trực tiếp / Zoom (ATTP & HACCP)**: Chỉ **199.000đ/học viên** (lịch học tương tác trực tiếp với chuyên gia).
- **Khóa lẻ E-Learning trực tuyến**: Từ **299.000đ - 799.000đ/khóa** (ISO 9001, ISO 22000, HACCP, QA/QC, BRCGS...).
- **Gói Combo ưu đãi trọn gói**: Tiết kiệm tới 60% học phí so với đăng ký lẻ.

Mọi học viên đều được cấp tài khoản truy cập vĩnh viễn và chứng nhận hoàn thành điện tử có mã số 10 chữ số chuẩn hóa!`;
    }

    if (q.includes('combo') || q.includes('gói')) {
      return `FAST có các **Gói Combo tiết kiệm** dành cho học viên và doanh nghiệp:
- **Combo Tiêu chuẩn F&B (HACCP + ISO 22000)**: Nắm trọn bộ kỹ năng kiểm soát an toàn thực phẩm.
- **Combo Quản lý chất lượng chuyên sâu (ISO 9001 + ISO 22000 + QA/QC)**.
- **Combo Doanh nghiệp F&B trọn gói**: Bao gồm cả đào tạo nhân sự và bộ tài liệu biểu mẫu áp dụng thực tế.

👉 Vui lòng xem tab **Gói Combo** trên thanh điều hướng hoặc gọi Hotline **0927 002 668** để được tư vấn gói phù hợp nhất!`;
    }

    if (q.includes('hotline') || q.includes('liên hệ') || q.includes('zalo') || q.includes('sđt') || q.includes('điện thoại') || q.includes('địa chỉ') || q.includes('ở đâu')) {
      return `Thông tin liên hệ chính thức của FAST:
- **Hotline / Zalo tư vấn 24/7**: **0927 002 668**
- **Email**: \`hkc.qms@gmail.com\` / \`support@fastelearning.com.vn\`
- **Trụ sở miền Nam**: Tòa nhà Mộc Gia, Tầng 6, Số 238-240-242 Nguyễn Oanh, P.17, Gò Vấp, TP.HCM
- **Cơ sở miền Bắc**: Tòa nhà FAST E-Learning, Số 18 Phố Nguyễn Cơ Thạch, Nam Từ Liêm, Hà Nội.`;
    }

    return `Chào bạn! Tôi là **Trần Hạnh** - Trợ lý chuyên gia FAST E-Learning. 
Tôi có thể hỗ trợ bạn về:
- Các khóa đào tạo **ISO 22000, HACCP, ISO 9001, QA/QC** (lớp Zoom/trực tiếp chỉ **199k**).
- Dịch vụ **Tư vấn trọn gói Giấy phép An toàn thực phẩm**, thiết kế bếp một chiều.
- Hướng dẫn thủ tục đăng ký, học phí và xuất hóa đơn VAT.

👉 Bạn cần hỗ trợ chi tiết phần nào hoặc có thể liên hệ ngay Hotline/Zalo: **0927 002 668** nhé!`;
  };

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
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        }
      }

      // Nếu stream kết thúc mà không có nội dung, sử dụng bộ giải đáp chuyên gia địa phương
      if (!fullText.trim()) {
        const fallbackText = getExpertLocalReply(textToSend);
        setMessages(prev => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'model') {
            updated[updated.length - 1] = { ...lastMsg, text: fallbackText };
          }
          return updated;
        });
      }
    } catch (error: any) {
      console.warn("Trợ lý Trần Hạnh chuyển sang bộ giải đáp chuyên gia FAST:", error);
      const fallbackText = getExpertLocalReply(textToSend);
      setMessages(prev => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg && lastMsg.role === 'model' && !lastMsg.text) {
          updated[updated.length - 1] = { ...lastMsg, text: fallbackText };
          return updated;
        }
        return [...prev, {
          role: 'model',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        }];
      });
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
            <Bot className="w-7 h-7 text-white" />
          )}
        </button>
      </div>
    </div>
  );
};

export default FloatingContact;
