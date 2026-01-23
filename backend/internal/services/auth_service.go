package services

import (
	"errors"

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

type RegisterInput struct {
	Name     string          `json:"name" binding:"required,min=2"`
	Email    string          `json:"email" binding:"required,email"`
	Password string          `json:"password" binding:"required,min=6"`
	Role     models.UserRole `json:"role"`
	Division *string         `json:"division"`
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
	ExpiresIn    int                 `json:"expires_in"` // in seconds
}

// Register registers a new user
func (s *AuthService) Register(input RegisterInput) (*models.User, error) {
	// Check if email already exists
	existingUser, err := s.userRepo.FindByEmail(input.Email)
	if err == nil && existingUser.ID > 0 {
		return nil, errors.New("email already registered")
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	// Set default role if not provided
	role := input.Role
	if role == "" {
		role = models.RoleUser
	}

	// Create user
	user := &models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: hashedPassword,
		Role:     role,
		Division: input.Division,
		IsActive: true,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	// Create default preferences
	_, err = s.userRepo.GetOrCreatePreferences(user.ID)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// Login authenticates user and returns tokens
func (s *AuthService) Login(input LoginInput, ipAddress, userAgent *string) (*LoginResponse, error) {
	// Find user by email
	user, err := s.userRepo.FindByEmail(input.Email)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("invalid email or password")
		}
		return nil, err
	}

	// Check if user is active
	if !user.IsActive {
		return nil, errors.New("account is inactive")
	}

	// Check password
	if err := utils.CheckPassword(user.Password, input.Password); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate tokens
	accessToken, refreshToken, accessExpiry, refreshExpiry, err := utils.GenerateToken(user, input.RememberMe)
	if err != nil {
		return nil, err
	}

	// Calculate token lifetime in days
	tokenLifetimeDays := 1
	if input.RememberMe {
		tokenLifetimeDays = 7
	}

	// Create session
	session := &models.UserSession{
		UserID:                user.ID,
		AccessToken:           accessToken,
		RefreshToken:          &refreshToken,
		RememberMe:            input.RememberMe,
		TokenLifetimeDays:     tokenLifetimeDays,
		IPAddress:             ipAddress,
		UserAgent:             userAgent,
		AccessTokenExpiresAt:  accessExpiry,
		RefreshTokenExpiresAt: &refreshExpiry,
	}

	if err := s.userRepo.CreateSession(session); err != nil {
		return nil, err
	}

	// Calculate expires_in (in seconds)
	expiresIn := int(config.App.JWT.GetAccessTokenDuration(input.RememberMe).Seconds())

	return &LoginResponse{
		User:         user.ToResponse(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    expiresIn,
	}, nil
}

// Logout logs out user by deleting session
func (s *AuthService) Logout(accessToken string) error {
	return s.userRepo.DeleteSession(accessToken)
}

// GetCurrentUser gets current authenticated user
func (s *AuthService) GetCurrentUser(userID uint) (*models.User, error) {
	return s.userRepo.FindByID(userID)
}

// RefreshToken refreshes access token
func (s *AuthService) RefreshToken(refreshToken string) (*LoginResponse, error) {
	// Validate refresh token
	claims, err := utils.ValidateToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	// Find user
	user, err := s.userRepo.FindByID(claims.UserID)
	if err != nil {
		return nil, err
	}

	// Check if user is active
	if !user.IsActive {
		return nil, errors.New("account is inactive")
	}

	// Find session
	session, err := s.userRepo.FindSessionByRefreshToken(refreshToken, user.ID)
	if err != nil {
		return nil, errors.New("session not found")
	}

	// Generate new access token
	newAccessToken, accessExpiry, err := utils.RefreshAccessToken(refreshToken, session.RememberMe)
	if err != nil {
		return nil, err
	}

	// Update session
	session.AccessToken = newAccessToken
	session.AccessTokenExpiresAt = accessExpiry
	if err := s.userRepo.UpdateSession(session); err != nil {
		return nil, err
	}

	// Calculate expires_in
	expiresIn := int(config.App.JWT.GetAccessTokenDuration(session.RememberMe).Seconds())

	return &LoginResponse{
		User:         user.ToResponse(),
		AccessToken:  newAccessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    expiresIn,
	}, nil
}
