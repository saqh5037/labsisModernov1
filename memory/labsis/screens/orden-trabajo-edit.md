# OrdenTrabajoEdit (Crear/Editar Orden de Trabajo)

**Status:** researched
**Fecha:** 2026-03-03
**URL:** `OrdenTrabajoEdit_v6.seam?pacienteId={id}`
**Breadcrumb:** "Ordenes de Trabajo : Crear" / "Ordenes de Trabajo : Editar"

---

## 1. Archivos Fuente

### XHTML Principal
| Archivo | Ruta | Lineas |
|---------|------|--------|
| **OrdenTrabajoEdit_v6.xhtml** (activo) | `/git/labsis/WebContent/OrdenTrabajoEdit_v6.xhtml` | **2,756** |
| OrdenTrabajoEdit.xhtml (base) | `/git/labsis/WebContent/OrdenTrabajoEdit.xhtml` | - |
| OrdenTrabajoEdit_v5.xhtml | `/git/labsis/WebContent/OrdenTrabajoEdit_v5.xhtml` | - |
| OrdenTrabajoEdit_v4.xhtml | `/git/labsis/WebContent/OrdenTrabajoEdit_v4.xhtml` | - |
| OrdenTrabajoEdit_v3.xhtml | `/git/labsis/WebContent/OrdenTrabajoEdit_v3.xhtml` | - |
| OrdenTrabajoEdit_v2.xhtml | `/git/labsis/WebContent/OrdenTrabajoEdit_v2.xhtml` | - |
| OrdenTrabajoEdit_ARG.xhtml | `/git/labsis/WebContent/OrdenTrabajoEdit_ARG.xhtml` | - |
| OrdenTrabajoEditReferencia.xhtml | `/git/labsis/WebContent/OrdenTrabajoEditReferencia.xhtml` | - |
| OrdenTrabajoEditFromServicio.xhtml | `/git/labsis/WebContent/OrdenTrabajoEditFromServicio.xhtml` | - |
| OrdenTrabajoEditQiagenBaseLiquida.xhtml | `/git/labsis/WebContent/OrdenTrabajoEditQiagenBaseLiquida.xhtml` | - |
| OrdenTrabajoEdit_vServicioProtocolos.xhtml | `/git/labsis/WebContent/OrdenTrabajoEdit_vServicioProtocolos.xhtml` | - |
| OrdenTrabajoEdit_vShowDocPreanaliticos.xhtml | `/git/labsis/WebContent/OrdenTrabajoEdit_vShowDocPreanaliticos.xhtml` | - |

> **Nota:** Existen 12 variantes de esta pantalla. La v6 es la que usa el tenant EG segun el video.

### Page XML
| Archivo | Ruta | Lineas |
|---------|------|--------|
| **OrdenTrabajoEdit_v6.page.xml** | `/git/labsis/WebContent/OrdenTrabajoEdit_v6.page.xml` | **67** |

### Java Bean Principal
| Archivo | Ruta | Lineas |
|---------|------|--------|
| **OrdenTrabajoHome.java** | `/git/labsis-ejb/ejbModule/com/dynamtek/labsis/session/OrdenTrabajoHome.java` | **21,588** |

Clase: `public class OrdenTrabajoHome extends EntityHome<OrdenTrabajo>`

### Includes del v6
| Include | Ruta relativa | Lineas | Proposito |
|---------|---------------|--------|-----------|
| selector_procedencia_subproyecto.xhtml | `fragmentos/ordenTrabajo/` | 280 | Selectores de Procedencia y Subproyecto |
| panelArmarOTEdit.xhtml | `modalPanels/` | 729 | Arbol de pruebas/GPs, estructura, precios |
| buscarCrearEditarDoctor.xhtml | `modalPanels/` | 745 | Modals de buscar/crear/editar medico (1 y 2) |
| verInstruccionesDeMuestra.xhtml | `modalPanels/` | - | Instrucciones de muestra |
| panelEditarMuestra.xhtml | `modalPanels/` | - | Editar muestra |

### CSS y JS
- `stylesheet/ordenTrabajoEdit.css`
- `stylesheet/tags.css`
- `stylesheet/pruebas-gps-duplicadas.css`
- `js/utils.js`

---

## 2. Estructura de la Pantalla (Secciones)

### 2.1 Seccion Superior: Datos del Paciente
**Panel:** `panelPaciente` con `h:panelGrid columns="8"`

| Campo | Bean Property | Tipo | Tab | Notas |
|-------|--------------|------|-----|-------|
| ID Paciente* | `ordenTrabajoHome.idPaciente` | inputText (disabled) | 1 | `verifyCedulaExisteV3` en onchange |
| Apellido(s) | `ordenTrabajoHome.apellidosPaciente` | inputText | 2 | maxlength=60 |
| Segundo Apellido | `ordenTrabajoHome.apellidoSegundo` | inputText | 3 | maxlength=60 |
| Nombre | `ordenTrabajoHome.nombrePaciente` | inputText | 4 | maxlength=60 |
| e-mail | `ordenTrabajoHome.emailPaciente` | inputText | 5 | validator=emailValidatorLabsis, maxlength=200 |
| Sexo | `ordenTrabajoHome.sexoPaciente` | selectOneMenu | 6 | `personalDataBean.genderOptionsSelect` |
| Edad | `ordenTrabajoHome.edadPaciente` | inputText + selectOneMenu | 8-9 | Unidades: y/m/d. Recalcula fecha nac |
| F. Nacimiento | `ordenTrabajoHome.fechaNacPaciente` | rich:calendar | 10 | dd/MM/yyyy, validator=pacienteFechaNacimientoValidator |
| Telefono | `ordenTrabajoHome.telefonoPaciente` | inputText | 14 | maxlength=30 |
| Telf. Celular | `ordenTrabajoHome.telefonoCelularPaciente` | inputText | 15 | Condicional: `permisoHome.tienePermisoSobreAccion('paciente-edit_celular')` |
| ID Representante | `ordenTrabajoHome.idPacienteRepresentante` | inputText | 11 | Condicional: `confPaciente.ciRepresentante` |
| RFC | `ordenTrabajoHome.idPacienteRFC` | inputText | 12 | Condicional: `confPaciente.rfc`, validator=rfcValidatorBean |
| Historia Medica | `ordenTrabajoHome.numHistorialPaciente` | inputText | 13 | Condicional: `confPaciente.historiaMedica` |
| Embarazada? | `ordenTrabajoHome.instance.embarazada` | checkbox | 16 | Condicional: sexo=F y laboratorioQuest |
| Semanas Embarazo | `ordenTrabajoHome.instance.semanasEmbarazo` | inputText | 17 | Condicional: embarazada=true |

### 2.2 Seccion Media: Datos de la Orden

| Campo | Bean Property | Tipo | Tab | Notas |
|-------|--------------|------|-----|-------|
| Departamento* | `ordenTrabajoHome.nombreDepartamento` | inputText + suggestionbox | 18 | Autocomplete, solo si multiples dptos. `autocompleteDepartamentos` |
| Centro Atencion Pacientes | `ordenTrabajoHome.nombreCAP` | inputText + suggestionbox / display | 19 | Auto-asigna si solo 1 CAP |
| Procedencia* | include `selector_procedencia_subproyecto.xhtml` | combo/select | 17 | Con badge cerrado/abierto |
| Servicio Medico | `ordenTrabajoHome.nombreServicioMedico` | inputText + suggestionbox | 20 | Condicional: `currentLaboratorio.otBusquedaPorServicioMedico` |
| Num. Ingreso/Expediente | `ordenTrabajoHome.instance.numIngreso` | inputText | 21 | maxlength=20. Condicional: `ot-creacion-show_num_ingreso_protocolo` |
| Nro. Protocolo/Otro | `ordenTrabajoHome.instance.numEpisodio` | inputText | 22 | maxlength=20 |
| STAT (Urgencia)? | `ordenTrabajoHome.instance.stat` | checkbox | 23-24 | Condicional: `currentLaboratorio.showStat`. Si tiene permiso `ot-edit-stat_agrega_prueba_extra` agrega servicio urgencia |
| Nombre Medico | `ordenTrabajoHome.instance.medicoObj.nombre` | display (disabled) | 26 | Read-only + boton "Cambiar Medico" |
| Apellido Paterno Medico | `ordenTrabajoHome.instance.medicoObj.apellidoPaterno` | display | 27 | |
| Apellido Materno Medico | `ordenTrabajoHome.instance.medicoObj.apellidoMaterno` | display | 28 | |
| Email Medico | `ordenTrabajoHome.instance.medicoObj.email` | display | 29 | |
| Telefono Medico | `ordenTrabajoHome.instance.medicoObj.telefono` | display | 30 | |
| Enviar email Medico | `ordenTrabajoHome.instance.sendMailDoctor` | selectOneMenu | - | Condicional: `ot-creacion-show_opcion_enviar_email_medico` |
| Medico 2 (todos campos) | `ordenTrabajoHome.instance.medicoDos.*` | display | 31-35 | Condicional: `ot-creacion-edit_medico_dos` |

### 2.3 Seccion Inferior: Lista de Pruebas
**Include:** `panelArmarOTEdit.xhtml` (729 lineas)

Contiene:
- Buscador de pruebas/GPs con suggestionbox
- Arbol de estructura (Estructura (N))
- Contenedores de muestras (tubo, color)
- Precios con lista de precios y IVA
- Cuestionario de Ingreso

### 2.4 Seccion: Citas Proveedor Estudios Externos
- `rich:dataTable` con columnas: Prueba, Proveedor, Ubicacion, Fecha inicio/fin, Codigo, Comentario
- Condicional: solo si hay citas de proveedor
- Permiso: `pee-add_ubicacion` para ubicacion y fechas fin
- Modal `agendaProveedorEstudiosPanel` con iframe

### 2.5 Botones de Accion (lineas 2501-2577)

| Boton | Action | Rendered | Notas |
|-------|--------|----------|-------|
| **Guardar** | `ordenTrabajoHome.guardarEditV6(proveedorEstudiosExternoHome.listaCitasProveedor)` | `!managed AND !laboratorioQuest AND ot-creacion-guardar_ot_sin_facturar` | Solo guardar sin facturar |
| **Guardar y Cobrar** | `ordenTrabajoHome.guardarFacturarV6(proveedorEstudiosExternoHome.listaCitasProveedor)` | `!managed` (creando) | Boton principal azul. Si tipo credito, solo dice "Guardar" |
| **Guardar y Cobrar** (update) | `ordenTrabajoHome.updateEditV6(proveedorEstudiosExternoHome.listaCitasProveedor)` | `managed` (editando) | Para edicion de OT existente |
| **Cancelar** | `end` (propagation=end) | `!managed` | Regresa a OT List |
| **Cancelar** (Quest) | `ordenTrabajoHome.cancelarOrdenTrabajoQuest()` | `managed AND (laboratorioQuest OR ot-creacion-ot_edit_cancel_edit)` | Para edicion |

---

## 3. Modals Encontrados en v6

### En el propio v6 XHTML:
1. **addMedicoQuest** - Buscar Medico principal (busqueda por email con suggestionbox)
2. **addMedicoQuest1** - Agregar/Crear Medico principal
3. **addMedicoQuestBuscar** - Resultados de busqueda medico (encontrado/no encontrado/inactivo)
4. **addMedicoDos1** - Agregar/Crear Medico 2
5. **addMedicoDosBuscar** - Resultados de busqueda medico 2
6. **panelStatus** - Loading spinner
7. **otCajaNullWarningPanel** - Warning: no hay caja asignada a esta IP
8. **agendaProveedorEstudiosPanel** - Agendar estudios (iframe)

### En el include buscarCrearEditarDoctor.xhtml (745 lineas):
9. **panelDoctor** - Buscar Medico (version legacy con suggestionbox por email/nombre)
10. **addMedico** - Agregar Medico (version legacy)
11. **addMedicoBuscar** - Resultados busqueda medico
12. **panelDoctorDos** - Buscar Medico 2
13. **addMedicoDos** - Agregar Medico 2
14. **addMedicoDosBuscar** - Resultados busqueda medico 2

### En otros includes:
15. **verInstruccionesDeMuestra** - Ver instrucciones de muestra
16. **panelEditarMuestra** - Editar muestra (operacion=crear, muestraEntity=OT)

---

## 4. Tabla: orden_trabajo

**Registros:** 455,204
**Columnas:** ~109

### Columnas principales (relevantes para OT Edit):

| Columna | Tipo | Nullable | Default | Notas |
|---------|------|----------|---------|-------|
| id | integer PK | NOT NULL | serial | |
| numero | varchar(20) | NOT NULL | `generadorordenid()` | UNIQUE |
| numero_solicitud | integer | NOT NULL | serial | |
| fecha | timestamp | NOT NULL | now() | |
| paciente_id | integer FK | NOT NULL | | FK -> paciente(id) |
| medico | varchar(300) | | | Nombre texto legacy |
| medico_id | integer FK | | | FK -> medico(id) (no declarada como FK en schema pero usada) |
| medico_dos_id | integer FK | | | FK -> medico(id) |
| procedencia | varchar(40) | | | Nombre texto legacy |
| procedencia_id | integer FK | | | default=1 |
| habitacion | varchar(15) | | | |
| status_id | integer FK | NOT NULL | | FK -> status_orden(id) |
| servicio_medico_id | integer FK | | | |
| servicio_id | integer FK | | | FK -> servicio (lista precios) |
| departamento_laboratorio_id | integer FK | | | |
| centro_atencion_paciente_id | integer FK | | | FK -> centro_atencion_paciente(id) |
| observaciones | text | | | |
| informacion_clinica | text | | | |
| num_ingreso | varchar(30) | | | Expediente |
| num_episodio | varchar(20) | | | Protocolo/Otro |
| stat | boolean | | false | Urgencia |
| embarazada | boolean | | false | |
| semanas_embarazo | integer | | 0 | |
| entregada | boolean | NOT NULL | false | |
| precio | numeric(16,2) | | 0 | |
| usuario_id | integer FK | | | Quien creo |
| factura_id | integer FK | | | FK -> factura(id) |
| fecha_validado | timestamp | | | |
| etiquetas_impresas | boolean | NOT NULL | false | |
| toma_muestra_completa | boolean | | false | |
| send_mail | boolean | | false | |
| send_mail_doctor | boolean | | false | |
| send_mail_doctor_dos | boolean | | false | |
| temporal | boolean | | false | |
| subproyecto_id | integer FK | | | |
| factura_fiscal | boolean | | false | |
| descuento_porcentaje | numeric(5,2) | | 0.00 | |
| descuento_monto | numeric(10,2) | | 0.00 | |
| moneda_id | integer FK | | | |
| tipo_cambio | numeric(12,4) | | | |

### Indices:
- `pk_orden_trabajo` PRIMARY KEY (id)
- `uk_orden_trabajo` UNIQUE (numero)
- `orden_trabajo_numero_idx` btree (numero)
- `orden_trabajo_paciente_idx` btree (paciente_id)
- `orden_trabajo_fecha_idx` btree (fecha)
- `orden_trabajo_servicio_idx` btree (servicio_id)
- `orden_trabajo_toma_muestra_completa_idx` btree (toma_muestra_completa)

### Foreign Keys:
- paciente_id -> paciente(id)
- status_id -> status_orden(id)
- factura_id -> factura(id)
- centro_atencion_paciente_id -> centro_atencion_paciente(id)
- medico_dos_id -> medico(id)
- clasificacion_orden_trabajo_id -> clasificacion_orden_trabajo(id)

### Triggers:
- `generar_ot_numero_after_insert` - AFTER INSERT genera numero de OT
- `trg_notify_orden_insert` - AFTER INSERT notificacion
- `trg_notify_orden_update` - AFTER UPDATE notificacion

### Tablas que referencian orden_trabajo (37+):
- prueba_orden, gprueba_orden, muestra, prueba_miscelanea
- status_area, cliente_has_orden, accion_log
- documento_orden_trabajo, cita, factura_has_orden_trabajo_log
- orden_trabajo_has_diagnostico, orden_trabajo_has_documento_preanalitico
- orden_trabajo_has_proveedor_estudios_externo, etc.

---

## 5. Tablas Auxiliares

### prueba_orden (junction OT <-> Prueba)
**Registros:** 15,965,574
**Columnas principales:**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | integer PK | serial |
| prueba_id | integer FK | -> prueba(id) |
| orden_id | integer FK | -> orden_trabajo(id) |
| status_id | integer FK | -> status_orden(id) |
| gp_id | integer FK | -> grupo_prueba(id) |
| precio | numeric(16,2) | NOT NULL |
| gp_orden_id | integer | Referencia al gprueba_orden |
| area_id | integer FK | |
| fecha_creacion | timestamp | |
| fecha_validacion | timestamp | |
| anormal | boolean | default false |
| descuento_porcentaje | numeric(5,2) | |
| descuento_monto | numeric(10,2) | |
| precio_sin_descuento | numeric(10,2) | |

### gprueba_orden (junction OT <-> GrupoPrueba)
**Registros:** 675,177
**Columnas principales:**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | integer PK | serial |
| orden_id | integer FK | -> orden_trabajo(id) |
| gp_id | integer FK | -> grupo_prueba(id) |
| precio | numeric(16,2) | NOT NULL |
| gp_orden_id | integer | Para GPs anidados (bacteriologia) |
| gp_auxiliar | boolean | default false |
| descuento_porcentaje | numeric(5,2) | |

### departamento_laboratorio
**Registros:** 1
**Columnas:** id, nombre_dpto, codigo, procesa, departamento_destino_id, direccion, bioanalista_id, telefono, etc.

### procedencia
**Registros activos:** 201
**Columnas principales:**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | integer PK | serial |
| nombre | varchar(100) | UNIQUE |
| emergencia | boolean | default false |
| pago_obligatorio_impresion | boolean | Obliga pago para imprimir |
| ingreso_obligatorio | boolean | Obliga num_ingreso |
| fecha_operacion_obligatorio | boolean | |
| medico_obligatorio | boolean | |
| codigo | varchar(20) | |
| activo | boolean | default true |
| muestra_referida | boolean | |
| servicio_id | integer FK | Lista de precios asociada |

### medico
**Registros:** 215
**Columnas principales:**
| Columna | Tipo | Notas |
|---------|------|-------|
| id | integer PK | serial |
| nombre | varchar(200) | NOT NULL |
| id_profesional | varchar(20) | NOT NULL |
| email | varchar(100) | |
| telefono | varchar(30) | |
| apellido_paterno | varchar(100) | |
| apellido_materno | varchar(100) | |
| celular | varchar(30) | |
| validado | boolean | default false |
| activo | boolean | default true |
| especialidad | varchar(50) | |

### lista_precios
**Registros totales:** 27 (activos: 8)
**Columnas:** id, nombre, descripcion, activo, fecha_inicio, fecha_fin, bloqueado, moneda_id
**Tablas relacionadas:** lista_precios_has_prueba, lista_precios_has_gprueba

**Listas activas (EG):**
| ID | Nombre |
|----|--------|
| 17 | Bolivariana de Seguros |
| 21 | CC. Rey de Reyes |
| 23 | Ambulatorio_2025 |
| 26 | Superintendencia Seguros |
| 27 | Ambulatorio_Abril_2025 |
| 30 | Grupito2025 |
| 31 | Dra. Angela Quindisaca |
| 32 | Seguros Caracas |

### servicio_medico
**Registros activos:** 1
**Columnas:** id, nombre, emergencia, codigo, activo, ingreso_toma_muestra, muestra_referida

---

## 6. Roles y Permisos de Acceso

### Restriccion de Pagina (page.xml linea 8):
```
#{(!currentLaboratorio.soloCreaOrdenAdmin or identity.hasRole('ADM'))
  and !identity.hasRole('VIS')
  and !identity.hasRole('EXT')
  and cierreCajaHome.permitirCrearOTsCierreCaja()}
```

**Traduccion:**
- Si `soloCreaOrdenAdmin=true` -> solo rol `ADM` puede acceder
- Rol `VIS` (Visitante) -> **bloqueado**
- Rol `EXT` (Externo) -> **bloqueado**
- Si hay cierre de caja activo -> **bloqueado** (segun config)

### Permisos especificos usados en v6:
| Permiso | Donde se usa | Efecto |
|---------|-------------|--------|
| `paciente-edit_celular` | Campo telefono celular paciente | Muestra/oculta campo |
| `ot-edit-stat_agrega_prueba_extra` | Checkbox STAT | Si tiene permiso, agrega prueba extra de urgencia al marcar STAT |
| `ot-edit-show_doctor_celular` | Modal medico | Muestra campo celular del medico |
| `ot-add_create_doctor` | Modal buscar medico | Permiso para buscar/crear medico (en buscarCrearEditarDoctor.xhtml) |
| `pee-add_ubicacion` | Citas proveedor externo | Muestra columna ubicacion y fecha fin |

### Flags de configuracion del laboratorio (currentLaboratorio):
| Flag | Efecto |
|------|--------|
| `ot-creacion-edit_medico_dos` | Muestra seccion Medico 2 |
| `ot-creacion-show_num_ingreso_protocolo` | Muestra campos num ingreso y protocolo |
| `ot-creacion-show_opcion_enviar_email_medico` | Muestra select enviar email al medico |
| `ot-creacion-guardar_ot_sin_facturar` | Muestra boton "Guardar" sin facturar |
| `ot-creacion-save_medico_sin_email` | Permite guardar medico sin email |
| `ot-creacion-save_medico_sin_telefono` | Permite guardar medico sin telefono |
| `ot-creacion-edit_info_medico_v6` | Permite editar info del medico en modal |
| `ot-creacion-ot_edit_cancel_edit` | Muestra boton cancelar en edicion |
| `ot-creacion-facturar_servicio_credito` | Auto-factura credito |
| `ot-creacion-force_answering_questionaire` | Obliga responder cuestionario |
| `ot-visual-change_campos_medico` | Cambia layout campos medico |
| `showStat` | Muestra checkbox STAT |
| `otBusquedaPorServicioMedico` | Muestra campo Servicio Medico |
| `cerrarCuentaIngreso` | Activa logica de cierre por numero de ingreso |
| `servicioMedObligatorio` | Hace obligatorio Servicio Medico |

---

## 7. Flujo de Creacion (persist flow)

### Metodo principal: `guardarFacturarV6()` (linea 5924)

```
guardarFacturarV6(listaCitasProveedor)
  |-- Verifica existencia de caja (cajaHome.existeCajaIp)
  |   |-- Si NO existe caja y NO mostrado warning -> muestra warning modal
  |   |-- Si NO existe caja y Quest -> silencia
  |   |-- Si existe caja O usuario acepto warning:
  |       |-- validacionGuardarEditv6() -- validaciones de negocio
  |       |   |-- Valida departamento seleccionado
  |       |   |-- Valida vigencia servicio/subproyecto (solo en update)
  |       |   |-- validacionGuardarEdit() (comun)
  |       |   |   |-- Valida procedencia obligatoria
  |       |   |   |-- Valida servicio/num ingreso unicos
  |       |   |   |-- Valida documentos firmados si aplica
  |       |   |-- Valida cuestionario respondido (si ot-creacion-force_answering_questionaire)
  |       |   |-- Valida proveedor estudios externo
  |       |-- validacion() -- validaciones de pruebas
  |       |   |-- Valida email paciente (formato)
  |       |   |-- Valida email medico (formato)
  |       |   |-- Valida al menos 1 prueba/GP seleccionado
  |       |   |-- Valida max tests
  |       |   |-- Valida duplicados de pruebas
  |       |-- persistEditV3() -- persiste la orden
  |       |   |-- chechMedicoToInsert() -- verifica/crea medico
  |       |   |-- Crea OrdenTrabajo con todos los campos
  |       |   |-- Crea PruebaOrden para cada prueba
  |       |   |-- Crea GpruebaOrden para cada grupo
  |       |   |-- Crea muestras
  |       |   |-- Persiste en BD
  |       |-- ingresarAdjuntosOrdenTrabajoV5() -- archivos adjuntos
  |       |-- ingresarEstudiosProveedoresExternos() -- citas proveedor
  |       |-- envioAccesoPortalMedico() -- envio acceso portal
  |       |-- Si tipo credito -> crearFacturaCredito()
  |       |-- Si tipo contado -> fHome.guardarExpressV4() -> redirige a FacturaEdit
```

### Metodo persist() original (linea 3008):
- Crea nueva OrdenTrabajo
- Copia datos del paciente, medico, procedencia, departamento
- Status inicial: 1 (ingresada)
- Genera numero automatico via trigger `generar_ot_numero_after_insert`
- Crea PruebaOrden, GpruebaOrden, PruebaMiscelanea

### Metodo guardarEditV6() (linea 5594) - Solo guardar sin factura:
- Mismas validaciones que guardarFacturarV6
- Llama `persistEditV3()`
- Ingresa adjuntos y estudios externos
- Redirige a OT List

### Metodo updateEditV6() (linea 5644) - Edicion de OT existente:
- Verifica caja
- Valida
- Elimina PreguntaIngresoPruebaOrdenTrabajo existentes
- Llama `updateEditV3()`
- Ingresa adjuntos y estudios
- Redirige a factura o OT list segun tipo servicio

---

## 8. Validaciones Encontradas

### validacion() (linea 4756):
1. **Email paciente** - Si no es vacio, valida formato email (a menos que `ot-creacion-ignore_patients_email`)
2. **Email medico** - Valida formato si no vacio
3. **Al menos 1 prueba/GP** - `pruebasGPsContenedor.hasPruebasGPs()` o pruebas dinamicas/miscelaneas
4. **Max tests** - Si `maxTests != 0`, no exceder
5. **Pruebas duplicadas** - `tienePruebaDuplicados()`

### validacionGuardarEditv6() (linea 5167):
1. **Departamento obligatorio** - Si `permitidoUsoDepartamentoEnEntidades` y no hay departamento seleccionado
2. **Vigencia servicio/subproyecto** - Solo en update (no en persist)
3. **Cuestionario respondido** - Si `ot-creacion-force_answering_questionaire` y hay grupos con preguntas no respondidas
4. **Proveedor estudios externo** - Si hay citas, el proveedor es obligatorio

### validacionGuardarEdit() (comun, llamada desde v6):
- Procedencia obligatoria
- Num ingreso unico (si servicio lo requiere)
- Documentos firmados (checkDocumentosFirmados)

---

## 9. Navegacion (page.xml)

| Action | Destino |
|--------|---------|
| `persist` | end-conversation -> OrdenTrabajoList.xhtml |
| `update` | end-conversation -> OrdenTrabajo.xhtml (detalle) |
| `remove` | end-conversation -> OrdenTrabajoList.xhtml |
| `guardarEditV3()` | end-conversation -> OrdenTrabajoList.xhtml?numero={num} |
| `guardar()` | end-conversation -> OrdenTrabajoList.xhtml?numero={num} |
| outcome="end" | end-conversation -> OrdenTrabajoList.xhtml?numero={num} |

**Parametros de pagina:**
- `ordenTrabajoFrom`, `presupuestoId`, `ordenTrabajoId`, `medicoId`, `medicoDosId`
- `pacienteFrom`, `pacienteId`, `statusOrdenFrom`, `statusOrdenId`

**Actions al cargar:**
- `ordenTrabajoHome.wire()` (solo en GET)
- `ordenTrabajoHome.setMuestraCopagoPaciente` (solo en GET)
- `ordenTrabajoHome.wirePaciente()` (siempre)

**Init EL expressions (en XHTML, no en page.xml):**
- `#{ordenTrabajoHome.initFromPresupuesto(presupuestoId)}`
- `#{ordenTrabajoHome.initProcedenciaOrdenTrabajoEdit()}`
- `#{ordenTrabajoHome.inicarPruebasTemp()}`
- `#{ordenTrabajoHome.initPacientev4()}`
- `#{ordenTrabajoHome.initMedicoOrdenTrabajoEdit()}`
- `#{ordenTrabajoHome.initMedicoDosOrdenTrabajoEdit()}` (condicional)
- `#{ordenTrabajoHome.initAyudaIngresoOrdenTrabajoEdit()}` (solo create)

---

## 10. Mapeo para React Moderno

### Componentes propuestos:
```
OTEditPage/
  OTEditShell.jsx           -- Layout general (similar a ot-shell de Detail)
  PatientInfoSection.jsx    -- Seccion superior (8 columnas grid)
  OrderDataSection.jsx      -- Departamento, CAP, Procedencia, Medico
    DepartmentSelector.jsx  -- Autocomplete departamento
    CAPSelector.jsx         -- Autocomplete CAP
    ProcedenciaSelector.jsx -- Selector procedencia + subproyecto
    DoctorSection.jsx       -- Info medico + boton cambiar
  TestsSection.jsx          -- Arbol pruebas, estructura, precios
    TestSearch.jsx          -- Buscador de pruebas/GPs
    TestTree.jsx            -- Arbol de estructura
    PriceDisplay.jsx        -- Display de precios, IVA
    ContainerInfo.jsx       -- Info contenedores/muestras
  DoctorSearchModal.jsx     -- Modal buscar/crear/editar medico
  ActionButtons.jsx         -- Guardar, Guardar y Cobrar, Cancelar
```

### Endpoints API necesarios:
```
GET    /api/ot/edit/:id          -- Datos para edicion
GET    /api/ot/edit/new?pacienteId=X  -- Init para crear
POST   /api/ot                   -- Crear OT
PUT    /api/ot/:id               -- Actualizar OT
POST   /api/ot/:id/facturar      -- Guardar y cobrar
GET    /api/departamentos/search?q=    -- Autocomplete dptos
GET    /api/caps/search?q=             -- Autocomplete CAPs
GET    /api/procedencias               -- Lista procedencias activas
GET    /api/servicios-medicos/search?q= -- Autocomplete serv medicos
GET    /api/medicos/search?q=          -- Autocomplete medicos
POST   /api/medicos                    -- Crear medico
GET    /api/pruebas/search?q=          -- Buscar pruebas/GPs
GET    /api/listas-precios/:id         -- Precios por lista
```

---

## 11. Notas Importantes

1. **El archivo v6 es enorme (2,756 lineas)** porque incluye multiples modals de medico directamente en el XHTML, ademas de las versiones legacy en `buscarCrearEditarDoctor.xhtml`.

2. **OrdenTrabajoHome.java tiene 21,588 lineas** - es el bean mas grande del sistema. Contiene logica para TODAS las variantes (v2-v6, ARG, Referencia, Qiagen, etc.).

3. **El metodo `persist()` original (linea 3008)** esta mayormente comentado (lineas 3157-3327 son un bloque enorme de codigo comentado). La logica real se ejecuta en `persistEditV3()`.

4. **Hay 12 variantes de la pantalla**, cada una adaptada para un tenant o caso de uso especifico. La v6 es la mas completa y la que usa EG.

5. **La tabla orden_trabajo tiene 109 columnas** - muchas son flags booleanos para features especificas.

6. **15.9 millones de prueba_orden** - esta tabla es critica para performance. Tiene multiples indices optimizados.

7. **El flujo guardarFacturarV6 verifica la caja (IP)** antes de proceder. Si no hay caja asignada a esa IP, muestra warning y permite continuar sin facturar.

8. **El sistema de medicos tiene flujo complejo**: buscar por email -> si existe agregar -> si no existe crear -> validar que este activo y disponible para el departamento.
