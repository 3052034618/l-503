import { useEffect, useState } from 'react'
import { api } from '../api'
import { DashboardStats, Schedule } from '../types'
import dayjs from 'dayjs'

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setLoading(true)
      const data = await api.getDashboardStats()
      setStats(data)
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'tag-green'
      case 'pending': return 'tag-orange'
      case 'in_progress': return 'tag-blue'
      case 'cancelled': return 'tag-default'
      case 'completed': return 'tag-purple'
      default: return 'tag-default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return '已确认'
      case 'pending': return '待确认'
      case 'in_progress': return '进行中'
      case 'cancelled': return '已取消'
      case 'completed': return '已结束'
      default: return status
    }
  }

  if (loading) {
    return <div className="card"><p>加载中...</p></div>
  }

  return (
    <div>
      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card-icon">📅</span>
          <div className="stat-card-title">今日课程</div>
          <div className="stat-card-value">{stats?.today.schedules || 0}</div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">👥</span>
          <div className="stat-card-title">今日报名</div>
          <div className="stat-card-value">{stats?.today.enrollments || 0}</div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">✅</span>
          <div className="stat-card-title">今日签到</div>
          <div className="stat-card-value">{stats?.today.checkIns || 0}</div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">👤</span>
          <div className="stat-card-title">活跃会员</div>
          <div className="stat-card-value">{stats?.activeMembers || 0}</div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">🏋️</span>
          <div className="stat-card-title">在职教练</div>
          <div className="stat-card-value">{stats?.activeCoaches || 0}</div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">🔧</span>
          <div className="stat-card-title">待维保设备</div>
          <div className="stat-card-value" style={{ color: stats && stats.maintenance > 0 ? '#ff4d4f' : '#333' }}>
            {stats?.maintenance || 0}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">📝</span>
          <div className="stat-card-title">待审批调整</div>
          <div className="stat-card-value" style={{ color: stats && stats.pendingAdjustments > 0 ? '#fa8c16' : '#333' }}>
            {stats?.pendingAdjustments || 0}
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 16 }}>今日课程安排</h3>
        {stats?.todayScheduleList && stats.todayScheduleList.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>时间</th>
                <th>课程</th>
                <th>类型</th>
                <th>教练</th>
                <th>场地</th>
                <th>人数</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {stats.todayScheduleList.map((schedule: Schedule) => (
                <tr key={schedule.id}>
                  <td>{schedule.start_time} - {schedule.end_time}</td>
                  <td>{schedule.course_name}</td>
                  <td>{schedule.course_type}</td>
                  <td>{schedule.coach_name}</td>
                  <td>{schedule.zone_name || '-'}</td>
                  <td>{schedule.enrolled_count}/{schedule.capacity}</td>
                  <td>
                    <span className={`tag ${getStatusColor(schedule.status)}`}>
                      {getStatusText(schedule.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">今日暂无课程安排</div>
        )}
      </div>

      <div className="stat-cards">
        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ marginBottom: 12 }}>系统提示</h3>
          <div style={{ color: '#666', lineHeight: 1.8 }}>
            <p>• 请及时确认每日排课安排</p>
            <p>• 超6小时未签到自动释放名额</p>
            <p>• 设备使用超额定次数需维保</p>
            <p>• 课程调整需运营经理审批</p>
          </div>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ marginBottom: 12 }}>快捷操作</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary" style={{ textAlign: 'left' }}>
              📅 生成明日排课
            </button>
            <button className="btn btn-success" style={{ textAlign: 'left' }}>
              👤 添加新会员
            </button>
            <button className="btn btn-warning" style={{ textAlign: 'left' }}>
              🔧 处理维保申请
            </button>
            <button className="btn btn-default" style={{ textAlign: 'left' }}>
              📊 查看运营报告
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
