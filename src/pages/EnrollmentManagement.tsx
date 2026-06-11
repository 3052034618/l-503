import { useEffect, useState } from 'react'
import { api } from '../api'
import { Schedule, Enrollment, Member } from '../types'
import dayjs from 'dayjs'

type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed'

const EnrollmentManagement = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [members, setMembers] = useState<Member[]>([])
  const [selectedMember, setSelectedMember] = useState('')
  const [loading, setLoading] = useState(false)
  const [operationLogs, setOperationLogs] = useState<any[]>([])
  const [toast, setToast] = useState<string>('')

  useEffect(() => {
    loadSchedules()
    loadMembers()
    loadLogs()
  }, [selectedDate, statusFilter])

  useEffect(() => {
    if (selectedSchedule) {
      loadEnrollments(selectedSchedule.id)
      loadLogs(selectedSchedule.id)
    } else {
      setEnrollments([])
    }
  }, [selectedSchedule])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const getStatusParams = () => {
    switch (statusFilter) {
      case 'not_started':
      return ['pending', 'confirmed']
      case 'in_progress': return ['in_progress']
      case 'completed': return ['completed']
      default: return undefined
    }
  }

  const loadSchedules = async () => {
    try {
      const result = await api.getSchedules({
        date: selectedDate,
        statuses: getStatusParams()
      })
      setSchedules(result.list)
      if (selectedSchedule) {
        const stillExists = result.list.find((s: Schedule) => s.id === selectedSchedule.id)
        if (stillExists) {
          setSelectedSchedule(stillExists)
        } else if (result.list.length > 0) {
          setSelectedSchedule(result.list[0])
        } else {
          setSelectedSchedule(null)
        }
      } else if (result.list.length > 0) {
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

  const loadLogs = async (scheduleId?: string) => {
    try {
      const result = await api.getOperationLogs(scheduleId ? { schedule_id: scheduleId, limit: 10 } : { limit: 10 })
      setOperationLogs(result.list || [])
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }

  const refreshBoth = async (currentScheduleId?: string) => {
    try {
      const sResult = await api.getSchedules({
        date: selectedDate,
        statuses: getStatusParams()
      })
      setSchedules(sResult.list)

      const targetId = currentScheduleId || selectedSchedule?.id
      if (targetId) {
        const updatedSchedule = sResult.list.find((s: Schedule) => s.id === targetId)
        if (updatedSchedule) {
          setSelectedSchedule(updatedSchedule)
          await loadEnrollments(targetId)
          await loadLogs(targetId)
        } else if (sResult.list.length > 0) {
          setSelectedSchedule(sResult.list[0])
          await loadEnrollments(sResult.list[0].id)
          await loadLogs(sResult.list[0].id)
        } else {
          setSelectedSchedule(null)
          setEnrollments([])
          await loadLogs()
        }
      } else {
        await loadLogs()
      }
    } catch (error) {
      console.error('Failed to refresh data:', error)
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
        showToast(result.message)
        setSelectedMember('')
        await refreshBoth(selectedSchedule.id)
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
        showToast('签到成功')
        await refreshBoth(selectedSchedule!.id)
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
      const result = await api.cancelEnrollment(enrollmentId)
      if (result.success) {
        let msg = '已取消报名'
        if (result.promoted) {
          msg = `已取消报名，候补递补：${result.promoted.member_name}`
        }
        showToast(msg)
        await refreshBoth(selectedSchedule!.id)
      }
    } catch (error) {
      console.error('Failed to cancel enrollment:', error)
    }
  }

  const handleReleaseNoShows = async () => {
    if (!confirm('确定释放超过6小时未签到的名额吗？')) return
    
    try {
      const result = await api.releaseNoShows()
      let msg = `已释放 ${result.releasedCount} 个名额`
      if (result.releasedDetails?.length > 0) {
        const names = result.releasedDetails.map((r: any) => r.member_name).join('、')
        msg += `\n释放：${names}`
      }
      if (result.promotedDetails?.length > 0) {
        const pnames = result.promotedDetails.map((p: any) => p.member_name).join('、')
        msg += `\n递补：${pnames}`
      }
      showToast(msg)
      await refreshBoth(selectedSchedule?.id)
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

  const getScheduleStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待确认'
      case 'confirmed': return '未开始'
      case 'in_progress': return '进行中'
      case 'completed': return '已结束'
      case 'cancelled': return '已取消'
      default: return status
    }
  }

  const getScheduleStatusTag = (status: string) => {
    switch (status) {
      case 'pending': return 'tag-default'
      case 'confirmed': return 'tag-blue'
      case 'in_progress': return 'tag-green'
      case 'completed': return 'tag-purple'
      case 'cancelled': return 'tag-red'
      default: return 'tag-default'
    }
  }

  const getActionText = (action: string) => {
    switch (action) {
      case 'release_no_show': return '释放未到'
      case 'cancel_enrollment': return '取消报名'
      case 'waitlist_promoted': return '候补转正'
      case 'enroll': return '报名'
      case 'check_in': return '签到'
      default: return action
    }
  }

  const normalEnrollments = enrollments.filter(
    e => e.is_waitlist === 0 && ['enrolled', 'checked_in', 'completed'].includes(e.status)
  )
  const waitlistEnrollments = enrollments.filter(e => e.is_waitlist === 1 && e.status === 'enrolled')
  const noShowEnrollments = enrollments.filter(e => e.is_waitlist === 0 && e.status === 'no_show')

  const statusFilters: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'not_started', label: '未开始' },
    { key: 'in_progress', label: '进行中' },
    { key: 'completed', label: '已结束' },
  ]

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">报名签到</h2>
        <button className="btn btn-warning" onClick={handleReleaseNoShows}>
          释放超时未签到
        </button>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: '#52c41a', color: '#fff',
          padding: '12px 20px', borderRadius: 4,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          whiteSpace: 'pre-line', maxWidth: 360
        }}>
          {toast}
        </div>
      )}

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

            <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
              {statusFilters.map(f => (
                <button
                  key={f.key}
                  className={`btn btn-small ${statusFilter === f.key ? 'btn-primary' : 'btn-default'}`}
                  style={{ flex: 1, minWidth: 60 }}
                  onClick={() => {
                    setStatusFilter(f.key)
                    setSelectedSchedule(null)
                  }}
                >
                  {f.label}
                </button>
              ))}
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 'bold' }}>{s.course_name}</span>
                      <span className={`tag ${getScheduleStatusTag(s.status)}`}>{getScheduleStatusText(s.status)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {s.start_time} - {s.end_time} | {s.coach_name}
                    </div>
                    {s.is_private ? (
                      <div style={{ fontSize: 12, color: '#722ed1', marginTop: 2 }}>
                        私教 · {s.member_name} ({s.member_level})
                      </div>
                    ) : null}
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

          {operationLogs.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 12, fontSize: 14 }}>操作记录</h3>
              <div style={{ maxHeight: 220, overflowY: 'auto', fontSize: 12 }}>
                {operationLogs.map(log => (
                  <div key={log.id} style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="tag tag-blue">{getActionText(log.action)}</span>
                      <span style={{ color: '#999' }}>{dayjs(log.created_at).format('HH:mm')}</span>
                    </div>
                    <div style={{ color: '#666', marginTop: 2, lineHeight: 1.4 }}>
                      {log.member_name}
                      {log.related_member_name ? ` → ${log.related_member_name}` : ''}
                    </div>
                    <div style={{ color: '#999', fontSize: 11 }}>{log.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ flex: 1 }}>
          {selectedSchedule ? (
            <>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ marginBottom: 8 }}>{selectedSchedule.course_name}</h3>
                    <div style={{ color: '#666', fontSize: 13 }}>
                      {selectedSchedule.start_time} - {selectedSchedule.end_time} | 教练：{selectedSchedule.coach_name} | 场地：{selectedSchedule.zone_name}
                    </div>
                    <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                      状态：<span className={`tag ${getScheduleStatusTag(selectedSchedule.status)}`}>{getScheduleStatusText(selectedSchedule.status)}</span>
                    </div>
                    {selectedSchedule.is_private && selectedSchedule.match_reason && (
                      <div style={{ color: '#722ed1', fontSize: 12, marginTop: 6, background: '#f9f0ff', padding: '6px 8px', borderRadius: 4 }}>
                        💡 匹配原因：{selectedSchedule.match_reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {['confirmed', 'in_progress'].includes(selectedSchedule.status) && (
                <div className="card" style={{ marginTop: 16 }}>
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
              )}

              <div className="card" style={{ marginTop: 16 }}>
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
                              {e.status === 'enrolled' && ['confirmed', 'in_progress'].includes(selectedSchedule.status) && (
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
                <div className="card" style={{ marginTop: 16 }}>
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
                <div className="card" style={{ marginTop: 16 }}>
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
