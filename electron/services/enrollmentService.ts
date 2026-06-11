import { getDb } from '../database'
import { v4 as uuidv4 } from 'uuid'
import { getScheduleById } from './scheduleService'
import { getMemberById } from './memberService'

export interface Enrollment {
  id: string
  schedule_id: string
  member_id: string
  enroll_time: string
  check_in_time?: string
  status: string
  is_waitlist: number
  waitlist_position?: number
  calories_burned?: number
  satisfaction?: number
  created_at: string
}

export function getEnrollments(params?: {
  schedule_id?: string
  member_id?: string
  status?: string
  is_waitlist?: number
  page?: number
  pageSize?: number
}) {
  const db = getDb()
  let whereClause = 'WHERE 1=1'
  const queryParams: any = {}

  if (params?.schedule_id) {
    whereClause += ' AND e.schedule_id = @schedule_id'
    queryParams.schedule_id = params.schedule_id
  }
  if (params?.member_id) {
    whereClause += ' AND e.member_id = @member_id'
    queryParams.member_id = params.member_id
  }
  if (params?.status) {
    whereClause += ' AND e.status = @status'
    queryParams.status = params.status
  }
  if (params?.is_waitlist !== undefined) {
    whereClause += ' AND e.is_waitlist = @is_waitlist'
    queryParams.is_waitlist = params.is_waitlist
  }

  let sql = `
    SELECT e.*, m.name as member_name, m.level as member_level, m.phone as member_phone,
           s.date, s.start_time, s.end_time, c.name as course_name
    FROM enrollments e
    LEFT JOIN members m ON e.member_id = m.id
    LEFT JOIN schedules s ON e.schedule_id = s.id
    LEFT JOIN courses c ON s.course_id = c.id
    ${whereClause}
    ORDER BY e.created_at DESC
  `

  if (params?.page && params?.pageSize) {
    sql += ' LIMIT @limit OFFSET @offset'
    queryParams.limit = params.pageSize
    queryParams.offset = (params.page - 1) * params.pageSize
  }

  const enrollments = db.prepare(sql).all(queryParams)

  const countSql = `SELECT COUNT(*) as count FROM enrollments e ${whereClause}`
  const total = (db.prepare(countSql).get(queryParams) as { count: number }).count

  return { list: enrollments, total }
}

export function enrollCourse(memberId: string, scheduleId: string) {
  const db = getDb()
  const now = new Date().toISOString()

  const schedule = getScheduleById(scheduleId) as any
  if (!schedule) return { success: false, message: '课程不存在' }

  if (schedule.status !== 'confirmed') {
    return { success: false, message: '课程未确认，无法报名' }
  }

  const existingEnrollment = db.prepare(
    'SELECT * FROM enrollments WHERE schedule_id = ? AND member_id = ? AND status IN (?, ?)'
  ).get(scheduleId, memberId, 'enrolled', 'waitlist')

  if (existingEnrollment) {
    return { success: false, message: '您已报名该课程' }
  }

  const enrolledCount = db.prepare(
    "SELECT COUNT(*) as count FROM enrollments WHERE schedule_id = ? AND status = 'enrolled' AND is_waitlist = 0"
  ).get(scheduleId) as { count: number }

  const isWaitlist = enrolledCount.count >= schedule.capacity
  let waitlistPosition: number | undefined

  if (isWaitlist) {
    const waitlistCount = db.prepare(
      "SELECT COUNT(*) as count FROM enrollments WHERE schedule_id = ? AND is_waitlist = 1 AND status = 'enrolled'"
    ).get(scheduleId) as { count: number }
    waitlistPosition = waitlistCount.count + 1
  }

  const id = uuidv4()

  db.prepare(`
    INSERT INTO enrollments (id, schedule_id, member_id, enroll_time, status, is_waitlist, waitlist_position, created_at)
    VALUES (?, ?, ?, ?, 'enrolled', ?, ?, ?)
  `).run(id, scheduleId, memberId, now, isWaitlist ? 1 : 0, waitlistPosition, now)

  if (!isWaitlist) {
    db.prepare('UPDATE schedules SET enrolled_count = enrolled_count + 1 WHERE id = ?').run(scheduleId)
  }

  return { 
    success: true, 
    message: isWaitlist ? '已加入候补名单' : '报名成功',
    is_waitlist: isWaitlist,
    waitlist_position: waitlistPosition
  }
}

export function cancelEnrollment(enrollmentId: string) {
  const db = getDb()
  const now = new Date().toISOString()

  const enrollment = db.prepare('SELECT * FROM enrollments WHERE id = ?').get(enrollmentId) as any
  if (!enrollment) return { success: false, message: '报名记录不存在' }

  db.prepare("UPDATE enrollments SET status = 'cancelled' WHERE id = ?").run(enrollmentId)

  if (enrollment.is_waitlist === 0) {
    db.prepare('UPDATE schedules SET enrolled_count = enrolled_count - 1 WHERE id = ?').run(enrollment.schedule_id)
    
    promoteFirstWaitlist(enrollment.schedule_id)
  } else {
    db.prepare(`
      UPDATE enrollments 
      SET waitlist_position = waitlist_position - 1 
      WHERE schedule_id = ? AND is_waitlist = 1 AND status = 'enrolled' AND waitlist_position > ?
    `).run(enrollment.schedule_id, enrollment.waitlist_position)
  }

  return { success: true, message: '已取消报名' }
}

function promoteFirstWaitlist(scheduleId: string): boolean {
  const db = getDb()
  
  const firstWaitlist = db.prepare(`
    SELECT * FROM enrollments 
    WHERE schedule_id = ? AND is_waitlist = 1 AND status = 'enrolled'
    ORDER BY waitlist_position ASC LIMIT 1
  `).get(scheduleId) as any

  if (firstWaitlist) {
    db.prepare(`
      UPDATE enrollments 
      SET is_waitlist = 0, waitlist_position = NULL
      WHERE id = ?
    `).run(firstWaitlist.id)

    db.prepare('UPDATE schedules SET enrolled_count = enrolled_count + 1 WHERE id = ?').run(scheduleId)

    db.prepare(`
      UPDATE enrollments 
      SET waitlist_position = waitlist_position - 1 
      WHERE schedule_id = ? AND is_waitlist = 1 AND status = 'enrolled' AND waitlist_position > ?
    `).run(scheduleId, firstWaitlist.waitlist_position)

    createNotification({
      type: 'waitlist_promoted',
      title: '候补转正通知',
      content: '您已从候补名单中转为正式学员',
      target_type: 'member',
      target_id: firstWaitlist.member_id
    })
    return true
  }
  return false
}

export function checkInMember(enrollmentId: string) {
  const db = getDb()
  const now = new Date().toISOString()

  const enrollment = db.prepare('SELECT * FROM enrollments WHERE id = ?').get(enrollmentId) as any
  if (!enrollment) return { success: false, message: '报名记录不存在' }

  if (enrollment.status !== 'enrolled') {
    return { success: false, message: '报名状态异常' }
  }

  db.prepare("UPDATE enrollments SET status = 'checked_in', check_in_time = ? WHERE id = ?").run(now, enrollmentId)

  return { success: true, message: '签到成功' }
}

export function releaseNoShows() {
  const db = getDb()
  const now = new Date()

  const schedules = db.prepare(`
    SELECT s.id, s.date, s.start_time, s.capacity, s.enrolled_count
    FROM schedules s
    WHERE s.status = 'confirmed'
  `).all() as any[]

  let releasedCount = 0

  const tx = db.transaction(() => {
    for (const schedule of schedules) {
      const scheduleDateTime = new Date(`${schedule.date}T${schedule.start_time}:00`)
      if (now.getTime() - scheduleDateTime.getTime() > 6 * 60 * 60 * 1000) {
        const noShows = db.prepare(`
          SELECT * FROM enrollments 
          WHERE schedule_id = ? AND status = 'enrolled' AND is_waitlist = 0
        `).all(schedule.id) as any[]

        for (const enrollment of noShows) {
          db.prepare("UPDATE enrollments SET status = 'no_show' WHERE id = ?").run(enrollment.id)
          db.prepare('UPDATE schedules SET enrolled_count = enrolled_count - 1 WHERE id = ?').run(schedule.id)
          releasedCount++
        }

        for (let i = 0; i < noShows.length; i++) {
          promoteFirstWaitlist(schedule.id)
        }
      }
    }
  })

  try {
    tx()
    return { releasedCount }
  } catch (err: any) {
    console.error('Release no-shows error:', err)
    return { releasedCount: 0, error: err.message }
  }
}

function createNotification(notification: Omit<any, 'id' | 'created_at' | 'is_read'>) {
  const db = getDb()
  const id = uuidv4()
  const now = new Date().toISOString()

  db.prepare(`
    INSERT INTO notifications (id, type, title, content, target_type, target_id, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, notification.type, notification.title, notification.content, notification.target_type, notification.target_id, now)
}

export function setSatisfaction(enrollmentId: string, satisfaction: number, caloriesBurned?: number) {
  const db = getDb()
  
  db.prepare(`
    UPDATE enrollments SET satisfaction = ?, calories_burned = ?
    WHERE id = ?
  `).run(satisfaction, caloriesBurned, enrollmentId)

  return { success: true }
}
