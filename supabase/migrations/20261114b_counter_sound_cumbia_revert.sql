-- Deshace 20261114_counter_sound_cumbia: Pedro descartó el tema 'cumbia'
-- (2026-11-14). Vuelve el CHECK de sound_theme a los 19 temas originales.
-- Verificado antes de aplicar: 0 filas con sound_theme = 'cumbia'.
alter table public.counter_settings drop constraint if exists counter_settings_sound_theme_check;
alter table public.counter_settings add constraint counter_settings_sound_theme_check check (sound_theme in (
  'firma','aurora','cristal','lounge','reloj','arpa','handpan','mozart','beethoven','bach',
  'oda-alegria','chonta','diner','entertainer','marcha-turca','guillermo-tell','rey-montana','danubio','cucaracha'));
