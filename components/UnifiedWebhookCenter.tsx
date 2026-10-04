import React, { useState } from 'react';
import { WebhookStatusDashboard } from './WebhookStatusDashboard';
import { WebhookDebugLogger } from './WebhookDebugLogger';
import { PaymentTestUi } from './PaymentTestUi';
import { AdminWebhookInspector } from './AdminWebhookInspector';

export const UnifiedWebhookCenter: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'live' | 'test' | 'inspector'>('metrics');

  const subTabs = [
    { id: 'metrics', label: '📊 Tổng quan & Đo lường', desc: 'Báo cáo chỉ số, tỷ lệ thành công và độ trễ' },
    { id: 'live', label: '💻 Nhật ký Trực tiếp', desc: 'Giám sát header thực tế và bóc tách lỗi 302' },
    { id: 'test', label: '🧪 Thử Webhook HMAC', desc: 'Giả lập và truyền phát webhook thử nghiệm bảo mật' },
    { id: 'inspector', label: '🔎 Thanh tra 302/5xx', desc: 'Kiểm toán chi tiết lỗi cấu hình mạng' },
  ];

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-5 duration-500">
      {/* Title Header */}
      <div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
          <span className="w-2 h-8 bg-indigo-600 rounded-full shrink-0"></span>
          Trung Tâm Webhook Toàn Diện (Unified Webhook Center)
        </h3>
        <p className="text-gray-500 text-xs font-semibold mt-1">
          Bảng kiểm soát hợp nhất toàn bộ tài nguyên Webhook của FAST Elearning. Hỗ trợ rà soát hiệu năng, thử chữ ký bảo mật, và thanh tra luồng truyền tín hiệu biên.
        </p>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {subTabs.map((tab) => {
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer group ${
                isActive 
                  ? 'bg-slate-900 border-slate-950 text-white shadow-md scale-[1.01]' 
                  : 'bg-white border-gray-150 hover:bg-gray-50 text-slate-700'
              }`}
            >
              <span className="text-xs font-black block">{tab.label}</span>
              <span className={`text-[9px] font-semibold mt-0.5 block truncate leading-normal ${
                isActive ? 'text-slate-400' : 'text-gray-400'
              }`}>
                {tab.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Dynamic Content Pane */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-150 shadow-sm min-h-[500px]">
        {activeSubTab === 'metrics' && <WebhookStatusDashboard />}
        {activeSubTab === 'live' && <WebhookDebugLogger />}
        {activeSubTab === 'test' && <PaymentTestUi />}
        {activeSubTab === 'inspector' && <AdminWebhookInspector />}
      </div>
    </div>
  );
};
export default UnifiedWebhookCenter;
