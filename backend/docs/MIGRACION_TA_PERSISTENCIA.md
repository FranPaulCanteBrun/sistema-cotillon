# Migración: Persistencia del TA en DB

## Cambios Realizados

### 1. Modelo Prisma `FiscalTokenCache`

Se agregó el modelo `FiscalTokenCache` al schema de Prisma para persistir el TA (Ticket de Acceso) de WSAA entre reinicios del servidor.

**Campos:**
- `env`: 'homo' o 'prod'
- `cuit`: CUIT del emisor
- `service`: 'wsfe'
- `token`: Token de WSAA
- `sign`: Sign de WSAA
- `expirationTime`: Fecha de expiración del TA
- `obtainedAt`: Cuándo se obtuvo el TA

**Constraint único:** `(env, cuit, service)` - Solo un TA por combinación.

### 2. ArcaTokenManager - Persistencia Automática

- **Al iniciar**: Carga TA desde DB si existe y está vigente
- **Al obtener TA**: Guarda automáticamente en DB (upsert)
- **Al invalidar**: Elimina de DB también

### 3. Migración de Base de Datos

**Ejecutar:**

```bash
cd backend
npx prisma db push
```

**Nota:** Si el servidor está corriendo, detenerlo primero para evitar errores de permisos en Windows.

## Beneficios

1. **Persistencia entre reinicios**: El TA se conserva aunque se reinicie el servidor
2. **Evita "alreadyAuthenticated"**: Al tener el TA en DB, no se llama innecesariamente a WSAA
3. **Auditoría**: Se puede ver cuándo se obtuvo el último TA y cuándo expira
4. **Robustez**: Si falla la persistencia, el cache en memoria sigue funcionando

## Próximos Pasos

Una vez ejecutada la migración, el sistema:
- Cargará automáticamente el TA desde DB al iniciar
- Guardará el TA cada vez que se obtenga uno nuevo
- Validará que el punto de venta 1 esté habilitado en WSFEv1
