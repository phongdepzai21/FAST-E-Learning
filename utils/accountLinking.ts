import { FacebookAuthProvider, linkWithPopup, type User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export interface LinkedProviderStatus {
  isGoogleLinked: boolean;
  isPasswordSet: boolean;
  isFacebookLinked: boolean;
  providerIds: string[];
}

export interface FacebookLinkResult {
  ok: boolean;
  uid?: string;
  providerIds?: string[];
  alreadyLinked?: boolean;
  credentialConflict?: boolean;
  errorCode?: string;
  title?: string;
  message: string;
}

export function createFacebookAuthProvider(): FacebookAuthProvider {
  const provider = new FacebookAuthProvider();
  provider.addScope('public_profile');
  provider.addScope('email');
  return provider;
}

export function isRealFirebaseUser(user: User | null | undefined): user is User {
  return Boolean(user && typeof user.uid === 'string' && (user as any).metadata);
}

export function getLinkedProviderStatus(user: User | null | undefined): LinkedProviderStatus {
  const providerIds = Array.from(
    new Set(
      (user?.providerData || [])
        .map((p) => p?.providerId)
        .filter((id): id is string => Boolean(id))
    )
  );

  return {
    isGoogleLinked: providerIds.includes('google.com'),
    isPasswordSet: providerIds.includes('password'),
    isFacebookLinked: providerIds.includes('facebook.com'),
    providerIds,
  };
}

export async function syncLinkedProvidersMetadata(user: User): Promise<string[]> {
  try {
    await user.reload();
  } catch {
    // Ignore reload error if offline
  }

  const { providerIds } = getLinkedProviderStatus(user);
  const normalizedEmail = (user.email || '').toLowerCase().trim();
  const profileDocKey = normalizedEmail || user.uid;

  if (profileDocKey) {
    try {
      await setDoc(
        doc(db, 'users', profileDocKey),
        {
          uid: user.uid,
          linkedProviders: providerIds,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('[AccountLinking] Failed to sync linkedProviders metadata:', err);
    }
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('user_providers_updated', {
        detail: { uid: user.uid, providerIds },
      })
    );
  }

  return providerIds;
}

export async function linkCurrentUserWithFacebook(currentUser: User | null): Promise<FacebookLinkResult> {
  if (!currentUser) {
    return {
      ok: false,
      errorCode: 'no-current-user',
      title: 'Chưa đăng nhập',
      message: 'Vui lòng đăng nhập vào tài khoản trước khi liên kết Facebook.',
    };
  }

  if (!isRealFirebaseUser(currentUser)) {
    return {
      ok: false,
      errorCode: 'synthetic-session',
      title: 'Cần xác thực lại phiên Firebase',
      message:
        'Phiên đăng nhập hiện tại đang dùng chế độ dự phòng ngoại tuyến. Vui lòng đăng nhập lại bằng Google hoặc Email/Mật khẩu để liên kết Facebook.',
    };
  }

  const currentStatus = getLinkedProviderStatus(currentUser);
  if (currentStatus.isFacebookLinked) {
    return {
      ok: true,
      alreadyLinked: true,
      uid: currentUser.uid,
      providerIds: currentStatus.providerIds,
      title: 'Đã liên kết Facebook',
      message:
        'Tài khoản này đã được liên kết với Facebook trước đó. Bạn có thể đăng nhập bằng Facebook ở những lần tiếp theo.',
    };
  }

  const uidBefore = currentUser.uid;

  try {
    const provider = createFacebookAuthProvider();
    const credential = await linkWithPopup(currentUser, provider);
    const linkedUser = credential.user;

    if (linkedUser.uid !== uidBefore) {
      return {
        ok: false,
        errorCode: 'uid-mismatch',
        title: 'Cảnh báo toàn vẹn tài khoản',
        message: 'Phát hiện sự thay đổi UID ngoài ý muốn. Hệ thống đã dừng thao tác để bảo vệ dữ liệu của bạn.',
      };
    }

    const updatedProviders = await syncLinkedProvidersMetadata(linkedUser);

    return {
      ok: true,
      uid: linkedUser.uid,
      providerIds: updatedProviders,
      title: 'Liên kết Facebook thành công',
      message:
        'Đã liên kết Facebook vào tài khoản hiện tại của bạn (giữ nguyên toàn bộ khóa học và hồ sơ). Từ nay bạn có thể đăng nhập bằng Facebook hoặc phương thức cũ.',
    };
  } catch (err: any) {
    const errorCode = err?.code || '';
    const errorMessage = String(err?.message || '');

    if (errorCode === 'auth/provider-already-linked') {
      const updatedProviders = await syncLinkedProvidersMetadata(currentUser);
      return {
        ok: true,
        alreadyLinked: true,
        uid: currentUser.uid,
        providerIds: updatedProviders,
        title: 'Đã liên kết Facebook',
        message: 'Tài khoản của bạn đã được kết nối với Facebook trước đó.',
      };
    }

    if (errorCode === 'auth/credential-already-in-use' || errorCode === 'auth/email-already-in-use') {
      return {
        ok: false,
        credentialConflict: true,
        errorCode,
        title: 'Tài khoản Facebook đang liên kết với tài khoản khác',
        message:
          'Tài khoản Facebook này đã được liên kết với một tài khoản (UID) FAST E-Learning khác. Để bảo vệ dữ liệu và khóa học, hệ thống KHÔNG tự động gộp hay ghi đè tài khoản. Phiên đăng nhập hiện tại của bạn vẫn được giữ nguyên. Nếu cần gộp hoặc chuyển dữ liệu, vui lòng liên hệ hỗ trợ FAST để xác minh chủ sở hữu an toàn.',
      };
    }

    if (errorCode === 'auth/popup-closed-by-user') {
      return {
        ok: false,
        errorCode,
        title: 'Đã đóng cửa sổ Facebook',
        message:
          'Bạn đã đóng cửa sổ xác thực Facebook trước khi hoàn tất. Phiên đăng nhập hiện tại của bạn vẫn được giữ nguyên.',
      };
    }

    if (errorCode === 'auth/cancelled-popup-request') {
      return {
        ok: false,
        errorCode,
        title: 'Yêu cầu liên kết bị hủy',
        message:
          'Cửa sổ xác thực Facebook bị mở trùng lặp. Vui lòng nhấn một lần và chờ hoàn tất.',
      };
    }

    if (errorCode === 'auth/popup-blocked') {
      return {
        ok: false,
        errorCode,
        title: 'Trình duyệt chặn cửa sổ bật lên',
        message:
          'Trình duyệt đã chặn popup liên kết Facebook. Vui lòng cho phép popup cho trang web này và thử lại.',
      };
    }

    if (errorCode === 'auth/network-request-failed') {
      return {
        ok: false,
        errorCode,
        title: 'Lỗi kết nối mạng',
        message:
          'Không thể kết nối tới Facebook hoặc Firebase. Vui lòng kiểm tra Internet và thử lại; phiên đăng nhập hiện tại vẫn được giữ nguyên.',
      };
    }

    if (errorCode === 'auth/requires-recent-login') {
      return {
        ok: false,
        errorCode,
        title: 'Cần xác thực lại phiên đăng nhập',
        message:
          'Vì lý do bảo mật của Firebase, vui lòng đăng xuất và đăng nhập lại trước khi liên kết thêm phương thức Facebook.',
      };
    }

    if (errorCode === 'auth/operation-not-allowed') {
      return {
        ok: false,
        errorCode,
        title: 'Chưa kích hoạt Facebook trên Firebase',
        message:
          'Nhà cung cấp Facebook chưa được bật trong Firebase Authentication. Vui lòng kiểm tra cấu hình Sign-in method.',
      };
    }

    if (errorCode === 'auth/unauthorized-domain') {
      return {
        ok: false,
        errorCode,
        title: 'Tên miền chưa được ủy quyền',
        message: `Tên miền ${typeof window !== 'undefined' ? window.location.hostname : ''} chưa được thêm vào Authorized domains của Firebase Authentication.`,
      };
    }

    if (typeof window !== 'undefined' && window.self !== window.top) {
      return {
        ok: false,
        errorCode: errorCode || 'iframe-restricted',
        title: 'Hạn chế trong khung xem trước (iframe)',
        message:
          'Trình duyệt không cho phép mở cửa sổ Facebook bên trong khung xem trước. Hãy mở trang trong tab mới để thực hiện liên kết Facebook.',
      };
    }

    return {
      ok: false,
      errorCode: errorCode || 'unknown',
      title: 'Liên kết Facebook thất bại',
      message: errorMessage || 'Không thể liên kết tài khoản Facebook lúc này. Vui lòng thử lại sau.',
    };
  }
}
