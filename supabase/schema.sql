-- Orda Database Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Menus table: stores parsed menu data from PDFs
create table menus (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  pdf_url text not null,
  restaurant_name text not null,
  location_city text,
  location_state text,
  tax_rate decimal(5,4) default 0.0,
  items jsonb not null default '[]'::jsonb
);

-- Carts table: shareable cart instances
create table carts (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  menu_id uuid references menus(id) on delete cascade,
  tip_percentage integer default 18
);

-- Cart items table: individual items added by users
create table cart_items (
  id uuid primary key default uuid_generate_v4(),
  created_at timestamp with time zone default now(),
  cart_id uuid references carts(id) on delete cascade,
  user_name text not null,
  item_name text not null,
  item_price decimal(10,2),
  is_price_estimate boolean default false,
  quantity integer default 1,
  notes text
);

-- Create indexes for common queries
create index idx_carts_menu_id on carts(menu_id);
create index idx_cart_items_cart_id on cart_items(cart_id);

-- Enable Row Level Security (but allow public access since we don't use auth)
alter table menus enable row level security;
alter table carts enable row level security;
alter table cart_items enable row level security;

-- Policies: Allow all operations (no auth required for this app)
create policy "Allow public read menus" on menus for select using (true);
create policy "Allow public insert menus" on menus for insert with check (true);

create policy "Allow public read carts" on carts for select using (true);
create policy "Allow public insert carts" on carts for insert with check (true);
create policy "Allow public update carts" on carts for update using (true);

create policy "Allow public read cart_items" on cart_items for select using (true);
create policy "Allow public insert cart_items" on cart_items for insert with check (true);
create policy "Allow public update cart_items" on cart_items for update using (true);
create policy "Allow public delete cart_items" on cart_items for delete using (true);

-- Enable Realtime for cart_items (so users see live updates)
alter publication supabase_realtime add table cart_items;

-- Menu corrections table: tracks user edits to menu items for AI prompt improvement
create table menu_corrections (
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
create index idx_menu_corrections_menu_id on menu_corrections(menu_id);
create index idx_menu_corrections_field on menu_corrections(field_corrected);
create index idx_menu_corrections_created_at on menu_corrections(created_at);

-- Enable RLS
alter table menu_corrections enable row level security;

-- Policies: Allow all operations (no auth required)
create policy "Allow public read menu_corrections" on menu_corrections for select using (true);
create policy "Allow public insert menu_corrections" on menu_corrections for insert with check (true);
