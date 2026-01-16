-- Orda Database Schema with Authentication
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- This is a migration to add authentication to the existing schema

-- Enable UUID extension (if not already enabled)
create extension if not exists "uuid-ossp";

-- Add user_id column to cart_items table
-- This links cart items to authenticated users
alter table cart_items
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Create index for user_id lookups
create index if not exists idx_cart_items_user_id on cart_items(user_id);

-- Drop old public policies (we're replacing them with auth-based ones)
drop policy if exists "Allow public read menus" on menus;
drop policy if exists "Allow public insert menus" on menus;
drop policy if exists "Allow public read carts" on carts;
drop policy if exists "Allow public insert carts" on carts;
drop policy if exists "Allow public update carts" on carts;
drop policy if exists "Allow public read cart_items" on cart_items;
drop policy if exists "Allow public insert cart_items" on cart_items;
drop policy if exists "Allow public update cart_items" on cart_items;
drop policy if exists "Allow public delete cart_items" on cart_items;

-- Menus policies: Anyone can read, only authenticated users can create
create policy "Anyone can read menus"
  on menus for select
  using (true);

create policy "Authenticated users can create menus"
  on menus for insert
  to authenticated
  with check (true);

-- Carts policies: Anyone can read, only authenticated users can create/update
create policy "Anyone can read carts"
  on carts for select
  using (true);

create policy "Authenticated users can create carts"
  on carts for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update carts"
  on carts for update
  to authenticated
  using (true);

-- Cart items policies: Authenticated users only
-- Users can read all items in a cart (to see what everyone ordered)
-- Users can only create/update/delete their own items
create policy "Authenticated users can read cart items"
  on cart_items for select
  to authenticated
  using (true);

create policy "Authenticated users can create their own cart items"
  on cart_items for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own cart items"
  on cart_items for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete their own cart items"
  on cart_items for delete
  to authenticated
  using (auth.uid() = user_id);

-- Create a profiles table to store user display names
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  display_name text,
  email text
);

-- Enable RLS on profiles
alter table profiles enable row level security;

-- Profiles policies: Users can read all profiles, update only their own
create policy "Anyone can read profiles"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id);

-- Create a function to automatically create a profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to create profile on user signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Migration: For existing cart_items without user_id, we can't easily assign them
-- You may want to delete them or create a placeholder user
-- For now, we'll just leave them as null (they won't be accessible with the new policies)
