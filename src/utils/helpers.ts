export function formatDate(date: Date): string {
    return date.toLocaleDateString();
}

export function generateUniqueId(prefix: string = 'id'): string {
    return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

export function isEmptyObject(obj: object): boolean {
    return Object.keys(obj).length === 0;
}