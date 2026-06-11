import { getDb } from '../database'
import { v4 as uuidv4 } from 'uuid'

export interface Member {
  id: string
  name: string
  gender?: string
  phone?: string
  email?: string
  level: string
  join_date: string
  expire_date?: string
  height?: number
  weight?: number
  body_fat?: number
  muscle_mass?: number
  bmi?: number
  preferences?: string
  status: string
  created_at: string
  updated_at: string
}

export function getMembers(params?: { page?: number; pageSize?: number; keyword?: string; level?: string }) {
  const db = getDb()
  let whereClause = 'WHERE 1=1'
  const queryParams: any = {}

  if (params?.keyword) {
    whereClause += ' AND (name LIKE @keyword OR phone LIKE @keyword)'
    queryParams.keyword = `%${params.keyword}%`
  }
  if (params?.level) {
    whereClause += ' AND level = @level'
    queryParams.level = params.level
  }

  let sql = `SELECT * FROM members ${whereClause} ORDER BY created_at DESC`
  
  if (params?.page && params?.pageSize) {
    sql += ' LIMIT @limit OFFSET @offset'
    queryParams.limit = params.pageSize
    queryParams.offset = (params.page - 1) * params.pageSize
  }

  const members = db.prepare(sql).all(queryParams) as Member[]
  
  const countSql = `SELECT COUNT(*) as count FROM members ${whereClause}`
  const total = (db.prepare(countSql).get(queryParams) as { count: number }).count

  return { list: members, total }
}

export function getMemberById(id: string): Member | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM members WHERE id = ?').get(id) as Member | undefined
}

export function createMember(member: Omit<Member, 'id' | 'created_at' | 'updated_at'>): Member {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuidv4()
  
  const bmi = member.height && member.weight 
    ? Math.round((member.weight / Math.pow(member.height / 100, 2)) * 10) / 10 
    : member.bmi

  db.prepare(`
    INSERT INTO members (id, name, gender, phone, email, level, join_date, expire_date, height, weight, body_fat, muscle_mass, bmi, preferences, status, created_at, updated_at)
    VALUES (@id, @name, @gender, @phone, @email, @level, @join_date, @expire_date, @height, @weight, @body_fat, @muscle_mass, @bmi, @preferences, @status, @created_at, @updated_at)
  `).run({
    ...member,
    id,
    bmi,
    created_at: now,
    updated_at: now
  })

  return getMemberById(id)!
}

export function updateMember(id: string, member: Partial<Member>): Member | undefined {
  const db = getDb()
  const now = new Date().toISOString()
  
  const existing = getMemberById(id)
  if (!existing) return undefined

  const updated = { ...existing, ...member, updated_at: now }
  
  if (member.height && member.weight) {
    updated.bmi = Math.round((member.weight / Math.pow(member.height / 100, 2)) * 10) / 10
  }

  db.prepare(`
    UPDATE members SET 
      name = @name, gender = @gender, phone = @phone, email = @email, level = @level,
      join_date = @join_date, expire_date = @expire_date, height = @height, weight = @weight,
      body_fat = @body_fat, muscle_mass = @muscle_mass, bmi = @bmi, preferences = @preferences,
      status = @status, updated_at = @updated_at
    WHERE id = @id
  `).run(updated)

  return getMemberById(id)
}

export function deleteMember(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM members WHERE id = ?').run(id)
  return result.changes > 0
}
