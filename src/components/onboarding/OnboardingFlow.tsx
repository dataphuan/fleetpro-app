import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Zap, Loader2 } from 'lucide-react';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import './OnboardingFlow.css';

interface FormData {
  [key: string]: string | number;
}

export interface OnboardingFlowProps {
  tenantId: string;
  onComplete?: () => void;
}

const ONBOARDING_STEPS = [
  {
    id: 1,
    title: 'Thêm xe vận tải',
    description: 'Nhập thông tin chiếc xe đầu tiên của bạn',
    icon: '🚗',
    fields: [
      {
        key: 'plate_number',
        label: 'Biển số xe',
        type: 'text',
        placeholder: '29H-12345',
        required: true,
      },
      {
        key: 'vehicle_name',
        label: 'Tên xe',
        type: 'text',
        placeholder: 'Toyota Innova 7 chỗ',
        required: true,
      },
      {
        key: 'type',
        label: 'Loại xe',
        type: 'select',
        placeholder: 'Chọn loại xe',
        required: true,
        options: [
          { value: 'passenger_van', label: '🚐 Xe khách' },
          { value: 'truck', label: '🚛 Xe tải' },
          { value: 'pickup', label: '🚗 Xe bán tải' },
          { value: 'sedan', label: '🚙 Xe con' },
        ],
      },
      {
        key: 'year',
        label: 'Năm sản xuất',
        type: 'number',
        placeholder: '2023',
        required: true,
      },
    ],
    collection: 'vehicles',
  },
  {
    id: 2,
    title: 'Thêm tài xế',
    description: 'Nhập thông tin tài xế điều hành chuyến',
    icon: '👤',
    fields: [
      {
        key: 'full_name',
        label: 'Họ và tên',
        type: 'text',
        placeholder: 'Lê Văn A',
        required: true,
      },
      {
        key: 'phone',
        label: 'Số điện thoại',
        type: 'tel',
        placeholder: '0987654321',
        required: true,
      },
      {
        key: 'id_number',
        label: 'CMND/CCCD',
        type: 'text',
        placeholder: '123456789',
        required: true,
      },
      {
        key: 'license_type',
        label: 'Hạng bằng lái',
        type: 'select',
        placeholder: 'Chọn hạng bằng',
        required: true,
        options: [
          { value: 'B1', label: 'Hạng B1' },
          { value: 'B2', label: 'Hạng B2' },
          { value: 'C', label: 'Hạng C' },
          { value: 'D', label: 'Hạng D' },
        ],
      },
    ],
    collection: 'drivers',
  },
  {
    id: 3,
    title: 'Tạo chuyến đi',
    description: 'Tạo chuyến đi đầu tiên để kiểm tra hệ thống',
    icon: '🗺️',
    fields: [
      {
        key: 'from_location',
        label: 'Điểm đi',
        type: 'text',
        placeholder: 'Hà Nội',
        required: true,
      },
      {
        key: 'to_location',
        label: 'Điểm đến',
        type: 'text',
        placeholder: 'Hải Phòng',
        required: true,
      },
      {
        key: 'distance_km',
        label: 'Quãng đường (km)',
        type: 'number',
        placeholder: '120',
        required: true,
      },
      {
        key: 'fuel_cost',
        label: 'Chi phí nhiên liệu',
        type: 'number',
        placeholder: '500000',
        required: true,
      },
    ],
    collection: 'trips',
  },
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  tenantId,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCounts, setCreatedCounts] = useState({
    vehicles: 0,
    drivers: 0,
    trips: 0,
  });

  const step = ONBOARDING_STEPS[currentStep];

  const validateForm = (): boolean => {
    for (const field of step.fields) {
      if (field.required && !formData[field.key]) {
        setError(`Vui lòng nhập ${field.label}`);
        return false;
      }
    }
    return true;
  };

  const handleSaveData = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const collectionName = step.collection;
      const docData = {
        ...formData,
        tenant_id: tenantId,
        status: 'active',
        created_date: serverTimestamp(),
      };

      await addDoc(collection(db, collectionName), docData);

      setCreatedCounts(prev => ({
        ...prev,
        [collectionName]: prev[collectionName as keyof typeof prev] + 1,
      }));

      setFormData({});
      handleNext();
    } catch (err) {
      setError('Có lỗi khi lưu dữ liệu. Vui lòng thử lại.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setFormData({});
      setError(null);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: e.target.type === 'number' ? parseFloat(value) : value,
    }));
    setError(null);
  };

  const handleSkip = () => {
    setCompleted(true);
  };

  if (completed) {
    return (
      <div className="onboarding-modal">
        <div className="onboarding-success">
          <div className="success-container">
            <CheckCircle2 size={64} className="success-icon" />
            <h2>🎉 Chúc mừng!</h2>
            <p>Bạn đã hoàn thành hướng dẫn nhanh</p>

            <div className="success-summary">
              <div className="summary-item">
                <span>✅ Xe vận tải:</span>
                <span className="highlight">{createdCounts.vehicles} chiếc</span>
              </div>
              <div className="summary-item">
                <span>✅ Tài xế:</span>
                <span className="highlight">{createdCounts.drivers} người</span>
              </div>
              <div className="summary-item">
                <span>✅ Chuyến đi:</span>
                <span className="highlight">{createdCounts.trips} chuyến</span>
              </div>
            </div>

            <div className="success-actions">
              <button
                className="btn-primary"
                onClick={() => {
                  if (onComplete) onComplete();
                  window.location.href = '/dashboard';
                }}
              >
                🚀 Vào Bảng Điều Khiển
              </button>
              <button className="btn-secondary" onClick={() => window.location.href = '/help'}>
                📚 Xem Video Hướng Dẫn
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding-modal">
      <div className="onboarding-container">
        {/* Progress Bar */}
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%`,
            }}
          />
        </div>

        {/* Header */}
        <div className="onboarding-header">
          <span className="step-counter">
            Bước {currentStep + 1}/{ONBOARDING_STEPS.length}
          </span>
          <button className="close-btn" onClick={handleSkip}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="onboarding-content">
          <div className="step-icon">{step.icon}</div>
          <h2 className="step-title">{step.title}</h2>
          <p className="step-description">{step.description}</p>

          {error && <div className="error-message">{error}</div>}

          <form className="step-form" onSubmit={e => e.preventDefault()}>
            {step.fields.map(field => (
              <div key={field.key} className="form-group">
                <label htmlFor={field.key} className="form-label">
                  {field.label}
                  {field.required && <span className="required">*</span>}
                </label>
                {field.type === 'select' ? (
                  <select
                    id={field.key}
                    name={field.key}
                    className="form-input"
                    value={formData[field.key] || ''}
                    onChange={handleInputChange}
                    required={field.required}
                  >
                    <option value="">{field.placeholder}</option>
                    {field.options?.map(opt => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={field.key}
                    type={field.type}
                    name={field.key}
                    className="form-input"
                    placeholder={field.placeholder}
                    value={formData[field.key] || ''}
                    onChange={handleInputChange}
                    required={field.required}
                  />
                )}
              </div>
            ))}
          </form>

          <div className="tip-box">
            <Zap size={16} />
            <span>💡 Tip: Bạn có thể chỉnh sửa sau trong phần Cấu hình</span>
          </div>
        </div>

        {/* Actions */}
        <div className="onboarding-actions">
          <button
            className="btn-secondary"
            onClick={handlePrev}
            disabled={currentStep === 0 || loading}
          >
            <ChevronLeft size={16} /> Quay lại
          </button>
          <button
            className="btn-primary"
            onClick={handleSaveData}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="spin" /> Đang lưu...
              </>
            ) : currentStep === ONBOARDING_STEPS.length - 1 ? (
              <>
                Hoàn thành <CheckCircle2 size={16} />
              </>
            ) : (
              <>
                Tiếp theo <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
