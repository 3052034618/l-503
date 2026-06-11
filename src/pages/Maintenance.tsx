import { useEffect, useState } from 'react'
import { api } from '../api'
import { Equipment } from '../types'

const Maintenance = () => {
  const [reminders, setReminders] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadReminders()
  }, [])

  const loadReminders = async () => {
    try {
      setLoading(true)
      const data = await api.getMaintenanceReminders()
      setReminders(data)
    } catch (error) {
      console.error('Failed to load maintenance reminders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMaintenance = async (id: string) => {
    if (!confirm('确定对该设备执行维保操作吗？维保后使用次数将重置。')) return
    
    try {
      await api.performMaintenance(id)
      loadReminders()
      alert('维保完成')
    } catch (error) {
      console.error('Failed to perform maintenance:', error)
    }
  }

  const getUsageRatio = (equip: Equipment) => {
    return equip.max_usage_count > 0 
      ? Math.round((equip.current_usage_count / equip.max_usage_count) * 100) 
      : 0
  }

  const getUrgencyLevel = (equip: Equipment) => {
    const ratio = equip.current_usage_count / equip.max_usage_count
    if (ratio >= 1) return { text: '需立即维保', color: 'tag-red', level: 'critical' }
    if (ratio >= 0.9) return { text: '即将超限', color: 'tag-red', level: 'high' }
    if (ratio >= 0.8) return { text: '建议维保', color: 'tag-orange', level: 'medium' }
    return { text: '正常', color: 'tag-green', level: 'low' }
  }

  const urgentCount = reminders.filter(e => e.status === 'maintenance_required').length
  const warningCount = reminders.filter(e => e.status !== 'maintenance_required').length

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">设备维保</h2>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-card-icon">🔴</span>
          <div className="stat-card-title">需立即维保</div>
          <div className="stat-card-value" style={{ color: '#ff4d4f' }}>{urgentCount}</div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">🟡</span>
          <div className="stat-card-title">即将超限</div>
          <div className="stat-card-value" style={{ color: '#faad14' }}>{warningCount}</div>
        </div>
        <div className="stat-card">
          <span className="stat-card-icon">📋</span>
          <div className="stat-card-title">待处理总数</div>
          <div className="stat-card-value">{reminders.length}</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>维保提醒列表</h3>
          <button className="btn btn-default" onClick={loadReminders}>
            刷新
          </button>
        </div>

        {loading ? (
          <p>加载中...</p>
        ) : reminders.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>设备名称</th>
                <th>类型</th>
                <th>品牌</th>
                <th>所属区域</th>
                <th>使用次数</th>
                <th>使用进度</th>
                <th>紧急程度</th>
                <th>上次维保</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map(equip => {
                const urgency = getUrgencyLevel(equip)
                const ratio = getUsageRatio(equip)
                return (
                  <tr key={equip.id}>
                    <td>{equip.name}</td>
                    <td>{equip.type}</td>
                    <td>{equip.brand || '-'}</td>
                    <td>{equip.zone_name || '-'}</td>
                    <td>{equip.current_usage_count} / {equip.max_usage_count}</td>
                    <td style={{ width: 150 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div
                            className={`progress-fill ${
                              urgency.level === 'critical' || urgency.level === 'high' ? 'danger' : 'warning'
                            }`}
                            style={{ width: `${Math.min(ratio, 100)}%` }}
                          ></div>
                        </div>
                        <span style={{ fontSize: 12, width: 40 }}>{ratio}%</span>
                      </div>
                    </td>
                    <td>
                      <span className={`tag ${urgency.color}`}>
                        {urgency.text}
                      </span>
                    </td>
                    <td>{equip.last_maintenance_date ? equip.last_maintenance_date.split('T')[0] : '-'}</td>
                    <td>
                      <button
                        className="btn btn-small btn-warning"
                        onClick={() => handleMaintenance(equip.id)}
                      >
                        执行维保
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <p>暂无设备需要维保</p>
            <p style={{ marginTop: 8, color: '#999', fontSize: 12 }}>所有设备状态正常</p>
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>维保说明</h3>
        <ul style={{ color: '#666', lineHeight: 2, paddingLeft: 20 }}>
          <li>设备使用次数达到额定次数的80%时，系统会自动发出维保提醒</li>
          <li>设备使用次数达到或超过额定次数时，设备将被锁定，需维保后才能继续使用</li>
          <li>执行维保操作后，设备使用次数将重置为0，状态恢复为正常</li>
          <li>建议定期对设备进行预防性维护，延长设备使用寿命</li>
          <li>维保记录会自动保存在系统中，可随时查阅</li>
        </ul>
      </div>
    </div>
  )
}

export default Maintenance
