import { ScheduleStore } from "../storage/schedule-store";

export interface QuerySchedulesParams {
  documentId?: string;
  scheduleType?: string;
  mark?: string;
}

export class ScheduleQueryService {
  constructor(private store: ScheduleStore) {}

  querySchedules(params: QuerySchedulesParams) {
    const { documentId, scheduleType, mark } = params;

    if (mark) {
      const entry = this.store.findEntryByMark(mark);
      if (!entry) {
        return {
          found: false,
          message: `No schedule entry found for mark: ${mark}`
        };
      }

      const schedule = this.store.getAllSchedules().find(s => s.id === entry.scheduleId);
      
      return {
        found: true,
        entry,
        schedule,
        data: entry.data
      };
    }

    if (documentId) {
      const schedules = this.store.getSchedulesByDocument(documentId);
      return {
        found: schedules.length > 0,
        count: schedules.length,
        schedules
      };
    }

    if (scheduleType) {
      const schedules = this.store.getSchedulesByType(scheduleType);
      const allEntries = schedules.flatMap(s => 
        this.store.getEntries(s.id).map(e => ({
          ...e,
          scheduleType: s.scheduleType,
          pageNumber: s.pageNumber
        }))
      );

      return {
        found: schedules.length > 0,
        count: schedules.length,
        totalEntries: allEntries.length,
        schedules,
        entries: allEntries
      };
    }

    // Return all
    const allSchedules = this.store.getAllSchedules();
    return {
      found: allSchedules.length > 0,
      count: allSchedules.length,
      schedules: allSchedules,
      stats: this.store.getStats()
    };
  }

  getScheduleEntry(mark: string) {
    return this.store.findEntryByMark(mark);
  }

  getSchedulesByType(type: string) {
    return this.store.getSchedulesByType(type);
  }

  getStats() {
    return this.store.getStats();
  }
}
