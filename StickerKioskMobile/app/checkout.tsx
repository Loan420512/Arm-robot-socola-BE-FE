import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { money, platesForTemplate, useCatalog, activeTemplates } from '../src/catalog';
import {
  createPayOsInvoice,
  paymentIsPaid,
  rememberedPay,
  rememberPay,
  registerCustomer,
  retryPayOsInvoice,
  sameMoney,
  type Contact,
  type PayResult,
} from '../src/pay';
import { useSelection } from '../src/selection';
import { colors, styles } from '../src/theme';

const phonePattern = /^\+?[0-9]{8,15}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function contactOf(fullName: string, phone: string, email: string): Contact | string {
  const name = fullName.trim();
  const tel = phone.trim();
  const mail = email.trim();
  if (!name || name.length > 100) return 'Vui lòng nhập họ và tên.';
  if (!phonePattern.test(tel)) return 'Số điện thoại cần từ 8 đến 15 chữ số, có thể bắt đầu bằng +.';
  if (!emailPattern.test(mail) || mail.length > 100) return 'Vui lòng nhập email hợp lệ.';
  return { fullName: name, phone: tel, email: mail };
}

export default function CheckoutScreen() {
  const catalog = useCatalog();
  const selection = useSelection();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [pay, setPay] = useState<PayResult | null>(null);
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState<'contact' | 'pay' | 'retry' | null>(null);
  const [error, setError] = useState('');
  const templates = catalog.status === 'ready' ? activeTemplates(catalog.catalog) : [];
  const template = templates.find((item) => item.id === selection.templateId);
  const plate = catalog.status === 'ready' ? platesForTemplate(catalog.catalog, template).find((item) => item.id === selection.plateId) : undefined;
  const color = catalog.status === 'ready' && plate ? catalog.catalog.colors.find((item) => item.id === plate.colorId && item.isActive === true) : undefined;
  const ready = Boolean(template && plate && color && typeof plate.price === 'number');

  useEffect(() => {
    if (!plate || typeof plate.price !== 'number') return;
    const saved = rememberedPay();
    if (!saved || saved.plateId !== plate.id || !sameMoney(saved.amount, plate.price)) {
      if (saved && saved.plateId !== plate.id) rememberPay(null);
      return;
    }
    let cancelled = false;
    void paymentIsPaid(saved.orderId).then((alreadyPaid) => {
      if (cancelled) return;
      if (alreadyPaid) {
        rememberPay(null);
        return;
      }
      setPay(saved);
    }).catch(() => {
      if (!cancelled) rememberPay(null);
    });
    return () => { cancelled = true; };
  }, [plate]);

  useEffect(() => {
    if (!pay || paid) return;
    let stopped = false;
    const check = () => {
      void paymentIsPaid(pay.orderId).then((isPaid) => {
        if (stopped || !isPaid) return;
        setPaid(true);
        rememberPay(null);
      }).catch(() => undefined);
    };
    check();
    const timer = setInterval(check, 4000);
    return () => { stopped = true; clearInterval(timer); };
  }, [paid, pay]);

  async function saveContact() {
    const contact = contactOf(fullName, phone, email);
    if (typeof contact === 'string') { setError(contact); return; }
    setBusy('contact');
    setError('');
    try {
      setCustomerId(await registerCustomer(contact));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa lưu được thông tin.');
    } finally {
      setBusy(null);
    }
  }

  async function payNow() {
    if (!ready || !template || !plate || typeof plate.price !== 'number') return;
    const contact = contactOf(fullName, phone, email);
    if (typeof contact === 'string') { setError(contact); return; }
    setBusy('pay');
    setError('');
    setPaid(false);
    setPay(null);
    rememberPay(null);
    try {
      setPay(await createPayOsInvoice(contact, plate.id, template.id, plate.price));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không tạo được link thanh toán PayOS.');
    } finally {
      setBusy(null);
    }
  }

  async function retry() {
    if (!ready || !plate || typeof plate.price !== 'number' || !template) return;
    if (!pay || !sameMoney(pay.amount, plate.price)) {
      await payNow();
      return;
    }
    setBusy('retry');
    setError('');
    try {
      setPay(await retryPayOsInvoice(pay.orderId, plate.id, plate.price));
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Không tạo được mã thanh toán mới.';
      if (message.includes('Giá dĩa đã thay đổi')) {
        setBusy(null);
        await payNow();
        return;
      }
      setError(message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
        <Text style={styles.cardTitle}>{template?.templateName?.trim() || 'Chưa chọn mẫu'}</Text>
        <Text style={styles.meta}>{plate ? `${plate.sku || 'Dĩa'} · ${color?.colorName || 'màu chưa rõ'} · còn ${plate.stockQuantity}` : 'Chưa chọn dĩa còn hàng.'}</Text>
        <Text style={styles.price}>{ready ? money(plate?.price) : 'Chưa xác nhận giá'}</Text>
        <Text style={styles.body}>Lưu liên hệ chỉ giữ hồ sơ. Tạo mã PayOS mới luôn mở một hóa đơn mới. Tạo lại mã chỉ dùng lại đơn đang chờ khi giá dĩa không đổi.</Text>
        <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="Họ và tên" placeholderTextColor={colors.ink3} autoComplete="name" />
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Số điện thoại" placeholderTextColor={colors.ink3} keyboardType="phone-pad" />
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.ink3} autoCapitalize="none" keyboardType="email-address" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {customerId !== null ? <Text style={styles.success}>Đã lưu liên hệ, mã hồ sơ #{customerId}. Chưa thu tiền.</Text> : null}
        <Pressable style={[styles.ghost, busy || !ready ? styles.disabled : null]} disabled={busy !== null || !ready} onPress={() => { void saveContact(); }}>
          <Text style={styles.ghostText}>{busy === 'contact' ? 'Đang lưu…' : 'Lưu thông tin liên hệ'}</Text>
        </Pressable>
        {pay ? (
          <>
            <Text style={styles.success}>{paid ? 'PayOS đã ghi nhận thanh toán.' : `Mã đơn ${pay.orderCode}. Số tiền ${money(pay.amount)}.`}</Text>
            <Text style={styles.meta}>{paid ? 'Hóa đơn này đã thanh toán. Lần thanh toán sau sẽ là một hóa đơn mới.' : 'Mở trang PayOS để quét mã. Màn hình này tự cập nhật khi tiền về.'}</Text>
            {!paid ? (
              <Pressable style={styles.button} onPress={() => { void Linking.openURL(pay.checkoutUrl); }}>
                <Text style={styles.buttonText}>Mở trang thanh toán PayOS</Text>
              </Pressable>
            ) : null}
            {!paid ? (
              <Pressable style={[styles.ghost, busy ? styles.disabled : null]} disabled={busy !== null} onPress={() => { void retry(); }}>
                <Text style={styles.ghostText}>{busy === 'retry' ? 'Đang tạo mã mới…' : 'Tạo lại mã thanh toán'}</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable style={[styles.button, busy || !ready ? styles.disabled : null]} disabled={busy !== null || !ready} onPress={() => { void payNow(); }}>
            <Text style={styles.buttonText}>{busy === 'pay' ? 'Đang tạo hóa đơn…' : 'Tạo hóa đơn PayOS mới'}</Text>
          </Pressable>
        )}
        {!ready ? <Text style={styles.meta}>Chọn mẫu đang dùng và dĩa còn hàng, đúng màu đang bán, trước khi thanh toán.</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
