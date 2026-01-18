# Supabase Storage Setup

## Overview
The menu upload feature now stores uploaded files in Supabase Storage instead of just processing them in-memory. This enables the "View Original Menu" functionality.

## Setup Instructions

### 1. Run the Migration

Run the migration script in your Supabase SQL Editor:

```bash
# The migration file is located at:
supabase/migrations/002_create_menu_storage.sql
```

Or manually in the Supabase Dashboard:
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/002_create_menu_storage.sql`
4. Click "Run"

### 2. Verify Storage Bucket

After running the migration, verify the bucket was created:

1. Go to Storage in your Supabase dashboard
2. You should see a bucket named `menu-uploads`
3. The bucket should be marked as "Public"

### 3. Test the Feature

1. Upload a menu (PDF or image)
2. After parsing completes, you should see the "View original menu" button
3. Clicking it should display the uploaded file in a modal

## Troubleshooting

### Storage upload fails
- Check that the migration ran successfully
- Verify the storage policies are in place
- Check the browser console for detailed error messages

### "View original menu" button doesn't appear
- The button only appears if `pdf_url` is not null
- Check the database to see if the URL was saved correctly
- Verify the file was uploaded to storage

### Can't view the file in the modal
- Check if the file URL is publicly accessible
- Verify the bucket is set to "public"
- Check CORS settings in Supabase if accessing from a different domain
