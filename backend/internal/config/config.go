package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	JWT      JWTConfig
	CORS     CORSConfig
	Email    EmailConfig
	Feature  FeatureConfig
}

type AppConfig struct {
	Name string
	Env  string
	Port string
	URL  string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
	TimeZone string
}

type JWTConfig struct {
	Secret                 string
	AccessTokenExpireHours int
	RefreshTokenExpireDays int
	RememberMeAccessDays   int
	RememberMeRefreshDays  int
}

type CORSConfig struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
}

type EmailConfig struct {
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	FromName     string
	FromEmail    string
}

type FeatureConfig struct {
	EnableEmailVerification  bool
	EnableEmailNotifications bool
}

var App *Config

// LoadConfig loads configuration from .env file
func LoadConfig() (*Config, error) {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	config := &Config{
		App: AppConfig{
			Name: getEnv("APP_NAME", "Room Booking System"),
			Env:  getEnv("APP_ENV", "development"),
			Port: getEnv("APP_PORT", "8080"),
			URL:  getEnv("APP_URL", "http://localhost:8080"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "room_booking_db"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			TimeZone: getEnv("DB_TIMEZONE", "Asia/Jakarta"),
		},
		JWT: JWTConfig{
			Secret:                 getEnv("JWT_SECRET", "your-secret-key"),
			AccessTokenExpireHours: getEnvAsInt("JWT_ACCESS_TOKEN_EXPIRE_HOURS", 24),
			RefreshTokenExpireDays: getEnvAsInt("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7),
			RememberMeAccessDays:   getEnvAsInt("JWT_REMEMBER_ME_ACCESS_DAYS", 7),
			RememberMeRefreshDays:  getEnvAsInt("JWT_REMEMBER_ME_REFRESH_DAYS", 30),
		},
		CORS: CORSConfig{
			AllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
			AllowedMethods: getEnvAsSlice("CORS_ALLOWED_METHODS", []string{"GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"}),
			AllowedHeaders: getEnvAsSlice("CORS_ALLOWED_HEADERS", []string{"Content-Type", "Authorization", "Accept", "Origin"}),
		},
		Email: EmailConfig{
			SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
			SMTPPort:     getEnvAsInt("SMTP_PORT", 587),
			SMTPUsername: getEnv("SMTP_USERNAME", ""),
			SMTPPassword: getEnv("SMTP_PASSWORD", ""),
			FromName:     getEnv("SMTP_FROM_NAME", "Room Booking System"),
			FromEmail:    getEnv("SMTP_FROM_EMAIL", "noreply@roombooking.com"),
		},
		Feature: FeatureConfig{
			EnableEmailVerification:  getEnvAsBool("ENABLE_EMAIL_VERIFICATION", false),
			EnableEmailNotifications: getEnvAsBool("ENABLE_EMAIL_NOTIFICATIONS", false),
		},
	}

	// Validate required fields
	if config.Database.Password == "" {
		return nil, fmt.Errorf("DB_PASSWORD is required")
	}

	if config.JWT.Secret == "your-secret-key" {
		log.Println("Warning: Using default JWT secret, please change in production!")
	}

	App = config
	return config, nil
}

// GetDSN returns database connection string
func (c *DatabaseConfig) GetDSN() string {
	return fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		c.Host, c.User, c.Password, c.DBName, c.Port, c.SSLMode, c.TimeZone,
	)
}

// GetAccessTokenDuration returns access token duration
func (c *JWTConfig) GetAccessTokenDuration(rememberMe bool) time.Duration {
	if rememberMe {
		return time.Duration(c.RememberMeAccessDays) * 24 * time.Hour
	}
	return time.Duration(c.AccessTokenExpireHours) * time.Hour
}

// GetRefreshTokenDuration returns refresh token duration
func (c *JWTConfig) GetRefreshTokenDuration(rememberMe bool) time.Duration {
	if rememberMe {
		return time.Duration(c.RememberMeRefreshDays) * 24 * time.Hour
	}
	return time.Duration(c.RefreshTokenExpireDays) * 24 * time.Hour
}

// Helper functions
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsBool(key string, defaultValue bool) bool {
	valueStr := getEnv(key, "")
	if value, err := strconv.ParseBool(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	return strings.Split(valueStr, ",")
}
