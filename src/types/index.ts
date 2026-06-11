export interface Member {
  id: string
  name: string
  gender?: string
  phone?: string
  email?: string
  level: string
  join_date: string
  expire_date?: string
  height?: number
  weight?: number
  body_fat?: number
  muscle_mass?: number
  bmi?: number
  preferences?: string
  status: string
  created_at: string
  updated_at: string
}

export interface Coach {
  id: string
  name: string
  gender?: string
  phone?: string
  specialties?: string
  certification?: string
  experience_years?: number
  max_daily_classes: number
  status: string
  created_at: string
  updated_at: string
}

export interface Equipment {
  id: string
  name: string
  type: string
  brand?: string
  model?: string
  zone_id?: string
  zone_name?: string
  purchase_date?: string
  max_usage_count: number
  current_usage_count: number
  last_maintenance_date?: string
  status: string
  maintenance_note?: string
  created_at: string
  updated_at: string
}

export interface Zone {
  id: string
  name: string
  area_type: string
  capacity: number
  locker_room_capacity: number
  position_x: number
  position_y: number
  width: number
  height: number
  color: string
  created_at: string
}

export interface Course {
  id: string
  name: string
  type: string
  duration: number
  capacity: number
  calories_per_hour?: number
  difficulty?: string
  description?: string
  required_equipment?: string
  is_private: number
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  course_id: string
  course_name: string
  course_type: string
  coach_id: string
  coach_name: string
  zone_id?: string
  zone_name?: string
  date: string
  start_time: string
  end_time: string
  duration: number
  capacity: number
  enrolled_count: number
  status: string
  is_private: number
  member_id?: string
  member_name?: string
  member_level?: string
  member_preferences?: string
  match_reason?: string
  calories_per_hour?: number
  notes?: string
  created_at: string
  updated_at: string
}

export interface Enrollment {
  id: string
  schedule_id: string
  member_id: string
  member_name: string
  member_level: string
  member_phone: string
  enroll_time: string
  check_in_time?: string
  status: string
  is_waitlist: number
  waitlist_position?: number
  calories_burned?: number
  satisfaction?: number
  date?: string
  start_time?: string
  end_time?: string
  course_name?: string
  created_at: string
}

export interface AdjustmentRequest {
  id: string
  schedule_id: string
  date: string
  start_time: string
  end_time: string
  course_name: string
  coach_name: string
  requester_id?: string
  requester_type?: string
  request_type: string
  original_data?: string
  requested_data?: string
  reason?: string
  status: string
  approver_id?: string
  approve_time?: string
  rejection_reason?: string
  created_at: string
}

export interface PageResult<T> {
  list: T[]
  total: number
}

export interface DashboardStats {
  today: {
    schedules: number
    enrollments: number
    checkIns: number
  }
  maintenance: number
  pendingAdjustments: number
  activeMembers: number
  activeCoaches: number
  todayScheduleList: Schedule[]
}

export interface HeatmapZone extends Zone {
  schedule_count: number
  student_count: number
  equipment_count: number
  normal_equipment: number
  maintenance_equipment: number
  heat_level: number
}
