-- Public storage bucket for images pasted/uploaded into journal entries. Entries embed the public URL.
-- Same access model as the rest of the app: any logged-in user can write, anyone with the URL can read.

insert into storage.buckets (id, name, public)
values ('journal-images', 'journal-images', true)
on conflict (id) do nothing;

create policy "Authenticated users can upload journal images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'journal-images');
create policy "Authenticated users can update journal images"
  on storage.objects for update to authenticated
  using (bucket_id = 'journal-images');
create policy "Authenticated users can delete journal images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'journal-images');
create policy "Journal images are publicly readable"
  on storage.objects for select to public
  using (bucket_id = 'journal-images');
