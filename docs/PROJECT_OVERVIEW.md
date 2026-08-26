# Project Overview

## What the Project Does
The **Smart Government Feedback System** is a full-stack web application designed to facilitate communication between the government and the public. It allows government officials to publish policies and citizens to provide structured feedback or comments. The system employs Machine Learning (ML) to automatically perform sentiment analysis on the public's feedback, providing actionable insights to administrators and government officials.

## Primary Purpose
To bridge the gap between policy makers and citizens by providing a transparent, scalable, and intelligent platform for feedback collection and analysis. It automates the tedious process of reading and categorizing thousands of comments by using Natural Language Processing (NLP) to determine if public sentiment on a specific policy is Positive, Negative, or Neutral.

## Main Capabilities
- **Role-Based Access Control (RBAC):** Supports three primary roles: `public` (citizens), `govt` (government officials), and `admin` (system administrators).
- **OTP-Based Verification:** Secure email-based OTP verification for account signups.
- **Policy Management:** Government officials can publish and manage policies specific to their departments.
- **Feedback Collection:** Public users can comment on active policies (limited to 3 comments per policy to prevent spam).
- **Automated Sentiment Analysis:** An asynchronous ML pipeline evaluates the sentiment of each comment in the background.
- **Analytics Dashboards:** Administrators and Government users have access to rich analytics, including overall sentiment distribution, trend analysis over time, and department-specific insights.
- **Audit Logging:** Administrative and critical user actions (login, signup, account deletion, role approval) are tracked.

## Major Components
1. **Frontend (React UI):** A responsive, single-page application built with React and Tailwind CSS that serves as the interface for all users.
2. **Backend API (FastAPI):** The core application logic, handling authentication, routing, database interactions, and business rules.
3. **ML Service (FastAPI + Transformers):** A dedicated, isolated service responsible for loading a Hugging Face NLP model and performing batched sentiment analysis on incoming text.
4. **Database (MongoDB):** A NoSQL database storing users, policies, comments, pending OTPs, blocklisted tokens, and audit logs.

## High-Level System Overview
The user interacts with the Frontend, which makes HTTP requests to the Backend API. The Backend API handles data persistence with MongoDB. When a public user submits a comment, the Backend API saves it as "pending" and asynchronously pushes the text to the ML Service. The ML Service processes the text using a pre-trained sentiment analysis model, determines the sentiment (Positive, Negative, or Neutral), and the Backend API updates the database. Administrators and Government officials can then view aggregated visualizations of these sentiments via the Frontend dashboards.
