import { FC, useEffect, useState } from 'react'
import { Coach } from '../types'
import { api } from '../api'

interface CoachModalProps {
  coach: Coach | null
  onClose: () => void
  onSave: () => void
}

const CoachModal: FC<CoachModalProps> = ({ coach, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    gender: '男',
    phone: '',
    certification: '',
    experience_years: '',
    max_daily_classes: 6,
    status: 'active'
  })

  const [specialties, setSpecialties] = useState<string[]>([])

  const allSpecialties = [
    '动感单车', '瑜伽', '力量训练', 'HIIT', '普拉提',
    '搏击操', '私教', '拉伸放松', '游泳', '跑步', '体测'
  ]

  useEffect(() => {
    if (coach) {
      setFormData({
        ...coach,
        experience_years: coach.experience_years || ''
      })
      try {
        setSpecialties(JSON.parse(coach.specialties || '[]'))
      } catch {
        setSpecialties([])
      }
    }
  }, [coach])

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const toggleSpecialty = (specialty: string) => {
    setSpecialties(prev =>
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    )
  }

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('请输入教练姓名')
      return
    }

    try {
      const data = {
        ...formData,
        experience_years: formData.experience_years ? Number(formData.experience_years) : undefined,
        max_daily_classes: Number(formData.max_daily_classes),
        specialties: JSON.stringify(specialties)
      }

      if (coach) {
        await api.updateCoach(coach.id, data)
      } else {
        await api.createCoach(data)
      }
      onSave()
    } catch (error) {
      console.error('Failed to save coach:', error)
      alert('保存失败')
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{coach ? '编辑教练' : '添加教练'}</span>
          <span className="modal-close" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-item">
              <label className="form-label">姓名 *</label>
              <input
                className="form-input"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="请输入姓名"
              />
            </div>
            <div className="form-item">
              <label className="form-label">性别</label>
              <select
                className="form-input"
                value={formData.gender}
                onChange={e => handleChange('gender', e.target.value)}
              >
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label className="form-label">手机号</label>
              <input
                className="form-input"
                value={formData.phone}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="请输入手机号"
              />
            </div>
            <div className="form-item">
              <label className="form-label">资质认证</label>
              <input
                className="form-input"
                value={formData.certification}
                onChange={e => handleChange('certification', e.target.value)}
                placeholder="如：ACE认证"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label className="form-label">教龄 (年)</label>
              <input
                type="number"
                className="form-input"
                value={formData.experience_years}
                onChange={e => handleChange('experience_years', e.target.value)}
                placeholder="教龄"
              />
            </div>
            <div className="form-item">
              <label className="form-label">每日最大课数</label>
              <input
                type="number"
                className="form-input"
                value={formData.max_daily_classes}
                onChange={e => handleChange('max_daily_classes', e.target.value)}
                min={1}
                max={12}
              />
            </div>
          </div>

          <div className="form-item">
            <label className="form-label">状态</label>
            <select
              className="form-input"
              value={formData.status}
              onChange={e => handleChange('status', e.target.value)}
            >
              <option value="active">在职</option>
              <option value="inactive">离职</option>
            </select>
          </div>

          <div className="form-item">
            <label className="form-label">专长课程</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allSpecialties.map(s => (
                <button
                  key={s}
                  type="button"
                  className={`btn btn-small ${specialties.includes(s) ? 'btn-primary' : 'btn-default'}`}
                  onClick={() => toggleSpecialty(s)}
                >
                  {s}
                </button>
              ))}
            </div>
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

export default CoachModal
