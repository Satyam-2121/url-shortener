# URL Shortener API

A production-ready URL Shortener built with TypeScript, Express.js, PostgreSQL, Redis, and Docker.

The application allows users to generate short URLs, redirect visitors efficiently using Redis caching, and track click analytics. It demonstrates backend engineering concepts including API design, database modeling, caching strategies, containerization, and scalable application architecture.

---

## Live Architecture

```text
                ┌─────────────┐
                │   Client    │
                └──────┬──────┘
                       │
                       ▼
              ┌────────────────┐
              │   Express API  │
              └───────┬────────┘
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
  ┌──────────────┐         ┌──────────────┐
  │    Redis     │         │ PostgreSQL   │
  │    Cache     │         │   Database   │
  └──────────────┘         └──────────────┘
```

---

## Features

### URL Management

* Generate unique short URLs
* Store original URLs in PostgreSQL
* Fast URL lookup and redirection

### Performance

* Redis cache for frequently accessed URLs
* Reduced database load
* Faster response times

### Analytics

* Click tracking
* Visit count monitoring
* URL metadata retrieval

### Infrastructure

* Dockerized application
* Docker Compose support
* Environment-based configuration

---

## Tech Stack

| Category         | Technologies   |
| ---------------- | -------------- |
| Language         | TypeScript     |
| Runtime          | Node.js        |
| Framework        | Express.js     |
| Database         | PostgreSQL     |
| Cache            | Redis          |
| Containerization | Docker         |
| Development      | ts-node-dev    |
| Utilities        | NanoID, dotenv |

---

## Project Structure

```text
url-shortener
│
├── src
│   ├── controllers
│   │   └── url.controller.ts
│   │
│   ├── routes
│   │   └── url.routes.ts
│   │
│   ├── services
│   │   └── url.service.ts
│   │
│   ├── db
│   │   ├── postgres.ts
│   │   └── redis.ts
│   │
│   └── server.ts
│
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── .env
└── README.md
```

---

## Database Schema

```sql
CREATE TABLE urls (
    id SERIAL PRIMARY KEY,
    original_url TEXT NOT NULL,
    short_code VARCHAR(10) UNIQUE NOT NULL,
    visit_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Request Lifecycle

### URL Creation

```text
POST /shorten
      │
      ▼
Generate NanoID
      │
      ▼
Store URL in PostgreSQL
      │
      ▼
Return Short URL
```

### URL Redirection

```text
GET /:shortCode
      │
      ▼
Increment Analytics
      │
      ▼
Check Redis Cache
      │
 ┌────┴────┐
 │         │
 ▼         ▼
Hit       Miss
 │         │
 ▼         ▼
Redirect PostgreSQL
            │
            ▼
      Save in Redis
            │
            ▼
        Redirect
```

---

## API Endpoints

### Create Short URL

```http
POST /shorten
```

Request:

```json
{
  "url": "https://google.com"
}
```

Response:

```json
{
  "originalUrl": "https://google.com",
  "shortCode": "Ab12Cd",
  "shortUrl": "http://localhost:3000/Ab12Cd"
}
```

---

### Redirect URL

```http
GET /:shortCode
```

Example:

```http
GET /Ab12Cd
```

Response:

```text
302 Redirect
```

---

### Analytics

```http
GET /analytics/:shortCode
```

Response:

```json
{
  "original_url": "https://google.com",
  "short_code": "Ab12Cd",
  "visit_count": 15,
  "created_at": "2026-06-09T12:00:00.000Z"
}
```

---

## Environment Variables

```env
PORT=3000

DB_USER=satyamsingh
DB_HOST=postgres
DB_NAME=url_shortener
DB_PORT=5432
```

---

## Local Development

Install dependencies:

```bash
npm install
```

Start PostgreSQL:

```bash
brew services start postgresql@17
```

Start Redis:

```bash
brew services start redis
```

Run development server:

```bash
npm run dev
```

---

## Docker Deployment

Build and start all services:

```bash
docker compose up --build
```

Stop services:

```bash
docker compose down
```

---

## Engineering Concepts Demonstrated

* REST API Development
* Backend Architecture
* PostgreSQL Integration
* Redis Cache-Aside Pattern
* Docker Containerization
* Analytics Tracking
* Environment Configuration
* Database Design
* Scalable Service Design

---

## Future Enhancements

* Custom aliases
* URL expiration
* User authentication
* JWT authorization
* Rate limiting
* Swagger documentation
* CI/CD pipeline
* Kubernetes deployment
* Monitoring and observability
* Distributed caching strategies

---

## Author

### Satyam Singh

Backend Developer focused on TypeScript, Distributed Systems, PostgreSQL, Redis, Docker, and Scalable Backend Engineering.

GitHub: https://github.com/Satyam-2121
