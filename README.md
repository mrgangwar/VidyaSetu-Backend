# 📚 VidyaSetu Backend - Tuition SaaS API Server

A robust Node.js/Express backend for the VidyaSetu tuition management platform. This API handles authentication, student management, attendance tracking, fee collection, homework distribution, and push notifications for a multi-role tuition management system.

---

## 🚀 Features

### 🔐 Authentication & Authorization
- **Multi-Role Login**: Supports SUPER_ADMIN, ADMIN, TEACHER, and STUDENT roles
- **JWT-Based Authentication**: Secure token-based authentication
- **Password Reset via OTP**: Email-based OTP verification for password recovery
- **Role-Based Access Control (RBAC)**: Middleware to protect routes based on user roles

### 🏢 Coaching Management
- Create and manage coaching institutions
- Associate teachers and students with specific coaching centers
- Centralized control by Super Admin

### 👨‍🎓 Student Management
- Create, update, delete student records
- Profile photo upload (Cloudinary integration)
- Student login credentials management
- Batch timing and session tracking
- Monthly fees configuration per student

### 📅 Attendance System
- Mark daily attendance (Present/Absent/Late/Leave/Holiday)
- Bulk attendance marking for entire batch
- Attendance history with statistics
- Student-wise attendance percentage calculation

### 💰 Fee Management
- Collect monthly fees from students
- Automatic balance calculation based on joining date
- Daily accrual logic for accurate fee tracking
- Fee history and receipt generation
- Professional fee receipt emails

### 📚 Homework Management
- Create homework assignments with title, description, and due date
- File attachments support (images and PDFs)
- Batch-specific homework distribution
- Homework history tracking

### 📢 Notice Board
- Create notices/notifications for students, teachers, or all users
- Super Admin broadcast system (global announcements)
- Push notification integration via Expo

### 📧 Communication
- Automated welcome emails for new teachers/students
- Fee payment receipt emails
- OTP-based password reset
- WhatsApp link generation for quick messaging

---

## 🏗️ Project Structure

```
tuition-saas-backend/
├── config/
│   ├── cloudinary.js      # Cloudinary image upload configuration
│   └── db.js              # MongoDB database connection
├── controllers/
│   ├── adminController.js      # Admin-specific operations
│   ├── authController.js        # Authentication (login, token)
│   ├── forgotPasswordController.js  # Password reset OTP
│   ├── studentController.js    # Student dashboard & data
│   └── teacherController.js    # Teacher operations
├── middleware/
│   ├── authMiddleware.js        # JWT authentication & authorization
│   └── uploadMiddleware.js      # Multer file upload handling
├── models/
│   ├── Attendance.js      # Attendance schema
│   ├── Coaching.js        # Coaching institution schema
│   ├── Fees.js            # Fee payment records
│   ├── Homework.js       # Homework assignments
│   ├── Notice.js         # Notice/broadcast schema
│   ├── OTP.js            # OTP for password reset
│   ├── Student.js        # Student profile schema
│   └── User.js           # User (Admin/Teacher) schema
├── routes/
│   ├── adminRoutes.js     # Admin API endpoints
│   ├── authRoutes.js     # Authentication endpoints
│   ├── studentRoutes.js  # Student API endpoints
│   └── teacherRoutes.js  # Teacher API endpoints
├── uploads/              # Local file storage for homework
├── utils/
│   ├── seedAdmin.js      # Database seeder for super admin
│   └── sendEmail.js      # Email sending utility
├── .env                  # Environment variables
├── index.js              # Server entry point
├── package.json          # Dependencies
└── railway.json          # Railway deployment config
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | Web framework |
| **MongoDB** | Database |
| **Mongoose** | ODM (Object Data Modeling) |
| **JWT** | Authentication tokens |
| **Bcrypt** | Password hashing |
| **Cloudinary** | Image storage & CDN |
| **Multer** | File upload handling |
| **Nodemailer** | Email sending |
| **Expo SDK** | Push notifications |
| **Helmet** | Security headers |
| **CORS** | Cross-origin resource sharing |

---

## 📡 API Endpoints

### Authentication Routes (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | User login (email/student ID + password) |
| POST | `/send-otp` | Send OTP for password reset |
| POST | `/reset-password` | Reset password using OTP |
| GET | `/me` | Get current user profile |
| GET | `/notices` | Get role-based notices |
| POST | `/update-push-token` | Update Expo push token |

### Admin Routes (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create-teacher` | Create new teacher account |
| GET | `/teachers` | Get all teachers |
| GET | `/teacher/:id` | Get teacher details |
| PUT | `/teacher/update/:id` | Update teacher profile |
| DELETE | `/teacher/delete/:id` | Delete teacher |
| PUT | `/profile/update` | Update admin profile |
| POST | `/broadcast` | Create global broadcast (Super Admin) |
| GET | `/notices` | Get all notices |
| DELETE | `/broadcast/:id` | Delete notice |

### Teacher Routes (`/api/teacher`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/create-student` | Create new student |
| GET | `/my-students` | Get all students |
| GET | `/student/:id` | Get student details |
| PUT | `/update-student/:id` | Update student |
| DELETE | `/delete-student/:id` | Delete student |
| POST | `/mark-attendance` | Mark daily attendance |
| GET | `/today-attendance` | Get today's attendance |
| GET | `/attendance-history` | Get attendance by date |
| GET | `/student-attendance-stats/:id` | Get student attendance stats |
| DELETE | `/delete-attendance` | Delete attendance records |
| POST | `/collect-fee` | Collect student fee |
| GET | `/fee-stats` | Get fee statistics |
| POST | `/create-notice` | Create notice |
| GET | `/my-notices` | Get own notices |
| DELETE | `/notice/:id` | Delete notice |
| GET | `/broadcasts` | Get Super Admin broadcasts |
| POST | `/create-homework` | Create homework |
| GET | `/my-homeworks` | Get homework history |
| DELETE | `/delete-homework/:id` | Delete homework |
| GET | `/profile` | Get teacher profile |
| PUT | `/update-profile` | Update own profile |
| GET | `/developer-contact` | Get developer contact info |

### Student Routes (`/api/student`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get student dashboard |
| GET | `/my-homework` | Get assigned homework |
| GET | `/attendance-history` | Get attendance history |
| GET | `/fee-history` | Get fee payment history |
| GET | `/my-teachers` | Get assigned teachers |
| GET | `/all-notices` | Get all notices |

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory:

```env
# Server
PORT=5000

# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/vidyasetu

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Email (Gmail SMTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# CORS (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:8081,https://your-app.expo.dev
```

---

## 🏃‍♂️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB (local or Atlas)
- Cloudinary account (for image uploads)

### Steps

1. **Clone and Install Dependencies**
   ```bash
   cd tuition-saas-backend
   npm install
   ```

2. **Configure Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Development Server**
   ```bash
   npm run dev
   ```

4. **Start Production Server**
   ```bash
   npm start
   ```

---

## 🔑 Default Credentials

The server automatically seeds a Super Admin on first run:

| Field | Value |
|-------|-------|
| Email | `admin@vidyasetu.com` |
| Password | `admin123` |

> ⚠️ **Important**: Change the default password after first login!

---

## 📱 Push Notifications

The backend uses **Expo Server SDK** for push notifications. Users must register their Expo push tokens via the `/api/auth/update-push-token` endpoint. The app receives:
- Global broadcasts from Super Admin
- Fee reminders
- Notice updates

---

## 📄 License

ISC License - See LICENSE file for details.

---

## 👨‍💻 Developer

**VidyaSetu Team**  
Bridging Knowledge, Empowering Education 🌟
