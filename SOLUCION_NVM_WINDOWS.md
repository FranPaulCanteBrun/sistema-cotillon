# 🔧 Solución de Problemas con nvm-windows

## ❌ Error: "La ejecución de scripts está deshabilitada"

Este error ocurre porque PowerShell tiene restricciones de seguridad que bloquean la ejecución de scripts.

### Solución 1: Habilitar ejecución de scripts (Recomendado)

**Abre PowerShell como Administrador** y ejecuta:

```powershell
# Ver la política actual
Get-ExecutionPolicy

# Cambiar la política para el usuario actual
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Confirmar con "Y" cuando te pregunte
```

**Explicación:**
- `RemoteSigned`: Permite ejecutar scripts locales sin firmar, pero requiere que los scripts descargados estén firmados
- `CurrentUser`: Solo afecta a tu usuario, no requiere permisos de administrador del sistema

### Solución 2: Ejecutar comando específico (Alternativa)

Si no quieres cambiar la política global, puedes ejecutar:

```powershell
# Ejecutar PowerShell con política temporal
powershell -ExecutionPolicy Bypass -Command "node --version"
```

---

## ❌ Error: "No existe tal archivo o directorio"

Este error puede ocurrir por varias razones:

### Verificar que nvm esté instalado correctamente

1. **Verificar instalación de nvm:**
   ```powershell
   nvm version
   ```
   
   Si esto funciona, nvm está instalado. Si no, reinstala nvm-windows.

2. **Verificar que Node.js esté instalado:**
   ```powershell
   nvm list
   ```
   
   Deberías ver algo como:
   ```
   * 22.20.0 (Currently using 64-bit executable)
   ```

3. **Si no aparece ninguna versión, instálala:**
   ```powershell
   nvm install 22.20.0
   nvm use 22.20.0
   ```

### Verificar PATH de Windows

1. **Abrir Variables de Entorno:**
   - Presiona `Win + R`
   - Escribe: `sysdm.cpl`
   - Ve a la pestaña "Opciones avanzadas"
   - Haz clic en "Variables de entorno"

2. **Verificar PATH:**
   - En "Variables del sistema", busca `Path`
   - Debe contener: `C:\Users\TU_USUARIO\AppData\Roaming\nvm`
   - Y también: `C:\Program Files\nodejs` (o la ruta donde nvm instala Node.js)

3. **Si no están, agrégalas:**
   - Haz clic en "Editar" en la variable Path
   - Agrega: `C:\Users\TU_USUARIO\AppData\Roaming\nvm`
   - Agrega: `C:\Program Files\nodejs`

### Reiniciar terminal

**IMPORTANTE**: Después de instalar nvm o cambiar el PATH:
1. **Cierra completamente** PowerShell/CMD
2. **Abre una nueva ventana** de PowerShell/CMD
3. Prueba de nuevo:
   ```powershell
   node --version
   npm --version
   ```

---

## 🔍 Verificación Paso a Paso

### Paso 1: Verificar nvm
```powershell
nvm version
```
**Esperado**: Un número de versión (ej: `1.1.12`)

### Paso 2: Ver versiones instaladas
```powershell
nvm list
```
**Esperado**: Lista de versiones de Node.js instaladas

### Paso 3: Instalar Node.js v22.20.0 (si no está)
```powershell
nvm install 22.20.0
nvm use 22.20.0
```

### Paso 4: Verificar Node.js
```powershell
node --version
```
**Esperado**: `v22.20.0`

### Paso 5: Verificar npm
```powershell
npm --version
```
**Esperado**: `11.6.4` (o similar)

---

## 🐛 Solución de Problemas Adicionales

### Si nvm no se reconoce como comando

1. **Verificar instalación:**
   - nvm-windows se instala en: `C:\Users\TU_USUARIO\AppData\Roaming\nvm`
   - Verifica que esta carpeta existe

2. **Agregar al PATH manualmente:**
   ```powershell
   # Ver PATH actual
   $env:PATH
   
   # Agregar temporalmente (solo para esta sesión)
   $env:PATH += ";C:\Users\TU_USUARIO\AppData\Roaming\nvm"
   ```

3. **Reinstalar nvm-windows:**
   - Desinstala la versión actual
   - Descarga la última versión desde: https://github.com/coreybutler/nvm-windows/releases
   - Instala como Administrador

### Si Node.js no se encuentra después de `nvm use`

1. **Verificar que nvm use funcionó:**
   ```powershell
   nvm current
   ```
   Debe mostrar: `22.20.0`

2. **Verificar ruta de Node.js:**
   ```powershell
   where.exe node
   ```
   Debe mostrar algo como: `C:\Users\TU_USUARIO\AppData\Roaming\nvm\v22.20.0\node.exe`

3. **Si la ruta es incorrecta, reinstalar:**
   ```powershell
   nvm uninstall 22.20.0
   nvm install 22.20.0
   nvm use 22.20.0
   ```

---

## ✅ Comandos de Verificación Final

Después de seguir todos los pasos, ejecuta:

```powershell
# Verificar nvm
nvm version

# Ver versiones instaladas
nvm list

# Ver versión actual
nvm current

# Verificar Node.js
node --version

# Verificar npm
npm --version

# Verificar ubicación
where.exe node
where.exe npm
```

---

## 🚀 Si Todo Falla: Alternativa Rápida

Si nvm-windows sigue dando problemas, puedes:

1. **Desinstalar nvm-windows**
2. **Descargar Node.js directamente:**
   - Ve a: https://nodejs.org/dist/v22.20.0/
   - Descarga: `node-v22.20.0-x64.msi`
   - Instala normalmente

**⚠️ Nota**: Esta opción sobrescribirá cualquier versión anterior de Node.js, pero es más simple si nvm da problemas.

---

## 📞 Comandos de Diagnóstico

Si sigues teniendo problemas, ejecuta estos comandos y comparte los resultados:

```powershell
# Información del sistema
$PSVersionTable

# Política de ejecución
Get-ExecutionPolicy -List

# PATH actual
$env:PATH -split ';'

# Verificar nvm
nvm version
nvm list

# Verificar Node.js
where.exe node
node --version
```

---

**¡Espero que esto resuelva tus problemas!** 🎉

