/**
 * Shared type definitions for TreeView components
 */

export interface Individual {
    id: string;
    name: string;
    birthDate?: string;
    deathDate?: string;
    gender?: 'M' | 'F' | 'U';
    families: string[];
}

export interface Family {
    id: string;
    parents?: string[];
    children: string[];
    marriageDate?: any; // Parsed date object (same format as birthDate/deathDate)
}

export interface Position {
    x: number;
    y: number;
}

// Common props shared by tree views
export interface TreeViewCommonProps {
    individuals: Individual[];
    families?: Family[];
    selectedId?: string | null;
    onSelectPerson?: (id: string) => void;
    onBounds?: (width: number, height: number) => void;
    boxWidth?: number;
    boxHeight?: number;
    familyToParentDistance?: number; // vertical distance from family box to parent boxes
    familyToChildrenDistance?: number; // vertical distance from family box to children boxes
}
