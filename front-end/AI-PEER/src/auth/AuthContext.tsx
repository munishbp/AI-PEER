import {createContext, useContext, useEffect, useState} from "react";
import {User, signOut, signInWithCustomToken, onAuthStateChanged} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // On mount: try to restore session from refresh token in AsyncStorage
    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            console.log('[Auth] Checking AsyncStorage for refresh token...');
            try {
                const refreshToken = await AsyncStorage.getItem("refreshToken");

                if (!refreshToken) {
                    console.log('[Auth] No refresh token found, showing login screen');
                    if (!cancelled) setLoading(false);
                    return;
                }

                console.log('[Auth] Found refresh token, calling /auth/refresh...');
                const res = await api.refresh(refreshToken);

                console.log('[Auth] Got fresh custom token, signing into Firebase...');
                const cred = await signInWithCustomToken(auth, res.customToken);

                if (!cancelled) {
                    const idToken = await cred.user.getIdToken();
                    setUser(cred.user);
                    setToken(idToken);
                    console.log('[Auth] Session restored successfully');
                }
            } catch (e: any) {
                console.log('[Auth] Refresh failed:', e.message || e);
                // Token expired or invalid — clear it
                await AsyncStorage.removeItem("refreshToken");
                if (!cancelled) {
                    setUser(null);
                    setToken(null);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        restoreSession();

        // Also listen for ongoing auth changes (e.g. sign out)
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                const idToken = await firebaseUser.getIdToken();
                setToken(idToken);
            } else {
                setUser(null);
                setToken(null);
            }
        });

        return () => {
            cancelled = true;
            unsubscribe();
        };
    }, []);

    const login = async (phone: string, password: string): Promise<void> => {
        const response = await api.login(phone, password);
        await signInWithCustomToken(auth, response.customToken);
    };

    const register = async (phone: string, password: string): Promise<{ userId: string }> => {
        const response = await api.createAccount(phone, password);
        return { userId: response.userId };
    };

    const logout = async (): Promise<void> => {
        console.log('[Auth] Logging out, clearing refresh token...');
        await AsyncStorage.removeItem("refreshToken");
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
