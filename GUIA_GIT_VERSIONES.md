# 🔀 Guía Rápida - Gestión de Versiones con Git

## 📦 Estructura Actual

```
main (v1.0.0-basica) ← Versión básica reutilizable
  └── feature/arca-integration ← Nuevas funcionalidades
```

---

## 🎯 Comandos Esenciales

### Ver Versión Básica (Estado Actual)

```bash
# Estás en main, versión básica
git checkout main
git status
```

### Ver Tag de Versión Básica

```bash
# Ver todos los tags
git tag -l

# Ver detalles del tag
git show v1.0.0-basica

# Volver al estado exacto de la versión básica
git checkout v1.0.0-basica
```

### Trabajar en Nuevas Funcionalidades

```bash
# Cambiar a la rama de desarrollo
git checkout feature/arca-integration

# O crear y cambiar en un solo paso (si no existe)
git checkout -b feature/arca-integration
```

### Crear Nueva Versión Básica para Otro Cliente

```bash
# 1. Asegurarte de estar en main
git checkout main

# 2. Crear una copia de la versión básica
git checkout -b cliente-simple-1

# 3. Hacer cambios específicos para ese cliente
# ... hacer cambios ...

# 4. Crear tag para esa versión
git tag -a v1.0.0-cliente-simple-1 -m "Versión para cliente simple 1"

# 5. Volver a main
git checkout main
```

### Volver a la Versión Básica Limpia

Si quieres descartar todos los cambios y volver al estado básico:

```bash
# CUIDADO: Esto descarta cambios no guardados
git checkout main
git reset --hard v1.0.0-basica
```

### Guardar Cambios Actuales

```bash
# Ver qué archivos cambiaron
git status

# Agregar todos los cambios
git add .

# O agregar archivos específicos
git add src/infrastructure/integrations/arca/

# Hacer commit
git commit -m "feat: Integración con ARCA - emisión de facturas"

# Si estás en feature/arca-integration y quieres actualizar main
git checkout main
git merge feature/arca-integration
```

---

## 🔄 Flujo de Trabajo Recomendado

### Para Desarrollo de Nuevas Funcionalidades

```bash
# 1. Asegurarte de estar en la rama correcta
git checkout feature/arca-integration

# 2. Trabajar en tus cambios
# ... editar archivos ...

# 3. Ver qué cambió
git status
git diff

# 4. Guardar cambios
git add .
git commit -m "feat: Descripción del cambio"

# 5. Continuar trabajando...
```

### Para Crear Versión para Otro Cliente

```bash
# 1. Partir de la versión básica
git checkout v1.0.0-basica

# 2. Crear nueva rama para ese cliente
git checkout -b cliente-nombre

# 3. Hacer cambios personalizados
# ... editar archivos ...

# 4. Guardar y crear tag
git add .
git commit -m "feat: Personalización para cliente X"
git tag -a v1.0.0-cliente-x -m "Versión personalizada para cliente X"

# 5. Volver a main
git checkout main
```

---

## 📋 Ver Historial

```bash
# Ver commits recientes
git log --oneline -10

# Ver commits de una rama específica
git log feature/arca-integration --oneline

# Ver diferencias entre ramas
git diff main..feature/arca-integration

# Ver qué archivos cambiaron entre versiones
git diff v1.0.0-basica..HEAD --name-only
```

---

## 🚨 Situaciones Comunes

### "Quiero volver a como estaba antes"

```bash
# Ver últimos commits
git log --oneline -5

# Volver a un commit específico (sin perder cambios)
git checkout <hash-del-commit>

# O descartar cambios y volver completamente
git reset --hard <hash-del-commit>
```

### "Hice cambios en la rama equivocada"

```bash
# Guardar cambios temporalmente
git stash

# Cambiar de rama
git checkout feature/arca-integration

# Recuperar cambios
git stash pop
```

### "Quiero copiar un archivo de otra rama"

```bash
# Copiar archivo de main a la rama actual
git checkout main -- ruta/al/archivo.ts

# Luego hacer commit
git add ruta/al/archivo.ts
git commit -m "feat: Copiar archivo de main"
```

---

## 📦 Crear Backup de Versión Básica

```bash
# Crear un archivo ZIP con la versión básica
git archive -o version-basica-v1.0.0.zip v1.0.0-basica

# O crear un clon en otra carpeta
cd ..
git clone proyecto-inventario-global proyecto-inventario-global-basico
cd proyecto-inventario-global-basico
git checkout v1.0.0-basica
```

---

## 🔐 Subir a Repositorio Remoto (GitHub/GitLab)

Si tienes un repositorio remoto:

```bash
# Agregar remoto (solo la primera vez)
git remote add origin <url-del-repositorio>

# Subir versión básica
git push origin main
git push origin v1.0.0-basica

# Subir rama de desarrollo
git push origin feature/arca-integration

# Subir todos los tags
git push origin --tags
```

---

## ✅ Checklist Antes de Empezar Nuevo Desarrollo

- [ ] Estoy en la rama correcta (`feature/arca-integration`)
- [ ] Tengo la última versión de `main` integrada
- [ ] He guardado todos los cambios anteriores
- [ ] Sé qué funcionalidad voy a implementar
- [ ] Tengo acceso a documentación/credenciales necesarias

---

**💡 Tip:** Siempre trabaja en ramas separadas para nuevas funcionalidades. Nunca modifiques directamente `main` si vas a agregar funcionalidades complejas.

