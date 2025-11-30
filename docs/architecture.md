# Architecture of the Family Tree Framework

## Overview

The Family Tree Framework is a modern React/TypeScript library for importing, visualizing, and navigating genealogy family trees from GEDCOM files. The architecture is component-based and modular, designed as a reusable library that integrates into any React application.

## Core Architecture

The framework follows a **component-centric architecture** where the application consumes exported React components and utility functions. There is no application-level state management layer - instead, components accept data props and callbacks, allowing parent applications to manage state as needed.

## Components

### 1. Parser

- **GEDCOM Parser**: This module is responsible for parsing GEDCOM files. It converts the raw data from GEDCOM format into a structured representation that can be easily manipulated within the framework.
  - **Date Parsing**: Structured parsing of GEDCOM dates (birth, death, marriage) with ISO format output
  - **Marriage Date Support**: Extracts marriage dates from MARR/DATE tags for chronological ordering
  - **Validation**: Removes invalid individual/family references and normalizes IDs
  - **Error Reporting**: Provides detailed validation errors for troubleshooting
  
- **Types**: Defines the types and interfaces related to GEDCOM data structures, such as `Individual` and `Family`, ensuring type safety and clarity in data handling.

### 2. React Components

#### TreeView Components
- **TreeView**: The primary component for rendering family trees with vertical (top-to-bottom) layout.
  - **Layout Strategy Pattern**: Uses pluggable layout strategies (VerticalTreeLayout) via the TreeLayoutStrategy interface
  - **Generation Filtering**: Supports limiting forward and backward generations from a focus individual
  - **Tree Component Discovery**: Automatically identifies disconnected tree components in the dataset
  - **Focus & Selection**: Centers view on selected individuals with automatic scrolling
  - **Click Interactions**: Person and family boxes are clickable for navigation and focus changes

- **AncestorTreeView**: Specialized component for left-to-right ancestor visualization.
  - **Symmetric Layout**: Parents positioned symmetrically above/below children
  - **Configurable Depth**: Supports customizable maximum ancestor generations
  - **Space-Efficient**: Uses horizontal spacing optimized for deep ancestry chains

#### UI Components
- **PersonBox**: Renders individual person cards with name, dates, and gender indicators
  - Supports click handlers for selection
  - Memoized for performance with large trees
  
- **FamilyBox**: Displays family unit boxes showing marriage information
  - Renders between parent and child generations
  - Shows marriage dates when available

- **ConnectionLines**: Draws SVG lines connecting individuals and families
  - Adaptive line routing to avoid overlaps
  - Visual distinction between parent-child and spouse connections

#### Editor Components
- **PersonEditor**: Provides a user interface for editing individual person details, such as name, birth date, and other attributes.
- **RelationshipEditor**: Allows users to edit relationships between individuals, facilitating the management of family connections.

#### Utility Components  
- **ErrorBoundary**: React error boundary for graceful error handling
- **LazyEditors**: Code-split editor components loaded on-demand

### 3. Layout System

The framework uses a **Strategy Pattern** for layouts, allowing different tree visualizations to be plugged in:

#### VerticalTreeLayout
- **Family-Centric Positioning**: Positions families as cohesive units with parents horizontally adjacent
- **Generation Assignment**: BFS-based algorithm assigns generation levels relative to focus individual
- **Spacing Algorithms**: 
  - Ancestor generations: Groups spouses, centers families above children
  - Descendant generations: Packs spouse groups, centers children under parents
  - Configurable gaps: siblingGap, parentGap, interGroupGap
- **Collision Avoidance**: Horizontal repacking prevents node overlaps within generations
- **Vertical Bias**: Family boxes positioned closer to parents (30% interpolation)

#### AncestorTreeLayout  
- **Horizontal Generations**: Each generation forms a vertical column moving left
- **Fixed Spacing**: Predictable vertical spacing based on maximum generation depth
- **Symmetric Parents**: Father above, mother below, maintaining visual balance

### 4. Hooks

- **useUndoRedo**: A custom hook that manages the undo and redo functionality for application state, enhancing user experience by allowing easy navigation through changes.

### 5. Utilities

#### Tree Manipulation Utilities
- **treeFiltering.ts**: Discovers disconnected tree components and filters individuals/families based on reachability
  - `discoverTreeComponents`: Identifies separate family trees in dataset
  - `buildRelationshipMaps`: Creates bidirectional parent/child lookup maps

- **generationAssignment.ts**: BFS-based algorithm for assigning generation levels
  - Bidirectional traversal (ancestors backward, descendants forward)
  - Configurable depth limits in both directions

- **relationshipMaps.ts**: Utility for building efficient person-to-family mappings
  - Creates bidirectional maps linking individuals to families
  - O(1) lookup performance for relationship queries

#### Layout Utilities
- **familyLayout.ts**: Core layout algorithm positioning family units
  - Width calculations for families (spouse width vs full tree width)
  - Generation-level collision detection and spacing
  - Outward search for conflict-free positioning

- **familyWidthCalculation.ts**: Recursive computation of family tree widths including all descendants
  - Used for determining required horizontal space

- **propValidation.ts**: Validates TreeView component props at runtime
  - Type checking and constraint validation
  - Development-mode warnings for invalid configurations

- **virtualRendering.ts**: Performance optimization for large trees
  - Viewport-based culling of off-screen elements
  - Configurable item limits to prevent rendering bottlenecks

#### General Utilities
- **helpers.ts**: Common utility functions
  - `debounce`: Delays function execution for performance
  - `memoize`: Caches function results

- **treeExport.ts**: Export tree visualizations to images
  - PNG export via canvas rendering
  - SVG export preserving vector quality
  - Automatic download handling

## Design Principles

- **Library-First Architecture**: Designed as a reusable React library, not a standalone application
  - Components are composable and accept standard React props
  - No global state management - consumers control state
  - Framework-agnostic core logic (layout algorithms, parsers)

- **Modularity**: Each component and utility is designed to be independent, promoting reusability and easier testing.

- **Separation of Concerns**: 
  - Data parsing (GEDCOM parser) is independent of visualization
  - Layout algorithms (strategies) separated from rendering (React components)
  - Utility functions organized by domain (tree manipulation, layout, export)

- **User-Centric Design**: The framework focuses on providing a seamless user experience
  - Intuitive interfaces for navigating large family trees
  - Click-to-focus interactions
  - Configurable generation limits for performance
  - Lazy-loaded editors for code splitting

- **Performance First**: Smart algorithms minimize computation
  - Strategy pattern allows optimized layouts per tree type
  - Map-based lookups for O(1) relationship access
  - Generation-level collision detection (no global comparisons)
  - Virtual rendering for large datasets
  - Memoized components to prevent unnecessary re-renders

- **Genealogy Standards**: Proper handling of complex family structures
  - Multiple marriages displayed separately
  - Chronological ordering by marriage date
  - Support for unlimited generations (configurable limits)
  - Maintains visual hierarchy and readability
  - Handles disconnected tree components

- **Type Safety**: Full TypeScript coverage
  - Strict typing for all components and utilities
  - Interface-based layout strategies
  - Compile-time error detection

## Testing

The framework includes comprehensive test coverage:
- **Parser tests**: GEDCOM parsing, validation, date handling
- **Layout tests**: Generation ordering, spacing, collision avoidance
- **Component tests**: React component rendering and interactions
- **43 passing tests** ensuring reliability across core functionality

## Conclusion

The Family Tree Framework is built with modern web technologies (React 18, TypeScript, Vite), ensuring performance and scalability. Its architecture as a library (not an application) makes it easy to integrate into existing projects. The Strategy Pattern for layouts and modular utility structure support easy extension with new features and visualizations.