/**
 * Value Object: Money
 * 
 * Representa un valor monetario de forma inmutable y segura.
 * Evita errores comunes de cálculos con dinero usando números enteros (centavos).
 */
export class Money {
  private readonly _cents: number
  private readonly _currency: string

  private constructor(cents: number, currency: string = 'ARS') {
    if (!Number.isInteger(cents)) {
      throw new Error('Money cents must be an integer')
    }
    this._cents = cents
    this._currency = currency
  }

  /**
   * Crea un objeto Money desde un valor en pesos/dólares
   */
  static fromAmount(amount: number, currency: string = 'ARS'): Money {
    const cents = Math.round(amount * 100)
    return new Money(cents, currency)
  }

  /**
   * Alias de fromAmount para mantener compatibilidad con llamadas existentes
   */
  static create(amount: number, currency: string = 'ARS'): Money {
    return Money.fromAmount(amount, currency)
  }

  /**
   * Crea un objeto Money desde centavos
   */
  static fromCents(cents: number, currency: string = 'ARS'): Money {
    return new Money(cents, currency)
  }

  /**
   * Crea un Money con valor cero
   */
  static zero(currency: string = 'ARS'): Money {
    return new Money(0, currency)
  }

  /**
   * Obtiene el valor en la unidad principal (pesos, dólares, etc.)
   */
  get amount(): number {
    return this._cents / 100
  }

  /**
   * Obtiene el valor en centavos
   */
  get cents(): number {
    return this._cents
  }

  /**
   * Obtiene la moneda
   */
  get currency(): string {
    return this._currency
  }

  /**
   * Suma dos valores monetarios
   */
  add(other: Money): Money {
    this.ensureSameCurrency(other)
    return new Money(this._cents + other._cents, this._currency)
  }

  /**
   * Resta dos valores monetarios
   */
  subtract(other: Money): Money {
    this.ensureSameCurrency(other)
    return new Money(this._cents - other._cents, this._currency)
  }

  /**
   * Multiplica por un factor (para cantidades)
   */
  multiply(factor: number): Money {
    return new Money(Math.round(this._cents * factor), this._currency)
  }

  /**
   * Aplica un porcentaje de descuento
   */
  applyDiscount(percentage: number): Money {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100')
    }
    const discountFactor = 1 - percentage / 100
    return new Money(Math.round(this._cents * discountFactor), this._currency)
  }

  /**
   * Calcula el monto del descuento
   */
  calculateDiscount(percentage: number): Money {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100')
    }
    const discountAmount = Math.round(this._cents * (percentage / 100))
    return new Money(discountAmount, this._currency)
  }

  /**
   * Verifica si es mayor que otro Money
   */
  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._cents > other._cents
  }

  /**
   * Verifica si es menor que otro Money
   */
  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._cents < other._cents
  }

  /**
   * Verifica si es igual a otro Money
   */
  equals(other: Money): boolean {
    return this._cents === other._cents && this._currency === other._currency
  }

  /**
   * Verifica si es cero
   */
  isZero(): boolean {
    return this._cents === 0
  }

  /**
   * Verifica si es negativo
   */
  isNegative(): boolean {
    return this._cents < 0
  }

  /**
   * Formatea el valor como string legible
   */
  format(locale: string = 'es-AR'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this._currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(this.amount)
  }

  /**
   * Serializa para almacenamiento
   */
  toJSON(): { cents: number; currency: string } {
    return {
      cents: this._cents,
      currency: this._currency
    }
  }

  /**
   * Deserializa desde almacenamiento
   */
  static fromJSON(json: { cents: number; currency: string }): Money {
    return new Money(json.cents, json.currency)
  }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(
        `Cannot operate on different currencies: ${this._currency} vs ${other._currency}`
      )
    }
  }
}

