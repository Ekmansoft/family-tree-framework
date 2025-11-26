# Family Tree Framework

## Overview
The Family Tree Framework is a modern TypeScript/React library for visualizing and navigating genealogy family trees from GEDCOM files. It provides a flexible, family-centric layout with support for large datasets and advanced filtering capabilities.

## Features
- **GEDCOM Import & Validation**: Parse GEDCOM files with automatic validation to handle corrupt data
  - Removes invalid individual/family references
  - Normalizes IDs and formats
  - Structured date parsing (birth/death dates with ISO output)
  - Marriage date parsing from MARR/DATE tags
- **Family-Centric Layout**: Positions families as units with proper generation-based alignment
  - Recursive layout algorithm with smart width calculations
  - Generation-level centering around selected individual
  - Collision detection to prevent overlaps
  - Automatic coordinate normalization
  - Multiple marriage support with chronological ordering
- **Advanced Navigation**:
  - Focus on specific individuals or families
  - Generation limiting (forward and backward)
  - Multiple tree selection (choose from available tree components)
  - Click-to-focus from searchable person list
  - Automatic scroll centering
- **Performance Optimized**:
  - Handles large files (4000+ individuals tested with Queen.ged)
  - O(n) filtering with Map-based lookups
  - Limited rendering (configurable item limit)
  - Auto-configuration for large datasets
  - Simple width calculations for efficient spacing
- **Interactive Features**:
  - Click person boxes to focus and filter tree
  - Click family boxes to view family units
  - Searchable person list with birth/death dates
  - Pan and zoom support (demo)
  - Multiple marriages displayed side-by-side
- **TypeScript & Testing**: Fully typed with 29 passing tests

## Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node package manager)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/Ekmansoft/family-tree-framework.git
   ```
2. Navigate to the project directory:
   ```bash
   cd family-tree-framework
   ```
3. Install the dependencies:
   ```bash
   npm install
   ```

### Running the Demo
To see the framework in action:
```bash
npm run dev
```
Then open http://localhost:3000 in your browser.

The demo includes:
- Sample GEDCOM files (small demos and Queen.ged with 4683 individuals)
- Interactive controls for generation limits and tree filtering
- Searchable person list with click-to-focus
- Debug panel for troubleshooting

### Building the Project
Build for production:
```bash
npm run build
```

Run tests:
```bash
npm test
```

## Usage

### Basic Example
```typescript
import { TreeView } from 'family-tree-framework';
import { parseGedcom } from 'family-tree-framework/parser';

// Parse GEDCOM file
const gedcomText = '...'; // your GEDCOM content
const { individuals, families } = parseGedcom(gedcomText);

// Render tree
<TreeView
  individuals={individuals}
  families={families}
  focusItem="I1"
  maxGenerationsForward={10}
  maxGenerationsBackward={5}
  selectedTreeIndex={0}
  onSelectPerson={(id) => console.log('Selected:', id)}
/>
```

### TreeView Props
- `individuals`: Array of individual objects with id, name, birthDate, deathDate, etc.
- `families`: Array of family objects with id, parents[], children[], marriageDate
- `focusItem`: Individual or family ID to center the tree on
- `maxGenerationsForward`: Limit descendant generations (default: 100)
- `maxGenerationsBackward`: Limit ancestor generations (default: 10)
- `selectedTreeIndex`: Which tree component to display (0 = largest, 1 = second largest, etc.)
- `selectedId`: Currently selected person ID (used for centering generations)
- `onSelectPerson`: Callback when person box clicked
- `onSelectFamily`: Callback when family box clicked
- `siblingGap`: Horizontal spacing between siblings (default: 20px)

Note: The framework automatically discovers all tree components. Use `discoverTreeComponents()` to get a list of available trees and their sizes.

### Layout Algorithm
The framework uses an intelligent layout algorithm with the following features:

**Spacing & Width Calculations:**
- Uses simple family width (just the spouses) for spacing calculations, not recursive tree width
- Prevents excessive gaps while maintaining visual clarity
- `parentGap`: 20px between spouses
- `ancestorFamilyGap`: 40px between ancestor family units
- `descendantFamilyGap`: 40px between descendant family units

**Generation Centering:**
- All ancestor and descendant generations are centered around the selected individual's x-position
- Provides balanced, symmetrical tree visualization

**Collision Detection:**
- Tracks occupied horizontal space at each generation level
- Automatically adjusts positions to prevent overlaps
- Searches outward from preferred positions when conflicts occur

**Ordering & Organization:**
- Children sorted by birth date (oldest to youngest, left to right)
- Ancestor families positioned left-to-right matching parent order
- Multiple marriages sorted chronologically by marriage date
- Reduces crossing lines and improves readability

**Multiple Marriages:**
- Each marriage appears as a separate family unit
- Person with multiple spouses shows each marriage side-by-side
- Children grouped with their respective parent pairs

### Date Parsing
The parser exports `parseGedcomDate` for structured date handling:
```typescript
import { parseGedcomDate } from 'family-tree-framework/parser';

const date = parseGedcomDate('15 MAR 1950');
// Returns: { year: 1950, month: 3, day: 15, precision: 'day', iso: '1950-03-15', approxIso: '1950-03-15', original: '15 MAR 1950' }
```

## Documentation
For detailed information on the architecture and GEDCOM specification, please refer to:
- [Architecture](docs/architecture.md) - Component structure and layout algorithms
- [GEDCOM Specification](docs/gedcom-spec.md) - GEDCOM file format details

## Known Limitations
- Very wide trees (many siblings) may require horizontal scrolling
- Performance degrades with >10,000 individuals (consider pagination for larger datasets)
- Complex ancestor trees with many branches may need manual adjustment of gap constants

## Troubleshooting

### Connector Lines Missing
If person boxes render but connector lines are missing, check:
- Ensure all referenced individuals exist in the individuals array
- Run with `window.DEBUG_POSITIONS = true` in console for diagnostic output

### Empty Tree After Clicking Family Box
The family box click should now work correctly. If issues persist:
- Verify the family has valid members in the filtered dataset
- Check generation limits aren't excluding all family members

## Contributing
Contributions are welcome! Please:
1. Run tests with `npm test` before submitting
2. Follow TypeScript strict mode conventions
3. Submit a pull request or open an issue for enhancements/bugs

## License
This project is licensed under the MIT License. See the LICENSE file for more details.