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

// SetupRoutes configures all application routes and returns services needed for background jobs.
func SetupRoutes(router *gin.Engine, db *gorm.DB) *services.BookingService {
	// ── Repositories ────────────────────────────────────────────────────────
	userRepo := repositories.NewUserRepository(db)
	roomRepo := repositories.NewRoomRepository(db)
	carRepo := repositories.NewCarRepository(db)
	requestRepo := repositories.NewRequestRepository(db)
	carRequestRepo := repositories.NewCarRequestRepository(db)
	bookingRepo := repositories.NewBookingRepository(db)
	carBookingRepo := repositories.NewCarBookingRepository(db)
	notificationRepo := repositories.NewNotificationRepository(db)
	otpRepo := repositories.NewOTPRepository(db)
	systemSettingRepo := repositories.NewSystemSettingRepository(db) // NEW

	// ── Services ────────────────────────────────────────────────────────────
	authService := services.NewAuthService(userRepo)
	otpService := services.NewOTPService(otpRepo, userRepo)
	systemSettingService := services.NewSystemSettingService(systemSettingRepo) // NEW
	userService := services.NewUserService(userRepo)
	roomService := services.NewRoomService(roomRepo)
	carService := services.NewCarService(carRepo)
	notificationService := services.NewNotificationService(notificationRepo)
	requestService := services.NewRequestService(requestRepo, bookingRepo, roomRepo, notificationRepo, notificationService, userRepo, db)
	carRequestService := services.NewCarRequestService(carRequestRepo, carBookingRepo, carRepo, notificationRepo, notificationService, userRepo, db)
	bookingService := services.NewBookingService(bookingRepo, requestRepo, notificationRepo, notificationService)

	// ── Handlers ────────────────────────────────────────────────────────────
	authHandler := handlers.NewAuthHandler(authService, otpService, systemSettingService) // updated signature
	systemSettingHandler := handlers.NewSystemSettingHandler(systemSettingService)        // NEW
	userHandler := handlers.NewUserHandler(userService)
	roomHandler := handlers.NewRoomHandler(roomService)
	carHandler := handlers.NewCarHandler(carService)
	requestHandler := handlers.NewRequestHandler(requestService)
	carRequestHandler := handlers.NewCarRequestHandler(carRequestService)
	bookingHandler := handlers.NewBookingHandler(bookingService)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	uploadHandler := handlers.NewUploadHandler(roomService)

	// ── Static files ─────────────────────────────────────────────────────────
	router.Static("/uploads/users", "./internal/uploads/users")
	router.Static("/uploads/rooms", "./internal/uploads/rooms")

	// ── API v1 ───────────────────────────────────────────────────────────────
	v1 := router.Group("/api/v1")
	{
		// ====================================================
		// PUBLIC ROUTES (No Authentication)
		// ====================================================
		auth := v1.Group("/auth")
		{
			// Classic auth
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)

			// Email verification (called before user has a token)
			auth.POST("/verify-email", authHandler.VerifyEmail)
			auth.POST("/resend-verification", authHandler.ResendVerificationEmail)

			// Login OTP (called before user has a token)
			auth.POST("/verify-login-otp", authHandler.VerifyLoginOTP)
			auth.POST("/resend-login-otp", authHandler.ResendLoginOTP)
		}

		// // Cars (public endpoints)
		// cars := v1.Group("/cars")
		// {
		// 	cars.GET("", carHandler.ListCars)
		// 	cars.GET("/:id", carHandler.GetCar)
		// 	cars.POST("/:id/availability", carHandler.CheckAvailability)
		// 	cars.GET("/available", carHandler.GetAvailableCars)
		// }

		// ====================================================
		// PROTECTED ROUTES (Require Authentication)
		// ====================================================
		protected := v1.Group("")
		protected.Use(middleware.AuthMiddleware())
		{
			// Auth
			protected.POST("/auth/logout", authHandler.Logout)

			// User profile
			protected.GET("/users/me", userHandler.GetCurrentUser)
			protected.PUT("/users/me", userHandler.UpdateCurrentUser)
			protected.PUT("/users/change-password", userHandler.ChangePassword)
			protected.PUT("/users/preferences", userHandler.UpdatePreferences)

			// Rooms (read-only for all authenticated users)
			protected.GET("/rooms", roomHandler.ListRooms)
			protected.GET("/rooms/:id", roomHandler.GetRoom)
			protected.POST("/rooms/:id/availability", roomHandler.CheckAvailability)

			// Cars (read-only for all authenticated users)
			protected.GET("/cars", carHandler.ListCars)
			protected.GET("/cars/:id", carHandler.GetCar)
			protected.POST("/cars/:id/availability", carHandler.CheckAvailability)
			protected.GET("/cars/available", carHandler.GetAvailableCars)

			// Room requests
			protected.GET("/room-requests", requestHandler.ListRequests)
			protected.POST("/room-requests", requestHandler.CreateRequest)
			protected.GET("/room-requests/:id", requestHandler.GetRequest)
			protected.PUT("/room-requests/:id", requestHandler.UpdateRequest)
			protected.DELETE("/room-requests/:id", requestHandler.DeleteRequest)

			// Car requests
			protected.GET("/car-requests", carRequestHandler.ListCarRequests)
			protected.POST("/car-requests", carRequestHandler.CreateCarRequest)
			protected.GET("/car-requests/:id", carRequestHandler.GetCarRequest)
			protected.PUT("/car-requests/:id", carRequestHandler.UpdateCarRequest)
			protected.DELETE("/car-requests/:id", carRequestHandler.DeleteCarRequest)

			// Bookings
			protected.GET("/bookings", bookingHandler.ListBookings)
			protected.GET("/bookings/:id", bookingHandler.GetBooking)
			protected.POST("/bookings/auto-complete", bookingHandler.AutoCompleteBookings)

			// Notifications
			protected.GET("/notifications", notificationHandler.GetNotifications)
			protected.POST("/notifications/stream-ticket", notificationHandler.IssueStreamTicket)
			protected.GET("/notifications/stream", notificationHandler.StreamNotifications)
			protected.GET("/notifications/unread-count", notificationHandler.GetUnreadCount)
			protected.PUT("/notifications/:id/mark-as-read", notificationHandler.MarkAsRead)
			protected.POST("/notifications/mark-all-as-read", notificationHandler.MarkAllAsRead)
			protected.DELETE("/notifications/:id", notificationHandler.DeleteNotification)

			// Calendar
			protected.GET("/calendar", bookingHandler.GetCalendar)
			protected.GET("/car-calendar", carRequestHandler.GetCalendarCarRequests)

			// ================================================
			// ROOM ADMIN ROUTES
			// ================================================
			roomAdmin := protected.Group("")
			roomAdmin.Use(middleware.RequireRoomAdmin())
			{
				roomAdmin.POST("/rooms", roomHandler.CreateRoom)
				roomAdmin.PUT("/rooms/:id", roomHandler.UpdateRoom)
				roomAdmin.DELETE("/rooms/:id", roomHandler.DeleteRoom)
				roomAdmin.POST("/rooms/:id/image", uploadHandler.UploadRoomImage)

				// Car management (room_admin only)
				roomAdmin.POST("/cars", carHandler.CreateCar)
				roomAdmin.PUT("/cars/:id", carHandler.UpdateCar)
				roomAdmin.DELETE("/cars/:id", carHandler.DeleteCar)
				roomAdmin.POST("/cars/:id/image", carHandler.UpdateCarImage)

				roomAdmin.PUT("/users/:id", userHandler.UpdateUser)
				roomAdmin.DELETE("/users/:id", userHandler.DeleteUser)
				roomAdmin.POST("/users/:id/reset-password", userHandler.ResetPassword)

				// System settings (room_admin only)
				roomAdmin.GET("/admin/settings", systemSettingHandler.GetSettings)
				roomAdmin.PUT("/admin/settings", systemSettingHandler.UpdateSettings)
			}

			// ================================================
			// ROOM ADMIN & GA ROUTES
			// ================================================
			adminGA := protected.Group("")
			adminGA.Use(middleware.RequireRole(models.RoleRoomAdmin, models.RoleGA))
			{
				adminGA.GET("/users", userHandler.ListUsers)
				adminGA.GET("/users/:id", userHandler.GetUser)
			}

			// ================================================
			// GA ROUTES
			// ================================================
			ga := protected.Group("")
			ga.Use(middleware.RequireGA())
			{
				ga.POST("/room-requests/:id/approve", requestHandler.ApproveRequest)
				ga.POST("/room-requests/:id/reject", requestHandler.RejectRequest)
				ga.GET("/room-requests/:id/available-rooms", requestHandler.GetAvailableRooms)
				ga.DELETE("/bookings/:id", bookingHandler.CancelBooking)

				// Car request management (GA only)
				ga.POST("/car-requests/:id/approve", carRequestHandler.ApproveCarRequest)
				ga.POST("/car-requests/:id/reject", carRequestHandler.RejectCarRequest)
				ga.GET("/car-requests/:id/available-cars", carRequestHandler.GetAvailableCars)
			}
		}
		return bookingService
	}
}
