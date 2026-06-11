import { FC, useState } from 'react'
import { Schedule } from '../types'
import { api } from '../api'

interface AdjustmentModalProps {
  schedule: Schedule
  onClose: () => void
  onSave: () => void
}

const AdjustmentModal: FC<AdjustmentModalProps> = ({ schedule, onClose, onSave }) => {
  const [requestType, setRequestType] = useState('modify')
  const [requestedData, setRequestedData] = useState<any>({
    start_time: schedule.start_time,
    end_time: schedule.end_time,
    coach_id: schedule.coach_id,
    zone_id: schedule.zone_id || '',
    capacity: schedule.capacity
  })
  const [reason, setReason] = useState('')

  const handleSubmit = async () => {
    if (!reason) {
      alert('请输入调整原因')
      return
    }

    try {
      const adjustment = {
        requester_type: 'operator',
        request_type: requestType,
        original_data: JSON.stringify({
          start_time: schedule.start_time,
          end_time: schedule.end_time,
          coach_id: schedule.coach_id,
          zone_id: schedule.zone_id,
          capacity: schedule.capacity
        }),
        requested_data: JSON.stringify(requestedData),
        reason
      }

      await api.requestAdjustment(schedule.id, adjustment)
      alert('调整申请已提交，等待审批')
      onSave()
    } catch (error) {
      console.error('Failed to submit adjustment:', error)
      alert('提交失败')
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>课程调整申请</span>
          <span className="modal-close" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="form-item">
            <label className="form-label">课程信息</label>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
              <p><strong>{schedule.course_name}</strong></p>
              <p>教练：{schedule.coach_name}</p>
              <p>时间：{schedule.date} {schedule.start_time} - {schedule.end_time}</p>
              <p>场地：{schedule.zone_name || '-'}</p>
              <p>容量：{schedule.capacity}人</p>
            </div>
          </div>

          <div className="form-item">
            <label className="form-label">调整类型</label>
            <select
              className="form-input"
              value={requestType}
              onChange={e => setRequestType(e.target.value)}
            >
              <option value="modify">修改课程信息</option>
              <option value="reschedule">改期</option>
              <option value="cancel">取消课程</option>
            </select>
          </div>

          {requestType !== 'cancel' && (
            <>
              <div className="form-row">
                <div className="form-item">
                  <label className="form-label">开始时间</label>
                  <input
                    type="time"
                    className="form-input"
                    value={requestedData.start_time}
                    onChange={e => setRequestedData({ ...requestedData, start_time: e.target.value })}
                  />
                </div>
                <div className="form-item">
                  <label className="form-label">结束时间</label>
                  <input
                    type="time"
                    className="form-input"
                    value={requestedData.end_time}
                    onChange={e => setRequestedData({ ...requestedData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-item">
                <label className="form-label">容量 (人)</label>
                <input
                  type="number"
                  className="form-input"
                  value={requestedData.capacity}
                  onChange={e => setRequestedData({ ...requestedData, capacity: Number(e.target.value) })}
                />
              </div>
            </>
          )}

          <div className="form-item">
            <label className="form-label">调整原因 *</label>
            <textarea
              className="form-input"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="请详细说明调整原因..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>提交申请</button>
        </div>
      </div>
    </div>
  )
}

export default AdjustmentModal
