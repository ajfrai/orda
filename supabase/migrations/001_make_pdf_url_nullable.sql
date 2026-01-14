-- Migration: Make pdf_url nullable to support uploaded files
-- Date: 2026-01-14
-- Reason: When users upload files instead of providing URLs, pdf_url should be null

-- Remove NOT NULL constraint from pdf_url column
ALTER TABLE menus
ALTER COLUMN pdf_url DROP NOT NULL;

-- Add comment explaining the column
COMMENT ON COLUMN menus.pdf_url IS 'URL to the original menu PDF/image. NULL for uploaded files.';
