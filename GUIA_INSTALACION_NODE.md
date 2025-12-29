# 🔧 Guía de Instalación de Node.js y npm - Versión Específica

Esta guía te ayudará a instalar la misma versión de Node.js y npm que tienes en tu PC actual en tu notebook.

## 📋 Versiones Requeridas

- **Node.js**: v22.20.0
- **npm**: 11.6.4 (se instala automáticamente con Node.js)

---

## 🪟 Para Windows (tu notebook)

### Opción 1: Usando nvm-windows (Recomendado)

**nvm-windows** es un gestor de versiones de Node.js para Windows que te permite instalar y cambiar entre diferentes versiones fácilmente.

#### Paso 1: Descargar nvm-windows

1. Ve a: https://github.com/coreybutler/nvm-windows/releases
2. Descarga el archivo **`nvm-setup.exe`** (la última versión)
3. Ejecuta el instalador y sigue las instrucciones

#### Paso 2: Verificar instalación

Abre PowerShell o CMD como **Administrador** y ejecuta:

```bash
nvm version
```

Deberías ver algo como: `1.1.12` (o la versión que instalaste)

#### Paso 3: Instalar Node.js v22.20.0

```bash
# Instalar la versión específica
nvm install 22.20.0

# Usar esa versión
nvm use 22.20.0

# Verificar
node --version
npm --version
```

Deberías ver:
- `v22.20.0`
- `11.6.4` (o similar, npm viene incluido con Node.js)

#### Paso 4: Configurar como versión por defecto (opcional)

```bash
nvm alias default 22.20.0
```

---

### Opción 2: Usando fnm (Fast Node Manager)

**fnm** es otra alternativa más moderna y rápida.

#### Paso 1: Instalar fnm

**Con Chocolatey** (si lo tienes):
```bash
choco install fnm
```

**Con Scoop** (si lo tienes):
```bash
scoop install fnm
```

**Manual** (PowerShell como Administrador):
```powershell
# Instalar fnm
winget install Schniz.fnm

# O descargar desde: https://github.com/Schniz/fnm/releases
```

#### Paso 2: Configurar fnm en PowerShell

Abre PowerShell y ejecuta:

```powershell
# Agregar fnm al PATH (solo la primera vez)
fnm env --use-on-cd | Out-String | Invoke-Expression
```

O agrega esto a tu perfil de PowerShell (`$PROFILE`):
```powershell
fnm env --use-on-cd | Out-String | Invoke-Expression
```

#### Paso 3: Instalar Node.js v22.20.0

```bash
# Instalar la versión específica
fnm install 22.20.0

# Usar esa versión
fnm use 22.20.0

# Verificar
node --version
npm --version
```

---

### Opción 3: Descargar directamente (NO recomendado)

Si ninguna de las opciones anteriores funciona, puedes descargar directamente:

1. Ve a: https://nodejs.org/dist/v22.20.0/
2. Descarga: **`node-v22.20.0-x64.msi`** (para Windows 64-bit)
3. Ejecuta el instalador
4. ⚠️ **Problema**: Esto sobrescribirá cualquier versión anterior de Node.js

---

## ✅ Verificación Final

Después de instalar, verifica en tu notebook:

```bash
node --version
# Debe mostrar: v22.20.0

npm --version
# Debe mostrar: 11.6.4 (o muy cercano)
```

---

## 🔄 Cambiar entre Versiones (si usas nvm o fnm)

### Con nvm-windows:
```bash
# Ver versiones instaladas
nvm list

# Cambiar a otra versión
nvm use 22.20.0

# Instalar otra versión
nvm install 18.20.0
```

### Con fnm:
```bash
# Ver versiones instaladas
fnm list

# Cambiar a otra versión
fnm use 22.20.0

# Instalar otra versión
fnm install 18.20.0
```

---

## 🐛 Solución de Problemas

### ❌ Error: "La ejecución de scripts está deshabilitada"

Este es un problema común en Windows. **Solución:**

```powershell
# Abre PowerShell como Administrador y ejecuta:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Confirma con "Y" cuando te pregunte. Esto permite ejecutar scripts locales.

**📖 Ver guía completa**: Consulta `SOLUCION_NVM_WINDOWS.md` para más detalles.

### Error: "nvm no se reconoce como comando"

1. Cierra y vuelve a abrir PowerShell/CMD
2. Ejecuta como **Administrador**
3. Verifica que nvm esté en el PATH:
   ```bash
   echo %PATH%
   ```
4. Si no está, reinstala nvm-windows

### Error: "No existe tal archivo o directorio"

1. **Reinicia completamente** PowerShell/CMD después de instalar nvm
2. Verifica que Node.js esté instalado:
   ```powershell
   nvm list
   ```
3. Si no aparece ninguna versión:
   ```powershell
   nvm install 22.20.0
   nvm use 22.20.0
   ```
4. Verifica el PATH de Windows (ver `SOLUCION_NVM_WINDOWS.md`)

### Error: "fnm no se reconoce como comando"

1. Reinicia PowerShell después de instalar fnm
2. Ejecuta el comando de configuración:
   ```powershell
   fnm env --use-on-cd | Out-String | Invoke-Expression
   ```

### Error de permisos

- Ejecuta PowerShell/CMD como **Administrador**
- En Windows, a veces necesitas permisos de administrador para instalar Node.js

### Versión de npm diferente

Si npm muestra una versión diferente (ej: 11.7.0 en lugar de 11.6.4):

```bash
# Actualizar npm a la versión específica (opcional, generalmente no es necesario)
npm install -g npm@11.6.4
```

**Nota**: Las diferencias menores en la versión de npm (11.6.4 vs 11.7.0) generalmente no causan problemas de compatibilidad.

---

## 📝 Recomendación

**Usa nvm-windows** porque:
- ✅ Es la opción más estable para Windows
- ✅ Fácil de usar
- ✅ Permite cambiar entre versiones fácilmente
- ✅ No interfiere con otras instalaciones de Node.js

---

## 🚀 Después de Instalar

Una vez que tengas Node.js v22.20.0 instalado:

1. **Verifica las versiones**:
   ```bash
   node --version
   npm --version
   ```

2. **Instala las dependencias del proyecto**:
   ```bash
   # En la raíz del proyecto
   npm install
   
   # En el backend
   cd backend
   npm install
   ```

3. **Verifica que todo funciona**:
   ```bash
   # Backend
   cd backend
   npm run dev
   
   # Frontend (en otra terminal)
   npm run dev
   ```

---

**¡Listo! Ahora deberías tener la misma versión de Node.js y npm en ambos equipos.** 🎉

