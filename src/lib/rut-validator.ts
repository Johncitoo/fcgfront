/**
 * Utilidades para validación y formato de RUT chileno
 */

/**
 * Limpia el RUT removiendo puntos y guiones
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '')
}

/**
 * Calcula el dígito verificador de un RUT
 */
export function calculateDv(rutNumber: number | string): string {
  const num = typeof rutNumber === 'string' ? parseInt(rutNumber, 10) : rutNumber
  
  let suma = 0
  let multiplicador = 2
  let resto = num

  while (resto > 0) {
    suma += (resto % 10) * multiplicador
    resto = Math.floor(resto / 10)
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }

  const result = 11 - (suma % 11)
  
  if (result === 11) return '0'
  if (result === 10) return 'K'
  return result.toString()
}

/**
 * Valida si un RUT es válido
 */
export function validateRut(rut: string): boolean {
  const cleaned = cleanRut(rut)
  
  if (cleaned.length < 2) return false
  
  const dv = cleaned.slice(-1).toUpperCase()
  const rutNumber = cleaned.slice(0, -1)
  
  if (!/^\d+$/.test(rutNumber)) return false
  
  const expectedDv = calculateDv(rutNumber)
  
  return dv === expectedDv
}

/**
 * Formatea un RUT con puntos y guión (ej: 12.345.678-9)
 */
export function formatRut(rut: string): string {
  const cleaned = cleanRut(rut)
  
  if (cleaned.length < 2) return rut
  
  const dv = cleaned.slice(-1).toUpperCase()
  const rutNumber = cleaned.slice(0, -1)
  
  // Agregar puntos cada 3 dígitos desde la derecha
  const formatted = rutNumber
    .split('')
    .reverse()
    .map((digit, idx) => (idx > 0 && idx % 3 === 0 ? `${digit}.` : digit))
    .reverse()
    .join('')
  
  return `${formatted}-${dv}`
}

/**
 * Separa el RUT en número y dígito verificador
 */
export function parseRut(rut: string): { number: number; dv: string } | null {
  const cleaned = cleanRut(rut)
  
  if (cleaned.length < 2) return null
  
  const dv = cleaned.slice(-1).toUpperCase()
  const rutNumber = parseInt(cleaned.slice(0, -1), 10)
  
  if (isNaN(rutNumber)) return null
  
  return { number: rutNumber, dv }
}

/**
 * Formatea RUT mientras el usuario escribe
 */
export function formatRutInput(input: string): string {
  const cleaned = cleanRut(input)
  
  if (cleaned.length === 0) return ''
  if (cleaned.length === 1) return cleaned
  
  const dv = cleaned.slice(-1).toUpperCase()
  const numbers = cleaned.slice(0, -1)
  
  // Formatear con puntos
  const formatted = numbers
    .split('')
    .reverse()
    .map((digit, idx) => (idx > 0 && idx % 3 === 0 ? `${digit}.` : digit))
    .reverse()
    .join('')
  
  return `${formatted}-${dv}`
}
