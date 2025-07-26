# pillarpayout

## Backend Service/Model Layer Structure

- `controllers/`: Handles HTTP request/response, delegates to services.
- `services/`: Contains business logic, calls models for DB access.
- `models/`: Handles direct database queries.

This structure improves maintainability, testability, and separation of concerns.
