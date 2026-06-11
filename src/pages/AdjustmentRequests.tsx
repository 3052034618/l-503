import { useEffect, useState } from 'react'
import { api } from '../api'
import { AdjustmentRequest } from '../types'

const AdjustmentRequests = () => {
  const [tab, setTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [requests, setRequests] = useState<AdjustmentRequest[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<AdjustmentRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectModalVisible, setRejectModalVisible] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [tab, page])

  const loadRequests = async () => {
    try {
      setLoading(true)
      const result = await api.getAdjustmentRequests({
        status: tab === 'all' ? undefined : tab,
        page,
        pageSize
      })
      setRequests(result.list)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load adjustment requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (request: AdjustmentRequest) => {
    if (!confirm('确定批准该调整申请吗？')) return
    
    try {
      const result = await api.approveAdjustment(request.id)
      if (result.success) {
        alert('已批准')
        loadRequests()
      } else {
        alert(result.message || '操作失败')
      }
    } catch (error) {
      console.error('Failed to approve:', error)
    }
  }

  const handleReject = (request: AdjustmentRequest) => {
    setSelectedRequest(request)
    setRejectionReason('')
    setRejectModalVisible(true)
  }

  const submitReject = async () => {
    if (!rejectionReason) {
      alert('请输入拒绝原因')
      return
    }

    if (!selectedRequest) return

    try {
      const result = await api.rejectAdjustment(selectedRequest.id, rejectionReason)
      if (result.success) {
        alert('已拒绝')
        setRejectModalVisible(false)
        loadRequests()
      } else {
        alert(result.message || '操作失败')
      }
    } catch (error) {
      console.error('Failed to reject:', error)
    }
  }

  const getRequestTypeText = (type: string) => {
    switch (type) {
      case 'modify': return '修改信息'
      case 'reschedule': return '改期'
      case 'cancel': return '取消课程'
      default: return type
    }
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'pending': return 'tag-orange'
      case 'approved': return 'tag-green'
      case 'rejected': return 'tag-red'
      default: return 'tag-default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待审批'
      case 'approved': return '已批准'
      case 'rejected': return '已拒绝'
      default: return status
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">调整审批</h2>
      </div>

      <div className="card">
        <div className="tabs">
          <div
            className={`tab-item ${tab === 'pending' ? 'active' : ''}`}
            onClick={() => { setTab('pending'); setPage(1) }}
          >
            待审批
          </div>
          <div
            className={`tab-item ${tab === 'approved' ? 'active' : ''}`}
            onClick={() => { setTab('approved'); setPage(1) }}
          >
            已批准
          </div>
          <div
            className={`tab-item ${tab === 'rejected' ? 'active' : ''}`}
            onClick={() => { setTab('rejected'); setPage(1) }}
          >
            已拒绝
          </div>
          <div
            className={`tab-item ${tab === 'all' ? 'active' : ''}`}
            onClick={() => { setTab('all'); setPage(1) }}
          >
            全部
          </div>
        </div>

        {loading ? (
          <p>加载中...</p>
        ) : requests.length > 0 ? (
          <>
            <table>
              <thead>
                <tr>
                  <th>课程名称</th>
                  <th>课程时间</th>
                  <th>教练</th>
                  <th>申请类型</th>
                  <th>申请原因</th>
                  <th>状态</th>
                  <th>申请时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td>{req.course_name}</td>
                    <td>
                      {req.date?.split('T')[0] || '-'}
                      <br />
                      <span style={{ fontSize: 12, color: '#666' }}>
                        {req.start_time} - {req.end_time}
                      </span>
                    </td>
                    <td>{req.coach_name}</td>
                    <td>
                      <span className="tag tag-blue">
                        {getRequestTypeText(req.request_type)}
                      </span>
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.reason || '-'}
                    </td>
                    <td>
                      <span className={`tag ${getStatusTag(req.status)}`}>
                        {getStatusText(req.status)}
                      </span>
                    </td>
                    <td>{req.created_at?.split('T')[0] || '-'}</td>
                    <td>
                      {req.status === 'pending' && (
                        <div className="action-btns">
                          <button
                            className="btn btn-small btn-success"
                            onClick={() => handleApprove(req)}
                          >
                            批准
                          </button>
                          <button
                            className="btn btn-small btn-danger"
                            onClick={() => handleReject(req)}
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                      {req.status !== 'pending' && (
                        <span style={{ color: '#999', fontSize: 12 }}>
                          已处理
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <span style={{ marginRight: 12 }}>共 {total} 条</span>
              <button
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, page - 3),
                Math.min(totalPages, page + 2)
              ).map(p => (
                <button
                  key={p}
                  className={`pagination-btn ${page === p ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="pagination-btn"
                disabled={page === totalPages || totalPages === 0}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              >
                下一页
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>暂无调整申请</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>审批说明</h3>
        <ul style={{ color: '#666', lineHeight: 2, paddingLeft: 20 }}>
          <li>课程调整申请需运营经理审批后方可生效</li>
          <li>审批通过后，系统自动更新课程排期信息</li>
          <li>拒绝申请时需要填写拒绝原因</li>
          <li>申请类型包括：修改课程信息、改期、取消课程</li>
          <li>请及时处理待审批的申请，避免影响正常运营</li>
        </ul>
      </div>

      {rejectModalVisible && (
        <div className="modal-mask" onClick={() => setRejectModalVisible(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 400 }}>
            <div className="modal-header">
              <span>拒绝申请</span>
              <span className="modal-close" onClick={() => setRejectModalVisible(false)}>✕</span>
            </div>
            <div className="modal-body">
              <div className="form-item">
                <label className="form-label">请输入拒绝原因</label>
                <textarea
                  className="form-input"
                  rows={4}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="请详细说明拒绝原因..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-default" onClick={() => setRejectModalVisible(false)}>
                取消
              </button>
              <button className="btn btn-danger" onClick={submitReject}>
                确认拒绝
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdjustmentRequests
