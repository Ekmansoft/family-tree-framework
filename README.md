# Family Tree Framework

## Overview
The Family Tree Framework is a modern TypeScript/React library for visualizing and navigating genealogy family trees from GEDCOM files. It provides a flexible, family-centric layout with support for large datasets and advanced filtering capabilities.

## Features
- **GEDCOM Import & Validation**: Parse GEDCOM files with automatic validation to handle corrupt data
  - Removes invalid individual/family references
  - Normalizes IDs and formats
  - Structured date parsing (birth/death dates with ISO output)
- **Family-Centric Layout**: Positions families as units with proper generation-based alignment
  - Recursive layout algorithm with measured widths
  - Dynamic sibling gap adjustment for wide trees
  - Automatic coordinate normalization
- **Advanced Navigation**:
  - Focus on specific individuals or families
  - Generation limiting (forward and backward)
  - Tree truncation (limit number of displayed trees)
  - Click-to-focus from searchable person list
  - Automatic scroll centering
- **Performance Optimized**:
  - Handles large files (4000+ individuals tested with Queen.ged)
  - O(n) filtering with Map-based lookups
  - Limited rendering (configurable item limit)
  - Auto-configuration for large datasets
- **Interactive Features**:
  - Click person boxes to focus and filter tree
  - Click family boxes to view family units
  - Searchable person list with birth/death dates
  - Pan and zoom support (demo)
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
  maxNumberOfTrees={1}
  onSelectPerson={(id) => console.log('Selected:', id)}
/>
```

### TreeView Props
- `individuals`: Array of individual objects with id, name, birthDate, deathDate, etc.
- `families`: Array of family objects with id, parents[], children[]
- `focusItem`: Individual or family ID to center the tree on
- `maxGenerationsForward`: Limit descendant generations (default: 100)
- `maxGenerationsBackward`: Limit ancestor generations (default: 10)
- `maxNumberOfTrees`: Limit number of separate family trees displayed
- `selectedId`: Currently selected person ID
- `onSelectPerson`: Callback when person box clicked
- `onSelectFamily`: Callback when family box clicked
- `siblingGap`: Horizontal spacing between siblings (default: 28px)

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
- Very wide trees (many siblings) may require horizontal scrolling even with dynamic gap adjustment
- Layout is optimized for descendant trees; ancestor-heavy trees may need layout tuning
- Performance degrades with >10,000 individuals (consider pagination for larger datasets)

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