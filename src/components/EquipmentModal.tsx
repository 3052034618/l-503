import { FC, useEffect, useState } from 'react'
import { Equipment, Zone } from '../types'
import { api } from '../api'

interface EquipmentModalProps {
  equipment: Equipment | null
  onClose: () => void
  onSave: () => void
}

const EquipmentModal: FC<EquipmentModalProps> = ({ equipment, onClose, onSave }) => {
  const [formData, setFormData] = useState<any>({
    name: '',
    type: '有氧',
    brand: '',
    model: '',
    zone_id: '',
    max_usage_count: 2000,
    current_usage_count: 0,
    status: 'normal'
  })
  const [zones, setZones] = useState<Zone[]>([])

  useEffect(() => {
    loadZones()
    if (equipment) {
      setFormData({
        ...equipment
      })
    }
  }, [equipment])

  const loadZones = async () => {
    try {
      const data = await api.getZones()
      setZones(data as unknown as Zone[])
    } catch (error) {
      console.error('Failed to load zones:', error)
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!formData.name) {
      alert('请输入设备名称')
      return
    }

    try {
      const data = {
        ...formData,
        max_usage_count: Number(formData.max_usage_count),
        current_usage_count: Number(formData.current_usage_count)
      }

      if (equipment) {
        await api.updateEquipment(equipment.id, data)
      } else {
        await api.createEquipment(data)
      }
      onSave()
    } catch (error) {
      console.error('Failed to save equipment:', error)
      alert('保存失败')
    }
  }

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span>{equipment ? '编辑设备' : '添加设备'}</span>
          <span className="modal-close" onClick={onClose}>✕</span>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-item">
              <label className="form-label">设备名称 *</label>
              <input
                className="form-input"
                value={formData.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="请输入设备名称"
              />
            </div>
            <div className="form-item">
              <label className="form-label">设备类型</label>
              <select
                className="form-input"
                value={formData.type}
                onChange={e => handleChange('type', e.target.value)}
              >
                <option value="有氧">有氧设备</option>
                <option value="力量">力量设备</option>
                <option value="瑜伽">瑜伽设备</option>
                <option value="私教">私教设备</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label className="form-label">品牌</label>
              <input
                className="form-input"
                value={formData.brand}
                onChange={e => handleChange('brand', e.target.value)}
                placeholder="品牌"
              />
            </div>
            <div className="form-item">
              <label className="form-label">型号</label>
              <input
                className="form-input"
                value={formData.model}
                onChange={e => handleChange('model', e.target.value)}
                placeholder="型号"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label className="form-label">所属区域</label>
              <select
                className="form-input"
                value={formData.zone_id}
                onChange={e => handleChange('zone_id', e.target.value)}
              >
                <option value="">请选择区域</option>
                {zones.map(zone => (
                  <option key={zone.id} value={zone.id}>{zone.name}</option>
                ))}
              </select>
            </div>
            <div className="form-item">
              <label className="form-label">状态</label>
              <select
                className="form-input"
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
              >
                <option value="normal">正常</option>
                <option value="maintenance_required">需维保</option>
                <option value="maintenance_in_progress">维保中</option>
                <option value="broken">故障</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-item">
              <label className="form-label">额定使用次数</label>
              <input
                type="number"
                className="form-input"
                value={formData.max_usage_count}
                onChange={e => handleChange('max_usage_count', e.target.value)}
              />
            </div>
            <div className="form-item">
              <label className="form-label">当前使用次数</label>
              <input
                type="number"
                className="form-input"
                value={formData.current_usage_count}
                onChange={e => handleChange('current_usage_count', e.target.value)}
              />
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

export default EquipmentModal
