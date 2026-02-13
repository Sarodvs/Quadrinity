import { Image } from 'react-native';

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    useColorScheme,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';


export default function LoginScreen() {
    const [activeTab, setActiveTab] = useState('official'); // 'resident' or 'official'
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [authMethod, setAuthMethod] = useState('password'); // 'password' or 'otp'
    const [showDepartmentDropdown, setShowDepartmentDropdown] = useState(false);
    const router = useRouter();


    const departments = [
        'Select Department',
        'Sanitation Department',
        'Environmental Department',
        'Administration',
        'Finance Department',
    ];

    const handleLogin = () => {
        console.log('Login attempt:', { activeTab, selectedDepartment, employeeId, password, authMethod });

        // redirect to home tabs screen
        // router.replace('/(tabs)');
        console.log('Login successful');
    };


    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header Section */}
                <View style={styles.header}>
                    <Image
                        source={require('../assets/images/LOGO.png')}
                        style={styles.logoImage}
                        resizeMode="contain"
                    />
                    <Text style={styles.appSubtitle}>Waste Collection Management App</Text>
                </View>


                {/* Tab Section */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'resident' && styles.tabActive]}
                        onPress={() => setActiveTab('resident')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'resident' && styles.tabTextActive,
                            ]}
                        >
                            Resident
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'official' && styles.tabActive]}
                        onPress={() => setActiveTab('official')}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                activeTab === 'official' && styles.tabTextActive,
                            ]}
                        >
                            Official
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Tab Description */}
                {activeTab === 'official' && (
                    <View style={styles.tabDescription}>
                        <MaterialCommunityIcons name="check-circle" size={20} color="#2ECC71" />
                        <Text style={styles.tabDescriptionText}>
                            Official portal for authorized municipal staff
                        </Text>
                    </View>
                )}

                {activeTab === 'official' && (
                    <View style={styles.formContainer}>
                        {/* Department Dropdown */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Department</Text>
                            <TouchableOpacity
                                style={styles.dropdown}
                                onPress={() => setShowDepartmentDropdown(!showDepartmentDropdown)}
                            >
                                <Text
                                    style={[
                                        styles.dropdownText,
                                        !selectedDepartment && styles.placeholderText,
                                    ]}
                                >
                                    {selectedDepartment || 'Select Department'}
                                </Text>
                                <MaterialCommunityIcons
                                    name="chevron-down"
                                    size={24}
                                    color="#9CFF00"
                                />
                            </TouchableOpacity>
                            {showDepartmentDropdown && (
                                <View style={styles.dropdownMenu}>
                                    {departments.map((dept, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedDepartment(dept);
                                                setShowDepartmentDropdown(false);
                                            }}
                                        >
                                            <Text style={styles.dropdownItemText}>{dept}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Employee ID Input */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Employee ID</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your employee ID"
                                placeholderTextColor="#7A8A99"
                                value={employeeId}
                                onChangeText={setEmployeeId}
                            />
                        </View>

                        {/* Password/OTP Toggle */}
                        <View style={styles.authMethodContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.authMethodBtn,
                                    authMethod === 'password' && styles.authMethodBtnActive,
                                ]}
                                onPress={() => setAuthMethod('password')}
                            >
                                <Text
                                    style={[
                                        styles.authMethodText,
                                        authMethod === 'password' && styles.authMethodTextActive,
                                    ]}
                                >
                                    Password
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.authMethodBtn,
                                    authMethod === 'otp' && styles.authMethodBtnActive,
                                ]}
                                onPress={() => setAuthMethod('otp')}
                            >
                                <Text
                                    style={[
                                        styles.authMethodText,
                                        authMethod === 'otp' && styles.authMethodTextActive,
                                    ]}
                                >
                                    OTP
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Password Input */}
                        {authMethod === 'password' && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Password</Text>
                                <View style={styles.passwordInputContainer}>
                                    <TextInput
                                        style={styles.passwordInput}
                                        placeholder="Enter your password"
                                        placeholderTextColor="#7A8A99"
                                        secureTextEntry={!showPassword}
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowPassword(!showPassword)}
                                        style={styles.eyeIcon}
                                    >
                                        <MaterialCommunityIcons
                                            name={showPassword ? 'eye' : 'eye-off'}
                                            size={24}
                                            color="#2ECC71"
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Forgot Password Link */}
                        <TouchableOpacity style={styles.forgotPasswordContainer}>
                            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                        </TouchableOpacity>

                        {/* Login Button */}
                        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
                            <Text style={styles.loginButtonText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {activeTab === 'resident' && (
                    <View style={styles.formContainer}>
                        <Text style={styles.residentText}>Resident Login - Coming Soon</Text>
                    </View>
                )}

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        By continuing, you agree to our{' '}
                        <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
                        <Text style={styles.footerLink}>Privacy Policy</Text>
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#0F1419',
    },
    logoImage: {
        width: 50,
        height: 50,
        marginBottom: 10,
    },

    container: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingVertical: 20,
        backgroundColor: '#0F1419',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoContainer: {
        position: 'relative',
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    logoInner: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    appTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#9CFF00',
        letterSpacing: 2,
        marginBottom: 5,
    },
    appSubtitle: {
        fontSize: 14,
        color: '#FFFFFF',
        opacity: 0.8,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        backgroundColor: '#1A1F2A',
        borderRadius: 8,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderRadius: 6,
    },
    tabActive: {
        backgroundColor: '#2ECC71',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        opacity: 0.6,
    },
    tabTextActive: {
        color: '#FFFFFF',
        opacity: 1,
    },
    tabDescription: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A2F2A',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 25,
    },
    tabDescriptionText: {
        fontSize: 13,
        color: '#2ECC71',
        marginLeft: 10,
        fontWeight: '500',
    },
    formContainer: {
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1A2035',
        borderWidth: 1,
        borderColor: '#2C3E50',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    dropdownText: {
        fontSize: 14,
        color: '#FFFFFF',
        flex: 1,
    },
    placeholderText: {
        color: '#7A8A99',
    },
    dropdownMenu: {
        backgroundColor: '#1A2035',
        borderWidth: 1,
        borderColor: '#2C3E50',
        borderTopWidth: 0,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        marginTop: -8,
        overflow: 'hidden',
    },
    dropdownItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2C3E50',
    },
    dropdownItemText: {
        fontSize: 14,
        color: '#FFFFFF',
    },
    input: {
        backgroundColor: '#1A2035',
        borderWidth: 1,
        borderColor: '#2C3E50',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#FFFFFF',
        fontSize: 14,
    },
    authMethodContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    authMethodBtn: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#1A2035',
        borderWidth: 1,
        borderColor: '#2C3E50',
        borderRadius: 8,
        alignItems: 'center',
    },
    authMethodBtnActive: {
        backgroundColor: '#2ECC71',
        borderColor: '#2ECC71',
    },
    authMethodText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
        opacity: 0.6,
    },
    authMethodTextActive: {
        color: '#FFFFFF',
        opacity: 1,
    },
    passwordInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1A2035',
        borderWidth: 1,
        borderColor: '#2C3E50',
        borderRadius: 8,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#FFFFFF',
        fontSize: 14,
    },
    eyeIcon: {
        paddingHorizontal: 12,
    },
    forgotPasswordContainer: {
        marginBottom: 25,
    },
    forgotPasswordText: {
        fontSize: 13,
        color: '#2ECC71',
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: '#2C3E50',
        paddingVertical: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    loginButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    residentText: {
        fontSize: 16,
        color: '#FFFFFF',
        textAlign: 'center',
        paddingVertical: 40,
    },
    footer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#2C3E50',
    },
    footerText: {
        fontSize: 11,
        color: '#7A8A99',
        textAlign: 'center',
        lineHeight: 18,
    },
    footerLink: {
        color: '#2ECC71',
        fontWeight: '600',
    },
});
