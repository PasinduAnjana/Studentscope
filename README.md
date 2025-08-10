# 🎓 StudentScope

StudentScope is a school management system with separate dashboards for **Admin**, **Teacher**, **Student**, and **Clerk** roles.

---

## ⚙️ Setup Instructions

1. **Go to backend folder**  
cd backend

2. **Install backend dependencies**  
npm install

3. **Create the `.env` file**  
cp .env.example .env  

  Edit `.env` with your PostgreSQL credentials:  
  PORT=3000  
  DB_ADMIN_USER=postgres  
  DB_ADMIN_PASSWORD=123  //your database password
  DB_USER=postgres  
  DB_PASSWORD=123  //your database password
  DB_HOST=localhost  
  DB_PORT=5432  
  DB_NAME=studentscope  

4. **Initialize the database and create tables**  
node db/db-init.js

5. **Insert sample data**  
node db/db-data.js

6. **Start the backend server**  
node server.js  
Backend will run on: http://localhost:3000

---

## 💻 Frontend Setup

The backend server will serve the frontend

---

## 📝 Notes
- Backend serves API routes under `/api/...`.
- Frontend communicates with the backend API.
- Both `backend` and `frontend` folders should remain in the project structure for everything to work.

---

✅ You’re now ready to run **StudentScope**!
