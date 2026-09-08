# Bhoomi Setu 🌍
**Real-Time National Land Acquisition & Management System**

Bhoomi Setu is a comprehensive, digital-first platform designed to streamline, monitor, and manage national land acquisition processes. It provides end-to-end transparency, real-time tracking, GIS spatial viewing, and seamless compensation disbursement for infrastructure project corridors.

---

## 🌟 Key Features
- **Field Survey Mobile Console**: Live geofencing, multi-vertex boundary creation, custom red pin coordinate dropping, and OpenStreetMap spatial search.
- **GIS Spatial Viewer**: High-contrast interactive map to visualize project corridors and survey boundaries using OpenStreetMap India and Esri Satellite Imagery.
- **National Dashboard**: Centralized analytics for land acquisition status, compensation payouts, and dispute tracking.
- **Role-Based Access Control (RBAC)**: Secure workspaces tailored for SLAO, Field Surveyors, R&R Commissioners, and PFMS Finance Officers.
- **Citizen Portal & Grievances**: Seamless transparency for landowners to view their compensation status and file grievances.
- **Automated ULPIN Verification**: Mock integration for fetching DILRMP land records.

## 🚀 Technology Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, Leaflet (React-Leaflet).
- **Backend**: Node.js, Express.js.
- **Database**: SQLite (via `sqlite3` for local persistence without complex setup).
- **Mapping & GIS**: Leaflet.js, OpenStreetMap, ESRI Imagery.

---

## 📋 Prerequisites
Before you begin, ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)
- Git

---

## 🛠️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/bhoomi-setu.git
cd "bhoomi-setu"
```

### 2. Setup Backend Server
Open a terminal and navigate to the backend directory:
```bash
cd backend

# Install all required Node dependencies
npm install

# Start the Express server (Runs on port 5001 by default)
npm start
```
*The backend API should now be running at `http://localhost:5001`.*

### 3. Setup Frontend Application
Open a **new** terminal window/tab and navigate to the frontend directory:
```bash
cd frontend

# Install all required React/Vite dependencies
npm install

# Start the Vite development server
npm run dev
```
*The frontend application should now be accessible at `http://localhost:3000` (or `http://localhost:5173`).*

---

## 📁 Project Structure

```text
Bhoomi Setu/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Business logic and request handlers
│   │   ├── routes/           # Express API route definitions
│   │   ├── db.js             # Database connection logic
│   ├── data/                 # SQLite database files (projects.db)
│   ├── server.js             # Express application entry point
│   └── package.json          # Backend dependencies & scripts
│
└── frontend/
    ├── src/
    │   ├── components/       # Reusable UI components (Sidebar, Header, etc.)
    │   ├── pages/            # Core views (FieldSurveyMobile, GisSpatialViewer, etc.)
    │   ├── services/         # API integration services (axios calls)
    │   ├── context/          # React Context providers (AuthContext)
    │   ├── index.css         # Global Tailwind CSS directives
    │   ├── App.jsx           # Main React Router configuration
    │   └── main.jsx          # React application entry point
    ├── index.html            # Vite HTML template
    ├── tailwind.config.js    # Tailwind styling and theme rules
    └── package.json          # Frontend dependencies & scripts
```

---

## 🔒 Environment Variables Configuration

If you need to configure custom ports or endpoints, create `.env` files in the respective directories.

**Backend (`backend/.env`)**
```env
PORT=5001
```

**Frontend (`frontend/.env`)**
```env
VITE_API_BASE_URL=http://localhost:5001/api
```

---

## 🏗️ Building for Production
To build the frontend for production deployment:
```bash
cd frontend
npm run build
```
This will generate a `dist/` directory containing the optimized static files ready to be served by Nginx, Apache, or any static hosting service.

---

## 🤝 Contribution Guidelines
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
