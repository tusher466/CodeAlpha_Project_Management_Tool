# TaskPulse — Collaborative Project Management Tool

**TaskPulse** is a modern, real-time, collaborative project management platform inspired by **Trello** and **Asana**. Built from the ground up with a full-stack architecture featuring a **React 18 + Vite** frontend and an **Express + Socket.IO + SQLite** backend.

---

## ✨ Key Features

### 1. Collaborative Group Projects
- **Multi-project workspaces**: Create, customize, and manage multiple projects with distinct color themes and descriptions.
- **Role-based team membership**: Project owners, administrators, members, and viewers.
- **Team invitations**: Invite registered team members to any project with custom permission levels.

### 2. Multi-View Project Boards
- **Interactive Kanban Board**: Fluid drag-and-drop task card movement between custom columns (Backlog, To Do, In Progress, Review, Completed) powered by `@hello-pangea/dnd`.
- **List / Table View**: Structured Asana-style table for sorting, inline status switching, and scanning due dates and assignees.
- **Calendar View**: Month grid displaying tasks aligned to their due dates.
- **Activity & Audit Stream**: Real-time chronological audit trail of all project changes (task moves, comments, member additions).

### 3. Comprehensive Task Cards & Management
- **Task Attributes**: Title, rich description, priority badges (Low, Medium, High, Urgent), due date with overdue warnings, multi-assignees, and color-coded tags.
- **Subtasks & Checklists**: Interactive checklist items with dynamic progress bars and celebratory confetti animations upon completion.
- **Column Management**: Add new columns, double-click to rename, or remove empty columns.

### 4. Real-Time Task Comments & Communication
- **Task Discussion Threads**: Threaded comments with author avatars, roles, and relative timestamps.
- **@Mentions**: Type `@` to view and mention team members; triggers immediate notifications to mentioned users.
- **Live Typing Indicators**: Displays real-time `[User] is typing a comment...` notifications to active viewers.

### 5. WebSockets Real-Time Sync & In-App Notifications
- **Instant Board Synchronization**: When User A drags a task or updates a description, User B's screen reflects changes immediately without refreshing.
- **Active User Presence**: Pulsing green indicators and live avatars displaying who is currently viewing the board.
- **Notification Center**: Bell icon with unread badge counter, dropdown feed of assignment & mention alerts, and floating popup toasts.

### 6. Authentication & 1-Click Multi-User Demo Switcher
- **JWT & Bcrypt Security**: Secure registration, login, and token-based API authentication.
- **Quick Switcher**: 1-click switcher between pre-seeded demo accounts (Alex Rivera, Sarah Chen, Elena Rostova, Marcus Scott, David Kim) for testing real-time collaboration across multiple tabs.

---

## 🛠 Technology Stack

- **Backend**:
  - **Runtime**: Node.js v24
  - **Server Framework**: Express 4
  - **Real-Time WebSockets**: Socket.IO 4
  - **Database**: Embedded SQLite via native `node:sqlite` (zero compilation, ACID-compliant)
  - **Security**: JSON Web Tokens (`jsonwebtoken`), `bcryptjs` password hashing
- **Frontend**:
  - **Framework**: React 18 + Vite 6
  - **Styling**: Tailwind CSS
  - **Icons**: Lucide React
  - **Drag and Drop**: `@hello-pangea/dnd`
  - **Dates & Utilities**: `date-fns`, `canvas-confetti`

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18 or higher; v22/v24 recommended)
- npm

### Installation & Launch

1. **Install dependencies**:
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Build the frontend (optional for single-port mode)**:
   ```bash
   cd client && npm run build
   ```

3. **Start the application**:
   - **Unified Production Server (Frontend + Backend on Port 5000)**:
     ```bash
     cd server && npm start
     ```
     Open `http://localhost:5000` in your browser.

   - **Development Mode (Vite Hot-Reload on Port 5173 + Server on 5000)**:
     - In Terminal 1: `cd server && npm run dev`
     - In Terminal 2: `cd client && npm run dev`
     - Open `http://localhost:5173`.

---

## 👥 Pre-Seeded Demo Accounts

You can test multi-user real-time collaboration right away using any of the following accounts:

| Name | Role | Email | Password |
|---|---|---|---|
| **Alex Rivera** | Product Lead | `alex@example.com` | `password123` |
| **Sarah Chen** | Tech Lead & Architect | `sarah@example.com` | `password123` |
| **Marcus Scott** | Frontend Engineer | `marcus@example.com` | `password123` |
| **Elena Rostova** | UI/UX Designer | `elena@example.com` | `password123` |
| **David Kim** | DevOps Engineer | `david@example.com` | `password123` |

*Tip: You can use the **"Switch User"** button in the top navigation bar to switch between users in 1 click!*

---

## 🔌 API Reference

### Authentication
- `POST /api/auth/register` — Register a new account
- `POST /api/auth/login` — Login with email and password
- `GET /api/auth/me` — Get current authenticated user
- `GET /api/auth/users` — List all registered users
- `POST /api/auth/quick-login` — 1-click login for demo accounts

### Projects
- `GET /api/projects` — List accessible projects
- `POST /api/projects` — Create group project
- `GET /api/projects/:id` — Get project details, columns, tasks, members, and activity
- `PUT /api/projects/:id` — Update project
- `DELETE /api/projects/:id` — Delete project
- `POST /api/projects/:id/members` — Add team member
- `DELETE /api/projects/:id/members/:userId` — Remove team member

### Columns & Tasks
- `POST /api/:projectId/columns` — Create column
- `PUT /api/columns/:columnId` — Update column
- `PUT /api/:projectId/columns/reorder` — Reorder columns
- `DELETE /api/columns/:columnId` — Delete column
- `POST /api/:projectId/tasks` — Create task
- `GET /api/tasks/:taskId` — Get task details
- `PUT /api/tasks/:taskId` — Update task fields
- `PUT /api/tasks/:taskId/move` — Move task between columns or change index
- `DELETE /api/tasks/:taskId` — Delete task
- `POST /api/tasks/:taskId/checklist` — Add subtask item
- `PUT /api/tasks/:taskId/checklist/:itemId` — Toggle or update subtask

### Comments & Notifications
- `GET /api/tasks/:taskId/comments` — Get task comments
- `POST /api/tasks/:taskId/comments` — Add comment (supports `@mention`)
- `DELETE /api/comments/:commentId` — Delete comment
- `GET /api/notifications` — Get user notifications & unread count
- `PUT /api/notifications/:id/read` — Mark notification read
- `PUT /api/notifications/mark-all-read` — Mark all notifications read
- `DELETE /api/notifications/:id` — Delete notification

---

## 🧪 Testing

Automated integration test suite is located in `server/test/api-test.js`.
To run the automated test suite:
```bash
node server/test/api-test.js
```
