// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  "projectId": "teamsocial-blky0",
  "appId": "1:1088098682973:web:80f91b1d6b6771cd9fa5b4",
  "storageBucket": "teamsocial-blky0.firebasestorage.app",
  "apiKey": "AIzaSyAUgRqnJyE1xX6TG5dde4TnCLGY8edh0ss",
  "authDomain": "teamsocial-blky0.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "1088098682973"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
