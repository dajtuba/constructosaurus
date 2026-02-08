export interface ConstructionMetadata {
  project: string;
  discipline: string;
  drawingType: string;
  drawingNumber: string;
  materials: string;
  components: string;
  pageNumber?: number;
  sheetNumber?: string;
  hasSchedules?: boolean;
  documentType?: string;
  source?: string;
}

export interface ProcessedDocument {
  id: string;
  text: string;
  project: string;
  discipline: string;
  drawingType: string;
  drawingNumber: string;
  materials: string;
  components: string;
  pageNumber?: number;
}

export interface Sheet {
  id: string;
  pageNumber: number;
  text: string;
  metadata: ConstructionMetadata;
  vector?: number[];
}

export interface Schedule {
  id: string;
  type: string;
  headers: string[];
  rows: string[][];
  source: string;
  pageNumber?: number;
}

export interface ScheduleMetadata {
  id: string;
  documentId: string;
  scheduleType: string;
  pageNumber: number;
  extractionMethod: string;
  extractionConfidence?: number;
  rowCount: number;
  columnCount: number;
}

export interface ScheduleEntry {
  id: string;
  scheduleId: string;
  mark: string;
  data: Record<string, any>;
  rowNumber: number;
  // Context fields
  phase?: string;
  building?: string;
  floor?: string;
  room?: string;
  gridRef?: string;
  conditionals?: string;
  sequencing?: string;
}

export interface StructuralMember {
  span?: string;
  status?: 'Passed' | 'Failed';
  ratio?: string;
  size?: string;
  material?: string;
  type?: string;
}

export interface LoadCapacity {
  dimension?: string;
  capacity?: number;
  height?: string;
  material?: string;
}

export interface Dimension {
  id: string;
  documentId: string;
  pageNumber: number;
  valueFeet: number;
  originalNotation: string;
  locationDescription?: string;
  gridReference?: string;
  orientation?: string;
  elementReference?: string;
  confidence?: number;
  extractionMethod: string;
}

export interface SearchParams {
  query: string;
  discipline?: string;
  drawingType?: string;
  project?: string;
  top_k?: number;
}

export interface SearchResult {
  id: string;
  text: string;
  project: string;
  discipline: string;
  drawingType: string;
  drawingNumber: string;
  score: number;
}

export const CONSTRUCTION_TAXONOMY = {
  disciplines: ["Structural", "Architectural", "Civil", "Mechanical", "Electrical", "Plumbing"],
  drawingTypes: ["Plan", "Elevation", "Section", "Detail", "Schedule", "Specification"],
  components: ["Foundation", "Footing", "Column", "Beam", "Slab", "Wall", "Roof", "Connection"],
  materials: ["Concrete", "Steel", "Wood", "Masonry"],
};

// Phase and Location Context Types

export enum Phase {
  FOUNDATION = "foundation",
  FRAMING = "framing",
  MEP = "mep",
  FINISHES = "finishes",
  SITEWORK = "sitework"
}

export interface Location {
  building?: string;
  floor?: string;
  room?: string;
  gridRef?: string;
  zone?: string;
}

export interface ConditionalRule {
  condition: string;
  applies: boolean;
}

export interface MaterialContext {
  phase?: Phase;
  location?: Location;
  conditionals?: ConditionalRule[];
  sequencing?: string;
}

export interface ContextualMaterial {
  name: string;
  quantity?: number;
  unit?: string;
  specification?: string;
  context?: MaterialContext;
  source: string;
}

// Validation Types

export enum ValidationStatus {
  VALID = "valid",
  WARNING = "warning",
  ERROR = "error"
}

export interface ValidationRule {
  type: string;
  min?: number;
  max?: number;
  ratio?: { material: string; min: number; max: number };
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  status: ValidationStatus;
  warnings: string[];
  errors: string[];
  confidence?: number;
}
