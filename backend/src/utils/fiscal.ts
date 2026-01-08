/**
 * Utilidades para facturación electrónica (AFIP/ARCA)
 */

/**
 * Normaliza un punto de venta a número entero positivo
 * Acepta strings con ceros a la izquierda (ej: "00003") y los convierte a número (3)
 * 
 * @param input - Punto de venta como string o number
 * @returns Número entero positivo normalizado
 * @throws Error si el input no es válido
 */
export function normalizePtoVta(input: string | number | undefined | null): number {
  if (input === undefined || input === null) {
    throw new Error('Punto de venta no puede ser undefined o null')
  }

  // Convertir a string primero para manejar números y strings
  const str = String(input).trim()

  if (str === '') {
    throw new Error('Punto de venta no puede estar vacío')
  }

  // Remover ceros a la izquierda y convertir a número
  const num = parseInt(str, 10)

  if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
    throw new Error(`Punto de venta inválido: "${input}". Debe ser un entero positivo.`)
  }

  return num
}

/**
 * Formatea un punto de venta para mostrar en UI (con padding opcional)
 * 
 * @param ptoVta - Punto de venta como número
 * @param padding - Número de dígitos para padding (default: 5)
 * @returns String formateado (ej: "00003")
 */
export function formatPtoVta(ptoVta: number, padding: number = 5): string {
  return String(ptoVta).padStart(padding, '0')
}
