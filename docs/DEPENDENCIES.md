# Dependencies

This document outlines the major dependencies used across the repository, segregated by application boundaries.

## 1. Backend (`backend/requirements.txt`)

### Runtime
- `fastapi==0.109.2`: The core web framework.
- `uvicorn==0.27.1`: The ASGI server to run FastAPI.
- `pydantic[email]==2.6.1`: Data validation and schema definition.
- `pydantic-settings==2.2.1`: Environment variable parsing.
- `python-jose[cryptography]==3.3.0`: JWT encoding and decoding for authentication.
- `passlib[bcrypt]==1.7.4`, `bcrypt==4.0.1`: Password hashing algorithms.
- `python-multipart==0.0.9`: Required by FastAPI to parse form data (used in OAuth2 login).
- `slowapi==0.1.9`: Rate limiting middleware.
- `httpx==0.27.0`: Asynchronous HTTP client for calling external APIs and the ML Service.
- `motor==3.3.2`, `pymongo==4.6.3`: Official asynchronous and synchronous MongoDB drivers.

### Testing / Development
- `pytest==8.0.2`: Primary testing framework.
- `pytest-asyncio==0.23.5`: Plugin for testing asynchronous coroutines.
- `mongomock-motor==0.0.33`: In-memory mock for MongoDB.

---

## 2. ML Service (`ml-service/requirements.txt`)

### Runtime
- `fastapi`, `uvicorn`: Web framework and server.
- `pydantic`: Validation for the API input (e.g., list of texts).
- `transformers`: Hugging Face library used for loading the sentiment analysis NLP model pipeline.
- `torch`: PyTorch, the underlying deep learning backend utilized by Transformers for inference.
- `modal`: Cloud platform SDK utilized to deploy this specific service to serverless infrastructure with potential GPU access.

---

## 3. Frontend (`frontend/package.json`)

### Runtime
- `react`, `react-dom` (^19.2.0): Core view library.
- `react-router-dom` (^7.18.1): Client-side routing.
- `@tanstack/react-query` (^5.101.4): State management, data fetching, and caching layer for API requests.
- `recharts` (^3.10.1): Component-based charting library used for rendering admin analytics dashboards.
- `clsx`, `tailwind-merge`: Utility functions used for conditionally joining Tailwind CSS classes efficiently.
- `lucide-react`: Modern SVG icon collection.
- `react-hot-toast`: Lightweight notification toast library.

### Development & Testing
- `react-scripts`: Build tooling, development server, and Webpack configuration abstraction.
- `tailwindcss`, `postcss`, `autoprefixer`: CSS processing toolchain.
- `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`: Component testing utilities that test the application exactly as a user interacts with it.
