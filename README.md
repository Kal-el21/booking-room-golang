# 🚪 Room Booking & Management System

A professional, full-stack room booking application with automated approval workflows, real-time notifications, and multi-factor authentication.

## 🚀 Key Features

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

## 🛠️ Tech Stack

- **Backend:** [Go (Golang)](https://go.dev/) with [Gin](https://gin-gonic.com/), [GORM](https://gorm.io/), and PostgreSQL.
- **Frontend:** [React](https://reactjs.org/) with TypeScript, [Vite](https://vitejs.dev/), and [TailwindCSS](https://tailwindcss.com/).
- **Real-time:** Server-Sent Events (SSE).
- **Storage:** Local filesystem for avatars and room images.
- **Deployment:** Docker & Docker Compose.

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
2. **Backend Directory:**
   ```bash
   cp backend/.env.example backend/.env
   ```
   *Edit `backend/.env` with your SMTP credentials for Email/OTP features to work.*

### 2. Running with Docker (Recommended)

Start the entire system (Database, Backend, Frontend):
```bash
docker compose up -d --build
```
*The system will automatically run migrations and seed the initial admin user.*

### 3. Local Development

- **Backend:** `cd backend && make dev` (requires [air](https://github.com/cosmtrek/air))
- **Frontend:** `cd frontend && npm install && npm run dev`

## 🔑 Default Admin Credentials

If the auto-seeder runs, you can log in with:
- **Email:** `admin@indore.co.id`
- **Password:** `rJsm8kFce4`
- **Role:** `room_admin`

## 📖 Documentation

For detailed API usage and system internals, please refer to:
- [**API Testing Guide (Postman)**](./backend/internal/docs/apitest.md) - Complete list of endpoints and test flows.
- [**Backend Workflow**](./backend/internal/docs/backend-workflow.md) - Deep dive into architecture and logic.

## 👥 User Roles

| Role | Description |
|------|-------------|
| `user` | Can view rooms, create booking requests, and manage their profile. |
| `GA` | General Affairs - reviews and approves/rejects booking requests. |
| `room_admin` | Full system control - manages rooms, users, and global settings. |

## 📄 License
This project is licensed under the MIT License.
