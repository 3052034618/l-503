import { getDb } from '../database'
import { v4 as uuidv4 } from 'uuid'

export interface Coach {
  id: string
  name: string
  gender?: string
  phone?: string
  specialties?: string
  certification?: string
  experience_years?: number
  max_daily_classes: number
  status: string
  created_at: string
  updated_at: string
}

export function getCoaches(params?: { page?: number; pageSize?: number; keyword?: string; specialty?: string }) {
  const db = getDb()
  let whereClause = 'WHERE 1=1'
  const queryParams: any = {}

  if (params?.keyword) {
    whereClause += ' AND (name LIKE @keyword OR phone LIKE @keyword)'
    queryParams.keyword = `%${params.keyword}%`
  }

  let sql = `SELECT * FROM coaches ${whereClause} ORDER BY created_at DESC`
  
  if (params?.page && params?.pageSize) {
    sql += ' LIMIT @limit OFFSET @offset'
    queryParams.limit = params.pageSize
    queryParams.offset = (params.page - 1) * params.pageSize
  }

  const coaches = db.prepare(sql).all(queryParams) as Coach[]
  
  const countSql = `SELECT COUNT(*) as count FROM coaches ${whereClause}`
  const total = (db.prepare(countSql).get(queryParams) as { count: number }).count

  return { list: coaches, total }
}

export function getCoachById(id: string): Coach | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM coaches WHERE id = ?').get(id) as Coach | undefined
}

export function createCoach(coach: Omit<Coach, 'id' | 'created_at' | 'updated_at'>): Coach {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuidv4()

  db.prepare(`
    INSERT INTO coaches (id, name, gender, phone, specialties, certification, experience_years, max_daily_classes, status, created_at, updated_at)
    VALUES (@id, @name, @gender, @phone, @specialties, @certification, @experience_years, @max_daily_classes, @status, @created_at, @updated_at)
  `).run({
    ...coach,
    id,
    created_at: now,
    updated_at: now
  })

  return getCoachById(id)!
}

export function updateCoach(id: string, coach: Partial<Coach>): Coach | undefined {
  const db = getDb()
  const now = new Date().toISOString()
  
  const existing = getCoachById(id)
  if (!existing) return undefined

  const updated = { ...existing, ...coach, updated_at: now }

  db.prepare(`
    UPDATE coaches SET 
      name = @name, gender = @gender, phone = @phone, specialties = @specialties,
      certification = @certification, experience_years = @experience_years, 
      max_daily_classes = @max_daily_classes, status = @status, updated_at = @updated_at
    WHERE id = @id
  `).run(updated)

  return getCoachById(id)
}

export function deleteCoach(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM coaches WHERE id = ?').run(id)
  return result.changes > 0
}

export function getCoachDailyLoad(coachId: string, date: string): number {
  const db = getDb()
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM schedules 
    WHERE coach_id = ? AND date = ? AND status != 'cancelled'
  `).get(coachId, date) as { count: number }
  return result.count
}
