import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    Linking,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemeContext } from './context/ThemeContext';
import { auth, db } from './firebaseConfig';
import authService from './services/authService';

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
}

export default function HomeScreen() {
    const { colors, isDark } = React.useContext(ThemeContext);
    const [activeTab, setActiveTab] = useState('home');
    const [orders, setOrders] = useState<Order[]>([]);

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

    const handleConfirmBooking = () => {
        if (!selectedDate || !startTime || !endTime) return;

        const timeString = `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const newOrder: Order = {
            id: Math.random().toString(36).substr(2, 9).toUpperCase(),
            type: 'Scrap/Recyclable Waste',
            date: selectedDate.toLocaleDateString(),
            time: timeString,
            status: 'Scheduled',
        };
        setOrders([newOrder, ...orders]);
        setIsBooking(false);
        setActiveTab('orders');
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

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
        if (isBooking) setIsBooking(false);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <View style={[styles.container, { backgroundColor: colors.background }]}>

                {activeTab === 'home' && !isBooking && (
                    <HomeContent onBookAppointment={handleStartBooking} />
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
                    <OrdersContent orders={orders} onSchedulePickup={handleSchedulePickup} />
                )}

                {/* Additional Tabs */}
                {activeTab === 'history' && <HistoryContent />}
                {activeTab === 'profile' && <ProfileContent />}

                {/* Bottom Navigation */}
                <View style={[styles.bottomNav, { backgroundColor: colors.navBg, borderTopColor: colors.navBorder }]}>
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
                                        colors={isActive ? [colors.navIconActiveBgGradStart, colors.navIconActiveBgGradEnd] : ['transparent', 'transparent']}
                                        style={StyleSheet.absoluteFillObject}
                                    />
                                    <MaterialCommunityIcons
                                        name={isActive ? (item.iconActive as any) : (item.icon as any)}
                                        size={24}
                                        color={isActive ? colors.primary : colors.navIcon}
                                    />
                                </View>
                                <Text style={[styles.navLabel, isActive && styles.navLabelActive, !isActive && { color: colors.navIcon }]}>
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

const HomeContent = ({ onBookAppointment }: { onBookAppointment: () => void }) => {
    const { isDark, colors } = React.useContext(ThemeContext);
    const handleUPIPayment = async () => {
        try {
            const docRef = doc(db, 'system', 'payment_settings');
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists() || !docSnap.data().official_upi_id) {
                Alert.alert("Notice", "The official has not set up their receiving UPI details yet.");
                return;
            }

            const data = docSnap.data();
            const officialUpi = data.official_upi_id;
            const officialName = data.official_bank_name;

            const payeeName = officialName ? encodeURIComponent(officialName) : encodeURIComponent('Haritham Official Collection');

            // Example UPI URI structure using the dynamically fetched ID
            const upiUri = `upi://pay?pa=${officialUpi}&pn=${payeeName}&am=1.00&cu=INR`;

            const supported = await Linking.canOpenURL(upiUri);
            if (supported) {
                await Linking.openURL(upiUri);
            } else {
                Alert.alert("Error", "No UPI app found on this device.");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to construct or open UPI app intent.");
            console.error("UPI Error: ", error);
        }
    };

    return (
        <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#0a3f18', '#0d2f16', '#0b1a12', '#0b1120'] : [colors.headerGrad1, colors.headerGrad2, colors.headerGrad3, colors.headerGrad4]}
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
                        <Text style={[styles.taglineStart, { color: isDark ? '#ffffff' : colors.text }]}>Your Waste</Text>
                        <Text style={[styles.taglineEnd, { color: isDark ? '#ffffff' : colors.text }]}>Our Responsibility</Text>
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
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Book Your Appointment</Text>
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
                <Text style={[styles.sectionTitle, { marginTop: 32, color: colors.textSecondary }]}>Collection Points Near Me</Text>
                <TouchableOpacity activeOpacity={0.9} onPress={() => Alert.alert('Coming Soon', 'Collection points feature is under development.')}>
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
                                <MaterialCommunityIcons name="map-marker-outline" size={28} color="#00c853" />
                            </LinearGradient>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Find Collection Points</Text>
                            <Text style={styles.cardSubtitle}>Locate nearby waste collection centers</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#00c853" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Your Contribution Section */}
                <Text style={[styles.sectionTitle, { marginTop: 32, marginBottom: 20, color: colors.textSecondary }]}>Your Contribution</Text>
                <View style={styles.contributionContainer}>
                    {/* Circular Progress Mock */}
                    <View style={styles.circularProgress}>
                        <View style={styles.innerCircle}>
                            <Text style={[styles.contributionValue, { color: colors.text }]}>0.00</Text>
                            <Text style={[styles.contributionUnit, { color: colors.textSecondary }]}>kg</Text>
                        </View>
                        {/* Ring borders */}
                        <View style={styles.ringBackground} />
                        <View style={styles.ringProgress} />
                    </View>

                    <View style={styles.wasteTypeTag}>
                        <MaterialCommunityIcons name="leaf" size={14} color="#00c853" />
                        <Text style={[styles.wasteTypeText, { color: colors.textSecondary }]}>Scrap Waste</Text>
                    </View>
                </View>

                {/* Payments Section */}
                <Text style={[styles.sectionTitle, { marginTop: 32, color: colors.textSecondary }]}>Payments & Bills</Text>
                <TouchableOpacity activeOpacity={0.9} onPress={handleUPIPayment}>
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
                                <MaterialCommunityIcons name="credit-card-outline" size={28} color="#00c853" />
                            </LinearGradient>
                        </View>
                        <View style={styles.cardContent}>
                            <Text style={styles.cardTitle}>Make a Payment</Text>
                            <Text style={styles.cardSubtitle}>Pay securely via UPI (GPay, PhonePe, etc.)</Text>
                        </View>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#00c853" />
                    </LinearGradient>
                </TouchableOpacity>

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
    const { isDark, colors } = React.useContext(ThemeContext);
    const isConfirmEnabled = selectedDate && startTime && endTime;

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <LinearGradient
                colors={isDark ? ['#0a3f18', '#0d2f16', '#0b1a12'] : [colors.headerGrad1, colors.headerGrad2, colors.headerGrad3]}
                locations={[0, 0.5, 1]}
                style={[styles.header, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <Text style={[styles.profileName, { color: isDark ? '#ffffff' : colors.text }]}>Schedule Pickup</Text>
                <Text style={[styles.profileEmail, { color: isDark ? '#a0aec0' : colors.textSecondary }]}>Select a convenient time for collection</Text>
            </LinearGradient>

            <View style={styles.contentSection}>
                {/* Date Selection */}
                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Select Date</Text>
                <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: isDark ? '#0f1a26' : colors.cardBg }]}>
                    <View style={[styles.iconBox, { width: 48, height: 48 }]}>
                        <LinearGradient colors={['rgba(0,200,83,0.2)', 'rgba(0,200,83,0.05)']} style={styles.iconGradient}>
                            <MaterialCommunityIcons name="calendar-month" size={24} color="#00c853" />
                        </LinearGradient>
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={selectedDate ? [styles.inputText, { color: colors.text }] : styles.placeholderText}>
                            {selectedDate ? selectedDate.toLocaleDateString() : 'Choose a date'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={() => onDateChange(new Date())}>
                        <Text style={{ color: '#00c853', fontWeight: '600' }}>Select</Text>
                    </TouchableOpacity>
                </View>

                {/* Time Selection */}
                <Text style={[styles.inputLabel, { marginTop: 24, color: colors.textSecondary }]}>Select Time Window</Text>

                <View style={styles.timeRowsContainer}>
                    {/* Start Time */}
                    <View style={styles.timeRow}>
                        <Text style={[styles.inputLabel, { fontSize: 13, color: colors.textMuted, marginBottom: 8, marginTop: 8 }]}>From Time</Text>
                        <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: isDark ? '#0f1a26' : colors.cardBg }]}>
                            <View style={[styles.iconBox, { width: 48, height: 48 }]}>
                                <LinearGradient colors={['rgba(0,200,83,0.2)', 'rgba(0,200,83,0.05)']} style={styles.iconGradient}>
                                    <MaterialCommunityIcons name="clock-start" size={24} color="#00c853" />
                                </LinearGradient>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={startTime ? [styles.inputText, { color: colors.text }] : styles.placeholderText}>
                                    {startTime ? startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Start Time'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => onStartTimeChange(new Date(new Date().setHours(9, 0, 0, 0)))}>
                                <Text style={{ color: '#00c853', fontWeight: '600' }}>Select</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* End Time */}
                    <View style={styles.timeRow}>
                        <Text style={[styles.inputLabel, { fontSize: 13, color: colors.textMuted, marginBottom: 8, marginTop: 16 }]}>To Time</Text>
                        <View style={[styles.card, { borderColor: colors.cardBorder, backgroundColor: isDark ? '#0f1a26' : colors.cardBg }]}>
                            <View style={[styles.iconBox, { width: 48, height: 48 }]}>
                                <LinearGradient colors={['rgba(0,200,83,0.2)', 'rgba(0,200,83,0.05)']} style={styles.iconGradient}>
                                    <MaterialCommunityIcons name="clock-end" size={24} color="#00c853" />
                                </LinearGradient>
                            </View>
                            <View style={styles.cardContent}>
                                <Text style={endTime ? [styles.inputText, { color: colors.text }] : styles.placeholderText}>
                                    {endTime ? endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'End Time'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => {
                                const end = new Date();
                                end.setHours(11, 0, 0, 0);
                                onEndTimeChange(end);
                            }}>
                                <Text style={{ color: '#00c853', fontWeight: '600' }}>Select</Text>
                            </TouchableOpacity>
                        </View>
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


const OrdersContent = ({ orders, onSchedulePickup }: { orders: Order[], onSchedulePickup: () => void }) => {
    const { isDark, colors } = React.useContext(ThemeContext);
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

                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Orders Yet</Text>
                <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>
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
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Your Orders ({orders.length})</Text>
                {orders.map((order) => (
                    <LinearGradient
                        key={order.id}
                        colors={isDark ? ['#0f2d1a', '#0c1e14', '#0b1518'] : [colors.cardBg, colors.cardBg, colors.cardBg]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.orderCard, { borderColor: colors.cardBorder }]}
                    >
                        <View style={styles.orderHeader}>
                            <Text style={styles.orderId}>Order #{order.id}</Text>
                            <Text style={styles.orderStatus}>{order.status}</Text>
                        </View>
                        <Text style={[styles.orderType, { color: colors.text }]}>{order.type}</Text>
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
                    </LinearGradient>
                ))}
            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

const PlaceholderContent = ({ title }: { title: string }) => (
    <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>{title} Coming Soon</Text>
    </View>
);

const MOCK_HISTORY_DATA = [
    {
        id: 'ORD-99382',
        type: 'Scrap/Recyclable Waste',
        date: '12 Feb 2024',
        time: '10:30 AM',
        status: 'Completed',
        weight: '15.5 kg',
        points: '+45 Points'
    },
    {
        id: 'ORD-88271',
        type: 'E-Waste Collection',
        date: '28 Jan 2024',
        time: '02:15 PM',
        status: 'Completed',
        weight: '5.2 kg',
        points: '+20 Points'
    },
    {
        id: 'ORD-77160',
        type: 'Scrap/Recyclable Waste',
        date: '10 Jan 2024',
        time: '11:00 AM',
        status: 'Cancelled',
        weight: '-',
        points: '0 Points'
    },
    {
        id: 'ORD-66059',
        type: 'Bulk Waste',
        date: '15 Dec 2023',
        time: '09:45 AM',
        status: 'Completed',
        weight: '45.0 kg',
        points: '+150 Points'
    }
];

const HistoryContent = () => {
    const { isDark, colors } = React.useContext(ThemeContext);
    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header / Summary Area */}
            <LinearGradient
                colors={isDark ? ['#0a3f18', '#0d2f16', '#0b1a12'] : [colors.headerGrad1, colors.headerGrad2, colors.headerGrad3]}
                locations={[0, 0.5, 1]}
                style={[styles.header, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <Text style={[styles.profileName, { color: isDark ? '#ffffff' : colors.text }]}>Collection History</Text>
                <Text style={[styles.profileEmail, { color: isDark ? '#a0aec0' : colors.textSecondary }]}>Your past waste management activities</Text>

                <View style={[styles.statsContainer, { marginTop: 20, backgroundColor: 'transparent', borderWidth: 0, padding: 0, shadowOpacity: 0 }]}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>12</Text>
                        <Text style={styles.statLabel}>Total Pickups</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>340</Text>
                        <Text style={styles.statLabel}>Lifetime Points</Text>
                    </View>
                </View>
            </LinearGradient>

            <View style={styles.contentSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Recent Orders</Text>

                {MOCK_HISTORY_DATA.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                        <MaterialCommunityIcons name="history" size={80} color={colors.navIcon} style={{ marginBottom: 16 }} />
                        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No History found</Text>
                        <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>You don't have any past orders yet.</Text>
                    </View>
                ) : (
                    MOCK_HISTORY_DATA.map((item) => (
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

const ProfileContent = () => {
    const { isDark, toggleTheme, colors } = React.useContext(ThemeContext);
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<any>(null);

    React.useEffect(() => {
        const fetchUserData = async () => {
            const userEmail = auth.currentUser?.email;
            if (userEmail) {
                try {
                    const docRef = doc(db, 'users', userEmail.toLowerCase());
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setUserProfile(docSnap.data());
                    }
                } catch (error) {
                    console.error("Error fetching user profile:", error);
                }
            }
        };
        fetchUserData();
    }, []);

    const handleLogout = async () => {
        try {
            await authService.logout();
            router.replace('/login');
        } catch (error) {
            Alert.alert("Error", "Failed to logout.");
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header Area */}
            <LinearGradient
                colors={isDark ? ['#0a3f18', '#0d2f16', '#0b1a12'] : [colors.headerGrad1, colors.headerGrad2, colors.headerGrad3]}
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
                <Text style={[styles.profileName, { color: isDark ? '#ffffff' : colors.text }]}>{userProfile?.name || 'Loading...'}</Text>
                <Text style={[styles.profileEmail, { color: isDark ? '#a0aec0' : colors.textSecondary }]}>{userProfile?.email || ''}</Text>

                <View style={styles.profileRoleTag}>
                    <Text style={styles.profileRoleText}>{userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : 'Resident'}</Text>
                </View>
            </LinearGradient>

            <View style={styles.contentSection}>
                {/* Stats Section */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Your Impact</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>45</Text>
                        <Text style={styles.statLabel}>kg Collected</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>12</Text>
                        <Text style={styles.statLabel}>Pickups</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>120</Text>
                        <Text style={styles.statLabel}>Eco-Points</Text>
                    </View>
                </View>

                {/* Contact & Location */}
                <Text style={[styles.sectionTitle, { marginTop: 32, color: colors.textSecondary }]}>Personal Details</Text>
                <View style={[styles.detailsCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                    <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                            <MaterialCommunityIcons name="home-outline" size={20} color="#00c853" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailLabel}>House / Flat No.</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{userProfile?.houseNo || 'Not Provided'}</Text>
                        </View>
                    </View>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                            <MaterialCommunityIcons name="map-marker-outline" size={20} color="#00c853" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailLabel}>Address</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{userProfile?.address || 'Not Provided'}</Text>
                        </View>
                    </View>
                    <View style={styles.detailDivider} />
                    <View style={styles.detailRow}>
                        <View style={styles.detailIconBox}>
                            <MaterialCommunityIcons name="phone-outline" size={20} color="#00c853" />
                        </View>
                        <View style={styles.detailTextContainer}>
                            <Text style={styles.detailLabel}>Phone Number</Text>
                            <Text style={[styles.detailValue, { color: colors.text }]}>{userProfile?.phone || 'Not Provided'}</Text>
                        </View>
                    </View>
                </View>

                {/* Actions Menu */}
                <Text style={[styles.sectionTitle, { marginTop: 32, color: colors.textSecondary }]}>Settings</Text>
                <View style={styles.menuContainer}>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Edit Profile is under development.')}>
                        <MaterialCommunityIcons name="account-edit-outline" size={24} color="#7b8a9e" />
                        <Text style={[styles.menuItemText, { color: colors.text }]}>Edit Profile</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Change Password is under development.')}>
                        <MaterialCommunityIcons name="lock-outline" size={24} color="#7b8a9e" />
                        <Text style={[styles.menuItemText, { color: colors.text }]}>Change Password</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Help & Support is under development.')}>
                        <MaterialCommunityIcons name="help-circle-outline" size={24} color="#7b8a9e" />
                        <Text style={[styles.menuItemText, { color: colors.text }]}>Help & Support</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Terms & Privacy Policy is under development.')}>
                        <MaterialCommunityIcons name="file-document-outline" size={24} color="#7b8a9e" />
                        <Text style={[styles.menuItemText, { color: colors.text }]}>Terms & Privacy Policy</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                    </TouchableOpacity>
                    <View style={[styles.menuItem, { justifyContent: 'space-between', backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="theme-light-dark" size={24} color="#7b8a9e" style={{ marginRight: 16 }} />
                            <Text style={[styles.menuItemText, { marginLeft: 0, color: colors.text }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#7b8a9e', true: '#00c853' }}
                            thumbColor={'#ffffff'}
                        />
                    </View>
                </View>

                {/* Logout Button */}
                <TouchableOpacity style={styles.logoutButton} activeOpacity={0.8} onPress={handleLogout}>
                    <MaterialCommunityIcons name="logout" size={20} color="#e53935" />
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>

            </View>
            <View style={{ height: 100 }} />
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
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    taglineEnd: {
        fontSize: 18,
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
    orderStatus: {
        color: '#00c853',
        fontWeight: '600',
        fontSize: 14,
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
    placeholderContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        color: '#3e5068',
        fontSize: 18,
    },
    inputLabel: {
        fontSize: 16,
        color: '#d0d8e4',
        marginBottom: 10,
        fontWeight: '600',
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
    timeRowsContainer: {
        gap: 0, // Using margins on labels instead for spacing
    },
    timeRow: {
        //marginBottom: 0,
    },
});
