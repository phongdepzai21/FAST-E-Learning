import React, { useState, useEffect } from 'react';
import { X, Printer, FileText, CheckCircle2, Download, AlertTriangle, Search } from 'lucide-react';

interface Iso22000ChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHECKLIST_SECTIONS = [
  {
    section: "ĐIỀU KHOẢN 4: BỐI CẢNH CỦA TỔ CHỨC",
    items: [
      { id: "4.1", clause: "Điều khoản 4.1", text: "Hiểu tổ chức và bối cảnh của tổ chức. Tổ chức đã xác định các vấn đề nội bộ và bên ngoài liên quan đến mục đích của mình và ảnh hưởng đến khả năng đạt được kết quả dự kiến của FSMS chưa?" },
      { id: "4.2.a", clause: "Điều khoản 4.2", text: "Hiểu nhu cầu và mong đợi của các bên quan tâm. Tổ chức đã xác định các bên quan tâm có liên quan đến FSMS chưa?" },
      { id: "4.2.b", clause: "Điều khoản 4.2", text: "Tổ chức đã xác định các yêu cầu có liên quan của các bên quan tâm đối với FSMS chưa?" },
      { id: "4.3", clause: "Điều khoản 4.3", text: "Xác định phạm vi của FSMS. Phạm vi có xác định rõ các sản phẩm, dịch vụ, quá trình và địa điểm sản xuất được bao gồm trong FSMS không?" },
      { id: "4.4", clause: "Điều khoản 4.4", text: "Hệ thống quản lý an toàn thực phẩm. Tổ chức đã thiết lập, thực hiện, duy trì, cập nhật và cải tiến liên tục FSMS, bao gồm các quá trình cần thiết và sự tương tác của chúng chưa?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 5: SỰ LÃNH ĐẠO",
    items: [
      { id: "5.1.a", clause: "Điều khoản 5.1", text: "Sự lãnh đạo và cam kết. Lãnh đạo cao nhất có thể hiện sự cam kết đối với FSMS bằng cách đảm bảo chính sách an toàn thực phẩm và các mục tiêu được thiết lập không?" },
      { id: "5.1.b", clause: "Điều khoản 5.1", text: "Lãnh đạo cao nhất có đảm bảo sự tích hợp các yêu cầu của FSMS vào các quá trình kinh doanh của tổ chức không?" },
      { id: "5.2.1", clause: "Điều khoản 5.2.1", text: "Chính sách an toàn thực phẩm. Chính sách có phù hợp với mục đích và bối cảnh của tổ chức, cung cấp khuôn khổ để thiết lập và xem xét các mục tiêu FSMS không?" },
      { id: "5.2.2", clause: "Điều khoản 5.2.2", text: "Truyền đạt chính sách an toàn thực phẩm. Chính sách có được truyền đạt, thấu hiểu và áp dụng ở mọi cấp trong tổ chức cũng như có sẵn cho các bên quan tâm liên quan không?" },
      { id: "5.3", clause: "Điều khoản 5.3", text: "Vai trò, trách nhiệm và quyền hạn. Lãnh đạo cao nhất đã phân công, truyền đạt trách nhiệm và quyền hạn chưa? Có bổ nhiệm Trưởng nhóm an toàn thực phẩm không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 6: HOẠCH ĐỊNH",
    items: [
      { id: "6.1.1", clause: "Điều khoản 6.1.1", text: "Hành động giải quyết rủi ro và cơ hội. Khi hoạch định FSMS, tổ chức đã xem xét các vấn đề nội bộ/bên ngoài và các bên quan tâm để xác định rủi ro và cơ hội cần giải quyết chưa?" },
      { id: "6.1.2", clause: "Điều khoản 6.1.2", text: "Tổ chức đã lên kế hoạch hành động để giải quyết các rủi ro và cơ hội này, cũng như cách thức tích hợp, thực hiện và đánh giá tính hiệu lực của chúng chưa?" },
      { id: "6.2.1", clause: "Điều khoản 6.2.1", text: "Mục tiêu FSMS. Tổ chức đã thiết lập các mục tiêu an toàn thực phẩm nhất quán với chính sách, có thể đo lường, được theo dõi và cập nhật không?" },
      { id: "6.2.2", clause: "Điều khoản 6.2.2", text: "Khi hoạch định cách thức đạt được mục tiêu, tổ chức đã xác định: cần làm gì, nguồn lực nào, ai chịu trách nhiệm, thời hạn và cách thức đánh giá kết quả chưa?" },
      { id: "6.3", clause: "Điều khoản 6.3", text: "Hoạch định sự thay đổi. Khi có sự thay đổi đối với FSMS, tổ chức có thực hiện thay đổi một cách có kế hoạch không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 7: HỖ TRỢ",
    items: [
      { id: "7.1.1", clause: "Điều khoản 7.1.1", text: "Nguồn lực chung. Tổ chức đã xác định và cung cấp nguồn lực cần thiết cho việc thiết lập, duy trì và cải tiến liên tục FSMS chưa?" },
      { id: "7.1.2", clause: "Điều khoản 7.1.2", text: "Con người. Tổ chức đã cung cấp đủ nhân sự có năng lực để vận hành FSMS một cách có hiệu lực chưa?" },
      { id: "7.1.3", clause: "Điều khoản 7.1.3", text: "Cơ sở hạ tầng. Tổ chức có cung cấp và duy trì cơ sở hạ tầng cần thiết (nhà xưởng, thiết bị, vận tải, CNTT) không?" },
      { id: "7.1.4", clause: "Điều khoản 7.1.4", text: "Môi trường làm việc. Tổ chức đã xác định, cung cấp và duy trì môi trường làm việc phù hợp để đảm bảo an toàn thực phẩm chưa?" },
      { id: "7.1.6", clause: "Điều khoản 7.1.6", text: "Tổ chức có đánh giá, lựa chọn và giám sát các nhà cung cấp bên ngoài (nguyên liệu, dịch vụ) để đảm bảo không ảnh hưởng đến an toàn thực phẩm không?" },
      { id: "7.2", clause: "Điều khoản 7.2", text: "Năng lực. Đảm bảo nhân sự có năng lực (dựa trên giáo dục, đào tạo hoặc kinh nghiệm), và lưu giữ thông tin văn bản làm bằng chứng chưa?" },
      { id: "7.3", clause: "Điều khoản 7.3", text: "Nhận thức. Các cá nhân làm việc có nhận thức được chính sách ATTP, mục tiêu FSMS liên quan đến công việc của họ không?" },
      { id: "7.4", clause: "Điều khoản 7.4", text: "Trao đổi thông tin. Tổ chức đã xác định các hoạt động trao đổi thông tin nội bộ và bên ngoài (trao đổi cái gì, khi nào, với ai, như thế nào) chưa?" },
      { id: "7.5", clause: "Điều khoản 7.5", text: "Thông tin được văn bản hóa. FSMS có bao gồm hệ thống tạo lập, cập nhật và kiểm soát tài liệu rõ ràng không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 8: THỰC HIỆN",
    items: [
      { id: "8.1.1", clause: "Điều khoản 8.1", text: "Hoạch định và kiểm soát thực hiện. Tổ chức có hoạch định, thực hiện, kiểm soát các quá trình cần thiết để đáp ứng các yêu cầu về việc tạo ra sản phẩm an toàn không?" },
      { id: "8.2.1", clause: "Điều khoản 8.2.1", text: "Chương trình tiên quyết (PRP). Tổ chức có thiết lập, áp dụng và cập nhật các PRP để ngăn ngừa/giảm bớt ô nhiễm vào sản phẩm không?" },
      { id: "8.3.1", clause: "Điều khoản 8.3", text: "Hệ thống truy xuất nguồn gốc. Hệ thống có khả năng nhận diện nguyên vật liệu đầu vào và tuyến phân phối sản phẩm đầu ra không?" },
      { id: "8.4.1", clause: "Điều khoản 8.4", text: "Ứng phó khẩn cấp. Tổ chức có đảm bảo sẵn sàng ứng phó với các tình huống khẩn cấp (cháy, ngập lụt, cúp điện...) ảnh hưởng đến ATTP không?" },
      { id: "8.5.1", clause: "Điều khoản 8.5.1", text: "Phân tích mối nguy. Đội ATTP có tiến hành phân tích mối nguy để xác định các mối nguy cần kiểm soát không?" },
      { id: "8.5.2", clause: "Điều khoản 8.5.2", text: "Nhận diện & Đánh giá mối nguy. Tất cả các mối nguy có được đánh giá rủi ro dựa trên mức độ nghiêm trọng và khả năng xảy ra không?" },
      { id: "8.5.4", clause: "Điều khoản 8.5.4", text: "Kế hoạch kiểm soát mối nguy (HACCP/OPRP). Kế hoạch có bao gồm: Giới hạn tới hạn/Tiêu chí hành động, Giám sát, Hành động khắc phục không?" },
      { id: "8.7", clause: "Điều khoản 8.7", text: "Kiểm soát thiết bị đo lường. Thiết bị đo lường được chỉ định là đáng tin cậy, được hiệu chuẩn định kỳ hoặc kiểm tra không?" },
      { id: "8.8", clause: "Điều khoản 8.8", text: "Thẩm tra (Verification). Tổ chức có lập lịch và thực hiện các hoạt động thẩm tra để chứng minh PRPs và Kế hoạch HACCP/OPRP được tuân thủ không?" },
      { id: "8.9.3", clause: "Điều khoản 8.9.3", text: "Hành động khắc phục. Tổ chức có tiến hành phân tích nguyên nhân gốc rễ để ngăn ngừa lỗi tái diễn không?" },
      { id: "8.9.5", clause: "Điều khoản 8.9.5", text: "Thu hồi sản phẩm (Recall). Tổ chức có quy trình thu hồi lô sản phẩm không an toàn không? Có diễn tập thu hồi không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 9: ĐÁNH GIÁ KẾT QUẢ HOẠT ĐỘNG",
    items: [
      { id: "9.1.1", clause: "Điều khoản 9.1.1", text: "Theo dõi, đo lường, phân tích và đánh giá. Tổ chức có xác định những gì cần theo dõi, phương pháp, thời điểm và cách thức phân tích kết quả chưa?" },
      { id: "9.1.2", clause: "Điều khoản 9.1.2", text: "Phân tích và đánh giá dữ liệu. Tổ chức có đánh giá thông tin phát sinh từ quá trình theo dõi, đo lường (kể cả kết quả thẩm tra PRPs và HACCP) không?" },
      { id: "9.2.1", clause: "Điều khoản 9.2.1", text: "Đánh giá nội bộ. Tổ chức có tiến hành đánh giá nội bộ theo các khoảng thời gian được hoạch định để cung cấp thông tin xem FSMS có phù hợp không?" },
      { id: "9.2.2", clause: "Điều khoản 9.2.2", text: "Chương trình đánh giá nội bộ có đảm bảo tính khách quan và công bằng không (người đánh giá không tự đánh giá công việc của mình)?" },
      { id: "9.3.1", clause: "Điều khoản 9.3.1", text: "Xem xét của lãnh đạo. Lãnh đạo cao nhất có tiến hành xem xét FSMS theo định kỳ để đảm bảo sự phù hợp, thỏa đáng và hiệu lực liên tục không?" },
      { id: "9.3.3", clause: "Điều khoản 9.3.3", text: "Đầu ra xem xét của lãnh đạo có bao gồm các quyết định về cơ hội cải tiến, nhu cầu thay đổi đối với FSMS và nguồn lực không?" }
    ]
  },
  {
    section: "ĐIỀU KHOẢN 10: CẢI TIẾN",
    items: [
      { id: "10.1.1", clause: "Điều khoản 10.1.1", text: "Sự không phù hợp và hành động khắc phục. Khi sự không phù hợp xảy ra, tổ chức có hành động để kiểm soát, khắc phục và xử lý hệ quả không?" },
      { id: "10.1.2", clause: "Điều khoản 10.1.2", text: "Tổ chức có đánh giá nhu cầu hành động nhằm loại bỏ nguyên nhân gốc rễ của sự không phù hợp để nó không tái diễn không?" },
      { id: "10.2", clause: "Điều khoản 10.2", text: "Cải tiến liên tục. Lãnh đạo cao nhất có đảm bảo tổ chức liên tục nâng cao tính hiệu lực của FSMS thông qua xem xét lãnh đạo, đánh giá nội bộ, hành động khắc phục không?" },
      { id: "10.3", clause: "Điều khoản 10.3", text: "Cập nhật Hệ thống quản lý ATTP. Tổ chức có đánh giá FSMS định kỳ để đảm bảo các mối nguy đã được kiểm soát một cách phù hợp và cập nhật chưa?" }
    ]
  }
];

export const Iso22000ChecklistModal: React.FC<Iso22000ChecklistModalProps> = ({ isOpen, onClose }) => {
  const [evaluations, setEvaluations] = useState<Record<string, 'Y' | 'N' | 'NI' | 'NA'>>({});
  const [severities, setSeverities] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [capas, setCapas] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [clientName, setClientName] = useState('');
  const [leadAuditor, setLeadAuditor] = useState('');

  if (!isOpen) return null;

  const totalItems = CHECKLIST_SECTIONS.reduce((acc, sec) => acc + sec.items.length, 0);
  const completedCount = Object.keys(evaluations).length;
  const percentage = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadReport = () => {
    let rows = '';
    let majorCount = 0, minorCount = 0, obsCount = 0;

    CHECKLIST_SECTIONS.forEach(sec => {
      sec.items.forEach(item => {
        const sev = severities[item.id];
        const status = evaluations[item.id] || 'Chưa đánh giá';
        const note = comments[item.id] || '';
        const capa = capas[item.id] || '';

        if (sev) {
          if (sev === 'Major') majorCount++;
          if (sev === 'Minor') minorCount++;
          if (sev === 'Observation') obsCount++;

          rows += `<tr>
            <td style="padding: 8px; border: 1px solid #000;"><strong>${item.clause}</strong></td>
            <td style="padding: 8px; border: 1px solid #000;">${item.text}</td>
            <td style="padding: 8px; border: 1px solid #000; text-align: center;">${status}</td>
            <td style="padding: 8px; border: 1px solid #000; text-align: center; font-weight: bold;">${sev}</td>
            <td style="padding: 8px; border: 1px solid #000;">${note}</td>
            <td style="padding: 8px; border: 1px solid #000;">${capa}</td>
          </tr>`;
        }
      });
    });

    const printWin = window.open('', '_blank');
    if (!printWin) return;

    printWin.document.write(`
      <html>
        <head>
          <title>Báo cáo NCR & CAPA ISO 22000 - FAST CONSULTING</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.5; color: #1e293b; }
            h1 { color: #007c76; text-align: center; border-bottom: 2px solid #007c76; padding-bottom: 10px; }
            .info { background: #f0fdfa; padding: 15px; border-radius: 8px; border: 1px solid #99f6e4; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
            th { background: #007c76; color: white; padding: 10px; border: 1px solid #000; }
          </style>
        </head>
        <body>
          <h1>FAST CONSULTING - BÁO CÁO ĐÁNH GIÁ ISO 22000:2018</h1>
          <div class="info">
            <p><strong>Khách hàng:</strong> ${clientName || '...........................................'}</p>
            <p><strong>Chuyên gia đánh giá:</strong> ${leadAuditor || '...........................................'}</p>
            <p><strong>Tổng số lỗi phân loại:</strong> Major: ${majorCount} | Minor: ${minorCount} | Observation: ${obsCount}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Điều khoản</th>
                <th>Yêu cầu</th>
                <th>Kết quả</th>
                <th>Phân loại</th>
                <th>Bằng chứng</th>
                <th>Hành động khắc phục (CAPA)</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="6" style="text-align:center; padding: 15px;">Chưa phân loại lỗi nào.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWin.document.close();
    setTimeout(() => printWin.print(), 300);
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-slate-950/80 backdrop-blur-md flex flex-col justify-between overflow-hidden animate-in fade-in">
      {/* Modal Header */}
      <div className="bg-[#007c76] text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center font-black text-lg">
            📋
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tight leading-snug">
              Checklist Đánh Giá Tiêu Chuẩn ISO 22000:2018 (Full Version)
            </h2>
            <p className="text-xs text-teal-100 font-medium">FAST CONSULTING - Food All Standard & Training</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">In Checklist</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadReport}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4" />
            <span>Xuất Báo Cáo NCR & CAPA</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Progress & Search Toolbar */}
      <div className="bg-slate-100 border-b border-slate-200 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-black text-slate-700 uppercase tracking-wider shrink-0">
            Tiến độ: {completedCount}/{totalItems} ({percentage}%)
          </span>
          <div className="w-48 h-3 bg-slate-200 rounded-full overflow-hidden shrink-0">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${percentage}%` }}></div>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm điều khoản, nội dung..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:outline-none focus:border-[#007c76]"
          />
        </div>
      </div>

      {/* Client Audit Info Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div>
          <label className="font-bold text-slate-500 block mb-1">Tên Doanh Nghiệp / Khách Hàng:</label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="VD: Công ty TNHH Thực Phẩm ABC"
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
          />
        </div>
        <div>
          <label className="font-bold text-slate-500 block mb-1">Chuyên Gia Đánh Giá (Lead Auditor):</label>
          <input
            type="text"
            value={leadAuditor}
            onChange={(e) => setLeadAuditor(e.target.value)}
            placeholder="VD: Chuyên gia FAST CONSULTING"
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-800"
          />
        </div>
      </div>

      {/* Checklist Content Viewport */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/90 custom-scrollbar">
        {CHECKLIST_SECTIONS.map((sec, sIdx) => {
          const filteredItems = sec.items.filter(item =>
            item.clause.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.text.toLowerCase().includes(searchQuery.toLowerCase())
          );

          if (searchQuery && filteredItems.length === 0) return null;

          return (
            <div key={sIdx} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="bg-teal-50/80 px-5 py-3 border-b border-teal-100 font-extrabold text-sm text-[#007c76]">
                {sec.section}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4 w-5/12">Yêu cầu &amp; Tiêu chuẩn ISO 22000</th>
                      <th className="py-3 px-4 text-center w-2/12">Đánh Giá Tuân Thủ</th>
                      <th className="py-3 px-4 w-5/12">Phân Loại Lỗi, Bằng Chứng &amp; CAPA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(searchQuery ? filteredItems : sec.items).map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 align-top">
                          <span className="inline-block px-2 py-0.5 bg-teal-100 text-[#007c76] rounded text-[10px] font-black mb-1">
                            {item.clause}
                          </span>
                          <p className="font-medium text-slate-800 leading-relaxed">{item.text}</p>
                        </td>

                        <td className="py-3.5 px-4 align-top text-center">
                          <div className="inline-flex gap-2 bg-slate-100 p-1 rounded-xl">
                            {(['Y', 'N', 'NI', 'NA'] as const).map((val) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setEvaluations(prev => ({ ...prev, [item.id]: val }))}
                                className={`px-2.5 py-1 rounded-lg font-black text-xs transition-all cursor-pointer ${
                                  evaluations[item.id] === val
                                    ? val === 'Y'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : val === 'N'
                                      ? 'bg-red-600 text-white shadow-xs'
                                      : 'bg-amber-500 text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-white'
                                }`}
                              >
                                {val}
                              </button>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 align-top space-y-2">
                          <select
                            value={severities[item.id] || ''}
                            onChange={(e) => setSeverities(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700"
                          >
                            <option value="">-- Phân loại lỗi --</option>
                            <option value="Major">Major (Lỗi Nặng)</option>
                            <option value="Minor">Minor (Lỗi Nhẹ)</option>
                            <option value="Observation">Observation (Quan sát)</option>
                          </select>

                          <textarea
                            rows={1}
                            value={comments[item.id] || ''}
                            onChange={(e) => setComments(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Ghi chú / Bằng chứng đánh giá..."
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:bg-white focus:border-[#007c76] outline-none"
                          />

                          <textarea
                            rows={1}
                            value={capas[item.id] || ''}
                            onChange={(e) => setCapas(prev => ({ ...prev, [item.id]: e.target.value }))}
                            placeholder="Hành động khắc phục CAPA..."
                            className="w-full px-3 py-1.5 bg-blue-50/60 border border-blue-200 rounded-lg text-xs font-medium focus:bg-white focus:border-blue-500 outline-none text-blue-900"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Footer */}
      <div className="bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
        <span className="text-xs text-slate-500 font-bold">
          FAST CONSULTING • Hotline: 0927 002 668 • support@fastelearning.com.vn
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          Đóng Checklist
        </button>
      </div>
    </div>
  );
};

export default Iso22000ChecklistModal;
