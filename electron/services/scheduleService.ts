import { getDb } from '../database'
import { v4 as uuidv4 } from 'uuid'
import { getCoachById, getCoachDailyLoad } from './coachService'
import { getCourseById } from './courseService'
import { getZoneById, getZones } from './equipmentService'
import { getMemberById } from './memberService'
import dayjs from 'dayjs'

export interface Schedule {
  id: string
  course_id: string
  coach_id: string
  zone_id?: string
  date: string
  start_time: string
  end_time: string
  capacity: number
  enrolled_count: number
  status: string
  is_private: number
  member_id?: string
  notes?: string
  created_at: string
  updated_at: string
}

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

export function getSchedules(params?: { 
  page?: number; 
  pageSize?: number; 
  date?: string; 
  startDate?: string;
  endDate?: string;
  coach_id?: string; 
  status?: string;
  course_type?: string;
  is_private?: number;
}) {
  const db = getDb()
  let whereClause = 'WHERE 1=1'
  const queryParams: any = {}

  if (params?.date) {
    whereClause += ' AND s.date = @date'
    queryParams.date = params.date
  }
  if (params?.startDate) {
    whereClause += ' AND s.date >= @startDate'
    queryParams.startDate = params.startDate
  }
  if (params?.endDate) {
    whereClause += ' AND s.date <= @endDate'
    queryParams.endDate = params.endDate
  }
  if (params?.coach_id) {
    whereClause += ' AND s.coach_id = @coach_id'
    queryParams.coach_id = params.coach_id
  }
  if (params?.status) {
    whereClause += ' AND s.status = @status'
    queryParams.status = params.status
  }
  if (params?.is_private !== undefined) {
    whereClause += ' AND s.is_private = @is_private'
    queryParams.is_private = params.is_private
  }

  let sql = `
    SELECT s.*, c.name as course_name, c.type as course_type, c.duration, c.calories_per_hour,
           co.name as coach_name, z.name as zone_name
    FROM schedules s
    LEFT JOIN courses c ON s.course_id = c.id
    LEFT JOIN coaches co ON s.coach_id = co.id
    LEFT JOIN zones z ON s.zone_id = z.id
    ${whereClause}
    ORDER BY s.date ASC, s.start_time ASC
  `
  
  if (params?.page && params?.pageSize) {
    sql += ' LIMIT @limit OFFSET @offset'
    queryParams.limit = params.pageSize
    queryParams.offset = (params.page - 1) * params.pageSize
  }

  const schedules = db.prepare(sql).all(queryParams)
  
  const countSql = `SELECT COUNT(*) as count FROM schedules s ${whereClause}`
  const total = (db.prepare(countSql).get(queryParams) as { count: number }).count

  return { list: schedules, total }
}

export function getScheduleById(id: string) {
  const db = getDb()
  return db.prepare(`
    SELECT s.*, c.name as course_name, c.type as course_type, c.duration, c.calories_per_hour,
           co.name as coach_name, z.name as zone_name, m.name as member_name
    FROM schedules s
    LEFT JOIN courses c ON s.course_id = c.id
    LEFT JOIN coaches co ON s.coach_id = co.id
    LEFT JOIN zones z ON s.zone_id = z.id
    LEFT JOIN members m ON s.member_id = m.id
    WHERE s.id = ?
  `).get(id)
}

export function createSchedule(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at' | 'enrolled_count'>): any {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuidv4()

  db.prepare(`
    INSERT INTO schedules (id, course_id, coach_id, zone_id, date, start_time, end_time, capacity, enrolled_count, status, is_private, member_id, notes, created_at, updated_at)
    VALUES (@id, @course_id, @coach_id, @zone_id, @date, @start_time, @end_time, @capacity, 0, @status, @is_private, @member_id, @notes, @created_at, @updated_at)
  `).run({
    ...schedule,
    id,
    created_at: now,
    updated_at: now
  })

  return getScheduleById(id)
}

export function updateScheduleStatus(id: string, status: string) {
  const db = getDb()
  const now = new Date().toISOString()
  
  db.prepare('UPDATE schedules SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id)
  return getScheduleById(id)
}

export function confirmSchedule(id: string) {
  return updateScheduleStatus(id, 'confirmed')
}

export function cancelSchedule(id: string, reason: string) {
  const db = getDb()
  const schedule = getScheduleById(id)
  if (!schedule) return undefined

  updateScheduleStatus(id, 'cancelled')
  
  db.prepare(`
    UPDATE enrollments SET status = 'cancelled' 
    WHERE schedule_id = ? AND status IN ('enrolled', 'waitlist')
  `).run(id)

  return getScheduleById(id)
}

export function generateSchedule(date: string) {
  const db = getDb()
  
  const existing = db.prepare('SELECT COUNT(*) as count FROM schedules WHERE date = ? AND status != ?').get(date, 'cancelled') as { count: number }
  if (existing.count > 0) {
    return { success: false, message: '该日期已有排课，如需重新生成请先删除现有排课' }
  }

  const courses = db.prepare("SELECT * FROM courses WHERE is_private = 0 AND status IS NOT 'inactive'").all() as any[]
  const coaches = db.prepare("SELECT * FROM coaches WHERE status = 'active'").all() as any[]
  const zones = getZones() as any[]

  const groupZones = zones.filter((z: any) => ['group', 'yoga', 'cardio'].includes(z.area_type))
  
  const generatedSchedules: any[] = []
  const coachDailyLoad: Record<string, number> = {}
  const zoneScheduleMap: Record<string, any[]> = {}

  coaches.forEach(coach => {
    coachDailyLoad[coach.id] = 0
  })

  zones.forEach(zone => {
    zoneScheduleMap[zone.id] = []
  })

  function isTimeOverlap(start1: string, end1: string, start2: string, end2: string) {
    return start1 < end2 && start2 < end1
  }

  function isZoneAvailable(zoneId: string, startTime: string, endTime: string) {
    const zoneSchedules = zoneScheduleMap[zoneId] || []
    return !zoneSchedules.some((s: any) => 
      isTimeOverlap(startTime, endTime, s.start_time, s.end_time)
    )
  }

  function isCoachAvailable(coachId: string, startTime: string, endTime: string) {
    const coach = coaches.find(c => c.id === coachId)
    if (!coach) return false
    if (coachDailyLoad[coachId] >= coach.max_daily_classes) return false
    
    const coachSchedules = generatedSchedules.filter(s => s.coach_id === coachId)
    return !coachSchedules.some(s => isTimeOverlap(startTime, endTime, s.start_time, s.end_time))
  }

  function findCoachForCourse(course: any, startTime: string, endTime: string) {
    const suitableCoaches = coaches.filter(coach => {
      const specialties = JSON.parse(coach.specialties || '[]')
      return specialties.includes(course.name) || specialties.includes(course.type)
    })

    suitableCoaches.sort((a, b) => coachDailyLoad[a.id] - coachDailyLoad[b.id])

    for (const coach of suitableCoaches) {
      if (isCoachAvailable(coach.id, startTime, endTime)) {
        return coach
      }
    }
    return null
  }

  function findZoneForCourse(course: any, startTime: string, endTime: string) {
    let suitableZones = groupZones
    
    if (course.type === '瑜伽') {
      suitableZones = zones.filter((z: any) => z.area_type === 'yoga')
    } else if (course.type === '有氧' || course.type === 'HIIT' || course.type === '搏击操') {
      suitableZones = zones.filter((z: any) => ['group', 'cardio'].includes(z.area_type))
    } else if (course.type === '力量') {
      suitableZones = zones.filter((z: any) => z.area_type === 'strength' || z.area_type === 'group')
    }

    for (const zone of suitableZones) {
      if (isZoneAvailable(zone.id, startTime, endTime)) {
        return zone
      }
    }
    return null
  }

  function calculateEndTime(startTime: string, duration: number) {
    const [hour, minute] = startTime.split(':').map(Number)
    const endDate = new Date()
    endDate.setHours(hour, minute + duration, 0)
    return `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
  }

  for (const timeSlot of TIME_SLOTS) {
    for (const course of courses) {
      if (course.is_private === 1) continue

      const endTime = calculateEndTime(timeSlot, course.duration)
      
      const coach = findCoachForCourse(course, timeSlot, endTime)
      if (!coach) continue

      const zone = findZoneForCourse(course, timeSlot, endTime)
      if (!zone) continue

      const capacity = Math.min(course.capacity, zone.capacity || 999)

      const schedule = createSchedule({
        course_id: course.id,
        coach_id: coach.id,
        zone_id: zone.id,
        date,
        start_time: timeSlot,
        end_time: endTime,
        capacity,
        status: 'pending',
        is_private: 0
      })

      generatedSchedules.push(schedule)
      coachDailyLoad[coach.id]++
      zoneScheduleMap[zone.id].push({ start_time: timeSlot, end_time: endTime })
    }
  }

  return { 
    success: true, 
    message: `成功生成 ${generatedSchedules.length} 节课程`,
    count: generatedSchedules.length,
    schedules: generatedSchedules 
  }
}

export function getAdjustmentRequests(params?: { status?: string; page?: number; pageSize?: number }) {
  const db = getDb()
  let whereClause = 'WHERE 1=1'
  const queryParams: any = {}

  if (params?.status) {
    whereClause += ' AND ar.status = @status'
    queryParams.status = params.status
  }

  let sql = `
    SELECT ar.*, s.date, s.start_time, s.end_time, c.name as course_name, co.name as coach_name
    FROM adjustment_requests ar
    LEFT JOIN schedules s ON ar.schedule_id = s.id
    LEFT JOIN courses c ON s.course_id = c.id
    LEFT JOIN coaches co ON s.coach_id = co.id
    ${whereClause}
    ORDER BY ar.created_at DESC
  `

  if (params?.page && params?.pageSize) {
    sql += ' LIMIT @limit OFFSET @offset'
    queryParams.limit = params.pageSize
    queryParams.offset = (params.page - 1) * params.pageSize
  }

  const requests = db.prepare(sql).all(queryParams)
  
  const countSql = `SELECT COUNT(*) as count FROM adjustment_requests ar ${whereClause}`
  const total = (db.prepare(countSql).get(queryParams) as { count: number }).count

  return { list: requests, total }
}

export function requestAdjustment(scheduleId: string, adjustment: any) {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuidv4()

  db.prepare(`
    INSERT INTO adjustment_requests (id, schedule_id, requester_id, requester_type, request_type, original_data, requested_data, reason, status, created_at)
    VALUES (@id, @schedule_id, @requester_id, @requester_type, @request_type, @original_data, @requested_data, @reason, 'pending', @created_at)
  `).run({
    id,
    schedule_id: scheduleId,
    ...adjustment,
    created_at: now
  })

  return { id, ...adjustment }
}

export function approveAdjustment(requestId: string) {
  const db = getDb()
  const now = new Date().toISOString()
  
  const request = db.prepare('SELECT * FROM adjustment_requests WHERE id = ?').get(requestId) as any
  if (!request) return { success: false, message: '申请不存在' }

  const requestedData = JSON.parse(request.requested_data || '{}')

  db.prepare(`
    UPDATE adjustment_requests 
    SET status = 'approved', approver_id = ?, approve_time = ?
    WHERE id = ?
  `).run('admin', now, requestId)

  if (request.request_type === 'reschedule' || request.request_type === 'modify') {
    const updateData: any = {}
    if (requestedData.start_time) updateData.start_time = requestedData.start_time
    if (requestedData.end_time) updateData.end_time = requestedData.end_time
    if (requestedData.coach_id) updateData.coach_id = requestedData.coach_id
    if (requestedData.zone_id) updateData.zone_id = requestedData.zone_id
    if (requestedData.capacity) updateData.capacity = requestedData.capacity

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = now
      const setClause = Object.keys(updateData).map(k => `${k} = @${k}`).join(', ')
      db.prepare(`UPDATE schedules SET ${setClause} WHERE id = @id`).run({ ...updateData, id: request.schedule_id })
    }
  }

  return { success: true, message: '已批准调整' }
}

export function rejectAdjustment(requestId: string, reason: string) {
  const db = getDb()
  const now = new Date().toISOString()

  db.prepare(`
    UPDATE adjustment_requests 
    SET status = 'rejected', rejection_reason = ?
    WHERE id = ?
  `).run(reason, requestId)

  return { success: true, message: '已拒绝调整' }
}
