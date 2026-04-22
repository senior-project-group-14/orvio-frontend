import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { MoreVertical, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface FridgeData {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline';
  door: 'open' | 'closed';
  lastActive: string;
  temperature?: string;
}

interface FridgeListTableProps {
  searchQuery: string;
  statusFilter: string;
  locationFilter: string;
  onClearFilters: () => void;
  onViewFridge: (fridgeId: string) => void;
  onEditFridge: (fridgeId: string) => void;
  onDeleteFridge: (fridgeId: string) => void;
  fridges: FridgeData[];
}

function FridgeListTable({ 
  searchQuery, 
  statusFilter, 
  locationFilter,
  onClearFilters,
  onViewFridge,
  onEditFridge,
  onDeleteFridge,
  fridges,
}: FridgeListTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openActionMenuFor, setOpenActionMenuFor] = useState<string | null>(null);
  const [actionMenuPosition, setActionMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const clickedTrigger = event.target.closest('[data-fridge-actions-trigger="true"]');
      if (clickedTrigger) return;
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setOpenActionMenuFor(null);
        setActionMenuPosition(null);
      }
    };

    const closeMenuOnViewportChange = () => {
      setOpenActionMenuFor(null);
      setActionMenuPosition(null);
    };

    document.addEventListener('mousedown', handleDocumentClick);
    window.addEventListener('resize', closeMenuOnViewportChange);
    window.addEventListener('scroll', closeMenuOnViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      window.removeEventListener('resize', closeMenuOnViewportChange);
      window.removeEventListener('scroll', closeMenuOnViewportChange, true);
    };
  }, []);

  const openActionMenu = (fridgeId: string, target: HTMLButtonElement) => {
    const menuWidth = 168;
    const menuHeight = 96;
    const margin = 8;
    const rect = target.getBoundingClientRect();

    const left = Math.min(
      window.innerWidth - menuWidth - margin,
      Math.max(margin, rect.right - menuWidth)
    );

    const hasEnoughSpaceBelow = window.innerHeight - rect.bottom > menuHeight + margin;
    const top = hasEnoughSpaceBelow ? rect.bottom + margin : rect.top - menuHeight - margin;

    setOpenActionMenuFor(fridgeId);
    setActionMenuPosition({ top: Math.max(margin, top), left });
  };

  // Filter fridges
  const filteredFridges = useMemo(() => {
    const normalizedSearch = searchQuery.toLowerCase();
    const normalizedLocation = locationFilter.replace('-', ' ');

    return fridges.filter((fridge) => {
      const matchesSearch = fridge.name.toLowerCase().includes(normalizedSearch);
      const matchesStatus = !statusFilter || fridge.status === statusFilter;
      const matchesLocation = !locationFilter || fridge.location.toLowerCase().includes(normalizedLocation);

      return matchesSearch && matchesStatus && matchesLocation;
    });
  }, [fridges, searchQuery, statusFilter, locationFilter]);

  // Pagination
  const totalPages = useMemo(() => Math.ceil(filteredFridges.length / rowsPerPage), [filteredFridges.length, rowsPerPage]);
  const startIndex = useMemo(() => (currentPage - 1) * rowsPerPage, [currentPage, rowsPerPage]);
  const currentFridges = useMemo(
    () => filteredFridges.slice(startIndex, startIndex + rowsPerPage),
    [filteredFridges, startIndex, rowsPerPage],
  );
  const pageNumbers = useMemo(
    () =>
      Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
        if (totalPages <= 5) return i + 1;
        if (currentPage <= 3) return i + 1;
        if (currentPage >= totalPages - 2) return totalPages - 4 + i;
        return currentPage - 2 + i;
      }),
    [currentPage, totalPages],
  );

  const getStatusColor = (status: string) => {
    return status === 'online' ? '#10B981' : '#9CA3AF';
  };

  const getDoorColor = (door: string) => {
    return door === 'open' ? '#F59E0B' : '#10B981';
  };

  // Empty state
  if (filteredFridges.length === 0) {
    return (
      <div 
        className="bg-white flex flex-col items-center justify-center"
        style={{
          minHeight: '400px',
          borderRadius: '12px',
          boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
          padding: '40px'
        }}
      >
        {/* Icon */}
        <div 
          className="flex items-center justify-center rounded-full"
          style={{
            width: '70px',
            height: '70px',
            backgroundColor: '#F3F4F6',
            marginBottom: '16px'
          }}
        >
          <svg width="35" height="35" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E', marginBottom: '8px' }}>
          No fridges found
        </h3>
        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '24px' }}>
          Try adjusting your filters
        </p>
        <button
          onClick={onClearFilters}
          className="transition-colors hover:bg-blue-700"
          style={{
            height: '40px',
            padding: '0 20px',
            backgroundColor: '#2563EB',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          Clear Filters
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Table Container */}
      <div 
        className="bg-white"
        style={{
          borderRadius: '12px',
          boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
          padding: '20px',
          overflow: 'auto'
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                Name
              </th>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                Location
              </th>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                Status
              </th>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                Door
              </th>
              <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                Last Active
              </th>
              <th data-export-hide style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {currentFridges.map((fridge, index) => (
              <tr
                key={fridge.id}
                className="transition-colors"
                style={{
                  borderBottom: index < currentFridges.length - 1 ? '1px solid #F3F4F6' : 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td style={{ padding: '16px 8px', fontSize: '14px', color: '#1A1C1E' }}>
                  {fridge.name}
                </td>
                <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6B7280' }}>
                  {fridge.location}
                </td>
                <td style={{ padding: '16px 8px' }}>
                  <div className="flex items-center gap-2">
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getStatusColor(fridge.status)
                      }}
                    />
                    <span style={{ fontSize: '14px', color: '#1A1C1E', textTransform: 'capitalize' }}>
                      {fridge.status}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '16px 8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: getDoorColor(fridge.door),
                      backgroundColor: `${getDoorColor(fridge.door)}15`,
                      textTransform: 'capitalize'
                    }}
                  >
                    {fridge.door}
                  </span>
                </td>
                <td style={{ padding: '16px 8px', fontSize: '14px', color: '#9CA3AF' }}>
                  {fridge.lastActive}
                </td>
                <td data-export-hide style={{ padding: '16px 8px' }}>
                  <div className="flex items-center justify-center gap-2" style={{ position: 'relative' }}>
                    <button
                      className="transition-colors hover:underline"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563EB',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                      onClick={() => onViewFridge(fridge.id)}
                    >
                      View
                    </button>
                    <button
                      data-fridge-actions-trigger="true"
                      className="transition-colors hover:bg-gray-100 rounded p-1"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#6B7280',
                        cursor: 'pointer'
                      }}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (openActionMenuFor === fridge.id) {
                          setOpenActionMenuFor(null);
                          setActionMenuPosition(null);
                          return;
                        }
                        openActionMenu(fridge.id, event.currentTarget);
                      }}
                      aria-label={`Actions for ${fridge.name}`}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div data-export-hide className="flex items-center justify-center gap-6" style={{ marginTop: '20px' }}>
        {/* Rows per page */}
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '14px', color: '#6B7280' }}>Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="outline-none"
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        {/* Page Numbers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={18} />
          </button>

          {pageNumbers.map((pageNum) => {
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className="transition-colors hover:bg-gray-100"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isActive ? '#EFF6FF' : 'transparent',
                  color: isActive ? '#2563EB' : '#6B7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer'
            }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Page info */}
        <span style={{ fontSize: '14px', color: '#6B7280' }}>
          Page {currentPage} of {totalPages}
        </span>
      </div>

      {openActionMenuFor && actionMenuPosition && createPortal(
        <div
          ref={actionMenuRef}
          style={{
            position: 'fixed',
            top: `${actionMenuPosition.top}px`,
            left: `${actionMenuPosition.left}px`,
            width: '168px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '10px',
            boxShadow: '0 14px 28px rgba(0, 0, 0, 0.12)',
            padding: '6px',
            zIndex: 1400,
          }}
        >
          <button
            onClick={() => {
              const targetId = openActionMenuFor;
              setOpenActionMenuFor(null);
              setActionMenuPosition(null);
              onEditFridge(targetId);
            }}
            className="transition-colors hover:bg-gray-100"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F3F4F6';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              border: 'none',
              background: 'transparent',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '14px',
              color: '#1A1C1E',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background-color 150ms ease',
            }}
          >
            <span className="flex items-center gap-3">
              <Pencil size={18} style={{ color: '#6B7280' }} />
              <span>Edit Fridge</span>
            </span>
          </button>
          <button
            onClick={() => {
              const targetId = openActionMenuFor;
              setOpenActionMenuFor(null);
              setActionMenuPosition(null);
              onDeleteFridge(targetId);
            }}
            className="transition-colors hover:bg-red-50"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#fee2e2';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
            }}
            style={{
              width: '100%',
              textAlign: 'left',
              border: 'none',
              background: 'transparent',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '14px',
              color: '#DC2626',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background-color 150ms ease',
            }}
          >
            <span className="flex items-center gap-3">
              <Trash2 size={18} style={{ color: '#DC2626' }} />
              <span>Delete Fridge</span>
            </span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}

export default memo(FridgeListTable);