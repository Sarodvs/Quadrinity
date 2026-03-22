// Real Firebase Auth Service
// This service simulates OTP authentication and login with Firebase

import { auth } from '@/firebase';
import {
    ConfirmationResult,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    RecaptchaVerifier,
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
} from 'firebase/auth';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

const firestore = getFirestore();

interface OTPResult {
    success: boolean;
    verificationId?: string;
    error?: string;
    confirmation?: ConfirmationResult;
}

interface VerifyResult {
    success: boolean;
    error?: string;
}

interface LoginResult {
    success: boolean;
    user?: { id: string; email?: string; displayName?: string };
    error?: string;
}

const DEMO_OFFICIALS: Record<string, { password: string; displayName: string }> = {
    OFF001: { password: 'Green@123', displayName: 'Arun Kumar' },
    OFF002: { password: 'Clean@234', displayName: 'Meera Nair' },
    OFF003: { password: 'Recycle@345', displayName: 'Rahul Das' },
    OFF004: { password: 'EcoDrive@456', displayName: 'Anjali Menon' },
    OFF005: { password: 'WasteLess@567', displayName: 'Vikram Pillai' },
};

const authService = {
    /**
     * Send OTP via Firebase. On web, you need to supply a RecaptchaVerifier;
     * on native we use react-native-firebase's phone auth API.
     */
    sendOTP: async (
        phoneNumber: string,
        recaptchaVerifier?: RecaptchaVerifier
    ): Promise<OTPResult> => {
        try {
            if (!phoneNumber) {
                return { success: false, error: 'Phone number is required' };
            }
            if (Platform.OS === 'web') {
                let verifier = recaptchaVerifier;
                if (!verifier) {
                    verifier = new (RecaptchaVerifier as any)(
                        'recaptcha-container',
                        { size: 'invisible' },
                        auth
                    );
                }
                const confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
                return {
                    success: true,
                    verificationId: confirmation.verificationId,
                    confirmation,
                };
            } else {
                // Mock native OTP since Expo Go cannot use native Firebase SDKs
                // Use '123456' as OTP. User will be logged in anonymously
                console.warn('Using MOCK OTP for Expo Go.');
                return {
                    success: true,
                    verificationId: 'mock-verification-id',
                };
            }
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to send OTP' };
        }
    },

    verifyOTP: async (
        verificationId: string,
        otpCode: string
    ): Promise<VerifyResult> => {
        try {
            if (!verificationId) {
                return { success: false, error: 'Verification ID is required' };
            }
            if (!otpCode || otpCode.length !== 6) {
                return { success: false, error: 'Invalid OTP format' };
            }

            if (Platform.OS === 'web') {
                return { success: true };
            } else {
                if (otpCode !== '123456') {
                    return { success: false, error: 'Invalid OTP. Use 123456 for testing.' };
                }
                return { success: true };
            }
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to verify OTP' };
        }
    },

    /**
     * Register new user with Firebase (for testing OTP API similarity, though logic uses registerUser)
     */
    registerUser: async (userData: any): Promise<OTPResult> => {
        try {
            if (!userData.email || !userData.password) {
                return { success: false, error: 'Email and password required' };
            }
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                userData.email,
                userData.password
            );
            // store extra profile data in Firestore
            const uid = userCredential.user.uid;
            const profile = {
                name: userData.name || '',
                mobileNo: userData.mobileNo || '',
                email: userData.email || '',
                houseNo: userData.houseNo || '',
                address: userData.address || '',
                createdAt: new Date().toISOString(),
            };
            await setDoc(doc(firestore, 'users', uid), profile);

            return {
                success: true,
                verificationId: uid,
            };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to register' };
        }
    },

    /**
     * Login with Email and Password
     */
    loginWithEmailAndPassword: async (email: string, password: string): Promise<LoginResult> => {
        try {
            if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
                return { success: false, error: 'A valid email is required' };
            }
            if (!password || password.length < 6) {
                return { success: false, error: 'Password must be at least 6 characters' };
            }

            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            return {
                success: true,
                user: {
                    id: user.uid,
                    email: user.email || undefined,
                    displayName: user.displayName || undefined,
                },
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to login',
            };
        }
    },

    /**
     * Login for officials using preexisting userId + password credentials.
     */
    loginOfficialWithCredentials: async (userId: string, password: string): Promise<LoginResult> => {
        try {
            const normalizedUserId = (userId || '').trim().toUpperCase();
            const normalizedPassword = (password || '').trim();

            if (!normalizedUserId || !normalizedPassword) {
                return { success: false, error: 'Official User ID and password are required.' };
            }

            const officialRef = doc(firestore, 'officials', normalizedUserId);
            const officialSnap = await getDoc(officialRef);

            if (officialSnap.exists()) {
                const officialData = officialSnap.data() as {
                    userId?: string;
                    password?: string;
                    displayName?: string;
                    isActive?: boolean;
                };

                if (officialData.isActive === false) {
                    return { success: false, error: 'This official account is inactive.' };
                }

                if (!officialData.password || officialData.password !== normalizedPassword) {
                    return { success: false, error: 'Invalid official credentials.' };
                }

                return {
                    success: true,
                    user: {
                        id: officialData.userId || normalizedUserId,
                        displayName: officialData.displayName || normalizedUserId,
                    },
                };
            }

            const matchedOfficial = DEMO_OFFICIALS[normalizedUserId];
            if (!matchedOfficial || matchedOfficial.password !== normalizedPassword) {
                return { success: false, error: 'Invalid official credentials.' };
            }

            await setDoc(
                officialRef,
                {
                    userId: normalizedUserId,
                    password: matchedOfficial.password,
                    displayName: matchedOfficial.displayName,
                    isActive: true,
                    isSeededDemo: true,
                    updatedAt: Date.now(),
                },
                { merge: true }
            );

            return {
                success: true,
                user: {
                    id: normalizedUserId,
                    displayName: matchedOfficial.displayName,
                },
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to login official user.',
            };
        }
    },

    /**
     * Register with Email and Password
     */
    registerWithEmailAndPassword: async (userData: any): Promise<LoginResult> => {
        try {
            const regResult = await authService.registerUser(userData);
            if (regResult.success && regResult.verificationId) {
                return {
                    success: true,
                    user: { id: regResult.verificationId, email: userData.email, displayName: userData.name || userData.email.split('@')[0] }
                };
            }
            return { success: false, error: regResult.error };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to register',
            };
        }
    },

    /**
     * Logout - Mock implementation
     */
    logout: async (): Promise<VerifyResult> => {
        try {
            await firebaseSignOut(auth);
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to logout',
            };
        }
    },
};

export default authService;
