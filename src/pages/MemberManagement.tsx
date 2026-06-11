import { useEffect, useState } from 'react'
import { api } from '../api'
import { Member } from '../types'
import MemberModal from '../components/MemberModal'

const MemberManagement = () => {
  const [members, setMembers] = useState<Member[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [level, setLevel] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)

  useEffect(() => {
    loadMembers()
  }, [page, keyword, level])

  const loadMembers = async () => {
    try {
      setLoading(true)
      const result = await api.getMembers({
        page,
        pageSize,
        keyword: keyword || undefined,
        level: level || undefined
      })
      setMembers(result.list)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingMember(null)
    setModalVisible(true)
  }

  const handleEdit = (member: Member) => {
    setEditingMember(member)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该会员吗？')) return
    try {
      await api.deleteMember(id)
      loadMembers()
    } catch (error) {
      console.error('Failed to delete member:', error)
    }
  }

  const handleSave = () => {
    setModalVisible(false)
    loadMembers()
  }

  const getLevelTag = (level: string) => {
    const colors: Record<string, string> = {
      '普通': 'tag-default',
      '黄金': 'tag-orange',
      '钻石': 'tag-blue',
      'VIP': 'tag-purple'
    }
    return colors[level] || 'tag-default'
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">会员管理</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          + 添加会员
        </button>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="搜索会员姓名/手机号"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
          <select
            className="search-input"
            value={level}
            onChange={(e) => {
              setLevel(e.target.value)
              setPage(1)
            }}
          >
            <option value="">全部等级</option>
            <option value="普通">普通会员</option>
            <option value="黄金">黄金会员</option>
            <option value="钻石">钻石会员</option>
            <option value="VIP">VIP会员</option>
          </select>
          <button className="btn btn-default" onClick={() => {
            setKeyword('')
            setLevel('')
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
                  <th>会员等级</th>
                  <th>身高/体重</th>
                  <th>BMI</th>
                  <th>体脂率</th>
                  <th>入会日期</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id}>
                    <td>{member.name}</td>
                    <td>{member.gender || '-'}</td>
                    <td>{member.phone || '-'}</td>
                    <td>
                      <span className={`tag ${getLevelTag(member.level)}`}>
                        {member.level}
                      </span>
                    </td>
                    <td>{member.height || '-'}cm / {member.weight || '-'}kg</td>
                    <td>{member.bmi || '-'}</td>
                    <td>{member.body_fat ? `${member.body_fat}%` : '-'}</td>
                    <td>{member.join_date?.split('T')[0] || '-'}</td>
                    <td>
                      <span className={`tag ${member.status === 'active' ? 'tag-green' : 'tag-default'}`}>
                        {member.status === 'active' ? '正常' : '已停用'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-small btn-default" onClick={() => handleEdit(member)}>
                          编辑
                        </button>
                        <button className="btn btn-small btn-danger" onClick={() => handleDelete(member.id)}>
                          删除
                        </button>
                      </div>
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
        )}
      </div>

      {modalVisible && (
        <MemberModal
          member={editingMember}
          onClose={() => setModalVisible(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default MemberManagement
