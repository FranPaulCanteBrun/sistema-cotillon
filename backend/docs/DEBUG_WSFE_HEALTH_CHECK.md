# Debug: Health-Check WSFE

## ✅ Mejoras Implementadas

### 1. Logging Detallado
- Logs en cada paso del health-check
- Tiempos de ejecución de cada llamada SOAP
- Información del TA (cache/DB)
- Errores detallados con stack traces

### 2. Timeouts
- Timeout de 15 segundos en llamadas SOAP
- Manejo de errores de timeout específico

### 3. Manejo de Errores Mejorado
- Errores JSON estructurados
- Stack traces en desarrollo
- Logs detallados de respuestas SOAP

### 4. Conectividad Verificada
- Script de prueba de conectividad creado
- WSDL y endpoint accesibles (Status 200)

## 🔍 Cómo Debuggear

### Paso 1: Verificar Logs del Backend

Cuando llames a `/api/fiscal/test/wsfe`, deberías ver en los logs:

```
🔍 [WSFE Health-Check] Iniciando health-check...
✅ [WSFE Health-Check] Facturación configurada
✅ [WSFE Health-Check] Cliente WSFE creado
📋 [WSFE Health-Check] Verificando TA...
📋 [WSFE Health-Check] TA en cache: Sí/No
📞 [WSFE Health-Check] Llamando FEParamGetPtosVenta...
📤 [WSFE] Llamando FEParamGetPtosVenta a https://wswhomo.afip.gov.ar/wsfev1/service.asmx
📤 [WSFE] SOAP Body length: XXXX caracteres
📥 [WSFE] FEParamGetPtosVenta respondió con status 200
⏱️ [WSFE Health-Check] FEParamGetPtosVenta completado en XXXms
...
```

### Paso 2: Probar con curl

```bash
curl -i http://localhost:3000/api/fiscal/test/wsfe \
  -H "Authorization: Bearer <JWT>"
```

Esto te mostrará:
- Status code (200/404/500)
- Headers
- Body completo

### Paso 3: Verificar Conectividad

```powershell
.\scripts\test-wsfe-connectivity.ps1
```

Debería mostrar:
- ✅ WSDL accesible - Status: 200
- ✅ Endpoint accesible - Status: 200

### Paso 4: Revisar Errores Específicos

**Si ves "404":**
- Verificar que la ruta esté registrada: `app.get('/test/wsfe', ...)`
- Verificar el prefijo: `app.register(fiscalTestRoutes, { prefix: '/api/fiscal' })`
- La ruta completa debería ser: `/api/fiscal/test/wsfe`

**Si ves "500" con timeout:**
- Verificar conectividad con el script
- Verificar que el TA esté vigente
- Revisar logs para ver dónde se cuelga

**Si ves "500" con error de parsing:**
- Revisar logs para ver la respuesta SOAP completa
- Verificar que el namespace sea correcto
- Verificar estructura del XML

**Si no ves logs:**
- Verificar que el servidor esté corriendo
- Verificar que el endpoint esté siendo llamado
- Verificar autenticación (JWT válido)

## 📝 Próximos Pasos

1. **Ejecutar el health-check** y revisar los logs
2. **Si hay errores**, compartir:
   - Status code
   - Logs del backend
   - Primeros 500 caracteres del error (si hay)

3. **Si funciona**, continuar con la configuración del punto de venta
