/**
 * Value Object: Quantity
 * 
 * Representa una cantidad de productos.
 * Garantiza que siempre sea un número entero no negativo.
 */
export class Quantity {
  private readonly _value: number

  private constructor(value: number) {
    this._value = value
  }

  /**
   * Crea una cantidad desde un número
   */
  static create(value: number): Quantity {
    if (!Number.isInteger(value)) {
      throw new Error('Quantity must be an integer')
    }

    if (value < 0) {
      throw new Error('Quantity cannot be negative')
    }

    return new Quantity(value)
  }

  /**
   * Crea una cantidad cero
   */
  static zero(): Quantity {
    return new Quantity(0)
  }

  /**
   * Crea una cantidad de uno
   */
  static one(): Quantity {
    return new Quantity(1)
  }

  get value(): number {
    return this._value
  }

  /**
   * Suma cantidades
   */
  add(other: Quantity): Quantity {
    return new Quantity(this._value + other._value)
  }

  /**
   * Resta cantidades (no permite resultado negativo)
   */
  subtract(other: Quantity): Quantity {
    const result = this._value - other._value
    if (result < 0) {
      throw new Error('Cannot subtract: would result in negative quantity')
    }
    return new Quantity(result)
  }

  /**
   * Multiplica por un factor entero
   */
  multiply(factor: number): Quantity {
    if (!Number.isInteger(factor) || factor < 0) {
      throw new Error('Factor must be a non-negative integer')
    }
    return new Quantity(this._value * factor)
  }

  /**
   * Verifica si es suficiente para cubrir otra cantidad
   */
  isEnoughFor(required: Quantity): boolean {
    return this._value >= required._value
  }

  /**
   * Verifica si es cero
   */
  isZero(): boolean {
    return this._value === 0
  }

  /**
   * Verifica si está por debajo de un mínimo
   */
  isBelowMinimum(minimum: Quantity): boolean {
    return this._value < minimum._value
  }

  equals(other: Quantity): boolean {
    return this._value === other._value
  }

  isGreaterThan(other: Quantity): boolean {
    return this._value > other._value
  }

  isLessThan(other: Quantity): boolean {
    return this._value < other._value
  }

  toString(): string {
    return this._value.toString()
  }

  toJSON(): number {
    return this._value
  }

  static fromJSON(value: number): Quantity {
    return new Quantity(value)
  }
}

