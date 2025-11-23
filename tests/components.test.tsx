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