import { CorrelationService } from '../services/correlation-service';
import { ConflictType, DocumentHierarchy, DocumentRelationType } from '../types';

async function testCorrelation() {
  const service = new CorrelationService();
  
  console.log('🧪 Testing Correlation Service\n');
  
  // Test 1: Track material across documents
  console.log('Test 1: Material Tracking');
  const conflicts = service.trackMaterialAcrossDocuments('Concrete', [
    { id: 'doc1', quantity: 100, spec: '3000 PSI' },
    { id: 'doc2', quantity: 120, spec: '3000 PSI' },
    { id: 'doc3', quantity: 100, spec: '4000 PSI' }
  ]);
  console.assert(conflicts.length === 2, 'Expected 2 conflicts');
  console.log(`✓ Detected ${conflicts.length} conflicts\n`);
  
  // Test 2: Conflict detection
  console.log('Test 2: Conflict Detection');
  const allConflicts = service.detectConflicts();
  console.assert(allConflicts.length > 0, 'Expected conflicts');
  console.log(`✓ Found conflicts: ${allConflicts.map(c => c.type).join(', ')}\n`);
  
  // Test 3: Conflict resolution
  console.log('Test 3: Conflict Resolution');
  service.resolveConflict(0, 'Use specification from addenda');
  const resolved = service.detectConflicts()[0];
  console.assert(resolved.resolution !== undefined, 'Expected resolution');
  console.log(`✓ Resolved conflict: ${resolved.resolution}\n`);
  
  // Test 4: Document hierarchy
  console.log('Test 4: Document Hierarchy');
  const effectiveValue = service.getEffectiveValue([
    { docId: 'drawing', hierarchy: DocumentHierarchy.DRAWING, value: '3000 PSI' },
    { docId: 'spec', hierarchy: DocumentHierarchy.SPECIFICATION, value: '4000 PSI' },
    { docId: 'addenda', hierarchy: DocumentHierarchy.ADDENDA, value: '5000 PSI' }
  ]);
  console.assert(effectiveValue === '5000 PSI', 'Expected addenda value to win');
  console.log(`✓ Effective value (addenda wins): ${effectiveValue}\n`);
  
  // Test 5: Document relationships
  console.log('Test 5: Document Relationships');
  service.addRelationship({
    type: DocumentRelationType.SUPERSEDES,
    fromDocId: 'addenda-1',
    toDocId: 'spec-1',
    date: '2024-01-15'
  });
  const relationships = service.getRelationships('addenda-1');
  console.assert(relationships.length === 1, 'Expected 1 relationship');
  console.log(`✓ Added relationship: ${relationships[0].type}\n`);
  
  console.log('✅ All correlation tests passed!');
}

testCorrelation().catch(console.error);
