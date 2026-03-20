import { auth, db } from '../firebaseConfig';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut 
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface OTPResult {
    success: boolean;
    verificationId?: string;
    error?: string;
}

interface VerifyResult {
    success: boolean;
    error?: string;
    role?: string;
}

interface LoginResult {
    success: boolean;
    user?: any;
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

    // Verifies the OTP in Firestore, then authenticates with Firebase using the dummy password.
    verifyOTP: async (verificationId: string, otpCode: string): Promise<VerifyResult> => {
        try {
            const email = verificationId.toLowerCase();
            const otpDocRef = doc(db, 'login_otps', email);
            const otpDoc = await getDoc(otpDocRef);

            if (!otpDoc.exists()) {
                return { success: false, error: 'No OTP requested for this email' };
            }

            const data = otpDoc.data();
            if (new Date().getTime() > data.expiresAt) {
                return { success: false, error: 'OTP has expired. Please request a new one.' };
            }

            if (data.otp !== otpCode) {
                return { success: false, error: 'Invalid OTP code' };
            }

            // OTP is correct! Now sign them in silently
            await signInWithEmailAndPassword(auth, email, OTP_DUMMY_PASSWORD);

            // Fetch their role from Firestore
            const userDoc = await getDoc(doc(db, 'users', email));
            let role = 'resident';
            if (userDoc.exists() && userDoc.data().role) {
                role = userDoc.data().role;
            }

            return { success: true, role };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to verify OTP' };
        }
    },

    // Handles initial Login Request by routing to OTP
    loginWithEmail: async (email: string): Promise<LoginResult> => {
        try {
            if (!email || email.trim() === '') {
                return { success: false, error: 'Email address is required' };
            }

            // Verify the user actually exists in our Firestore
            const userDoc = await getDoc(doc(db, 'users', email.toLowerCase()));
            if (!userDoc.exists()) {
                return { success: false, error: 'User does not exist. Please register first.' };
            }

            // Trigger OTP sending
            const otpResult = await authService.sendOTP(email);
            if (!otpResult.success) {
                return { success: false, error: otpResult.error };
            }

            return {
                success: true,
                needsOtp: true,
                verificationId: otpResult.verificationId,
            };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to login' };
        }
    },

    loginWithEmailAndPassword: async (email: string, password: string): Promise<LoginResult> => {
        // Fallback or replaced by loginWithEmail
        return authService.loginWithEmail(email);
    },

    // Registers a new user, uses fixed dummy password to allow OTP-only logins later,
    // and saves Resident / Official details to Firestore
    registerWithEmailAndPassword: async (userData: any): Promise<LoginResult> => {
        try {
            console.log("Starting registration for:", userData.email);
            if (!userData.email) return { success: false, error: 'Email is required' };
            
            const email = userData.email.toLowerCase();

            // Create Firebase Auth user
            console.log("Calling createUserWithEmailAndPassword...");
            await createUserWithEmailAndPassword(auth, email, OTP_DUMMY_PASSWORD);
            console.log("createUserWithEmailAndPassword SUCCESS");

            // Determine role (you can pass this from the UI if needed)
            const role = userData.role || 'resident';

            // Save user profile data and role in Firestore
            console.log("Calling setDoc to save user profile in Firestore...");
            await setDoc(doc(db, 'users', email), {
                name: userData.name || email.split("@")[0],
                email: email,
                role: role,
                houseNo: userData.houseNo || '',
                address: userData.address || '',
                officialId: userData.officialId || '',
                createdAt: serverTimestamp()
            });
            console.log("setDoc SUCCESS");

            return { success: true, user: { email, role } };
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
            await signOut(auth);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message || 'Failed to logout' };
        }
    },
};

export default authService;
