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
1. OrdenTrabajoList ←— DONE (filtros, react-select, responsive, mobile)
2. OrdenTrabajo (detalle) ←— DONE (layout 2 cols, datos reales, responsive)
3. OrdenTrabajoLab (ingreso resultados) ←— DONE (keyboard nav F2/F3, Alt+Arrow, responsive)
4. OT Edit/Create ←— EN PROGRESO (~70% — falta descuentos, IVA)
5. Facturación ←— EN PROGRESO (~50% — falta cancelación, notas crédito)
6. Pacientes ←— AVANZADO (~80% — faltan 6 campos demográficos)
7. Checkpoint/Trazabilidad ←— IMPLEMENTADO (scanner barcode, scan history)
8. Reportes/Impresión — PENDIENTE
```

## Estado actual (9-Mar-2026)
- **Últimos avances (3–9 Mar):**
  - Responsive design completo: mobile (360px), tablet (768px), desktop (1280px)
  - Keyboard navigation en Lab: F2/F3 para órdenes, Alt+Arrow para áreas
  - Mobile fixes: table scroll, toolbar buttons, queue drawer overlap
  - Filtros colapsables en phone, lab landscape compact
  - QA readiness: tooltips, shortcuts, locale, error handling
  - Scanner barcode: zxing-wasm, photo capture, fullscreen UX
- **Dev server:** `npm run dev` → Vite en 5173, Express en 3001
- **QA server:** PM2 fork mode en 52.55.189.120 (deploy con `/labsis-qa-deploy`)

## Skills de Desarrollo (Ecosistema de Productividad)

**Flujo de desarrollo recomendado:**
1. `/labsis-dev-start` → Arranca entorno limpio (mata zombies, verifica BD)
2. `/labsis-screen-dev` → Carga contexto de la pantalla a trabajar
3. `/labsis-brand-ux` → Consulta códigos de diseño durante implementación
4. `/labsis-responsive-check` → Verifica responsive antes de commit
5. `/labsis-session-save` → Guarda contexto al terminar sesión
6. `/labsis-qa-deploy` → Deploy a QA cuando esté listo

**Skills adicionales:**
- `/labsis-expert` → Consultas sobre el sistema Java legacy
- `/labsis-code-analyzer` → Análisis profundo de código Java

## Sistema de Diseño (OBLIGATORIO para UI)

**ANTES de escribir CSS o componentes de UI, LEE estos archivos:**
1. `memory/labsis/_AGENT_DESIGN_GUIDE.md` — Guía rápida con top 30 códigos y restricciones (symlink)
2. `memory/labsis/_BRAND_CODES.md` — Catálogo completo de ~287 códigos (symlink)
3. `src/design-tokens.json` — Tokens en formato JSON consumible

**Memoria del proyecto (symlinks a memoria global):**
- `memory/labsis/_GAPS_AUDIT.md` — Auditoría de gaps React vs Legacy (73 gaps tracked)
- `memory/labsis/_PATTERNS.md` — Patrones de código del proyecto
- `memory/labsis/_SCREENS_INVENTORY.md` — Inventario de pantallas
- `memory/labsis/prompts/_PROMPTS_INDEX.md` — Índice de 19 prompts de desarrollo
- `memory/labsis/screens/` — Memoria por pantalla (estado, decisiones, bugs)

**Reglas:**
- NUNCA inventes estilos. Busca si ya existe un código (BTN-001, TBL-005, etc.)
- Si Samuel dice un código, aplica los specs EXACTOS de ese código
- Antes de implementar UI, muestra un mini-plan con los códigos que vas a usar
- Si necesitas algo que NO tiene código, pregunta antes de inventar
- Brand manual visual: `/public/labsis-brand-manual-v3.html` (~287 códigos etiquetados)

## Responsive Design (OBLIGATORIO para nuevos módulos)

**Breakpoints canónicos:**
- 360px — teléfono pequeño (Galaxy S, iPhone SE)
- 576px — teléfono grande / landscape
- 768px — tablet portrait (iPad Mini)
- 1024px — tablet landscape / laptop pequeño
- 1280px — desktop

**Reglas:**
1. NUNCA usar `style={{ width: N }}` en contenedores de layout. Usar `.fld-sm/.fld-md/.fld-lg`
2. Todo grid debe definir su colapso a 1024px y 768px
3. Sidebars/paneles deben tener toggle o drawer en móvil
4. Tablas de datos van dentro de `.table-scroll-wrap`
5. Touch targets mínimo 44px (se aplica automático via `@media (pointer:coarse)`)
6. Usar `.hide-mobile` / `.show-mobile` / `.stack-mobile` / `.full-mobile`
7. Probar en 360px, 768px, 1280px antes de considerar una página lista

## BD — Tablas principales
- `orden_trabajo` (455K filas) — status_id, procedencia_id, usuario_id, paciente_id, medico_id
- `paciente` — nombre, apellido, ci_paciente, fecha_nacimiento, sexo, telefono, email
- `prueba_orden` — orden_id, prueba_id, area_id, precio, status_id, anormal, critico
- `muestra` — orden_id, barcode, tipo_muestra_id, tipo_contenedor_id, areas_ids (text con IDs)
- `status_orden` — id, status, color (12 estados)
- `procedencia`, `area`, `usuario`, `servicio_medico`, `medico`, `departamento_laboratorio`
