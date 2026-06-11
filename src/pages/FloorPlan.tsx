import { useEffect, useState } from 'react'
import { api } from '../api'
import { HeatmapZone } from '../types'
import dayjs from 'dayjs'

const FloorPlan = () => {
  const [zones, setZones] = useState<HeatmapZone[]>([])
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [selectedZone, setSelectedZone] = useState<HeatmapZone | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadHeatmapData()
  }, [selectedDate])

  const loadHeatmapData = async () => {
    try {
      setLoading(true)
      const data = await api.getHeatmapData(selectedDate)
      setZones(data)
    } catch (error) {
      console.error('Failed to load heatmap data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getHeatColor = (level: number, baseColor: string) => {
    switch (level) {
      case 0: return `${baseColor}30`
      case 1: return `${baseColor}60`
      case 2: return `${baseColor}a0`
      case 3: return baseColor
      default: return `${baseColor}30`
    }
  }

  const getHeatLevelText = (level: number) => {
    switch (level) {
      case 0: return '空闲'
      case 1: return '低'
      case 2: return '中'
      case 3: return '高'
      default: return '未知'
    }
  }

  const heatLegendColors = [
    { level: 0, color: '#52c41a', text: '空闲' },
    { level: 1, color: '#faad14', text: '低' },
    { level: 2, color: '#fa8c16', text: '中' },
    { level: 3, color: '#ff4d4f', text: '高' },
  ]

  const planWidth = 800
  const planHeight = 700

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">场馆平面图</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span>查看日期：</span>
          <input
            type="date"
            className="search-input"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p>加载中...</p>
        ) : (
          <div className="floor-plan" style={{ width: planWidth, height: planHeight }}>
            {zones.map(zone => (
              <div
                key={zone.id}
                className="floor-zone"
                style={{
                  left: zone.position_x,
                  top: zone.position_y,
                  width: zone.width,
                  height: zone.height,
                  borderColor: zone.color,
                  background: getHeatColor(zone.heat_level, zone.color)
                }}
                onClick={() => setSelectedZone(zone)}
              >
                <div className="floor-zone-name">{zone.name}</div>
                <div className="floor-zone-info">
                  课程: {zone.schedule_count} 节
                </div>
                <div className="floor-zone-info">
                  设备: {zone.equipment_count} 台
                </div>
              </div>
            ))}

            <svg
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
            >
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
                </marker>
              </defs>
            </svg>
          </div>
        )}

        <div className="heat-legend">
          <span style={{ marginRight: 8 }}>热力等级：</span>
          {heatLegendColors.map(item => (
            <div key={item.level} className="heat-legend-item">
              <div
                className="heat-legend-color"
                style={{ backgroundColor: item.color, opacity: 0.7 }}
              ></div>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedZone && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>{selectedZone.name} - 详细信息</h3>
            <button className="btn btn-small btn-default" onClick={() => setSelectedZone(null)}>
              关闭
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 16 }}>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>区域类型</div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedZone.area_type}</div>
            </div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>容纳人数</div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedZone.capacity}人</div>
            </div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>今日课程</div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>{selectedZone.schedule_count}节</div>
            </div>
            <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4, textAlign: 'center' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>热力等级</div>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>
                {getHeatLevelText(selectedZone.heat_level)}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            <div>
              <h4 style={{ marginBottom: 8 }}>设备统计</h4>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, padding: 8, background: '#f6ffed', borderRadius: 4, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#52c41a' }}>{selectedZone.normal_equipment}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>正常</div>
                </div>
                <div style={{ flex: 1, padding: 8, background: '#fff1f0', borderRadius: 4, textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 'bold', color: '#ff4d4f' }}>{selectedZone.maintenance_equipment}</div>
                  <div style={{ fontSize: 12, color: '#666' }}>需维保</div>
                </div>
              </div>
            </div>
            <div>
              <h4 style={{ marginBottom: 8 }}>更衣室容量</h4>
              <div style={{ padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
                <div style={{ fontSize: 24, fontWeight: 'bold', textAlign: 'center' }}>
                  {selectedZone.locker_room_capacity} 个
                </div>
                <div style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 4 }}>
                  更衣柜
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>区域列表</h3>
        <table>
          <thead>
            <tr>
              <th>区域名称</th>
              <th>类型</th>
              <th>容纳人数</th>
              <th>今日课程</th>
              <th>设备数量</th>
              <th>热力等级</th>
            </tr>
          </thead>
          <tbody>
            {zones.map(zone => (
              <tr key={zone.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedZone(zone)}>
                <td>
                  <span style={{
                    display: 'inline-block',
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: zone.color,
                    marginRight: 8
                  }}></span>
                  {zone.name}
                </td>
                <td>{zone.area_type}</td>
                <td>{zone.capacity}人</td>
                <td>{zone.schedule_count}节</td>
                <td>{zone.equipment_count}台</td>
                <td>
                  <span className={`tag ${
                    zone.heat_level >= 3 ? 'tag-red' :
                    zone.heat_level >= 2 ? 'tag-orange' :
                    zone.heat_level >= 1 ? 'tag-blue' : 'tag-green'
                  }`}>
                    {getHeatLevelText(zone.heat_level)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default FloorPlan
