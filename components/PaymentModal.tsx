import React, { useState } from 'react';
import { Course } from '../types';

interface PaymentModalProps {
    course: Course;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ course, isOpen, onClose, onSuccess }) => {
    const [isVerifying, setIsVerifying] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);

    if (!isOpen) return null;

    const handleConfirmTransfer = () => {
        setIsVerifying(true);
        // Simulate a payment verification process
        setTimeout(() => {
            setIsVerifying(false);
            setIsCompleted(true);
            setTimeout(() => {
                onSuccess(); // Triggers the actual database saving
                setIsCompleted(false);
            }, 1000);
        }, 2000);
    };

    return (
        <div className="fixed inset-0 z-[200] grid place-items-center bg-black/70 backdrop-blur-md px-4">
            <div className="bg-white max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-300">
                <button 
                    onClick={onClose} 
                    disabled={isVerifying || isCompleted}
                    className="absolute top-4 right-4 text-gray-400 hover:bg-gray-100 p-2 rounded-full transition-colors z-10 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>

                {!isCompleted ? (
                    <div className="space-y-6 relative z-10">
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Thanh toán khóa học</h2>
                            <p className="text-gray-500 font-medium text-sm mt-1">Xác nhận đơn hàng và chuyển khoản</p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                            <div className="flex-1 min-w-0 pr-4">
                                <h3 className="font-bold text-gray-800 text-sm truncate">{course.title}</h3>
                                <p className="text-xs font-semibold tracking-wider text-gray-400 mt-0.5">Mã KH: {course.id.slice(0, 8).toUpperCase()}</p>
                            </div>
                            <div className="text-primary font-black text-lg whitespace-nowrap">
                                {course.price}
                            </div>
                        </div>

                        <div className="bg-pink-50/50 p-5 rounded-2xl border border-pink-100">
                            <p className="text-xs font-bold text-[#A50064] mb-3 uppercase tracking-wider text-center">Hướng dẫn thanh toán MoMo Doanh Nghiệp</p>
                            <div className="flex flex-col md:flex-row items-center gap-6 justify-center mb-4">
                                <div className="w-40 h-40 bg-white p-2 rounded-xl shadow-sm border border-pink-200 shrink-0">
                                    <div className="w-full h-full bg-[url('https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg')] bg-contain bg-no-repeat bg-center opacity-80"></div>
                                </div>
                                <div className="text-left space-y-3">
                                    <p className="text-sm font-medium text-gray-700"><strong>Bước 1:</strong> Mở ứng dụng MoMo.</p>
                                    <p className="text-sm font-medium text-gray-700"><strong>Bước 2:</strong> Chọn "Quét Mã" và quét mã QR bên cạnh.</p>
                                    <p className="text-sm font-medium text-gray-700"><strong>Bước 3:</strong> Nhập số tiền <strong>{course.price}</strong> và nội dung:</p>
                                    <div className="bg-white p-2 rounded-lg border border-pink-100 font-mono text-sm font-bold text-[#A50064] inline-block">
                                        FAST {course.id.slice(0, 5).toUpperCase()}
                                    </div>
                                </div>
                            </div>
                            <div className="text-center space-y-2 mt-4 pt-4 border-t border-pink-100/50">
                                <p className="text-[11px] font-medium text-gray-500">Thông tin tài khoản MoMo Doanh Nghiệp:</p>
                                <div className="bg-white p-3 rounded-xl border border-pink-100 font-mono text-sm font-bold text-gray-800 inline-block">
                                    Ví MoMo: 0898 419 149 <br/>
                                    CTK: CÔNG TY TNHH ĐÀO TẠO FAST
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleConfirmTransfer}
                            disabled={isVerifying}
                            className="w-full py-4 bg-[#007c76] hover:bg-[#00605b] text-white rounded-xl font-black uppercase text-sm tracking-widest transition-all disabled:opacity-75 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isVerifying ? (
                                <>
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Đang xác nhận...
                                </>
                            ) : 'Đã Chuyển Khoản Thành Công'}
                        </button>
                        <p className="text-[10px] text-center text-gray-400 font-medium">Hệ thống sẽ duyệt tự động trong khoảng tốc độ 2-5 phút.</p>
                    </div>
                ) : (
                    <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-500 relative z-10">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500 mb-6 border-4 border-green-50 shadow-inner">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Thanh toán hoàn tất!</h3>
                        <p className="text-gray-500 font-medium text-sm">Hệ thống đã xác nhận giao dịch. Khóa học đã được mở.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PaymentModal;
