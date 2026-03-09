import { FormEvent, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import {
  AdminDevice,
  BrandItem,
  ProductItem,
  assignCoolerProduct,
  createProduct,
  deleteProduct,
  getAdminDevices,
  getBrands,
  getCoolerProducts,
  getCurrentUserRole,
  getProducts,
  removeCoolerProduct,
  updateProduct,
} from '../api/client';

interface ProductsScreenProps {
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

type ViewMode = 'list' | 'create' | 'edit';

interface ProductForm {
  name: string;
  brand_id: string;
  unit_price: string;
  image_reference: string;
  is_active: boolean;
}

interface ProductAssignmentRow {
  device_id: string;
  device_name: string;
}

const emptyForm: ProductForm = {
  name: '',
  brand_id: '',
  unit_price: '',
  image_reference: '',
  is_active: true,
};

export default function ProductsScreen({ onLogout, onNavigate }: ProductsScreenProps) {
  const [mode, setMode] = useState<ViewMode>('list');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [brands, setBrands] = useState<BrandItem[]>([]);
  const [devices, setDevices] = useState<AdminDevice[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  const [assignmentCoolerIds, setAssignmentCoolerIds] = useState<string[]>([]);
  const [coolerSearchTerm, setCoolerSearchTerm] = useState('');
  const [productAssignments, setProductAssignments] = useState<ProductAssignmentRow[]>([]);

  const currentRole = getCurrentUserRole();
  const isSystemAdmin = currentRole === '1' || currentRole === 'SYSTEM_ADMIN';

  const fetchCatalog = async () => {
    const [productsRes, brandsRes, devicesRes] = await Promise.all([
      getProducts({ limit: 100 }),
      getBrands({ limit: 100 }),
      getAdminDevices({ limit: 100 }),
    ]);

    setProducts(productsRes.data);
    setBrands(brandsRes.data);
    setDevices(devicesRes.data);
  };

  const loadAssignmentsForProduct = async (productId: string, sourceDevices?: AdminDevice[]) => {
    const deviceList = sourceDevices || devices;
    if (deviceList.length === 0) {
      setProductAssignments([]);
      return;
    }

    const assignmentResults = await Promise.all(
      deviceList.map((device) => getCoolerProducts(device.device_id, { limit: 100 }).catch(() => ({ data: [] }))),
    );

    const rows: ProductAssignmentRow[] = assignmentResults
      .map((response, index) => {
        const match = response.data.find((item) => item.product_id === productId);
        if (!match) return null;
        return {
          device_id: deviceList[index].device_id,
          device_name: deviceList[index].name || deviceList[index].device_id,
        };
      })
      .filter((item): item is ProductAssignmentRow => item !== null);

    setProductAssignments(rows);
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setIsLoading(true);
      setError('');
      try {
        await fetchCatalog();
      } catch (loadError) {
        if (mounted) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load products');
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const resetEditorState = () => {
    setSelectedProduct(null);
    setForm({
      ...emptyForm,
      brand_id: '',
    });
    setAssignmentCoolerIds([]);
    setCoolerSearchTerm('');
    setProductAssignments([]);
  };

  const openCreateView = () => {
    resetEditorState();
    setMode('create');
    setError('');
    setMessage('');
  };

  const openEditView = async (product: ProductItem) => {
    setSelectedProduct(product);
    setForm({
      name: product.name,
      brand_id: product.brand_id,
      unit_price: String(product.unit_price),
      image_reference: product.image_reference || '',
      is_active: product.is_active !== false,
    });
    setAssignmentCoolerIds([]);
    setMode('edit');
    setError('');
    setMessage('');

    try {
      await loadAssignmentsForProduct(product.product_id);
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : 'Failed to load assignments');
    }
  };

  useEffect(() => {
    if (mode !== 'edit') return;
    setAssignmentCoolerIds(productAssignments.map((assignment) => assignment.device_id));
  }, [mode, productAssignments]);

  const returnToList = async () => {
    setMode('list');
    resetEditorState();
    try {
      await fetchCatalog();
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to refresh list');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!isSystemAdmin) return;
    if (!window.confirm('Delete this product?')) return;

    setError('');
    setMessage('');
    try {
      await deleteProduct(productId);
      setMessage('Product deleted');
      await fetchCatalog();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Delete failed');
    }
  };

  const handleCreateSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSystemAdmin) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const unitPrice = Number(form.unit_price);
      if (!form.name.trim() || !form.brand_id || Number.isNaN(unitPrice)) {
        setError('Name, brand and valid unit price are required');
        return;
      }

      const created = await createProduct({
        name: form.name.trim(),
        brand_id: form.brand_id,
        unit_price: unitPrice,
        image_reference: form.image_reference.trim() || undefined,
        is_active: form.is_active,
      });

      if (assignmentCoolerIds.length > 0) {
        await Promise.all(
          assignmentCoolerIds.map((coolerId) =>
            assignCoolerProduct(coolerId, {
              product_id: created.product_id,
            }),
          ),
        );
      }

      setMessage('Product created');
      await returnToList();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Create failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isSystemAdmin || !selectedProduct) return;

    setIsSubmitting(true);
    setError('');
    setMessage('');

    try {
      const unitPrice = Number(form.unit_price);
      if (!form.name.trim() || !form.brand_id || Number.isNaN(unitPrice)) {
        setError('Name, brand and valid unit price are required');
        return;
      }

      await updateProduct(selectedProduct.product_id, {
        name: form.name.trim(),
        brand_id: form.brand_id,
        unit_price: unitPrice,
        image_reference: form.image_reference.trim() || undefined,
        is_active: form.is_active,
      });

      setMessage('Product updated');
      await fetchCatalog();
      const updated = products.find((item) => item.product_id === selectedProduct.product_id);
      if (updated) {
        setSelectedProduct(updated);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEditAssignments = async () => {
    if (!selectedProduct) return;

    const currentIds = new Set(productAssignments.map((assignment) => assignment.device_id));
    const nextIds = new Set(assignmentCoolerIds);

    const toAdd = Array.from(nextIds).filter((deviceId) => !currentIds.has(deviceId));
    const toRemove = Array.from(currentIds).filter((deviceId) => !nextIds.has(deviceId));

    if (toAdd.length === 0 && toRemove.length === 0) {
      setMessage('No assignment changes to save');
      return;
    }

    setError('');
    setMessage('');
    setIsAssigning(true);

    try {
      if (toAdd.length > 0) {
        await Promise.all(
          toAdd.map((deviceId) =>
            assignCoolerProduct(deviceId, {
              product_id: selectedProduct.product_id,
            }),
          ),
        );
      }

      if (toRemove.length > 0) {
        await Promise.all(
          toRemove.map((deviceId) => removeCoolerProduct(deviceId, selectedProduct.product_id)),
        );
      }

      await loadAssignmentsForProduct(selectedProduct.product_id);
      setMessage('Assignments saved');
    } catch (assignError) {
      setError(assignError instanceof Error ? assignError.message : 'Failed to save assignments');
    } finally {
      setIsAssigning(false);
    }
  };

  const toggleCoolerSelection = (coolerId: string) => {
    setAssignmentCoolerIds((prev) =>
      prev.includes(coolerId)
        ? prev.filter((item) => item !== coolerId)
        : [...prev, coolerId],
    );
  };

  const selectAllCoolers = () => {
    setAssignmentCoolerIds(devices.map((device) => device.device_id));
  };

  const clearCoolerSelection = () => {
    setAssignmentCoolerIds([]);
  };

  const renderCoolerSelector = () => {
    const filteredDevices = devices.filter((device) => {
      const label = (device.name || device.device_id).toLowerCase();
      return label.includes(coolerSearchTerm.toLowerCase().trim());
    });

    const sortedDevices = filteredDevices.sort((a, b) => {
      const aAssigned = assignmentCoolerIds.includes(a.device_id);
      const bAssigned = assignmentCoolerIds.includes(b.device_id);

      if (aAssigned === bAssigned) return 0;
      return aAssigned ? -1 : 1;
    });

    return (
    <div
      style={{
        border: '1px solid #E5E7EB',
        borderRadius: '10px',
        padding: '10px',
        backgroundColor: '#FAFBFC',
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Select fridges</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={selectAllCoolers}
            disabled={isAssigning}
            style={{ border: '1px solid #D1D5DB', backgroundColor: 'white', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
          >
            Select all
          </button>
          <button
            type="button"
            onClick={clearCoolerSelection}
            disabled={isAssigning}
            style={{ border: '1px solid #D1D5DB', backgroundColor: 'white', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      </div>

      <input
        type="text"
        value={coolerSearchTerm}
        onChange={(event) => setCoolerSearchTerm(event.target.value)}
        placeholder="Search fridge by name"
        style={{
          width: '100%',
          border: '1px solid #D1D5DB',
          borderRadius: '8px',
          padding: '8px 10px',
          fontSize: '13px',
          marginBottom: '8px',
          backgroundColor: 'white',
        }}
      />

      <div style={{ display: 'grid', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
        {sortedDevices.map((device) => {
          const isChecked = assignmentCoolerIds.includes(device.device_id);
          return (
            <label
              key={device.device_id}
              className="flex items-center gap-2"
              style={{
                border: isChecked ? '1px solid #93C5FD' : '1px solid #E5E7EB',
                backgroundColor: isChecked ? '#EFF6FF' : 'white',
                borderRadius: '8px',
                padding: '8px 10px',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleCoolerSelection(device.device_id)}
                disabled={isAssigning}
                style={{ width: '14px', height: '14px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '13px', color: '#1F2937' }}>{device.name || device.device_id}</span>
            </label>
          );
        })}
        {sortedDevices.length === 0 && (
          <div style={{ fontSize: '13px', color: '#6B7280', padding: '8px 4px' }}>
            No fridge found for this search.
          </div>
        )}
      </div>

      <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px' }}>
        Selected: {assignmentCoolerIds.length}
      </p>
    </div>
  );
  };

  const renderList = () => (
    <section className="bg-white" style={{ borderRadius: '12px', boxShadow: '0 3px 8px rgba(0,0,0,0.05)', padding: '16px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1A1C1E' }}>Product Catalog</h2>
        {isSystemAdmin && (
          <button
            onClick={openCreateView}
            style={{ border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
          >
            Create Product
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Product</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Brand</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Unit Price</th>
              <th style={{ textAlign: 'left', padding: '10px 8px' }}>Status</th>
              {isSystemAdmin && <th style={{ textAlign: 'left', padding: '10px 8px' }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.product_id} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '10px 8px' }}>{product.name}</td>
                <td style={{ padding: '10px 8px' }}>{product.brand?.brand_name || '-'}</td>
                <td style={{ padding: '10px 8px' }}>{Number(product.unit_price).toFixed(2)}</td>
                <td style={{ padding: '10px 8px' }}>{product.is_active === false ? 'Inactive' : 'Active'}</td>
                {isSystemAdmin && (
                  <td style={{ padding: '10px 8px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => void openEditView(product)}
                      style={{ border: '1px solid #D1D5DB', borderRadius: '6px', padding: '4px 8px', background: 'white', cursor: 'pointer' }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void handleDeleteProduct(product.product_id)}
                      style={{ border: '1px solid #FECACA', borderRadius: '6px', padding: '4px 8px', background: '#FEF2F2', color: '#B91C1C', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={isSystemAdmin ? 5 : 4} style={{ padding: '12px 8px', color: '#6B7280' }}>
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderCreate = () => (
    <section className="bg-white" style={{ borderRadius: '12px', boxShadow: '0 3px 8px rgba(0,0,0,0.05)', padding: '16px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1A1C1E' }}>Create Product</h2>
        <button
          onClick={() => void returnToList()}
          style={{ border: '1px solid #D1D5DB', borderRadius: '8px', backgroundColor: 'white', padding: '8px 12px', cursor: 'pointer', fontSize: '14px' }}
        >
          Back to List
        </button>
      </div>

      <form onSubmit={handleCreateSubmit} className="grid md:grid-cols-2 gap-3" style={{ marginBottom: '16px' }}>
        <input
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          placeholder="Product name"
          style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 10px', fontSize: '14px' }}
        />
        <select
          value={form.brand_id}
          onChange={(event) => setForm((prev) => ({ ...prev, brand_id: event.target.value }))}
          style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 10px', fontSize: '14px' }}
        >
          <option value="">Select a brand</option>
          {brands.map((brand) => (
            <option key={brand.brand_id} value={brand.brand_id}>
              {brand.brand_name}
            </option>
          ))}
        </select>
        <input
          value={form.unit_price}
          onChange={(event) => setForm((prev) => ({ ...prev, unit_price: event.target.value }))}
          placeholder="Unit price"
          style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 10px', fontSize: '14px' }}
        />
        <input
          value={form.image_reference}
          onChange={(event) => setForm((prev) => ({ ...prev, image_reference: event.target.value }))}
          placeholder="Image URL (optional)"
          style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 10px', fontSize: '14px' }}
        />

        {renderCoolerSelector()}

        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
          >
            Create Product
          </button>
        </div>
      </form>
    </section>
  );

  const renderEdit = () => {
    if (!selectedProduct) return null;

    return (
      <section className="bg-white" style={{ borderRadius: '12px', boxShadow: '0 3px 8px rgba(0,0,0,0.05)', padding: '16px' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1A1C1E' }}>Edit Product</h2>
          <button
            onClick={() => void returnToList()}
            style={{ border: '1px solid #D1D5DB', borderRadius: '8px', backgroundColor: 'white', padding: '8px 12px', cursor: 'pointer', fontSize: '14px' }}
          >
            Back to List
          </button>
        </div>

        <form onSubmit={handleEditSubmit} className="grid md:grid-cols-2 gap-3" style={{ marginBottom: '16px' }}>
          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Product name"
            style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 10px', fontSize: '14px' }}
          />
          <select
            value={form.brand_id}
            onChange={(event) => setForm((prev) => ({ ...prev, brand_id: event.target.value }))}
            style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 10px', fontSize: '14px' }}
          >
            {brands.map((brand) => (
              <option key={brand.brand_id} value={brand.brand_id}>
                {brand.brand_name}
              </option>
            ))}
          </select>
          <input
            value={form.unit_price}
            onChange={(event) => setForm((prev) => ({ ...prev, unit_price: event.target.value }))}
            placeholder="Unit price"
            style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 10px', fontSize: '14px' }}
          />
          <input
            value={form.image_reference}
            onChange={(event) => setForm((prev) => ({ ...prev, image_reference: event.target.value }))}
            placeholder="Image URL (optional)"
            style={{ border: '1px solid #D1D5DB', borderRadius: '8px', padding: '8px 10px', fontSize: '14px' }}
          />

          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              style={{ border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              Save Product
            </button>
          </div>
        </form>

        <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1A1C1E', marginBottom: '10px' }}>Assignments</h3>
          <div className="grid md:grid-cols-2 gap-2" style={{ marginBottom: '12px' }}>
            {renderCoolerSelector()}
            <button
              type="button"
              onClick={() => void handleSaveEditAssignments()}
              disabled={isAssigning}
              style={{ border: 'none', borderRadius: '8px', backgroundColor: '#2563EB', color: 'white', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '14px', height: '44px', alignSelf: 'start' }}
            >
              Save Assignments
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>
            Select/unselect fridges, then click Save Assignments to apply changes.
          </p>
        </div>
      </section>
    );
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#F5F7FA' }}>
      <Sidebar activePage="Products" onNavigate={onNavigate} />

      <div className="flex-1 flex flex-col">
        <Topbar onLogout={onLogout} pageTitle="Products" />

        <main style={{ padding: '24px', display: 'grid', gap: '16px' }}>
          {message && (
            <div style={{ backgroundColor: '#ECFDF3', color: '#027A48', borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ backgroundColor: '#FEF3F2', color: '#B42318', borderRadius: '8px', padding: '10px 12px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {mode === 'list' && renderList()}
          {mode === 'create' && renderCreate()}
          {mode === 'edit' && renderEdit()}
        </main>
      </div>
    </div>
  );
}
