class EventManager {
    private listeners: { [event: string]: Function[] } = {};

    public on(event: string, listener: Function): void {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }

    public off(event: string, listener: Function): void {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(l => l !== listener);
    }

    public emit(event: string, ...args: any[]): void {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(listener => listener(...args));
    }
}

export default EventManager;