import { getDb } from '../database'
import { v4 as uuidv4 } from 'uuid'

export interface Course {
  id: string
  name: string
  type: string
  duration: number
  capacity: number
  calories_per_hour?: number
  difficulty?: string
  description?: string
  required_equipment?: string
  is_private: number
  created_at: string
  updated_at: string
}

export function getCourses(params?: { page?: number; pageSize?: number; keyword?: string; type?: string; is_private?: number }) {
  const db = getDb()
  let whereClause = 'WHERE 1=1'
  const queryParams: any = {}

  if (params?.keyword) {
    whereClause += ' AND name LIKE @keyword'
    queryParams.keyword = `%${params.keyword}%`
  }
  if (params?.type) {
    whereClause += ' AND type = @type'
    queryParams.type = params.type
  }
  if (params?.is_private !== undefined) {
    whereClause += ' AND is_private = @is_private'
    queryParams.is_private = params.is_private
  }

  let sql = `SELECT * FROM courses ${whereClause} ORDER BY created_at DESC`
  
  if (params?.page && params?.pageSize) {
    sql += ' LIMIT @limit OFFSET @offset'
    queryParams.limit = params.pageSize
    queryParams.offset = (params.page - 1) * params.pageSize
  }

  const courses = db.prepare(sql).all(queryParams) as Course[]
  
  const countSql = `SELECT COUNT(*) as count FROM courses ${whereClause}`
  const total = (db.prepare(countSql).get(queryParams) as { count: number }).count

  return { list: courses, total }
}

export function getCourseById(id: string): Course | undefined {
  const db = getDb()
  return db.prepare('SELECT * FROM courses WHERE id = ?').get(id) as Course | undefined
}

export function createCourse(course: Omit<Course, 'id' | 'created_at' | 'updated_at'>): Course {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuidv4()

  db.prepare(`
    INSERT INTO courses (id, name, type, duration, capacity, calories_per_hour, difficulty, description, required_equipment, is_private, created_at, updated_at)
    VALUES (@id, @name, @type, @duration, @capacity, @calories_per_hour, @difficulty, @description, @required_equipment, @is_private, @created_at, @updated_at)
  `).run({
    ...course,
    id,
    created_at: now,
    updated_at: now
  })

  return getCourseById(id)!
}

export function updateCourse(id: string, course: Partial<Course>): Course | undefined {
  const db = getDb()
  const now = new Date().toISOString()
  
  const existing = getCourseById(id)
  if (!existing) return undefined

  const updated = { ...existing, ...course, updated_at: now }

  db.prepare(`
    UPDATE courses SET 
      name = @name, type = @type, duration = @duration, capacity = @capacity,
      calories_per_hour = @calories_per_hour, difficulty = @difficulty, 
      description = @description, required_equipment = @required_equipment, 
      is_private = @is_private, updated_at = @updated_at
    WHERE id = @id
  `).run(updated)

  return getCourseById(id)
}

export function deleteCourse(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM courses WHERE id = ?').run(id)
  return result.changes > 0
}
