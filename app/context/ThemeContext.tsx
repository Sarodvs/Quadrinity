import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/Colors';

type ThemeType = 'light' | 'dark';

interface ThemeContextType {
    theme: ThemeType;
    isDark: boolean;
    colors: typeof Colors.light;
    toggleTheme: () => void;
    setTheme: (theme: ThemeType) => void;
}

export const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    isDark: true,
    colors: Colors.dark,
    toggleTheme: () => {},
    setTheme: () => {},
});

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<ThemeType>('dark'); // Default to dark for Haritham

    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('app_theme');
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setThemeState(savedTheme);
            }
        } catch (error) {
            console.error('Failed to load theme', error);
        }
    };

    const setTheme = async (newTheme: ThemeType) => {
        setThemeState(newTheme);
        try {
            await AsyncStorage.setItem('app_theme', newTheme);
        } catch (error) {
            console.error('Failed to save theme', error);
        }
    };

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    const isDark = theme === 'dark';
    const colors = isDark ? Colors.dark : Colors.light;

    return (
        <ThemeContext.Provider value={{ theme, isDark, colors, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
