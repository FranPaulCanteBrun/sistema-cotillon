/**
 * Value Object: SKU (Stock Keeping Unit)
 * 
 * Representa un código único de producto/variante.
 * Inmutable y con validaciones de formato.
 */
export class SKU {
  private readonly _value: string

  private constructor(value: string) {
    this._value = value
  }

  /**
   * Crea un SKU desde un string
   */
  static create(value: string): SKU {
    const normalized = value.trim().toUpperCase()
    
    if (!normalized) {
      throw new Error('SKU cannot be empty')
    }

    if (normalized.length < 3) {
      throw new Error('SKU must be at least 3 characters')
    }

    if (normalized.length > 50) {
      throw new Error('SKU cannot exceed 50 characters')
    }

    // Solo permite letras, números, guiones y guiones bajos
    if (!/^[A-Z0-9\-_]+$/.test(normalized)) {
      throw new Error('SKU can only contain letters, numbers, hyphens and underscores')
    }

    return new SKU(normalized)
  }

  /**
   * Genera un SKU automático basado en categoría, producto y variante
   */
  static generate(
    categoryCode: string,
    productCode: string,
    variantCode?: string
  ): SKU {
    const parts = [
      categoryCode.substring(0, 3).toUpperCase(),
      productCode.substring(0, 5).toUpperCase()
    ]

    if (variantCode) {
      parts.push(variantCode.substring(0, 4).toUpperCase())
    }

    // Añade un sufijo aleatorio para unicidad
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    parts.push(randomSuffix)

    return SKU.create(parts.join('-'))
  }

  get value(): string {
    return this._value
  }

  equals(other: SKU): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }

  toJSON(): string {
    return this._value
  }

  static fromJSON(value: string): SKU {
    return new SKU(value)
  }
}

