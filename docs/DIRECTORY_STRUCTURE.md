# Directory Structure

The project is structured as a monorepo containing three main applications: the Frontend, the Backend, and the ML Service.

```text
smart-gov-feedback-system/
├── backend/                  # Core FastAPI application
├── frontend/                 # React single-page application
├── ml-service/               # FastAPI machine learning inference service
├── docs/                     # Technical documentation (You are here)
├── docker-compose.yml        # Orchestration for backend and ml-service
└── README.md                 # Project root documentation
```

---

## 1. Backend (`backend/`)

The backend is organized using a layered architectural pattern separating routes, models, schemas, and services.

```text
backend/
├── models/                   # Database entity representations (Pydantic models bridging to MongoDB)
│   ├── audit_model.py
│   ├── auth_model.py
│   ├── post_model.py
│   └── user_model.py
├── routes/                   # FastAPI route definitions and HTTP controllers
│   ├── admin_analytics_routes.py
│   ├── auth_routes.py
│   └── post_routes.py
├── schemas/                  # Pydantic models for request/response validation
├── services/                 # Business logic and database operations
│   ├── admin_analytics_service.py
│   ├── analytics_service.py
│   ├── audit_service.py
│   ├── auth_service.py
│   ├── db_init.py            # Database initialization and indexing
│   ├── dependencies.py       # FastAPI dependency injection (e.g., get_current_user)
│   ├── email_service.py      # Integration with Brevo API for OTPs
│   ├── logger_service.py
│   └── post_service.py       # Core logic for policies and comments
├── tests/                    # Pytest unit and integration tests
├── app.py                    # Main FastAPI application entry point and middleware configuration
├── config.py                 # Environment variable management using Pydantic Settings
├── database.py               # MongoDB connection lifecycle management
├── rate_limiter.py           # SlowAPI rate limiting configuration
├── requirements.txt          # Python dependencies
└── Dockerfile                # Container definition
```

---

## 2. ML Service (`ml-service/`)

The ML service is a lightweight microservice designed strictly for text analysis.

```text
ml-service/
├── app.py                    # Complete FastAPI application with model loading and batch processing queue
├── tests/                    # Inference tests
├── requirements.txt          # Dependencies (torch, transformers, fastapi)
└── Dockerfile                # Container definition
```

---

## 3. Frontend (`frontend/`)

The frontend is a React application bootstrapped typically with Create React App or similar webpack setups.

```text
frontend/
├── public/                   # Static assets (HTML, favicon)
├── src/                      # React source code
│   ├── api/                  # Axios/Fetch client and API request wrappers
│   │   ├── adminAnalytics.js
│   │   ├── auth.js
│   │   ├── client.js
│   │   └── policies.js
│   ├── components/           # Reusable React UI components
│   ├── context/              # React Context providers (AuthContext)
│   ├── features/             # Feature-specific components
│   ├── hooks/                # Custom React hooks (often wrapping React Query)
│   ├── pages/                # Top-level route components (FeedPage, AdminPage, etc.)
│   ├── App.js                # React Router configuration and root component
│   ├── index.js              # React DOM mounting point
│   └── index.css             # Global styles and Tailwind directives
├── nginx.conf                # Web server configuration for production builds
├── package.json              # NPM dependencies and scripts
├── tailwind.config.js        # Tailwind CSS configuration
└── vercel.json               # Deployment configuration for Vercel
```
