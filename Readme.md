# Tutedude Proctoring System

This repository contains both the **frontend** (React + Vite + TypeScript) and **backend** (FastAPI + aiortc + YOLO) for a proctoring/interview monitoring system.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Frontend Setup](#frontend-setup)
- [Backend Setup](#backend-setup)
- [Environment Variables](#environment-variables)
- [Development Workflow](#development-workflow)
- [Notes](#notes)

---

## Project Structure

```
.
├── frontend/   # React + Vite + TypeScript client
└── backend/    # FastAPI + aiortc + YOLO backend
```

---

## Frontend Setup (`frontend/`)

### Prerequisites

- Node.js (v18+ recommended)
- [bun](https://bun.sh/) (if you use bun, otherwise use npm/yarn)

### Install Dependencies

```bash
cd frontend
npm install       
```

### Run Development Server

```bash
npm run dev         
```

- The app will be available at [http://localhost:8080](http://localhost:8080) by default.

---

## Backend Setup (`backend/`)

### Prerequisites

- Python 3.11+
- ffmpeg (must be in your PATH)
- (Optional) CUDA drivers for GPU acceleration

### Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` file in the `backend/` directory for any secrets or configuration (see [Environment Variables](#environment-variables)).

### Run the Backend

```bash
uvicorn main:app --reload
```

- The API will be available at [http://localhost:8000](http://localhost:8000).

---

## Environment Variables

- Place your environment variables in `backend/.env`.
- Example:
  ```
  DATABASE_LINK 
  CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY 
  CLOUDINARY_API_SECRET 



  ```

---

## Development Workflow

1. **Start the backend**  
   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Start the frontend**  
   ```bash
   cd frontend
   bun run dev   # or npm run dev
   ```

3. **Access the app**  
   - Frontend: [http://localhost:8080](http://localhost:8080)
   - Backend: [http://localhost:8000](http://localhost:8000)
   - Frontend_Deployed: [https://tutedude-assignment-zeta.vercel.app](https://tutedude-assignment-zeta.vercel.app)
   - Backend: [https://tutedude-assignment-r8jp.onrender.com](https://tutedude-assignment-r8jp.onrender.com)
   

4. **Proctoring/Interviewing**  
   - The frontend communicates with the backend for video streaming, event logging, and report generation.
   - Ensure your webcam is available and not used by other apps.

---

## Notes

- **CORS:** The backend is configured to allow CORS for local development.
- **.gitignore:** Both `__pycache__/` and `.env` are ignored in version control.
- **Uploads:** Uploaded videos are stored in `backend/uploads/`.
- **YOLO Models:** Place your YOLO model files (e.g., `yolo11n.pt`, `yolov8m.pt`) in the `backend/` directory.

---

## Troubleshooting

- If you encounter CORS errors, ensure the backend CORS middleware is enabled.
- If the webcam is not detected, check ffmpeg installation and device permissions.
- For AI model errors, verify the model files exist and are compatible.

---


