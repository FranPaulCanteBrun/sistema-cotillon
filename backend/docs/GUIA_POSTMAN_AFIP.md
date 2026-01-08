# 🚀 Guía Paso a Paso: Probar AFIP en Postman

## 📋 Paso 1: Login para Obtener Token JWT

### Configuración de la Request

1. **Método**: `POST`
2. **URL**: `http://localhost:3000/api/auth/login`
3. **Headers**:
   - `Content-Type`: `application/json`
4. **Body** (raw JSON):
   ```json
   {
     "email": "admin@cotillon.local",
     "password": "admin123"
   }
   ```

### Pasos en Postman:

1. Crea una nueva request
2. Selecciona método **POST**
3. En la URL, escribe: `http://localhost:3000/api/auth/login`
4. Ve a la pestaña **Headers**
5. Agrega:
   - Key: `Content-Type`
   - Value: `application/json`
6. Ve a la pestaña **Body**
7. Selecciona **raw** y **JSON** (dropdown a la derecha)
8. Pega el JSON de arriba
9. Haz clic en **Send**

### Respuesta Esperada:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@cotillon.local",
    "name": "Administrador",
    "role": "ADMIN"
  }
}
```

**⚠️ IMPORTANTE**: Copia el `token` completo. Lo necesitarás en el siguiente paso.

---

## 📋 Paso 2: Verificar Configuración (Sin Autenticación)

### Configuración de la Request

1. **Método**: `GET`
2. **URL**: `http://localhost:3000/api/fiscal/test/config`
3. **Headers**: Ninguno necesario

### Pasos en Postman:

1. Crea una nueva request
2. Selecciona método **GET**
3. URL: `http://localhost:3000/api/fiscal/test/config`
4. Haz clic en **Send**

### Respuesta Esperada:

```json
{
  "fiscalEnabled": true,
  "config": {
    "env": "homo",
    "hasCuit": true,
    "cuit": "20-39285369-4",
    "hasCert": true,
    "certLength": 3460,
    "hasPassword": true,
    "hasPtoVta": false,
    "ptoVta": null
  },
  "status": "✅ Configuración completa - Listo para usar"
}
```

Si ves esto, la configuración está correcta ✅

---

## 📋 Paso 3: Probar Obtención de Token WSAA (Requiere Autenticación)

### Configuración de la Request

1. **Método**: `GET`
2. **URL**: `http://localhost:3000/api/fiscal/test/token`
3. **Headers**:
   - `Authorization`: `Bearer TU_TOKEN_JWT_AQUI`

### Pasos en Postman:

1. Crea una nueva request
2. Selecciona método **GET**
3. URL: `http://localhost:3000/api/fiscal/test/token`
4. Ve a la pestaña **Headers**
5. Agrega:
   - Key: `Authorization`
   - Value: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (pega el token completo del Paso 1)
6. Haz clic en **Send**

### Respuesta Exitosa:

```json
{
  "success": true,
  "message": "Token WSAA obtenido exitosamente",
  "data": {
    "tokenPreview": "PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4K...",
    "signPreview": "MIIKpAIBAzCCCl4GCSqGSIb3DQEHAaCCCk8EggpLMIIKRzCCBXc...",
    "tokenLength": 2500,
    "signLength": 344,
    "elapsedTimeMs": 1234,
    "environment": "homo"
  },
  "info": {
    "cuit": "20-39285369-4",
    "env": "homo",
    "hasPtoVta": false,
    "ptoVta": "auto-detect"
  }
}
```

### Si hay Errores:

#### Error 401 (Unauthorized)
- **Problema**: Token JWT inválido o expirado
- **Solución**: Vuelve al Paso 1 y obtén un nuevo token

#### Error 500 con mensaje sobre contraseña
- **Problema**: `AFIP_CERT_P12_PASSWORD` incorrecta
- **Solución**: Verifica la contraseña en tu `.env`

#### Error 500 con mensaje sobre certificado
- **Problema**: Certificado Base64 inválido o corrupto
- **Solución**: Regenera el Base64 desde el `.pfx` original

#### Error 500 con mensaje sobre WSAA
- **Problema**: Certificado no autorizado en AFIP o CUIT incorrecto
- **Solución**: 
  - Verifica que el certificado esté autorizado en AFIP
  - Verifica que el CUIT en `.env` sea correcto
  - Verifica que `AFIP_ENV="homo"` para homologación

---

## 🎯 Colección de Postman (Opcional)

Puedes crear una colección en Postman con estas 3 requests:

### Colección: "AFIP Testing"

1. **Login**
   - POST `http://localhost:3000/api/auth/login`
   - Body: `{"email": "admin@cotillon.local", "password": "admin123"}`
   - Guarda el token en una variable: `{{token}}`

2. **Test Config**
   - GET `http://localhost:3000/api/fiscal/test/config`

3. **Test Token WSAA**
   - GET `http://localhost:3000/api/fiscal/test/token`
   - Header: `Authorization: Bearer {{token}}`

### Configurar Variable de Entorno en Postman:

1. Clic en el ícono de engranaje (⚙️) arriba a la derecha
2. Clic en **Add** para crear un nuevo entorno
3. Nombre: `Local Development`
4. Agrega variable:
   - Variable: `base_url`
   - Initial Value: `http://localhost:3000`
   - Current Value: `http://localhost:3000`
5. Guarda

Luego puedes usar `{{base_url}}/api/auth/login` en tus URLs.

---

## 📸 Screenshots de Referencia (Descripción)

### Request de Login:
```
[POST] http://localhost:3000/api/auth/login
Headers:
  Content-Type: application/json
Body (raw JSON):
  {
    "email": "admin@cotillon.local",
    "password": "admin123"
  }
```

### Request de Test Token:
```
[GET] http://localhost:3000/api/fiscal/test/token
Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## ✅ Checklist

- [ ] Servidor corriendo en `http://localhost:3000`
- [ ] Request de Login exitosa (token obtenido)
- [ ] Request de Test Config exitosa (configuración OK)
- [ ] Request de Test Token WSAA exitosa (token WSAA obtenido)
- [ ] Si hay errores, revisar mensajes y solucionar

---

## 🆘 Troubleshooting Rápido

### "Cannot GET /api/fiscal/test/config"
- **Problema**: Servidor no está corriendo
- **Solución**: Ejecuta `npm run dev` en la carpeta `backend/`

### "401 Unauthorized" en test/token
- **Problema**: Token JWT no válido
- **Solución**: Obtén un nuevo token con el login

### "500 Internal Server Error"
- **Problema**: Error en la obtención del token WSAA
- **Solución**: Revisa el mensaje de error en la respuesta para más detalles

### El servidor no inicia
- **Problema**: Error en variables de entorno
- **Solución**: Verifica que el `.env` esté correcto y el servidor se reinició

---

## 🎉 Siguiente Paso

Una vez que el test de token WSAA funcione correctamente, habremos completado:
- ✅ Tarea 1: Modelo Prisma FiscalDocument
- ✅ Tarea 2: Configuración de variables de entorno
- ✅ Tarea 3: ArcaTokenManager funcionando

**Próximo**: Tarea 4 - Implementar `ArcaWsfeClient` para usar el token y comunicarnos con WSFEv1

