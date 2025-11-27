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
