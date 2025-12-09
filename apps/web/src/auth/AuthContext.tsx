import { createContext, useContext, useEffect, useState, type ReactNode, } from "react";
import type { Athlete, User } from "../api/client";
import { getMe, login as apiLogin, register as apiRegister, setToken } from "../api/client";

interface AuthState {
    user: User | null;
    athlete: Athlete | null;
    loading: boolean;
}

interface AuthContextValue extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [athlete, setAthlete] = useState<Athlete | null>(null);
    const [loading, setLoading] = useState(true);

    // Check token on first load
    useEffect(() => {
        async function init() {
            try {
                const token = 
                typeof window !== "undefined"
                ? window.localStorage.getItem("token")
                : null;
            if (!token) {
                setLoading(false);
                return;
            }

            const me = await getMe();
            setUser(me.user);
            setAthlete(me.athlete);
        } catch (err) {
            console.error("Failed to init auth:", err);
            setToken(null);
        } finally {
            setLoading(false);
        }
    }

    void init();
}, []);

async function handleLogin(email: string, password: string) {
    const data = await apiLogin(email, password);
    setUser(data.user);
    setAthlete(data.athlete);
}

async function handleRegister(email: string, password: string, name: string) {
    const data = await apiRegister(email, password, name);
    setUser(data.user);
    setAthlete(data.athlete);
}

function logout() {
    setToken(null);
    setUser(null);
    setAthlete(null);
}

const value: AuthContextValue = {
    user,
    athlete,
    loading,
    login: handleLogin,
    register: handleRegister,
    logout,
};

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error("useAuth must be used within AuthProvier");
    }
    return ctx;
}
