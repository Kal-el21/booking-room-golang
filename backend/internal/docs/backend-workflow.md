# Backend Workflow Documentation

## Application Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           REQUEST FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Client  │────▶│  Router  │────▶│Middleware│────▶│ Handler  │────▶│ Service  │
│  (Frontend)     │(Gin)     │     │(Auth)    │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                                   │
                                                                   ▼
                                                           ┌──────────┐
                                                           │ Repository│
                                                           │          │
                                                           └──────────┘
                                                                   │
                                                                   ▼
                                                           ┌──────────┐
                                                           │Database  │
                                                           │(PostgreSQL)
                                                           └──────────┘
```

---

## 1. Request Lifecycle

### Step 1: Client Request
Frontend sends HTTP request to `http://localhost:8080/api/...`

### Step 2: Router (Gin Framework)
- Entry point: [`cmd/api/main.go`](cmd/api/main.go)
- Routes defined in [`internal/routes/routes.go`](internal/routes/routes.go)
- Gin router handles URL matching and HTTP method validation

### Step 3: Middleware Processing
- [`internal/middleware/auth.go`](internal/middleware/auth.go) - JWT authentication
- [`internal/middleware/role.go`](internal/middleware/role.go) - Role-based access control
- Validates `Authorization: Bearer <token>` header

### Step 4: Handler Processing
- Located in [`internal/handlers/`](internal/handlers/)
- Each resource has its own handler file:
  - [`auth_handler.go`](internal/handlers/auth_handler.go) - Authentication
  - [`user_handler.go`](internal/handlers/user_handler.go) - User management
  - [`room_handler.go`](internal/handlers/room_handler.go) - Room management
  - [`booking_handler.go`](internal/handlers/booking_handler.go) - Booking management
  - [`request_handler.go`](internal/handlers/request_handler.go) - Request management
  - [`notification_handler.go`](internal/handlers/notification_handler.go) - Notifications

### Step 5: Service Layer
- Business logic in [`internal/services/`](internal/services/)
- Validates business rules
- Coordinates between handlers and repositories

### Step 6: Repository Layer
- Data access in [`internal/repositories/`](internal/repositories/)
- Database operations using GORM
- CRUD operations for each model

### Step 7: Database
- PostgreSQL database
- Migrations in [`internal/database/migrations/`](internal/database/migrations/)
- Auto-migrate on startup

---

## 2. Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      LOGIN WORKFLOW                              │
└─────────────────────────────────────────────────────────────────┘

┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│ Validate │────▶│ Check    │────▶│ Return   │
│  Request │     │ Password │     │ OTP/Verif│     │ Token/ID │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                        │               │
                        ▼               ▼
               ┌──────────────────┐   ┌──────────────────┐
               │ bcrypt Compare    │   │ If OTP enabled:  │
               │ hash with plain  │   │ Return user_id   │
               │ password         │   │ & otp_required   │
               └──────────────────┘   └──────────────────┘
```

### Login Process
1. User sends `POST /api/v1/auth/login` with email and password
2. Handler calls [`auth_service.Login()`](internal/services/auth_service.go)
3. Service validates user exists and password matches
4. **New:** Service checks if email is verified. If not, returns error.
5. **New:** Service checks if OTP login is enabled (system-wide or user-specific).
   - If enabled: Generates OTP, sends email, and returns `otp_required: true`.
   - If disabled: Generates JWT tokens immediately.
6. Returns access_token and refresh_token (or user_id for OTP flow).

### Email Verification (New)
1. After registration, user receives an OTP via email.
2. User sends `POST /api/v1/auth/verify-email` with `user_id` and `code`.
3. System marks `email_verified_at` and activates the account.

---

## 3. User Management Flow

### User Roles & Permissions
| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Regular Employee | View rooms, create/update/cancel own requests, view own bookings, update own preferences/profile. |
| `room_admin` | Room Administrator | All `user` permissions + Manage rooms (CRUD), Upload room images, Manage users (List/Update/Delete/Reset Password), Update system settings. |
| `GA` | General Affairs | All `user` permissions + View all users, View all requests, Approve/Reject requests, Cancel any booking, View all bookings. |

---

## 4. Room Management Flow

### Create Room (Room Admin Only)
```
POST /api/v1/rooms
├── Auth middleware (verify room_admin role)
├── Validate room data
├── Create room in DB
└── Return created room
```

### Room Image Upload (New)
1. Admin calls `POST /api/v1/rooms/:id/image` with `multipart/form-data`.
2. Handler saves image to `./internal/uploads/rooms/`.
3. Database record is updated with `image_url`.

### Room Availability Check
```
POST /api/v1/rooms/:id/availability
├── Get all bookings for room on requested date/time
├── Check for overlapping time slots
└── Return availability status
```

---

## 5. Booking Request Flow

### User Creates Request
```
POST /api/v1/room-requests
├── Auth middleware (verify user)
├── Validate request data (supports recurring/multi-day)
├── Create request with "pending" status
├── Notify GA via SSE & Email
└── Return request details
```

### GA Approves Request
```
POST /api/v1/room-requests/:id/approve
├── Auth middleware (verify GA role)
├── Check room availability for ALL requested slots
├── Create one or more "RoomBooking" records
├── Update request status to "approved"
├── Notify user via SSE & Email
└── Return success
```

---

## 6. Notifications & Real-time Flow (SSE)

### SSE Connection
1. Frontend connects to `GET /api/v1/notifications/stream?token=...`
2. Backend validates token and registers client in `SSEManager`.
3. Connection is kept alive with periodic `ping` events.

### Broadcast Mechanism
1. Event occurs (e.g., Request Approved).
2. Service calls `NotificationService.CreateNotification()`.
3. `SSEManager` identifies connected clients for the target `user_id`.
4. Message is pushed to the client's event stream.

---

## 7. File Structure Explanation

```
backend/
├── cmd/
│   ├── api/main.go           # Application entry point
│   └── seed_admin/main.go    # Admin user seeder command
├── internal/
│   ├── config/               # Configuration loader (.env)
│   ├── database/             # Database connection & migrations
│   ├── handlers/             # HTTP request handlers (auth, room, request, booking, notification, system_setting)
│   ├── middleware/           # Auth & Role middlewares
│   ├── models/               # GORM models (User, Room, RoomRequest, RoomBooking, Notification, OTP, SystemSetting)
│   ├── repositories/        # Data access layer (GORM operations)
│   ├── routes/               # Gin route definitions (v1)
│   ├── services/            # Business logic (auth, booking, otp, sse_manager, notification, etc.)
│   ├── uploads/              # Static files (users/avatars, rooms/images)
│   └── utils/                # Utilities (JWT, Response, OTP generator, Password)
└── ...
```

---

## 8. Database Schema (Key Tables)

### Users Table
Includes `avatar`, `email_verified_at`, `is_active`, and mandatory `division`.

### System Settings Table (New)
Stores global config like `enable_otp_login`, `app_name`, etc.

### OTPs Table (New)
Stores temporary codes for email verification and login.

### Notifications Table (New)
Stores in-app notifications with `is_read` status.

### Audit Logs Table (New)
Tracks important system actions.

---

## 9. Configuration Flow

```
.env file
    │
    ▼
config.LoadConfig()
    │
    ├── App (Name, Env, Port, URL)
    ├── Database (Host, Port, User, Password, DBName, SSLMode)
    ├── JWT (Secret, Expire Hours/Days)
    ├── CORS (Origins, Methods, Headers)
    ├── Email (SMTP settings)
    └── Feature (Feature flags)
    │
    ▼
database.Connect(config)
    │
    ▼
gorm.Open(postgres.Open(dsn))
    │
    ▼
Application Ready
```

---

## 9. Error Handling Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Handler   │────▶│ Service  │────▶│Repository│
│          │     │          │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     ▼                ▼                ▼
  errors          errors          errors
     │                │                │
     └────────────────┼────────────────┘
                      │
                      ▼
              utils.SendError()
                      │
                      ▼
            {
              "success": false,
              "message": "Error message",
              "errors": [...]
            }
```

---

## 10. API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## 11. Development Workflow

### Adding New Feature
1. **Create Model** - Add struct in [`internal/models/`](internal/models/)
2. **Create Repository** - Add database operations in [`internal/repositories/`](internal/repositories/)
3. **Create Service** - Add business logic in [`internal/services/`](internal/services/)
4. **Create Handler** - Add HTTP handlers in [`internal/handlers/`](internal/handlers/)
5. **Add Routes** - Register endpoints in [`internal/routes/routes.go`](internal/routes/routes.go)
6. **Add Migration** - Update migration if needed
7. **Test** - Write tests and verify with Postman

### Running Locally
```bash
cd backend
make dev  # Hot reload with air
```

### Running Tests
```bash
cd backend
make test
```

### Building for Production
```bash
cd backend
make build
docker compose up -d --build
```
