-- Tema de sonido nuevo para el Counter: 'cumbia' (melodía original, ver
-- docs/sound-design/cumbia-source-gen.py). Solo amplía la lista permitida;
-- no cambia ninguna fila existente.
alter table public.counter_settings drop constraint if exists counter_settings_sound_theme_check;
alter table public.counter_settings add constraint counter_settings_sound_theme_check check (sound_theme in (
  'firma','aurora','cristal','lounge','reloj','arpa','handpan','mozart','beethoven','bach',
  'oda-alegria','chonta','cumbia','diner','entertainer','marcha-turca','guillermo-tell','rey-montana','danubio','cucaracha'));
