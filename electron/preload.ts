import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getMembers: (params?: any) => ipcRenderer.invoke('get-members', params),
  getMemberById: (id: string) => ipcRenderer.invoke('get-member-by-id', id),
  createMember: (member: any) => ipcRenderer.invoke('create-member', member),
  updateMember: (id: string, member: any) => ipcRenderer.invoke('update-member', id, member),
  deleteMember: (id: string) => ipcRenderer.invoke('delete-member', id),

  getCoaches: (params?: any) => ipcRenderer.invoke('get-coaches', params),
  getCoachById: (id: string) => ipcRenderer.invoke('get-coach-by-id', id),
  createCoach: (coach: any) => ipcRenderer.invoke('create-coach', coach),
  updateCoach: (id: string, coach: any) => ipcRenderer.invoke('update-coach', id, coach),
  deleteCoach: (id: string) => ipcRenderer.invoke('delete-coach', id),

  getEquipment: (params?: any) => ipcRenderer.invoke('get-equipment', params),
  getEquipmentById: (id: string) => ipcRenderer.invoke('get-equipment-by-id', id),
  createEquipment: (equipment: any) => ipcRenderer.invoke('create-equipment', equipment),
  updateEquipment: (id: string, equipment: any) => ipcRenderer.invoke('update-equipment', id, equipment),
  deleteEquipment: (id: string) => ipcRenderer.invoke('delete-equipment', id),
  getMaintenanceReminders: () => ipcRenderer.invoke('get-maintenance-reminders'),
  performMaintenance: (id: string) => ipcRenderer.invoke('perform-maintenance', id),

  getCourses: (params?: any) => ipcRenderer.invoke('get-courses', params),
  getCourseById: (id: string) => ipcRenderer.invoke('get-course-by-id', id),
  createCourse: (course: any) => ipcRenderer.invoke('create-course', course),
  updateCourse: (id: string, course: any) => ipcRenderer.invoke('update-course', id, course),
  deleteCourse: (id: string) => ipcRenderer.invoke('delete-course', id),

  getSchedules: (params?: any) => ipcRenderer.invoke('get-schedules', params),
  getScheduleById: (id: string) => ipcRenderer.invoke('get-schedule-by-id', id),
  generateSchedule: (date: string) => ipcRenderer.invoke('generate-schedule', date),
  confirmSchedule: (id: string) => ipcRenderer.invoke('confirm-schedule', id),
  cancelSchedule: (id: string, reason: string) => ipcRenderer.invoke('cancel-schedule', id, reason),
  requestAdjustment: (id: string, adjustment: any) => ipcRenderer.invoke('request-adjustment', id, adjustment),
  approveAdjustment: (requestId: string) => ipcRenderer.invoke('approve-adjustment', requestId),
  rejectAdjustment: (requestId: string, reason: string) => ipcRenderer.invoke('reject-adjustment', requestId, reason),
  getAdjustmentRequests: (params?: any) => ipcRenderer.invoke('get-adjustment-requests', params),
  updateCourseStatus: (id: string, status: string) => ipcRenderer.invoke('update-course-status', id, status),

  getEnrollments: (params?: any) => ipcRenderer.invoke('get-enrollments', params),
  enrollCourse: (memberId: string, scheduleId: string) => ipcRenderer.invoke('enroll-course', memberId, scheduleId),
  cancelEnrollment: (enrollmentId: string) => ipcRenderer.invoke('cancel-enrollment', enrollmentId),
  checkInMember: (enrollmentId: string) => ipcRenderer.invoke('check-in-member', enrollmentId),
  releaseNoShows: () => ipcRenderer.invoke('release-no-shows'),

  getStatistics: (params: any) => ipcRenderer.invoke('get-statistics', params),
  exportReport: (params: any, filePath: string) => ipcRenderer.invoke('export-report', params, filePath),

  getHeatmapData: (date: string) => ipcRenderer.invoke('get-heatmap-data', date),
  getZones: () => ipcRenderer.invoke('get-zones'),

  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats')
})
