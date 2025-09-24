
import { collection, addDoc, serverTimestamp, query, where, getDocs, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';

interface ErrorDetails {
  process: string;
  location: string;
  userId?: string;
  context?: any;
  message: string;
}

export async function logError(details: ErrorDetails) {
  try {
    const errorsCollection = collection(db, 'errors');

    // Check if an identical error has already been logged
    const q = query(
      errorsCollection,
      where('message', '==', details.message),
      where('location', '==', details.location),
      where('process', '==', details.process)
    );

    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // If the same error exists, increment its count
      const errorDoc = querySnapshot.docs[0];
      await updateDoc(errorDoc.ref, {
        count: increment(1),
        // Update the timestamp to reflect the latest occurrence
        timestamp: serverTimestamp(),
      });
    } else {
      // If it's a new error, create a new document
      await addDoc(errorsCollection, {
        ...details,
        count: 1,
        timestamp: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Failed to log error to Firestore:", error);
    // Fallback to console.error if Firestore logging fails
    console.error("Original error details:", details);
  }
}
