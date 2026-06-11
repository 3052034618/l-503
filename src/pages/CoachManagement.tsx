import { useEffect, useState } from 'react'
import { api } from '../api'
import { Coach } from '../types'
import CoachModal from '../components/CoachModal'

const CoachManagement = () => {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCoach, setEditingCoach] = useState<Coach | null>(null)

  useEffect(() => {
    loadCoaches()
  }, [page, keyword])

  const loadCoaches = async () => {
    try {
      setLoading(true)
      const result = await api.getCoaches({
        page,
        pageSize,
        keyword: keyword || undefined
      })
      setCoaches(result.list)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load coaches:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingCoach(null)
    setModalVisible(true)
  }

  const handleEdit = (coach: Coach) => {
    setEditingCoach(coach)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该教练吗？')) return
    try {
      await api.deleteCoach(id)
      loadCoaches()
    } catch (error) {
      console.error('Failed to delete coach:', error)
    }
  }

  const handleSave = () => {
    setModalVisible(false)
    loadCoaches()
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">教练管理</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          + 添加教练
        </button>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="搜索教练姓名/手机号"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
          <button className="btn btn-default" onClick={() => {
            setKeyword('')
            setPage(1)
          }}>
            重置
          </button>
        </div>

        {loading ? (
          <p>加载中...</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>性别</th>
                  <th>手机号</th>
                  <th>专长</th>
                  <th>资质认证</th>
                  <th>教龄</th>
                  <th>每日最大课数</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {coaches.map(coach => {
                  let specialties = []
                  try {
                    specialties = JSON.parse(coach.specialties || '[]')
                  } catch {}
                  
                  return (
                    <tr key={coach.id}>
                      <td>{coach.name}</td>
                      <td>{coach.gender || '-'}</td>
                      <td>{coach.phone || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {specialties.map((s: string, i: number) => (
                            <span key={i} className="tag tag-blue">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td>{coach.certification || '-'}</td>
                      <td>{coach.experience_years ? `${coach.experience_years}年` : '-'}</td>
                      <td>{coach.max_daily_classes}节</td>
                      <td>
                        <span className={`tag ${coach.status === 'active' ? 'tag-green' : 'tag-default'}`}>
                          {coach.status === 'active' ? '在职' : '离职'}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-small btn-default" onClick={() => handleEdit(coach)}>
                            编辑
                          </button>
                          <button className="btn btn-small btn-danger" onClick={() => handleDelete(coach.id)}>
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
        )}
      </div>

      {modalVisible && (
        <CoachModal
          coach={editingCoach}
          onClose={() => setModalVisible(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default CoachManagement
