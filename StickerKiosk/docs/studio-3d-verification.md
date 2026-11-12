# Studio chocolate 3D và checkout không đăng nhập

> Bản báo cáo giai đoạn trước. Cập nhật mới: các preset/chocolate palette đã được loại khỏi runtime; thư viện nghiệp vụ chuyển sang API. Xem [báo cáo hiện tại](api-only-integration.md). Phần kiểm tra hình học cũ không có nghĩa các preset vẫn được dùng.

Ngày 12/11/2026, Asia/Saigon. Chỉ chỉnh Frontend trên `fe`, không commit/push.

## Luồng hiện tại đã chốt

Homepage công khai `/` → thử và chỉnh mẫu tại `/trai-nghiem` → bấm **Tiếp tục thanh toán** → nhập họ tên, số điện thoại và email tại `/thanh-toan-mau`. Customer không cần tài khoản, password hay phiên đăng nhập. Đề xuất Customer login trước đó đã bị thay thế, không triển khai.

Đăng nhập Admin `/dang-nhap` và các API quản trị được giữ riêng. `/yeu-cau-xit` là khu tiếp nhận Admin dùng API đơn hàng hiện có, không nằm trong luồng checkout của khách.

## Mẫu Three.js và chức năng

- Đọc mẫu người dùng cung cấp tại `C:/Users/thong/Downloads/Threejs`.
- Sao chép nguyên bản `dish.glb` và `kuma_heavy_robot_r-9000s.glb` vào `public/models/choco/`; SHA-256 nguồn và bản sao giống nhau. Không sửa thư mục Downloads.
- Dùng Three.js `0.170.0`, tương ứng phiên bản mẫu nguồn; viewer được nạp theo route để homepage không tải GLB robot.
- Mô hình dĩa và cánh tay robot thật từ GLB, vật liệu/ánh sáng tông ấm, đường chocolate nổi trên bề mặt dĩa. Camera fit theo kích thước mô hình và viewport.
- Có mẫu trái tim, hoa, xoắn ốc, sóng và tự vẽ bằng pointer; chocolate sữa/đen/trắng, bốn màu dĩa, kích thước, góc xoay, độ dày nét và bỏ nét vừa vẽ.
- Có góc nghiêng/nhìn trên, kéo xoay/thu phóng, đặt lại góc nhìn, hiện/ẩn robot, mô phỏng có pause/continue, tiến độ và tốc độ. Khớp robot đi theo đầu phun ở mức mô phỏng, không hiệu chuẩn phần cứng, không sinh G-code hoặc điều khiển thiết bị.
- Bản phối lưu trong sessionStorage của tab, giữ nguyên khi sang checkout và quay lại. Tối đa30 nét,500 điểm/nét; dữ liệu lưu được kiểm tra/giới hạn trước khi dựng hình.
- Desktop dùng vùng 3D lớn cạnh panel; mobile đưa mô hình lên trước các controls. Có trạng thái tải dĩa/robot, lỗi tải và WebGL fallback.

Attribution được hiển thị trong viewer và `public/models/choco/README.md`. Dĩa CC BY4.0; robot **CC BY-NC4.0**, có giới hạn sử dụng phi thương mại. Các điều chỉnh màu/bố trí/pose diễn ra trong runtime.

## API và giới hạn thanh toán

Checkout gọi API thật `POST /api/customers` với đúng `{fullName,phone,email}`, nhận `{customerId}`. Có validation, chống gửi lặp khi đang xử lý, busy/error và success theo receipt hợp lệ.

API hiện tại chỉ lưu thông tin liên hệ. Nó chưa nhận bản vẽ3D, chưa tạo đơn guest, chưa tính giá theo bản phối hoặc thanh toán online. UI nói rõ chưa gửi bản thiết kế/chưa tạo đơn/chưa ghi nhận thanh toán, không giả thành công. Dữ liệu liên hệ nhập trong form không được xem là phiên xác thực.

Mẫu, palette và nét vẽ trong studio là công cụ thiết kế cục bộ, không phải mock catalog hoặc mock API. API catalog/order/payment quản trị vẫn giữ nguyên hợp đồng và JWT Admin. Chi tiết phần thiếu: [guest-checkout-api-gap.md](guest-checkout-api-gap.md).

## Database được người dùng xác nhận

BE dùng `ChocoRobotDB` trên Docker `127.0.0.1:1433`, container `chocorobot-sql`. User Secrets ghi đè địa chỉ `localhost\MSSQLSERVER01` trong appsettings; người dùng đã xác nhận chọn Docker.

Truy vấn chỉ đọc trả đúng database name,13 bảng, ADMIN1,12 bảng nghiệp vụ0. Không đổi config/secrets/`.env`, schema hoặc dữ liệu. BE git status cuối sạch. Swagger đang chạy tại `http://127.0.0.1:5143/swagger/index.html`.

## Kiểm thử

- Production build đạt. Có warning bundle Three.js lớn hơn500KB; scene đã lazy load và robot GLB khoảng28MB là asset người dùng cung cấp, chỉ tải khi mở studio/hiện robot.
- Lint không có warning. Tổng51/51 tests đạt, gồm13 tests mới cho path generation/bounds, transform, validation, giới hạn stroke/point và lưu/khôi phục draft.
- Playwright thật đã kiểm tra chọn hoa, đổi chocolate/màu dĩa, góc nhìn trên, chạy/tạm dừng mô phỏng, tự vẽ, sang checkout không login/password và quay lại giữ nguyên draft.
- Sửa lỗi vẽ ở kích thước nhỏ: giới hạn pointer và vòng vẽ dùng cùng bán kính nhân `draft.size`, tránh nét co lại khi thả chuột.
- Checkout chặn họ tên chỉ khoảng trắng. Chưa gửi thông tin hợp lệ để tránh để lại hồ sơ thử khi không có credential Admin dọn dữ liệu; success201 mới được kiểm tra bằng contract/unit test.
- Desktop1440x1000 và mobile390x844 render đủ dĩa/robot, không clipping; kiểm tra320px không overflow hoặc controls ra ngoài màn hình. Input checkout mobile16px.
- Console sau tải sạch studio:0 errors,0 warnings. Assets GLB trả thành công. Guest preview không cần gọi API quản trị.
- Hallmark render studio/checkout ở1280/1440/1920/375; có waiver cho ô chọn mẫu trực quan cao100px. Checkout không có lỗi render. Không coi mô phỏng là kiểm thử robot hoặc thanh toán thật.

Screenshots trong `output/playwright/`: `studio-desktop.png`, `studio-mobile.png`, `checkout-desktop.png`, `checkout-mobile.png`, `scene-final-simulating.png`, `scene-final-top.png`. Các capture được ignore khỏi Git.

## File

Các module trong `src/choco/studio/`: `StudioPage`, `StudioHeader`, `PlateScene`, `scene`, `design`, `design.test`, `CheckoutPage`, `RequestPage`, `RequestPanel`, `studio.css`. Chỉnh route trong `ChocoApp`, CTA/FAQ trong `PublicHome`, thêm dependency Three.js và cập nhật tài liệu. Danh sách đầy đủ ở `session-file-changes.json` và `git-working-tree.txt`.

Không có file Backend bị chỉnh sửa; không merge/reset/force push hoặc commit/push.
