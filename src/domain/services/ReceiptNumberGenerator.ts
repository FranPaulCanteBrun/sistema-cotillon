/**
 * Servicio de Dominio: ReceiptNumberGenerator
 * 
 * Genera números de comprobante únicos y secuenciales.
 */
export class ReceiptNumberGenerator {
  private readonly prefix: string
  private readonly dateFormat: boolean

  constructor(options?: { prefix?: string; includeDateInNumber?: boolean }) {
    this.prefix = options?.prefix ?? 'V'
    this.dateFormat = options?.includeDateInNumber ?? true
  }

  /**
   * Genera el siguiente número de comprobante
   * Formato: V-20251219-0001 (con fecha) o V-00000001 (sin fecha)
   */
  generate(lastNumber?: string): string {
    const today = new Date()

    if (this.dateFormat) {
      return this.generateWithDate(today, lastNumber)
    }

    return this.generateSequential(lastNumber)
  }

  /**
   * Genera número con formato de fecha
   */
  private generateWithDate(date: Date, lastNumber?: string): string {
    const dateStr = this.formatDate(date)
    const prefix = `${this.prefix}-${dateStr}-`

    let sequence = 1

    if (lastNumber && lastNumber.startsWith(prefix)) {
      const lastSequence = parseInt(lastNumber.replace(prefix, ''), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `${prefix}${sequence.toString().padStart(4, '0')}`
  }

  /**
   * Genera número secuencial simple
   */
  private generateSequential(lastNumber?: string): string {
    const prefix = `${this.prefix}-`
    let sequence = 1

    if (lastNumber && lastNumber.startsWith(prefix)) {
      const lastSequence = parseInt(lastNumber.replace(prefix, ''), 10)
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1
      }
    }

    return `${prefix}${sequence.toString().padStart(8, '0')}`
  }

  /**
   * Formatea la fecha como YYYYMMDD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}${month}${day}`
  }

  /**
   * Valida si un número de comprobante tiene formato válido
   */
  isValid(receiptNumber: string): boolean {
    if (this.dateFormat) {
      // Formato: V-YYYYMMDD-NNNN
      const regex = new RegExp(`^${this.prefix}-\\d{8}-\\d{4,}$`)
      return regex.test(receiptNumber)
    }

    // Formato: V-NNNNNNNN
    const regex = new RegExp(`^${this.prefix}-\\d{8,}$`)
    return regex.test(receiptNumber)
  }

  /**
   * Extrae la fecha de un número de comprobante (si usa formato con fecha)
   */
  extractDate(receiptNumber: string): Date | null {
    if (!this.dateFormat || !this.isValid(receiptNumber)) {
      return null
    }

    const parts = receiptNumber.split('-')
    if (parts.length < 2) return null

    const dateStr = parts[1]
    const year = parseInt(dateStr.substring(0, 4), 10)
    const month = parseInt(dateStr.substring(4, 6), 10) - 1
    const day = parseInt(dateStr.substring(6, 8), 10)

    return new Date(year, month, day)
  }
}

