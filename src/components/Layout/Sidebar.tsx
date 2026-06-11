import { FC } from 'react'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const menuItems = [
  { key: 'dashboard', label: '首页仪表盘', icon: '📊' },
  { key: 'members', label: '会员管理', icon: '👤' },
  { key: 'coaches', label: '教练管理', icon: '🏋️' },
  { key: 'equipment', label: '设备管理', icon: '⚙️' },
  { key: 'courses', label: '课程管理', icon: '📚' },
  { key: 'schedules', label: '排课管理', icon: '📅' },
  { key: 'enrollments', label: '报名签到', icon: '✅' },
  { key: 'statistics', label: '统计分析', icon: '📈' },
  { key: 'floorplan', label: '场馆平面图', icon: '🗺️' },
  { key: 'maintenance', label: '设备维保', icon: '🔧' },
  { key: 'adjustments', label: '调整审批', icon: '📝' },
]

const Sidebar: FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        🏋️ 健身管理系统
      </div>
      <div className="sidebar-menu">
        {menuItems.map(item => (
          <div
            key={item.key}
            className={`menu-item ${currentPage === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="menu-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
