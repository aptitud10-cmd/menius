import type { DietaryTag } from '@/types';

export interface DietaryTagConfig {
  id: DietaryTag;
  emoji: string;
  labelEs: string;
  labelEn: string;
  schemaDiet?: string;
}

export const DIETARY_TAGS: DietaryTagConfig[] = [
  { id: 'vegetarian', emoji: '🌱', labelEs: 'Vegetariano', labelEn: 'Vegetarian', schemaDiet: 'https://schema.org/VegetarianDiet' },
  { id: 'vegan', emoji: '🌿', labelEs: 'Vegano', labelEn: 'Vegan', schemaDiet: 'https://schema.org/VeganDiet' },
  { id: 'gluten_free', emoji: '🚫', labelEs: 'Sin gluten', labelEn: 'Gluten-free', schemaDiet: 'https://schema.org/GlutenFreeDiet' },
  { id: 'dairy_free', emoji: '🥛', labelEs: 'Sin lácteos', labelEn: 'Dairy-free', schemaDiet: 'https://schema.org/LowLactoseDiet' },
  { id: 'spicy', emoji: '🌶️', labelEs: 'Picante', labelEn: 'Spicy' },
  { id: 'contains_nuts', emoji: '🥜', labelEs: 'Contiene nueces', labelEn: 'Contains nuts' },
  { id: 'keto', emoji: '🥑', labelEs: 'Keto', labelEn: 'Keto' },
  { id: 'organic', emoji: '🍃', labelEs: 'Orgánico', labelEn: 'Organic' },
  { id: 'halal', emoji: '☪️', labelEs: 'Halal', labelEn: 'Halal', schemaDiet: 'https://schema.org/HalalDiet' },
  { id: 'kosher', emoji: '✡️', labelEs: 'Kosher', labelEn: 'Kosher', schemaDiet: 'https://schema.org/KosherDiet' },
];

export function getTagConfig(id: DietaryTag): DietaryTagConfig | undefined {
  return DIETARY_TAGS.find((t) => t.id === id);
}

export function getTagLabel(id: DietaryTag, locale: 'es' | 'en' = 'es'): string {
  const tag = getTagConfig(id);
  return tag ? (locale === 'en' ? tag.labelEn : tag.labelEs) : id;
}
