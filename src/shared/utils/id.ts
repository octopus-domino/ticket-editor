/**
 * ID generation utilities
 */

let counter = 0;

/**
 * Generate unique ID
 */
export function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  const count = (counter++).toString(36);
  return `${timestamp}-${random}-${count}`;
}

/**
 * Generate ID with prefix
 */
export function generateIdWithPrefix(prefix: string): string {
  return `${prefix}-${generateId()}`;
}

/**
 * Check if string is valid ID
 */
export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length > 0;
}
