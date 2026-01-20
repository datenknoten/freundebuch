-- osm2pgsql flex output configuration for address extraction
-- Usage: osm2pgsql -d DATABASE_URL -O flex -S address-import.lua input.osm.pbf
--
-- This script extracts addresses from OpenStreetMap data for autocomplete purposes.
-- It filters elements that have addr:postcode AND (addr:street OR addr:place).

-- Output table definition for staging (will be post-processed into production tables)
local addresses = osm2pgsql.define_table({
    name = 'osm_addresses_staging',
    ids = { type = 'any', id_column = 'osm_id', type_column = 'osm_type' },
    columns = {
        { column = 'country_code', type = 'text' },
        { column = 'postal_code', type = 'text', not_null = true },
        { column = 'city', type = 'text' },
        { column = 'street', type = 'text' },
        { column = 'house_number', type = 'text' },
        { column = 'geom', type = 'point', projection = 4326 },
    }
})

-- Country code mapping for DACH region (based on ISO3166-1 area tags)
-- This will be determined post-process based on geometry or passed as parameter
local DEFAULT_COUNTRY_CODE = os.getenv('OSM_COUNTRY_CODE') or 'DE'

-- Helper function to extract address data from tags
local function extract_address(tags, geom)
    local postal_code = tags['addr:postcode']

    -- Skip if no postal code
    if not postal_code then
        return nil
    end

    -- Street name: prefer addr:street, fallback to addr:place
    local street = tags['addr:street'] or tags['addr:place']

    -- Skip if no street/place info
    if not street then
        return nil
    end

    -- City: prefer addr:city, fallback to addr:place (for villages), then addr:suburb
    local city = tags['addr:city'] or tags['addr:place'] or tags['addr:suburb'] or ''

    -- If city is empty but we have a place, skip (we need at least a city)
    -- Actually, for postal code based lookups, we can work without city
    -- The city will be filled from postal code lookups

    return {
        country_code = tags['addr:country'] or DEFAULT_COUNTRY_CODE,
        postal_code = postal_code,
        city = city,
        street = street,
        house_number = tags['addr:housenumber'],
        geom = geom
    }
end

-- Process nodes with address tags
function osm2pgsql.process_node(object)
    local addr = extract_address(object.tags, object:as_point())
    if addr then
        addresses:insert(addr)
    end
end

-- Process ways with address tags
function osm2pgsql.process_way(object)
    -- For ways, use centroid as the point geometry
    local addr = extract_address(object.tags, object:as_polygon():centroid())
    if addr then
        addresses:insert(addr)
    end
end

-- Process relations with address tags (e.g., building relations)
function osm2pgsql.process_relation(object)
    if object.tags['addr:postcode'] then
        -- Try to get a representative point from the relation
        local geom = object:as_multipolygon()
        if geom then
            local addr = extract_address(object.tags, geom:centroid())
            if addr then
                addresses:insert(addr)
            end
        end
    end
end
