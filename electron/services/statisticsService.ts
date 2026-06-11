import { getDb } from '../database'
import * as ExcelJS from 'exceljs'
import * as path from 'path'
import { app } from 'electron'

export function getStatistics(params: {
  type: 'course' | 'coach' | 'time' | 'overview'
  startDate?: string
  endDate?: string
}) {
  const db = getDb()
  const { type, startDate, endDate } = params

  let dateFilter = ''
  const queryParams: any = {}

  if (startDate) {
    dateFilter += ' AND s.date >= @startDate'
    queryParams.startDate = startDate
  }
  if (endDate) {
    dateFilter += ' AND s.date <= @endDate'
    queryParams.endDate = endDate
  }

  switch (type) {
    case 'course':
      return getCourseStatistics(dateFilter, queryParams)
    case 'coach':
      return getCoachStatistics(dateFilter, queryParams)
    case 'time':
      return getTimeStatistics(dateFilter, queryParams)
    case 'overview':
    default:
      return getOverviewStatistics(dateFilter, queryParams)
  }
}

function getOverviewStatistics(dateFilter: string, queryParams: any) {
  const db = getDb()

  const totalSchedules = db.prepare(`
    SELECT COUNT(*) as count FROM schedules s 
    WHERE s.status != 'cancelled' ${dateFilter}
  `).get(queryParams) as { count: number }

  const totalEnrollments = db.prepare(`
    SELECT COUNT(*) as count FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE e.status IN ('enrolled', 'checked_in', 'completed') ${dateFilter}
  `).get(queryParams) as { count: number }

  const totalCheckIns = db.prepare(`
    SELECT COUNT(*) as count FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE e.status IN ('checked_in', 'completed') ${dateFilter}
  `).get(queryParams) as { count: number }

  const avgAttendanceRate = totalEnrollments.count > 0 
    ? Math.round((totalCheckIns.count / totalEnrollments.count) * 100) 
    : 0

  const totalCalories = db.prepare(`
    SELECT COALESCE(SUM(e.calories_burned), 0) as total FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE e.calories_burned IS NOT NULL ${dateFilter}
  `).get(queryParams) as { total: number }

  const avgSatisfaction = db.prepare(`
    SELECT COALESCE(AVG(e.satisfaction), 0) as avg FROM enrollments e
    JOIN schedules s ON e.schedule_id = s.id
    WHERE e.satisfaction IS NOT NULL ${dateFilter}
  `).get(queryParams) as { avg: number }

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

function getCourseStatistics(dateFilter: string, queryParams: any) {
  const db = getDb()

  const courses = db.prepare(`
    SELECT 
      c.id,
      c.name as course_name,
      c.type as course_type,
      COUNT(s.id) as schedule_count,
      COALESCE(SUM(e_count.total), 0) as total_enrollments,
      COALESCE(SUM(e_checkin.total), 0) as total_checkins,
      COALESCE(AVG(e_satisfaction.avg), 0) as avg_satisfaction,
      COALESCE(SUM(e_calories.total), 0) as total_calories
    FROM courses c
    LEFT JOIN schedules s ON c.id = s.course_id AND s.status != 'cancelled'
    LEFT JOIN (
      SELECT schedule_id, COUNT(*) as total FROM enrollments 
      WHERE status IN ('enrolled', 'checked_in', 'completed')
      GROUP BY schedule_id
    ) e_count ON s.id = e_count.schedule_id
    LEFT JOIN (
      SELECT schedule_id, COUNT(*) as total FROM enrollments 
      WHERE status IN ('checked_in', 'completed')
      GROUP BY schedule_id
    ) e_checkin ON s.id = e_checkin.schedule_id
    LEFT JOIN (
      SELECT s2.course_id, AVG(e.satisfaction) as avg 
      FROM enrollments e
      JOIN schedules s2 ON e.schedule_id = s2.id
      WHERE e.satisfaction IS NOT NULL
      GROUP BY s2.course_id
    ) e_satisfaction ON c.id = e_satisfaction.course_id
    LEFT JOIN (
      SELECT s2.course_id, SUM(e.calories_burned) as total 
      FROM enrollments e
      JOIN schedules s2 ON e.schedule_id = s2.id
      WHERE e.calories_burned IS NOT NULL
      GROUP BY s2.course_id
    ) e_calories ON c.id = e_calories.course_id
    WHERE 1=1 ${dateFilter.replace(/s\./g, 's2.')}
    GROUP BY c.id, c.name, c.type
    ORDER BY total_enrollments DESC
  `).all(queryParams)

  return courses.map((c: any) => ({
    ...c,
    attendance_rate: c.total_enrollments > 0 
      ? Math.round((c.total_checkins / c.total_enrollments) * 100) 
      : 0,
    avg_satisfaction: Math.round(c.avg_satisfaction * 10) / 10
  }))
}

function getCoachStatistics(dateFilter: string, queryParams: any) {
  const db = getDb()

  const coaches = db.prepare(`
    SELECT 
      co.id,
      co.name as coach_name,
      COUNT(s.id) as schedule_count,
      COALESCE(SUM(e_count.total), 0) as total_students,
      COALESCE(AVG(e_satisfaction.avg), 0) as avg_satisfaction,
      COALESCE(SUM(e_calories.total), 0) as total_calories
    FROM coaches co
    LEFT JOIN schedules s ON co.id = s.coach_id AND s.status != 'cancelled'
    LEFT JOIN (
      SELECT schedule_id, COUNT(*) as total FROM enrollments 
      WHERE status IN ('enrolled', 'checked_in', 'completed')
      GROUP BY schedule_id
    ) e_count ON s.id = e_count.schedule_id
    LEFT JOIN (
      SELECT s2.coach_id, AVG(e.satisfaction) as avg 
      FROM enrollments e
      JOIN schedules s2 ON e.schedule_id = s2.id
      WHERE e.satisfaction IS NOT NULL
      GROUP BY s2.coach_id
    ) e_satisfaction ON co.id = e_satisfaction.coach_id
    LEFT JOIN (
      SELECT s2.coach_id, SUM(e.calories_burned) as total 
      FROM enrollments e
      JOIN schedules s2 ON e.schedule_id = s2.id
      WHERE e.calories_burned IS NOT NULL
      GROUP BY s2.coach_id
    ) e_calories ON co.id = e_calories.coach_id
    WHERE 1=1 ${dateFilter.replace(/s\./g, 's2.')}
    GROUP BY co.id, co.name
    ORDER BY total_students DESC
  `).all(queryParams)

  return coaches.map((c: any) => ({
    ...c,
    avg_satisfaction: Math.round(c.avg_satisfaction * 10) / 10
  }))
}

function getTimeStatistics(dateFilter: string, queryParams: any) {
  const db = getDb()

  const timeSlots = db.prepare(`
    SELECT 
      s.start_time,
      COUNT(s.id) as schedule_count,
      COALESCE(SUM(e_count.total), 0) as total_students
    FROM schedules s
    LEFT JOIN (
      SELECT schedule_id, COUNT(*) as total FROM enrollments 
      WHERE status IN ('enrolled', 'checked_in', 'completed')
      GROUP BY schedule_id
    ) e_count ON s.id = e_count.schedule_id
    WHERE s.status != 'cancelled' ${dateFilter}
    GROUP BY s.start_time
    ORDER BY s.start_time
  `).all(queryParams)

  return timeSlots
}

export async function exportReport(params: any, filePath: string) {
  const db = getDb()
  const { startDate, endDate, reportType } = params

  const workbook = new ExcelJS.Workbook()
  workbook.creator = '健身中心排课系统'
  workbook.created = new Date()

  const overviewData = getOverviewStatistics(
    startDate || endDate 
      ? ` AND s.date >= @startDate AND s.date <= @endDate` 
      : '',
    { startDate, endDate }
  )

  const overviewSheet = workbook.addWorksheet('概览')
  overviewSheet.columns = [
    { header: '指标', key: 'metric', width: 25 },
    { header: '数值', key: 'value', width: 20 }
  ]

  overviewSheet.addRow({ metric: '课程总数', value: overviewData.totalSchedules })
  overviewSheet.addRow({ metric: '报名人次', value: overviewData.totalEnrollments })
  overviewSheet.addRow({ metric: '签到人次', value: overviewData.totalCheckIns })
  overviewSheet.addRow({ metric: '平均到课率', value: `${overviewData.avgAttendanceRate}%` })
  overviewSheet.addRow({ metric: '消耗卡路里总计', value: overviewData.totalCalories })
  overviewSheet.addRow({ metric: '平均满意度', value: overviewData.avgSatisfaction })
  overviewSheet.addRow({ metric: '活跃会员数', value: overviewData.totalMembers })
  overviewSheet.addRow({ metric: '在职教练数', value: overviewData.totalCoaches })

  const courseData = getCourseStatistics(
    startDate || endDate 
      ? ` AND s.date >= @startDate AND s.date <= @endDate` 
      : '',
    { startDate, endDate }
  )

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

  const coachData = getCoachStatistics(
    startDate || endDate 
      ? ` AND s.date >= @startDate AND s.date <= @endDate` 
      : '',
    { startDate, endDate }
  )

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
    SELECT s.*, c.name as course_name, c.type as course_type, 
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
