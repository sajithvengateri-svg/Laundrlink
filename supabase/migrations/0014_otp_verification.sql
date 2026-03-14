-- OTP Verification Support
-- Run this in Supabase SQL Editor if not applied via migrations

-- Add OTP columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_otp TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;

-- Add verification_methods to hubs table (NULL = use platform default)
ALTER TABLE hubs ADD COLUMN IF NOT EXISTS verification_methods TEXT[] DEFAULT NULL;
