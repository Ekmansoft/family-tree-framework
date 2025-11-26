/**
 * Utility functions for building relationship maps
 */

import type { Family } from '../types';

export interface RelationshipMaps {
    personToChildFamilies: Map<string, string[]>;
    personToParentFamilies: Map<string, string[]>;
}

/**
 * Build maps linking individuals to their families
 * - personToChildFamilies: Maps person ID to families where they appear as a child
 * - personToParentFamilies: Maps person ID to families where they appear as a parent
 */
export function buildRelationshipMaps(families: Family[]): RelationshipMaps {
    const personToChildFamilies = new Map<string, string[]>();
    const personToParentFamilies = new Map<string, string[]>();
    
    families.forEach(fam => {
        // Map children to their parent family
        (fam.children || []).forEach(childId => {
            if (!personToChildFamilies.has(childId)) {
                personToChildFamilies.set(childId, []);
            }
            personToChildFamilies.get(childId)!.push(fam.id);
        });
        
        // Map parents to their child families
        (fam.parents || []).forEach(parentId => {
            if (!personToParentFamilies.has(parentId)) {
                personToParentFamilies.set(parentId, []);
            }
            personToParentFamilies.get(parentId)!.push(fam.id);
        });
    });
    
    return { personToChildFamilies, personToParentFamilies };
}
