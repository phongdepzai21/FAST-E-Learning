export const SUPERMARKET_DEPARTMENTS = [
  'Produce',
  'Seafood',
  'P&F',
  'Butchery',
  'Bakery',
  'Delica',
  'Delivery',
  'Grocery',
  'BAT & Confect',
  'NFIF',
  'GOR',
  'Canteen & General',
] as const;

export type SupermarketDepartment = (typeof SUPERMARKET_DEPARTMENTS)[number];

const ALL_DEPTS: string[] = [...SUPERMARKET_DEPARTMENTS];
const FRESH_DEPTS: string[] = [
  'Produce',
  'Seafood',
  'P&F',
  'Butchery',
  'Bakery',
  'Delica',
  'Canteen & General',
];
const FOOD_DEPTS: string[] = [
  'Produce',
  'Seafood',
  'P&F',
  'Butchery',
  'Bakery',
  'Delica',
  'Grocery',
  'BAT & Confect',
  'GOR',
  'Canteen & General',
];

export interface SupermarketControlPoint {
  code: string;
  criteria: string;
  condition: string;
  detail: string;
  depts: string[];
}

export interface SupermarketAuditArea {
  id: number;
  name: string;
  items: SupermarketControlPoint[];
}

export const SUPERMARKET_AUDIT_AREAS: SupermarketAuditArea[] = [
  {
    id: 1,
    name: 'Area 1: Cơ sở vật chất hạ tầng',
    items: [
      { code: '1.1.1', criteria: 'Trần', condition: 'Bẩn', detail: 'Trần khu vực chế biến/kinh doanh bám bụi bẩn, dầu mỡ.', depts: ['Produce', 'Seafood', 'Butchery', 'Bakery', 'Delica', 'Grocery', 'Canteen & General'] },
      { code: '1.1.2', criteria: 'Trần', condition: 'Nấm mốc', detail: 'Trần xuất hiện vết nấm mốc đen/xanh do ẩm thấp.', depts: ALL_DEPTS },
      { code: '1.1.3', criteria: 'Trần', condition: 'Gỉ sét', detail: 'Kết cấu khung trần, thanh treo, tấm trần kim loại bị gỉ sét.', depts: ALL_DEPTS },
      { code: '1.1.4', criteria: 'Trần', condition: 'Mạng nhện', detail: 'Có mạng nhện giăng trên trần hoặc góc trần.', depts: ALL_DEPTS },
      { code: '1.1.5', criteria: 'Trần', condition: 'Hư hỏng', detail: 'Trần bị thấm, dột nước, thủng, bong tróc vật liệu.', depts: ['Produce', 'P&F', 'Butchery', 'Bakery', 'Grocery', 'BAT & Confect', 'NFIF', 'GOR', 'Canteen & General'] },

      { code: '1.2.1', criteria: 'Tường', condition: 'Bẩn', detail: 'Tường, vách ngăn bám bẩn, vết thực phẩm bắn lên không vệ sinh.', depts: ['Produce', 'P&F', 'Butchery', 'Canteen & General'] },
      { code: '1.2.2', criteria: 'Tường', condition: 'Nấm mốc', detail: 'Tường bị ẩm ướt, xuất hiện nấm mốc.', depts: ['Produce', 'Seafood', 'P&F', 'BAT & Confect', 'NFIF', 'GOR', 'Canteen & General'] },
      { code: '1.2.3', criteria: 'Tường', condition: 'Gỉ sét', detail: 'Vách tôn/inox hoặc nẹp tường bị gỉ sét.', depts: ['Produce', 'P&F', 'NFIF', 'GOR', 'Canteen & General'] },
      { code: '1.2.4', criteria: 'Tường', condition: 'Mạng nhện', detail: 'Có mạng nhện bám trên bề mặt tường, góc tường.', depts: ['Seafood', 'P&F', 'Canteen & General'] },
      { code: '1.2.5', criteria: 'Tường', condition: 'Hư hỏng', detail: 'Tường bị bể gạch, nứt nẻ, bung tróc sơn/vữa.', depts: ['Produce', 'P&F', 'Canteen & General'] },

      { code: '1.3.1', criteria: 'Sàn', condition: 'Bẩn', detail: 'Sàn có rác, sản phẩm rơi vãi, vết bẩn dầu mỡ tích tụ.', depts: ['Produce', 'Seafood', 'P&F', 'Delica', 'Grocery', 'BAT & Confect', 'Canteen & General'] },
      { code: '1.3.2', criteria: 'Sàn', condition: 'Nấm mốc', detail: 'Mặt sàn hoặc ron gạch xuất hiện nấm mốc, rêu.', depts: ['Seafood', 'P&F', 'Butchery', 'Grocery', 'BAT & Confect', 'Canteen & General'] },
      { code: '1.3.3', criteria: 'Sàn', condition: 'Gỉ sét', detail: 'Bề mặt sàn kim loại/nắp sàn bị gỉ sét.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Grocery', 'BAT & Confect', 'GOR', 'Canteen & General'] },
      { code: '1.3.4', criteria: 'Sàn', condition: 'Hư hỏng', detail: 'Nứt, bể gạch, đọng nước (lưu ý ngoại lệ sàn ướt đặc thù tại ngành hàng thủy sản).', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Grocery', 'BAT & Confect', 'GOR', 'Canteen & General'] },

      { code: '1.4.1', criteria: 'Cửa (bao gồm màng cửa PVC)', condition: 'Bẩn', detail: 'Áp dụng tất cả các loại cửa tại các khu vực, bao gồm cả màng nhựa PVC.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'GOR', 'Canteen & General'] },
      { code: '1.4.2', criteria: 'Cửa (bao gồm màng cửa PVC)', condition: 'Nấm mốc', detail: 'Cửa hoặc dải màng nhựa PVC bị nấm mốc.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'GOR', 'Canteen & General'] },
      { code: '1.4.3', criteria: 'Cửa (bao gồm màng cửa PVC)', condition: 'Gỉ sét', detail: 'Khung cửa, bản lề, thanh treo màng cửa bị gỉ sét.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'GOR', 'Canteen & General'] },
      { code: '1.4.4', criteria: 'Cửa (bao gồm màng cửa PVC)', condition: 'Mạng nhện', detail: 'Có mạng nhện bám trên cửa hoặc khung cửa.', depts: ['Seafood', 'Delica', 'GOR', 'Canteen & General'] },
      { code: '1.4.5', criteria: 'Cửa (bao gồm màng cửa PVC)', condition: 'Hư hỏng', detail: 'Cửa nứt, bể kính/nhựa, màng cửa PVC bị rách hoặc thiếu dải.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Delica', 'GOR', 'Canteen & General'] },
      { code: '1.4.6', criteria: 'Cửa (bao gồm màng cửa PVC)', condition: 'Luôn mở', detail: 'Cửa hoặc màng cửa ra vào khu vực chế biến/kho lạnh không đóng.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'GOR', 'Canteen & General'] },
      { code: '1.4.7', criteria: 'Cửa (bao gồm màng cửa PVC)', condition: 'Không kín', detail: 'Cửa/màng cửa đóng nhưng không kín do joint cao su bị hư, cửa bị vênh tạo khe hở côn trùng.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'GOR', 'Canteen & General'] },

      { code: '1.5.1', criteria: 'Cống thoát nước', condition: 'Nghẹt', detail: 'Cống thoát nước bị tắc nghẽn, thoát nước chậm gây ứ đọng.', depts: FRESH_DEPTS },
      { code: '1.5.2', criteria: 'Cống thoát nước', condition: 'Bẩn', detail: 'Rãnh cống, lưới chắn rác tích tụ cặn bã thực phẩm, bùn bẩn.', depts: FRESH_DEPTS },
      { code: '1.5.3', criteria: 'Cống thoát nước', condition: 'Có mùi hôi', detail: 'Cống thoát nước bốc mùi hôi thối ngược lên khu vực chế biến/bán hàng.', depts: FRESH_DEPTS },
      { code: '1.5.4', criteria: 'Cống thoát nước', condition: 'Gỉ sét', detail: 'Nắp cống, song chắn rác kim loại bị gỉ sét nặng.', depts: FRESH_DEPTS },
      { code: '1.5.5', criteria: 'Cống thoát nước', condition: 'Hư hỏng', detail: 'Nắp cống bị gãy, mất lưới chắn rác/chống chuột cống.', depts: FRESH_DEPTS },

      { code: '1.6.1', criteria: 'Nguồn sáng', condition: 'Không đủ sáng', detail: 'Ánh sáng yếu, bóng đèn cháy không đủ độ rọi trong khu vực sản xuất/chế biến.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'BAT & Confect', 'NFIF', 'GOR', 'Canteen & General'] },
      { code: '1.6.2', criteria: 'Nguồn sáng', condition: 'Không có máng che', detail: 'Đèn chiếu sáng trong khu vực sản xuất/chế biến không có máng che bảo vệ chống vỡ thủy tinh.', depts: ALL_DEPTS },

      { code: '1.7.1', criteria: 'Bồn rửa', condition: 'Bẩn', detail: 'Bồn rửa tay, bồn rửa thực phẩm/dụng cụ bám bẩn, ố vàng.', depts: FRESH_DEPTS },
      { code: '1.7.2', criteria: 'Bồn rửa', condition: 'Nghẹt', detail: 'Đường thoát nước bồn rửa bị nghẹt, ứ đọng nước.', depts: FRESH_DEPTS },
      { code: '1.7.3', criteria: 'Bồn rửa', condition: 'Hư hỏng', detail: 'Bồn rửa, ống xả, vòi/van nước không hoàn chỉnh hoặc bị rò rỉ nước.', depts: FRESH_DEPTS },
    ],
  },
  {
    id: 2,
    name: 'Area 2: Chất lượng sản phẩm',
    items: [
      { code: '2.1.1', criteria: 'Bao bì', condition: 'Bẩn', detail: 'Áp dụng cho tất cả sản phẩm trưng bày, nguyên liệu, bán thành phẩm, hóa chất bị bám bẩn.', depts: ALL_DEPTS },
      { code: '2.1.2', criteria: 'Bao bì', condition: 'Không nguyên vẹn', detail: 'Bao bì bị xì chân không, rách, thủng, hở mí hàn.', depts: ALL_DEPTS },
      { code: '2.1.3', criteria: 'Bao bì', condition: 'Phồng bao bì', detail: 'Bao bì thực phẩm bị phồng khí bất thường (nghi ngờ hư hỏng vi sinh).', depts: FOOD_DEPTS },
      { code: '2.1.4', criteria: 'Bao bì', condition: 'Móp méo', detail: 'Đồ hộp, lon, chai lọ bị móp méo, biến dạng.', depts: ALL_DEPTS },
      { code: '2.1.5', criteria: 'Bao bì', condition: 'Gỉ sét', detail: 'Nắp lon, hộp thiếc bị gỉ sét.', depts: ALL_DEPTS },

      { code: '2.2.1', criteria: 'Nhãn mác', condition: 'Không nguyên vẹn', detail: 'Nhãn barcode, nhãn chính/phụ, tem rượu, mẫu lưu thịt/bánh/delica, nhãn bình nước/bình hóa chất/thùng ngâm dụng cụ bị rách, mờ.', depts: ALL_DEPTS },
      { code: '2.2.2', criteria: 'Nhãn mác', condition: 'Không có nhãn', detail: 'Sản phẩm trưng bày, nguyên liệu, bán thành phẩm, bình san chiết hóa chất không có nhãn nhận diện.', depts: ALL_DEPTS },
      { code: '2.2.3', criteria: 'Nhãn mác', condition: 'Có nhiều nhãn với thông tin mâu thuẫn nhau', detail: 'Trên cùng sản phẩm dán 2 nhãn có NSX/HSD hoặc xuất xứ khác nhau.', depts: FOOD_DEPTS },
      { code: '2.2.4', criteria: 'Nhãn mác', condition: 'Thông tin trên nhãn không đúng', detail: 'Sai tên hàng, sai xuất xứ, sai thành phần hoặc điều kiện bảo quản.', depts: ALL_DEPTS },
      { code: '2.2.5', criteria: 'Nhãn mác', condition: 'Thông tin trên nhãn không đủ', detail: 'Thiếu thông tin bắt buộc theo quy định ghi nhãn hàng hóa (NSX, HSD, định lượng, cảnh báo...).', depts: ALL_DEPTS },
      { code: '2.2.6', criteria: 'Nhãn mác', condition: 'Dán không phù hợp', detail: 'Nhãn phụ dán đè che khuất thông tin bắt buộc trên nhãn gốc hoặc dán sai vị trí.', depts: ALL_DEPTS },

      { code: '2.3.1', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Hư hỏng', detail: 'Sản phẩm/nguyên liệu bị thối rữa, biến chất, hư hỏng.', depts: ALL_DEPTS },
      { code: '2.3.2', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Không còn sống', detail: 'Thủy hải sản bày bán/trữ dạng sống nhưng đã chết trong hồ/bể.', depts: ['Seafood'] },
      { code: '2.3.3', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Không còn tươi', detail: 'Rau củ héo úa, thịt/cá giảm độ tươi (mắt đục, mang thâm, mất đàn hồi).', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Delica', 'Canteen & General'] },
      { code: '2.3.4', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Có lẫn vật lạ', detail: 'Sản phẩm lẫn vật lạ như lông, tóc, côn trùng, mảnh nhựa/kim loại, tạp chất.', depts: ALL_DEPTS },
      { code: '2.3.5', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Có nấm mốc', detail: 'Bề mặt thực phẩm, bánh, nguyên liệu khô xuất hiện nấm mốc.', depts: FOOD_DEPTS },
      { code: '2.3.6', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Bị chảy nước, rỉ dịch', detail: 'Sản phẩm đóng gói hoặc khay thịt/cá bị rỉ dịch máu, chảy nước ra ngoài.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Delica', 'Canteen & General'] },
      { code: '2.3.7', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Tái đông', detail: 'Sản phẩm đã rã đông đem cấp đông lại trái quy định.', depts: ['Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Canteen & General'] },
      { code: '2.3.8', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Rã đông', detail: 'Sản phẩm đông lạnh bị chảy nước/mềm do bảo quản sai nhiệt độ.', depts: ['Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Delivery', 'Canteen & General'] },
      { code: '2.3.9', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Cảm quan không đạt', detail: 'Màu sắc, mùi vị, trạng thái bất thường so với tiêu chuẩn sản phẩm.', depts: ALL_DEPTS },
      { code: '2.3.10', criteria: 'Cảm quan & Hạn sử dụng', condition: 'Hạn sử dụng không phù hợp', detail: 'Sản phẩm quá hạn sử dụng, bị tẩy xóa/kéo dài HSD hoặc cận hạn không rút khỏi kệ theo SOP.', depts: ALL_DEPTS },
    ],
  },
  {
    id: 3,
    name: 'Area 3: Điều kiện bảo quản',
    items: [
      { code: '3.1.1', criteria: 'Nhiệt độ bảo quản', condition: 'Khu vực nhận hàng không đạt', detail: 'Nhiệt độ khu vực/xe giao nhận hàng không đạt chuẩn theo nhóm hàng.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Delivery', 'GOR'] },
      { code: '3.1.2', criteria: 'Nhiệt độ bảo quản', condition: 'Kho lưu trữ không đạt', detail: 'Nhiệt độ kho mát, kho đông, kho khô vượt ngưỡng quy định.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Grocery', 'Canteen & General'] },
      { code: '3.1.3', criteria: 'Nhiệt độ bảo quản', condition: 'Thiết bị không đạt yêu cầu', detail: 'Nhiệt độ các tủ đông/mát tại quầy, tủ trưng bày hàng nướng hoặc đá gel không đạt nhiệt độ quy định.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Delivery', 'Canteen & General'] },
      { code: '3.1.4', criteria: 'Nhiệt độ bảo quản', condition: 'Sản phẩm không có đá / thiếu đá', detail: 'Nước đá quá ít không đủ ướp lạnh sản phẩm (áp dụng Seafood, Produce, Delivery).', depts: ['Produce', 'Seafood', 'Delivery'] },
      { code: '3.1.5', criteria: 'Nhiệt độ bảo quản', condition: 'Sản phẩm không được bảo quản theo đúng điều kiện', detail: 'Sai điều kiện ghi trên nhãn sản phẩm; hàng ướp lạnh/đông lạnh khi giao hàng không bảo quản với đá trong thùng cách nhiệt.', depts: FOOD_DEPTS },
      { code: '3.1.6', criteria: 'Nhiệt độ bảo quản', condition: 'Sản phẩm trưng bày/lưu kho vượt giới hạn quy định', detail: 'Trong kho không cách sàn, cách tường, cách trần; trong tủ cabinet trưng bày xếp quá đầy che luồng luân chuyển hơi lạnh.', depts: FOOD_DEPTS },

      { code: '3.2.1', criteria: 'Tình trạng hàng hóa', condition: 'Sản phẩm bị chèn ép', detail: 'Sản phẩm nặng đặt bên trên sản phẩm nhẹ, nhạy cảm; sắp xếp không ngăn nắp, khoa học.', depts: ['Produce', 'Seafood', 'P&F', 'Bakery', 'Delivery', 'Grocery', 'GOR'] },
      { code: '3.2.2', criteria: 'Tình trạng hàng hóa', condition: 'Sản phẩm lưu ngoài trời không được che đậy', detail: 'Hàng hóa tập kết ngoài trời bị bẩn hoặc chịu ảnh hưởng trực tiếp bởi nắng, mưa, bụi.', depts: ['Produce', 'Grocery', 'BAT & Confect', 'NFIF', 'GOR'] },
      { code: '3.2.3', criteria: 'Tình trạng hàng hóa', condition: 'Sản phẩm không được bảo quản đúng hướng dẫn', detail: 'Sai điều kiện NCC; hàng nhạy cảm giao không đóng thùng carton; thủy sản sống giáp xác & 2 mảnh vỏ trữ sai cách; hồ cua sống nước ngoài mức 15-20cm, >3 lớp, nhiệt độ >24°C, độ mặn ngoài 30-32‰.', depts: ['Produce', 'Seafood', 'Delivery'] },
      { code: '3.2.4', criteria: 'Tình trạng hàng hóa', condition: 'Rã đông không đúng quy trình', detail: 'Thực hiện rã đông không tuân thủ hướng dẫn trong SOP hoặc WI.', depts: ['Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Canteen & General'] },
      { code: '3.2.5', criteria: 'Tình trạng hàng hóa', condition: 'Thời gian chờ vượt quá quy định tại mỗi chặng', detail: 'Thời gian chờ quá lâu tại quầy thanh toán, quầy chuyển giao hàng, nơi xếp hàng lên xe giao nhận.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Delica', 'Delivery', 'GOR'] },

      { code: '3.3.1', criteria: 'Kiểm soát tồn kho', condition: 'Không có stock note', detail: 'Thiếu phiếu nhận diện (stock note) cho sản phẩm khó nhìn thông tin nhãn hoặc sản phẩm không nhãn.', depts: ALL_DEPTS },
      { code: '3.3.2', criteria: 'Kiểm soát tồn kho', condition: 'Stock note không phù hợp', detail: 'Thông tin stock note sai/thiếu (áp dụng cả nguyên liệu, hóa chất, sản phẩm kém chất lượng chờ hủy/chờ xử lý).', depts: ALL_DEPTS },
      { code: '3.3.3', criteria: 'Kiểm soát tồn kho', condition: 'Xuất kho không theo nguyên tắc FEFO, FIFO', detail: 'Sản phẩm nhập trước hoặc hết hạn trước nhưng không được ưu tiên xuất sử dụng/bán trước.', depts: ALL_DEPTS },
      { code: '3.3.4', criteria: 'Kiểm soát tồn kho', condition: 'Trưng bày không theo nguyên tắc FEFO, FIFO', detail: 'Sản phẩm hết hạn trước được trưng bày phía sau hoặc nằm phía dưới sản phẩm có HSD mới hơn.', depts: FOOD_DEPTS },
    ],
  },
  {
    id: 4,
    name: 'Area 4: Ô nhiễm (Ô nhiễm chéo & Trang thiết bị)',
    items: [
      { code: '4.1.1', criteria: 'Ô nhiễm chéo từ sản phẩm khác', condition: 'Không tách biệt thực phẩm và phi thực phẩm', detail: 'Để lẫn thực phẩm dùng ngay, thực phẩm chế biến trước khi dùng với phi thực phẩm (bột giặt, nước xả) hoặc nước mắm với sữa dinh dưỡng.', depts: ['Grocery', 'BAT & Confect', 'NFIF', 'Delivery', 'GOR'] },
      { code: '4.1.2', criteria: 'Ô nhiễm chéo từ sản phẩm khác', condition: 'Thực phẩm tươi sống đặt phía trên sản phẩm dùng ngay', detail: 'Bố trí thịt/cá/rau sống ở kệ trên làm rỉ dịch xuống thực phẩm ăn ngay ở kệ dưới.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Delica', 'Canteen & General'] },
      { code: '4.1.3', criteria: 'Ô nhiễm chéo từ sản phẩm khác', condition: 'Thịt và thủy sản không có vách ngăn', detail: 'Thực phẩm chế biến từ thịt và thực phẩm chế biến từ thủy sản để chung không có vách ngăn cách biệt.', depts: ['Seafood', 'P&F', 'Butchery', 'Delica', 'Canteen & General'] },
      { code: '4.1.4', criteria: 'Ô nhiễm chéo từ sản phẩm khác', condition: 'Nướng chung lò xếp nguyên liệu mới lên trên hàng sẵn có', detail: 'Tại một thời điểm nướng nhiều loại sản phẩm trong cùng một lò mà xếp nguyên liệu sống mới vào phía trên sản phẩm đang chín.', depts: ['Butchery', 'Bakery', 'Delica', 'Canteen & General'] },

      { code: '4.2.1', criteria: 'Ô nhiễm chéo từ dụng cụ thiết bị', condition: 'Dùng lẫn dụng cụ ngành hàng khác hoặc của NCC', detail: 'Sử dụng rổ, khay, dao, thớt của ngành hàng khác hoặc dụng cụ của Nhà cung cấp để chứa hàng.', depts: FRESH_DEPTS },
      { code: '4.2.2', criteria: 'Ô nhiễm chéo từ dụng cụ thiết bị', condition: 'Chứa thực phẩm chưa bao gói vào xe trolley khách hàng', detail: 'Sử dụng xe đẩy mua sắm của khách hàng để chứa thực phẩm trần chưa bao gói (Bakery, Butchery, Seafood, P&F).', depts: ['Seafood', 'P&F', 'Butchery', 'Bakery'] },
      { code: '4.2.3', criteria: 'Ô nhiễm chéo từ dụng cụ thiết bị', condition: 'Đặt sản phẩm còn nóng trực tiếp lên khay xốp/nhựa/túi nylon', detail: 'Sản phẩm mới nướng/chế biến còn nóng đặt trực tiếp lên vật liệu nhựa/xốp không chịu nhiệt (Bakery, Butchery).', depts: ['Butchery', 'Bakery', 'Delica', 'Canteen & General'] },

      { code: '4.3.1', criteria: 'Ô nhiễm từ nguồn nhiễm khác', condition: 'Thực phẩm hở đặt ngay dưới đèn diệt côn trùng', detail: 'Thực phẩm, nguyên liệu chưa bao gói đặt trực tiếp bên dưới đèn bẫy côn trùng.', depts: FOOD_DEPTS },
      { code: '4.3.2', criteria: 'Ô nhiễm từ nguồn nhiễm khác', condition: 'Đặt gần hóa chất vệ sinh hoặc nơi có nước ngưng tụ', detail: 'Thực phẩm, nguyên liệu, dụng cụ thiết bị đặt gần hóa chất tẩy rửa hoặc dưới trần/máy lạnh bị nhỏ nước ngưng tụ.', depts: ALL_DEPTS },
      { code: '4.3.3', criteria: 'Ô nhiễm từ nguồn nhiễm khác', condition: 'Nguyên liệu dùng dở dang không được che đậy', detail: 'Bao bì nguyên liệu đã mở sử dụng dở dang không buộc kín hoặc đậy nắp bảo vệ.', depts: ['Produce', 'Seafood', 'Butchery', 'Bakery', 'Delica', 'Canteen & General'] },
      { code: '4.3.4', criteria: 'Ô nhiễm từ nguồn nhiễm khác', condition: 'Hàng hủy / hàng thu hồi / thùng rác không cách biệt', detail: 'Hàng chờ hủy, hàng thu hồi hoặc thùng rác đặt chung với hàng hóa/thực phẩm sạch.', depts: ALL_DEPTS },
      { code: '4.3.5', criteria: 'Ô nhiễm từ nguồn nhiễm khác', condition: 'Nước đá / đá gel không sạch', detail: 'Nước đá ướp hoặc đá gel bị bẩn, lẫn vật lạ, máu, vảy cá (áp dụng Seafood, Delivery).', depts: ['Seafood', 'Delivery', 'Canteen & General'] },

      { code: '4.4.1', criteria: 'Trang thiết bị', condition: 'Không sắp xếp theo quy tắc 1 chiều', detail: 'Bố trí mặt bằng, dây chuyền thiết bị đi chéo luồng giữa khu bẩn (sơ chế thô) và khu sạch (thành phẩm).', depts: ['Produce', 'Seafood', 'Butchery', 'Bakery', 'Delica', 'Canteen & General'] },
      { code: '4.4.2', criteria: 'Trang thiết bị', condition: 'Sử dụng pallet gỗ tại khu vực không được phép', detail: 'Dùng pallet gỗ lưu trữ dài ngày (>3 ngày) trong kho lạnh/kho đông hoặc khu chứa sản phẩm mở/chưa bao gói tại ngành hàng thực phẩm.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica'] },
      { code: '4.4.3', criteria: 'Trang thiết bị', condition: 'Dụng cụ chứa đựng đặt trực tiếp trên sàn', detail: 'Áp dụng tất cả dụng cụ chứa thực phẩm và bình hóa chất trong khu vực lưu trữ hoặc đang sử dụng.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Canteen & General'] },
      { code: '4.4.4', criteria: 'Trang thiết bị', condition: 'Hàng hóa đặt trực tiếp trên sàn', detail: 'Sản phẩm, nguyên liệu, bán thành phẩm đặt trực tiếp xuống nền sàn không có kệ/pallet kê cao.', depts: ALL_DEPTS },
      { code: '4.4.5', criteria: 'Trang thiết bị', condition: 'Thiết bị không có dấu hiệu phân biệt', detail: 'Dao, kéo, rổ, thớt, pallet, xe trolley, thùng rác không phân biệt màu sắc/ký hiệu giữa các khu vực sống - chín.', depts: FRESH_DEPTS },
      { code: '4.4.6', criteria: 'Trang thiết bị', condition: 'Thùng rác không phù hợp', detail: 'Thùng rác dơ, bể, không túi rác, không nắp đậy, quá đầy, mở nắp bằng tay hoặc dùng khay chứa thực phẩm để đựng rác.', depts: ALL_DEPTS },
    ],
  },
  {
    id: 5,
    name: 'Area 5: Hồ sơ, tài liệu',
    items: [
      { code: '5.1.1', criteria: 'Báo cáo nhập hàng', condition: 'Không có giấy kiểm dịch', detail: 'Thiếu giấy chứng nhận kiểm dịch đối với sản phẩm thịt và chế biến từ thịt tại ngành hàng P&F, Butchery, Grocery.', depts: ['P&F', 'Butchery', 'Grocery', 'Delica', 'Canteen & General'] },
      { code: '5.1.2', criteria: 'Báo cáo nhập hàng', condition: 'Thông tin trên giấy kiểm dịch không phù hợp', detail: 'Sử dụng bản photo không hợp lệ, sai địa chỉ nơi đến, sai số lượng so với phiếu giao hàng.', depts: ['P&F', 'Butchery', 'Grocery', 'Delica', 'Canteen & General'] },
      { code: '5.1.3', criteria: 'Báo cáo nhập hàng', condition: 'Không có báo cáo kiểm tra khi nhận hàng', detail: 'Thiếu phiếu kiểm soát nhiệt độ khi nhận hàng theo SOP, biên bản từ chối nhận hàng.', depts: FOOD_DEPTS },
      { code: '5.1.4', criteria: 'Báo cáo nhập hàng', condition: 'Thông tin trên báo cáo nhận hàng không phù hợp', detail: 'Ghi chép phiếu nhận hàng thiếu thông tin nhiệt độ, chữ ký hoặc sai lệch thực tế.', depts: FOOD_DEPTS },
      { code: '5.1.5', criteria: 'Báo cáo nhập hàng', condition: 'Không có / Sai thông tin Hồ sơ nhập khẩu & Truy xuất nguồn gốc', detail: 'Thiếu hồ sơ nhập khẩu (Produce, Seafood, Butchery, BAT) hoặc thiếu/sai hồ sơ truy xuất nguồn gốc NCC địa phương (Produce, Seafood).', depts: ['Produce', 'Seafood', 'Butchery', 'BAT & Confect'] },

      { code: '5.2.1', criteria: 'Báo cáo hằng ngày', condition: 'Không có Hồ sơ kiểm tra vệ sinh hằng ngày', detail: 'Thiếu checklist vệ sinh đầu ca/cuối ca tại các khu vực sơ chế, chế biến.', depts: FRESH_DEPTS },
      { code: '5.2.2', criteria: 'Báo cáo hằng ngày', condition: 'Không có Hồ sơ kiểm soát nguyên liệu', detail: 'Thiếu hồ sơ CBHQ/CBPHQĐATTP bao bì tiếp xúc thực phẩm; thiếu biểu kiểm soát test nhanh hàn the/ure khi nhập thủy sản.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Canteen & General'] },
      { code: '5.2.3', criteria: 'Báo cáo hằng ngày', condition: 'Không có Hồ sơ kiểm soát quá trình nướng / sơ chế / chế biến', detail: 'Thiếu nhật ký kiểm soát nhiệt độ tâm/thời gian nướng của các lô hàng (Produce, Seafood, Butchery, Bakery, Delica).', depts: ['Produce', 'Seafood', 'Butchery', 'Bakery', 'Delica', 'Canteen & General'] },
      { code: '5.2.4', criteria: 'Báo cáo hằng ngày', condition: 'Không có Hồ sơ kiểm soát chia nhỏ / châm hàng / cân hàng / gia vị ướp', detail: 'Thiếu hồ sơ chia nhỏ (phô mai, bơ, thịt/thủy sản đông lạnh), châm hàng xá, cân đối chiếu, định lượng gia vị ướp.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Grocery', 'BAT & Confect'] },
      { code: '5.2.5', criteria: 'Báo cáo hằng ngày', condition: 'Không có đầy đủ hồ sơ kiểm soát nhiệt độ thiết bị / nước / pH / độ mặn', detail: 'Ghi thiếu thông số nhiệt độ tủ, pH, độ mặn hồ thủy sản hoặc nhiệt độ vượt chuẩn 1 ngày nhưng chưa có bằng chứng CAPA.', depts: ALL_DEPTS },
      { code: '5.2.6', criteria: 'Báo cáo hằng ngày', condition: 'Không có Hồ sơ lưu mẫu thức ăn 3 bước', detail: 'Sổ kiểm thực 3 bước và lưu mẫu thức ăn tại Canteen, Delica không ghi chép đầy đủ theo quy định.', depts: ['Delica', 'Canteen & General'] },
      { code: '5.2.7', criteria: 'Báo cáo hằng ngày', condition: 'Hồ sơ kiểm soát không phù hợp (Lab test, Lưu mẫu, BBD, Côn trùng)', detail: 'Khối lượng tịnh sai/chưa trừ bì; test lab nước/máy xay thịt/máy ép/đá/RTE không đạt; lưu mẫu thiếu (<100g đặc, <150ml lỏng) hoặc thiếu món; form BBD/HSD sai; thiếu hồ sơ côn trùng.', depts: ALL_DEPTS },

      { code: '5.3.1', criteria: 'Bảng hướng dẫn & Cảnh báo', condition: 'Không có các bảng hướng dẫn vận hành & vệ sinh', detail: 'Thiếu bảng hướng dẫn sử dụng/san chiết/lưu trữ hóa chất, bảng hướng dẫn rửa tay, hoặc thiếu SOP/WI tại quầy.', depts: ALL_DEPTS },
      { code: '5.3.2', criteria: 'Bảng hướng dẫn & Cảnh báo', condition: 'Không có các bảng cảnh báo bắt buộc', detail: 'Thiếu bảng "Vui lòng không tái đông" tại quầy rã đông hoặc bảng "Không bán rượu bia cho người dưới 18 tuổi" tại quầy rượu.', depts: ['Seafood', 'P&F', 'Butchery', 'Grocery', 'BAT & Confect'] },
      { code: '5.3.3', criteria: 'Bảng hướng dẫn & Cảnh báo', condition: 'Không có hoặc sai bảng thông tin sản phẩm / xuất xứ', detail: 'Thiếu bảng thông tin hàng bán xá (thịt, cá, bánh kẹo, gạo, đậu) hoặc sai thông tin xuất xứ hàng nhập khẩu, NCC RAT.', depts: ['Produce', 'Seafood', 'Butchery', 'Grocery', 'BAT & Confect'] },
    ],
  },
  {
    id: 6,
    name: 'Area 6: Nhân viên',
    items: [
      { code: '6.1.1', criteria: 'Đồng phục / Bảo hộ lao động', condition: 'Nhân viên mặc đồng phục / BHLĐ không đúng quy định', detail: 'Thiếu nón che tóc, khẩu trang, áo, tạp dề, giày hoặc thiếu găng tay dùng 1 lần khi tiếp xúc thực phẩm ăn ngay chưa bao gói (kể cả nhân viên giao hàng, vệ sinh nhà thầu).', depts: ALL_DEPTS },
      { code: '6.1.2', criteria: 'Đồng phục / Bảo hộ lao động', condition: 'Nhân viên mặc đồng phục / BHLĐ không sạch', detail: 'Quần áo bảo hộ, tạp dề dính bẩn, ố màu hoặc đơn vị giặt ủi giao đến không đảm bảo sạch sẽ.', depts: ALL_DEPTS },
      { code: '6.1.3', criteria: 'Đồng phục / Bảo hộ lao động', condition: 'Nhân viên mặc đồng phục / BHLĐ không nguyên vẹn', detail: 'Đồng phục, nón, tạp dề, ủng bị rách, sứt chỉ, hư hỏng.', depts: ALL_DEPTS },
      { code: '6.1.4', criteria: 'Đồng phục / Bảo hộ lao động', condition: 'Nhân viên mặc BHLĐ ra khỏi khu vực làm việc / đi ăn cơm', detail: 'Mặc nguyên bảo hộ (nón, khẩu trang, tạp dề, găng tay, ủng) đi ăn cơm hoặc ra khỏi khu vực siêu thị/kho.', depts: FRESH_DEPTS },
      { code: '6.1.5', criteria: 'Đồng phục / Bảo hộ lao động', condition: 'Nhân viên mặc BHLĐ vào nhà vệ sinh', detail: 'Nhân viên không tháo bỏ áo BHLĐ, tạp dề, găng tay trước khi đi vào nhà vệ sinh.', depts: FRESH_DEPTS },

      { code: '6.2.1', criteria: 'Vệ sinh cá nhân', condition: 'Nhân viên mắc bệnh truyền nhiễm hoặc có vết thương hở vẫn đi làm', detail: 'Nhân viên mắc bệnh thuộc danh mục cấm tiếp xúc thực phẩm hoặc có vết thương hở không băng bó chống thấm nước.', depts: FRESH_DEPTS },
      { code: '6.2.2', criteria: 'Vệ sinh cá nhân', condition: 'Nhân viên chưa được khám sức khỏe', detail: 'Nhân viên chính thức, thời vụ (Casual) hoặc PG của NCC chưa có giấy khám sức khỏe định kỳ theo quy định.', depts: FOOD_DEPTS },
      { code: '6.2.3', criteria: 'Vệ sinh cá nhân', condition: 'Nhân viên chưa được tập huấn kiến thức ATTP', detail: 'Nhân viên làm việc tại ngành hàng thực phẩm chưa được đào tạo và xác nhận kiến thức ATTP.', depts: FOOD_DEPTS },
      { code: '6.2.4', criteria: 'Vệ sinh cá nhân', condition: 'Nhân viên đeo trang sức', detail: 'Đeo đồng hồ, vòng tay, nhẫn, bông tai, dây chuyền tại khu vực sơ chế/chế biến/bán xá.', depts: FRESH_DEPTS },
      { code: '6.2.5', criteria: 'Vệ sinh cá nhân', condition: 'Nhân viên để móng tay dài / sơn móng tay', detail: 'Móng tay để dài, dính bẩn hoặc sơn móng tay, gắn móng giả.', depts: FRESH_DEPTS },
      { code: '6.2.6', criteria: 'Vệ sinh cá nhân', condition: 'Nhân viên rửa tay không đúng cách', detail: 'Rửa tay qua loa không dùng xà phòng/dung dịch sát khuẩn hoặc không đúng quy trình 6 bước.', depts: FRESH_DEPTS },
      { code: '6.2.7', criteria: 'Vệ sinh cá nhân', condition: 'Nhân viên sử dụng sai găng tay', detail: 'Dùng găng tay vải/cao su thô để bốc thực phẩm chín hoặc dùng găng tay rách.', depts: FRESH_DEPTS },

      { code: '6.3.1', criteria: 'Hành vi nhân viên', condition: 'Khi thay đổi công việc, nhân viên không thay găng tay', detail: 'Dùng chung 1 đôi găng tay từ khâu xử lý đồ sống/thu tiền sang chạm vào thực phẩm chín.', depts: FRESH_DEPTS },
      { code: '6.3.2', criteria: 'Hành vi nhân viên', condition: 'Nhân viên không rửa tay khi chuyển sang công đoạn khác', detail: 'Không rửa tay sát khuẩn sau khi đi vệ sinh, chạm vào rác, điện thoại hoặc chuyển công đoạn.', depts: FRESH_DEPTS },
      { code: '6.3.3', criteria: 'Hành vi nhân viên', condition: 'Tác phong nhân viên không phù hợp trong thời gian làm việc', detail: 'Ngủ, nằm gục trên bàn/kệ hàng trong giờ làm việc.', depts: ALL_DEPTS },
      { code: '6.3.4', criteria: 'Hành vi nhân viên', condition: 'Nhân viên hút thuốc trong thời gian làm việc', detail: 'Hút thuốc lá/thuốc lá điện tử trong khu vực kho, bãi nhận hàng hoặc khu chế biến.', depts: ALL_DEPTS },
      { code: '6.3.5', criteria: 'Hành vi nhân viên', condition: 'Có dấu hiệu ăn uống trong khu vực làm việc', detail: 'Phát hiện thức ăn dở dang, ly nước, tách trà, vỏ bánh kẹo tại khu vực sản xuất/bán hàng.', depts: ALL_DEPTS },
    ],
  },
  {
    id: 7,
    name: 'Area 7: Trang thiết bị dụng cụ (Bán hàng | Lưu trữ | Chế biến)',
    items: [
      { code: '7.1.1', criteria: 'Khu vực bán hàng - Vệ sinh', condition: 'Thiết bị tại khu vực bán hàng không sạch / vệ sinh sai cách', detail: 'Quầy kệ trưng bày, hộp đựng hóa chất rửa tay dơ, thiết bị pha hóa chất thiếu linh kiện hoặc hư hỏng.', depts: FOOD_DEPTS },
      { code: '7.1.2', criteria: 'Khu vực bán hàng - Vệ sinh', condition: 'Dùng không đúng hóa chất / sai nồng độ / không khử khuẩn', detail: 'Vệ sinh thiết bị quầy bán hàng không dùng hóa chất sát khuẩn hoặc pha sai nồng độ quy định.', depts: FRESH_DEPTS },
      { code: '7.1.3', criteria: 'Khu vực bán hàng - Chất liệu', condition: 'Chất liệu thiết bị không phù hợp / gỉ sét / dùng gỗ, tre', detail: 'Dụng cụ, khay kệ trưng bày tiếp xúc thực phẩm bị gỉ sét hoặc làm bằng vật liệu gỗ, tre.', depts: FOOD_DEPTS },
      { code: '7.1.4', criteria: 'Khu vực bán hàng - Tình trạng', condition: 'Thiếu trang bị theo quy định / thiếu tem kiểm định, hiệu chuẩn', detail: 'Thiếu bồn rửa tay, thùng rác, máy sấy tay/khăn giấy; cân hoặc nhiệt kế không có tem kiểm định/hiệu chuẩn còn hạn.', depts: FOOD_DEPTS },
      { code: '7.1.5', criteria: 'Khu vực bán hàng - Tình trạng', condition: 'Thiết bị hư hỏng, móp méo, mốc, hôi, nhớt, đọng nước, thớt chặt sâu', detail: 'Thiết bị đặt không ngăn nắp, không hoạt động, thớt/mặt bàn có vết chặt sâu, ẩm mốc, mùi hôi, nhớt hoặc đọng nước.', depts: FRESH_DEPTS },

      { code: '7.2.1', criteria: 'Khu vực lưu trữ hàng - Vệ sinh', condition: 'Thiết bị tại khu vực lưu trữ hàng không sạch / không khử khuẩn', detail: 'Kệ kho, pallet nhựa, xe đẩy, tủ lưu trữ bám bẩn hoặc vệ sinh sai hóa chất/nồng độ.', depts: ALL_DEPTS },
      { code: '7.2.2', criteria: 'Khu vực lưu trữ hàng - Chất liệu', condition: 'Chất liệu thiết bị lưu trữ gỉ sét / gỗ, tre / hóa chất có màu mùi', detail: 'Giá kệ kho bị gỉ sét, dùng kệ gỗ/tre trong khu vực ẩm ướt, hoặc hóa chất tẩy rửa có mùi lạ.', depts: ALL_DEPTS },
      { code: '7.2.3', criteria: 'Khu vực lưu trữ hàng - Tình trạng', condition: 'Không ngăn nắp / hóa chất không lưu khu riêng kín / thiết bị hư hỏng', detail: 'Vật tư, hóa chất vệ sinh không khóa lưu trong khu vực riêng kín; thiết bị kho móp méo, hỏng, mốc, đọng nước.', depts: ALL_DEPTS },

      { code: '7.3.1', criteria: 'Khu vực chế biến - Vệ sinh', condition: 'Thiết bị tại khu vực chế biến không sạch / không khử khuẩn', detail: 'Bàn sơ chế, máy xay thịt, máy cắt, lò nướng, dao thớt bám cặn thực phẩm hoặc không khử trùng đúng nồng độ.', depts: FRESH_DEPTS },
      { code: '7.3.2', criteria: 'Khu vực chế biến - Chất liệu', condition: 'Chất liệu thiết bị chế biến gỉ sét / gỗ, tre', detail: 'Sử dụng thớt gỗ, cán dao gỗ, rổ tre hoặc thiết bị inox bị gỉ sét trong khu vực chế biến.', depts: FRESH_DEPTS },
      { code: '7.3.3', criteria: 'Khu vực chế biến - Tình trạng', condition: 'Thiếu dụng cụ vệ sinh khử trùng & tem hiệu chuẩn', detail: 'Thiếu bình xịt hóa chất, khay ngâm dụng cụ (đặc biệt Butchery, Seafood), hóa chất rửa tay; thiếu tem hiệu chuẩn nhiệt kế/cân.', depts: FRESH_DEPTS },
      { code: '7.3.4', criteria: 'Khu vực chế biến - Tình trạng', condition: 'Thiết bị chế biến không hoạt động / thớt vết chặt sâu / mốc / nhớt / đọng nước', detail: 'Máy móc hỏng, không đặt đúng nơi quy định, thớt có vết chặt sâu khó vệ sinh, có nấm mốc, mùi hôi, nhớt hoặc đọng nước.', depts: FRESH_DEPTS },
    ],
  },
  {
    id: 8,
    name: 'Area 8: Vật gây hại',
    items: [
      { code: '8.1.1', criteria: 'Dấu hiệu xâm nhập', condition: 'Có phân của vật gây hại', detail: 'Phát hiện phân chuột, phân gián, phân chim trong khu vực kho, quầy kệ hoặc khu chế biến.', depts: ALL_DEPTS },
      { code: '8.1.2', criteria: 'Dấu hiệu xâm nhập', condition: 'Sản phẩm bị cắn phá', detail: 'Bao bì thực phẩm, thùng carton hoặc hàng hóa có dấu vết bị chuột, gián cắn phá.', depts: ALL_DEPTS },
      { code: '8.1.3', criteria: 'Dấu hiệu xâm nhập', condition: 'Có vật gây hại sống', detail: 'Phát hiện chuột, gián, ruồi, kiến sống hoặc chim/tổ chim trong kho, cửa nhập hàng, lối vào.', depts: ALL_DEPTS },
      { code: '8.1.4', criteria: 'Dấu hiệu xâm nhập', condition: 'Có vật gây hại chết', detail: 'Xác chuột, gián, côn trùng chết tồn đọng trên sàn, góc kho không được thu gom vệ sinh.', depts: ALL_DEPTS },

      { code: '8.2.1', criteria: 'Kiểm soát mồi bẫy & Đèn côn trùng', condition: 'Mồi bẫy đặt sai vị trí', detail: 'Hộp bẫy chuột/bẫy dính đặt sai sơ đồ kiểm soát hoặc đặt bên trong khu vực thực phẩm hở.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Delivery', 'Grocery', 'BAT & Confect', 'Canteen & General'] },
      { code: '8.2.2', criteria: 'Kiểm soát mồi bẫy & Đèn côn trùng', condition: 'Mồi / bẫy bị hư hỏng', detail: 'Hộp bẫy bị vỡ, mất nắp, bẹp méo không còn đảm bảo an toàn.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Delivery', 'Grocery', 'BAT & Confect', 'Canteen & General'] },
      { code: '8.2.3', criteria: 'Kiểm soát mồi bẫy & Đèn côn trùng', condition: 'Mồi bẫy không còn tác dụng', detail: 'Keo dính khô, bả mồi hết hoặc ẩm mốc không còn hiệu lực bắt côn trùng/chuột.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Delivery', 'Canteen & General'] },
      { code: '8.2.4', criteria: 'Kiểm soát mồi bẫy & Đèn côn trùng', condition: 'Đèn diệt côn trùng không đặt đúng vị trí', detail: 'Thiếu đèn diệt côn trùng tại phía trong cửa nhận hàng, khu sản xuất bánh, ngay phía ngoài cửa cuốn ngăn khu sản xuất và bán bánh.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Delivery', 'Canteen & General'] },
      { code: '8.2.5', criteria: 'Kiểm soát mồi bẫy & Đèn côn trùng', condition: 'Đèn diệt côn trùng bị hư hỏng', detail: 'Đèn bị vỡ bóng, hỏng máng, đứt dây nguồn không hoạt động.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Delivery', 'Canteen & General'] },
      { code: '8.2.6', criteria: 'Kiểm soát mồi bẫy & Đèn côn trùng', condition: 'Đèn diệt côn trùng không còn tác dụng', detail: 'Bóng đèn UV hết hạn phát tia thu hút hoặc tấm keo dính bên trong đầy xác côn trùng không thay mới.', depts: ['Produce', 'Seafood', 'P&F', 'Butchery', 'Bakery', 'Delica', 'Delivery', 'Canteen & General'] },
    ],
  },
];
