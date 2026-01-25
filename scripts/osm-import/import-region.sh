#!/usr/bin/env bash
#
# Import OSM address data for a specific region into the geodata schema
#
# Usage: ./import-region.sh <region>
#
# Examples:
#   ./import-region.sh rheinland-pfalz     # German state
#   ./import-region.sh germany             # Full country
#   ./import-region.sh austria             # Austria
#   ./import-region.sh switzerland         # Switzerland
#
# Prerequisites:
#   - osm2pgsql 1.11+ (with flex output support)
#   - PostgreSQL with PostGIS extension
#   - DATABASE_URL environment variable set
#
# The script will:
#   1. Download the latest PBF file from Geofabrik
#   2. Run osm2pgsql to extract addresses to staging table
#   3. Post-process data into production geodata.addresses table
#   4. Refresh materialized views for fast lookups

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Configuration
DATA_DIR="${OSM_DATA_DIR:-$SCRIPT_DIR/data}"
REGION="${1:-}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1" >&2; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1" >&2; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1" >&2; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Validate prerequisites
check_prerequisites() {
    if ! command -v osm2pgsql &> /dev/null; then
        log_error "osm2pgsql is not installed. Please install osm2pgsql 1.11+."
        log_info "On macOS: brew install osm2pgsql"
        log_info "On Ubuntu: sudo apt install osm2pgsql"
        exit 1
    fi

    local version=$(osm2pgsql --version 2>&1 | head -1 | grep -oE '[0-9]+\.[0-9]+' | head -1 || echo "0.0")
    local major=$(echo "$version" | cut -d. -f1)
    local minor=$(echo "$version" | cut -d. -f2)

    if (( major < 1 )) || (( major == 1 && minor < 11 )); then
        log_error "osm2pgsql version $version is too old. Need 1.11+ for flex output."
        exit 1
    fi
    log_info "Found osm2pgsql version $version"

    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL environment variable is not set."
        exit 1
    fi

    if ! command -v psql &> /dev/null; then
        log_error "psql is not installed."
        exit 1
    fi
}

# Get Geofabrik URL for a region
get_geofabrik_url() {
    local region="$1"
    local base_url="https://download.geofabrik.de/europe"

    case "$region" in
        # German states
        rheinland-pfalz|rhineland-palatinate)
            echo "$base_url/germany/rheinland-pfalz-latest.osm.pbf"
            ;;
        bayern|bavaria)
            echo "$base_url/germany/bayern-latest.osm.pbf"
            ;;
        berlin)
            echo "$base_url/germany/berlin-latest.osm.pbf"
            ;;
        baden-wuerttemberg|baden-württemberg)
            echo "$base_url/germany/baden-wuerttemberg-latest.osm.pbf"
            ;;
        nordrhein-westfalen|north-rhine-westphalia|nrw)
            echo "$base_url/germany/nordrhein-westfalen-latest.osm.pbf"
            ;;
        hessen)
            echo "$base_url/germany/hessen-latest.osm.pbf"
            ;;
        niedersachsen)
            echo "$base_url/germany/niedersachsen-latest.osm.pbf"
            ;;
        sachsen)
            echo "$base_url/germany/sachsen-latest.osm.pbf"
            ;;
        # Full countries
        germany)
            echo "$base_url/germany-latest.osm.pbf"
            ;;
        austria)
            echo "$base_url/austria-latest.osm.pbf"
            ;;
        switzerland)
            echo "$base_url/switzerland-latest.osm.pbf"
            ;;
        *)
            log_error "Unknown region: $region"
            log_info "Supported regions:"
            log_info "  German states: rheinland-pfalz, bayern, berlin, baden-wuerttemberg,"
            log_info "                 nordrhein-westfalen, hessen, niedersachsen, sachsen"
            log_info "  Countries: germany, austria, switzerland"
            exit 1
            ;;
    esac
}

# Get country code for a region
get_country_code() {
    local region="$1"
    case "$region" in
        austria) echo "AT" ;;
        switzerland) echo "CH" ;;
        *) echo "DE" ;;
    esac
}

# Download PBF file
download_pbf() {
    local region="$1"
    local url="$2"
    local output_file="$DATA_DIR/${region}-latest.osm.pbf"

    mkdir -p "$DATA_DIR"

    if [[ -f "$output_file" ]]; then
        local file_mtime
        # macOS uses -f %m, Linux uses -c %Y
        file_mtime=$(stat -f %m "$output_file" 2>/dev/null) || file_mtime=$(stat -c %Y "$output_file" 2>/dev/null) || file_mtime=0
        local age=$(( ($(date +%s) - file_mtime) / 86400 ))
        if (( age < 7 )); then
            log_info "Using existing PBF file (${age} days old)"
            echo "$output_file"
            return
        fi
        log_info "PBF file is ${age} days old, downloading fresh copy..."
    fi

    log_info "Downloading $url..."
    curl -L --progress-bar -o "$output_file" "$url"
    log_success "Downloaded to $output_file"
    echo "$output_file"
}

# Run osm2pgsql import
run_osm2pgsql() {
    local pbf_file="$1"
    local country_code="$2"

    log_info "Running osm2pgsql import..."

    # Set country code for Lua script
    export OSM_COUNTRY_CODE="$country_code"

    # Drop staging table if exists
    psql "$DATABASE_URL" -q -c "DROP TABLE IF EXISTS public.osm_addresses_staging CASCADE;"

    # Run osm2pgsql with flex output
    osm2pgsql \
        -d "$DATABASE_URL" \
        -O flex \
        -S "$SCRIPT_DIR/address-import.lua" \
        --slim \
        --drop \
        "$pbf_file"

    log_success "osm2pgsql import completed"
}

# Post-process staging data into production tables
post_process() {
    local region="$1"
    local country_code="$2"
    local pbf_file="$3"

    log_info "Post-processing data into geodata schema..."

    # Create import batch record and get the external_id
    local batch_id=$(psql "$DATABASE_URL" -t -A -c "
        INSERT INTO geodata.import_batches (
            country_code, region, source_file, status
        ) VALUES (
            '$country_code',
            '${region}',
            '$(basename "$pbf_file")',
            'running'
        ) RETURNING external_id;
    " | head -1 | tr -d '[:space:]')

    log_info "Created import batch: $batch_id"

    # Insert data from staging table into production table
    local count=$(psql "$DATABASE_URL" -t -A -c "
        INSERT INTO geodata.addresses (
            country_code, postal_code, city, street, house_number,
            location, osm_id, osm_type, import_batch_id
        )
        SELECT
            COALESCE(NULLIF(country_code, ''), '$country_code'),
            postal_code,
            COALESCE(NULLIF(city, ''), 'Unknown'),
            street,
            house_number,
            geom,
            osm_id,
            osm_type,
            '$batch_id'::uuid
        FROM public.osm_addresses_staging
        WHERE postal_code IS NOT NULL
          AND street IS NOT NULL
        ON CONFLICT DO NOTHING
        RETURNING id;
    " | wc -l | tr -d ' ')

    # Update batch with record count and mark as completed
    psql "$DATABASE_URL" -q -c "
        UPDATE geodata.import_batches
        SET record_count = $count,
            completed_at = CURRENT_TIMESTAMP,
            status = 'completed'
        WHERE external_id = '$batch_id'::uuid;
    "

    # Clean up staging table
    psql "$DATABASE_URL" -q -c "DROP TABLE IF EXISTS public.osm_addresses_staging CASCADE;"

    log_success "Imported $count address records"
}

# Refresh materialized views
refresh_views() {
    log_info "Refreshing materialized views..."

    psql "$DATABASE_URL" -q -c "REFRESH MATERIALIZED VIEW CONCURRENTLY geodata.streets_by_postal;"
    psql "$DATABASE_URL" -q -c "REFRESH MATERIALIZED VIEW CONCURRENTLY geodata.housenumbers_by_street;"

    log_success "Materialized views refreshed"
}

# Print statistics
print_stats() {
    log_info "Database statistics:"
    psql "$DATABASE_URL" -c "
        SELECT
            country_code,
            COUNT(*) as total_addresses,
            COUNT(DISTINCT postal_code) as postal_codes,
            COUNT(DISTINCT street) as unique_streets,
            COUNT(house_number) as with_house_numbers
        FROM geodata.addresses
        GROUP BY country_code
        ORDER BY country_code;
    "

    psql "$DATABASE_URL" -c "
        SELECT
            external_id,
            country_code,
            region,
            status,
            record_count,
            completed_at
        FROM geodata.import_batches
        ORDER BY created_at DESC
        LIMIT 5;
    "
}

# Main execution
main() {
    if [[ -z "$REGION" ]]; then
        log_error "Usage: $0 <region>"
        log_info "Run '$0 --help' for available regions."
        exit 1
    fi

    if [[ "$REGION" == "--help" || "$REGION" == "-h" ]]; then
        echo "Usage: $0 <region>"
        echo ""
        echo "Import OSM address data for autocomplete functionality."
        echo ""
        echo "Available regions:"
        echo "  German states:"
        echo "    rheinland-pfalz, bayern, berlin, baden-wuerttemberg,"
        echo "    nordrhein-westfalen, hessen, niedersachsen, sachsen"
        echo ""
        echo "  Full countries:"
        echo "    germany, austria, switzerland"
        echo ""
        echo "Environment variables:"
        echo "  DATABASE_URL     PostgreSQL connection string (required)"
        echo "  OSM_DATA_DIR     Directory for PBF files (default: ./data)"
        exit 0
    fi

    check_prerequisites

    local url=$(get_geofabrik_url "$REGION")
    local country_code=$(get_country_code "$REGION")

    log_info "Starting import for region: $REGION (country: $country_code)"

    local pbf_file=$(download_pbf "$REGION" "$url")
    run_osm2pgsql "$pbf_file" "$country_code"
    post_process "$REGION" "$country_code" "$pbf_file"
    refresh_views
    print_stats

    log_success "Import completed successfully!"
}

main "$@"
