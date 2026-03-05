# PROMPT DEV 4: Crear/Editar Orden de Trabajo (OTEditPage + Facturación)

```
Eres un dev React/Express trabajando en el proyecto labsisModernov1.

## Proyecto
- Ruta: /Users/samuelquiroz/Documents/proyectos/labsisModernov1/
- Stack: React 19 + Vite 7 + Express 5 + PostgreSQL (pg pool, SQL directo, sin ORM)
- BD: labsisEG en localhost:5432 (user:labsis, pass:labsis)
- .env ya configurado en server/

## RESTRICCIÓN CRÍTICA: BASE DE DATOS
La BD NO se puede modificar estructuralmente en esta etapa.

### ✅ PERMITIDO:
- SELECT, INSERT, UPDATE, DELETE (operaciones DML normales)
- CREATE INDEX (para optimización)

### ❌ PROHIBIDO:
- CREATE TABLE, ALTER TABLE, DROP TABLE
- Agregar/modificar columnas
- Crear/modificar triggers o funciones
- Modificar constraints o foreign keys

→ Adaptarse 100% a la estructura existente de la BD.

## Tu tarea
Implementar la pantalla de Crear/Editar Orden de Trabajo — la pantalla donde recepcionistas ingresan datos del paciente, seleccionan pruebas, ven precios, y crean la orden + factura.

Esta pantalla tiene 3 secciones principales:
1. **Datos del Paciente** (búsqueda + captura)
2. **Datos de la Orden** (procedencia, médico, departamento)
3. **Selección de Pruebas** (buscador + árbol + muestras + precios)

Y al final: **Guardar y Cobrar** → genera factura.

## Referencia Visual (ASCII mockup)

```
┌─────────────────────────────────────────────────────────────┐
│ labsis                                            [avatar]  │
├─────────────────────────────────────────────────────────────┤
│                  Ordenes de Trabajo : Crear                 │
├─────────────────────────────────────────────────────────────┤
│ ┌─ DATOS DEL PACIENTE ──────────────────────────────────┐   │
│ │ ID Paciente [DEOAN440326 ] │ Apellido(s) [DE LA O   ] │   │
│ │ 2do.Apellido [           ] │ Nombre    [ALEJANDRA   ] │   │
│ │ e-mail [alejandra@mail.com] │ Sexo [F ▾] │ Edad [81] │   │
│ │ F.Nacimiento [26/03/1944 ] │ Teléfono  [555-1234   ] │   │
│ └────────────────────────────────────────────────────────┘   │
│ ┌─ DATOS DE LA ORDEN ───────────────────────────────────┐   │
│ │ Procedencia* [Ambulatorio      ▾] │ STAT □             │   │
│ │ Servicio Médico [Consulta___________]                   │   │
│ │ ┌ MÉDICO ─────────────────────────────────────────────┐ │   │
│ │ │ Dr. JUAN PEREZ LOPEZ                   [🔍Cambiar] │ │   │
│ │ │ Email: drjuan@mail.com  Tel: 555-5678              │ │   │
│ │ └─────────────────────────────────────────────────────┘ │   │
│ └────────────────────────────────────────────────────────┘   │
│ ┌─ PRUEBAS ─────────────────────────────────────────────┐   │
│ │ Buscar: [Glucosa________🔍]                            │   │
│ │                                                        │   │
│ │ ┌ Estructura (5) ────┐ ┌ Muestras ────────────────┐  │   │
│ │ │ 📁 Química Clínica  │ │ ▮▮▮▮ 260303-01          │  │   │
│ │ │   ├ Glucosa     ✕  │ │ Tubo rojo │ Sangre      │  │   │
│ │ │   ├ Colesterol  ✕  │ │                          │  │   │
│ │ │   └ Triglicéridos✕ │ │ ▮▮▮▮ 260303-02          │  │   │
│ │ │ 📁 Hematología      │ │ Tubo lila │ Sangre      │  │   │
│ │ │   └ BHC         ✕  │ └──────────────────────────┘  │   │
│ │ └────────────────────┘                                │   │
│ │                            Lista Precios: Ambulatorio │   │
│ │                            Precio: $1,250.00          │   │
│ │                            IVA:    $200.00            │   │
│ │                            Total:  $1,450.00          │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                             │
│ [Cancelar]              [Guardar] [Guardar y Cobrar →]      │
└─────────────────────────────────────────────────────────────┘
```

## Base de datos — Tablas involucradas

### paciente (crear/editar paciente)
- id (serial PK)
- ci_paciente (varchar 30) — ID/CI/CURP del paciente
- nombre (varchar 60), apellido (varchar 60), apellido_segundo (varchar 60)
- fecha_nacimiento (date), sexo (char 1: 'M'/'F')
- email (varchar 200), telefono (varchar 30), telefono_celular (varchar 30)
- ci_representante (varchar 30) — condicional
- ci_rfc (varchar 30) — condicional (RFC México)
- num_historia (varchar 30) — condicional (historia médica)
- raza (varchar 20) — default 'Indefinido'
- activo (boolean) — default true
- acceso_id (varchar) — generado: 'pre$'+paciente.id
- Búsqueda: getPacienteOldPrioridadActivo() busca primero CI activo, luego CI inactivo, luego sin CI, luego numHistoria

### orden_trabajo (113 columnas)
- id (serial PK), numero (varchar 20 UNIQUE — auto-generado por trigger)
- fecha (timestamp, default now()), paciente_id (FK)
- procedencia_id (FK procedencia), procedencia (varchar 40, nombre legacy)
- servicio_id (FK servicio/lista_precios)
- servicio_medico_id (FK servicio_medico)
- departamento_laboratorio_id (FK), centro_atencion_paciente_id (FK)
- medico_id (FK medico), medico (varchar 300, nombre legacy)
- medico_dos_id (FK medico) — condicional
- habitacion (varchar 15)
- num_ingreso (varchar 30), num_episodio (varchar 20)
- stat (boolean, default false), embarazada (boolean, default false)
- semanas_embarazo (integer, default 0)
- status_id (FK status_orden) — inicial: 1 (Activo)
- precio (numeric 16,2) — recalculado por trigger en accion_log
- usuario_id (FK usuario), factura_id (FK factura)
- observaciones (text), informacion_clinica (text)
- temporal (boolean, default false)
- send_mail (boolean), send_mail_doctor (boolean)
- descuento_porcentaje (numeric 5,2), descuento_monto (numeric 10,2)
- moneda_id (FK), tipo_cambio (numeric 12,4)
- etiquetas_impresas (boolean, default false)
- toma_muestra_completa (boolean, default false)
- **Trigger:** generar_ot_numero_after_insert genera numero YYMMDD#### automáticamente

### prueba_orden (junction OT↔Prueba)
- id (serial PK), prueba_id (FK prueba), orden_id (FK orden_trabajo)
- status_id (FK status_orden) — inicial: 1
- gp_id (FK grupo_prueba) — null si prueba individual
- gp_orden_id (FK gprueba_orden) — referencia al GP padre
- area_id (FK area)
- precio (numeric 16,2 NOT NULL)
- precio_sin_descuento (numeric 10,2)
- descuento_porcentaje (numeric 5,2), descuento_monto (numeric 10,2)
- fecha_creacion (timestamp)

### gprueba_orden (junction OT↔GrupoPrueba)
- id (serial PK), orden_id (FK orden_trabajo), gp_id (FK grupo_prueba)
- precio (numeric 16,2 NOT NULL)
- gp_orden_id (integer) — para GPs anidados (bacteriología)
- gp_auxiliar (boolean, default false)
- descuento_porcentaje (numeric 5,2), descuento_monto (numeric 10,2)

### grupo_prueba (catálogo de GPs)
- id, nombre, codigo, activo, area_id (FK)
- tipo_gp_id: BACT (bacteriología), normal
- Relación M:N con prueba via `grupo_prueba_has_prueba` (grupo_prueba_id, prueba_id, orden int)

### prueba (catálogo de pruebas)
- id, nombre, codigo, orden (int, para ordenar)
- tipo_prueba_id (FK): NUM, ALF, CAL, SEL, TXT
- unidad_id (FK unidad), metodo_id (FK metodo)
- area_id (FK area)
- precio (numeric) — precio base

### muestra (muestras generadas)
- id (serial PK), orden_id (FK orden_trabajo)
- tipo_muestra_id (FK tipo_muestra)
- tipo_contenedor_id (FK tipo_contenedor)
- barcode (varchar) — formato: numero_orden + '-' + correlativo 2 dígitos
- gprueba_orden_id (FK)

### tipo_contenedor
- id, nombre, codigo, color (varchar) — color CSS del tubo

### tipo_muestra
- id, nombre, codigo

### procedencia
- id, nombre (varchar 100 UNIQUE), codigo, activo (boolean)
- emergencia (boolean), muestra_referida (boolean)
- pago_obligatorio_impresion (boolean)
- ingreso_obligatorio (boolean) — obliga num_ingreso
- medico_obligatorio (boolean)
- servicio_id (FK) — lista de precios asociada a esta procedencia
- fecha_operacion_obligatorio (boolean)

### medico
- id (serial PK), nombre (varchar 200), apellido_paterno (varchar 100), apellido_materno (varchar 100)
- id_profesional (varchar 20 NOT NULL) — cédula profesional
- email (varchar 100), telefono (varchar 30), celular (varchar 30)
- especialidad (varchar 50)
- validado (boolean, default false), activo (boolean, default true)

### lista_precios / lista_precios_has_prueba / lista_precios_has_gprueba
- lista_precios: id, nombre, activo, moneda_id
- lista_precios_has_prueba: id, lista_precios_id (FK), prueba_id (FK), precio (numeric)
- lista_precios_has_gprueba: id, lista_precios_id (FK), grupo_prueba_id (FK), precio (numeric)

### servicio_medico
- id, nombre, codigo, emergencia, activo
- ingreso_toma_muestra, muestra_referida

### departamento_laboratorio (solo 1 en EG)
- id, nombre_dpto, codigo, procesa, telefono

### centro_atencion_paciente (CAP)
- id, nombre, codigo
- EG tiene: id=1 "Elizabeth Gutierrez" (EG), id=2 "EG CREDITO" (EGC)

### caja (sistema de cajas por IP)
- id, ip, centro_atencion_paciente_id, activo, usuario_id
- 70 cajas en EG

### factura
- id (serial PK), numero (varchar), fecha (timestamp, default now())
- orden_trabajo_id (FK — nullable, se vincula después)
- paciente_id (FK), procedencia_id (FK)
- subtotal (numeric 16,2), iva (numeric 16,2), total (numeric 16,2)
- descuento_porcentaje (numeric 5,2), descuento_monto (numeric 10,2)
- status_id (FK): 1=Pendiente, 3=Pagada
- moneda_id (FK), tipo_cambio (numeric)
- caja_id (FK), usuario_id (FK), centro_atencion_paciente_id (FK)
- observaciones (text), tipo_factura (varchar)
- factura_fiscal (boolean)

### item_factura
- id (serial PK), factura_id (FK)
- descripcion (varchar), cantidad (integer), precio_unitario (numeric)
- subtotal (numeric), descuento (numeric)
- prueba_id (FK), grupo_prueba_id (FK) — uno u otro

### factura_pago
- id (serial PK), factura_id (FK)
- monto (numeric 16,2), tipo_pago_id (FK)
- referencia (varchar), fecha (timestamp)

### tipo_pago
- id, nombre, codigo, activo
- Tipos comunes: Efectivo, Tarjeta, Transferencia

### accion_log (para trigger de recálculo de precio)
- id (serial PK), orden_trabajo_id (FK)
- accion (varchar) — 'CREACION ORDEN DE TRABAJO', 'EDICION OT', etc.
- fecha (timestamp), usuario_id (FK)
- El trigger `updateprecioordentrabajo()` se ejecuta cuando accion contiene 'CREACION ORDEN'
- Calcula: SUM(prueba_orden.precio WHERE gp_id IS NULL) + SUM(gprueba_orden.precio WHERE gp_orden_id IS NULL)
- UPDATE orden_trabajo SET precio = total

### status_orden (estados de la OT)
| id | status | color |
|----|--------|-------|
| 1 | Activo (inicial) | #d44836 |
| 2 | Iniciada | #ffa500 |
| 4 | Validado | #63981f |
| 6 | Abortada | #000000 |

## Archivos a CREAR

### 1. server/routes/ot-edit.js (NUEVO archivo de rutas)

```js
import { Router } from 'express'
import pool from '../db.js'

const router = Router()

// ═══ GET /api/ot/edit/new ═══
// Datos para crear nueva OT. Recibe ?pacienteId=X (opcional)
// Devuelve: procedencias, departamentos, CAPs, paciente (si id), lista precios default
router.get('/edit/new', async (req, res) => {
  try {
    const { pacienteId } = req.query

    // Procedencias activas
    const procResult = await pool.query(`
      SELECT p.id, p.nombre, p.codigo, p.emergencia, p.servicio_id,
             p.ingreso_obligatorio, p.medico_obligatorio, p.pago_obligatorio_impresion,
             p.muestra_referida,
             s.nombre AS servicio_nombre
      FROM procedencia p
      LEFT JOIN servicio s ON p.servicio_id = s.id
      WHERE p.activo = true
      ORDER BY p.nombre
    `)

    // Departamentos
    const dptoResult = await pool.query(`
      SELECT id, nombre_dpto AS nombre, codigo
      FROM departamento_laboratorio
      WHERE procesa = true
      ORDER BY nombre_dpto
    `)

    // CAPs
    const capResult = await pool.query(`
      SELECT id, nombre, codigo FROM centro_atencion_paciente WHERE activo = true ORDER BY nombre
    `)

    // Paciente (si viene ID)
    let paciente = null
    if (pacienteId) {
      const pacResult = await pool.query(`
        SELECT id, ci_paciente, nombre, apellido, apellido_segundo,
               fecha_nacimiento, sexo, email, telefono, telefono_celular,
               ci_representante, ci_rfc, num_historia
        FROM paciente WHERE id = $1
      `, [pacienteId])
      if (pacResult.rows.length) paciente = pacResult.rows[0]
    }

    // Tipos de pago activos
    const tpResult = await pool.query(`
      SELECT id, nombre, codigo FROM tipo_pago WHERE activo = true ORDER BY nombre
    `)

    res.json({
      procedencias: procResult.rows,
      departamentos: dptoResult.rows,
      caps: capResult.rows,
      paciente,
      tiposPago: tpResult.rows
    })
  } catch (err) {
    console.error('GET /ot/edit/new error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ GET /api/ot/search-pruebas?q=gluc&servicioId=23 ═══
// Busca pruebas Y grupos de prueba activos, con precios de la lista asociada al servicio
router.get('/search-pruebas', async (req, res) => {
  try {
    const { q, servicioId } = req.query
    if (!q || q.length < 2) return res.json([])

    const searchTerm = `%${q}%`

    // Pruebas individuales
    const pruebasResult = await pool.query(`
      SELECT p.id, p.nombre, p.codigo, 'PRUEBA' AS tipo,
             a.area AS area_nombre,
             tp.codigo AS tipo_prueba,
             COALESCE(lpp.precio, p.precio) AS precio
      FROM prueba p
      LEFT JOIN area a ON p.area_id = a.id
      LEFT JOIN tipo_prueba tp ON p.tipo_prueba_id = tp.id
      LEFT JOIN lista_precios_has_prueba lpp ON lpp.prueba_id = p.id
        AND lpp.lista_precios_id = (SELECT servicio_id FROM procedencia WHERE servicio_id IS NOT NULL LIMIT 1)
      WHERE p.activo = true
        AND (sin_acentos(p.nombre) ILIKE sin_acentos($1) OR p.codigo ILIKE $1)
      ORDER BY p.nombre
      LIMIT 20
    `, [searchTerm])

    // Grupos de prueba
    const gpsResult = await pool.query(`
      SELECT gp.id, gp.nombre, gp.codigo, 'GP' AS tipo,
             a.area AS area_nombre,
             COALESCE(lpg.precio, 0) AS precio
      FROM grupo_prueba gp
      LEFT JOIN area a ON gp.area_id = a.id
      LEFT JOIN lista_precios_has_gprueba lpg ON lpg.grupo_prueba_id = gp.id
        AND lpg.lista_precios_id = (SELECT servicio_id FROM procedencia WHERE servicio_id IS NOT NULL LIMIT 1)
      WHERE gp.activo = true
        AND (sin_acentos(gp.nombre) ILIKE sin_acentos($1) OR gp.codigo ILIKE $1)
      ORDER BY gp.nombre
      LIMIT 10
    `, [searchTerm])

    res.json([...gpsResult.rows, ...pruebasResult.rows])
  } catch (err) {
    console.error('GET /ot/search-pruebas error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ GET /api/ot/grupo-prueba/:id/pruebas ═══
// Obtener las pruebas de un GP (para expandir en el árbol)
router.get('/grupo-prueba/:id/pruebas', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(`
      SELECT p.id, p.nombre, p.codigo, p.orden,
             a.area AS area_nombre,
             tp.codigo AS tipo_prueba
      FROM grupo_prueba_has_prueba gphp
      JOIN prueba p ON gphp.prueba_id = p.id
      LEFT JOIN area a ON p.area_id = a.id
      LEFT JOIN tipo_prueba tp ON p.tipo_prueba_id = tp.id
      WHERE gphp.grupo_prueba_id = $1
      ORDER BY gphp.orden, p.nombre
    `, [id])
    res.json(result.rows)
  } catch (err) {
    console.error('GET /ot/grupo-prueba/:id/pruebas error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ GET /api/ot/search-medicos?q=perez ═══
router.get('/search-medicos', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 2) return res.json([])
    const searchTerm = `%${q}%`

    const result = await pool.query(`
      SELECT id, nombre, apellido_paterno, apellido_materno,
             id_profesional, email, telefono, celular, especialidad
      FROM medico
      WHERE activo = true
        AND (sin_acentos(nombre) ILIKE sin_acentos($1)
          OR sin_acentos(apellido_paterno) ILIKE sin_acentos($1)
          OR email ILIKE $1
          OR id_profesional ILIKE $1)
      ORDER BY apellido_paterno, nombre
      LIMIT 15
    `, [searchTerm])
    res.json(result.rows)
  } catch (err) {
    console.error('GET /ot/search-medicos error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ POST /api/ot/medicos — Crear médico nuevo ═══
router.post('/medicos', async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, id_profesional, email, telefono, celular, especialidad } = req.body
    if (!nombre || !id_profesional) return res.status(400).json({ error: 'Nombre e ID profesional son obligatorios' })

    const result = await pool.query(`
      INSERT INTO medico (nombre, apellido_paterno, apellido_materno, id_profesional, email, telefono, celular, especialidad, activo, validado)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, false)
      RETURNING *
    `, [nombre, apellido_paterno || '', apellido_materno || '', id_profesional, email || '', telefono || '', celular || '', especialidad || ''])

    res.json(result.rows[0])
  } catch (err) {
    console.error('POST /ot/medicos error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ GET /api/ot/search-pacientes?q=DEOAN ═══
router.get('/search-pacientes', async (req, res) => {
  try {
    const { q } = req.query
    if (!q || q.length < 2) return res.json([])
    const searchTerm = `%${q}%`

    const result = await pool.query(`
      SELECT id, ci_paciente, nombre, apellido, apellido_segundo,
             fecha_nacimiento, sexo, email, telefono
      FROM paciente
      WHERE activo = true
        AND (ci_paciente ILIKE $1
          OR sin_acentos(nombre || ' ' || apellido) ILIKE sin_acentos($1))
      ORDER BY apellido, nombre
      LIMIT 15
    `, [searchTerm])
    res.json(result.rows)
  } catch (err) {
    console.error('GET /ot/search-pacientes error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ GET /api/ot/precios?servicioId=X&pruebaIds=1,2,3&gpIds=4,5 ═══
// Obtener precios de una lista de pruebas/GPs para un servicio específico
router.get('/precios', async (req, res) => {
  try {
    const { servicioId, pruebaIds, gpIds } = req.query
    const pruebaIdArr = pruebaIds ? pruebaIds.split(',').map(Number).filter(Boolean) : []
    const gpIdArr = gpIds ? gpIds.split(',').map(Number).filter(Boolean) : []

    let preciosPruebas = []
    let preciosGps = []

    if (pruebaIdArr.length > 0) {
      const result = await pool.query(`
        SELECT p.id, p.nombre,
               COALESCE(lpp.precio, p.precio, 0) AS precio
        FROM prueba p
        LEFT JOIN lista_precios_has_prueba lpp ON lpp.prueba_id = p.id AND lpp.lista_precios_id = $1
        WHERE p.id = ANY($2)
      `, [servicioId || null, pruebaIdArr])
      preciosPruebas = result.rows
    }

    if (gpIdArr.length > 0) {
      const result = await pool.query(`
        SELECT gp.id, gp.nombre,
               COALESCE(lpg.precio, 0) AS precio
        FROM grupo_prueba gp
        LEFT JOIN lista_precios_has_gprueba lpg ON lpg.grupo_prueba_id = gp.id AND lpg.lista_precios_id = $1
        WHERE gp.id = ANY($2)
      `, [servicioId || null, gpIdArr])
      preciosGps = result.rows
    }

    res.json({ pruebas: preciosPruebas, gps: preciosGps })
  } catch (err) {
    console.error('GET /ot/precios error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ═══ POST /api/ot — CREAR ORDEN DE TRABAJO ═══
// Transacción completa: paciente → OT → prueba_orden → gprueba_orden → muestras → accion_log
router.post('/', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const {
      paciente,        // { ci_paciente, nombre, apellido, apellido_segundo, sexo, fecha_nacimiento, email, telefono, ... }
      orden,           // { procedencia_id, servicio_medico_id, departamento_id, cap_id, medico_id, stat, num_ingreso, num_episodio, ... }
      pruebas,         // [{ prueba_id, precio, gp_id? }]  — pruebas individuales
      gruposPrueba,    // [{ gp_id, precio, pruebas: [{ prueba_id, precio }] }]
      // usuario_id se obtiene de req.user cuando auth esté implementado
    } = req.body

    // 1. Buscar o crear paciente
    let pacienteId
    if (paciente.id) {
      // Actualizar paciente existente
      await client.query(`
        UPDATE paciente SET
          nombre = $2, apellido = $3, apellido_segundo = $4,
          sexo = $5, fecha_nacimiento = $6, email = $7,
          telefono = $8, telefono_celular = $9,
          ci_representante = $10, ci_rfc = $11, activo = true
        WHERE id = $1
      `, [
        paciente.id, paciente.nombre, paciente.apellido, paciente.apellido_segundo || '',
        paciente.sexo, paciente.fecha_nacimiento || null, paciente.email || '',
        paciente.telefono || '', paciente.telefono_celular || '',
        paciente.ci_representante || '', paciente.ci_rfc || ''
      ])
      pacienteId = paciente.id
    } else {
      // Buscar por CI primero
      let existing = null
      if (paciente.ci_paciente) {
        const search = await client.query(
          'SELECT id FROM paciente WHERE ci_paciente = $1 AND activo = true LIMIT 1',
          [paciente.ci_paciente]
        )
        if (search.rows.length) existing = search.rows[0]
      }
      if (existing) {
        pacienteId = existing.id
        await client.query(`
          UPDATE paciente SET
            nombre = $2, apellido = $3, apellido_segundo = $4,
            sexo = $5, fecha_nacimiento = $6, email = $7,
            telefono = $8, activo = true
          WHERE id = $1
        `, [pacienteId, paciente.nombre, paciente.apellido, paciente.apellido_segundo || '',
            paciente.sexo, paciente.fecha_nacimiento || null, paciente.email || '',
            paciente.telefono || ''])
      } else {
        const insertPac = await client.query(`
          INSERT INTO paciente (ci_paciente, nombre, apellido, apellido_segundo, sexo, fecha_nacimiento, email, telefono, telefono_celular, raza, activo)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Indefinido', true)
          RETURNING id
        `, [
          paciente.ci_paciente || '', paciente.nombre, paciente.apellido,
          paciente.apellido_segundo || '', paciente.sexo,
          paciente.fecha_nacimiento || null, paciente.email || '',
          paciente.telefono || '', paciente.telefono_celular || ''
        ])
        pacienteId = insertPac.rows[0].id
        // Generar acceso_id
        await client.query(
          `UPDATE paciente SET acceso_id = $1 WHERE id = $2`,
          [`pre$${pacienteId}`, pacienteId]
        )
      }
    }

    // 2. Obtener nombre procedencia + nombre médico para campos legacy
    let procNombre = ''
    if (orden.procedencia_id) {
      const pr = await client.query('SELECT nombre FROM procedencia WHERE id = $1', [orden.procedencia_id])
      if (pr.rows.length) procNombre = pr.rows[0].nombre
    }
    let medicoNombre = ''
    if (orden.medico_id) {
      const md = await client.query(`SELECT nombre || ' ' || COALESCE(apellido_paterno,'') || ' ' || COALESCE(apellido_materno,'') AS full_name FROM medico WHERE id = $1`, [orden.medico_id])
      if (md.rows.length) medicoNombre = md.rows[0].full_name.trim()
    }

    // 3. Insertar orden_trabajo
    const otResult = await client.query(`
      INSERT INTO orden_trabajo (
        paciente_id, procedencia_id, procedencia,
        servicio_medico_id, departamento_laboratorio_id,
        centro_atencion_paciente_id, servicio_id,
        medico_id, medico,
        stat, num_ingreso, num_episodio,
        status_id, precio, fecha,
        embarazada, semanas_embarazo,
        observaciones, informacion_clinica,
        send_mail_doctor
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9,
        $10, $11, $12, 1, 0, NOW(),
        $13, $14, $15, $16, $17
      ) RETURNING id, numero
    `, [
      pacienteId,
      orden.procedencia_id || null, procNombre,
      orden.servicio_medico_id || null,
      orden.departamento_id || null,
      orden.cap_id || null,
      orden.servicio_id || null,
      orden.medico_id || null, medicoNombre,
      orden.stat || false,
      orden.num_ingreso || '', orden.num_episodio || '',
      orden.embarazada || false, orden.semanas_embarazo || 0,
      orden.observaciones || '', orden.informacion_clinica || '',
      orden.send_mail_doctor || false
    ])

    const otId = otResult.rows[0].id
    // El numero se genera por trigger — leerlo después del insert
    const otNumResult = await client.query('SELECT numero FROM orden_trabajo WHERE id = $1', [otId])
    const otNumero = otNumResult.rows[0].numero

    // 4. Insertar gprueba_orden + prueba_orden para cada GP
    for (const gp of (gruposPrueba || [])) {
      const gpOrdenResult = await client.query(`
        INSERT INTO gprueba_orden (orden_id, gp_id, precio, gp_auxiliar)
        VALUES ($1, $2, $3, false) RETURNING id
      `, [otId, gp.gp_id, gp.precio || 0])
      const gpOrdenId = gpOrdenResult.rows[0].id

      // Pruebas del GP
      for (const pr of (gp.pruebas || [])) {
        await client.query(`
          INSERT INTO prueba_orden (prueba_id, orden_id, status_id, gp_id, gp_orden_id, area_id, precio, fecha_creacion)
          VALUES ($1, $2, 1, $3, $4, (SELECT area_id FROM prueba WHERE id = $1), $5, NOW())
        `, [pr.prueba_id, otId, gp.gp_id, gpOrdenId, pr.precio || 0])
      }
    }

    // 5. Insertar prueba_orden para pruebas individuales
    for (const pr of (pruebas || [])) {
      await client.query(`
        INSERT INTO prueba_orden (prueba_id, orden_id, status_id, area_id, precio, fecha_creacion)
        VALUES ($1, $2, 1, (SELECT area_id FROM prueba WHERE id = $1), $3, NOW())
      `, [pr.prueba_id, otId, pr.precio || 0])
    }

    // 6. Generar muestras (agrupar por tipo_muestra + tipo_contenedor)
    const muestrasQuery = await client.query(`
      SELECT DISTINCT p.tipo_muestra_id, p.tipo_contenedor_id, po.gp_orden_id
      FROM prueba_orden po
      JOIN prueba p ON po.prueba_id = p.id
      WHERE po.orden_id = $1 AND p.tipo_muestra_id IS NOT NULL
    `, [otId])

    let muestraCorrelativo = 1
    for (const m of muestrasQuery.rows) {
      const barcode = `${otNumero}-${String(muestraCorrelativo).padStart(2, '0')}`
      await client.query(`
        INSERT INTO muestra (orden_id, tipo_muestra_id, tipo_contenedor_id, barcode, gprueba_orden_id)
        VALUES ($1, $2, $3, $4, $5)
      `, [otId, m.tipo_muestra_id, m.tipo_contenedor_id, barcode, m.gp_orden_id || null])
      muestraCorrelativo++
    }

    // 7. Accion_log (dispara trigger de recálculo de precio)
    await client.query(`
      INSERT INTO accion_log (orden_trabajo_id, accion, fecha)
      VALUES ($1, 'CREACION ORDEN DE TRABAJO', NOW())
    `, [otId])

    await client.query('COMMIT')

    // Leer numero final (el trigger puede haberlo modificado)
    const finalOT = await pool.query('SELECT numero, precio FROM orden_trabajo WHERE id = $1', [otId])

    res.json({
      ok: true,
      orden: { id: otId, numero: finalOT.rows[0].numero, precio: finalOT.rows[0].precio }
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /ot error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ═══ POST /api/ot/:numero/facturar — Crear factura para OT existente ═══
router.post('/:numero/facturar', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { numero } = req.params
    const { tiposPago } = req.body  // [{ tipo_pago_id, monto, referencia }]

    // Obtener OT
    const otResult = await client.query(`
      SELECT ot.id, ot.precio, ot.paciente_id, ot.procedencia_id,
             ot.centro_atencion_paciente_id, ot.factura_id
      FROM orden_trabajo ot WHERE ot.numero = $1
    `, [numero])
    if (!otResult.rows.length) return res.status(404).json({ error: 'Orden no encontrada' })
    const ot = otResult.rows[0]

    if (ot.factura_id) return res.status(400).json({ error: 'Orden ya tiene factura' })

    // Crear factura
    const factResult = await client.query(`
      INSERT INTO factura (
        paciente_id, procedencia_id, centro_atencion_paciente_id,
        subtotal, iva, total,
        status_id, fecha, tipo_factura
      ) VALUES ($1, $2, $3, $4, 0, $4, 3, NOW(), 'factura_EG_html')
      RETURNING id, numero
    `, [ot.paciente_id, ot.procedencia_id, ot.centro_atencion_paciente_id, ot.precio])
    const factId = factResult.rows[0].id

    // Vincular factura a OT
    await client.query('UPDATE orden_trabajo SET factura_id = $1 WHERE id = $2', [factId, ot.id])

    // Items de factura (pruebas individuales + GPs)
    const pruebasIndiv = await client.query(`
      SELECT po.id, p.nombre, po.precio
      FROM prueba_orden po
      JOIN prueba p ON po.prueba_id = p.id
      WHERE po.orden_id = $1 AND po.gp_id IS NULL
    `, [ot.id])
    for (const pr of pruebasIndiv.rows) {
      await client.query(`
        INSERT INTO item_factura (factura_id, descripcion, cantidad, precio_unitario, subtotal, prueba_id)
        VALUES ($1, $2, 1, $3, $3, $4)
      `, [factId, pr.nombre, pr.precio, pr.id])
    }

    const gps = await client.query(`
      SELECT go.id, gp.nombre, go.precio, go.gp_id
      FROM gprueba_orden go
      JOIN grupo_prueba gp ON go.gp_id = gp.id
      WHERE go.orden_id = $1 AND go.gp_orden_id IS NULL
    `, [ot.id])
    for (const gp of gps.rows) {
      await client.query(`
        INSERT INTO item_factura (factura_id, descripcion, cantidad, precio_unitario, subtotal, grupo_prueba_id)
        VALUES ($1, $2, 1, $3, $3, $4)
      `, [factId, gp.nombre, gp.precio, gp.gp_id])
    }

    // Registrar pagos
    for (const pago of (tiposPago || [])) {
      await client.query(`
        INSERT INTO factura_pago (factura_id, monto, tipo_pago_id, referencia, fecha)
        VALUES ($1, $2, $3, $4, NOW())
      `, [factId, pago.monto, pago.tipo_pago_id, pago.referencia || ''])
    }

    await client.query('COMMIT')

    res.json({
      ok: true,
      factura: { id: factId, numero: factResult.rows[0].numero }
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('POST /ot/:numero/facturar error:', err)
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

// ═══ GET /api/ot/factura/:numero — Datos de factura de una OT ═══
router.get('/factura/:numero', async (req, res) => {
  try {
    const { numero } = req.params
    const result = await pool.query(`
      SELECT f.*, ot.numero AS ot_numero,
             p.nombre || ' ' || p.apellido AS paciente_nombre, p.ci_paciente
      FROM orden_trabajo ot
      JOIN factura f ON ot.factura_id = f.id
      JOIN paciente p ON ot.paciente_id = p.id
      WHERE ot.numero = $1
    `, [numero])
    if (!result.rows.length) return res.status(404).json({ error: 'No tiene factura' })

    const factId = result.rows[0].id
    const items = await pool.query('SELECT * FROM item_factura WHERE factura_id = $1', [factId])
    const pagos = await pool.query(`
      SELECT fp.*, tp.nombre AS tipo_pago_nombre
      FROM factura_pago fp
      LEFT JOIN tipo_pago tp ON fp.tipo_pago_id = tp.id
      WHERE fp.factura_id = $1
    `, [factId])

    res.json({
      factura: result.rows[0],
      items: items.rows,
      pagos: pagos.rows
    })
  } catch (err) {
    console.error('GET /ot/factura/:numero error:', err)
    res.status(500).json({ error: err.message })
  }
})

export default router
```

### 2. src/pages/OTEditPage.jsx (NUEVA página React)

**Estructura del componente:**
```jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getOTEditNew, searchPruebas, getGPPruebas, searchMedicos, crearMedico,
         searchPacientes, crearOT, facturarOT, getPrecios } from '../services/api'

export default function OTEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pacienteIdParam = searchParams.get('pacienteId')

  // ── State ──
  const [initData, setInitData] = useState(null)     // { procedencias, departamentos, caps, tiposPago }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Paciente
  const [paciente, setPaciente] = useState({
    id: null, ci_paciente: '', nombre: '', apellido: '', apellido_segundo: '',
    sexo: 'M', fecha_nacimiento: '', email: '', telefono: '', telefono_celular: ''
  })
  const [pacienteSearch, setPacienteSearch] = useState('')
  const [pacienteSuggestions, setPacienteSuggestions] = useState([])

  // Orden
  const [orden, setOrden] = useState({
    procedencia_id: null, servicio_medico_id: null, departamento_id: null,
    cap_id: null, medico_id: null, stat: false, num_ingreso: '', num_episodio: '',
    embarazada: false, semanas_embarazo: 0, servicio_id: null
  })
  const [medico, setMedico] = useState(null)

  // Pruebas seleccionadas
  const [selectedPruebas, setSelectedPruebas] = useState([])   // [{ id, nombre, tipo:'PRUEBA', precio, area }]
  const [selectedGPs, setSelectedGPs] = useState([])            // [{ id, nombre, tipo:'GP', precio, pruebas:[], area }]
  const [searchQ, setSearchQ] = useState('')
  const [suggestions, setSuggestions] = useState([])

  // Precios
  const [precioTotal, setPrecioTotal] = useState(0)

  // ── Init ──
  useEffect(() => {
    getOTEditNew(pacienteIdParam).then(data => {
      setInitData(data)
      if (data.paciente) {
        setPaciente({ ...data.paciente })
      }
    }).finally(() => setLoading(false))
  }, [])

  // ── Recalcular precios cuando cambian pruebas ──
  useEffect(() => {
    const total = selectedPruebas.reduce((sum, p) => sum + (p.precio || 0), 0)
                + selectedGPs.reduce((sum, g) => sum + (g.precio || 0), 0)
    setPrecioTotal(total)
  }, [selectedPruebas, selectedGPs])

  // ── Buscar pruebas ──
  useEffect(() => {
    if (searchQ.length < 2) { setSuggestions([]); return }
    const timer = setTimeout(() => {
      searchPruebas(searchQ, orden.servicio_id).then(setSuggestions)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQ])

  // ── Agregar prueba/GP ──
  const addItem = async (item) => {
    if (item.tipo === 'GP') {
      if (selectedGPs.some(g => g.id === item.id)) return  // ya existe
      const pruebas = await getGPPruebas(item.id)
      setSelectedGPs(prev => [...prev, { ...item, pruebas }])
    } else {
      if (selectedPruebas.some(p => p.id === item.id)) return
      setSelectedPruebas(prev => [...prev, item])
    }
    setSearchQ('')
    setSuggestions([])
  }

  // ── Quitar prueba/GP ──
  const removeItem = (id, tipo) => {
    if (tipo === 'GP') setSelectedGPs(prev => prev.filter(g => g.id !== id))
    else setSelectedPruebas(prev => prev.filter(p => p.id !== id))
  }

  // ── Cambiar procedencia → actualizar servicio/lista precios ──
  const handleProcedenciaChange = (procId) => {
    const proc = initData?.procedencias.find(p => p.id === parseInt(procId))
    setOrden(prev => ({
      ...prev,
      procedencia_id: parseInt(procId) || null,
      servicio_id: proc?.servicio_id || null
    }))
  }

  // ── Guardar OT ──
  const handleGuardar = async (facturar = false) => {
    // Validaciones
    if (!paciente.nombre || !paciente.apellido) return alert('Nombre y apellido del paciente son obligatorios')
    if (!orden.procedencia_id) return alert('Procedencia es obligatoria')
    if (selectedPruebas.length === 0 && selectedGPs.length === 0) return alert('Debe seleccionar al menos una prueba')

    setSaving(true)
    try {
      const body = {
        paciente,
        orden,
        pruebas: selectedPruebas.map(p => ({ prueba_id: p.id, precio: p.precio || 0 })),
        gruposPrueba: selectedGPs.map(g => ({
          gp_id: g.id,
          precio: g.precio || 0,
          pruebas: g.pruebas.map(p => ({ prueba_id: p.id, precio: 0 }))
        }))
      }

      const result = await crearOT(body)

      if (facturar && result.orden?.numero) {
        // Redirigir a pantalla de cobro (o facturar directo)
        navigate(`/ordenes/${result.orden.numero}/factura`)
      } else {
        navigate(`/ordenes`)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="ot-shell"><div className="ot-loading">Cargando...</div></div>

  // ── Render ──
  return (
    <div className="ot-shell">
      <nav className="app-navbar">
        <span className="nav-brand">lab<em>sis</em></span>
        <span className="nav-divider" />
        <button className="ot-back-btn" onClick={() => navigate('/ordenes')}>← Órdenes</button>
        <span className="nav-title">Crear Orden de Trabajo</span>
      </nav>

      <main className="ot-content" style={{ padding: '16px 24px' }}>

        {/* ═══ SECCIÓN 1: DATOS DEL PACIENTE ═══ */}
        <section className="ote-section">
          <h3 className="ote-section-title">Datos del Paciente</h3>
          <div className="ote-patient-grid">
            {/* Búsqueda de paciente por CI */}
            <div className="ote-field">
              <label className="ote-label">ID Paciente</label>
              <input className="ote-input" value={paciente.ci_paciente}
                onChange={e => setPaciente(prev => ({ ...prev, ci_paciente: e.target.value }))}
                placeholder="CI / CURP / RFC" />
            </div>
            <div className="ote-field">
              <label className="ote-label">Apellido(s)</label>
              <input className="ote-input" value={paciente.apellido}
                onChange={e => setPaciente(prev => ({ ...prev, apellido: e.target.value }))} />
            </div>
            <div className="ote-field">
              <label className="ote-label">2do Apellido</label>
              <input className="ote-input" value={paciente.apellido_segundo}
                onChange={e => setPaciente(prev => ({ ...prev, apellido_segundo: e.target.value }))} />
            </div>
            <div className="ote-field">
              <label className="ote-label">Nombre</label>
              <input className="ote-input" value={paciente.nombre}
                onChange={e => setPaciente(prev => ({ ...prev, nombre: e.target.value }))} />
            </div>
            <div className="ote-field">
              <label className="ote-label">e-mail</label>
              <input className="ote-input" type="email" value={paciente.email}
                onChange={e => setPaciente(prev => ({ ...prev, email: e.target.value }))} />
            </div>
            <div className="ote-field ote-field-sm">
              <label className="ote-label">Sexo</label>
              <select className="ote-select" value={paciente.sexo}
                onChange={e => setPaciente(prev => ({ ...prev, sexo: e.target.value }))}>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
              </select>
            </div>
            <div className="ote-field ote-field-sm">
              <label className="ote-label">Edad</label>
              <input className="ote-input" type="number" placeholder="Años"
                readOnly value={paciente.fecha_nacimiento ? calcAge(paciente.fecha_nacimiento) : ''} />
            </div>
            <div className="ote-field">
              <label className="ote-label">F. Nacimiento</label>
              <input className="ote-input" type="date" value={paciente.fecha_nacimiento || ''}
                onChange={e => setPaciente(prev => ({ ...prev, fecha_nacimiento: e.target.value }))} />
            </div>
            <div className="ote-field">
              <label className="ote-label">Teléfono</label>
              <input className="ote-input" value={paciente.telefono}
                onChange={e => setPaciente(prev => ({ ...prev, telefono: e.target.value }))} />
            </div>
          </div>
        </section>

        {/* ═══ SECCIÓN 2: DATOS DE LA ORDEN ═══ */}
        <section className="ote-section">
          <h3 className="ote-section-title">Datos de la Orden</h3>
          <div className="ote-order-grid">
            <div className="ote-field">
              <label className="ote-label">Procedencia *</label>
              <select className="ote-select" value={orden.procedencia_id || ''}
                onChange={e => handleProcedenciaChange(e.target.value)}>
                <option value="">Seleccionar...</option>
                {initData?.procedencias.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div className="ote-field ote-field-sm">
              <label className="ote-label">STAT (Urgente)</label>
              <input type="checkbox" className="ote-checkbox"
                checked={orden.stat} onChange={e => setOrden(prev => ({ ...prev, stat: e.target.checked }))} />
            </div>
            {/* Médico card */}
            <div className="ote-field ote-field-full">
              <label className="ote-label">Médico</label>
              <div className="ote-medico-card">
                {medico ? (
                  <>
                    <span className="ote-medico-name">
                      {medico.nombre} {medico.apellido_paterno} {medico.apellido_materno}
                    </span>
                    <span className="ote-medico-meta">
                      {medico.email && `✉ ${medico.email}`}
                      {medico.telefono && ` | ☎ ${medico.telefono}`}
                    </span>
                    <button className="ote-btn-link" onClick={() => { setMedico(null); setOrden(prev => ({...prev, medico_id: null})) }}>
                      Cambiar
                    </button>
                  </>
                ) : (
                  <MedicoSearch onSelect={(m) => { setMedico(m); setOrden(prev => ({...prev, medico_id: m.id})) }} />
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ SECCIÓN 3: SELECCIÓN DE PRUEBAS ═══ */}
        <section className="ote-section">
          <h3 className="ote-section-title">
            Pruebas
            <span className="ote-count">{selectedPruebas.length + selectedGPs.length}</span>
          </h3>
          <div className="ote-tests-layout">
            {/* Columna izquierda: buscador + árbol */}
            <div className="ote-tests-left">
              <div className="ote-search-box">
                <input className="ote-input ote-search-input" placeholder="Buscar prueba o perfil..."
                  value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                {suggestions.length > 0 && (
                  <div className="ote-suggestions">
                    {suggestions.map(s => (
                      <div key={`${s.tipo}-${s.id}`} className="ote-suggestion-item"
                        onClick={() => addItem(s)}>
                        <span className={`ote-badge ${s.tipo === 'GP' ? 'ote-badge-gp' : 'ote-badge-pr'}`}>
                          {s.tipo === 'GP' ? 'GP' : 'PR'}
                        </span>
                        <span className="ote-suggestion-name">{s.nombre}</span>
                        <span className="ote-suggestion-area">{s.area_nombre}</span>
                        <span className="ote-suggestion-price">${Number(s.precio || 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Árbol de estructura */}
              <div className="ote-tree">
                {selectedGPs.map(gp => (
                  <div key={`gp-${gp.id}`} className="ote-tree-group">
                    <div className="ote-tree-header">
                      <span className="ote-tree-icon">📁</span>
                      <span className="ote-tree-name">{gp.nombre}</span>
                      <button className="ote-tree-remove" onClick={() => removeItem(gp.id, 'GP')}>✕</button>
                    </div>
                    {gp.pruebas?.map(p => (
                      <div key={`gp-${gp.id}-p-${p.id}`} className="ote-tree-item">
                        <span className="ote-tree-dash">├</span>
                        <span>{p.nombre}</span>
                      </div>
                    ))}
                  </div>
                ))}
                {selectedPruebas.map(p => (
                  <div key={`pr-${p.id}`} className="ote-tree-item ote-tree-root">
                    <span className="ote-tree-bullet">•</span>
                    <span>{p.nombre}</span>
                    <button className="ote-tree-remove" onClick={() => removeItem(p.id, 'PRUEBA')}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Columna derecha: precios */}
            <div className="ote-tests-right">
              <div className="ote-price-card">
                <div className="ote-price-row">
                  <span>Lista Precios:</span>
                  <span>{initData?.procedencias.find(p => p.id === orden.procedencia_id)?.servicio_nombre || 'Default'}</span>
                </div>
                <div className="ote-price-row ote-price-total">
                  <span>Total:</span>
                  <span>${precioTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ BOTONES DE ACCIÓN ═══ */}
        <div className="ote-actions">
          <button className="ot-btn" onClick={() => navigate('/ordenes')} disabled={saving}>
            Cancelar
          </button>
          <button className="ot-btn ot-btn-outline" onClick={() => handleGuardar(false)} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button className="ot-btn ot-btn-green" onClick={() => handleGuardar(true)} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar y Cobrar →'}
          </button>
        </div>
      </main>
    </div>
  )
}

// ── Subcomponente: búsqueda de médico ──
function MedicoSearch({ onSelect }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    if (q.length < 2) { setResults([]); return }
    const timer = setTimeout(() => searchMedicos(q).then(setResults), 300)
    return () => clearTimeout(timer)
  }, [q])

  if (showCreate) {
    return <MedicoCreateForm onCreated={(m) => { onSelect(m); setShowCreate(false) }}
                              onCancel={() => setShowCreate(false)} />
  }

  return (
    <div className="ote-medico-search">
      <input className="ote-input" placeholder="Buscar médico por nombre o cédula..."
        value={q} onChange={e => setQ(e.target.value)} />
      {results.length > 0 && (
        <div className="ote-suggestions">
          {results.map(m => (
            <div key={m.id} className="ote-suggestion-item" onClick={() => onSelect(m)}>
              <span>{m.nombre} {m.apellido_paterno} {m.apellido_materno}</span>
              <span className="ote-suggestion-area">{m.especialidad || ''}</span>
            </div>
          ))}
        </div>
      )}
      <button className="ote-btn-link" onClick={() => setShowCreate(true)}>+ Crear médico nuevo</button>
    </div>
  )
}

// ── Subcomponente: crear médico ──
function MedicoCreateForm({ onCreated, onCancel }) {
  const [form, setForm] = useState({
    nombre: '', apellido_paterno: '', apellido_materno: '',
    id_profesional: '', email: '', telefono: '', especialidad: ''
  })

  const handleSubmit = async () => {
    if (!form.nombre || !form.id_profesional) return alert('Nombre y cédula profesional obligatorios')
    const m = await crearMedico(form)
    onCreated(m)
  }

  return (
    <div className="ote-medico-create">
      <div className="ote-mini-grid">
        <input className="ote-input" placeholder="Nombre *" value={form.nombre}
          onChange={e => setForm(prev => ({...prev, nombre: e.target.value}))} />
        <input className="ote-input" placeholder="Ap. Paterno" value={form.apellido_paterno}
          onChange={e => setForm(prev => ({...prev, apellido_paterno: e.target.value}))} />
        <input className="ote-input" placeholder="Ap. Materno" value={form.apellido_materno}
          onChange={e => setForm(prev => ({...prev, apellido_materno: e.target.value}))} />
        <input className="ote-input" placeholder="Cédula Profesional *" value={form.id_profesional}
          onChange={e => setForm(prev => ({...prev, id_profesional: e.target.value}))} />
        <input className="ote-input" placeholder="Email" value={form.email}
          onChange={e => setForm(prev => ({...prev, email: e.target.value}))} />
        <input className="ote-input" placeholder="Teléfono" value={form.telefono}
          onChange={e => setForm(prev => ({...prev, telefono: e.target.value}))} />
      </div>
      <div className="ote-mini-actions">
        <button className="ot-btn ot-btn-sm" onClick={onCancel}>Cancelar</button>
        <button className="ot-btn ot-btn-sm ot-btn-green" onClick={handleSubmit}>Crear Médico</button>
      </div>
    </div>
  )
}

function calcAge(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const diff = Date.now() - d.getTime()
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000))
}
```

### 3. src/pages/FacturaCobro.jsx (NUEVA página — pantalla de cobro rápido)

```jsx
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFacturaOT, facturarOT } from '../services/api'

export default function FacturaCobro() {
  const { numero } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [tiposPago, setTiposPago] = useState([])
  const [pagos, setPagos] = useState([{ tipo_pago_id: '', monto: '', referencia: '' }])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Intentar cargar factura existente
    getFacturaOT(numero).then(setData).catch(() => {
      // No tiene factura aún — necesita crearla
    })
  }, [numero])

  const handleCobrar = async () => {
    setSaving(true)
    try {
      const pagosValidos = pagos.filter(p => p.tipo_pago_id && p.monto > 0)
      await facturarOT(numero, pagosValidos)
      navigate(`/ordenes/${numero}`)
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // Render: tabla de items, forma de pago, botón cobrar
  return (
    <div className="ot-shell">
      <nav className="app-navbar">
        <span className="nav-brand">lab<em>sis</em></span>
        <span className="nav-divider" />
        <button className="ot-back-btn" onClick={() => navigate(`/ordenes/${numero}`)}>← Orden {numero}</button>
        <span className="nav-title">Cobro - Orden {numero}</span>
      </nav>
      <main className="ot-content" style={{ padding: '16px 24px' }}>
        {/* Aquí va el contenido de factura + formas de pago */}
        {/* Items, total, selector tipo_pago, monto, botón Cobrar */}
        <div className="ote-actions">
          <button className="ot-btn" onClick={() => navigate(`/ordenes/${numero}`)}>Cancelar</button>
          <button className="ot-btn ot-btn-green" onClick={handleCobrar} disabled={saving}>
            {saving ? 'Procesando...' : 'Cobrar'}
          </button>
        </div>
      </main>
    </div>
  )
}
```

## Archivos a MODIFICAR (mínimo, solo agregar líneas)

### server/index.js — agregar ruta ot-edit
```diff
+ import otEditRouter from './routes/ot-edit.js'
  app.use('/api/ordenes', ordenesRouter)
+ app.use('/api/ot', otEditRouter)
```

### src/App.jsx — agregar rutas nuevas
```diff
+ import OTEditPage from './pages/OTEditPage'
+ import FacturaCobro from './pages/FacturaCobro'

  <Routes>
    ...
+   <Route path="/ordenes/nueva" element={<OTEditPage />} />
+   <Route path="/ordenes/:numero/factura" element={<FacturaCobro />} />
  </Routes>
```

### src/services/api.js — agregar funciones al final
```js
// ══ OT EDIT ══

export async function getOTEditNew(pacienteId) {
  const params = pacienteId ? `?pacienteId=${pacienteId}` : ''
  const res = await fetch(`${BASE}/ot/edit/new${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function searchPruebas(q, servicioId) {
  const params = new URLSearchParams({ q })
  if (servicioId) params.set('servicioId', servicioId)
  const res = await fetch(`${BASE}/ot/search-pruebas?${params}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getGPPruebas(gpId) {
  const res = await fetch(`${BASE}/ot/grupo-prueba/${gpId}/pruebas`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function searchMedicos(q) {
  const res = await fetch(`${BASE}/ot/search-medicos?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function crearMedico(data) {
  const res = await fetch(`${BASE}/ot/medicos`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function searchPacientes(q) {
  const res = await fetch(`${BASE}/ot/search-pacientes?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function crearOT(data) {
  const res = await fetch(`${BASE}/ot`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function facturarOT(numero, tiposPago) {
  const res = await fetch(`${BASE}/ot/${numero}/facturar`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tiposPago })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function getFacturaOT(numero) {
  const res = await fetch(`${BASE}/ot/factura/${numero}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
```

### src/index.css — agregar al final
```css
/* ══ OT EDIT PAGE ══ */

.ote-section {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-sm); padding: 16px 20px; margin-bottom: 12px;
}
.ote-section-title {
  font-size: 13px; font-weight: 700; color: var(--navy);
  text-transform: uppercase; letter-spacing: 0.04em;
  margin: 0 0 12px; padding-bottom: 8px;
  border-bottom: 2px solid var(--border);
  display: flex; align-items: center; gap: 8px;
}
.ote-count {
  background: var(--blue); color: #fff; font-size: 10px;
  padding: 1px 7px; border-radius: 10px;
}

.ote-patient-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;
}
.ote-order-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}
.ote-field { display: flex; flex-direction: column; gap: 3px; }
.ote-field-sm { max-width: 120px; }
.ote-field-full { grid-column: 1 / -1; }

.ote-label {
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--text-3);
}
.ote-input {
  padding: 6px 10px; font-size: 13px;
  border: 1px solid var(--input-border); border-radius: var(--r-xs);
  background: var(--surface); color: var(--text-1);
  outline: none; transition: border-color var(--dur);
}
.ote-input:focus { border-color: var(--blue); box-shadow: var(--sh-focus); }
.ote-select {
  padding: 6px 10px; font-size: 13px;
  border: 1px solid var(--input-border); border-radius: var(--r-xs);
  background: var(--surface); color: var(--text-1);
}
.ote-checkbox { width: 18px; height: 18px; accent-color: var(--blue); }

/* Médico card */
.ote-medico-card {
  background: var(--surface-r); border: 1px solid var(--border-s);
  border-radius: var(--r-xs); padding: 10px 14px;
  display: flex; flex-direction: column; gap: 4px;
}
.ote-medico-name { font-size: 14px; font-weight: 600; color: var(--navy-d); }
.ote-medico-meta { font-size: 12px; color: var(--text-3); }
.ote-btn-link {
  background: none; border: none; color: var(--blue);
  font-size: 12px; cursor: pointer; padding: 0; text-align: left;
}
.ote-btn-link:hover { text-decoration: underline; }

/* Search & Suggestions */
.ote-search-box { position: relative; margin-bottom: 10px; }
.ote-search-input { width: 100%; }
.ote-suggestions {
  position: absolute; top: 100%; left: 0; right: 0; z-index: 10;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-xs); box-shadow: var(--sh-card);
  max-height: 300px; overflow-y: auto;
}
.ote-suggestion-item {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; cursor: pointer; font-size: 13px;
  transition: background var(--dur);
}
.ote-suggestion-item:hover { background: var(--primary-bg); }
.ote-badge {
  font-size: 9px; font-weight: 800; padding: 1px 5px;
  border-radius: 3px; flex-shrink: 0;
}
.ote-badge-gp { background: var(--gold); color: #fff; }
.ote-badge-pr { background: var(--blue-l); color: var(--blue); }
.ote-suggestion-name { flex: 1; font-weight: 500; }
.ote-suggestion-area { font-size: 11px; color: var(--text-3); }
.ote-suggestion-price { font-size: 12px; font-weight: 600; color: var(--navy); font-family: var(--font-mono); }

/* Tests layout (3 cols) */
.ote-tests-layout {
  display: grid; grid-template-columns: 1fr 250px; gap: 16px;
}
.ote-tests-left { min-height: 200px; }

/* Tree */
.ote-tree {
  border: 1px solid var(--border-l); border-radius: var(--r-xs);
  padding: 8px; min-height: 120px; background: var(--surface-r);
}
.ote-tree-group { margin-bottom: 4px; }
.ote-tree-header {
  display: flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 600; color: var(--navy);
  padding: 4px 0;
}
.ote-tree-icon { font-size: 14px; }
.ote-tree-item {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: var(--text-2); padding: 2px 0 2px 20px;
}
.ote-tree-item.ote-tree-root { padding-left: 4px; }
.ote-tree-dash { color: var(--text-3); font-family: monospace; }
.ote-tree-bullet { color: var(--blue); font-size: 16px; }
.ote-tree-remove {
  margin-left: auto; background: none; border: none;
  color: var(--red-d); cursor: pointer; font-size: 14px; padding: 0 4px;
  opacity: 0.5; transition: opacity var(--dur);
}
.ote-tree-remove:hover { opacity: 1; }

/* Price card */
.ote-price-card {
  background: var(--surface-r); border: 1px solid var(--border-s);
  border-radius: var(--r-sm); padding: 14px;
}
.ote-price-row {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 12px; color: var(--text-2); padding: 4px 0;
}
.ote-price-row.ote-price-total {
  font-size: 16px; font-weight: 700; color: var(--navy-d);
  border-top: 2px solid var(--border); margin-top: 8px; padding-top: 8px;
  font-family: var(--font-mono);
}

/* Actions bar */
.ote-actions {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 0; border-top: 1px solid var(--border);
  margin-top: 8px;
}

/* Mini grid (crear médico) */
.ote-mini-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
  margin-bottom: 8px;
}
.ote-mini-actions {
  display: flex; gap: 8px; justify-content: flex-end;
}

/* Medico search inline */
.ote-medico-search { display: flex; flex-direction: column; gap: 6px; position: relative; }
.ote-medico-create { padding: 8px 0; }

/* Responsive */
@media (max-width: 768px) {
  .ote-patient-grid { grid-template-columns: repeat(2, 1fr); }
  .ote-order-grid { grid-template-columns: 1fr; }
  .ote-tests-layout { grid-template-columns: 1fr; }
  .ote-mini-grid { grid-template-columns: 1fr; }
}
```

## Alcance y limitaciones de esta iteración

### SÍ implementar:
- Crear OT nueva (flujo completo: paciente → orden → pruebas → guardar)
- Búsqueda de paciente por CI (autocompletado)
- Selector de procedencia con lista de precios asociada
- Buscador de pruebas/GPs con autocompletado
- Árbol de estructura (GPs con sus pruebas hijas)
- Cálculo de precio total en tiempo real
- Búsqueda y creación de médico (modal inline)
- Botón "Guardar" (solo guarda OT sin factura)
- Botón "Guardar y Cobrar" (guarda OT + redirige a factura)
- Pantalla de cobro básica (FacturaCobro)
- Generación automática de muestras en backend

### NO implementar (futuras iteraciones):
- Edición de OT existente (solo crear)
- Cuestionario de ingreso (modal questionsPanelGrupos)
- Citas proveedor estudios externos
- Segundo médico (médico_dos)
- Descuentos y promociones
- Validación de caja por IP
- Documentos adjuntos
- Embarazada / semanas embarazo
- IVA configurable
- Print directo post-guardado
- Verificación de pruebas duplicadas avanzada

## Verificación
1. `npm run dev` + `node server/index.js`
2. Ir a /ordenes → botón "Nueva Orden" → /ordenes/nueva
3. Llenar datos paciente, seleccionar procedencia
4. Buscar pruebas → agregar al árbol → ver precio actualizado
5. Buscar médico → seleccionar
6. Click "Guardar y Cobrar" → debe crear OT en BD y redirigir a /ordenes/{numero}/factura
7. Verificar en BD: `SELECT * FROM orden_trabajo ORDER BY id DESC LIMIT 1`
8. Verificar prueba_orden, gprueba_orden, muestra creadas correctamente

## IMPORTANTE
- NO modificar archivos de otros devs: OrdenDetallePage.jsx, OrdenLabPage.jsx, PrintOrdenTrabajo.jsx, PrintEtiqueta.jsx, Ordenes.jsx
- NO modificar server/routes/ordenes.js (tiene sus propias rutas)
- NO modificar server/routes/catalogos.js
- Solo AGREGAR líneas nuevas a api.js, index.css, App.jsx, server/index.js
- Reutilizar clases CSS existentes: .ot-shell, .app-navbar, .ot-back-btn, .ot-btn, .ot-btn-green, .nav-brand, etc.
- Reutilizar variables CSS: --navy, --blue, --gold, --surface, --border, --text-1, --r-xs, --sh-card, etc.
- NO crear tablas ni modificar estructura de BD — solo DML (SELECT, INSERT, UPDATE, DELETE)
- La función `sin_acentos()` ya existe en la BD — usarla para búsquedas insensibles a acentos
- El trigger `generar_ot_numero_after_insert` genera el número automáticamente — NO generar manualmente
- El trigger en `accion_log` recalcula el precio — asegurar INSERT correcto en accion_log
```
