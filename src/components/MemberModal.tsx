import { FC, useEffect, useState } from 'react'
import { Member } from '../types'
import { api } from '../api'

interface MemberModalProps {
  member: Member | null
  onClose: () => void
  onSave: () => void
}

const MemberModal: FC<MemberModalProps> = ({ member, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    gender: '男',
    phone: '',
    email: '',
    level: '普通',
    height: '',
    weight: '',
    body_fat: '',
    muscle_mass: '',
    preferences: '[]',
    status: 'active'
  })

  const [preferencesList, setPreferencesList] = useState<string[]>([])

  useEffect(() => {
    if (member) {
      setFormData({
        ...member,
        height: member.height || '',
        weight: member.weight || '',
        body_fat: member.body_fat || '',
        muscle_mass: member.muscle_mass || ''
      })
      try {
        setPreferencesList(JSON.parse(member.preferences || '[]'))
      } catch {
        setPreferencesList([])
      }
    }
  }, [member])

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const togglePreference = (pref: string) => {
    setPreferencesList(prev =>
      prev.includes(pref)
        ? prev.filter(p => p !== pref)
        : [...prev, pref]
    )
  }

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('请输入会员姓名')
      return
    }

    try {
      const data = {
        ...formData,
        height: formData.height ? Number(formData.height) : undefined,
        weight: formData.weight ? Number(formData.weight) : undefined,
        body_fat: formData.body_fat ? Number(formData.body_fat) : undefined,
        muscle_mass: formData.muscle_mass ? Number(formData.muscle_mass) : undefined,
        preferences: JSON.stringify(preferencesList),
        join_date: member?.join_date || new Date().toISOString().split('T')[0]
      }

      if (member) {
        await api.updateMember(member.id, data)
      } else {
        await api.createMember(data)
      }
      onSave()
    } catch (error) {
      console.error('Failed to save member:', error)
      alert('保存失败')
    }
  }

  const allPreferences = [
    '动感单车', '瑜伽', '力量训练', 'HIIT', '普拉提',
    '搏击操', '私教', '拉伸放松', '游泳', '跑步'
  ]

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{member ? '编辑会员' : '添加会员'}</span>
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
              <label className="form-label">邮箱</label>
              <input
                className="form-input"
                value={formData.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="请输入邮箱"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label className="form-label">会员等级</label>
              <select
                className="form-input"
                value={formData.level}
                onChange={e => handleChange('level', e.target.value)}
              >
                <option value="普通">普通会员</option>
                <option value="黄金">黄金会员</option>
                <option value="钻石">钻石会员</option>
                <option value="VIP">VIP会员</option>
              </select>
            </div>
            <div className="form-item">
              <label className="form-label">状态</label>
              <select
                className="form-input"
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
              >
                <option value="active">正常</option>
                <option value="inactive">停用</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 12, fontWeight: 500 }}>体测数据</div>
          <div className="form-row">
            <div className="form-item">
              <label className="form-label">身高 (cm)</label>
              <input
                type="number"
                className="form-input"
                value={formData.height}
                onChange={e => handleChange('height', e.target.value)}
                placeholder="身高"
              />
            </div>
            <div className="form-item">
              <label className="form-label">体重 (kg)</label>
              <input
                type="number"
                className="form-input"
                value={formData.weight}
                onChange={e => handleChange('weight', e.target.value)}
                placeholder="体重"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label className="form-label">体脂率 (%)</label>
              <input
                type="number"
                className="form-input"
                value={formData.body_fat}
                onChange={e => handleChange('body_fat', e.target.value)}
                placeholder="体脂率"
              />
            </div>
            <div className="form-item">
              <label className="form-label">肌肉量 (kg)</label>
              <input
                type="number"
                className="form-input"
                value={formData.muscle_mass}
                onChange={e => handleChange('muscle_mass', e.target.value)}
                placeholder="肌肉量"
              />
            </div>
          </div>

          <div className="form-item">
            <label className="form-label">运动偏好</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allPreferences.map(pref => (
                <button
                  key={pref}
                  type="button"
                  className={`btn btn-small ${preferencesList.includes(pref) ? 'btn-primary' : 'btn-default'}`}
                  onClick={() => togglePreference(pref)}
                >
                  {pref}
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

export default MemberModal
