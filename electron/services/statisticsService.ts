import { getDb } from '../database'
import * as ExcelJS from 'exceljs'
import * as path from 'path'
import { app } from 'electron'

export function getStatistics(params: {
  type: 'course' | 'coach' | 'time' | 'overview'
  startDate?: string
  endDate?: string
}) {
  const { type, startDate, endDate } = params

  switch (type) {
    case 'course':
      return getCourseStatistics(startDate, endDate)
    case 'coach':
      return getCoachStatistics(startDate, endDate)
    case 'time':
      return getTimeStatistics(startDate, endDate)
    case 'overview':
    default:
      return getOverviewStatistics(startDate, endDate)
  }
}

function buildDateWhere(tableAlias: string, startDate?: string, endDate?: string): { clause: string; params: any } {
  let clause = ''
  const params: any = {}
  if (startDate) {
    clause += ` AND ${tableAlias}.date >= @startDate`
    params.startDate = startDate
  }
  if (endDate) {
    clause += ` AND ${tableAlias}.date <= @endDate`
    params.endDate = endDate
  }
  return { clause, params }
}

function getOverviewStatistics(startDate?: string, endDate?: string) {
  const db = getDb()
  const { clause: sDateClause, params } = buildDateWhere('s', startDate, endDate)

  const totalSchedules = db.prepare(`
    SELECT COUNT(*) as count FROM schedules s 
    WHERE s.status != 'cancelled' ${sDateClause}
  `).get(params) as { count: number }

  const totalEnrollments = db.prepare(`
    SELECT COUNT(*) as count FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE e.status IN ('enrolled', 'checked_in', 'completed') ${sDateClause}
  `).get(params) as { count: number }

  const totalCheckIns = db.prepare(`
    SELECT COUNT(*) as count FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE e.status IN ('checked_in', 'completed') ${sDateClause}
  `).get(params) as { count: number }

  const avgAttendanceRate = totalEnrollments.count > 0 
    ? Math.round((totalCheckIns.count / totalEnrollments.count) * 100) 
    : 0

  const totalCalories = db.prepare(`
    SELECT COALESCE(SUM(e.calories_burned), 0) as total FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE e.calories_burned IS NOT NULL ${sDateClause}
  `).get(params) as { total: number }

  const avgSatisfaction = db.prepare(`
    SELECT COALESCE(AVG(e.satisfaction), 0) as avg FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE e.satisfaction IS NOT NULL ${sDateClause}
  `).get(params) as { avg: number }

  const totalMembers = db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'active'").get() as { count: number }
  const totalCoaches = db.prepare("SELECT COUNT(*) as count FROM coaches WHERE status = 'active'").get() as { count: number }

  return {
    totalSchedules: totalSchedules.count,
    totalEnrollments: totalEnrollments.count,
    totalCheckIns: totalCheckIns.count,
    avgAttendanceRate,
    totalCalories: Math.round(totalCalories.total),
    avgSatisfaction: Math.round(avgSatisfaction.avg * 10) / 10,
    totalMembers: totalMembers.count,
    totalCoaches: totalCoaches.count
  }
}

function getCourseStatistics(startDate?: string, endDate?: string) {
  const db = getDb()
  const { clause: sDateClause, params } = buildDateWhere('s', startDate, endDate)
  const { clause: s2DateClause, params: s2Params } = buildDateWhere('s2', startDate, endDate)
  const allParams = { ...params, ...s2Params }

  const courses = db.prepare(`
    SELECT 
      c.id,
      c.name as course_name,
      c.type as course_type,
      COUNT(s.id) as schedule_count,
      COALESCE(SUM(
        (SELECT COUNT(*) FROM enrollments e 
         WHERE e.schedule_id = s.id 
         AND e.status IN ('enrolled', 'checked_in', 'completed'))
      ), 0) as total_enrollments,
      COALESCE(SUM(
        (SELECT COUNT(*) FROM enrollments e 
         WHERE e.schedule_id = s.id 
         AND e.status IN ('checked_in', 'completed'))
      ), 0) as total_checkins,
      COALESCE((
        SELECT AVG(e.satisfaction) FROM enrollments e
        JOIN schedules s2 ON e.schedule_id = s2.id
        WHERE s2.course_id = c.id AND e.satisfaction IS NOT NULL ${s2DateClause}
      ), 0) as avg_satisfaction,
      COALESCE((
        SELECT SUM(e.calories_burned) FROM enrollments e
        JOIN schedules s2 ON e.schedule_id = s2.id
        WHERE s2.course_id = c.id AND e.calories_burned IS NOT NULL ${s2DateClause}
      ), 0) as total_calories
    FROM courses c
    LEFT JOIN schedules s ON c.id = s.course_id AND s.status != 'cancelled' ${sDateClause}
    GROUP BY c.id, c.name, c.type
    ORDER BY total_enrollments DESC
  `).all(allParams)

  return courses.map((c: any) => ({
    ...c,
    attendance_rate: c.total_enrollments > 0 
      ? Math.round((c.total_checkins / c.total_enrollments) * 100) 
      : 0,
    avg_satisfaction: Math.round(c.avg_satisfaction * 10) / 10
  }))
}

function getCoachStatistics(startDate?: string, endDate?: string) {
  const db = getDb()
  const { clause: sDateClause, params } = buildDateWhere('s', startDate, endDate)
  const { clause: s2DateClause, params: s2Params } = buildDateWhere('s2', startDate, endDate)
  const allParams = { ...params, ...s2Params }

  const coaches = db.prepare(`
    SELECT 
      co.id,
      co.name as coach_name,
      COUNT(s.id) as schedule_count,
      COALESCE(SUM(
        (SELECT COUNT(*) FROM enrollments e 
         WHERE e.schedule_id = s.id 
         AND e.status IN ('enrolled', 'checked_in', 'completed'))
      ), 0) as total_students,
      COALESCE((
        SELECT AVG(e.satisfaction) FROM enrollments e
        JOIN schedules s2 ON e.schedule_id = s2.id
        WHERE s2.coach_id = co.id AND e.satisfaction IS NOT NULL ${s2DateClause}
      ), 0) as avg_satisfaction,
      COALESCE((
        SELECT SUM(e.calories_burned) FROM enrollments e
        JOIN schedules s2 ON e.schedule_id = s2.id
        WHERE s2.coach_id = co.id AND e.calories_burned IS NOT NULL ${s2DateClause}
      ), 0) as total_calories
    FROM coaches co
    LEFT JOIN schedules s ON co.id = s.coach_id AND s.status != 'cancelled' ${sDateClause}
    GROUP BY co.id, co.name
    ORDER BY total_students DESC
  `).all(allParams)

  return coaches.map((c: any) => ({
    ...c,
    avg_satisfaction: Math.round(c.avg_satisfaction * 10) / 10
  }))
}

function getTimeStatistics(startDate?: string, endDate?: string) {
  const db = getDb()
  const { clause: sDateClause, params } = buildDateWhere('s', startDate, endDate)

  const timeSlots = db.prepare(`
    SELECT 
      s.start_time,
      COUNT(s.id) as schedule_count,
      COALESCE(SUM(
        (SELECT COUNT(*) FROM enrollments e 
         WHERE e.schedule_id = s.id 
         AND e.status IN ('enrolled', 'checked_in', 'completed'))
      ), 0) as total_students
    FROM schedules s
    WHERE s.status != 'cancelled' ${sDateClause}
    GROUP BY s.start_time
    ORDER BY s.start_time
  `).all(params)

  return timeSlots
}

function buildAttendanceDetail(startDate?: string, endDate?: string) {
  const db = getDb()
  const { clause: sDateClause, params } = buildDateWhere('s', startDate, endDate)

  return db.prepare(`
    SELECT 
      s.date,
      s.start_time,
      c.name as course_name,
      c.type as course_type,
      co.name as coach_name,
      z.name as zone_name,
      s.capacity,
      (SELECT COUNT(*) FROM enrollments e 
       WHERE e.schedule_id = s.id AND e.is_waitlist = 0 
       AND e.status IN ('enrolled', 'checked_in', 'completed')) as enrolled,
      (SELECT COUNT(*) FROM enrollments e 
       WHERE e.schedule_id = s.id AND e.is_waitlist = 0 
       AND e.status IN ('checked_in', 'completed')) as checked_in,
      (SELECT COUNT(*) FROM enrollments e 
       WHERE e.schedule_id = s.id AND e.is_waitlist = 0 
       AND e.status = 'no_show') as no_show,
      s.status as schedule_status
    FROM schedules s
    LEFT JOIN courses c ON s.course_id = c.id
    LEFT JOIN coaches co ON s.coach_id = co.id
    LEFT JOIN zones z ON s.zone_id = z.id
    WHERE s.status != 'cancelled' ${sDateClause}
    ORDER BY s.date ASC, s.start_time ASC
  `).all(params).map((r: any) => ({
    ...r,
    attendance_rate: r.enrolled > 0 
      ? `${Math.round((r.checked_in / r.enrolled) * 100)}%` 
      : '-'
  }))
}

function buildCaloriesDetail(startDate?: string, endDate?: string) {
  const db = getDb()
  const { clause: sDateClause, params } = buildDateWhere('s', startDate, endDate)

  return db.prepare(`
    SELECT 
      s.date,
      s.start_time,
      c.name as course_name,
      c.type as course_type,
      c.calories_per_hour,
      co.name as coach_name,
      m.name as member_name,
      m.level as member_level,
      CASE WHEN e.status IN ('checked_in', 'completed') THEN e.calories_burned
           ELSE COALESCE(e.calories_burned, ROUND(c.calories_per_hour * (c.duration / 60.0), 0))
      END as calories,
      e.status as enrollment_status,
      e.satisfaction
    FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    JOIN courses c ON s.course_id = c.id
    LEFT JOIN coaches co ON s.coach_id = co.id
    LEFT JOIN members m ON e.member_id = m.id
    WHERE e.is_waitlist = 0 ${sDateClause}
    ORDER BY s.date ASC, s.start_time ASC, c.name ASC
  `).all(params)
}

export async function exportReport(params: any, filePath: string) {
  const { startDate, endDate } = params

  const workbook = new ExcelJS.Workbook()
  workbook.creator = '健身中心排课系统'
  workbook.created = new Date()

  const overviewData = getOverviewStatistics(startDate, endDate)

  const overviewSheet = workbook.addWorksheet('概览')
  overviewSheet.columns = [
    { header: '指标', key: 'metric', width: 25 },
    { header: '数值', key: 'value', width: 20 }
  ]

  overviewSheet.addRow({ metric: '统计周期开始', value: startDate || '-' })
  overviewSheet.addRow({ metric: '统计周期结束', value: endDate || '-' })
  overviewSheet.addRow({ metric: '课程总数', value: overviewData.totalSchedules })
  overviewSheet.addRow({ metric: '报名人次', value: overviewData.totalEnrollments })
  overviewSheet.addRow({ metric: '签到人次', value: overviewData.totalCheckIns })
  overviewSheet.addRow({ metric: '平均到课率', value: `${overviewData.avgAttendanceRate}%` })
  overviewSheet.addRow({ metric: '消耗卡路里总计', value: overviewData.totalCalories })
  overviewSheet.addRow({ metric: '平均满意度', value: overviewData.avgSatisfaction })
  overviewSheet.addRow({ metric: '活跃会员数', value: overviewData.totalMembers })
  overviewSheet.addRow({ metric: '在职教练数', value: overviewData.totalCoaches })

  const courseData = getCourseStatistics(startDate, endDate)

  const courseSheet = workbook.addWorksheet('课程统计')
  courseSheet.columns = [
    { header: '课程名称', key: 'course_name', width: 20 },
    { header: '课程类型', key: 'course_type', width: 12 },
    { header: '排课数量', key: 'schedule_count', width: 12 },
    { header: '报名人次', key: 'total_enrollments', width: 12 },
    { header: '签到人次', key: 'total_checkins', width: 12 },
    { header: '到课率', key: 'attendance_rate', width: 12 },
    { header: '平均满意度', key: 'avg_satisfaction', width: 12 },
    { header: '消耗卡路里', key: 'total_calories', width: 12 }
  ]

  courseData.forEach((item: any) => {
    courseSheet.addRow({
      ...item,
      attendance_rate: `${item.attendance_rate}%`
    })
  })

  const coachData = getCoachStatistics(startDate, endDate)

  const coachSheet = workbook.addWorksheet('教练统计')
  coachSheet.columns = [
    { header: '教练姓名', key: 'coach_name', width: 15 },
    { header: '排课数量', key: 'schedule_count', width: 12 },
    { header: '学员人次', key: 'total_students', width: 12 },
    { header: '平均满意度', key: 'avg_satisfaction', width: 12 },
    { header: '消耗卡路里', key: 'total_calories', width: 12 }
  ]

  coachData.forEach((item: any) => {
    coachSheet.addRow(item)
  })

  const attendanceDetail = buildAttendanceDetail(startDate, endDate)

  const attendanceSheet = workbook.addWorksheet('到课率明细')
  attendanceSheet.columns = [
    { header: '日期', key: 'date', width: 12 },
    { header: '开始时间', key: 'start_time', width: 10 },
    { header: '课程名称', key: 'course_name', width: 18 },
    { header: '课程类型', key: 'course_type', width: 10 },
    { header: '教练', key: 'coach_name', width: 12 },
    { header: '场地', key: 'zone_name', width: 12 },
    { header: '容量', key: 'capacity', width: 8 },
    { header: '报名人数', key: 'enrolled', width: 10 },
    { header: '签到人数', key: 'checked_in', width: 10 },
    { header: '未到人数', key: 'no_show', width: 10 },
    { header: '到课率', key: 'attendance_rate', width: 10 },
    { header: '课程状态', key: 'schedule_status', width: 10 }
  ]

  attendanceDetail.forEach((item: any) => {
    attendanceSheet.addRow(item)
  })

  const caloriesDetail = buildCaloriesDetail(startDate, endDate)

  const caloriesSheet = workbook.addWorksheet('卡路里明细')
  caloriesSheet.columns = [
    { header: '日期', key: 'date', width: 12 },
    { header: '时间', key: 'start_time', width: 10 },
    { header: '课程名称', key: 'course_name', width: 18 },
    { header: '课程类型', key: 'course_type', width: 10 },
    { header: '教练', key: 'coach_name', width: 12 },
    { header: '会员姓名', key: 'member_name', width: 12 },
    { header: '会员等级', key: 'member_level', width: 10 },
    { header: '课程卡路里/小时', key: 'calories_per_hour', width: 16 },
    { header: '实际消耗卡路里', key: 'calories', width: 14 },
    { header: '报名状态', key: 'enrollment_status', width: 10 },
    { header: '满意度', key: 'satisfaction', width: 8 }
  ]

  caloriesDetail.forEach((item: any) => {
    caloriesSheet.addRow(item)
  })

  await workbook.xlsx.writeFile(filePath)

  return { success: true, filePath }
}

export function getHeatmapData(date: string) {
  const db = getDb()

  const zoneSchedules = db.prepare(`
    SELECT z.id, z.name, z.area_type, z.capacity, z.position_x, z.position_y, z.width, z.height, z.color,
           COUNT(s.id) as schedule_count,
           COALESCE(SUM(CASE WHEN e.status IN ('enrolled', 'checked_in') THEN 1 ELSE 0 END), 0) as student_count
    FROM zones z
    LEFT JOIN schedules s ON z.id = s.zone_id AND s.date = ? AND s.status != 'cancelled'
    LEFT JOIN enrollments e ON s.id = e.schedule_id
    GROUP BY z.id, z.name, z.area_type, z.capacity, z.position_x, z.position_y, z.width, z.height, z.color
    ORDER BY z.name
  `).all(date)

  const equipmentByZone = db.prepare(`
    SELECT zone_id, COUNT(*) as equipment_count, 
           SUM(CASE WHEN status = 'normal' THEN 1 ELSE 0 END) as normal_count,
           SUM(CASE WHEN status = 'maintenance_required' THEN 1 ELSE 0 END) as maintenance_count
    FROM equipment
    GROUP BY zone_id
  `).all()

  const equipmentMap: Record<string, any> = {}
  equipmentByZone.forEach((item: any) => {
    equipmentMap[item.zone_id] = item
  })

  return zoneSchedules.map((zone: any) => ({
    ...zone,
    equipment_count: equipmentMap[zone.id]?.equipment_count || 0,
    normal_equipment: equipmentMap[zone.id]?.normal_count || 0,
    maintenance_equipment: equipmentMap[zone.id]?.maintenance_count || 0,
    heat_level: calculateHeatLevel(zone.student_count, zone.capacity)
  }))
}

function calculateHeatLevel(studentCount: number, capacity: number): number {
  if (capacity === 0) return 0
  const ratio = studentCount / capacity
  if (ratio >= 0.8) return 3
  if (ratio >= 0.5) return 2
  if (ratio > 0) return 1
  return 0
}

export function getDashboardStats() {
  const db = getDb()
  const today = new Date().toISOString().split('T')[0]

  const todaySchedules = db.prepare(`
    SELECT COUNT(*) as count FROM schedules WHERE date = ? AND status != 'cancelled'
  `).get(today) as { count: number }

  const todayEnrollments = db.prepare(`
    SELECT COUNT(*) as count FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE s.date = ? AND e.status IN ('enrolled', 'checked_in')
  `).get(today) as { count: number }

  const todayCheckIns = db.prepare(`
    SELECT COUNT(*) as count FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE s.date = ? AND e.status = 'checked_in'
  `).get(today) as { count: number }

  const maintenanceCount = db.prepare(`
    SELECT COUNT(*) as count FROM equipment WHERE status = 'maintenance_required'
  `).get() as { count: number }

  const pendingAdjustments = db.prepare(`
    SELECT COUNT(*) as count FROM adjustment_requests WHERE status = 'pending'
  `).get() as { count: number }

  const activeMembers = db.prepare(`
    SELECT COUNT(*) as count FROM members WHERE status = 'active'
  `).get() as { count: number }

  const activeCoaches = db.prepare(`
    SELECT COUNT(*) as count FROM coaches WHERE status = 'active'
  `).get() as { count: number }

  const todayScheduleList = db.prepare(`
    SELECT s.id, s.course_id, s.coach_id, s.zone_id, s.date, s.start_time, s.end_time,
           s.capacity, s.status, s.is_private, s.member_id, s.notes, s.created_at, s.updated_at,
           COALESCE((
             SELECT COUNT(*) FROM enrollments e
             WHERE e.schedule_id = s.id 
               AND e.is_waitlist = 0 
               AND e.status IN ('enrolled', 'checked_in', 'completed')
           ), 0) as enrolled_count,
           c.name as course_name, c.type as course_type, 
           co.name as coach_name, z.name as zone_name
    FROM schedules s
    LEFT JOIN courses c ON s.course_id = c.id
    LEFT JOIN coaches co ON s.coach_id = co.id
    LEFT JOIN zones z ON s.zone_id = z.id
    WHERE s.date = ? AND s.status != 'cancelled'
    ORDER BY s.start_time ASC
    LIMIT 6
  `).all(today)

  return {
    today: {
      schedules: todaySchedules.count,
      enrollments: todayEnrollments.count,
      checkIns: todayCheckIns.count
    },
    maintenance: maintenanceCount.count,
    pendingAdjustments: pendingAdjustments.count,
    activeMembers: activeMembers.count,
    activeCoaches: activeCoaches.count,
    todayScheduleList
  }
}
