# Insights360 (INSIGHTS360) — Developer Setup & Local Run Guide

Insights360 is a Business Intelligence dashboard for sales analytics including Dashboard, Regional Analysis, VAD Analysis, SI‑VAD Analysis, and Product Movement.

This guide explains how another developer can clone the repository and run the application on **localhost**.

---

# Project Structure

* `bi-dashboard/` → Frontend (UI)
* `server/` → Backend (Node.js API)
* Root folder → Project configuration

---

# 1. Prerequisites (Install First)

Before cloning the repository, install the following tools:

## 1.1 Install Git

Git is required to clone the repository.

Verify installation:

```bash
git --version
```

Download from: [https://git-scm.com/](https://git-scm.com/)

---

## 1.2 Install Node.js (LTS) + npm

Node.js is required for both frontend and backend.

1. Download LTS version from: [https://nodejs.org/](https://nodejs.org/)
2. Install with default settings
3. Verify installation:

```bash
node -v
npm -v
```

---

## 1.3 Install Python 3.10+ (If Required for Data Processing)

If your environment includes Python-based utilities or scripts:

Download from: [https://www.python.org/downloads/](https://www.python.org/downloads/)

Verify installation:

```bash
python --version
```

---

## 1.4 (Recommended) Create a Virtual Environment

If Python is used:

```bash
python -m venv .venv
```

Activate it:

### Windows

```bash
.venv\Scripts\activate
```

### macOS / Linux

```bash
source .venv/bin/activate
```

---

# 2. Clone the Repository

```bash
git clone https://github.com/anerishah-matrix/INSIGHTS360.git
cd INSIGHTS360
```

---

# 3. Backend Setup (Node.js)

Navigate to the backend folder:

```bash
cd server
```

Install backend dependencies:

```bash
npm install
```

Run the backend server:

```bash
node index.js
```

Backend will typically run on:

```
http://localhost:8000
```

(Or the port defined inside the server configuration.)

---

# 4. Frontend Setup (React / UI)

Open a new terminal and navigate to frontend:

```bash
cd bi-dashboard
```

Install frontend dependencies:

```bash
npm install
```

Start the frontend development server:

```bash
npm run dev
```

Frontend will typically run on:

```
http://localhost:3000
```

(Or the port shown in the terminal.)

---

# 5. Running the Application Locally

You must run **both backend and frontend simultaneously**:

Terminal 1:

```bash
cd server
node index.js
```

Terminal 2:

```bash
cd bi-dashboard
npm run dev
```

Open the frontend URL shown in the terminal.

---

# 6. Environment Configuration (If Required)

If the application requires environment variables:

Create `.env` files in:

* `server/`
* `bi-dashboard/`

Example:

Backend `.env`

```
PORT=8000
```

Frontend `.env`

```
VITE_BACKEND_URL=http://localhost:8000
```

Ensure sensitive credentials are NOT committed to Git.

---

# 7. Google Drive Sync (If Enabled)

If using Google Drive integration:

1. Ensure the Drive folder is shared with:
   `bi-dashboard-reader@bi-dashboard-drive.iam.gserviceaccount.com`
2. Paste the Folder ID in the application top bar
3. Click **SYNC** to load or refresh data

---

# 8. Troubleshooting

### Backend not starting

* Ensure you are inside the `server` folder
* Run `npm install` before `node index.js`

### Frontend not connecting to backend

* Ensure backend is running
* Verify backend URL in frontend `.env`

### Port already in use

* Change port in backend configuration
* Or stop the existing process using that port

---

# Section to Add in User Guide (Developer Installation Steps)

Add the following to your main User Guide:

## Localhost Setup (For Developers)

1. Install Git.
2. Install Node.js (LTS).
3. Install Python 3.10+ (if required).
4. (Optional) Create a virtual environment:

   * `python -m venv .venv`
   * Activate it using:

     * Windows: `.venv\\Scripts\\activate`
     * macOS/Linux: `source .venv/bin/activate`
5. Clone the repository:

   * `git clone https://github.com/anerishah-matrix/INSIGHTS360.git`
   * `cd INSIGHTS360`
6. Start Backend:

   * `cd server`
   * `npm install`
   * `node index.js`
7. Start Frontend:

   * `cd bi-dashboard`
   * `npm install`
   * `npm run dev`
8. Open the localhost URL displayed in the terminal.

---

**Insights360 – Developer Setup Documentation**
