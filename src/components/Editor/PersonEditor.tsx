import React, { useState } from 'react';

export interface Person {
    id: string;
    name: string;
    birthDate: string;
    deathDate?: string;
    notes?: string;
}

export interface PersonEditorProps {
    person: Person;
    onSave: (updatedPerson: Person) => void;
    onCancel: () => void;
}

const PersonEditor: React.FC<PersonEditorProps> = ({ person, onSave, onCancel }) => {
    const [name, setName] = useState(person.name);
    const [birthDate, setBirthDate] = useState(person.birthDate);
    const [deathDate, setDeathDate] = useState(person.deathDate || '');
    const [notes, setNotes] = useState(person.notes || '');

    const handleSave = () => {
        const updatedPerson = {
            ...person,
            name,
            birthDate,
            deathDate: deathDate || undefined,
            notes: notes || undefined,
        };
        onSave(updatedPerson);
    };

    return (
        <div className="person-editor">
            <h2>Edit Person</h2>
            <div>
                <label>Name:</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
                <label>Birth Date:</label>
                <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div>
                <label>Death Date:</label>
                <input type="date" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
            </div>
            <div>
                <label>Notes:</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="editor-actions">
                <button onClick={handleSave}>Save</button>
                <button onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
};

export default PersonEditor;