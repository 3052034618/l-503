import { useEffect, useState } from 'react'
import { api } from '../api'
import { Equipment } from '../types'
import EquipmentModal from '../components/EquipmentModal'

const EquipmentManagement = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null)

  useEffect(() => {
    loadEquipment()
  }, [page, keyword, type, status])

  const loadEquipment = async () => {
    try {
      setLoading(true)
      const result = await api.getEquipment({
        page,
        pageSize,
        keyword: keyword || undefined,
        type: type || undefined,
        status: status || undefined
      })
      setEquipment(result.list)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingEquipment(null)
    setModalVisible(true)
  }

  const handleEdit = (equip: Equipment) => {
    setEditingEquipment(equip)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该设备吗？')) return
    try {
      await api.deleteEquipment(id)
      loadEquipment()
    } catch (error) {
      console.error('Failed to delete equipment:', error)
    }
  }

  const handleMaintenance = async (id: string) => {
    if (!confirm('确定要对该设备执行维保吗？')) return
    try {
      await api.performMaintenance(id)
      loadEquipment()
    } catch (error) {
      console.error('Failed to perform maintenance:', error)
    }
  }

  const handleSave = () => {
    setModalVisible(false)
    loadEquipment()
  }

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'normal': return 'tag-green'
      case 'maintenance_required': return 'tag-red'
      case 'maintenance_in_progress': return 'tag-orange'
      case 'broken': return 'tag-default'
      default: return 'tag-default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'normal': return '正常'
      case 'maintenance_required': return '需维保'
      case 'maintenance_in_progress': return '维保中'
      case 'broken': return '故障'
      default: return status
    }
  }

  const getUsageProgress = (current: number, max: number) => {
    const ratio = current / max
    if (ratio >= 1) return { color: 'danger', percent: 100 }
    if (ratio >= 0.8) return { color: 'warning', percent: Math.round(ratio * 100) }
    return { color: 'success', percent: Math.round(ratio * 100) }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">设备管理</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          + 添加设备
        </button>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="搜索设备名称/品牌"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              setPage(1)
            }}
          />
          <select
            className="search-input"
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(1)
            }}
          >
            <option value="">全部类型</option>
            <option value="有氧">有氧设备</option>
            <option value="力量">力量设备</option>
            <option value="瑜伽">瑜伽设备</option>
            <option value="私教">私教设备</option>
          </select>
          <select
            className="search-input"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
          >
            <option value="">全部状态</option>
            <option value="normal">正常</option>
            <option value="maintenance_required">需维保</option>
            <option value="broken">故障</option>
          </select>
          <button className="btn btn-default" onClick={() => {
            setKeyword('')
            setType('')
            setStatus('')
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
                  <th>设备名称</th>
                  <th>类型</th>
                  <th>品牌</th>
                  <th>所属区域</th>
                  <th>使用次数</th>
                  <th>使用进度</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map(equip => {
                  const progress = getUsageProgress(equip.current_usage_count, equip.max_usage_count)
                  return (
                    <tr key={equip.id}>
                      <td>{equip.name}</td>
                      <td>{equip.type}</td>
                      <td>{equip.brand || '-'}</td>
                      <td>{equip.zone_name || '-'}</td>
                      <td>{equip.current_usage_count} / {equip.max_usage_count}</td>
                      <td style={{ width: 120 }}>
                        <div className="progress-bar">
                          <div
                            className={`progress-fill ${progress.color}`}
                            style={{ width: `${progress.percent}%` }}
                          ></div>
                        </div>
                      </td>
                      <td>
                        <span className={`tag ${getStatusTag(equip.status)}`}>
                          {getStatusText(equip.status)}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="btn btn-small btn-default" onClick={() => handleEdit(equip)}>
                            编辑
                          </button>
                          {equip.status === 'maintenance_required' && (
                            <button className="btn btn-small btn-warning" onClick={() => handleMaintenance(equip.id)}>
                              维保
                            </button>
                          )}
                          <button className="btn btn-small btn-danger" onClick={() => handleDelete(equip.id)}>
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
        <EquipmentModal
          equipment={editingEquipment}
          onClose={() => setModalVisible(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default EquipmentManagement
