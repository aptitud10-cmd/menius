import { Archivo_Black, Instrument_Serif } from 'next/font/google';

/*
 * Fuentes propias de la landing v2. Inter (estática, por el bug de pesos en
 * iPhone) e Instrument Serif normal ya las carga el layout raíz como
 * --font-inter y --font-serif; acá solo lo que nada más usa:
 * - la cursiva de Instrument Serif (frase acento del hero y del cierre);
 * - Archivo Black, la letra del ticket, solo para las horas.
 */
export const lv2SerifItalic = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: 'italic',
  variable: '--font-lv2-serif-italic',
  display: 'swap',
});

export const lv2Stamp = Archivo_Black({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lv2-stamp',
  display: 'swap',
});
