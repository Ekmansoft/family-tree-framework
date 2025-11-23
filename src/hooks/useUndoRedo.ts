import { useState } from 'react';

const useUndoRedo = <T,>(initialState: T) => {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [currentIndex, setCurrentIndex] = useState<number>(0);

    const setState = (newState: T) => {
        const updatedHistory = history.slice(0, currentIndex + 1);
        updatedHistory.push(newState);
        setHistory(updatedHistory);
        setCurrentIndex(updatedHistory.length - 1);
    };

    const undo = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const redo = () => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const currentState = history[currentIndex];

    return { currentState, setState, undo, redo };
};

export default useUndoRedo;