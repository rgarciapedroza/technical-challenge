# Internal Requests

A full-stack technical challenge application for tracking a team's internal requests. Create requests, view their details, update their information and status, and identify high-priority work that needs attention.

## Features

- Request list, detail view, creation and editing.
- Required-field and length validation, with English error messages.
- Loading, empty, error and retry states; failed saves preserve form input.
- Title search, category/priority/status filters, and title/date sorting.
- Global summary indicators and optional demo initialization.

Search, filters, sorting, summary indicators, demo data and the REJECTED status are product enhancements beyond the original employer brief.

## Stack and prerequisites

| Tool | Project configuration / verified environment |
| --- | --- |
| Java | Targets Java 17; tests and builds executed with Temurin JDK 21.0.12 |
| Spring Boot | 4.1.1 |
| Maven | 3.9.16 through the included Maven Wrapper |
| PostgreSQL | Docker image `postgres:16-alpine`; verified against PostgreSQL 16.15 |
| Angular / Angular CLI | 22.1.7 / 22.1.8 |
| TypeScript / RxJS | 6.0.3 / 7.8.2 |
| Node.js / npm | 24.15.0 / 11.12.1 |
| Docker / Compose | Verified with 29.4.3 / 5.1.3 |

Install a JDK, Node.js/npm, Git and Docker with Compose. Start the Docker engine before starting the database. No global Angular CLI, Maven or local PostgreSQL installation is required. The first dependency installation requires internet access.

Java 17 is the compilation target; execution on a JDK 17 runtime has not yet been verified. Set `JAVA_HOME` to the intended JDK.

Commands below use Bash / Git Bash, including on Windows.

## Run locally

Clone the repository and enter its directory:

```bash
git clone https://github.com/rgarciapedroza/technical-challenge.git
cd technical-challenge
```

### 1. Start PostgreSQL

From the repository root:

```bash
docker compose up -d --wait postgres
docker compose ps
```

Defaults: database `internal_requests`, username `app`, password `app`, host port `5433`. The container uses port `5432` internally. These credentials are for local development.

A named volume stores the database independently of the container. To stop it while retaining data:

```bash
docker compose stop postgres
```

Do not use `docker compose down -v` unless you intentionally want to delete the database volume.

### 2. Start the backend

In a separate terminal, from the repository root:

```bash
cd backend
./mvnw spring-boot:run
```

The backend listens on `http://localhost:8080`. Check the API with:

```bash
curl http://localhost:8080/api/requests
```

The backend root URL has no page; use the API path above.

### 3. Start Angular

In another terminal, from the repository root:

```bash
cd frontend
npm ci
npm start
```

Open **http://localhost:4200**.

Angular uses its project-local CLI. Its development proxy forwards `/api/**` to `http://localhost:8080`, so application code uses relative API URLs. Restart `npm start` after changing `frontend/proxy.conf.json`.

Stop the backend and frontend with Ctrl+C in their respective terminals.

### Configuration

| Environment variable | Default |
| --- | --- |
| `DB_URL` | `jdbc:postgresql://localhost:5433/internal_requests` |
| `DB_USERNAME` | `app` |
| `DB_PASSWORD` | `app` |
| `SEED_DEMO_DATA` | `true` |

For example, from `backend/`:

```bash
DB_URL=jdbc:postgresql://localhost:5433/internal_requests \
DB_USERNAME=app DB_PASSWORD=app SEED_DEMO_DATA=false \
./mvnw spring-boot:run
```

These variables configure the backend. Changing database credentials or ports in Compose also requires matching backend configuration.

## Architecture

```text
backend/src/main/java/com/edatachallenge/backend/
  controller/   HTTP endpoints
  service/      Request operations and transaction boundaries
  repository/   Spring Data JPA access
  model/        Entity, enums and derived attention rule
  dto/          Validated inputs and response representation
  exception/    Structured API errors
  config/       Demo initialization

frontend/src/app/
  app.routes.ts       Application routes
  requests/models/    Typed API contracts and English labels
  requests/services/  RequestService HTTP communication
  requests/pages/     List, details and shared create/edit form
```

Controllers delegate to a concrete service with constructor injection. The service uses a JPA repository and returns DTOs rather than exposing the entity. Transactions keep each write operation together.

Angular uses standalone components, Reactive Forms, Router and HttpClient. Read flows react to route changes and cancel obsolete subscriptions. Save callbacks are guarded against stale navigation. Cancelling an HTTP subscription does not undo a write that already reached the server.

Routes:

- `/` redirects to `/requests`.
- `/requests`: list and filters.
- `/requests/new`: creation.
- `/requests/:id`: details.
- `/requests/:id/edit`: editing.
- Unknown routes redirect to `/requests`.

## Domain and validation

An `InternalRequest` contains `id`, `title`, `description`, `category`, `priority`, `status`, `createdAt` and `updatedAt`.

Categories: `IT_SUPPORT`, `HARDWARE`, `SOFTWARE`, `ACCESS`, `PURCHASE`, `FACILITIES`, `HR`, `FINANCE`, `OTHER`.

Priorities: `LOW`, `MEDIUM`, `HIGH`.

Statuses:

- `OPEN` and `IN_PROGRESS`: active.
- `DONE` and `REJECTED`: closed.

Creation always starts in `OPEN`. Updates may select any valid status, including reopening a closed request.

`needsAttention` is true only for HIGH-priority requests in OPEN or IN_PROGRESS. It is calculated from the current fields and never persisted. REJECTED requests do not need attention.

Title and description are required, must not be blank or whitespace-only, and have maximum lengths of 120 and 2000 characters respectively. Category and priority are required; status is also required on update. Validation messages are explicitly defined in English.

## API

| Method | Endpoint | Success |
| --- | --- | --- |
| GET | `/api/requests` | 200 with an array, including `[]` |
| GET | `/api/requests/{id}` | 200 with one request |
| POST | `/api/requests` | 201 with a request and a Location header |
| PUT | `/api/requests/{id}` | 200 with the updated request |

There is no DELETE endpoint.

Example creation body:

```json
{
  "title": "Repository access",
  "description": "Grant access to the team repository.",
  "category": "ACCESS",
  "priority": "MEDIUM"
}
```

POST does not accept `status`. Unknown JSON properties are rejected. PUT requires all four fields above plus `status`; partial updates are not supported.

Responses include all entity fields and the derived `needsAttention` boolean. IDs are positive Java Long values; the frontend rejects IDs outside JavaScript's safe integer range.

Malformed JSON, invalid enum names, invalid IDs and validation failures return 400. Missing requests return 404. Unexpected failures return a generic 500 message without internal details or stack traces.

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

### Dates

The API returns ISO 8601 instants such as `2026-09-21T10:00:00Z`. The UI displays **`dd-MM-yyyy HH:mm:ss`**, for example `21-11-2003 14:30:00`, using the **browser's local time zone** and Angular DatePipe. The display pattern is explicit and does not depend on browser locale; the displayed hour depends on the local time zone.

JPA assigns timestamps during persistence. `createdAt` remains unchanged after creation; `updatedAt` is refreshed when JPA performs an update. An unchanged save need not change it. Values are truncated to microseconds to match PostgreSQL precision.

## Demo data

On startup, when demo initialization is enabled and the table is empty, the backend inserts:

| Title | Category | Priority | Status |
| --- | --- | --- | --- |
| Repository access | ACCESS | MEDIUM | OPEN |
| Purchase monitors | PURCHASE | LOW | OPEN |
| Install design software | SOFTWARE | MEDIUM | IN_PROGRESS |
| Repair reception laptop | HARDWARE | HIGH | IN_PROGRESS |
| Review meeting room connection | IT_SUPPORT | HIGH | OPEN |
| Replace faulty keyboard | HARDWARE | LOW | DONE |
| Purchase duplicate software licence | PURCHASE | HIGH | REJECTED |

Expected initial indicators: **Total requests 7, Completed 1, Needs attention 2, In progress 2**.

If any request already exists, initialization does nothing. It does not overwrite or delete existing data. Restarting does not duplicate the demo records. `SEED_DEMO_DATA=false` disables insertion and does not remove previously inserted data. Demo dates use normal persistence callbacks.

## Search, filters and indicators

- Title search trims input, uses partial matching and ignores case and combining diacritics through Unicode NFD normalization.
- Category, priority and status filters combine with AND semantics and include an All option.
- Default ordering is Title A–Z; Title Z–A uses the same English locale-aware, case/accent-insensitive comparison. Equal titles use ascending ID as a tie-breaker.
- Newest/oldest sorting uses creation timestamps, with descending/ascending ID respectively for equal timestamps.
- Clear filters resets search, all filters and ordering to Title A–Z.
- Filtering and sorting do not mutate the loaded source array.
- The empty database and no-matching-results states have separate messages.

Indicators use the complete dataset regardless of filters. Completed counts DONE only; In progress counts IN_PROGRESS; Needs attention uses the API flag. REJECTED contributes only to Total requests. Indicators can overlap and must not be summed. Summary calculation uses one O(n) pass and O(1) additional counter storage. Indicators are hidden on loading errors and show zero for a successful empty response.

## Tests and builds

### Backend

From `backend/`, with PostgreSQL running:

```bash
SEED_DEMO_DATA=false ./mvnw test
SEED_DEMO_DATA=false ./mvnw verify
```

The context-loading test uses the configured PostgreSQL database. Disabling seeding prevents demo insertion, but `ddl-auto=update` can still adjust its schema. Use a dedicated test database via `DB_URL` when preserving an existing database is important.

For the tests that do not require PostgreSQL:

```bash
./mvnw test -Dtest=InternalRequestTests,RequestValidationTests,InternalRequestServiceTests,InternalRequestControllerTests,DemoDataInitializerTests
```

The packaged application is `backend/target/backend-0.0.1-SNAPSHOT.jar`. Run it from `backend/` with:

```bash
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

The SNAPSHOT suffix is the application's development version, not a pre-release Spring Boot dependency.

### Frontend

From `frontend/`:

```bash
npm ci
npm test -- --watch=false
npm run build
```

Tests use Vitest and cover HTTP contracts, routes, validation, loading/error/empty states, stale responses, search, sorting, filters and counters. Static build output is in `frontend/dist/frontend/browser/`.

### Verification record

Checks completed during implementation:

- Backend: 68 tests passed and Maven verification/package succeeded against disposable PostgreSQL.
- Real HTTP persistence: create, read, update and backend restart preserved the request and timestamps.
- Demo initialization: enabled/disabled startup and restart without duplicates verified.
- Frontend: 71 tests passed and production build succeeded after the UX consistency changes.
- Development proxy: GET through port 4200 returned HTTP 200 and the same JSON as the backend.

These are recorded results from implementation, not a claim that a final full-stack acceptance run was completed. Full browser acceptance, visual/mobile checks and a Java 17 runtime run remain pending. No tests were rerun solely to write this README.

## Assumptions, trade-offs and limitations

- The application assumes a trusted internal environment. Authentication and authorization were intentionally left out because the exercise does not define users, roles, ownership or access-control requirements.
- Search, filtering and sorting run client-side because the expected dataset is small. A large dataset would require backend search, filtering, sorting and pagination.
- `spring.jpa.hibernate.ddl-auto=update` is a development/challenge choice. Production should use versioned database migrations.
- The demo initializer assumes a single application instance starting against the database; concurrent initializers are not coordinated.
- Concurrent edits have no optimistic-lock version check; a later update can overwrite an earlier one.
- Docker Compose runs PostgreSQL only. Backend and frontend containerization, CI/CD and migration tooling are not included.
- The development proxy is not a production deployment configuration. A deployed frontend needs an API reverse proxy and SPA route fallback, or an explicitly configured cross-origin API.
- There are no user accounts, ownership rules, deletion, messaging or audit history.

Potential future improvements include server-side pagination, optimistic locking, migrations, browser end-to-end automation and production deployment configuration. Access control should be designed if user/role requirements are introduced.

## AI-assisted development

AI assistance was used to generate and revise backend/frontend code, tests and setup instructions. The developer reviewed changes incrementally, discussed implementation choices and controlled commits and branch integration; this does not imply every generated line has been independently audited.

Validation used automated tests, builds and real PostgreSQL/HTTP checks. Issues found and corrected included inconsistent PUT validation errors and a timestamp precision mismatch between Java and PostgreSQL. The verification limitations above remain explicit.
