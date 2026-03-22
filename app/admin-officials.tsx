import { ADMIN_PANEL_PASSWORD } from '@/constants/security';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    collection,
    deleteDoc,
    doc,
    getDoc,
    getFirestore,
    onSnapshot,
    setDoc,
} from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface OfficialCredential {
    userId: string;
    displayName: string;
    password: string;
    isActive: boolean;
    isSeededDemo?: boolean;
    updatedAt?: number;
}

export default function AdminOfficialsScreen() {
    const router = useRouter();
    const firestore = useMemo(() => getFirestore(), []);

    const [officials, setOfficials] = useState<OfficialCredential[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [adminUpiId, setAdminUpiId] = useState('');
    const [adminUpiName, setAdminUpiName] = useState('');
    const [adminBankName, setAdminBankName] = useState('');
    const [adminAccNumber, setAdminAccNumber] = useState('');
    const [adminIfsc, setAdminIfsc] = useState('');
    const [savingPayment, setSavingPayment] = useState(false);

    const [userId, setUserId] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [password, setPassword] = useState('');
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        const unsubscribe = onSnapshot(
            collection(firestore, 'officials'),
            (snapshot) => {
                const data = snapshot.docs
                    .map((entry) => {
                        const value = entry.data() as Partial<OfficialCredential>;
                        return {
                            userId: (value.userId || entry.id).toUpperCase(),
                            displayName: value.displayName || entry.id,
                            password: value.password || '',
                            isActive: value.isActive !== false,
                            isSeededDemo: value.isSeededDemo === true,
                            updatedAt: value.updatedAt || 0,
                        };
                    })
                    .sort((a, b) => a.userId.localeCompare(b.userId));

                setOfficials(data);
                setLoading(false);
            },
            () => {
                setLoading(false);
                Alert.alert('Error', 'Unable to load officials list.');
            }
        );

        const fetchPaymentSettings = async () => {
            try {
                const snap = await getDoc(doc(firestore, 'admin', 'settings'));
                if (snap.exists()) {
                    const data = snap.data();
                    if (data?.payment) {
                        setAdminUpiId(data.payment.upiId || '');
                        setAdminUpiName(data.payment.upiName || '');
                        setAdminBankName(data.payment.bankName || '');
                        setAdminAccNumber(data.payment.accNumber || '');
                        setAdminIfsc(data.payment.ifsc || '');
                    }
                }
            } catch (err) {
                console.error("Failed to fetch admin payment settings", err);
            }
        };
        fetchPaymentSettings();

        return () => unsubscribe();
    }, [firestore]);

    const clearForm = () => {
        setUserId('');
        setDisplayName('');
        setPassword('');
        setIsActive(true);
    };

    const loadOfficialToForm = async (targetUserId: string) => {
        try {
            const officialRef = doc(firestore, 'officials', targetUserId);
            const snap = await getDoc(officialRef);
            if (!snap.exists()) {
                Alert.alert('Not found', 'Selected official record does not exist anymore.');
                return;
            }

            const data = snap.data() as Partial<OfficialCredential>;
            setUserId((data.userId || targetUserId).toUpperCase());
            setDisplayName(data.displayName || '');
            setPassword(data.password || '');
            setIsActive(data.isActive !== false);
        } catch {
            Alert.alert('Error', 'Failed to load official details.');
        }
    };

    const saveOfficial = async () => {
        const normalizedId = userId.trim().toUpperCase();
        const normalizedName = displayName.trim();
        const normalizedPassword = password.trim();

        if (!normalizedId || !normalizedName || !normalizedPassword) {
            Alert.alert('Missing values', 'User ID, display name, and password are required.');
            return;
        }

        setSaving(true);
        try {
            await setDoc(
                doc(firestore, 'officials', normalizedId),
                {
                    userId: normalizedId,
                    displayName: normalizedName,
                    password: normalizedPassword,
                    isActive,
                    updatedAt: Date.now(),
                },
                { merge: true }
            );
            Alert.alert('Saved', 'Official credentials saved successfully.');
            clearForm();
        } catch {
            Alert.alert('Error', 'Unable to save official credentials.');
        } finally {
            setSaving(false);
        }
    };

    const savePaymentSettings = async () => {
        setSavingPayment(true);
        try {
            await setDoc(
                doc(firestore, 'admin', 'settings'),
                {
                    payment: {
                        upiId: adminUpiId.trim(),
                        upiName: adminUpiName.trim(),
                        bankName: adminBankName.trim(),
                        accNumber: adminAccNumber.trim(),
                        ifsc: adminIfsc.trim().toUpperCase(),
                    },
                    updatedAt: Date.now()
                },
                { merge: true }
            );
            Alert.alert('Saved', 'Global payment settings updated successfully.');
        } catch {
            Alert.alert('Error', 'Unable to save payment settings.');
        } finally {
            setSavingPayment(false);
        }
    };

    const deleteOfficial = (targetUserId: string) => {
        Alert.alert('Delete official', `Delete ${targetUserId}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        await deleteDoc(doc(firestore, 'officials', targetUserId));
                    } catch {
                        Alert.alert('Error', 'Unable to delete official.');
                    }
                },
            },
        ]);
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <LinearGradient colors={['#0a3f18', '#0d2f16', '#0b1a12']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Text style={styles.backButtonText}>Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Admin Official Credentials</Text>
                    <View style={styles.headerSpacer} />
                </View>
                <Text style={styles.headerSubtitle}>Create, update, or remove official login credentials</Text>
            </LinearGradient>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Credential Form</Text>

                    <Text style={styles.inputLabel}>Official User ID</Text>
                    <TextInput
                        style={styles.input}
                        value={userId}
                        onChangeText={(value) => setUserId(value.toUpperCase())}
                        autoCapitalize="characters"
                        placeholder="OFF006"
                        placeholderTextColor="#6f8294"
                    />

                    <Text style={styles.inputLabel}>Display Name</Text>
                    <TextInput
                        style={styles.input}
                        value={displayName}
                        onChangeText={setDisplayName}
                        autoCapitalize="words"
                        placeholder="Official Name"
                        placeholderTextColor="#6f8294"
                    />

                    <Text style={styles.inputLabel}>Password</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        autoCapitalize="none"
                        placeholder="Enter password"
                        placeholderTextColor="#6f8294"
                    />

                    <View style={styles.switchRow}>
                        <Text style={styles.inputLabel}>Account Active</Text>
                        <Switch
                            value={isActive}
                            onValueChange={setIsActive}
                            trackColor={{ false: '#37485b', true: '#00c853' }}
                            thumbColor="#ffffff"
                        />
                    </View>

                    <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} disabled={saving} onPress={saveOfficial}>
                        {saving ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveButtonText}>Save Credential</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>Global Payment Settings</Text>
                    <Text style={{ color: '#8ea1b4', marginBottom: 12, fontSize: 13 }}>
                        These details will be used when residents click "Make a Payment".
                    </Text>

                    <Text style={styles.inputLabel}>Admin UPI ID</Text>
                    <TextInput
                        style={styles.input}
                        value={adminUpiId}
                        onChangeText={setAdminUpiId}
                        autoCapitalize="none"
                        placeholder="e.g. company@ybl"
                        placeholderTextColor="#6f8294"
                    />

                    <Text style={styles.inputLabel}>Admin UPI Name</Text>
                    <TextInput
                        style={styles.input}
                        value={adminUpiName}
                        onChangeText={setAdminUpiName}
                        autoCapitalize="words"
                        placeholder="e.g. Haritham Waste Management"
                        placeholderTextColor="#6f8294"
                    />

                    <Text style={styles.inputLabel}>Bank Account Holder Name</Text>
                    <TextInput
                        style={styles.input}
                        value={adminBankName}
                        onChangeText={setAdminBankName}
                        autoCapitalize="words"
                        placeholder="e.g. John Doe"
                        placeholderTextColor="#6f8294"
                    />

                    <Text style={styles.inputLabel}>Bank Account Number</Text>
                    <TextInput
                        style={styles.input}
                        value={adminAccNumber}
                        onChangeText={setAdminAccNumber}
                        keyboardType="number-pad"
                        placeholder="Enter account number"
                        placeholderTextColor="#6f8294"
                    />

                    <Text style={styles.inputLabel}>IFSC Code</Text>
                    <TextInput
                        style={styles.input}
                        value={adminIfsc}
                        onChangeText={(t) => setAdminIfsc(t.toUpperCase())}
                        autoCapitalize="characters"
                        placeholder="e.g. SBIN0001234"
                        placeholderTextColor="#6f8294"
                    />

                    <TouchableOpacity style={[styles.saveButton, savingPayment && styles.saveButtonDisabled]} disabled={savingPayment} onPress={savePaymentSettings}>
                        {savingPayment ? <ActivityIndicator size="small" color="#ffffff" /> : <Text style={styles.saveButtonText}>Save Payment Details</Text>}
                    </TouchableOpacity>
                </View>

                <View style={styles.listCard}>
                    <Text style={styles.sectionTitle}>Existing Officials</Text>
                    {loading && (
                        <View style={styles.loadingWrap}>
                            <ActivityIndicator size="small" color="#00c853" />
                        </View>
                    )}

                    {!loading && officials.length === 0 && (
                        <Text style={styles.emptyText}>No officials found in database.</Text>
                    )}

                    {officials.map((official) => (
                        <View key={official.userId} style={styles.officialRow}>
                            <View style={styles.officialMeta}>
                                <Text style={styles.officialId}>{official.userId}</Text>
                                <Text style={styles.officialName}>{official.displayName}</Text>
                                <Text style={styles.officialStatus}>{official.isActive ? 'Active' : 'Inactive'}{official.isSeededDemo ? ' | Seeded' : ''}</Text>
                            </View>
                            <View style={styles.rowActions}>
                                <TouchableOpacity style={styles.rowButton} onPress={() => loadOfficialToForm(official.userId)}>
                                    <Text style={styles.rowButtonText}>Edit</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.rowButton, styles.deleteButton]} onPress={() => deleteOfficial(official.userId)}>
                                    <Text style={styles.rowButtonText}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#0b1120' },
    header: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#1f3042' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { borderWidth: 1, borderColor: '#21573a', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    backButtonText: { color: '#7ecf99', fontWeight: '600' },
    headerTitle: { color: '#d0d8e4', fontSize: 18, fontWeight: '700' },
    headerSpacer: { width: 50 },
    headerSubtitle: { color: '#8ea1b4', marginTop: 8, textAlign: 'center' },
    content: { padding: 16, paddingBottom: 50, gap: 14 },
    formCard: { backgroundColor: '#101d2b', borderRadius: 12, borderWidth: 1, borderColor: '#1f3042', padding: 14 },
    listCard: { backgroundColor: '#101d2b', borderRadius: 12, borderWidth: 1, borderColor: '#1f3042', padding: 14 },
    sectionTitle: { color: '#d0d8e4', fontSize: 16, fontWeight: '700', marginBottom: 10 },
    inputLabel: { color: '#9db0c4', marginBottom: 6, marginTop: 4 },
    input: { borderWidth: 1, borderColor: '#2a3c4f', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#d0d8e4', backgroundColor: '#0d1723' },
    switchRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    saveButton: { marginTop: 14, backgroundColor: '#00a145', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
    saveButtonDisabled: { opacity: 0.7 },
    saveButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
    loadingWrap: { paddingVertical: 14, alignItems: 'center' },
    emptyText: { color: '#8ea1b4' },
    officialRow: { borderWidth: 1, borderColor: '#26384a', borderRadius: 10, padding: 10, marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    officialMeta: { flex: 1 },
    officialId: { color: '#8ce2a9', fontWeight: '700' },
    officialName: { color: '#d0d8e4', marginTop: 2 },
    officialStatus: { color: '#7f94a9', marginTop: 2, fontSize: 12 },
    rowActions: { justifyContent: 'center', gap: 6 },
    rowButton: { backgroundColor: '#1f3042', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
    deleteButton: { backgroundColor: '#5c2731' },
    rowButtonText: { color: '#d0d8e4', fontWeight: '600', fontSize: 12 },
});
