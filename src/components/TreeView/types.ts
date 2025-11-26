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
    marriageDate?: string;
}

export interface Position {
    x: number;
    y: number;
}
