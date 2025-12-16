/**
 * Utilidades para validación y formato de RUT chileno.
 * Implementa el algoritmo oficial de validación del RUT chileno (módulo 11).
 */

/**
 * Limpia el RUT removiendo puntos, guiones y otros caracteres no numéricos.
 * Mantiene solo dígitos y la letra K (verificador).
 * 
 * @param rut - RUT con o sin formato
 * @returns RUT limpio solo con números y K
 * 
 * @example
 * cleanRut('12.345.678-9') // => '123456789'
 * cleanRut('12345678-K') // => '12345678K'
 */
export function cleanRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '')
}

/**
 * Calcula el dígito verificador de un RUT usando el algoritmo módulo 11.
 * 
 * @param rutNumber - Número del RUT sin dígito verificador
 * @returns Dígito verificador ('0'-'9' o 'K')
 * 
 * @example
 * calculateDv(12345678) // => '5'
 * calculateDv('12345678') // => '5'
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
 * Valida si un RUT chileno es válido verificando el dígito verificador.
 * Acepta RUT con o sin formato.
 * 
 * @param rut - RUT a validar
 * @returns true si el RUT es válido, false en caso contrario
 * 
 * @example
 * validateRut('12.345.678-5') // => true
 * validateRut('12345678-5') // => true
 * validateRut('12345678-9') // => false
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
 * Formatea un RUT con puntos y guión según formato oficial chileno.
 * 
 * @param rut - RUT con o sin formato
 * @returns RUT formateado (ej: 12.345.678-9)
 * 
 * @example
 * formatRut('123456789') // => '12.345.678-9'
 * formatRut('12345678K') // => '12.345.678-K'
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
 * Separa el RUT en número y dígito verificador.
 * 
 * @param rut - RUT con o sin formato
 * @returns Objeto con number y dv, o null si es inválido
 * 
 * @example
 * parseRut('12.345.678-9') // => { number: 12345678, dv: '9' }
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
 * Formatea RUT mientras el usuario escribe, sin causar saltos en el cursor.
 * Ideal para usar en onChange de inputs.
 * 
 * @param input - Input del usuario (puede estar parcialmente formateado)
 * @returns RUT formateado apropiadamente según longitud
 * 
 * @example
 * formatRutInput('123') // => '123'
 * formatRutInput('12345678') // => '1234567-8'
 * formatRutInput('123456789') // => '12.345.678-9'
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
