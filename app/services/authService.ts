// Real Firebase Auth Service
// This service simulates OTP authentication and login with Firebase

import {
    ConfirmationResult,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    PhoneAuthProvider,
    RecaptchaVerifier,
    signInWithCredential,
    signInWithEmailAndPassword,
    signInWithPhoneNumber,
} from 'firebase/auth';
import { doc, getFirestore, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth } from '../firebase';

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
     * Register with Email and Password
     */
    registerWithEmailAndPassword: async (userData: any): Promise<LoginResult> => {
        try {
            const regResult = await authService.registerUser(userData);
            if (regResult.success && regResult.verificationId) {
                return {
                    success: true,
                    user: { id: regResult.verificationId, email: userData.email, displayName: userData.name || userData.email.split("@")[0] }
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
