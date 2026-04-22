import { memo, useEffect, useMemo, useState } from 'react';
import { Package, Plus, X, Edit2 } from 'lucide-react';
import { EmptyState } from '../ui/empty-state';
import { TableSkeleton } from '../ui/table-skeleton';
import { getDeviceInventory, getCoolerProducts, addInventoryItem, updateInventoryQuantity, AddInventoryResponse, UpdateInventoryResponse } from '../../api/client';

interface InventoryTabProps {
  fridgeId: string;
  isLoading?: boolean;
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
  category: string;
  lastStockUpdate: string;
  image?: string;
}

interface AssignedProduct {
  product_id: string;
  product_name: string;
  brand_name?: string;
}

function InventoryTab({ fridgeId, isLoading = false }: InventoryTabProps) {
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [assignedProducts, setAssignedProducts] = useState<AssignedProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // Add inventory form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState<AddInventoryResponse | null>(null);

  // Edit inventory form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState<UpdateInventoryResponse | null>(null);

  const formatLastUpdate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} - ${hours}:${minutes}`;
    } catch {
      return 'N/A';
    }
  };

  const loadInventory = async (isMounted?: () => boolean) => {
    setIsFetching(true);
    try {
      const response = await getDeviceInventory(fridgeId, { limit: 100 });
      const inventory = response.data;

      const mapped = inventory.map((item) => ({
        id: item.product_id,
        name: item.product_name,
        quantity: item.current_stock,
        threshold: item.critic_stock,
        category: item.brand_name || 'Uncategorized',
        lastStockUpdate: formatLastUpdate(item.last_stock_update),
      }));

      if (!isMounted || isMounted()) {
        setProducts(mapped);
      }
    } catch (error) {
      console.error('Failed to load inventory', error);
      if (!isMounted || isMounted()) {
        setProducts([]);
      }
    } finally {
      if (!isMounted || isMounted()) {
        setIsFetching(false);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    loadInventory(() => isMounted);
    return () => {
      isMounted = false;
    };
  }, [fridgeId]);

  useEffect(() => {
    let isMounted = true;
    const loadAssignedProducts = async () => {
      setIsLoadingProducts(true);
      try {
        const response = await getCoolerProducts(fridgeId, { limit: 500 });
        if (isMounted) {
          setAssignedProducts(response.data);
        }
      } catch (error) {
        console.error('Failed to load assigned products', error);
        if (isMounted) setAssignedProducts([]);
      } finally {
        if (isMounted) setIsLoadingProducts(false);
      }
    };

    if (showAddForm) {
      loadAssignedProducts();
    }
  }, [showAddForm, fridgeId]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category))).sort();
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesCategory = !categoryFilter || product.category === categoryFilter;
        const matchesLowStock = !showLowStockOnly || product.quantity < product.threshold;
        return matchesCategory && matchesLowStock;
      }),
    [products, categoryFilter, showLowStockOnly],
  );

  const getStatus = (quantity: number, threshold: number) => {
    return quantity >= threshold ? 'OK' : 'Low';
  };

  const getStatusColor = (status: string) => {
    return status === 'OK' ? '#10B981' : '#DC2626';
  };

  const handleAddInventory = async () => {
    setSubmitError('');
    setSubmitSuccess(null);

    if (!selectedProductId) {
      setSubmitError('Please select a product');
      return;
    }

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      setSubmitError('Quantity must be a positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addInventoryItem(fridgeId, selectedProductId, qty);
      setSubmitSuccess(result);
      setSelectedProductId('');
      setQuantity('1');
      await loadInventory();
      handleCloseForm();
    } catch (error: any) {
      console.error('Failed to add inventory', error);
      setSubmitError(error.message || 'Failed to add inventory. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseForm = () => {
    setShowAddForm(false);
    setSelectedProductId('');
    setQuantity('1');
    setSubmitError('');
    setSubmitSuccess(null);
  };

  const handleOpenEditForm = (product: Product) => {
    setEditingProductId(product.id);
    setEditingProductName(product.name);
    setEditQuantity(String(product.quantity));
    setShowEditForm(true);
    setEditError('');
    setEditSuccess(null);
  };

  const handleEditInventory = async () => {
    setEditError('');
    setEditSuccess(null);

    if (!editingProductId) {
      setEditError('Product not found');
      return;
    }

    const qty = parseInt(editQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      setEditError('Quantity must be a non-negative number');
      return;
    }

    setIsEditSubmitting(true);
    try {
      const result = await updateInventoryQuantity(fridgeId, editingProductId, qty);
      setEditSuccess(result);
      await loadInventory();
      handleCloseEditForm();
    } catch (error: any) {
      console.error('Failed to update inventory', error);
      setEditError(error.message || 'Failed to update inventory. Please try again.');
    } finally {
      setIsEditSubmitting(false);
    }
  };

  const handleCloseEditForm = () => {
    setShowEditForm(false);
    setEditingProductId(null);
    setEditingProductName('');
    setEditQuantity('');
    setEditError('');
    setEditSuccess(null);
  };

  return (
    <div
      className="bg-white"
      style={{
        width: '100%',
        minHeight: '360px',
        borderRadius: '12px',
        boxShadow: '0 3px 8px rgba(0,0,0,0.05)',
        padding: '24px'
      }}
    >
      {/* Header with Filters and Add Button */}
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E' }}>
          Inventory
        </h2>

        <div className="flex items-center gap-3">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            style={{
              width: '160px',
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              border: '1px solid #D1D5DB',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          {/* Low Stock Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLowStockOnly}
              onChange={(e) => setShowLowStockOnly(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                cursor: 'pointer'
              }}
            />
            <span style={{ fontSize: '14px', color: '#6B7280' }}>
              Show only low stock
            </span>
          </label>

          {/* Add Inventory Button */}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 transition-all"
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563EB';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3B82F6';
            }}
          >
            <Plus size={18} />
            Add Stock
          </button>
        </div>
      </div>

      {/* Add Inventory Form Modal */}
      {showAddForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
          onClick={handleCloseForm}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              padding: '24px',
              width: '90%',
              maxWidth: '400px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E' }}>Add Inventory</h3>
              <button
                onClick={handleCloseForm}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={24} style={{ color: '#6B7280' }} />
              </button>
            </div>

            {submitSuccess && (
              <div
                style={{
                  backgroundColor: '#D1FAE5',
                  border: '1px solid #6EE7B7',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#065F46'
                }}
              >
                ✓ Added {submitSuccess.quantity_added} {submitSuccess.product_name}. New stock: {submitSuccess.new_stock}
              </div>
            )}

            {submitError && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#7F1D1D'
                }}
              >
                ✗ {submitError}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>
                Select Product *
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={isLoadingProducts || isSubmitting}
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  cursor: isLoadingProducts ? 'not-allowed' : 'pointer',
                  backgroundColor: isLoadingProducts ? '#F3F4F6' : 'white'
                }}
              >
                <option value="">{isLoadingProducts ? 'Loading products...' : 'Choose a product'}</option>
                {assignedProducts.map((product) => (
                  <option key={product.product_id} value={product.product_id}>
                    {product.product_name} ({product.brand_name || 'N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>
                Quantity *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={isSubmitting}
                min="1"
                step="1"
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  backgroundColor: isSubmitting ? '#F3F4F6' : 'white'
                }}
                placeholder="Enter quantity"
              />
            </div>

            <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseForm}
                disabled={isSubmitting}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: 'white',
                  color: '#6B7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddInventory}
                disabled={isSubmitting || !selectedProductId}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: selectedProductId && !isSubmitting ? '#3B82F6' : '#E5E7EB',
                  color: selectedProductId && !isSubmitting ? 'white' : '#9CA3AF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: selectedProductId && !isSubmitting ? 'pointer' : 'not-allowed'
                }}
              >
                {isSubmitting ? 'Adding...' : 'Add Stock'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Inventory Form Modal */}
      {showEditForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50
          }}
          onClick={handleCloseEditForm}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
              padding: '24px',
              width: '90%',
              maxWidth: '400px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1A1C1E' }}>Edit Quantity</h3>
              <button
                onClick={handleCloseEditForm}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={24} style={{ color: '#6B7280' }} />
              </button>
            </div>

            {editSuccess && (
              <div
                style={{
                  backgroundColor: '#D1FAE5',
                  border: '1px solid #6EE7B7',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#065F46'
                }}
              >
                ✓ Updated {editSuccess.product_name}. New stock: {editSuccess.new_stock}
              </div>
            )}

            {editError && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FECACA',
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#7F1D1D'
                }}
              >
                ✗ {editError}
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>
                Product
              </label>
              <div
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  backgroundColor: '#F3F4F6',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#1A1C1E'
                }}
              >
                {editingProductName}
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#6B7280', marginBottom: '6px' }}>
                New Quantity *
              </label>
              <input
                type="number"
                value={editQuantity}
                onChange={(e) => setEditQuantity(e.target.value)}
                disabled={isEditSubmitting}
                min="0"
                step="1"
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  fontSize: '14px',
                  backgroundColor: isEditSubmitting ? '#F3F4F6' : 'white'
                }}
                placeholder="Enter new quantity"
              />
            </div>

            <div className="flex gap-3" style={{ justifyContent: 'flex-end' }}>
              <button
                onClick={handleCloseEditForm}
                disabled={isEditSubmitting}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: '1px solid #D1D5DB',
                  backgroundColor: 'white',
                  color: '#6B7280',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: isEditSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isEditSubmitting ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleEditInventory}
                disabled={isEditSubmitting}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: !isEditSubmitting ? '#3B82F6' : '#E5E7EB',
                  color: !isEditSubmitting ? 'white' : '#9CA3AF',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: !isEditSubmitting ? 'pointer' : 'not-allowed'
                }}
              >
                {isEditSubmitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      <div style={{ overflowX: 'auto' }}>
        {isLoading ? (
          <TableSkeleton columns={5} rows={5} />
        ) : filteredProducts.length === 0 ? (
          <EmptyState 
            title="No products found"
            description="No inventory items match the selected filters."
            icon={<Package size={48} strokeWidth={1.5} />}
          />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E5E7EB' }}>
                <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                  Product
                </th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                  Quantity
                </th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                  Critic Stock
                </th>
                <th style={{ textAlign: 'center', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                  Status
                </th>
                <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '13px', fontWeight: 500, color: '#6B7280' }}>
                  Last Update
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product, index) => {
                const status = getStatus(product.quantity, product.threshold);
                return (
                  <tr
                    key={product.id}
                    className="transition-colors"
                    style={{
                      borderBottom: index < filteredProducts.length - 1 ? '1px solid #F3F4F6' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: '16px 8px' }}>
                      <div className="flex items-center gap-3">
                        {/* Product Image */}
                        <div
                          className="flex items-center justify-center"
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '8px',
                            backgroundColor: '#F3F4F6'
                          }}
                        >
                          <Package size={24} style={{ color: '#9CA3AF' }} />
                        </div>
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A1C1E' }}>
                            {product.name}
                          </p>
                          <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                            {product.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '16px 8px', fontSize: '14px', fontWeight: 600, color: '#1A1C1E', textAlign: 'center' }}>
                      {product.quantity}
                    </td>
                    <td style={{ padding: '16px 8px', fontSize: '14px', color: '#6B7280', textAlign: 'center' }}>
                      {product.threshold}
                    </td>
                    <td style={{ padding: '16px 8px', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          color: getStatusColor(status),
                          backgroundColor: `${getStatusColor(status)}15`
                        }}
                      >
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: '16px 8px', fontSize: '13px', color: '#6B7280' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                        <span>{product.lastStockUpdate}</span>
                        <button
                          onClick={() => handleOpenEditForm(product)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#E5E7EB';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          title="Edit quantity"
                        >
                          <Edit2 size={16} style={{ color: '#6B7280' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default memo(InventoryTab);