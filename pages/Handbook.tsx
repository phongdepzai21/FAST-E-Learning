import React, { useState } from 'react';
import { ShieldAlert, Thermometer, Info, Target, AlertTriangle, ShieldCheck } from 'lucide-react';

interface HandbookProps {
  embed?: boolean;
}

const Handbook: React.FC<HandbookProps> = ({ embed }) => {
  const [activeTab, setActiveTab] = useState<'temperature' | 'storage' | 'cooking' | 'handling' | 'who5keys'>('temperature');

  return (
    <div className={embed ? "bg-background" : "min-h-screen bg-background"}>
      {/* Hero Section */}
      {!embed && (
      <section className="relative py-20 bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=2670')] bg-cover bg-center opacity-10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight mb-6">
            Cẩm Nang An Toàn Thực Phẩm
          </h1>
          <p className="text-xl text-white/90 max-w-3xl mx-auto font-medium">
            Hướng dẫn chi tiết về nhiệt độ, bảo quản và các quy tắc cốt lõi giúp đảm bảo chất lượng, an toàn sức khoẻ.
          </p>
        </div>
      </section>
      )}

      {/* Main Content */}
      <section className={embed ? "py-4 animate-fade-in" : "py-16"}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row gap-12">
          {/* Sidebar */}
          <div className="w-full md:w-1/4">
            <div className="sticky top-28 bg-surface rounded-3xl p-4 shadow-sm border border-primary/10">
              <nav className="space-y-2">
                {[
                  { id: 'temperature', label: 'Vùng nhiệt độ nguy hiểm', icon: Thermometer },
                  { id: 'storage', label: 'Bảo quản và Tủ lạnh', icon: ShieldAlert },
                  { id: 'cooking', label: 'Nhiệt độ đun nấu', icon: Target },
                  { id: 'handling', label: 'Quy tắc xử lý cơ bản', icon: AlertTriangle },
                  { id: 'who5keys', label: '5 Nguyên tắc cơ bản', icon: ShieldCheck },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-left ${
                      activeTab === item.id 
                        ? 'bg-primary text-white shadow-md' 
                        : 'text-text-muted hover:bg-primary/5 hover:text-primary'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-primary'}`} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="w-full md:w-3/4">
            {activeTab === 'temperature' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-3xl font-black text-text uppercase mb-4">Vùng Nhiệt Độ Nguy Hiểm</h2>
                  <p className="text-text-muted text-lg mb-6">
                    Mầm bệnh trong thực phẩm phát triển cực kỳ nhanh chóng ở khoảng nhiệt độ từ <strong>5°C đến 60°C</strong>. Chúng tôi gọi đây là "Vùng Nhiệt Độ Nguy Hiểm" (Danger Zone).
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
                    <h3 className="text-xl font-bold text-red-800 flex items-center gap-2 mb-3">
                      <Thermometer className="w-6 h-6" /> 5°C - 60°C
                    </h3>
                    <p className="text-red-700">Đây là khoảng nhiệt độ mà vi khuẩn phát triển và nhân lên nhanh nhất. Thực phẩm không được để trong vùng nhiệt độ này quá 2 giờ (hoặc 1 giờ nếu nhiệt độ môi trường &gt; 32°C).</p>
                  </div>
                  <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100">
                    <h3 className="text-xl font-bold text-blue-800 flex items-center gap-2 mb-3">
                      <Thermometer className="w-6 h-6" /> Dưới 5°C
                    </h3>
                    <p className="text-blue-700">Nhiệt độ này làm chậm sự phát triển của vi khuẩn, nhưng không tiêu diệt được chúng. Tủ lạnh luôn phải duy trì ở mức dưới 5°C.</p>
                  </div>
                </div>

                <div className="bg-surface rounded-3xl p-8 border border-primary/10 shadow-sm mt-8">
                  <h3 className="text-xl font-black text-text mb-4">Quy tắc 2 giờ / 4 giờ</h3>
                  <ul className="space-y-4 text-text-muted">
                    <li className="flex items-start gap-4 flex-col sm:flex-row">
                      <span className="font-bold text-white bg-primary rounded-xl px-4 py-1 whitespace-nowrap min-w-32 text-center">Dưới 2 giờ</span>
                      <span>Thực phẩm ở khoảng 5°C - 60°C dưới 2 giờ có thể được <strong>sử dụng ngay hoặc làm lạnh trở lại</strong> dưới 5°C.</span>
                    </li>
                    <li className="flex items-start gap-4 flex-col sm:flex-row">
                      <span className="font-bold text-white bg-yellow-500 rounded-xl px-4 py-1 whitespace-nowrap min-w-32 text-center">Từ 2 đến 4 giờ</span>
                      <span>Thực phẩm ở ngưỡng này bắt buộc phải <strong>sử dụng ngay</strong>. Không được làm lạnh lại.</span>
                    </li>
                    <li className="flex items-start gap-4 flex-col sm:flex-row">
                      <span className="font-bold text-white bg-red-500 rounded-xl px-4 py-1 whitespace-nowrap min-w-32 text-center">Trên 4 giờ</span>
                      <span>Bắt buộc <strong>loại bỏ, vứt bỏ</strong>. Vi khuẩn có thể đã sinh sôi đến mức gây ngộ độc nghiêm trọng.</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'storage' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-3xl font-black text-text uppercase mb-4">Bảo Quản Thực Phẩm và Tủ Lạnh</h2>
                  <p className="text-text-muted text-lg mb-6">
                    Sắp xếp thực phẩm đúng cách trong tủ lạnh giúp ngăn ngừa nhiễm khuẩn chéo và duy trì chất lượng lâu hơn.
                  </p>
                </div>
                
                <div className="bg-surface rounded-3xl p-8 border border-primary/10 shadow-sm">
                  <h3 className="text-xl font-black text-text mb-6">Nguyên tắc sắp xếp từ trên xuống dưới tủ lạnh:</h3>
                  
                  <div className="space-y-4 relative">
                    <div className="absolute left-4 top-4 bottom-4 w-1 bg-gray-100 rounded-full"></div>
                    
                    <div className="flex items-start gap-4 relative">
                      <div className="w-9 h-9 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold z-10 shrink-0 border-4 border-surface shadow-sm">1</div>
                      <div className="bg-gray-50 rounded-2xl p-4 flex-1">
                        <strong className="block text-text mb-1">Ngăn trên cùng (Thực phẩm nấu chín, ăn liền)</strong>
                        <span className="text-sm text-text-muted">Các món ăn đã nấu chín, phô mai, bơ, sữa chua, thịt nguội, thức ăn thừa đã đóng hộp kín.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 relative">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold z-10 shrink-0 border-4 border-surface shadow-sm">2</div>
                      <div className="bg-gray-50 rounded-2xl p-4 flex-1">
                        <strong className="block text-text mb-1">Ngăn giữa (Thịt/cá tươi chuẩn bị nấu)</strong>
                        <span className="text-sm text-text-muted">Hải sản sơ chế, thịt heo/bò chuẩn bị nấu ngay trong ngày.</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 relative">
                      <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold z-10 shrink-0 border-4 border-surface shadow-sm">3</div>
                      <div className="bg-gray-50 rounded-2xl p-4 flex-1">
                        <strong className="block text-text mb-1">Ngăn dưới cùng (Thịt sống các loại)</strong>
                        <span className="text-sm text-text-muted">Thịt gia cầm sống (gà, vịt). Việc để gia cầm dưới cùng giúp tránh nước từ thịt sống (nhiều vi khuẩn) nhỏ giọt xuống làm nhiễm khuẩn các thực phẩm khác.</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 rounded-3xl p-6 border border-primary/10 text-primary-dark">
                  <div className="flex gap-3">
                    <Info className="w-6 h-6 shrink-0" />
                    <div>
                      <strong className="block mb-2 text-lg">Mẹo bảo quản quan trọng:</strong>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-text-muted">
                        <li>Nhiệt độ tủ đông (ngăn đá) phải dưới <strong>-18°C</strong>.</li>
                        <li>Nhiệt độ tủ mát phải ở mức <strong>1°C đến 4°C</strong>.</li>
                        <li>Luôn dán nhãn ngày mở nắp, ngày cất tủ để dễ dàng tuân thủ FIFO (Vào trước - Ra trước).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'cooking' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                  <h2 className="text-3xl font-black text-text uppercase mb-4">Nhiệt Độ Đun Nấu (Nhiệt Cốt Lõi)</h2>
                  <p className="text-text-muted text-lg mb-6">
                    Nhiệt độ ở phần trung tâm (lõi) dày nhất của thực phẩm phải đạt chuẩn tối thiểu trong vòng 15 giây để đảm bảo vi khuẩn bị tiêu diệt.
                  </p>
                </div>
                
                <div className="bg-white rounded-[24px] border border-gray-200 overflow-hidden shadow-sm">
                  {/* Row 1 */}
                  <div className="flex items-center p-4 sm:p-5 border-b border-gray-200 bg-gray-50/50">
                    <div className="w-24 sm:w-28 shrink-0 pr-3 flex flex-col justify-center">
                      <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">165°F</div>
                      <div className="text-sm sm:text-base font-bold text-gray-600 mt-1">(74°C)</div>
                    </div>
                    <div className="border-l-2 border-gray-200 pl-4 sm:pl-6 flex items-center gap-4 sm:gap-5 flex-1">
                        <div className="text-3xl sm:text-4xl drop-shadow-sm flex-shrink-0">🍗</div>
                        <div className="text-base font-medium text-gray-800 leading-tight">
                            Gia cầm (gà, vịt), thịt nhồi, các món hâm lại.
                        </div>
                    </div>
                  </div>

                  {/* Row 2 */}
                  <div className="flex items-center p-4 sm:p-5 border-b border-gray-200">
                    <div className="w-24 sm:w-28 shrink-0 pr-3 flex flex-col justify-center">
                      <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">155°F</div>
                      <div className="text-sm sm:text-base font-bold text-gray-600 mt-1">(68°C)</div>
                    </div>
                    <div className="border-l-2 border-gray-200 pl-4 sm:pl-6 flex items-center gap-4 sm:gap-5 flex-1">
                        <div className="text-3xl sm:text-4xl drop-shadow-sm flex-shrink-0">🥩</div>
                        <div className="text-base font-medium text-gray-800 leading-tight">
                            Thịt xay (bò, heo), trứng không dùng ngay.
                        </div>
                    </div>
                  </div>

                  {/* Row 3 */}
                  <div className="flex items-center p-4 sm:p-5 border-b border-gray-200 bg-gray-50/50">
                    <div className="w-24 sm:w-28 shrink-0 pr-3 flex flex-col justify-center">
                      <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">145°F</div>
                      <div className="text-sm sm:text-base font-bold text-gray-600 mt-1">(63°C)</div>
                    </div>
                    <div className="border-l-2 border-gray-200 pl-4 sm:pl-6 flex items-center gap-4 sm:gap-5 flex-1">
                        <div className="text-3xl sm:text-4xl drop-shadow-sm flex-shrink-0">🐟</div>
                        <div className="text-base font-medium text-gray-800 leading-tight">
                            Thịt nguyên miếng (bò, heo, cừu), cá, hải sản, trứng dùng ngay.
                        </div>
                    </div>
                  </div>

                  {/* Row 4 */}
                  <div className="flex items-center p-4 sm:p-5">
                    <div className="w-24 sm:w-28 shrink-0 pr-3 flex flex-col justify-center">
                      <div className="text-xl sm:text-2xl font-black text-gray-900 leading-none">135°F</div>
                      <div className="text-sm sm:text-base font-bold text-gray-600 mt-1">(60°C)</div>
                    </div>
                    <div className="border-l-2 border-gray-200 pl-4 sm:pl-6 flex items-center gap-4 sm:gap-5 flex-1">
                        <div className="text-3xl sm:text-4xl drop-shadow-sm flex-shrink-0">🍲</div>
                        <div className="text-base font-medium text-gray-800 leading-tight">
                            Rau củ quả nấu để giữ nóng, thực phẩm chế biến sẵn.
                        </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'handling' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                    <h2 className="text-3xl font-black text-text uppercase mb-4">Quy Tắc Xử Lý Cơ Bản</h2>
                    <p className="text-text-muted text-lg mb-6">
                        Ngăn ngừa 4 rủi ro chính trong an toàn thực phẩm.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="bg-surface p-6 rounded-3xl border border-primary/10 flex gap-4 sm:items-center flex-col sm:flex-row">
                        <div className="w-16 h-16 shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-2xl">1</div>
                        <div>
                            <h3 className="text-xl font-bold text-text mb-2">Dọn dẹp và Rửa sạch</h3>
                            <p className="text-text-muted">Rửa tay kỹ bằng xà phòng 20 giây. Bề mặt dụng cụ và thớt phải được lau chùi sạch bằng dung dịch khử trùng sau mỗi lần thái cắt thực phẩm tươi sống.</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-3xl border border-primary/10 flex gap-4 sm:items-center flex-col sm:flex-row">
                        <div className="w-16 h-16 shrink-0 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center font-black text-2xl">2</div>
                        <div>
                            <h3 className="text-xl font-bold text-text mb-2">Tránh lây nhiễm chéo</h3>
                            <p className="text-text-muted">Luôn dùng thớt riêng, dao riêng cho thịt sống và các thực phẩm ăn liền (như rau salad, bánh nướng). Tách biệt hoàn toàn chúng trong tủ lạnh.</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-3xl border border-primary/10 flex gap-4 sm:items-center flex-col sm:flex-row">
                        <div className="w-16 h-16 shrink-0 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black text-2xl">3</div>
                        <div>
                            <h3 className="text-xl font-bold text-text mb-2">Rã đông đúng cách</h3>
                            <p className="text-text-muted">Chỉ rã đông trong tủ mát dưới 5°C, lò vi sóng, hoặc dưới vòi nước chảy liên tục dưỡi 21°C. Tuyệt đối <strong>không rã đông ở nhiệt độ phòng</strong>.</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-3xl border border-primary/10 flex gap-4 sm:items-center flex-col sm:flex-row">
                        <div className="w-16 h-16 shrink-0 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-black text-2xl">4</div>
                        <div>
                            <h3 className="text-xl font-bold text-text mb-2">Làm lạnh thần tốc</h3>
                            <p className="text-text-muted">Cần làm lạnh thực phẩm nấu chín từ mức nhiệt 60°C xuống 20°C trong vòng 2 giờ, và tiếp tục từ 20°C xuống dưới 5°C trong 4 giờ sau đó.</p>
                        </div>
                    </div>
                </div>

              </div>
            )}

            {activeTab === 'who5keys' && (
              <div className="space-y-8 animate-fade-in">
                <div>
                    <h2 className="text-3xl font-black text-text uppercase mb-4">5 Nguyên Tắc Cơ Bản</h2>
                    <p className="text-text-muted text-lg mb-6">
                        Tổ chức Y tế Thế giới (WHO) đã đề ra 5 chìa khóa để đảm bảo an toàn thực phẩm, giúp ngăn ngừa các bệnh lây truyền qua thực phẩm.
                    </p>
                </div>

                <div className="space-y-6">
                    <div className="bg-surface p-6 rounded-3xl border border-primary/10 flex gap-4 sm:items-center flex-col sm:flex-row">
                        <div className="w-16 h-16 shrink-0 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-black text-2xl">1</div>
                        <div>
                            <h3 className="text-xl font-bold text-text mb-2">Giữ vệ sinh sạch sẽ</h3>
                            <p className="text-text-muted">Rửa tay trước khi tiếp xúc với thực phẩm và thường xuyên trong quá trình chế biến. Rửa tay sau khi đi vệ sinh. Rửa sạch và sát trùng toàn bộ bề mặt và dụng cụ chế biến. Bảo vệ khu vực bếp và thực phẩm khỏi côn trùng, sâu bọ và các động vật khác.</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-3xl border border-primary/10 flex gap-4 sm:items-center flex-col sm:flex-row">
                        <div className="w-16 h-16 shrink-0 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-2xl">2</div>
                        <div>
                            <h3 className="text-xl font-bold text-text mb-2">Để riêng thực phẩm sống và chín</h3>
                            <p className="text-text-muted">Tách riêng thịt gia súc, gia cầm và hải sản sống với các thực phẩm khác. Sử dụng thiết bị và dụng cụ riêng biệt như dao và thớt cho thực phẩm sống. Bảo quản thực phẩm trong hộp kín để tránh tiếp xúc giữa thực phẩm sống và chín.</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-3xl border border-primary/10 flex gap-4 sm:items-center flex-col sm:flex-row">
                        <div className="w-16 h-16 shrink-0 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-black text-2xl">3</div>
                        <div>
                            <h3 className="text-xl font-bold text-text mb-2">Nấu chín kỹ</h3>
                            <p className="text-text-muted">Nấu chín kỹ thức ăn, đặc biệt là thịt gia súc, gia cầm, trứng và hải sản. Đun sôi các món súp, hầm để đảm bảo nhiệt độ đạt trên 70°C. Đối với thịt, đảm bảo nước thịt trong, không còn màu hồng. Hâm nóng kỹ lại thức ăn đã nấu chín.</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-3xl border border-primary/10 flex gap-4 sm:items-center flex-col sm:flex-row">
                        <div className="w-16 h-16 shrink-0 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-black text-2xl">4</div>
                        <div>
                            <h3 className="text-xl font-bold text-text mb-2">Bảo quản thực phẩm ở nhiệt độ an toàn</h3>
                            <p className="text-text-muted">Không để thực phẩm đã nấu chín ở nhiệt độ phòng quá 2 giờ. Nhanh chóng làm lạnh tất cả các thực phẩm đã nấu chín và thực phẩm dễ hỏng (dưới 5°C). Giữ thức ăn nóng (trên 60°C) trước khi dọn ăn. Không bảo quản thực phẩm quá lâu ngay cả trong tủ lạnh.</p>
                        </div>
                    </div>

                    <div className="bg-surface p-6 rounded-3xl border border-primary/10 flex gap-4 sm:items-center flex-col sm:flex-row">
                        <div className="w-16 h-16 shrink-0 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-black text-2xl">5</div>
                        <div>
                            <h3 className="text-xl font-bold text-text mb-2">Sử dụng nước và nguyên liệu an toàn</h3>
                            <p className="text-text-muted">Sử dụng nguồn nước an toàn hoặc xử lý để nước trở nên an toàn. Chọn các thực phẩm tươi và đảm bảo vệ sinh. Chọn các loại thực phẩm đã qua chế biến an toàn như sữa thanh trùng. Rửa sạch rau quả, đặc biệt là nếu ăn sống. Không sử dụng thực phẩm quá hạn.</p>
                        </div>
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Handbook;
