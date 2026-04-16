/**
 * API base URL. In development, use Vite proxy (/api) or VITE_BACKEND_URL.
 * In production, set VITE_BACKEND_URL to your backend URL.
 */
const getBaseUrl = (): string => {
  const url = import.meta.env.VITE_BACKEND_URL;
  if (url && String(url).trim()) {
    return String(url).replace(/\/$/, '');
  }
  return '/api';
};

const baseUrl = getBaseUrl();

export interface LoginResponse {
  token: string;
  user?: { user_id: string; email: string; role?: string };
}

export interface AuthUser {
  user_id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  role?: string | number;
}

export interface RegisterResponse {
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

export interface ApiError {
  error?: string;
  message?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Login failed');
  }
  return data;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const res = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Registration failed');
  }
  return data;
}

export async function validateToken(): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me');
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const data = (await res.json().catch(() => ({}))) as ApiError;
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Request failed');
  }

  return data as T;
}

export interface AdminDevice {
  device_id: string;
  name: string;
  location_description?: string | null;
  status?: string | null;
  door_status?: boolean | null;
  last_checkin_time?: string | null;
  default_temperature?: number | string | null;
}

export interface DeviceAlert {
  alert_id: string;
  device_id: string;
  timestamp: string;
  alert_type: string;
  message: string;
  status_id: number;
  resolution_note?: string | null;
}

export interface AdminAlertRead {
  alert_id: string;
  read_at: string;
}

export interface DeviceTelemetry {
  telemetry_id: string;
  device_id: string;
  timestamp: string;
  internal_temperature: number;
  door_sensor_status: boolean;
}

export interface DeviceInventoryItem {
  product_id: string;
  product_name: string;
  brand_name?: string | null;
  current_stock: number;
  critic_stock: number;
  last_stock_update?: string | null;
}

export interface AddInventoryResponse {
  device_id: string;
  product_id: string;
  product_name: string;
  brand_name?: string | null;
  previous_stock: number;
  quantity_added: number;
  new_stock: number;
  critic_stock: number;
  last_stock_update: string;
}

export interface UpdateInventoryResponse {
  device_id: string;
  product_id: string;
  product_name: string;
  brand_name?: string | null;
  new_stock: number;
  critic_stock: number;
  last_stock_update: string;
}

export interface TransactionItem {
  transaction_item_id: string;
  product_id: string;
  quantity: number;
  action_type?: string | null;
  product?: { name?: string | null } | null;
}

export interface DeviceTransaction {
  transaction_id: string;
  transaction_code?: string | null;
  device_id: string;
  start_time: string;
  end_time?: string | null;
  transaction_type?: string | null;
  status?: string | null;
  is_active?: boolean | null;
  items?: TransactionItem[] | null;
}

export interface DashboardSummaryResponse {
  stats: {
    totalFridges: number;
    onlineFridges: number;
    activeSessions: number;
    totalAlerts: number;
  };
  recentAlerts: Array<{
    device_id: string;
    fridge: string;
    alert_type: string;
    timestamp: string;
  }>;
  recentActivity: Array<{
    device_id: string;
    fridge: string;
    start_time: string;
    action_type?: string | null;
    item_count: number;
    product_summary?: string | null;
    has_product_movement?: boolean;
    display_action?: string | null;
    display_count?: string | null;
  }>;
  weeklyData: Array<{
    day: string;
    sessions: number;
  }>;
}

export interface SysadminAdmin {
  user_id: string;
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  role_id: string | number;
  active?: boolean;
}

export interface DeviceAssignment {
  assignment_id: string;
  device_id: string;
  admin_user_id: string;
  is_active: boolean;
  device?: { device_id: string; name?: string | null } | null;
}

export interface SysadminDevice {
  device_id: string;
  name: string;
  location_description?: string | null;
  gps_latitude?: number | string | null;
  gps_longitude?: number | string | null;
  default_temperature?: number | string | null;
  status_id?: number | null;
  assigned_admin_id?: string | null;
  shelf_count?: number | null;
  session_limit?: number | null;
}

export interface CreateSysadminDevicePayload {
  name: string;
  location_description: string;
  gps_latitude?: number;
  gps_longitude?: number;
  default_temperature?: number;
  assigned_admin_id?: string;
  shelf_count?: number;
  session_limit?: number;
  status_id?: number;
}

export interface UpdateSysadminDevicePayload {
  name?: string;
  location_description?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  default_temperature?: number;
  assigned_admin_id?: string;
  shelf_count?: number;
  session_limit?: number;
  status_id?: number;
}

export interface BrandItem {
  brand_id: string;
  brand_name: string;
  description?: string | null;
}

export interface ProductItem {
  product_id: string;
  name: string;
  brand_id: string;
  ai_label?: string | null;
  unit_price: number | string;
  image_reference?: string | null;
  is_active?: boolean;
  brand?: BrandItem | null;
}

export interface CoolerProductAssignment {
  device_id: string;
  product_id: string;
  is_active?: boolean;
  product_name?: string;
  brand_name?: string | null;
  unit_price?: number | string;
}

export interface InventoryCheckIssue {
  product_id: string;
  product_name?: string;
  brand_name?: string | null;
  current_stock?: number;
  issue: string;
}

export interface CoolerInventoryCheck {
  device_id: string;
  summary: {
    assigned_count: number;
    inventory_count: number;
    missing_in_inventory: number;
    missing_in_assignments: number;
    capacity_warnings: number;
    is_consistent: boolean;
  };
  missing_in_inventory: InventoryCheckIssue[];
  missing_in_assignments: InventoryCheckIssue[];
  capacity_warnings: InventoryCheckIssue[];
}

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

export async function getAdminDevices(pagination?: PaginationParams): Promise<PaginatedResponse<AdminDevice>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<AdminDevice>>(`/devices${query}`);
}

export async function getDeviceAlerts(deviceId: string, statusId?: number, pagination?: PaginationParams): Promise<PaginatedResponse<DeviceAlert>> {
  const query = buildQuery({ status_id: statusId, page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<DeviceAlert>>(`/devices/${deviceId}/alerts${query}`);
}

export async function getDeviceTelemetry(deviceId: string, pagination?: PaginationParams): Promise<PaginatedResponse<DeviceTelemetry>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<DeviceTelemetry>>(`/devices/${deviceId}/telemetry${query}`);
}

export async function getDeviceInventory(deviceId: string, pagination?: PaginationParams): Promise<PaginatedResponse<DeviceInventoryItem>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<DeviceInventoryItem>>(`/devices/${deviceId}/inventory${query}`);
}

export async function addInventoryItem(deviceId: string, productId: string, quantity: number): Promise<AddInventoryResponse> {
  return apiRequest<AddInventoryResponse>(`/devices/${deviceId}/inventory`, {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity }),
  });
}

export async function updateInventoryQuantity(deviceId: string, productId: string, quantity: number): Promise<UpdateInventoryResponse> {
  return apiRequest<UpdateInventoryResponse>(`/devices/${deviceId}/inventory/${productId}`, {
    method: 'PUT',
    body: JSON.stringify({ quantity }),
  });
}

export async function getDeviceTransactions(deviceId: string, pagination?: PaginationParams): Promise<PaginatedResponse<DeviceTransaction>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<DeviceTransaction>>(`/devices/${deviceId}/transactions${query}`);
}

export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  return apiRequest<DashboardSummaryResponse>('/devices/dashboard/summary');
}

export async function updateAlert(
  alertId: string,
  statusId: number,
  message?: string,
  resolutionNote?: string
): Promise<DeviceAlert> {
  return apiRequest<DeviceAlert>(`/alerts/${alertId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status_id: statusId, message, resolution_note: resolutionNote }),
  });
}

export async function markAlertRead(alertId: string): Promise<AdminAlertRead> {
  return apiRequest<AdminAlertRead>(`/alerts/${alertId}/read`, {
    method: 'POST',
  });
}

export async function getAlertReads(alertIds: string[]): Promise<AdminAlertRead[]> {
  if (alertIds.length === 0) return [];
  const query = buildQuery({ alert_ids: alertIds.join(',') });
  const response = await apiRequest<{ data: AdminAlertRead[] }>(`/alerts/reads${query}`);
  return response.data;
}

export async function getSysadminAdmins(pagination?: PaginationParams): Promise<PaginatedResponse<SysadminAdmin>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<SysadminAdmin>>(`/admins${query}`);
}


export async function createSysadminAdmin(payload: {
  first_name: string;
  last_name?: string;
  email: string;
  password: string;
  role_id?: string | number;
}): Promise<SysadminAdmin> {
  return apiRequest<SysadminAdmin>('/admins', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSysadminAdmin(adminId: string, payload: {
  first_name?: string;
  last_name?: string;
  email?: string;
  role_id?: string | number;
  active?: boolean;
  password?: string;
}): Promise<SysadminAdmin> {
  return apiRequest<SysadminAdmin>(`/admins/${adminId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteSysadminAdmin(adminId: string): Promise<{ message: string; user_id: string }> {
  return apiRequest<{ message: string; user_id: string }>(`/admins/${adminId}`, {
    method: 'DELETE',
  });
}

export async function getSysadminDevices(pagination?: PaginationParams): Promise<PaginatedResponse<AdminDevice>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<AdminDevice>>(`/devices${query}`);
}

export async function createSysadminDevice(payload: CreateSysadminDevicePayload): Promise<SysadminDevice> {
  return apiRequest<SysadminDevice>('/devices', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSysadminDevice(deviceId: string, payload: UpdateSysadminDevicePayload): Promise<SysadminDevice> {
  return apiRequest<SysadminDevice>(`/devices/${deviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteSysadminDevice(deviceId: string): Promise<{ message: string; device_id: string }> {
  return apiRequest<{ message: string; device_id: string }>(`/devices/${deviceId}`, {
    method: 'DELETE',
  });
}

export async function getBrands(pagination?: PaginationParams): Promise<PaginatedResponse<BrandItem>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<BrandItem>>(`/brands${query}`);
}

export async function getProducts(pagination?: PaginationParams): Promise<PaginatedResponse<ProductItem>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<ProductItem>>(`/products${query}`);
}

export async function createProduct(payload: {
  name: string;
  brand_id: string;
  ai_label?: string;
  unit_price: number;
  image_reference?: string;
  is_active?: boolean;
}): Promise<ProductItem> {
  return apiRequest<ProductItem>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(productId: string, payload: {
  name?: string;
  brand_id?: string;
  ai_label?: string;
  unit_price?: number;
  image_reference?: string;
  is_active?: boolean;
}): Promise<ProductItem> {
  return apiRequest<ProductItem>(`/products/${productId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(productId: string): Promise<{ message: string; product_id: string }> {
  return apiRequest<{ message: string; product_id: string }>(`/products/${productId}`, {
    method: 'DELETE',
  });
}

export async function getCoolerProducts(coolerId: string, pagination?: PaginationParams): Promise<PaginatedResponse<CoolerProductAssignment>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<CoolerProductAssignment>>(`/coolers/${coolerId}/products${query}`);
}

export async function assignCoolerProduct(coolerId: string, payload: {
  product_id: string;
}): Promise<CoolerProductAssignment> {
  return apiRequest<CoolerProductAssignment>(`/coolers/${coolerId}/products`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeCoolerProduct(coolerId: string, productId: string): Promise<{ message: string; device_id: string; product_id: string }> {
  return apiRequest<{ message: string; device_id: string; product_id: string }>(`/coolers/${coolerId}/products/${productId}`, {
    method: 'DELETE',
  });
}

export async function getCoolerInventoryCheck(coolerId: string): Promise<CoolerInventoryCheck> {
  return apiRequest<CoolerInventoryCheck>(`/coolers/${coolerId}/inventory-check`);
}

export async function getSysadminAssignments(pagination?: PaginationParams): Promise<PaginatedResponse<DeviceAssignment>> {
  const query = buildQuery({ page: pagination?.page, limit: pagination?.limit });
  return apiRequest<PaginatedResponse<DeviceAssignment>>(`/assignments${query}`);
}

export async function createSysadminAssignment(payload: {
  device_id: string;
  admin_user_id: string;
}): Promise<DeviceAssignment> {
  return apiRequest<DeviceAssignment>('/assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateSysadminAssignment(assignmentId: string, payload: { is_active: boolean }): Promise<DeviceAssignment> {
  return apiRequest<DeviceAssignment>(`/assignments/${assignmentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

/** Get stored auth token (e.g. for API calls). */
export function getToken(): string | null {
  return localStorage.getItem('orvio_token');
}

/** Store token after login. */
export function setToken(token: string): void {
  localStorage.setItem('orvio_token', token);
}

/** Store current user role after login. */
export function setCurrentUserRole(role: string | number): void {
  localStorage.setItem('orvio_user_role', String(role));
}

/** Store current user id after login. */
export function setCurrentUserId(userId: string): void {
  localStorage.setItem('orvio_user_id', userId);
}

/** Get current user id from storage. */
export function getCurrentUserId(): string | null {
  return localStorage.getItem('orvio_user_id');
}

/** Get current user role from storage. */
export function getCurrentUserRole(): string | null {
  return localStorage.getItem('orvio_user_role');
}

/** Clear token on logout. */
export function clearToken(): void {
  localStorage.removeItem('orvio_token');
  localStorage.removeItem('orvio_user_role');
  localStorage.removeItem('orvio_user_id');
}
