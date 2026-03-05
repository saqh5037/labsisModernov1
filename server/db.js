import pg from 'pg'
import dotenv from 'dotenv'

const envFile = process.env.NODE_ENV === 'production' ? '.env.qa' : '.env'
dotenv.config({ path: envFile })

const { Pool } = pg

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
})

export default pool
