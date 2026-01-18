-- Migration: Create storage bucket for menu PDFs and images
-- Date: 2026-01-18
-- Purpose: Store uploaded menu files in Supabase Storage

-- Create a public storage bucket for menu uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-uploads', 'menu-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to menu uploads
CREATE POLICY "Public read access for menu uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'menu-uploads');

-- Allow public insert access (since we don't use auth)
CREATE POLICY "Public insert access for menu uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'menu-uploads');

-- Optional: Allow public delete (for cleanup)
CREATE POLICY "Public delete access for menu uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'menu-uploads');
