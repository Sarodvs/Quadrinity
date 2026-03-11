import React, { createContext, useContext, useEffect, useState } from 'react';
import authService from '../services/authService';

interface User {
    id: string;
    email?: string;
    phoneNumber?: string;
    displayName?: string;
}

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    loading: false,
    isAuthenticated: false,
    login: async () => ({ success: false }),
    register: async () => ({ success: false }),
    logout: async () => {},
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Initialize auth state
        // In a real app, you would check if user is logged in from storage
        setLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        setLoading(true);
        try {
            const result = await authService.loginWithEmail(email, password);
            if (result.success && result.user) {
                setCurrentUser({ id: result.user.id, email: result.user.email, displayName: result.user.displayName });
                return { success: true };
            }
            return { success: false, error: result.error };
        } finally {
            setLoading(false);
        }
    };

    const register = async (email: string, password: string) => {
        setLoading(true);
        try {
            const result = await authService.registerUser({ email, password });
            if (result.success) {
                // after registration we can sign in immediately
                const loginResult = await authService.loginWithEmail(email, password);
                if (loginResult.success && loginResult.user) {
                    setCurrentUser({ id: loginResult.user.id, email: loginResult.user.email, displayName: loginResult.user.displayName });
                }
                return { success: true };
            }
            return { success: false, error: result.error };
        } finally {
            setLoading(false);
        }
    };

    const logout = async () => {
        setLoading(true);
        try {
            await authService.logout();
            setCurrentUser(null);
        } finally {
            setLoading(false);
        }
    };

    const value: AuthContextType = {
        currentUser,
        loading,
        isAuthenticated: currentUser !== null,
        login,
        register,
        logout,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
