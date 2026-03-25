import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, EmailAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const googleProvider = new GoogleAuthProvider();

export { createUserWithEmailAndPassword, signInWithEmailAndPassword, signInWithPopup };

export const testConnection = async () => {
  try {
    const { getDocFromServer } = await import('firebase/firestore');
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log('Firebase connection successful');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. The client is offline.");
    }
    // Other errors are expected if the document doesn't exist or rules deny access, 
    // but 'offline' specifically indicates a config/network issue.
  }
};

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};
