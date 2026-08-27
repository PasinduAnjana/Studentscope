# 🎓 StudentScope — Modern School Management System

<div align="center">

![StudentScope Logo](frontend/assets/icons/logo.png)

**An all-in-one, role-based school management and student information system designed for modern educational institutions.**

[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![JavaScript](https://img.shields.io/badge/Vanilla-JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

[Key Features](#-key-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Default Credentials](#-default-credentials) • [Project Structure](#-project-structure) • [API Overview](#-api-overview)

</div>

---

## 📖 Overview

**StudentScope** is a lightweight, high-performance web platform built to streamline academic administration, classroom workflows, and student performance tracking. Featuring dedicated portals for **Administrators**, **Teachers**, **Clerks**, and **Students**, it centralizes daily academic operations—from attendance marking and grade management to timetable scheduling and audit logging—without the bloat of heavy frontend dependencies.

---

## ✨ Key Features

### 🛡️ Administrator Portal
- **Central Analytics & Insights**: High-level statistical overview of institution metrics, student counts, and teacher distributions.
- **Academic Setup**: Configure grades (1–13), classes, subject curricula, and elective bucket allocations.
- **Staff & User Management**: Provision and manage accounts for teachers, clerks, and students.
- **Attendance & Disciplinary Summaries**: School-wide attendance rate monitoring and disciplinary behavior tracking.
- **Certificate Management**: Generate and verify academic and extracurricular certificates.
- **Security & Audit Logs**: Full visibility into sensitive system operations with user activity timestamps.
- **System-Wide Announcements**: Broadcast official notices across all user dashboards.

### 👨‍🏫 Teacher Portal
- **Daily Attendance Marking**: Fast, intuitive interface to record and submit daily classroom attendance.
- **Grade Book & Marks Entry**: Enter and manage term test results, exam scores, and continuous assessments by subject.
- **Student Performance Roster**: View detailed student profiles, academic histories, and behavior notes.
- **Interactive Timetable**: Visual weekly schedule of assigned classes and subjects.
- **Personal To-Do & Task Manager**: Organize daily classroom preparations and follow-ups.
- **Events & Notices**: Access institution calendars and post class-level updates.

### 🏛️ Clerk / Administration Staff Portal
- **Student Admissions & Registry**: Register new students, update personal records, and manage guardian contact details.
- **Staff Registry**: Maintain teacher records, NIC details, qualifications, and appointment dates.
- **Class & Subject Allocation**: Map classes, assign class teachers, and configure subject lists.
- **Timetable Scheduling**: Create and publish master timetables and classroom allocations.
- **Exam & Assessment Scheduling**: Schedule examination periods and publish exam timetables.
- **Achievements & Extracurricular Registry**: Record sports, clubs, and academic achievements.

### 🎓 Student Portal
- **Academic Dashboard**: Instant view of current term statistics, upcoming deadlines, and notices.
- **Report Cards & Exam Marks**: Subject-wise mark breakdowns, grades, term summaries, and progress trends.
- **Attendance Tracker**: Personal attendance percentages and absence records.
- **Weekly Schedule**: Personalized class timetable based on enrolled electives.
- **Achievements & Certificates**: Showcase digital records of extracurricular badges and certificates.
- **Notice Board & School Events**: Stay updated with official school communications and event dates.

---

## 🛠️ Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | **Node.js (Native HTTP)** | Modular routing & controllers with zero heavy framework overhead |
| **Database** | **PostgreSQL** | Relational data store with pooled connections via `pg` |
| **Security** | **PBKDF2 Hashing** | Secure password hashing (`crypto.pbkdf2Sync`) with unique per-user salts |
| **Frontend** | **Vanilla HTML5 / CSS3 / JS** | Fast, responsive, glassmorphic UI using standard web APIs |
| **Containerization** | **Docker** | Multi-stage, production-ready Alpine container |

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.x or higher)
- [PostgreSQL](https://www.postgresql.org/) (v14.x or higher)
- [Git](https://git-scm.com/)

---

### Local Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/PasinduAnjana/Studentscope.git
cd Studentscope
```

#### 2. Configure Backend Environment
```bash
cd backend
cp .env.example .env
```

Edit `.env` with your PostgreSQL database credentials:
```env
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=studentscope
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Or provide a single connection string:
# DATABASE_URL=postgresql://postgres:your_password@localhost:5432/studentscope
```

#### 3. Install Dependencies
```bash
npm install
```

#### 4. Initialize Database Schema & Seed Data
```bash
# Create database tables and constraints
node db/db-init.js

# Populate sample data (classes, subjects, teachers, students, timetables)
node db/db-data.js
```

#### 5. Launch the Server
```bash
node server.js
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

### 🐳 Running with Docker

You can build and run **StudentScope** as a lightweight Docker container:

```bash
# Build the Docker image
docker build -t studentscope:latest .

# Run the container (point to your PostgreSQL database)
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:password@host.docker.internal:5432/studentscope" \
  --name studentscope-app \
  studentscope:latest
```

---

## 🔑 Default Seed Credentials

When using sample data seeded via `db-data.js`, use the following default credentials to test each portal:

| Role | Username | Default Password | Notes |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `123` | Full system access & settings |
| **Clerk** | `clerk` | `123` | Student/Staff registration & timetables |
| **Teacher** | `teacher1-A` | `123` | Grade 1-A class teacher (formats: `teacher{grade}-{section}`, e.g., `teacher10-B`) |
| **Student** | `S1000` | `123` | Student index numbers start from `S1000`, `S1001`, ... |

---

## 📁 Project Structure

```text
Studentscope/
├── backend/
│   ├── controllers/         # Request handling logic for each role
│   │   ├── admin/           # Admin operations (audits, users, settings)
│   │   ├── clerk/           # Clerk operations (admissions, classes, exams)
│   │   ├── student/         # Student endpoints (marks, attendance, profile)
│   │   ├── teacher/         # Teacher endpoints (marks entry, attendance)
│   │   ├── achievementsController.js
│   │   └── authController.js
│   ├── db/                  # Database connectivity and migrations
│   │   ├── index.js         # PostgreSQL connection pool configuration
│   │   ├── db-init.js       # Table schema definitions & DDL scripts
│   │   └── db-data.js       # Database seeder with sample curricula & users
│   ├── middleware/          # Authentication & role-verification middleware
│   ├── routes/              # HTTP API routing split by role
│   ├── services/            # Business logic and database query operations
│   ├── serveStatic.js       # Static asset and frontend HTML file server
│   ├── server.js            # Entry point of the backend server
│   └── package.json
│
├── frontend/
│   ├── assets/              # SVG icons, illustrations, and logos
│   ├── components/          # Reusable HTML snippets (topbar, toast)
│   ├── css/                 # Modern responsive stylesheets & design tokens
│   │   ├── dashboard/       # Specialized component stylesheets
│   │   ├── dashboard.css    # Master layout & sidebar styling
│   │   └── style.css        # Base theme & typography
│   ├── dashboard/           # Role-specific HTML views
│   │   ├── admin/           # Administrator dashboard views
│   │   ├── clerk/           # Clerk dashboard views
│   │   ├── student/         # Student dashboard views
│   │   └── teacher/         # Teacher dashboard views
│   ├── js/                  # Client-side API fetchers & view controllers
│   └── index.html           # Login page
│
├── Dockerfile               # Production container definition
└── README.md                # Project documentation
```

---

## 🔌 API Overview

All API endpoints are namespaced under `/api` and return standard JSON payloads.

| Prefix | Target Portal | Key Capabilities |
| :--- | :--- | :--- |
| `/api/auth` | Authentication | User login, session validation, logout |
| `/api/admin` | Admin Portal | Users, settings, statistics, audit logs, announcements |
| `/api/teacher` | Teacher Portal | Attendance submission, marks recording, subject roster |
| `/api/clerk` | Clerk Portal | Student admissions, staff profiles, timetable builder |
| `/api/student` | Student Portal | Performance cards, attendance records, schedule view |

---

## 🔒 Security & Best Practices

- **Password Protection**: Passwords are never stored in plaintext. They are hashed using `PBKDF2` (100,000 iterations, SHA-512) paired with cryptographically secure random salts.
- **Role Isolation**: Middleware validates authorization on protected API routes based on user role IDs.
- **Audit Trails**: Critical system actions are logged with actor details and timestamps to maintain institutional accountability.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

<div align="center">
<sub>Built with ❤️ for better school administration.</sub>
</div>
