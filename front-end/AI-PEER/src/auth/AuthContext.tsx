import {createContext, useContext, useEffect, useState} from "react";
import {User, signOut, signInWithCustomToken, onAuthStateChanged} from "firebase/auth";
import {auth} from '../firebaseClient';
import {api} from '../api';

type AuthContextType = {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (phone: string, password: string) => Promise<void>;
    register: (phone: string, password: string) => Promise<{ userId: string }>;
    logout: () => Promise<void>;
};

// 2. Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// 3. Create the provider component
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Listen for auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                // User is signed in - get their ID token for API calls
                const idToken = await firebaseUser.getIdToken();
                setToken(idToken);
            } else {
                // User is signed out
                setToken(null);
            }

            setLoading(false);
        });

        // Cleanup: unsubscribe when component unmounts
        return () => unsubscribe();
    }, []);
    // calls backend to verify credentials, then signs into firebase with the token we get back
    const login = async (phone: string, password: string): Promise<void> => {
        // step 1: call our backend - it checks the password and gives us a custom token
        const response = await api.login(phone, password);

        // step 2: use that token to sign into firebase
        // this will trigger onAuthStateChanged above, which sets user and token automatically
        await signInWithCustomToken(auth, response.customToken);
    };

    // calls backend to create new user in firestore - does NOT log them in
    const register = async (phone: string, password: string): Promise<{ userId: string }> => {
        // just calls the backend - firebase isn't involved here
        // user will need to call login() after this
        const response = await api.createAccount(phone, password);
        return { userId: response.userId };
    };

    // signs out of firebase - clears the user session
    const logout = async (): Promise<void> => {
        // this triggers onAuthStateChanged, which will set user and token to null
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

// 4. Create the hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
