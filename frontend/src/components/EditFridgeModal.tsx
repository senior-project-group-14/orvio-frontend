import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface EditFridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fridgeId: string;
  initialData?: {
    name: string;
    location: string;
    temperature?: string;
  };
  onSave: (data: { name: string; location: string; temperature?: string }) => Promise<void>;
}

export default function EditFridgeModal({ isOpen, onClose, fridgeId, initialData, onSave }: EditFridgeModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    location: initialData?.location || '',
    temperature: initialData?.temperature || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData({
        name: initialData.name,
        location: initialData.location,
        temperature: initialData.temperature || '',
      });
      setErrorMessage('');
    }
  }, [isOpen, initialData]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const isValid = formData.name.trim() && formData.location.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update fridge';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        animation: 'overlayFadeIn 200ms ease-out',
      }}
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="bg-white"
        style={{
          width: '480px',
          maxWidth: '90vw',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
          animation: 'modalSlideIn 250ms cubic-bezier(0.16, 1, 0.3, 1)',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '4px' }}>
              Edit Fridge
            </h3>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>{fridgeId}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="transition-colors hover:bg-gray-100"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: '#6B7280',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#1A1C1E',
                  marginBottom: '8px',
                }}
              >
                Fridge Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
                placeholder="Enter fridge name"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#1A1C1E',
                  marginBottom: '8px',
                }}
              >
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
                placeholder="Enter location"
                required
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#1A1C1E',
                  marginBottom: '8px',
                }}
              >
                Temperature (°C)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                className="w-full outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                }}
                placeholder="4.0"
              />
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', fontStyle: 'italic' }}>
                Optional field
              </p>
            </div>

            {errorMessage ? (
              <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '12px' }}>{errorMessage}</p>
            ) : null}
          </div>

          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '12px',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="transition-all hover:bg-gray-100"
              style={{
                height: '40px',
                padding: '0 20px',
                backgroundColor: 'transparent',
                color: '#6B7280',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid #D1D5DB',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="transition-all"
              style={{
                height: '40px',
                padding: '0 20px',
                backgroundColor: isValid && !isSubmitting ? '#2563EB' : '#D1D5DB',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                cursor: isValid && !isSubmitting ? 'pointer' : 'not-allowed',
                opacity: isValid && !isSubmitting ? 1 : 0.6,
              }}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes overlayFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}