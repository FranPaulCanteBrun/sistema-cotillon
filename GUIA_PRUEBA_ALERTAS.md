# 🔔 Guía para Probar el Sistema de Alertas de Stock

## ¿Cómo funciona el sistema?

El sistema de alertas detecta automáticamente cuando el stock de un producto baja del **stock mínimo** configurado. Funciona así:

1. **Detección automática**: Cada 30 segundos, el sistema revisa todos los productos y sus variantes
2. **Cálculo de severidad**:
   - **Crítico** (rojo): Stock = 0 o < 25% del mínimo
   - **Advertencia** (amarillo): Stock entre 25% y 50% del mínimo
   - **Info** (azul): Stock entre 50% y 100% del mínimo
3. **Notificación visual**: Aparece un badge con campana 🔔 en el Header cuando hay alertas
4. **Gestión**: Puedes ver, reconocer o eliminar alertas desde el modal

## 📋 Pasos para Probar

### Opción 1: Usar productos existentes

1. **Ve a "Inventario"** en la aplicación
2. **Busca un producto** que tenga stock bajo o cero
3. **Verifica el stock mínimo** del producto (debe estar configurado)
4. **Si el stock actual es menor o igual al mínimo**, debería aparecer una alerta automáticamente en el Header (icono de campana 🔔)

### Opción 2: Crear una alerta manualmente

1. **Ve a "Inventario"**
2. **Edita un producto** y configura un **stock mínimo** (ej: 10 unidades)
3. **Edita una variante** de ese producto y ponle un **stock actual menor** al mínimo (ej: 5 unidades)
4. **Guarda los cambios**
5. **Espera máximo 30 segundos** o recarga la página
6. **Deberías ver el badge de alertas** en el Header (arriba a la derecha, junto al botón de sincronización)

### Opción 3: Simular una venta para bajar el stock

1. **Ve a "Punto de Venta"**
2. **Realiza una venta** de un producto que tenga stock
3. **Vende suficiente cantidad** para que el stock baje del mínimo
4. **Espera 30 segundos** o recarga la página
5. **Deberías ver la alerta** en el Header

## 🎯 Qué deberías ver

### En el Header:
- Un **icono de campana 🔔** con un **badge rojo o amarillo** mostrando el número de alertas
- El color depende de si hay alertas críticas (rojo) o solo advertencias (amarillo)

### Al hacer clic en el badge:
- Se abre un **modal** con todas las alertas activas
- Cada alerta muestra:
  - Nombre del producto y variante
  - Stock actual vs stock mínimo
  - Porcentaje del mínimo
  - Severidad (Crítico, Advertencia, Info)
  - Fecha de detección
- Botones para:
  - **Reconocer** una alerta individual (✓)
  - **Eliminar** una alerta (✗)
  - **Reconocer todas** las alertas

## 🔍 Verificar que funciona

1. **Abre la consola del navegador** (F12)
2. **Busca mensajes** relacionados con "alertas" o "stock"
3. **Revisa la base de datos IndexedDB**:
   - Abre DevTools → Application → IndexedDB → CotillonDB → stockAlerts
   - Deberías ver registros de alertas si hay productos con stock bajo

## ⚠️ Si no ves alertas

1. **Verifica que los productos tengan stock mínimo configurado**
2. **Verifica que el stock actual sea menor o igual al mínimo**
3. **Espera 30 segundos** (el sistema revisa periódicamente)
4. **Recarga la página** para forzar la detección
5. **Revisa la consola** por errores

## 💡 Tips

- Las alertas se actualizan automáticamente cuando cambia el stock
- Si el stock vuelve a estar por encima del mínimo, la alerta se elimina automáticamente
- Las alertas reconocidas se mantienen por 7 días y luego se eliminan automáticamente
- Puedes reconocer alertas para marcarlas como "vistas" sin eliminarlas

