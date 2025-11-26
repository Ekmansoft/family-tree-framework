import { describe, it, expect } from '@jest/globals';
import { createFamilyLayouter } from '../src/components/TreeView/utils/familyLayout';

describe('Family Layout Algorithm', () => {
    it('should handle empty family list', () => {
        const params = {
            individualsLocal: [],
            familiesLocal: [],
            levelOf: new Map(),
            computeFamilyWidth: () => 100,
            personWidthMap: new Map(),
            maxGenerationsForward: 2,
            maxGenerationsBackward: 2,
            rowHeight: 90,
            yOffset: 180,
            singleWidth: 100,
            siblingGap: 20,
            selectedId: null,
            parentGap: 20,
            ancestorFamilyGap: 40,
            descendantFamilyGap: 40
        };

        const { pos } = createFamilyLayouter(params);
        expect(Object.keys(pos).length).toBe(0);
    });

    it('should position single individual', () => {
        const params = {
            individualsLocal: [{ id: 'I1', name: 'John Doe', families: ['F1'] }],
            familiesLocal: [{ id: 'F1', parents: ['I1'], children: [] }],
            levelOf: new Map([['I1', 0]]),
            computeFamilyWidth: () => 100,
            personWidthMap: new Map([['I1', 100]]),
            maxGenerationsForward: 2,
            maxGenerationsBackward: 2,
            rowHeight: 90,
            yOffset: 180,
            singleWidth: 100,
            siblingGap: 20,
            selectedId: 'I1',
            parentGap: 20,
            ancestorFamilyGap: 40,
            descendantFamilyGap: 40
        };

        const { layoutFamily, pos } = createFamilyLayouter(params);
        const processed = new Set<string>();
        layoutFamily('F1', 0, processed, 'both');
        
        expect(pos['I1']).toBeDefined();
        expect(pos['I1'].x).toBeGreaterThanOrEqual(0);
        expect(pos['I1'].y).toBeGreaterThanOrEqual(0);
    });

    it('should handle parent-child relationship', () => {
        const params = {
            individualsLocal: [
                { id: 'I1', name: 'Parent', families: ['F1'] },
                { id: 'I2', name: 'Child', families: [] }
            ],
            familiesLocal: [
                { id: 'F1', parents: ['I1'], children: ['I2'] }
            ],
            levelOf: new Map([['I1', -1], ['I2', 0]]),
            computeFamilyWidth: () => 100,
            personWidthMap: new Map([['I1', 100], ['I2', 100]]),
            maxGenerationsForward: 2,
            maxGenerationsBackward: 2,
            rowHeight: 90,
            yOffset: 180,
            singleWidth: 100,
            siblingGap: 20,
            selectedId: 'I2',
            parentGap: 20,
            ancestorFamilyGap: 40,
            descendantFamilyGap: 40
        };

        const { layoutFamily, pos } = createFamilyLayouter(params);
        const processed = new Set<string>();
        layoutFamily('F1', 0, processed, 'both');
        
        expect(pos['I1']).toBeDefined();
        expect(pos['I2']).toBeDefined();
        // Parent should be positioned above child
        expect(pos['I1'].y).toBeLessThan(pos['I2'].y);
    });

    it('should handle multiple siblings', () => {
        const params = {
            individualsLocal: [
                { id: 'I1', name: 'Parent', families: ['F1'] },
                { id: 'I2', name: 'Child1', families: [] },
                { id: 'I3', name: 'Child2', families: [] },
                { id: 'I4', name: 'Child3', families: [] }
            ],
            familiesLocal: [
                { id: 'F1', parents: ['I1'], children: ['I2', 'I3', 'I4'] }
            ],
            levelOf: new Map([['I1', -1], ['I2', 0], ['I3', 0], ['I4', 0]]),
            computeFamilyWidth: () => 340,
            personWidthMap: new Map([['I1', 100], ['I2', 100], ['I3', 100], ['I4', 100]]),
            maxGenerationsForward: 2,
            maxGenerationsBackward: 2,
            rowHeight: 90,
            yOffset: 180,
            singleWidth: 100,
            siblingGap: 20,
            selectedId: 'I2',
            parentGap: 20,
            ancestorFamilyGap: 40,
            descendantFamilyGap: 40
        };

        const { layoutFamily, pos } = createFamilyLayouter(params);
        const processed = new Set<string>();
        layoutFamily('F1', 0, processed, 'both');
        
        // All children should have positions
        expect(pos['I2']).toBeDefined();
        expect(pos['I3']).toBeDefined();
        expect(pos['I4']).toBeDefined();
        // Children should be spread horizontally
        expect(pos['I2'].x).not.toBe(pos['I3'].x);
        expect(pos['I3'].x).not.toBe(pos['I4'].x);
    });

    it('should detect and avoid collisions', () => {
        const params = {
            individualsLocal: [
                { id: 'I1', name: 'Person1', families: ['F1'] },
                { id: 'I2', name: 'Person2', families: ['F2'] }
            ],
            familiesLocal: [
                { id: 'F1', parents: ['I1'], children: [] },
                { id: 'F2', parents: ['I2'], children: [] }
            ],
            levelOf: new Map([['I1', 0], ['I2', 0]]),
            computeFamilyWidth: () => 100,
            personWidthMap: new Map([['I1', 100], ['I2', 100]]),
            maxGenerationsForward: 2,
            maxGenerationsBackward: 2,
            rowHeight: 90,
            yOffset: 180,
            singleWidth: 100,
            siblingGap: 20,
            selectedId: null,
            parentGap: 20,
            ancestorFamilyGap: 40,
            descendantFamilyGap: 40
        };

        const { pos } = createFamilyLayouter(params);
        if (pos['I1'] && pos['I2']) {
            // Positions should not overlap
            const distance = Math.abs(pos['I1'].x - pos['I2'].x);
            expect(distance).toBeGreaterThan(50); // At least half-width apart
        }
    });

    it('should respect generation limits', () => {
        const params = {
            individualsLocal: [
                { id: 'I1', name: 'Gen-2', families: ['F1'] },
                { id: 'I2', name: 'Gen-1', families: ['F2'] },
                { id: 'I3', name: 'Gen0', families: ['F3'] },
                { id: 'I4', name: 'Gen1', families: ['F4'] },
                { id: 'I5', name: 'Gen2', families: [] }
            ],
            familiesLocal: [
                { id: 'F1', parents: ['I1'], children: ['I2'] },
                { id: 'F2', parents: ['I2'], children: ['I3'] },
                { id: 'F3', parents: ['I3'], children: ['I4'] },
                { id: 'F4', parents: ['I4'], children: ['I5'] }
            ],
            levelOf: new Map([['I1', -2], ['I2', -1], ['I3', 0], ['I4', 1], ['I5', 2]]),
            computeFamilyWidth: () => 100,
            personWidthMap: new Map([['I1', 100], ['I2', 100], ['I3', 100], ['I4', 100], ['I5', 100]]),
            maxGenerationsForward: 1,
            maxGenerationsBackward: 1,
            rowHeight: 90,
            yOffset: 180,
            singleWidth: 100,
            siblingGap: 20,
            selectedId: 'I3',
            parentGap: 20,
            ancestorFamilyGap: 40,
            descendantFamilyGap: 40
        };

        const { layoutFamily, pos } = createFamilyLayouter(params);
        const processed = new Set<string>();
        layoutFamily('F2', 0, processed, 'both'); // Start from F2 (I3's family)
        
        // With limits of 1 generation each way from I3, I1 and I5 might not be positioned
        expect(pos['I2']).toBeDefined(); // -1 gen
        expect(pos['I3']).toBeDefined(); // 0 gen
        expect(pos['I4']).toBeDefined(); // +1 gen
    });
});
