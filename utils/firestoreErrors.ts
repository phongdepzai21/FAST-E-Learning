/**
 * Tiện ích chuẩn đoán lỗi Firestore và trả về hướng dẫn khắc phục cụ thể cho người dùng
 */

export interface FirestoreErrorInfo {
  code: string;
  title: string;
  solution: string;
  fullToastMessage: string;
}

export function logFirestoreError(operation: string, collectionPath: string, err: any, payload?: any): FirestoreErrorInfo {
  const errorInfo = parseFirestoreError(err, operation);
  
  console.group(`🔥 Firestore Error: [${operation}]`);
  console.error(`📍 Target Path: ${collectionPath}`);
  console.error(`🔴 Raw Error Code: ${err?.code || 'unknown'}`);
  console.error(`💬 Raw Error Message: ${err?.message || String(err)}`);
  
  if (payload) {
    console.warn(`📦 Payload Attempted:`, payload);
  }
  
  console.info(`💡 Diagnosis: ${errorInfo.solution}`);
  
  // Specific debugging for permission-denied to help diagnose rules issues
  if (errorInfo.code === 'permission-denied') {
    console.warn('🔒 PERMISSION DENIED DIAGNOSTICS:');
    console.warn('1. Check if user is authenticated: Use `auth.currentUser`');
    console.warn('2. Rule Matching: Verify if user email/uid exactly matches the `isOwner` condition in firestore.rules');
    console.warn('3. Schema Validation: Check if the payload strictly matches ALL validation schema rules (e.g., string types, booleans, timestamps). A single type mismatch will cause a permission-denied error.');
  }
  
  console.groupEnd();

  return errorInfo;
}

export function parseFirestoreError(err: any, customActionContext: string = 'Đồng bộ khóa học'): FirestoreErrorInfo {
  const code = (err?.code || '').toLowerCase();
  const rawMsg = (err?.message || String(err || '')).toLowerCase();

  // 1. Lỗi phân quyền (Permission Denied / Missing Permissions)
  if (
    code.includes('permission-denied') ||
    rawMsg.includes('permission-denied') ||
    rawMsg.includes('missing or insufficient permissions') ||
    rawMsg.includes('insufficient permissions')
  ) {
    const title = 'Lỗi phân quyền Firestore (permission-denied)';
    const solution = 'Tài khoản chưa được cấp quyền ghi vào cơ sở dữ liệu Cloud. Khắc phục: Hãy thử Đăng xuất và Đăng nhập lại, hoặc kích hoạt lại gói VIP/Admin trong phần Cài đặt.';
    return {
      code: 'permission-denied',
      title,
      solution,
      fullToastMessage: `[Code: ${code} | Msg: ${err?.message}] ❌ ${customActionContext} thất bại: ${title}\n💡 Hướng dẫn khắc phục: ${solution}`
    };
  }

  // 2. Lỗi thiếu chỉ mục (Missing Index / Failed Precondition)
  if (
    code.includes('failed-precondition') ||
    rawMsg.includes('failed-precondition') ||
    rawMsg.includes('requires an index') ||
    rawMsg.includes('missing index') ||
    rawMsg.includes('the query requires an index')
  ) {
    const title = 'Thiếu chỉ mục truy vấn Firestore (missing-index)';
    const solution = 'Truy vấn cần tạo Composite Index trong Firebase Console. Khắc phục: Quản trị viên cần mở Firebase Console > Firestore Database > Indexes để bật chỉ mục.';
    return {
      code: 'missing-index',
      title,
      solution,
      fullToastMessage: `[Code: ${code} | Msg: ${err?.message}] ⚠️ ${customActionContext}: ${title}\n💡 Hướng dẫn: ${solution}`
    };
  }

  // 3. Lỗi mạng / Ngoại tuyến (Unavailable / Network / Offline)
  if (
    code.includes('unavailable') ||
    code.includes('network-request-failed') ||
    rawMsg.includes('unavailable') ||
    rawMsg.includes('network') ||
    rawMsg.includes('client is offline') ||
    rawMsg.includes('offline')
  ) {
    const title = 'Mất kết nối máy chủ Firestore (unavailable)';
    const solution = 'Dữ liệu đã được lưu tạm trên thiết bị của bạn. Khắc phục: Vui lòng kiểm tra lại kết nối Internet và tải lại trang.';
    return {
      code: 'unavailable',
      title,
      solution,
      fullToastMessage: `[Code: ${code} | Msg: ${err?.message}] 📡 ${customActionContext}: ${title}\n💡 Hướng dẫn: ${solution}`
    };
  }

  // 4. Lỗi chưa xác thực (Unauthenticated)
  if (
    code.includes('unauthenticated') ||
    rawMsg.includes('unauthenticated') ||
    rawMsg.includes('auth')
  ) {
    const title = 'Phiên đăng nhập đã hết hạn (unauthenticated)';
    const solution = 'Khắc phục: Vui lòng đăng nhập lại tài khoản để hệ thống xác thực danh tính trước khi đồng bộ.';
    return {
      code: 'unauthenticated',
      title,
      solution,
      fullToastMessage: `[Code: ${code} | Msg: ${err?.message}] 🔒 ${customActionContext}: ${title}\n💡 Hướng dẫn: ${solution}`
    };
  }

  // 5. Lỗi vượt hạn mức (Resource Exhausted / Quota Exceeded)
  if (
    code.includes('resource-exhausted') ||
    code.includes('quota-exceeded') ||
    rawMsg.includes('resource-exhausted') ||
    rawMsg.includes('quota')
  ) {
    const title = 'Vượt quá hạn mức Firestore (resource-exhausted)';
    const solution = 'Khắc phục: Cơ sở dữ liệu đã đạt giới hạn gói cước miễn phí hôm nay. Vui lòng liên hệ quản trị viên để nâng cấp hạn ngạch.';
    return {
      code: 'resource-exhausted',
      title,
      solution,
      fullToastMessage: `[Code: ${code} | Msg: ${err?.message}] ⚠️ ${customActionContext}: ${title}\n💡 Hướng dẫn: ${solution}`
    };
  }

  // 6. Lỗi không tìm thấy tài liệu (Not Found)
  if (
    code.includes('not-found') ||
    rawMsg.includes('not-found') ||
    rawMsg.includes('no document to update')
  ) {
    const title = 'Không tìm thấy dữ liệu khóa học (not-found)';
    const solution = 'Khắc phục: Khóa học có thể đã bị xóa hoặc đổi mã định danh. Hãy tải lại trang để làm mới danh sách.';
    return {
      code: 'not-found',
      title,
      solution,
      fullToastMessage: `[Code: ${code} | Msg: ${err?.message}] 🔍 ${customActionContext}: ${title}\n💡 Hướng dẫn: ${solution}`
    };
  }

  // 7. Lỗi chung khác
  const title = `Lỗi hệ thống (${code || 'unknown-error'})`;
  const solution = `Chi tiết: ${err?.message || 'Có lỗi xảy ra khi ghi vào Cloud Firestore'}. Hệ thống đã tự động lưu dữ liệu vào bộ nhớ máy của bạn. Hãy tải lại trang để thử lại.`;
  return {
    code: code || 'unknown',
    title,
    solution,
    fullToastMessage: `[Code: ${code} | Msg: ${err?.message}] ⚠️ ${customActionContext} trên Cloud thất bại: ${title}\n💡 Hướng dẫn: ${solution}`
  };
}
