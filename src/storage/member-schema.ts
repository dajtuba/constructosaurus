/**
 * LanceDB Schema for Member Cross-Reference Database
 * 
 * Stores member designations (D1, D2, etc.) with cross-document links
 * between Shell-Set, Structural Calc, and ForteWEB documents.
 */

// Member record with cross-document references
export interface MemberRecord {
  designation: string;           // Primary key: D1, D2, D3, etc.
  shell_set_spec: string;       // Shell-Set specification
  shell_set_sheet: string;      // Sheet name (S2.1, S2.2, etc.)
  shell_set_location: string;   // Location description
  structural_spec?: string;     // Structural calc specification
  structural_page?: number;     // Structural calc page number
  forteweb_spec?: string;       // ForteWEB specification
  forteweb_page?: number;       // ForteWEB page number
  has_conflict: boolean;        // True if specs don't match
  member_type: string;          // joist, beam, column, etc.
  embedding: number[];          // Vector embedding for search
}

// Sheet metadata for image references
export interface SheetRecord {
  name: string;                 // Primary key: S2.1, S2.2, etc.
  page_number: number;          // PDF page number
  sheet_type: string;           // floor_framing, roof_framing, details, schedules
  image_path: string;           // Path to extracted PNG
  member_count: number;         // Number of members on sheet
  embedding: number[];          // Vector embedding for search
}

// Conflict tracking for mismatched specifications
export interface ConflictRecord {
  id: string;                   // Primary key: UUID
  designation: string;          // Member designation (D1, D2, etc.)
  conflict_type: string;        // spec_mismatch, missing_forteweb, etc.
  shell_set_value: string;      // Value from Shell-Set
  forteweb_value?: string;      // Value from ForteWEB (if exists)
  severity: string;             // high, medium, low
  embedding: number[];          // Vector embedding for search
}