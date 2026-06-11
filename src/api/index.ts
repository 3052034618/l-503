import { 
  Member, Coach, Equipment, Course, Schedule, Enrollment, 
  AdjustmentRequest, PageResult, DashboardStats, HeatmapZone, Zone 
} from '../types'

declare global {
  interface Window {
    electronAPI: {
      getMembers: (params?: any) => Promise<PageResult<Member>>
      getMemberById: (id: string) => Promise<Member | undefined>
      createMember: (member: any) => Promise<Member>
      updateMember: (id: string, member: any) => Promise<Member | undefined>
      deleteMember: (id: string) => Promise<boolean>

      getCoaches: (params?: any) => Promise<PageResult<Coach>>
      getCoachById: (id: string) => Promise<Coach | undefined>
      createCoach: (coach: any) => Promise<Coach>
      updateCoach: (id: string, coach: any) => Promise<Coach | undefined>
      deleteCoach: (id: string) => Promise<boolean>

      getEquipment: (params?: any) => Promise<PageResult<Equipment>>
      getEquipmentById: (id: string) => Promise<Equipment | undefined>
      createEquipment: (equipment: any) => Promise<Equipment>
      updateEquipment: (id: string, equipment: any) => Promise<Equipment | undefined>
      deleteEquipment: (id: string) => Promise<boolean>
      getMaintenanceReminders: () => Promise<Equipment[]>
      performMaintenance: (id: string) => Promise<Equipment | undefined>

      getCourses: (params?: any) => Promise<PageResult<Course>>
      getCourseById: (id: string) => Promise<Course | undefined>
      createCourse: (course: any) => Promise<Course>
      updateCourse: (id: string, course: any) => Promise<Course | undefined>
      deleteCourse: (id: string) => Promise<boolean>

      getSchedules: (params?: any) => Promise<PageResult<Schedule>>
      getScheduleById: (id: string) => Promise<Schedule | undefined>
      generateSchedule: (date: string) => Promise<any>
      confirmSchedule: (id: string) => Promise<Schedule>
      cancelSchedule: (id: string, reason: string) => Promise<any>
      requestAdjustment: (id: string, adjustment: any) => Promise<any>
      approveAdjustment: (requestId: string) => Promise<any>
      rejectAdjustment: (requestId: string, reason: string) => Promise<any>
      getAdjustmentRequests: (params?: any) => Promise<PageResult<AdjustmentRequest>>
      updateCourseStatus: (id: string, status: string) => Promise<Schedule>

      getEnrollments: (params?: any) => Promise<PageResult<Enrollment>>
      enrollCourse: (memberId: string, scheduleId: string) => Promise<any>
      cancelEnrollment: (enrollmentId: string) => Promise<any>
      checkInMember: (enrollmentId: string) => Promise<any>
      releaseNoShows: () => Promise<any>

      getStatistics: (params: any) => Promise<any>
      exportReport: (params: any, filePath: string) => Promise<any>

      getHeatmapData: (date: string) => Promise<HeatmapZone[]>
      getZones: () => Promise<Zone[]>

      getDashboardStats: () => Promise<DashboardStats>
    }
  }
}

export const api = window.electronAPI || {
  getMembers: async () => ({ list: [], total: 0 }),
  getMemberById: async () => undefined,
  createMember: async (m: any) => m,
  updateMember: async (_: string, m: any) => m,
  deleteMember: async () => false,
  getCoaches: async () => ({ list: [], total: 0 }),
  getCoachById: async () => undefined,
  createCoach: async (c: any) => c,
  updateCoach: async (_: string, c: any) => c,
  deleteCoach: async () => false,
  getEquipment: async () => ({ list: [], total: 0 }),
  getEquipmentById: async () => undefined,
  createEquipment: async (e: any) => e,
  updateEquipment: async (_: string, e: any) => e,
  deleteEquipment: async () => false,
  getMaintenanceReminders: async () => [],
  performMaintenance: async () => undefined,
  getCourses: async () => ({ list: [], total: 0 }),
  getCourseById: async () => undefined,
  createCourse: async (c: any) => c,
  updateCourse: async (_: string, c: any) => c,
  deleteCourse: async () => false,
  getSchedules: async () => ({ list: [], total: 0 }),
  getScheduleById: async () => undefined,
  generateSchedule: async () => ({ success: false }),
  confirmSchedule: async (s: any) => s,
  cancelSchedule: async () => ({}),
  requestAdjustment: async () => ({}),
  approveAdjustment: async () => ({}),
  rejectAdjustment: async () => ({}),
  getAdjustmentRequests: async () => ({ list: [], total: 0 }),
  updateCourseStatus: async (_: string, s: any) => s,
  getEnrollments: async () => ({ list: [], total: 0 }),
  enrollCourse: async () => ({ success: false }),
  cancelEnrollment: async () => ({}),
  checkInMember: async () => ({ success: false }),
  releaseNoShows: async () => ({}),
  getStatistics: async () => ({}),
  exportReport: async () => ({ success: false }),
  getHeatmapData: async () => [],
  getZones: async () => [],
  getDashboardStats: async () => ({
    today: { schedules: 0, enrollments: 0, checkIns: 0 },
    maintenance: 0,
    pendingAdjustments: 0,
    activeMembers: 0,
    activeCoaches: 0,
    todayScheduleList: []
  })
}
