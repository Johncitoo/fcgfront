import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combina clases de Tailwind CSS evitando conflictos.
 * Usa clsx para concatenar y tailwind-merge para resolver conflictos de utilidades.
 * 
 * @param inputs - Clases CSS, objetos condicionales o arrays
 * @returns String de clases combinadas sin conflictos
 * 
 * @example
 * cn('px-2 py-1', isActive && 'bg-blue-500', 'hover:bg-blue-600')
 * // => 'px-2 py-1 bg-blue-500 hover:bg-blue-600'
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
