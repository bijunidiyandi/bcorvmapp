/*
  # Add GPS Coordinates to Sample Customers

  1. Updates
    - Add realistic GPS coordinates to all sample customers
    - Coordinates are placed within a reasonable geographic area
    - Each customer has unique coordinates for testing distance validation

  2. Notes
    - Coordinates are in decimal degrees format
    - Latitude range: roughly 40.7 to 40.8 (example: New York area)
    - Longitude range: roughly -73.9 to -74.0
    - Customers are spread across different locations for testing
*/

-- Update customers with GPS coordinates
UPDATE customers 
SET 
  latitude = 40.758896,
  longitude = -73.985130
WHERE code = 'CUST001';

UPDATE customers 
SET 
  latitude = 40.761431,
  longitude = -73.977622
WHERE code = 'CUST002';

UPDATE customers 
SET 
  latitude = 40.755123,
  longitude = -73.990456
WHERE code = 'CUST003';

UPDATE customers 
SET 
  latitude = 40.748817,
  longitude = -73.968565
WHERE code = 'CUST004';

UPDATE customers 
SET 
  latitude = 40.762345,
  longitude = -73.982234
WHERE code = 'CUST005';

UPDATE customers 
SET 
  latitude = 40.756789,
  longitude = -73.975432
WHERE code = 'CUST006';

UPDATE customers 
SET 
  latitude = 40.751234,
  longitude = -73.988765
WHERE code = 'CUST007';

UPDATE customers 
SET 
  latitude = 40.759876,
  longitude = -73.971234
WHERE code = 'CUST008';

UPDATE customers 
SET 
  latitude = 40.763456,
  longitude = -73.986543
WHERE code = 'CUST009';

UPDATE customers 
SET 
  latitude = 40.752345,
  longitude = -73.973210
WHERE code = 'CUST010';
