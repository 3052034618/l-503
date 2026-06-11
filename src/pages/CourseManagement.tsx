import { useEffect, useState } from 'react'
import { api } from '../api'
import { Course } from '../types'
import CourseModal from '../components/CourseModal'

const CourseManagement = () => {
  const [courses, setCourses] = useState<Course[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [type, setType] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCourse, setEditingCourse] = useState<Course | null>(null)

  useEffect(() => {
    loadCourses()
  }, [page, keyword, type])

  const loadCourses = async () => {
    try {
      setLoading(true)
      const result = await api.getCourses({
        page,
        pageSize,
        keyword: keyword || undefined,
        type: type || undefined
      })
      setCourses(result.list)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load courses:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setEditingCourse(null)
    setModalVisible(true)
  }

  const handleEdit = (course: Course) => {
    setEditingCourse(course)
    setModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除该课程吗？')) return
    try {
      await api.deleteCourse(id)
      loadCourses()
    } catch (error) {
      console.error('Failed to delete course:', error)
    }
  }

  const handleSave = () => {
    setModalVisible(false)
    loadCourses()
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '初级': return 'tag-green'
      case '中级': return 'tag-blue'
      case '高级': return 'tag-red'
      case '定制': return 'tag-purple'
      default: return 'tag-default'
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">课程管理</h2>
        <button className="btn btn-primary" onClick={handleAdd}>
          + 添加课程
        </button>
      </div>

      <div className="card">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="搜索课程名称"
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
            <option value="有氧">有氧</option>
            <option value="力量">力量</option>
            <option value="瑜伽">瑜伽</option>
            <option value="拉伸">拉伸</option>
            <option value="私教">私教</option>
          </select>
          <button className="btn btn-default" onClick={() => {
            setKeyword('')
            setType('')
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
                  <th>课程名称</th>
                  <th>类型</th>
                  <th>时长</th>
                  <th>容量</th>
                  <th>消耗卡路里/小时</th>
                  <th>难度</th>
                  <th>是否私教</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {courses.map(course => (
                  <tr key={course.id}>
                    <td>{course.name}</td>
                    <td>
                      <span className="tag tag-blue">{course.type}</span>
                    </td>
                    <td>{course.duration}分钟</td>
                    <td>{course.capacity}人</td>
                    <td>{course.calories_per_hour || '-'}</td>
                    <td>
                      <span className={`tag ${getDifficultyColor(course.difficulty || '')}`}>
                        {course.difficulty || '-'}
                      </span>
                    </td>
                    <td>
                      <span className={`tag ${course.is_private ? 'tag-purple' : 'tag-default'}`}>
                        {course.is_private ? '是' : '否'}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="btn btn-small btn-default" onClick={() => handleEdit(course)}>
                          编辑
                        </button>
                        <button className="btn btn-small btn-danger" onClick={() => handleDelete(course.id)}>
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
        <CourseModal
          course={editingCourse}
          onClose={() => setModalVisible(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export default CourseManagement
