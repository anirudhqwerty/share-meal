/* Enables PostGIS for spatial operations and creates necessary ENUM types for statuses. */
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TYPE user_role AS ENUM ('donor', 'ngo');
CREATE TYPE donation_status AS ENUM ('available', 'pending', 'claimed', 'expired');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE pickup_status AS ENUM ('scheduled', 'completed', 'cancelled');

/* Creates the public storage bucket for food images and sets up basic read/write policies. */
INSERT INTO storage.buckets (id, name, public) 
VALUES ('food_images', 'food_images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'food_images');
CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'food_images' AND auth.role() = 'authenticated');

/* Creates the base users table to link with Supabase Auth and store common connection data. */
CREATE TABLE app_users (
    id UUID PRIMARY KEY,
    role user_role NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    expo_push_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* Creates the donors table, demonstrating a 1:1 relationship with app_users, storing hotel/restaurant specifics. */
CREATE TABLE donors (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    organization_name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOGRAPHY(POINT, 4326)
);

/* Creates the ngos table, also a 1:1 relationship with app_users, including NGO-specific fields like registration numbers. */
CREATE TABLE ngos (
    user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
    ngo_name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    notification_radius_km INT DEFAULT 5
);

/* Creates the main donations table including spatial location and expiry data. 
   Using food_type TEXT for flexibility instead of a structured categories table. */
CREATE TABLE food_donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES donors(user_id) ON DELETE CASCADE,
    food_type TEXT NOT NULL, -- Flexible entry: e.g., "Veg Biryani", "Bread", "Cooked Rice"
    quantity VARCHAR(100) NOT NULL,
    image_path VARCHAR(255),
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    expiry_time TIMESTAMP NOT NULL,
    status donation_status DEFAULT 'available',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* Creates the pickup requests table, allowing multiple NGOs to request the same available food before approval. */
CREATE TABLE pickup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donation_id UUID NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
    ngo_id UUID NOT NULL REFERENCES ngos(user_id) ON DELETE CASCADE,
    status request_status DEFAULT 'pending',
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_ngo_request UNIQUE (donation_id, ngo_id)
);

/* Creates the final pickup table, generated only when a donor approves a specific pickup_request. */
CREATE TABLE pickups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL UNIQUE REFERENCES pickup_requests(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP,
    status pickup_status DEFAULT 'scheduled',
    completed_at TIMESTAMP
);

/* Creates a centralized notifications table to store the history of system alerts for all users. */
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

/* Creates a PL/pgSQL function to convert latitude and longitude coordinates into PostGIS geography points. */
CREATE OR REPLACE FUNCTION sync_geography_location()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location = ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::GEOGRAPHY;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

/* Attaches the spatial conversion trigger to the donors table. */
CREATE TRIGGER update_donor_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON donors
FOR EACH ROW EXECUTE FUNCTION sync_geography_location();

/* Attaches the spatial conversion trigger to the ngos table. */
CREATE TRIGGER update_ngo_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON ngos
FOR EACH ROW EXECUTE FUNCTION sync_geography_location();

/* Attaches the spatial conversion trigger to the food_donations table. */
CREATE TRIGGER update_donation_location
BEFORE INSERT OR UPDATE OF latitude, longitude ON food_donations
FOR EACH ROW EXECUTE FUNCTION sync_geography_location();