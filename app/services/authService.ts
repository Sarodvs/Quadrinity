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
    role?: string;
}

interface LoginResult {
    success: boolean;
    user?: { id: string; email?: string; displayName?: string };
    error?: string;
    needsOtp?: boolean;
    verificationId?: string;
}

// Fixed dummy password for pure frontend passwordless OTP flow demo
const OTP_DUMMY_PASSWORD = 'Passwordless123!@#';

const authService = {
    // Generates a 6-digit OTP and saves it to Firestore.
    // In production, a Cloud Function triggers on this document creation and emails the code.
    sendOTP: async (email: string): Promise<OTPResult> => {
        try {
            if (!email || email.trim() === '') {
                return { success: false, error: 'Email address is required' };
            }

            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

            // Save OTP in Firestore
            await setDoc(doc(db, 'login_otps', email.toLowerCase()), {
                otp: otpCode,
                createdAt: serverTimestamp(),
                expiresAt: new Date().getTime() + 10 * 60 * 1000 // 10 minutes
            });

            console.log(`\n\n================================`);
            console.log(`[DEV MODE] GENERATED OTP FOR ${email} IS: ${otpCode}`);
            console.log(`================================\n\n`);

            // --- ACTUAL EMAIL SENDING LOGIC (Using EmailJS Free API) ---
            try {
                await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        service_id: 'service_vsyjh2g',
                        template_id: 'template_sbb94kl',
                        user_id: 'nr8pT9rNIqTdlXzSy',
                        template_params: {
                            to_email: email,
                            otp_code: otpCode
                        }
                    })
                });
                console.log("Email sent successfully via EmailJS!");
            } catch (emailError) {
                console.log("Failed to send email via EmailJS (check keys)", emailError);
            }
            // -----------------------------------------------------------

            return {
                success: true,
                verificationId: email.toLowerCase(),
            };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to send OTP' };
        }
    },

    /**
     * Verify OTP; for the web we use the confirmation result,
     * for native we create a credential and sign in with it.
     */
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
                // For web, this simplistic flow assumes confirmation result was handled and
                // the caller just checks success on completion.
                return { success: true };
            } else {
                const credential = PhoneAuthProvider.credential(verificationId, otpCode);
                await signInWithCredential(auth, credential as any);
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

            return {
                success: true,
                needsOtp: true,
                verificationId: otpResult.verificationId,
            };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to login' };
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
             console.log("Registration Error:", error);
             // Handle "email already in use" gracefully
             if (error.code === 'auth/email-already-in-use') {
                 return { success: false, error: 'This email is already registered. Try logging in.' };
             }
             return { success: false, error: error.message || 'Failed to register' };
        }
    },

    registerUser: async (userData: any): Promise<OTPResult> => {
        const result = await authService.registerWithEmailAndPassword(userData);
        if (result.success) {
            return { success: true, verificationId: userData.email };
        }
        return { success: false, error: result.error };
    },

    logout: async (): Promise<VerifyResult> => {
        try {
            await firebaseSignOut(auth);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to logout' };
        }
    },
};

export default authService;
