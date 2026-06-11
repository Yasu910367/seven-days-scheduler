import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyAeeHp2OneKVpE08Inx2Fjq-M_P-8r63WU",
  authDomain: "seven-days-scheduler.firebaseapp.com",
  projectId: "seven-days-scheduler",
  storageBucket: "seven-days-scheduler.firebasestorage.app",
  messagingSenderId: "50089000337",
  appId: "1:50089000337:web:abd31751d232c1e1a92e30",
  measurementId: "G-G2VQ0LTQJ7"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

console.log("Firebase connected!");

export { app };