/**
 * Value Object: Email
 * 
 * Representa un email validado e inmutable.
 */
export class Email {
  private readonly _value: string

  private constructor(value: string) {
    this._value = value
  }

  /**
   * Crea un Email validado
   */
  static create(value: string): Email {
    const normalized = value.trim().toLowerCase()

    if (!normalized) {
      throw new Error('Email cannot be empty')
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalized)) {
      throw new Error('Invalid email format')
    }

    if (normalized.length > 254) {
      throw new Error('Email is too long')
    }

    return new Email(normalized)
  }

  /**
   * Crea un Email opcional (puede ser null)
   */
  static createOptional(value: string | null | undefined): Email | null {
    if (!value || !value.trim()) {
      return null
    }
    return Email.create(value)
  }

  get value(): string {
    return this._value
  }

  /**
   * Obtiene el dominio del email
   */
  get domain(): string {
    return this._value.split('@')[1]
  }

  /**
   * Obtiene la parte local del email (antes del @)
   */
  get localPart(): string {
    return this._value.split('@')[0]
  }

  equals(other: Email): boolean {
    return this._value === other._value
  }

  toString(): string {
    return this._value
  }

  toJSON(): string {
    return this._value
  }

  static fromJSON(value: string): Email {
    return new Email(value)
  }
}

