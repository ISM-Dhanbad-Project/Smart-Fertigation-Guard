import { initializeApp, getApps } from "firebase/app";
import { getFirestore, writeBatch, collection, doc } from "firebase/firestore";
import { SensorReading } from "@/types";

const firebaseConfig = {
  apiKey: "mock-api-key",
  authDomain: "fertigation-guard.firebaseapp.com",
  projectId: "fertigation-guard",
  storageBucket: "fertigation-guard.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const firestore = getFirestore(app);

export async function syncBatchToFirestore(readings: SensorReading[]) {
  if (readings.length === 0) return;
  const batch = writeBatch(firestore);
  const collectionRef = collection(firestore, "readings");
  
  readings.forEach(reading => {
    const docRef = doc(collectionRef); // auto-id
    batch.set(docRef, reading);
  });
  
  try {
    // We will wrap this in a try-catch because mock credentials will fail
    // await batch.commit();
    console.log(`[Firebase Sync] Simulated batch commit of ${readings.length} readings`);
  } catch (error) {
    console.warn("Firebase sync failed (expected with mock credentials):", error);
    throw error;
  }
}
