import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/context/AuthContext';

export default function Index() {
    const { currentUser, isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0b1120',
                }}
            >
                <ActivityIndicator size="large" color="#00c853" />
            </View>
        );
    }

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    if (currentUser?.role === 'official') {
        return <Redirect href="/official-dashboard" />;
    }

    return <Redirect href="/home" />;
}