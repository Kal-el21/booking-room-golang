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
│  Login   │────▶│ Validate │────▶│ Generate │────▶│ Return   │
│  Request │     │ Password │     │ JWT      │     │ Token    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                        │
                        ▼
               ┌──────────────────┐
               │ bcrypt Compare    │
               │ hash with plain  │
               │ password         │
               └──────────────────┘
```

### Login Process
1. User sends `POST /api/auth/login` with email and password
2. Handler calls [`auth_service.Login()`](internal/services/auth_service.go)
3. Service validates user exists and password matches using [`utils.CheckPassword()`](internal/utils/password.go)
4. Service generates JWT tokens using [`jwt.GenerateToken()`](internal/utils/jwt.go)
5. Returns access_token and refresh_token

### Protected Routes
1. Client includes `Authorization: Bearer <token>` header
2. Auth middleware extracts and validates JWT
3. Claims parsed to get user ID and role
4. Role middleware checks if user has required role
5. Request proceeds to handler

---

## 3. User Management Flow

### Create User
```
POST /api/auth/register
├── Validate input
├── Check email uniqueness
├── Hash password
├── Create user in DB
└── Return user response
```

### User Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Regular user | View rooms, create requests |
| `room_admin` | Admin | Manage rooms |
| `GA` | General Affairs | Approve/reject requests |

---

## 4. Room Management Flow

### Create Room (Room Admin Only)
```
POST /api/rooms
├── Auth middleware (verify room_admin role)
├── Validate room data
├── Create room in DB
└── Return created room
```

### Room Availability Check
```
POST /api/rooms/:id/availability
├── Get all bookings for room on requested date
├── Check for overlapping time slots
└── Return availability status
```

---

## 5. Booking Request Flow

### User Creates Request
```
POST /api/room-requests
├── Auth middleware (verify user)
├── Validate request data
├── Find available room
├── Create request with "pending" status
├── Notify GA for approval
└── Return request details
```

### GA Approves Request
```
PUT /api/room-requests/:id/approve
├── Auth middleware (verify GA role)
├── Validate request status is "pending"
├── Create booking from request
├── Update request status to "approved"
├── Notify user of approval
└── Return updated request
```

### Request Status Flow
```
pending ──▶ approved ──▶ active ──▶ completed
   │          │
   │          └── rejected ──▶ cancelled
   └── cancelled
```

---

## 6. File Structure Explanation

```
backend/
├── cmd/
│   ├── api/main.go           # Application entry point
│   └── seed_admin/main.go    # Admin user seeder command
├── internal/
│   ├── config/
│   │   └── config.go         # Configuration loader (.env)
│   ├── database/
│   │   ├── database.go       # Database connection (GORM)
│   │   └── migrations/
│   │       └── migrate.go    # Database migrations
│   ├── handlers/             # HTTP request handlers
│   ├── middleware/
│   │   ├── auth.go          # JWT authentication
│   │   └── role.go          # Role-based authorization
│   ├── models/              # Data models (User, Room, Booking, etc.)
│   ├── repositories/        # Data access layer
│   ├── routes/
│   │   └── routes.go        # API route definitions
│   ├── services/           # Business logic layer
│   └── utils/              # Utility functions (JWT, Password, Response)
├── Dockerfile
├── go.mod
├── go.sum
└── MAKEFILE
```

---

## 7. Database Schema

### Users Table
```sql
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password        VARCHAR(255),
    role            VARCHAR(50) NOT NULL DEFAULT 'user',
    division        VARCHAR(100),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Rooms Table
```sql
CREATE TABLE rooms (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    capacity        INT NOT NULL,
    location        VARCHAR(255),
    description     TEXT,
    status          VARCHAR(50) DEFAULT 'available',
    created_by      INT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Room Requests Table
```sql
CREATE TABLE room_requests (
    id              SERIAL PRIMARY KEY,
    user_id         INT REFERENCES users(id),
    purpose         VARCHAR(255) NOT NULL,
    notes           TEXT,
    booking_date    DATE NOT NULL,
    end_date        DATE,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    status          VARCHAR(50) DEFAULT 'pending',
    is_recurring    BOOLEAN DEFAULT false,
    recurring_type  VARCHAR(50),
    recurring_days  VARCHAR(50),
    recurring_end_date DATE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

### Room Bookings Table
```sql
CREATE TABLE room_bookings (
    id              SERIAL PRIMARY KEY,
    request_id      INT REFERENCES room_requests(id),
    room_id         INT REFERENCES rooms(id),
    booked_by       INT REFERENCES users(id),
    booking_date    DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    status          VARCHAR(50) DEFAULT 'confirmed',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
```

---

## 8. Configuration Flow

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
