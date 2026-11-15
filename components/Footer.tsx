
import React, { useState } from 'react';
// Fix: Standardize react-router-dom Link import
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  const phoneNumber = "0927 002 668";
  const rawPhone = "0927002668";
  const email = "hkc.qms@gmail.com";
  const facebookLink = "https://www.facebook.com/hethongquanlychatluongfast";
  const gmailLink = "https://mail.google.com/mail/u/0/?fs=1&to=hkc.qms@gmail.com&su=Li%C3%AAn+h%E1%BB%87+t%E1%BB%AB+website+HKC&body=Xin+ch%C3%A0o,+t%C3%B4i+mu%E1%BB%91n+%C4%91%C6%B0%E1%BB%A3c+h%E1%BB%97+tr%E1%BB%A3.&tf=cm";
  const linkedinLink = "https://www.linkedin.com/company/96365912/";
  const mainWebsite = "https://2fast.com.vn";

  const iconContainerClasses = "w-10 h-10 md:w-12 md:h-12 hover:scale-110 transition-transform drop-shadow-md flex items-center justify-center bg-white rounded-[12px] p-2 md:p-2.5 border border-gray-100 shadow-sm";

  return (
    <footer className="bg-[#f8f9fa] py-12 md:py-24 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col mb-10 md:mb-16 items-center md:items-start">
          <div className="mb-1 md:mb-2">
            <h3 className="font-black text-3xl md:text-5xl text-[#007c76] uppercase tracking-[0.03em] leading-[1.45] text-center md:text-left">
              FAST E-Learning
            </h3>
          </div>
          <h4 className="text-sm md:text-lg text-[#007c76] font-black uppercase tracking-widest text-center md:text-left mb-4">
            Food all standard & training
          </h4>
          <p className="text-sm md:text-base text-[#374151] leading-relaxed font-semibold max-w-3xl text-center md:text-left">
            Nền tảng học trực tuyến hàng đầu về an toàn thực phẩm. Thành viên của hệ sinh thái học tập & tư vấn FAST Consulting.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 text-center md:text-left border-t border-gray-200 pt-10 md:pt-14">
          <div className="lg:col-span-2 flex flex-col">
            <h4 className="text-[#374151] mb-5 md:mb-6 text-sm font-black uppercase tracking-wider border-l-4 border-[#007c76] pl-3">KẾT NỐI ĐA KÊNH</h4>
            <div className="flex flex-wrap justify-center md:justify-start lg:grid lg:grid-cols-2 gap-3 w-fit mx-auto md:mx-0">
              <a href={facebookLink} target="_blank" rel="noreferrer" className={iconContainerClasses}>
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/b/b8/2021_Facebook_icon.svg" 
                  alt="Facebook" 
                  className="w-full h-full object-contain" 
                  width="48" 
                  height="48" 
                  loading="lazy" 
                  decoding="async" 
                />
              </a>
              <a href={`https://zalo.me/${rawPhone}`} target="_blank" rel="noreferrer" className={iconContainerClasses}>
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/9/91/Icon_of_Zalo.svg" 
                  alt="Zalo" 
                  className="w-full h-full object-contain" 
                  width="48" 
                  height="48" 
                  loading="lazy" 
                  decoding="async" 
                />
              </a>
              <a href={gmailLink} target="_blank" rel="noreferrer" className={iconContainerClasses}>
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" 
                  alt="Gmail" 
                  className="w-full h-full object-contain" 
                  width="48" 
                  height="48" 
                  loading="lazy" 
                  decoding="async" 
                />
              </a>
              <a href={linkedinLink} target="_blank" rel="noreferrer" className={iconContainerClasses}>
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg" 
                  alt="LinkedIn" 
                  className="w-full h-full object-contain" 
                  width="48" 
                  height="48" 
                  loading="lazy" 
                  decoding="async" 
                />
              </a>
            </div>
          </div>

          <div className="lg:col-span-2 text-sm font-semibold">
            <h4 className="text-[#374151] mb-5 md:mb-6 text-sm font-black uppercase tracking-wider border-l-4 border-[#007c76] pl-3">TIỆN ÍCH</h4>
            <ul className="space-y-3 text-gray-600">
              <li><a href={mainWebsite} target="_blank" rel="noreferrer" className="hover:text-[#007c76] transition-colors">2fast.com.vn</a></li>
              <li><Link to="/khoa-hoc" className="hover:text-[#007c76] transition-colors">Khóa học</Link></li>
              <li><Link to="/tu-van" className="hover:text-[#007c76] transition-colors">Dịch vụ Tư vấn</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-4 text-sm font-semibold">
            <h4 className="text-[#374151] mb-5 md:mb-6 text-sm font-black uppercase tracking-wider border-l-4 border-[#007c76] pl-3">HỖ TRỢ &amp; CHÍNH SÁCH</h4>
            <ul className="space-y-3 text-gray-600 leading-relaxed">
              <li><Link to="/ve-chung-toi" className="hover:text-[#007c76] transition-colors">Về chúng tôi</Link></li>
              <li><Link to="/lien-he" className="hover:text-[#007c76] transition-colors">Liên hệ</Link></li>
              <li><Link to="/faq" className="hover:text-[#007c76] transition-colors">Câu hỏi thường gặp (FAQ)</Link></li>
              <li><Link to="/terms" className="hover:text-[#007c76] transition-colors lg:whitespace-nowrap">Chính sách chung &amp; Điều khoản sử dụng</Link></li>
              <li><Link to="/privacy-policy" className="hover:text-[#007c76] transition-colors lg:whitespace-nowrap">Chính sách bảo vệ thông tin cá nhân</Link></li>
              <li><Link to="/data-deletion" className="hover:text-[#007c76] transition-colors">Hướng dẫn xóa dữ liệu</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-4 text-sm font-bold">
            <h4 className="text-[#374151] mb-5 md:mb-6 text-sm font-black uppercase tracking-wider border-l-4 border-[#007c76] pl-3">THÔNG TIN CHỦ SỞ HỮU WEBSITE</h4>
            <div className="space-y-3.5 text-left">
              <p className="text-sm md:text-base font-black text-slate-900 tracking-[0.02em]">CÔNG TY TNHH TƯ VẤN FAST</p>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 text-[#007c76] shrink-0">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                  </svg>
                </div>
                <span className="text-sm text-[#374151] font-normal tabular-nums">MST / Số ĐKKD: 0314568146</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 text-[#007c76] shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 15.5C18.8 15.5 17.5 15.3 16.4 14.9C16 14.8 15.6 14.9 15.3 15.2L13.1 17.4C10.3 16 8 13.7 6.6 10.9L8.8 8.7C9.1 8.4 9.2 8 9.1 7.6C8.7 6.5 8.5 5.2 8.5 4C8.5 3.4 8.1 3 7.5 3H4C3.4 3 3 3.4 3 4C3 13.4 10.6 21 20 21C20.6 21 21 20.6 21 20V16.5C21 15.9 20.6 15.5 20 15.5Z"/></svg>
                </div>
                <a href={`tel:${rawPhone}`} className="text-sm text-[#374151] hover:text-[#007c76] font-normal">Điện thoại: {phoneNumber}</a>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-[#007c76] shrink-0 mt-0.5">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                </div>
                <div className="text-sm text-[#374151] font-normal space-y-0.5 break-all">
                  <a href="mailto:support@fastelearning.com.vn" className="hover:text-[#007c76] block">support@fastelearning.com.vn</a>
                  <a href={`mailto:${email}`} className="hover:text-[#007c76] block text-xs text-slate-500">{email}</a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 text-[#007c76] mt-0.5 shrink-0">
                    <svg fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"></path></svg>
                </div>
                <span className="text-sm text-[#374151] leading-snug font-normal">Tòa nhà Mộc Gia, Tầng 6, Số 238-240-242 đường Nguyễn Oanh, Phường Gò Vấp, TP. Hồ Chí Minh, Việt Nam</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 md:mt-16 pt-8 border-t border-gray-200 text-center">
            <p className="text-xs md:text-sm text-gray-400 font-medium">
                © {new Date().getFullYear()} FAST E-Learning. Nâng tầm chuẩn mực An toàn thực phẩm Việt Nam.
            </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
