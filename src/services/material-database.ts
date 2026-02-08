import { Material, MaterialCategory, MaterialEquivalence, UnitConversion } from '../types';

export const MATERIAL_DATABASE: Material[] = [
  {
    id: 'psl',
    name: 'PSL (Parallel Strand Lumber)',
    category: MaterialCategory.LUMBER,
    properties: { engineered: true, strength: 'high' },
    equivalents: ['lvl', 'solid-lumber']
  },
  {
    id: 'lvl',
    name: 'LVL (Laminated Veneer Lumber)',
    category: MaterialCategory.LUMBER,
    properties: { engineered: true, strength: 'high' },
    equivalents: ['psl', 'solid-lumber']
  },
  {
    id: 'solid-lumber',
    name: 'Solid Lumber',
    category: MaterialCategory.LUMBER,
    properties: { engineered: false, strength: 'medium' },
    equivalents: ['psl', 'lvl']
  },
  {
    id: 'concrete-3000',
    name: '3000 PSI Concrete',
    category: MaterialCategory.CONCRETE,
    properties: { psi: 3000 },
    equivalents: ['concrete-4000']
  },
  {
    id: 'concrete-4000',
    name: '4000 PSI Concrete',
    category: MaterialCategory.CONCRETE,
    properties: { psi: 4000 },
    equivalents: ['concrete-3000', 'concrete-5000']
  },
  {
    id: 'concrete-5000',
    name: '5000 PSI Concrete',
    category: MaterialCategory.CONCRETE,
    properties: { psi: 5000 },
    equivalents: ['concrete-4000']
  }
];

export const EQUIVALENCE_RULES: MaterialEquivalence[] = [
  {
    from: 'psl',
    to: 'lvl',
    conversionFactor: 1.0,
    conditions: 'Similar load capacity'
  },
  {
    from: 'psl',
    to: 'solid-lumber',
    conversionFactor: 1.2,
    conditions: 'Solid lumber needs 20% more depth'
  },
  {
    from: 'concrete-3000',
    to: 'concrete-4000',
    conversionFactor: 1.0,
    conditions: 'Higher strength, same volume'
  }
];

export const UNIT_CONVERSIONS: UnitConversion[] = [
  { fromUnit: 'board feet', toUnit: 'linear feet', conversionFactor: 12 },
  { fromUnit: 'linear feet', toUnit: 'board feet', conversionFactor: 1/12 },
  { fromUnit: 'cubic yards', toUnit: 'cubic feet', conversionFactor: 27 },
  { fromUnit: 'cubic feet', toUnit: 'cubic yards', conversionFactor: 1/27 },
  { fromUnit: 'square feet', toUnit: 'square yards', conversionFactor: 1/9 },
  { fromUnit: 'square yards', toUnit: 'square feet', conversionFactor: 9 }
];

export const STOCK_SIZES: Record<string, number[]> = {
  'lumber': [8, 10, 12, 14, 16, 18, 20], // feet
  'rebar': [20, 40, 60], // feet
  'pipe': [10, 20, 21], // feet
  'drywall': [8, 10, 12] // feet
};
