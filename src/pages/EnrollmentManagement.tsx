import { useEffect, useState } from 'react'
import { api } from '../api'
import { Schedule, Enrollment, Member } from '../types'
import dayjs from 'dayjs'

const EnrollmentManagement = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadSchedules()
    loadMembers()
  }, [selectedDate])

  useEffect(() => {
    if (selectedSchedule) {
      loadEnrollments(selectedSchedule.id)
    }
  }, [selectedSchedule])

  const loadSchedules = async () => {
    try {
      const result = await api.getSchedules({
        date: selectedDate,
        status: 'confirmed'
      })
      setSchedules(result.list)
      if (result.list.length > 0 && !selectedSchedule) {
        setSelectedSchedule(result.list[0])
      }
    } catch (error) {
      console.error('Failed to load schedules:', error)
    }
  }

  const loadMembers = async () => {
    try {
      const result = await api.getMembers({ pageSize: 100 })
      setMembers(result.list)
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const loadEnrollments = async (scheduleId: string) => {
    try {
      setLoading(true)
      const result = await api.getEnrollments({ schedule_id: scheduleId })
      setEnrollments(result.list)
    } catch (error) {
      console.error('Failed to load enrollments:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!selectedMember || !selectedSchedule) {
      alert('请选择会员和课程')
      return
    }

    try {
      const result = await api.enrollCourse(selectedMember, selectedSchedule.id)
      if (result.success) {
        alert(result.message)
        loadEnrollments(selectedSchedule.id)
        loadSchedules()
        setSelectedMember('')
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to enroll:', error)
    }
  }

  const handleCheckIn = async (enrollmentId: string) => {
    try {
      const result = await api.checkInMember(enrollmentId)
      if (result.success) {
        loadEnrollments(selectedSchedule!.id)
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to check in:', error)
    }
  }

  const handleCancelEnrollment = async (enrollmentId: string) => {
    if (!confirm('确定取消该会员的报名吗？')) return
    
    try {
      await api.cancelEnrollment(enrollmentId)
      loadEnrollments(selectedSchedule!.id)
      loadSchedules()
    } catch (error) {
      console.error('Failed to cancel enrollment:', error)
    }
  }

  const handleReleaseNoShows = async () => {
    if (!confirm('确定释放超过6小时未签到的名额吗？')) return
    
    try {
      const result = await api.releaseNoShows()
      alert(`已释放 ${result.releasedCount} 个名额`)
      loadSchedules()
      if (selectedSchedule) {
        loadEnrollments(selectedSchedule.id)
      }
    } catch (error) {
      console.error('Failed to release no shows:', error)
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'enrolled': return '已报名'
      case 'checked_in': return '已签到'
      case 'cancelled': return '已取消'
      case 'no_show': return '未到'
      case 'completed': return '已完成'
      default: return status
    }
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'enrolled': return 'tag-blue'
      case 'checked_in': return 'tag-green'
      case 'cancelled': return 'tag-default'
      case 'no_show': return 'tag-red'
      case 'completed': return 'tag-purple'
      default: return 'tag-default'
    }
  }

  const normalEnrollments = enrollments.filter(
    e => e.is_waitlist === 0 && ['enrolled', 'checked_in', 'completed'].includes(e.status)
  )
  const waitlistEnrollments = enrollments.filter(e => e.is_waitlist === 1 && e.status === 'enrolled')
  const noShowEnrollments = enrollments.filter(e => e.is_waitlist === 0 && e.status === 'no_show')

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">报名签到</h2>
        <button className="btn btn-warning" onClick={handleReleaseNoShows}>
          释放超时未签到
        </button>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 280, flexShrink: 0 }}>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>课程列表</h3>
            <div className="form-item">
              <input
                type="date"
                className="form-input"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setSelectedSchedule(null)
                }}
              />
            </div>
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {schedules.length > 0 ? (
                schedules.map(s => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedSchedule(s)}
                    style={{
                      padding: 12,
                      marginBottom: 8,
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: selectedSchedule?.id === s.id ? '#e6f7ff' : '#f5f5f5',
                      border: selectedSchedule?.id === s.id ? '1px solid #1890ff' : '1px solid transparent'
                    }}
                  >
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{s.course_name}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {s.start_time} - {s.end_time} | {s.coach_name}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      已报名: {s.enrolled_count}/{s.capacity}
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">暂无课程</div>
              )}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {selectedSchedule ? (
            <>
              <div className="card">
                <h3 style={{ marginBottom: 12 }}>快速报名</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    className="form-input"
                    style={{ flex: 1 }}
                    value={selectedMember}
                    onChange={e => setSelectedMember(e.target.value)}
                  >
                    <option value="">选择会员...</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.level})</option>
                    ))}
                  </select>
                  <button className="btn btn-primary" onClick={handleEnroll}>
                    报名
                  </button>
                </div>
              </div>

              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3>报名列表 ({selectedSchedule.enrolled_count}/{selectedSchedule.capacity})</h3>
                </div>

                {loading ? (
                  <p>加载中...</p>
                ) : normalEnrollments.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>会员姓名</th>
                        <th>等级</th>
                        <th>手机号</th>
                        <th>报名时间</th>
                        <th>签到状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalEnrollments.map(e => (
                        <tr key={e.id}>
                          <td>{e.member_name}</td>
                          <td>
                            <span className="tag tag-blue">{e.member_level}</span>
                          </td>
                          <td>{e.member_phone || '-'}</td>
                          <td>{e.enroll_time?.split('T')[1]?.split('.')[0] || '-'}</td>
                          <td>
                            <span className={`tag ${getStatusTag(e.status)}`}>
                              {getStatusText(e.status)}
                            </span>
                          </td>
                          <td>
                            <div className="action-btns">
                              {e.status === 'enrolled' && (
                                <button
                                  className="btn btn-small btn-success"
                                  onClick={() => handleCheckIn(e.id)}
                                >
                                  签到
                                </button>
                              )}
                              {(e.status === 'enrolled' || e.status === 'checked_in') && (
                                <button
                                  className="btn btn-small btn-danger"
                                  onClick={() => handleCancelEnrollment(e.id)}
                                >
                                  取消
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="empty-state">暂无报名</div>
                )}
              </div>

              {noShowEnrollments.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: 12, color: '#faad14' }}>超时未到 ({noShowEnrollments.length}人，已释放名额)</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>会员姓名</th>
                        <th>等级</th>
                        <th>手机号</th>
                        <th>报名时间</th>
                        <th>状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {noShowEnrollments.map(e => (
                        <tr key={e.id}>
                          <td>{e.member_name}</td>
                          <td>
                            <span className="tag tag-blue">{e.member_level}</span>
                          </td>
                          <td>{e.member_phone || '-'}</td>
                          <td>{e.enroll_time?.split('T')[1]?.split('.')[0] || '-'}</td>
                          <td>
                            <span className={`tag ${getStatusTag(e.status)}`}>
                              {getStatusText(e.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {waitlistEnrollments.length > 0 && (
                <div className="card">
                  <h3 style={{ marginBottom: 12 }}>候补名单 ({waitlistEnrollments.length}人)</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>候补顺序</th>
                        <th>会员姓名</th>
                        <th>等级</th>
                        <th>手机号</th>
                        <th>报名时间</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitlistEnrollments.map(e => (
                        <tr key={e.id}>
                          <td>第 {e.waitlist_position} 位</td>
                          <td>{e.member_name}</td>
                          <td>
                            <span className="tag tag-orange">{e.member_level}</span>
                          </td>
                          <td>{e.member_phone || '-'}</td>
                          <td>{e.enroll_time?.split('T')[1]?.split('.')[0] || '-'}</td>
                          <td>
                            <button
                              className="btn btn-small btn-danger"
                              onClick={() => handleCancelEnrollment(e.id)}
                            >
                              取消候补
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <div className="empty-state">请选择左侧课程查看报名情况</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default EnrollmentManagement
