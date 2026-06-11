import { FC, useEffect, useState } from 'react'
import { Course } from '../types'
import { api } from '../api'

interface CourseModalProps {
  course: Course | null
  onClose: () => void
  onSave: () => void
}

const CourseModal: FC<CourseModalProps> = ({ course, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    type: '有氧',
    duration: 60,
    capacity: 20,
    calories_per_hour: 300,
    difficulty: '中级',
    description: '',
    is_private: 0
  })

  useEffect(() => {
    if (course) {
      setFormData({ ...course })
    }
  }, [course])

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('请输入课程名称')
      return
    }

    try {
      const data = {
        ...formData,
        duration: Number(formData.duration),
        capacity: Number(formData.capacity),
        calories_per_hour: formData.calories_per_hour ? Number(formData.calories_per_hour) : undefined,
        is_private: Number(formData.is_private)
      }

      if (course) {
        await api.updateCourse(course.id, data)
      } else {
        await api.createCourse(data)
      }
      onSave()
    } catch (error) {
      console.error('Failed to save course:', error)
      alert('保存失败')
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{course ? '编辑课程' : '添加课程'}</span>
          <span className="modal-close" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-item">
              <label className="form-label">课程名称 *</label>
              <input
                className="form-input"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="请输入课程名称"
              />
            </div>
            <div className="form-item">
              <label className="form-label">课程类型</label>
              <select
                className="form-input"
                value={formData.type}
                onChange={e => handleChange('type', e.target.value)}
              >
                <option value="有氧">有氧</option>
                <option value="力量">力量</option>
                <option value="瑜伽">瑜伽</option>
                <option value="拉伸">拉伸</option>
                <option value="搏击">搏击</option>
                <option value="私教">私教</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label className="form-label">时长 (分钟)</label>
              <input
                type="number"
                className="form-input"
                value={formData.duration}
                onChange={e => handleChange('duration', e.target.value)}
              />
            </div>
            <div className="form-item">
              <label className="form-label">容量 (人)</label>
              <input
                type="number"
                className="form-input"
                value={formData.capacity}
                onChange={e => handleChange('capacity', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label className="form-label">消耗卡路里/小时</label>
              <input
                type="number"
                className="form-input"
                value={formData.calories_per_hour}
                onChange={e => handleChange('calories_per_hour', e.target.value)}
              />
            </div>
            <div className="form-item">
              <label className="form-label">难度等级</label>
              <select
                className="form-input"
                value={formData.difficulty}
                onChange={e => handleChange('difficulty', e.target.value)}
              >
                <option value="初级">初级</option>
                <option value="中级">中级</option>
                <option value="高级">高级</option>
                <option value="定制">定制</option>
              </select>
            </div>
          </div>

          <div className="form-item">
            <label className="form-label">是否私教</label>
            <select
              className="form-input"
              value={formData.is_private}
              onChange={e => handleChange('is_private', e.target.value)}
            >
              <option value={0}>否 (团课)</option>
              <option value={1}>是 (私教)</option>
            </select>
          </div>

          <div className="form-item">
            <label className="form-label">课程描述</label>
            <textarea
              className="form-input"
              rows={3}
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              placeholder="课程描述..."
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-default" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSubmit}>保存</button>
        </div>
      </div>
    </div>
  )
}

export default CourseModal
