import { Link } from 'react-router-dom';
import { Coins, Receipt } from '@phosphor-icons/react';
import { money } from '../format';

export function CheckoutPayment({ price, ready }: { price: number | null | undefined; ready: boolean }) {
  return <section className="checkout-payment" aria-labelledby="checkout-payment-title">
    <div className="checkout-payment-heading"><h2 id="checkout-payment-title">Thanh toán</h2><span className="status-badge status-pending">Chưa thu tiền</span></div>
    <dl className="checkout-payment-price"><div><dt>Giá dĩa theo danh mục</dt><dd>{ready ? money(price) : 'Chưa xác nhận'}</dd></div></dl>
    <div className="checkout-payment-method"><Coins size={25} aria-hidden="true" /><div><h3>Tiền mặt tại xưởng</h3><p>Nhân viên xác nhận đơn và ghi nhận thanh toán sau khi thực sự nhận đủ tiền.</p></div></div>
    <p className="checkout-payment-help">Website chưa hỗ trợ thanh toán trực tuyến. Gửi thông tin bên dưới chỉ lưu liên hệ, chưa đặt đơn hoặc thu tiền.</p>
    <details className="checkout-cashier"><summary><Receipt size={18} aria-hidden="true" />Dành cho nhân viên thu ngân</summary><p>Đăng nhập Admin, chọn đơn hàng và xác nhận số tiền mặt đã thực nhận.</p><Link className="text-link" to="/quan-ly/payments?new=1">Mở ghi nhận thanh toán</Link></details>
  </section>;
}
