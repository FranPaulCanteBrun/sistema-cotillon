/**
 * Script de prueba para obtener Token WSAA
 * 
 * Este script prueba la obtención completa del token WSAA:
 * 1. Verifica la configuración
 * 2. Construye el TRA
 * 3. Firma el TRA con CMS
 * 4. Solicita Token + Sign desde WSAA
 */

import { env, isFiscalEnabled } from '../src/config/env.js'
import { ArcaTokenManager } from '../src/services/arca/index.js'

async function testWSAA() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🧪 PRUEBA DE OBTENCIÓN DE TOKEN WSAA')
  console.log('═══════════════════════════════════════════════════════════\n')

  try {
    // 1. Verificar configuración
    console.log('📋 Paso 1: Verificando configuración...')
    if (!isFiscalEnabled()) {
      throw new Error('Facturación electrónica no está configurada. Verifica las variables de entorno AFIP_*')
    }
    console.log('✅ Configuración OK')
    console.log(`   CUIT: ${env.AFIP_CUIT?.replace(/(\d{2})(\d{8})(\d)/, '$1-$2-$3')}`)
    console.log(`   Entorno: ${env.AFIP_ENV}`)
    console.log(`   Certificado: ${env.AFIP_CERT_P12_BASE64?.length || 0} caracteres Base64\n`)

    // 2. Obtener instancia del TokenManager
    console.log('📋 Paso 2: Obteniendo instancia de ArcaTokenManager...')
    const tokenManager = ArcaTokenManager.getInstance()
    console.log('✅ TokenManager obtenido\n')

    // 3. Obtener Token + Sign
    console.log('📋 Paso 3: Solicitando Token + Sign desde WSAA...')
    console.log('   Esto puede tardar unos segundos...\n')
    
    const startTime = Date.now()
    const { token, sign } = await tokenManager.getTokenAndSign()
    const elapsedTime = Date.now() - startTime

    // 4. Mostrar resultados
    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('✅ TOKEN WSAA OBTENIDO EXITOSAMENTE')
    console.log('═══════════════════════════════════════════════════════════\n')
    console.log(`⏱️  Tiempo transcurrido: ${elapsedTime}ms`)
    console.log(`📏 Longitud del Token: ${token.length} caracteres`)
    console.log(`📏 Longitud del Sign: ${sign.length} caracteres`)
    console.log(`\n🔍 Preview del Token:`)
    console.log(`   ${token.substring(0, 50)}...${token.substring(token.length - 20)}`)
    console.log(`\n🔍 Preview del Sign:`)
    console.log(`   ${sign.substring(0, 50)}...${sign.substring(sign.length - 20)}`)
    console.log('\n✅ ¡Prueba exitosa! El certificado está funcionando correctamente.\n')

  } catch (error) {
    console.error('\n═══════════════════════════════════════════════════════════')
    console.error('❌ ERROR AL OBTENER TOKEN WSAA')
    console.error('═══════════════════════════════════════════════════════════\n')
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
    console.error('Mensaje de error:', errorMessage)
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }

    // Mensajes de ayuda según el tipo de error
    if (errorMessage.includes('password')) {
      console.error('\n💡 Ayuda: Verifica que AFIP_CERT_P12_PASSWORD sea correcta')
    } else if (errorMessage.includes('No se pudo extraer')) {
      console.error('\n💡 Ayuda: Verifica que AFIP_CERT_P12_BASE64 sea válido y no tenga saltos de línea')
    } else if (errorMessage.includes('WSAA respondió con status 500')) {
      console.error('\n💡 Ayuda: Error 500 de WSAA. Posibles causas:')
      console.error('   1. Certificado no asociado al servicio "Facturación Electrónica"')
      console.error('   2. CUIT del certificado no coincide con AFIP_CUIT')
      console.error('   3. Formato del TRA incorrecto')
      console.error('   4. Firma CMS incorrecta')
    } else if (errorMessage.includes('loginCmsReturn')) {
      console.error('\n💡 Ayuda: Error en la respuesta de WSAA. Verifica:')
      console.error('   1. Que el certificado esté autorizado en AFIP')
      console.error('   2. Que el CUIT sea correcto')
      console.error('   3. Que estés usando AFIP_ENV="homo" para homologación')
    }

    process.exit(1)
  }
}

testWSAA()
