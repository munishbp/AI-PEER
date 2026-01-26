import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyAxp17YFsqRsejIUWB6MSzUSAqAuBHfy_E",
    authDomain: "research-ai-peer-dev.firebaseapp.com",
    projectId: "research-ai-peer-dev",
    storageBucket: "research-ai-peer-dev.firebasestorage.app",
    messagingSenderId: "596437694331",
    appId: "1:596437694331:web:2ccc9ddd458d1f159eafde"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };