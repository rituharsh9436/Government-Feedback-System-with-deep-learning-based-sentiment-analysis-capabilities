# Deployment Guide (Serverless Cloud Architecture)

This guide walks you through deploying the Smart Government Feedback System using **Option 1**: Managed Serverless Containers. This approach is highly scalable, requires zero server maintenance, and is very cost-effective.

## Architecture Map
- **Frontend**: Hosted on Vercel.
- **Backend (Core API)**: Hosted on Google Cloud Run.
- **ML Service (Sentiment Analysis)**: Hosted on Google Cloud Run.
- **Database**: MongoDB Atlas.

---

## 1. Deploying the Backend (Google Cloud Run)

Google Cloud Run allows you to deploy Docker containers that scale to zero when unused.

1. Install the [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
2. Authenticate and set your project:
   ```bash
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```
3. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```
4. Deploy to Cloud Run (this will automatically build the Docker image using Cloud Build):
   ```bash
   gcloud run deploy smart-gov-backend \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated
   ```
5. Set Environment Variables:
   During deployment (or via the Cloud Run UI), you must set the environment variables found in your `.env` file (e.g., `MONGO_URL`, `SECRET_KEY`, `CORS_ORIGINS`). 
   *Note: Set `ML_SERVICE_URL` after you deploy the ML service in step 2.*

---

## 2. Deploying the ML Service (Google Cloud Run)

The Machine Learning service is computationally heavier. We deploy it separately so it scales independently of the main API.

1. Navigate to the `ml-service/` directory:
   ```bash
   cd ml-service
   ```
2. Deploy to Cloud Run (allocate more memory here):
   ```bash
   gcloud run deploy smart-gov-ml-service \
     --source . \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --memory 2Gi \
     --cpu 1
   ```
3. Copy the URL provided by Cloud Run for this service.
4. Go back to your `smart-gov-backend` Cloud Run service settings, and update the `ML_SERVICE_URL` environment variable to match this new URL.

---

## 3. Deploying the Frontend (Vercel)

Vercel is the easiest and fastest way to host a React application.

1. Install the Vercel CLI (or just use their Web Dashboard by connecting your GitHub repo):
   ```bash
   npm i -g vercel
   ```
2. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```
3. Run the Vercel deploy command (or connect via the Vercel Web Dashboard):
   ```bash
   vercel
   ```
   **Important:** If using the Vercel Web Dashboard by connecting your GitHub repo, make sure to set the **Root Directory** to `frontend` in the project settings!
   
4. Follow the prompts. When asked for Environment Variables, add:
   - `REACT_APP_API_URL`: The URL of your `smart-gov-backend` deployed in Step 1.
5. Vercel will automatically read the `vercel.json` file to configure React Router correctly, build your app, and provide a live URL!

## 4. Final Security Check
Make sure to go back to your Google Cloud Run `smart-gov-backend` settings and update the `CORS_ORIGINS` environment variable to include your new Vercel frontend URL (e.g., `["https://your-vercel-app.vercel.app"]`).
