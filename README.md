# Bone & Joint Disorder Detection System

This project is a web application for detecting bone and joint disorders using AI. It consists of a FastAPI backend and a React frontend.

## Prerequisites

- **Python** (3.8 or higher)
- **Node.js** & **npm**
- **MongoDB** (Ensure it is installed and running locally)

## Project Structure

- `backend/`: FastAPI application (Python)
- `frontend/`: React application (Vite + TypeScript)

## Setup Instructions

### 1. Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```

2.  Create a virtual environment (optional but recommended):
    ```bash
    python -m venv venv
    ```

3.  Activate the virtual environment:
    -   **Windows:**
        ```bash
        venv\Scripts\activate
        ```
    -   **macOS/Linux:**
        ```bash
        source venv/bin/activate
        ```

4.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```

5.  **Environment Variables:**
    Create a `.env` file in the `backend` directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```

6.  Run the backend server:
    ```bash
    uvicorn main:app --reload
    ```
    
    The backend will start at `http://localhost:8000`.
    
    **API Documentation:** `http://localhost:8000/docs`

    **Default Admin Credentials:**
    -   Username: `admin`
    -   Password: `admin`

### 2. Frontend Setup

1.  Open a new terminal and navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

    The frontend will start at `http://localhost:5173`.

## Running the Project

To run the full application, you need three terminal instances:

1.  **Terminal 1:** Run MongoDB (if not running as a service).
2.  **Terminal 2:** Run the Backend (`uvicorn main:app --reload` inside `backend/`).
3.  **Terminal 3:** Run the Frontend (`npm run dev` inside `frontend/`).

Access the application at `http://localhost:5173`.
