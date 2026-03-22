import authService from '@/services/authService';
import React, { createContext, useContext, useEffect, useState } from 'react';

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
    loginOfficial: (userId: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    verifyOTPAndLogin?: (verificationId: string, otpCode: string, officialId: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    loading: false,
    isAuthenticated: false,
    login: async () => ({ success: false }),
    loginOfficial: async () => ({ success: false }),
    register: async () => ({ success: false }),
    logout: async () => {},
    verifyOTPAndLogin: async () => ({ success: false }),
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
            const result = await authService.loginWithEmailAndPassword(email, password);
            if (result.success && result.user) {
                setCurrentUser({
                    id: result.user.id,
                    email: result.user.email,
                    displayName: result.user.displayName,
                });
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
            const result = await authService.registerWithEmailAndPassword({ email, password });
            if (result.success && result.user) {
                setCurrentUser({
                    id: result.user.id,
                    email: result.user.email,
                    displayName: result.user.displayName,
                });
                return { success: true };
            }
            return { success: false, error: result.error };
        } finally {
            setLoading(false);
        }
    };

    const loginOfficial = async (userId: string, password: string) => {
        setLoading(true);
        try {
            const result = await authService.loginOfficialWithCredentials(userId, password);
            if (result.success && result.user) {
                setCurrentUser({
                    id: result.user.id,
                    email: result.user.email,
                    displayName: result.user.displayName,
                });
                return { success: true };
            }
            return { success: false, error: result.error };
        } finally {
            setLoading(false);
        }
    };

    const verifyOTPAndLogin = async (verificationId: string, otpCode: string, officialId: string) => {
        setLoading(true);
        try {
            const result = await authService.verifyOTP(verificationId, otpCode);
            if (result.success) {
                setCurrentUser({
                    id: officialId || 'mock-official-id',
                    displayName: 'Official User',
                });
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
        loginOfficial,
        register,
        logout,
        verifyOTPAndLogin,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
