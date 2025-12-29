/**
 * Servicio para generar PDFs de facturas y recibos
 */

import { jsPDF } from 'jspdf'
import type { Sale } from '@domain/entities/Sale'
import type { PaymentMethodType, SaleStatus } from '@shared/types'
import { formatCurrency, formatDateTime, formatDate } from '@shared/lib/utils'

interface PDFOptions {
  title?: string
  includeHeader?: boolean
  includeFooter?: boolean
}

export class PDFService {
  /**
   * Traduce el tipo de método de pago al español
   */
  private static translatePaymentMethod(type: PaymentMethodType): string {
    const translations: Record<PaymentMethodType, string> = {
      cash: 'Efectivo',
      debit: 'Tarjeta de Débito',
      credit: 'Tarjeta de Crédito',
      transfer: 'Transferencia',
      qr: 'QR / Mercado Pago',
      other: 'Otro'
    }
    return translations[type] || type
  }

  /**
   * Traduce el estado de la venta al español
   */
  private static translateSaleStatus(status: SaleStatus): string {
    const translations: Record<SaleStatus, string> = {
      completed: 'COMPLETADA',
      pending: 'PENDIENTE',
      cancelled: 'CANCELADA',
      refunded: 'REEMBOLSADA'
    }
    return translations[status] || status.toUpperCase()
  }
  /**
   * Genera un PDF de recibo/factura para una venta
   */
  static generateSaleReceipt(sale: Sale, options: PDFOptions = {}): void {
    const {
      title = 'Recibo de Venta',
      includeHeader = true,
      includeFooter = true
    } = options

    // Crear documento PDF (80mm de ancho para tickets, 210mm para facturas)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // Formato ticket (80mm ancho)
    })

    let yPosition = 10

    // Header
    if (includeHeader) {
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('COTILLÓN MANAGER', 40, yPosition, { align: 'center' })
      yPosition += 5

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Sistema de Gestión de Stock y Ventas', 40, yPosition, { align: 'center' })
      yPosition += 8

      // Línea separadora
      doc.setLineWidth(0.5)
      doc.line(5, yPosition, 75, yPosition)
      yPosition += 5
    }

    // Información de la venta
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 40, yPosition, { align: 'center' })
    yPosition += 6

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Recibo: ${sale.receiptNumber}`, 5, yPosition)
    yPosition += 5

    doc.text(`Fecha: ${formatDateTime(sale.createdAt)}`, 5, yPosition)
    yPosition += 5

    if (sale.customerId) {
      doc.text(`Cliente: ${sale.customerId}`, 5, yPosition)
      yPosition += 5
    }

    // Línea separadora
    doc.setLineWidth(0.3)
    doc.line(5, yPosition, 75, yPosition)
    yPosition += 5

    // Items
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Productos', 5, yPosition)
    yPosition += 5

    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')

    sale.items.forEach((item, index) => {
      // Verificar si hay espacio suficiente
      if (yPosition > 170) {
        doc.addPage()
        yPosition = 10
      }

      const productName = item.productName.length > 25
        ? item.productName.substring(0, 22) + '...'
        : item.productName

      const variantInfo = item.variantName !== 'Estándar' ? ` (${item.variantName})` : ''
      const fullName = productName + variantInfo

      // Nombre del producto
      doc.setFont('helvetica', 'bold')
      doc.text(fullName, 5, yPosition)
      yPosition += 4

      // Detalles: cantidad, precio unitario, descuento
      doc.setFont('helvetica', 'normal')
      const details = `${item.quantity} × ${formatCurrency(item.unitPrice.amount)}`
      doc.text(details, 7, yPosition)
      
      if (item.discount.value > 0) {
        doc.setFont('helvetica', 'italic')
        doc.text(`Descuento: ${item.discount.value}%`, 7, yPosition + 3)
        yPosition += 3
      }

      // Subtotal del item
      const itemTotalX = 70
      doc.setFont('helvetica', 'bold')
      doc.text(formatCurrency(item.subtotal.amount), itemTotalX, yPosition - (item.discount.value > 0 ? 3 : 0), { align: 'right' })
      
      yPosition += 5

      // Línea separadora entre items (excepto el último)
      if (index < sale.items.length - 1) {
        doc.setLineWidth(0.1)
        doc.line(5, yPosition, 75, yPosition)
        yPosition += 3
      }
    })

    yPosition += 3

    // Línea separadora antes de totales
    doc.setLineWidth(0.5)
    doc.line(5, yPosition, 75, yPosition)
    yPosition += 5

    // Totales
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    
    // Subtotal
    doc.text('Subtotal:', 5, yPosition)
    doc.setFont('helvetica', 'bold')
    doc.text(formatCurrency(sale.subtotal.amount), 70, yPosition, { align: 'right' })
    yPosition += 5

    // Descuentos
    if (sale.totalDiscount.amount > 0) {
      doc.setFont('helvetica', 'normal')
      doc.text('Descuentos:', 5, yPosition)
      doc.setFont('helvetica', 'bold')
      doc.text(`-${formatCurrency(sale.totalDiscount.amount)}`, 70, yPosition, { align: 'right' })
      yPosition += 5
    }

    // Total
    doc.setLineWidth(0.3)
    doc.line(5, yPosition, 75, yPosition)
    yPosition += 5

    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', 5, yPosition)
    doc.text(formatCurrency(sale.total.amount), 70, yPosition, { align: 'right' })
    yPosition += 8

    // Método de pago
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Método de pago: ${this.translatePaymentMethod(sale.paymentMethodType)}`, 5, yPosition)
    yPosition += 5

    // Estado
    doc.text(`Estado: ${this.translateSaleStatus(sale.status)}`, 5, yPosition)
    yPosition += 8

    // Notas
    if (sale.notes) {
      doc.setLineWidth(0.3)
      doc.line(5, yPosition, 75, yPosition)
      yPosition += 5

      doc.setFontSize(8)
      doc.setFont('helvetica', 'italic')
      const notesLines = doc.splitTextToSize(`Notas: ${sale.notes}`, 70)
      doc.text(notesLines, 5, yPosition)
      yPosition += notesLines.length * 4
    }

    // Footer
    if (includeFooter) {
      yPosition = 190
      doc.setLineWidth(0.3)
      doc.line(5, yPosition, 75, yPosition)
      yPosition += 5

      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text('Gracias por su compra', 40, yPosition, { align: 'center' })
      yPosition += 3
      doc.text('Sistema generado automáticamente', 40, yPosition, { align: 'center' })
    }

    // Generar nombre del archivo
    const fileName = `Recibo-${sale.receiptNumber}-${formatDate(sale.createdAt).replace(/\//g, '-')}.pdf`

    // Descargar PDF
    doc.save(fileName)
  }

  /**
   * Genera un PDF de factura (formato más grande, tipo A4)
   */
  static generateSaleInvoice(sale: Sale, options: PDFOptions = {}): void {
    const {
      title = 'Factura',
      includeHeader = true,
      includeFooter = true
    } = options

    // Crear documento PDF formato A4
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    let yPosition = 20

    // Header
    if (includeHeader) {
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('COTILLÓN MANAGER', 105, yPosition, { align: 'center' })
      yPosition += 8

      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text('Sistema de Gestión de Stock y Ventas', 105, yPosition, { align: 'center' })
      yPosition += 15

      // Línea separadora
      doc.setLineWidth(0.5)
      doc.line(20, yPosition, 190, yPosition)
      yPosition += 10
    }

    // Título
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 105, yPosition, { align: 'center' })
    yPosition += 10

    // Información de la venta (dos columnas)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    const leftCol = 20
    const rightCol = 120

    doc.text(`Número de Recibo: ${sale.receiptNumber}`, leftCol, yPosition)
    doc.text(`Fecha: ${formatDateTime(sale.createdAt)}`, rightCol, yPosition)
    yPosition += 6

    if (sale.customerId) {
      doc.text(`Cliente ID: ${sale.customerId}`, leftCol, yPosition)
    }
    doc.text(`Estado: ${this.translateSaleStatus(sale.status)}`, rightCol, yPosition)
    yPosition += 10

    // Línea separadora
    doc.setLineWidth(0.3)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 8

    // Tabla de productos
    // Definir posiciones de columnas con más espacio para números grandes
    const colProducto = leftCol // 20
    const colCantidad = 85
    const colPrecioUnit = 105
    const colDescuento = 140
    const colSubtotal = 190
    const anchoProducto = colCantidad - colProducto - 3 // ~62mm para producto
    
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    
    // Encabezados de tabla
    doc.text('Producto', colProducto, yPosition)
    doc.text('Cant.', colCantidad, yPosition)
    doc.text('Precio Unit.', colPrecioUnit, yPosition)
    doc.text('Desc.', colDescuento, yPosition)
    doc.text('Subtotal', colSubtotal, yPosition, { align: 'right' })
    yPosition += 6

    doc.setLineWidth(0.3)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 6

    // Items
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    sale.items.forEach((item) => {
      const productName = item.productName
      const variantInfo = item.variantName !== 'Estándar' ? ` (${item.variantName})` : ''
      const fullName = productName + variantInfo

      // Nombre del producto (puede ser multilínea) - ancho reducido para dar espacio a números
      const nameLines = doc.splitTextToSize(fullName, anchoProducto)
      const nameHeight = nameLines.length * 5
      const baseY = yPosition

      // Nombre del producto
      doc.text(nameLines, colProducto, yPosition)
      
      // Cantidad (alineado verticalmente con la primera línea del nombre)
      doc.text(item.quantity.toString(), colCantidad, baseY)
      
      // Precio unitario (alineado verticalmente con la primera línea del nombre)
      // Usar tamaño de fuente más pequeño si el número es muy largo
      const precioText = formatCurrency(item.unitPrice.amount)
      if (precioText.length > 12) {
        doc.setFontSize(8)
      }
      doc.text(precioText, colPrecioUnit, baseY)
      doc.setFontSize(9)
      
      // Descuento (alineado verticalmente con la primera línea del nombre)
      if (item.discount.value > 0) {
        doc.text(`${item.discount.value}%`, colDescuento, baseY)
      } else {
        doc.text('-', colDescuento, baseY)
      }
      
      // Subtotal (alineado verticalmente con la primera línea del nombre)
      // Usar tamaño de fuente más pequeño si el número es muy largo
      const subtotalText = formatCurrency(item.subtotal.amount)
      doc.setFont('helvetica', 'bold')
      if (subtotalText.length > 12) {
        doc.setFontSize(8)
      }
      doc.text(subtotalText, colSubtotal, baseY, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      
      // Avanzar según la altura del nombre del producto o un mínimo
      yPosition += Math.max(nameHeight, 8)

      // Línea separadora entre items
      doc.setLineWidth(0.1)
      doc.line(20, yPosition, 190, yPosition)
      yPosition += 4
    })

    yPosition += 3

    // Totales
    doc.setLineWidth(0.5)
    doc.line(20, yPosition, 190, yPosition)
    yPosition += 10

    doc.setFontSize(10)
    
    // Subtotal - ajustar posición para números grandes
    const colTotalesLabel = 130
    const colTotalesValor = 190
    
    doc.setFont('helvetica', 'normal')
    doc.text('Subtotal:', colTotalesLabel, yPosition)
    doc.setFont('helvetica', 'bold')
    const subtotalText = formatCurrency(sale.subtotal.amount)
    if (subtotalText.length > 15) {
      doc.setFontSize(9)
    }
    doc.text(subtotalText, colTotalesValor, yPosition, { align: 'right' })
    doc.setFontSize(10)
    yPosition += 8

    // Descuentos
    if (sale.totalDiscount.amount > 0) {
      doc.setFont('helvetica', 'normal')
      doc.text('Descuentos:', colTotalesLabel, yPosition)
      doc.setFont('helvetica', 'bold')
      const descuentoText = `-${formatCurrency(sale.totalDiscount.amount)}`
      if (descuentoText.length > 15) {
        doc.setFontSize(9)
      }
      doc.text(descuentoText, colTotalesValor, yPosition, { align: 'right' })
      doc.setFontSize(10)
      yPosition += 8
    }

    // Total
    doc.setLineWidth(0.3)
    doc.line(colTotalesLabel, yPosition, colTotalesValor, yPosition)
    yPosition += 8

    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL:', colTotalesLabel, yPosition)
    const totalText = formatCurrency(sale.total.amount)
    // Si el total es muy grande, usar fuente más pequeña pero aún visible
    if (totalText.length > 15) {
      doc.setFontSize(12)
    }
    doc.text(totalText, colTotalesValor, yPosition, { align: 'right' })
    yPosition += 12

    // Información adicional
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text(`Método de pago: ${this.translatePaymentMethod(sale.paymentMethodType)}`, leftCol, yPosition)
    yPosition += 8

    // Notas
    if (sale.notes) {
      doc.setLineWidth(0.3)
      doc.line(20, yPosition, 190, yPosition)
      yPosition += 8

      doc.setFont('helvetica', 'italic')
      const notesLines = doc.splitTextToSize(`Notas: ${sale.notes}`, 170)
      doc.text(notesLines, leftCol, yPosition)
    }

    // Footer
    if (includeFooter) {
      yPosition = 270
      doc.setLineWidth(0.3)
      doc.line(20, yPosition, 190, yPosition)
      yPosition += 8

      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Gracias por su compra', 105, yPosition, { align: 'center' })
      yPosition += 4
      doc.text('Sistema generado automáticamente', 105, yPosition, { align: 'center' })
    }

    // Generar nombre del archivo
    const fileName = `Factura-${sale.receiptNumber}-${formatDate(sale.createdAt).replace(/\//g, '-')}.pdf`

    // Descargar PDF
    doc.save(fileName)
  }

  /**
   * Imprime un recibo de venta directamente usando la impresora del sistema
   * Genera HTML optimizado para impresoras térmicas (80mm)
   */
  static printSaleReceipt(sale: Sale, options: PDFOptions = {}): void {
    const {
      title = 'Recibo de Venta',
      includeHeader = true,
      includeFooter = true
    } = options

    // Crear contenido HTML para el ticket
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${title} - ${sale.receiptNumber}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
              padding: 0;
            }
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            body {
              margin: 0;
              padding: 5mm;
              width: 70mm;
            }
            .no-print {
              display: none !important;
            }
          }
          @media screen {
            body {
              width: 80mm;
              max-width: 100%;
              margin: 0 auto;
              border: 1px dashed #ccc;
              background: #fff;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 70mm;
            margin: 0 auto;
            padding: 5mm;
            line-height: 1.4;
            box-sizing: border-box;
          }
          * {
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            margin-bottom: 10px;
          }
          .header h1 {
            font-size: 18px;
            font-weight: bold;
            margin: 5px 0;
          }
          .header p {
            font-size: 10px;
            margin: 2px 0;
          }
          .separator {
            border-top: 1px solid #000;
            margin: 8px 0;
          }
          .info {
            margin: 5px 0;
            font-size: 10px;
          }
          .items {
            margin: 10px 0;
          }
          .item {
            margin: 8px 0;
          }
          .item-name {
            font-weight: bold;
            margin-bottom: 2px;
          }
          .item-details {
            font-size: 9px;
            margin-left: 5px;
            color: #666;
          }
          .item-total {
            text-align: right;
            font-weight: bold;
            margin-top: 2px;
          }
          .totals {
            margin-top: 10px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 10px;
          }
          .total-final {
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
            font-size: 14px;
            font-weight: bold;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            font-size: 9px;
            color: #666;
          }
        </style>
      </head>
      <body>
    `

    // Header
    if (includeHeader) {
      html += `
        <div class="header">
          <h1>COTILLÓN MANAGER</h1>
          <p>Sistema de Gestión de Stock y Ventas</p>
        </div>
        <div class="separator"></div>
      `
    }

    // Título
    html += `<h2 style="text-align: center; font-size: 14px; margin: 8px 0;">${title}</h2>`

    // Información de la venta
    html += `
      <div class="info"><strong>Recibo:</strong> ${sale.receiptNumber}</div>
      <div class="info"><strong>Fecha:</strong> ${formatDateTime(sale.createdAt)}</div>
    `

    if (sale.customerId) {
      html += `<div class="info"><strong>Cliente:</strong> ${sale.customerId}</div>`
    }

    html += `<div class="separator"></div>`

    // Items
    html += `<div class="items">`
    html += `<div style="font-weight: bold; margin-bottom: 5px;">Productos:</div>`

    sale.items.forEach((item) => {
      const variantInfo = item.variantName !== 'Estándar' ? ` (${item.variantName})` : ''
      const discountInfo = item.discount.value > 0 ? ` - Descuento: ${item.discount.value}%` : ''

      html += `
        <div class="item">
          <div class="item-name">${item.productName}${variantInfo}</div>
          <div class="item-details">${item.quantity} × ${formatCurrency(item.unitPrice.amount)}${discountInfo}</div>
          <div class="item-total">${formatCurrency(item.subtotal.amount)}</div>
        </div>
      `
    })

    html += `</div>`
    html += `<div class="separator"></div>`

    // Totales
    html += `<div class="totals">`
    html += `<div class="total-row"><span>Subtotal:</span><span>${formatCurrency(sale.subtotal.amount)}</span></div>`

    if (sale.totalDiscount.amount > 0) {
      html += `<div class="total-row"><span>Descuentos:</span><span>-${formatCurrency(sale.totalDiscount.amount)}</span></div>`
    }

    html += `
      <div class="total-row total-final">
        <span>TOTAL:</span>
        <span>${formatCurrency(sale.total.amount)}</span>
      </div>
    `
    html += `</div>`

    // Método de pago y estado
    html += `
      <div class="info" style="margin-top: 10px;">
        <strong>Método de pago:</strong> ${this.translatePaymentMethod(sale.paymentMethodType)}<br>
        <strong>Estado:</strong> ${this.translateSaleStatus(sale.status)}
      </div>
    `

    // Notas
    if (sale.notes) {
      html += `
        <div class="separator"></div>
        <div class="info" style="font-style: italic; font-size: 9px;">
          <strong>Notas:</strong> ${sale.notes}
        </div>
      `
    }

    // Footer
    if (includeFooter) {
      html += `
        <div class="separator"></div>
        <div class="footer">
          <p>Gracias por su compra</p>
          <p>Sistema generado automáticamente</p>
        </div>
      `
    }

    // Agregar mensaje de ayuda para impresión (solo visible en pantalla, no se imprime)
    html += `
        <div class="no-print" style="position: fixed; top: 0; left: 0; right: 0; background: #fff3cd; border-bottom: 2px solid #ffc107; padding: 15px; margin: 0; font-size: 13px; color: #856404; z-index: 1000; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="max-width: 800px; margin: 0 auto;">
            <strong style="font-size: 14px;">💡 Instrucciones para imprimir en impresora térmica (80mm):</strong><br>
            <div style="margin-top: 8px; line-height: 1.6;">
              1. En el diálogo de impresión, busca <strong>"Más configuraciones"</strong> o <strong>"Configuración"</strong><br>
              2. Configura el <strong>tamaño de papel</strong> a <strong>80mm</strong> o crea uno personalizado: <strong>80mm x 200mm</strong><br>
              3. Establece los <strong>márgenes</strong> en <strong>0</strong> o <strong>Mínimo</strong><br>
              4. Si no encuentras 80mm, selecciona <strong>"Ajustar a página"</strong> o <strong>"Escalar: 100%"</strong><br>
              5. Haz clic en <strong>"Imprimir"</strong>
            </div>
          </div>
        </div>
        <div class="no-print" style="height: 80px;"></div>
      </body>
      </html>
    `

    // Abrir ventana de impresión con tamaño más grande
    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    if (!printWindow) {
      console.error('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén habilitados.')
      return
    }

    printWindow.document.write(html)
    printWindow.document.close()

    // Esperar a que se cargue el contenido y luego imprimir
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
        // Cerrar la ventana después de un tiempo (opcional)
        // setTimeout(() => printWindow.close(), 1000)
      }, 250)
    }
  }
}

