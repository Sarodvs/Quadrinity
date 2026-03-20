import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Keyboard,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import authService from './services/authService';

export default function VerifyOtpScreen() {
    const router = useRouter();
    const { verificationId, email } = useLocalSearchParams<{ verificationId: string; email: string }>();
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [timer, setTimer] = useState(30);
    const [canResend, setCanResend] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpError, setOtpError] = useState('');
    const inputRefs = useRef<Array<TextInput | null>>([]);

    useEffect(() => {
        let interval: any;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleResend = () => {
        if (!canResend) return;
        setTimer(30);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
    };

    const handleChange = (text: string, index: number) => {
        if (!/^\d*$/.test(text)) return;

        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        if (text && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (e: any, index: number) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerify = async () => {
        if (otp.every((d) => d)) {
            setIsVerifying(true);
            setOtpError('');
            try {
                const otpCode = otp.join('');
                const result = await authService.verifyOTP(verificationId || '', otpCode);

                if (result.success) {
                    // Navigate to appropriate dashboard based on role
                    if (result.role === 'official') {
                        router.replace('/official-dashboard');
                    } else {
                        router.replace('/home');
                    }
                } else {
                    setOtpError(result.error || 'Invalid OTP. Please try again.');
                }
            } catch (error: any) {
                const errorMsg = error.message || 'An unexpected error occurred';
                setOtpError(errorMsg);
            } finally {
                setIsVerifying(false);
            }
        }
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="light-content" />
                <View style={styles.container}>
                    {/* Header */}
                    <LinearGradient
                        colors={['#0a3f18', '#0d2f16', '#0b1a12', '#0b1120']}
                        locations={[0, 0.4, 0.7, 1]}
                        style={styles.header}
                    >
                        {/* Back Button */}
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonWrapper}>
                            <LinearGradient
                                colors={['#00c853', '#1b8a2a']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.backButton}
                            >
                                <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
                            </LinearGradient>
                        </TouchableOpacity>

                        <View style={styles.logoContainer}>
                            <Image
                                source={require('../assets/images/LOGO.png')}
                                style={styles.logoImage}
                                resizeMode="contain"
                            />
                            <Text style={styles.appSubtitle}>Waste Collection Management App</Text>
                        </View>
                    </LinearGradient>

                    <View style={styles.divider} />

                    {/* Content */}
                    <View style={styles.content}>
                        {/* Shield Icon */}
                        <LinearGradient
                            colors={['rgba(0,200,83,0.15)', 'rgba(0,200,83,0.05)']}
                            style={styles.shieldIconContainer}
                        >
                            <MaterialCommunityIcons name="shield-check" size={26} color="#00c853" />
                        </LinearGradient>

                        <Text style={styles.verifyTitle}>Verify OTP</Text>
                        <Text style={styles.verifySubtitle}>Enter the 6-digit code sent to</Text>
                        <Text style={styles.loginType}>
                            Logging in as <Text style={styles.highlight}>Resident</Text>
                        </Text>

                        {/* OTP Inputs */}
                        <View style={styles.otpContainer}>
                            {otp.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => { inputRefs.current[index] = ref; }}
                                    style={[
                                        styles.otpInput,
                                        digit ? styles.otpInputFilled : null,
                                        otpError ? styles.otpInputError : null,
                                        { borderColor: otpError ? '#e53935' : digit ? '#00c853' : '#263345' }
                                    ]}
                                    value={digit}
                                    onChangeText={(text) => { handleChange(text, index); setOtpError(''); }}
                                    onKeyPress={(e) => handleKeyPress(e, index)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                    cursorColor="#00c853"
                                    editable={!isVerifying}
                                />
                            ))}
                        </View>

                        {otpError && (
                            <Text style={styles.errorText}>{otpError}</Text>
                        )}

                        {/* Resend Timer */}
                        <View style={styles.resendContainer}>
                            {canResend && !isVerifying ? (
                                <TouchableOpacity onPress={handleResend}>
                                    <Text style={styles.resendLink}>Resend OTP</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={styles.timerText}>
                                    Resend OTP in <Text style={styles.highlight}>{timer}s</Text>
                                </Text>
                            )}
                        </View>

                        {/* Verify Button */}
                        <TouchableOpacity
                            onPress={handleVerify}
                            activeOpacity={0.8}
                            disabled={!otp.every((d) => d) || isVerifying}
                        >
                            <LinearGradient
                                colors={otp.every((d) => d) && !isVerifying ? ['#00c853', '#1b8a2a'] : ['#16362a', '#0e2419']}
                                style={[styles.verifyButton, (!otp.every((d) => d) || isVerifying) && styles.verifyButtonDisabled]}
                            >
                                {isVerifying ? (
                                    <ActivityIndicator size="small" color="#FFFFFF" />
                                ) : (
                                    <Text style={[styles.verifyButtonText, !otp.every((d) => d) && styles.verifyButtonTextDisabled]}>
                                        Verify & Login
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Info Box */}
                        <View style={styles.infoBox}>
                            <MaterialCommunityIcons name="message-alert-outline" size={18} color="#3d7a56" style={styles.infoIcon} />
                            <Text style={styles.infoText}>
                                Didn't receive the code? Check your SMS inbox or try resending after the timer expires.
                            </Text>
                        </View>

                        <View style={styles.spacer} />


                    </View>
                </View>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000000',
    },
    container: {
        flex: 1,
        backgroundColor: '#0b1120',
    },
    header: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 10,
        paddingHorizontal: 20,
        position: 'relative',
        marginBottom: 10,
    },
    backButtonWrapper: {
        position: 'absolute',
        left: 16,
        top: 40,
        zIndex: 10,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: 'rgba(0,200,83,0.3)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 4,
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
    content: {
        flex: 1,
        padding: 20,
        paddingTop: 28,
        alignItems: 'center',
    },
    shieldIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(0,200,83,0.25)',
        marginBottom: 16,
    },
    verifyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#d0d8e4',
        marginBottom: 8,
    },
    verifySubtitle: {
        fontSize: 15,
        color: '#7b8a9e',
        marginBottom: 4,
    },
    loginType: {
        fontSize: 15,
        color: '#7b8a9e',
        marginBottom: 28,
    },
    highlight: {
        color: '#00c853',
        fontWeight: '600',
    },
    otpContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
        width: '100%',
        justifyContent: 'center',
    },
    otpInput: {
        width: 48,
        height: 56,
        borderRadius: 8,
        borderWidth: 1.5,
        backgroundColor: 'rgba(15,25,40,0.8)',
        color: '#d0d8e4',
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    otpInputFilled: {
        backgroundColor: 'rgba(0,200,83,0.06)',
    },
    otpInputError: {
        backgroundColor: 'rgba(229, 57, 53, 0.05)',
    },
    errorText: {
        color: '#e53935',
        fontSize: 13,
        marginBottom: 16,
    },
    resendContainer: {
        marginBottom: 28,
    },
    timerText: {
        fontSize: 14,
        color: '#7b8a9e',
    },
    resendLink: {
        fontSize: 14,
        color: '#00c853',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    verifyButton: {
        width: '100%', // Full width is tricky inside alignItems center, better to set width explicitly or rely on container stretch
        minWidth: '100%',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#00c853',
    },
    verifyButtonDisabled: {
        borderColor: '#1e4a32',
    },
    verifyButtonText: {
        fontSize: 19,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    verifyButtonTextDisabled: {
        color: '#c8d4cc',
    },
    infoBox: {
        marginTop: 20,
        width: '100%',
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
        fontSize: 14,
        color: '#7aaa8e',
        lineHeight: 22,
        flex: 1,
    },
    spacer: {
        flex: 1,
        minHeight: 40,
    },
});
