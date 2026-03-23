import authService from '@/services/authService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Keyboard,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const { email: prefilledEmail } = useLocalSearchParams<{ email?: string }>();
    const [step, setStep] = useState<'email' | 'otp'>('email');
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [timer, setTimer] = useState(45);
    const [canResend, setCanResend] = useState(false);

    useEffect(() => {
        if (prefilledEmail) {
            setEmail(String(prefilledEmail).trim());
        }
    }, [prefilledEmail]);

    useEffect(() => {
        if (step !== 'otp') {
            return;
        }

        if (timer <= 0) {
            setCanResend(true);
            return;
        }

        const id = setInterval(() => {
            setTimer((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(id);
    }, [timer, step]);

    const handleTextChange = (text: string) => {
        setEmail(text.trim());
    };

    const handleGetOtp = async () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert('Invalid email', 'Please enter a valid registered email.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.sendPasswordResetOtpToEmail(email);
            if (result.success) {
                setStep('otp');
                setOtpCode('');
                setTimer(45);
                setCanResend(false);
                Alert.alert(
                    'Reset email sent',
                    'Check your inbox/spam for Firebase password reset mail. You can paste either the reset code or the full reset link below.'
                );
            } else {
                Alert.alert('Unable to send OTP', result.error || 'Please try again.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        if (!canResend || isLoading) {
            return;
        }
        await handleGetOtp();
    };

    const handleResetPassword = async () => {
        if (!otpCode.trim()) {
            Alert.alert('Missing code', 'Please enter the reset code or paste the full reset link from your email.');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Weak password', 'New password must be at least 6 characters.');
            return;
        }
        if (newPassword !== confirmPassword) {
            Alert.alert('Mismatch', 'New password and confirm password do not match.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.resetPasswordWithOtpCode(otpCode, newPassword);
            if (result.success) {
                Alert.alert('Password updated', 'Your password has been changed. Please login with your new password.', [
                    {
                        text: 'Go to Login',
                        onPress: () => router.replace('/login'),
                    },
                ]);
            } else {
                Alert.alert('Reset failed', result.error || 'Invalid or expired OTP.');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isInputValid = emailRegex.test(email);
    const isResetValid = otpCode.trim().length > 0 && newPassword.length >= 6 && confirmPassword.length >= 6;

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
                        {/* Lock Icon */}
                        <LinearGradient
                            colors={['rgba(0,200,83,0.15)', 'rgba(0,200,83,0.05)']}
                            style={styles.iconContainer}
                        >
                            <MaterialCommunityIcons name="lock-reset" size={32} color="#00c853" />
                        </LinearGradient>

                        <Text style={styles.title}>Forgot Password?</Text>
                        <Text style={styles.subtitle}>
                            {step === 'email'
                                ? 'Enter your registered email to receive a Firebase password reset mail.'
                                : 'Paste the reset code or full reset link from your email and set your new password.'}
                        </Text>

                        {step === 'email' ? (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Email Address</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter email address"
                                        placeholderTextColor="#7A8A99"
                                        value={email}
                                        onChangeText={handleTextChange}
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                    />
                                </View>

                                <TouchableOpacity
                                    onPress={handleGetOtp}
                                    activeOpacity={0.8}
                                    disabled={!isInputValid || isLoading}
                                    style={{ width: '100%' }}
                                >
                                    <LinearGradient
                                        colors={isInputValid && !isLoading ? ['#00c853', '#1b8a2a'] : ['#16362a', '#0e2419']}
                                        style={[styles.button, (!isInputValid || isLoading) && styles.buttonDisabled]}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                        ) : (
                                            <Text style={[styles.buttonText, !isInputValid && styles.buttonTextDisabled]}>
                                                Send OTP
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Reset Code / Link</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Paste reset code or full link"
                                        placeholderTextColor="#7A8A99"
                                        value={otpCode}
                                        onChangeText={setOtpCode}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>New Password</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Enter new password"
                                        placeholderTextColor="#7A8A99"
                                        value={newPassword}
                                        onChangeText={setNewPassword}
                                        secureTextEntry
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Confirm New Password</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Re-enter new password"
                                        placeholderTextColor="#7A8A99"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.resendContainer}>
                                    {canResend ? (
                                        <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                                            <Text style={styles.resendLink}>Resend OTP</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={styles.timerText}>Resend OTP in {timer}s</Text>
                                    )}
                                </View>

                                <TouchableOpacity
                                    onPress={handleResetPassword}
                                    activeOpacity={0.8}
                                    disabled={!isResetValid || isLoading}
                                    style={{ width: '100%' }}
                                >
                                    <LinearGradient
                                        colors={isResetValid && !isLoading ? ['#00c853', '#1b8a2a'] : ['#16362a', '#0e2419']}
                                        style={[styles.button, (!isResetValid || isLoading) && styles.buttonDisabled]}
                                    >
                                        {isLoading ? (
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                        ) : (
                                            <Text style={[styles.buttonText, !isResetValid && styles.buttonTextDisabled]}>
                                                Verify & Reset Password
                                            </Text>
                                        )}
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => {
                                        setStep('email');
                                        setOtpCode('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }}
                                    style={styles.secondaryAction}
                                >
                                    <Text style={styles.secondaryActionText}>Change Email</Text>
                                </TouchableOpacity>
                            </>
                        )}
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
        fontFamily: 'System'
    },
    divider: {
        height: 1,
        backgroundColor: '#1c2a3a',
        width: '100%',
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center',
        paddingTop: 40,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(0,200,83,0.25)',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#d0d8e4',
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 16,
        color: '#7b8a9e',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 24,
    },
    inputGroup: {
        width: '100%',
        marginBottom: 24,
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
        width: '100%',
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#00c853',
    },
    buttonDisabled: {
        borderColor: '#1e4a32',
    },
    buttonText: {
        fontSize: 19,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    buttonTextDisabled: {
        color: '#c8d4cc',
    },
    resendContainer: {
        width: '100%',
        alignItems: 'flex-end',
        marginBottom: 18,
    },
    resendLink: {
        color: '#00c853',
        fontSize: 14,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    timerText: {
        color: '#7b8a9e',
        fontSize: 14,
    },
    secondaryAction: {
        marginTop: 16,
    },
    secondaryActionText: {
        color: '#7b8a9e',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
