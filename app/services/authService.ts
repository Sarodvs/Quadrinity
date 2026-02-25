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

const authService = {
    /**
     * Send OTP - Mock implementation
     * Always succeeds and returns a mock verification ID
     */
    sendOTP: async (
        phoneNumber: string,
        recaptchaVerifier?: any
    ): Promise<OTPResult> => {
        try {
            // Simulate sending OTP
            // In a real scenario, this would call a backend API
            if (!phoneNumber || phoneNumber.trim() === '') {
                return {
                    success: false,
                    error: 'Phone number is required',
                };
            }

            // Create a mock verification ID
            const mockVerificationId = `mock_${phoneNumber}_${Date.now()}`;

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
            if (!userData.mobile) {
                return {
                    success: false,
                    error: 'Mobile number is required',
                };
            }

            const mockVerificationId = `mock_reg_${userData.mobile}_${Date.now()}`;

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
