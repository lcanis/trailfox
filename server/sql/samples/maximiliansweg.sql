SELECT *
FROM api.route_amenities
WHERE route_id = 387633 and class = 'place' and subclass = 'village'
ORDER BY dist_along_route_m;