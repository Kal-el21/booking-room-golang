package services

import (
	"errors"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/config"
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"gorm.io/gorm"
)

type AuthService struct {
	userRepo *repositories.UserRepository
}

func NewAuthService(userRepo *repositories.UserRepository) *AuthService {
	return &AuthService{
		userRepo: userRepo,
	}
}

// ── Input / Response types ────────────────────────────────────────────────────

type RegisterInput struct {
	Name     string          `json:"name" binding:"required,min=2"`
	Email    string          `json:"email" binding:"required,email"`
	Password string          `json:"password" binding:"required,min=6"`
	Role     models.UserRole `json:"role"`
	Division string          `json:"division" binding:"required"`
}

type LoginInput struct {
	Email      string `json:"email" binding:"required,email"`
	Password   string `json:"password" binding:"required"`
	RememberMe bool   `json:"remember_me"`
}

type LoginResponse struct {
	User         models.UserResponse `json:"user"`
	AccessToken  string              `json:"access_token"`
	RefreshToken string              `json:"refresh_token"`
	TokenType    string              `json:"token_type"`
	ExpiresIn    int                 `json:"expires_in"` // seconds
}

// ── Register ─────────────────────────────────────────────────────────────────

// Register creates a new user account.
//
// When ENABLE_EMAIL_VERIFICATION=true the account is set inactive (IsActive=false)
// so the user cannot log in until they verify their email. The caller (handler)
// is responsible for triggering the OTP email after this returns.
func (s *AuthService) Register(input RegisterInput) (*models.User, error) {
	// Check email uniqueness
	existingUser, err := s.userRepo.FindByEmail(input.Email)
	if err == nil && existingUser.ID > 0 {
		return nil, errors.New("email sudah terdaftar")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	// Default role
	role := input.Role
	if role == "" {
		role = models.RoleUser
	}

	// When email verification is required the account starts as inactive
	isActive := true
	if config.App.Feature.EnableEmailVerification {
		isActive = false
	}

	user := &models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: hashedPassword,
		Role:     role,
		Division: &input.Division,
		IsActive: isActive,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Create default notification preferences
	if _, err := s.userRepo.GetOrCreatePreferences(user.ID); err != nil {
		return nil, err
	}

	return user, nil
}

// ── Credentials & session helpers ────────────────────────────────────────────

// ValidateCredentials checks that the email exists, the account is active, and
// the password is correct. Returns the User on success, an error otherwise.
// Used by both the classic Login path and the OTP-login first step.
func (s *AuthService) ValidateCredentials(input LoginInput) (*models.User, error) {
	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("email atau password salah")
		}
		return nil, err
	}

	if !user.IsActive {
		// Distinguish between "not yet verified" and "disabled by admin"
		if user.EmailVerifiedAt == nil && config.App.Feature.EnableEmailVerification {
			return nil, errors.New("akun belum diverifikasi, silakan cek email Anda")
		}
		return nil, errors.New("akun tidak aktif")
	}

	if err := utils.CheckPassword(user.Password, input.Password); err != nil {
		return nil, errors.New("email atau password salah")
	}

	return user, nil
}

// CreateLoginSession generates JWT tokens, stores a UserSession record, and
// returns the complete LoginResponse. Called after credentials (and optionally OTP)
// have already been validated.
func (s *AuthService) CreateLoginSession(user *models.User, rememberMe bool, ipAddress, userAgent *string) (*LoginResponse, error) {
	accessToken, refreshToken, accessExpiry, refreshExpiry, err := utils.GenerateToken(user, rememberMe)
	if err != nil {
		return nil, err
	}

	tokenLifetimeDays := 1
	if rememberMe {
		tokenLifetimeDays = 7
	}

	session := &models.UserSession{
		UserID:                user.ID,
		AccessToken:           accessToken,
		RefreshToken:          &refreshToken,
		RememberMe:            rememberMe,
		TokenLifetimeDays:     tokenLifetimeDays,
		IPAddress:             ipAddress,
		UserAgent:             userAgent,
		AccessTokenExpiresAt:  accessExpiry,
		RefreshTokenExpiresAt: &refreshExpiry,
	}

	if err := s.userRepo.CreateSession(session); err != nil {
		return nil, err
	}

	expiresIn := int(config.App.JWT.GetAccessTokenDuration(rememberMe).Seconds())

	return &LoginResponse{
		User:         user.ToResponse(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    expiresIn,
	}, nil
}

// CreateSessionForUser looks up a user by ID then calls CreateLoginSession.
// Used by the OTP-login second step where we already have the user ID.
func (s *AuthService) CreateSessionForUser(userID uint, rememberMe bool, ipAddress, userAgent *string) (*LoginResponse, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user tidak ditemukan")
	}

	if !user.IsActive {
		return nil, errors.New("akun tidak aktif")
	}

	return s.CreateLoginSession(user, rememberMe, ipAddress, userAgent)
}

// ActivateUser marks the user as active and records the email verification timestamp.
// Called after a successful email-verification OTP check.
func (s *AuthService) ActivateUser(userID uint) (*models.User, error) {
	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	user.IsActive = true
	user.EmailVerifiedAt = &now

	if err := s.userRepo.Update(user); err != nil {
		return nil, err
	}

	return s.userRepo.FindByID(userID)
}

// ── Classic Login (no OTP) ────────────────────────────────────────────────────

// Login is the classic single-step login used when ENABLE_OTP_LOGIN=false.
// It validates credentials and immediately creates a session.
func (s *AuthService) Login(input LoginInput, ipAddress, userAgent *string) (*LoginResponse, error) {
	user, err := s.ValidateCredentials(input)
	if err != nil {
		return nil, err
	}

	return s.CreateLoginSession(user, input.RememberMe, ipAddress, userAgent)
}

// ── Logout ────────────────────────────────────────────────────────────────────

func (s *AuthService) Logout(accessToken string) error {
	return s.userRepo.DeleteSession(accessToken)
}

// ── Token refresh ─────────────────────────────────────────────────────────────

func (s *AuthService) GetCurrentUser(userID uint) (*models.User, error) {
	return s.userRepo.FindByID(userID)
}

func (s *AuthService) RefreshToken(refreshToken string) (*LoginResponse, error) {
	claims, err := utils.ValidateToken(refreshToken)
	if err != nil {
		return nil, errors.New("refresh token tidak valid")
	}

	user, err := s.userRepo.FindByID(claims.UserID)
	if err != nil {
		return nil, err
	}

	if !user.IsActive {
		return nil, errors.New("akun tidak aktif")
	}

	session, err := s.userRepo.FindSessionByRefreshToken(refreshToken, user.ID)
	if err != nil {
		return nil, errors.New("sesi tidak ditemukan")
	}

	newAccessToken, accessExpiry, err := utils.RefreshAccessToken(refreshToken, session.RememberMe)
	if err != nil {
		return nil, err
	}

	session.AccessToken = newAccessToken
	session.AccessTokenExpiresAt = accessExpiry
	if err := s.userRepo.UpdateSession(session); err != nil {
		return nil, err
	}

	expiresIn := int(config.App.JWT.GetAccessTokenDuration(session.RememberMe).Seconds())

	return &LoginResponse{
		User:         user.ToResponse(),
		AccessToken:  newAccessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    expiresIn,
	}, nil
}
