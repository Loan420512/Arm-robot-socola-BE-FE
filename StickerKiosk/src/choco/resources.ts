import type { Entity } from './api';

export type FieldKind = 'text' | 'email' | 'tel' | 'password' | 'number' | 'textarea' | 'checkbox' | 'select' | 'date' | 'reference';
export type FormValues = Record<string, string | boolean>;
export type ReferenceData = Record<string, Entity[]>;

export interface ResourceField {
  key: string;
  label: string;
  kind?: FieldKind;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  step?: string;
  pattern?: string;
  placeholder?: string;
  help?: string;
  reference?: string;
  options?: readonly string[];
  defaultValue?: string | boolean;
  editOnly?: boolean;
  readOnly?: boolean;
}

export interface ResourceColumn {
  key: string;
  label: string;
  format?: 'money' | 'date' | 'status' | 'boolean' | 'image' | 'color';
}

export interface ResourceDefinition {
  title: string;
  singular: string;
  description: string;
  path: string;
  labelKey: string;
  fields: ResourceField[];
  columns: ResourceColumn[];
  canEdit: boolean;
  canDelete: boolean;
  note?: string;
  extraReferences?: string[];
}

const text = (key: string, label: string, maxLength?: number): ResourceField => ({ key, label, maxLength, required: true });
const ref = (key: string, label: string, reference: string, required = true): ResourceField => ({ key, label, kind: 'reference', reference, required });
const number = (key: string, label: string, min = 0, step = '1'): ResourceField => ({ key, label, kind: 'number', min, step, required: true });
const active: ResourceField = { key: 'isActive', label: 'Đang hoạt động', kind: 'checkbox', defaultValue: true };
const col = (key: string, label: string, format?: ResourceColumn['format']): ResourceColumn => ({ key, label, format });

export const RESOURCES: Record<string, ResourceDefinition> = {
  plates: {
    title: 'Dĩa', singular: 'dĩa', path: '/plates', labelKey: 'sku',
    description: 'Quản lý dĩa, chất liệu, màu sắc và số lượng sẵn có.',
    fields: [ref('typeId', 'Loại dĩa', 'plate-types'), ref('colorId', 'Màu dĩa', 'plate-colors'), text('sku', 'Mã SKU', 100), text('material', 'Chất liệu', 100), { ...text('color', 'Tên màu', 50), readOnly: true, help: 'Được điền theo màu dĩa đã chọn.' }, number('price', 'Giá bán (₫)', 0, '0.01'), { ...number('stockQuantity', 'Số lượng trong kho'), max: 2147483647 }],
    columns: [col('sku', 'Mã dĩa'), col('typeId', 'Loại'), col('colorId', 'Màu'), col('price', 'Giá', 'money'), col('stockQuantity', 'Tồn kho')], canEdit: true, canDelete: true,
  },
  'plate-types': {
    title: 'Loại dĩa', singular: 'loại dĩa', path: '/plate-types', labelKey: 'typeName',
    description: 'Định nghĩa hình dáng và kích thước cho từng loại dĩa.',
    fields: [text('typeName', 'Tên loại', 100), text('shape', 'Hình dáng', 50), { ...text('dimensions', 'Kích thước', 100), placeholder: 'Nhập kích thước thực tế' }],
    columns: [col('typeName', 'Tên loại'), col('shape', 'Hình dáng'), col('dimensions', 'Kích thước')], canEdit: true, canDelete: true,
  },
  'plate-colors': {
    title: 'Màu dĩa', singular: 'màu dĩa', path: '/plate-colors', labelKey: 'colorName',
    description: 'Bảng màu dùng cho sản phẩm và trạng thái sử dụng.',
    fields: [text('colorName', 'Tên màu', 50), { ...text('colorCode', 'Mã màu HEX', 7), pattern: '#[0-9a-fA-F]{6}', placeholder: '#AABBCC', help: 'Gồm dấu # và 6 ký tự HEX.' }, active],
    columns: [col('colorName', 'Tên màu'), col('colorCode', 'Mã màu', 'color'), col('isActive', 'Trạng thái', 'boolean')], canEdit: true, canDelete: true,
  },
  'choco-templates': {
    title: 'Mẫu chocolate', singular: 'mẫu chocolate', path: '/choco-templates', labelKey: 'templateName',
    description: 'Thư viện mẫu chocolate theo loại dĩa và người thiết kế.',
    fields: [text('templateName', 'Tên mẫu', 150), ref('plateTypeId', 'Loại dĩa phù hợp', 'plate-types'), ref('staffId', 'Nhân viên phụ trách', 'staff'), { ...text('imagePreviewUrl', 'Đường dẫn ảnh xem trước', 500), help: 'Tải ảnh PNG/JPEG hoặc nhập đường dẫn ảnh.' }, { ...text('gcodeFileUrl', 'Tệp đính kèm', 500), help: 'Trường lưu trữ hiện có của API; không dùng để dựng hoặc chạy mô phỏng.' }, active],
    columns: [col('imagePreviewUrl', 'Ảnh', 'image'), col('templateName', 'Tên mẫu'), col('plateTypeId', 'Loại dĩa'), col('staffId', 'Nhân viên'), col('isActive', 'Trạng thái', 'boolean')], canEdit: true, canDelete: true,
  },
  'template-elements': {
    title: 'Chi tiết mẫu', singular: 'chi tiết mẫu', path: '/template-elements', labelKey: 'elementName',
    description: 'Các thành phần và vị trí được lưu trong từng mẫu chocolate.',
    fields: [ref('templateId', 'Mẫu chocolate', 'choco-templates'), ref('staffId', 'Nhân viên phụ trách', 'staff'), text('elementName', 'Tên thành phần', 150), { ...number('positionX', 'Vị trí X', -2147483648), max: 2147483647 }, { ...number('positionY', 'Vị trí Y', -2147483648), max: 2147483647 }, { ...number('scale', 'Tỉ lệ', 0.000001, 'any'), max: 1000000, defaultValue: '1' }],
    columns: [col('elementName', 'Thành phần'), col('templateId', 'Mẫu'), col('staffId', 'Nhân viên'), col('positionX', 'X'), col('positionY', 'Y'), col('scale', 'Tỉ lệ')], canEdit: true, canDelete: true,
  },
  customers: {
    title: 'Khách hàng', singular: 'khách hàng', path: '/admin/customers', labelKey: 'fullName',
    description: 'Thông tin liên hệ và lịch sử khách hàng của cửa hàng.',
    fields: [text('fullName', 'Họ và tên', 100), { ...text('phone', 'Số điện thoại', 20), kind: 'tel', pattern: '\\+?[0-9]{8,15}', help: 'Từ 8 đến 15 chữ số, có thể bắt đầu bằng dấu +.' }, { ...text('email', 'Email', 100), kind: 'email' }],
    columns: [col('fullName', 'Khách hàng'), col('phone', 'Số điện thoại'), col('email', 'Email'), col('createdAt', 'Ngày tạo', 'date')], canEdit: true, canDelete: true,
  },
  orders: {
    title: 'Đơn hàng', singular: 'đơn hàng', path: '/orders', labelKey: 'orderCode',
    description: 'Theo dõi đơn hàng từ khi tiếp nhận đến khi hoàn thành.',
    fields: [ref('customerId', 'Khách hàng', 'customers'), ref('plateId', 'Dĩa', 'plates'), { ...ref('chocoTemplateId', 'Mẫu chocolate', 'choco-templates'), help: 'Chỉ hiện mẫu đang hoạt động, phù hợp loại dĩa đã chọn.' }],
    columns: [col('orderCode', 'Mã đơn'), col('customerId', 'Khách hàng'), col('totalAmount', 'Tổng tiền', 'money'), col('status', 'Trạng thái', 'status'), col('createdAt', 'Ngày tạo', 'date')], canEdit: true, canDelete: false,
    note: 'Giá đơn được lấy từ dĩa. Chỉ đơn chờ xử lý được sửa nội dung; bắt đầu xử lý sẽ trừ một dĩa trong kho.',
    extraReferences: ['plate-colors'],
  },
  payments: {
    title: 'Thanh toán', singular: 'thanh toán', path: '/payments', labelKey: 'transactionId',
    description: 'Ghi nhận tiền mặt đã thực nhận cho từng đơn hàng.',
    fields: [ref('orderId', 'Đơn hàng', 'orders'), ref('auditId', 'Phiếu đối soát', 'cash-flow-audits', false), { ...number('amount', 'Số tiền thực nhận (₫)', 0.01, '0.01'), help: 'Phải bằng tổng tiền của đơn hàng.' }, { key: 'paymentMethod', label: 'Phương thức', kind: 'select', options: ['Cash'], defaultValue: 'Cash', required: true }, { key: 'cashReceivedConfirmed', label: 'Tôi xác nhận đã thực sự nhận đủ tiền mặt của đơn hàng này.', kind: 'checkbox', required: true, defaultValue: false }],
    columns: [col('orderId', 'Đơn hàng'), col('amount', 'Số tiền', 'money'), col('paymentMethod', 'Phương thức'), col('paymentStatus', 'Trạng thái', 'status'), col('paidAt', 'Thời gian nhận', 'date')], canEdit: false, canDelete: false,
    note: 'Mỗi đơn chỉ có một thanh toán. Chỉ xác nhận sau khi đã nhận đủ tiền mặt.', extraReferences: ['payments'],
  },
  refunds: {
    title: 'Yêu cầu hoàn tiền', singular: 'yêu cầu hoàn tiền', path: '/refunds', labelKey: 'reason',
    description: 'Tiếp nhận và duyệt yêu cầu hoàn tiền từ các thanh toán thành công.',
    fields: [ref('paymentId', 'Thanh toán', 'payments'), ref('auditId', 'Phiếu đối soát', 'cash-flow-audits', false), { ...number('refundAmount', 'Số tiền yêu cầu hoàn (₫)', 0.01, '0.01'), help: 'Không vượt quá số tiền đã thanh toán.' }, { ...text('reason', 'Lý do hoàn tiền', 500), kind: 'textarea' }],
    columns: [col('paymentId', 'Thanh toán'), col('refundAmount', 'Số tiền', 'money'), col('reason', 'Lý do'), col('status', 'Trạng thái', 'status'), col('createdAt', 'Ngày tạo', 'date')], canEdit: false, canDelete: false,
    note: 'Phê duyệt chỉ xác nhận yêu cầu. Việc chuyển tiền hoàn cần được thực hiện và xác nhận riêng.', extraReferences: ['refunds'],
  },
  'cash-flow-audits': {
    title: 'Đối soát dòng tiền', singular: 'phiếu đối soát', path: '/cash-flow-audits', labelKey: 'auditDate',
    description: 'So sánh số liệu dự kiến với doanh thu và hoàn tiền trong ngày.',
    fields: [{ key: 'auditDate', label: 'Ngày đối soát', kind: 'date', required: true }, number('expectedRevenue', 'Doanh thu ròng dự kiến (₫)', 0, '0.01'), number('expectedRefund', 'Tổng hoàn tiền dự kiến (₫)', 0, '0.01')],
    columns: [col('auditDate', 'Ngày đối soát', 'date'), col('totalRevenue', 'Doanh thu ròng', 'money'), col('totalRefund', 'Tiền đã hoàn', 'money'), col('status', 'Kết quả', 'status')], canEdit: true, canDelete: false,
    note: 'Hệ thống tính tổng thực tế và kết quả đối soát. Khi sửa, nhập lại hai số liệu dự kiến để tính lại.',
  },
  staff: {
    title: 'Nhân viên', singular: 'nhân viên', path: '/staff', labelKey: 'fullName',
    description: 'Quản lý đội ngũ thiết kế, vận hành và hỗ trợ.',
    fields: [text('fullName', 'Họ và tên', 100), text('employeeCode', 'Mã nhân viên', 50), { ...text('phone', 'Số điện thoại', 20), kind: 'tel' }, { key: 'position', label: 'Vị trí', kind: 'select', options: ['Support', 'Operator', 'Designer'], required: true }, active, { ...ref('adminId', 'Quản trị viên phụ trách', 'admin'), editOnly: true }],
    columns: [col('fullName', 'Nhân viên'), col('employeeCode', 'Mã nhân viên'), col('phone', 'Số điện thoại'), col('position', 'Vị trí'), col('isActive', 'Trạng thái', 'boolean')], canEdit: true, canDelete: true,
  },
  admin: {
    title: 'Quản trị viên', singular: 'quản trị viên', path: '/admin', labelKey: 'username',
    description: 'Tài khoản có quyền quản lý hệ thống ChocoRobot.',
    fields: [text('username', 'Tên đăng nhập', 100), { ...text('email', 'Email', 100), kind: 'email' }, { key: 'password', label: 'Mật khẩu', kind: 'password', minLength: 12, maxLength: 72, required: true, help: 'Ít nhất 12 ký tự và tối đa 72 byte UTF-8. Khi sửa, nhập mật khẩu sẽ được đặt cho tài khoản.' }],
    columns: [col('username', 'Tên đăng nhập'), col('email', 'Email'), col('role', 'Quyền')], canEdit: true, canDelete: true,
  },
  'incident-reports': {
    title: 'Báo cáo sự cố', singular: 'báo cáo sự cố', path: '/incident-reports', labelKey: 'incidentType',
    description: 'Ghi nhận và theo dõi quá trình xử lý sự cố tại cửa hàng.',
    fields: [ref('staffId', 'Nhân viên báo cáo', 'staff'), text('incidentType', 'Loại sự cố', 50), { key: 'description', label: 'Mô tả', kind: 'textarea', required: true }, { key: 'status', label: 'Trạng thái', kind: 'select', options: ['Open', 'In Progress', 'Resolved'], defaultValue: 'Open', required: true }],
    columns: [col('incidentType', 'Sự cố'), col('staffId', 'Nhân viên'), col('description', 'Mô tả'), col('status', 'Trạng thái', 'status'), col('reportedAt', 'Thời gian báo cáo', 'date')], canEdit: true, canDelete: false,
  },
};

export const OPTION_LABELS: Record<string, string> = {
  Cash: 'Tiền mặt', Support: 'Hỗ trợ', Operator: 'Vận hành', Designer: 'Thiết kế',
  Open: 'Mới tiếp nhận', 'In Progress': 'Đang xử lý', Resolved: 'Đã giải quyết',
};

export function recordLabel(resourceKey: string, row: Entity): string {
  const resource = RESOURCES[resourceKey];
  const value = resource ? row[resource.labelKey] : undefined;
  if (resourceKey === 'payments') return `Thanh toán #${row.id}, đơn #${String(row.orderId ?? '—')}`;
  if (resourceKey === 'cash-flow-audits') return `Đối soát ${String(row.auditDate ?? `#${row.id}`)}`;
  return value ? `${String(value)} (#${row.id})` : `#${row.id}`;
}

export function initialValues(resource: ResourceDefinition, row: Entity | null): FormValues {
  return Object.fromEntries(resource.fields.filter(field => row || !field.editOnly).map(field => {
    const value = field.kind === 'password' ? '' : row?.[field.key];
    return [field.key, field.kind === 'checkbox' ? value === undefined ? field.defaultValue === true : value === true : value === null || value === undefined ? field.defaultValue ?? '' : String(value)];
  }));
}

export function orderTransitions(status: unknown): string[] {
  if (status === 'Pending') return ['Processing', 'Cancelled'];
  if (status === 'Processing') return ['Completed', 'Cancelled'];
  return [];
}

export function incidentTransitions(status: unknown): string[] {
  if (status === 'Open') return ['In Progress', 'Resolved'];
  if (status === 'In Progress') return ['Resolved'];
  return [];
}

/** Only fields in the write contract are sent; response-only totals/statuses never leak into a request. */
export function resourcePayload(resource: ResourceDefinition, values: FormValues, editing: boolean, references: ReferenceData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const field of resource.fields) {
    if (field.editOnly && !editing) continue;
    const value = values[field.key];
    if (field.kind === 'checkbox') payload[field.key] = value === true;
    else if (field.kind === 'number' || field.kind === 'reference') payload[field.key] = value === '' || value === undefined ? null : Number(value);
    else payload[field.key] = typeof value === 'string' ? field.kind === 'password' ? value : value.trim() : '';
  }
  if (resource.path === '/plates') {
    const color = references['plate-colors']?.find(item => item.id === Number(values.colorId));
    payload.color = color?.colorName ?? payload.color;
  }
  return payload;
}

export function referenceOptions(resourceKey: string, field: ResourceField, values: FormValues, references: ReferenceData, editingId?: number): Entity[] {
  let items = references[field.reference ?? ''] ?? [];
  if (resourceKey === 'orders' && field.key === 'plateId') {
    const colors = references['plate-colors'] ?? [];
    items = items.filter(item => Number(item.stockQuantity) > 0 && colors.some(color => color.id === item.colorId && color.isActive === true));
  }
  if (resourceKey === 'orders' && field.key === 'chocoTemplateId') {
    const plate = references.plates?.find(item => item.id === Number(values.plateId));
    items = plate ? items.filter(item => item.isActive === true && item.plateTypeId === plate.typeId) : [];
  }
  if (resourceKey === 'payments' && field.key === 'orderId') {
    const paidOrderIds = new Set((references.payments ?? []).filter(item => item.id !== editingId).map(item => item.orderId));
    items = items.filter(item => item.status !== 'Cancelled' && Number(item.totalAmount) > 0 && !paidOrderIds.has(item.id));
  }
  if (resourceKey === 'refunds' && field.key === 'paymentId') {
    const refundedPaymentIds = new Set((references.refunds ?? []).filter(item => item.id !== editingId).map(item => item.paymentId));
    items = items.filter(item => item.paymentStatus === 'Success' && !refundedPaymentIds.has(item.id));
  }
  return items;
}

export function validateResource(resourceKey: string, values: FormValues, references: ReferenceData): string | null {
  if (resourceKey === 'admin' && new TextEncoder().encode(String(values.password ?? '')).length > 72) return 'Mật khẩu vượt quá 72 byte UTF-8. Hãy dùng mật khẩu ngắn hơn.';
  if (resourceKey === 'payments') {
    if (values.paymentMethod !== 'Cash') return 'Hiện chỉ có thể ghi nhận tiền mặt đã thực nhận tại xưởng.';
    if (values.cashReceivedConfirmed !== true) return 'Bạn cần xác nhận đã thực sự nhận đủ tiền mặt trước khi ghi nhận thanh toán.';
    const order = references.orders?.find(item => item.id === Number(values.orderId));
    if (order?.status === 'Cancelled') return 'Không thể ghi nhận thanh toán cho đơn đã hủy.';
    if (references.payments?.some(payment => payment.orderId === order?.id)) return 'Đơn hàng đã có thanh toán. Hãy kiểm tra trước khi ghi nhận lại.';
    const amount = Number(values.amount);
    if (!order || typeof order.totalAmount !== 'number' || !Number.isFinite(order.totalAmount) || order.totalAmount <= 0 || !Number.isFinite(amount) || amount <= 0 || amount !== order.totalAmount) return 'Số tiền thực nhận phải lớn hơn 0 và bằng tổng tiền đơn hàng.';
  }
  if (resourceKey === 'refunds') {
    const payment = references.payments?.find(item => item.id === Number(values.paymentId));
    if (!payment || Number(values.refundAmount) <= 0 || Number(values.refundAmount) > Number(payment.amount)) return 'Số tiền hoàn phải lớn hơn 0 và không vượt quá thanh toán.';
  }
  return null;
}
