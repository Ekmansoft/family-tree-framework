import { parseGedcom } from '../src/parser/gedcom/parser';
import { Individual, Family } from '../src/parser/gedcom/types';

describe('GEDCOM Parser', () => {
    it('should correctly parse a simple GEDCOM file', () => {
        const gedcomData = `
            0 HEAD
            1 SOUR MyGenealogyApp
            0 @I1@ INDI
            1 NAME John /Doe/
            1 SEX M
            0 @I2@ INDI
            1 NAME Jane /Doe/
            1 SEX F
            0 @F1@ FAM
            1 HUSB @I1@
            1 WIFE @I2@
        `;
        
        const result = parseGedcom(gedcomData);
        
        expect(result.individuals).toHaveLength(2);
        expect(result.individuals[0]).toEqual<Individual>({
            id: 'I1',
            name: 'John Doe',
            gender: 'M',
            families: ['F1']
        });
        expect(result.individuals[1]).toEqual<Individual>({
            id: 'I2',
            name: 'Jane Doe',
            gender: 'F',
            families: ['F1']
        });
        expect(result.families).toHaveLength(1);
        expect(result.families[0]).toEqual<Family>({
            id: 'F1',
            parents: ['I1', 'I2'],
            children: []
        });
    });

    it('should handle empty GEDCOM files gracefully', () => {
        const gedcomData = '';
        const result = parseGedcom(gedcomData);
        expect(result).toEqual({ individuals: [], families: [] });
    });

    it('should throw an error for invalid GEDCOM format', () => {
        const gedcomData = `
            0 HEAD
            1 SOUR MyGenealogyApp
            0 @I1@ INDI
            1 NAME John /Doe/
            1 SEX M
            0 @I2@ INDI
            1 NAME Jane /Doe/
            1 SEX F
            0 @F1@ FAM
            1 HUSB @I1@
            1 WIFE @I2@
            0 INVALID
        `;
        
        const resultInvalid = parseGedcom(gedcomData);
        expect(resultInvalid).toHaveProperty('individuals');
    });
});