package routes

import (
	"github.com/Kal-el21/booking-room-golang/backend/internal/handlers"
	"github.com/Kal-el21/booking-room-golang/backend/internal/middleware"
	"github.com/Kal-el21/booking-room-golang/backend/internal/models"
	"github.com/Kal-el21/booking-room-golang/backend/internal/repositories"
	"github.com/Kal-el21/booking-room-golang/backend/internal/services"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SetupRoutes configures all application routes
func SetupRoutes(router *gin.Engine, db *gorm.DB) {
	// Initialize repositories
	userRepo := repositories.NewUserRepository(db)
	roomRepo := repositories.NewRoomRepository(db)
	requestRepo := repositories.NewRequestRepository(db)
	bookingRepo := repositories.NewBookingRepository(db)
	notificationRepo := repositories.NewNotificationRepository(db)

	// Initialize services
	authService := services.NewAuthService(userRepo)
	userService := services.NewUserService(userRepo)
	roomService := services.NewRoomService(roomRepo)
	requestService := services.NewRequestService(requestRepo, bookingRepo, roomRepo, notificationRepo, userRepo, db)
	bookingService := services.NewBookingService(bookingRepo, requestRepo, notificationRepo)
	notificationService := services.NewNotificationService(notificationRepo)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	userHandler := handlers.NewUserHandler(userService)
	roomHandler := handlers.NewRoomHandler(roomService)
	requestHandler := handlers.NewRequestHandler(requestService)
	bookingHandler := handlers.NewBookingHandler(bookingService)
	notificationHandler := handlers.NewNotificationHandler(notificationService)

	// API v1 group
	v1 := router.Group("/api/v1")
	{
		// ========================================
		// PUBLIC ROUTES (No Authentication)
		// ========================================
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
		}

		// ========================================
		// PROTECTED ROUTES (Require Authentication)
		// ========================================
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// Auth routes
			protected.POST("/auth/logout", authHandler.Logout)
			protected.GET("/auth/me", authHandler.Me)

			// User profile routes
			protected.GET("/users/me", userHandler.GetCurrentUser)
			protected.PUT("/users/change-password", userHandler.ChangePassword)
			protected.PUT("/users/preferences", userHandler.UpdatePreferences)

			// Room routes (read-only for all users)
			protected.GET("/rooms", roomHandler.ListRooms)
			protected.GET("/rooms/:id", roomHandler.GetRoom)
			protected.POST("/rooms/:id/availability", roomHandler.CheckAvailability)

			// Room request routes (all authenticated users)
			protected.GET("/room-requests", requestHandler.ListRequests)
			protected.POST("/room-requests", requestHandler.CreateRequest)
			protected.GET("/room-requests/:id", requestHandler.GetRequest)
			protected.PUT("/room-requests/:id", requestHandler.UpdateRequest)
			protected.DELETE("/room-requests/:id", requestHandler.DeleteRequest)

			// Booking routes (read-only for users, manage for GA)
			protected.GET("/bookings", bookingHandler.ListBookings)
			protected.GET("/bookings/:id", bookingHandler.GetBooking)

			// Notification routes
			protected.GET("/notifications", notificationHandler.GetNotifications)
			protected.GET("/notifications/unread-count", notificationHandler.GetUnreadCount)
			protected.PUT("/notifications/:id/mark-as-read", notificationHandler.MarkAsRead)
			protected.POST("/notifications/mark-all-as-read", notificationHandler.MarkAllAsRead)
			protected.DELETE("/notifications/:id", notificationHandler.DeleteNotification)

			// Calendar (accessible by all authenticated users)
			protected.GET("/calendar", bookingHandler.GetCalendar)

			// ========================================
			// USER VIEW (Room Admin & GA can view users)
			// ========================================
			userView := protected.Group("")
			userView.Use(middleware.RequireRole(models.RoleRoomAdmin, models.RoleGA))
			{
				userView.GET("/users", userHandler.ListUsers)
				userView.GET("/users/:id", userHandler.GetUser)
			}

			// ========================================
			// ROOM ADMIN ROUTES (Room Admin only)
			// ========================================
			roomAdmin := protected.Group("")
			roomAdmin.Use(middleware.RequireRoomAdmin())
			{
				// Room Management (Create, Update, Delete)
				roomAdmin.POST("/rooms", roomHandler.CreateRoom)
				roomAdmin.PUT("/rooms/:id", roomHandler.UpdateRoom)
				roomAdmin.DELETE("/rooms/:id", roomHandler.DeleteRoom)

				// User Management (Update, Delete, Reset Password)
				roomAdmin.PUT("/users/:id", userHandler.UpdateUser)
				roomAdmin.DELETE("/users/:id", userHandler.DeleteUser)
				roomAdmin.POST("/users/:id/reset-password", userHandler.ResetPassword)
			}

			// ========================================
			// GA ROUTES (General Affairs only)
			// ========================================
			ga := protected.Group("")
			ga.Use(middleware.RequireGA())
			{
				// Request approval
				ga.POST("/room-requests/:id/approve", requestHandler.ApproveRequest)
				ga.POST("/room-requests/:id/reject", requestHandler.RejectRequest)
				ga.GET("/room-requests/:id/available-rooms", requestHandler.GetAvailableRooms)

				// Booking management
				ga.DELETE("/bookings/:id", bookingHandler.CancelBooking)
			}
		}
	}
}
