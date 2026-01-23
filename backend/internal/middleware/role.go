package middleware

import (
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// RequireRole checks if user has required role
func RequireRole(roles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := GetCurrentUser(c)
		if !exists {
			utils.ErrorResponse(c, 401, "Unauthorized", nil)
			c.Abort()
			return
		}

		// Check if user has any of the required roles
		hasRole := false
		for _, role := range roles {
			if user.Role == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			utils.ErrorResponse(c, 403, "Insufficient permissions", nil)
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireGA middleware for GA only endpoints
func RequireGA() gin.HandlerFunc {
	return RequireRole(models.RoleGA)
}

// RequireRoomAdmin middleware for Room Admin only (NOT including GA)
func RequireRoomAdmin() gin.HandlerFunc {
	return RequireRole(models.RoleRoomAdmin)
}

// RequireUser middleware for any authenticated user
func RequireUser() gin.HandlerFunc {
	return RequireRole(models.RoleUser, models.RoleRoomAdmin, models.RoleGA)
}
