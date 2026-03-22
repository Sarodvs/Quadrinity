import { auth as firebaseAuth } from '@/app/firebase';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, getDoc, getFirestore, updateDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
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
    SafeAreaView,
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
import { useAuth } from './context/AuthContext';

const { width, height } = Dimensions.get('window');

const NAV_ITEMS = [
    { id: 'home', label: 'Home', icon: 'home-outline', iconActive: 'home' },
    { id: 'availability', label: 'Availability', icon: 'calendar-month-outline', iconActive: 'calendar-month' },
    { id: 'schedule', label: 'Schedule', icon: 'clipboard-text-outline', iconActive: 'clipboard-text' },
    { id: 'payment', label: 'Payment', icon: 'bank-outline', iconActive: 'bank' },
    { id: 'settings', label: 'Settings', icon: 'cog-outline', iconActive: 'cog' },
];

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
                {activeTab === 'schedule' && <ScheduleContent onScanQR={openScanner} />}
                {activeTab === 'payment' && <PaymentContent />}
                {activeTab === 'settings' && <SettingsContent currentUser={currentUser} />}

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

    // Mock stats
    const stats = { pending: 12, completed: 8, collected: '45 kg' };

    useEffect(() => {
        const fetchDutyStatus = async () => {
            const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
            if (!userId) return;
            try {
                const firestore = getFirestore();
                const userRef = doc(firestore, 'users', userId);
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
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, { isDutyActive: value });
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
        Alert.alert('Navigate', 'Generating optimized route via Google Maps to all pickups... (Placeholder)');
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
    // A simple mock calendar view using a week/month grid.
    const [selectedDays, setSelectedDays] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Mock days for demonstration (e.g., next 14 days)
    const generateDays = () => {
        const days = [];
        const today = new Date();
        for (let i = 0; i < 14; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            days.push({
                dateString: d.toISOString().split('T')[0],
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                dayNumber: d.getDate()
            });
        }
        return days;
    };

    const availableDays = generateDays();

    useEffect(() => {
        const fetchAvailability = async () => {
            const userId = currentUser?.id || firebaseAuth.currentUser?.uid;
            if (!userId) return;
            try {
                const firestore = getFirestore();
                const userRef = doc(firestore, 'users', userId);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists() && userSnap.data().availableDays) {
                    setSelectedDays(userSnap.data().availableDays);
                }
            } catch (error) {
                console.error('Error fetching availability', error);
            }
        };
        fetchAvailability();
    }, [currentUser]);

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
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, { availableDays: selectedDays });
            Alert.alert('Success', 'Availability updated successfully.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save availability.');
        } finally {
            setIsSaving(false);
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
                <Text style={styles.headerSubtitle}>Select days you are available for pickups</Text>
            </LinearGradient>

            <View style={styles.contentSection}>
                <View style={styles.calendarGrid}>
                    {availableDays.map((day, idx) => {
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
const ScheduleContent = ({ onScanQR }: any) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<any>(null);
    const [wasteQuantity, setWasteQuantity] = useState('');
    const [selectedWasteType, setSelectedWasteType] = useState('Scrap/Recyclable');

    // Mock scheduled collections
    const plannedCollections = [
        { id: '1', residentName: 'John Doe', address: '123 Palm Street, Block A', status: 'Pending', type: 'Scrap/Recyclable', time: '10:00 AM - 12:00 PM' },
        { id: '2', residentName: 'Jane Smith', address: '456 Oak Avenue, Block B', status: 'Pending', type: 'Food Waste', time: '01:00 PM - 03:00 PM' },
        { id: '3', residentName: 'Alice Johnson', address: '789 Pine Road, Block C', status: 'Pending', type: 'Scrap/Recyclable', time: '03:30 PM - 05:00 PM' },
    ];

    const handleNavigate = (address: string) => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        Linking.openURL(url);
    };

    const handleCollectWaste = (collection: any) => {
        setSelectedCollection(collection);
        setSelectedWasteType(collection.type);
        setWasteQuantity('');
        setIsModalVisible(true);
    };

    const closeModal = () => {
        setIsModalVisible(false);
        setSelectedCollection(null);
    };

    const completeAndPay = () => {
        if (!wasteQuantity) {
            Alert.alert('Error', 'Please enter waste quantity');
            return;
        }
        Alert.alert('Success', `Collection from ${selectedCollection?.residentName} marked as complete and payment initiated.`);
        closeModal();
    };

    return (
        <View style={{ flex: 1 }}>
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                locations={[0, 0.5, 1]}
                style={[styles.headerGradient, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <Text style={[styles.headerTitle, { alignSelf: 'center' }]}>Today's Schedule</Text>
                <Text style={styles.headerSubtitle}>{plannedCollections.length} collections planned</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.contentSection, { paddingTop: 16 }]}>
                    {plannedCollections.map((item) => (
                        <View key={item.id} style={styles.collectionCard}>
                            <View style={styles.collectionHeader}>
                                <Text style={styles.collectionResident}>{item.residentName}</Text>
                                <View style={styles.statusBadge}>
                                    <Text style={styles.statusText}>{item.status}</Text>
                                </View>
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

                                <TouchableOpacity onPress={completeAndPay} activeOpacity={0.8} style={{ marginTop: 20 }}>
                                    <LinearGradient colors={['#00c853', '#1b8a2a']} style={styles.actionButton}>
                                        <Text style={styles.actionButtonText}>Complete & Pay</Text>
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
const SettingsContent = ({ currentUser }: any) => {
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

            </View>
        </ScrollView>
    );
};

// --- Payment Content ---
const PaymentContent = () => {
    const [bankName, setBankName] = useState('');
    const [accNumber, setAccNumber] = useState('');
    const [ifsc, setIfsc] = useState('');

    const saveBankDetails = () => {
        if (!bankName || !accNumber || !ifsc) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }
        Alert.alert('Success', 'Bank details saved successfully! (UI Only)');
    };

    return (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <LinearGradient
                colors={['#0a3f18', '#0d2f16', '#0b1a12']}
                locations={[0, 0.5, 1]}
                style={[styles.headerGradient, { paddingBottom: 20, paddingTop: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }]}
            >
                <Text style={[styles.headerTitle, { alignSelf: 'center' }]}>Bank Account Details</Text>
                <Text style={styles.headerSubtitle}>Set up your bank account for receiving payouts</Text>
            </LinearGradient>

            <View style={[styles.contentSection, { paddingTop: 24 }]}>
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Holder Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. John Doe"
                        placeholderTextColor="#7A8A99"
                        value={bankName}
                        onChangeText={setBankName}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bank Account Number</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter account number"
                        placeholderTextColor="#7A8A99"
                        value={accNumber}
                        onChangeText={setAccNumber}
                        keyboardType="number-pad"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>IFSC Code</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. SBIN0001234"
                        placeholderTextColor="#7A8A99"
                        value={ifsc}
                        onChangeText={(t) => setIfsc(t.toUpperCase())}
                        autoCapitalize="characters"
                    />
                </View>

                <View style={styles.infoBox}>
                    <MaterialCommunityIcons name="shield-check" size={18} color="#3d7a56" style={styles.infoIcon} />
                    <Text style={styles.infoText}>Your bank details are encrypted and securely stored. This UI is a placeholder as per requirements.</Text>
                </View>

                <TouchableOpacity onPress={saveBankDetails} activeOpacity={0.8} style={{ marginTop: 32 }}>
                    <LinearGradient colors={['#00c853', '#1b8a2a']} style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>Save Details</Text>
                    </LinearGradient>
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
