-- Fotos de entrega: el bucket es público (las URLs /object/public/ se sirven
-- sin RLS), pero la policy SELECT para {public} además permitía LISTAR todo
-- el bucket con la anon key: cualquiera podía enumerar las fotos de las
-- puertas de los clientes. Sin la policy, las URLs públicas siguen
-- funcionando; la subida usa el service role (no depende de esta policy).
drop policy if exists "Public read order photos" on storage.objects;
