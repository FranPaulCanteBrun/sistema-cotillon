# Solución: Error EPERM al ejecutar Prisma

## Problema

Al ejecutar `npx prisma db push` o `npx prisma generate`, aparece el error:

```
EPERM: operation not permitted, rename '...query_engine-windows.dll.node.tmp...' -> '...query_engine-windows.dll.node'
```

## Causa

El servidor de Node.js está corriendo y tiene bloqueado el archivo DLL del query engine de Prisma. Windows no permite renombrar archivos que están en uso.

## Solución

### Paso 1: Detener el servidor

Si el servidor está corriendo en una terminal, presiona `Ctrl+C` para detenerlo.

Si está corriendo en background o como servicio, detenerlo completamente.

### Paso 2: Regenerar el cliente de Prisma

```bash
cd backend
npx prisma generate
```

Esto regenerará el cliente de Prisma con el nuevo modelo `FiscalTokenCache`.

### Paso 3: Reiniciar el servidor

```bash
npm run dev
```

## Verificación

Después de regenerar, los errores de TypeScript sobre `fiscalTokenCache` deberían desaparecer.

Si aún aparecen errores, verificar que:
1. El servidor esté completamente detenido
2. No haya procesos de Node.js corriendo (verificar con `tasklist | findstr node`)
3. Ejecutar `npx prisma generate` nuevamente

## Nota Temporal

Se agregaron type assertions `(prisma as any)` temporalmente para que el código compile mientras tanto. Una vez que se ejecute `npx prisma generate`, estos se pueden mantener o quitar (el código funcionará igual).
