# Room Booking System

A full-stack room booking application built with Go (Golang) backend and React frontend.

## Tech Stack

- **Backend:** Go with Gin framework, GORM ORM, PostgreSQL
- **Frontend:** React with TypeScript, TailwindCSS
- **Database:** PostgreSQL
- **Authentication:** JWT with bcrypt password hashing
- **Docker:** Docker & Docker Compose

## Project Structure

```
booking-room-golang/
├── backend/           # Go backend application
│   ├── cmd/          # Command entry points
│   ├── internal/     # Internal packages
│   │   ├── config/   # Configuration
│   │   ├── database/ # Database connection
│   │   ├── handlers/ # HTTP handlers
│   │   ├── middleware/ # Auth middleware
│   │   ├── models/   # Data models
│   │   ├── repositories/ # Data access
│   │   ├── routes/   # API routes
│   │   ├── services/ # Business logic
│   │   └── utils/    # Utility functions
│   └── MAKEFILE      # Backend Makefile
├── frontend/         # React frontend application
├── docker-compose.yml
└── README.md
```

## Getting Started

### Prerequisites

- Go 1.25+
- Docker & Docker Compose
- PostgreSQL (if running locally without Docker)

### Environment Setup

1. **Copy environment file:**
   ```bash
   cp backend/.env.example backend/.env
   ```

2. **Configure database and other settings in `backend/.env`:**

### Running with Docker

1. **Start all services:**
   ```bash
   docker compose up -d
   ```
   *Note: This will automatically run database migrations and seed the admin user.*

2. **View logs:**
   ```bash
   docker compose logs -f
   ```

3. **Stop services:**
   ```bash
   docker compose down
   ```

4. **Rebuild containers:**
   ```bash
   docker compose up -d --build
   ```

### Running Locally (Without Docker)

1. **Start PostgreSQL:**
   ```bash
   # Make sure PostgreSQL is running
   # Create database: room_booking_db
   ```

2. **Run backend:**
   ```bash
   cd backend
   make run
   ```

3. **Run frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Admin User Setup

### Automated Admin Seeding (Recommended)

When you run `docker compose up -d`, the system will automatically run the admin seeding process to ensure an admin user exists in the database.

### Create Admin User Manually

#### Using Docker (Manual)
```bash
docker compose exec backend ./seed_admin
```

#### Using Makefile (Local)
```bash
cd backend
make seed-admin
```

#### Using Go Directly
```bash
cd backend
go run cmd/seed_admin/main.go
```

### Admin Credentials

| Field | Value |
|-------|-------|
| Email | admin@indore.co.id |
| Division | IT |
| Password | rJsm8kFce4 |
| Role | room_admin |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users (Admin)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Rooms (Admin)
- `GET /api/rooms` - List all rooms
- `POST /api/rooms` - Create room
- `GET /api/rooms/:id` - Get room by ID
- `PUT /api/rooms/:id` - Update room
- `DELETE /api/rooms/:id` - Delete room

### Bookings
- `POST /api/bookings` - Create booking
- `GET /api/bookings` - List user bookings
- `GET /api/bookings/:id` - Get booking by ID
- `DELETE /api/bookings/:id` - Cancel booking

### Requests (GA Approval)
- `POST /api/requests` - Create booking request
- `GET /api/requests` - List requests (filtered by role)
- `PUT /api/requests/:id/approve` - Approve request (GA)
- `PUT /api/requests/:id/reject` - Reject request (GA)

## User Roles

| Role | Description |
|------|-------------|
| `user` | Regular user - can view rooms, create requests |
| `room_admin` | Admin - can manage rooms |
| `GA` | General Affairs - can approve/reject requests |

## Available Make Commands

### Backend
```bash
cd backend

make help              # Show help
make install           # Install dependencies
make build             # Build application
make run               # Run application
make dev               # Run with hot reload (air)
make clean             # Clean build files
make test              # Run tests
make seed-admin        # Create admin user (local)
make docker-seed-admin # Create admin user (Docker)
make docker-rebuild-seed # Rebuild and seed
make docker-up         # Start Docker containers
make docker-down       # Stop Docker containers
make docker-logs       # View Docker logs
make docker-rebuild    # Rebuild Docker containers
```

## Database Migrations

Migrations are run automatically on application startup using GORM's AutoMigrate feature.

## License

MIT
