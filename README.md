# 🚪 Room Booking & Management System

A professional, full-stack room booking application with automated approval workflows, real-time notifications, multi-factor authentication, and integrated vehicle tracking system.

## 🚀 Key Features

### Room Booking
- **🔐 Advanced Authentication:**
  - Classic JWT-based login & registration.
  - **Email Verification** via OTP for new accounts.
  - **Two-Factor Authentication (OTP)** login option.
  - Secure Refresh Token mechanism.
- **🏢 Smart Room Management:**
  - CRUD operations for rooms with image uploads.
  - Automated availability checking for time slots.
  - Multi-day and **Weekly Recurring** booking support.
- **✅ Workflow Automation:**
  - **User:** Submit requests for room usage.
  - **GA (General Affairs):** Review, approve (assigning rooms), or reject requests.
  - **Automated Completion:** System automatically marks past bookings as completed.
- **🔔 Real-time Experience:**
  - **SSE (Server-Sent Events):** Real-time in-app notifications for status updates.
  - **Email Notifications:** Automatic alerts for request approvals/rejections.
  - **Interactive Calendar:** Visualized view of all bookings and pending requests.
- **🛠️ Admin Control:**
  - Global system settings (Enable/Disable registration, OTP, etc.).
  - User management (Profile updates, password resets, role management).
  - Avatar uploads for all users.

### Vehicle Tracking (New)
- **🚗 Car Fleet Management:**
  - GA manages fleet with capacity, vehicle type, transmission, fuel type, and odometer tracking.
  - Car images, garage location, and active/inactive status support.
- **📋 Car Booking Lifecycle:**
  - Users submit car requests → GA approves with car assignment → System creates `CarBooking` records.
  - Full pickup/return lifecycle with odometer, fuel level, driver assignment, and snapshot history.
  - New statuses: `confirmed` → `picked_up` → `in_use` → `returned` / `late_return` / `cancelled`.
- **⏰ Automated Scheduler:**
  - Background job runs every 5 minutes to auto-pickup bookings whose start time has passed.
  - Auto-marks as `late_return` if the entire booking window passed without pickup.
  - Notifies GA via SSE on all automated transitions.
- **🔄 Conflict Detection:**
  - On approval, system validates no overlapping active bookings (`confirmed`, `picked_up`, `in_use`) exist for the same car and time.
  - On reject, conflicts are surfaced to GA for manual review.
- **📊 Fleet Status Dashboard:**
  - GA dashboard shows per-car active booking, fleet-wide counts, and lifecycle-phase breakdown.

## 🗂️ User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `user` | Regular Employee | View rooms/cars, create/update/cancel own requests, manage own bookings, update own profile/preferences |
| `driver` | Designated Driver | View own assigned car bookings list |
| `GA` | General Affairs | All `user` perms + View/approve/reject all requests, manage car bookings (pickup/return/override), assign/unassign drivers, view fleet status |
| `room_admin` | Room Administrator | All `GA` perms + Full CRUD for rooms, users, and system settings |

## 🗺️ Module Map

| Area | Models | Handlers | Services | Repositories |
|------|--------|----------|----------|--------------|
| Room Booking | `User`, `Room`, `RoomRequest`, `RoomBooking`, `Notification`, `OTP`, `SystemSetting`, `AuditLog` | `auth_handler`, `room_handler`, `request_handler`, `booking_handler`, `notification_handler`, `system_setting_handler` | `AuthService`, `BookingService`, `NotificationService`, `OTPService`, `SystemSettingService` | `user_repo`, `room_repo`, `request_repo`, `booking_repo`, `notification_repo`, `otp_repo`, `system_setting_repo` |
| Vehicle Tracking | `Car`, `CarRequest`, `CarBooking` | `car_handler`, `car_request_handler`, `car_booking_handler` | `CarService`, `CarRequestService`, `CarBookingService`, `CarSchedulerService`, `CarConflictService` | `car_repo`, `car_request_repo`, `car_booking_repo` |

## 🛠️ Tech Stack

- **Backend:** Go (Golang) with Gin, GORM, PostgreSQL
- **Frontend:** React + TypeScript, Vite, TailwindCSS
- **Real-time:** Server-Sent Events (SSE)
- **Storage:** Local filesystem
- **Deployment:** Docker & Docker Compose

## 📂 Project Structure

```text
booking-room-golang/
├── backend/                # Go backend application
│   ├── cmd/                # Entry points (API & Seeder)
│   ├── internal/
│   │   ├── docs/           # 💡 Internal API & Workflow Docs
│   │   ├── handlers/       # HTTP controllers
│   │   ├── middleware/     # JWT & Role RBAC
│   │   ├── models/         # GORM schemas
│   │   ├── services/       # Business logic & SSE Manager
│   │   └── uploads/        # Static files (avatars, rooms)
│   └── MAKEFILE            # Utility commands
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # UI & Common components
│   │   ├── context/        # Auth & Notification states
│   │   ├── hooks/          # API integration hooks
│   │   └── services/       # Axios & SSE service layers
├── docker-compose.yml      # Fullstack orchestration
└── README.md
```

## 🚦 Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js & Go (for local development only)

### 1. Environment Configuration

1. **Root Directory:**
   ```bash
   cp .env.example .env
   ```
   *Penting: Buka file `.env` dan pastikan `VITE_API_BASE_URL` mengarah ke URL backend Anda (default: `http://localhost:88`). Variabel ini akan di-inject ke frontend saat proses build Docker.*

2. **Backend Directory:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   *Edit `backend/.env` with your SMTP/LDAP credentials for Email/OTP features to work.*

### 2. Running with Docker (Recommended)

Start the entire system (Database, Backend, Frontend):
```bash
docker compose up -d --build
```
*The system will automatically run migrations and seed the initial admin user.*

Setelah container berjalan, Anda dapat mengakses:
- **Frontend:** `http://localhost:88`
- **Backend API:** `http://localhost:8080`

### 3. Initialize Admin User
The system will attempt to seed the initial admin user automatically. However, if you have built the containers previously or the user doesn't exist, run this command:
```bash
docker compose exec backend ./seed_admin
```

---

## 🔑 Default Admin Credentials

If the auto-seeder runs, you can log in with:
- **Email:** `admin@indore.co.id`
- **Password:** `rJsm8kFce4` / `admin123`
- **Role:** `room_admin`
- **Division:** `IT`

## 📖 Documentation

For detailed API usage and system internals, please refer to:
- [**API Testing Guide (Postman)**](./backend/internal/docs/apitest.md) - Complete list of endpoints and test flows.
- [**Backend Workflow**](./backend/internal/docs/backend-workflow.md) - Deep dive into architecture and logic.

## 👥 User Roles

| Role | Description |
|------|-------------|
| `user` | Can view rooms and cars, create booking requests, and manage their own profile and preferences. |
| `driver` | Can view all car bookings assigned to them. |
| `GA` | General Affairs — reviews and approves/rejects booking requests, manages car fleet (pickup/return/status overrides), assigns/unassigns drivers, and views fleet status. |
| `room_admin` | Full system control — manages rooms, users, cars, system settings, and all GA features. |

## 📄 License
This project is licensed under the MIT License.
