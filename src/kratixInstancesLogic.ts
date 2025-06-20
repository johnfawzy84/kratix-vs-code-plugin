export interface Instance {
    name: string;
    namespace: string;
}

export function formatInstanceLabel(instance: Instance): string {
    return `${instance.name} (${instance.namespace})`;
}
