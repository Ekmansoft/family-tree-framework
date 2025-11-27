export interface Individual {
    id: string;
    name: string;
    birthDate?: string;
    deathDate?: string;
    gender?: 'M' | 'F' | 'U';
    families: string[]; // IDs of families this individual is part of
}

export interface Family {
    id: string;
    parents?: string[]; // IDs of parents (husband, wife or other)
    children: string[]; // IDs of children
    marriageDate?: any; // Parsed marriage date from MARR tag (same format as birthDate/deathDate)
}

export interface GedcomData {
    individuals: Record<string, Individual>;
    families: Record<string, Family>;
}