# Add a new paid resource

1. Open Supabase -> Table Editor -> `products`.
2. Add a row:
   - `slug`: URL-safe name, e.g. `delf-b1-writing-pack`
   - `title`
   - `short_description`
   - `description`
   - `category`
   - `skill`
   - `level`
   - `price_paise`: INR x 100, e.g. ₹499 = `49900`
   - `cover_path`: a public image path such as `/covers/delf-b1.svg`
   - `includes`: JSON array, e.g. `["42-page PDF","Practice prompts"]`
   - `active`: true
   - `sort_order`: lower appears first

3. Supabase -> Storage -> `paid-resources` -> upload the actual PDF.
   Do NOT make the bucket public.

4. Copy the Storage object path, e.g. `tef/tef-writing-framework.pdf`.

5. Table Editor -> `product_files` -> add:
   - `product_id`: select/copy the product UUID
   - `display_name`: what buyer sees
   - `file_name`: download filename
   - `storage_path`: exact private Storage path
   - `sort_order`: 10, 20, 30...

A single product can have multiple `product_files`, so bundles work without a new payment architecture.
