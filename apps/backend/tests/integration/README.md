# Integration Tests

This directory contains integration tests that use Testcontainers to spin up real PostgreSQL databases for testing.

## Prerequisites

- Docker or Docker-compatible runtime (Colima, OrbStack, etc.)
- Docker daemon must be running

## Running Integration Tests

### Using pnpm (recommended)

```bash
pnpm test:integration
```

### With Colima

If you're using Colima, you may need to set the DOCKER_HOST environment variable:

```bash
DOCKER_HOST=unix://$HOME/.colima/default/docker.sock pnpm test:integration
```

### With OrbStack

```bash
DOCKER_HOST=unix://$HOME/.orbstack/run/docker.sock pnpm test:integration
```

### Environment Variables

The tests will automatically set up the required environment variables:
- `DATABASE_URL` - Set automatically from the Testcontainer
- `JWT_SECRET` - Test value
- `SESSION_SECRET` - Test value
- `JWT_EXPIRY` - Test value
- `FRONTEND_URL` - Test value

## Test Structure

Integration tests:
1. Start a PostgreSQL container using Testcontainers
2. Create a connection pool to the containerized database
3. Create the Hono app with the test database
4. Run tests against the real database
5. Clean up containers and connections

## Troubleshooting

### "Could not find a working container runtime strategy"

This means Docker is not accessible. Make sure:
1. Docker daemon is running: `docker ps`
2. Set the correct DOCKER_HOST for your runtime (Colima/OrbStack)

### Timeout issues

Container startup can take time. Tests have a 120-second timeout for container initialization.

### Ryuk disabled

The tests use `TESTCONTAINERS_RYUK_DISABLED=true` to disable the Ryuk container cleanup helper, which can be useful in some environments.
