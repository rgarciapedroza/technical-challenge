# Internal Requests

A full-stack web application for tracking internal team requests.

The application allows users to create requests, view existing requests, inspect individual details, update request information and status, and identify work that is still open or needs attention.

## Quick start

### Prerequisites

Make sure the following tools are installed:

- Java 17 or higher
- Node.js and npm
- Git
- Docker with Docker Compose

No global Maven, Angular CLI, or local PostgreSQL installation is required.

### 1. Clone the repository

```bash
git clone https://github.com/rgarciapedroza/technical-challenge.git
cd technical-challenge
```

### 2. Start PostgreSQL

From the repository root:

```bash
docker compose up -d --wait postgres
```

Check that the database container is running:

```bash
docker compose ps
```

Default database configuration:

| Property | Value |
| --- | --- |
| Database | `internal_requests` |
| Username | `app` |
| Password | `app` |
| Host | `localhost` |
| Port | `5433` |

PostgreSQL uses port `5432` inside the Docker container and is exposed on port `5433` on the host.

The database uses a Docker volume, so requests created through the application remain available after restarting the container.

### 3. Start the backend

Open a new terminal from the repository root:

```bash
cd backend
./mvnw spring-boot:run
```

The Spring Boot backend will be available at:

```text
http://localhost:8080
```

The requests API is available at:

```text
http://localhost:8080/api/requests
```

You can verify the backend directly with:

```bash
curl http://localhost:8080/api/requests
```

A successful response returns a JSON array of requests.

### 4. Start the frontend

Open another terminal from the repository root:

```bash
cd frontend
npm ci
npm start
```

Then open:

```text
http://localhost:4200
```

The Angular development server forwards `/api/**` requests to the Spring Boot backend.

### 5. Expected initial state

When the backend starts with an empty database, seven demo requests are automatically inserted.

The initial summary should contain:

- Total requests: `7`
- Completed: `1`
- Needs attention: `2`
- In progress: `2`

Demo data is inserted only when the request table is empty, so restarting the backend does not create duplicates.

Demo initialization can be disabled with:

```text
SEED_DEMO_DATA=false
```

## Stopping or resetting the application

Stop the frontend and backend using `Ctrl+C` in their respective terminals.

To stop PostgreSQL while keeping the stored data:

```bash
docker compose stop postgres
```

To stop the containers:

```bash
docker compose down
```

To completely reset the database, including its Docker volume:

```bash
docker compose down -v
```

The next backend startup will create the demo data again if demo initialization is enabled.

---

## Features

The application supports:

- Creating internal requests.
- Viewing all existing requests.
- Viewing the details of an individual request.
- Editing request information.
- Updating request status.
- Identifying high-priority requests that need attention.
- Identifying requests that are still in progress.
- Form validation.
- Expected API error handling.
- Loading, empty and error states.
- Retry actions after failed reads.
- Preservation of form values after failed saves.
- Search by request title.
- Filtering by category, priority and status.
- Sorting alphabetically or by creation date.
- Global request summary indicators.
- Persistent PostgreSQL storage.

---

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | Angular, TypeScript, Reactive Forms, Angular Router, HttpClient |
| Backend | Java, Spring Boot, Spring Web, Spring Data JPA, Bean Validation |
| Database | PostgreSQL 16 |
| Database environment | Docker Compose |
| Build | Maven Wrapper and npm |

---

## Project structure

```text
technical-challenge/
├── backend/
│   └── src/
│       ├── main/
│       │   ├── java/com/edatachallenge/backend/
│       │   │   ├── config/
│       │   │   ├── controller/
│       │   │   ├── dto/
│       │   │   ├── exception/
│       │   │   ├── model/
│       │   │   ├── repository/
│       │   │   └── service/
│       │   └── resources/
│       └── test/
├── frontend/
│   └── src/app/
│       ├── requests/
│       │   ├── models/
│       │   ├── pages/
│       │   └── services/
│       ├── app.config.ts
│       └── app.routes.ts
├── docker-compose.yml
└── README.md
```

The backend follows a layered structure:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
PostgreSQL
```

DTOs are used for API input and output rather than exposing JPA entities directly.

The Angular frontend uses standalone components, Reactive Forms, routing and a dedicated service for backend communication.

---

## Frontend routes

| Route | Purpose |
| --- | --- |
| `/` | Redirects to the request list |
| `/requests` | Displays all requests |
| `/requests/new` | Creates a request |
| `/requests/:id` | Displays request details |
| `/requests/:id/edit` | Edits an existing request |

Unknown routes redirect to `/requests`.

---

## Request model

Each request contains:

- `id`
- `title`
- `description`
- `category`
- `priority`
- `status`
- `createdAt`
- `updatedAt`

The API response also contains:

- `needsAttention`

`needsAttention` is derived from the request data and is not persisted as a database field.

---

## Categories

Supported request categories are:

```text
IT_SUPPORT
HARDWARE
SOFTWARE
ACCESS
PURCHASE
FACILITIES
HR
FINANCE
OTHER
```

## Priorities

```text
LOW
MEDIUM
HIGH
```

## Statuses

```text
OPEN
IN_PROGRESS
DONE
REJECTED
```

New requests always start with:

```text
OPEN
```

The create API therefore does not accept a status value.

Existing requests can be updated to any supported status.

---

## Needs-attention rule

A request needs attention when:

```text
priority = HIGH
AND
status = OPEN or IN_PROGRESS
```

For example:

| Priority | Status | Needs attention |
| --- | --- | --- |
| HIGH | OPEN | Yes |
| HIGH | IN_PROGRESS | Yes |
| HIGH | DONE | No |
| HIGH | REJECTED | No |
| MEDIUM | OPEN | No |
| LOW | IN_PROGRESS | No |

This rule is evaluated by the backend so the frontend does not duplicate the business rule.

---

## Validation

Request input is validated by the backend.

### Title

- Required.
- Cannot contain only whitespace.
- Maximum length: 120 characters.

### Description

- Required.
- Cannot contain only whitespace.
- Maximum length: 2000 characters.

### Category

- Required.
- Must contain a supported category.

### Priority

- Required.
- Must contain a supported priority.

### Status

- Required when updating a request.
- Must contain a supported status.

The Angular form also performs client-side validation to provide immediate feedback to the user.

Backend validation remains the authoritative validation layer.

---

## API

Base path:

```text
/api/requests
```

### List requests

```http
GET /api/requests
```

Returns:

```text
200 OK
```

### Get a request

```http
GET /api/requests/{id}
```

Returns:

```text
200 OK
```

or:

```text
404 Not Found
```

### Create a request

```http
POST /api/requests
```

Example request:

```json
{
  "title": "Repository access",
  "description": "Grant repository access to a new team member.",
  "category": "ACCESS",
  "priority": "MEDIUM"
}
```

A newly created request always starts with status:

```text
OPEN
```

Successful creation returns:

```text
201 Created
```

The response also includes a `Location` header pointing to the created resource.

### Update a request

```http
PUT /api/requests/{id}
```

Example:

```json
{
  "title": "Repository access",
  "description": "Grant repository access to a new team member.",
  "category": "ACCESS",
  "priority": "MEDIUM",
  "status": "IN_PROGRESS"
}
```

Returns:

```text
200 OK
```

or:

```text
404 Not Found
```

---

## Error handling

Expected errors are returned through a consistent API error response.

Example validation error:

```json
{
  "status": 400,
  "message": "Validation failed.",
  "path": "/api/requests",
  "fieldErrors": {
    "title": "Title is required."
  }
}
```

The API handles:

- `400 Bad Request` for invalid input.
- `400 Bad Request` for malformed JSON or invalid enum values.
- `404 Not Found` for non-existing requests.
- `500 Internal Server Error` for unexpected failures.

Internal stack traces are not exposed in API responses.

The Angular frontend differentiates between:

- Loading.
- Empty results.
- No matches after filtering.
- Invalid request identifiers.
- Missing requests.
- General server or network errors.

---

## Demo data

When demo initialization is enabled and the request table is empty, the backend creates the following requests:

| Title | Category | Priority | Status |
| --- | --- | --- | --- |
| Repository access | ACCESS | MEDIUM | OPEN |
| Purchase monitors | PURCHASE | LOW | OPEN |
| Install design software | SOFTWARE | MEDIUM | IN_PROGRESS |
| Repair reception laptop | HARDWARE | HIGH | IN_PROGRESS |
| Review meeting room connection | IT_SUPPORT | HIGH | OPEN |
| Replace faulty keyboard | HARDWARE | LOW | DONE |
| Purchase duplicate software licence | PURCHASE | HIGH | REJECTED |

Expected initial indicators:

| Indicator | Value |
| --- | ---: |
| Total requests | 7 |
| Completed | 1 |
| Needs attention | 2 |
| In progress | 2 |

The initializer does nothing when requests already exist.

This prevents application restarts from duplicating demo data.

---

## Search, filters and sorting

The request list provides client-side search, filtering and sorting.

### Search

Search is:

- Partial.
- Case-insensitive.
- Accent-insensitive.

For example, a search for:

```text
conexion
```

can match a title containing:

```text
Conexión
```

### Filters

Requests can be filtered by:

- Category.
- Priority.
- Status.

Filters use AND semantics.

For example:

```text
Category = HARDWARE
Priority = HIGH
Status = IN_PROGRESS
```

returns only requests satisfying all three conditions.

### Sorting

The list supports:

- `A-Z`
- `Z-A`
- Newest first
- Oldest first

Filtering and sorting are performed in the frontend because the expected dataset for this exercise is small.

For a larger dataset, these operations would be moved to the backend together with pagination.

---

## Summary indicators

The list displays four global indicators:

- Total requests.
- Completed requests.
- Requests needing attention.
- Requests in progress.

The indicators are calculated from the complete loaded dataset.

Applying filters changes the table contents but does not change the global summary.

A request may contribute to more than one indicator. For example, a high-priority request with status `IN_PROGRESS` contributes to:

- Total requests.
- Needs attention.
- In progress.

---

## Configuration

The backend supports the following configuration values:

| Variable | Default |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5433/internal_requests` |
| `DB_USERNAME` | `app` |
| `DB_PASSWORD` | `app` |
| `SEED_DEMO_DATA` | `true` |

The defaults match the provided Docker Compose configuration, so no additional configuration is required for normal local execution.

---

## Tests

### Backend

From the `backend` directory:

```bash
./mvnw test
```

A complete Maven verification can also be run with:

```bash
./mvnw verify
```

Backend tests cover areas including:

- Domain behavior.
- Service operations.
- Request validation.
- REST API behavior.
- Expected error responses.
- Demo data initialization.

### Frontend

From the `frontend` directory:

```bash
npm ci
npm test -- --watch=false
```

Build the frontend with:

```bash
npm run build
```

Frontend tests cover areas including:

- Routing.
- HTTP service behavior.
- Request list states.
- Request detail states.
- Create and edit forms.
- Search and filters.
- Sorting.
- Summary indicators.
- Error handling and retry behavior.

---

## Assumptions and technical decisions

### Authentication

The application assumes a trusted internal environment.

Authentication and authorization were intentionally left out of scope because the exercise does not define users, roles, ownership or access-control requirements.

If the application were extended to support multiple users or roles, authentication and authorization would be added at both API and UI level.

### Request creation

New requests always begin as `OPEN`.

The public creation API therefore does not expose a status field.

This keeps the creation process predictable while still allowing status changes through the update operation.

### Needs attention

`needsAttention` is calculated by the backend rather than stored in PostgreSQL.

This avoids storing a value that can be derived directly from priority and status and keeps the business rule centralized.

### Database schema

Hibernate schema updating is used as a pragmatic development choice for this technical exercise.

For a production system, schema changes should be managed through versioned migrations such as Flyway or Liquibase.

### Filtering

Search, filtering and sorting are implemented client-side because the expected amount of data is small.

For larger datasets, the API should support server-side filtering, sorting and pagination.

### Demo data

Demo initialization exists to make the application immediately usable after setup.

It only runs when the request table is empty and can be disabled through configuration.

---

## Possible future improvements

Given additional time, possible improvements would include:

- Server-side pagination, filtering and sorting.
- Authentication and authorization if user roles are introduced.
- Optimistic locking for concurrent edits.
- Versioned database migrations.
- Browser end-to-end tests.
- Production deployment configuration.