import { connect, Connection, Table } from "vectordb";
import { EmbeddingService } from "../embeddings/embedding-service";
import { MemberRecord, SheetRecord, ConflictRecord } from "./member-schema";

/**
 * LanceDB Member Database
 * 
 * Fast queries by designation, sheet, or member type.
 * Stores cross-references between Shell-Set, Structural Calc, and ForteWEB.
 */
export class MemberDatabase {
  private db!: Connection;
  private membersTable!: Table;
  private sheetsTable!: Table;
  private conflictsTable!: Table;

  constructor(
    private dbPath: string,
    private embedService: EmbeddingService
  ) {}

  async initialize() {
    this.db = await connect(this.dbPath);
    await this.createTables();
  }

  private async createTables() {
    // Create members table
    try {
      this.membersTable = await this.db.openTable("members");
    } catch {
      const sampleMember = {
        designation: "D1",
        shell_set_spec: "14\" TJI 560 @ 16\" OC",
        shell_set_sheet: "S2.1",
        shell_set_location: "left bay",
        structural_spec: "14\" TJI 560",
        structural_page: 5,
        forteweb_spec: "2x10 HF No.2 @ 16\" OC",
        forteweb_page: 109,
        has_conflict: true,
        member_type: "joist",
        embedding: new Array(384).fill(0)
      };
      this.membersTable = await this.db.createTable("members", [sampleMember]);
    }

    // Create sheets table
    try {
      this.sheetsTable = await this.db.openTable("sheets");
    } catch {
      const sampleSheet = {
        name: "S2.1",
        page_number: 33,
        sheet_type: "floor_framing",
        image_path: "/tmp/shell-set-page-33.png",
        member_count: 0,
        embedding: new Array(384).fill(0)
      };
      this.sheetsTable = await this.db.createTable("sheets", [sampleSheet]);
    }

    // Create conflicts table
    try {
      this.conflictsTable = await this.db.openTable("conflicts");
    } catch {
      const sampleConflict = {
        id: "conflict-1",
        designation: "D1",
        conflict_type: "spec_mismatch",
        shell_set_value: "14\" TJI 560 @ 16\" OC",
        forteweb_value: "2x10 HF No.2 @ 16\" OC",
        severity: "high",
        embedding: new Array(384).fill(0)
      };
      this.conflictsTable = await this.db.createTable("conflicts", [sampleConflict]);
    }
  }

  // Fast queries by designation
  async getMember(designation: string): Promise<MemberRecord | null> {
    const results = await this.membersTable
      .search(new Array(384).fill(0))
      .filter(`designation = '${designation}'`)
      .limit(1)
      .execute();
    return results.length > 0 ? results[0] as unknown as MemberRecord : null;
  }

  // Fast queries by sheet
  async getMembersBySheet(sheetName: string): Promise<MemberRecord[]> {
    const results = await this.membersTable
      .search(new Array(384).fill(0))
      .filter(`shell_set_sheet = '${sheetName}'`)
      .execute();
    return results as unknown as MemberRecord[];
  }

  // Fast queries by member type
  async getMembersByType(memberType: string): Promise<MemberRecord[]> {
    const results = await this.membersTable
      .search(new Array(384).fill(0))
      .filter(`member_type = '${memberType}'`)
      .execute();
    return results as unknown as MemberRecord[];
  }

  // Add member record
  async addMember(member: Omit<MemberRecord, 'embedding'>): Promise<void> {
    const embedding = await this.embedService.embedQuery(
      `${member.designation} ${member.shell_set_spec} ${member.member_type}`
    );
    await this.membersTable.add([{ ...member, embedding }]);
  }

  // Add sheet record
  async addSheet(sheet: Omit<SheetRecord, 'embedding'>): Promise<void> {
    const embedding = await this.embedService.embedQuery(
      `${sheet.name} ${sheet.sheet_type}`
    );
    await this.sheetsTable.add([{ ...sheet, embedding }]);
  }

  // Add conflict record
  async addConflict(conflict: Omit<ConflictRecord, 'embedding'>): Promise<void> {
    const embedding = await this.embedService.embedQuery(
      `${conflict.designation} ${conflict.conflict_type} ${conflict.shell_set_value}`
    );
    await this.conflictsTable.add([{ ...conflict, embedding }]);
  }

  // Get all conflicts
  async getConflicts(): Promise<ConflictRecord[]> {
    const results = await this.conflictsTable.search(new Array(384).fill(0)).execute();
    return results as unknown as ConflictRecord[];
  }

  // Get sheet info
  async getSheet(name: string): Promise<SheetRecord | null> {
    const results = await this.sheetsTable
      .search(new Array(384).fill(0))
      .filter(`name = '${name}'`)
      .limit(1)
      .execute();
    return results.length > 0 ? results[0] as unknown as SheetRecord : null;
  }
}