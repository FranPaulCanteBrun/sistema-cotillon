/**
 * Script de prueba para validar el certificado según el manual ARCA
 * 
 * Verifica:
 * 1. El certificado es X.509
 * 2. La clave privada corresponde al certificado
 * 3. NO está vencido
 * 4. Fue generado para Web Services
 * 5. Está asociado al servicio "Facturación Electrónica"
 * 6. El CUIT del certificado es el mismo CUIT que se usa en WSFE
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { env } from '../src/config/env.js'

// Cargar node-forge dinámicamente
const forgeModule = await import('node-forge')
const forge = forgeModule.default || forgeModule

async function testCertificate() {
  console.log('🔍 Validando certificado según manual ARCA...\n')

  try {
    // 1. Cargar certificado desde Base64
    const certBuffer = Buffer.from(env.AFIP_CERT_P12_BASE64!, 'base64')
    console.log('✅ Certificado Base64 decodificado correctamente')
    console.log(`   Longitud: ${certBuffer.length} bytes\n`)

    // 2. Cargar P12
    const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'))
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, false, env.AFIP_CERT_P12_PASSWORD!)
    console.log('✅ Archivo P12 cargado correctamente\n')

    // 3. Extraer certificado
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    const certBag = certBags[forge.pki.oids.certBag]?.[0]
    
    if (!certBag || !certBag.cert) {
      throw new Error('❌ No se pudo extraer el certificado del archivo P12')
    }

    const certificate = certBag.cert
    console.log('✅ Certificado X.509 extraído correctamente\n')

    // 4. Verificar que es X.509
    console.log('📋 Verificación 1: Certificado es X.509')
    console.log(`   Tipo: ${certificate.constructor.name}`)
    console.log(`   ✅ Es un certificado X.509\n`)

    // 5. Extraer clave privada
    const bags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    const keyBag = bags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]
    
    if (!keyBag || !keyBag.key) {
      throw new Error('❌ No se pudo extraer la clave privada del certificado P12')
    }

    const privateKey = keyBag.key
    console.log('✅ Clave privada extraída correctamente\n')

    // 6. Verificar que la clave privada corresponde al certificado
    console.log('📋 Verificación 2: Clave privada corresponde al certificado')
    const publicKey = certificate.publicKey
    const modulusMatch = publicKey.n.equals(privateKey.n)
    console.log(`   Modulus coincide: ${modulusMatch ? '✅' : '❌'}`)
    if (!modulusMatch) {
      throw new Error('❌ La clave privada NO corresponde al certificado')
    }
    console.log('   ✅ Clave privada corresponde al certificado\n')

    // 7. Verificar que NO está vencido
    console.log('📋 Verificación 3: Certificado NO está vencido')
    const now = new Date()
    const validFrom = certificate.validity.notBefore
    const validTo = certificate.validity.notAfter
    
    console.log(`   Válido desde: ${validFrom}`)
    console.log(`   Válido hasta: ${validTo}`)
    console.log(`   Fecha actual: ${now}`)
    
    if (now < validFrom) {
      throw new Error(`❌ Certificado aún no es válido (válido desde ${validFrom})`)
    }
    if (now > validTo) {
      throw new Error(`❌ Certificado está VENCIDO (venció el ${validTo})`)
    }
    console.log('   ✅ Certificado NO está vencido\n')

    // 8. Extraer información del Subject
    console.log('📋 Verificación 4: Información del certificado')
    const subject = certificate.subject
    const subjectFields: Record<string, string> = {}
    
    // Extraer todos los campos del subject
    const fields = ['CN', 'O', 'C', 'SERIALNUMBER', 'OU', 'L', 'ST', 'E']
    fields.forEach(field => {
      const fieldValue = subject.getField(field)
      if (fieldValue) {
        subjectFields[field] = fieldValue.value
      }
    })

    console.log('   Subject completo:')
    Object.entries(subjectFields).forEach(([key, value]) => {
      console.log(`     ${key}: ${value}`)
    })
    
    // Buscar CUIT en el Issuer también
    const issuer = certificate.issuer
    const issuerFields: Record<string, string> = {}
    fields.forEach(field => {
      const fieldValue = issuer.getField(field)
      if (fieldValue) {
        issuerFields[field] = fieldValue.value
      }
    })
    
    if (Object.keys(issuerFields).length > 0) {
      console.log('   Issuer completo:')
      Object.entries(issuerFields).forEach(([key, value]) => {
        console.log(`     ${key}: ${value}`)
      })
    }
    
    // Buscar en extensiones del certificado
    if (certificate.extensions) {
      console.log('   Extensiones del certificado:')
      certificate.extensions.forEach((ext: any, index: number) => {
        console.log(`     Extensión ${index + 1}: ${ext.name || 'Sin nombre'}`)
        if (ext.value) {
          console.log(`       Valor: ${ext.value}`)
        }
      })
    }
    console.log()

    // 9. Verificar CUIT
    console.log('📋 Verificación 5: CUIT del certificado coincide con AFIP_CUIT')
    const certCuit = subjectFields.SERIALNUMBER?.replace(/[^0-9]/g, '') || ''
    const envCuit = env.AFIP_CUIT!.replace(/-/g, '')
    
    console.log(`   CUIT del certificado: ${subjectFields.SERIALNUMBER || 'NO ENCONTRADO'}`)
    console.log(`   CUIT en env (AFIP_CUIT): ${env.AFIP_CUIT}`)
    
    if (certCuit !== envCuit) {
      console.warn(`   ⚠️ ADVERTENCIA: El CUIT del certificado (${certCuit}) NO coincide con AFIP_CUIT (${envCuit})`)
      console.warn(`   Esto puede causar errores 500 en WSAA\n`)
    } else {
      console.log('   ✅ CUIT coincide\n')
    }

    // 10. Construir DN para TRA
    console.log('📋 Verificación 6: DN (Distinguished Name) para TRA')
    const dnParts: string[] = []
    
    if (subjectFields.CN) dnParts.push(`CN=${subjectFields.CN}`)
    if (subjectFields.O) dnParts.push(`O=${subjectFields.O}`)
    if (subjectFields.C) dnParts.push(`C=${subjectFields.C}`)
    if (subjectFields.SERIALNUMBER) dnParts.push(`SERIALNUMBER=${subjectFields.SERIALNUMBER}`)

    const dn = dnParts.join(', ')
    console.log(`   DN extraído: ${dn}\n`)

    // 11. Verificar que fue generado para Web Services
    console.log('📋 Verificación 7: Certificado generado para Web Services')
    console.log('   ⚠️ Esta verificación requiere acceso a AFIP para confirmar')
    console.log('   Verifica manualmente en AFIP que el certificado esté asociado al servicio "Facturación Electrónica"\n')

    // 12. Resumen
    console.log('═══════════════════════════════════════════════════════════')
    console.log('📊 RESUMEN DE VALIDACIONES')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('✅ Certificado es X.509')
    console.log('✅ Clave privada corresponde al certificado')
    console.log('✅ Certificado NO está vencido')
    console.log(`${certCuit === envCuit ? '✅' : '⚠️'} CUIT coincide: ${certCuit === envCuit ? 'SÍ' : 'NO'}`)
    console.log('⚠️ Verificar manualmente: Certificado asociado a "Facturación Electrónica"')
    console.log('═══════════════════════════════════════════════════════════\n')

    if (certCuit !== envCuit) {
      console.error('❌ ERROR CRÍTICO: El CUIT del certificado NO coincide con AFIP_CUIT')
      console.error('   Esto causará errores 500 en WSAA')
      console.error('   Solución: Usa el certificado correcto o corrige AFIP_CUIT en .env\n')
      process.exit(1)
    }

    console.log('✅ Todas las validaciones básicas pasaron')
    console.log('⚠️ IMPORTANTE: Verifica en AFIP que el certificado esté asociado al servicio "Facturación Electrónica"')
    console.log('   Si no está asociado, WSAA puede devolver algo "válido" pero WSFE responderá 500 siempre\n')

  } catch (error) {
    console.error('❌ Error al validar certificado:', error instanceof Error ? error.message : 'Error desconocido')
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack)
    }
    process.exit(1)
  }
}

testCertificate()

