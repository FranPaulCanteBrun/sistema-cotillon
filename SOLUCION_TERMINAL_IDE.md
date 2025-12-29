# 🔧 Solución: Node.js no funciona en la terminal del IDE

## ❌ Problema

Node.js funciona en PowerShell normal, pero no en la terminal integrada del IDE (VS Code/Cursor).

## ✅ Soluciones (en orden de preferencia)

### Solución 1: Reiniciar el IDE (Más Simple)

1. **Cierra completamente el IDE** (no solo la ventana, cierra todas las instancias)
2. **Abre el IDE nuevamente**
3. **Abre una nueva terminal** en el IDE
4. Prueba:
   ```powershell
   node --version
   npm --version
   ```

**¿Por qué funciona?** El IDE carga el PATH del sistema al iniciar. Si instalaste Node.js después de abrir el IDE, necesita reiniciarse para detectar los cambios.

---

### Solución 2: Recargar la Terminal del IDE

Si no quieres cerrar el IDE:

1. **Cierra todas las terminales** abiertas en el IDE
2. **Abre una nueva terminal** (Ctrl + Shift + ` o Terminal → Nueva Terminal)
3. Prueba:
   ```powershell
   node --version
   npm --version
   ```

---

### Solución 3: Recargar el PATH en la Terminal Actual

En la terminal del IDE, ejecuta:

```powershell
# Recargar el PATH desde el registro
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Verificar
node --version
npm --version
```

---

### Solución 4: Verificar y Agregar PATH Manualmente

1. **En la terminal del IDE, verifica el PATH:**
   ```powershell
   $env:PATH -split ';' | Select-String "node"
   ```

2. **Si no aparece, agrega temporalmente:**
   ```powershell
   # Encontrar la ruta de Node.js (ejecuta en PowerShell normal primero)
   where.exe node
   
   # Agregar al PATH de esta sesión (reemplaza con la ruta real)
   $env:Path += ";C:\Users\TU_USUARIO\AppData\Roaming\nvm\v22.20.0"
   ```

3. **Verificar:**
   ```powershell
   node --version
   ```

**Nota**: Esto solo funciona para la sesión actual. Para hacerlo permanente, usa la Solución 5.

---

### Solución 5: Configurar PATH Permanente en Windows

1. **Abrir Variables de Entorno:**
   - Presiona `Win + R`
   - Escribe: `sysdm.cpl`
   - Ve a "Opciones avanzadas" → "Variables de entorno"

2. **En "Variables del usuario", edita `Path`:**
   - Haz clic en "Editar"
   - Haz clic en "Nuevo"
   - Agrega la ruta donde nvm instaló Node.js:
     ```
     C:\Users\TU_USUARIO\AppData\Roaming\nvm\v22.20.0
     ```
   - (Reemplaza `TU_USUARIO` con tu nombre de usuario)

3. **También agrega la ruta de nvm:**
   ```
   C:\Users\TU_USUARIO\AppData\Roaming\nvm
   ```

4. **Haz clic en "Aceptar" en todas las ventanas**

5. **Reinicia el IDE completamente**

---

### Solución 6: Configurar Terminal del IDE para Usar PowerShell Correcto

Si usas **VS Code** o **Cursor**:

1. **Abre Configuración:**
   - Presiona `Ctrl + ,` (o File → Preferences → Settings)

2. **Busca:** `terminal.integrated.shell.windows`

3. **Configura el shell por defecto:**
   ```json
   {
     "terminal.integrated.defaultProfile.windows": "PowerShell",
     "terminal.integrated.profiles.windows": {
       "PowerShell": {
         "source": "PowerShell",
         "path": "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
       }
     }
   }
   ```

4. **Reinicia el IDE**

---

### Solución 7: Usar CMD en lugar de PowerShell

Si PowerShell sigue dando problemas:

1. **En el IDE, abre una terminal nueva**
2. **Cambia el shell a CMD:**
   - Haz clic en el dropdown junto al botón "+" en la terminal
   - Selecciona "Command Prompt" o "CMD"

3. **Prueba:**
   ```cmd
   node --version
   npm --version
   ```

---

## 🔍 Diagnóstico

Para entender mejor el problema, ejecuta estos comandos en **ambas terminales** (PowerShell normal y terminal del IDE):

### En PowerShell Normal (que funciona):
```powershell
# Ver PATH
$env:PATH -split ';' | Select-String "node"

# Ver ubicación de Node.js
where.exe node

# Ver versión
node --version
```

### En Terminal del IDE (que no funciona):
```powershell
# Ver PATH
$env:PATH -split ';' | Select-String "node"

# Ver ubicación de Node.js
where.exe node

# Ver versión (debería fallar)
node --version
```

**Compara los resultados** - la diferencia te dirá qué está faltando.

---

## ✅ Verificación Final

Después de aplicar cualquier solución:

1. **Cierra todas las terminales del IDE**
2. **Abre una nueva terminal**
3. **Verifica:**
   ```powershell
   node --version  # Debe mostrar: v22.20.0
   npm --version   # Debe mostrar: 11.6.4
   ```

---

## 🎯 Solución Rápida Recomendada

**La más rápida y efectiva:**

1. **Cierra completamente el IDE** (todas las ventanas)
2. **Abre el IDE nuevamente**
3. **Abre una nueva terminal**
4. **Prueba los comandos**

Esto resuelve el problema en el 90% de los casos.

---

## 📝 Nota sobre nvm-windows

Si usas **nvm-windows**, asegúrate de que:

1. **nvm esté en el PATH del usuario:**
   ```
   C:\Users\TU_USUARIO\AppData\Roaming\nvm
   ```

2. **La versión de Node.js esté activa:**
   ```powershell
   nvm use 22.20.0
   ```

3. **nvm agrega automáticamente Node.js al PATH**, pero el IDE necesita reiniciarse para detectarlo.

---

**¡Espero que esto resuelva tu problema!** 🎉

