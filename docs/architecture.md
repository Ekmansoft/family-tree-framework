# Architecture of the Family Tree Framework

## Overview

The Family Tree Framework is designed to provide a robust and user-friendly interface for importing, presenting, and editing genealogy family trees from GEDCOM files. The architecture is modular, allowing for easy maintenance and extensibility.

## Components

### 1. Core

- **Engine**: Manages the overall application state and lifecycle. It is responsible for loading GEDCOM files and coordinating between different components of the framework.
- **Renderer**: Handles the rendering of the family tree and updates the UI based on state changes. It ensures that the visual representation is always in sync with the underlying data.
- **EventManager**: Manages event dispatching and listening for user interactions. It allows components to communicate with each other in a decoupled manner.

### 2. Parser

- **GEDCOM Parser**: This module is responsible for parsing GEDCOM files. It converts the raw data from GEDCOM format into a structured representation that can be easily manipulated within the framework.
  - **Date Parsing**: Structured parsing of GEDCOM dates (birth, death, marriage) with ISO format output
  - **Marriage Date Support**: Extracts marriage dates from MARR/DATE tags for chronological ordering
  - **Validation**: Removes invalid individual/family references and normalizes IDs
  - **Error Reporting**: Provides detailed validation errors for troubleshooting
  
- **Types**: Defines the types and interfaces related to GEDCOM data structures, such as `Individual` and `Family`, ensuring type safety and clarity in data handling.

### 3. Components

- **TreeView**: A visual representation of the family tree structure. It displays individuals and their relationships in an intuitive manner.
  - **Layout Algorithm**: Uses a recursive family-centric layout system with intelligent spacing
  - **Generation Filtering**: Supports limiting forward and backward generations
  - **Tree Component Discovery**: Automatically identifies disconnected tree components
  - **Focus & Selection**: Centers view on selected individuals with automatic scrolling
  
- **TreeNode**: Represents an individual node in the family tree. It handles rendering and user interactions, such as selecting or editing a person.

- **Editors**: 
  - **PersonEditor**: Provides a user interface for editing individual person details, such as name, birth date, and other attributes.
  - **RelationshipEditor**: Allows users to edit relationships between individuals, facilitating the management of family connections.
  
- **Toolbar**: Offers common actions for the application, such as saving changes and undoing actions.

### 4. Hooks

- **useUndoRedo**: A custom hook that manages the undo and redo functionality for the application state, enhancing user experience by allowing easy navigation through changes.

### 5. Utilities

- **Helpers**: Contains utility functions that assist with various tasks throughout the framework, such as formatting dates or generating unique IDs.

- **Layout System** (`familyLayout.ts`): Advanced layout algorithm for positioning family trees
  - **Width Calculations**: Uses simple family width (spouses only) instead of recursive tree width for efficient spacing
  - **Generation Centering**: Centers all generations around the selected individual's x-position
  - **Collision Detection**: Tracks occupied horizontal space per generation to prevent overlaps
  - **Smart Positioning**: 
    - Searches outward from preferred positions when conflicts occur
    - Maintains left-to-right ordering to reduce crossing lines
    - Handles multiple marriages by creating separate family units
  - **Direction-Aware**: Different layout strategies for ancestors vs. descendants
  - **Configurable Gaps**: Separate gap constants for spouses (20px), ancestors (40px), and descendants (40px)
  
- **Width Calculation** (`familyWidthCalculation.ts`): Recursive computation of family tree widths including all descendants

## Design Principles

- **Modularity**: Each component is designed to be independent, promoting reusability and easier testing.
- **Separation of Concerns**: The architecture separates data handling (parser), state management (engine), and presentation (renderer and components), making the codebase easier to understand and maintain.
- **User-Centric Design**: The framework focuses on providing a seamless user experience, with intuitive interfaces for editing and navigating family trees.
- **Performance First**: Smart algorithms minimize computation:
  - Simple width calculations avoid recursive overhead
  - Map-based lookups for O(1) access
  - Generation-level processing for efficient collision detection
- **Genealogy Standards**: Proper handling of complex family structures:
  - Multiple marriages displayed separately
  - Chronological ordering by marriage date
  - Support for unlimited generations
  - Maintains visual hierarchy and readability

## Conclusion

The Family Tree Framework is built with modern web technologies, ensuring performance and scalability. Its architecture supports easy integration of new features and enhancements, making it a powerful tool for genealogy enthusiasts.