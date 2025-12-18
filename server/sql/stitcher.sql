-- Helper function to check if a MultiLineString is topologically connected
CREATE OR REPLACE FUNCTION itinerarius.is_connected(geom geometry)
RETURNS boolean AS $$
DECLARE
    clusters int;
BEGIN
    IF geom IS NULL OR ST_IsEmpty(geom) THEN
        RETURN FALSE;
    END IF;
    IF GeometryType(geom) != 'MULTILINESTRING' THEN
        RETURN TRUE;
    END IF;
    
    -- Cluster the components by intersection. 
    -- If they form a single cluster, the geometry is connected.
    WITH parts AS (
        SELECT (ST_Dump(geom)).geom AS g
    ),
    clustered AS (
        SELECT ST_ClusterIntersecting(g) AS gc
        FROM parts
    )
    SELECT count(*) INTO clusters FROM clustered;
    
    RETURN clusters = 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Function to stitch broken MultiLineStrings by reordering and bridging gaps
CREATE OR REPLACE FUNCTION itinerarius.stitch_geometry(geom geometry, threshold float DEFAULT 0.5, max_parts int DEFAULT 25)
RETURNS geometry AS $$
DECLARE
    parts geometry[];
    chain geometry[];
    remaining geometry[];
    
    head_pt geometry;
    tail_pt geometry;
    cand_start geometry;
    cand_end geometry;
    
    cand geometry;
    
    best_idx int;
    best_dist float;
    dist_start_start float;
    dist_start_end float;
    dist_end_start float;
    dist_end_end float;
    
    i int;
BEGIN
    -- If not MultiLineString, return as is
    IF geom IS NULL OR ST_IsEmpty(geom) THEN
        RETURN geom;
    END IF;
    IF GeometryType(geom) != 'MULTILINESTRING' THEN
        RETURN geom;
    END IF;

    -- Fail fast if too complex
    IF ST_NumGeometries(geom) > max_parts THEN
        RETURN geom;
    END IF;

    -- Dump parts
    SELECT ARRAY(SELECT (ST_Dump(geom)).geom) INTO parts;
    
    -- Start with the longest part to anchor the chain
    SELECT array_agg(p ORDER BY ST_Length(p) DESC) INTO parts FROM unnest(parts) p;
    
    IF parts IS NULL OR array_length(parts, 1) < 1 THEN
        RETURN geom;
    END IF;
    
    chain := ARRAY[parts[1]];
    remaining := parts[2:array_length(parts, 1)];
    
    IF remaining IS NULL OR array_length(remaining, 1) IS NULL THEN
        RETURN chain[1];
    END IF;

    LOOP
        IF array_length(remaining, 1) IS NULL THEN
            EXIT;
        END IF;

        head_pt := ST_StartPoint(chain[1]);
        tail_pt := ST_EndPoint(chain[array_length(chain, 1)]);
        
        best_idx := NULL;
        best_dist := threshold + 0.000001; -- Init with max
        
        -- Find closest candidate
        FOR i IN 1..array_length(remaining, 1) LOOP
            cand := remaining[i];
            cand_start := ST_StartPoint(cand);
            cand_end := ST_EndPoint(cand);
            
            dist_start_start := ST_Distance(head_pt, cand_start);
            dist_start_end := ST_Distance(head_pt, cand_end);
            dist_end_start := ST_Distance(tail_pt, cand_start);
            dist_end_end := ST_Distance(tail_pt, cand_end);
            
            -- Check min distance
            IF dist_start_start < best_dist THEN best_dist := dist_start_start; best_idx := i; END IF;
            IF dist_start_end < best_dist THEN best_dist := dist_start_end; best_idx := i; END IF;
            IF dist_end_start < best_dist THEN best_dist := dist_end_start; best_idx := i; END IF;
            IF dist_end_end < best_dist THEN best_dist := dist_end_end; best_idx := i; END IF;
        END LOOP;
        
        -- If no candidate within threshold, stop stitching
        IF best_idx IS NULL THEN
            EXIT;
        END IF;
        
        cand := remaining[best_idx];
        cand_start := ST_StartPoint(cand);
        cand_end := ST_EndPoint(cand);
        
        -- Determine attachment point and orientation
        dist_start_start := ST_Distance(head_pt, cand_start);
        dist_start_end := ST_Distance(head_pt, cand_end);
        dist_end_start := ST_Distance(tail_pt, cand_start);
        dist_end_end := ST_Distance(tail_pt, cand_end);
        
        IF dist_end_start = best_dist THEN
            -- Append to tail: Tail -> Cand_Start
            IF best_dist > 0 THEN
                chain := array_append(chain, ST_MakeLine(tail_pt, cand_start));
            END IF;
            chain := array_append(chain, cand);
            
        ELSIF dist_end_end = best_dist THEN
            -- Append to tail: Tail -> Cand_End (Reverse Cand)
            IF best_dist > 0 THEN
                chain := array_append(chain, ST_MakeLine(tail_pt, cand_end));
            END IF;
            chain := array_append(chain, ST_Reverse(cand));
            
        ELSIF dist_start_end = best_dist THEN
            -- Prepend to head: Cand_End -> Head
            IF best_dist > 0 THEN
                chain := array_prepend(ST_MakeLine(cand_end, head_pt), chain);
            END IF;
            chain := array_prepend(cand, chain);
            
        ELSIF dist_start_start = best_dist THEN
            -- Prepend to head: Cand_Start -> Head (Reverse Cand)
            IF best_dist > 0 THEN
                chain := array_prepend(ST_MakeLine(cand_start, head_pt), chain);
            END IF;
            chain := array_prepend(ST_Reverse(cand), chain);
        END IF;
        
        -- Remove from remaining
        remaining := remaining[1:best_idx-1] || remaining[best_idx+1:array_length(remaining, 1)];
        
    END LOOP;
    
    -- Merge the chain
    RETURN ST_LineMerge(ST_Collect(chain));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
