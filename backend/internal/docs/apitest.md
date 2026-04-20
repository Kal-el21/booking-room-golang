# 📮 Postman Testing Guide - Room Booking System

## 📥 Setup Postman Collection

### Step 1: Create New Collection
1. Open Postman
2. Click **"New"** → **"Collection"**
3. Name it: `Room Booking System API`
4. Click **"Create"**

### Step 2: Create Environment Variables
1. Click **"Environments"** (top right)
2. Click **"+"** to create new environment
3. Name it: `Room Booking Local`
4. Add variables:

| Variable | Initial Value | Current Value |
|----------|---------------|---------------|
| base_url | http://localhost:8080 | http://localhost:8080 |
| user_token | | (will be set automatically) |
| admin_token | | (will be set automatically) |
| ga_token | | (will be set automatically) |
| room_id | | (will be set automatically) |
| request_id | | (will be set automatically) |
| booking_id | | (will be set automatically) |

5. Click **"Save"**
6. Select environment from dropdown (top right)

---

## 🔐 1. Authentication Endpoints

### 1.1 Health Check
```
GET {{base_url}}/health
```

**No Auth Required**

Expected Response:
```json
{
  "status": "healthy",
  "service": "Room Booking System",
  "version": "1.0.0"
}
```

---

### 1.2 Register User
```
POST {{base_url}}/api/v1/auth/register
```

**Headers:**
```
Content-Type: application/json
```

**Body (raw JSON):**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "user",
  "division": "IT"
}
```

**Tests Script (Auto-save response):**
```javascript
// Go to "Tests" tab and paste this
if (pm.response.code === 201) {
    console.log("User registered successfully");
}
```

---

### 1.3 Register Room Admin
```
POST {{base_url}}/api/v1/auth/register
```

**Body:**
```json
{
  "name": "Room Admin",
  "email": "admin@example.com",
  "password": "password123",
  "role": "room_admin"
}
```

---

### 1.4 Register GA
```
POST {{base_url}}/api/v1/auth/register
```

**Body:**
```json
{
  "name": "GA User",
  "email": "ga@example.com",
  "password": "password123",
  "role": "GA"
}
```

---

### 1.5 Login (User/Admin/GA) ⭐ IMPORTANT
```
POST {{base_url}}/api/v1/auth/login
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "remember_me": false
}
```

**Note:** If OTP is enabled in system settings or user preferences, this will return `otp_required: true`. You must then proceed to **1.6 Verify Login OTP**.

**Tests Script (Auto-save tokens):**
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    if (jsonData.data.access_token) {
        pm.environment.set("user_token", jsonData.data.access_token);
        pm.environment.set("refresh_token", jsonData.data.refresh_token);
        console.log("Tokens saved");
    }
}
```

---

### 1.6 Verify Login OTP
```
POST {{base_url}}/api/v1/auth/verify-login-otp
```

**Body:**
```json
{
  "user_id": 1,
  "code": "123456",
  "remember_me": false
}
```

---

### 1.7 Resend Login OTP
```
POST {{base_url}}/api/v1/auth/resend-login-otp
```

**Body:**
```json
{
  "user_id": 1
}
```

---

### 1.8 Verify Email
```
POST {{base_url}}/api/v1/auth/verify-email
```

**Body:**
```json
{
  "user_id": 1,
  "code": "123456"
}
```

---

### 1.9 Refresh Token
```
POST {{base_url}}/api/v1/auth/refresh
```

**Body:**
```json
{
  "refresh_token": "{{refresh_token}}"
}
```

---

### 1.10 Get Current User (Me)
```
GET {{base_url}}/api/v1/users/me
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 1.11 Logout
```
POST {{base_url}}/api/v1/auth/logout
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

## 🏢 2. Room Management (Room Admin Only)

### 2.1 Create Room
```
POST {{base_url}}/api/v1/rooms
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "room_name": "Meeting Room A",
  "capacity": 10,
  "location": "Floor 1, Building A",
  "description": "Equipped with projector and whiteboard",
  "status": "available"
}
```

**Tests Script (Save room_id):**
```javascript
if (pm.response.code === 201) {
    var jsonData = pm.response.json();
    pm.environment.set("room_id", jsonData.data.id);
    console.log("Room ID saved:", jsonData.data.id);
}
```

---

### 2.2 List All Rooms (No Auth - Public)
```
GET {{base_url}}/api/v1/rooms?page=1&page_size=10
```

**Optional Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 10)
- `status`: Filter by status (available, occupied, maintenance)
- `min_capacity`: Minimum capacity
- `location`: Search by location

---

### 2.3 Get Room by ID
```
GET {{base_url}}/api/v1/rooms/{{room_id}}
```

---

### 2.4 Update Room
```
PUT {{base_url}}/api/v1/rooms/{{room_id}}
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "room_name": "Meeting Room A (Updated)",
  "capacity": 12,
  "status": "available"
}
```

---

### 2.5 Check Room Availability
```
POST {{base_url}}/api/v1/rooms/{{room_id}}/availability
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "booking_date": "2026-02-15",
  "start_time": "09:00",
  "end_time": "11:00"
}
```

### 2.6 Upload Room Image (Room Admin Only) ⭐ MULTIPART
```
POST {{base_url}}/api/v1/rooms/{{room_id}}/image
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: multipart/form-data
```

**Body (form-data):**
- `image`: [Select File] (JPG/PNG/WebP)

---

### 2.7 Delete Room
```
DELETE {{base_url}}/api/v1/rooms/{{room_id}}
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

---

## 📝 3. Room Requests (User)

### 3.1 Create Room Request - Single Day
```
POST {{base_url}}/api/v1/room-requests
```

**Headers:**
```
Authorization: Bearer {{user_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "required_capacity": 10,
  "purpose": "Regular meeting",
  "notes": "Need whiteboard and markers",
  "booking_date": "2026-02-15",
  "start_time": "10:00",
  "end_time": "12:00"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Request created successfully",
  "data": {
    "id": 1,
    "purpose": "Regular meeting",
    "notes": "Need whiteboard and markers",
    "booking_date": "2026-02-15",
    "end_date": null,
    "is_recurring": false,
    "status": "pending"
  }
}
```

**Tests Script:**
```javascript
if (pm.response.code === 201) {
    var jsonData = pm.response.json();
    pm.environment.set("request_id", jsonData.data.id);
    console.log("Request ID saved:", jsonData.data.id);
}
```

---

### 3.2 Create Room Request - Multi-Day
```
POST {{base_url}}/api/v1/room-requests
```

**Headers:**
```
Authorization: Bearer {{user_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "required_capacity": 15,
  "purpose": "3-day workshop",
  "notes": "Need projector and video conferencing for all 3 days",
  "booking_date": "2026-02-20",
  "end_date": "2026-02-22",
  "start_time": "09:00",
  "end_time": "17:00"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Request created successfully",
  "data": {
    "id": 2,
    "purpose": "3-day workshop",
    "notes": "Need projector and video conferencing for all 3 days",
    "booking_date": "2026-02-20",
    "end_date": "2026-02-22",
    "is_recurring": false,
    "status": "pending"
  }
}
```

---

### 3.3 Create Room Request - Weekly Recurring
```
POST {{base_url}}/api/v1/room-requests
```

**Headers:**
```
Authorization: Bearer {{user_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "required_capacity": 10,
  "purpose": "Team meeting Mon/Wed/Fri",
  "notes": "Standing weekly meeting",
  "booking_date": "2026-03-02",
  "start_time": "14:00",
  "end_time": "15:00",
  "is_recurring": true,
  "recurring_type": "weekly",
  "recurring_days": "1,3,5",
  "recurring_end_date": "2026-03-27"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Request created successfully",
  "data": {
    "id": 3,
    "purpose": "Team meeting Mon/Wed/Fri",
    "notes": "Standing weekly meeting",
    "booking_date": "2026-03-02",
    "is_recurring": true,
    "recurring_type": "weekly",
    "recurring_days": "1,3,5",
    "recurring_end_date": "2026-03-27",
    "status": "pending"
  }
}
```

**Recurring Days Reference:**
- `1` = Monday
- `2` = Tuesday
- `3` = Wednesday
- `4` = Thursday
- `5` = Friday
- `6` = Saturday
- `7` = Sunday

---

### 3.4 List My Requests
```
GET {{base_url}}/api/v1/room-requests?page=1&page_size=10
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

**Optional Query Parameters:**
- `status`: Filter by status (pending, approved, rejected, cancelled)

---

### 3.5 Get Request Details
```
GET {{base_url}}/api/v1/room-requests/{{request_id}}
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 3.6 Update Request
```
PUT {{base_url}}/api/v1/room-requests/{{request_id}}
```

**Headers:**
```
Authorization: Bearer {{user_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "required_capacity": 12,
  "purpose": "Team meeting for Q1 planning (Updated)",
  "notes": "Also need video conferencing",
  "booking_date": "2026-02-15",
  "start_time": "09:00",
  "end_time": "12:00"
}
```

---

### 3.7 Delete Request
```
DELETE {{base_url}}/api/v1/room-requests/{{request_id}}
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

## ✅ 4. Request Approval (GA Only)

### 4.1 List Pending Requests
```
GET {{base_url}}/api/v1/room-requests?status=pending
```

**Headers:**
```
Authorization: Bearer {{ga_token}}
```

---

### 4.2 Get Available Rooms for Request
```
GET {{base_url}}/api/v1/room-requests/{{request_id}}/available-rooms
```

**Headers:**
```
Authorization: Bearer {{ga_token}}
```

---

### 4.3 Approve Request
```
POST {{base_url}}/api/v1/room-requests/{{request_id}}/approve
```

**Headers:**
```
Authorization: Bearer {{ga_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "room_id": 1
}
```

**Tests Script:**
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("booking_id", jsonData.data.id);
    console.log("Booking ID saved:", jsonData.data.id);
}
```

---

### 4.4 Reject Request
```
POST {{base_url}}/api/v1/room-requests/{{request_id}}/reject
```

**Headers:**
```
Authorization: Bearer {{ga_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "reason": "Room not available for the requested time. Please choose another slot."
}
```

---

## 📅 5. Bookings

### 5.1 List My Bookings (User)
```
GET {{base_url}}/api/v1/bookings?page=1&page_size=10
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 5.2 List All Bookings (GA)
```
GET {{base_url}}/api/v1/bookings?page=1&page_size=10
```

**Headers:**
```
Authorization: Bearer {{ga_token}}
```

**Query Parameters:**
- `room_id`: Filter by room
- `status`: Filter by status
- `booking_date`: Filter by date (YYYY-MM-DD)

---

### 5.3 Get Booking Details
```
GET {{base_url}}/api/v1/bookings/{{booking_id}}
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 5.4 Cancel Booking (GA Only)
```
DELETE {{base_url}}/api/v1/bookings/{{booking_id}}
```

**Headers:**
```
Authorization: Bearer {{ga_token}}
```

---

### 5.5 Auto-complete Old Bookings
```
POST {{base_url}}/api/v1/bookings/auto-complete
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

**Note:** This marks past bookings as 'completed'. It is also called automatically when listing bookings.

---

## 📆 6. Calendar (All Roles)

### 6.1 Get Calendar View
```
GET {{base_url}}/api/v1/calendar?start_date=2026-02-01&end_date=2026-02-28
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

**Query Parameters (Required):**
- `start_date`: Start date (YYYY-MM-DD)
- `end_date`: End date (YYYY-MM-DD)

**Query Parameters (Optional):**
- `room_id`: Filter by specific room

---

### 6.2 Get Calendar for Specific Room
```
GET {{base_url}}/api/v1/calendar?start_date=2026-02-01&end_date=2026-02-28&room_id={{room_id}}
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

## 🔔 7. Notifications

### 7.1 Get My Notifications
```
GET {{base_url}}/api/v1/notifications?page=1&page_size=10
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 7.2 Get Unread Count
```
GET {{base_url}}/api/v1/notifications/unread-count
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 7.3 Mark Notification as Read
```
PUT {{base_url}}/api/v1/notifications/1/mark-as-read
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 7.4 Mark All as Read
```
POST {{base_url}}/api/v1/notifications/mark-all-as-read
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 7.5 Delete Notification
```
DELETE {{base_url}}/api/v1/notifications/1
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 7.6 Stream Notifications (SSE) 🔴 REAL-TIME

> **Note:** This endpoint uses Server-Sent Events (SSE) for real-time notifications. 
> Postman doesn't fully support SSE, so it's recommended to test this using:
> - Browser (JavaScript EventSource API)
> - cURL
> - Specialized SSE clients

```
GET {{base_url}}/api/v1/notifications/stream?token={{user_token}}
```

**No Authorization Header needed** - Token is passed as query parameter

**Response Format:**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

**Event Types:**

1. **Connected Event:**
```
event: connected
data: {"user_id":1,"timestamp":1706000000,"message":"Connected to notification stream"}
```

2. **Notification Event:**
```
event: notification
data: {"type":"notification","notification":{"id":1,"title":"Room Request Approved","message":"Your request for Meeting Room A has been approved","type":"success","created_at":"2026-02-15T10:00:00Z"}}
```

3. **Ping Event (Keep-alive):**
```
event: ping
data: {"timestamp":1706000030}
```

**Testing with cURL:**
```bash
curl -N -H "Accept: text/event-stream" \
  "http://localhost:8080/api/v1/notifications/stream?token=YOUR_JWT_TOKEN"
```

**Testing with JavaScript (Browser):**
```javascript
const token = "YOUR_JWT_TOKEN";
const eventSource = new EventSource(`http://localhost:8080/api/v1/notifications/stream?token=${token}`);

eventSource.addEventListener('connected', (e) => {
  console.log('Connected:', JSON.parse(e.data));
});

eventSource.addEventListener('notification', (e) => {
  console.log('New notification:', JSON.parse(e.data));
});

eventSource.addEventListener('ping', (e) => {
  console.log('Ping:', JSON.parse(e.data));
});

eventSource.onerror = (error) => {
  console.error('SSE Error:', error);
};
```

---

## 🛠️ 8. System Settings (Room Admin Only)

### 8.1 Get System Settings
```
GET {{base_url}}/api/v1/admin/settings
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

---

### 8.2 Update System Settings
```
PUT {{base_url}}/api/v1/admin/settings
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "app_name": "Room Booking System",
  "enable_registration": true,
  "enable_otp_login": false,
  "enable_email_verification": true,
  "max_booking_days_advance": 30
}
```

---

## 👥 9. User Management

### 9.1 Get My Profile
```
GET {{base_url}}/api/v1/users/me
```

**Headers:**
```
Authorization: Bearer {{user_token}}
```

---

### 9.2 Update My Profile (with Avatar) ⭐ MULTIPART
```
PUT {{base_url}}/api/v1/users/me
```

**Headers:**
```
Authorization: Bearer {{user_token}}
Content-Type: multipart/form-data
```

**Body (form-data):**
- `name`: "John Doe Updated"
- `division`: "IT Department"
- `avatar`: [Select File] (JPG/PNG/WebP)

---

### 9.3 Change My Password
```
PUT {{base_url}}/api/v1/users/change-password
```

**Headers:**
```
Authorization: Bearer {{user_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "current_password": "password123",
  "new_password": "newpassword123"
}
```

---

### 9.4 Update My Preferences
```
PUT {{base_url}}/api/v1/users/preferences
```

**Headers:**
```
Authorization: Bearer {{user_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "notification_24h": true,
  "notification_3h": true,
  "notification_30m": false,
  "email_notifications": true,
  "otp_login_enabled": true
}
```

---

### 9.5 List All Users (Room Admin & GA)
```
GET {{base_url}}/api/v1/users?page=1&page_size=10
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

---

### 9.6 Get User Details (Room Admin & GA)
```
GET {{base_url}}/api/v1/users/2
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

---

### 9.7 Update User (Room Admin Only)
```
PUT {{base_url}}/api/v1/users/2
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Updated Name",
  "role": "GA",
  "is_active": true
}
```

---

### 9.8 Reset User Password (Room Admin Only)
```
POST {{base_url}}/api/v1/users/2/reset-password
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
Content-Type: application/json
```

**Body:**
```json
{
  "new_password": "newpassword123"
}
```

---

### 9.9 Delete User (Room Admin Only)
```
DELETE {{base_url}}/api/v1/users/2
```

**Headers:**
```
Authorization: Bearer {{admin_token}}
```

---

## 🎯 Complete Testing Flow in Postman

### Recommended Order:

1. **Health Check** → Verify server is running
2. **Register** 3 users (user, room_admin, GA)
3. **Login** all 3 users → Save tokens
4. **Login as Room Admin** → Create 2-3 rooms
5. **Login as User** → Create room requests:
   - Single day booking
   - Multi-day booking
   - Recurring booking
6. **Login as GA** → View pending requests
7. **GA** → Check available rooms for request
8. **GA** → Approve request (assign room)
9. **User** → Check notifications (REST API)
10. **User** → Connect to SSE stream (Browser/cURL)
11. **All** → View calendar with bookings
12. **All** → View bookings list

---

## 🔥 Pro Tips

### 1. Organize Requests in Folders
Create folders in your collection:
```
📁 Room Booking System API
  📁 1. Authentication
  📁 2. Rooms
  📁 3. Room Requests
    📄 3.1 Single Day
    📄 3.2 Multi-Day
    📄 3.3 Recurring
  📁 4. Request Approval
  📁 5. Bookings
  📁 6. Calendar
  📁 7. Notifications
    📄 7.1-7.5 REST Endpoints
    📄 7.6 SSE Stream
  📁 8. Users
```

### 2. Use Pre-request Scripts
Add this to Collection-level "Pre-request Script":
```javascript
// Auto-refresh tokens if needed
console.log("Current environment:", pm.environment.name);
console.log("Request:", pm.request.method, pm.request.url);
```

### 3. Common Test Scripts
Add to Collection-level "Tests":
```javascript
// Log response time
console.log("Response time:", pm.response.responseTime + "ms");

// Check status code
if (pm.response.code >= 400) {
    console.log("Error:", pm.response.json());
} else {
    console.log("Success:", pm.response.code);
}
```

### 4. Testing Recurring Bookings
When testing recurring bookings:
- Ensure `recurring_end_date` is after `booking_date`
- `recurring_days` must match the day of week of `booking_date`
- For weekly: Use format "1,3,5" (Mon, Wed, Fri)
- Check calendar to verify all occurrences are created

### 5. Testing Multi-Day Bookings
When testing multi-day bookings:
- `end_date` must be after `booking_date`
- Same time slot applies to all days
- System checks availability for ALL days before approval
- Rejecting one day rejects entire multi-day request

### 6. Testing SSE Notifications
Since Postman doesn't fully support SSE:
1. Use cURL for quick testing
2. Create a simple HTML page with JavaScript EventSource
3. Keep connection open to receive real-time notifications
4. Test by triggering events (approve/reject requests)

### 7. Export/Import Collection
- **Export**: Click **"..."** on collection → Export → Save as JSON
- **Import**: Click **"Import"** → Select JSON file
- Share with your team!

---

## 🐛 Troubleshooting

### Error: "Unauthorized" (401)
- Check if token is set in environment
- Re-login to get new token
- Check Authorization header format: `Bearer {{token}}`
- For SSE: Verify token is in query parameter

### Error: "Insufficient permissions" (403)
- Using wrong user role
- Room Admin trying GA-only endpoint
- GA trying Room Admin-only endpoint

### Error: "Route not found" (404)
- Check endpoint URL
- Verify base_url is correct
- Check HTTP method (GET/POST/PUT/DELETE)

### Error: "Invalid recurring pattern"
- Ensure recurring_days matches booking_date's day of week
- Check recurring_end_date is after booking_date
- Verify recurring_type is either "daily" or "weekly"

### Error: "Room not available"
- Check room availability first
- Verify time slot doesn't overlap existing bookings
- For multi-day: ALL days must be available
- For recurring: ALL occurrences must be available

### SSE Connection Issues
- Browser blocking mixed content (HTTP/HTTPS)
- CORS issues - check server CORS settings
- Token expired - refresh and reconnect
- Firewall/proxy blocking SSE connections

---

## 📊 Test Data Examples

### Complete Test Scenario

```javascript
// 1. Create Room
Room A: Capacity 10, Floor 1
Room B: Capacity 20, Floor 2

// 2. Create Requests
User 1:
- Single day: Feb 15, 10:00-12:00, Capacity 10
- Multi-day: Feb 20-22, 09:00-17:00, Capacity 15
- Recurring: Mon/Wed/Fri, Mar 2-27, 14:00-15:00, Capacity 10

User 2:
- Single day: Feb 15, 14:00-16:00, Capacity 20
- Multi-day: Feb 25-27, 13:00-16:00, Capacity 15

// 3. GA Approvals
Approve User 1 single day → Room A
Approve User 1 multi-day → Room B (all 3 days)
Approve User 1 recurring → Room A (all Mon/Wed/Fri)
Approve User 2 requests → Room B

// 4. Check Calendar
View Feb 15-28: Should show all bookings
View Room A calendar: User 1's bookings
View Room B calendar: User 1 & 2's bookings
```

---

**Happy Testing! 🚀**sting! 🚀**