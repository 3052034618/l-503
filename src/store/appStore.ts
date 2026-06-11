import { create } from 'zustand'
import { DashboardStats } from '../types'

interface AppState {
  currentPage: string
  setCurrentPage: (page: string) => void
  
  dashboardStats: DashboardStats | null
  loadDashboardStats: () => Promise<void>
  
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

const useAppStore = create<AppState>((set, get) => ({
  currentPage: 'dashboard',
  setCurrentPage: (page) => set({ currentPage: page }),

  dashboardStats: null,
  loadDashboardStats: async () => {
    try {
      const stats = await window.electronAPI.getDashboardStats()
      set({ dashboardStats: stats })
    } catch (error) {
      console.error('Failed to load dashboard stats:', error)
    }
  },

  sidebarCollapsed: false,
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed })
}))

export default useAppStore
