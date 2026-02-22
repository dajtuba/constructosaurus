/**
 * Simple In-Memory Database for Validation Testing
 * Bypasses vector search issues for testing purposes
 */

export interface SimpleMemberRecord {
  designation: string;
  shell_set_spec: string;
  shell_set_sheet: string;
  shell_set_location: string;
  structural_spec: string;
  structural_page: number;
  forteweb_spec: string;
  forteweb_page: number;
  has_conflict: boolean;
  member_type: string;
}

export interface SimpleSheetRecord {
  name: string;
  page_number: number;
  sheet_type: string;
  image_path: string;
  member_count: number;
}

export interface SimpleConflictRecord {
  id: string;
  designation: string;
  conflict_type: string;
  shell_set_value: string;
  forteweb_value: string;
  severity: string;
}

export class SimpleMemberDatabase {
  private members: SimpleMemberRecord[] = [];
  private sheets: SimpleSheetRecord[] = [];
  private conflicts: SimpleConflictRecord[] = [];

  async initialize(): Promise<void> {
    // No-op for in-memory database
  }

  async addMember(member: SimpleMemberRecord): Promise<void> {
    this.members.push(member);
  }

  async addSheet(sheet: SimpleSheetRecord): Promise<void> {
    this.sheets.push(sheet);
  }

  async addConflict(conflict: SimpleConflictRecord): Promise<void> {
    this.conflicts.push(conflict);
  }

  async getMember(designation: string): Promise<SimpleMemberRecord | null> {
    return this.members.find(m => m.designation === designation) || null;
  }

  async getMembersBySheet(sheetName: string): Promise<SimpleMemberRecord[]> {
    return this.members.filter(m => m.shell_set_sheet === sheetName);
  }

  async getMembersByType(memberType: string): Promise<SimpleMemberRecord[]> {
    return this.members.filter(m => m.member_type === memberType);
  }

  async getSheet(name: string): Promise<SimpleSheetRecord | null> {
    return this.sheets.find(s => s.name === name) || null;
  }

  async getConflicts(): Promise<SimpleConflictRecord[]> {
    return this.conflicts;
  }

  async getAllSheets(): Promise<SimpleSheetRecord[]> {
    return this.sheets;
  }

  async searchMembers(query: string): Promise<SimpleMemberRecord[]> {
    const lowerQuery = query.toLowerCase();
    return this.members.filter(m => 
      m.designation.toLowerCase().includes(lowerQuery) ||
      m.shell_set_spec.toLowerCase().includes(lowerQuery) ||
      m.member_type.toLowerCase().includes(lowerQuery)
    );
  }
}