import { ValidationRule } from '../types';

/**
 * Material-specific validation rules database
 */
export const VALIDATION_RULES: Record<string, ValidationRule[]> = {
  // Concrete
  'concrete': [
    {
      type: 'quantity',
      min: 0.1,
      max: 500,
      message: 'Typical range: 10-500 CY per 1000 sqft building'
    }
  ],
  
  // Lumber
  'lumber': [
    {
      type: 'quantity',
      min: 100,
      max: 15000,
      message: 'Typical range: 5-15 board feet per sqft floor area'
    }
  ],
  
  // Rebar
  'rebar': [
    {
      type: 'quantity',
      min: 10,
      max: 15000,
      message: 'Typical range: 100-150 lbs per cubic yard concrete'
    }
  ],
  
  // Fasteners
  'nails': [
    {
      type: 'quantity',
      min: 1,
      max: 1000,
      message: 'Typical range: 1-2 lbs per board foot lumber'
    }
  ],
  
  'screws': [
    {
      type: 'quantity',
      min: 1,
      max: 5000,
      message: 'Typical range: 32 screws per 4x8 drywall sheet'
    }
  ],
  
  // Drywall
  'drywall': [
    {
      type: 'quantity',
      min: 10,
      max: 10000,
      message: 'Typical range: 2-3 sheets per 100 sqft wall area'
    }
  ],
  
  // Paint
  'paint': [
    {
      type: 'quantity',
      min: 1,
      max: 500,
      message: 'Typical coverage: 350-400 sqft per gallon (2 coats)'
    }
  ],
  
  // Steel
  'steel': [
    {
      type: 'quantity',
      min: 100,
      max: 50000,
      message: 'Verify structural steel quantities'
    }
  ]
};

/**
 * Material ratio validation rules
 */
export const RATIO_RULES = {
  'rebar_to_concrete': {
    material1: 'rebar',
    material2: 'concrete',
    min: 100,
    max: 150,
    unit: 'lbs per CY',
    message: 'Rebar should be 100-150 lbs per cubic yard of concrete'
  },
  
  'fasteners_to_lumber': {
    material1: 'nails',
    material2: 'lumber',
    min: 1,
    max: 2,
    unit: 'lbs per board foot',
    message: 'Fasteners should be 1-2 lbs per board foot of lumber'
  },
  
  'joint_compound_to_drywall': {
    material1: 'joint compound',
    material2: 'drywall',
    min: 0.1,
    max: 0.15,
    unit: 'lbs per sqft',
    message: 'Joint compound should be 1 lb per 8 sqft drywall'
  }
};
