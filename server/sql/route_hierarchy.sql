-- Route hierarchy table and population function
-- Run BEFORE routebuilder to ensure hierarchy is available for recursive geometry building

-- Route hierarchy table: materializes parent-child relationships from relation members
DROP TABLE IF EXISTS itinerarius.route_hierarchy CASCADE;
CREATE TABLE itinerarius.route_hierarchy (
    parent_id bigint NOT NULL,
    child_id bigint NOT NULL,
    sequence integer,
    role text,
    network_compatible boolean,
    PRIMARY KEY (parent_id, child_id)
);

-- Indexes for both parent->children and child->parents lookups
CREATE INDEX IF NOT EXISTS idx_route_hierarchy_parent ON itinerarius.route_hierarchy (parent_id);
CREATE INDEX IF NOT EXISTS idx_route_hierarchy_child ON itinerarius.route_hierarchy (child_id);

-- Function to parse members jsonb and populate route_hierarchy
-- Validates network tag hierarchy: iwn > nwn > rwn > lwn
-- Applies to ALL routes with relation members (not just superroutes)
CREATE OR REPLACE FUNCTION itinerarius.populate_route_hierarchy()
RETURNS void AS $$
DECLARE
    network_levels text[] := ARRAY['iwn', 'nwn', 'rwn', 'lwn'];
    parent_rec RECORD;
    parent_network_level integer;
BEGIN
    TRUNCATE itinerarius.route_hierarchy;
    
    FOR parent_rec IN 
        SELECT osm_id, tags->>'network' AS network, members
        FROM itinerarius.routes
        WHERE members IS NOT NULL
          AND EXISTS (
              SELECT 1 FROM jsonb_array_elements(members) m 
              WHERE m->>'type' = 'r'
          )
    LOOP
        -- Get parent network level (1=iwn, 2=nwn, 3=rwn, 4=lwn, null=unspecified)
        parent_network_level := array_position(network_levels, parent_rec.network);
        
        -- Extract relation members and insert into hierarchy
        INSERT INTO itinerarius.route_hierarchy (parent_id, child_id, sequence, role, network_compatible)
        SELECT 
            parent_rec.osm_id,
            (member->>'ref')::bigint,
            (row_number() OVER ())::integer,
            member->>'role',
            CASE
                -- If parent has no network tag, accept any child
                WHEN parent_network_level IS NULL THEN true
                -- If child doesn't exist or has no network, flag as incompatible
                WHEN child_info.network IS NULL THEN false
                -- Check if child network is same or more specific than parent
                ELSE child_level.child_network_level >= parent_network_level
            END
        FROM jsonb_array_elements(parent_rec.members) AS member
        CROSS JOIN LATERAL (
            SELECT tags->>'network' AS network
            FROM itinerarius.routes
            WHERE osm_id = (member->>'ref')::bigint
        ) AS child_info
        CROSS JOIN LATERAL (
            SELECT array_position(network_levels, child_info.network) AS child_network_level
        ) AS child_level
        WHERE member->>'type' = 'r'
        ON CONFLICT (parent_id, child_id) DO NOTHING;
        
    END LOOP;
    
    RAISE NOTICE 'Populated % parent-child relationships', (SELECT count(*) FROM itinerarius.route_hierarchy);
    
    -- Log warnings for network mismatches
    FOR parent_rec IN
        SELECT 
            h.parent_id,
            pr.name AS parent_name,
            pr.tags->>'network' AS parent_network,
            h.child_id,
            cr.name AS child_name,
            cr.tags->>'network' AS child_network
        FROM itinerarius.route_hierarchy h
        JOIN itinerarius.routes pr ON h.parent_id = pr.osm_id
        LEFT JOIN itinerarius.routes cr ON h.child_id = cr.osm_id
        WHERE NOT h.network_compatible
    LOOP
        RAISE WARNING 'Network mismatch: % (%) -> % (%)',
            parent_rec.parent_name, parent_rec.parent_network,
            parent_rec.child_name, parent_rec.child_network;
    END LOOP;
    
END;
$$ LANGUAGE plpgsql;
