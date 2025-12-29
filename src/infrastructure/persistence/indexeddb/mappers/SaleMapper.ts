import { Sale, SaleItem } from '@domain/entities/Sale'
import { Money } from '@domain/value-objects/Money'
import { Percentage } from '@domain/value-objects/Percentage'
import type { SaleRecord, SaleItemRecord } from '../database'

/**
 * Mapper para convertir entre Sale (entidad) y SaleRecord (DB)
 */
export class SaleMapper {
  /**
   * Convierte un registro de item de DB a SaleItem
   */
  static itemToDomain(record: SaleItemRecord): SaleItem {
    return new SaleItem({
      id: record.id,
      variantId: record.variantId,
      productName: record.productName,
      variantName: record.variantName,
      quantity: record.quantity,
      unitPrice: Money.fromCents(record.unitPriceCents, record.unitPriceCurrency),
      discount: Percentage.create(record.discountPercentage)
    })
  }

  /**
   * Convierte un SaleItem a registro de DB
   */
  static itemToPersistence(item: SaleItem): SaleItemRecord {
    return {
      id: item.id,
      variantId: item.variantId,
      productName: item.productName,
      variantName: item.variantName,
      quantity: item.quantity,
      unitPriceCents: item.unitPrice.cents,
      unitPriceCurrency: item.unitPrice.currency,
      discountPercentage: item.discount.value
    }
  }

  /**
   * Convierte un registro de DB a entidad de dominio
   */
  static toDomain(record: SaleRecord): Sale {
    const items = record.items.map((item) => this.itemToDomain(item))

    return Sale.fromPersistence({
      id: record.id,
      receiptNumber: record.receiptNumber,
      userId: record.userId,
      customerId: record.customerId,
      items,
      paymentMethodId: record.paymentMethodId,
      paymentMethodType: record.paymentMethodType,
      status: record.status,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      syncStatus: record.syncStatus,
      syncedAt: record.syncedAt
    })
  }

  /**
   * Convierte una entidad de dominio a registro de DB
   */
  static toPersistence(entity: Sale): SaleRecord {
    const data = entity.toPersistence()
    return {
      id: data.id,
      receiptNumber: data.receiptNumber,
      userId: data.userId,
      customerId: data.customerId,
      items: data.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        unitPriceCurrency: item.unitPriceCurrency,
        discountPercentage: item.discountPercentage
      })),
      paymentMethodId: data.paymentMethodId,
      paymentMethodType: data.paymentMethodType,
      status: data.status,
      notes: data.notes,
      subtotalCents: data.subtotalCents,
      discountCents: data.discountCents,
      totalCents: data.totalCents,
      currency: data.currency,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      syncStatus: data.syncStatus,
      syncedAt: data.syncedAt
    }
  }

  /**
   * Convierte múltiples registros a entidades
   */
  static toDomainList(records: SaleRecord[]): Sale[] {
    return records.map((record) => this.toDomain(record))
  }
}

