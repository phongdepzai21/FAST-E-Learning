import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { COURSES } from '../constants';
import { useToast } from '../contexts/ToastContext';

export const AdminQrUtility: React.FC = () => {
  const toast = useToast();
  const [text, setText] = useState('https://fastelearning.com.vn/khoa-hoc');
  const [fgColor, setFgColor] = useState('#007c76');
  const [qrSize, setQrSize] = useState(256);
  const [includeImage, setIncludeImage] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCourseSelect = (courseId: string) => {
    if (courseId) {
      const url = `${window.location.origin}/course/${courseId}`;
      setText(url);
      toast.success(`Đã tạo liên kết khóa học: ${url}`);
    }
  };

  const handleDownload = () => {
    try {
      const svgEl = qrRef.current?.querySelector('svg');
      if (!svgEl) return;

      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const downloadLink = document.createElement('a');
      downloadLink.href = svgUrl;
      downloadLink.download = `FAST_QR_${Date.now()}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      toast.success('Đã tải xuống QR dạng vector SVG chất lượng cao!');
    } catch (err: any) {
      console.error(err);
      toast.error('Không thể tải xuống QR.');
    }
  };

  const handleDownloadPNG = () => {
    try {
      const svgEl = qrRef.current?.querySelector('svg');
      if (!svgEl) return;

      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = qrSize * 2; // High-resolution output
        canvas.height = qrSize * 2;
        const context = canvas.getContext('2d');
        if (context) {
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `FAST_QR_${Date.now()}.png`;
          document.body.appendChild(downloadLink);
          downloadLink.click();
          document.body.removeChild(downloadLink);
          toast.success('Đã tải xuống QR dạng hình ảnh PNG sắc nét!');
        }
      };
      image.src = svgUrl;
    } catch (err) {
      toast.error('Không thể tải xuống PNG.');
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-black text-gray-800 tracking-tight flex items-center gap-3 uppercase">
            <span className="w-2 h-8 bg-[#007c76] rounded-full shrink-0"></span>
            Công cụ Tạo mã QR Admin
          </h3>
          <p className="text-gray-500 text-xs font-semibold mt-1">
            Tạo mã QR tĩnh chất lượng cao cho các khóa học, chương trình khuyến mãi hoặc chiến dịch marketing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Controls Column */}
        <div className="lg:col-span-7 bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm space-y-6">
          {/* Quick Select Course */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Chọn nhanh Khóa học</label>
            <select
              onChange={(e) => handleCourseSelect(e.target.value)}
              defaultValue=""
              className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-[#007c76] rounded-2xl text-sm font-semibold outline-none"
            >
              <option value="" disabled>--- Chọn một khóa học để tự động sinh link ---</option>
              {COURSES.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title} (Mã: {course.id})
                </option>
              ))}
            </select>
          </div>

          {/* QR Code Content / Link */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-gray-400">Nội dung / Liên kết URL</label>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập đường link trang web hoặc thông điệp marketing..."
              className="w-full p-4 bg-gray-50 border border-gray-200 focus:border-[#007c76] focus:ring-4 focus:ring-[#007c76]/5 rounded-2xl text-sm font-semibold outline-none resize-none leading-relaxed"
            />
          </div>

          {/* Customizations Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400">Màu sắc thương hiệu</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer overflow-hidden p-0"
                />
                <div className="flex-1">
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold text-gray-700 outline-none uppercase"
                  />
                  {/* Preset colors */}
                  <div className="flex gap-1.5 mt-1.5">
                    {['#007c76', '#10b981', '#f59e0b', '#3b82f6', '#000000'].map(c => (
                      <button
                        key={c}
                        onClick={() => setFgColor(c)}
                        style={{ backgroundColor: c }}
                        className="w-4 h-4 rounded-full border border-white ring-1 ring-gray-200 cursor-pointer"
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-400">Kích thước tải về (PX)</label>
              <select
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold outline-none"
              >
                <option value={128}>Tiêu chuẩn - 128px</option>
                <option value={256}>Trung bình - 256px</option>
                <option value={512}>Rất nét - 512px</option>
                <option value={1024}>In ấn tờ rơi - 1024px</option>
              </select>
            </div>
          </div>

          {/* Logo overlay toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div>
              <p className="text-xs font-bold text-gray-800">Chèn logo định danh vào giữa QR</p>
              <p className="text-[10px] text-gray-400 font-semibold mt-0.5">Đặt biểu tượng huy hiệu giúp gia tăng tin cậy thương hiệu</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={includeImage}
                onChange={(e) => setIncludeImage(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#007c76]"></div>
            </label>
          </div>
        </div>

        {/* QR Preview Column */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
          <span className="text-xs font-black uppercase tracking-wider text-gray-400">Xem trước mã QR</span>
          
          {/* QR Render Target */}
          <div 
            ref={qrRef}
            className="p-5 bg-white rounded-3xl border-2 border-dashed border-gray-200 shadow-md flex items-center justify-center relative overflow-hidden"
          >
            <QRCodeSVG
              value={text || 'https://fastelearning.com.vn'}
              size={180}
              fgColor={fgColor}
              bgColor="#ffffff"
              level="H"
              includeMargin={true}
              imageSettings={includeImage ? {
                src: 'https://images.unsplash.com/photo-1557200134-90327ee9fafa?auto=format&fit=crop&q=80&w=100',
                x: undefined,
                y: undefined,
                height: 32,
                width: 32,
                excavate: true,
              } : undefined}
            />
          </div>

          <div className="space-y-2 w-full">
            <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-tight">Thao tác tải mã</h4>
            <p className="text-[10px] text-gray-400 font-semibold max-w-xs mx-auto leading-normal">
              Chọn tải ảnh vector SVG nếu bạn cần phóng to không vỡ nét để in ấn tờ rơi, áp phích marketing.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              onClick={handleDownloadPNG}
              className="flex-1 py-3 px-4 bg-teal-50 border border-teal-200/50 hover:bg-[#007c76] hover:text-white text-[#007c76] rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer shadow-xs text-center flex items-center justify-center gap-1.5"
            >
              📥 Tải ảnh PNG
            </button>
            <button
              onClick={handleDownload}
              className="flex-1 py-3 px-4 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl font-black uppercase text-xs tracking-wider transition-all cursor-pointer shadow-md text-center flex items-center justify-center gap-1.5"
            >
              📥 Tải Vector SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
