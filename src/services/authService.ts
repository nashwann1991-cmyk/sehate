import { UserProfile } from '../types';
import { auth, db, signInWithGoogle, signInWithEmailAndPassword, createUserWithEmailAndPassword } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

const CURRENT_USER_KEY = 'mysickleave_current_user';
const TOKEN_KEY = 'mysickleave_token';

// 🛠️ دالة مساعدة لإزالة الحقول undefined
const sanitizeForFirestore = <T extends Record<string, any>>(data: T) => {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [k, v === undefined ? null : v])
  ) as T;
};

export const authService = {
  getCurrentUser: (): UserProfile | null => {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  },

  getToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  loginWithGoogle: async (): Promise<UserProfile> => {
    const user = await signInWithGoogle();
    if (!user) throw new Error('Google sign in failed');

    const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
    const isAdminEmail = adminEmail && user.email?.toLowerCase() === adminEmail;
    const path = `users/${user.uid}`;
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let profile: UserProfile;

      if (!userDoc.exists()) {
        // إنشاء مستند جديد للمستخدم
        profile = sanitizeForFirestore({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'User',
          role: isAdminEmail ? 'admin' : 'doctor', // الدور الافتراضي
          status: isAdminEmail ? 'active' : 'pending', // الحساب معلق حتى الموافقة إلا للأدمن
          specialization: null, // الحقول الاختيارية
          createdAt: Date.now(),
          subscription: {
            plan: 'free',
            status: 'trial',
            expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 يوم تجربة
          }
        });
        await setDoc(doc(db, 'users', user.uid), profile);
      } else {
        profile = sanitizeForFirestore(userDoc.data() as UserProfile);
        // تأكيد تفعيل الأدمن حتى لو كان موجوداً مسبقاً بحالة مختلفة
        if (isAdminEmail && profile.status !== 'active') {
          profile.status = 'active';
          profile.role = 'admin';
          await setDoc(doc(db, 'users', user.uid), { status: 'active', role: 'admin' }, { merge: true });
        }
      }

      if (profile.status !== 'active') {
        await signOut(auth);
        localStorage.removeItem(CURRENT_USER_KEY);
        throw new Error(profile.status === 'pending' ? 'حسابك قيد المراجعة. يرجى الانتظار حتى يتم تفعيل حسابك من قبل الإدارة.' : 'تم تعليق حسابك. يرجى التواصل مع الإدارة.');
      }

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      authService.notifyListeners();
      return profile;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  login: async (email: string, password: string): Promise<UserProfile> => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
      const isAdminEmail = adminEmail && user.email?.toLowerCase() === adminEmail;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      let profile: UserProfile;

      if (!userDoc.exists()) {
        // إنشاء ملف شخصي إذا كان مفقوداً (حالة نادرة أو خطأ سابق)
        profile = sanitizeForFirestore({
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || email.split('@')[0],
          role: isAdminEmail ? 'admin' : 'doctor',
          status: isAdminEmail ? 'active' : 'pending',
          createdAt: Date.now(),
          subscription: {
            plan: 'free',
            status: 'trial',
            expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
          }
        });
        await setDoc(doc(db, 'users', user.uid), profile);
      } else {
        profile = sanitizeForFirestore(userDoc.data() as UserProfile);
        // تأكيد تفعيل الأدمن
        if (isAdminEmail && profile.status !== 'active') {
          profile.status = 'active';
          profile.role = 'admin';
          await setDoc(doc(db, 'users', user.uid), { status: 'active', role: 'admin' }, { merge: true });
        }
      }

      if (profile.status !== 'active') {
        await signOut(auth);
        localStorage.removeItem(CURRENT_USER_KEY);
        throw new Error(profile.status === 'pending' ? 'حسابك قيد المراجعة. يرجى الانتظار حتى يتم تفعيل حسابك من قبل الإدارة.' : 'تم تعليق حسابك. يرجى التواصل مع الإدارة.');
      }

      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
      authService.notifyListeners();
      return profile;
    } catch (error: any) {
      console.error('Login error:', error);
      // نمرر الخطأ كما هو ليتعامل معه المكون الرسومي بشكل أفضل
      throw error;
    }
  },

  register: async (profile: Omit<UserProfile, 'uid' | 'createdAt'>, password: string): Promise<UserProfile> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, profile.email, password);
      const user = userCredential.user;
      const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
      const isAdminEmail = adminEmail && user.email?.toLowerCase() === adminEmail;

      const newProfile: UserProfile = sanitizeForFirestore({
        ...profile,
        uid: user.uid,
        role: isAdminEmail ? 'admin' : profile.role,
        status: isAdminEmail ? 'active' : 'pending', // الأدمن مفعل تلقائياً
        createdAt: Date.now(),
        subscription: {
          plan: 'free',
          status: 'trial',
          expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
        }
      });

      await setDoc(doc(db, 'users', user.uid), newProfile);
      
      if (!isAdminEmail) {
        // لا نسجل الدخول تلقائياً للأطباء لأن الحساب يحتاج موافقة
        await signOut(auth);
        localStorage.removeItem(CURRENT_USER_KEY);
        authService.notifyListeners();
      } else {
        // الأدمن يدخل مباشرة
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newProfile));
        authService.notifyListeners();
      }
      return newProfile;
    } catch (error: any) {
      console.error('Registration error:', error);
      throw new Error(error.message || 'An error occurred while creating the account');
    }
  },

  registerByAdmin: async (profile: Omit<UserProfile, 'uid' | 'createdAt'>, password: string): Promise<UserProfile> => {
    const { initializeApp: initSecondary } = await import('firebase/app');
    const { getAuth: getAuthSecondary, createUserWithEmailAndPassword: createSecondary } = await import('firebase/auth');
    const { default: firebaseConfig } = await import('../../firebase-applet-config.json');

    const secondaryApp = initSecondary(firebaseConfig, 'SecondaryApp');
    const secondaryAuth = getAuthSecondary(secondaryApp);

    try {
      const userCredential = await createSecondary(secondaryAuth, profile.email, password);
      const user = userCredential.user;
      
      const newProfile: UserProfile = sanitizeForFirestore({
        ...profile,
        uid: user.uid,
        status: 'active', // المسؤول ينشئ حسابات مفعلة
        createdAt: Date.now(),
        subscription: {
          plan: 'free',
          status: 'active',
          expiryDate: Date.now() + (365 * 24 * 60 * 60 * 1000)
        }
      });
      
      await setDoc(doc(db, 'users', user.uid), newProfile);
      
      const { deleteApp } = await import('firebase/app');
      await deleteApp(secondaryApp);
      
      return newProfile;
    } catch (error: any) {
      console.error('Admin registration error:', error);
      throw new Error(error.message || 'An error occurred while creating the account');
    }
  },

  logout: async () => {
    await signOut(auth);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    authService.notifyListeners();
  },

  getAllUsers: async (): Promise<UserProfile[]> => {
    const path = 'users';
    try {
      const querySnapshot = await getDocs(collection(db, path));
      return querySnapshot.docs.map(doc => sanitizeForFirestore(doc.data() as UserProfile));
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  },

  onAuthStateChanged: (callback: (user: UserProfile | null) => void) => {
    const unsubscribeFirebase = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const path = `users/${user.uid}`;
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            let profile = sanitizeForFirestore(userDoc.data() as UserProfile);
            const adminEmail = import.meta.env.VITE_ADMIN_EMAIL?.toLowerCase();
            const isAdminEmail = adminEmail && user.email?.toLowerCase() === adminEmail;

            // تأكيد تفعيل الأدمن دائماً
            if (isAdminEmail && profile.status !== 'active') {
              profile.status = 'active';
              profile.role = 'admin';
              await setDoc(doc(db, 'users', user.uid), { status: 'active', role: 'admin' }, { merge: true });
            }
            
            if (profile.status !== 'active') {
              await signOut(auth);
              localStorage.removeItem(CURRENT_USER_KEY);
              callback(null);
              return;
            }

            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(profile));
            callback(profile);
          } else {
            callback(authService.getCurrentUser());
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, path);
          callback(authService.getCurrentUser());
        }
      } else {
        localStorage.removeItem(CURRENT_USER_KEY);
        callback(null);
      }
    });

    const listener = (e: any) => {
      if (e.detail?.key === CURRENT_USER_KEY || e.key === CURRENT_USER_KEY) {
        callback(authService.getCurrentUser());
      }
    };

    window.addEventListener('storage', listener);
    window.addEventListener('auth-state-change', listener);

    return () => {
      unsubscribeFirebase();
      window.removeEventListener('storage', listener);
      window.removeEventListener('auth-state-change', listener);
    };
  },

  notifyListeners: () => {
    window.dispatchEvent(new CustomEvent('auth-state-change', { detail: { key: CURRENT_USER_KEY } }));
  },

  ensureProfileExists: async (profile: UserProfile): Promise<void> => {
    const userDoc = await getDoc(doc(db, 'users', profile.uid));
    if (!userDoc.exists()) {
      const sanitized = sanitizeForFirestore({
        ...profile,
        displayName: profile.displayName || profile.email.split('@')[0],
        createdAt: profile.createdAt || Date.now()
      });
      await setDoc(doc(db, 'users', profile.uid), sanitized);
    }
  },

  updateUserStatus: async (uid: string, status: 'pending' | 'active' | 'suspended'): Promise<void> => {
    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, 'users', uid), { status }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  updateUserSubscription: async (uid: string, subscription: UserProfile['subscription']): Promise<void> => {
    const path = `users/${uid}`;
    try {
      await setDoc(doc(db, 'users', uid), { subscription: sanitizeForFirestore(subscription!) }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      throw error;
    }
  },

  deleteUser: async (uid: string): Promise<void> => {
    const path = `users/${uid}`;
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      throw error;
    }
  }
};