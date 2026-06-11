import { useState } from 'react'
import Sidebar from './components/Layout/Sidebar'
import Header from './components/Layout/Header'
import Dashboard from './pages/Dashboard'
import MemberManagement from './pages/MemberManagement'
import CoachManagement from './pages/CoachManagement'
import EquipmentManagement from './pages/EquipmentManagement'
import CourseManagement from './pages/CourseManagement'
import ScheduleManagement from './pages/ScheduleManagement'
import EnrollmentManagement from './pages/EnrollmentManagement'
import Statistics from './pages/Statistics'
import FloorPlan from './pages/FloorPlan'
import Maintenance from './pages/Maintenance'
import AdjustmentRequests from './pages/AdjustmentRequests'

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'members':
        return <MemberManagement />
      case 'coaches':
        return <CoachManagement />
      case 'equipment':
        return <EquipmentManagement />
      case 'courses':
        return <CourseManagement />
      case 'schedules':
        return <ScheduleManagement />
      case 'enrollments':
        return <EnrollmentManagement />
      case 'statistics':
        return <Statistics />
      case 'floorplan':
        return <FloorPlan />
      case 'maintenance':
        return <Maintenance />
      case 'adjustments':
        return <AdjustmentRequests />
      default:
        return <Dashboard />
    }
  }

  const pageTitles: Record<string, string> = {
    dashboard: '首页仪表盘',
    members: '会员管理',
    coaches: '教练管理',
    equipment: '设备管理',
    courses: '课程管理',
    schedules: '排课管理',
    enrollments: '报名签到',
    statistics: '统计分析',
    floorplan: '场馆平面图',
    maintenance: '设备维保',
    adjustments: '调整审批'
  }

  return (
    <div className="app-container">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="main-content">
        <Header title={pageTitles[currentPage] || ''} />
        <div className="content">
          {renderPage()}
        </div>
      </div>
    </div>
  )
}

export default App
