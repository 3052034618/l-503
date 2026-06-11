import { getDb } from '../database'
import { v4 as uuidv4 } from 'uuid'

export interface Equipment {
  id: string
  name: string
  type: string
  brand?: string
  model?: string
  zone_id?: string
  purchase_date?: string
  max_usage_count: number
  current_usage_count: number
  last_maintenance_date?: string
  status: string
  maintenance_note?: string
  created_at: string
  updated_at: string
}

export function getEquipment(params?: { page?: number; pageSize?: number; keyword?: string; type?: string; status?: string; zone_id?: string }) {
  const db = getDb()
  let whereClause = 'WHERE 1=1'
  const queryParams: any = {}

  if (params?.keyword) {
    whereClause += ' AND (name LIKE @keyword OR brand LIKE @keyword)'
    queryParams.keyword = `%${params.keyword}%`
  }
  if (params?.type) {
    whereClause += ' AND type = @type'
    queryParams.type = params.type
  }
  if (params?.status) {
    whereClause += ' AND status = @status'
    queryParams.status = params.status
  }
  if (params?.zone_id) {
    whereClause += ' AND zone_id = @zone_id'
    queryParams.zone_id = params.zone_id
  }

  let sql = `SELECT e.*, z.name as zone_name FROM equipment e 
             LEFT JOIN zones z ON e.zone_id = z.id 
             ${whereClause} ORDER BY e.created_at DESC`
  
  if (params?.page && params?.pageSize) {
    sql += ' LIMIT @limit OFFSET @offset'
    queryParams.limit = params.pageSize
    queryParams.offset = (params.page - 1) * params.pageSize
  }

  const equipment = db.prepare(sql).all(queryParams)
  
  const countSql = `SELECT COUNT(*) as count FROM equipment ${whereClause}`
  const total = (db.prepare(countSql).get(queryParams) as { count: number }).count

  return { list: equipment, total }
}

export function getEquipmentById(id: string): Equipment | undefined {
  const db = getDb()
  return db.prepare(`
    SELECT e.*, z.name as zone_name FROM equipment e 
    LEFT JOIN zones z ON e.zone_id = z.id 
    WHERE e.id = ?
  `).get(id) as Equipment | undefined
}

export function createEquipment(equipment: Omit<Equipment, 'id' | 'created_at' | 'updated_at'>): Equipment {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuidv4()

  db.prepare(`
    INSERT INTO equipment (id, name, type, brand, model, zone_id, purchase_date, max_usage_count, current_usage_count, status, created_at, updated_at)
    VALUES (@id, @name, @type, @brand, @model, @zone_id, @purchase_date, @max_usage_count, @current_usage_count, @status, @created_at, @updated_at)
  `).run({
    ...equipment,
    id,
    created_at: now,
    updated_at: now
  })

  return getEquipmentById(id)!
}

export function updateEquipment(id: string, equipment: Partial<Equipment>): Equipment | undefined {
  const db = getDb()
  const now = new Date().toISOString()
  
  const existing = getEquipmentById(id)
  if (!existing) return undefined

  const updated = { ...existing, ...equipment, updated_at: now }

  const usageRatio = updated.current_usage_count / updated.max_usage_count
  if (usageRatio >= 1 && updated.status === 'normal') {
    updated.status = 'maintenance_required'
  }

  db.prepare(`
    UPDATE equipment SET 
      name = @name, type = @type, brand = @brand, model = @model, zone_id = @zone_id,
      purchase_date = @purchase_date, max_usage_count = @max_usage_count, 
      current_usage_count = @current_usage_count, last_maintenance_date = @last_maintenance_date,
      status = @status, maintenance_note = @maintenance_note, updated_at = @updated_at
    WHERE id = @id
  `).run(updated)

  return getEquipmentById(id)
}

export function deleteEquipment(id: string): boolean {
  const db = getDb()
  const result = db.prepare('DELETE FROM equipment WHERE id = ?').run(id)
  return result.changes > 0
}

export function getMaintenanceReminders() {
  const db = getDb()
  return db.prepare(`
    SELECT e.*, z.name as zone_name FROM equipment e
    LEFT JOIN zones z ON e.zone_id = z.id
    WHERE e.status = 'maintenance_required' 
       OR (e.current_usage_count / e.max_usage_count) >= 0.8
    ORDER BY (e.current_usage_count / e.max_usage_count) DESC
  `).all()
}

export function performMaintenance(id: string): Equipment | undefined {
  const db = getDb()
  const now = new Date().toISOString()
  
  const equipment = getEquipmentById(id)
  if (!equipment) return undefined

  db.prepare(`
    UPDATE equipment SET 
      current_usage_count = 0, 
      status = 'normal',
      last_maintenance_date = @last_maintenance_date,
      maintenance_note = '',
      updated_at = @updated_at
    WHERE id = @id
  `).run({
    id,
    last_maintenance_date: now,
    updated_at: now
  })

  const logId = uuidv4()
  db.prepare(`
    INSERT INTO maintenance_logs (id, equipment_id, type, description, performed_at)
    VALUES (?, ?, 'routine', '例行维保，重置使用次数', ?)
  `).run(logId, id, now)

  return getEquipmentById(id)
}

export function incrementEquipmentUsage(equipmentId: string): void {
  const db = getDb()
  const equipment = getEquipmentById(equipmentId)
  if (!equipment) return

  const newCount = equipment.current_usage_count + 1
  let newStatus = equipment.status

  if (newCount >= equipment.max_usage_count) {
    newStatus = 'maintenance_required'
  }

  db.prepare(`
    UPDATE equipment SET current_usage_count = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(newCount, newStatus, new Date().toISOString(), equipmentId)
}

export function getZones() {
  const db = getDb()
  return db.prepare('SELECT * FROM zones ORDER BY name').all()
}

export function getZoneById(id: string) {
  const db = getDb()
  return db.prepare('SELECT * FROM zones WHERE id = ?').get(id)
}

export function getEquipmentByZone(zoneId: string) {
  const db = getDb()
  return db.prepare('SELECT * FROM equipment WHERE zone_id = ?').all(zoneId)
}
