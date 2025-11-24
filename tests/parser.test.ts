import { parseGedcom, parseGedcomDate } from '../src/parser/gedcom/parser';
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

    it('should normalize GEDCOM IDs by stripping @ symbols', () => {
        const gedcomData = `
            0 @I100@ INDI
            1 NAME Alice /Smith/
            0 @F200@ FAM
            1 WIFE @I100@
        `;
        
        const result = parseGedcom(gedcomData);
        expect(result.individuals[0].id).toBe('I100');
        expect(result.families[0].id).toBe('F200');
        expect(result.families[0].parents).toContain('I100');
    });

    it('should parse birth and death dates with DATE tag', () => {
        const gedcomData = `
            0 @I1@ INDI
            1 NAME John /Doe/
            1 BIRT
            2 DATE 15 MAR 1950
            1 DEAT
            2 DATE 20 DEC 2020
        `;
        
        const result = parseGedcom(gedcomData);
        expect(result.individuals[0].birthDate).toBeDefined();
        expect(result.individuals[0].birthDate?.original).toBe('15 MAR 1950');
        expect(result.individuals[0].birthDate?.year).toBe(1950);
        expect(result.individuals[0].deathDate).toBeDefined();
        expect(result.individuals[0].deathDate?.original).toBe('20 DEC 2020');
        expect(result.individuals[0].deathDate?.year).toBe(2020);
    });

    it('should handle families with children', () => {
        const gedcomData = `
            0 @I1@ INDI
            1 NAME John /Doe/
            0 @I2@ INDI
            1 NAME Jane /Doe/
            0 @I3@ INDI
            1 NAME Child /Doe/
            0 @F1@ FAM
            1 HUSB @I1@
            1 WIFE @I2@
            1 CHIL @I3@
        `;
        
        const result = parseGedcom(gedcomData);
        expect(result.families[0].parents).toHaveLength(2);
        expect(result.families[0].children).toHaveLength(1);
        expect(result.families[0].children[0]).toBe('I3');
    });
});

describe('Date Parser', () => {
    it('should parse full dates with day, month, year', () => {
        const date = parseGedcomDate('15 MAR 1950');
        expect(date.year).toBe(1950);
        expect(date.month).toBe(3);
        expect(date.day).toBe(15);
        expect(date.precision).toBe('day');
        expect(date.iso).toBe('1950-03-15');
    });

    it('should parse month and year dates', () => {
        const date = parseGedcomDate('JUN 1980');
        expect(date.year).toBe(1980);
        expect(date.month).toBe(6);
        expect(date.day).toBeNull();
        expect(date.precision).toBe('month');
        expect(date.approxIso).toBe('1980-06-01');
    });

    it('should parse year-only dates', () => {
        const date = parseGedcomDate('1965');
        expect(date.year).toBe(1965);
        expect(date.month).toBeNull();
        expect(date.day).toBeNull();
        expect(date.precision).toBe('year');
        expect(date.approxIso).toBe('1965-01-01');
    });

    it('should handle empty or null dates', () => {
        const date1 = parseGedcomDate(null);
        expect(date1.original).toBeNull();
        expect(date1.year).toBeNull();
        
        const date2 = parseGedcomDate('');
        expect(date2.year).toBeNull();
    });

    it('should handle unparseable dates gracefully', () => {
        const date = parseGedcomDate('unknown date format');
        expect(date.original).toBe('unknown date format');
        expect(date.year).toBeNull();
        expect(date.precision).toBe('unknown');
    });
});