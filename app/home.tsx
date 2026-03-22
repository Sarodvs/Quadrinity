import { useAuth } from '@/context/AuthContext';
import { auth as firebaseAuth } from '@/firebase';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { updatePassword } from 'firebase/auth';
import { addDoc, collection, doc, getDoc, getDocs, getFirestore, limit, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

// Mock Data for Bottom Nav
const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { id: 'orders', label: 'Orders', icon: 'clipboard-text-outline', iconActive: 'clipboard-text' },
    { id: 'history', label: 'History', icon: 'clock-outline', iconActive: 'clock' },
    { id: 'profile', label: 'Profile', icon: 'account-outline', iconActive: 'account' },
];

interface Order {
    id: string;
    type: string;
    date: string;
    time: string;
    status: string;
    paymentStatus?: string;
    weight?: string;
    points?: string;
    assignedOfficialId?: string | null;
}

interface ResidentProfile {
    name: string;
    email: string;
    mobileNo?: string;
    houseNo: string;
    address: string;
}

const normalizeOrderStatus = (status?: string) => {
    const value = (status || '').trim().toLowerCase();
    if (value === 'completed') return 'Completed';
    if (value === 'cancelled' || value === 'canceled') return 'Cancelled';
    return status?.trim() || 'Scheduled';
};

const parseWeightKg = (weight: string | undefined) => {
    if (!weight) return 0;
    const numericValue = parseFloat(weight.replace(/[^0-9.]/g, ''));
    return Number.isNaN(numericValue) ? 0 : numericValue;
};

const BUSINESS_HOUR_START = 9;
const BUSINESS_HOUR_END = 17;

const isWithinBusinessHours = (time: Date) => {
    const minutes = time.getHours() * 60 + time.getMinutes();
    const minMinutes = BUSINESS_HOUR_START * 60;
    const maxMinutes = BUSINESS_HOUR_END * 60;
    return minutes >= minMinutes && minutes <= maxMinutes;
};

const clampToBusinessHours = (time: Date) => {
    const clamped = new Date(time);
    const minutes = clamped.getHours() * 60 + clamped.getMinutes();
    const minMinutes = BUSINESS_HOUR_START * 60;
    const maxMinutes = BUSINESS_HOUR_END * 60;

    if (minutes < minMinutes) {
        clamped.setHours(BUSINESS_HOUR_START, 0, 0, 0);
    } else if (minutes > maxMinutes) {
        clamped.setHours(BUSINESS_HOUR_END, 0, 0, 0);
    }

    return clamped;
};

const getMinutesOfDay = (time: Date) => time.getHours() * 60 + time.getMinutes();

const getWeekKey = (date = new Date()) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
};

export default function HomeScreen() {
    const [activeTab, setActiveTab] = useState('home');
    const [orders, setOrders] = useState<Order[]>([]);
    const [isOrdersLoading, setIsOrdersLoading] = useState(true);
    const [orderActionLoadingId, setOrderActionLoadingId] = useState<string | null>(null);
    const [profile, setProfile] = useState<ResidentProfile | null>(null);
    const [isProfileLoading, setIsProfileLoading] = useState(true);
    const { currentUser, logout } = useAuth();
    const router = useRouter();

    // Profile Modal States
    const [isEditProfileModalVisible, setIsEditProfileModalVisible] = useState(false);
    const [editForm, setEditForm] = useState({ mobileNo: '', houseNo: '', address: '' });
    const [isChangePasswordModalVisible, setIsChangePasswordModalVisible] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [isLogoutConfirmModalVisible, setIsLogoutConfirmModalVisible] = useState(false);
    
    // Common Collection Point State
    const [isCommonPointModalVisible, setIsCommonPointModalVisible] = useState(false);
    const [commonPoint, setCommonPoint] = useState<string | null>(null);
    const [isLoadingPoint, setIsLoadingPoint] = useState(false);
    const [isModifying, setIsModifying] = useState(false);

    // Booking State
    const [isBooking, setIsBooking] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [endTime, setEndTime] = useState<Date | null>(null);

    const handleStartBooking = () => {
        setIsBooking(true);
        setSelectedDate(null);
        setStartTime(null);
        setEndTime(null);
    };

    const handleConfirmBooking = async () => {
        if (!selectedDate || !startTime || !endTime) return;

        if (getMinutesOfDay(endTime) <= getMinutesOfDay(startTime)) {
            Alert.alert('Invalid Time Window', 'End time must be later than start time.');
            return;
        }

        const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!userId) {
            Alert.alert('Error', 'Please login again to schedule pickup.');
            return;
        }

        const timeString = `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        try {
            const firestore = getFirestore();
            const bookingDateKey = selectedDate.toISOString().split('T')[0];
            const monthKey = bookingDateKey.slice(0, 7);

            let assignedOfficialId = '';
            let assignedOfficialName = '';

            const availableOfficialsSnapshot = await getDocs(
                query(
                    collection(firestore, 'officials'),
                    where(`availabilityByMonth.${monthKey}`, 'array-contains', bookingDateKey)
                )
            );

            const activeOfficials = availableOfficialsSnapshot.docs
                .map((entry) => ({ id: entry.id, ...(entry.data() as any) }))
                .filter((official) => official.isActive !== false);

            if (activeOfficials.length > 0) {
                const sameDayAssignments = await getDocs(
                    query(collection(firestore, 'orders'), where('dateKey', '==', bookingDateKey))
                );

                const loadByOfficial: Record<string, number> = {};
                sameDayAssignments.docs.forEach((orderDoc) => {
                    const order = orderDoc.data() as any;
                    const status = String(order.status || '').toLowerCase();
                    if (status === 'scheduled' || status === 'pending') {
                        const officialId = order.assignedOfficialId;
                        if (officialId) {
                            loadByOfficial[officialId] = (loadByOfficial[officialId] || 0) + 1;
                        }
                    }
                });

                activeOfficials.sort((a, b) => {
                    const aLoad = loadByOfficial[a.userId || a.id] || 0;
                    const bLoad = loadByOfficial[b.userId || b.id] || 0;
                    return aLoad - bLoad;
                });

                const selectedOfficial = activeOfficials[0];
                assignedOfficialId = selectedOfficial.userId || selectedOfficial.id;
                assignedOfficialName = selectedOfficial.displayName || assignedOfficialId;
            }

            await addDoc(collection(firestore, 'orders'), {
                userId,
                residentName: profile?.name || currentUser?.displayName || 'Resident',
                address: profile?.address || '',
                type: 'Scrap/Recyclable Waste',
                date: selectedDate.toLocaleDateString(),
                dateKey: bookingDateKey,
                time: timeString,
                status: 'Scheduled',
                assignedOfficialId,
                assignedOfficialName,
                assignmentStatus: assignedOfficialId ? 'assigned' : 'unassigned',
                weight: '-',
                points: '0 Points',
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });

            setIsBooking(false);
            setActiveTab('orders');
            Alert.alert(
                'Success',
                assignedOfficialName
                    ? `Pickup scheduled and assigned to ${assignedOfficialName}.`
                    : 'Pickup scheduled successfully. No available official is assigned yet.'
            );
        } catch {
            Alert.alert('Error', 'Failed to schedule pickup. Please try again.');
        }
    };

    const handleCancelBooking = () => {
        setIsBooking(false);
    };

    const handleSchedulePickup = () => {
        setIsBooking(true);
        setActiveTab('home');
        setSelectedDate(null);
        setStartTime(null);
        setEndTime(null);
    };

    const handleCancelOrder = (orderId: string) => {
        Alert.alert('Cancel Pickup', 'Are you sure you want to cancel this scheduled pickup?', [
            { text: 'No', style: 'cancel' },
            {
                text: 'Yes, Cancel',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setOrderActionLoadingId(orderId);
                        const firestore = getFirestore();
                        await updateDoc(doc(firestore, 'orders', orderId), {
                            status: 'Cancelled',
                            updatedAt: Date.now(),
                        });
                    } catch {
                        Alert.alert('Error', 'Unable to cancel order right now.');
                    } finally {
                        setOrderActionLoadingId(null);
                    }
                },
            },
        ]);
    };

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        if (isBooking) setIsBooking(false);
    };

    useEffect(() => {
        const loadProfile = async () => {
            const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
            if (!userId) {
                setProfile(null);
                setIsProfileLoading(false);
                return;
            }

            setIsProfileLoading(true);
            try {
                const firestore = getFirestore();
                const profileRef = doc(firestore, 'users', userId);
                const profileSnap = await getDoc(profileRef);

                const firestoreData = profileSnap.exists() ? (profileSnap.data() as Partial<ResidentProfile>) : {};
                const email =
                    firestoreData.email ||
                    currentUser?.email ||
                    firebaseAuth.currentUser?.email ||
                    '';

                setProfile({
                    name: firestoreData.name || currentUser?.displayName || email.split('@')[0] || 'Resident',
                    email,
                    mobileNo: firestoreData.mobileNo || '-',
                    houseNo: firestoreData.houseNo || '-',
                    address: firestoreData.address || '-',
                });
            } catch {
                Alert.alert('Error', 'Failed to load profile details from Firebase.');
            } finally {
                setIsProfileLoading(false);
            }
        };

        loadProfile();
    }, [currentUser]);

    useEffect(() => {
        const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!userId) {
            setOrders([]);
            setIsOrdersLoading(false);
            return;
        }

        setIsOrdersLoading(true);
        const firestore = getFirestore();
        const ordersQuery = query(collection(firestore, 'orders'), where('userId', '==', userId));

        const unsubscribe = onSnapshot(
            ordersQuery,
            (snapshot) => {
                const nextOrders: Order[] = snapshot.docs
                    .map((item) => {
                        const data = item.data() as Partial<Order> & { createdAt?: number; updatedAt?: number };
                        return {
                            id: item.id,
                            type: data.type || 'Scrap/Recyclable Waste',
                            date: data.date || '-',
                            time: data.time || '-',
                            status: normalizeOrderStatus(data.status),
                            paymentStatus: data.paymentStatus || 'Pending',
                            weight: data.weight || '-',
                            points: data.points || '0 Points',
                            createdAt: data.createdAt || 0,
                            updatedAt: data.updatedAt || 0,
                        };
                    })
                    .sort((a, b) => {
                        const aSort = a.updatedAt || a.createdAt || 0;
                        const bSort = b.updatedAt || b.createdAt || 0;
                        return bSort - aSort;
                    })
                    .map(({ createdAt, updatedAt, ...order }) => order as Order);

                setOrders(nextOrders);
                setIsOrdersLoading(false);
            },
            () => {
                setIsOrdersLoading(false);
                Alert.alert('Error', 'Failed to load orders from Firebase.');
            }
        );

        return () => unsubscribe();
    }, [currentUser]);

    const activeOrders = orders.filter((order) => order.status !== 'Cancelled' && order.status !== 'Completed');
    const historyOrders = orders.filter((order) => order.status === 'Cancelled' || order.status === 'Completed');
    const completedOrders = orders.filter((order) => order.status === 'Completed');

    const getLatestAssignedOfficialId = () => {
        for (const order of orders) {
            if (order.assignedOfficialId) {
                return order.assignedOfficialId;
            }
        }
        return null;
    };
    const latestOfficialId = getLatestAssignedOfficialId();
    const totalCollectedKg = completedOrders.reduce((acc, item) => acc + parseWeightKg(item.weight), 0);
    const totalEcoPoints = completedOrders.reduce((acc, item) => {
        const pointsValue = Number((item.points || '0').replace(/[^0-9]/g, ''));
        return acc + (Number.isNaN(pointsValue) ? 0 : pointsValue);
    }, 0);

    const handleLogout = async () => {
        try {
            await logout();
            router.replace('/login');
        } catch {
            Alert.alert('Error', 'Unable to logout right now. Please try again.');
        }
    };

    const openEditProfileModal = () => {
        if (profile) {
            setEditForm({
                mobileNo: profile.mobileNo || '',
                houseNo: profile.houseNo || '',
                address: profile.address || '',
            });
            setIsEditProfileModalVisible(true);
        }
    };

    const closeEditProfileModal = () => {
        setIsEditProfileModalVisible(false);
    };

    const handleSaveProfile = async () => {
        const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
        if (!userId || !profile) return;

        setIsModifying(true);
        try {
            const firestore = getFirestore();
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, {
                mobileNo: editForm.mobileNo,
                houseNo: editForm.houseNo,
                address: editForm.address,
            });
            setProfile({
                ...profile,
                mobileNo: editForm.mobileNo,
                houseNo: editForm.houseNo,
                address: editForm.address,
            });
            closeEditProfileModal();
            Alert.alert('Success', 'Profile updated successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to update profile');
        } finally {
            setIsModifying(false);
        }
    };

    const handleChangePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setIsModifying(true);
        try {
            const user = firebaseAuth.currentUser;
            if (!user) {
                Alert.alert('Error', 'User not authenticated');
                return;
            }
            await updatePassword(user, passwordForm.newPassword);
            setPasswordForm({ newPassword: '', confirmPassword: '' });
            setIsChangePasswordModalVisible(false);
            Alert.alert('Success', 'Password changed successfully');
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to change password');
        } finally {
            setIsModifying(false);
        }
    };

    const confirmLogout = async () => {
        setIsLogoutConfirmModalVisible(false);
        await handleLogout();
    };

    const handleOrderPayment = async (orderId: string) => {
        try {
            const firestore = getFirestore();
            const adminRef = doc(firestore, 'admin', 'settings');
            const adminSnap = await getDoc(adminRef);
            
            if (!adminSnap.exists()) {
                Alert.alert('Unavailable', 'The platform payment details are not configured yet.');
                return;
            }

            const adminData = adminSnap.data();
            const upiId = adminData?.payment?.upiId;
            const upiName = adminData?.payment?.upiName || 'Admin Payment';

            if (!upiId) {
                Alert.alert('Unavailable', 'The platform payment details have not been set up yet.');
                return;
            }

            // Construct UPI URI
            const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&tn=${encodeURIComponent(`Order ${orderId}`)}&cu=INR`;

            const supported = await Linking.canOpenURL(upiUri);
            if (supported) {
                await Linking.openURL(upiUri);
                // Mark as paid in database (Simulated success)
                await updateDoc(doc(firestore, 'orders', orderId), {
                    paymentStatus: 'Paid',
                    updatedAt: Date.now()
                });
            } else {
                Alert.alert("Error", "No UPI app found on this device.");
            }
        } catch (error) {
            console.error("Payment error:", error);
        }
    };

    const handleViewCommonPoint = async () => {
        setIsCommonPointModalVisible(true);
        setIsLoadingPoint(true);
        try {
            const firestore = getFirestore();
            let targetOfficialId = latestOfficialId;

            // If no official is assigned via previous orders, find the first active official
            if (!targetOfficialId) {
                const officialsSnapshot = await getDocs(
                    query(collection(firestore, 'officials'), limit(1))
                );
                if (!officialsSnapshot.empty) {
                    targetOfficialId = officialsSnapshot.docs[0].id;
                }
            }

            if (!targetOfficialId) {
                setCommonPoint('No officials found in service.');
                setIsLoadingPoint(false);
                return;
            }

            const officialRef = doc(firestore, 'officials', targetOfficialId);
            const officialSnap = await getDoc(officialRef);
            
            if (officialSnap.exists()) {
                const data = officialSnap.data();
                const weekKey = getWeekKey();
                const points = data.commonPoints || {};
                setCommonPoint(points[weekKey] || 'No collection point set for this week.');
            } else {
                setCommonPoint('Official information not found.');
            }
        } catch (error) {
            console.error('Error fetching common point:', error);
            setCommonPoint('Error loading collection point.');
        } finally {
            setIsLoadingPoint(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <View style={styles.container}>

                {activeTab === 'home' && !isBooking && (
                    <HomeContent 
                        onBookAppointment={handleStartBooking} 
                        latestOfficialId={latestOfficialId} 
                        onViewCommonPoint={handleViewCommonPoint}
                    />
                )}

                {activeTab === 'home' && isBooking && (
                    <BookingContent
                        selectedDate={selectedDate}
                        startTime={startTime}
                        endTime={endTime}
                        onDateChange={setSelectedDate}
                        onStartTimeChange={setStartTime}
                        onEndTimeChange={setEndTime}
                        onConfirm={handleConfirmBooking}
                        onCancel={handleCancelBooking}
                    />
                )}

                {activeTab === 'orders' && (
                    <OrdersContent
                        orders={activeOrders}
                        onSchedulePickup={handleSchedulePickup}
                        onCancelOrder={handleCancelOrder}
                        handleOrderPayment={handleOrderPayment}
                        isOrdersLoading={isOrdersLoading}
                        orderActionLoadingId={orderActionLoadingId}
                    />
                )}

                {/* Additional Tabs */}
                {activeTab === 'history' && <HistoryContent historyOrders={historyOrders} isOrdersLoading={isOrdersLoading} />}
                {activeTab === 'profile' && (
                    <ProfileContent
                        profile={profile}
                        loading={isProfileLoading}
                        onLogout={() => setIsLogoutConfirmModalVisible(true)}
                        isEditProfileModalVisible={isEditProfileModalVisible}
                        closeEditProfileModal={closeEditProfileModal}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        handleSaveProfile={handleSaveProfile}
                        isChangePasswordModalVisible={isChangePasswordModalVisible}
                        setIsChangePasswordModalVisible={setIsChangePasswordModalVisible}
                        passwordForm={passwordForm}
                        setPasswordForm={setPasswordForm}
                        handleChangePassword={handleChangePassword}
                        openEditProfileModal={openEditProfileModal}
                        isModifying={isModifying}
                        isLogoutConfirmModalVisible={isLogoutConfirmModalVisible}
                        setIsLogoutConfirmModalVisible={setIsLogoutConfirmModalVisible}
                        confirmLogout={confirmLogout}
                        completedCount={completedOrders.length}
                        collectedKg={totalCollectedKg}
                        ecoPoints={totalEcoPoints}
                    />
                )}

                {/* Common Collection Point Modal */}
                <Modal
                    visible={isCommonPointModalVisible}
                    transparent
                    animationType="fade"
                    onRequestClose={() => setIsCommonPointModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Weekly Collection Point</Text>
                                <TouchableOpacity onPress={() => setIsCommonPointModalVisible(false)}>
                                    <MaterialCommunityIcons name="close" size={24} color="#7b8a9e" />
                                </TouchableOpacity>
                            </View>
                            
                            <View style={styles.modalBody}>
                                <View style={[styles.infoBox, { marginBottom: 20 }]}>
                                    <MaterialCommunityIcons name="information" size={20} color="#00c853" />
                                    <Text style={styles.infoText}>
                                        This is the common point set by your official for waste collection this week.
                                    </Text>
                                </View>

                                {isLoadingPoint ? (
                                    <ActivityIndicator size="large" color="#00c853" style={{ marginVertical: 30 }} />
                                ) : (
                                    <View style={styles.pointDetailCard}>
                                        <MaterialCommunityIcons name="map-marker-radius" size={40} color="#00c853" style={{ marginBottom: 12 }} />
                                        <Text style={styles.pointLabel}>Current Week's Point:</Text>
                                        <Text style={styles.pointValue}>{commonPoint}</Text>
                                        <Text style={styles.weekText}>Week: {getWeekKey()}</Text>
                                    </View>
                                )}

                                <TouchableOpacity 
                                    style={styles.confirmButton}
                                    onPress={() => setIsCommonPointModalVisible(false)}
                                >
                                    <Text style={styles.confirmButtonText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
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

// --- Sub Components ---

const HomeContent = ({ onBookAppointment, latestOfficialId, onViewCommonPoint }: { onBookAppointment: () => void, latestOfficialId: string | null, onViewCommonPoint: () => void }) => {
    return (
        <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12', '#0b1120']}
                locations={[0, 0.4, 0.7, 1]}
                style={styles.header}
            >
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../assets/images/LOGO.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <View style={styles.taglineContainer}>
                        <Text style={styles.taglineStart}>Your Waste</Text>
                        <Text style={styles.taglineEnd}>Our Responsibility</Text>
                    </View>
                </View>

                {/* Faint Background Icons Pattern */}
                <MaterialCommunityIcons name="recycle" size={60} color="rgba(0, 230, 118, 0.05)" style={[styles.bgIcon, { top: 20, left: -10 }]} />
                <MaterialCommunityIcons name="recycle" size={50} color="rgba(0, 230, 118, 0.05)" style={[styles.bgIcon, { top: 10, right: 10 }]} />
                <MaterialCommunityIcons name="recycle" size={40} color="rgba(0, 230, 118, 0.05)" style={[styles.bgIcon, { bottom: 20, left: 30 }]} />
            </LinearGradient>

            <View style={styles.divider} />

            {/* Content Section */}
            <View style={styles.contentSection}>
                {/* Book Appointment Card */}
                <Text style={styles.sectionTitle}>Book Your Appointment</Text>
                <TouchableOpacity activeOpacity={0.9} onPress={onBookAppointment}>
                    <LinearGradient
                        colors={['#0f2d1a', '#0c1e14', '#0b1518']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.card}
                    >
                        <View style={styles.iconBox}>
                            <LinearGradient
                                colors={['rgba(0,200,83,0.22)', 'rgba(0,200,83,0.06)']}
                                style={styles.iconGradient}
                            >
                                <MaterialCommunityIcons name="recycle" size={28} color="#00c853" />
                            </LinearGradient>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Scrap/Recyclable Waste</Text>
                            <Text style={styles.cardSubtitle}>Book a collection and earn cash</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#00c853" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Collection Points Card */}
                <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Common Collection Point</Text>
                <TouchableOpacity activeOpacity={0.9} onPress={onViewCommonPoint}>
                    <LinearGradient
                        colors={['#0f2d1a', '#0c1e14', '#0b1518']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.card}
                    >
                        <View style={styles.iconBox}>
                            <LinearGradient
                                colors={['rgba(0,200,83,0.22)', 'rgba(0,200,83,0.06)']}
                                style={styles.iconGradient}
                            >
                                <MaterialCommunityIcons name="map-marker-radius-outline" size={28} color="#00c853" />
                            </LinearGradient>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Weekly Common Point</Text>
                            <Text style={styles.cardSubtitle}>View this week's centralized collection spot</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#00c853" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Your Contribution Section */}
                <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: 20 }]}>Your Contribution</Text>
                <View style={styles.contributionContainer}>
                    {/* Circular Progress Mock */}
                    <View style={styles.circularProgress}>
                        <View style={styles.innerCircle}>
                            <Text style={styles.contributionValue}>0.00</Text>
                            <Text style={styles.contributionUnit}>kg</Text>
                        </View>
                        {/* Ring borders */}
                        <View style={styles.ringBackground} />
                        <View style={styles.ringProgress} />
                    </View>

                    <View style={styles.wasteTypeTag}>
                        <MaterialCommunityIcons name="leaf" size={14} color="#00c853" />
                        <Text style={styles.wasteTypeText}>Scrap Waste</Text>
                    </View>
                </View>

                

            </View>
        </ScrollView>
    );
};

const BookingContent = ({
    selectedDate,
    startTime,
    endTime,
    onDateChange,
    onStartTimeChange,
    onEndTimeChange,
    onConfirm,
    onCancel
}: {
    selectedDate: Date | null,
    startTime: Date | null,
    endTime: Date | null,
    onDateChange: (date: Date) => void,
    onStartTimeChange: (time: Date) => void,
    onEndTimeChange: (time: Date) => void,
    onConfirm: () => void,
    onCancel: () => void
}) => {
    const hasAllBookingValues = Boolean(selectedDate && startTime && endTime);
    const isTimeWindowValid = Boolean(
        startTime && endTime && getMinutesOfDay(endTime) > getMinutesOfDay(startTime)
    );
    const isConfirmEnabled = hasAllBookingValues && isTimeWindowValid;
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showStartTimePicker, setShowStartTimePicker] = useState(false);
    const [showEndTimePicker, setShowEndTimePicker] = useState(false);

    const getDefaultTime = (hour: number) => {
        const value = new Date();
        value.setHours(hour, 0, 0, 0);
        return value;
    };

    const datePickerDisplay = Platform.OS === 'ios' ? 'inline' : 'calendar';
    const timePickerDisplay = Platform.OS === 'ios' ? 'spinner' : 'clock';

    const handleDatePickerChange = (event: DateTimePickerEvent, date?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (event.type !== 'set' || !date) return;
        onDateChange(date);
    };

    const handleTimePickerChange = (
        event: DateTimePickerEvent,
        date: Date | undefined,
        picker: 'start' | 'end'
    ) => {
        if (Platform.OS === 'android') {
            if (picker === 'start') setShowStartTimePicker(false);
            if (picker === 'end') setShowEndTimePicker(false);
        }

        if (event.type !== 'set' || !date) return;

        let adjustedTime = date;
        if (!isWithinBusinessHours(date)) {
            adjustedTime = clampToBusinessHours(date);
            Alert.alert(
                'Outside Service Hours',
                `Pickup time should be between 9:00 AM and 5:00 PM. Adjusted to ${adjustedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
            );
        }

        if (picker === 'start') onStartTimeChange(adjustedTime);
        if (picker === 'end') onEndTimeChange(adjustedTime);
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                locations={[0, 0.5, 1]}
                style={[styles.header, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <Text style={styles.profileName}>Schedule Pickup</Text>
                <Text style={styles.profileEmail}>Select a convenient time for collection</Text>
            </LinearGradient>

            <View style={styles.contentSection}>
                {/* Date Selection */}
                <Text style={styles.inputLabel}>Select Date</Text>
                <View style={styles.card}>
                    <View style={[styles.iconBox, { width: 48, height: 48 }]}>
                        <LinearGradient colors={['rgba(0,200,83,0.2)', 'rgba(0,200,83,0.05)']} style={styles.iconGradient}>
                            <MaterialCommunityIcons name="calendar-month" size={24} color="#00c853" />
                        </LinearGradient>
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={selectedDate ? styles.inputText : styles.placeholderText}>
                            {selectedDate ? selectedDate.toLocaleDateString() : 'Choose a date'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)}>
                        <Text style={{ color: '#00c853', fontWeight: '600' }}>Select</Text>
                    </TouchableOpacity>
                </View>
                {showDatePicker && (
                    <View style={styles.pickerContainer}>
                        <DateTimePicker
                            value={selectedDate || new Date()}
                            mode="date"
                            display={datePickerDisplay}
                            minimumDate={new Date()}
                            onChange={handleDatePickerChange}
                        />
                    </View>
                )}

                {/* Time Selection */}
                <Text style={[styles.inputLabel, { marginTop: 24 }]}>Select Time Window</Text>
                <Text style={styles.inputHint}>Pickup hours: 9:00 AM to 5:00 PM</Text>
                {hasAllBookingValues && !isTimeWindowValid && (
                    <Text style={styles.errorLabel}>End time must be later than start time.</Text>
                )}

                <View style={styles.timeRowsContainer}>
                    {/* Start Time */}
                    <View style={styles.timeRow}>
                        <Text style={[styles.inputLabel, { fontSize: 13, color: '#7b8a9e', marginBottom: 8, marginTop: 8 }]}>From Time</Text>
                        <View style={styles.card}>
                            <View style={[styles.iconBox, { width: 48, height: 48 }]}>
                                <LinearGradient colors={['rgba(0,200,83,0.2)', 'rgba(0,200,83,0.05)']} style={styles.iconGradient}>
                                    <MaterialCommunityIcons name="clock-start" size={24} color="#00c853" />
                                </LinearGradient>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={startTime ? styles.inputText : styles.placeholderText}>
                                    {startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Start Time'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowStartTimePicker(true)}>
                                <Text style={{ color: '#00c853', fontWeight: '600' }}>Select</Text>
                            </TouchableOpacity>
                        </View>
                        {showStartTimePicker && (
                            <View style={styles.pickerContainer}>
                                <DateTimePicker
                                    value={startTime || getDefaultTime(BUSINESS_HOUR_START)}
                                    mode="time"
                                    is24Hour={false}
                                    display={timePickerDisplay}
                                    onChange={(event, date) => handleTimePickerChange(event, date, 'start')}
                                />
                            </View>
                        )}
                    </View>

                    {/* End Time */}
                    <View style={styles.timeRow}>
                        <Text style={[styles.inputLabel, { fontSize: 13, color: '#7b8a9e', marginBottom: 8, marginTop: 16 }]}>To Time</Text>
                        <View style={styles.card}>
                            <View style={[styles.iconBox, { width: 48, height: 48 }]}>
                                <LinearGradient colors={['rgba(0,200,83,0.2)', 'rgba(0,200,83,0.05)']} style={styles.iconGradient}>
                                    <MaterialCommunityIcons name="clock-end" size={24} color="#00c853" />
                                </LinearGradient>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={endTime ? styles.inputText : styles.placeholderText}>
                                    {endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'End Time'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowEndTimePicker(true)}>
                                <Text style={{ color: '#00c853', fontWeight: '600' }}>Select</Text>
                            </TouchableOpacity>
                        </View>
                        {showEndTimePicker && (
                            <View style={styles.pickerContainer}>
                                <DateTimePicker
                                    value={endTime || getDefaultTime(BUSINESS_HOUR_END)}
                                    mode="time"
                                    is24Hour={false}
                                    display={timePickerDisplay}
                                    onChange={(event, date) => handleTimePickerChange(event, date, 'end')}
                                />
                            </View>
                        )}
                    </View>
                </View>

                {/* Actions */}
                <View style={{ marginTop: 40, gap: 16 }}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={onConfirm}
                        disabled={!isConfirmEnabled}
                    >
                        <LinearGradient
                            colors={isConfirmEnabled ? ['#00c853', '#009624'] : ['#1a2938', '#131f2b']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.confirmButton, !isConfirmEnabled && styles.confirmButtonDisabled]}
                        >
                            <Text style={[styles.confirmButtonText, !isConfirmEnabled && styles.confirmButtonTextDisabled]}>
                                Confirm Booking
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={onCancel}
                        style={[styles.confirmButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#263345' }]}
                    >
                        <Text style={[styles.confirmButtonText, { color: '#e0eee6' }]}>Cancel</Text>
                    </TouchableOpacity>
                </View>

            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
};


const OrdersContent = ({
    orders,
    onSchedulePickup,
    onCancelOrder,
    handleOrderPayment,
    isOrdersLoading,
    orderActionLoadingId,
}: {
    orders: Order[];
    onSchedulePickup: () => void;
    onCancelOrder: (orderId: string) => void;
    handleOrderPayment: (orderId: string) => void;
    isOrdersLoading: boolean;
    orderActionLoadingId: string | null;
}) => {
    if (isOrdersLoading) {
        return (
            <View style={styles.emptyStateContainer}>
                <ActivityIndicator size="large" color="#00c853" />
                <Text style={[styles.emptyStateDescription, { marginTop: 16, marginBottom: 0 }]}>Loading your orders...</Text>
            </View>
        );
    }

    if (orders.length === 0) {
        return (
            <View style={styles.emptyStateContainer}>
                {/* Visual Illustration */}
                <View style={styles.emptyStateImageContainer}>
                    {/* Using a combination of icons to mimic the green trash bin illustration */}
                    <MaterialCommunityIcons name="trash-can" size={120} color="#00c853" />
                    <View style={styles.emptyStateIconOverlay}>
                        <MaterialCommunityIcons name="clipboard-text-outline" size={60} color="#0b1120" />
                    </View>
                </View>

                <Text style={styles.emptyStateTitle}>No Orders Yet</Text>
                <Text style={styles.emptyStateDescription}>
                    You don't have any waste collection orders at the moment. Schedule a pickup to get started.
                </Text>

                <TouchableOpacity onPress={onSchedulePickup} activeOpacity={0.8}>
                    <LinearGradient
                        colors={['#00c853', '#009624']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.scheduleButton}
                    >
                        <MaterialCommunityIcons name="plus" size={24} color="#0b1120" style={{ marginRight: 8 }} />
                        <Text style={styles.scheduleButtonText}>Schedule a Pickup</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.emptyStateFooter}>Fast, reliable & eco-friendly collection</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.contentSection, { paddingTop: 40 }]}>
                <Text style={styles.sectionTitle}>Your Orders ({orders.length})</Text>
                {orders.map((order) => {
                    const statusValue = order.status.trim().toLowerCase();
                    const isInProgress =
                        statusValue === 'in progress' ||
                        statusValue === 'in-progress' ||
                        statusValue === 'processing';
                    const isScheduled = statusValue === 'scheduled';

                    return (
                        <LinearGradient
                            key={order.id}
                            colors={['#0f2d1a', '#0c1e14', '#0b1518']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.orderCard}
                        >
                            <View style={styles.orderHeader}>
                                <Text style={styles.orderId}>Order #{order.id}</Text>
                                <View
                                    style={[
                                        styles.orderStatusBadge,
                                        isInProgress
                                            ? styles.orderStatusInProgressBadge
                                            : isScheduled
                                                ? styles.orderStatusScheduledBadge
                                                : styles.orderStatusDefaultBadge,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.orderStatusText,
                                            isInProgress
                                                ? styles.orderStatusInProgressText
                                                : isScheduled
                                                    ? styles.orderStatusScheduledText
                                                    : styles.orderStatusDefaultText,
                                        ]}
                                    >
                                        {order.status}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.orderType}>{order.type}</Text>
                            <View style={styles.orderFooter}>
                                <MaterialCommunityIcons name="calendar" size={14} color="#7b8a9e" />
                                <Text style={styles.orderDate}>{order.date}</Text>
                                {order.time && (
                                    <>
                                        <View style={{ width: 10 }} />
                                        <MaterialCommunityIcons name="clock-outline" size={14} color="#7b8a9e" />
                                        <Text style={styles.orderDate}>{order.time}</Text>
                                    </>
                                )}
                            </View>

                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
                                <TouchableOpacity
                                    style={[styles.orderCancelButton, { flex: 1, marginTop: 0 }]}
                                    activeOpacity={0.8}
                                    onPress={() => onCancelOrder(order.id)}
                                    disabled={orderActionLoadingId === order.id}
                                >
                                    {orderActionLoadingId === order.id ? (
                                        <ActivityIndicator size="small" color="#ff8a80" />
                                    ) : (
                                        <Text style={styles.orderCancelButtonText}>Cancel Pickup</Text>
                                    )}
                                </TouchableOpacity>

                                {isScheduled && order.paymentStatus !== 'Paid' && (
                                    <TouchableOpacity
                                        style={[styles.payNowButton, { flex: 1 }]}
                                        activeOpacity={0.8}
                                        onPress={() => handleOrderPayment(order.id)}
                                    >
                                        <LinearGradient
                                            colors={['#00c853', '#009624']}
                                            style={styles.payNowGradient}
                                        >
                                            <Text style={styles.payNowButtonText}>Pay Now</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                )}
                                
                                {order.paymentStatus === 'Paid' && (
                                    <View style={[styles.paidBadge, { flex: 1 }]}>
                                        <MaterialCommunityIcons name="check-circle" size={16} color="#00c853" />
                                        <Text style={styles.paidBadgeText}>Paid</Text>
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                    );
                })}
            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

const PlaceholderContent = ({ title }: { title: string }) => (
    <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderTitle}>{title} Coming Soon</Text>
    </View>
);

const HistoryContent = ({
    historyOrders,
    isOrdersLoading,
}: {
    historyOrders: Order[];
    isOrdersLoading: boolean;
}) => {
    const completedOrders = historyOrders.filter((item) => item.status === 'Completed');
    const totalPoints = completedOrders.reduce((acc, item) => {
        const pointsValue = Number((item.points || '0').replace(/[^0-9]/g, ''));
        return acc + (Number.isNaN(pointsValue) ? 0 : pointsValue);
    }, 0);

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header / Summary Area */}
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                locations={[0, 0.5, 1]}
                style={[styles.header, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <Text style={styles.profileName}>Collection History</Text>
                <Text style={styles.profileEmail}>Your past waste management activities</Text>

                <View style={[styles.statsContainer, { marginTop: 20, backgroundColor: 'transparent', borderWidth: 0, padding: 0, shadowOpacity: 0 }]}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{historyOrders.length}</Text>
                        <Text style={styles.statLabel}>Total Pickups</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{totalPoints}</Text>
                        <Text style={styles.statLabel}>Lifetime Points</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.contentSection}>
                <Text style={styles.sectionTitle}>Recent Orders</Text>

                {isOrdersLoading ? (
                    <View style={styles.emptyStateContainer}>
                        <ActivityIndicator size="large" color="#00c853" />
                        <Text style={[styles.emptyStateDescription, { marginTop: 16, marginBottom: 0 }]}>Loading history...</Text>
                    </View>
                ) : historyOrders.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <MaterialCommunityIcons name="history" size={80} color="#263345" style={{ marginBottom: 16 }} />
                        <Text style={styles.emptyStateTitle}>No History found</Text>
                        <Text style={styles.emptyStateDescription}>You don't have any past orders yet.</Text>
                    </View>
                ) : (
                    historyOrders.map((item) => (
                        <View key={item.id} style={styles.historyCard}>
                            <View style={styles.historyCardHeader}>
                                <View>
                                    <Text style={styles.historyOrdId}>{item.id}</Text>
                                    <Text style={styles.historyType}>{item.type}</Text>
                                </View>
                                <View style={[styles.historyStatusBadge, item.status === 'Cancelled' ? styles.statusCancelled : styles.statusCompleted]}>
                                    <Text style={[styles.historyStatusText, item.status === 'Cancelled' ? styles.statusTextCancelled : styles.statusTextCompleted]}>
                                        {item.status}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.historyDivider} />

                            <View style={styles.historyCardBody}>
                                <View style={styles.historyDetailRow}>
                                    <MaterialCommunityIcons name="calendar-clock" size={16} color="#7b8a9e" />
                                    <Text style={styles.historyDetailText}>{item.date}, {item.time}</Text>
                                </View>

                                <View style={styles.historyMetricsRow}>
                                    <View style={styles.historyMetricGroup}>
                                        <MaterialCommunityIcons name="weight" size={16} color="#00c853" />
                                        <Text style={styles.historyMetricText}>{item.weight}</Text>
                                    </View>
                                    <View style={styles.historyMetricGroup}>
                                        <MaterialCommunityIcons name="leaf-circle" size={16} color="#00c853" />
                                        <Text style={styles.historyMetricText}>{item.points}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ))
                )}
            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

const ProfileContent = ({
    profile,
    loading,
    onLogout,
    isEditProfileModalVisible,
    closeEditProfileModal,
    editForm,
    setEditForm,
    handleSaveProfile,
    isChangePasswordModalVisible,
    setIsChangePasswordModalVisible,
    passwordForm,
    setPasswordForm,
    handleChangePassword,
    openEditProfileModal,
    isModifying,
    isLogoutConfirmModalVisible,
    setIsLogoutConfirmModalVisible,
    confirmLogout,
    completedCount,
    collectedKg,
    ecoPoints,
}: {
    profile: ResidentProfile | null;
    loading: boolean;
    onLogout: () => void;
    isEditProfileModalVisible: boolean;
    closeEditProfileModal: () => void;
    editForm: { mobileNo: string; houseNo: string; address: string };
    setEditForm: (form: { mobileNo: string; houseNo: string; address: string }) => void;
    handleSaveProfile: () => void;
    isChangePasswordModalVisible: boolean;
    setIsChangePasswordModalVisible: (visible: boolean) => void;
    passwordForm: { newPassword: string; confirmPassword: string };
    setPasswordForm: (form: { newPassword: string; confirmPassword: string }) => void;
    handleChangePassword: () => void;
    openEditProfileModal: () => void;
    isModifying: boolean;
    isLogoutConfirmModalVisible: boolean;
    setIsLogoutConfirmModalVisible: (visible: boolean) => void;
    confirmLogout: () => void;
    completedCount: number;
    collectedKg: number;
    ecoPoints: number;
}) => {
    const displayName = profile?.name || 'Resident';
    const displayEmail = profile?.email || 'No email available';
    const displayMobileNo = profile?.mobileNo || '-';
    const displayHouseNo = profile?.houseNo || '-';
    const displayAddress = profile?.address || '-';

    return (
        <>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Header Area */}
                <LinearGradient
                    colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                    locations={[0, 0.5, 1]}
                    style={[styles.header, { paddingBottom: 30, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
                >
                    <View style={styles.profileAvatarContainer}>
                        <View style={styles.profileAvatar}>
                            <MaterialCommunityIcons name="account" size={50} color="#00c853" />
                        </View>
                        <View style={styles.profileBadge}>
                            <MaterialCommunityIcons name="check-decagram" size={20} color="#00c853" />
                        </View>
                    </View>
                    <Text style={styles.profileName}>{displayName}</Text>
                    <Text style={styles.profileEmail}>{displayEmail}</Text>

                    <View style={styles.profileRoleTag}>
                        <Text style={styles.profileRoleText}>Resident</Text>
                    </View>
                </LinearGradient>

                <View style={styles.contentSection}>
                    {/* Stats Section */}
                    <Text style={styles.sectionTitle}>Your Impact</Text>
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{collectedKg.toFixed(2)}</Text>
                            <Text style={styles.statLabel}>kg Collected</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{completedCount}</Text>
                            <Text style={styles.statLabel}>Pickups</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{ecoPoints}</Text>
                            <Text style={styles.statLabel}>Eco-Points</Text>
                        </View>
                    </View>

                    {/* Contact & Location */}
                    <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Personal Details</Text>
                    <View style={styles.detailsCard}>
                        {loading && (
                            <View style={styles.profileLoadingRow}>
                                <ActivityIndicator size="small" color="#00c853" />
                                <Text style={styles.profileLoadingText}>Loading profile from Firebase...</Text>
                            </View>
                        )}
                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <MaterialCommunityIcons name="home-outline" size={20} color="#00c853" />
                            </View>
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>House / Flat No.</Text>
                                <Text style={styles.detailValue}>{displayHouseNo}</Text>
                            </View>
                        </View>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <MaterialCommunityIcons name="map-marker-outline" size={20} color="#00c853" />
                            </View>
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Address</Text>
                                <Text style={styles.detailValue}>{displayAddress}</Text>
                            </View>
                        </View>
                        <View style={styles.detailDivider} />
                        <View style={styles.detailRow}>
                            <View style={styles.detailIconBox}>
                                <MaterialCommunityIcons name="phone-outline" size={20} color="#00c853" />
                            </View>
                            <View style={styles.detailTextContainer}>
                                <Text style={styles.detailLabel}>Mobile Number</Text>
                                <Text style={styles.detailValue}>{displayMobileNo}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Actions Menu */}
                    <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Settings</Text>
                    <View style={styles.menuContainer}>
                        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={openEditProfileModal}>
                            <MaterialCommunityIcons name="account-edit-outline" size={24} color="#7b8a9e" />
                            <Text style={styles.menuItemText}>Edit Profile</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7} onPress={() => setIsChangePasswordModalVisible(true)}>
                            <MaterialCommunityIcons name="lock-outline" size={24} color="#7b8a9e" />
                            <Text style={styles.menuItemText}>Change Password</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                            <MaterialCommunityIcons name="help-circle-outline" size={24} color="#7b8a9e" />
                            <Text style={styles.menuItemText}>Help & Support</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
                            <MaterialCommunityIcons name="file-document-outline" size={24} color="#7b8a9e" />
                            <Text style={styles.menuItemText}>Terms & Privacy Policy</Text>
                            <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                        </TouchableOpacity>
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={onLogout}>
                        <MaterialCommunityIcons name="logout" size={20} color="#e53935" />
                        <Text style={styles.logoutButtonText}>Log Out</Text>
                    </TouchableOpacity>

                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={isEditProfileModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={closeEditProfileModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Edit Profile</Text>
                                    <TouchableOpacity onPress={closeEditProfileModal}>
                                        <MaterialCommunityIcons name="close" size={24} color="#d0d8e4" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                    <View style={styles.modalInputGroup}>
                                        <Text style={styles.modalLabel}>Mobile Number</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            placeholder="Enter mobile number"
                                            placeholderTextColor="#7A8A99"
                                            value={editForm.mobileNo}
                                            onChangeText={(text) => setEditForm({ ...editForm, mobileNo: text })}
                                            keyboardType="phone-pad"
                                        />
                                    </View>

                                    <View style={styles.modalInputGroup}>
                                        <Text style={styles.modalLabel}>House Number</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            placeholder="Enter house number"
                                            placeholderTextColor="#7A8A99"
                                            value={editForm.houseNo}
                                            onChangeText={(text) => setEditForm({ ...editForm, houseNo: text })}
                                        />
                                    </View>

                                    <View style={styles.modalInputGroup}>
                                        <Text style={styles.modalLabel}>Address</Text>
                                        <TextInput
                                            style={[styles.modalInput, { height: 100, textAlignVertical: 'top' }]}
                                            placeholder="Enter address"
                                            placeholderTextColor="#7A8A99"
                                            value={editForm.address}
                                            onChangeText={(text) => setEditForm({ ...editForm, address: text })}
                                            multiline
                                        />
                                    </View>

                                    <TouchableOpacity onPress={handleSaveProfile} activeOpacity={0.8} disabled={isModifying}>
                                        <LinearGradient
                                            colors={isModifying ? ['#16362a', '#0e2419'] : ['#00c853', '#1b8a2a']}
                                            style={styles.modalButton}
                                        >
                                            {isModifying ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Text style={styles.modalButtonText}>Save Changes</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            {/* Change Password Modal */}
            <Modal
                visible={isChangePasswordModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsChangePasswordModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    style={styles.modalOverlay}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Change Password</Text>
                                    <TouchableOpacity onPress={() => setIsChangePasswordModalVisible(false)}>
                                        <MaterialCommunityIcons name="close" size={24} color="#d0d8e4" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                    <View style={styles.modalInputGroup}>
                                        <Text style={styles.modalLabel}>New Password</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            placeholder="Enter new password"
                                            placeholderTextColor="#7A8A99"
                                            value={passwordForm.newPassword}
                                            onChangeText={(text) => setPasswordForm({ ...passwordForm, newPassword: text })}
                                            secureTextEntry
                                        />
                                    </View>

                                    <View style={styles.modalInputGroup}>
                                        <Text style={styles.modalLabel}>Confirm Password</Text>
                                        <TextInput
                                            style={styles.modalInput}
                                            placeholder="Confirm new password"
                                            placeholderTextColor="#7A8A99"
                                            value={passwordForm.confirmPassword}
                                            onChangeText={(text) => setPasswordForm({ ...passwordForm, confirmPassword: text })}
                                            secureTextEntry
                                        />
                                    </View>

                                    {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword && (
                                        <Text style={styles.successText}>Passwords match ✓</Text>
                                    )}

                                    <TouchableOpacity onPress={handleChangePassword} activeOpacity={0.8} disabled={isModifying}>
                                        <LinearGradient
                                            colors={isModifying ? ['#16362a', '#0e2419'] : ['#00c853', '#1b8a2a']}
                                            style={styles.modalButton}
                                        >
                                            {isModifying ? (
                                                <ActivityIndicator size="small" color="#FFFFFF" />
                                            ) : (
                                                <Text style={styles.modalButtonText}>Change Password</Text>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
            </Modal>

            {/* Logout Confirmation Modal */}
            <Modal
                visible={isLogoutConfirmModalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setIsLogoutConfirmModalVisible(false)}
            >
                <TouchableWithoutFeedback onPress={() => setIsLogoutConfirmModalVisible(false)}>
                    <View style={styles.confirmModalOverlay}>
                        <TouchableWithoutFeedback onPress={() => {}}>
                            <View style={styles.confirmModalContent}>
                                <MaterialCommunityIcons name="logout" size={40} color="#e53935" style={{ marginBottom: 16 }} />
                                <Text style={styles.confirmModalTitle}>Confirm Logout</Text>
                                <Text style={styles.confirmModalText}>Are you sure you want to logout from your account?</Text>
                                
                                <View style={styles.confirmModalButtons}>
                                    <TouchableOpacity
                                        style={styles.confirmModalCancelButton}
                                        onPress={() => setIsLogoutConfirmModalVisible(false)}
                                    >
                                        <Text style={styles.confirmModalCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.confirmModalConfirmButton}
                                        onPress={confirmLogout}
                                    >
                                        <Text style={styles.confirmModalConfirmText}>Logout</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
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
        position: 'relative',
    },
    header: {
        width: '100%',
        paddingTop: 10,
        paddingBottom: 20,
        alignItems: 'center',
        paddingHorizontal: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    logoContainer: {
        alignItems: 'center',
        zIndex: 10,
    },
    logoImage: {
        width: 200,
        height: 130,
        marginBottom: 10,
    },
    taglineContainer: {
        alignItems: 'center',
    },
    taglineStart: {
        fontSize: 18,
        color: '#ffffffff',
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    taglineEnd: {
        fontSize: 18,
        color: '#ffffffff',
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    bgIcon: {
        position: 'absolute',
    },
    divider: {
        height: 1,
        backgroundColor: '#1c2a3a',
        width: '100%',
    },
    scrollContent: {
        paddingBottom: 100, // Space for bottom nav
    },
    contentSection: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#d0d8e4',
        marginBottom: 12,
    },
    card: {
        width: '100%',
        borderRadius: 16,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,200,83,0.16)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    iconBox: {
        width: 54,
        height: 54,
        borderRadius: 16,
        overflow: 'hidden',
    },
    iconGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,200,83,0.22)',
        borderRadius: 16,
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#e0eee6',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#7b8a9e',
    },
    contributionContainer: {
        alignItems: 'center',
        paddingBottom: 10,
    },
    circularProgress: {
        width: 130,
        height: 130,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    ringBackground: {
        position: 'absolute',
        width: 112,
        height: 112,
        borderRadius: 56,
        borderWidth: 6,
        borderColor: '#06e524ff',
    },
    ringProgress: {
        position: 'absolute',
        width: 112,
        height: 112,
        borderRadius: 56,
        borderWidth: 6,
        borderColor: '#06e524ff',
        borderLeftColor: 'transparent', // Simple visual hack for "progress"
        borderBottomColor: 'transparent',
        transform: [{ rotate: '-45deg' }],
    },
    innerCircle: {
        alignItems: 'center',
    },
    contributionValue: {
        fontSize: 28,
        fontWeight: '700',
        color: '#e0f0e8',
        lineHeight: 34,
    },
    contributionUnit: {
        fontSize: 15,
        color: '#7b8a9e',
        marginTop: 2,
    },
    wasteTypeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 14,
    },
    wasteTypeText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#7aaa8e',
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        backgroundColor: 'rgba(11,17,32,0.95)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,200,83,0.12)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 10, // Safe area padding manual adjustment
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingHorizontal: 12,
    },
    navIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    navIconActive: {
        // Gradient background handled by child LinearGradient
    },
    navLabel: {
        fontSize: 11,
        color: '#3e5068',
        fontWeight: '400',
        letterSpacing: 0.2,
    },
    navLabelActive: {
        color: '#00c853',
        fontWeight: '700',
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
        paddingBottom: 100,
    },
    emptyStateImageContainer: {
        width: 140,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        position: 'relative',
    },
    emptyStateIconOverlay: {
        position: 'absolute',
        right: -10,
        bottom: 10,
        backgroundColor: '#00c853',
        borderRadius: 12,
        padding: 4,
    },
    emptyStateTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#e0eee6',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyStateDescription: {
        fontSize: 16,
        color: '#7b8a9e',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    scheduleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginBottom: 16,
    },
    scheduleButtonText: {
        color: '#0b1120',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyStateFooter: {
        fontSize: 13,
        color: '#3e5068',
    },
    orderCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,200,83,0.16)',
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    orderId: {
        color: '#7b8a9e',
        fontSize: 14,
    },
    orderStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    orderStatusText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    orderStatusScheduledBadge: {
        backgroundColor: 'rgba(0, 200, 83, 0.12)',
        borderColor: 'rgba(0, 200, 83, 0.35)',
    },
    orderStatusScheduledText: {
        color: '#00e676',
    },
    orderStatusInProgressBadge: {
        backgroundColor: 'rgba(255, 193, 7, 0.14)',
        borderColor: 'rgba(255, 193, 7, 0.4)',
    },
    orderStatusInProgressText: {
        color: '#ffd54f',
    },
    orderStatusDefaultBadge: {
        backgroundColor: 'rgba(66, 165, 245, 0.14)',
        borderColor: 'rgba(66, 165, 245, 0.42)',
    },
    orderStatusDefaultText: {
        color: '#90caf9',
    },
    orderType: {
        color: '#e0eee6',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 12,
    },
    orderFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    orderDate: {
        color: '#7b8a9e',
        fontSize: 14,
    },
    orderCancelButton: {
        marginTop: 14,
        borderWidth: 1,
        borderColor: 'rgba(229, 57, 53, 0.45)',
        borderRadius: 10,
        paddingVertical: 10,
        alignItems: 'center',
        backgroundColor: 'rgba(229, 57, 53, 0.08)',
    },
    orderCancelButtonText: {
        color: '#ff8a80',
        fontSize: 14,
        fontWeight: '700',
    },
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderTitle: {
        color: '#3e5068',
        fontSize: 18,
    },
    inputLabel: {
        fontSize: 16,
        color: '#d0d8e4',
        marginBottom: 10,
        fontWeight: '600',
    },
    inputHint: {
        fontSize: 13,
        color: '#7b8a9e',
        marginTop: -4,
        marginBottom: 10,
    },
    pickerContainer: {
        marginTop: 10,
        backgroundColor: '#0f1a26',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#263345',
        paddingHorizontal: 8,
        paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    },
    inputCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f1a26',
        borderWidth: 1,
        borderColor: '#263345',
        borderRadius: 12,
        padding: 16,
        gap: 16,
    },
    inputCardError: {
        borderColor: '#e53935',
        backgroundColor: 'rgba(229, 57, 53, 0.05)',
    },
    // --- Profile Specific Styles ---
    profileAvatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    profileAvatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,200,83,0.1)',
        borderWidth: 2,
        borderColor: '#00c853',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#00c853',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    profileBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#0b1120',
        borderRadius: 12,
        padding: 2,
    },
    profileName: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    profileEmail: {
        fontSize: 15,
        color: '#a0aec0',
        marginBottom: 12,
    },
    profileRoleTag: {
        backgroundColor: 'rgba(0,200,83,0.2)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,200,83,0.5)',
    },
    profileRoleText: {
        color: '#00e676',
        fontWeight: '600',
        fontSize: 13,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: '#0f1a26',
        borderRadius: 16,
        padding: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#263345',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: '#00c853',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#7b8a9e',
        textAlign: 'center',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#263345',
    },
    detailsCard: {
        backgroundColor: '#0f1a26',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#263345',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    detailIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,200,83,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    detailTextContainer: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 13,
        color: '#7b8a9e',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 16,
        color: '#e0eee6',
        fontWeight: '500',
        lineHeight: 22,
    },
    detailDivider: {
        height: 1,
        backgroundColor: '#263345',
        marginLeft: 56, // Align with text
    },
    menuContainer: {
        backgroundColor: '#0f1a26',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#263345',
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#263345',
    },
    menuItemText: {
        flex: 1,
        fontSize: 16,
        color: '#e0eee6',
        marginLeft: 16,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 32,
        marginBottom: 20,
        paddingVertical: 16,
        backgroundColor: 'rgba(229, 57, 53, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(229, 57, 53, 0.3)',
    },
    logoutButtonText: {
        color: '#e53935',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    // --- History Specific Styles ---
    historyCard: {
        backgroundColor: '#0f1a26',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#263345',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    historyCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    historyOrdId: {
        fontSize: 12,
        color: '#7b8a9e',
        marginBottom: 4,
        fontWeight: '600',
    },
    historyType: {
        fontSize: 16,
        fontWeight: '700',
        color: '#e0eee6',
    },
    historyStatusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusCompleted: {
        backgroundColor: 'rgba(0, 200, 83, 0.1)',
        borderColor: 'rgba(0, 200, 83, 0.3)',
    },
    statusCancelled: {
        backgroundColor: 'rgba(229, 57, 53, 0.1)',
        borderColor: 'rgba(229, 57, 53, 0.3)',
    },
    historyStatusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusTextCompleted: {
        color: '#00e676',
    },
    statusTextCancelled: {
        color: '#ff5252',
    },
    historyDivider: {
        height: 1,
        backgroundColor: '#1c2a3a',
        marginBottom: 12,
    },
    historyCardBody: {
        gap: 8,
    },
    historyDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    historyDetailText: {
        fontSize: 14,
        color: '#a0aec0',
    },
    profileLoadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
    },
    profileLoadingText: {
        color: '#7b8a9e',
        fontSize: 13,
    },
    historyMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        gap: 24,
        marginTop: 4,
    },
    historyMetricGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    historyMetricText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e0eee6',
    },
    inputText: {
        color: '#e0eee6',
        fontSize: 16,
        fontWeight: '500',
    },
    placeholderText: {
        color: '#5c6b7f',
    },
    errorText: {
        color: '#ff4d4f',
    },
    errorLabel: {
        fontSize: 12,
        color: '#ff4d4f',
        marginTop: 6,
        marginLeft: 4,
    },
    confirmButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1e4a32',
    },
    confirmButtonDisabled: {
        borderColor: '#1e4a32',
    },
    confirmButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    confirmButtonTextDisabled: {
        color: '#8ba696',
    },
    payNowButton: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    payNowGradient: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    payNowButtonText: {
        color: '#0b1120',
        fontSize: 14,
        fontWeight: '700',
    },
    paidBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 200, 83, 0.12)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 200, 83, 0.35)',
    },
    paidBadgeText: {
        color: '#00e676',
        fontSize: 14,
        fontWeight: '700',
    },
    timeRowsContainer: {
        gap: 0,
    },
    timeRow: {
        // marginBottom: 0,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f1a26',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#263345',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#e0eee6',
    },
    modalBody: {
        padding: 20,
    },
    modalInputGroup: {
        marginBottom: 20,
    },
    modalLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#d0d8e4',
        marginBottom: 8,
    },
    modalInput: {
        backgroundColor: '#1a2332',
        borderWidth: 1,
        borderColor: '#263345',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#e0eee6',
        fontSize: 16,
    },
    modalButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 40,
    },
    modalButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    successText: {
        color: '#00c853',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
        fontWeight: '600',
    },
    confirmModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    confirmModalContent: {
        backgroundColor: '#0f1a26',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
    },
    confirmModalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#e0eee6',
        marginBottom: 12,
    },
    confirmModalText: {
        fontSize: 14,
        color: '#7b8a9e',
        textAlign: 'center',
        marginBottom: 24,
    },
    confirmModalButtons: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    confirmModalCancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#263345',
        alignItems: 'center',
    },
    confirmModalCancelText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#7b8a9e',
    },
    confirmModalConfirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        backgroundColor: '#e53935',
        alignItems: 'center',
    },
    confirmModalConfirmText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 180, 80, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(0, 180, 80, 0.12)',
        borderRadius: 8,
        padding: 12,
        gap: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#7aaa8e',
        lineHeight: 20,
        flex: 1,
    },
    pointDetailCard: {
        backgroundColor: '#162332',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginHorizontal: 10,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 200, 83, 0.2)',
    },
    pointLabel: {
        color: '#7b8a9e',
        fontSize: 14,
        marginBottom: 8,
    },
    pointValue: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 12,
    },
    weekText: {
        color: '#00c853',
        fontSize: 12,
        fontWeight: '600',
    },
});
