import { useAuth } from '@/context/AuthContext';
import { auth as firebaseAuth } from '@/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface HistoryOrder {
    id: string;
    residentName: string;
    address: string;
    type: string;
    time: string;
    date: string;
    status: string;
    completedAt: number;
    updatedAt: number;
}

export default function OfficialHistoryScreen() {
    const { currentUser } = useAuth();
    const router = useRouter();
    const [historyOrders, setHistoryOrders] = useState<HistoryOrder[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);

    useEffect(() => {
        const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!userId) {
            setHistoryOrders([]);
            setIsHistoryLoading(false);
            return;
        }

        const firestore = getFirestore();
        const historyQuery = query(collection(firestore, 'orders'), where('assignedOfficialId', '==', userId));

        const unsubscribe = onSnapshot(
            historyQuery,
            (snapshot) => {
                const completed = snapshot.docs
                    .map((orderDoc) => {
                        const orderData = orderDoc.data() as any;
                        return {
                            id: orderDoc.id,
                            residentName: orderData.residentName || 'Resident',
                            address: orderData.address || 'Address not provided',
                            status: orderData.status || 'Scheduled',
                            type: orderData.type || 'Scrap/Recyclable Waste',
                            time: orderData.time || 'Time not provided',
                            date: orderData.date || 'Date not provided',
                            completedAt: orderData.completedAt || 0,
                            updatedAt: orderData.updatedAt || 0,
                        };
                    })
                    .filter((order) => String(order.status || '').toLowerCase() === 'completed')
                    .sort((a, b) => (b.completedAt || b.updatedAt || 0) - (a.completedAt || a.updatedAt || 0));

                setHistoryOrders(completed);
                setIsHistoryLoading(false);
            },
            () => {
                setIsHistoryLoading(false);
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                locations={[0, 0.5, 1]}
                style={styles.header}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <MaterialCommunityIcons name="arrow-left" size={22} color="#d0d8e4" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Pickup History</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <Text style={styles.headerSubtitle}>{historyOrders.length} completed pickups</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {isHistoryLoading && (
                    <View style={styles.emptyState}>
                        <ActivityIndicator size="small" color="#00c853" />
                        <Text style={styles.emptyText}>Loading history...</Text>
                    </View>
                )}

                {!isHistoryLoading && historyOrders.length === 0 && (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="history" size={28} color="#7b8a9e" />
                        <Text style={styles.emptyText}>No completed pickups yet.</Text>
                    </View>
                )}

                {historyOrders.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardTitle}>{item.residentName}</Text>
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusText}>Completed</Text>
                            </View>
                        </View>

                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#7b8a9e" />
                            <Text style={styles.detailText}>{item.date}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="clock-outline" size={16} color="#7b8a9e" />
                            <Text style={styles.detailText}>{item.time}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="map-marker-outline" size={16} color="#7b8a9e" />
                            <Text style={styles.detailText}>{item.address}</Text>
                        </View>
                        <View style={styles.detailRow}>
                            <MaterialCommunityIcons name="recycle" size={16} color="#7b8a9e" />
                            <Text style={styles.detailText}>{item.type}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0b1120' },
    header: {
        paddingTop: 18,
        paddingBottom: 18,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2a3c4f',
    },
    headerTitle: {
        fontSize: 21,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerSpacer: {
        width: 36,
    },
    headerSubtitle: {
        marginTop: 8,
        textAlign: 'center',
        color: '#7b8a9e',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 50,
    },
    emptyState: {
        borderWidth: 1,
        borderColor: '#1e3325',
        borderRadius: 12,
        backgroundColor: '#0c1e14',
        paddingVertical: 20,
        alignItems: 'center',
        gap: 10,
    },
    emptyText: {
        color: '#7b8a9e',
        fontSize: 14,
    },
    card: {
        backgroundColor: '#0c1e14',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1e3325',
        marginBottom: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statusBadge: {
        backgroundColor: 'rgba(0,200,83,0.15)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    statusText: {
        color: '#00c853',
        fontSize: 12,
        fontWeight: '600',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        marginLeft: 8,
        color: '#b0b8c8',
        fontSize: 14,
    },
});
