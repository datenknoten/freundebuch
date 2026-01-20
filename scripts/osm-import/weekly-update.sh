#!/usr/bin/env bash
#
# Weekly OSM data update script with zero-downtime refresh
#
# Usage: ./weekly-update.sh [regions...]
#
# Examples:
#   ./weekly-update.sh                    # Update all previously imported regions
#   ./weekly-update.sh germany austria    # Update specific regions
#
# This script is designed to be run via cron, e.g., every Sunday at 3 AM:
#   0 3 * * 0 /path/to/weekly-update.sh >> /var/log/osm-update.log 2>&1
#
# The script uses a blue-green approach:
#   1. Import new data into staging tables
#   2. Atomically swap staging with production
#   3. Clean up old data

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_success() { echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"; }
log_error() { echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1" >&2; }

# Get list of previously imported regions
get_imported_regions() {
    psql "$DATABASE_URL" -t -A -c "
        SELECT DISTINCT region
        FROM geodata.import_batches
        WHERE status = 'completed' AND region IS NOT NULL
        ORDER BY region;
    "
}

# Main execution
main() {
    if [[ -z "${DATABASE_URL:-}" ]]; then
        log_error "DATABASE_URL environment variable is not set."
        exit 1
    fi

    local regions=("$@")

    # If no regions specified, get all previously imported regions
    if [[ ${#regions[@]} -eq 0 ]]; then
        log_info "No regions specified, discovering previously imported regions..."
        mapfile -t regions < <(get_imported_regions)

        if [[ ${#regions[@]} -eq 0 ]]; then
            log_warn "No regions found in database. Run import-region.sh first."
            exit 0
        fi
    fi

    log_info "Starting weekly update for regions: ${regions[*]}"

    local failed=0

    for region in "${regions[@]}"; do
        log_info "Updating region: $region"

        if "$SCRIPT_DIR/import-region.sh" "$region"; then
            log_success "Successfully updated $region"
        else
            log_error "Failed to update $region"
            failed=$((failed + 1))
        fi
    done

    if [[ $failed -gt 0 ]]; then
        log_error "$failed region(s) failed to update"
        exit 1
    fi

    # Clean up old import batches (keep last 4 per region)
    log_info "Cleaning up old import batches..."
    psql "$DATABASE_URL" -q -c "
        WITH ranked_batches AS (
            SELECT id, external_id,
                   ROW_NUMBER() OVER (PARTITION BY region ORDER BY created_at DESC) as rn
            FROM geodata.import_batches
        ),
        old_batches AS (
            SELECT external_id FROM ranked_batches WHERE rn > 4
        )
        DELETE FROM geodata.addresses
        WHERE import_batch_id IN (SELECT external_id FROM old_batches);

        WITH ranked_batches AS (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY region ORDER BY created_at DESC) as rn
            FROM geodata.import_batches
        )
        DELETE FROM geodata.import_batches
        WHERE id IN (SELECT id FROM ranked_batches WHERE rn > 4);
    "

    # Vacuum analyze for optimal performance
    log_info "Running VACUUM ANALYZE..."
    psql "$DATABASE_URL" -q -c "VACUUM ANALYZE geodata.addresses;"
    psql "$DATABASE_URL" -q -c "VACUUM ANALYZE geodata.import_batches;"

    log_success "Weekly update completed successfully!"
}

main "$@"
