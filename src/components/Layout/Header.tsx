import { FC, useEffect, useState } from 'react'
import { api } from '../../api'

interface HeaderProps {
  title: string
}

const Header: FC<HeaderProps> = ({ title }) => {
  const [maintenanceCount, setMaintenanceCount] = useState(0)
  const [adjustmentCount, setAdjustmentCount] = useState(0)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const reminders = await api.getMaintenanceReminders()
      setMaintenanceCount(reminders.length || 0)

      const requests = await api.getAdjustmentRequests({ status: 'pending' })
      setAdjustmentCount(requests.total || 0)
    } catch (error) {
      console.error('Failed to load header stats:', error)
    }
  }

  return (
    <div className="header">
      <div className="header-title">{title}</div>
      <div className="header-right">
        <div className="notification-badge" title="维保提醒">
          🔧
          {maintenanceCount > 0 && <span className="badge-dot"></span>}
        </div>
        <div className="notification-badge" title="待审批">
          📝
          {adjustmentCount > 0 && <span className="badge-dot"></span>}
        </div>
        <div className="user-info">
          <div className="user-avatar">管</div>
          <span>管理员</span>
        </div>
      </div>
    </div>
  )
}

export default Header
