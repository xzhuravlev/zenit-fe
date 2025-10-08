import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api/axios';

export type Role = 'ADMIN' | 'MODERATOR' | 'USER';
export interface Me {
    id: number;
    username: string;
    email: string;
    role: Role;
    verified: boolean;
    avatar: string;
}

type AuthState = {
    user: Me | null;
    loading: boolean;
    refreshMe: () => Promise<void>;
    logoutLocally: () => void; // на всякий случай
};

const AuthCtx = createContext<AuthState | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();
    const [user, setUser] = useState<Me | null>(null);
    const [loading, setLoading] = useState(false);

    const shouldFetchOnPath = useMemo(() => {
        const p = location.pathname.toLowerCase();
        return !(p.startsWith('/signin') || p.startsWith('/signup'));
    }, [location.pathname]);

    const refreshMe = async () => {
        if (!shouldFetchOnPath) {
            setUser(null);
            return;
        }
        setLoading(true);
        try {
            const { data } = await api.get<Me>('/auth/me');
            setUser(data);
        } catch {
            // 401/403 перехватит интерцептор (в крайнем случае редиректнёт на /signin)
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const logoutLocally = () => {
        localStorage.removeItem('access_token');
        setUser(null);
    };

    // 1) первичная загрузка и при смене маршрута
    useEffect(() => {
        refreshMe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shouldFetchOnPath]);

    // 2) реагируем на кастомное событие из логина/логаута
    useEffect(() => {
        const onAuthChanged = () => refreshMe();
        window.addEventListener('auth:changed', onAuthChanged);
        return () => window.removeEventListener('auth:changed', onAuthChanged);
    }, []);

    // 3) если access_token удалили в другой вкладке
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === 'access_token') refreshMe();
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    return (
        <AuthCtx.Provider value={{ user, loading, refreshMe, logoutLocally }}>
            {children}
        </AuthCtx.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthCtx);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};
