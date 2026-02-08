# ClaudeHopper MCP Enhancement Plan

**Construction Document Intelligence Platform**

_Version 1.0 - February 2, 2026_

---

## Executive Summary

ClaudeHopper MCP currently provides effective text-based search across construction documents but lacks critical capabilities for structured data extraction, dimensional analysis, and visual element interpretation. This enhancement plan outlines a phased approach to transform it into a production-grade construction document intelligence system capable of automated quantity takeoffs, cross-reference resolution, and comprehensive material extraction.

**Key Goals:**

- Extract and query tabular data (schedules, legends, material lists)
- Parse dimensional information and calculate quantities automatically
- Understand visual elements (symbols, callouts, hatching)
- Resolve cross-references between drawings and specifications
- Enable accurate "how much do I need?" queries

---

## Current State Assessment

### What Works ✓

- ✅ Text extraction from PDFs
- ✅ Vector + keyword hybrid search
- ✅ Basic material identification from text
- ✅ Discipline and drawing type filtering
- ✅ Document ingestion pipeline

### Critical Gaps Identified ⚠️

#### 1. Tabular Data Blindness

**Problem:** Schedules, material lists, and legends in table format are not extracted as structured data.

**Impact:**

- Cannot query specific schedule entries (e.g., "What are the specs for footing F1?")
- Missing 30-50% of quantitative project data
- No access to door/window schedules, rebar schedules, room finish schedules

**Examples of Lost Data:**

- Foundation schedules with mark numbers, dimensions, reinforcement
- Material takeoff tables
- Equipment lists with model numbers and specifications

#### 2. Dimensional Information Loss

**Problem:** Dimension strings and measurements are not parsed or stored as queryable data.

**Impact:**

- Cannot answer "How long is the north wall?"
- Cannot calculate building square footage
- Cannot determine material quantities from dimensions
- Missing grid coordinates and spatial relationships

**Examples of Lost Data:**

- "24'-6"" dimension strings
- "3 @ 16" = 4'-0"" spacing calculations
- Overall building dimensions
- Room areas and volumes

#### 3. Visual/Graphical Element Ignorance

**Problem:** Drawings contain critical information in symbols, callouts, and graphical notation that text extraction misses.

**Impact:**

- Cannot follow detail callouts (e.g., "See Detail 3/S2.1")
- Cannot interpret material hatching patterns
- Cannot identify section cut locations
- Missing keynote references and legends

**Examples of Lost Information:**

- Detail reference bubbles
- Section indicators
- North arrows and scale bars
- Material hatching patterns (concrete vs. masonry vs. earth)
- Grid line labels

#### 4. Schedule & Cross-Reference Resolution

**Problem:** References between drawings and between drawings and specifications are not linked.

**Impact:**

- Information exists but is fragmented
- Cannot navigate from symbol to schedule entry
- Cannot trace element from plan to detail to specification
- Manual cross-referencing still required

**Example Workflow That Fails:**

```
User asks: "What are the requirements for footing F1?"
Should retrieve:
1. Footing schedule entry for F1 (dimensions, rebar)
2. Referenced detail drawing (3/S2.1)
3. Related specification section (03 30 00)
Currently: Only finds text mentions, no structured linkage
```

#### 5. Specification Document Integration

**Problem:** Written specifications (CSI divisions) are not integrated with drawings.

**Impact:**

- Cannot link drawing elements to contractual requirements
- Missing detailed installation procedures
- No access to quality standards and testing criteria
- Cannot find approved product lists

**Missing Connections:**

- Division 03 specs → Concrete drawings
- Product submittals → Equipment schedules
- Installation requirements → Detail drawings

#### 6. Quantity Takeoff Capabilities

**Problem:** No automatic calculation of material quantities from extracted data.

**Impact:**

- Cannot answer "How much concrete do I need?"
- Cannot calculate linear footage of rebar
- Cannot count discrete items (doors, windows, fixtures)
- Manual calculations still required

**Desired Capabilities:**

- Calculate concrete volume from footing dimensions
- Sum rebar lengths based on wall dimensions and spacing
- Count anchor bolts based on spacing requirements
- Calculate area for finishes

---

## Enhanced Architecture Design

### Multi-Modal Processing Pipeline

```
┌──────────────────────────────────────────────────┐
│               PDF Input Document                  │
└──────────────────┬───────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────┐
│        Document Classification Layer              │
│  • Identify sheet type (plan, detail, schedule)   │
│  • Extract metadata (sheet number, title, scale)  │
│  • Determine discipline and revision              │
└──────────────────┬───────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────┐
│         Parallel Processing Streams               │
├──────────────────────────────────────────────────┤
│ Stream 1: Text Extraction (CURRENT)              │
│  • PyMuPDF text extraction                       │
│  • Chunking and embedding                        │
│  • Vector database storage                       │
├──────────────────────────────────────────────────┤
│ Stream 2: Table Extraction (NEW)                 │
│  • pdfplumber table detection                    │
│  • camelot-py for complex tables                 │
│  • Header identification and parsing             │
│  • Structured data storage                       │
├──────────────────────────────────────────────────┤
│ Stream 3: Vision Analysis (NEW)                  │
│  • Claude Vision API for page images             │
│  • Symbol and callout recognition                │
│  • Dimension string extraction                   │
│  • Hatching pattern identification               │
├──────────────────────────────────────────────────┤
│ Stream 4: Dimension Parsing (NEW)                │
│  • Regex patterns for imperial/metric            │
│  • Unit conversion and normalization             │
│  • Compound dimension handling                   │
│  • Grid coordinate extraction                    │
└──────────────────┬───────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────┐
│            Structured Data Store                  │
├──────────────────────────────────────────────────┤
│ • Vector embeddings (existing)                   │
│ • Relational tables for schedules (NEW)          │
│ • Dimension database (NEW)                       │
│ • Graph relationships (NEW)                      │
│ • Specification sections (NEW)                   │
└──────────────────┬───────────────────────────────┘
                   ↓
┌──────────────────────────────────────────────────┐
│         Query & Reasoning Layer                   │
├──────────────────────────────────────────────────┤
│ • Semantic search (existing)                     │
│ • SQL queries for structured data (NEW)          │
│ • Calculation engine (NEW)                       │
│ • Cross-reference resolver (NEW)                 │
│ • Graph traversal for relationships (NEW)        │
└──────────────────────────────────────────────────┘
```

### Enhanced Data Model

#### Current Model

```python
{
    "chunk_id": "uuid",
    "document_id": "S1.0",
    "text": "3000 PSI concrete foundation...",
    "embedding": [0.123, 0.456, ...],
    "metadata": {
        "page": 1,
        "discipline": "Structural"
    }
}
```

#### Proposed Multi-Layer Model

**Layer 1: Document Metadata**

```python
{
    "document_id": "S1.0",
    "sheet_number": "S1.0",
    "title": "Foundation Plan",
    "discipline": "Structural",
    "drawing_type": "Plan",
    "scale": "1/4\" = 1'-0\"",
    "revision": "2024-01-15",
    "revision_description": "Updated footing F3 dimensions",
    "project": "Smith Residence Remodel",
    "architect": "XYZ Architects"
}
```

**Layer 2: Structured Schedules**

```python
{
    "schedule_id": "uuid",
    "document_id": "S1.0",
    "schedule_type": "footing_schedule",
    "location": {"page": 1, "bbox": [100, 200, 400, 500]},
    "entries": [
        {
            "mark": "F1",
            "width": {"value": 16, "unit": "inches"},
            "depth": {"value": 8, "unit": "inches"},
            "rebar_vertical": "#4 @ 16\" O.C.",
            "rebar_horizontal": "#4 @ 18\" O.C.",
            "concrete_strength": "3000 PSI",
            "notes": "Continuous under bearing walls"
        },
        {
            "mark": "F2",
            "width": {"value": 18, "unit": "inches"},
            "depth": {"value": 10, "unit": "inches"},
            "rebar_vertical": "#5 @ 12\" O.C.",
            "rebar_horizontal": "#4 @ 16\" O.C.",
            "concrete_strength": "3000 PSI",
            "notes": "Under columns"
        }
    ]
}
```

**Layer 3: Dimensions**

```python
{
    "dimension_id": "uuid",
    "document_id": "S1.0",
    "dimension_type": "linear",
    "value": 24.5,
    "unit": "feet",
    "original_notation": "24'-6\"",
    "location_description": "North wall overall length",
    "grid_reference": "Between Grid A and Grid D",
    "element_reference": "Foundation wall FW1"
}
```

**Layer 4: Callouts & References**

```python
{
    "callout_id": "uuid",
    "source_document": "S1.0",
    "callout_text": "3/S2.1",
    "callout_type": "detail_reference",
    "target_sheet": "S2.1",
    "target_detail": "3",
    "target_title": "Typical Footing Detail",
    "location": {"page": 1, "bbox": [250, 350, 280, 370]},
    "context": "Referenced at footing F1 location"
}
```

**Layer 5: Calculated Quantities**

```python
{
    "quantity_id": "uuid",
    "document_id": "S1.0",
    "element_type": "footing",
    "element_mark": "F1",
    "calculations": {
        "concrete_volume": {
            "value": 0.74,
            "unit": "cubic_yards",
            "calculation": "(16/12) * (8/12) * 24.5 / 27",
            "source_dimensions": ["F1_width", "F1_depth", "north_wall_length"]
        },
        "rebar_linear_feet": {
            "#4_vertical": 450,
            "#4_horizontal": 380,
            "calculation_method": "spacing_based",
            "includes_lap_allowance": true
        }
    },
    "confidence": 0.95,
    "needs_verification": false
}
```

**Layer 6: Relationship Graph**

```python
{
    "graph": {
        "nodes": [
            {
                "id": "S1.0",
                "type": "sheet",
                "title": "Foundation Plan"
            },
            {
                "id": "S1.0_F1",
                "type": "element",
                "element_type": "footing",
                "mark": "F1"
            },
            {
                "id": "S2.1_detail3",
                "type": "detail",
                "title": "Typical Footing Detail"
            },
            {
                "id": "spec_033000",
                "type": "specification",
                "division": "03",
                "section": "33 00",
                "title": "Cast-in-Place Concrete"
            }
        ],
        "edges": [
            {
                "from": "S1.0_F1",
                "to": "S2.1_detail3",
                "relationship": "references_detail",
                "callout": "3/S2.1"
            },
            {
                "from": "S1.0_F1",
                "to": "spec_033000",
                "relationship": "governed_by_spec",
                "requirement": "concrete_strength"
            }
        ]
    }
}
```

---

## Implementation Roadmap

### Phase 1: Table Extraction (Weeks 1-2)

**Priority: CRITICAL**

#### Objectives

- Extract all tabular data from construction documents
- Parse schedules into queryable structured format
- Support common schedule types (footing, rebar, door, window, room finish)

#### Implementation Steps

**Week 1: Library Integration & Basic Extraction**

1. Add dependencies to `pyproject.toml`:

```toml
   [tool.poetry.dependencies]
   pdfplumber = "^0.11.0"
   camelot-py = "^0.11.0"
   tabula-py = "^2.9.0"
   opencv-python = "^4.9.0"  # For camelot
```

2. Create `table_extractor.py`:

```python
   import pdfplumber
   import camelot
   from typing import List, Dict, Optional

   class TableExtractor:
       """Extract and parse tables from construction documents"""

       def __init__(self, pdf_path: str):
           self.pdf_path = pdf_path
           self.pdfplumber_doc = pdfplumber.open(pdf_path)

       def extract_all_tables(self, page_num: Optional[int] = None) -> List[Dict]:
           """
           Extract all tables from document or specific page
           """
           if page_num is not None:
               return self._extract_page_tables(page_num)

           all_tables = []
           for page in self.pdfplumber_doc.pages:
               tables = self._extract_page_tables(page.page_number)
               all_tables.extend(tables)

           return all_tables

       def _extract_page_tables(self, page_num: int) -> List[Dict]:
           """
           Extract tables from a specific page using multiple methods
           """
           tables = []

           # Method 1: pdfplumber (best for simple tables)
           try:
               page = self.pdfplumber_doc.pages[page_num - 1]
               plumber_tables = page.extract_tables()

               for table in plumber_tables:
                   if self._is_valid_table(table):
                       tables.append({
                           'method': 'pdfplumber',
                           'page': page_num,
                           'data': table,
                           'bbox': self._get_table_bbox(page, table)
                       })
           except Exception as e:
               print(f"pdfplumber failed on page {page_num}: {e}")

           # Method 2: camelot (best for complex tables with lines)
           if not tables:  # Use as fallback
               try:
                   camelot_tables = camelot.read_pdf(
                       self.pdf_path,
                       pages=str(page_num),
                       flavor='lattice'  # Use 'stream' for tables without lines
                   )

                   for table in camelot_tables:
                       if table.parsing_report['accuracy'] > 80:
                           tables.append({
                               'method': 'camelot',
                               'page': page_num,
                               'data': table.df.values.tolist(),
                               'accuracy': table.parsing_report['accuracy']
                           })
               except Exception as e:
                   print(f"camelot failed on page {page_num}: {e}")

           return tables

       def _is_valid_table(self, table: List[List]) -> bool:
           """
           Validate that extracted table has meaningful content
           """
           if not table or len(table) < 2:
               return False

           # Check if table has at least one non-empty cell
           non_empty_cells = sum(
               1 for row in table
               for cell in row
               if cell and str(cell).strip()
           )

           return non_empty_cells > 3

       def classify_table_type(self, table: List[List]) -> str:
           """
           Identify schedule type based on headers
           """
           if not table or not table[0]:
               return "unknown"

           headers = [str(h).lower() for h in table[0] if h]

           # Footing schedule patterns
           if any(term in ' '.join(headers) for term in ['mark', 'footing', 'width', 'depth']):
               return "footing_schedule"

           # Rebar schedule patterns
           if any(term in ' '.join(headers) for term in ['bar mark', 'size', 'length', 'quantity']):
               return "rebar_schedule"

           # Door schedule patterns
           if any(term in ' '.join(headers) for term in ['door', 'frame', 'hardware']):
               return "door_schedule"

           # Window schedule patterns
           if any(term in ' '.join(headers) for term in ['window', 'glazing', 'sash']):
               return "window_schedule"

           # Room finish schedule
           if any(term in ' '.join(headers) for term in ['room', 'floor', 'wall', 'ceiling']):
               return "room_finish_schedule"

           return "general_schedule"
```

**Week 2: Schedule Parsing & Database Integration**

3. Create `schedule_parser.py`:

```python
   from typing import Dict, List, Any
   import re

   class ScheduleParser:
       """Parse construction schedules into structured data"""

       def parse_footing_schedule(self, table: List[List]) -> List[Dict]:
           """
           Parse footing schedule into structured format
           """
           if not table or len(table) < 2:
               return []

           # Identify header row
           headers = self._normalize_headers(table[0])

           # Map common variations to standard names
           header_map = {
               'mark': ['mark', 'ftg mark', 'footing mark', 'id'],
               'width': ['width', 'w', 'footing width'],
               'depth': ['depth', 'd', 'thickness', 't'],
               'rebar_vert': ['vert bars', 'vertical', 'vert rebar', 'vert.'],
               'rebar_horiz': ['horiz bars', 'horizontal', 'horiz rebar', 'horiz.'],
               'concrete': ['concrete', 'conc.', 'fc\''],
               'notes': ['notes', 'remarks', 'comments']
           }

           column_indices = self._map_headers(headers, header_map)

           entries = []
           for row in table[1:]:
               if not self._is_data_row(row):
                   continue

               entry = self._extract_footing_entry(row, column_indices)
               if entry:
                   entries.append(entry)

           return entries

       def _normalize_headers(self, header_row: List) -> List[str]:
           """Clean and normalize header text"""
           return [str(h).lower().strip() for h in header_row]

       def _map_headers(self, headers: List[str], header_map: Dict) -> Dict[str, int]:
           """Map standard field names to column indices"""
           indices = {}

           for std_name, variations in header_map.items():
               for i, header in enumerate(headers):
                   if any(var in header for var in variations):
                       indices[std_name] = i
                       break

           return indices

       def _extract_footing_entry(self, row: List, column_indices: Dict) -> Optional[Dict]:
           """Extract structured data from footing schedule row"""
           try:
               entry = {
                   'mark': self._get_cell(row, column_indices.get('mark')),
                   'width': self._parse_dimension(
                       self._get_cell(row, column_indices.get('width'))
                   ),
                   'depth': self._parse_dimension(
                       self._get_cell(row, column_indices.get('depth'))
                   ),
                   'rebar_vertical': self._get_cell(row, column_indices.get('rebar_vert')),
                   'rebar_horizontal': self._get_cell(row, column_indices.get('rebar_horiz')),
                   'concrete_strength': self._parse_concrete_strength(
                       self._get_cell(row, column_indices.get('concrete'))
                   ),
                   'notes': self._get_cell(row, column_indices.get('notes'))
               }

               # Validate required fields
               if entry['mark']:
                   return entry

           except Exception as e:
               print(f"Error parsing footing entry: {e}")

           return None

       def _parse_dimension(self, dim_str: str) -> Optional[Dict]:
           """
           Parse dimension string into structured format
           Examples: 16", 1'-4", 18"
           """
           if not dim_str:
               return None

           dim_str = str(dim_str).strip()

           # Pattern: feet-inches (e.g., 1'-4")
           feet_inches = re.match(r"(\d+)'-(\d+)\"", dim_str)
           if feet_inches:
               feet = int(feet_inches.group(1))
               inches = int(feet_inches.group(2))
               return {
                   'value': feet * 12 + inches,
                   'unit': 'inches',
                   'feet': feet,
                   'inches': inches,
                   'original': dim_str
               }

           # Pattern: inches only (e.g., 16")
           inches_only = re.match(r"(\d+)\"", dim_str)
           if inches_only:
               inches = int(inches_only.group(1))
               return {
                   'value': inches,
                   'unit': 'inches',
                   'feet': inches // 12,
                   'inches': inches % 12,
                   'original': dim_str
               }

           return None

       def _parse_concrete_strength(self, strength_str: str) -> Optional[int]:
           """
           Extract concrete strength in PSI
           Examples: 3000 PSI, 3000, 3000psi, f'c = 3000
           """
           if not strength_str:
               return None

           strength_str = str(strength_str).lower()

           # Extract number
           match = re.search(r'(\d+)', strength_str)
           if match:
               return int(match.group(1))

           return None
```

4. Database schema additions:

```sql
   -- Add to schema.sql

   CREATE TABLE schedules (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
       schedule_type VARCHAR(50) NOT NULL,
       page_number INTEGER,
       bbox JSONB,  -- {x0, y0, x1, y1}
       extraction_method VARCHAR(20),
       extraction_confidence FLOAT,
       created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE schedule_entries (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       schedule_id UUID REFERENCES schedules(id) ON DELETE CASCADE,
       mark VARCHAR(20),
       data JSONB NOT NULL,  -- Flexible structure for different schedule types
       row_number INTEGER,
       created_at TIMESTAMP DEFAULT NOW()
   );

   -- Indexes for performance
   CREATE INDEX idx_schedules_document ON schedules(document_id);
   CREATE INDEX idx_schedules_type ON schedules(schedule_type);
   CREATE INDEX idx_schedule_entries_mark ON schedule_entries(mark);
   CREATE INDEX idx_schedule_entries_schedule ON schedule_entries(schedule_id);
   CREATE INDEX idx_schedule_entries_data ON schedule_entries USING gin(data);
```

5. Integration with ingestion pipeline:

```python
   # Update ingest_document.py

   async def ingest_document_enhanced(pdf_path: str) -> dict:
       """Enhanced document ingestion with table extraction"""

       # Existing text extraction
       text_chunks = extract_text_chunks(pdf_path)

       # NEW: Table extraction
       extractor = TableExtractor(pdf_path)
       all_tables = extractor.extract_all_tables()

       parser = ScheduleParser()

       for table_data in all_tables:
           table_type = extractor.classify_table_type(table_data['data'])

           # Store schedule metadata
           schedule_id = await db.insert_schedule({
               'document_id': document_id,
               'schedule_type': table_type,
               'page_number': table_data['page'],
               'bbox': table_data.get('bbox'),
               'extraction_method': table_data['method']
           })

           # Parse and store entries
           if table_type == 'footing_schedule':
               entries = parser.parse_footing_schedule(table_data['data'])

               for entry in entries:
                   await db.insert_schedule_entry({
                       'schedule_id': schedule_id,
                       'mark': entry['mark'],
                       'data': entry
                   })

       return {
           'text_chunks': len(text_chunks),
           'tables_extracted': len(all_tables),
           'schedules_created': len(all_tables)
       }
```

#### Testing & Validation

Create `tests/test_table_extraction.py`:

```python
import pytest
from table_extractor import TableExtractor
from schedule_parser import ScheduleParser

def test_footing_schedule_extraction():
    """Test extraction of footing schedule"""
    extractor = TableExtractor("test_docs/foundation_plan.pdf")
    tables = extractor.extract_all_tables(page_num=1)

    assert len(tables) > 0, "Should extract at least one table"

    # Verify table type classification
    table_type = extractor.classify_table_type(tables[0]['data'])
    assert table_type == "footing_schedule"

def test_footing_schedule_parsing():
    """Test parsing of footing schedule data"""
    sample_table = [
        ['Mark', 'Width', 'Depth', 'Vert Bars', 'Horiz Bars', 'Conc.'],
        ['F1', '16"', '8"', '#4@16" O.C.', '#4@18" O.C.', '3000 PSI'],
        ['F2', '18"', '10"', '#5@12" O.C.', '#4@16" O.C.', '3000 PSI']
    ]

    parser = ScheduleParser()
    entries = parser.parse_footing_schedule(sample_table)

    assert len(entries) == 2
    assert entries[0]['mark'] == 'F1'
    assert entries[0]['width']['value'] == 16
    assert entries[0]['concrete_strength'] == 3000

def test_dimension_parsing():
    """Test dimension string parsing"""
    parser = ScheduleParser()

    # Test inches only
    dim1 = parser._parse_dimension('16"')
    assert dim1['value'] == 16
    assert dim1['unit'] == 'inches'

    # Test feet and inches
    dim2 = parser._parse_dimension('2\'-4"')
    assert dim2['value'] == 28  # 24 + 4
    assert dim2['feet'] == 2
    assert dim2['inches'] == 4
```

#### Deliverables

- ✅ Table extraction working for schedules
- ✅ Footing schedule parser complete
- ✅ Database schema for structured schedule data
- ✅ Integration with ingestion pipeline
- ✅ Test suite with 90%+ passing rate

---

### Phase 2: Vision-Based Analysis (Weeks 3-5)

**Priority: HIGH**

#### Objectives

- Extract dimensional information from drawings
- Identify symbols, callouts, and references
- Recognize material hatching patterns
- Parse grid coordinates and spatial relationships

#### Implementation Steps

**Week 3: Claude Vision API Integration**

1. Create `vision_analyzer.py`:

````python
   import anthropic
   import base64
   from pathlib import Path
   from typing import Dict, List, Optional
   import json

   class DrawingVisionAnalyzer:
       """Use Claude Vision to analyze construction drawings"""

       def __init__(self, api_key: str):
           self.client = anthropic.Anthropic(api_key=api_key)
           self.model = "claude-sonnet-4-20250514"

       async def analyze_drawing_page(
           self,
           image_path: str,
           analysis_type: str = "comprehensive"
       ) -> Dict:
           """
           Analyze a drawing page image

           analysis_type options:
           - comprehensive: Extract all information
           - dimensions: Focus on dimension strings
           - callouts: Focus on reference callouts
           - symbols: Focus on symbols and legends
           """

           # Load and encode image
           with open(image_path, 'rb') as f:
               image_data = base64.standard_b64encode(f.read()).decode('utf-8')

           # Select prompt based on analysis type
           prompt = self._get_analysis_prompt(analysis_type)

           response = await self.client.messages.create(
               model=self.model,
               max_tokens=4000,
               messages=[
                   {
                       "role": "user",
                       "content": [
                           {
                               "type": "image",
                               "source": {
                                   "type": "base64",
                                   "media_type": "image/png",
                                   "data": image_data
                               }
                           },
                           {
                               "type": "text",
                               "text": prompt
                           }
                       ]
                   }
               ]
           )

           # Parse structured response
           result = self._parse_vision_response(response.content[0].text)

           return result

       def _get_analysis_prompt(self, analysis_type: str) -> str:
           """Get appropriate prompt for analysis type"""

           prompts = {
               "dimensions": """
               Analyze this construction drawing and extract ALL dimension information.

               Return a JSON object with this structure:
               {
                 "dimensions": [
                   {
                     "value": "24-6",
                     "unit": "feet-inches",
                     "location": "north wall overall",
                     "orientation": "horizontal",
                     "grid_reference": "Grid A to Grid D"
                   }
                 ],
                 "grid_lines": [
                   {
                     "label": "A",
                     "type": "vertical",
                     "spacing_to_next": "20-0"
                   }
                 ],
                 "scale": "1/4 inch = 1 foot",
                 "notes": "any observations about dimension patterns"
               }

               Include:
               - All dimension strings with their values
               - Grid line labels and spacing
               - Overall building dimensions
               - Room dimensions if visible
               - Any compound dimensions (e.g., "3 @ 16\" = 4'-0\"")

               Be precise with units and values.
               """,

               "callouts": """
               Analyze this construction drawing and extract ALL callouts and references.

               Return a JSON object with this structure:
               {
                 "detail_callouts": [
                   {
                     "callout_text": "3/S2.1",
                     "detail_number": "3",
                     "sheet_reference": "S2.1",
                     "approximate_location": "bottom left quadrant",
                     "points_to": "footing detail"
                   }
                 ],
                 "section_cuts": [
                   {
                     "label": "A",
                     "sheet_reference": "S3.0",
                     "direction": "looking north"
                   }
                 ],
                 "keynotes": [
                   {
                     "number": "1",
                     "text": "3000 PSI concrete",
                     "location": "foundation wall"
                   }
                 ],
                 "general_notes": [
                   "list of general notes with note numbers"
                 ]
               }

               Capture all reference bubbles, section indicators, and note callouts.
               """,

               "symbols": """
               Analyze this construction drawing and identify all symbols and their meanings.

               Return a JSON object with this structure:
               {
                 "material_symbols": [
                   {
                     "pattern": "diagonal hatching",
                     "material": "concrete",
                     "locations": ["foundation walls", "footings"]
                   }
                 ],
                 "legend_items": [
                   {
                     "symbol": "description",
                     "meaning": "what it represents"
                   }
                 ],
                 "drawing_symbols": [
                   {
                     "symbol_type": "north arrow",
                     "orientation": "pointing up"
                   }
                 ],
                 "abbreviations": {
                   "TYP": "typical",
                   "O.C.": "on center"
                 }
               }

               Include material hatching, legends, north arrows, and common abbreviations.
               """,

               "comprehensive": """
               Analyze this construction drawing comprehensively and extract all information.

               Return a JSON object combining:
               1. All dimensions and measurements
               2. All callouts and references
               3. All symbols and their meanings
               4. Drawing metadata (title, scale, sheet number)
               5. Spatial relationships between elements

               Structure:
               {
                 "metadata": {
                   "sheet_number": "S1.0",
                   "title": "Foundation Plan",
                   "scale": "1/4\" = 1'-0\"",
                   "north_orientation": "up"
                 },
                 "dimensions": [...],
                 "callouts": [...],
                 "symbols": [...],
                 "elements": [
                   {
                     "type": "footing",
                     "mark": "F1",
                     "dimensions": "16\" x 8\"",
                     "location": "grid intersection A-1"
                   }
                 ],
                 "notes": "comprehensive observations"
               }

               Be thorough and precise.
               """
           }

           return prompts.get(analysis_type, prompts["comprehensive"])

       def _parse_vision_response(self, response_text: str) -> Dict:
           """Parse JSON response from vision analysis"""
           try:
               # Try to extract JSON from response
               # Handle potential markdown code blocks
               if "```json" in response_text:
                   json_start = response_text.find("```json") + 7
                   json_end = response_text.find("```", json_start)
                   response_text = response_text[json_start:json_end]

               return json.loads(response_text.strip())

           except json.JSONDecodeError as e:
               print(f"Failed to parse vision response: {e}")
               return {"raw_response": response_text, "parse_error": str(e)}
````

**Week 4: Dimension Parsing & Storage**

2. Create `dimension_parser.py`:

```python
   import re
   from typing import Dict, Optional, List
   from dataclasses import dataclass

   @dataclass
   class Dimension:
       """Structured dimension data"""
       value: float  # Normalized to feet
       unit: str  # 'feet', 'inches', 'meters', etc.
       original_notation: str
       location_description: Optional[str] = None
       grid_reference: Optional[str] = None
       orientation: Optional[str] = None  # 'horizontal', 'vertical'
       element_reference: Optional[str] = None

   class DimensionParser:
       """Parse construction dimension strings"""

       # Regex patterns for common dimension formats
       PATTERNS = {
           'feet_inches': r"(\d+)'-(\d+)\"",  # 24'-6"
           'feet_only': r"(\d+)'",  # 24'
           'inches_only': r"(\d+)\"",  # 16"
           'decimal_feet': r"(\d+\.\d+)'",  # 24.5'
           'compound': r"(\d+)\s*@\s*(\d+)\"?\s*=\s*(\d+)'-(\d+)\"",  # 3 @ 16" = 4'-0"
           'metric': r"(\d+)\s*(mm|cm|m)"  # 500mm, 5m
       }

       def parse(self, dimension_string: str) -> Optional[Dimension]:
           """
           Parse dimension string into structured format
           """
           if not dimension_string:
               return None

           dim_str = dimension_string.strip()

           # Try feet-inches format (24'-6")
           match = re.match(self.PATTERNS['feet_inches'], dim_str)
           if match:
               feet = int(match.group(1))
               inches = int(match.group(2))
               total_feet = feet + (inches / 12)
               return Dimension(
                   value=total_feet,
                   unit='feet',
                   original_notation=dim_str
               )

           # Try inches only (16")
           match = re.match(self.PATTERNS['inches_only'], dim_str)
           if match:
               inches = int(match.group(1))
               return Dimension(
                   value=inches / 12,
                   unit='feet',
                   original_notation=dim_str
               )

           # Try decimal feet (24.5')
           match = re.match(self.PATTERNS['decimal_feet'], dim_str)
           if match:
               feet = float(match.group(1))
               return Dimension(
                   value=feet,
                   unit='feet',
                   original_notation=dim_str
               )

           # Try compound dimensions (3 @ 16" = 4'-0")
           match = re.match(self.PATTERNS['compound'], dim_str)
           if match:
               count = int(match.group(1))
               spacing_inches = int(match.group(2))
               total_feet = int(match.group(3))
               total_inches = int(match.group(4))

               calculated_total = (count * spacing_inches) / 12
               stated_total = total_feet + (total_inches / 12)

               return Dimension(
                   value=stated_total,
                   unit='feet',
                   original_notation=dim_str
               )

           # Try metric
           match = re.match(self.PATTERNS['metric'], dim_str)
           if match:
               value = int(match.group(1))
               unit = match.group(2)

               # Convert to feet
               conversions = {
                   'mm': 0.00328084,
                   'cm': 0.0328084,
                   'm': 3.28084
               }

               feet = value * conversions[unit]
               return Dimension(
                   value=feet,
                   unit='feet',
                   original_notation=dim_str
               )

           return None

       def parse_multiple(self, dimension_strings: List[str]) -> List[Dimension]:
           """Parse multiple dimension strings"""
           return [
               dim for dim in
               (self.parse(s) for s in dimension_strings)
               if dim is not None
           ]
```

3. Database schema for dimensions:

```sql
   CREATE TABLE dimensions (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
       page_number INTEGER,
       value_feet FLOAT NOT NULL,
       original_notation VARCHAR(50),
       location_description TEXT,
       grid_reference VARCHAR(20),
       orientation VARCHAR(20),
       element_reference VARCHAR(50),
       confidence FLOAT DEFAULT 1.0,
       extraction_method VARCHAR(20),  -- 'vision', 'text_parse', 'manual'
       created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_dimensions_document ON dimensions(document_id);
   CREATE INDEX idx_dimensions_grid ON dimensions(grid_reference);
   CREATE INDEX idx_dimensions_element ON dimensions(element_reference);
```

**Week 5: Integration & Testing**

4. Integrate vision analysis into ingestion:

```python
   async def ingest_with_vision(pdf_path: str) -> dict:
       """Enhanced ingestion with vision analysis"""

       # Convert PDF pages to images
       images = convert_pdf_to_images(pdf_path)

       vision_analyzer = DrawingVisionAnalyzer(api_key=os.getenv('ANTHROPIC_API_KEY'))
       dimension_parser = DimensionParser()

       for page_num, image_path in enumerate(images, 1):
           # Run vision analysis
           analysis = await vision_analyzer.analyze_drawing_page(
               image_path,
               analysis_type="comprehensive"
           )

           # Extract and store dimensions
           if 'dimensions' in analysis:
               for dim_data in analysis['dimensions']:
                   dim = dimension_parser.parse(dim_data['value'])
                   if dim:
                       await db.insert_dimension({
                           'document_id': document_id,
                           'page_number': page_num,
                           'value_feet': dim.value,
                           'original_notation': dim.original_notation,
                           'location_description': dim_data.get('location'),
                           'grid_reference': dim_data.get('grid_reference'),
                           'extraction_method': 'vision'
                       })

           # Store callouts for cross-reference resolution
           if 'detail_callouts' in analysis:
               for callout in analysis['detail_callouts']:
                   await db.insert_callout({
                       'source_document': document_id,
                       'source_page': page_num,
                       'callout_text': callout['callout_text'],
                       'target_sheet': callout.get('sheet_reference'),
                       'target_detail': callout.get('detail_number')
                   })
```

#### Cost Considerations

- Claude Vision API: ~$3-8 per 1000 images (depending on image size)
- For a typical project with 50 drawing sheets: $0.15-$0.40 per sheet
- One-time cost during ingestion
- Implement caching to avoid re-analyzing unchanged sheets

#### Deliverables

- ✅ Vision analysis integration for dimensions
- ✅ Dimension parsing and normalization
- ✅ Callout extraction and storage
- ✅ Symbol recognition framework
- ✅ Cost-effective caching strategy

---

### Phase 3: Cross-Reference Resolution (Weeks 6-7)

**Priority: HIGH**

#### Objectives

- Link callouts to referenced details
- Build navigation graph between sheets
- Connect drawings to specifications
- Enable "follow the reference" queries

#### Implementation Steps

**Week 6: Reference Parser & Graph Builder**

1. Create `reference_resolver.py`:

```python
   import re
   from typing import Dict, List, Optional, Tuple
   from dataclasses import dataclass

   @dataclass
   class Reference:
       """Structured reference data"""
       source_document: str
       source_page: int
       reference_type: str  # 'detail', 'section', 'sheet', 'note', 'specification'
       target_sheet: Optional[str] = None
       target_detail: Optional[str] = None
       target_section: Optional[str] = None
       callout_text: str = ""
       context: str = ""

   class ReferenceResolver:
       """Parse and resolve cross-references in construction documents"""

       # Reference patterns
       DETAIL_PATTERN = r'(\d+)/([A-Z]\d+\.?\d*)'  # 3/S2.1
       SHEET_PATTERN = r'(?:Sheet|Sht\.?|Dwg\.?)\s+([A-Z]\d+\.?\d*)'  # Sheet S2.1
       NOTE_PATTERN = r'(?:Note|N\.)\s+(\d+)'  # Note 3
       SECTION_PATTERN = r'(?:Section|Sect\.)\s+([A-Z])'  # Section A
       SPEC_PATTERN = r'(\d{2})\s*(\d{2})\s*(\d{2})'  # 03 30 00

       def parse_reference(self, text: str, context: str = "") -> Optional[Reference]:
           """
           Parse reference text and return structured reference
           """
           if not text:
               return None

           text = text.strip()

           # Try detail reference (3/S2.1)
           match = re.search(self.DETAIL_PATTERN, text)
           if match:
               return Reference(
                   source_document="",  # Set by caller
                   source_page=0,  # Set by caller
                   reference_type='detail',
                   target_detail=match.group(1),
                   target_sheet=match.group(2),
                   callout_text=text,
                   context=context
               )

           # Try sheet reference
           match = re.search(self.SHEET_PATTERN, text, re.IGNORECASE)
           if match:
               return Reference(
                   source_document="",
                   source_page=0,
                   reference_type='sheet',
                   target_sheet=match.group(1),
                   callout_text=text,
                   context=context
               )

           # Try note reference
           match = re.search(self.NOTE_PATTERN, text, re.IGNORECASE)
           if match:
               return Reference(
                   source_document="",
                   source_page=0,
                   reference_type='note',
                   target_detail=match.group(1),
                   callout_text=text,
                   context=context
               )

           # Try specification reference
           match = re.search(self.SPEC_PATTERN, text)
           if match:
               spec_number = f"{match.group(1)} {match.group(2)} {match.group(3)}"
               return Reference(
                   source_document="",
                   source_page=0,
                   reference_type='specification',
                   target_section=spec_number,
                   callout_text=text,
                   context=context
               )

           return None

       async def resolve_reference(
           self,
           ref: Reference,
           db_connection
       ) -> Optional[Dict]:
           """
           Resolve a reference to its target content
           """
           if ref.reference_type == 'detail':
               return await self._resolve_detail(ref, db_connection)
           elif ref.reference_type == 'sheet':
               return await self._resolve_sheet(ref, db_connection)
           elif ref.reference_type == 'specification':
               return await self._resolve_specification(ref, db_connection)
           elif ref.reference_type == 'note':
               return await self._resolve_note(ref, db_connection)

           return None

       async def _resolve_detail(
           self,
           ref: Reference,
           db_connection
       ) -> Optional[Dict]:
           """Find the referenced detail"""
           query = """
           SELECT d.*, doc.title, doc.sheet_number
           FROM details d
           JOIN documents doc ON d.document_id = doc.id
           WHERE doc.sheet_number = $1
           AND d.detail_number = $2
           """

           result = await db_connection.fetchrow(
               query,
               ref.target_sheet,
               ref.target_detail
           )

           if result:
               return {
                   'type': 'detail',
                   'sheet': result['sheet_number'],
                   'detail_number': result['detail_number'],
                   'title': result['title'],
                   'content': result['content'],
                   'image_path': result.get('image_path')
               }

           return None

       def build_reference_graph(
           self,
           all_references: List[Reference]
       ) -> Dict:
           """
           Build a graph of document relationships
           """
           import networkx as nx

           G = nx.DiGraph()

           # Add nodes for all documents
           documents = set()
           for ref in all_references:
               documents.add(ref.source_document)
               if ref.target_sheet:
                   documents.add(ref.target_sheet)

           for doc in documents:
               G.add_node(doc, node_type='document')

           # Add edges for references
           for ref in all_references:
               if ref.target_sheet:
                   G.add_edge(
                       ref.source_document,
                       ref.target_sheet,
                       reference_type=ref.reference_type,
                       detail=ref.target_detail,
                       callout=ref.callout_text
                   )

           return G

       def find_related_documents(
           self,
           graph: nx.DiGraph,
           start_document: str,
           max_depth: int = 2
       ) -> List[str]:
           """
           Find all documents within max_depth links
           """
           import networkx as nx

           related = []

           for depth in range(1, max_depth + 1):
               # Get all nodes at this depth
               paths = nx.single_source_shortest_path_length(
                   graph,
                   start_document,
                   cutoff=depth
               )

               for node, dist in paths.items():
                   if dist == depth and node not in related:
                       related.append(node)

           return related
```

2. Database schema for references:

```sql
   CREATE TABLE references (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       source_document_id UUID REFERENCES documents(id),
       source_page INTEGER,
       reference_type VARCHAR(50),
       target_document_id UUID REFERENCES documents(id),
       target_detail VARCHAR(20),
       target_section VARCHAR(50),
       callout_text VARCHAR(100),
       context TEXT,
       resolved BOOLEAN DEFAULT FALSE,
       created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE details (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       document_id UUID REFERENCES documents(id),
       detail_number VARCHAR(20),
       title VARCHAR(200),
       content TEXT,
       image_path VARCHAR(500),
       bbox JSONB,
       created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_references_source ON references(source_document_id);
   CREATE INDEX idx_references_target ON references(target_document_id);
   CREATE INDEX idx_references_type ON references(reference_type);
   CREATE INDEX idx_details_document ON details(document_id);
   CREATE INDEX idx_details_number ON details(detail_number);
```

**Week 7: Query Functions & Testing**

3. Add new MCP tool for reference resolution:

```python
   @server.tool()
   async def resolve_reference(
       callout: str,
       source_sheet: Optional[str] = None
   ) -> dict:
       """
       Resolve a reference callout to its target content

       Examples:
       - resolve_reference("3/S2.1") → Detail 3 from Sheet S2.1
       - resolve_reference("Sheet S3.0") → Sheet S3.0 content
       - resolve_reference("03 30 00") → Concrete specification
       """
       resolver = ReferenceResolver()

       # Parse the reference
       ref = resolver.parse_reference(callout)
       if not ref:
           return {"error": "Could not parse reference"}

       if source_sheet:
           ref.source_document = source_sheet

       # Resolve to target
       result = await resolver.resolve_reference(ref, db_connection)

       if result:
           return {
               "found": True,
               "reference_type": ref.reference_type,
               "target": result
           }

       return {
           "found": False,
           "searched_for": {
               "sheet": ref.target_sheet,
               "detail": ref.target_detail,
               "section": ref.target_section
           }
       }

   @server.tool()
   async def trace_references(
       element_id: str,
       depth: int = 2
   ) -> dict:
       """
       Follow reference chain from element to related content

       Example:
       trace_references("F1", depth=2) might return:
       - F1 footing mark
       - Referenced detail 3/S2.1
       - Specification 03 30 00
       - Related product data sheets
       """
       # Get initial element
       element = await db.get_element(element_id)

       # Build reference graph
       all_refs = await db.get_all_references()
       resolver = ReferenceResolver()
       graph = resolver.build_reference_graph(all_refs)

       # Find related documents
       start_doc = element['document_id']
       related_docs = resolver.find_related_documents(graph, start_doc, depth)

       # Gather content from related documents
       results = []
       for doc_id in related_docs:
           doc_content = await db.get_document_summary(doc_id)
           results.append(doc_content)

       return {
           "element": element,
           "reference_depth": depth,
           "related_documents": results,
           "reference_path": graph
       }
```

#### Deliverables

- ✅ Reference parsing for common callout formats
- ✅ Reference resolution database and queries
- ✅ Graph-based relationship tracking
- ✅ MCP tools for resolving references
- ✅ Trace capability for multi-hop references

---

### Phase 4: Calculation Engine (Weeks 8-9)

**Priority: MEDIUM**

#### Objectives

- Calculate concrete volumes from dimensions
- Compute rebar lengths based on spacing
- Count discrete items (anchor bolts, etc.)
- Aggregate materials across drawings

#### Implementation Steps

**Week 8: Core Calculator Functions**

1. Create `quantity_calculator.py`:

```python
   from typing import Dict, List, Optional
   from dataclasses import dataclass
   import math

   @dataclass
   class MaterialQuantity:
       """Structured quantity result"""
       material_type: str
       quantity: float
       unit: str
       calculation_method: str
       source_elements: List[str]
       confidence: float = 1.0
       notes: str = ""

   class QuantityCalculator:
       """Calculate material quantities from drawing data"""

       def calculate_concrete_volume(
           self,
           element_data: Dict
       ) -> MaterialQuantity:
           """
           Calculate concrete volume in cubic yards

           Input examples:
           - Footing: {width: 16", depth: 8", length: 24'-6"}
           - Wall: {thickness: 8", height: 8', length: 40'}
           - Slab: {thickness: 4", area: 1200 sqft}
           """
           element_type = element_data.get('type', 'unknown')

           if element_type == 'footing':
               return self._calc_footing_concrete(element_data)
           elif element_type == 'wall':
               return self._calc_wall_concrete(element_data)
           elif element_type == 'slab':
               return self._calc_slab_concrete(element_data)
           else:
               raise ValueError(f"Unknown element type: {element_type}")

       def _calc_footing_concrete(self, data: Dict) -> MaterialQuantity:
           """Calculate concrete for footing"""
           # Convert all to feet
           width_ft = self._to_feet(data['width'])
           depth_ft = self._to_feet(data['depth'])
           length_ft = self._to_feet(data['length'])

           # Volume in cubic feet
           volume_cf = width_ft * depth_ft * length_ft

           # Convert to cubic yards (27 cf = 1 cy)
           volume_cy = volume_cf / 27

           # Add waste factor (typically 5-10%)
           waste_factor = data.get('waste_factor', 0.05)
           total_cy = volume_cy * (1 + waste_factor)

           return MaterialQuantity(
               material_type='concrete_3000psi',
               quantity=round(total_cy, 2),
               unit='cubic_yards',
               calculation_method='rectangular_prism',
               source_elements=[data.get('mark', 'unknown')],
               confidence=0.95,
               notes=f"Includes {waste_factor*100}% waste factor"
           )

       def _to_feet(self, dimension: any) -> float:
           """Convert dimension to feet"""
           if isinstance(dimension, dict):
               # Already parsed dimension
               if dimension['unit'] == 'inches':
                   return dimension['value'] / 12
               elif dimension['unit'] == 'feet':
                   return dimension['value']
           elif isinstance(dimension, str):
               # Parse string
               from dimension_parser import DimensionParser
               parser = DimensionParser()
               dim = parser.parse(dimension)
               if dim:
                   return dim.value
           elif isinstance(dimension, (int, float)):
               # Assume feet
               return float(dimension)

           raise ValueError(f"Cannot convert {dimension} to feet")

       def calculate_rebar_length(
           self,
           element_data: Dict,
           bar_size: str,
           spacing: str
       ) -> MaterialQuantity:
           """
           Calculate total linear feet of rebar

           Accounts for:
           - Number of bars based on spacing
           - Lap splices
           - Development length
           - Hooks if specified
           """
           # Parse spacing (e.g., "16\" O.C.")
           spacing_inches = self._parse_spacing(spacing)

           if element_data['type'] == 'wall':
               return self._calc_wall_rebar(element_data, bar_size, spacing_inches)
           elif element_data['type'] == 'footing':
               return self._calc_footing_rebar(element_data, bar_size, spacing_inches)

           raise ValueError(f"Rebar calc not implemented for {element_data['type']}")

       def _calc_wall_rebar(
           self,
           data: Dict,
           bar_size: str,
           spacing_inches: float
       ) -> MaterialQuantity:
           """Calculate rebar for foundation wall"""

           # Wall dimensions
           height_ft = self._to_feet(data['height'])
           length_ft = self._to_feet(data['length'])

           # Vertical bars
           num_vertical = math.ceil((length_ft * 12) / spacing_inches) + 1
           vertical_length_per_bar = height_ft

           # Add lap splice (typically 40 * bar diameter)
           bar_diameters = {
               '#3': 0.375, '#4': 0.5, '#5': 0.625,
               '#6': 0.75, '#7': 0.875, '#8': 1.0
           }
           lap_length_ft = (40 * bar_diameters[bar_size]) / 12

           # Total vertical
           total_vertical = num_vertical * (vertical_length_per_bar + lap_length_ft)

           # Horizontal bars (typically 2 per wall - top and bottom)
           num_horizontal = 2
           total_horizontal = num_horizontal * length_ft

           total_lf = total_vertical + total_horizontal

           # Add 10% waste
           total_with_waste = total_lf * 1.10

           return MaterialQuantity(
               material_type=f'rebar_{bar_size}',
               quantity=round(total_with_waste, 0),
               unit='linear_feet',
               calculation_method='wall_rebar',
               source_elements=[data.get('mark', 'unknown')],
               confidence=0.90,
               notes=f"{num_vertical} vertical bars + {num_horizontal} horizontal"
           )

       def _parse_spacing(self, spacing_str: str) -> float:
           """
           Parse spacing string to inches
           Examples: "16\" O.C.", "#4@16\"", "16"
           """
           import re
           match = re.search(r'(\d+)', spacing_str)
           if match:
               return float(match.group(1))
           raise ValueError(f"Cannot parse spacing: {spacing_str}")

       def aggregate_materials(
           self,
           quantities: List[MaterialQuantity]
       ) -> Dict[str, MaterialQuantity]:
           """
           Aggregate quantities by material type
           """
           aggregated = {}

           for qty in quantities:
               mat_type = qty.material_type

               if mat_type not in aggregated:
                   aggregated[mat_type] = MaterialQuantity(
                       material_type=mat_type,
                       quantity=0,
                       unit=qty.unit,
                       calculation_method='aggregated',
                       source_elements=[]
                   )

               aggregated[mat_type].quantity += qty.quantity
               aggregated[mat_type].source_elements.extend(qty.source_elements)

           return aggregated
```

**Week 9: Integration & Validation**

2. Add calculation MCP tool:

```python
   @server.tool()
   async def calculate_material_quantities(
       material_type: str,
       location: Optional[str] = None,
       discipline: Optional[str] = None
   ) -> dict:
       """
       Calculate total quantities for a material type

       Examples:
       - calculate_material_quantities("concrete")
       - calculate_material_quantities("rebar_#4", location="foundation")
       """
       calculator = QuantityCalculator()

       # Get relevant elements from database
       elements = await db.get_elements(
           material_type=material_type,
           location=location,
           discipline=discipline
       )

       # Calculate quantity for each element
       quantities = []
       for element in elements:
           if 'concrete' in material_type:
               qty = calculator.calculate_concrete_volume(element)
           elif 'rebar' in material_type:
               bar_size = material_type.split('_')[1]  # Extract #4 from rebar_#4
               spacing = element.get('rebar_spacing', '16" O.C.')
               qty = calculator.calculate_rebar_length(element, bar_size, spacing)

           quantities.append(qty)

       # Aggregate
       total = calculator.aggregate_materials(quantities)

       return {
           "material": material_type,
           "total_quantity": total[material_type].quantity,
           "unit": total[material_type].unit,
           "breakdown": [
               {
                   "element": qty.source_elements[0],
                   "quantity": qty.quantity,
                   "calculation": qty.calculation_method
               }
               for qty in quantities
           ],
           "confidence": sum(q.confidence for q in quantities) / len(quantities)
       }
```

3. Validation framework:

```python
   class QuantityValidator:
       """Validate calculated quantities against expected ranges"""

       # Typical ranges for sanity checks
       TYPICAL_RANGES = {
           'concrete_footing_cy_per_lf': (0.01, 0.5),  # Per linear foot
           'rebar_lbs_per_cy_concrete': (50, 250),  # Pounds per cubic yard
           'anchor_bolts_per_lf': (0.1, 2.0)  # Per linear foot
       }

       def validate_quantity(
           self,
           quantity: MaterialQuantity,
           element_data: Dict
       ) -> Dict:
           """
           Check if calculated quantity is reasonable
           """
           warnings = []

           if quantity.material_type == 'concrete_3000psi':
               # Check concrete quantity per linear foot
               if 'length' in element_data:
                   length_ft = self._to_feet(element_data['length'])
                   cy_per_lf = quantity.quantity / length_ft

                   min_val, max_val = self.TYPICAL_RANGES['concrete_footing_cy_per_lf']

                   if not (min_val <= cy_per_lf <= max_val):
                       warnings.append({
                           'type': 'out_of_range',
                           'metric': 'cy_per_lf',
                           'value': cy_per_lf,
                           'expected_range': (min_val, max_val),
                           'message': f"Concrete quantity {cy_per_lf:.3f} CY/LF outside typical range"
                       })

           return {
               'valid': len(warnings) == 0,
               'warnings': warnings,
               'confidence_adjusted': quantity.confidence * (0.9 if warnings else 1.0)
           }
```

#### Deliverables

- ✅ Concrete volume calculator
- ✅ Rebar length calculator
- ✅ Material aggregation functions
- ✅ Validation framework
- ✅ MCP tools for quantity queries

---

### Phase 5: Specification Integration (Weeks 10-11)

**Priority: MEDIUM**

#### Objectives

- Ingest CSI-formatted specifications
- Link specifications to drawing elements
- Extract requirements and standards
- Enable spec-based queries

#### Implementation Steps

**Week 10: Spec Document Processing**

1. Create `specification_parser.py`:

```python
   from typing import Dict, List, Optional
   import re

   class SpecificationParser:
       """Parse CSI MasterFormat specifications"""

       # CSI division structure
       DIVISIONS = {
           '00': 'Procurement and Contracting Requirements',
           '01': 'General Requirements',
           '02': 'Existing Conditions',
           '03': 'Concrete',
           '04': 'Masonry',
           '05': 'Metals',
           '06': 'Wood, Plastics, and Composites',
           '07': 'Thermal and Moisture Protection',
           '08': 'Openings',
           '09': 'Finishes',
           # ... etc
       }

       def parse_specification_document(self, text: str) -> Dict:
           """
           Parse spec document into structured format
           """
           sections = self._split_into_sections(text)

           parsed_sections = []
           for section in sections:
               parsed = self._parse_section(section)
               if parsed:
                   parsed_sections.append(parsed)

           return {
               'sections': parsed_sections,
               'total_sections': len(parsed_sections)
           }

       def _split_into_sections(self, text: str) -> List[str]:
           """Split spec doc by section numbers"""
           # Pattern: 03 30 00 - Cast-in-Place Concrete
           pattern = r'(\d{2}\s+\d{2}\s+\d{2})\s*-\s*([^\n]+)'

           sections = []
           matches = list(re.finditer(pattern, text))

           for i, match in enumerate(matches):
               start = match.start()
               end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
               sections.append(text[start:end])

           return sections

       def _parse_section(self, section_text: str) -> Optional[Dict]:
           """Parse individual spec section"""
           # Extract section number and title
           match = re.match(r'(\d{2})\s+(\d{2})\s+(\d{2})\s*-\s*([^\n]+)', section_text)

           if not match:
               return None

           division = match.group(1)
           level2 = match.group(2)
           level3 = match.group(3)
           title = match.group(4).strip()

           section_number = f"{division} {level2} {level3}"

           # Parse subsections
           subsections = self._parse_subsections(section_text)

           # Extract key requirements
           requirements = self._extract_requirements(section_text)

           # Extract product specifications
           products = self._extract_products(section_text)

           return {
               'section_number': section_number,
               'division': division,
               'title': title,
               'division_name': self.DIVISIONS.get(division, 'Unknown'),
               'content': section_text,
               'subsections': subsections,
               'requirements': requirements,
               'products': products
           }

       def _extract_requirements(self, text: str) -> List[Dict]:
           """Extract specific requirements from spec text"""
           requirements = []

           # Look for strength requirements
           strength_pattern = r'(\d+)\s*(?:psi|PSI|ksi|KSI)'
           for match in re.finditer(strength_pattern, text):
               requirements.append({
                   'type': 'strength',
                   'value': match.group(1),
                   'unit': match.group(0).split()[-1].upper(),
                   'context': text[max(0, match.start()-50):match.end()+50]
               })

           # Look for ASTM standards
           astm_pattern = r'ASTM\s+([A-Z]\d+)'
           for match in re.finditer(astm_pattern, text):
               requirements.append({
                   'type': 'standard',
                   'standard': f"ASTM {match.group(1)}",
                   'context': text[max(0, match.start()-50):match.end()+50]
               })

           return requirements
```

**Week 11: Drawing-Spec Linkage**

2. Database schema for specifications:

```sql
   CREATE TABLE specifications (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       section_number VARCHAR(20) UNIQUE,
       division VARCHAR(2),
       title VARCHAR(200),
       content TEXT,
       requirements JSONB,
       products JSONB,
       created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE TABLE drawing_spec_links (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       document_id UUID REFERENCES documents(id),
       spec_id UUID REFERENCES specifications(id),
       element_type VARCHAR(50),
       element_mark VARCHAR(20),
       link_type VARCHAR(50),  -- 'material', 'product', 'method'
       created_at TIMESTAMP DEFAULT NOW()
   );

   CREATE INDEX idx_specs_section ON specifications(section_number);
   CREATE INDEX idx_specs_division ON specifications(division);
   CREATE INDEX idx_drawing_spec_links_doc ON drawing_spec_links(document_id);
   CREATE INDEX idx_drawing_spec_links_spec ON drawing_spec_links(spec_id);
```

3. Automatic linking logic:

```python
   class DrawingSpecLinker:
       """Link drawing elements to specifications"""

       # Material to specification mapping
       MATERIAL_SPEC_MAP = {
           'concrete': ['03 30 00', '03 20 00'],  # Cast-in-Place, Reinforcing
           'rebar': ['03 20 00'],  # Concrete Reinforcing
           'structural_steel': ['05 12 00'],  # Structural Steel Framing
           'masonry': ['04 20 00'],  # Unit Masonry
           # ... etc
       }

       async def link_element_to_specs(
           self,
           element: Dict,
           db_connection
       ) -> List[str]:
           """
           Find relevant specifications for an element
           """
           material_type = element.get('material_type')

           if not material_type:
               return []

           # Get potential spec sections
           spec_sections = self.MATERIAL_SPEC_MAP.get(material_type, [])

           linked_specs = []
           for section in spec_sections:
               spec = await db_connection.fetchrow(
                   "SELECT * FROM specifications WHERE section_number = $1",
                   section
               )

               if spec:
                   # Create link
                   await db_connection.execute("""
                       INSERT INTO drawing_spec_links
                       (document_id, spec_id, element_type, element_mark, link_type)
                       VALUES ($1, $2, $3, $4, $5)
                   """,
                       element['document_id'],
                       spec['id'],
                       element['type'],
                       element.get('mark'),
                       'material'
                   )

                   linked_specs.append(section)

           return linked_specs
```

#### Deliverables

- ✅ Specification document parser
- ✅ CSI section extraction
- ✅ Drawing-spec linking system
- ✅ Requirements extraction
- ✅ Spec query capabilities

---

### Phase 6: Enhanced Query Interface (Week 12)

#### New MCP Tools Summary

```python
# Complete set of new tools

@server.tool()
async def get_schedule(
    schedule_type: str,
    mark: Optional[str] = None
) -> dict:
    """Get schedule data in structured format"""
    pass

@server.tool()
async def get_material_quantities(
    material_type: str,
    location: Optional[str] = None
) -> dict:
    """Calculate total quantities for material"""
    pass

@server.tool()
async def resolve_reference(
    callout: str,
    source_sheet: Optional[str] = None
) -> dict:
    """Resolve detail/sheet/spec reference"""
    pass

@server.tool()
async def trace_references(
    element_id: str,
    depth: int = 2
) -> dict:
    """Follow reference chain from element"""
    pass

@server.tool()
async def get_building_dimensions() -> dict:
    """Extract overall building dimensions"""
    pass

@server.tool()
async def find_specification(
    csi_number: Optional[str] = None,
    topic: Optional[str] = None
) -> dict:
    """Search specification documents"""
    pass

@server.tool()
async def compare_elements(
    element_ids: List[str]
) -> dict:
    """Compare specifications across elements"""
    pass
```

---

## Success Metrics

### Quantitative Targets

| Metric                        | Target         | Measurement Method                       |
| ----------------------------- | -------------- | ---------------------------------------- |
| Schedule extraction accuracy  | 95%+           | Manual validation of 100 random entries  |
| Dimension parsing accuracy    | 90%+           | Compare to manual measurements           |
| Reference resolution rate     | 85%+           | Success rate of callout → detail lookups |
| Quantity calculation accuracy | Within 5%      | Compare to manual takeoffs               |
| Document ingestion time       | < 30 sec/sheet | Timed tests                              |
| Query response time           | < 2 sec        | Average across 1000 queries              |
| Vision analysis cost          | < $0.50/sheet  | API usage tracking                       |

### Qualitative Goals

- ✅ Answer "how much do I need?" questions without manual calculation
- ✅ Navigate between related drawings automatically
- ✅ Find specifications for any element
- ✅ Support accurate cost estimation from drawings alone
- ✅ Eliminate need for manual schedule transcription

---

## Testing Strategy

### Unit Tests

```python
# Test each component independently

def test_table_extraction():
    """Verify table detection and parsing"""
    assert extract_tables(test_pdf) returns valid data

def test_dimension_parsing():
    """Verify dimension string parsing"""
    assert parse_dimension("2'-4\"") == 2.333 feet

def test_quantity_calculation():
    """Verify concrete volume calc"""
    assert calculate_concrete_volume(footing) within 5%

def test_reference_parsing():
    """Verify callout parsing"""
    assert parse_reference("3/S2.1") extracts sheet and detail
```

### Integration Tests

```python
# Test end-to-end workflows

async def test_full_ingestion():
    """Test complete document processing"""
    result = await ingest_document("test.pdf")
    assert result['schedules_created'] > 0
    assert result['dimensions_extracted'] > 0

async def test_quantity_query():
    """Test material quantity query"""
    qty = await get_material_quantities("concrete")
    assert qty['total_quantity'] > 0
    assert qty['unit'] == 'cubic_yards'
```

### Validation Tests

```python
# Compare against known-good data

def test_against_manual_takeoff():
    """Compare calculated quantities to manual"""
    auto_qty = calculate_quantities(project)
    manual_qty = load_manual_takeoff()

    for material in auto_qty:
        assert auto_qty[material] within 5% of manual_qty[material]
```

---

## Risk Mitigation

### Technical Risks

| Risk                         | Probability | Impact | Mitigation                                              |
| ---------------------------- | ----------- | ------ | ------------------------------------------------------- |
| Vision API costs too high    | Medium      | Medium | Cache results, selective usage, cost monitoring         |
| Table extraction inaccurate  | Medium      | High   | Multiple library fallbacks, manual validation interface |
| Dimension parsing edge cases | High        | Medium | Comprehensive regex patterns, extensive test suite      |
| Database performance         | Low         | High   | Proper indexing, query optimization, caching            |

### Project Risks

| Risk                  | Probability | Impact | Mitigation                                    |
| --------------------- | ----------- | ------ | --------------------------------------------- |
| Scope creep           | High        | Medium | Strict phasing, MVP-first approach            |
| Data quality variance | High        | Medium | Graceful degradation, confidence scores       |
| Timeline slippage     | Medium      | Low    | Buffer time in schedule, parallel workstreams |

---

## Future Enhancements (Post-Launch)

### Phase 8+: Advanced Features

1. **Change Detection**
    - Compare revision sets
    - Identify added/removed/modified elements
    - Generate revision summaries

2. **Clash Detection**
    - Cross-discipline conflict identification
    - Spatial interference checking
    - Automated RFI generation

3. **Code Compliance**
    - Validate against building codes
    - Flag potential violations
    - Generate compliance reports

4. **Cost Integration**
    - Link to RS Means database
    - Automated budget calculations
    - Cost tracking and forecasting

5. **Machine Learning**
    - Learn from user corrections
    - Improve extraction accuracy over time
    - Project-specific pattern recognition

---

## Conclusion

This enhancement plan transforms ClaudeHopper from a basic text search tool into a comprehensive construction document intelligence platform. The phased approach ensures:

- **Incremental value delivery** - Each phase adds standalone capability
- **Risk management** - Early phases validate approach before heavy investment
- **Resource efficiency** - Parallel workstreams where possible
- **Measurable progress** - Clear success metrics for each phase

**Estimated Timeline:** 12 weeks for core enhancements (Phases 1-6)

**Estimated Cost:**

- Development: ~480 hours
- Vision API: ~$0.30-0.50 per sheet (one-time)
- Infrastructure: Minimal incremental cost

**ROI:** Eliminates manual quantity takeoffs (typically 8-40 hours per project), enables accurate estimates, reduces errors and RFIs.

---

_Document prepared for ClaudeHopper MCP development team_
_Version 1.0 - February 2, 2026_
