package services

import (
	"errors"
	"strings"
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

// RegisterInput is kept for the seed-admin CLI only.
// The public /register endpoint is disabled in LDAP mode.
type RegisterInput struct {
	Name     string          `json:"name" binding:"required,min=2"`
	Email    string          `json:"email" binding:"required,email"`
	Password string          `json:"password" binding:"required,min=6"`
	Role     models.UserRole `json:"role"`
	Division *string         `json:"division"`
	AuthType models.AuthType `json:"auth_type"` // defaults to "local" if empty
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

// ── Register (used by seed-admin CLI only) ────────────────────────────────────

// Register creates a new user account.
// In normal operations this is called only by the seed-admin CLI to create the
// first local admin. The HTTP handler for /register returns 410 Gone.
func (s *AuthService) Register(input RegisterInput) (*models.User, error) {
	// Check email uniqueness
	existingUser, err := s.userRepo.FindByEmail(input.Email)
	if err == nil && existingUser.ID > 0 {
		return nil, errors.New("email sudah terdaftar")
	}

	authType := input.AuthType
	if authType == "" {
		authType = models.AuthTypeLocal
	}

	var hashedPassword string
	if authType == models.AuthTypeLocal {
		if input.Password == "" {
			return nil, errors.New("password wajib diisi untuk akun lokal")
		}
		hashedPassword, err = utils.HashPassword(input.Password)
		if err != nil {
			return nil, err
		}
	}

	role := input.Role
	if role == "" {
		role = models.RoleUser
	}

	user := &models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: hashedPassword,
		AuthType: authType,
		Role:     role,
		Division: input.Division,
		IsActive: true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	if _, err := s.userRepo.GetOrCreatePreferences(user.ID); err != nil {
		return nil, err
	}

	return user, nil
}

// ── Credentials & session helpers ────────────────────────────────────────────

// ValidateCredentials authenticates a user.
//
// Routing logic:
//  1. If user exists in DB with AuthType == "local"  → bcrypt check.
//  2. If user exists in DB with AuthType == "ldap"   → Active Directory check.
//  3. If user does NOT exist in DB yet               → try LDAP; on success
//     auto-create the account with role "user".
//
// The email field in LoginInput is used as the sAMAccountName / username sent
// to LDAP when the value contains no "@". When it does contain "@" only the
// local part (before "@") is extracted for the LDAP search.
func (s *AuthService) ValidateCredentials(input LoginInput) (*models.User, error) {
	user, dbErr := s.userRepo.FindByEmail(input.Email)

	if dbErr == nil {
		// ── User found in DB ───────────────────────────────────────────────────
		if !user.IsActive {
			return nil, errors.New("akun tidak aktif")
		}

		switch user.AuthType {
		case models.AuthTypeLocal:
			if err := utils.CheckPassword(user.Password, input.Password); err != nil {
				return nil, errors.New("email atau password salah")
			}

		case models.AuthTypeLDAP:
			ldapUsername := extractLDAPUsername(input.Email)
			if _, err := utils.LDAPAuthenticate(ldapUsername, input.Password); err != nil {
				return nil, errors.New("email atau password salah")
			}

		default:
			return nil, errors.New("tipe autentikasi tidak dikenal")
		}

		return user, nil
	}

	// ── User NOT found in DB — only proceed if it's an ErrRecordNotFound ──────
	if dbErr != gorm.ErrRecordNotFound {
		return nil, dbErr
	}

	// ── Try LDAP (auto-create flow) ────────────────────────────────────────────
	if config.App.LDAP.Host == "" {
		// LDAP is not configured and the user isn't in the DB.
		return nil, errors.New("email atau password salah")
	}

	ldapUsername := extractLDAPUsername(input.Email)
	ldapInfo, err := utils.LDAPAuthenticate(ldapUsername, input.Password)
	if err != nil {
		return nil, errors.New("email atau password salah")
	}

	// Resolve email: prefer the one from LDAP, fall back to the login input.
	email := ldapInfo.Email
	if email == "" {
		email = input.Email
	}

	// Resolve division
	var division *string
	if ldapInfo.Division != "" {
		division = &ldapInfo.Division
	}

	// Create the user with role "user" — admins must be promoted manually.
	newUser := &models.User{
		Name:     ldapInfo.Name,
		Email:    email,
		AuthType: models.AuthTypeLDAP,
		Role:     models.RoleUser,
		Division: division,
		IsActive: true,
	}

	if err := s.userRepo.Create(newUser); err != nil {
		return nil, errors.New("gagal membuat akun secara otomatis: " + err.Error())
	}

	if _, err := s.userRepo.GetOrCreatePreferences(newUser.ID); err != nil {
		// Non-fatal; log but don't fail the login.
		_ = err
	}

	// Return fresh record with Preferences pre-loaded.
	return s.userRepo.FindByID(newUser.ID)
}

// extractLDAPUsername strips the domain part from an email address so that
// "john.doe@perusahaan.com" becomes "john.doe" for the sAMAccountName lookup.
// If the value contains no "@", it is returned as-is.
func extractLDAPUsername(email string) string {
	if idx := strings.Index(email, "@"); idx > 0 {
		return email[:idx]
	}
	return email
}

// ── Session helpers ───────────────────────────────────────────────────────────

// CreateLoginSession generates JWT tokens, stores a UserSession record, and
// returns the complete LoginResponse.
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
// Used by the OTP-login second step.
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
