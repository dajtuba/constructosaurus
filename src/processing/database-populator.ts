import { MemberDatabase } from '../storage/member-database';
import { EmbeddingService } from '../embeddings/embedding-service';

interface ProcessedSheet {
  sheet: string;
  type: string;
  data: any;
  cross_references: string[];
}

export class DatabasePopulator {
  private db: MemberDatabase;

  constructor(dbPath: string) {
    const embedService = new EmbeddingService();
    this.db = new MemberDatabase(dbPath, embedService);
  }

  async initialize() {
    await this.db.initialize();
  }

  async populateFromSheets(sheets: ProcessedSheet[]): Promise<void> {
    console.log('\n📊 Populating database with multi-sheet data...');

    // Add sheet records first
    for (const sheet of sheets) {
      await this.addSheetRecord(sheet);
    }

    // Add member records from framing sheets
    for (const sheet of sheets) {
      if (sheet.type === 'floor_framing' || sheet.type === 'roof_framing') {
        await this.addMembersFromFramingSheet(sheet);
      }
    }

    // Add schedule records
    for (const sheet of sheets) {
      if (sheet.type === 'schedules') {
        await this.addScheduleRecords(sheet);
      }
    }

    // Add detail records
    for (const sheet of sheets) {
      if (sheet.type === 'details') {
        await this.addDetailRecords(sheet);
      }
    }

    console.log('✅ Database population complete');
  }

  private async addSheetRecord(sheet: ProcessedSheet): Promise<void> {
    const memberCount = this.countMembers(sheet);
    
    await this.db.addSheet({
      name: sheet.sheet,
      page_number: this.getPageNumber(sheet.sheet),
      sheet_type: sheet.type,
      image_path: `/tmp/shell-set-page-${this.getPageNumber(sheet.sheet)}-${this.getPageNumber(sheet.sheet)}.png`,
      member_count: memberCount
    });

    console.log(`  📄 Added sheet: ${sheet.sheet} (${memberCount} members)`);
  }

  private async addMembersFromFramingSheet(sheet: ProcessedSheet): Promise<void> {
    if (!sheet.data.zones) return;

    for (const zone of sheet.data.zones) {
      // Add joists
      for (const joist of zone.joists || []) {
        await this.addMemberRecord({
          designation: this.extractDesignation(joist) || `${sheet.sheet}-${zone.zone}-joist-${Math.random().toString(36).substr(2, 9)}`,
          shell_set_spec: typeof joist === 'string' ? joist : JSON.stringify(joist),
          shell_set_sheet: sheet.sheet,
          shell_set_location: zone.zone,
          member_type: 'joist',
          structural_spec: '',
          structural_page: 0,
          forteweb_spec: '',
          forteweb_page: 0,
          has_conflict: false
        });
      }

      // Add beams
      for (const beam of zone.beams || []) {
        await this.addMemberRecord({
          designation: this.extractDesignation(beam) || `${sheet.sheet}-${zone.zone}-beam-${Math.random().toString(36).substr(2, 9)}`,
          shell_set_spec: typeof beam === 'string' ? beam : JSON.stringify(beam),
          shell_set_sheet: sheet.sheet,
          shell_set_location: zone.zone,
          member_type: 'beam',
          structural_spec: '',
          structural_page: 0,
          forteweb_spec: '',
          forteweb_page: 0,
          has_conflict: false
        });
      }

      // Add other member types...
      for (const memberType of ['plates', 'columns']) {
        for (const member of zone[memberType] || []) {
          await this.addMemberRecord({
            designation: this.extractDesignation(member) || `${sheet.sheet}-${zone.zone}-${memberType}-${Math.random().toString(36).substr(2, 9)}`,
            shell_set_spec: typeof member === 'string' ? member : JSON.stringify(member),
            shell_set_sheet: sheet.sheet,
            shell_set_location: zone.zone,
            member_type: memberType.slice(0, -1), // Remove 's'
            structural_spec: '',
            structural_page: 0,
            forteweb_spec: '',
            forteweb_page: 0,
            has_conflict: false
          });
        }
      }
    }
  }

  private async addScheduleRecords(sheet: ProcessedSheet): Promise<void> {
    // Add schedule entries as special member records
    const scheduleTypes = ['beam_schedule', 'column_schedule', 'footing_schedule'];
    
    for (const scheduleType of scheduleTypes) {
      const schedule = sheet.data[scheduleType];
      if (!schedule || !Array.isArray(schedule)) continue;

      for (let i = 0; i < schedule.length; i++) {
        const entry = schedule[i];
        await this.addMemberRecord({
          designation: `${sheet.sheet}-${scheduleType}-${i}`,
          shell_set_spec: JSON.stringify(entry),
          shell_set_sheet: sheet.sheet,
          shell_set_location: scheduleType,
          member_type: 'schedule_entry',
          structural_spec: '',
          structural_page: 0,
          forteweb_spec: '',
          forteweb_page: 0,
          has_conflict: false
        });
      }
    }
  }

  private async addDetailRecords(sheet: ProcessedSheet): Promise<void> {
    if (!sheet.data.details) return;

    for (const detail of sheet.data.details) {
      await this.addMemberRecord({
        designation: `${sheet.sheet}-detail-${detail.number || detail.id}`,
        shell_set_spec: detail.title || 'Detail',
        shell_set_sheet: sheet.sheet,
        shell_set_location: `detail-${detail.number || detail.id}`,
        member_type: 'detail',
        structural_spec: '',
        structural_page: 0,
        forteweb_spec: '',
        forteweb_page: 0,
        has_conflict: false
      });
    }
  }

  private async addMemberRecord(member: any): Promise<void> {
    await this.db.addMember(member);
  }

  private extractDesignation(spec: any): string | null {
    if (typeof spec !== 'string') {
      return null;
    }
    // Look for D1, D2, D3, etc. in the spec
    const match = spec.match(/\b(D\d+)\b/);
    return match ? match[1] : null;
  }

  private countMembers(sheet: ProcessedSheet): number {
    let count = 0;
    
    if (sheet.data.zones) {
      for (const zone of sheet.data.zones) {
        count += (zone.joists?.length || 0);
        count += (zone.beams?.length || 0);
        count += (zone.plates?.length || 0);
        count += (zone.columns?.length || 0);
      }
    }

    if (sheet.data.details) {
      count += sheet.data.details.length;
    }

    // Count schedule entries
    const scheduleTypes = ['beam_schedule', 'column_schedule', 'footing_schedule'];
    for (const type of scheduleTypes) {
      if (sheet.data[type]) {
        count += sheet.data[type].length;
      }
    }

    return count;
  }

  private getPageNumber(sheetName: string): number {
    const pageMap: { [key: string]: number } = {
      'S2.1': 33,
      'S2.2': 34,
      'S3.0': 35,
      'S4.0': 36
    };
    return pageMap[sheetName] || 0;
  }
}