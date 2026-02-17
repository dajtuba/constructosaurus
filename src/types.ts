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

export interface ExtractedDimension {
  feet: number;
  inches: number;
  totalInches: number;
  original: string;
  context?: string;
}

export interface AreaCalculation {
  length: ExtractedDimension;
  width: ExtractedDimension;
  squareFeet: number;
  context?: string;
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
  dimensions?: ExtractedDimension[];
  calculatedAreas?: AreaCalculation[];
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

// Derived Material Types

export interface Fastener {
  type: string;
  size: string;
  quantity: number;
  connectionType?: string;
}

export interface Adhesive {
  type: string;
  coverage: number;
  linearFeet: number;
  tubes: number;
}

export interface Finish {
  type: string;
  coverage: number;
  surfaceArea: number;
  gallons: number;
}

export interface TemporaryMaterial {
  type: string;
  quantity: number;
  duration?: string;
}

// Material Intelligence Types

export enum MaterialCategory {
  LUMBER = "lumber",
  CONCRETE = "concrete",
  STEEL = "steel",
  MASONRY = "masonry",
  FINISHES = "finishes",
  MEP = "mep"
}

export interface Material {
  id: string;
  name: string;
  category: MaterialCategory;
  properties: Record<string, any>;
  equivalents: string[];
}

export interface MaterialEquivalence {
  from: string;
  to: string;
  conversionFactor: number;
  conditions?: string;
}

export interface UnitConversion {
  fromUnit: string;
  toUnit: string;
  conversionFactor: number;
}

// Cross-Document Correlation Types

export enum DocumentRelationType {
  SUPERSEDES = "supersedes",
  REFERENCES = "references",
  CONFLICTS = "conflicts"
}

export enum DocumentHierarchy {
  ADDENDA = 1,
  SPECIFICATION = 2,
  DRAWING = 3,
  GENERAL_NOTE = 4
}

export interface DocumentRelationship {
  type: DocumentRelationType;
  fromDocId: string;
  toDocId: string;
  date: string;
}

export interface DocumentVersion {
  id: string;
  version: string;
  date: string;
  status: 'current' | 'superseded';
}

export enum ConflictType {
  QUANTITY_MISMATCH = "quantity_mismatch",
  SPECIFICATION_DIFFERENCE = "specification_difference",
  DIMENSION_CONFLICT = "dimension_conflict",
  SUPERSEDED_REFERENCE = "superseded_reference"
}

export interface Conflict {
  type: ConflictType;
  documents: string[];
  description: string;
  resolution?: string;
  priority: number;
}

// Text Extraction Types

export interface TextQuantity {
  material: string;
  quantity: number;
  unit: string;
  context: string;
  confidence: number;
  source: string;
}

export interface CalloutAnnotation {
  text: string;
  location?: string;
  pageNumber: number;
  extractedQuantity?: TextQuantity;
}

export interface QuantityPattern {
  regex: RegExp;
  parser: (match: RegExpMatchArray) => TextQuantity | null;
  materialType: string;
}
