
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA-ifqmttPrxRY36zKc_dbEYq3NOXqElPo",
  authDomain: "fast-e-learning.firebaseapp.com",
  projectId: "fast-e-learning",
  storageBucket: "fast-e-learning.firebasestorage.app",
  messagingSenderId: "81409711510",
  appId: "1:81409711510:web:5297e414e028d7280fd1b7",
  measurementId: "G-25HCM3EEFE"
};

// Đảm bảo chỉ khởi tạo app một lần duy nhất (Singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Lấy instance auth từ app đã khởi tạo
const auth = getAuth(app);
// Lấy instance storage
const storage = getStorage(app);
// Lấy instance firestore (database)
const db = getFirestore(app);

export { auth, storage, db };
