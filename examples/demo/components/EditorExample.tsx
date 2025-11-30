/**
 * Example: How to use the PersonEditor in your application
 * 
 * This shows how to integrate the editor with your tree view
 */

import React, { lazy, Suspense, useState } from 'react';
import { TreeView } from '../../../src/components/TreeView/VerticalTreeView';
import { EditorModal } from './EditorModal';
import type { Individual } from '../../../src/components/TreeView/types';

// Lazy load the editor to reduce initial bundle size
const PersonEditor = lazy(() => import('../../../src/components/Editor/PersonEditor'));

interface Person {
    id: string;
    name: string;
    birthDate: string;
    deathDate?: string;
    notes?: string;
}

export function TreeViewWithEditor() {
    const [individuals, setIndividuals] = useState<Individual[]>([]);
    const [families, setFamilies] = useState<any[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [editingPerson, setEditingPerson] = useState<Person | null>(null);

    // When clicking on a person in the tree
    const handleSelectPerson = (id: string) => {
        setSelectedId(id);
        const person = individuals.find(p => p.id === id);
        if (person) {
            // Show the editor
            setEditingPerson(person);
        }
    };

    // When saving changes in the editor
    const handleSavePerson = (updatedPerson: Person) => {
        setIndividuals(prev => 
            prev.map(p => p.id === updatedPerson.id ? updatedPerson : p)
        );
        setEditingPerson(null);
    };

    // When canceling the editor
    const handleCancelEdit = () => {
        setEditingPerson(null);
    };

    return (
        <div>
            <TreeView
                individuals={individuals}
                families={families}
                selectedId={selectedId}
                onSelectPerson={handleSelectPerson}
            />

            {/* Show editor modal when a person is being edited */}
            {editingPerson && (
                <EditorModal onClose={handleCancelEdit}>
                    <PersonEditor
                        person={editingPerson}
                        onSave={handleSavePerson}
                        onCancel={handleCancelEdit}
                    />
                </EditorModal>
            )}
        </div>
    );
}

/**
 * Alternative: Show editor inline below the tree
 */
export function TreeViewWithInlineEditor() {
    const [individuals, setIndividuals] = useState<Individual[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<Individual | null>(null);

    return (
        <div style={{ display: 'flex', gap: '20px' }}>
            {/* Tree on the left */}
            <div style={{ flex: 1 }}>
                <TreeView
                    individuals={individuals}
                    families={[]}
                    selectedId={selectedPerson?.id}
                    onSelectPerson={(id) => {
                        const person = individuals.find(p => p.id === id);
                        setSelectedPerson(person || null);
                    }}
                />
            </div>

            {/* Editor on the right */}
            <div style={{ width: '400px' }}>
                {selectedPerson ? (
                    <Suspense fallback={<div>Loading editor...</div>}>
                        <PersonEditor
                            person={selectedPerson}
                            onSave={(updated) => {
                                setIndividuals(prev =>
                                    prev.map(p => p.id === updated.id ? updated : p)
                                );
                                setSelectedPerson(updated);
                            }}
                            onCancel={() => setSelectedPerson(null)}
                        />
                    </Suspense>
                ) : (
                    <div style={{ padding: '20px', color: '#666' }}>
                        Select a person to edit
                    </div>
                )}
            </div>
        </div>
    );
}
