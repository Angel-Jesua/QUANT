# API Documentation

## Base URL
- Development: `http://localhost:3001`
- Production: `https://api.example.com`

## Endpoints

### Users
- **GET /users**
  - Description: Retrieve all users
  - Response: Array of users
  - Example:
    ```
    [
      {
        "id": 1,
        "email": "john.doe@example.com",
        "name": "John Doe",
        "createdAt": "2025-10-18T22:00:00.000Z",
        "updatedAt": "2025-10-18T22:00:00.000Z"
      }
    ]
    ```

- **POST /users**
  - Description: Create a new user
  - Body: `{ "email": "string", "name": "string" }`
  - Response: Created user object

### Authentication
- **POST /auth/login**
  - Description: User login (placeholder)
  - Body: `{ "email": "string", "password": "string" }`

- **POST /auth/register**
  - Description: User registration (placeholder)
  - Body: `{ "email": "string", "password": "string", "name": "string" }`

## Error Handling
- Standard HTTP status codes
- Error response format:
  ```
  {
    "error": "Description of error"
  }
  ```

## Notes
- All endpoints require authentication except login/register (to be implemented).
- Use Prisma ORM for database operations.
- CORS enabled for `http://localhost:4200`.