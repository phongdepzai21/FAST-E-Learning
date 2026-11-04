
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAloVxfuTnVJCd5IcN2Vd54IV7oIkKbBx0",
  authDomain: "decisive-carver-7lrqd.firebaseapp.com",
  projectId: "decisive-carver-7lrqd",
  storageBucket: "decisive-carver-7lrqd.firebasestorage.app",
  messagingSenderId: "888698371847",
  appId: "1:888698371847:web:45dd515119c63ea3e3cfa2"
};

// Đảm bảo chỉ khởi tạo app một lần duy nhất (Singleton)
const isAlreadyInitialized = getApps().length > 0;
const app = isAlreadyInitialized ? getApp() : initializeApp(firebaseConfig);

// Lấy instance auth từ app đã khởi tạo
const auth = getAuth(app);
// Lấy instance storage
const storage = getStorage(app);
// Lấy instance firestore (database)
const db = getFirestore(app);

export { auth, storage, db };
