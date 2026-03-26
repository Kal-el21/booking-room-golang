package main

import (
	"fmt"
	"log"
	"net/url"
	"regexp"
	"time"

	"github.com/Kal-el21/booking-room-golang/backend/internal/config"
	"github.com/Kal-el21/booking-room-golang/backend/internal/database"
	"github.com/Kal-el21/booking-room-golang/backend/internal/database/migrations"
	"github.com/Kal-el21/booking-room-golang/backend/internal/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Connect to database
	if err := database.Connect(cfg); err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer database.Close()

	// Run migrations
	if err := migrations.Migrate(database.GetDB()); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Set Gin mode
	if cfg.App.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize Gin router
	router := gin.New()
	router.Use(gin.Recovery())

	// Custom Logger to mask sensitive query parameters like token
	router.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		// Clean the path to mask token
		path := param.Path
		if param.Request.URL.RawQuery != "" {
			u, err := url.Parse(path)
			if err == nil {
				query := u.Query()
				if query.Get("token") != "" {
					query.Set("token", "REDACTED")
					u.RawQuery = query.Encode()
					path = u.String()
				}
			} else {
				// Fallback to regex if URL parsing fails
				re := regexp.MustCompile(`token=[^&?]+`)
				path = re.ReplaceAllString(path, "token=REDACTED")
			}
		}

		return fmt.Sprintf("[GIN] %s | %3d | %13v | %15s | %-7s %s\n%s",
			param.TimeStamp.Format("2006/01/02 - 15:04:05"),
			param.StatusCode,
			param.Latency,
			param.ClientIP,
			param.Method,
			path,
			param.ErrorMessage,
		)
	}))

	// Set trusted proxies
	if len(cfg.CORS.TrustedProxies) > 0 {
		router.SetTrustedProxies(cfg.CORS.TrustedProxies)
	} else {
		log.Println("⚠️  [SECURITY WARNING] You trusted all proxies (TRUSTED_PROXIES is not set).")
		router.SetTrustedProxies(nil)
	}

	// Setup CORS
	corsConfig := cors.Config{
		AllowOrigins:     cfg.CORS.AllowedOrigins,
		AllowMethods:     cfg.CORS.AllowedMethods,
		AllowHeaders:     cfg.CORS.AllowedHeaders,
		AllowCredentials: true,
	}
	router.Use(cors.New(corsConfig))

	// Health check endpoint
	router.Any("/health", func(c *gin.Context) {
		db := database.GetDB() // Mengambil instance DB Anda
		sqlDB, err := db.DB()

		// Cek apakah koneksi database masih hidup
		if err != nil || sqlDB.Ping() != nil {
			c.JSON(503, gin.H{
				"status":   "unhealthy",
				"database": "disconnected",
			})
			return
		}
		c.JSON(200, gin.H{
			"status":   "healthy",
			"database": "connected",
			"service":  cfg.App.Name,
		})
	})

	// Setup routes
	bookingService := routes.SetupRoutes(router, database.GetDB())

	// Start background job for booking auto-completion
	go func() {
		log.Println("⏰ Starting background job: booking auto-completion")
		if err := bookingService.AutoCompleteOldBookings(); err != nil {
			log.Printf("Error in background job (startup): %v", err)
		}

		ticker := time.NewTicker(1 * time.Hour)
		for range ticker.C {
			if err := bookingService.AutoCompleteOldBookings(); err != nil {
				log.Printf("Error in background job: %v", err)
			}
		}
	}()

	// Start server
	addr := fmt.Sprintf(":%s", cfg.App.Port)
	log.Printf("🚀 Server starting on %s", addr)
	log.Printf("📝 Environment: %s", cfg.App.Env)
	log.Printf("🌐 URL: %s", cfg.App.URL)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
