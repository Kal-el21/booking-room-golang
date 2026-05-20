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
  - [`request_handler.go`](internal/handlers/request_handler.go) - Room request management
- [`car_handler.go`](internal/handlers/car_handler.go) - Car fleet management (admin only)
- [`car_request_handler.go`](internal/handlers/car_request_handler.go) - Car request / approval endpoints
- [`car_booking_handler.go`](internal/handlers/car_booking_handler.go) - Car booking lifecycle (pickup, return, status, driver)
- [`notification_handler.go`](internal/handlers/notification_handler.go) - Notifications
- [`system_setting_handler.go`](internal/handlers/system_setting_handler.go) - System settings

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
│   ├── handlers/             # HTTP request handlers
│   │   # Room booking: auth, user, room, booking, request, notification, system_setting
│   │   # Vehicle tracking: car, car_request, car_booking
│   ├── middleware/           # Auth & Role middlewares
│   ├── models/               # GORM models
│   │   # Room: User, Room, RoomRequest, RoomBooking, Notification, OTP, SystemSetting, AuditLog
│   │   # Vehicle: Car, CarRequest, CarBooking
│   ├── repositories/        # Data access layer
│   ├── routes/               # Gin route definitions (v1)
│   ├── services/            # Business logic
│   │   # Room: AuthService, BookingService, NotificationService, OTPService, SystemSettingService
│   │   # Vehicle: CarService, CarRequestService, CarBookingService, CarSchedulerService, CarConflictService
│   ├── uploads/              # Static files (users/avatars, rooms/images)
│   └── utils/                # Utilities (JWT, Response, OTP generator, Password)
└── ...
```

---

### System Settings Table (New)
Stores global config like `enable_otp_login`, `app_name`, etc.

### OTPs Table (New)
Stores temporary codes for email verification and login.

### Notifications Table (New)
Stores in-app notifications with `is_read` status.

### Audit Logs Table (New)
Tracks important system actions.

---

## 10. Car Fleet & Booking (Vehicle Tracking) — Schema

### `cars` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uint PK | |
| `car_name` | varchar | Display name |
| `plate_number` | varchar | Partial unique index (where `is_active = true`) |
| `brand` / `model` | varchar | |
| `vehicle_type` / `transmission` / `fuel_type` | varchar | |
| `capacity` | int | Passenger seats |
| `garage_location` | varchar | (renamed from `location`) |
| `status` | enum | `available` / `occupied` / `maintenance` |
| `is_active` | bool | Soft-delete |
| `current_odometer` | int | Latest reading |
| `created_by` / `created_at` / `updated_at` | standard | |

Indexes: `idx_cars_garage_location`, `idx_cars_vehicle_type`, `idx_cars_status_active`, `uni_idx_cars_plate_number`.

---

### `car_requests` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uint PK | |
| `user_id` / `required_capacity` / `purpose` | standard | |
| `booking_date` / `end_date` | date | Multi-day support |
| `start_time` / `end_time` | time | Daily window |
| `is_recurring` / `recurring_type` / `recurring_days` / `recurring_end_date` | — | Recurring support |
| `has_consumption` / `consumption_note` | — | Fuel cost flag |
| `status` | enum | `pending` / `approved` / `rejected` / `cancelled` |
| `assigned_by` / `assigner` | uint | GA who handled it |
| `rejected_reason` | text | |

---

### `car_bookings` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | uint PK | |
| `request_id` / `car_id` | uint FK | |
| `booked_by` | uint | GA who approved |
| `driver_id` / `driver_name_snapshot` | uint / varchar | Driver tracking |
| `departure_date` | date | Trip day |
| `start_time` / `end_time` | time | |
| `status` | enum | `confirmed/picked_up/in_use/returned/late_return/cancelled` |
| `plate_number_snapshot` / `car_name_snapshot` | varchar | Historical accuracy |
| `pickup_location` / `picked_up_at` | — | Pickup info |
| `returned_at` / `end_odometer` / `fuel_level_return` / `return_notes` | — | Return info |
| `start_odometer` | int | At pickup |

Indexes: `idx_car_book_lifecycle`, `idx_car_book_driver`, `idx_car_book_departure`.

---

### `users` table — new `driver_license` column
| Column | Type | Notes |
|--------|------|-------|
| `driver_license` | varchar | Partial unique index where `role = 'driver'` |

---

### Migration functions added to `migrate.go`
- `addCarTableColumns` — adds `plate_number`, `garage_location`, vehicle fields, odometer
- `addCarRequestColumns` — adds destination, pickup_location, driver_required, travel info
- `addCarBookingColumns` — adds all 11 tracking/snapshot columns
- `addIndexesForCars` — partial unique indexes + status index
- `addCarBookingIndexes` — lifecycle + driver + departure indexes
- `addUserDriverLicense` — `idx_users_driver_license` partial unique
- `addNotificationColumns` — (pre-existing, extended)

---

## 11. Development Workflow

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

## 10. Car Booking & Vehicle Tracking System

Separate from but structurally parallel to the room booking system.

### Architecture

| Layer | Files |
|-------|-------|
| Models | `internal/models/car.go`, `car_request.go`, `car_booking.go` |
| Handlers | `internal/handlers/car_handler.go`, `car_request_handler.go`, `car_booking_handler.go` |
| Services | `internal/services/car_service.go`, `car_request_service.go`, `car_booking_service.go`, `car_scheduler_service.go`, `car_conflict_service.go` |
| Repositories | `internal/repositories/car_repository.go`, `car_request_repository.go` |
| Migrations | `internal/database/migrations/migrate.go` — `addCarTableColumns`, `addCarRequestColumns`, `addCarBookingColumns`, `addNotificationColumns` |

---

### 10.1 End-to-End Workflow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────▶│ CarReq   │────▶│   GA     │────▶│  Car     │
│(requester│     │ Pending  │     │ Approves │     │CarBooking│
└──────────┘     └──────────┘     └──────────┘     │ confirmed│
                                                     └──────────┘
                                                          │
                                               ┌──────────┴───────────┐
                                               ▼                      ▼
                                        ┌──────────┐            ┌──────────┐
                                        │  Driver  │            │  System  │
                                        │  Picks   │            │ Scheduler│
                                        │    Up    │            │ (5 min)  │
                                        └──────────┘            └──────────┘
                                               │
                                    ┌────────────┴────────────┐
                                    ▼                           ▼
                              ┌──────────┐                ┌──────────┐
                              │  in_use  │                │ returned │
                              │  (driver │                │ (GA      │
                              │  drives) │                │  clicks) │
                              └──────────┘                └──────────┘
                                                               │
                                                        ┌──────────┴──────────┐
                                                        ▼                     ▼
                                                   ┌──────────┐         ┌──────────┐
                                                   │ late_return│        │ Update   │
                                                   │ (auto/manual)│    │ Car      │
                                                   └──────────┘        │odometer │
```

---

### 10.2 CarRequest Lifecycle

**Create (`POST /api/v1/car-requests`)** — User submits: `required_capacity`, `purpose`, `booking_date`, `start_time`, `end_time`, optional `end_date`, optional `is_recurring` + `recurring_type` + `recurring_days`.

Status: `pending`.

**Approve (`POST /api/v1/car-requests/:id/approve`)** — GA supplies `car_id`:
1. Service checks no conflicting `confirmed`/`picked_up`/`in_use` bookings exist for the selected car.
2. Creates one `CarBooking` per trip date (multi-day support).
3. Snapshots `plate_number` + `car_name` from the approved `Car`.
4. Sends SSE + email notifications to user and GA.

**Reject (`POST /api/v1/car-requests/:id/reject`)** — GA supplies `reason`.

---

### 10.3 CarBooking State Machine

| From | To | Trigger | Actor |
|------|----|---------|-------|
| `confirmed` | `picked_up` | `POST /:id/pickup` | GA |
| `confirmed` | `cancelled` | `PUT /:id/status` `{status:"cancelled"}` | GA |
| `picked_up` | `in_use` | (manual transition in service) | GA |
| `picked_up` | `confirmed` | `PUT /:id/status` `{status:"confirmed"}` | GA |
| `picked_up` / `in_use` | `returned` | `POST /:id/return` | GA |
| *any* | `late_return` | Auto-scheduler or `PUT /:id/status` | System / GA |
| `late_return` | `returned` | `PUT /:id/status` `{status:"returned"}` | GA |
| `in_use` | `confirmed` | `PUT /:id/status` `{status:"confirmed"}` | GA |

Terminal states: `returned`, `late_return`, `cancelled` — cannot be reverted via normal state machine.

---

### 10.4 Scheduler (`CarSchedulerService`)

Runs in a background goroutine started at application boot. Ticks every **5 minutes**.

On each tick, `RunOverdueCheck()`:
1. Fetches all `confirmed` bookings with `departure_date` or (`start_time`) already passed.
2. If the **full booking window** has passed — marks as `late_return`, zeros odometer/fuel, sets `return_notes` to "Auto-marked as late_return".
3. If only the **start_time** has passed — auto-transitions to `picked_up`, snapshots plate/car name, sets `picked_up_at`.
4. Sends SSE notification to all GA users in both cases.

---

### 10.5 Conflict Detection (`CarConflictService`)

- `FindConflictingCarBookings(carID, date, start, end)` — returns `ConflictResult` with all overlapping bookings whose status ∈ {confirmed, picked_up, in_use}.
- `FindConflictingCarRequests(db, carID, date, start, end)` — same but via raw JOIN query (used before CarBooking has a Car FK).
- `ValidateCarRequestNoConflicts(db, carID, bookingDates, start, end)` — batch version for multi-day approve flow.
- `CheckAndEscalateCarConflicts(...)` — auto-cancels conflicting confirmed bookings inside a DB transaction (planned for Phase 6/7 integration into `ApproveCarRequest`).

---

### 10.6 Driver Assignment

- `AssignDriver(bookingID, driverID)` — Validates user has `role = 'driver'`, sets `driver_id` + `driver_name_snapshot`, sends SSE notification to driver. GA only.
- `UnassignDriver(bookingID)` — Sets `driver_id` and `driver_name_snapshot` to NULL. GA only.
- `GetDriverBookings(driverID)` — Returns `confirmed` + `picked_up` + `in_use` bookings for the driver. Driver only.

---

### 10.7 Fleet Status (`GET /api/v1/admin/car-fleet-status`)

Returns:
```
{
  "summary": {
    "total_cars", "available_cars", "occupied_cars", "maintenance_cars",
    "confirmed_bookings", "picked_up_bookings", "in_use_bookings"
  },
  "car_status": [
    {
      "car_id", "car_name", "plate_num", "car_status",
      "current_booking_id", "current_booking_status"
    }
  ]
}
```

`current_booking_*` uses a `LEFT JOIN LATERAL` to fetch the most recent non-terminal booking per car.

---

## 11. Pre-existing Database Tables (Supplementary)

These tables support authentication, notifications, and system configuration.

### `users`
| Column | Type |
|--------|------|
| `id` | uint PK |
| `name` / `email` / `password_hash` | standard |
| `role` | `user` / `room_admin` / `GA` / `driver` |
| `driver_license` | varchar\* — partial unique index on role = `driver` |
| `division` | varchar |
| `avatar` | varchar |
| `email_verified_at` | time\* |
| `is_active` | bool |
| `created_at` / `updated_at` | standard |

### `notifications`
| Column | Type |
|--------|------|
| `id` | uint PK |
| `user_id` / `booking_id` / `request_id` | uint / uint / uint |
| `title` / `message` | varchar / text |
| `type` | `booking_confirmed`, `reminder`, `cancellation`, `request_submitted`, `request_approved`, `request_rejected`, `car_booking_confirmed`, `car_booking_rejected`, … |
| `channel` | `email` / `in_app` / `both` |
| `is_read` / `read_at` / `sent_at` / `created_at` | standard |

### `system_settings`
| Column | Type |
|--------|------|
| `id` | uint PK |
| `key` | varchar (unique) |
| `value` | text |
| `type` | `string` / `bool` / `number` |

### `otps`
| Column | Type |
|--------|------|
| `id` | uint PK |
| `user_id` / `email` | uint / varchar |
| `code` | varchar |
| `type` | `email_verification` / `login_otp` |
| `expires_at` / `used_at` / `created_at` | standard |

### `audit_logs`
| Column | Type |
|--------|------|
| `id` | uint PK |
| `user_id` / `action` / `resource_type` / `resource_id` | standard |
| `details` | jsonb |
| `ip_address` / `user_agent` | standard |
| `created_at` | standard |

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
