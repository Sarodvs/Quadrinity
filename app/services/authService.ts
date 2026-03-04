// Mock Auth Service - No Firebase Required
// This service simulates OTP authentication without Firebase

interface OTPResult {
    success: boolean;
    verificationId?: string;
    error?: string;
}

interface VerifyResult {
    success: boolean;
    error?: string;
}

interface LoginResult {
    success: boolean;
    user?: any; // Mock user data
    error?: string;
}

const authService = {
    /**
     * Send OTP - Mock implementation
     * Always succeeds and returns a mock verification ID
     */
    sendOTP: async (
        email: string,
        recaptchaVerifier?: any
    ): Promise<OTPResult> => {
        try {
            // Simulate sending OTP
            // In a real scenario, this would call a backend API
            if (!email || email.trim() === '') {
                return {
                    success: false,
                    error: 'Email address is required',
                };
            }

            // Create a mock verification ID
            const mockVerificationId = `mock_${email}_${Date.now()}`;

            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                verificationId: mockVerificationId,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to send OTP',
            };
        }
    },

    /**
     * Verify OTP - Mock implementation
     * Always succeeds for any OTP
     */
    verifyOTP: async (
        verificationId: string,
        otpCode: string
    ): Promise<VerifyResult> => {
        try {
            if (!verificationId || verificationId.trim() === '') {
                return {
                    success: false,
                    error: 'Verification ID is required',
                };
            }

            if (!otpCode || otpCode.trim() === '' || otpCode.length !== 6) {
                return {
                    success: false,
                    error: 'Invalid OTP format',
                };
            }

            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Always verify successfully for demo purposes
            return {
                success: true,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to verify OTP',
            };
        }
    },

    /**
     * Register new user - Mock implementation
     */
    registerUser: async (userData: any): Promise<OTPResult> => {
        try {
            if (!userData.email) {
                return {
                    success: false,
                    error: 'Email address is required',
                };
            }

            const mockVerificationId = `mock_reg_${userData.email}_${Date.now()}`;

            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
                success: true,
                verificationId: mockVerificationId,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to register',
            };
        }
    },

    /**
     * Login with Email and Password - Mock implementation
     */
    loginWithEmailAndPassword: async (email: string, password: string): Promise<LoginResult> => {
        try {
            if (!email || email.trim() === '') {
                return { success: false, error: 'Email address is required' };
            }
            if (!password || password.trim() === '') {
                return { success: false, error: 'Password is required' };
            }

            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 800));

            // Hardcorded credentials check for Demo purposes
            if (email === "test@test.com" && password === "password123") {
                return {
                    success: true,
                    user: { id: "mock_user_1", email: "test@test.com", name: "Test User" }
                };
            }

            return {
                success: true,
                user: { id: `mock_${Date.now()}`, email, name: email.split("@")[0] }
            }

        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to login',
            };
        }
    },

    /**
 * Register with Email and Password - Mock implementation
 */
    registerWithEmailAndPassword: async (userData: any): Promise<LoginResult> => {
        try {
            if (!userData.email) {
                return { success: false, error: 'Email address is required' };
            }
            if (!userData.password) {
                return { success: false, error: 'Password is required' };
            }

            // Simulate network delay
            await new Promise((resolve) => setTimeout(resolve, 800));

            return {
                success: true,
                user: { id: `mock_${Date.now()}`, email: userData.email, name: userData.name || userData.email.split("@")[0] }
            }
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
            // Clear any stored user data
            await new Promise((resolve) => setTimeout(resolve, 300));

            return {
                success: true,
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to logout',
            };
        }
    },
};

export default authService;
