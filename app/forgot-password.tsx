import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    TextInput,
    Image,
    Keyboard,
    TouchableWithoutFeedback,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [mobileNumber, setMobileNumber] = useState('');

    const handleTextChange = (text: string) => {
        const numericText = text.replace(/[^0-9]/g, '');
        if (numericText.length <= 10) {
            setMobileNumber(numericText);
        }
    };

    const handleGetOtp = () => {
        if (mobileNumber.length === 10) {
            // Navigate to official OTP verification
            // Could pass a params to indication password reset mode if needed
            router.push('/official-verify-otp');
        }
    };

    const isInputValid = mobileNumber.length === 10;

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
                            Enter your registered mobile number to receive an OTP for password reset.
                        </Text>

                        {/* Input */}
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

                        {/* Button */}
                        <TouchableOpacity
                            onPress={handleGetOtp}
                            activeOpacity={0.8}
                            disabled={!isInputValid}
                            style={{ width: '100%' }}
                        >
                            <LinearGradient
                                colors={isInputValid ? ['#00c853', '#1b8a2a'] : ['#16362a', '#0e2419']}
                                style={[styles.button, !isInputValid && styles.buttonDisabled]}
                            >
                                <Text style={[styles.buttonText, !isInputValid && styles.buttonTextDisabled]}>
                                    Get OTP
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
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
});
