import { getDb } from '../database'
import { v4 as uuidv4 } from 'uuid'
import { getZones, getEquipmentByZone } from './equipmentService'

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

const LEVEL_ORDER: Record<string, number> = {
  'VIP': 4,
  '钻石': 3,
  '黄金': 2,
  '普通': 1
}

export function getSchedules(params?: { 
  page?: number; 
  pageSize?: number; 
  date?: string; 
  startDate?: string;
  endDate?: string;
  coach_id?: string; 
  status?: string;
  statuses?: string[];
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
  if (params?.status && !params?.statuses) {
    whereClause += ' AND s.status = @status'
    queryParams.status = params.status
  }
  if (params?.statuses && params.statuses.length > 0) {
    const placeholders = params.statuses.map((_, i) => `@status_${i}`).join(', ')
    whereClause += ` AND s.status IN (${placeholders})`
    params.statuses.forEach((s, i) => { queryParams[`status_${i}`] = s })
  }
  if (params?.is_private !== undefined) {
    whereClause += ' AND s.is_private = @is_private'
    queryParams.is_private = params.is_private
  }

  let sql = `
    SELECT s.id, s.course_id, s.coach_id, s.zone_id, s.date, s.start_time, s.end_time,
           s.capacity, s.status, s.is_private, s.member_id, s.notes, s.match_reason, s.created_at, s.updated_at,
           COALESCE((
             SELECT COUNT(*) FROM enrollments e
             WHERE e.schedule_id = s.id 
               AND e.is_waitlist = 0 
               AND e.status IN ('enrolled', 'checked_in', 'completed')
           ), 0) as enrolled_count,
           c.name as course_name, c.type as course_type, c.duration, c.calories_per_hour,
           co.name as coach_name, z.name as zone_name, m.name as member_name, m.level as member_level, m.preferences as member_preferences
    FROM schedules s
    LEFT JOIN courses c ON s.course_id = c.id
    LEFT JOIN coaches co ON s.coach_id = co.id
    LEFT JOIN zones z ON s.zone_id = z.id
    LEFT JOIN members m ON s.member_id = m.id
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
    SELECT s.id, s.course_id, s.coach_id, s.zone_id, s.date, s.start_time, s.end_time,
           s.capacity, s.status, s.is_private, s.member_id, s.notes, s.match_reason, s.created_at, s.updated_at,
           COALESCE((
             SELECT COUNT(*) FROM enrollments e
             WHERE e.schedule_id = s.id 
               AND e.is_waitlist = 0 
               AND e.status IN ('enrolled', 'checked_in', 'completed')
           ), 0) as enrolled_count,
           c.name as course_name, c.type as course_type, c.duration, c.calories_per_hour,
           co.name as coach_name, z.name as zone_name, m.name as member_name, m.preferences as member_preferences
    FROM schedules s
    LEFT JOIN courses c ON s.course_id = c.id
    LEFT JOIN coaches co ON s.coach_id = co.id
    LEFT JOIN zones z ON s.zone_id = z.id
    LEFT JOIN members m ON s.member_id = m.id
    WHERE s.id = ?
  `).get(id)
}

export function createSchedule(schedule: Omit<Schedule, 'id' | 'created_at' | 'updated_at' | 'enrolled_count'> & { match_reason?: string }): any {
  const db = getDb()
  const now = new Date().toISOString()
  const id = uuidv4()

  const stmt = db.prepare(`
    INSERT INTO schedules (id, course_id, coach_id, zone_id, date, start_time, end_time, capacity, enrolled_count, status, is_private, member_id, notes, match_reason, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
  `)
  stmt.run(
    id,
    schedule.course_id,
    schedule.coach_id,
    schedule.zone_id || null,
    schedule.date,
    schedule.start_time,
    schedule.end_time,
    schedule.capacity,
    schedule.status,
    schedule.is_private,
    schedule.member_id || null,
    schedule.notes || null,
    (schedule as any).match_reason || null,
    now,
    now
  )

  return getScheduleById(id)
}

export function updateScheduleStatus(id: string, status: string) {
  const db = getDb()
  const now = new Date().toISOString()
  
  db.prepare('UPDATE schedules SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id)

  if (status === 'in_progress') {
    incrementEquipmentUsageForSchedule(id)
  }

  return getScheduleById(id)
}

function incrementEquipmentUsageForSchedule(scheduleId: string) {
  const db = getDb()
  const schedule = getScheduleById(scheduleId) as any
  if (!schedule || !schedule.zone_id) return

  const equipmentList = getEquipmentByZone(schedule.zone_id)
  for (const equip of equipmentList) {
    if (equip.status === 'normal') {
      const newCount = equip.current_usage_count + 1
      let newStatus = 'normal'
      if (newCount >= equip.max_usage_count) {
        newStatus = 'maintenance_required'
      }
      db.prepare(`
        UPDATE equipment SET current_usage_count = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).run(newCount, newStatus, new Date().toISOString(), equip.id)
    }
  }
}

export function confirmSchedule(id: string) {
  return updateScheduleStatus(id, 'confirmed')
}

export function cancelSchedule(id: string, reason: string) {
  const db = getDb()
  const schedule = getScheduleById(id)
  if (!schedule) return undefined

  const tx = db.transaction(() => {
    db.prepare('UPDATE schedules SET status = ?, notes = ?, updated_at = ? WHERE id = ?').run(
      'cancelled', reason, new Date().toISOString(), id
    )
    db.prepare(`
      UPDATE enrollments SET status = 'cancelled' 
      WHERE schedule_id = ? AND status IN ('enrolled', 'checked_in')
    `).run(id)
  })
  tx()

  return getScheduleById(id)
}

export function deleteSchedulesByDate(date: string) {
  const db = getDb()
  const tx = db.transaction(() => {
    const scheduleIds = db.prepare('SELECT id FROM schedules WHERE date = ? AND status = ?').all(date, 'pending') as any[]
    for (const s of scheduleIds) {
      db.prepare('DELETE FROM enrollments WHERE schedule_id = ?').run(s.id)
    }
    db.prepare('DELETE FROM schedules WHERE date = ? AND status = ?').run(date, 'pending')
  })
  tx()
  return true
}

export function generateSchedule(date: string) {
  const db = getDb()
  
  const existing = db.prepare('SELECT COUNT(*) as count FROM schedules WHERE date = ?').get(date) as { count: number }

  const courses = db.prepare('SELECT * FROM courses').all() as any[]
  const groupCourses = courses.filter((c: any) => c.is_private === 0)
  const privateCourses = courses.filter((c: any) => c.is_private === 1)
  
  const coaches = db.prepare("SELECT * FROM coaches WHERE status = 'active'").all() as any[]
  const members = db.prepare("SELECT * FROM members WHERE status = 'active' ORDER BY level DESC, join_date ASC").all() as any[]
  const zones = getZones() as any[]

  const generatedSchedules: any[] = []
  const coachDailyLoad: Record<string, number> = {}
  const coachGroupLoad: Record<string, number> = {}
  const coachTimeSlots: Record<string, string[]> = {}
  const zoneScheduleMap: Record<string, any[]> = {}
  const memberPrivateScheduled: Record<string, boolean> = {}
  const timeSlotGroupCoaches: Record<string, string[]> = {}

  TIME_SLOTS.forEach(t => { timeSlotGroupCoaches[t] = [] })

  coaches.forEach(coach => {
    coachDailyLoad[coach.id] = 0
    coachGroupLoad[coach.id] = 0
    coachTimeSlots[coach.id] = []
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

  function isCoachAvailable(coachId: string, startTime: string, endTime: string, isGroup: boolean = false) {
    const coach = coaches.find(c => c.id === coachId)
    if (!coach) return false
    if (coachDailyLoad[coachId] >= coach.max_daily_classes) return false
    
    if (isGroup) {
      const maxGroupClasses = Math.max(1, Math.floor(coach.max_daily_classes * 0.6))
      if (coachGroupLoad[coachId] >= maxGroupClasses) return false
    }
    
    const slots = coachTimeSlots[coachId] || []
    return !slots.some(slot => isTimeOverlap(startTime, endTime, slot.split('-')[0], slot.split('-')[1]))
  }

  function reserveCoachTime(coachId: string, startTime: string, endTime: string, isGroup: boolean = false) {
    if (!coachTimeSlots[coachId]) coachTimeSlots[coachId] = []
    coachTimeSlots[coachId].push(`${startTime}-${endTime}`)
    if (isGroup) coachGroupLoad[coachId]++
  }

  function findCoachForCourse(course: any, startTime: string, endTime: string, isPrivate: boolean = false) {
    const isGroup = !isPrivate

    if (isGroup) {
      const usedInSlot = timeSlotGroupCoaches[startTime] || []
      if (usedInSlot.length >= Math.max(1, coaches.length - 2)) {
        return null
      }
    }

    const suitableCoaches = coaches.filter(coach => {
      let specialties: string[] = []
      try { specialties = JSON.parse(coach.specialties || '[]') } catch {}
      return specialties.includes(course.name) || specialties.includes(course.type)
    })

    let availableCoach = null

    if (suitableCoaches.length > 0) {
      suitableCoaches.sort((a, b) => coachDailyLoad[a.id] - coachDailyLoad[b.id])
      for (const coach of suitableCoaches) {
        if (isCoachAvailable(coach.id, startTime, endTime, isGroup)) {
          availableCoach = coach
          break
        }
      }
    }

    if (!availableCoach) {
      availableCoach = coaches.find(c => isCoachAvailable(c.id, startTime, endTime, isGroup)) || null
    }

    if (availableCoach && isGroup) {
      timeSlotGroupCoaches[startTime].push(availableCoach.id)
    }
    return availableCoach
  }

  function findZoneForCourse(course: any, startTime: string, endTime: string, isPrivate: boolean = false) {
    if (isPrivate) {
      const privateZones = zones.filter((z: any) => z.area_type === 'private')
      for (const zone of privateZones) {
        if (isZoneAvailable(zone.id, startTime, endTime)) return zone
      }
    }

    let suitableZones = zones.filter((z: any) => ['group', 'yoga', 'cardio', 'strength'].includes(z.area_type))
    
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

  function checkZoneEquipmentAvailable(zoneId: string): boolean {
    const equipmentList = getEquipmentByZone(zoneId)
    if (equipmentList.length === 0) return true
    const locked = equipmentList.filter(e => e.status === 'maintenance_required')
    return locked.length < equipmentList.length
  }

  function calculateEndTime(startTime: string, duration: number) {
    const [hour, minute] = startTime.split(':').map(Number)
    const totalMinutes = hour * 60 + minute + duration
    const endHour = Math.floor(totalMinutes / 60) % 24
    const endMinute = totalMinutes % 60
    return `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
  }

  function getMemberPreferences(member: any): string[] {
    try {
      return JSON.parse(member.preferences || '[]')
    } catch {
      return []
    }
  }

  function matchMemberToCourse(member: any, course: any): number {
    const prefs = getMemberPreferences(member)
    let score = 0
    const matchName = prefs.includes(course.name)
    const matchType = prefs.includes(course.type)
    const matchPrivate = prefs.includes('私教')
    if (matchName) score += 10
    if (matchType) score += 5
    if (matchPrivate) score += 8
    score += LEVEL_ORDER[member.level] || 0
    return score
  }

  function isMemberMatchPrivateCourse(member: any, course: any): boolean {
    const prefs = getMemberPreferences(member)
    return prefs.includes('私教') || prefs.includes(course.name) || prefs.includes(course.type)
  }

  const tx = db.transaction(() => {
    if (existing.count > 0) {
      deleteSchedulesByDate(date)
    }

    const slotCourseDone: Record<string, Set<string>> = {}
    TIME_SLOTS.forEach(t => { slotCourseDone[t] = new Set() })

    for (const timeSlot of TIME_SLOTS) {
      for (const course of groupCourses) {
        if (slotCourseDone[timeSlot].has(course.id)) continue

        const endTime = calculateEndTime(timeSlot, course.duration)
        
        const coach = findCoachForCourse(course, timeSlot, endTime, false)
        if (!coach) continue

        const zone = findZoneForCourse(course, timeSlot, endTime, false)
        if (!zone) continue

        if (!checkZoneEquipmentAvailable(zone.id)) continue

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
        reserveCoachTime(coach.id, timeSlot, endTime, true)
        zoneScheduleMap[zone.id].push({ start_time: timeSlot, end_time: endTime })
        slotCourseDone[timeSlot].add(course.id)
      }
    }

    const sortedMembers = [...members].sort((a, b) => {
      const la = LEVEL_ORDER[a.level] || 0
      const lb = LEVEL_ORDER[b.level] || 0
      return lb - la
    })

    if (privateCourses.length > 0) {
      for (const member of sortedMembers) {
        if (memberPrivateScheduled[member.id]) continue
        
        let matched = false

        for (const course of privateCourses) {
          if (matched) break
          
          if (!isMemberMatchPrivateCourse(member, course)) continue

          for (const timeSlot of TIME_SLOTS) {
            if (matched) break
            
            const endTime = calculateEndTime(timeSlot, course.duration)
            const score = matchMemberToCourse(member, course)
            const prefs = getMemberPreferences(member)

            const coach = findCoachForCourse(course, timeSlot, endTime, true)
            if (!coach) continue

            const zone = findZoneForCourse(course, timeSlot, endTime, true)
            if (!zone) continue

            const reasons: string[] = []
            if (prefs.includes('私教')) reasons.push('偏好含"私教"')
            if (prefs.includes(course.name)) reasons.push(`偏好匹配课程：${course.name}`)
            if (prefs.includes(course.type)) reasons.push(`偏好匹配类型：${course.type}`)
            if (reasons.length === 0) reasons.push('综合匹配')
            reasons.push(`会员等级：${member.level}`)
            const matchReason = reasons.join('；')

            const schedule = createSchedule({
              course_id: course.id,
              coach_id: coach.id,
              zone_id: zone.id,
              date,
              start_time: timeSlot,
              end_time: endTime,
              capacity: 1,
              status: 'pending',
              is_private: 1,
              member_id: member.id,
              match_reason: matchReason
            })

            generatedSchedules.push(schedule)
            coachDailyLoad[coach.id]++
            reserveCoachTime(coach.id, timeSlot, endTime)
            zoneScheduleMap[zone.id].push({ start_time: timeSlot, end_time: endTime })
            memberPrivateScheduled[member.id] = true
            matched = true
          }
        }
      }
    }
  })

  try {
    tx()
    return { 
      success: true, 
      message: `成功生成 ${generatedSchedules.length} 节课程（团课 ${generatedSchedules.filter(s => !s.is_private).length} 节，私教 ${generatedSchedules.filter(s => s.is_private).length} 节）`,
      count: generatedSchedules.length,
      schedules: generatedSchedules 
    }
  } catch (err: any) {
    console.error('Generate schedule error:', err)
    return { success: false, message: '生成排课失败：' + err.message }
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `).run(
    id,
    scheduleId,
    adjustment.requester_id || null,
    adjustment.requester_type || 'operator',
    adjustment.request_type,
    adjustment.original_data || null,
    adjustment.requested_data || null,
    adjustment.reason || null,
    now
  )

  return { id, ...adjustment }
}

export function approveAdjustment(requestId: string) {
  const db = getDb()
  const now = new Date().toISOString()
  
  const tx = db.transaction(() => {
    const request = db.prepare('SELECT * FROM adjustment_requests WHERE id = ?').get(requestId) as any
    if (!request) return { success: false, message: '申请不存在' }

    db.prepare(`
      UPDATE adjustment_requests 
      SET status = 'approved', approver_id = ?, approve_time = ?
      WHERE id = ?
    `).run('admin', now, requestId)

    if (request.request_type === 'reschedule' || request.request_type === 'modify') {
      let requestedData: any = {}
      try { requestedData = JSON.parse(request.requested_data || '{}') } catch {}

      const updateData: any = {}
      if (requestedData.start_time) updateData.start_time = requestedData.start_time
      if (requestedData.end_time) updateData.end_time = requestedData.end_time
      if (requestedData.coach_id) updateData.coach_id = requestedData.coach_id
      if (requestedData.zone_id) updateData.zone_id = requestedData.zone_id
      if (requestedData.capacity) updateData.capacity = requestedData.capacity
      updateData.updated_at = now

      if (Object.keys(updateData).length > 0) {
        const fields = Object.keys(updateData).map(k => `${k} = ?`).join(', ')
        const values = [...Object.values(updateData), request.schedule_id]
        db.prepare(`UPDATE schedules SET ${fields} WHERE id = ?`).run(...values)
      }
    }
  })

  try {
    tx()
    return { success: true, message: '已批准调整' }
  } catch (err: any) {
    return { success: false, message: err.message }
  }
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
