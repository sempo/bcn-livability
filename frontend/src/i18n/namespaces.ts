/** One JSON file per language and namespace in src/locales/<language>/. Add a name here when you add a file. */
export const NAMESPACES = ['common', 'conditions', 'editor', 'card', 'panel', 'info', 'legal'] as const
export type Namespace = (typeof NAMESPACES)[number]
