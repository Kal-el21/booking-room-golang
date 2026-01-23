package middleware

import (
	"strings"

	"github.com/Kal-el21/booking-room-golang/backend/internal/database"
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware validates JWT token and sets user in context
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			utils.ErrorResponse(c, 401, "Authorization header required", nil)
			c.Abort()
			return
		}

		// Check Bearer token format
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			utils.ErrorResponse(c, 401, "Invalid authorization format", nil)
			c.Abort()
			return
		}

		token := parts[1]

		// Validate token
		claims, err := utils.ValidateToken(token)
		if err != nil {
			utils.ErrorResponse(c, 401, "Invalid or expired token", err.Error())
			c.Abort()
			return
		}

		// Check if session exists and not expired
		var session models.UserSession
		if err := database.DB.Where("access_token = ? AND user_id = ?", token, claims.UserID).First(&session).Error; err != nil {
			utils.ErrorResponse(c, 401, "Session not found or expired", nil)
			c.Abort()
			return
		}

		if session.IsExpired() {
			utils.ErrorResponse(c, 401, "Session expired", nil)
			c.Abort()
			return
		}

		// Update last used timestamp
		session.UpdateLastUsed()
		database.DB.Save(&session)

		// Get user from database
		var user models.User
		if err := database.DB.First(&user, claims.UserID).Error; err != nil {
			utils.ErrorResponse(c, 401, "User not found", nil)
			c.Abort()
			return
		}

		// Check if user is active
		if !user.IsActive {
			utils.ErrorResponse(c, 403, "User account is inactive", nil)
			c.Abort()
			return
		}

		// Set user in context
		c.Set("user", &user)
		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)

		c.Next()
	}
}

// GetCurrentUser gets current user from context
func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get("user")
	if !exists {
		return nil, false
	}
	return user.(*models.User), true
}
