import { getDb } from '../database'
import { v4 as uuidv4 } from 'uuid'

export interface OperationLog {
  id: string
  action: 'release_no_show' | 'cancel_enrollment' | 'waitlist_promoted' | 'enroll' | 'check_in'
  schedule_id?: string
  member_id?: string
  member_name?: string
  related_member_id?: string
  related_member_name?: string
  detail?: string
  operator?: string
  created_at: string
}

export function createLog(log: Omit<OperationLog, 'id' | 'created_at'>) {
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO operation_logs (id, action, schedule_id, member_id, member_name, related_member_id, related_member_name, detail, operator, created_at)
    VALUES (@id, @action, @schedule_id, @member_id, @member_name, @related_member_id, @related_member_name, @detail, @operator, @created_at)
  `).run({
    id,
    created_at: now,
    ...log
  })
  return { id, created_at: now, ...log }
}

export function getLogs(params?: {
  schedule_id?: string
  action?: string
  limit?: number
  offset?: number
}) {
  const db = getDb()
  let where = 'WHERE 1=1'
  const p: any = {}
  if (params?.schedule_id) {
    where += ' AND schedule_id = @schedule_id'
    p.schedule_id = params.schedule_id
  }
  if (params?.action) {
    where += ' AND action = @action'
    p.action = params.action
  }
  let sql = `SELECT * FROM operation_logs ${where} ORDER BY created_at DESC`
  if (params?.limit) {
    sql += ' LIMIT @limit'
    p.limit = params.limit
  }
  if (params?.offset) {
    sql += ' OFFSET @offset'
    p.offset = params.offset
  }
  const list = db.prepare(sql).all(p)
  const countSql = `SELECT COUNT(*) as count FROM operation_logs ${where}`
  const total = (db.prepare(countSql).get(p) as { count: number }).count
  return { list, total }
}

export function getRecentLogs(limit: number = 20) {
  return getLogs({ limit })
}
