import { Router } from 'express'
import pool from '../db.js'
import { sha1, createToken, requireAuth, COOKIE_NAME } from '../auth.js'

const router = Router()

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' })
    }

    const userResult = await pool.query(
      `SELECT id, username, nombre, apellido, passwd_sha1, pass_salt, activo, date_expiration
       FROM usuario WHERE LOWER(username) = LOWER($1)`,
      [username.trim()]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const user = userResult.rows[0]

    if (!user.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' })
    }

    if (user.date_expiration && new Date(user.date_expiration) < new Date()) {
      return res.status(401).json({ error: 'Cuenta expirada' })
    }

    const hash = user.pass_salt ? sha1(user.pass_salt + password) : sha1(password)
    if (hash !== user.passwd_sha1) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const rolesResult = await pool.query(
      `SELECT r.codigo FROM usuario_has_rol uhr
       JOIN rol r ON uhr.rol_id = r.id
       WHERE uhr.usuario_id = $1`,
      [user.id]
    )
    const roles = rolesResult.rows.map(r => r.codigo)

    const tokenPayload = {
      userId: user.id,
      username: user.username,
      nombre: user.nombre,
      apellido: user.apellido,
      roles,
    }
    const token = createToken(tokenPayload)

    pool.query('UPDATE usuario SET ult_login = NOW() WHERE id = $1', [user.id]).catch(() => {})

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
      path: '/',
    })

    res.json({
      user: { id: user.id, username: user.username, nombre: user.nombre, apellido: user.apellido, roles },
    })
  } catch (err) {
    console.error('Error en login:', err)
    res.status(500).json({ error: 'Error interno' })
  }
})

// GET /api/auth/lab-info — info pública del laboratorio (para login page)
router.get('/lab-info', async (_req, res) => {
  try {
    const lab = await pool.query(`SELECT nombre, rif, direccion, logo FROM laboratorio LIMIT 1`)
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM orden_trabajo) AS total_ordenes,
        (SELECT COUNT(*) FROM paciente) AS total_pacientes,
        (SELECT COUNT(*) FROM prueba WHERE activa = true) AS total_pruebas,
        (SELECT COUNT(DISTINCT area_id) FROM prueba WHERE activa = true) AS total_areas
    `)
    res.json({
      lab: lab.rows[0] || {},
      stats: stats.rows[0] || {},
      hasLogo: !!(lab.rows[0]?.logo),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/auth/lab-logo — servir logo desde BD (lo_get)
router.get('/lab-logo', async (_req, res) => {
  try {
    const result = await pool.query(`SELECT lo_get(logo) AS data FROM laboratorio WHERE logo IS NOT NULL LIMIT 1`)
    if (!result.rows.length || !result.rows[0].data) return res.status(404).send('No logo')
    res.set('Content-Type', 'image/png')
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(result.rows[0].data)
  } catch (err) {
    console.error('Error loading logo:', err.message)
    res.status(500).send('Error loading logo')
  }
})

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    // Precargar permisos (modulos + actividades) para evaluar en frontend
    const permisosResult = await pool.query(`
      SELECT m.identificador AS modulo, m.roles_acceso AS mod_roles_acceso,
             m.roles_no_acceso AS mod_roles_no_acceso,
             m.is_todos_roles_acceso AS mod_todos_acceso,
             m.is_todos_roles_no_acceso AS mod_todos_no_acceso,
             a.identificador AS actividad, p.roles_acceso AS act_roles_acceso,
             p.roles_no_acceso AS act_roles_no_acceso,
             p.is_todos_roles_acceso AS act_todos_acceso,
             p.is_todos_roles_no_acceso AS act_todos_no_acceso
      FROM modulo m
      LEFT JOIN actividad a ON a.modulo_id = m.id
      LEFT JOIN permiso p ON p.actividad_id = a.id
      ORDER BY m.identificador, a.identificador
    `)

    // Construir mapa de permisos
    const permisos = {}
    for (const row of permisosResult.rows) {
      if (!permisos[row.modulo]) {
        permisos[row.modulo] = {
          rolesAcceso: parseRoles(row.mod_roles_acceso),
          rolesNoAcceso: parseRoles(row.mod_roles_no_acceso),
          todosAcceso: row.mod_todos_acceso,
          todosNoAcceso: row.mod_todos_no_acceso,
          actividades: {},
        }
      }
      if (row.actividad) {
        permisos[row.modulo].actividades[row.actividad] = {
          rolesAcceso: parseRoles(row.act_roles_acceso),
          rolesNoAcceso: parseRoles(row.act_roles_no_acceso),
          todosAcceso: row.act_todos_acceso,
          todosNoAcceso: row.act_todos_no_acceso,
        }
      }
    }

    res.json({ user: req.user, permisos })
  } catch (err) {
    console.error('Error en /me:', err)
    res.json({ user: req.user, permisos: {} })
  }
})

function parseRoles(val) {
  if (!val) return []
  if (Array.isArray(val)) return val
  try { return JSON.parse(val) } catch { return [] }
}

export default router
