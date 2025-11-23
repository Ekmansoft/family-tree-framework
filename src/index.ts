import Engine from './core/engine';
import { Renderer } from './core/renderer';
import EventManager from './core/events';
import { parseGedcom } from './parser';
import './styles/index.css';

const init = () => {
    const engine = new Engine();
    const renderer = new Renderer();
    const eventManager = new EventManager();

    // Load a GEDCOM file (this could be replaced with actual file loading logic)
    const gedcomData = ''; // Placeholder for GEDCOM data
    const familyTree = parseGedcom(gedcomData);

    engine.loadGedcom(gedcomData);
    (renderer as any).render();

    // Set up event listeners
    eventManager.on('update', () => {
        (renderer as any).render();
    });
};

document.addEventListener('DOMContentLoaded', init);