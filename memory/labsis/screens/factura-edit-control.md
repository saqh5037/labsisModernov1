# Pantalla: Factura Detalle / Control de Cobro (FacturaEditControl)

**Status:** researched
**Ultima actualizacion:** 2026-03-03
**Video frames:** 83-92

---

## 1. Informacion General

| Campo | Valor |
|-------|-------|
| URL | `/FacturaEditControl.seam` |
| Breadcrumb | `Facturas : Detalle` |
| XHTML | `FacturaEditControl.xhtml` (869 lineas) |
| Page XML | `FacturaEditControl.page.xml` (90 lineas) |
| CSS | `stylesheet/facturas.css` |
| Template | `layout/template.xhtml` |
| Titulo JS | `actualizarTitulo('Facturas : Detalle')` |

### Parametros URL (page.xml)
| Parametro | Bean/Propiedad |
|-----------|---------------|
| `facturaId` | `facturaHome.facturaId` |
| `clienteId` | `clienteHome.clienteId` |
| `statusFacturaId` | `statusFacturaHome.statusFacturaId` |
| `procedenciaId` | `procedenciaHome.procedenciaId` |
| `muestraPanelPago` | `facturaPagoHome.mostrarPanelCreaPagoFactura` |
| `descuentoCategoriaId` | `descuentoCategoriaHome.descuentoCategoriaId` |
| `obligaPagoEfectivo` | `facturaPagoHome.obligadoPagoEfectivo` |
| `facturaFrom` | (parametro de navegacion) |
| `origenEspecial` | (parametro de navegacion) |
| `clienteFrom` | (parametro de navegacion) |
| `statusFacturaFrom` | (parametro de navegacion) |

### Actions al cargar (page.xml)
1. `facturaHome.wire()`
2. `facturaPagoHome.wire()`
3. `facturaPagoHome.setSugerenciaPago(facturaHome.instance)`

---

## 2. Roles de Acceso

```
ADM | REC | AUXADM | COMM | SUP-COM | EST-EXT | FIN | SALES | ADMSALE
```
- `login-required="true"`
- `no-conversation-view-id="/FacturaList.xhtml"` (redirige si no hay conversacion)

---

## 3. Java Beans Involucrados

### FacturaHome.java
| Campo | Valor |
|-------|-------|
| Ruta | `/git/labsis-ejb/ejbModule/com/dynamtek/labsis/session/FacturaHome.java` |
| Lineas | 18,323 |
| Clase | `public class FacturaHome extends EntityHome<Factura>` |

**Metodos clave usados en esta pantalla:**

| Metodo | Linea | Proposito |
|--------|-------|-----------|
| `updateFacturaControlEdit()` | 15743 | Guardar cambios (solo imprime baseImponible) |
| `enviarFacturaProfit()` | 10233 | Guardar y enviar a sistema contable Profit |
| `cancelarFacturaV2()` | 17016 | Cancelar factura sin abortar OT (redirige a PacienteList, luego crea nueva factura express) |
| `cancelarFactura()` | 17092 | Cancelar factura Y abortar OT (redirige a PacienteList) |
| `cancelarFacturaCita()` | 17163 | Cancelar factura asociada a Cita (redirige a CitaList) |
| `cancelarFacturaOrdenTrabajoQuest()` | 17209 | Cancelar factura+OT para Quest (redirige a PacienteList) |
| `cancelarFacturaOrdenTrabajoQuestAntesDeTimbrado()` | 17388 | Cancelar antes de timbrar (Quest/MX) |
| `cancelarFacturaQuest()` | 17272 | Cancelar factura Quest (antes de fiscalizar) |
| `persistCreaClienteFacturaEditControl()` | 16626 | Crear/agregar cliente desde modal |
| `persistFacturaUsoFacturaEditControl()` | 16711 | Confirmar Uso CFDi + Regimen Fiscal |
| `persistFacturaClienteGenericoFacturaEditControl()` | 16775 | Asignar cliente generico (NO fiscal) |
| `persistPacienteAClienteFacturaEditControl(Paciente)` | 16904 | Copiar datos del paciente como cliente |
| `initClienteHasOrdensList()` | 15747 | Cargar ordenes de trabajo asociadas |
| `imprimirReporteFacturaDetallePruebasPDF(int)` | 15785 | Generar PDF detallado de factura |

### FacturaPagoHome.java
| Campo | Valor |
|-------|-------|
| Ruta | `/git/labsis-ejb/ejbModule/com/dynamtek/labsis/session/FacturaPagoHome.java` |
| Lineas | 2,436 |
| Clase | `public class FacturaPagoHome extends EntityHome<FacturaPago>` |

**Metodos clave:**

| Metodo | Linea | Proposito |
|--------|-------|-----------|
| `guardarExpress()` | 372 | Guardar pago (sistema no-Profit). Valida factura no abortada, verifica monto, persiste pago, gestiona cambio efectivo, crea FacturaLog, limpia instancia. Redirige a `/FacturaEditAfter.seam` |
| `guardarExpressProfit()` | 543 | Guardar pago y enviar a Profit |
| `setSugerenciaPago(Factura)` | 1912 | Precargar monto sugerido al abrir |
| `agregarFactura(Factura)` | 1899 | Asociar factura al pago |

### FacturaCreacionBean.java
| Campo | Valor |
|-------|-------|
| Ruta | `/git/labsis-ejb/ejbModule/com/dynamtek/labsis/session/factura/FacturaCreacionBean.java` |
| Lineas | 2,069 |

---

## 4. Archivos XHTML Involucrados

| Archivo | Lineas | Incluido como |
|---------|--------|---------------|
| `FacturaEditControl.xhtml` | 869 | Pantalla principal |
| `FacturaEditControl.page.xml` | 90 | Configuracion Seam |
| `modalPanels/creaPagoFactura.xhtml` | 400 | Modal de ingreso de pago (`panelPago`) |
| `modalPanels/creaClienteFacturaEditControl.xhtml` | 271 | Modal de crear/editar cliente (`panelCreaCliente`) |
| `fragmentos/facturacion/monto_moneda_base_y_extranjera.xhtml` | - | Fragmento reutilizable para mostrar montos dual-moneda |
| `layout/template.xhtml` | - | Template base |
| `layout/edit.xhtml` | - | Decorador de campos editables |
| `layout/display.xhtml` | - | Decorador de campos solo lectura |
| `stylesheet/facturas.css` | - | Estilos especificos de facturacion |

---

## 5. Estructura de la Pantalla

### 5.1 Panel Superior: Datos para Facturar (fondo amarillo #F3EC77)
- **Rendered:** Solo si `not facturaHome.instance.preguntadoFiscalizar`
- **Flujo fiscal (MX):**
  1. Pregunta "Requiere Factura Fiscal?" [SI] [NO]
  2. Si SI: opciones "Usar datos del Paciente" o "Crear/Cambiar Cliente"
  3. Seleccion de Regimen Fiscal (dropdown)
  4. Seleccion de Uso CFDi (dropdown)
  5. Boton "Confirmar Cambios"
- **Si NO fiscal:** asigna cliente generico automaticamente

### 5.2 Mensaje verde (post-fiscalizacion)
- **Rendered:** `facturaHome.instance.preguntadoFiscalizar AND statusFactura.id != 3`
- **Texto:** "Datos para facturacion actualizados: por favor ingresar datos de cobro"
- **Fondo:** `#8bc34a` verde

### 5.3 Panel Factura (izquierda, 50% width)
Campos readonly (decorador `layout/edit.xhtml`):
- Cliente (nombre)
- ID Fiscal (ciRif)
- Calle y Numero
- Colonia
- Municipio
- Provincia
- Codigo Postal
- Telefono
- Fecha
- Numero Factura (o Numero Fiscal si impresora fiscal)
- **Control Factura** (INPUT editable, solo si no es impresora fiscal NI tipo MX/MXN/MEX)
- **Fecha Vencimiento** (calendar, solo si no es MX/MXN/MEX)
- **Observaciones** (textarea, solo si no es MX/MXN/MEX)

### 5.4 Panel Pagos (derecha, 49% width, fondo verde claro)
- **Badge de status:**
  - `PENDIENTE` (recuadro rojo, statusId=1)
  - Status naranja (statusId=2,4,5): Pago Parcial, Anulada, No Procesada
  - `PAGADA` (verde, statusId=3)
- Monto Pago Factura
- Pago Faltante Factura
- Redondeo (si aplica)
- **Seccion IGTF** (solo si `currentLaboratorio.aplicarIGTF`):
  - Monto IGTF /Divisa (USD)
  - Impuesto IGTF (X%) /Divisa (USD)
  - Impuesto IGTF (tasaCambio) /BsF. (moneda local)
  - Total con IGTF
- **Alerta Caja >1000 efectivo** (para Quest MX)

### 5.5 Tabla de Items
Columnas: Item | Descripcion | Cantidad | [Impuesto] | [Descuento] | Precio | [Descuento Precio] | Precio Total

**Footer de totales:**
- Subtotal
- Descuento Total (Olarte y Akle)
- Descuento % (no Quest, si > 0)
- Base Imponible
- I.V.A (X%)
- Impuestos por tipo (items genericos)
- Total factura (si tiene redondeo)
- Total a pagar (con redondeo si aplica)

### 5.6 Botones de Accion (`s:div id="botones"`)

| Boton | Clase | Accion | Condicion |
|-------|-------|--------|-----------|
| Guardar Cambios | `saveFacturaButton` | `facturaHome.updateFacturaControlEdit` | No MX/MXN, no Profit O ya enviada |
| Guardar y Enviar a Profit | `saveFacturaButton` | `facturaHome.enviarFacturaProfit` | Sistema Profit y no enviada |
| Imprimir (HTML) | button | `window.open(reportes/factura/...)` | Tipo factura termina en `.html` |
| Imprimir (Seam) | `s:button` | Vista reporte factura | Permiso `facturacion-show_boton_print` |
| Ingresar Pago | `insertPaymentButtonShowPopup` | Abre modal `panelPago` | Falta pago > 0, no Profit, fiscalizado |
| Ir a Lista | `s:button` | `action="end"` | Config `FACT-flujo-show_volver_a_lista` |
| Ir a OT | `s:button green` | Vista OrdenTrabajo.xhtml | Pagada, 1 OT, fiscalizado |
| Ir a Presupuesto | `s:button green` | Vista Presupuesto.xhtml | Pagada, entidad=PRESUPUESTO |
| Ir a Cita | `s:button green` | Vista Cita.xhtml | Pagada, entidad=CITA |
| Editar OT (Quest) | `s:button` | `facturaHome.cancelarFacturaQuest()` | Quest/OlarteAkle, 1 OT, no fiscalizado |
| Cancelar (rojo) | multiple | Abre modal de confirmacion | Varias condiciones |
| Cancelar y Editar Factura | `red` | Abre modal `cancelpopupSinAbortarOTFactura` | 1 OT, falta pago > 0 |

---

## 6. Modals

### 6.1 panelPago (creaPagoFactura.xhtml) - 650x420px
**Header:** "Crear Pago"
**Contenido:**
- Resumen factura (Cliente, Numero, Total, Monto Pagado, Pendiente)
- Notas Debito/Credito asociadas
- Credito disponible (si cliente empresa con credito)
- **Fecha** (calendar, solo ADM puede editar, config `FACT-pagos-select_fecha_pago`)
- **Tipo de Pago** (dropdown tipoPago, disabled si obligado efectivo)
- **Moneda** (dropdown si centro atencion tiene divisa, muestra equivalencia)
- **Monto** (input, disabled si es Efectivo cod=01)
- **Monto Recibido** (solo para Efectivo, calcula cambio)
- **Cambio** (calculado automaticamente)
- **Porcentaje Retencion** (solo tipos 6,7)
- **Punto de Venta** (dropdown, config `FACT-pagos-select_pos`)
- **Numero Documento** (solo si no es Efectivo)
- **Banco** (dropdown, config `FACT-pagos-select_banco`)
- **Numero Cheque** (config `FACT-pagos-input_numerocheque`)
- Botones: [Guardar] (3 variantes: normal, Profit, Profit2011) | [Cancelar]
- Auto-abre si `facturaPagoHome.mostrarPanelCreaPagoFactura = true`

### 6.2 panelCreaCliente (creaClienteFacturaEditControl.xhtml) - 500x550px
**Header:** "Crear/Editar Cliente"
**Campos:**
- ID Fiscal (con validador RFC Mexico condicional)
- Nombre/Razon Social
- Regimen Capital
- Calle y Numero
- Colonia
- Municipio
- Provincia
- Codigo Postal (required)
- Email (con validador)
- Telefono fijo
- Celular
- Botones: [Guardar/Agregar] | [Cancelar]
- Campos deshabilitados si RFC = `XAXX010101000` (publico en general MX)

### 6.3 cancelpopupSinAbortarOTFactura - 220x100px
- "Esta seguro de cancelar la factura?"
- [Si] -> `facturaHome.cancelarFacturaV2()` -> redirige PacienteList
- [No] -> cierra modal

### 6.4 cancelpopupSinAbortarOT - 220x100px
- "Esta seguro de cancelar la factura?"
- [Si] -> `facturaHome.cancelarFactura()` -> redirige PacienteList
- [No] -> cierra modal

### 6.5 cancelpopupSinAbortarCita - 220x100px
- "Esta seguro de cancelar la factura?"
- [Si] -> `facturaHome.cancelarFacturaCita()` -> redirige CitaList
- [No] -> cierra modal

### 6.6 cancelpopup - 220x100px
- "Esta seguro de cancelar la Requisicion?"
- [Si] -> `facturaHome.cancelarFacturaOrdenTrabajoQuest()` -> redirige PacienteList
- [No] -> cierra modal

### 6.7 cancelpopup2 - 220x100px
- "Esta seguro de cancelar la Requisicion?"
- [Si] -> `facturaHome.cancelarFacturaOrdenTrabajoQuestAntesDeTimbrado()` -> redirige PacienteList
- [No] -> cierra modal

---

## 7. Flujo de Cobro/Pago

```
1. Pantalla carga -> facturaHome.wire() + facturaPagoHome.wire() + setSugerenciaPago()
2. Si no fiscalizado:
   a. Pregunta "Requiere Factura Fiscal?" [SI/NO]
   b. SI: seleccionar cliente -> regimen fiscal -> uso CFDi -> confirmar
   c. NO: asignar cliente generico
3. Panel muestra datos factura + status PENDIENTE
4. Click [Ingresar Pago] -> abre modal panelPago
5. En modal:
   a. Seleccionar tipo pago (Efectivo, Transferencia, Deposito, Cheque, etc.)
   b. Si divisa: seleccionar moneda
   c. Ingresar monto
   d. Si efectivo: ingresar monto recibido -> calcula cambio
   e. Click [Guardar]
6. facturaPagoHome.guardarExpress():
   a. Verifica factura no abortada
   b. Verifica monto no excede faltante
   c. Persiste FacturaPago en BD
   d. Si montoFaltante == 0: factura PAGADA
   e. Crea FacturaLog (pago + tipo)
   f. Redirige a /FacturaEditAfter.seam (o se queda si pago parcial)
7. Si pagada: aparecen botones [Ir a OT] / [Ir a Presupuesto] / [Ir a Cita]
```

---

## 8. Sistema IGTF (Impuesto a Grandes Transacciones Financieras)

- **Flag:** `currentLaboratorio.aplicarIGTF` (campo `aplicar_igtf` en tabla `laboratorio`)
- **Uso:** Venezuela - impuesto sobre pagos en divisas
- **Campos en tabla `factura`:**
  - `igtf` (numeric 5,2) - porcentaje del impuesto (ej: 3.00%)
  - `monto_igtf` (numeric 16,2) - monto base gravable en divisa
  - `impuesto_igtf` (numeric 16,2) - monto del impuesto en divisa (USD)
  - `tasa_cambio` (numeric 6,2) - tasa de cambio para conversion
  - `impuesto_tasa_cambio` (numeric 16,2) - impuesto convertido a moneda base (BsF)
- **Formula:** Total con IGTF = totalFactura + impuestoIGTF
- **En XHTML:** seccion condicional dentro del panel Pagos (lineas 302-332)

---

## 9. Tablas de Base de Datos

### factura (tabla principal)
- 75 columnas
- PK: `id` (serial)
- FK a: `cliente`, `status_factura`, `servicio`, `moneda`, `conversion_moneda`, `factura_uso`, `razon_social`, etc.
- Trigger: `aprobar_facturas` (AFTER INSERT/UPDATE)

### factura_pago (pagos asociados)
- 28 columnas, 277,205 registros en EG
- PK: `id` (serial)
- FK a: `factura(id)`, `tipo_pago(id)`, `usuario(id)`, `punto_venta(id)`, `pago(id)`, `retencion(id)`
- Campos multi-moneda: `moneda_base`, `moneda_de_transaccion`, `tipo_cambio_transaccion`, `monto_moneda_extranjera`
- Campos de efectivo: `monto_recibido`, `monto_cambio_devuelto`, `is_monto_recibido_moneda_base`, `is_monto_cambio_moneda_base`
- Campos fiscales: `fiscal`, `fiscalizar`, `clave_fiscal`, `clave_sistema_fiscal`, `archivo_fiscal`

### tipo_pago (formas de pago)
- 9 columnas
- Tipos activos en EG: Cheque, Deposito, Efectivo (EFEC), Transferencia, Debito, Credito, Puntos Loyalty
- Campo `restringir_uso_en_pagos` para limitar uso

### item_factura (renglones de la factura)
- 19 columnas
- FK a: `factura(id)`, `impuesto(id)`
- Campos: `nombre_item`, `cantidad`, `monto`, `descuento`, `descuento_monto`, `precio_sin_descuento`
- Soporte multi-moneda: `monto_mon_ext`, `desc_monto_mon_ext`, etc.

### status_factura (catalogo de estados)
| ID | Status |
|----|--------|
| 1 | Activa (PENDIENTE en UI) |
| 2 | Pago Parcial |
| 3 | Cancelada (PAGADA en UI) |
| 4 | Anulada |
| 5 | No Procesada |
| 6 | NC Emitida |
| 7 | Por Procesar |
| 8 | Por Aprobar |

**NOTA IMPORTANTE:** El status_id=3 se llama "Cancelada" en BD pero en la UI se muestra como "PAGADA" (verde). La "cancelacion" en la UI usa status_id=4 (Anulada). Esto puede generar confusion.

---

## 10. Flags de Configuracion del Laboratorio

| Flag | Efecto en pantalla |
|------|-------------------|
| `aplicarIGTF` | Muestra seccion IGTF en panel pagos |
| `impresoraFiscal` | Usa `numeroFiscal` en vez de `numero` |
| `sistemaContable` | Determina boton Guardar (profit/profit2011/otro) |
| `tipoFactura` | Determina reporte de impresion (html vs seam) |
| `FACT-flujo-show_volver_a_lista` | Muestra boton "Ir a Lista" |
| `FACT-flujo-abort_ot_facturaeditcontrol` | Habilita cancelar OT desde esta pantalla |
| `FACT-flujo-fact_editcontrol_btn_to_cancel` | Muestra boton "Editar OT" antes de timbrar |
| `FACT-pagos-select_fecha_pago` | Permite seleccionar fecha de pago |
| `FACT-pagos-select_pos` | Muestra selector de punto de venta |
| `FACT-pagos-select_banco` | Muestra selector de banco |
| `FACT-pagos-input_numerocheque` | Muestra input para numero de cheque |
| `cap-general-allow_cap_not_accountable` | Permite facturas no fiscalizables |
| `cliente-edit-NO_validar_RFC_formato_mexico` | Desactiva validacion de RFC formato MX |
| `confFacturacion.codigoTipoFacturacion` | MX/MXN/MEX oculta campos VEN (control, fechaVenc, observaciones) |

---

## 11. Navegacion

### Entradas a esta pantalla:
- Desde `FacturaEdit.xhtml` (creacion de factura)
- Desde flujo de OT (post-creacion de factura express)
- Redirect desde si misma (post-pago parcial via page.xml navigation rules)

### Salidas desde esta pantalla:
| Destino | Condicion |
|---------|-----------|
| `FacturaList.xhtml` | Boton "Ir a Lista" (end conversation) |
| `FacturaEditAfter.seam` | Post-pago exitoso (guardarExpress) |
| `FacturaEditControl.xhtml` | Redirect post-pago (page.xml navigation) |
| `OrdenTrabajo.xhtml` | Factura pagada, 1 OT |
| `Presupuesto.xhtml` | Factura pagada, entidad=PRESUPUESTO |
| `Cita.xhtml` | Factura pagada, entidad=CITA |
| `PacienteList.seam` | Post-cancelacion (todas las variantes) |
| `CitaList.seam` | Post-cancelacion de factura de cita |
| Reporte factura (popup) | Boton Imprimir |

---

## 12. Complejidad y Notas

- Esta es una de las pantallas mas complejas del sistema de facturacion
- Maneja multiples variantes de laboratorio (Quest MX, Olarte y Akle, Venezuela, generico)
- El sistema dual-moneda (BsF + USD) permea toda la pantalla
- 7 modals de confirmacion de cancelacion (cada uno para un flujo diferente)
- El flujo fiscal MX (CFDi) agrega pasos de Regimen Fiscal + Uso CFDi
- El metodo `cancelarFacturaV2()` no solo anula sino que re-crea factura express para la OT
- `updateFacturaControlEdit()` es casi un no-op (solo imprime) - la logica real esta en el flush del EntityManager
