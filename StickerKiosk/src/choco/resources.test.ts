import { describe, expect, it } from 'vitest';
import { RESOURCES, incidentTransitions, initialValues, orderTransitions, referenceOptions, resourcePayload, validateResource } from './resources';

describe('ChocoRobot resource write contracts', () => {
  it('uses the protected admin customer route for management instead of public registration', () => {
    expect(RESOURCES.customers!.path).toBe('/admin/customers');
    const phone = RESOURCES.customers!.fields.find(field => field.key === 'phone')!;
    const pattern = new RegExp(`^(?:${phone.pattern})$`);
    expect(pattern.test('+84900000000')).toBe(true);
    expect(pattern.test('0900 000 000')).toBe(false);
    expect(pattern.test('123')).toBe(false);
  });

  it('sends order choices without client-controlled price, code, status or timestamp', () => {
    const row = { id: 4, customerId: 2, plateId: 3, chocoTemplateId: 8, totalAmount: 120000, status: 'Pending', orderCode: 'CR-existing', createdAt: '2026-11-11' };
    const values = initialValues(RESOURCES.orders!, row);
    expect(resourcePayload(RESOURCES.orders!, { ...values, status: 'Completed', totalAmount: '1' }, true, {})).toEqual({ customerId: 2, plateId: 3, chocoTemplateId: 8 });
  });

  it('requires a fresh explicit receipt confirmation and an exact payment amount', () => {
    const values = initialValues(RESOURCES.payments!, null);
    expect(values.cashReceivedConfirmed).toBe(false);
    const references = { orders: [{ id: 2, totalAmount: 90000, status: 'Pending' }] };
    expect(validateResource('payments', { ...values, orderId: '2', amount: '90000' }, references)).toMatch(/xác nhận/);
    expect(validateResource('payments', { ...values, orderId: '2', amount: '89999', cashReceivedConfirmed: true }, references)).toMatch(/bằng tổng tiền/);
    expect(validateResource('payments', { ...values, orderId: '2', amount: '90000', cashReceivedConfirmed: true }, references)).toBeNull();
    expect(values.paymentMethod).toBe('Cash');
    expect(RESOURCES.payments!.canEdit).toBe(false);
    expect(RESOURCES.payments!.canDelete).toBe(false);
  });

  it('rejects online methods, cancelled orders and duplicate payments before submission', () => {
    const values = { ...initialValues(RESOURCES.payments!, null), orderId: '2', amount: '50000', cashReceivedConfirmed: true };
    const order = { id: 2, totalAmount: 50000, status: 'Pending' };
    expect(validateResource('payments', { ...values, paymentMethod: 'VNPay' }, { orders: [order] })).toMatch(/tiền mặt/);
    expect(validateResource('payments', values, { orders: [{ ...order, status: 'Cancelled' }] })).toMatch(/đã hủy/);
    expect(validateResource('payments', values, { orders: [order], payments: [{ id: 5, orderId: 2, paymentStatus: 'Success' }] })).toMatch(/đã có thanh toán/);
  });

  it.each([null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])('does not accept a payment for an unavailable or invalid API amount: %s', totalAmount => {
    const values = { ...initialValues(RESOURCES.payments!, null), orderId: '2', amount: '0', cashReceivedConfirmed: true };
    expect(validateResource('payments', values, { orders: [{ id: 2, totalAmount, status: 'Pending' }] })).toMatch(/lớn hơn 0/);
  });

  it('uses audit expectations, requiring them to be entered again when recalculating', () => {
    const values = initialValues(RESOURCES['cash-flow-audits']!, { id: 1, auditDate: '2026-11-11', totalRevenue: 90000, totalRefund: 10000, status: 'Matched' });
    expect(values.expectedRevenue).toBe('');
    expect(values.expectedRefund).toBe('');
    expect(resourcePayload(RESOURCES['cash-flow-audits']!, { ...values, expectedRevenue: '120000', expectedRefund: '10000' }, true, {})).toEqual({ auditDate: '2026-11-11', expectedRevenue: 120000, expectedRefund: 10000 });
  });

  it('includes the staff admin association only for the backend update contract', () => {
    const values = { fullName: 'Nhân viên', employeeCode: 'NV-01', phone: '0900000000', position: 'Designer', isActive: true, adminId: '2' };
    expect(resourcePayload(RESOURCES.staff!, values, false, {})).not.toHaveProperty('adminId');
    expect(resourcePayload(RESOURCES.staff!, values, true, {})).toHaveProperty('adminId', 2);
  });

  it('never prefills admin passwords and rejects overlong UTF-8 passwords', () => {
    expect(initialValues(RESOURCES.admin!, { id: 2, username: 'admin', password: 'do-not-reuse' }).password).toBe('');
    expect(validateResource('admin', { password: 'ệ'.repeat(30) }, {})).toMatch(/72 byte/);
  });

  it('copies the chosen plate color instead of accepting a mismatched label', () => {
    const values = { typeId: '2', colorId: '3', sku: 'DIA-01', material: 'Sứ', color: 'wrong', price: '90000', stockQuantity: '4' };
    const payload = resourcePayload(RESOURCES.plates!, values, false, { 'plate-colors': [{ id: 3, colorName: 'Trắng' }] });
    expect(payload.color).toBe('Trắng');
  });
});

describe('allowed workflows and reference choices', () => {
  it('only offers supported forward order and incident transitions', () => {
    expect(orderTransitions('Pending')).toEqual(['Processing', 'Cancelled']);
    expect(orderTransitions('Processing')).toEqual(['Completed', 'Cancelled']);
    expect(orderTransitions('Completed')).toEqual([]);
    expect(orderTransitions('Cancelled')).toEqual([]);
    expect(incidentTransitions('Open')).toEqual(['In Progress', 'Resolved']);
    expect(incidentTransitions('In Progress')).toEqual(['Resolved']);
    expect(incidentTransitions('Resolved')).toEqual([]);
    expect(RESOURCES.orders!.canDelete).toBe(false);
    expect(RESOURCES.refunds!.canEdit).toBe(false);
    expect(RESOURCES.refunds!.canDelete).toBe(false);
  });

  it('offers active templates compatible with the selected plate type', () => {
    const field = RESOURCES.orders!.fields.find(item => item.key === 'chocoTemplateId')!;
    const references = {
      plates: [{ id: 1, typeId: 3 }],
      'choco-templates': [{ id: 11, plateTypeId: 3, isActive: true }, { id: 12, plateTypeId: 3, isActive: false }, { id: 13, plateTypeId: 4, isActive: true }],
    };
    expect(referenceOptions('orders', field, { plateId: '1' }, references).map(item => item.id)).toEqual([11]);
    expect(referenceOptions('orders', field, { plateId: '' }, references)).toEqual([]);
  });

  it('does not offer cancelled or already paid orders for a new payment', () => {
    const field = RESOURCES.payments!.fields.find(item => item.key === 'orderId')!;
    const references = { orders: [{ id: 1, status: 'Pending', totalAmount: 90000 }, { id: 2, status: 'Cancelled', totalAmount: 90000 }, { id: 3, status: 'Completed', totalAmount: 90000 }], payments: [{ id: 7, orderId: 3 }] };
    expect(referenceOptions('payments', field, {}, references).map(item => item.id)).toEqual([1]);
  });

  it('does not offer failed payments or repeat refunds', () => {
    const field = RESOURCES.refunds!.fields.find(item => item.key === 'paymentId')!;
    const references = { payments: [{ id: 1, paymentStatus: 'Success', amount: 90000 }, { id: 2, paymentStatus: 'Failed', amount: 90000 }, { id: 3, paymentStatus: 'Success', amount: 90000 }], refunds: [{ id: 6, paymentId: 3 }] };
    expect(referenceOptions('refunds', field, {}, references).map(item => item.id)).toEqual([1]);
    expect(validateResource('refunds', { paymentId: '1', refundAmount: '90001' }, references)).toMatch(/không vượt/);
  });
});
