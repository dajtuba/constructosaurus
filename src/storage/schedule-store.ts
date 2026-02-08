import * as fs from 'fs';
import * as path from 'path';
import { ScheduleMetadata, ScheduleEntry } from '../types';

export class ScheduleStore {
  private schedulesPath: string;
  private entriesPath: string;
  private schedules: Map<string, ScheduleMetadata> = new Map();
  private entries: Map<string, ScheduleEntry[]> = new Map();

  constructor(private dataPath: string) {
    this.schedulesPath = path.join(dataPath, 'schedules.json');
    this.entriesPath = path.join(dataPath, 'schedule_entries.json');
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.schedulesPath)) {
        const data = JSON.parse(fs.readFileSync(this.schedulesPath, 'utf-8'));
        this.schedules = new Map(Object.entries(data));
      }
      if (fs.existsSync(this.entriesPath)) {
        const data = JSON.parse(fs.readFileSync(this.entriesPath, 'utf-8'));
        this.entries = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  }

  private save() {
    const dir = path.dirname(this.schedulesPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(
      this.schedulesPath,
      JSON.stringify(Object.fromEntries(this.schedules), null, 2)
    );
    fs.writeFileSync(
      this.entriesPath,
      JSON.stringify(Object.fromEntries(this.entries), null, 2)
    );
  }

  addSchedule(schedule: ScheduleMetadata): string {
    this.schedules.set(schedule.id, schedule);
    this.save();
    return schedule.id;
  }

  addEntry(entry: ScheduleEntry) {
    const entries = this.entries.get(entry.scheduleId) || [];
    entries.push(entry);
    this.entries.set(entry.scheduleId, entries);
    this.save();
  }

  getSchedulesByDocument(documentId: string): ScheduleMetadata[] {
    return Array.from(this.schedules.values())
      .filter(s => s.documentId === documentId);
  }

  getSchedulesByType(scheduleType: string): ScheduleMetadata[] {
    return Array.from(this.schedules.values())
      .filter(s => s.scheduleType === scheduleType);
  }

  getEntries(scheduleId: string): ScheduleEntry[] {
    return this.entries.get(scheduleId) || [];
  }

  findEntryByMark(mark: string): ScheduleEntry | undefined {
    for (const entries of this.entries.values()) {
      const found = entries.find(e => e.mark === mark);
      if (found) return found;
    }
    return undefined;
  }

  getAllSchedules(): ScheduleMetadata[] {
    return Array.from(this.schedules.values());
  }

  getStats() {
    const typeCount: Record<string, number> = {};
    this.schedules.forEach(s => {
      typeCount[s.scheduleType] = (typeCount[s.scheduleType] || 0) + 1;
    });

    return {
      totalSchedules: this.schedules.size,
      totalEntries: Array.from(this.entries.values()).reduce((sum, e) => sum + e.length, 0),
      byType: typeCount
    };
  }

  clear() {
    this.schedules.clear();
    this.entries.clear();
    this.save();
  }
}
