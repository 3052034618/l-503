import Database from 'better-sqlite3'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

let db: Database.Database

export function initDatabase(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'fitness.db')
  
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true })
  }

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  createTables()
  seedInitialData()
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT,
      phone TEXT,
      email TEXT,
      level TEXT NOT NULL DEFAULT '普通',
      join_date TEXT NOT NULL,
      expire_date TEXT,
      height REAL,
      weight REAL,
      body_fat REAL,
      muscle_mass REAL,
      bmi REAL,
      preferences TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coaches (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT,
      phone TEXT,
      specialties TEXT,
      certification TEXT,
      experience_years INTEGER,
      max_daily_classes INTEGER DEFAULT 6,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      area_type TEXT NOT NULL,
      capacity INTEGER,
      locker_room_capacity INTEGER,
      position_x INTEGER,
      position_y INTEGER,
      width INTEGER,
      height INTEGER,
      color TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS equipment (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      zone_id TEXT,
      purchase_date TEXT,
      max_usage_count INTEGER DEFAULT 1000,
      current_usage_count INTEGER DEFAULT 0,
      last_maintenance_date TEXT,
      status TEXT NOT NULL DEFAULT 'normal',
      maintenance_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (zone_id) REFERENCES zones(id)
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      duration INTEGER NOT NULL,
      capacity INTEGER NOT NULL,
      calories_per_hour REAL,
      difficulty TEXT DEFAULT '中级',
      description TEXT,
      required_equipment TEXT,
      is_private INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      coach_id TEXT NOT NULL,
      zone_id TEXT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      capacity INTEGER NOT NULL,
      enrolled_count INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      is_private INTEGER DEFAULT 0,
      member_id TEXT,
      notes TEXT,
      match_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (course_id) REFERENCES courses(id),
      FOREIGN KEY (coach_id) REFERENCES coaches(id),
      FOREIGN KEY (zone_id) REFERENCES zones(id)
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      schedule_id TEXT,
      member_id TEXT,
      member_name TEXT,
      related_member_id TEXT,
      related_member_name TEXT,
      detail TEXT,
      operator TEXT DEFAULT 'system',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      member_id TEXT NOT NULL,
      enroll_time TEXT NOT NULL,
      check_in_time TEXT,
      status TEXT NOT NULL DEFAULT 'enrolled',
      is_waitlist INTEGER DEFAULT 0,
      waitlist_position INTEGER,
      calories_burned REAL,
      satisfaction INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );

    CREATE TABLE IF NOT EXISTS adjustment_requests (
      id TEXT PRIMARY KEY,
      schedule_id TEXT NOT NULL,
      requester_id TEXT,
      requester_type TEXT,
      request_type TEXT NOT NULL,
      original_data TEXT,
      requested_data TEXT,
      reason TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      approver_id TEXT,
      approve_time TEXT,
      rejection_reason TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (schedule_id) REFERENCES schedules(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance_logs (
      id TEXT PRIMARY KEY,
      equipment_id TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      performed_by TEXT,
      performed_at TEXT NOT NULL,
      next_maintenance_date TEXT,
      FOREIGN KEY (equipment_id) REFERENCES equipment(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      target_type TEXT,
      target_id TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
    CREATE INDEX IF NOT EXISTS idx_schedules_coach ON schedules(coach_id, date);
    CREATE INDEX IF NOT EXISTS idx_enrollments_schedule ON enrollments(schedule_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_member ON enrollments(member_id);
    CREATE INDEX IF NOT EXISTS idx_equipment_zone ON equipment(zone_id);
  `)
}

function seedInitialData() {
  const zoneCount = db.prepare('SELECT COUNT(*) as count FROM zones').get() as { count: number }
  if (zoneCount.count === 0) {
    const zones = [
      { id: 'zone-1', name: '有氧训练区', area_type: 'cardio', capacity: 30, locker_room_capacity: 50, position_x: 50, position_y: 50, width: 300, height: 200, color: '#1890ff' },
      { id: 'zone-2', name: '力量训练区', area_type: 'strength', capacity: 25, locker_room_capacity: 40, position_x: 400, position_y: 50, width: 300, height: 200, color: '#52c41a' },
      { id: 'zone-3', name: '团课教室A', area_type: 'group', capacity: 20, locker_room_capacity: 30, position_x: 50, position_y: 300, width: 250, height: 180, color: '#722ed1' },
      { id: 'zone-4', name: '团课教室B', area_type: 'group', capacity: 15, locker_room_capacity: 25, position_x: 350, position_y: 300, width: 200, height: 180, color: '#eb2f96' },
      { id: 'zone-5', name: '瑜伽室', area_type: 'yoga', capacity: 12, locker_room_capacity: 20, position_x: 600, position_y: 300, width: 180, height: 180, color: '#fa8c16' },
      { id: 'zone-6', name: '私教专区', area_type: 'private', capacity: 5, locker_room_capacity: 10, position_x: 50, position_y: 530, width: 200, height: 150, color: '#13c2c2' },
      { id: 'zone-7', name: '更衣室', area_type: 'locker', capacity: 100, locker_room_capacity: 100, position_x: 300, position_y: 530, width: 200, height: 150, color: '#8c8c8c' },
    ]

    const insertZone = db.prepare(`
      INSERT INTO zones (id, name, area_type, capacity, locker_room_capacity, position_x, position_y, width, height, color, created_at)
      VALUES (@id, @name, @area_type, @capacity, @locker_room_capacity, @position_x, @position_y, @width, @height, @color, @created_at)
    `)

    const now = new Date().toISOString()
    const transaction = db.transaction(() => {
      for (const zone of zones) {
        insertZone.run({ ...zone, created_at: now })
      }
    })
    transaction()
  }

  const courseCount = db.prepare('SELECT COUNT(*) as count FROM courses').get() as { count: number }
  if (courseCount.count === 0) {
    const courses = [
      { id: 'course-1', name: '动感单车', type: '有氧', duration: 45, capacity: 20, calories_per_hour: 600, difficulty: '中级', is_private: 0 },
      { id: 'course-2', name: '瑜伽入门', type: '瑜伽', duration: 60, capacity: 12, calories_per_hour: 200, difficulty: '初级', is_private: 0 },
      { id: 'course-3', name: '力量训练', type: '力量', duration: 60, capacity: 15, calories_per_hour: 400, difficulty: '中级', is_private: 0 },
      { id: 'course-4', name: 'HIIT燃脂', type: '有氧', duration: 30, capacity: 18, calories_per_hour: 800, difficulty: '高级', is_private: 0 },
      { id: 'course-5', name: '普拉提', type: '瑜伽', duration: 50, capacity: 10, calories_per_hour: 250, difficulty: '中级', is_private: 0 },
      { id: 'course-6', name: '搏击操', type: '有氧', duration: 45, capacity: 20, calories_per_hour: 550, difficulty: '中级', is_private: 0 },
      { id: 'course-7', name: '私教1对1', type: '私教', duration: 60, capacity: 1, calories_per_hour: 500, difficulty: '定制', is_private: 1 },
      { id: 'course-8', name: '拉伸放松', type: '拉伸', duration: 30, capacity: 8, calories_per_hour: 100, difficulty: '初级', is_private: 0 },
    ]

    const insertCourse = db.prepare(`
      INSERT INTO courses (id, name, type, duration, capacity, calories_per_hour, difficulty, description, required_equipment, is_private, created_at, updated_at)
      VALUES (@id, @name, @type, @duration, @capacity, @calories_per_hour, @difficulty, '', '', @is_private, @created_at, @updated_at)
    `)

    const now = new Date().toISOString()
    const transaction = db.transaction(() => {
      for (const course of courses) {
        insertCourse.run({ ...course, created_at: now, updated_at: now })
      }
    })
    transaction()
  }

  const coachCount = db.prepare('SELECT COUNT(*) as count FROM coaches').get() as { count: number }
  if (coachCount.count === 0) {
    const coaches = [
      { id: 'coach-1', name: '张教练', gender: '男', phone: '13800138001', specialties: JSON.stringify(['动感单车', 'HIIT', '力量训练']), certification: 'ACE认证', experience_years: 8, max_daily_classes: 6 },
      { id: 'coach-2', name: '李教练', gender: '女', phone: '13800138002', specialties: JSON.stringify(['瑜伽', '普拉提', '拉伸放松']), certification: '瑜伽联盟认证', experience_years: 6, max_daily_classes: 5 },
      { id: 'coach-3', name: '王教练', gender: '男', phone: '13800138003', specialties: JSON.stringify(['力量训练', '私教', '搏击操']), certification: 'NSCA认证', experience_years: 10, max_daily_classes: 6 },
      { id: 'coach-4', name: '陈教练', gender: '女', phone: '13800138004', specialties: JSON.stringify(['动感单车', 'HIIT', '搏击操']), certification: '莱美认证', experience_years: 5, max_daily_classes: 5 },
      { id: 'coach-5', name: '刘教练', gender: '男', phone: '13800138005', specialties: JSON.stringify(['私教', '力量训练', '拉伸放松']), certification: 'ACSM认证', experience_years: 7, max_daily_classes: 6 },
    ]

    const insertCoach = db.prepare(`
      INSERT INTO coaches (id, name, gender, phone, specialties, certification, experience_years, max_daily_classes, status, created_at, updated_at)
      VALUES (@id, @name, @gender, @phone, @specialties, @certification, @experience_years, @max_daily_classes, 'active', @created_at, @updated_at)
    `)

    const now = new Date().toISOString()
    const transaction = db.transaction(() => {
      for (const coach of coaches) {
        insertCoach.run({ ...coach, created_at: now, updated_at: now })
      }
    })
    transaction()
  }

  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get() as { count: number }
  if (memberCount.count === 0) {
    const members = [
      { id: 'member-1', name: '小明', gender: '男', phone: '13900139001', level: '黄金', height: 175, weight: 70, body_fat: 18, muscle_mass: 32, preferences: JSON.stringify(['动感单车', '力量训练']) },
      { id: 'member-2', name: '小红', gender: '女', phone: '13900139002', level: '钻石', height: 165, weight: 55, body_fat: 22, muscle_mass: 22, preferences: JSON.stringify(['瑜伽', '普拉提']) },
      { id: 'member-3', name: '小刚', gender: '男', phone: '13900139003', level: '普通', height: 180, weight: 85, body_fat: 25, muscle_mass: 35, preferences: JSON.stringify(['HIIT', '力量训练', '搏击操']) },
      { id: 'member-4', name: '小美', gender: '女', phone: '13900139004', level: '黄金', height: 160, weight: 50, body_fat: 20, muscle_mass: 20, preferences: JSON.stringify(['瑜伽', '拉伸放松']) },
      { id: 'member-5', name: '大壮', gender: '男', phone: '13900139005', level: '钻石', height: 185, weight: 90, body_fat: 15, muscle_mass: 45, preferences: JSON.stringify(['力量训练', '私教']) },
    ]

    const insertMember = db.prepare(`
      INSERT INTO members (id, name, gender, phone, email, level, join_date, expire_date, height, weight, body_fat, muscle_mass, bmi, preferences, status, created_at, updated_at)
      VALUES (@id, @name, @gender, @phone, '', @level, @join_date, @expire_date, @height, @weight, @body_fat, @muscle_mass, @bmi, @preferences, 'active', @created_at, @updated_at)
    `)

    const now = new Date().toISOString()
    const joinDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
    const expireDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()
    const transaction = db.transaction(() => {
      for (const member of members) {
        const bmi = member.weight / Math.pow(member.height / 100, 2)
        insertMember.run({
          ...member,
          join_date: joinDate,
          expire_date: expireDate,
          bmi: Math.round(bmi * 10) / 10,
          created_at: now,
          updated_at: now
        })
      }
    })
    transaction()
  }

  const equipmentCount = db.prepare('SELECT COUNT(*) as count FROM equipment').get() as { count: number }
  if (equipmentCount.count === 0) {
    const equipmentList = [
      { id: 'equip-1', name: '跑步机1号', type: '有氧', brand: 'LifeFitness', zone_id: 'zone-1', max_usage_count: 2000, current_usage_count: 1700 },
      { id: 'equip-2', name: '跑步机2号', type: '有氧', brand: 'LifeFitness', zone_id: 'zone-1', max_usage_count: 2000, current_usage_count: 380 },
      { id: 'equip-3', name: '动感单车A1', type: '有氧', brand: 'Keiser', zone_id: 'zone-1', max_usage_count: 1500, current_usage_count: 1250 },
      { id: 'equip-4', name: '椭圆机1号', type: '有氧', brand: 'Precor', zone_id: 'zone-1', max_usage_count: 2000, current_usage_count: 320 },
      { id: 'equip-5', name: '哑铃架', type: '力量', brand: 'Hammer', zone_id: 'zone-2', max_usage_count: 5000, current_usage_count: 1200 },
      { id: 'equip-6', name: '杠铃架1号', type: '力量', brand: 'Eleiko', zone_id: 'zone-2', max_usage_count: 3000, current_usage_count: 2500 },
      { id: 'equip-7', name: '坐姿推胸器', type: '力量', brand: 'Technogym', zone_id: 'zone-2', max_usage_count: 2500, current_usage_count: 2600 },
      { id: 'equip-8', name: '瑜伽垫套装', type: '瑜伽', brand: 'Manduka', zone_id: 'zone-5', max_usage_count: 1000, current_usage_count: 150 },
      { id: 'equip-9', name: '私教训练床', type: '私教', brand: 'Stamina', zone_id: 'zone-6', max_usage_count: 1500, current_usage_count: 1480 },
      { id: 'equip-10', name: '搏击沙袋', type: '有氧', brand: 'Everlast', zone_id: 'zone-3', max_usage_count: 2000, current_usage_count: 1100 },
    ]

    const insertEquipment = db.prepare(`
      INSERT INTO equipment (id, name, type, brand, model, zone_id, purchase_date, max_usage_count, current_usage_count, status, created_at, updated_at)
      VALUES (@id, @name, @type, @brand, '', @zone_id, @purchase_date, @max_usage_count, @current_usage_count, @status, @created_at, @updated_at)
    `)

    const now = new Date().toISOString()
    const purchaseDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString()
    const transaction = db.transaction(() => {
      for (const equip of equipmentList) {
        const status = equip.current_usage_count >= equip.max_usage_count ? 'maintenance_required' : 'normal'
        insertEquipment.run({ ...equip, status, purchase_date: purchaseDate, created_at: now, updated_at: now })
      }
    })
    transaction()
  }
}

export function getDb(): any {
  return db
}
