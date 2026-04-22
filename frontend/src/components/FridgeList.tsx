import { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Search, Plus, AlertTriangle } from 'lucide-react';
import FridgeListTable, { FridgeData } from './FridgeListTable';
import { ExportButton } from './ui/export-button';
import { TableSkeleton } from './ui/table-skeleton';
import { deleteSysadminDevice, getAdminDevices, updateSysadminDevice, getSysadminAssignments, createSysadminAssignment, updateSysadminAssignment } from '../api/client';
import { formatRelativeTime } from '../utils/time';
import { exportData } from '../utils/export';
import AddFridgeModal from './AddFridgeModal';
import EditFridgeModal from './EditFridgeModal';

interface FridgeListProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onViewFridge: (fridgeId: string) => void;
}

const normalizeStatus = (status?: string | null): 'online' | 'offline' => {
  if (!status) return 'offline';
  const normalized = status.toLowerCase();
  return normalized.includes('online') || normalized.includes('active') ? 'online' : 'offline';
};

export default function FridgeList({ onLogout, onNavigate, onViewFridge }: FridgeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fridges, setFridges] = useState<FridgeData[]>([]);
  const [showAddFridgeModal, setShowAddFridgeModal] = useState(false);
  const [showEditFridgeModal, setShowEditFridgeModal] = useState(false);
  const [editingFridge, setEditingFridge] = useState<FridgeData | null>(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deletingFridge, setDeletingFridge] = useState<FridgeData | null>(null);
  const [isDeletingFridge, setIsDeletingFridge] = useState(false);

  const loadFridges = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await getAdminDevices({ limit: 100 });
      const devices = response.data;
      const mapped = devices.map((device) => ({
        id: device.device_id,
        name: device.name || 'Unnamed fridge',
        location: device.location_description || 'Unknown location',
        status: normalizeStatus(device.status),
        door: device.door_status ? ('open' as const) : ('closed' as const),
        lastActive: formatRelativeTime(device.last_checkin_time || null),
        temperature:
          device.default_temperature !== undefined && device.default_temperature !== null
            ? String(device.default_temperature)
            : undefined,
      }));
      setFridges(mapped);
    } catch (error) {
      console.error('Failed to load devices', error);
      setFridges([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFridges();
  }, [loadFridges]);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('');
    setLocationFilter('');
  }, []);

  const handleExport = useCallback(async (format: 'csv' | 'png' | 'pdf') => {
    const data = fridges.map(f => ({
      Name: f.name,
      Location: f.location,
      Status: f.status,
      Door: f.door,
      'Last Active': f.lastActive
    }));

    if (format === 'csv') {
      await exportData(format, data, { filename: 'fridge-list' });
    } else {
      await exportData(format, 'fridge-list-table', {
        filename: 'fridge-list',
        title: 'Fridge List'
      });
    }
  }, [fridges]);

  const handleOpenEdit = useCallback((fridgeId: string) => {
    const fridge = fridges.find((item) => item.id === fridgeId) || null;
    setEditingFridge(fridge);
    setShowEditFridgeModal(Boolean(fridge));
  }, [fridges]);

  const handleSaveEdit = useCallback(async (data: { name: string; location: string; temperature?: string; assignedAdminIds: string[] }) => {
    if (!editingFridge) return;

    const parsedTemperature = data.temperature?.trim() ? Number(data.temperature) : undefined;

    // Update device basic info
    await updateSysadminDevice(editingFridge.id, {
      name: data.name.trim(),
      location_description: data.location.trim(),
      default_temperature:
        parsedTemperature !== undefined && Number.isFinite(parsedTemperature)
          ? parsedTemperature
          : undefined,
    });

    // Handle admin assignments
    try {
      // Get current active assignments for this device
      const assignmentsResponse = await getSysadminAssignments({ limit: 100 });
      const currentAssignments = assignmentsResponse.data.filter(
        (a) => a.device_id === editingFridge.id && a.is_active
      );
      const currentAdminIds = currentAssignments.map((a) => a.admin_user_id);

      // Deactivate assignments for admins that are no longer selected
      for (const assignment of currentAssignments) {
        if (!data.assignedAdminIds.includes(assignment.admin_user_id)) {
          await updateSysadminAssignment(assignment.assignment_id, { is_active: false });
        }
      }

      // Create new assignments for admins that are not currently assigned
      for (const adminId of data.assignedAdminIds) {
        if (!currentAdminIds.includes(adminId)) {
          await createSysadminAssignment({
            device_id: editingFridge.id,
            admin_user_id: adminId,
          });
        }
      }
    } catch (error) {
      console.error('Failed to update admin assignments', error);
      // Don't throw error - device was already updated, just log assignment errors
    }

    await loadFridges();
  }, [editingFridge, loadFridges]);

  const handleOpenDeleteConfirm = useCallback((fridgeId: string) => {
    const fridge = fridges.find((item) => item.id === fridgeId) || null;
    setDeletingFridge(fridge);
    setShowDeleteConfirmModal(Boolean(fridge));
  }, [fridges]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingFridge) return;

    setIsDeletingFridge(true);
    try {
      await deleteSysadminDevice(deletingFridge.id);
      setShowDeleteConfirmModal(false);
      setDeletingFridge(null);
      await loadFridges();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete fridge';
      alert(message);
    } finally {
      setIsDeletingFridge(false);
    }
  }, [deletingFridge, loadFridges]);

  const editInitialData = useMemo(
    () =>
      editingFridge
        ? {
            name: editingFridge.name,
            location: editingFridge.location,
            temperature: editingFridge.temperature,
          }
        : undefined,
    [editingFridge],
  );

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      {/* Sidebar */}
      <Sidebar activePage="Fridges" onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <Topbar onLogout={onLogout} pageTitle="Fridges" />

        {/* Content */}
        <main style={{ padding: '24px' }}>
          {/* Page Header - Filters + Actions */}
          <div className="flex items-center justify-between" style={{ marginBottom: '24px' }}>
            {/* Left Side: Filters */}
            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search 
                  size={18} 
                  style={{ 
                    position: 'absolute', 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    color: '#9CA3AF'
                  }} 
                />
                <input
                  type="text"
                  placeholder="Search fridge by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  style={{
                    width: '300px',
                    height: '40px',
                    paddingLeft: '40px',
                    paddingRight: '12px',
                    borderRadius: '8px',
                    border: '1px solid #D1D5DB',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Status Dropdown */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{
                  width: '160px',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: statusFilter ? '#1A1C1E' : '#9CA3AF',
                  cursor: 'pointer'
                }}
              >
                <option value="">Status</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
                <option value="has-alerts">Has Alerts</option>
              </select>

              {/* Location Dropdown */}
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                style={{
                  width: '200px',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  color: locationFilter ? '#1A1C1E' : '#9CA3AF',
                  cursor: 'pointer'
                }}
              >
                <option value="">Location</option>
                <option value="building-a">Building A</option>
                <option value="building-b">Building B</option>
                <option value="building-c">Building C</option>
                <option value="building-d">Building D</option>
              </select>
            </div>

            {/* Right Side: Actions */}
            <div className="flex items-center gap-4">
              <ExportButton onExport={handleExport} />
              <button
                className="flex items-center gap-2 transition-colors hover:bg-blue-700"
                style={{
                  height: '40px',
                  padding: '0 16px',
                  backgroundColor: '#2563EB',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600,
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer'
                }}
                onClick={() => setShowAddFridgeModal(true)}
              >
                <Plus size={18} />
                Add Fridge
              </button>
            </div>
          </div>

          <div id="fridge-list-table">
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <FridgeListTable 
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                locationFilter={locationFilter}
                onClearFilters={handleClearFilters}
                onViewFridge={onViewFridge}
                onEditFridge={handleOpenEdit}
                onDeleteFridge={handleOpenDeleteConfirm}
                fridges={fridges}
              />
            )}
          </div>

          {/* Footer */}
          <div className="text-center" style={{ marginTop: '32px' }}>
            <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
              © 2025 Smart Fridge System
            </p>
          </div>
        </main>
      </div>

      <AddFridgeModal
        isOpen={showAddFridgeModal}
        onClose={() => setShowAddFridgeModal(false)}
        onCreated={loadFridges}
      />

      <EditFridgeModal
        isOpen={showEditFridgeModal && Boolean(editingFridge)}
        onClose={() => {
          setShowEditFridgeModal(false);
          setEditingFridge(null);
        }}
        fridgeId={editingFridge?.id || ''}
        initialData={editInitialData}
        onSave={handleSaveEdit}
      />

      {showDeleteConfirmModal && deletingFridge && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            animation: 'overlayFadeIn 200ms ease-out',
          }}
          onClick={() => {
            if (isDeletingFridge) return;
            setShowDeleteConfirmModal(false);
            setDeletingFridge(null);
          }}
        >
          <div
            className="bg-white"
            style={{
              width: '440px',
              maxWidth: '90vw',
              borderRadius: '12px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
              animation: 'modalSlideIn 250ms cubic-bezier(0.16, 1, 0.3, 1)',
              overflow: 'hidden',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {/* Content Area */}
            <div style={{ padding: '24px 24px 0 24px' }}>
              {/* Warning Icon */}
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '28px',
                  backgroundColor: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <AlertTriangle size={28} style={{ color: '#dc2626' }} />
              </div>

              {/* Heading */}
              <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1A1C1E', margin: 0, marginBottom: '8px' }}>
                Delete Fridge?
              </h2>

              {/* Main Message */}
              <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, marginBottom: '8px', lineHeight: '1.6' }}>
                You are about to delete <strong style={{ color: '#1A1C1E', fontWeight: 600 }}>{deletingFridge.name}</strong> ({deletingFridge.id}).
              </p>

              {/* Warning Text */}
              <p style={{ fontSize: '14px', color: '#dc2626', margin: 0, marginBottom: '24px', fontWeight: 500 }}>
                This action cannot be undone.
              </p>
            </div>

            {/* Button Area */}
            <div
              style={{
                padding: '0 24px 24px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '12px',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setDeletingFridge(null);
                }}
                disabled={isDeletingFridge}
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
                  cursor: isDeletingFridge ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirmDelete();
                }}
                disabled={isDeletingFridge}
                className="transition-all hover:bg-red-700"
                style={{
                  height: '40px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: isDeletingFridge ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeletingFridge ? 'Deleting...' : 'Delete Fridge'}
              </button>
            </div>
          </div>
        </div>
      )}

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