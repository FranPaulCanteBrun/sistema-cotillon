import { config } from 'dotenv'
import { z } from 'zod'

// Cargar variables de entorno
config()

const envSchema = z.object({
  // Base de datos y servidor
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Configuración AFIP/ARCA (Facturación Electrónica)
  // Entorno: 'homo' = homologación, 'prod' = producción
  AFIP_ENV: z.enum(['homo', 'prod']).default('homo'),
  
  // CUIT del emisor (formato: 20-12345678-9 o 20123456789)
  // Requerido solo si se usa facturación electrónica
  AFIP_CUIT: z.string()
    .regex(/^\d{2}-?\d{8}-?\d$/, 'CUIT debe tener formato válido (XX-XXXXXXXX-X)')
    .transform((val) => val.replace(/-/g, '')) // Normalizar sin guiones
    .optional(),
  
  // Certificado P12 en Base64 (obtenido del certificado .p12 de AFIP)
  // Requerido solo si se usa facturación electrónica
  AFIP_CERT_P12_BASE64: z.string()
    .min(100, 'El certificado Base64 parece inválido')
    .optional(),
  
  // Contraseña del certificado P12
  // Requerido solo si se usa facturación electrónica
  AFIP_CERT_P12_PASSWORD: z.string()
    .min(1, 'La contraseña del certificado no puede estar vacía')
    .optional(),
  
  // Punto de venta (opcional: se puede descubrir por API)
  // Acepta strings con ceros a la izquierda (ej: "00003") y los normaliza a número
  // Si no se especifica, se usará el primero habilitado obtenido de FEParamGetPtosVenta
  AFIP_PTO_VTA: z.union([
    z.string().transform((val) => {
      const trimmed = val.trim()
      if (trimmed === '') return undefined
      const num = parseInt(trimmed, 10)
      if (isNaN(num) || num <= 0 || !Number.isInteger(num)) {
        throw new Error(`AFIP_PTO_VTA inválido: "${val}". Debe ser un entero positivo.`)
      }
      return num
    }),
    z.number().int().positive()
  ]).optional(),
  
  // Flag para habilitar emisión real de comprobantes (solo homologación por ahora)
  // Requiere FISCAL_ISSUE_ENABLED=true explícitamente
  FISCAL_ISSUE_ENABLED: z.string().transform((val) => val === 'true').default('false').optional()
})

// Validación condicional: si alguna variable de AFIP está presente, todas deben estar
const envSchemaWithConditional = envSchema.superRefine((data, ctx) => {
  const hasAfipConfig = 
    data.AFIP_CUIT !== undefined || 
    data.AFIP_CERT_P12_BASE64 !== undefined || 
    data.AFIP_CERT_P12_PASSWORD !== undefined
  
  if (hasAfipConfig) {
    if (!data.AFIP_CUIT) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AFIP_CUIT es requerido cuando se configura facturación electrónica',
        path: ['AFIP_CUIT']
      })
    }
    if (!data.AFIP_CERT_P12_BASE64) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AFIP_CERT_P12_BASE64 es requerido cuando se configura facturación electrónica',
        path: ['AFIP_CERT_P12_BASE64']
      })
    }
    if (!data.AFIP_CERT_P12_PASSWORD) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'AFIP_CERT_P12_PASSWORD es requerido cuando se configura facturación electrónica',
        path: ['AFIP_CERT_P12_PASSWORD']
      })
    }
  }
})

const parsed = envSchemaWithConditional.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Variables de entorno inválidas:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data

// Helper para verificar si la facturación electrónica está configurada
export const isFiscalEnabled = (): boolean => {
  return !!(
    env.AFIP_CUIT && 
    env.AFIP_CERT_P12_BASE64 && 
    env.AFIP_CERT_P12_PASSWORD
  )
}

