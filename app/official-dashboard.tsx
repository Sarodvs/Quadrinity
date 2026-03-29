import { useAuth } from '@/context/AuthContext';
import { auth as firebaseAuth } from '@/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, getFirestore, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { id: 'availability', label: 'Availability', icon: 'calendar-month-outline', iconActive: 'calendar-month' },
    { id: 'schedule', label: 'Schedule', icon: 'clipboard-text-outline', iconActive: 'clipboard-text' },
    { id: 'settings', label: 'Settings', icon: 'cog-outline', iconActive: 'cog' },
];

const toDateKey = (value: Date) => value.toISOString().split('T')[0];

const parseDateKey = (dateValue: string | undefined) => {
    if (!dateValue) return '';

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
    }

    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    return toDateKey(parsed);
};

const getWeekKey = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

const parseTimeStringToMinutes = (timeStr: string) => {
    if (!timeStr || timeStr === 'Time not provided' || timeStr === '-') return 0;
    
    // Handle "HH:MM AM/PM" or "HH:MM AM/PM - HH:MM AM/PM"
    const startTimePart = timeStr.split('-')[0].trim();
    const match = startTimePart.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return 0;

    let [_, hours, minutes, period] = match;
    let h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);

    if (period.toUpperCase() === 'PM' && h < 12) h += 12;
    if (period.toUpperCase() === 'AM' && h === 12) h = 0;

    return h * 60 + m;
};

interface PlannedCollection {
    id: string;
    residentName: string;
    address: string;
    status: string;
    type: string;
    time: string;
    date: string;
    dateKey: string;
    paymentStatus?: string;
}

const parseWeightKg = (weight: string | number | undefined) => {
    if (typeof weight === 'number') return weight;
    if (!weight) return 0;
    const numericValue = parseFloat(String(weight).replace(/[^0-9.]/g, ''));
    return Number.isNaN(numericValue) ? 0 : numericValue;
};

export default function OfficialDashboardScreen() {
    const [activeTab, setActiveTab] = useState('home');
    const { currentUser, logout } = useAuth();
    const router = useRouter();

    // Scanner State
    const [isScannerVisible, setIsScannerVisible] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();

    const openScanner = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert("Permission Required", "Camera access is needed to scan QR codes.");
                return;
            }
        }
        setIsScannerVisible(true);
    };

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        setIsScannerVisible(false);
        Alert.alert('QR Scanned', `Scanned data: ${data}`);
    };

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/login');
        } catch {
            Alert.alert('Error', 'Unable to logout right now. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <View style={styles.container}>

                {activeTab === 'home' && <HomeContent currentUser={currentUser} onLogout={handleLogout} onScanQR={openScanner} />}
                {activeTab === 'availability' && <AvailabilityContent currentUser={currentUser} />}
                {activeTab === 'schedule' && <ScheduleContent currentUser={currentUser} onScanQR={openScanner} />}
                {activeTab === 'settings' && <SettingsContent currentUser={currentUser} onOpenHistory={() => router.push('/official-history' as any)} />}

                {/* QR Scanner Modal */}
                <Modal visible={isScannerVisible} transparent animationType="slide" onRequestClose={() => setIsScannerVisible(false)}>
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
                        {isScannerVisible && (
                            <CameraView
                                style={StyleSheet.absoluteFill}
                                facing="back"
                                onBarcodeScanned={handleBarcodeScanned}
                                barcodeScannerSettings={{
                                    barcodeTypes: ['qr'],
                                }}
                            />
                        )}
                        <SafeAreaView style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 20 }}>
                                <TouchableOpacity onPress={() => setIsScannerVisible(false)} style={styles.scannerCloseButton}>
                                    <MaterialCommunityIcons name="close" size={28} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.scannerOverlay}>
                                <View style={styles.scannerTargetArea} />
                                <Text style={styles.scannerText}>Align QR code within the frame</Text>
                            </View>
                        </SafeAreaView>
                    </View>
                </Modal>

                {/* Bottom Navigation */}
                <View style={styles.bottomNav}>
                    {NAV_ITEMS.map((item) => {
                        const isActive = activeTab === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                onPress={() => handleTabChange(item.id)}
                                style={styles.navItem}
                            >
                                <View style={[styles.navIconContainer, isActive && styles.navIconActive]}>
                                    <LinearGradient
                                        colors={isActive ? ['rgba(0,200,83,0.22)', 'rgba(0,200,83,0.08)'] : ['transparent', 'transparent']}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                    <MaterialCommunityIcons
                                        name={isActive ? (item.iconActive as any) : (item.icon as any)}
                                        size={24}
                                        color={isActive ? '#00c853' : '#3e5068'}
                                    />
                                </View>
                                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </SafeAreaView>
    );
}

// --- Home Content ---
const HomeContent = ({ currentUser, onLogout, onScanQR }: any) => {
    const [isDutyActive, setIsDutyActive] = useState(false);
    const [loadingDuty, setLoadingDuty] = useState(false);
    const [stats, setStats] = useState({ pending: 0, completed: 0, collected: '0.00 kg' });
    const [pendingAddresses, setPendingAddresses] = useState<string[]>([]);

    useEffect(() => {
        const fetchDutyStatus = async () => {
            const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
            if (!userId) return;
            try {
                const firestore = getFirestore();
                const userRef = doc(firestore, 'officials', userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    setIsDutyActive(userSnap.data().isDutyActive || false);
                }
            } catch (error) {
                console.error('Error fetching duty status', error);
            }
        };
        fetchDutyStatus();
    }, [currentUser]);

    useEffect(() => {
        const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!userId) {
            setStats({ pending: 0, completed: 0, collected: '0.00 kg' });
            return;
        }

        const firestore = getFirestore();
        const assignedOrdersQuery = query(collection(firestore, 'orders'), where('assignedOfficialId', '==', userId));

        const unsubscribe = onSnapshot(assignedOrdersQuery, (snapshot) => {
            let pendingCount = 0;
            let completedCount = 0;
            let totalCollectedKg = 0;
            const addresses: string[] = [];

            snapshot.docs.forEach((orderDoc) => {
                const data = orderDoc.data() as any;
                const status = String(data.status || '').toLowerCase();
                if (status === 'scheduled' || status === 'pending') {
                    pendingCount += 1;
                    if (data.address) {
                        addresses.push(data.address);
                    }
                }
                if (status === 'completed') {
                    completedCount += 1;
                    totalCollectedKg += parseWeightKg(data.weight);
                }
            });

            setStats({
                pending: pendingCount,
                completed: completedCount,
                collected: `${totalCollectedKg.toFixed(2)} kg`,
            });
            setPendingAddresses(addresses);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const toggleDutyStatus = async (value: boolean) => {
        const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!userId) {
            Alert.alert('Error', 'User not authenticated.');
            return;
        }
        setLoadingDuty(true);
        setIsDutyActive(value);
        try {
            const firestore = getFirestore();
            const userRef = doc(firestore, 'officials', userId);
            await setDoc(userRef, { isDutyActive: value, userId, updatedAt: Date.now() }, { merge: true });
        } catch (error) {
            setIsDutyActive(!value); // Revert on failure
            Alert.alert('Error', 'Failed to update duty status.');
        } finally {
            setLoadingDuty(false);
        }
    };

    const handleScanQR = () => {
        onScanQR();
    };

    const handleNavigateAll = () => {
        if (pendingAddresses.length === 0) {
            Alert.alert('No Pickups', 'There are no pending pickups to navigate to.');
            return;
        }

        const destination = pendingAddresses[pendingAddresses.length - 1];
        const waypointsList = pendingAddresses.slice(0, -1);
        
        let url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
        
        if (waypointsList.length > 0) {
            // Using optimize:true to find the shortest path between waypoints
            const waypointsStr = `optimize:true|${waypointsList.join('|')}`;
            url += `&waypoints=${encodeURIComponent(waypointsStr)}`;
        }

        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open Google Maps.');
        });
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header / Profile Overview */}
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                locations={[0, 0.5, 1]}
                style={[styles.headerGradient, { paddingBottom: 30, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <View style={styles.headerTopRow}>
                    <Text style={styles.headerTitle}>Official Dashboard</Text>
                    <TouchableOpacity onPress={onLogout}>
                        <MaterialCommunityIcons name="logout" size={24} color="#d0d8e4" />
                    </TouchableOpacity>
                </View>

                <View style={styles.profileRow}>
                    <View style={styles.profileAvatar}>
                        <Text style={styles.profileAvatarText}>{currentUser?.displayName?.charAt(0) || 'O'}</Text>
                    </View>
                    <View style={styles.profileInfo}>
                        <Text style={styles.profileName}>{currentUser?.displayName || 'Official User'}</Text>
                        <Text style={styles.profileRole}>ID: {currentUser?.id?.substring(0, 8) || 'N/A'}</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.contentSection}>
                {/* Duty Status */}
                <View style={styles.dutyCard}>
                    <View>
                        <Text style={styles.cardTitle}>Duty Status</Text>
                        <Text style={styles.cardSubtitle}>{isDutyActive ? 'You are active & visible' : 'You are offline'}</Text>
                    </View>
                    <Switch
                        value={isDutyActive}
                        onValueChange={toggleDutyStatus}
                        trackColor={{ false: '#263345', true: '#00c853' }}
                        thumbColor={'#ffffff'}
                        disabled={loadingDuty}
                    />
                </View>

                {/* Quick Actions */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Quick Actions</Text>
                <View style={styles.quickActionsContainer}>
                    <TouchableOpacity activeOpacity={0.8} style={styles.quickActionCard} onPress={handleScanQR}>
                        <LinearGradient colors={['rgba(0,200,83,0.15)', 'rgba(0,200,83,0.05)']} style={styles.iconGradientLg}>
                            <MaterialCommunityIcons name="qrcode-scan" size={32} color="#00c853" />
                        </LinearGradient>
                        <Text style={styles.quickActionText}>Scan QR</Text>
                    </TouchableOpacity>

                    <TouchableOpacity activeOpacity={0.8} style={styles.quickActionCard} onPress={handleNavigateAll}>
                        <LinearGradient colors={['rgba(0,200,83,0.15)', 'rgba(0,200,83,0.05)']} style={styles.iconGradientLg}>
                            <MaterialCommunityIcons name="map-marker-path" size={32} color="#00c853" />
                        </LinearGradient>
                        <Text style={styles.quickActionText}>Navigate</Text>
                    </TouchableOpacity>
                </View>

                {/* Overview Stats */}
                <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Overview (Today)</Text>
                <View style={styles.statsContainer}>
                    <LinearGradient colors={['#0f2d1a', '#0c1e14', '#0b1518']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
                        <Text style={styles.statValue}>{stats.pending}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#0f2d1a', '#0c1e14', '#0b1518']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statCard}>
                        <Text style={[styles.statValue, { color: '#00c853' }]}>{stats.completed}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#0f2d1a', '#0c1e14', '#0b1518']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.statCard, { width: '100%', marginTop: 12 }]}>
                        <Text style={[styles.statValue, { color: '#ffb300' }]}>{stats.collected}</Text>
                        <Text style={styles.statLabel}>Total Collected Weight</Text>
                    </LinearGradient>
                </View>
            </View>
        </ScrollView>
    );
};

// --- Availability Content ---
const AvailabilityContent = ({ currentUser }: any) => {
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [activeMonthDate, setActiveMonthDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [isSaving, setIsSaving] = useState(false);


    const monthKey = `${activeMonthDate.getFullYear()}-${String(activeMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const [commonPoint, setCommonPoint] = useState('');
    const [isSavingPoint, setIsSavingPoint] = useState(false);
    const currentWeekKey = getWeekKey();

    const generateMonthDays = () => {
        const year = activeMonthDate.getFullYear();
        const month = activeMonthDate.getMonth();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const values = [];

        for (let day = 1; day <= totalDays; day++) {
            const dateValue = new Date(year, month, day);
            values.push({
                dateString: toDateKey(dateValue),
                dayName: dateValue.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: day,
            });
        }

        return values;
    };

    const monthDays = generateMonthDays();
    const balanceDays = monthDays.length - selectedDays.length;

    useEffect(() => {
        const fetchAvailability = async () => {
            const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
            if (!userId) return;
            try {
                const firestore = getFirestore();
                const officialRef = doc(firestore, 'officials', userId);
                const officialSnap = await getDoc(officialRef);
                const data = officialSnap.data();
                
                const monthAvailability = data?.availabilityByMonth?.[monthKey] || [];
                setSelectedDays(Array.isArray(monthAvailability) ? monthAvailability : []);
                
                const weeklyPoints = data?.commonPoints || {};
                setCommonPoint(weeklyPoints[currentWeekKey] || '');
            } catch (error) {
                console.error('Error fetching availability', error);
            }
        };

        fetchAvailability();
    }, [currentUser, monthKey, currentWeekKey]);

    const moveMonth = (offset: number) => {
        setActiveMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const toggleDay = (dateString: string) => {
        if (selectedDays.includes(dateString)) {
            setSelectedDays(selectedDays.filter((d) => d !== dateString));
        } else {
            setSelectedDays([...selectedDays, dateString]);
        }
    };

    const saveAvailability = async () => {
        const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!userId) return;
        setIsSaving(true);
        try {
            const firestore = getFirestore();
            const officialRef = doc(firestore, 'officials', userId);
            await setDoc(
                officialRef,
                {
                    userId,
                    availabilityByMonth: {
                        [monthKey]: selectedDays,
                    },
                    updatedAt: Date.now(),
                },
                { merge: true }
            );
            Alert.alert('Success', 'Availability updated successfully.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save availability.');
        } finally {
            setIsSaving(false);
        }
    };

    const saveCommonPoint = async () => {
        const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!userId) return;
        if (!commonPoint.trim()) {
            Alert.alert('Error', 'Please enter a collection point.');
            return;
        }
        setIsSavingPoint(true);
        try {
            const firestore = getFirestore();
            const officialRef = doc(firestore, 'officials', userId);
            await setDoc(
                officialRef,
                {
                    commonPoints: {
                        [currentWeekKey]: commonPoint,
                    },
                    updatedAt: Date.now(),
                },
                { merge: true }
            );
            Alert.alert('Success', 'Weekly collection point updated.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save collection point.');
        } finally {
            setIsSavingPoint(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                locations={[0, 0.5, 1]}
                style={[styles.headerGradient, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <Text style={[styles.headerTitle, { alignSelf: 'center' }]}>My Availability</Text>
                <Text style={styles.headerSubtitle}>Manage weekly collection points & availability</Text>
            </LinearGradient>

            <View style={styles.contentSection}>
                {/* Weekly Collection Point Input */}
                <View style={[styles.dutyCard, { marginBottom: 24, flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <MaterialCommunityIcons name="map-marker-radius" size={24} color="#00c853" />
                        <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Weekly Collection Point</Text>
                    </View>
                    <Text style={[styles.cardSubtitle, { marginBottom: 12 }]}>Current Week: {currentWeekKey}</Text>
                    <TextInput
                        style={[styles.input, { width: '100%', backgroundColor: '#1a2634', marginBottom: 16 }]}
                        placeholder="Enter common point (e.g. Main Square)"
                        placeholderTextColor="#7A8A99"
                        value={commonPoint}
                        onChangeText={setCommonPoint}
                    />
                    <TouchableOpacity 
                        onPress={saveCommonPoint} 
                        style={[styles.smallActionButton, { alignSelf: 'flex-end', paddingHorizontal: 20 }]}
                        disabled={isSavingPoint}
                    >
                        {isSavingPoint ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.actionButtonText}>Update Point</Text>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.monthHeaderRow}>
                    <TouchableOpacity style={styles.monthNavButton} onPress={() => moveMonth(-1)}>
                        <MaterialCommunityIcons name="chevron-left" size={20} color="#00c853" />
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>{activeMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                    <TouchableOpacity style={styles.monthNavButton} onPress={() => moveMonth(1)}>
                        <MaterialCommunityIcons name="chevron-right" size={20} color="#00c853" />
                    </TouchableOpacity>
                </View>

                <View style={styles.monthSummaryRow}>
                    <View style={styles.monthSummaryCard}>
                        <Text style={styles.monthSummaryLabel}>Selected Dates</Text>
                        <Text style={styles.monthSummaryValue}>{selectedDays.length}</Text>
                    </View>
                    <View style={styles.monthSummaryCard}>
                        <Text style={styles.monthSummaryLabel}>Balance This Month</Text>
                        <Text style={styles.monthSummaryValue}>{balanceDays}</Text>
                    </View>
                </View>

                <View style={styles.calendarGrid}>
                    {monthDays.map((day, idx) => {
                        const isSelected = selectedDays.includes(day.dateString);
                        return (
                            <TouchableOpacity
                                key={idx}
                                activeOpacity={0.8}
                                onPress={() => toggleDay(day.dateString)}
                                style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
                            >
                                <Text style={[styles.calDayName, isSelected && styles.calTextSelected]}>{day.dayName}</Text>
                                <Text style={[styles.calDayNumber, isSelected && styles.calTextSelected]}>{day.dayNumber}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity onPress={saveAvailability} activeOpacity={0.8} disabled={isSaving}>
                    <LinearGradient
                        colors={isSaving ? ['#16362a', '#0e2419'] : ['#00c853', '#1b8a2a']}
                        style={styles.actionButton}
                    >
                        {isSaving ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                            <Text style={styles.actionButtonText}>Save Availability</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

// --- Schedule Content ---
const ScheduleContent = ({ currentUser, onScanQR }: any) => {
    const [scheduleMonthDate, setScheduleMonthDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [plannedCollections, setPlannedCollections] = useState<PlannedCollection[]>([]);
    const [availableDaysInMonth, setAvailableDaysInMonth] = useState<string[]>([]);
    const [isScheduleLoading, setIsScheduleLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<any>(null);
    const [wasteQuantity, setWasteQuantity] = useState('');
    const [selectedWasteType, setSelectedWasteType] = useState('Scrap/Recyclable');
    const [isCompleting, setIsCompleting] = useState(false);

    const scheduleMonthKey = `${scheduleMonthDate.getFullYear()}-${String(scheduleMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const moveScheduleMonth = (offset: number) => {
        setScheduleMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    };

    const getMiniCalendarDays = () => {
        const year = scheduleMonthDate.getFullYear();
        const month = scheduleMonthDate.getMonth();
        const firstWeekday = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const cells: Array<number | null> = [];

        for (let i = 0; i < firstWeekday; i++) {
            cells.push(null);
        }
        for (let day = 1; day <= totalDays; day++) {
            cells.push(day);
        }

        return cells;
    };

    const appointmentDaySet = new Set(
        plannedCollections.map((item) => Number(item.dateKey.slice(8, 10))).filter((value) => !Number.isNaN(value))
    );
    const availableDaySet = new Set(
        availableDaysInMonth.map((value) => Number(value.slice(8, 10))).filter((day) => !Number.isNaN(day))
    );
    const miniCalendarCells = getMiniCalendarDays();

    useEffect(() => {
        const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!userId) {
            setIsScheduleLoading(false);
            setPlannedCollections([]);
            return;
        }

        const firestore = getFirestore();
        const officialRef = doc(firestore, 'officials', userId);
        const ordersRef = query(collection(firestore, 'orders'), where('assignedOfficialId', '==', userId));

        const unsubscribe = onSnapshot(
            ordersRef,
            async (ordersSnap) => {
                try {
                    const officialSnap = await getDoc(officialRef);
                    const availabilityByMonth = officialSnap.data()?.availabilityByMonth || {};
                    const availableDateKeysForMonth = availabilityByMonth[scheduleMonthKey] || [];
                    const availableDateSet = new Set(
                        Array.isArray(availableDateKeysForMonth) ? availableDateKeysForMonth : []
                    );

                    setAvailableDaysInMonth(Array.from(availableDateSet));

                    const mappedCollections: PlannedCollection[] = ordersSnap.docs
                        .map((orderDoc) => {
                            const orderData = orderDoc.data() as any;
                            const dateKey = parseDateKey(orderData.dateKey || orderData.date);
                            return {
                                id: orderDoc.id,
                                residentName: orderData.residentName || 'Resident',
                                address: orderData.address || 'Address not provided',
                                status: orderData.status || 'Scheduled',
                                type: orderData.type || 'Scrap/Recyclable Waste',
                                time: orderData.time || 'Time not provided',
                                date: orderData.date || (dateKey ? new Date(dateKey).toLocaleDateString() : 'Date not provided'),
                                dateKey,
                                paymentStatus: orderData.paymentStatus,
                            };
                        })
                        .filter((order) => {
                            const activeStatus = (order.status || '').toLowerCase();
                            return (
                                (activeStatus === 'scheduled' || activeStatus === 'pending') &&
                                !!order.dateKey &&
                                order.dateKey.startsWith(scheduleMonthKey) &&
                                availableDateSet.has(order.dateKey)
                            );
                        })
                        .sort((a, b) => {
                            // Primary sort: Date
                            const dateComparison = a.dateKey.localeCompare(b.dateKey);
                            if (dateComparison !== 0) return dateComparison;

                            // Secondary sort: Time
                            return parseTimeStringToMinutes(a.time) - parseTimeStringToMinutes(b.time);
                        });

                    setPlannedCollections(mappedCollections);
                } finally {
                    setIsScheduleLoading(false);
                }
            },
            () => {
                setIsScheduleLoading(false);
                Alert.alert('Error', 'Unable to load schedule right now.');
            }
        );

        return () => unsubscribe();
    }, [currentUser, scheduleMonthKey]);

    const handleNavigate = (address: string) => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open Google Maps.');
        });
    };

    const handleCollectWaste = (collectionItem: PlannedCollection) => {
        setSelectedCollection(collectionItem);
        setSelectedWasteType(collectionItem.type);
        setWasteQuantity('');
        // Remove manual toggle, we use the order's paymentStatus
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setSelectedCollection(null);
    };

    const completeAndPay = async () => {
        if (!wasteQuantity) {
            Alert.alert('Error', 'Please enter waste quantity');
            return;
        }

        if (selectedCollection?.paymentStatus !== 'Paid') {
            Alert.alert('Payment Required', 'The resident must complete the payment before this collection can be marked as completed.');
            return;
        }

        if (!selectedCollection?.id) {
            Alert.alert('Error', 'Unable to identify this collection record.');
            return;
        }

        const completedBy = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!completedBy) {
            Alert.alert('Error', 'Official user is not authenticated.');
            return;
        }

        setIsCompleting(true);
        try {
            const firestore = getFirestore();
            await updateDoc(doc(firestore, 'orders', selectedCollection.id), {
                status: 'Completed',
                type: selectedWasteType,
                weight: `${wasteQuantity} kg`,
                completedAt: Date.now(),
                completedBy,
                updatedAt: Date.now(),
            });

            Alert.alert('Success', `Collection from ${selectedCollection?.residentName} marked as completed.`);
            closeModal();
        } catch {
            Alert.alert('Error', 'Failed to mark pickup as completed.');
        } finally {
            setIsCompleting(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                locations={[0, 0.5, 1]}
                style={[styles.headerGradient, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <Text style={[styles.headerTitle, { alignSelf: 'center' }]}>Today's Schedule</Text>
                <Text style={styles.headerSubtitle}>{plannedCollections.length} collections in selected month</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.contentSection, { paddingTop: 16 }]}>
                    <View style={styles.scheduleMonthCard}>
                        <View style={styles.monthHeaderRow}>
                            <TouchableOpacity style={styles.monthNavButton} onPress={() => moveScheduleMonth(-1)}>
                                <MaterialCommunityIcons name="chevron-left" size={20} color="#00c853" />
                            </TouchableOpacity>
                            <Text style={styles.monthTitle}>{scheduleMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                            <TouchableOpacity style={styles.monthNavButton} onPress={() => moveScheduleMonth(1)}>
                                <MaterialCommunityIcons name="chevron-right" size={20} color="#00c853" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.weekdayRow}>
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                                <Text key={`${day}-${index}`} style={styles.weekdayText}>{day}</Text>
                            ))}
                        </View>

                        <View style={styles.miniCalendarGrid}>
                            {miniCalendarCells.map((day, index) => {
                                if (day === null) {
                                    return <View key={`blank-${index}`} style={styles.miniCalendarBlank} />;
                                }

                                const hasAppointment = appointmentDaySet.has(day);
                                const isAvailable = availableDaySet.has(day);

                                return (
                                    <View
                                        key={`day-${day}-${index}`}
                                        style={[
                                            styles.miniCalendarDay,
                                            isAvailable && styles.miniCalendarAvailable,
                                            hasAppointment && styles.miniCalendarHasAppointment,
                                        ]}
                                    >
                                        <Text style={[styles.miniCalendarDayText, hasAppointment && styles.miniCalendarDayTextActive]}>{day}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {isScheduleLoading && (
                        <View style={styles.scheduleEmptyState}>
                            <ActivityIndicator size="small" color="#00c853" />
                            <Text style={styles.scheduleEmptyText}>Loading schedule...</Text>
                        </View>
                    )}

                    {!isScheduleLoading && plannedCollections.length === 0 && (
                        <View style={styles.scheduleEmptyState}>
                            <MaterialCommunityIcons name="calendar-remove-outline" size={30} color="#7b8a9e" />
                            <Text style={styles.scheduleEmptyText}>No assigned appointments match this month and your availability.</Text>
                        </View>
                    )}

                    {plannedCollections.map((item) => (
                        <View key={item.id} style={styles.collectionCard}>
                            <View style={styles.collectionHeader}>
                                <Text style={styles.collectionResident}>{item.residentName}</Text>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{item.status}</Text>
                                </View>
                            </View>

                            <View style={styles.collectionDetailRow}>
                                <MaterialCommunityIcons name="calendar-month-outline" size={16} color="#7b8a9e" />
                                <Text style={styles.collectionDetailText}>{item.date}</Text>
                            </View>
                            
                            <View style={styles.collectionDetailRow}>
                                <MaterialCommunityIcons name="clock-outline" size={16} color="#7b8a9e" />
                                <Text style={styles.collectionDetailText}>{item.time}</Text>
                            </View>
                            
                            <View style={styles.collectionDetailRow}>
                                <MaterialCommunityIcons name="map-marker-outline" size={16} color="#7b8a9e" />
                                <Text style={styles.collectionDetailText}>{item.address}</Text>
                            </View>
                            
                            <View style={styles.collectionDetailRow}>
                                <MaterialCommunityIcons name="recycle" size={16} color="#7b8a9e" />
                                <Text style={styles.collectionDetailText}>{item.type}</Text>
                            </View>

                            <View style={styles.collectionActions}>
                                <TouchableOpacity style={styles.outlineButton} onPress={() => handleNavigate(item.address)}>
                                    <MaterialCommunityIcons name="navigation-variant-outline" size={18} color="#00c853" />
                                    <Text style={styles.outlineButtonText}>Navigate</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.filledButton} onPress={() => handleCollectWaste(item)}>
                                    <Text style={styles.filledButtonText}>Collect Waste</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* Collect Waste Modal */}
            <Modal visible={isModalVisible} transparent animationType="slide" onRequestClose={closeModal}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Verification & Collection</Text>
                                <TouchableOpacity onPress={closeModal}>
                                    <MaterialCommunityIcons name="close" size={24} color="#d0d8e4" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalResidentName}>{selectedCollection?.residentName}</Text>

                                {/* QR Scanner Placeholder */}
                                <TouchableOpacity style={styles.qrPlaceholder} onPress={onScanQR} activeOpacity={0.8}>
                                    <MaterialCommunityIcons name="qrcode-scan" size={48} color="#00c853" />
                                    <Text style={styles.qrPlaceholderText}>Tap to Scan QR</Text>
                                </TouchableOpacity>

                                {/* Waste Type Chips */}
                                <Text style={styles.inputLabel}>Waste Type</Text>
                                <View style={styles.chipsContainer}>
                                    {['Scrap/Recyclable', 'Food Waste', 'General Waste'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.chip, selectedWasteType === type && styles.chipActive]}
                                            onPress={() => setSelectedWasteType(type)}
                                        >
                                            <Text style={[styles.chipText, selectedWasteType === type && styles.chipTextActive]}>{type}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Quantity Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Quantity (in kg)</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. 5.5"
                                        placeholderTextColor="#7A8A99"
                                        value={wasteQuantity}
                                        onChangeText={setWasteQuantity}
                                        keyboardType="decimal-pad"
                                    />
                                </View>

                                {/* Payment Status Display */}
                                <View style={[styles.switchRow, { marginTop: 16, marginBottom: 8, paddingHorizontal: 4 }]}>
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <MaterialCommunityIcons 
                                            name={selectedCollection?.paymentStatus === 'Paid' ? "cash-check" : "cash-remove"} 
                                            size={24} 
                                            color={selectedCollection?.paymentStatus === 'Paid' ? "#00c853" : "#ff5252"} 
                                        />
                                        <View>
                                            <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 2 }]}>
                                                Payment: {selectedCollection?.paymentStatus === 'Paid' ? 'Received' : 'Pending'}
                                            </Text>
                                            <Text style={{ color: '#8ea1b4', fontSize: 12 }}>
                                                {selectedCollection?.paymentStatus === 'Paid' 
                                                    ? 'Resident has completed the payment via UPI.' 
                                                    : 'Resident must pay via their app before completion.'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                <TouchableOpacity 
                                    onPress={completeAndPay} 
                                    activeOpacity={0.8} 
                                    style={{ marginTop: 20 }}
                                    disabled={!wasteQuantity || selectedCollection?.paymentStatus !== 'Paid' || isCompleting}
                                >
                                    <LinearGradient 
                                        colors={(!wasteQuantity || selectedCollection?.paymentStatus !== 'Paid' || isCompleting) ? ['#1f3042', '#1a2634'] : ['#00c853', '#1b8a2a']} 
                                        style={[styles.actionButton, (!wasteQuantity || selectedCollection?.paymentStatus !== 'Paid' || isCompleting) && { opacity: 0.7 }]}
                                    >
                                        {isCompleting ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.actionButtonText}>Complete Collection</Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

// --- Settings Content ---
const SettingsContent = ({ currentUser, onOpenHistory }: any) => {
    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                locations={[0, 0.5, 1]}
                style={[styles.headerGradient, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <Text style={[styles.headerTitle, { alignSelf: 'center' }]}>Profile & Settings</Text>
            </LinearGradient>

            <View style={[styles.contentSection, { paddingTop: 24 }]}>
                {/* Profile Info */}
                <View style={styles.settingsProfileCard}>
                    <View style={styles.profileAvatarLg}>
                        <Text style={styles.profileAvatarTextLg}>{currentUser?.displayName?.charAt(0) || 'O'}</Text>
                    </View>
                    <Text style={styles.settingsProfileName}>{currentUser?.displayName || 'Official User'}</Text>
                    <Text style={styles.settingsProfileId}>ID: {currentUser?.id || 'Unknown ID'}</Text>
                    <Text style={styles.settingsProfileEmail}>{currentUser?.email || 'No email provided'}</Text>
                </View>

                {/* Settings Options */}
                <Text style={[styles.sectionTitle, { marginTop: 32 }]}>App Settings</Text>
                
                <View style={styles.settingRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="bell-outline" size={24} color="#7b8a9e" />
                        <Text style={styles.settingText}>Push Notifications</Text>
                    </View>
                    <Switch value={true} onValueChange={() => {}} trackColor={{ false: '#263345', true: '#00c853' }} thumbColor="#ffffff" />
                </View>

                <View style={styles.settingRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="theme-light-dark" size={24} color="#7b8a9e" />
                        <Text style={styles.settingText}>Dark Mode</Text>
                    </View>
                    <Switch value={true} onValueChange={() => {}} trackColor={{ false: '#263345', true: '#00c853' }} thumbColor="#ffffff" />
                </View>
                
                <TouchableOpacity style={styles.settingRow} onPress={() => Alert.alert('Help', 'Support contact: support@haritham.com')}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="help-circle-outline" size={24} color="#7b8a9e" />
                        <Text style={styles.settingText}>Help & Support</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#7b8a9e" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.settingRow} onPress={onOpenHistory}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="history" size={24} color="#7b8a9e" />
                        <Text style={styles.settingText}>View Pickup History</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={24} color="#7b8a9e" />
                </TouchableOpacity>

            </View>
        </ScrollView>
    );
};


const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000000',
    },
    container: {
        flex: 1,
        backgroundColor: '#0b1120',
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 100,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 20,
        paddingHorizontal: 20,
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#7b8a9e',
        textAlign: 'center',
        marginTop: 4,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,200,83,0.2)',
        borderWidth: 1.5,
        borderColor: '#00c853',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    profileAvatarText: {
        fontSize: 22,
        fontWeight: '700',
        color: '#00c853',
    },
    profileInfo: {
        flex: 1,
    },
    profileName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    profileRole: {
        fontSize: 14,
        color: '#00c853',
        fontWeight: '500',
        marginTop: 2,
    },
    contentSection: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#d0d8e4',
        marginBottom: 16,
    },
    dutyCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(15,45,26,0.5)',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,200,83,0.2)',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#7b8a9e',
    },
    quickActionsContainer: {
        flexDirection: 'row',
        gap: 16,
    },
    quickActionCard: {
        flex: 1,
        backgroundColor: '#0c1e14',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1e3325',
    },
    iconGradientLg: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    quickActionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    statsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1e3325',
    },
    statValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: '#7b8a9e',
    },

    // Availability Calendar Custom Grid
    monthHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    monthNavButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#1e3325',
        backgroundColor: '#0c1e14',
    },
    monthTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#d0d8e4',
    },
    monthSummaryRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    monthSummaryCard: {
        flex: 1,
        backgroundColor: '#0c1e14',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1e3325',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    monthSummaryLabel: {
        fontSize: 12,
        color: '#7b8a9e',
    },
    monthSummaryValue: {
        fontSize: 20,
        fontWeight: '700',
        color: '#00c853',
        marginTop: 4,
    },
    scheduleMonthCard: {
        backgroundColor: '#0c1e14',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1e3325',
        padding: 12,
        marginBottom: 14,
    },
    weekdayRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingHorizontal: 2,
    },
    weekdayText: {
        width: '14.2%',
        textAlign: 'center',
        fontSize: 12,
        color: '#7b8a9e',
        fontWeight: '700',
    },
    miniCalendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        rowGap: 6,
    },
    miniCalendarBlank: {
        width: '14.2%',
        height: 30,
    },
    miniCalendarDay: {
        width: '14.2%',
        height: 30,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    miniCalendarAvailable: {
        borderColor: '#2e6d4a',
        backgroundColor: 'rgba(0,200,83,0.08)',
    },
    miniCalendarHasAppointment: {
        backgroundColor: 'rgba(0,200,83,0.18)',
        borderColor: '#00c853',
    },
    miniCalendarDayText: {
        color: '#9db0c4',
        fontSize: 12,
    },
    miniCalendarDayTextActive: {
        color: '#00c853',
        fontWeight: '700',
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    calendarDay: {
        width: '30%',
        paddingVertical: 16,
        backgroundColor: '#0c1e14',
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1e3325',
    },
    calendarDaySelected: {
        backgroundColor: 'rgba(0,200,83,0.15)',
        borderColor: '#00c853',
    },
    calDayName: {
        fontSize: 14,
        color: '#7b8a9e',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    calDayNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    calTextSelected: {
        color: '#00c853',
    },

    // Collections List
    collectionCard: {
        backgroundColor: '#0c1e14',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1e3325',
        marginBottom: 16,
    },
    scheduleEmptyState: {
        borderWidth: 1,
        borderColor: '#1e3325',
        borderRadius: 12,
        backgroundColor: '#0c1e14',
        paddingVertical: 20,
        paddingHorizontal: 16,
        marginBottom: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    scheduleEmptyText: {
        fontSize: 14,
        color: '#7b8a9e',
        textAlign: 'center',
        lineHeight: 20,
    },
    collectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    collectionResident: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    statusBadge: {
        backgroundColor: 'rgba(0,200,83,0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 12,
        color: '#00c853',
        fontWeight: '600',
    },
    collectionDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    collectionDetailText: {
        fontSize: 14,
        color: '#b0b8c8',
        marginLeft: 8,
    },
    collectionActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
    },
    outlineButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#00c853',
        gap: 6,
    },
    outlineButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#00c853',
    },
    filledButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00c853',
        borderRadius: 8,
        paddingVertical: 10,
    },
    filledButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0b1120',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: '#1c2a3a',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalBody: {
        paddingBottom: 20,
    },
    modalResidentName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#d0d8e4',
        marginBottom: 16,
        textAlign: 'center',
    },
    qrPlaceholder: {
        backgroundColor: 'rgba(0,200,83,0.05)',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#00c853',
        borderRadius: 16,
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    qrPlaceholderText: {
        fontSize: 14,
        color: '#00c853',
        marginTop: 12,
        fontWeight: '600',
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#263345',
        backgroundColor: 'transparent',
    },
    chipActive: {
        backgroundColor: 'rgba(0,200,83,0.15)',
        borderColor: '#00c853',
    },
    chipText: {
        fontSize: 14,
        color: '#7b8a9e',
    },
    chipTextActive: {
        color: '#00c853',
        fontWeight: '600',
    },

    // Form Elements
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: '#d0d8e4',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1.5,
        borderColor: '#263345',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#b0b8c8',
        fontSize: 16,
        backgroundColor: '#0b1120'
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 8,
    },
    actionButton: {
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        width: '100%',
    },
    actionButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    smallActionButton: {
        backgroundColor: '#00c853',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoBox: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 180, 80, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(0, 180, 80, 0.12)',
        borderRadius: 8,
        padding: 12,
        gap: 12,
    },
    infoIcon: {
        marginTop: 2,
    },
    infoText: {
        fontSize: 14,
        color: '#7aaa8e',
        lineHeight: 20,
        flex: 1,
    },

    // Scanner Styles
    scannerOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerTargetArea: {
        width: 250,
        height: 250,
        borderWidth: 2,
        borderColor: '#00c853',
        backgroundColor: 'transparent',
    },
    scannerText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 20,
        textAlign: 'center',
    },
    scannerCloseButton: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 8,
        borderRadius: 20,
    },
    // Settings Styles
    settingsProfileCard: {
        backgroundColor: '#162332',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 8,
    },
    profileAvatarLg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#263345',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#00c853',
    },
    profileAvatarTextLg: {
        color: '#00c853',
        fontSize: 32,
        fontWeight: 'bold',
    },
    settingsProfileName: {
        color: '#ffffff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    settingsProfileId: {
        color: '#00c853',
        fontSize: 14,
        marginBottom: 4,
    },
    settingsProfileEmail: {
        color: '#7b8a9e',
        fontSize: 14,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#162332',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    settingText: {
        color: '#ffffff',
        fontSize: 16,
        marginLeft: 12,
    },

    // Bottom Navigation (shared)
    bottomNav: {
        flexDirection: 'row',
        backgroundColor: '#0a0f1a',
        paddingVertical: 10,
        paddingHorizontal: 16,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopWidth: 1,
        borderTopColor: '#1c2a3a',
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navIconContainer: {
        width: 48,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
        overflow: 'hidden',
    },
    navIconActive: {
        backgroundColor: 'transparent',
    },
    navLabel: {
        fontSize: 12,
        color: '#3e5068',
        fontWeight: '500',
    },
    navLabelActive: {
        color: '#00c853',
        fontWeight: '700',
    },
});
