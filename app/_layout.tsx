import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from "react";

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/app/context/AuthContext';

export const unstable_settings = {
  anchor: 'login',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

 
  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          initialRouteName="login"
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#000000' }
          }}
        >
          <Stack.Screen name="login" />
          <Stack.Screen
            name="modal"
            options={{
              presentation: 'modal',
              title: 'Modal',
              headerShown: true
            }}
          />
          <Stack.Screen name="verify-otp" />
          <Stack.Screen name="official-verify-otp" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="home" />
          <Stack.Screen name="official-dashboard" />
        </Stack>

        <StatusBar style="light" backgroundColor="#000000" />
      </ThemeProvider>
    </AuthProvider>
  );
}
