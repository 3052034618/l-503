import { ipcMain, dialog } from 'electron'
import * as memberService from './services/memberService'
import * as coachService from './services/coachService'
import * as equipmentService from './services/equipmentService'
import * as courseService from './services/courseService'
import * as scheduleService from './services/scheduleService'
import * as enrollmentService from './services/enrollmentService'
import * as statisticsService from './services/statisticsService'
import * as operationLogService from './services/operationLogService'

export function registerIpcHandlers() {
  ipcMain.handle('get-members', async (_event, params) => {
    return memberService.getMembers(params)
  })

  ipcMain.handle('get-member-by-id', async (_event, id) => {
    return memberService.getMemberById(id)
  })

  ipcMain.handle('create-member', async (_event, member) => {
    return memberService.createMember(member)
  })

  ipcMain.handle('update-member', async (_event, id, member) => {
    return memberService.updateMember(id, member)
  })

  ipcMain.handle('delete-member', async (_event, id) => {
    return memberService.deleteMember(id)
  })

  ipcMain.handle('get-coaches', async (_event, params) => {
    return coachService.getCoaches(params)
  })

  ipcMain.handle('get-coach-by-id', async (_event, id) => {
    return coachService.getCoachById(id)
  })

  ipcMain.handle('create-coach', async (_event, coach) => {
    return coachService.createCoach(coach)
  })

  ipcMain.handle('update-coach', async (_event, id, coach) => {
    return coachService.updateCoach(id, coach)
  })

  ipcMain.handle('delete-coach', async (_event, id) => {
    return coachService.deleteCoach(id)
  })

  ipcMain.handle('get-equipment', async (_event, params) => {
    return equipmentService.getEquipment(params)
  })

  ipcMain.handle('get-equipment-by-id', async (_event, id) => {
    return equipmentService.getEquipmentById(id)
  })

  ipcMain.handle('create-equipment', async (_event, equipment) => {
    return equipmentService.createEquipment(equipment)
  })

  ipcMain.handle('update-equipment', async (_event, id, equipment) => {
    return equipmentService.updateEquipment(id, equipment)
  })

  ipcMain.handle('delete-equipment', async (_event, id) => {
    return equipmentService.deleteEquipment(id)
  })

  ipcMain.handle('get-maintenance-reminders', async () => {
    return equipmentService.getMaintenanceReminders()
  })

  ipcMain.handle('perform-maintenance', async (_event, id) => {
    return equipmentService.performMaintenance(id)
  })

  ipcMain.handle('get-courses', async (_event, params) => {
    return courseService.getCourses(params)
  })

  ipcMain.handle('get-course-by-id', async (_event, id) => {
    return courseService.getCourseById(id)
  })

  ipcMain.handle('create-course', async (_event, course) => {
    return courseService.createCourse(course)
  })

  ipcMain.handle('update-course', async (_event, id, course) => {
    return courseService.updateCourse(id, course)
  })

  ipcMain.handle('delete-course', async (_event, id) => {
    return courseService.deleteCourse(id)
  })

  ipcMain.handle('get-schedules', async (_event, params) => {
    return scheduleService.getSchedules(params)
  })

  ipcMain.handle('get-schedule-by-id', async (_event, id) => {
    return scheduleService.getScheduleById(id)
  })

  ipcMain.handle('generate-schedule', async (_event, date) => {
    return scheduleService.generateSchedule(date)
  })

  ipcMain.handle('confirm-schedule', async (_event, id) => {
    return scheduleService.confirmSchedule(id)
  })

  ipcMain.handle('cancel-schedule', async (_event, id, reason) => {
    return scheduleService.cancelSchedule(id, reason)
  })

  ipcMain.handle('request-adjustment', async (_event, id, adjustment) => {
    return scheduleService.requestAdjustment(id, adjustment)
  })

  ipcMain.handle('approve-adjustment', async (_event, requestId) => {
    return scheduleService.approveAdjustment(requestId)
  })

  ipcMain.handle('reject-adjustment', async (_event, requestId, reason) => {
    return scheduleService.rejectAdjustment(requestId, reason)
  })

  ipcMain.handle('get-adjustment-requests', async (_event, params) => {
    return scheduleService.getAdjustmentRequests(params)
  })

  ipcMain.handle('update-course-status', async (_event, id, status) => {
    return scheduleService.updateScheduleStatus(id, status)
  })

  ipcMain.handle('get-enrollments', async (_event, params) => {
    return enrollmentService.getEnrollments(params)
  })

  ipcMain.handle('enroll-course', async (_event, memberId, scheduleId) => {
    return enrollmentService.enrollCourse(memberId, scheduleId)
  })

  ipcMain.handle('cancel-enrollment', async (_event, enrollmentId) => {
    return enrollmentService.cancelEnrollment(enrollmentId)
  })

  ipcMain.handle('check-in-member', async (_event, enrollmentId) => {
    return enrollmentService.checkInMember(enrollmentId)
  })

  ipcMain.handle('release-no-shows', async () => {
    return enrollmentService.releaseNoShows()
  })

  ipcMain.handle('get-statistics', async (_event, params) => {
    return statisticsService.getStatistics(params)
  })

  ipcMain.handle('export-report', async (_event, params) => {
    const result = await dialog.showSaveDialog({
      title: '导出运营报告',
      defaultPath: `运营报告_${new Date().toISOString().split('T')[0]}.xlsx`,
      filters: [{ name: 'Excel 文件', extensions: ['xlsx'] }]
    })

    if (result.canceled || !result.filePath) {
      return { success: false, message: '已取消导出' }
    }

    return statisticsService.exportReport(params, result.filePath)
  })

  ipcMain.handle('get-heatmap-data', async (_event, date) => {
    return statisticsService.getHeatmapData(date)
  })

  ipcMain.handle('get-zones', async () => {
    return equipmentService.getZones()
  })

  ipcMain.handle('get-dashboard-stats', async () => {
    return statisticsService.getDashboardStats()
  })

  ipcMain.handle('get-operation-logs', async (_event, params) => {
    return operationLogService.getLogs(params)
  })

  ipcMain.handle('get-recent-logs', async (_event, limit) => {
    return operationLogService.getRecentLogs(limit)
  })
}
