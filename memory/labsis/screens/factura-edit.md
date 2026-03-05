# Pantalla: Factura Edit (FacturaEdit)

**Status:** researched
**Fecha investigacion:** 2026-03-03
**Video frames:** 58-82

---

## 1. URL y Navegacion

```
FacturaEdit.seam?procedenciaId=78&pacienteId=34001&cid=220
```

**Breadcrumb:** Facturas : Crear / Facturas : Editar (dinamico via JS)

**Parametros page.xml:**
- `facturaFrom` — origen de navegacion
- `origenEspecial` — flag especial
- `facturaId` → `facturaHome.facturaId`
- `clienteFrom` — origen del cliente
- `clienteId` → `clienteHome.clienteId`
- `statusFacturaFrom`
- `statusFacturaId` → `statusFacturaHome.statusFacturaId`
- `procedenciaId` → `procedenciaHome.procedenciaId`

**Flujo de 3 pantallas:**
1. **FacturaEdit.xhtml** — Crear factura (seleccionar cliente, OTs, ver items, guardar)
2. **FacturaEditControl.xhtml** — Post-creacion: datos fiscales, pagos, re-editar cliente
3. **FacturaEditAfter.xhtml** — Vista final despues de pago (read-only con opciones)

**Navegacion post-persist:**
- `persist()` success → redirect a `FacturaEditControl.xhtml` con `fromPersist=true`
- `persist()` paralelo → redirect a `OrdenTrabajoList.xhtml`
- `update()` success → redirect a `Factura.xhtml`
- `remove()` → redirect a `FacturaList.xhtml`
- Cancelar → `FacturaList.xhtml`

---

## 2. Archivos XHTML involucrados

| Archivo | Lineas | Funcion |
|---------|--------|---------|
| `WebContent/FacturaEdit.xhtml` | 1,124 | Pantalla principal: crear/editar factura |
| `WebContent/FacturaEditControl.xhtml` | 869 | Post-creacion: fiscalizacion, pagos, panel IGTF |
| `WebContent/FacturaEditAfter.xhtml` | 287 | Vista posterior: detalle factura + pagos |
| `WebContent/Factura.xhtml` | 1,288 | Vista read-only de factura existente (post-update) |
| `WebContent/FacturaList.xhtml` | 418 | Lista de facturas |
| `WebContent/FacturaServicioEdit.xhtml` | 556 | Factura por servicio |

### page.xml:
| Archivo | Lineas |
|---------|--------|
| `WebContent/FacturaEdit.page.xml` | 131 |
| `WebContent/FacturaEditControl.page.xml` | 91 |
| `WebContent/FacturaEditAfter.page.xml` | 78 |

### Modals incluidos:
| Archivo | Lineas | Usado en | Funcion |
|---------|--------|----------|---------|
| `modalPanels/creaCliente.xhtml` | 194 | FacturaEdit | Modal crear/editar cliente (VE simple) |
| `modalPanels/creaClienteFacturaEditControl.xhtml` | 270 | FacturaEditControl | Modal crear/editar cliente (MX con datos fiscales) |
| `modalPanels/buscaClienteFactura.xhtml` | 141 | FacturaEdit | Modal buscar cliente existente |
| `modalPanels/buscaOrdenTrabajoFactura.xhtml` | 156 | FacturaEdit | Modal buscar y agregar OT |
| `modalPanels/itemFacturaGenericoForm.xhtml` | 103 | FacturaEdit | Modal agregar item generico |
| `modalPanels/creaPagoFactura.xhtml` | ? | FacturaEditControl, FacturaEditAfter | Modal crear pago |

### Fragmentos:
- `fragmentos/facturacion/monto_moneda_base_y_extranjera.xhtml` — Muestra montos dual (Bs.S + $)
- `fragmentos/facturacion/descuentos_factura_panel.xhtml` — Panel de descuentos

### CSS:
- `stylesheet/facturas.css`

---

## 3. Java Beans

### FacturaHome.java (PRINCIPAL)
- **Ruta:** `/git/labsis-ejb/ejbModule/com/dynamtek/labsis/session/FacturaHome.java`
- **Lineas:** 18,323
- **Clase:** `public class FacturaHome extends EntityHome<Factura>`
- **Seam Name:** `@Name("facturaHome")`

**Metodos clave:**
| Metodo | Linea | Funcion |
|--------|-------|---------|
| `persist()` | 3252 | Guardar factura nueva: valida, crea items, asigna cliente, IGTF, detecta paralelos |
| `guardarFacturaCaja()` | 3179 | Guardar con caja fiscal |
| `guardarFacturaCajaProfit()` | 3048 | Guardar con caja + enviar a Profit |
| `update()` | (nav) | Actualizar factura existente |
| `wire()` | (action) | Inicializar beans al cargar pagina |
| `initFacturaEdit()` | 17649 | Init: detecta origen (OT/presupuesto/cita), divisa, puntos |
| `setSugerenciaControl()` | 5294 | Sugiere numero de control |
| `existenPruebasDuplicadas()` | 17632 | Verifica pruebas duplicadas en OTs |
| `agregarOrdenTrabajo(OrdenTrabajo)` | 602 | Agrega OT a la factura |
| `agregarOrdenTrabajo(List)` | 616 | Agrega lista de OTs |
| `agregarItemFactura()` | 624 | Agrega item generico |
| `getItemFacturasTemp()` | (ref) | Genera items temporales para preview |
| `getCalcularImpuestoIGTF(monto)` | 2148 | Calcula IGTF: monto / 100 * lab.IGTF |
| `getCalcularImpuestoTasaCambio(monto)` | 2155 | IGTF en Bs.S: monto/100 * IGTF * tasaCambio |
| `actualizarDescuento()` | (ref) | Listener para recalcular descuento en vivo |
| `persistCreaClienteFacturaEditControl()` | 16626 | Crear cliente desde FacturaEditControl (MX) |
| `updateCreaClienteFacturaEdit()` | 16661 | Editar cliente desde FacturaEdit |
| `persistPacienteAClienteFacturaEditControl(Paciente)` | 16904 | Convertir paciente a cliente fiscal |
| `cancelarOrdenTrabajoQuest()` | (ref) | Cancelar OT tipo Quest |

**Inyecciones clave:**
- `clienteHome` (ClienteHome)
- `statusFacturaHome` (StatusFacturaHome)
- `procedenciaHome` (ProcedenciaHome)
- `cajaHome` (CajaHome)
- `servicioHome` (ServicioHome)
- `usuarioHome` (UsuarioHome)

### FacturaCreacionBean.java
- **Ruta:** `/git/labsis-ejb/ejbModule/com/dynamtek/labsis/session/factura/FacturaCreacionBean.java`
- **Lineas:** 2,069
- **Funcion:** Logica auxiliar de creacion (divisa extranjera, obtener paciente de factura, presupuesto, cita)

### Otros beans referenciados:
- `ClienteHome` — CRUD de cliente
- `FacturaPagoHome` — Pagos de factura (wire, sugerenciaPago, guardarExpress)
- `FacturaCancelacionBean` — Cancelacion de facturas
- `DescuentoCategoriaHome` / `DescuentoRhHome` — Descuentos
- `PuntosMedicaSurBean` — Sistema de puntos
- `RfcValidatorBean` — Validacion RFC (Mexico)
- `ConversionMonedaHome` — Conversion de monedas

---

## 4. Tablas de Base de Datos

### factura (74 columnas)
```
id                   SERIAL PK
numero               SERIAL (numero secuencial visible)
control              INTEGER NOT NULL (numero de control)
serie                VARCHAR(20)
fecha                TIMESTAMP NOT NULL
fecha_modificacion   DATE NOT NULL
fecha_vencimiento    DATE
-- Montos --
monto_total          NUMERIC(16,2) NOT NULL
descuento            NUMERIC(5,2) NOT NULL
base_imponible       NUMERIC(16,2) NOT NULL
iva                  NUMERIC(16,2) NOT NULL
iva_monto            NUMERIC(10,2) DEFAULT 0.0
total_factura        NUMERIC(16,2) NOT NULL
redondeo             NUMERIC(4,2) DEFAULT 0.00
-- IGTF (Impuesto Grande Transacciones Financieras - Venezuela) --
igtf                 NUMERIC(5,2)         -- porcentaje IGTF
monto_igtf           NUMERIC(16,2)        -- monto en divisa
impuesto_igtf        NUMERIC(16,2)        -- impuesto calculado en divisa
tasa_cambio          NUMERIC(6,2)         -- tasa de cambio
impuesto_tasa_cambio NUMERIC(16,2)        -- impuesto en moneda local
-- FKs --
cliente_id           INTEGER NOT NULL → cliente(id)
status_id            INTEGER NOT NULL → status_factura(id)
usuario_id           INTEGER → usuario(id)
caja_id              INTEGER → caja(id)
servicio_id          INTEGER → servicio(id)
moneda_id            INTEGER → moneda(id)
tipo_pago_factura_id INTEGER NOT NULL DEFAULT 1
-- Razon social (copia snapshot) --
razon_social         VARCHAR(100)
razon_social_ci_rif  VARCHAR(15)
razon_social_direccion TEXT
razon_social_id      INTEGER → razon_social(id)
-- Fiscalizacion --
fiscal               BOOLEAN DEFAULT false
fiscalizar           BOOLEAN DEFAULT false
numero_fiscal        INTEGER NOT NULL DEFAULT 0
clave_fiscal         VARCHAR(20)
clave_sistema_fiscal VARCHAR(40)
archivo_fiscal       TEXT
-- Factura unificada --
factura_unificadora_id INTEGER
unificadora          BOOLEAN DEFAULT false
unificada            BOOLEAN DEFAULT false
-- Refacturacion --
facturada_previamente_numero VARCHAR(40)
facturada_previamente_id     INTEGER
-- ERP --
send_erp             BOOLEAN DEFAULT true
sent_erp             BOOLEAN DEFAULT false
-- Otros --
observaciones        TEXT
time_zone            TEXT
motivo_cancelacion   TEXT
```

**Registros:** 262,265
**Trigger:** `aprobar_facturas` (AFTER INSERT OR UPDATE)

### item_factura (18 columnas)
```
id                      SERIAL PK
factura_id              INTEGER NOT NULL → factura(id)
nombre_item             TEXT NOT NULL
cantidad                INTEGER NOT NULL
monto                   NUMERIC(16,2) NOT NULL      -- precio unitario final
codigo_caja             VARCHAR(10) DEFAULT 'GEN01'
descuento               NUMERIC(5,2)
descuento_monto         NUMERIC(10,2) DEFAULT 0.00
precio_sin_descuento    NUMERIC(10,2) DEFAULT 0.00
descuento_rh            NUMERIC(10,2) DEFAULT 0.00
impuesto_id             INTEGER → impuesto(id)
is_recargo              BOOLEAN DEFAULT false
prueba_id               INTEGER
gp_id                   INTEGER
clave_sat               VARCHAR(10)
-- Moneda extranjera --
monto_mon_ext           NUMERIC(12,4)
desc_monto_mon_ext      NUMERIC(12,4)
precio_sin_desc_mon_ext NUMERIC(12,4)
desc_rh_mon_ext         NUMERIC(12,4)
```

**Registros:** 993,768

### cliente (49 columnas)
```
id              SERIAL PK
ci_rif          VARCHAR(15) NOT NULL     -- cedula/RIF/RFC
nombre          VARCHAR(100) NOT NULL
direccion       TEXT
telefono        VARCHAR(255)
celular         VARCHAR(20)
email           VARCHAR(100)
empresa         BOOLEAN DEFAULT false
bloqueado       BOOLEAN DEFAULT false
factura_sin_iva BOOLEAN DEFAULT false
-- Direccion detallada (MX) --
direccion_1     VARCHAR(100)
direccion_2     VARCHAR(100)
calle           VARCHAR(100)
codigo_postal   VARCHAR(15)
pais            VARCHAR(50)
provincia       VARCHAR(100)
municipio       VARCHAR(100)
-- Facturacion Mexico --
usar_rfc_generico  BOOLEAN DEFAULT false
cfdi_uso_id        INTEGER
regimen_fiscal_id  INTEGER
regimen_capital    VARCHAR(100)
-- Relaciones --
tipo_pago_id       INTEGER → tipo_pago(id)
moneda_id          INTEGER → moneda(id)
razon_social_id    INTEGER → razon_social(id)
cliente_industria_id INTEGER
status_cliente_id  INTEGER DEFAULT 0
-- ERP --
send_erp        BOOLEAN DEFAULT true
sent_erp        BOOLEAN DEFAULT false
verificado_erp  BOOLEAN DEFAULT false
```

**Registros:** 137,349

### cliente_datos_facturacion (15 columnas)
```
id              SERIAL PK
cliente_id      INTEGER NOT NULL → cliente(id)
nombre          VARCHAR(400) NOT NULL
idfiscal        VARCHAR(25) NOT NULL
direccion_1     VARCHAR(100)    -- Colonia
direccion_2     VARCHAR(100)
calle           VARCHAR(100)    -- Calle y Numero
codigo_postal   VARCHAR(15)
municipio       VARCHAR(100)
provincia       VARCHAR(100)
pais            VARCHAR(100)
numero_exterior VARCHAR(100)
numero_interior VARCHAR(100)
telefono        VARCHAR(100)
email_envio     VARCHAR(100)
```

### status_factura
| ID | Status |
|----|--------|
| 1 | Activa (pendiente de pago) |
| 2 | Pago Parcial |
| 3 | Cancelada (pagada) |
| 4 | Anulada |
| 5 | No Procesada |
| 6 | NC Emitida |
| 7 | Por Procesar |
| 8 | Por Aprobar |

### impuesto (EG)
| ID | Codigo | Valor | Activo |
|----|--------|-------|--------|
| 1 | IVA | 0.00 | true |

### factura_pago (28 columnas)
```
id                     SERIAL PK
factura_id             INTEGER NOT NULL → factura(id)
tipo_pago_id           INTEGER NOT NULL → tipo_pago(id)
monto                  NUMERIC(16,2) NOT NULL
num_documento          VARCHAR(30)
anulado                BOOLEAN DEFAULT false
fecha                  TIMESTAMP NOT NULL
usuario_id             INTEGER → usuario(id)
punto_venta_id         INTEGER → punto_venta(id)
-- Fiscal --
fiscal                 BOOLEAN DEFAULT false
fiscalizar             BOOLEAN DEFAULT false
-- Multi-moneda --
moneda_base            INTEGER
moneda_de_transaccion  INTEGER
tipo_cambio_transaccion NUMERIC(12,4)
monto_moneda_extranjera NUMERIC(10,2)
monto_recibido         NUMERIC(10,2)
monto_cambio_devuelto  NUMERIC(10,2)
```

---

## 5. Roles de Acceso

Restriccion en las 3 page.xml (identica):
```
#{identity.hasRole('ADM') or identity.hasRole('REC') or identity.hasRole('AUXADM')
  or identity.hasRole('COMM') or identity.hasRole('SUP-COM') or identity.hasRole('EST-EXT')
  or identity.hasRole('FIN') or identity.hasRole('SALES') or identity.hasRole('ADMSALE')}
```

| Rol | Descripcion |
|-----|-------------|
| ADM | Administrador |
| REC | Recepcion |
| AUXADM | Auxiliar Administrativo |
| COMM | Comercial |
| SUP-COM | Supervisor Comercial |
| EST-EXT | Estacion Externa |
| FIN | Finanzas |
| SALES | Ventas |
| ADMSALE | Admin Ventas |

**Restricciones adicionales en XHTML:**
- Descuento manual: solo `ADM` o `AUXADM`
- Boton editar OT: requiere permiso `facturacion-edit_cancel_ot_factura_edit`
- Agregar OT: requiere config flag `FACT-flujo-add_ot_facturaedit`
- Panel cliente: requiere flag `FACT-flujo-show_cliente_facturaedit`
- Cancelar flujo: requiere flag `FACT-flujo-cancel_flow_facturaedit`
- Uso CDFi: requiere flag `FACT-flujo-select_uso_cfdi_facturaedit`

---

## 6. Secciones de la Pantalla

### 6.1 Panel Cliente (condicional)
- Rendered si: `FACT-flujo-show_cliente_facturaedit = true` y no es Quest ni OlarteAkle
- Tabla: Nombre, CI/RIF, Direccion, Telefono
- Boton: "Buscar cliente" / "Cambiar cliente" → abre modal `panelCreaCliente`
- Si no hay clienteId, se abre automaticamente el modal buscar cliente (`rich:jQuery` al cargar)

### 6.2 Panel Ordenes de Trabajo / Presupuestos / Citas
- Header dinamico segun origen
- Tabla: Numero, Nombre paciente, Fecha, Precio
- Boton "Eliminar" por fila (si flag `FACT-flujo-add_ot_facturaedit`)
- Boton "Agregar Orden de Trabajo" → modal `panelBuscaOrdenTrabajo`
- Boton "Agregar Nuevo Item" → modal `panelFormularioItemFacturaGenerico` (si `facturarItemsGenericos`)

### 6.3 Panel IGTF (Venezuela)
- Rendered si: `currentLaboratorio.aplicarIGTF = true`
- Campos:
  - Monto IGTF /Divisa: inputText editable → `facturaHome.instance.montoIGTF`
  - Impuesto IGTF (X%) /Divisa: calculado disabled → `getCalcularImpuestoIGTF(montoIGTF)`
  - Impuesto IGTF (tasaCambio) /Bs.S: calculado disabled → `getCalcularImpuestoTasaCambio(montoIGTF)`
- Recalcula via AJAX onblur

### 6.4 Detalles de Factura (tabla items)
- Columnas:
  - Item (#)
  - Descripcion (nombreItem)
  - Cantidad
  - Precio unitario (con/sin descuento segun servicio config)
  - Descuento Precio Unitario (si `mostrarDescuentosFactura`)
  - Precio Unitario Final (si `mostrarDescuentosFactura`)
  - Total sin impuesto
  - Total Impuesto (con % IVA)
  - Total con impuesto (con % IVA)
- Columnas condicionales: Total sin Descuento, Total Descuento (si multiples OTs o items genericos)

### 6.5 Totales
- Total Facturado: `calcularSubTotal`
- Descuento: % editable (solo ADM/AUXADM) + monto calculado
- Base Imponible: `baseImponible`
- IVA (X%): `ivaMonto`
- Total factura (si redondeo)
- Total a Pagar: `totalFacturaNormalizada` (con redondeo si aplica)
- Total con IGTF (si aplica): `totalFactura + impuestoTasaCambio`

### 6.6 Botones de Accion
| Boton | Accion | Condicion |
|-------|--------|-----------|
| Guardar (azul) | `persist()` | Hay OT+cliente, no managed, no impresora fiscal, no caja |
| Guardar (caja) | `guardarFacturaCaja()` | Hay caja y existe caja para IP |
| Facturar e Imprimir | `enviarFacturaImprimir()` | Impresora fiscal activa |
| Guardar (no-MX) | `persist()` | No es MX facturacion |
| Guardar (update) | `update()` | `managed = true` (edicion) |
| Editar | link a `OrdenTrabajoEdit_v6.xhtml` | Quest/OlarteAkle o flag |
| Cancelar | `cancelarOrdenTrabajoQuest()` | Con confirmacion modal |
| Regresar | outcome "end" | Solo en edicion |

---

## 7. Modals Detalle

### Modal Crear/Editar Cliente (creaCliente.xhtml — VE)
- ID: `panelCreaCliente`
- Campos: ID Fiscal* (con validacion RFC si aplica), Nombre*, Direccion*, Email, Tel fijo, Celular
- Guardar (nuevo): `clienteHome.persist()`
- Agregar (existente): `facturaHome.updateCreaClienteFacturaEdit()`
- Validacion: `verifyCedulaRifExiste` onblur, `rfcValidatorBean.validatorRFC`

### Modal Crear/Editar Cliente (creaClienteFacturaEditControl.xhtml — MX)
- ID: `panelCreaCliente`
- Campos adicionales: Regimen Capital, Calle y Numero, Colonia, Municipio, Provincia, Codigo Postal
- Datos guardados en `cliente_datos_facturacion`
- RFC generico: `XAXX010101000` → deshabilita todos los campos
- Guardar: `facturaHome.persistCreaClienteFacturaEditControl()`
- Validacion RFC obligatoria para habilitar guardar

### Modal Buscar Cliente (buscaClienteFactura.xhtml)
- ID: `panelBuscaCliente`
- Busqueda por: ID Fiscal, Nombre/Razon Social
- Tabla resultados: Nombre, CI/RIF, [Seleccionar] link
- Boton "Crear Cliente" → abre `panelCreaCliente`

### Modal Buscar OT (buscaOrdenTrabajoFactura.xhtml)
- ID: `panelBuscaOrdenTrabajo`
- Buscar y seleccionar ordenes de trabajo para agregar a la factura

### Modal Item Generico (itemFacturaGenericoForm.xhtml)
- ID: `panelFormularioItemFacturaGenerico`
- Agregar items genericos (no vinculados a OT)

---

## 8. Flujo de Creacion de Factura

```
1. Usuario llega desde OT / Presupuesto / Cita / Manual
   → FacturaEdit.seam con parametros (procedenciaId, pacienteId, etc.)

2. Se ejecuta: wire() → initFacturaEdit()
   → Detecta origen: isFacturaDesdeOT / isFacturaDesdePresupuesto / isFacturaDesdeCita
   → Configura divisa extranjera si aplica
   → Verifica puntos MedicaSur

3. Si no hay cliente → se abre automaticamente modal BuscaCliente
   → Usuario busca o crea cliente
   → Al seleccionar, se asigna clienteId

4. Panel OTs muestra las ordenes asociadas
   → Usuario puede agregar/eliminar OTs (si flag)
   → Items se generan automaticamente de las pruebas de cada OT

5. Si IGTF activo → usuario ingresa monto IGTF en divisa
   → Se calcula impuesto automaticamente

6. Usuario ve preview de items + totales

7. Click "Guardar":
   persist() {
     - Validaciones (validacionPersistUpdateFactura)
     - Genera ItemFactura de OTs
     - Asigna cliente, servicio, usuario, fecha
     - Calcula IGTF si aplica
     - Detecta factura paralela (mismos datos en ultimos 10 min)
     - Persiste en BD
     - Redirect → FacturaEditControl.xhtml
   }

8. FacturaEditControl.xhtml:
   - Flujo fiscal (pregunta si requiere factura fiscal)
   - Crear/editar cliente fiscal (modal MX)
   - Seleccionar uso CDFi
   - Registrar pagos
   - Imprimir

9. FacturaEditAfter.xhtml:
   - Vista final con pagos registrados
```

---

## 9. Configuracion Multi-tenant

La pantalla se adapta segun laboratorio con flags de configuracion:

| Flag | Efecto |
|------|--------|
| `FACT-flujo-show_cliente_facturaedit` | Muestra panel cliente |
| `FACT-flujo-add_ot_facturaedit` | Permite agregar/eliminar OTs |
| `FACT-flujo-cancel_flow_facturaedit` | Muestra boton cancelar |
| `FACT-flujo-select_uso_cfdi_facturaedit` | Muestra selector CDFi (MX) |
| `FACT-flujo-edit_ot_facturaedit` | Muestra boton editar OT |
| `aplicarIGTF` | Habilita seccion IGTF (Venezuela) |
| `caja` | Habilita sistema de cajas |
| `impresoraFiscal` | Habilita impresion fiscal |
| `sistemaContable` | 'profit' habilita integracion Profit |
| `laboratorioQuest` | Modo Quest (flujo especial) |
| `laboratorioOlarteAkle` | Modo OlarteAkle (flujo especial) |
| `cliente-edit-NO_validar_RFC_formato_mexico` | Omite validacion RFC formato MX |
| `configuracionEspecial = 'Quest_MX'` | Oculta descuento manual |
| `codigoTipoFacturacion` | 'MX'/'MXN'/'MEX' = Mexico |

---

## 10. Relaciones Entity (Factura)

```
Factura
  ├── cliente_id → Cliente
  ├── status_id → StatusFactura
  ├── usuario_id → Usuario (quien creo)
  ├── caja_id → Caja
  ├── servicio_id → Servicio (procedencia)
  ├── moneda_id → Moneda
  ├── conversion_moneda_id → ConversionMoneda
  ├── tipo_pago_factura_id → TipoPagoFactura
  ├── tipo_pago_id → TipoPago
  ├── factura_uso_id → FacturaUso (CDFi)
  ├── razon_social_id → RazonSocial
  ├── tipo_servicio_id → TipoServicio
  ├── intervalo_facturacion_id → IntervaloFacturacion
  ├── factura_unificadora_id → Factura (self-ref)
  ├── factura_copago_cliente_id → ? (copago)
  │
  ├── 1:N → item_factura (items/pruebas)
  ├── 1:N → factura_pago (pagos)
  ├── 1:N → factura_log (historial)
  ├── 1:N → factura_has_orden_trabajo_log
  ├── 1:N → factura_documento_fiscal
  ├── 1:N → factura_respuesta_timbrador
  ├── 1:N → factura_servicio_parcial
  ├── 1:N → nota_debito_credito
  │
  └── N:1 ← orden_trabajo.factura_id (OTs facturadas)
```

---

## 11. Notas para React Moderno

### Complejidad alta
Esta es una de las pantallas mas complejas del sistema. Son realmente 3 pantallas (Edit, Control, After) con logica de multi-tenant, multi-moneda, fiscalizacion, IGTF, impresoras fiscales, y integraciones ERP.

### Sugerencia de implementacion
1. Separar en 3 rutas React: `/factura/crear`, `/factura/:id/control`, `/factura/:id/after`
2. Los modals de cliente pueden ser un componente compartido `<ClienteModal>`
3. IGTF es solo Venezuela (config flag)
4. El sistema de impresoras fiscales NO necesita replicarse en React (es hardware legacy)
5. La tabla de items se genera automaticamente desde las OTs - es read-only en la creacion
6. Los descuentos tienen logica compleja: por categoria, por servicio, RH, promo
7. Multi-moneda: siempre mostrar monto en moneda base + moneda extranjera si aplica

### Para EG especificamente
- IVA = 0% (solo 1 impuesto configurado, valor 0)
- IGTF probablemente activo (Venezuela)
- No es Quest ni OlarteAkle
- No es MX (sin CDFi ni RFC)
