/**
 * Runtime prop validation for TreeView
 */

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

export function validateTreeViewProps(props: {
    individuals?: any[];
    families?: any[];
    siblingGap?: number;
    parentGap?: number;
    ancestorFamilyGap?: number;
    descendantFamilyGap?: number;
    maxGenerationsForward?: number;
    maxGenerationsBackward?: number;
}): ValidationResult {
    const errors: string[] = [];

    // Validate individuals
    if (!props.individuals || !Array.isArray(props.individuals)) {
        errors.push('individuals must be an array');
    }

    // Validate families
    if (props.families !== undefined && !Array.isArray(props.families)) {
        errors.push('families must be an array');
    }

    // Validate numeric props
    const numericProps = [
        'siblingGap',
        'parentGap',
        'ancestorFamilyGap',
        'descendantFamilyGap',
        'maxGenerationsForward',
        'maxGenerationsBackward'
    ];

    numericProps.forEach(propName => {
        const value = (props as any)[propName];
        if (value !== undefined && (typeof value !== 'number' || isNaN(value) || value < 0)) {
            errors.push(`${propName} must be a non-negative number`);
        }
    });

    return {
        isValid: errors.length === 0,
        errors
    };
}
