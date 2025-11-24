import React from 'react';
import { render, screen } from '@testing-library/react';
import TreeView from '../src/components/TreeView/TreeView';
import TreeNode from '../src/components/TreeView/TreeNode';
import PersonEditor from '../src/components/Editor/PersonEditor';
import RelationshipEditor from '../src/components/Editor/RelationshipEditor';
import Toolbar from '../src/components/Shared/Toolbar';

describe('TreeView Component', () => {
    test('renders TreeView correctly', () => {
        const { container } = render(<TreeView individuals={[]} />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('renders TreeView with individuals', () => {
        const individuals = [
            { id: 'I1', name: 'John Doe', families: [] },
            { id: 'I2', name: 'Jane Doe', families: [] }
        ];
        const { container } = render(<TreeView individuals={individuals} />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('renders TreeView with families', () => {
        const individuals = [
            { id: 'I1', name: 'John Doe', families: ['F1'] },
            { id: 'I2', name: 'Jane Doe', families: ['F1'] },
            { id: 'I3', name: 'Child Doe', families: [] }
        ];
        const families = [
            { id: 'F1', parents: ['I1', 'I2'], children: ['I3'] }
        ];
        const { container } = render(<TreeView individuals={individuals} families={families} />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('accepts maxGenerationsForward prop', () => {
        const individuals = [{ id: 'I1', name: 'John Doe', families: [] }];
        const { container } = render(<TreeView individuals={individuals} maxGenerationsForward={5} />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('accepts maxGenerationsBackward prop', () => {
        const individuals = [{ id: 'I1', name: 'John Doe', families: [] }];
        const { container } = render(<TreeView individuals={individuals} maxGenerationsBackward={10} />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('accepts focusItem prop', () => {
        const individuals = [{ id: 'I1', name: 'John Doe', families: [] }];
        const { container } = render(<TreeView individuals={individuals} focusItem="I1" />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('accepts maxNumberOfTrees prop', () => {
        const individuals = [{ id: 'I1', name: 'John Doe', families: [] }];
        const { container } = render(<TreeView individuals={individuals} maxNumberOfTrees={3} />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('handles focusItem as family ID', () => {
        const individuals = [
            { id: 'I1', name: 'Parent1', families: ['F1'] },
            { id: 'I2', name: 'Parent2', families: ['F1'] },
            { id: 'I3', name: 'Child', families: [] }
        ];
        const families = [
            { id: 'F1', parents: ['I1', 'I2'], children: ['I3'] }
        ];
        const { container } = render(<TreeView individuals={individuals} families={families} focusItem="F1" />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
        // Should render the family and its members
        expect(container.textContent).toContain('Parent1');
    });

    test('filters invalid individual references from families', () => {
        const individuals = [
            { id: 'I1', name: 'Valid Person', families: [] }
        ];
        const families = [
            { id: 'F1', parents: ['I1', 'INVALID'], children: ['I3'] } // I3 doesn't exist
        ];
        // TreeView should handle this gracefully without crashing
        const { container } = render(<TreeView individuals={individuals} families={families} />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });

    test('renders empty tree when all starting individuals filtered out', () => {
        const individuals = [
            { id: 'I1', name: 'Person', families: [] }
        ];
        // focusItem doesn't exist, should fall back gracefully
        const { container } = render(<TreeView individuals={individuals} focusItem="NONEXISTENT" />);
        expect(container.querySelector('.tree-view')).toBeInTheDocument();
    });
});

describe('TreeNode Component', () => {
    test('renders TreeNode correctly', () => {
        render(<TreeNode name="John Doe" />);
        expect(screen.getByText(/john doe/i)).toBeInTheDocument();
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
        render(<RelationshipEditor relationships={[]} onUpdate={() => {}} />);
        expect(screen.getByText(/edit relationships/i)).toBeInTheDocument();
    });
});

describe('Toolbar Component', () => {
    test('renders Toolbar correctly', () => {
        render(<Toolbar onSave={() => {}} onUndo={() => {}} onRedo={() => {}} />);
        expect(screen.getByText(/save/i)).toBeInTheDocument();
    });
});