import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Image,
    SafeAreaView,
    StatusBar,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
    const [activeTab, setActiveTab] = useState<'resident' | 'official'>('resident');
    const [mobileNumber, setMobileNumber] = useState('');
    const [officialInput, setOfficialInput] = useState('');
    const router = useRouter();

    const handleGetOtp = () => {
        if (activeTab === 'resident') {
            router.push('/verify-otp');
        } else {
            router.push('/official-verify-otp');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <View style={styles.mainContainer}>
                <ScrollView contentContainerStyle={styles.scrollContainer} bounces={false}>
                    {/* Header Section */}
                    <LinearGradient
                        colors={['#0a3f18', '#0d2f16', '#0b1a12', '#0b1120']}
                        locations={[0, 0.4, 0.7, 1]}
                        style={styles.header}
                    >
                        {/* Background Icons (Simplified as simple text or omitted for now to keep it clean) */}

                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../assets/images/LOGO.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.appSubtitle}>Waste Collection Management App</Text>
                        </View>
                    </LinearGradient>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Form Section */}
                    <View style={styles.formContainer}>
                        <Text style={styles.loginAsLabel}>Login as</Text>

                        {/* Tabs */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'resident' && styles.tabActive]}
                                onPress={() => setActiveTab('resident')}
                            >
                                <LinearGradient
                                    colors={activeTab === 'resident' ? ['#00c853', '#1b8a2a'] : ['transparent', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.tabGradient}
                                >
                                    <Text style={[styles.tabText, activeTab === 'resident' && styles.tabTextActive]}>
                                        Resident
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'official' && styles.tabActive]}
                                onPress={() => setActiveTab('official')}
                            >
                                <LinearGradient
                                    colors={activeTab === 'official' ? ['#00c853', '#1b8a2a'] : ['transparent', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.tabGradient}
                                >
                                    <Text style={[styles.tabText, activeTab === 'official' && styles.tabTextActive]}>
                                        Official
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {/* Inputs */}
                        {activeTab === 'resident' ? (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Mobile No.</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter mobile number"
                                    placeholderTextColor="#7A8A99"
                                    value={mobileNumber}
                                    onChangeText={setMobileNumber}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        ) : (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Mobile No. / User ID</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter mobile number or user ID"
                                    placeholderTextColor="#7A8A99"
                                    value={officialInput}
                                    onChangeText={setOfficialInput}
                                />
                            </View>
                        )}

                        {/* Get OTP Button */}
                        <TouchableOpacity onPress={handleGetOtp} activeOpacity={0.8}>
                            <LinearGradient
                                colors={['#16362a', '#0e2419']}
                                style={styles.otpButton}
                            >
                                <Text style={styles.otpButtonText}>Get OTP</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Info Notice */}
                        <View style={styles.infoBox}>
                            <MaterialCommunityIcons name="file-document-outline" size={18} color="#3d7a56" style={styles.infoIcon} />
                            <Text style={styles.infoText}>
                                An OTP will be sent to your registered mobile number
                            </Text>
                        </View>

                        <View style={styles.spacer} />

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                By continuing, you agree to our{' '}
                                <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
                                <Text style={styles.footerLink}>Privacy Policy</Text>
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0b1120',
    },
    mainContainer: {
        flex: 1,
        backgroundColor: '#0b1120',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    header: {
        paddingTop: 60,
        paddingBottom: 40,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    logoContainer: {
        alignItems: 'center',
    },
    logoImage: {
        width: 100,
        height: 100,
        marginBottom: 10,
    },
    appSubtitle: {
        fontSize: 18,
        color: '#0eb14dff',
        letterSpacing: 0.5,
        fontWeight: '400',
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#1c2a3a',
        width: '100%',
    },
    formContainer: {
        flex: 1,
        padding: 20,
        paddingTop: 28,
    },
    loginAsLabel: {
        fontSize: 19,
        fontWeight: '700',
        color: '#d0d8e4',
        marginBottom: 12,
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
    },
    tab: {
        flex: 1,
        borderRadius: 9999, // Full pill shape
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#263345',
        backgroundColor: 'transparent',
    },
    tabActive: {
        borderColor: 'transparent',
        backgroundColor: 'transparent',
    },
    tabGradient: {
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#7b8a9e',
    },
    tabTextActive: {
        color: '#FFFFFF',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 18,
        fontWeight: '700',
        color: '#d0d8e4',
        marginBottom: 10,
    },
    input: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#263345',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#b0b8c8',
        fontSize: 17,
    },
    otpButton: {
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1e4a32',
        marginTop: 8,
    },
    otpButtonText: {
        fontSize: 19,
        fontWeight: '700',
        color: '#c8d4cc',
        letterSpacing: 0.5,
    },
    infoBox: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(0, 180, 80, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(0, 180, 80, 0.12)',
        borderRadius: 8,
        padding: 14,
        gap: 12,
    },
    infoIcon: {
        marginTop: 2,
    },
    infoText: {
        fontSize: 16,
        color: '#7aaa8e',
        lineHeight: 24,
        flex: 1,
    },
    spacer: {
        flex: 1,
        minHeight: 40,
    },
    footer: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 15,
        color: '#3e5068',
        textAlign: 'center',
        lineHeight: 24,
    },
    footerLink: {
        color: '#00c853',
        fontWeight: '600',
    },
});
