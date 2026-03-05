# labsisModernov1 — Labsis Moderno en React

## Objetivo
Reemplazar el frontend de Labsis (Java/Seam/XHTML de 2014) con React moderno.
**Misma lógica, misma estructura, misma BD — solo modernizar la UI.**
"Remodelar la casa, no reconstruirla."

## Stack
- **Frontend:** React 19 + Vite 7 + react-select + flatpickr
- **Backend:** Express 5 + pg (PostgreSQL)
- **BD:** labsisEG en localhost:5432 (user: labsis, pass: labsis)
- **CSS:** Puro (no Tailwind), siguiendo brand-premium.html

## Archivos clave
- `src/pages/Ordenes.jsx` — Lista de OTs (pantalla principal)
- `src/pages/OrdenDetallePage.jsx` — Detalle de OT (en progreso)
- `src/index.css` — Todos los estilos
- `src/styles/reactSelectGlass.js` — Estilos glassmorphism para react-select
- `src/components/DatePickerGlass.jsx` — Wrapper de flatpickr
- `src/services/api.js` — Funciones fetch
- `server/routes/ordenes.js` — API de órdenes (GET /, GET /status, GET /:numero)
- `server/routes/catalogos.js` — API de catálogos (procedencias, áreas, usuarios, servicios, pruebas)

## Referencia Labsis original
- **XHTML:** `/Users/samuelquiroz/git/labsis/WebContent/`
- **Brand manual:** `/Users/samuelquiroz/Documents/proyectos/labsis-modern/labsis-brand-manual-v3.html`
- **Video navegación:** `/Users/samuelquiroz/Downloads/Labsis - Sistema Integral de Laboratorios - 3 March 2026.mp4`

## Reglas de desarrollo
1. **Estudiar el XHTML original** antes de implementar cualquier pantalla
2. **Replicar estructura exacta** — mismos campos, misma disposición, misma lógica
3. **Aplicar brand manual** — colores, tipografía, sombras, radios del brand-premium.html
4. **Validar con Samuel** antes de avanzar a la siguiente pantalla
5. **Un chat por pantalla** para mantener contexto limpio
6. **Siempre verificar servidor:** matar procesos Vite viejos con `lsof -i :5173` antes de testear

## Pantallas del sistema (flujo Labsis)
```
1. OrdenTrabajoList ←— DONE (funcional, filtros reales, react-select)
2. OrdenTrabajo (detalle) ←— EN PROGRESO (backend OK, CSS necesita rehacerse)
3. OrdenTrabajoLab (ingreso resultados) — PENDIENTE
4. OrdenTrabajoLabVisualizacion (ver resultados) — PENDIENTE
5. Reportes/Impresión — PENDIENTE
```

## Estado actual (3-Mar-2026)
- **Última actividad:** Pantalla detalle — layout 2 columnas con datos reales
- **Problema:** CSS del detalle tiene parches y no se parece a Labsis. Necesita reescritura limpia.
- **Solución:** El detalle usa `ot-shell` (NO `app-shell`) para evitar overflow:hidden
- **Dev server:** `npm run dev` → Vite en 5173, Express en 3001

## Sistema de Diseño (OBLIGATORIO para UI)

**ANTES de escribir CSS o componentes de UI, LEE estos archivos:**
1. `memory/labsis/_AGENT_DESIGN_GUIDE.md` — Guía rápida con top 30 códigos y restricciones
2. `memory/labsis/_BRAND_CODES.md` — Catálogo completo de ~287 códigos
3. `src/design-tokens.json` — Tokens en formato JSON consumible

**Reglas:**
- NUNCA inventes estilos. Busca si ya existe un código (BTN-001, TBL-005, etc.)
- Si Samuel dice un código, aplica los specs EXACTOS de ese código
- Antes de implementar UI, muestra un mini-plan con los códigos que vas a usar
- Si necesitas algo que NO tiene código, pregunta antes de inventar
- Brand manual visual: `/public/labsis-brand-manual-v3.html` (~287 códigos etiquetados)

## BD — Tablas principales
- `orden_trabajo` (455K filas) — status_id, procedencia_id, usuario_id, paciente_id, medico_id
- `paciente` — nombre, apellido, ci_paciente, fecha_nacimiento, sexo, telefono, email
- `prueba_orden` — orden_id, prueba_id, area_id, precio, status_id, anormal, critico
- `muestra` — orden_id, barcode, tipo_muestra_id, tipo_contenedor_id, areas_ids (text con IDs)
- `status_orden` — id, status, color (12 estados)
- `procedencia`, `area`, `usuario`, `servicio_medico`, `medico`, `departamento_laboratorio`
