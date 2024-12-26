# RESTful API Documentation

## Authentication Endpoints

### User Authentication
- POST `/api/auth/login`
  - Description: Authenticate user and create session
  - Request Body:
    ```json
    {
      "email": "string",
      "password": "string"
    }
    ```
  - Response: 
    ```json
    {
      "message": "string",
      "user": {
        "userId": "string",
        "userName": "string",
        "email": "string",
        "role": "string",
        "phoneNumber": "string"
      }
    }
    ```

- POST `/api/auth/register`
  - Description: Register new user
  - Request Body:
    ```json
    {
      "userName": "string",
      "email": "string",
      "password": "string",
      "phoneNumber": "string"
    }
    ```
  - Response:
    ```json
    {
      "message": "string"
    }
    ```

- POST `/api/auth/verify-email`
  - Description: Verify user email
  - Request Body:
    ```json
    {
      "token": "string"
    }
    ```
  - Response:
    ```json
    {
      "message": "string",
      "token": "string",
      "user": UserObject
    }
    ```

## Event Endpoints

### Events
- GET `/api/events`
  - Get all events
  - Response: `Event[]`

- GET `/api/events/:id`
  - Get specific event
  - Response: `Event`

- POST `/api/events`
  - Description: Create new event
  - Request: `FormData` with fields:
    - name: string
    - date: string
    - zones: JSON string
    - photo: File
    - description: string
    - location: string
    - registerDate: string
    - endregisterDate: string
    - drawDate: string
  - Response:
    ```json
    {
      "message": "Event created successfully",
      "event": EventObject
    }
    ```

- PUT `/api/events/:id`
  - Update event
  - Request: `EventUpdateDTO`
  - Response: `Event`

- DELETE `/api/events/:id`
  - Delete event
  - Response: `{ "message": "string" }`

## Ticket Endpoints

### Tickets
- GET `/api/tickets`
  - Get all tickets
  - Response: `Ticket[]`

- GET `/api/tickets/:id`
  - Get specific ticket
  - Response: `Ticket`

- POST `/api/tickets`
  - Purchase ticket
  - Request: `TicketPurchaseDTO`
  - Response: `Ticket`

- PUT `/api/tickets/:id`
  - Update ticket status
  - Request: `TicketUpdateDTO`
  - Response: `Ticket`

## Data Types

### EventCreateDTO
```typescript
{
  title: string;
  description: string;
  date: Date;
  location: string;
  price: number;
  capacity: number;
  category: string;
}
```

### TicketPurchaseDTO
```typescript
{
  eventId: string;
  quantity: number;
  userId: string;
}
```

## Status Codes
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 500: Internal Server Error
