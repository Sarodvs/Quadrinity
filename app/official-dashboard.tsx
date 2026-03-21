import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Modal,
    Switch,
} from 'react-native';
import authService from './services/authService';
import { ThemeContext } from './context/ThemeContext';
import { auth, db } from './firebaseConfig';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Calendar } from 'react-native-calendars';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');

const OFFICIAL_NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { id: 'schedule', label: 'Schedule', icon: 'clipboard-list-outline', iconActive: 'clipboard-list' },
    { id: 'availability', label: 'Availability', icon: 'calendar-clock-outline', iconActive: 'calendar-clock' },
    { id: 'payment', label: 'Payment', icon: 'bank-outline', iconActive: 'bank' },
    { id: 'settings', label: 'Settings', icon: 'cog-outline', iconActive: 'cog' },
];

export default function OfficialDashboardScreen() {
    const { colors, isDark } = React.useContext(ThemeContext);
    const [activeTab, setActiveTab] = useState('home');

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <KeyboardAvoidingView
                style={[styles.container, { backgroundColor: colors.background }]}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {activeTab === 'home' && <OfficialHomeContent />}
                {activeTab === 'schedule' && <OfficialScheduleContent />}
                {activeTab === 'availability' && <OfficialAvailabilityContent />}
                {activeTab === 'payment' && <OfficialPaymentContent />}
                {activeTab === 'settings' && <OfficialSettingsContent />}

                {/* Bottom Navigation */}
                <View style={[styles.bottomNav, { backgroundColor: colors.navBg, borderTopColor: colors.navBorder }]}>
                    {OFFICIAL_NAV_ITEMS.map((item) => {
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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// -----------------------------------------------------
// OfficialHomeContent
// -----------------------------------------------------
const OfficialHomeContent = () => {
    const { colors, isDark } = React.useContext(ThemeContext);
    const [isOnline, setIsOnline] = useState(false);
    
    const [scanned, setScanned] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [permission, requestPermission] = useCameraPermissions();
    const [scannedUser, setScannedUser] = useState<any>(null);
    const [isUserModalVisible, setIsUserModalVisible] = useState(false);

    const handleScanQR = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert("Permission required", "Camera permission is needed to scan QR codes.");
                return;
            }
        }
        setScanned(false);
        setIsScannerOpen(true);
    };

    const handleBarCodeScanned = async ({ type, data }: { type: string, data: string }) => {
        setScanned(true);
        setIsScannerOpen(false);
        try {
            const userEmail = data.toLowerCase();
            const userDoc = await getDoc(doc(db, 'users', userEmail));
            if (userDoc.exists()) {
                setScannedUser(userDoc.data());
                setIsUserModalVisible(true);
            } else {
                Alert.alert("Error", "Resident not found!");
            }
        } catch (error) {
            Alert.alert("Error", "Failed to fetch resident details.");
        }
    };

    const handleNavigation = () => {
        Alert.alert("Navigation", "Opening map to next destination...");
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
                        <MaterialCommunityIcons name="shield-account" size={50} color="#00c853" />
                    </View>
                    <View style={styles.profileBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={20} color="#00c853" />
                    </View>
                </View>
                <Text style={[styles.profileName, { color: isDark ? '#ffffff' : colors.text }]}>Official Dashboard</Text>
                <Text style={[styles.profileEmail, { color: isDark ? '#a0aec0' : colors.textSecondary }]}>Manage Collections & Payments</Text>

                <View style={styles.profileRoleTag}>
                    <Text style={styles.profileRoleText}>Authorized Official</Text>
                </View>
            </LinearGradient>

            <View style={styles.contentSection}>
                {/* Status Toggle */}
                <View style={styles.statusContainer}>
                    <View>
                        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Duty Status</Text>
                        <Text style={[styles.cardDescriptor, { color: colors.textSecondary }]}>Real-time tracking is {isOnline ? 'active' : 'paused'}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.statusToggle, isOnline ? styles.statusOnline : styles.statusOffline]}
                        onPress={() => setIsOnline(!isOnline)}
                        activeOpacity={0.8}
                    >
                        <MaterialCommunityIcons name={isOnline ? "radiobox-marked" : "pause-circle"} size={20} color="#fff" />
                        <Text style={styles.statusText}>{isOnline ? "Active" : "Offline"}</Text>
                    </TouchableOpacity>
                </View>

                {/* Quick Actions */}
                <Text style={[styles.sectionTitle, { marginTop: 32, color: colors.textSecondary }]}>Quick Actions</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity style={styles.actionCard} onPress={handleScanQR} activeOpacity={0.8}>
                        <LinearGradient colors={['#0a2e3f', '#071d29']} style={styles.actionCardGradient}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(79, 195, 247, 0.15)' }]}>
                                <MaterialCommunityIcons name="qrcode-scan" size={28} color="#4fc3f7" />
                            </View>
                            <Text style={styles.actionCardText}>Scan QR</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionCard} onPress={handleNavigation} activeOpacity={0.8}>
                        <LinearGradient colors={['#3e2723', '#261714']} style={styles.actionCardGradient}>
                            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255, 183, 77, 0.15)' }]}>
                                <MaterialCommunityIcons name="map-marker-path" size={28} color="#ffb74d" />
                            </View>
                            <Text style={styles.actionCardText}>Navigate</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Overview Placeholder */}
                <Text style={[styles.sectionTitle, { marginTop: 32, color: colors.textSecondary }]}>Overview</Text>
                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>0</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>₹0</Text>
                        <Text style={styles.statLabel}>Collected</Text>
                    </View>
                </View>

            </View>
            <View style={{ height: 100 }} />

            {/* QR Scanner Modal */}
            <Modal visible={isScannerOpen} animationType="slide" onRequestClose={() => setIsScannerOpen(false)}>
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                    <CameraView
                        style={{ flex: 1 }}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    >
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 18, marginBottom: 20 }}>Align QR Code in the frame</Text>
                            <View style={{ width: 250, height: 250, borderWidth: 2, borderColor: '#00c853', backgroundColor: 'transparent' }} />
                        </View>
                        <TouchableOpacity 
                            style={{ position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#e53935', padding: 16, borderRadius: 50 }}
                            onPress={() => setIsScannerOpen(false)}
                        >
                            <MaterialCommunityIcons name="close" size={30} color="#fff" />
                        </TouchableOpacity>
                    </CameraView>
                </View>
            </Modal>

            {/* Resident Details Modal */}
            <Modal visible={isUserModalVisible} transparent animationType="fade" onRequestClose={() => setIsUserModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: isDark ? '#0f1a26' : colors.cardBg }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Resident Details</Text>
                            <TouchableOpacity onPress={() => setIsUserModalVisible(false)}>
                                <MaterialCommunityIcons name="close-circle" size={28} color="#7b8a9e" />
                            </TouchableOpacity>
                        </View>
                        {scannedUser && (
                            <View style={{ marginTop: 10, gap: 10 }}>
                                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{scannedUser.name}</Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>{scannedUser.email}</Text>
                                <View style={{ height: 1, backgroundColor: '#263345', marginVertical: 10 }} />
                                <Text style={{ color: colors.text, fontSize: 16 }}><Text style={{ fontWeight: 'bold' }}>House:</Text> {scannedUser.houseNo || 'N/A'}</Text>
                                <Text style={{ color: colors.text, fontSize: 16 }}><Text style={{ fontWeight: 'bold' }}>Address:</Text> {scannedUser.address || 'N/A'}</Text>
                                <Text style={{ color: colors.text, fontSize: 16 }}><Text style={{ fontWeight: 'bold' }}>Phone:</Text> {scannedUser.phone || 'N/A'}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

        </ScrollView>
    );
};

// -----------------------------------------------------
// OfficialAvailabilityContent
// -----------------------------------------------------
const OfficialAvailabilityContent = () => {
    const { colors, isDark } = React.useContext(ThemeContext);
    const [markedDates, setMarkedDates] = useState<any>({});
    
    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                const docRef = doc(db, 'system', 'collection_schedule');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const dates = data.availableDates || [];
                    const newMarked: any = {};
                    dates.forEach((d: string) => {
                        newMarked[d] = { selected: true, marked: true, selectedColor: '#00c853' };
                    });
                    setMarkedDates(newMarked);
                }
            } catch (err) {
                console.log(err);
            }
        };
        fetchAvailability();
    }, []);

    const onDayPress = async (day: any) => {
        const dateStr = day.dateString;
        const newMarked = { ...markedDates };
        
        let availableDates: string[] = Object.keys(newMarked).filter(k => newMarked[k]?.selected);
        
        if (newMarked[dateStr]?.selected) {
            delete newMarked[dateStr];
            availableDates = availableDates.filter(d => d !== dateStr);
        } else {
            newMarked[dateStr] = { selected: true, marked: true, selectedColor: '#00c853' };
            availableDates.push(dateStr);
        }
        
        setMarkedDates(newMarked);

        try {
            await setDoc(doc(db, 'system', 'collection_schedule'), {
                availableDates
            }, { merge: true });
        } catch (error) {
            console.error("Failed to save availability", error);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <LinearGradient
                colors={isDark ? ['#0a3f18', '#0d2f16', '#0b1a12'] : [colors.headerGrad1, colors.headerGrad2, colors.headerGrad3]}
                locations={[0, 0.5, 1]}
                style={[styles.header, { paddingBottom: 30, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <View style={styles.profileAvatarContainer}>
                    <View style={styles.profileAvatar}>
                        <MaterialCommunityIcons name="calendar-clock" size={50} color="#00c853" />
                    </View>
                </View>
                <Text style={[styles.profileName, { color: isDark ? '#ffffff' : colors.text }]}>Availability</Text>
                <Text style={[styles.profileEmail, { color: isDark ? '#a0aec0' : colors.textSecondary, textAlign: 'center', paddingHorizontal: 20 }]}>
                    Mark the days you will be available for pickup.
                </Text>
            </LinearGradient>

            <View style={styles.contentSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 20 }]}>Select Available Dates</Text>
                <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#263345' }}>
                    <Calendar
                        onDayPress={onDayPress}
                        markedDates={markedDates}
                        theme={{
                            backgroundColor: isDark ? '#0f1a26' : colors.cardBg,
                            calendarBackground: isDark ? '#0f1a26' : colors.cardBg,
                            textSectionTitleColor: '#b6c1cd',
                            selectedDayBackgroundColor: '#00c853',
                            selectedDayTextColor: '#ffffff',
                            todayTextColor: '#00c853',
                            dayTextColor: isDark ? '#d9e1e8' : '#2d4150',
                            textDisabledColor: isDark ? '#3e5068' : '#d9e1e8',
                            dotColor: '#00c853',
                            selectedDotColor: '#ffffff',
                            arrowColor: '#00c853',
                            monthTextColor: isDark ? '#ffffff' : '#2d4150',
                            textDayFontWeight: '500',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '600'
                        }}
                        minDate={new Date().toISOString().split('T')[0]}
                    />
                </View>
            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

// -----------------------------------------------------
// OfficialScheduleContent
// -----------------------------------------------------
const OfficialScheduleContent = () => {
    const { colors, isDark } = React.useContext(ThemeContext);
    const [isVerificationModalVisible, setVerificationModalVisible] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<any>(null);
    const [quantity, setQuantity] = useState('');
    const [scannedWasteType, setScannedWasteType] = useState('Plastic');
    const [schedule, setSchedule] = useState<any[]>([]);

    const wasteTypes = ['Plastic', 'E-waste', 'Organic', 'General', 'Hazardous'];

    const fetchSchedule = async () => {
        try {
            const q = query(collection(db, 'orders'), where('status', '==', 'Scheduled'));
            const querySnapshot = await getDocs(q);
            const fetchedSchedule: any[] = [];
            querySnapshot.forEach((docSnap) => {
                const data = docSnap.data();
                fetchedSchedule.push({
                    id: docSnap.id,
                    residentName: data.residentName || 'Resident',
                    address: data.address || '',
                    wasteType: data.type || 'Plastic',
                    status: data.status,
                    time: data.time || '',
                });
            });
            setSchedule(fetchedSchedule);
        } catch (error) {
            console.error("Error fetching schedule:", error);
        }
    };

    useEffect(() => {
        fetchSchedule();
    }, []);

    const getWasteIcon = (type: string) => {
        switch (type) {
            case 'Plastic': return 'recycle';
            case 'E-waste': return 'laptop';
            case 'Organic': return 'leaf';
            default: return 'trash-can-outline';
        }
    };

    const handleCollectPress = (item: any) => {
        setSelectedCollection(item);
        setScannedWasteType(item.wasteType);
        setQuantity('');
        setVerificationModalVisible(true);
    };

    const handleCompleteCollection = async () => {
        if (!selectedCollection) return;
        try {
            await updateDoc(doc(db, 'orders', selectedCollection.id), {
                status: 'Collected',
                collectedQuantity: quantity,
                collectedWasteType: scannedWasteType
            });
            setVerificationModalVisible(false);
            Alert.alert("Success", "Collection completed and payment requested.");
            fetchSchedule();
        } catch (error) {
            console.error("Error updating order:", error);
            Alert.alert("Error", "Failed to complete collection.");
        }
    };

    const handleNavigation = () => {
        Alert.alert("Navigation", "Opening map to next destination...");
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <LinearGradient
                    colors={isDark ? ['#0a3f18', '#0d2f16', '#0b1a12'] : [colors.headerGrad1, colors.headerGrad2, colors.headerGrad3]}
                    locations={[0, 0.5, 1]}
                    style={[styles.header, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
                >
                    <Text style={[styles.profileName, { color: isDark ? '#ffffff' : colors.text }]}>Daily Schedule</Text>
                    <Text style={[styles.profileEmail, { color: isDark ? '#a0aec0' : colors.textSecondary }]}>Your planned collections for today</Text>
                </LinearGradient>

                <View style={styles.contentSection}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Collection Schedule</Text>
                    <View style={styles.scheduleListContainer}>
                        {schedule.length === 0 ? (
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 30 }}>No pending collections for today.</Text>
                        ) : schedule.map((item) => (
                            <View key={item.id} style={[styles.scheduleCard, { borderColor: colors.cardBorder, backgroundColor: isDark ? '#0f1a26' : colors.cardBg }]}>
                                <View style={styles.scheduleCardHeader}>
                                    <View>
                                        <Text style={[styles.residentNameText, { color: colors.text }]}>{item.residentName}</Text>
                                        <Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={1}>{item.address}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, item.status === 'Collected' ? styles.statusBadgeCollected : styles.statusBadgePending]}>
                                        <Text style={[styles.statusBadgeText, item.status === 'Collected' ? styles.statusBadgeTextCollected : styles.statusBadgeTextPending]}>
                                            {item.status}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.wasteTypeRow, { backgroundColor: isDark ? 'rgba(38, 51, 69, 0.3)' : 'rgba(0,0,0,0.05)' }]}>
                                    <MaterialCommunityIcons name={getWasteIcon(item.wasteType)} size={18} color={isDark ? "#a0aec0" : colors.textSecondary} />
                                    <Text style={[styles.wasteTypeText, { color: colors.text }]}>{item.wasteType}</Text>
                                    <View style={[styles.dotSeparator, { backgroundColor: colors.textSecondary }]} />
                                    <Text style={[styles.wasteTypeText, { color: colors.text }]}>{item.time}</Text>
                                </View>

                                <View style={styles.scheduleCardActions}>
                                    <TouchableOpacity style={styles.navButton} onPress={handleNavigation}>
                                        <MaterialCommunityIcons name="map-marker-path" size={20} color="#ffb74d" />
                                        <Text style={styles.navButtonText}>Navigate</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.collectButton, item.status === 'Collected' && styles.collectButtonDisabled]}
                                        onPress={() => handleCollectPress(item)}
                                        disabled={item.status === 'Collected'}
                                    >
                                        <MaterialCommunityIcons name="line-scan" size={20} color={item.status === 'Collected' ? "#4fc3f780" : "#4fc3f7"} />
                                        <Text style={[styles.collectButtonText, item.status === 'Collected' && styles.collectButtonTextDisabled]}>Collect Waste</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Verification Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={isVerificationModalVisible}
                onRequestClose={() => setVerificationModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, { backgroundColor: isDark ? '#0f1a26' : colors.cardBg, borderColor: isDark ? '#263345' : colors.cardBorder }]}>
                            <View style={styles.modalHeader}>
                                <Text style={[styles.modalTitle, { color: isDark ? '#ffffff' : colors.text }]}>Verify Collection</Text>
                                <TouchableOpacity onPress={() => setVerificationModalVisible(false)}>
                                    <MaterialCommunityIcons name="close-circle" size={28} color={isDark ? "#7b8a9e" : colors.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                                {selectedCollection?.residentName} • {selectedCollection?.address}
                            </Text>

                            <View style={styles.qrViewport}>
                                <MaterialCommunityIcons name="qrcode-scan" size={60} color="#4fc3f7" style={{ opacity: 0.5 }} />
                                <View style={styles.qrBracketTopLeft} />
                                <View style={styles.qrBracketTopRight} />
                                <View style={styles.qrBracketBottomLeft} />
                                <View style={styles.qrBracketBottomRight} />
                                <Text style={[styles.qrInstructionText, { color: isDark ? '#7b8a9e' : colors.textSecondary }]}>Align QR Code within frame</Text>
                            </View>

                            <Text style={[styles.inputLabel, { color: colors.text }]}>Waste Type</Text>
                            <View style={{ height: 60, marginBottom: 24 }}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer} contentContainerStyle={{ paddingRight: 20 }}>
                                    {wasteTypes.map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[styles.chip, scannedWasteType === type && styles.chipActive]}
                                            onPress={() => setScannedWasteType(type)}
                                        >
                                            <Text style={[styles.chipText, scannedWasteType === type && styles.chipTextActive, { color: scannedWasteType === type ? '#00e676' : colors.textSecondary }]}>{type}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Quantity (kg)</Text>
                            <View style={[styles.quantityInputContainer, { backgroundColor: isDark ? 'rgba(11, 17, 32, 0.8)' : colors.cardBg, borderColor: isDark ? '#263345' : colors.cardBorder }]}>
                                <TextInput
                                    style={[styles.quantityInput, { color: isDark ? '#ffffff' : colors.text }]}
                                    value={quantity}
                                    onChangeText={setQuantity}
                                    placeholder="0.0"
                                    placeholderTextColor="#7A8A99"
                                    keyboardType="decimal-pad"
                                />
                                <Text style={styles.quantityUnit}>kg</Text>
                            </View>

                            <TouchableOpacity style={styles.completeButton} onPress={handleCompleteCollection}>
                                <LinearGradient colors={['#00c853', '#1b8a2a']} style={styles.completeButtonGradient}>
                                    <Text style={[styles.completeButtonText, { color: '#ffffff' }]}>Complete & Pay</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

// -----------------------------------------------------
// OfficialPaymentContent
// -----------------------------------------------------
const OfficialPaymentContent = () => {
    const { colors, isDark } = React.useContext(ThemeContext);
    const [accountName, setAccountName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [ifsc, setIfsc] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSavedDetails();
    }, []);

    const loadSavedDetails = async () => {
        setIsLoading(true);
        try {
            const docRef = doc(db, 'system', 'payment_settings');
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.official_bank_name) setAccountName(data.official_bank_name);
                if (data.official_bank_acc) setAccountNumber(data.official_bank_acc);
                if (data.official_bank_ifsc) setIfsc(data.official_bank_ifsc);
            }
        } catch (error) {
            console.error('Failed to load Bank Details', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveBankDetails = async () => {
        if (!accountName || !accountNumber || !ifsc) {
            Alert.alert("Error", "Please fill in all bank details.");
            return;
        }

        setIsSaving(true);
        try {
            const formattedIfsc = ifsc.trim().toUpperCase();
            const formattedAcc = accountNumber.trim();
            // Standard UPI format for accounts: account_number@ifsc.npci
            const generatedUpiId = `${formattedAcc}@${formattedIfsc}.ifsc.npci`;

            await setDoc(doc(db, 'system', 'payment_settings'), {
                official_bank_name: accountName.trim(),
                official_bank_acc: formattedAcc,
                official_bank_ifsc: formattedIfsc,
                official_upi_id: generatedUpiId
            }, { merge: true });

            Alert.alert("Success", "Bank details saved. Residents' UPI payments will be routed here.");
        } catch (error) {
            Alert.alert("Error", "Failed to save bank details. Please try again.");
            console.error('Failed to save bank details', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <LinearGradient
                colors={isDark ? ['#0a3f18', '#0d2f16', '#0b1a12'] : [colors.headerGrad1, colors.headerGrad2, colors.headerGrad3]}
                locations={[0, 0.5, 1]}
                style={[styles.header, { paddingBottom: 30, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <View style={styles.profileAvatarContainer}>
                    <View style={styles.profileAvatar}>
                        <MaterialCommunityIcons name="bank" size={50} color="#00c853" />
                    </View>
                    <View style={styles.profileBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={20} color="#00c853" />
                    </View>
                </View>
                <Text style={[styles.profileName, { color: isDark ? '#ffffff' : colors.text }]}>Payment Setup</Text>
                <Text style={[styles.profileEmail, { color: isDark ? '#a0aec0' : colors.textSecondary }]}>Manage your receiving bank account</Text>
            </LinearGradient>

            <View style={styles.contentSection}>
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Bank Account Details</Text>
                <View style={[styles.detailsCard, { borderColor: colors.cardBorder, backgroundColor: isDark ? '#0f1a26' : colors.cardBg }]}>
                    <View style={{ marginBottom: 16 }}>
                        <Text style={[styles.cardDescriptor, { color: isDark ? '#a0aec0' : colors.textSecondary }]}>
                            Enter your bank account details. A UPI ID will be automatically generated so residents can pay directly to this account via UPI.
                        </Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: isDark ? '#d0d8e4' : colors.textSecondary }]}>Account Holder Name</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(11, 17, 32, 0.4)' : colors.background, borderColor: isDark ? '#263345' : colors.cardBorder }]}>
                            <View style={[styles.inputIconBox, { borderRightColor: isDark ? '#263345' : colors.cardBorder }]}>
                                <MaterialCommunityIcons name="account" size={20} color="#00c853" />
                            </View>
                            <TextInput
                                style={[styles.input, { color: isDark ? '#ffffff' : colors.text }]}
                                placeholder="e.g. John Doe"
                                placeholderTextColor="#7A8A99"
                                value={accountName}
                                onChangeText={setAccountName}
                                editable={!isLoading && !isSaving}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: isDark ? '#d0d8e4' : colors.textSecondary }]}>Account Number</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(11, 17, 32, 0.4)' : colors.background, borderColor: isDark ? '#263345' : colors.cardBorder }]}>
                            <View style={[styles.inputIconBox, { borderRightColor: isDark ? '#263345' : colors.cardBorder }]}>
                                <MaterialCommunityIcons name="bank" size={20} color="#00c853" />
                            </View>
                            <TextInput
                                style={[styles.input, { color: isDark ? '#ffffff' : colors.text }]}
                                placeholder="e.g. 1234567890"
                                placeholderTextColor="#7A8A99"
                                value={accountNumber}
                                onChangeText={setAccountNumber}
                                keyboardType="number-pad"
                                editable={!isLoading && !isSaving}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: isDark ? '#d0d8e4' : colors.textSecondary }]}>IFSC Code</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: isDark ? 'rgba(11, 17, 32, 0.4)' : colors.background, borderColor: isDark ? '#263345' : colors.cardBorder }]}>
                            <View style={[styles.inputIconBox, { borderRightColor: isDark ? '#263345' : colors.cardBorder }]}>
                                <MaterialCommunityIcons name="barcode-scan" size={20} color="#00c853" />
                            </View>
                            <TextInput
                                style={[styles.input, { color: isDark ? '#ffffff' : colors.text }]}
                                placeholder="e.g. SBIN0001234"
                                placeholderTextColor="#7A8A99"
                                value={ifsc}
                                onChangeText={setIfsc}
                                autoCapitalize="characters"
                                editable={!isLoading && !isSaving}
                            />
                        </View>
                    </View>

                    {/* Display generated UPI ID if available */}
                    {(accountNumber !== '' && ifsc !== '') && (
                        <View style={{ marginBottom: 16, backgroundColor: 'rgba(0, 200, 83, 0.1)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#00c853' }}>
                            <Text style={{ color: '#00c853', fontSize: 13, fontWeight: '600' }}>Generated UPI ID:</Text>
                            <Text style={{ color: isDark ? '#fff' : colors.text, fontSize: 14, marginTop: 4 }}>{`${accountNumber.trim()}@${ifsc.trim().toUpperCase()}.ifsc.npci`}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        onPress={handleSaveBankDetails}
                        activeOpacity={0.8}
                        disabled={isLoading || isSaving}
                        style={{ marginTop: 8 }}
                    >
                        <LinearGradient
                            colors={isLoading || isSaving ? ['#16362a', '#0e2419'] : ['#00c853', '#1b8a2a']}
                            style={styles.actionButton}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <Text style={styles.actionButtonText}>
                                    Save Payment Details
                                </Text>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

// -----------------------------------------------------
// OfficialSettingsContent
// -----------------------------------------------------
const OfficialSettingsContent = () => {
    const { colors, isDark, toggleTheme } = React.useContext(ThemeContext);
    const router = useRouter();
    const [userProfile, setUserProfile] = useState<any>(null);

    useEffect(() => {
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
                    console.error("Error fetching official profile:", error);
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
            <LinearGradient
                colors={isDark ? ['#0a3f18', '#0d2f16', '#0b1a12'] : [colors.headerGrad1, colors.headerGrad2, colors.headerGrad3]}
                locations={[0, 0.5, 1]}
                style={[styles.header, { paddingBottom: 30, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <View style={styles.profileAvatarContainer}>
                    <View style={styles.profileAvatar}>
                        <MaterialCommunityIcons name="shield-account" size={50} color="#00c853" />
                    </View>
                    <View style={styles.profileBadge}>
                        <MaterialCommunityIcons name="check-decagram" size={20} color="#00c853" />
                    </View>
                </View>
                <Text style={[styles.profileName, { color: isDark ? '#ffffff' : colors.text }]}>{userProfile?.name || 'Loading...'}</Text>
                <Text style={[styles.profileEmail, { color: isDark ? '#a0aec0' : colors.textSecondary }]}>{userProfile?.email || ''}</Text>
                
                <View style={[styles.profileRoleTag, { marginTop: 12 }]}>
                    <Text style={styles.profileRoleText}>{userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : 'Official'}</Text>
                </View>
            </LinearGradient>

            <View style={styles.contentSection}>
                {/* Personal Details */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Personal Details</Text>
                <View style={[styles.detailsCard, { backgroundColor: isDark ? '#0f1a26' : colors.cardBg, borderColor: isDark ? '#263345' : colors.cardBorder, marginBottom: 24 }]}>
                    <View style={[styles.menuItem, { padding: 0, marginBottom: 0, borderWidth: 0, backgroundColor: 'transparent' }]}>
                        <MaterialCommunityIcons name="badge-account-outline" size={24} color="#00c853" />
                        <View style={{ marginLeft: 16 }}>
                            <Text style={styles.detailLabel}>Official Unique ID</Text>
                            <Text style={[styles.detailValue, { color: isDark ? '#ffffff' : colors.text, fontSize: 16, marginTop: 4 }]}>{userProfile?.officialId || 'Not Provided'}</Text>
                        </View>
                    </View>
                </View>

                {/* Features & Appearance */}
                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Settings</Text>
                <View style={{ marginBottom: 24 }}>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: isDark ? '#0f1a26' : colors.cardBg, borderColor: isDark ? '#263345' : colors.cardBorder }]} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Edit Profile is under development.')}>
                        <MaterialCommunityIcons name="account-edit-outline" size={24} color="#7b8a9e" />
                        <Text style={[styles.menuItemText, { color: isDark ? '#ffffff' : colors.text }]}>Edit Profile</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: isDark ? '#0f1a26' : colors.cardBg, borderColor: isDark ? '#263345' : colors.cardBorder }]} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Change Password is under development.')}>
                        <MaterialCommunityIcons name="lock-outline" size={24} color="#7b8a9e" />
                        <Text style={[styles.menuItemText, { color: isDark ? '#ffffff' : colors.text }]}>Change Password</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.menuItem, { backgroundColor: isDark ? '#0f1a26' : colors.cardBg, borderColor: isDark ? '#263345' : colors.cardBorder }]} activeOpacity={0.7} onPress={() => Alert.alert('Coming Soon', 'Help & Support is under development.')}>
                        <MaterialCommunityIcons name="help-circle-outline" size={24} color="#7b8a9e" />
                        <Text style={[styles.menuItemText, { color: isDark ? '#ffffff' : colors.text }]}>Help & Support</Text>
                        <MaterialCommunityIcons name="chevron-right" size={24} color="#3e5068" />
                    </TouchableOpacity>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
                <View style={{ marginBottom: 32 }}>
                    <View style={[styles.menuItem, { justifyContent: 'space-between', backgroundColor: isDark ? '#0f1a26' : colors.cardBg, borderColor: isDark ? '#263345' : colors.cardBorder }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="theme-light-dark" size={24} color="#7b8a9e" style={{ marginRight: 16 }} />
                            <Text style={[styles.menuItemText, { marginLeft: 0, color: isDark ? '#ffffff' : colors.text }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDark}
                            onValueChange={toggleTheme}
                            trackColor={{ false: '#7b8a9e', true: '#00c853' }}
                            thumbColor={'#ffffff'}
                        />
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Actions</Text>
                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    activeOpacity={0.8}
                    onPress={handleLogout}
                >
                    <MaterialCommunityIcons name="logout" size={20} color="#e53935" />
                    <Text style={styles.logoutButtonText}>Sign Out</Text>
                </TouchableOpacity>

            </View>
            <View style={{ height: 100 }} />
        </ScrollView>
    );
};

// -----------------------------------------------------
// Styles
// -----------------------------------------------------
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
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
    },
    menuItemText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 16,
    },
    scrollContent: {
        paddingBottom: 100, // Space for Bottom nav
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
    detailsCard: {
        backgroundColor: '#0f1a26',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#263345',
    },
    detailLabel: {
        fontSize: 12,
        color: '#7b8a9e',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        fontWeight: '600',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        marginTop: 4,
    },
    cardDescriptor: {
        fontSize: 14,
        color: '#7b8a9e',
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#d0d8e4',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#263345',
        borderRadius: 8,
        backgroundColor: 'rgba(15,25,40,0.8)',
    },
    inputIconBox: {
        paddingHorizontal: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#263345',
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#e0eee6',
        fontSize: 16,
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
    actionButton: {
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
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
    statusContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#0f1a26',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#263345',
    },
    statusToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        gap: 8,
    },
    statusOnline: {
        backgroundColor: '#00c853',
        shadowColor: '#00c853',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    statusOffline: {
        backgroundColor: '#7b8a9e',
    },
    statusText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    actionCard: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#263345',
    },
    actionCardGradient: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionCardText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    scheduleListContainer: {
        gap: 16,
    },
    scheduleCard: {
        backgroundColor: '#0f1a26',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#263345',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    scheduleCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    residentNameText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 4,
    },
    addressText: {
        fontSize: 13,
        color: '#7b8a9e',
        maxWidth: width * 0.55,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusBadgePending: {
        backgroundColor: 'rgba(255, 183, 77, 0.15)',
    },
    statusBadgeCollected: {
        backgroundColor: 'rgba(0, 200, 83, 0.15)',
    },
    statusBadgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    statusBadgeTextPending: {
        color: '#ffb74d',
    },
    statusBadgeTextCollected: {
        color: '#00e676',
    },
    wasteTypeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        backgroundColor: 'rgba(38, 51, 69, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    wasteTypeText: {
        fontSize: 13,
        color: '#a0aec0',
        marginLeft: 6,
        fontWeight: '500',
    },
    dotSeparator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#7b8a9e',
        marginHorizontal: 8,
    },
    scheduleCardActions: {
        flexDirection: 'row',
        gap: 12,
    },
    navButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(62, 39, 35, 0.6)',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 183, 77, 0.2)',
    },
    navButtonText: {
        color: '#ffb74d',
        fontSize: 14,
        fontWeight: '600',
    },
    collectButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(10, 46, 63, 0.6)',
        paddingVertical: 12,
        borderRadius: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(79, 195, 247, 0.2)',
    },
    collectButtonDisabled: {
        backgroundColor: 'rgba(38, 51, 69, 0.3)',
        borderColor: 'transparent',
    },
    collectButtonText: {
        color: '#4fc3f7',
        fontSize: 14,
        fontWeight: '600',
    },
    collectButtonTextDisabled: {
        color: '#4fc3f780',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f1a26',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#263345',
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#ffffff',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#7b8a9e',
        marginBottom: 24,
    },
    qrViewport: {
        height: 200,
        backgroundColor: '#0b1120',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: '#263345',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
    },
    qrInstructionText: {
        position: 'absolute',
        bottom: 16,
        color: '#7b8a9e',
        fontSize: 13,
        fontWeight: '500',
    },
    qrBracketTopLeft: { position: 'absolute', top: 16, left: 16, width: 24, height: 24, borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#4fc3f7', borderTopLeftRadius: 8 },
    qrBracketTopRight: { position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#4fc3f7', borderTopRightRadius: 8 },
    qrBracketBottomLeft: { position: 'absolute', bottom: 16, left: 16, width: 24, height: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#4fc3f7', borderBottomLeftRadius: 8 },
    qrBracketBottomRight: { position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#4fc3f7', borderBottomRightRadius: 8 },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#d0d8e4',
        marginBottom: 12,
    },
    chipsContainer: {
        flexDirection: 'row',
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(38, 51, 69, 0.4)',
        borderRadius: 20,
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(123, 138, 158, 0.2)',
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipActive: {
        backgroundColor: 'rgba(0, 200, 83, 0.2)',
        borderColor: '#00c853',
    },
    chipText: {
        color: '#a0aec0',
        fontSize: 14,
        fontWeight: '600',
    },
    chipTextActive: {
        color: '#00e676',
    },
    quantityInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(11, 17, 32, 0.8)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#263345',
        paddingHorizontal: 16,
        marginBottom: 32,
    },
    quantityInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: '700',
        paddingVertical: 16,
    },
    quantityUnit: {
        color: '#7b8a9e',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    completeButton: {
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: Platform.OS === 'ios' ? 20 : 0,
    },
    completeButtonGradient: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    completeButtonText: {
        fontSize: 18,
        fontWeight: '700',
    },
    // ---- Bottom Nav styles (copied from home.tsx) ----
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
        paddingBottom: 10,
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
        // Handled by child LinearGradient
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
});
