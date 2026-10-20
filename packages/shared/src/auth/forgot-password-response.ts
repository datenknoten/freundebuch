/** Response from POST /api/auth/forgot-password */
export interface ForgotPasswordResponse {
  message: string;
  resetToken?: string;
}
