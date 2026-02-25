import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    Image,
    StatusBar,
    Dimensions,
    Modal,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import authService from './services/authService';


const { height } = Dimensions.get('window');

export default function LoginScreen() {
    const [activeTab, setActiveTab] = useState<'resident' | 'official'>('resident');
    const [mobileNumber, setMobileNumber] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Official Login State
    const [officialUserId, setOfficialUserId] = useState('');
    const [officialPassword, setOfficialPassword] = useState('');

    // Registration Modal State
    const [isRegisterModalVisible, setRegisterModalVisible] = useState(false);
    const [registerStep, setRegisterStep] = useState<'details' | 'otp'>('details');
    const [registerForm, setRegisterForm] = useState({
        name: '',
        mobile: '',
        houseNo: '',
        address: '',
    });
    const [registerOtp, setRegisterOtp] = useState('');
    const [registerVerificationId, setRegisterVerificationId] = useState('');
    const [registerErrors, setRegisterErrors] = useState({
        name: '',
        mobile: '',
        houseNo: '',
        address: '',
    });
    const [registerIsLoading, setRegisterIsLoading] = useState(false);

    const router = useRouter();

    // Login Logic
    const handleLogin = async () => {
        if (activeTab === 'resident') {
            if (mobileNumber.length === 10) {
                setIsLoading(true);
                try {
                    const result = await authService.sendOTP(mobileNumber);

                    if (result.success && result.verificationId) {
                        router.push({
                            pathname: '/verify-otp',
                            params: { verificationId: result.verificationId, mobileNumber },
                        });
                    } else {
                        Alert.alert('Error', result.error || 'Failed to send OTP');
                    }
                } catch (error: any) {
                    const errorMsg = error.message || 'An unexpected error occurred';
                    Alert.alert('Error', errorMsg);
                } finally {
                    setIsLoading(false);
                }
            }
        } else {
            // Official Login Logic (OTP-based)
            if (officialUserId) {
                setIsLoading(true);
                try {
                    const result = await authService.sendOTP(officialUserId);

                    if (result.success && result.verificationId) {
                        router.push({
                            pathname: '/official-verify-otp',
                            params: { verificationId: result.verificationId, officialId: officialUserId },
                        });
                    } else {
                        Alert.alert('Error', result.error || 'Failed to send OTP');
                    }
                } catch (error: any) {
                    const errorMsg = error.message || 'An unexpected error occurred';
                    Alert.alert('Error', errorMsg);
                } finally {
                    setIsLoading(false);
                }
            }
        }
    };

    const handleTextChange = (text: string) => {
        const numericText = text.replace(/[^0-9]/g, '');
        if (numericText.length <= 10) {
            setMobileNumber(numericText);
        }
    };

    const isResidentValid = mobileNumber.length === 10;
    const isOfficialValid = officialUserId.length > 0;
    const isInputValid = activeTab === 'resident' ? isResidentValid : isOfficialValid;

    // Registration Logic
    const openRegisterModal = () => {
        setRegisterModalVisible(true);
        setRegisterStep('details');
        setRegisterForm({ name: '', mobile: '', houseNo: '', address: '' });
        setRegisterOtp('');
        setRegisterErrors({ name: '', mobile: '', houseNo: '', address: '' });
    };

    const closeRegisterModal = () => {
        setRegisterModalVisible(false);
    };

    const handleRegisterFormChange = (key: string, value: string) => {
        setRegisterForm(prev => ({ ...prev, [key]: value }));
        // Clear error when user types
        setRegisterErrors(prev => ({ ...prev, [key]: '' }));
    };

    const validateRegisterForm = () => {
        let isValid = true;
        const errors = { name: '', mobile: '', houseNo: '', address: '' };

        if (!registerForm.name.trim()) {
            errors.name = 'Name is required';
            isValid = false;
        }
        if (!registerForm.mobile.trim() || registerForm.mobile.length !== 10) {
            errors.mobile = 'Valid 10-digit mobile is required';
            isValid = false;
        }
        if (!registerForm.houseNo.trim()) {
            errors.houseNo = 'House Number is required';
            isValid = false;
        }
        if (!registerForm.address.trim()) {
            errors.address = 'Address is required';
            isValid = false;
        }

        setRegisterErrors(errors);
        return isValid;
    };

    const handleSubmitDetails = async () => {
        if (validateRegisterForm()) {
            setRegisterIsLoading(true);
            try {
                const result = await authService.sendOTP(registerForm.mobile);

                if (result.success && result.verificationId) {
                    setRegisterVerificationId(result.verificationId);
                    setRegisterStep('otp');
                    setRegisterOtp('');
                } else {
                    Alert.alert('Error', result.error || 'Failed to send OTP');
                }
            } catch (error: any) {
                Alert.alert('Error', error.message || 'An unexpected error occurred');
            } finally {
                setRegisterIsLoading(false);
            }
        }
    };

    const handleRegisterVerifyOtp = async () => {
        if (registerOtp.length === 6) {
            setRegisterIsLoading(true);
            try {
                const result = await authService.verifyOTP(
                    registerVerificationId,
                    registerOtp
                );

                if (result.success) {
                    Alert.alert('Success', 'Registered Successfully!', [
                        {
                            text: 'OK',
                            onPress: () => {
                                closeRegisterModal();
                                setMobileNumber(registerForm.mobile);
                            },
                        },
                    ]);
                } else {
                    Alert.alert('Error', result.error || 'Invalid OTP. Please try again.');
                }
            } catch (error: any) {
                Alert.alert('Error', error.message || 'An unexpected error occurred');
            } finally {
                setRegisterIsLoading(false);
            }
        } else {
            Alert.alert('Error', 'Please enter a valid 6-digit OTP');
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.mainContainer}>
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    bounces={false}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Section */}
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
                            <Text style={styles.appSubtitle}>
                                The Waste Collection Management App
                            </Text>
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
                                    colors={activeTab === 'resident'
                                        ? ['#00c853', '#1b8a2a']
                                        : ['transparent', 'transparent']}
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
                                    colors={activeTab === 'official'
                                        ? ['#00c853', '#1b8a2a']
                                        : ['transparent', 'transparent']}
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
                            <View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Mobile No.</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter mobile number"
                                        placeholderTextColor="#7A8A99"
                                        value={mobileNumber}
                                        onChangeText={handleTextChange}
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                    />
                                </View>
                                {/* Register Now Link */}
                                <View style={styles.registerLinkContainer}>
                                    <Text style={styles.registerText}>Don't have an account? </Text>
                                    <TouchableOpacity onPress={openRegisterModal}>
                                        <Text style={styles.registerLink}>Register Now</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Official ID / Phone</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter Official ID or Phone Number"
                                        placeholderTextColor="#7A8A99"
                                        value={officialUserId}
                                        onChangeText={setOfficialUserId}
                                        autoCapitalize="none"
                                        keyboardType="phone-pad"
                                    />
                                </View>
                            </View>
                        )}

                        {/* Action Button */}
                        <TouchableOpacity
                            onPress={handleLogin}
                            activeOpacity={0.8}
                            disabled={!isInputValid || isLoading}
                        >
                            <LinearGradient
                                colors={isInputValid && !isLoading ? ['#00c853', '#1b8a2a'] : ['#16362a', '#0e2419']}
                                style={[styles.actionButton, (!isInputValid || isLoading) && styles.actionButtonDisabled]}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={[styles.actionButtonText, !isInputValid && styles.actionButtonTextDisabled]}>
                                        {activeTab === 'resident' ? 'Get OTP' : 'Get OTP'}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Info Notice */}
                        <View style={styles.infoBox}>
                            <MaterialCommunityIcons name="file-document-outline" size={18} color="#3d7a56" style={styles.infoIcon} />
                            <Text style={styles.infoText}>
                                {activeTab === 'resident' ? 'An OTP will be sent to your registered mobile number' : 'An OTP will be sent to your registered contact'}
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

                {/* Registration Modal */}
                <Modal
                    visible={isRegisterModalVisible}
                    transparent={true}
                    animationType="slide"
                    onRequestClose={closeRegisterModal}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === "ios" ? "padding" : "height"}
                        style={styles.modalOverlay}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Register New Resident</Text>
                                    <TouchableOpacity onPress={closeRegisterModal}>
                                        <MaterialCommunityIcons name="close" size={24} color="#d0d8e4" />
                                    </TouchableOpacity>
                                </View>

                                {registerStep === 'details' ? (
                                    <View style={styles.modalBody}>
                                        <View style={styles.modalInputGroup}>
                                            <Text style={styles.modalLabel}>Name <Text style={{ color: 'red' }}>*</Text></Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="Enter Full Name"
                                                placeholderTextColor="#7A8A99"
                                                value={registerForm.name}
                                                onChangeText={(text) => handleRegisterFormChange('name', text)}
                                            />
                                            {registerErrors.name ? <Text style={styles.errorText}>{registerErrors.name}</Text> : null}
                                        </View>

                                        <View style={styles.modalInputGroup}>
                                            <Text style={styles.modalLabel}>Mobile Number <Text style={{ color: 'red' }}>*</Text></Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="Enter 10-digit number"
                                                placeholderTextColor="#7A8A99"
                                                value={registerForm.mobile}
                                                onChangeText={(text) => handleRegisterFormChange('mobile', text.replace(/[^0-9]/g, '').slice(0, 10))}
                                                keyboardType="phone-pad"
                                                maxLength={10}
                                            />
                                            {registerErrors.mobile ? <Text style={styles.errorText}>{registerErrors.mobile}</Text> : null}
                                        </View>

                                        <View style={styles.modalInputGroup}>
                                            <Text style={styles.modalLabel}>House Number <Text style={{ color: 'red' }}>*</Text></Text>
                                            <TextInput
                                                style={styles.modalInput}
                                                placeholder="Enter House No."
                                                placeholderTextColor="#7A8A99"
                                                value={registerForm.houseNo}
                                                onChangeText={(text) => handleRegisterFormChange('houseNo', text)}
                                            />
                                            {registerErrors.houseNo ? <Text style={styles.errorText}>{registerErrors.houseNo}</Text> : null}
                                        </View>

                                        <View style={styles.modalInputGroup}>
                                            <Text style={styles.modalLabel}>House Address <Text style={{ color: 'red' }}>*</Text></Text>
                                            <TextInput
                                                style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                                                placeholder="Enter Full Address"
                                                placeholderTextColor="#7A8A99"
                                                value={registerForm.address}
                                                onChangeText={(text) => handleRegisterFormChange('address', text)}
                                                multiline
                                            />
                                            {registerErrors.address ? <Text style={styles.errorText}>{registerErrors.address}</Text> : null}
                                        </View>

                                        <TouchableOpacity onPress={handleSubmitDetails} activeOpacity={0.8}>
                                            <LinearGradient
                                                colors={['#00c853', '#1b8a2a']}
                                                style={styles.modalButton}
                                            >
                                                <Text style={styles.modalButtonText}>Submit</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.modalBody}>
                                        <Text style={styles.otpInstruction}>
                                            Please enter the OTP sent to {registerForm.mobile}
                                        </Text>

                                        <View style={styles.modalInputGroup}>
                                            <TextInput
                                                style={[styles.modalInput, { textAlign: 'center', fontSize: 24, letterSpacing: 5 }]}
                                                placeholder="----"
                                                placeholderTextColor="#7A8A99"
                                                value={registerOtp}
                                                onChangeText={setRegisterOtp}
                                                keyboardType="number-pad"
                                                maxLength={6}
                                                autoFocus
                                            />
                                        </View>

                                        <TouchableOpacity onPress={handleRegisterVerifyOtp} activeOpacity={0.8}>
                                            <LinearGradient
                                                colors={['#00c853', '#1b8a2a']}
                                                style={styles.modalButton}
                                            >
                                                <Text style={styles.modalButtonText}>Register</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        <TouchableOpacity onPress={() => setRegisterStep('details')} style={{ marginTop: 15 }}>
                                            <Text style={{ color: '#7b8a9e', textAlign: 'center' }}>Edit details</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        </TouchableWithoutFeedback>
                    </KeyboardAvoidingView>
                </Modal>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000000', // Matches status bar
    },
    mainContainer: {
        flex: 1,
        backgroundColor: '#0b1120',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        minHeight: height - 100,
    },

    header: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 10,
        marginBottom: 10,
    },

    logoContainer: {
        alignItems: 'center',
    },

    logoImage: {
        width: 200,
        height: 150,
        marginBottom: 4,
    },

    appSubtitle: {
        fontSize: 14,
        color: '#0eb14dff',
        letterSpacing: 0.5,
        fontWeight: '400',
        textAlign: 'center',
        fontFamily: 'SN_Pro_Regular'
    },

    divider: {
        height: 1,
        backgroundColor: '#1c2a3a',
        width: '100%',
    },

    formContainer: {
        flex: 1,
        padding: 20,
        paddingTop: 18,
        justifyContent: 'center',
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
        marginBottom: 20,
    },

    tab: {
        flex: 1,
        borderRadius: 9999,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#263345',
    },

    tabActive: {
        borderColor: 'transparent',
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
        marginBottom: 16,
    },

    label: {
        fontSize: 18,
        fontWeight: '700',
        color: '#d0d8e4',
        marginBottom: 10,
    },

    input: {
        borderWidth: 1.5,
        borderColor: '#263345',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#b0b8c8',
        fontSize: 17,
    },

    registerLinkContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        marginBottom: 20,
        marginTop: -6,
    },

    registerText: {
        color: '#7b8a9e',
        fontSize: 14,
    },

    registerLink: {
        color: '#00c853',
        fontSize: 14,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },

    forgotPasswordContainer: {
        alignSelf: 'flex-end',
        marginBottom: 20,
        marginTop: -6,
    },

    forgotPasswordText: {
        color: '#00c853',
        fontSize: 15,
        fontWeight: '600',
    },

    actionButton: {
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1e4a32',
        marginTop: 8,
    },

    actionButtonText: {
        fontSize: 19,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    actionButtonDisabled: {
        borderColor: '#1e4a32',
    },

    actionButtonTextDisabled: {
        color: '#c8d4cc',
    },

    infoBox: {
        marginTop: 16,
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
        fontSize: 16,
        color: '#7aaa8e',
        lineHeight: 24,
        flex: 1,
    },

    spacer: {
        flex: 1,
        minHeight: 20,
    },

    footer: {
        paddingVertical: 8,
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

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0f1a26',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        borderTopWidth: 1,
        borderColor: '#263345',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    modalBody: {
        width: '100%',
    },
    modalInputGroup: {
        marginBottom: 16,
    },
    modalLabel: {
        fontSize: 14,
        color: '#d0d8e4',
        marginBottom: 8,
        fontWeight: '600',
    },
    modalInput: {
        borderWidth: 1,
        borderColor: '#263345',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        color: '#FFFFFF',
        fontSize: 16,
        backgroundColor: '#0b1120',
    },
    errorText: {
        color: '#e53935',
        fontSize: 12,
        marginTop: 4,
    },
    errorTextAlert: {
        color: '#e53935',
        fontSize: 13,
        marginBottom: 16,
    },
    modalButton: {
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    otpInstruction: {
        color: '#7b8a9e',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
});
