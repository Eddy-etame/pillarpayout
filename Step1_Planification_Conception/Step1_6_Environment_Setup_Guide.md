# PillarPayout Environment Setup Guide

## Local Development Setup

### Prerequisites
- Node.js 18.x
- npm or yarn
- Docker and Docker Compose
- VS Code with ESLint and Prettier extensions

### Backend Setup
1. Clone the repository.
2. Run `npm install` in the backend directory.
3. Set up environment variables (e.g., database connection, JWT secret).
4. Run `npm run dev` to start the backend server.

### Frontend Setup
1. Navigate to the frontend directory.
2. Run `npm install`.
3. Run `npm start` to launch the development server.

### Docker Setup
- Use provided `docker-compose.yml` to start PostgreSQL, Redis, and backend services.
- Run `docker-compose up` to start all services.

### Code Quality Tools
- ESLint configured for JavaScript/TypeScript linting.
- Prettier for code formatting.

## CI/CD Pipeline
- GitHub Actions configured for automated testing and deployment.

---
