-- Migration: Add menu_corrections table for tracking AI parsing corrections
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Menu corrections table: tracks user edits to menu items for AI prompt improvement
create table if not exists menu_corrections (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  menu_id uuid references menus(id) on delete cascade,

  -- Item identification (to match against items in menu.items JSONB array)
  item_category text not null,
  item_name_original text not null,  -- Original name from AI parsing

  -- What field was corrected
  field_corrected text not null,  -- 'name', 'description', 'price', 'category', 'chips'

  -- Values before and after correction
  original_value text,  -- JSON string for complex values like chips array
  corrected_value text, -- JSON string for complex values like chips array

  -- Metadata for analysis
  correction_count integer default 1,  -- How many times this specific correction was made

  -- Additional context
  notes text  -- Optional notes about why the correction was made
);

-- Create indexes for analysis queries
create index if not exists idx_menu_corrections_menu_id on menu_corrections(menu_id);
create index if not exists idx_menu_corrections_field on menu_corrections(field_corrected);
create index if not exists idx_menu_corrections_created_at on menu_corrections(created_at);

-- Enable RLS
alter table menu_corrections enable row level security;

-- Policies: Allow all operations (no auth required)
create policy "Allow public read menu_corrections" on menu_corrections for select using (true);
create policy "Allow public insert menu_corrections" on menu_corrections for insert with check (true);
