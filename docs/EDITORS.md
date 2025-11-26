# Using the Editors

The family-tree-framework includes two editor components for modifying family tree data:

## PersonEditor

Edit individual person records including name, birth/death dates, and notes.

### Basic Usage

```typescript
import React, { useState, lazy, Suspense } from 'react';

// Lazy load the editor
const PersonEditor = lazy(() => import('family-tree-framework/src/components/Editor/PersonEditor'));

function MyApp() {
    const [editingPerson, setEditingPerson] = useState(null);

    return (
        <div>
            {/* Your tree view */}
            <TreeView
                onSelectPerson={(id) => {
                    // Find the person and open editor
                    const person = individuals.find(p => p.id === id);
                    setEditingPerson(person);
                }}
            />

            {/* Show editor in modal */}
            {editingPerson && (
                <div className="modal">
                    <Suspense fallback={<div>Loading...</div>}>
                        <PersonEditor
                            person={editingPerson}
                            onSave={(updated) => {
                                // Update your data
                                updatePerson(updated);
                                setEditingPerson(null);
                            }}
                            onCancel={() => setEditingPerson(null)}
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}
```

### PersonEditor Props

```typescript
interface PersonEditorProps {
    person: {
        id: string;
        name: string;
        birthDate: string;
        deathDate?: string;
        notes?: string;
    };
    onSave: (updatedPerson: Person) => void;
    onCancel: () => void;
}
```

## RelationshipEditor

Edit family relationships between individuals.

### Basic Usage

```typescript
import React, { useState, lazy, Suspense } from 'react';

const RelationshipEditor = lazy(() => 
    import('family-tree-framework/src/components/Editor/RelationshipEditor')
);

function MyApp() {
    const [editingRelationship, setEditingRelationship] = useState(null);

    return (
        <div>
            {/* Your tree view */}
            <TreeView
                onSelectFamily={(id) => {
                    // Find the family and open editor
                    const family = families.find(f => f.id === id);
                    setEditingRelationship(family);
                }}
            />

            {/* Show editor in modal */}
            {editingRelationship && (
                <Suspense fallback={<div>Loading...</div>}>
                    <RelationshipEditor
                        relationship={editingRelationship}
                        onSave={(updated) => {
                            // Update your data
                            updateFamily(updated);
                            setEditingRelationship(null);
                        }}
                        onCancel={() => setEditingRelationship(null)}
                    />
                </Suspense>
            )}
        </div>
    );
}
```

## Modal Pattern

For a better UX, wrap editors in a modal:

```typescript
function EditorModal({ children, onClose }) {
    return (
        <div 
            className="modal-overlay"
            onClick={onClose}
        >
            <div 
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
            >
                {children}
            </div>
        </div>
    );
}

// CSS
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}

.modal-content {
    background-color: white;
    padding: 24px;
    border-radius: 8px;
    max-width: 600px;
    width: 90%;
    max-height: 80vh;
    overflow: auto;
}
```

## Integration with TreeView

Complete example showing integration:

```typescript
import React, { useState, lazy, Suspense } from 'react';
import { TreeView } from 'family-tree-framework';

const PersonEditor = lazy(() => import('family-tree-framework/src/components/Editor/PersonEditor'));

function FamilyTreeApp() {
    const [individuals, setIndividuals] = useState([]);
    const [families, setFamilies] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [editingPerson, setEditingPerson] = useState(null);

    const handlePersonClick = (id) => {
        setSelectedId(id);
        // Double-click or button to edit
    };

    const handleEditClick = () => {
        if (selectedId) {
            const person = individuals.find(p => p.id === selectedId);
            setEditingPerson(person);
        }
    };

    const handleSave = (updated) => {
        setIndividuals(prev => 
            prev.map(p => p.id === updated.id ? { ...p, ...updated } : p)
        );
        setEditingPerson(null);
    };

    return (
        <div>
            <button onClick={handleEditClick} disabled={!selectedId}>
                Edit Selected Person
            </button>

            <TreeView
                individuals={individuals}
                families={families}
                selectedId={selectedId}
                onSelectPerson={handlePersonClick}
            />

            {editingPerson && (
                <EditorModal onClose={() => setEditingPerson(null)}>
                    <Suspense fallback={<div>Loading editor...</div>}>
                        <PersonEditor
                            person={editingPerson}
                            onSave={handleSave}
                            onCancel={() => setEditingPerson(null)}
                        />
                    </Suspense>
                </EditorModal>
            )}
        </div>
    );
}
```

## Persisting Changes

After editing, you'll want to save changes back to GEDCOM:

```typescript
function handleSave(updatedPerson) {
    // 1. Update local state
    setIndividuals(prev => 
        prev.map(p => p.id === updatedPerson.id ? updatedPerson : p)
    );

    // 2. Persist to backend/storage
    await fetch('/api/people/' + updatedPerson.id, {
        method: 'PUT',
        body: JSON.stringify(updatedPerson)
    });

    // 3. Or export to GEDCOM
    const gedcom = exportToGedcom(individuals, families);
    downloadGedcom(gedcom, 'family-tree.ged');
}
```

## Current Demo Implementation

The demo app (`examples/demo/main.tsx`) currently shows selected person data as JSON. To add editing:

1. Import the PersonEditor component
2. Add state for `editingPerson`
3. Replace the JSON display with the editor
4. Handle save/cancel actions

See `examples/demo/components/EditorExample.tsx` for a complete integration example.
