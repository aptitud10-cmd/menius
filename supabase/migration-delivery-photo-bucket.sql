-- Create the order-photos storage bucket for delivery proof photos.
-- The driver uploads a photo after delivery; customers see it in the tracker.
-- Uses the admin client on upload (bypasses RLS), so only a public read
-- policy is needed for customers to view the photo URL.

-- Create bucket (safe to run multiple times)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'order-photos',
  'order-photos',
  true,
  10485760,  -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do nothing;

-- Allow anyone to read photos (customers view delivery proof via public URL)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read order photos'
  ) then
    execute $p$
      create policy "Public read order photos"
      on storage.objects for select
      using (bucket_id = 'order-photos')
    $p$;
  end if;
end$$;
