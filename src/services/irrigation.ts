import { getDB } from './db';

// FAO-56 Crop Coefficients
export const CROP_KC_VALUES: Record<string, Record<string, number>> = {
  'Tomato': {
    'Seedling': 0.6,
    'Vegetative': 0.8,
    'Flowering': 1.15,
    'Fruiting': 0.8,
  },
  'Capsicum': {
    'Seedling': 0.6,
    'Vegetative': 0.7,
    'Flowering': 1.05,
    'Fruiting': 0.85,
  },
  'Cucumber': {
    'Seedling': 0.5,
    'Vegetative': 0.7,
    'Flowering': 1.0,
    'Fruiting': 0.75,
  }
};

export async function fetchMockET0(): Promise<number> {
  // Simulate network request
  await new Promise(r => setTimeout(r, 500));
  return Number((4.5 + Math.random()).toFixed(2)); // Mock ET0 value in mm/day
}

export async function getDailyET0(): Promise<number> {
  const db = await getDB();
  if (!db) return await fetchMockET0();

  const todayStr = new Date().toISOString().split('T')[0];
  const config = await db.get('config', 'et0_cache');

  if (config && config.date === todayStr) {
    return config.value;
  }

  const et0 = await fetchMockET0();
  await db.put('config', { id: 'et0_cache', date: todayStr, value: et0 });
  return et0;
}

export function calculateIrrigationNeed(et0: number, crop: string, stage: string, area_m2: number): number {
  const kc = CROP_KC_VALUES[crop]?.[stage] || 1.0;
  const cropWaterRequirement = et0 * kc; // mm/day
  // Liters = mm * m2
  return Number((cropWaterRequirement * area_m2).toFixed(2));
}
