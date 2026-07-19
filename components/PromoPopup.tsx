
import React, { useState } from 'react';

const PromoPopup: React.FC = () => {
  // KHỞI TẠO TRẠNG THÁI TRỰC TIẾP: Kiểm tra session ngay khi component được tạo
  // Điều này giúp Popup hiển thị ngay lập tức mà không cần chờ render lần đầu (zero delay)
  const [isVisible, setIsVisible] = useState(() => {
    // Thay đổi key version để popup hiện lại khi có ảnh mới
    const hasSeen = sessionStorage.getItem('promo_popup_instant_v2');
    return !hasSeen; // Nếu chưa xem -> true (hiện), đã xem -> false (ẩn)
  });

  const handleClose = () => {
    setIsVisible(false);
    // Lưu trạng thái đã xem vào session
    sessionStorage.setItem('promo_popup_instant_v2', 'true');
  };

  if (!isVisible) return null;

  // Link Dropbox (CẬP NHẬT: dùng raw=1 để hiển thị ảnh trực tiếp)
  const promoImageUrl = "https://www.dropbox.com/scl/fi/kattm3zy6zk92lukh936u/TH-NG-B-O-NGH-T-T-D-NG-L-CH.png?rlkey=k4evket5kgl16w2xchawho61t&st=b00vjylj&raw=1";
  
  // Ảnh dự phòng
  const fallbackImage = "https://images.unsplash.com/photo-1705634023773-049830573752?q=80&w=1000&auto=format&fit=crop";

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop mờ tối */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
        onClick={handleClose}
      ></div>

      {/* Nội dung Popup */}
      <div className="relative w-full max-w-2xl bg-transparent rounded-2xl shadow-2xl transform transition-all scale-100">
        
        {/* Nút X đóng popup */}
        <button
          onClick={handleClose}
          className="absolute -top-4 -right-4 md:-top-6 md:-right-6 bg-white text-gray-800 hover:bg-red-500 hover:text-white w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-black text-xl shadow-lg border-4 border-black/10 transition-all z-50 group"
          aria-label="Đóng quảng cáo"
        >
          <svg className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>

        {/* Vùng chứa ảnh - Thêm viền trắng 8px */}
        <div className="overflow-hidden rounded-2xl bg-white relative min-h-[300px] flex items-center justify-center border-[8px] border-white box-border shadow-2xl">
           <img
             src={promoImageUrl}
             alt="Thông báo"
             className="w-full h-auto max-h-[80vh] object-contain block"
             onError={(e) => {
               e.currentTarget.src = fallbackImage;
             }}
           />
           
           {/* Link CTA ẩn bao phủ toàn bộ ảnh (nếu muốn click vào ảnh để đi đâu đó) */}
           <a href="https://2fast.com.vn" target="_blank" rel="noreferrer" className="absolute inset-0 z-10" title="Xem chi tiết"></a>
        </div>
      </div>
    </div>
  );
};

export default PromoPopup;
