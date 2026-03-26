package handlers

import (
	"log"

	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService          *services.AuthService
	otpService           *services.OTPService
	systemSettingService *services.SystemSettingService
}

func NewAuthHandler(
	authService *services.AuthService,
	otpService *services.OTPService,
	systemSettingService *services.SystemSettingService,
) *AuthHandler {
	return &AuthHandler{
		authService:          authService,
		otpService:           otpService,
		systemSettingService: systemSettingService,
	}
}

// Register handles new user registration.
// ENABLE_EMAIL_VERIFICATION in .env is still system-level (for registration).
// @route POST /api/v1/auth/register
func (h *AuthHandler) Register(c *gin.Context) {
	var input services.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	user, err := h.authService.Register(input)
	if err != nil {
		utils.ErrorResponse(c, 400, "Registrasi gagal", err.Error())
		return
	}

	// Read email verification toggle from DB (set by admin via Settings page).
	// Falls back to false if the key has never been configured.
	emailVerificationEnabled := h.systemSettingService.IsEmailVerificationEnabled()

	if emailVerificationEnabled {
		if err := h.otpService.GenerateAndSend(user, models.OTPTypeEmailVerification); err != nil {
			log.Printf("[AuthHandler] Register: failed to send verification OTP to %s: %v", user.Email, err)
		}

		utils.SuccessResponse(c, 201, "Registrasi berhasil. Silakan cek email Anda untuk kode verifikasi.", gin.H{
			"verification_required": true,
			"user_id":               user.ID,
			"email":                 user.Email,
		})
		return
	}

	utils.SuccessResponse(c, 201, "Registrasi berhasil", user.ToResponse())
}

// VerifyEmail validates the email-verification OTP and activates the account.
// @route POST /api/v1/auth/verify-email
func (h *AuthHandler) VerifyEmail(c *gin.Context) {
	var input struct {
		UserID uint   `json:"user_id" binding:"required"`
		Code   string `json:"code" binding:"required,len=6"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	if err := h.otpService.VerifyOTP(input.UserID, input.Code, models.OTPTypeEmailVerification); err != nil {
		utils.ErrorResponse(c, 400, "Verifikasi gagal", err.Error())
		return
	}

	user, err := h.authService.ActivateUser(input.UserID)
	if err != nil {
		utils.ErrorResponse(c, 500, "Gagal mengaktifkan akun", err.Error())
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	response, err := h.authService.CreateLoginSession(user, false, &ipAddress, &userAgent)
	if err != nil {
		utils.ErrorResponse(c, 500, "Gagal membuat sesi", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Email berhasil diverifikasi, selamat datang!", response)
}

// ResendVerificationEmail resends the email-verification OTP.
// @route POST /api/v1/auth/resend-verification
func (h *AuthHandler) ResendVerificationEmail(c *gin.Context) {
	var input struct {
		UserID uint `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	email, err := h.otpService.ResendOTP(input.UserID, models.OTPTypeEmailVerification)
	if err != nil {
		utils.ErrorResponse(c, 400, "Gagal mengirim ulang kode verifikasi", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Kode verifikasi telah dikirim ulang", gin.H{"email": email})
}

// Login handles authentication.
//
// OTP is now a per-user preference (user.Preferences.OtpLoginEnabled).
// If enabled → send OTP, return pending state.
// If disabled (default) → return JWT tokens immediately.
//
// @route POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var input services.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")

	// Always validate credentials first
	user, err := h.authService.ValidateCredentials(input)
	if err != nil {
		utils.ErrorResponse(c, 401, "Login gagal", err.Error())
		return
	}

	// Determine if OTP is needed from this user's own preference (default: false)
	otpEnabled := user.Preferences != nil && user.Preferences.OtpLoginEnabled

	if otpEnabled {
		if err := h.otpService.GenerateAndSend(user, models.OTPTypeLogin); err != nil {
			log.Printf("[AuthHandler] Login: failed to send OTP to %s: %v", user.Email, err)
			utils.ErrorResponse(c, 500, "Gagal mengirim kode OTP", err.Error())
			return
		}

		utils.SuccessResponse(c, 200, "Kode OTP telah dikirim ke email Anda", gin.H{
			"otp_required": true,
			"user_id":      user.ID,
			"email":        user.Email,
			"remember_me":  input.RememberMe,
		})
		return
	}

	// Classic flow
	response, err := h.authService.CreateLoginSession(user, input.RememberMe, &ipAddress, &userAgent)
	if err != nil {
		utils.ErrorResponse(c, 500, "Gagal membuat sesi", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Login berhasil", response)
}

// VerifyLoginOTP is step 2 of the OTP login flow.
// @route POST /api/v1/auth/verify-login-otp
func (h *AuthHandler) VerifyLoginOTP(c *gin.Context) {
	var input struct {
		UserID     uint   `json:"user_id" binding:"required"`
		Code       string `json:"code" binding:"required,len=6"`
		RememberMe bool   `json:"remember_me"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	if err := h.otpService.VerifyOTP(input.UserID, input.Code, models.OTPTypeLogin); err != nil {
		utils.ErrorResponse(c, 400, "Verifikasi OTP gagal", err.Error())
		return
	}

	ipAddress := c.ClientIP()
	userAgent := c.GetHeader("User-Agent")
	response, err := h.authService.CreateSessionForUser(input.UserID, input.RememberMe, &ipAddress, &userAgent)
	if err != nil {
		utils.ErrorResponse(c, 500, "Gagal membuat sesi", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Login berhasil", response)
}

// ResendLoginOTP regenerates and resends the login OTP.
// @route POST /api/v1/auth/resend-login-otp
func (h *AuthHandler) ResendLoginOTP(c *gin.Context) {
	var input struct {
		UserID uint `json:"user_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	email, err := h.otpService.ResendOTP(input.UserID, models.OTPTypeLogin)
	if err != nil {
		utils.ErrorResponse(c, 400, "Gagal mengirim ulang kode OTP", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Kode OTP telah dikirim ulang", gin.H{"email": email})
}

// Logout revokes the current session.
// @route POST /api/v1/auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		utils.ErrorResponse(c, 401, "Authorization header diperlukan", nil)
		return
	}

	token := authHeader[7:]
	if err := h.authService.Logout(token); err != nil {
		utils.ErrorResponse(c, 500, "Logout gagal", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Logout berhasil", nil)
}

// Me returns the current authenticated user.
// @route GET /api/v1/auth/me
func (h *AuthHandler) Me(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		utils.ErrorResponse(c, 401, "Unauthorized", nil)
		return
	}
	utils.SuccessResponse(c, 200, "User berhasil diambil", user.ToResponse())
}

// RefreshToken issues a new access token.
// @route POST /api/v1/auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var input struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		utils.ValidationErrorResponse(c, err.Error())
		return
	}

	response, err := h.authService.RefreshToken(input.RefreshToken)
	if err != nil {
		utils.ErrorResponse(c, 401, "Refresh token gagal", err.Error())
		return
	}

	utils.SuccessResponse(c, 200, "Token berhasil diperbarui", response)
}
