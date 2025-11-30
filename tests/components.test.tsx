import React from 'react';
import { render, screen } from '@testing-library/react';
import VerticalTreeView from '../src/components/TreeView/VerticalTreeView';
import PersonEditor from '../src/components/Editor/PersonEditor';
import RelationshipEditor from '../src/components/Editor/RelationshipEditor';

describe('VerticalTreeView Component', () => {
    test('requires selectedId before rendering', () => {
        const { container } = render(<VerticalTreeView individuals={[]} />);
        expect(container.querySelector('.no-focus')).toBeInTheDocument();
    });

    test('renders TreeView with individuals when selectedId provided', () => {
        const individuals = [
            { id: 'I1', name: 'John Doe', families: [] },
            { id: 'I2', name: 'Jane Doe', families: [] }
        ];
        const { container } = render(<VerticalTreeView individuals={individuals} selectedId="I1" />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('renders TreeView with families when selectedId provided', () => {
        const individuals = [
            { id: 'I1', name: 'John Doe', families: ['F1'] },
            { id: 'I2', name: 'Jane Doe', families: ['F1'] },
            { id: 'I3', name: 'Child Doe', families: [] }
        ];
        const families = [
            { id: 'F1', parents: ['I1', 'I2'], children: ['I3'] }
        ];
        const { container } = render(<VerticalTreeView individuals={individuals} families={families} selectedId="I1" />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('accepts maxGenerationsForward prop with selectedId', () => {
        const individuals = [{ id: 'I1', name: 'John Doe', families: [] }];
        const { container } = render(<VerticalTreeView individuals={individuals} selectedId="I1" maxGenerationsForward={5} />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('accepts maxGenerationsBackward prop with selectedId', () => {
        const individuals = [{ id: 'I1', name: 'John Doe', families: [] }];
        const { container } = render(<VerticalTreeView individuals={individuals} selectedId="I1" maxGenerationsBackward={10} />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('shows placeholder when selectedId missing even if focusItem passed (deprecated)', () => {
        const individuals = [{ id: 'I1', name: 'John Doe', families: [] }];
        const { container } = render(<VerticalTreeView individuals={individuals} />);
        expect(container.querySelector('.no-focus')).toBeInTheDocument();
    });

    test('renders when selectedId is parent of a family', () => {
        const individuals = [
            { id: 'I1', name: 'Parent1', families: ['F1'] },
            { id: 'I2', name: 'Parent2', families: ['F1'] },
            { id: 'I3', name: 'Child', families: [] }
        ];
        const families = [
            { id: 'F1', parents: ['I1', 'I2'], children: ['I3'] }
        ];
        const { container } = render(<VerticalTreeView individuals={individuals} families={families} selectedId="I1" />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
        // Should render the family and its members
        expect(container.textContent).toContain('Parent1');
    });

    test('filters invalid individual references from families with selectedId', () => {
        const individuals = [
            { id: 'I1', name: 'Valid Person', families: [] }
        ];
        const families = [
            { id: 'F1', parents: ['I1', 'INVALID'], children: ['I3'] } // I3 doesn't exist
        ];
        const { container } = render(<VerticalTreeView individuals={individuals} families={families} selectedId="I1" />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('shows placeholder when selectedId not found in individuals', () => {
        const individuals = [
            { id: 'I1', name: 'Person', families: [] }
        ];
        const { container } = render(<VerticalTreeView individuals={individuals} selectedId="NONEXISTENT" />);
        expect(container.querySelector('.no-focus')).toBeInTheDocument();
    });
});

describe('PersonEditor Component', () => {
    test('renders PersonEditor correctly', () => {
        render(<PersonEditor person={{ id: 'p1', name: 'Jane Doe', birthDate: '1990-01-01' }} onSave={() => {}} onCancel={() => {}} />);
        expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    });
});

describe('RelationshipEditor Component', () => {
    test('renders RelationshipEditor correctly', () => {
        const family = { id: 'F1', parents: [], children: [] };
        const individuals = [{ id: 'I1', name: 'John Doe' }];
        render(<RelationshipEditor family={family} individuals={individuals} onSave={() => {}} onCancel={() => {}} />);
        expect(screen.getByText(/edit family/i)).toBeInTheDocument();
    });
});