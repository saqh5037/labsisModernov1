import crypto from 'crypto'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'labsis-moderno-dev-secret-2026'
const JWT_EXPIRY = '12h'
export const COOKIE_NAME = 'labsis_token'

export function sha1(str) {
  return crypto.createHash('sha1').update(str, 'utf8').digest('hex')
}

export function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export function requireAuth(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME]
  if (!token) return res.status(401).json({ error: 'No autenticado' })
  try {
    req.user = verifyToken(token)
    next()
  } catch {
    res.clearCookie(COOKIE_NAME)
    return res.status(401).json({ error: 'Sesión expirada' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'No autenticado' })
    const userRoles = req.user.roles || []
    if (!roles.some(r => userRoles.includes(r))) {
      return res.status(403).json({ error: 'Sin permisos' })
    }
    next()
  }
}
