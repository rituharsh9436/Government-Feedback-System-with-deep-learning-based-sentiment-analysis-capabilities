# Deployment Strategy

This document outlines the deployment configuration currently available in the repository.

## Current Implementation

### 1. Containerization
The backend applications are containerized using Docker.
- `backend/Dockerfile`: Builds the FastAPI application.
- `ml-service/Dockerfile`: Builds the ML Service application.

### 2. Orchestration (`docker-compose.yml`)
A `docker-compose.yml` file is provided in the root directory to orchestrate the backend services for local development or simple single-node deployment.
- **Backend Service**: Exposed on port `8000`. It depends on the ML service being healthy before starting. Memory limits are explicitly set (`512M`).
- **ML Service**: Exposed internally on port `8001`. It includes health checks and a higher memory limit (`2G`) to accommodate the Hugging Face models.

### 3. Frontend Deployment
- **Nginx**: An `nginx.conf` file exists in the `frontend/` directory, indicating a strategy for serving the built React static files via an Nginx reverse proxy, routing API requests appropriately, and handling client-side routing fallback.
- **Vercel**: A `vercel.json` file exists in the `frontend/` directory. This indicates that the frontend is either currently, or intended to be, deployed to Vercel's Edge Network for global CDN distribution.

---

## Recommended Production Strategy

While `docker-compose` is excellent for development, it is generally insufficient for a highly available production environment, especially one running machine learning models.

### Recommended Infrastructure
1. **Frontend**: Continue using Vercel (or AWS CloudFront/S3) for serving the static React application.
2. **Backend API**: Deploy to a managed container service like Google Cloud Run, AWS ECS, or Kubernetes. This allows the core API to scale horizontally based on incoming HTTP traffic independent of the ML workloads.
3. **ML Service**: The ML Service is CPU/Memory intensive (and potentially GPU intensive). It should be deployed to an infrastructure capable of handling large models. The `ml-service/app.py` script currently references `modal.App`, indicating an intent to deploy this specifically to [Modal](https://modal.com/) (a serverless GPU/CPU provider for Python). This is an excellent architecture choice.
4. **Database**: Use a managed database service like MongoDB Atlas, rather than self-hosting the database within Docker.

### Recommended CI/CD
No CI/CD configuration files (GitHub Actions, GitLab CI) were found in the repository. It is highly recommended to implement a pipeline that:
1. Runs tests on code push.
2. Builds Docker images.
3. Pushes images to a container registry (e.g., Docker Hub, GCR, ECR).
4. Deploys to the target infrastructure.
