import React from 'react';

const Toolbar: React.FC<{ onSave: () => void; onUndo: () => void; onRedo: () => void; }> = ({ onSave, onUndo, onRedo }) => {
    return (
        <div className="toolbar">
            <button onClick={onSave}>Save</button>
            <button onClick={onUndo}>Undo</button>
            <button onClick={onRedo}>Redo</button>
        </div>
    );
};

export default Toolbar;