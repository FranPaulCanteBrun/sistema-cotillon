# 📖 Guía de Usuario - Cotillón Manager

Guía completa para usar el sistema de gestión de stock y ventas.

## 📋 Tabla de Contenidos

1. [Primeros Pasos](#primeros-pasos)
2. [Punto de Venta (POS)](#punto-de-venta-pos)
3. [Gestión de Inventario](#gestión-de-inventario)
4. [Historial de Ventas](#historial-de-ventas)
5. [Reportes](#reportes)
6. [Configuración](#configuración)
7. [Alertas de Stock](#alertas-de-stock)
8. [Backup y Restauración](#backup-y-restauración)

## 🚀 Primeros Pasos

### Iniciar Sesión

1. Abre la aplicación en tu navegador
2. Si es la primera vez, serás redirigido a la página de login
3. Usa las credenciales proporcionadas por el administrador
4. Si no tienes credenciales, contacta al administrador

### Navegación

La aplicación tiene un menú lateral (sidebar) con las siguientes secciones:

- 🏠 **Dashboard**: Resumen general
- 🛒 **Punto de Venta**: Realizar ventas
- 📦 **Inventario**: Gestionar productos
- 📥 **Carga de Mercadería**: Ingresar stock
- 📊 **Historial de Ventas**: Ver ventas realizadas
- 📈 **Reportes**: Análisis y estadísticas
- ⚙️ **Configuración**: Ajustes del sistema

## 🛒 Punto de Venta (POS)

### Realizar una Venta

1. **Seleccionar Productos**:
   - Busca productos por nombre o código
   - Haz clic en un producto para agregarlo al carrito
   - Ajusta la cantidad si es necesario

2. **Agregar al Carrito**:
   - Los productos aparecen en el panel derecho
   - Puedes modificar la cantidad o eliminar items
   - El total se calcula automáticamente

3. **Aplicar Descuentos** (opcional):
   - Haz clic en el item del carrito
   - Ingresa el porcentaje de descuento
   - El precio se actualiza automáticamente

4. **Seleccionar Método de Pago**:
   - Efectivo
   - Tarjeta de crédito
   - Tarjeta de débito
   - Transferencia bancaria
   - Mercado Pago

5. **Completar la Venta**:
   - Haz clic en **"Finalizar Venta"**
   - Se genera el recibo automáticamente
   - Puedes imprimirlo o descargarlo como PDF

### Funciones Adicionales

- **Buscar Cliente**: Asocia la venta a un cliente específico
- **Imprimir Recibo**: Imprime directamente en impresora térmica
- **Descargar PDF**: Descarga el recibo como PDF

## 📦 Gestión de Inventario

### Ver Productos

1. Ve a **Inventario**
2. Verás una lista de todos los productos
3. Puedes filtrar por categoría o buscar por nombre/código

### Crear un Producto

1. Haz clic en **"Nuevo Producto"**
2. Completa el formulario:
   - **Código**: Código único del producto
   - **Nombre**: Nombre del producto
   - **Categoría**: Selecciona una categoría
   - **Precio Base**: Precio de venta
   - **Stock Mínimo**: Cantidad mínima para alertas
   - **Imagen**: Opcional, sube una imagen del producto
3. Haz clic en **"Guardar"**

### Editar un Producto

1. Haz clic en el producto que deseas editar
2. Modifica los campos necesarios
3. Haz clic en **"Guardar"**

### Agregar Variantes

1. Abre el producto
2. En la sección **"Variantes"**, haz clic en **"Agregar Variante"**
3. Completa:
   - **SKU**: Código único de la variante
   - **Atributos**: Color, tamaño, etc.
   - **Stock Actual**: Cantidad disponible
   - **Precio**: Precio específico (opcional, usa el precio base si no se especifica)
4. Guarda la variante

### Desactivar un Producto

1. Abre el producto
2. Haz clic en **"Desactivar"**
3. El producto ya no aparecerá en el POS, pero se mantiene en el historial

## 📥 Carga de Mercadería

### Ingresar Stock

1. Ve a **Carga de Mercadería**
2. Selecciona el **Tipo de Movimiento**:
   - **Compra**: Ingreso de mercadería comprada
   - **Ajuste**: Corrección de inventario
   - **Devolución**: Productos devueltos
3. Selecciona el **Producto** y la **Variante**
4. Ingresa la **Cantidad**
5. (Opcional) Agrega una **Nota** o **Razón**
6. Haz clic en **"Registrar Movimiento"**

## 📊 Historial de Ventas

### Ver Ventas

1. Ve a **Historial de Ventas**
2. Verás todas las ventas realizadas
3. Puedes filtrar por:
   - **Hoy**: Ventas del día actual
   - **Esta Semana**: Ventas de los últimos 7 días
   - **Este Mes**: Ventas del mes actual
   - **Personalizado**: Selecciona un rango de fechas (máximo 1 año atrás)

### Ver Detalles de una Venta

1. Haz clic en una venta de la lista
2. Verás:
   - Productos vendidos
   - Método de pago
   - Descuentos aplicados
   - Total de la venta
   - Fecha y hora
3. Opciones disponibles:
   - **Imprimir Recibo**: Imprime el recibo térmico
   - **Descargar PDF**: Descarga el recibo como PDF
   - **Descargar Factura (A4)**: Descarga la factura en formato A4

## 📈 Reportes

### Acceder a Reportes

1. Ve a **Reportes**
2. Selecciona el período:
   - **Hoy**, **Esta Semana**, **Este Mes**, o **Personalizado**

### Tipos de Reportes

#### Resumen General
- Total de ventas
- Cantidad de transacciones
- Ticket promedio
- Comparación con períodos anteriores

#### Productos Más Vendidos
- Lista de productos ordenados por cantidad vendida
- Total de unidades vendidas
- Ingresos por producto

#### Ventas por Categoría
- Desglose de ventas por categoría de producto
- Porcentaje del total
- Gráfico visual

#### Ventas por Método de Pago
- Distribución de pagos por método
- Total por método
- Porcentajes

## ⚙️ Configuración

### Categorías

1. Ve a **Configuración** → **Categorías**
2. **Agregar Categoría**: Haz clic en **"Nueva Categoría"**
3. **Editar**: Haz clic en el lápiz junto a la categoría
4. **Eliminar**: Haz clic en la X (solo si no tiene productos asociados)

### Métodos de Pago

1. Ve a **Configuración** → **Métodos de Pago**
2. Los métodos por defecto son:
   - Efectivo
   - Tarjeta de Crédito
   - Tarjeta de Débito
   - Transferencia Bancaria
   - Mercado Pago
3. Puedes activar/desactivar métodos según necesites

### Usuarios

1. Ve a **Configuración** → **Usuarios**
2. **Agregar Usuario**:
   - Haz clic en **"Nuevo Usuario"**
   - Completa: Nombre, Email, Contraseña, Rol
   - Roles disponibles: `admin`, `seller`
3. **Editar Usuario**: Haz clic en el lápiz
4. **Desactivar Usuario**: Haz clic en el botón de desactivar

### Clientes

1. Ve a **Configuración** → **Clientes**
2. **Agregar Cliente**:
   - Haz clic en **"Nuevo Cliente"**
   - Completa: Nombre, DNI, Teléfono, Email, Dirección
   - Marca **"Cliente activo"** si está activo
3. **Editar/Desactivar**: Similar a usuarios

### Proveedores

1. Ve a **Configuración** → **Proveedores**
2. **Agregar Proveedor**:
   - Haz clic en **"Nuevo Proveedor"**
   - Completa: Nombre, Contacto, Teléfono, Email, Dirección, Notas
3. **Editar/Desactivar**: Similar a clientes

### Sincronización

1. Ve a **Configuración** → **Sincronización**
2. **Estado**: Muestra si hay conexión y el estado de sincronización
3. **Sincronizar Ahora**: Fuerza una sincronización manual
4. **Reintentar Operaciones Fallidas**: Reintenta operaciones que fallaron

### Conflictos

Si hay conflictos de sincronización:

1. Ve a **Configuración** → **Conflictos**
2. Verás una lista de conflictos pendientes
3. Para cada conflicro:
   - **Ver Detalles**: Compara la versión local vs. servidor
   - **Usar Local**: Mantiene tu versión
   - **Usar Servidor**: Usa la versión del servidor
   - **Fusionar Manualmente**: Edita manualmente y guarda

## 🔔 Alertas de Stock

### ¿Qué son las Alertas?

El sistema detecta automáticamente cuando el stock de un producto está por debajo del mínimo configurado.

### Ver Alertas

1. Mira el icono de **campana** 🔔 en el header (arriba a la derecha)
2. El número rojo indica cuántas alertas hay
3. Haz clic en la campana para ver las alertas

### Tipos de Alertas

- **🔴 Crítico**: Stock = 0 o < 25% del mínimo
- **🟡 Advertencia**: Stock entre 25% y 50% del mínimo
- **🔵 Info**: Stock entre 50% y 100% del mínimo

### Gestionar Alertas

1. Abre el modal de alertas
2. Para cada alerta puedes:
   - **Reconocer**: Marca como vista (se oculta pero no se elimina)
   - **Eliminar**: Elimina la alerta permanentemente
3. **Reconocer Todas**: Marca todas como vistas
4. **Actualizar**: Fuerza una nueva detección de alertas

## 💾 Backup y Restauración

### Exportar Datos (Backup)

1. Ve a **Configuración** → **Backup y Restauración**
2. Haz clic en **"Exportar"**
3. Se descargará un archivo JSON con todos los datos
4. **Guarda este archivo en un lugar seguro**

### Importar Datos (Restaurar)

1. Ve a **Configuración** → **Backup y Restauración**
2. Haz clic en **"Importar"**
3. Selecciona el archivo JSON de backup
4. **Opción**: Marca **"Limpiar datos existentes"** si quieres reemplazar todo
5. Haz clic en **"Restaurar"**
6. ⚠️ **Advertencia**: Esto puede sobrescribir datos existentes

## 💡 Consejos y Mejores Prácticas

### Organización

- **Usa códigos consistentes**: Establece un formato para los códigos de producto
- **Categoriza bien**: Organiza productos en categorías lógicas
- **Mantén stock mínimo actualizado**: Configura valores realistas para recibir alertas útiles

### Ventas

- **Asocia clientes**: Asocia ventas a clientes para mejor seguimiento
- **Revisa el historial**: Revisa regularmente el historial para detectar patrones
- **Usa reportes**: Los reportes ayudan a tomar decisiones informadas

### Mantenimiento

- **Haz backups regularmente**: Exporta datos al menos una vez por semana
- **Revisa conflictos**: Revisa y resuelve conflictos de sincronización
- **Mantén usuarios actualizados**: Desactiva usuarios que ya no trabajan

## ❓ Preguntas Frecuentes

### ¿Puedo usar la app sin internet?

Sí, la aplicación funciona completamente offline. Los datos se guardan localmente y se sincronizan cuando hay conexión.

### ¿Qué pasa si hay un conflicto?

Los conflictos aparecen en **Configuración** → **Conflictos**. Puedes elegir usar tu versión local, la del servidor, o fusionar manualmente.

### ¿Cómo cambio mi contraseña?

Contacta al administrador para cambiar tu contraseña.

### ¿Puedo imprimir recibos sin impresora térmica?

Sí, puedes descargar el PDF del recibo e imprimirlo en cualquier impresora.

### ¿Los datos se pierden si cierro el navegador?

No, todos los datos se guardan localmente en tu navegador. Solo se perderían si limpias los datos del navegador.

---

**¿Necesitas ayuda?** Contacta al administrador del sistema.

