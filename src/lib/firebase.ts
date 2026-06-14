import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
export { onMessage };

// Ensure we have a UID for Firestore rules
export const ensureAuth = async () => {
  if (typeof window === 'undefined') return;
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e: any) {
      // Silence the restricted operation error as it's common if not enabled in console
      if (e.code !== 'auth/admin-restricted-operation') {
        console.warn("[Firebase] Anonymous sign-in info:", e.message);
      }
    }
  }
};

// Validate Connection to Firestore
async function testConnection() {
  if (typeof window === 'undefined') return;
  try {
    // Attempting a read to test connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    // Silent fail for test
  }
}

testConnection();

export async function requestPushPermission(companyId: string, registration?: ServiceWorkerRegistration) {
  if (!messaging) return null;
  
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const options: any = {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BG3UsIegvsctC_D6u6UTACDiO9WKu-tNTs_GKDkAuXACocBE7WCTG-FsLJm5WhzNZ4ubbl15pEMcIS2WFQXg50U'
      };
      if (registration) {
        options.serviceWorkerRegistration = registration;
      }
      const token = await getToken(messaging, options);
      console.log('FCM Token:', token);
      return token;
    }
  } catch (error) {
    console.error('Push permission error:', error);
  }
  return null;
}
