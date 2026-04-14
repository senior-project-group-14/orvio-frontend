import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { getSysadminAdmins, getSysadminAssignments, SysadminAdmin } from '../api/client';

interface EditFridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  fridgeId: string;
  initialData?: {
    name: string;
    location: string;
    temperature?: string;
  };
  onSave: (data: { name: string; location: string; temperature?: string; assignedAdminIds: string[] }) => Promise<void>;
}

export default function EditFridgeModal({ isOpen, onClose, fridgeId, initialData, onSave }: EditFridgeModalProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    location: initialData?.location || '',
    temperature: initialData?.temperature || '',
  });
  const [admins, setAdmins] = useState<SysadminAdmin[]>([]);
  const [selectedAdminIds, setSelectedAdminIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const loadData = async () => {
      setIsLoadingAdmins(true);
      try {
        const adminsResponse = await getSysadminAdmins({ limit: 100 });
        if (isMounted) setAdmins(adminsResponse.data);

        const assignmentsResponse = await getSysadminAssignments({ limit: 100 });
        const deviceAssignments = assignmentsResponse.data.filter(
          (a) => a.device_id === fridgeId && a.is_active
        );
        if (isMounted) setSelectedAdminIds(deviceAssignments.map((a) => a.admin_user_id));
      } catch (error) {
        console.error('Failed to load admins or assignments', error);
        if (isMounted) {
          setAdmins([]);
          setSelectedAdminIds([]);
        }
      } finally {
        if (isMounted) setIsLoadingAdmins(false);
      }
    };

    setErrorMessage('');
    setAdminSearchQuery('');
    if (initialData) {
      setFormData({
        name: initialData.name,
        location: initialData.location,
        temperature: initialData.temperature || '',
      });
    }
    void loadData();

    return () => {
      isMounted = false;
    };
  }, [fridgeId, initialData, isOpen]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isSubmitting, onClose]);

  const filteredAdmins = useMemo(() => {
    const query = adminSearchQuery.toLowerCase().trim();
    const base = !query
      ? admins
      : admins.filter((admin) =>
          `${admin.first_name} ${admin.last_name} ${admin.email}`
            .toLowerCase()
            .includes(query)
        );

    return [...base].sort((a, b) => {
      const aSelected = selectedAdminIds.includes(a.user_id);
      const bSelected = selectedAdminIds.includes(b.user_id);
      if (aSelected === bSelected) return 0;
      return aSelected ? -1 : 1;
    });
  }, [admins, adminSearchQuery, selectedAdminIds]);

  const isValid = Boolean(formData.name.trim() && formData.location.trim());

  const handleAdminToggle = (adminId: string) => {
    setSelectedAdminIds((prev) =>
      prev.includes(adminId) ? prev.filter((id) => id !== adminId) : [...prev, adminId]
    );
  };

  const handleSelectAllAdmins = () => {
    setSelectedAdminIds(admins.map((admin) => admin.user_id));
  };

  const handleClearAdmins = () => {
    setSelectedAdminIds([]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await onSave({
        ...formData,
        assignedAdminIds: selectedAdminIds,
      });
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update fridge';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)', animation: 'overlayFadeIn 200ms ease-out' }}
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
        onClick={(event) => event.stopPropagation()}
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
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '4px' }}>Edit Fridge</h3>
            <p style={{ fontSize: '14px', color: '#6B7280' }}>{fridgeId}</p>
          </div>
          <button
            type="button"
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
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1A1C1E', marginBottom: '8px' }}>Fridge Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                className="w-full outline-none transition-all focus:ring-2 focus:ring-blue-500"
                style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                placeholder="Enter fridge name"
                required
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1A1C1E', marginBottom: '8px' }}>Location *</label>
              <input
                type="text"
                value={formData.location}
                onChange={(event) => setFormData({ ...formData, location: event.target.value })}
                className="w-full outline-none transition-all focus:ring-2 focus:ring-blue-500"
                style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                placeholder="Enter location"
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#1A1C1E', marginBottom: '8px' }}>Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                value={formData.temperature}
                onChange={(event) => setFormData({ ...formData, temperature: event.target.value })}
                className="w-full outline-none transition-all focus:ring-2 focus:ring-blue-500"
                style={{ height: '40px', padding: '0 12px', borderRadius: '8px', border: '1px solid #D1D5DB', fontSize: '14px' }}
                placeholder="4.0"
              />
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px', fontStyle: 'italic' }}>Optional field</p>
            </div>

            <div style={{ marginTop: '24px', marginBottom: '20px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1C1E' }}>Admin Assignment</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllAdmins}
                    className="transition-colors hover:bg-gray-100"
                    style={{ fontSize: '12px', color: '#2563EB', padding: '4px 8px', borderRadius: '4px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAdmins}
                    className="transition-colors hover:bg-gray-100"
                    style={{ fontSize: '12px', color: '#6B7280', padding: '4px 8px', borderRadius: '4px', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Selected: {selectedAdminIds.length} of {admins.length}</p>

              <div className="relative" style={{ marginBottom: '8px' }}>
                <Search
                  size={16}
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }}
                />
                <input
                  type="text"
                  placeholder="Search admins..."
                  value={adminSearchQuery}
                  onChange={(event) => setAdminSearchQuery(event.target.value)}
                  className="w-full outline-none transition-all focus:ring-2 focus:ring-blue-500"
                  style={{ height: '36px', paddingLeft: '34px', paddingRight: '10px', borderRadius: '6px', border: '1px solid #D1D5DB', fontSize: '13px' }}
                />
              </div>

              {isLoadingAdmins ? (
                <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center', padding: '12px' }}>Loading admins...</p>
              ) : (
                <div className="border rounded-lg p-3" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #D1D5DB' }}>
                  {filteredAdmins.map((admin) => (
                    <label key={admin.user_id} className="mb-2 flex cursor-pointer items-center gap-2 last:mb-0">
                      <input
                        type="checkbox"
                        checked={selectedAdminIds.includes(admin.user_id)}
                        onChange={() => handleAdminToggle(admin.user_id)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '14px', color: '#1A1C1E' }}>
                        {[admin.first_name, admin.last_name].filter(Boolean).join(' ') || admin.email}
                      </span>
                    </label>
                  ))}
                  {filteredAdmins.length === 0 && <p style={{ fontSize: '13px', color: '#6B7280' }}>No admin found for this search.</p>}
                </div>
              )}
            </div>

            {errorMessage ? <p style={{ color: '#DC2626', fontSize: '13px', marginTop: '12px' }}>{errorMessage}</p> : null}
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