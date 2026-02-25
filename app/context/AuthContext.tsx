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
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    loading: false,
    isAuthenticated: false,
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

    const value: AuthContextType = {
        currentUser,
        loading,
        isAuthenticated: currentUser !== null,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;
