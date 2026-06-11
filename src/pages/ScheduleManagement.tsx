import { useEffect, useState } from 'react'
import { api } from '../api'
import { Schedule } from '../types'
import dayjs from 'dayjs'
import AdjustmentModal from '../components/AdjustmentModal'

const ScheduleManagement = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [status, setStatus] = useState('')
  const [isPrivate, setIsPrivate] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [adjustmentModalVisible, setAdjustmentModalVisible] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)

  useEffect(() => {
    loadSchedules()
  }, [page, selectedDate, status, isPrivate])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const result = await api.getSchedules({
        page,
        pageSize,
        date: selectedDate,
        status: status || undefined,
        is_private: isPrivate !== '' ? Number(isPrivate) : undefined
      })
      setSchedules(result.list)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load schedules:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    if (!confirm(`确定要为 ${selectedDate} 自动生成排课吗？`)) return
    
    try {
      setGenerating(true)
      const result = await api.generateSchedule(selectedDate)
      if (result.success) {
        alert(result.message)
        loadSchedules()
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to generate schedule:', error)
      alert('生成排课失败')
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirm = async (id: string) => {
    if (!confirm('确定确认该课程排期吗？')) return
    try {
      await api.confirmSchedule(id)
      loadSchedules()
    } catch (error) {
      console.error('Failed to confirm schedule:', error)
    }
  }

  const handleCancel = async (id: string) => {
    const reason = prompt('请输入取消原因：')
    if (reason === null) return
    
    try {
      await api.cancelSchedule(id, reason)
      loadSchedules()
    } catch (error) {
      console.error('Failed to cancel schedule:', error)
    }
  }

  const handleAdjustment = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setAdjustmentModalVisible(true)
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await api.updateCourseStatus(id, newStatus)
      loadSchedules()
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending': return 'tag-orange'
      case 'confirmed': return 'tag-green'
      case 'in_progress': return 'tag-blue'
      case 'completed': return 'tag-purple'
      case 'cancelled': return 'tag-default'
      default: return 'tag-default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待确认'
      case 'confirmed': return '已确认'
      case 'in_progress': return '进行中'
      case 'completed': return '已结束'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const groupedSchedules = schedules.reduce((acc: Record<string, Schedule[]>, schedule) => {
    const time = schedule.start_time
    if (!acc[time]) acc[time] = []
    acc[time].push(schedule)
    return acc
  }, {})

  const timeSlots = Object.keys(groupedSchedules).sort()

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">排课管理</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
            {generating ? '生成中...' : '🤖 智能排课'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <div>
            <label style={{ marginRight: 8 }}>日期：</label>
            <input
              type="date"
              className="search-input"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <select
            className="search-input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">全部状态</option>
            <option value="pending">待确认</option>
            <option value="confirmed">已确认</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已结束</option>
            <option value="cancelled">已取消</option>
          </select>
          <select
            className="search-input"
            value={isPrivate}
            onChange={(e) => {
              setIsPrivate(e.target.value)
              setPage(1)
            }}
          >
            <option value="">全部类型</option>
            <option value="0">团课</option>
            <option value="1">私教</option>
          </select>
        </div>

        {loading ? (
          <p>加载中...</p>
        ) : timeSlots.length > 0 ? (
          <div className="schedule-calendar">
            {timeSlots.map(time => (
              <div key={time} className="time-slot">
                <div className="time-label">{time}</div>
                <div className="schedule-items">
                  {groupedSchedules[time].map(schedule => (
                    <div
                      key={schedule.id}
                      className={`schedule-item ${schedule.status}`}
                      style={{
                        background: schedule.is_private ? '#722ed1' : undefined
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>{schedule.course_name}</div>
                      <div>{schedule.coach_name} | {schedule.zone_name || '-'}</div>
                      <div>{schedule.enrolled_count}/{schedule.capacity}人 {schedule.is_private ? '| 私教' : ''}</div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {schedule.status === 'pending' && (
                          <>
                            <button className="btn btn-small btn-success" onClick={() => handleConfirm(schedule.id)}>
                              确认
                            </button>
                            <button className="btn btn-small btn-default" onClick={() => handleAdjustment(schedule)}>
                              调整
                            </button>
                          </>
                        )}
                        {schedule.status === 'confirmed' && (
                          <>
                            <button className="btn btn-small btn-primary" onClick={() => handleUpdateStatus(schedule.id, 'in_progress')}>
                              开始
                            </button>
                            <button className="btn btn-small btn-danger" onClick={() => handleCancel(schedule.id)}>
                              取消
                            </button>
                          </>
                        )}
                        {schedule.status === 'in_progress' && (
                          <button className="btn btn-small btn-success" onClick={() => handleUpdateStatus(schedule.id, 'completed')}>
                            结束
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>当日暂无排课</p>
            <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>
              点击"智能排课"按钮自动生成每日课程
            </p>
          </div>
        )}

        {total > 0 && (
          <div className="pagination">
            <span style={{ marginRight: 12 }}>共 {total} 条</span>
            <button
              className="pagination-btn"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              上一页
            </button>
            <button
              className="pagination-btn"
              disabled={page === totalPages || totalPages === 0}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              下一页
            </button>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>排课说明</h3>
        <ul style={{ color: '#666', lineHeight: 2, paddingLeft: 20 }}>
          <li>智能排课根据教练专长、每日最大课数、场地容量自动分配</li>
          <li>生成的排课状态为"待确认"，需手动确认后才生效</li>
          <li>课程状态：待确认 → 已确认 → 进行中 → 已结束</li>
          <li>如需调整排课，可提交调整申请，需运营经理审批</li>
          <li>私教课为紫色背景，团课根据状态显示不同颜色</li>
        </ul>
      </div>

      {adjustmentModalVisible && selectedSchedule && (
        <AdjustmentModal
          schedule={selectedSchedule}
          onClose={() => setAdjustmentModalVisible(false)}
          onSave={() => {
            setAdjustmentModalVisible(false)
            loadSchedules()
          }}
        />
      )}
    </div>
  )
}

export default ScheduleManagement
