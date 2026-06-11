import { useEffect, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import { api } from '../api'
import dayjs from 'dayjs'

const Statistics = () => {
  const [tab, setTab] = useState<'overview' | 'course' | 'coach' | 'time'>('overview')
  const [startDate, setStartDate] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'))
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [overviewData, setOverviewData] = useState<any>(null)
  const [courseData, setCourseData] = useState<any[]>([])
  const [coachData, setCoachData] = useState<any[]>([])
  const [timeData, setTimeData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [tab, startDate, endDate])

  const loadData = async () => {
    try {
      setLoading(true)
      const result = await api.getStatistics({
        type: tab,
        startDate,
        endDate
      })
      
      if (tab === 'overview') {
        setOverviewData(result)
      } else if (tab === 'course') {
        setCourseData(result)
      } else if (tab === 'coach') {
        setCoachData(result)
      } else if (tab === 'time') {
        setTimeData(result)
      }
    } catch (error) {
      console.error('Failed to load statistics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const result = await api.exportReport({ startDate, endDate }, '')
      if (result.success) {
        alert('导出成功！文件已保存至：' + result.filePath)
      } else {
        alert(result.message || '导出失败')
      }
    } catch (error) {
      console.error('Failed to export report:', error)
    }
  }

  const getCourseChartOption = () => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['报名人次', '签到人次']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: courseData.map(d => d.course_name),
        axisLabel: {
          rotate: 30,
          interval: 0
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '报名人次',
          type: 'bar',
          data: courseData.map(d => d.total_enrollments),
          itemStyle: { color: '#1890ff' }
        },
        {
          name: '签到人次',
          type: 'bar',
          data: courseData.map(d => d.total_checkins),
          itemStyle: { color: '#52c41a' }
        }
      ]
    }
  }

  const getCoachChartOption = () => {
    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      legend: {
        data: ['授课次数', '学员人次']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: coachData.map(d => d.coach_name)
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '授课次数',
          type: 'bar',
          data: coachData.map(d => d.schedule_count),
          itemStyle: { color: '#722ed1' }
        },
        {
          name: '学员人次',
          type: 'bar',
          data: coachData.map(d => d.total_students),
          itemStyle: { color: '#eb2f96' }
        }
      ]
    }
  }

  const getTimeChartOption = () => {
    return {
      tooltip: {
        trigger: 'axis'
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: timeData.map(d => d.start_time),
        boundaryGap: false
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '课程数',
          type: 'line',
          smooth: true,
          data: timeData.map(d => d.schedule_count),
          areaStyle: {
            color: 'rgba(24, 144, 255, 0.2)'
          },
          lineStyle: {
            color: '#1890ff',
            width: 2
          },
          itemStyle: { color: '#1890ff' }
        }
      ]
    }
  }

  const getCaloriesChartOption = () => {
    const sortedCourses = [...courseData].sort((a, b) => b.total_calories - a.total_calories).slice(0, 8)
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} kcal ({d}%)'
      },
      series: [
        {
          name: '卡路里消耗',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: true,
            formatter: '{b}\n{d}%'
          },
          data: sortedCourses.map(d => ({
            value: d.total_calories,
            name: d.course_name
          }))
        }
      ]
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">统计分析</h2>
        <button className="btn btn-success" onClick={handleExport}>
          📊 导出Excel报告
        </button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <div>
            <label style={{ marginRight: 8 }}>开始日期：</label>
            <input
              type="date"
              className="search-input"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label style={{ marginRight: 8 }}>结束日期：</label>
            <input
              type="date"
              className="search-input"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="tabs">
          <div
            className={`tab-item ${tab === 'overview' ? 'active' : ''}`}
            onClick={() => setTab('overview')}
          >
            总览
          </div>
          <div
            className={`tab-item ${tab === 'course' ? 'active' : ''}`}
            onClick={() => setTab('course')}
          >
            课程统计
          </div>
          <div
            className={`tab-item ${tab === 'coach' ? 'active' : ''}`}
            onClick={() => setTab('coach')}
          >
            教练统计
          </div>
          <div
            className={`tab-item ${tab === 'time' ? 'active' : ''}`}
            onClick={() => setTab('time')}
          >
            时段统计
          </div>
        </div>

        {loading ? (
          <p>加载中...</p>
        ) : (
          <>
            {tab === 'overview' && overviewData && (
              <div>
                <div className="stat-cards">
                  <div className="stat-card">
                    <span className="stat-card-icon">📅</span>
                    <div className="stat-card-title">课程总数</div>
                    <div className="stat-card-value">{overviewData.totalSchedules}</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card-icon">👥</span>
                    <div className="stat-card-title">报名人次</div>
                    <div className="stat-card-value">{overviewData.totalEnrollments}</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card-icon">✅</span>
                    <div className="stat-card-title">签到人次</div>
                    <div className="stat-card-value">{overviewData.totalCheckIns}</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card-icon">📈</span>
                    <div className="stat-card-title">平均到课率</div>
                    <div className="stat-card-value">{overviewData.avgAttendanceRate}%</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card-icon">🔥</span>
                    <div className="stat-card-title">消耗卡路里</div>
                    <div className="stat-card-value">{overviewData.totalCalories}</div>
                  </div>
                  <div className="stat-card">
                    <span className="stat-card-icon">⭐</span>
                    <div className="stat-card-title">平均满意度</div>
                    <div className="stat-card-value">{overviewData.avgSatisfaction}</div>
                  </div>
                </div>

                <div className="card" style={{ padding: 0, margin: 0 }}>
                  <h3 style={{ padding: '16px 20px', margin: 0 }}>核心指标</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>指标</th>
                        <th>数值</th>
                        <th>说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>活跃会员数</td>
                        <td>{overviewData.totalMembers}</td>
                        <td>当前状态为正常的会员总数</td>
                      </tr>
                      <tr>
                        <td>在职教练数</td>
                        <td>{overviewData.totalCoaches}</td>
                        <td>当前状态为在职的教练总数</td>
                      </tr>
                      <tr>
                        <td>平均到课率</td>
                        <td>{overviewData.avgAttendanceRate}%</td>
                        <td>签到人次 / 报名人次</td>
                      </tr>
                      <tr>
                        <td>平均满意度评分</td>
                        <td>{overviewData.avgSatisfaction} / 5</td>
                        <td>会员课程满意度平均分</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === 'course' && (
              <div>
                <div className="card" style={{ padding: 0, margin: 0, marginBottom: 16 }}>
                  <ReactECharts
                    option={getCourseChartOption()}
                    style={{ height: 350 }}
                    notMerge={true}
                  />
                </div>
                <div className="card" style={{ padding: 0, margin: 0, marginBottom: 16 }}>
                  <h3 style={{ padding: '16px 20px', margin: 0 }}>卡路里消耗分布</h3>
                  <ReactECharts
                    option={getCaloriesChartOption()}
                    style={{ height: 350 }}
                    notMerge={true}
                  />
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>课程名称</th>
                      <th>类型</th>
                      <th>排课数</th>
                      <th>报名人次</th>
                      <th>签到人次</th>
                      <th>到课率</th>
                      <th>平均满意度</th>
                      <th>消耗卡路里</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.course_name}</td>
                        <td>{item.course_type}</td>
                        <td>{item.schedule_count}</td>
                        <td>{item.total_enrollments}</td>
                        <td>{item.total_checkins}</td>
                        <td>{item.attendance_rate}%</td>
                        <td>{item.avg_satisfaction}</td>
                        <td>{item.total_calories} kcal</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'coach' && (
              <div>
                <div className="card" style={{ padding: 0, margin: 0, marginBottom: 16 }}>
                  <ReactECharts
                    option={getCoachChartOption()}
                    style={{ height: 350 }}
                    notMerge={true}
                  />
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>教练姓名</th>
                      <th>排课数</th>
                      <th>学员人次</th>
                      <th>平均满意度</th>
                      <th>消耗卡路里</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coachData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.coach_name}</td>
                        <td>{item.schedule_count}</td>
                        <td>{item.total_students}</td>
                        <td>{item.avg_satisfaction}</td>
                        <td>{item.total_calories} kcal</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tab === 'time' && (
              <div>
                <div className="card" style={{ padding: 0, margin: 0, marginBottom: 16 }}>
                  <ReactECharts
                    option={getTimeChartOption()}
                    style={{ height: 350 }}
                    notMerge={true}
                  />
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>时间段</th>
                      <th>课程数量</th>
                      <th>学员人次</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timeData.map((item, index) => (
                      <tr key={index}>
                        <td>{item.start_time}</td>
                        <td>{item.schedule_count}</td>
                        <td>{item.total_students}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Statistics
