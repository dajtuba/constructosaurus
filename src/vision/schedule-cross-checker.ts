export interface ScheduleEntry {
  mark: string;
  quantity?: number;
  size?: string;
  length?: string;
  [key: string]: any;
}

export interface CalculatedQuantity {
  item: string;
  calculatedQty: number;
  unit: string;
  source: string;
}

export interface QuantityDiscrepancy {
  item: string;
  scheduleQty: number;
  calculatedQty: number;
  difference: number;
  percentDifference: number;
  severity: 'minor' | 'moderate' | 'major';
  source: string;
}

export class ScheduleCrossChecker {
  private readonly MINOR_THRESHOLD = 5; // 5% difference
  private readonly MODERATE_THRESHOLD = 20; // 20% difference

  /**
   * Compare calculated quantities against schedule totals
   */
  compareQuantities(
    scheduleEntries: ScheduleEntry[],
    calculatedQuantities: CalculatedQuantity[]
  ): QuantityDiscrepancy[] {
    const discrepancies: QuantityDiscrepancy[] = [];

    // Group schedule entries by item/mark
    const scheduleMap = this.groupScheduleByItem(scheduleEntries);
    
    // Group calculated quantities by item
    const calculatedMap = this.groupCalculatedByItem(calculatedQuantities);

    // Check each calculated quantity against schedule
    for (const item of Array.from(calculatedMap.keys())) {
      const calculated = calculatedMap.get(item)!;
      const scheduled = scheduleMap.get(item);
      
      if (scheduled) {
        const discrepancy = this.calculateDiscrepancy(item, scheduled, calculated);
        if (discrepancy.percentDifference > this.MINOR_THRESHOLD) {
          discrepancies.push(discrepancy);
        }
      }
    }

    // Check for items in schedule but not calculated
    for (const item of Array.from(scheduleMap.keys())) {
      const scheduled = scheduleMap.get(item)!;
      if (!calculatedMap.has(item)) {
        discrepancies.push({
          item,
          scheduleQty: scheduled.totalQty,
          calculatedQty: 0,
          difference: -scheduled.totalQty,
          percentDifference: 100,
          severity: 'major',
          source: 'missing_from_calculation'
        });
      }
    }

    return discrepancies.sort((a, b) => b.percentDifference - a.percentDifference);
  }

  private groupScheduleByItem(entries: ScheduleEntry[]): Map<string, { totalQty: number; entries: ScheduleEntry[] }> {
    const grouped = new Map<string, { totalQty: number; entries: ScheduleEntry[] }>();

    for (const entry of entries) {
      const item = this.normalizeItemName(entry.mark || entry.size || 'unknown');
      const qty = this.extractQuantity(entry);
      
      if (!grouped.has(item)) {
        grouped.set(item, { totalQty: 0, entries: [] });
      }
      
      const group = grouped.get(item)!;
      group.totalQty += qty;
      group.entries.push(entry);
    }

    return grouped;
  }

  private groupCalculatedByItem(quantities: CalculatedQuantity[]): Map<string, CalculatedQuantity> {
    const grouped = new Map<string, CalculatedQuantity>();

    for (const qty of quantities) {
      const item = this.normalizeItemName(qty.item);
      
      if (grouped.has(item)) {
        // Combine quantities for same item
        const existing = grouped.get(item)!;
        existing.calculatedQty += qty.calculatedQty;
      } else {
        grouped.set(item, { ...qty });
      }
    }

    return grouped;
  }

  private calculateDiscrepancy(
    item: string,
    scheduled: { totalQty: number; entries: ScheduleEntry[] },
    calculated: CalculatedQuantity
  ): QuantityDiscrepancy {
    const difference = calculated.calculatedQty - scheduled.totalQty;
    const percentDifference = Math.abs(difference) / scheduled.totalQty * 100;
    
    let severity: 'minor' | 'moderate' | 'major';
    if (percentDifference <= this.MINOR_THRESHOLD) {
      severity = 'minor';
    } else if (percentDifference <= this.MODERATE_THRESHOLD) {
      severity = 'moderate';
    } else {
      severity = 'major';
    }

    return {
      item,
      scheduleQty: scheduled.totalQty,
      calculatedQty: calculated.calculatedQty,
      difference,
      percentDifference,
      severity,
      source: calculated.source
    };
  }

  private extractQuantity(entry: ScheduleEntry): number {
    // Try different quantity field names
    const qtyFields = ['quantity', 'qty', 'count', 'no', 'pieces'];
    
    for (const field of qtyFields) {
      if (entry[field] !== undefined) {
        const qty = typeof entry[field] === 'number' ? entry[field] : parseInt(entry[field]);
        if (!isNaN(qty) && qty > 0) {
          return qty;
        }
      }
    }
    
    // Default to 1 if no quantity found
    return 1;
  }

  private normalizeItemName(item: string): string {
    return item
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^\w\d]/g, '');
  }

  /**
   * Generate summary report of discrepancies
   */
  generateDiscrepancyReport(discrepancies: QuantityDiscrepancy[]): string {
    if (discrepancies.length === 0) {
      return "✅ All quantities match within acceptable tolerance (±5%)";
    }

    const major = discrepancies.filter(d => d.severity === 'major');
    const moderate = discrepancies.filter(d => d.severity === 'moderate');
    const minor = discrepancies.filter(d => d.severity === 'minor');

    let report = `📊 Quantity Discrepancy Report\n`;
    report += `Total discrepancies: ${discrepancies.length}\n`;
    report += `Major (>20%): ${major.length}, Moderate (5-20%): ${moderate.length}, Minor (<5%): ${minor.length}\n\n`;

    if (major.length > 0) {
      report += `🚨 MAJOR DISCREPANCIES (>20%):\n`;
      for (const d of major) {
        report += `  ${d.item}: Schedule=${d.scheduleQty}, Calculated=${d.calculatedQty} (${d.percentDifference.toFixed(1)}% diff)\n`;
      }
      report += '\n';
    }

    if (moderate.length > 0) {
      report += `⚠️  MODERATE DISCREPANCIES (5-20%):\n`;
      for (const d of moderate) {
        report += `  ${d.item}: Schedule=${d.scheduleQty}, Calculated=${d.calculatedQty} (${d.percentDifference.toFixed(1)}% diff)\n`;
      }
      report += '\n';
    }

    return report;
  }

  /**
   * Flag discrepancies above threshold
   */
  flagSignificantDiscrepancies(discrepancies: QuantityDiscrepancy[], threshold: number = 20): QuantityDiscrepancy[] {
    return discrepancies.filter(d => d.percentDifference > threshold);
  }
}