# Smart Government Feedback System - Technical Documentation

Welcome to the technical documentation for the Smart Government Feedback System. 

This repository contains a modern, decoupled web application that facilitates policy publishing by government officials and structured feedback collection from the public. It uniquely integrates a Machine Learning service to automatically analyze the sentiment of public feedback, providing real-time aggregated insights via an administrative dashboard.

## Documentation Index

Please navigate through the following documents for a comprehensive understanding of the repository's architecture, workflows, and implementation details:

1. **[Project Overview](./PROJECT_OVERVIEW.md)**: High-level summary of the system's purpose and capabilities.
2. **[Technology Stack](./TECH_STACK.md)**: Detailed breakdown of the languages, frameworks, and infrastructure tools utilized.
3. **[Architecture](./ARCHITECTURE.md)**: System design, boundaries, and data flow diagrams.
4. **[Directory Structure](./DIRECTORY_STRUCTURE.md)**: A map of the repository and the purpose of key directories and files.
5. **[Functional Workflows](./FUNCTIONAL_WORKFLOWS.md)**: Flowcharts and explanations of core user journeys (Auth, Posting, Feedback, Analytics).
6. **[API Documentation](./API_DOCUMENTATION.md)**: Key REST endpoints for the Backend and ML Service.
7. **[Database Architecture](./DATABASE.md)**: MongoDB collections, fields, and Entity Relationship Diagram.
8. **[Development Methodology](./DEVELOPMENT_METHODOLOGY.md)**: Engineering practices, separation of concerns, and coding conventions.
9. **[Testing Strategy](./TESTING_STRATEGY.md)**: Current testing implementations and recommended gaps to fill.
10. **[Deployment](./DEPLOYMENT.md)**: Current Docker orchestration and recommendations for production readiness.
11. **[Security](./SECURITY.md)**: Implemented authentication (JWT, CSRF, RBAC) and audit mechanisms.
12. **[Dependencies](./DEPENDENCIES.md)**: Breakdown of runtime and development dependencies by service.

## Navigation Notes
These documents reflect the *actual current state* of the repository. Where improvements are suggested, they are strictly isolated under "Recommended Improvements" sections to avoid confusion with existing implementations.
