// Enhanced sheet type classification for construction documents
export interface SheetClassification {
  sheetId: string;
  sheetType: SheetType;
  contentType: ContentType;
  priority: number;
}

export enum SheetType {
  BUILDING_ASSEMBLIES = 'building_assemblies',
  FLOOR_PLAN = 'floor_plan',
  ROOF_PLAN = 'roof_plan',
  DETAIL = 'detail',
  MATERIAL_SCHEDULE = 'material_schedule',
  STRUCTURAL = 'structural',
  SPECIFICATION = 'specification'
}

export enum ContentType {
  QUANTITY_TAKEOFF_PRIMARY = 'quantity_takeoff_primary',
  SPECIFICATIONS = 'specifications',
  INSTALLATION_DETAILS = 'installation_details',
  CALCULATIONS = 'calculations'
}

export class SheetClassifier {
  classifySheet(sheetNumber: string, text: string): SheetClassification {
    const upper = text.toUpperCase();
    
    // A101 = Building Assemblies
    if (/A101|BUILDING ASSEMBL/i.test(sheetNumber + text)) {
      return {
        sheetId: sheetNumber,
        sheetType: SheetType.BUILDING_ASSEMBLIES,
        contentType: ContentType.SPECIFICATIONS,
        priority: 90
      };
    }
    
    // A2xx = Floor Plans
    if (/A2\d{2}|FLOOR PLAN|GROUND LEVEL|FIRST FLOOR/i.test(sheetNumber + text)) {
      return {
        sheetId: sheetNumber,
        sheetType: SheetType.FLOOR_PLAN,
        contentType: ContentType.QUANTITY_TAKEOFF_PRIMARY,
        priority: 100
      };
    }
    
    // A203 = Roof Plan
    if (/A203|ROOF PLAN/i.test(sheetNumber + text)) {
      return {
        sheetId: sheetNumber,
        sheetType: SheetType.ROOF_PLAN,
        contentType: ContentType.QUANTITY_TAKEOFF_PRIMARY,
        priority: 95
      };
    }
    
    // A6xx = Details
    if (/A6\d{2}|DETAIL/i.test(sheetNumber + text)) {
      return {
        sheetId: sheetNumber,
        sheetType: SheetType.DETAIL,
        contentType: ContentType.INSTALLATION_DETAILS,
        priority: 60
      };
    }
    
    // SCH-8 = Material Schedule
    if (/SCH-8|MATERIAL SCHEDULE/i.test(sheetNumber + text)) {
      return {
        sheetId: sheetNumber,
        sheetType: SheetType.MATERIAL_SCHEDULE,
        contentType: ContentType.SPECIFICATIONS,
        priority: 85
      };
    }
    
    // S2.x = Structural
    if (/S2\.\d+|STRUCTURAL/i.test(sheetNumber + text)) {
      return {
        sheetId: sheetNumber,
        sheetType: SheetType.STRUCTURAL,
        contentType: ContentType.CALCULATIONS,
        priority: 20
      };
    }
    
    return {
      sheetId: sheetNumber,
      sheetType: SheetType.SPECIFICATION,
      contentType: ContentType.SPECIFICATIONS,
      priority: 50
    };
  }
  
  getPriorityForQuery(queryType: string, sheetType: SheetType): number {
    const priorities: Record<string, Record<SheetType, number>> = {
      quantity_takeoff: {
        [SheetType.FLOOR_PLAN]: 100,
        [SheetType.BUILDING_ASSEMBLIES]: 90,
        [SheetType.MATERIAL_SCHEDULE]: 85,
        [SheetType.ROOF_PLAN]: 80,
        [SheetType.DETAIL]: 60,
        [SheetType.STRUCTURAL]: 20,
        [SheetType.SPECIFICATION]: 50
      },
      specifications: {
        [SheetType.MATERIAL_SCHEDULE]: 100,
        [SheetType.BUILDING_ASSEMBLIES]: 95,
        [SheetType.SPECIFICATION]: 90,
        [SheetType.FLOOR_PLAN]: 50,
        [SheetType.DETAIL]: 60,
        [SheetType.ROOF_PLAN]: 50,
        [SheetType.STRUCTURAL]: 30
      },
      details: {
        [SheetType.DETAIL]: 100,
        [SheetType.BUILDING_ASSEMBLIES]: 70,
        [SheetType.FLOOR_PLAN]: 40,
        [SheetType.MATERIAL_SCHEDULE]: 50,
        [SheetType.ROOF_PLAN]: 40,
        [SheetType.STRUCTURAL]: 30,
        [SheetType.SPECIFICATION]: 40
      },
      dimensions: {
        [SheetType.FLOOR_PLAN]: 100,
        [SheetType.ROOF_PLAN]: 95,
        [SheetType.DETAIL]: 50,
        [SheetType.BUILDING_ASSEMBLIES]: 30,
        [SheetType.MATERIAL_SCHEDULE]: 20,
        [SheetType.STRUCTURAL]: 40,
        [SheetType.SPECIFICATION]: 10
      }
    };
    
    return priorities[queryType]?.[sheetType] || 50;
  }
}
