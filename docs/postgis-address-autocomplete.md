# PostGIS Address Autocomplete

This document describes how to set up and use the local PostGIS-based address autocomplete system, which replaces the slow Overpass API for DACH countries (Germany, Austria, Switzerland).

## Overview

The system imports OpenStreetMap address data into a local PostGIS database, providing sub-10ms response times for street and house number lookups (compared to 1-25 seconds with Overpass API).

**Current scope:** Rheinland-Pfalz (for testing), expandable to full DACH region.

## Prerequisites

- Docker with Docker Compose
- PostgreSQL with PostGIS extension (handled automatically by `imresamu/postgis` image, supports arm64/Apple Silicon)
- Sufficient disk space:
  - Rheinland-Pfalz: ~500MB
  - Full Germany: ~15GB
  - Full DACH: ~30GB

## Setup

### 1. Update PostgreSQL Image

The `docker-compose.prod.yml` already uses `imresamu/postgis:17-3.5` (multi-arch, supports amd64 and arm64). If upgrading from a previous version:

```bash
# Pull the new image
docker compose -f docker-compose.prod.yml pull postgres

# Recreate the postgres container (data is preserved in volume)
docker compose -f docker-compose.prod.yml up -d postgres
```

### 2. Run Database Migration

The migration creates the `geodata` schema, enables the PostGIS extension, and sets up the required tables and indexes:

```bash
docker compose -f docker-compose.prod.yml exec backend \
  node /app/database/dist/migrate.js
```

### 3. Import OSM Data

Import address data for your desired region:

```bash
# Import Rheinland-Pfalz (recommended for initial testing)
docker compose -f docker-compose.prod.yml --profile import \
  run --rm osm-import rheinland-pfalz

# Or import full Germany
docker compose -f docker-compose.prod.yml --profile import \
  run --rm osm-import germany
```

Available regions:
- German states: `rheinland-pfalz`, `bayern`, `berlin`, `baden-wuerttemberg`, `nordrhein-westfalen`, `hessen`, `niedersachsen`, `sachsen`
- Countries: `germany`, `austria`, `switzerland`

### 4. Enable PostGIS Lookups

Add to your `.env` file:

```bash
POSTGIS_ADDRESS_ENABLED=true
POSTGIS_ADDRESS_DACH_ONLY=true
```

Then restart the backend:

```bash
docker compose -f docker-compose.prod.yml up -d backend
```

## How It Works

1. **PostGIS First:** For DACH countries (DE, AT, CH), the system queries the local PostGIS database first
2. **Automatic Fallback:** If PostGIS returns no results or fails, it falls back to the Overpass API
3. **Non-DACH Countries:** Continue to use Overpass API directly

## Maintenance

### Weekly Data Updates

Set up a cron job to keep the data fresh:

```bash
# Edit crontab
crontab -e

# Add this line (runs every Sunday at 3 AM)
0 3 * * 0 cd /path/to/freundebuch && docker compose -f docker-compose.prod.yml --profile import run --rm osm-import rheinland-pfalz >> /var/log/osm-import.log 2>&1
```

### Check Import Status

```bash
# Connect to database and check statistics
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U freundebuch -d freundebuch -c "
    SELECT country_code, COUNT(*) as addresses,
           COUNT(DISTINCT postal_code) as postal_codes,
           COUNT(DISTINCT street) as streets
    FROM geodata.addresses
    GROUP BY country_code;
  "
```

### Refresh Materialized Views

After imports, materialized views are automatically refreshed. To manually refresh:

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U freundebuch -d freundebuch -c "
    REFRESH MATERIALIZED VIEW CONCURRENTLY geodata.streets_by_postal;
    REFRESH MATERIALIZED VIEW CONCURRENTLY geodata.housenumbers_by_street;
  "
```

## Development

For local development:

```bash
# Start postgres with PostGIS
docker compose up -d postgres

# Run migration
pnpm migrate

# Import test data
docker compose --profile import run --rm osm-import rheinland-pfalz

# Enable PostGIS in your environment
export POSTGIS_ADDRESS_ENABLED=true

# Start the backend
pnpm --filter backend run dev
```

## Troubleshooting

### Import fails with "osm2pgsql not found"

Ensure you're using the osm-import container, not running the script directly:

```bash
docker compose -f docker-compose.prod.yml --profile import run --rm osm-import rheinland-pfalz
```

### PostGIS extension not available

Check that the postgres container is using the PostGIS image:

```bash
docker compose -f docker-compose.prod.yml exec postgres psql -U freundebuch -d freundebuch -c "SELECT PostGIS_Version();"
```

### No data returned for a postal code

1. Check if data exists for that postal code:
   ```sql
   SELECT COUNT(*) FROM geodata.addresses WHERE postal_code = '55116';
   ```

2. If empty, the region may not be imported yet. Import the appropriate region.

3. If still empty after import, the postal code may not have OSM data. The system will fall back to Overpass.

## Performance

| Query | PostGIS | Overpass API |
|-------|---------|--------------|
| Streets by postal code | <10ms | 1-25s |
| House numbers by street | <5ms | 1-25s |
