import { ScheduleStore } from "../storage/schedule-store";

export interface MaterialQuantity {
  material: string;
  quantity: number;
  unit: string;
  source: string[];
  wasteFactorApplied: number;
}

export interface SupplyList {
  materials: MaterialQuantity[];
  totalItems: number;
  documentSources: string[];
}

export class QuantityCalculator {
  private scheduleStore: ScheduleStore;

  constructor(scheduleStorePath: string) {
    this.scheduleStore = new ScheduleStore(scheduleStorePath);
  }

  async generateSupplyList(documentId?: string): Promise<SupplyList> {
    const schedules = documentId 
      ? this.scheduleStore.getSchedulesByDocument(documentId)
      : this.scheduleStore.getAllSchedules();

    const materials = new Map<string, MaterialQuantity>();

    for (const schedule of schedules) {
      const entries = this.scheduleStore.getEntries(schedule.id);
      
      for (const entry of entries) {
        this.processEntry(entry, schedule, materials);
      }
    }

    return {
      materials: Array.from(materials.values()),
      totalItems: materials.size,
      documentSources: [...new Set(schedules.map(s => s.documentId))]
    };
  }

  private processEntry(
    entry: any,
    schedule: any,
    materials: Map<string, MaterialQuantity>
  ): void {
    const type = schedule.scheduleType;

    if (type === 'footing_schedule') {
      this.processFooting(entry, materials);
    } else if (type === 'door_schedule' || type === 'window_schedule') {
      this.processDoorWindow(entry, type, materials);
    } else if (type === 'verification_table' || type === 'load_capacity_table') {
      this.processStructural(entry, materials);
    }
  }

  private processFooting(entry: any, materials: Map<string, MaterialQuantity>): void {
    // Concrete
    if (entry.data.width && entry.data.length && entry.data.depth) {
      const volume = this.calculateVolume(
        entry.data.width,
        entry.data.length,
        entry.data.depth
      );
      
      if (volume > 0) {
        const key = `concrete_${entry.data.concreteStrength || '3000'}psi`;
        this.addMaterial(materials, key, volume, 'cubic_yards', entry.mark, 1.1);
      }
    }

    // Rebar
    if (entry.data.rebar) {
      const rebarKey = `rebar_${entry.data.rebar}`;
      this.addMaterial(materials, rebarKey, 1, 'linear_feet', entry.mark, 1.15);
    }
  }

  private processDoorWindow(entry: any, type: string, materials: Map<string, MaterialQuantity>): void {
    const item = type === 'door_schedule' ? 'door' : 'window';
    const size = entry.data.width && entry.data.height 
      ? `${entry.data.width}x${entry.data.height}`
      : 'standard';
    
    const key = `${item}_${size}`;
    this.addMaterial(materials, key, 1, 'each', entry.mark, 1.05);
  }

  private processStructural(entry: any, materials: Map<string, MaterialQuantity>): void {
    if (entry.data.material && entry.data.size) {
      const key = `${entry.data.material}_${entry.data.size}`.replace(/[^a-zA-Z0-9_]/g, '_');
      const length = this.parseLength(entry.data.span || '12');
      this.addMaterial(materials, key, length, 'linear_feet', entry.mark, 1.1);
    }
  }

  private addMaterial(
    materials: Map<string, MaterialQuantity>,
    key: string,
    quantity: number,
    unit: string,
    source: string,
    wasteFactor: number
  ): void {
    const existing = materials.get(key);
    const adjustedQty = quantity * wasteFactor;

    if (existing) {
      existing.quantity += adjustedQty;
      existing.source.push(source);
    } else {
      materials.set(key, {
        material: key,
        quantity: adjustedQty,
        unit,
        source: [source],
        wasteFactorApplied: wasteFactor
      });
    }
  }

  private calculateVolume(width: number, length: number, depth: number): number {
    // Convert to cubic yards
    const cubicFeet = (width / 12) * (length / 12) * (depth / 12);
    return cubicFeet / 27;
  }

  private parseLength(value: string | number): number {
    if (typeof value === 'number') return value;
    
    const match = value.match(/(\d+)(?:'-(\d+)"?)?/);
    if (match) {
      const feet = parseInt(match[1]) || 0;
      const inches = parseInt(match[2]) || 0;
      return feet + inches / 12;
    }
    return 0;
  }
}
