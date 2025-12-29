/**
 * Value Object: Percentage
 * 
 * Representa un porcentaje validado (0-100).
 * Útil para descuentos, impuestos, comisiones, etc.
 */
export class Percentage {
  private readonly _value: number

  private constructor(value: number) {
    this._value = value
  }

  /**
   * Crea un porcentaje desde un valor 0-100
   */
  static create(value: number): Percentage {
    if (value < 0) {
      throw new Error('Percentage cannot be negative')
    }

    if (value > 100) {
      throw new Error('Percentage cannot exceed 100')
    }

    return new Percentage(value)
  }

  /**
   * Crea un porcentaje cero
   */
  static zero(): Percentage {
    return new Percentage(0)
  }

  /**
   * Crea un porcentaje del 100%
   */
  static full(): Percentage {
    return new Percentage(100)
  }

  get value(): number {
    return this._value
  }

  /**
   * Obtiene el valor como decimal (0.0 - 1.0)
   */
  get decimal(): number {
    return this._value / 100
  }

  /**
   * Aplica el porcentaje a un número
   */
  applyTo(amount: number): number {
    return amount * this.decimal
  }

  /**
   * Calcula el complemento (100 - valor)
   */
  complement(): Percentage {
    return new Percentage(100 - this._value)
  }

  /**
   * Verifica si es cero
   */
  isZero(): boolean {
    return this._value === 0
  }

  equals(other: Percentage): boolean {
    return this._value === other._value
  }

  /**
   * Formatea como string con símbolo %
   */
  format(): string {
    return `${this._value}%`
  }

  toString(): string {
    return this._value.toString()
  }

  toJSON(): number {
    return this._value
  }

  static fromJSON(value: number): Percentage {
    return new Percentage(value)
  }
}

