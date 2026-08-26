# Technology Stack

This document details the technologies identified in the repository based on configuration files (`package.json`, `requirements.txt`, `docker-compose.yml`, etc.) and source code.

## Languages
- **Python 3.10+**: Used for the Backend API and ML Service.
- **JavaScript (ES6+)**: Used for the Frontend UI.
- **HTML5 & CSS3**: Core web technologies used in the frontend.

## Frontend Technologies
- **React**: UI library (version ~19.2.0).
- **React Router DOM**: Client-side routing (version ~7.18.1).
- **React Query (TanStack Query)**: Data fetching, caching, and state management (version ~5.101.4).
- **Tailwind CSS**: Utility-first CSS framework for styling (version ~3.4.19).
- **Recharts**: Charting library used for analytics dashboards (version ~3.10.1).
- **Lucide React**: Icon library (version ~1.28.0).
- **React Hot Toast**: Toast notifications (version ~2.6.0).

## Backend Technologies
- **FastAPI**: High-performance asynchronous web framework for Python (version 0.109.2).
- **Uvicorn**: ASGI web server (version 0.27.1).
- **Pydantic**: Data validation and settings management (version 2.6.1).
- **Motor**: Asynchronous Python driver for MongoDB (version 3.3.2).
- **Passlib & Bcrypt**: Password hashing.
- **Python-JOSE**: JWT (JSON Web Token) encoding and decoding.
- **SlowAPI**: Rate limiting for FastAPI.
- **HTTPX**: Asynchronous HTTP client (used for backend to ML-service communication and external APIs).

## Machine Learning & AI
- **Transformers (Hugging Face)**: NLP library for loading pre-trained models.
- **PyTorch**: Deep learning framework backend for Transformers.
- **Modal**: Serverless cloud infrastructure integration for ML deployments.

## Database
- **MongoDB**: NoSQL database used for persistent storage of all application data (Users, Posts, Comments, OTPs, Audit Logs). Accessed asynchronously via Motor.

## Infrastructure & DevOps
- **Docker**: Containerization of the Backend and ML Service.
- **Docker Compose**: Orchestration of multi-container deployment (`backend` and `ml-service`).
- **Nginx**: Web server configuration found in `frontend/nginx.conf` for serving the built React app.
- **Vercel**: Identified via `vercel.json` in the frontend directory, suggesting serverless deployment for the frontend.

## Testing Frameworks
- **Pytest**: Backend unit and integration testing (`pytest==8.0.2`, `pytest-asyncio==0.23.5`).
- **Mongomock-Motor**: Mocking MongoDB for backend tests (`mongomock-motor==0.0.33`).
- **Jest & React Testing Library**: Frontend component testing.

## External Services
- **Brevo API (Sendinblue)**: Identified in `config.py` and `email_service.py` for sending OTP emails via SMTP/HTTP API.
- **Hugging Face Hub**: Model repository integration for pulling ML models.
