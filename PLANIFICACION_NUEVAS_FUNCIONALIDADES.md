# 📋 Planificación de Nuevas Funcionalidades

## 🎯 Objetivo

Extender la aplicación básica con funcionalidades avanzadas para un cliente con necesidades complejas (incluyendo fábrica propia).

---

## 📦 Estado Actual - Versión Básica

**Tag Git:** `v1.0.0-basica`  
**Rama:** `main`  
**Estado:** ✅ Completada y funcional

### Funcionalidades Incluidas:
- ✅ Sistema de gestión de stock y ventas
- ✅ Punto de Venta (POS)
- ✅ Gestión de inventario, clientes, proveedores
- ✅ Reportes y análisis
- ✅ Alertas de stock
- ✅ Generación de PDFs
- ✅ Backup y restauración
- ✅ Gestión de usuarios con roles
- ✅ Arquitectura offline-first
- ✅ PWA instalable

**Esta versión es reutilizable para otros negocios sin necesidades complejas.**

---

## 🚀 Nueva Rama de Desarrollo

**Rama:** `feature/arca-integration`  
**Base:** `main` (v1.0.0-basica)

---

## 📝 Funcionalidades a Implementar

### 1. 🔴 Integración con ARCA (Alta Prioridad)

**Descripción:**  
ARCA (Agente de Retención y Percepción) es un sistema de facturación electrónica en Argentina que permite emitir facturas A, B, C y tickets con autorización automática.

**Requisitos Técnicos:**
- Certificado digital ARCA
- Credenciales de acceso (usuario, contraseña)
- Configuración de punto de venta
- CUIT del emisor
- Configuración de alícuotas de IVA

**Tareas:**
- [ ] Investigar API de ARCA (documentación oficial)
- [ ] Crear servicio `ARCAService` en `src/infrastructure/integrations/arca/`
- [ ] Implementar autenticación con ARCA
- [ ] Implementar emisión de facturas A, B, C
- [ ] Implementar emisión de tickets
- [ ] Manejo de errores y reintentos
- [ ] Almacenamiento de CAE y datos de autorización
- [ ] Sincronización de comprobantes con ARCA
- [ ] UI para configuración de ARCA en Settings
- [ ] UI para selección de tipo de comprobante en POS
- [ ] Generación de PDF con datos de ARCA
- [ ] Código QR con datos de ARCA
- [ ] Historial de comprobantes emitidos
- [ ] Reimpresión de comprobantes

**Archivos a Crear/Modificar:**
```
src/infrastructure/integrations/arca/
  ├── ARCAService.ts
  ├── types.ts
  ├── config.ts
  └── index.ts

backend/src/routes/arca.ts
backend/src/services/ARCAIntegrationService.ts

src/presentation/pages/Settings.tsx (agregar sección ARCA)
src/presentation/pages/POS.tsx (agregar selector de comprobante)
```

**Dependencias Nuevas:**
- SDK de ARCA (si existe) o implementación manual de API REST
- Librería para manejo de certificados digitales

**Estimación:** 2-3 semanas

---

### 2. 🏭 Gestión de Fábrica/Producción

**Descripción:**  
Sistema para gestionar la producción propia del cliente (fábrica).

**Funcionalidades:**
- [ ] Gestión de recetas/formulas de productos
- [ ] Control de materias primas e insumos
- [ ] Órdenes de producción
- [ ] Control de stock de producción
- [ ] Costeo de productos fabricados
- [ ] Trazabilidad de lotes
- [ ] Reportes de producción
- [ ] Integración con inventario (productos fabricados → stock)

**Tareas:**
- [ ] Diseñar esquema de base de datos (Prisma)
- [ ] Crear entidades de dominio (Recipe, ProductionOrder, RawMaterial, etc.)
- [ ] Implementar repositorios
- [ ] Crear servicios de negocio
- [ ] UI para gestión de recetas
- [ ] UI para órdenes de producción
- [ ] UI para control de materias primas
- [ ] Reportes de producción

**Archivos a Crear:**
```
src/domain/entities/
  ├── Recipe.ts
  ├── ProductionOrder.ts
  ├── RawMaterial.ts
  └── ProductionBatch.ts

src/domain/services/
  └── ProductionService.ts

src/presentation/pages/
  ├── Production.tsx
  ├── Recipes.tsx
  └── RawMaterials.tsx

backend/src/routes/
  ├── production.ts
  ├── recipes.ts
  └── raw-materials.ts
```

**Estimación:** 3-4 semanas

---

### 3. 📊 Reportes Avanzados

**Descripción:**  
Reportes más detallados y personalizables para análisis de negocio.

**Funcionalidades:**
- [ ] Reportes por período personalizado
- [ ] Análisis de rentabilidad por producto
- [ ] Análisis de rotación de stock
- [ ] Reportes de producción
- [ ] Exportación a Excel/CSV
- [ ] Gráficos interactivos
- [ ] Dashboard ejecutivo
- [ ] Reportes programados (email)

**Tareas:**
- [ ] Mejorar sistema de reportes existente
- [ ] Agregar librería de gráficos (Chart.js, Recharts, etc.)
- [ ] Implementar exportación a Excel
- [ ] Crear dashboard ejecutivo
- [ ] Sistema de reportes programados

**Estimación:** 2 semanas

---

### 4. 🚚 Gestión de Logística y Envíos

**Descripción:**  
Sistema para gestionar envíos y entregas.

**Funcionalidades:**
- [ ] Gestión de transportistas
- [ ] Órdenes de envío
- [ ] Seguimiento de envíos
- [ ] Etiquetas de envío
- [ ] Integración con OCA/Correo Argentino (si aplica)

**Estimación:** 2 semanas

---

### 5. 💰 Gestión Financiera Avanzada

**Descripción:**  
Sistema de contabilidad y finanzas más completo.

**Funcionalidades:**
- [ ] Cuentas corrientes de clientes
- [ ] Cuentas corrientes de proveedores
- [ ] Conciliación bancaria
- [ ] Presupuestos
- [ ] Control de pagos y cobranzas
- [ ] Reportes financieros

**Estimación:** 3 semanas

---

### 6. 📱 App Móvil (Opcional)

**Descripción:**  
Aplicación móvil para vendedores/operarios.

**Funcionalidades:**
- [ ] Consulta de stock
- [ ] Registro de ventas
- [ ] Escaneo de códigos de barras
- [ ] Sincronización offline

**Tecnología:** React Native o PWA mejorada

**Estimación:** 4-5 semanas

---

## 🗂️ Estructura de Desarrollo

### Fases de Implementación

**Fase 1: ARCA (Crítico)**
- Semana 1-2: Investigación y diseño
- Semana 2-3: Implementación backend
- Semana 3-4: Implementación frontend
- Semana 4: Testing e integración

**Fase 2: Producción**
- Semana 5-8: Desarrollo completo del módulo de producción

**Fase 3: Mejoras y Reportes**
- Semana 9-10: Reportes avanzados
- Semana 11-12: Gestión financiera

**Fase 4: Extras**
- Semana 13+: Logística, app móvil, etc.

---

## 🔧 Consideraciones Técnicas

### Base de Datos
- Evaluar si se necesitan nuevas tablas en Prisma
- Migraciones para nuevas funcionalidades
- Backup y migración de datos existentes

### Arquitectura
- Mantener separación de capas (Domain, Infrastructure, Presentation)
- Nuevos servicios en `src/infrastructure/integrations/`
- Mantener compatibilidad con versión básica

### Testing
- Tests unitarios para nuevos servicios
- Tests de integración para ARCA
- Tests E2E para flujos críticos

### Documentación
- Actualizar documentación técnica
- Guías de usuario para nuevas funcionalidades
- Documentación de API de ARCA

---

## 📋 Checklist Pre-Desarrollo

- [x] Separar versión básica con Git (tag v1.0.0-basica)
- [x] Crear rama feature/arca-integration
- [ ] Obtener credenciales de ARCA del cliente
- [ ] Obtener certificado digital ARCA
- [ ] Revisar documentación oficial de ARCA
- [ ] Definir esquema de base de datos para nuevas funcionalidades
- [ ] Estimar tiempos con el cliente
- [ ] Definir prioridades con el cliente

---

## 🎯 Próximos Pasos Inmediatos

1. **Reunión con Cliente:**
   - Confirmar funcionalidades prioritarias
   - Obtener credenciales ARCA
   - Definir alcance exacto

2. **Investigación ARCA:**
   - Buscar documentación oficial
   - Identificar endpoints de API
   - Probar autenticación en ambiente de prueba

3. **Diseño Técnico:**
   - Diseñar arquitectura de integración ARCA
   - Definir esquema de base de datos
   - Crear mockups de UI

4. **Inicio de Desarrollo:**
   - Cambiar a rama `feature/arca-integration`
   - Crear estructura de archivos
   - Implementar servicio base de ARCA

---

## 📞 Contactos y Recursos

### ARCA
- Sitio web: [Verificar URL oficial]
- Documentación API: [Por obtener]
- Soporte técnico: [Por obtener]

### Cliente
- Contacto técnico: [Por definir]
- Credenciales: [Por obtener]

---

## 📝 Notas

- Mantener la versión básica siempre funcional en `main`
- Las nuevas funcionalidades se desarrollan en ramas separadas
- Antes de mergear a `main`, crear tag de versión (v1.1.0, v1.2.0, etc.)
- Documentar cambios breaking en CHANGELOG.md

---

**Última actualización:** Diciembre 2024  
**Versión del plan:** 1.0

