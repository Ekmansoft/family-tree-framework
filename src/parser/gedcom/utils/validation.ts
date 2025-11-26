/**
 * Validation utilities for GEDCOM data
 */

export interface ValidationError {
    type: 'invalid_family_reference' | 'invalid_parent_reference' | 'invalid_child_reference';
    message: string;
    entityId: string;
    referenceId: string;
}

/**
 * Validate and clean up references between individuals and families
 * Removes references to non-existent entities and collects validation errors
 */
export const validateReferences = (
    individuals: any[],
    families: any[]
): ValidationError[] => {
    const validationErrors: ValidationError[] = [];
    const validIndividualIds = new Set(individuals.map(i => i.id));
    const validFamilyIds = new Set(families.map(f => f.id));
    let invalidRefsRemoved = 0;
    
    // Validate family references in individuals
    individuals.forEach(ind => {
        const originalFamilies = ind.families || [];
        ind.families = originalFamilies.filter((fid: string) => {
            if (!validFamilyIds.has(fid)) {
                invalidRefsRemoved++;
                validationErrors.push({
                    type: 'invalid_family_reference',
                    message: `Individual ${ind.id} references non-existent family ${fid}`,
                    entityId: ind.id,
                    referenceId: fid
                });
                return false;
            }
            return true;
        });
    });
    
    // Validate individual references in families
    families.forEach(fam => {
        const originalParents = fam.parents || [];
        const originalChildren = fam.children || [];
        
        // Filter out invalid parent references
        fam.parents = originalParents.filter((pid: string) => {
            if (!validIndividualIds.has(pid)) {
                invalidRefsRemoved++;
                validationErrors.push({
                    type: 'invalid_parent_reference',
                    message: `Family ${fam.id} references non-existent parent ${pid}`,
                    entityId: fam.id,
                    referenceId: pid
                });
                return false;
            }
            return true;
        });
        
        // Filter out invalid child references
        fam.children = originalChildren.filter((cid: string) => {
            if (!validIndividualIds.has(cid)) {
                invalidRefsRemoved++;
                validationErrors.push({
                    type: 'invalid_child_reference',
                    message: `Family ${fam.id} references non-existent child ${cid}`,
                    entityId: fam.id,
                    referenceId: cid
                });
                return false;
            }
            return true;
        });
    });
    
    return validationErrors;
};
