# Government Feedback System with deep learning based sentiment analysis capabilities - Production Deployment

## Architecture Overview

This project is structured as a full-stack modern web application:
- **Frontend**: React, TailwindCSS, React Query, React Router (Served via Nginx in production).
- **Backend**: FastAPI, Motor (async MongoDB driver), Pydantic.
- **Database**: Centralized MongoDB (e.g., MongoDB Atlas).
- **Deployment**: Fully dockerized with `docker-compose`, designed for ML service auto-scaling.

## Prerequisites
- Docker and Docker Compose installed on your host server.
- Domain name pointing to your server IP (optional but recommended for SSL).
- A central MongoDB database (e.g., MongoDB Atlas cluster).
- SMTP/httpx credentials (e.g., Brevo) for OTP emails.

## Environment Variables Configuration

Before deploying, you MUST configure the environment variables securely. Do NOT commit the `.env` files to source control.

1. Create the backend `.env` file from the example:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and set secure values:
   - `MONGO_URL`: Connection string to your central database (e.g., `mongodb+srv://user:pass@cluster0.mongodb.net/auth_db`).
   - `SECRET_KEY`: Generate a secure random string (e.g., `openssl rand -hex 32`).
   - `CORS_ORIGINS`: Add your production domains (e.g., `["https://yourdomain.com"]`).
   - `BREVO_USER` & `BREVO_API_KEY`: Your Brevo credentials.

2. Create the frontend `.env` file from the example:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   Edit `frontend/.env` and set:
   - `REACT_APP_API_URL`: Your backend API URL (e.g., `https://api.yourdomain.com`).

## Production Deployment

This project uses `docker-compose` tailored for a production environment.

### 1. Build and Start the Containers

To build the images and run the containers in detached mode:

```bash
docker-compose up -d --build
```

If you anticipate high usage and want to scale the ML sentiment analysis service, you can run multiple instances:

```bash
docker-compose up -d --build --scale ml-service=3
```

### 2. Verify Services

Check that your containers (`smart-gov-backend`, `smart-gov-frontend`, `smart-gov-ml-service`) are running:

```bash
docker-compose ps
```

### 3. Check Logs

Monitor the backend logs to ensure it connected to the database:

```bash
docker-compose logs -f backend
```

## Security & Performance Optimizations included:
- **Non-root Containers**: Backend runs as a non-root user.
- **Multi-stage Builds**: Minimizes Docker image sizes.
- **Nginx Hardening**: Gzip compression and strict security headers are enabled in `frontend/nginx.conf`.
- **Resource Limits**: Configured in `docker-compose.yml` to prevent OOM issues on the host.
- **Database Connection Pooling**: Optimized for production concurrency.
- **Structured Logging**: JSON format logging enabled for easy integration with external log aggregators.
- **Global Exception Handling**: Safe error handling without leaking stack traces to users.
- **Rate Limiting**: Built-in slowapi rate limiting for OTP and login routes.

## Reverse Proxy (HTTPS/SSL)

For a production environment exposed to the internet, it is strongly recommended to put a reverse proxy (like Nginx, Traefik, or Caddy) *in front* of this docker-compose setup to handle SSL termination (Let's Encrypt). 

Route traffic:
- `yourdomain.com` -> `localhost:80` (Frontend)
- `api.yourdomain.com` -> `localhost:8000` (Backend)

## ⚠ Academic Integrity Notice

This repository is shared publicly for learning and portfolio review.
Submitting this project (or any substantial part of it) as your own
academic work is a violation of academic integrity policies.

Original work by the team: Harsh Bhardwaj, Chanchal Sharma, Soni Jadun, Harshita Gupta
