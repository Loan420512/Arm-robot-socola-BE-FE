# ChocoRobot Studio

> Cập nhật API-only: mẫu/dĩa/màu/giá/tồn kho trong homepage, studio và checkout hiện lấy từ API thật. Không còn các preset hay palette sản phẩm viết sẵn. Theo phạm vi được người dùng cho phép, bốn GET danh sách catalog được mở công khai; API rỗng giữ trạng thái rỗng, không có dữ liệu mẫu thay thế. Xem [báo cáo API-only](docs/api-only-integration.md).

Frontend React/TypeScript cho hệ thống quản lý dĩa trang trí chocolate. Mã frontend nằm ở nhánh **`fe`** và kết nối tới backend ChocoRobot ở nhánh **`BE` viết hoa**. Backend StickerRobot ở `main`/`be` chữ thường có hợp đồng API khác, không dùng với giao diện này.

## Chạy local

Cài Node.js tương thích với phiên bản Vite trong `package-lock.json` và npm. Tại thư mục `StickerKiosk`:

```powershell
npm ci
npm run dev
```

Mở `http://localhost:5173`. Vite giữ cố định cổng `5173`; nếu cổng đang được dùng, dừng tiến trình cũ trước khi chạy lại.

Khởi động backend **ở một checkout riêng của nhánh `BE`**. Theo cấu hình local mặc định, API nhận HTTP tại `http://127.0.0.1:5143`; Swagger nằm tại `/swagger`. Backend cần .NET 8, SQL Server với `ChocoRobotDB`, khóa JWT và tài khoản Admin đã được cấu hình. Xem `README.md` và `STARTUP.md` của nhánh `BE` cho các bước cụ thể. Chạy frontend không tự cài SQL Server, tạo database, tạo Admin hoặc thêm dữ liệu mẫu.

Trong development, Vite chuyển tiếp `/api` và `/uploads` tới `http://127.0.0.1:5143`. Muốn dùng một địa chỉ backend khác, cấp biến môi trường **cho tiến trình Vite** trước khi chạy:

```powershell
$env:CHOCO_API_URL = 'http://127.0.0.1:5143'
npm run dev
```

`CHOCO_API_URL` được đọc trong `vite.config.ts` qua `process.env`. Cấu hình này không tự nạp giá trị từ tệp `.env`; đặt biến trong terminal hoặc môi trường chạy. Đây là địa chỉ proxy development, không phải khóa bí mật hay địa chỉ được đóng gói vào trình duyệt.

## Các trang

| Đường dẫn | Nội dung |
| --- | --- |
| `/dang-nhap` | Đăng nhập Admin |
| `/dang-ky` | Đăng ký thông tin liên hệ khách hàng, không tạo tài khoản |
| `/` | Homepage công khai, xem giới thiệu/cảm hứng mà không cần đăng nhập |
| `/trai-nghiem` | Studio 3D: thư viện API, dĩa/giá/tồn kho thật; nét tự vẽ chỉ là đầu vào người dùng |
| `/thanh-toan-mau` | Checkout công khai, nhập thông tin liên hệ sau khi chọn mẫu |
| `/yeu-cau-xit` | Khu tiếp nhận đơn theo mẫu có sẵn dành cho Admin |
| `/quan-tri` | Dashboard doanh thu, đơn hàng và hoạt động, yêu cầu Admin |
| `/dia` | Bộ sưu tập dĩa, tìm kiếm và lọc loại/màu/giá |
| `/mau-chocolate` | Thư viện mẫu, ảnh xem trước và thành phần thiết kế |
| `/danh-muc` | Truy cập loại dĩa, màu, chi tiết mẫu, đội ngũ và Admin |
| `/quan-ly/:resourceKey` | Danh sách, tạo, xem và các thao tác được API hỗ trợ |
| `/tai-khoan` | Thông tin tài khoản và đổi mật khẩu |

Các `resourceKey` hợp lệ: `plates`, `plate-types`, `plate-colors`, `choco-templates`, `template-elements`, `customers`, `orders`, `payments`, `refunds`, `cash-flow-audits`, `staff`, `admin`, `incident-reports`.

Trang quản lý hỗ trợ `?new=1` để mở biểu mẫu tạo và `?edit=<id>` để mở bản ghi cần sửa. Các đường dẫn StickerRobot cũ chuyển sang trang ChocoRobot tương ứng. `?view=<id>` mở chi tiết bản ghi; bảng quản lý giữ tìm kiếm và phân trang trên URL (`q`, `page`, `pageSize`).

## Dữ liệu và quyền truy cập

Homepage `/` mở công khai và không gọi API quản trị. Nút “Đăng nhập Admin” ở đầu trang mở `/dang-nhap`; đăng nhập này chỉ dành cho quản trị viên. Customer không cần tài khoản: xem/chọn/vẽ mẫu 3D rồi nhập họ tên, điện thoại và email ở bước thanh toán. Dashboard chuyển sang `/quan-tri`; đăng nhập Admin thành công mặc định trở về đây, hoặc về trang quản lý đã yêu cầu trước đó. URL không tồn tại hiển thị trang 404 công khai. Toàn bộ API quản trị hiện yêu cầu JWT với role **Admin**. Đăng ký liên hệ công khai dùng `POST /api/customers` với `{fullName, phone, email}`, nhận `{customerId}`; không tạo tài khoản hoặc JWT. CRUD hồ sơ khách hàng dùng `/api/admin/customers`. Sau khi đăng nhập thành công, frontend lưu token cùng thời điểm hết hạn và thông tin tài khoản trong `sessionStorage`, xác minh phiên bằng `/api/auth/me`, thêm Bearer token vào các request cùng origin, và yêu cầu đăng nhập lại khi hết phiên hoặc nhận 401. Đăng xuất xóa phiên trên trình duyệt. Mật khẩu, token thực tế và thông tin đăng nhập database không nằm trong mã nguồn hay tài liệu này; giao diện không có tài khoản đăng nhập mặc định.

Danh sách, bộ lọc, dropdown tham chiếu, dashboard và ảnh mẫu sử dụng dữ liệu API thật. Khi API không truy cập được hoặc danh sách rỗng, giao diện hiển thị lỗi/trạng thái rỗng, không thay bằng dữ liệu mẫu. Homepage dùng hình dĩa minh họa. Studio 3D dùng mô hình GLB do người dùng cung cấp, mô phỏng chuyển động khớp và đầu phun theo nét vẽ; đây không phải điều khiển robot thật hay kết quả đã được hiệu chuẩn. Mẫu và màu dĩa nghiệp vụ lấy từ API. Nét tự vẽ là đầu vào người dùng, không được dùng thay cho mẫu catalog hoặc đường chạy của mẫu API.

Các giới hạn nghiệp vụ được giữ theo backend:

- Đơn hàng chỉ sửa nội dung khi `Pending`. Chuyển hợp lệ: `Pending → Processing/Cancelled`, `Processing → Completed/Cancelled`. Bắt đầu xử lý trừ kho; hủy đơn đang xử lý trả kho. Không có thao tác xóa đơn.
- Thanh toán chỉ ghi nhận **Cash đã thực sự nhận đủ**, với ô xác nhận không được chọn sẵn. Số tiền phải bằng tổng đơn; mỗi đơn chỉ một thanh toán. Không có chức năng sửa/xóa thanh toán hay mô phỏng thanh toán online.
- Hoàn tiền chỉ tạo cho thanh toán thành công và trong giới hạn số tiền đã nhận. Yêu cầu `Pending` có thể duyệt hoặc từ chối; **Approved không có nghĩa đã thực hiện chuyển tiền hoàn**. Không có thao tác giả đánh dấu đã hoàn tiền.
- Đối soát gửi ngày và hai giá trị `expectedRevenue`, `expectedRefund`. Tổng thực tế và kết quả do backend tính; frontend không ghi đè các tổng này.
- Sự cố chỉ tiến từ `Open → In Progress/Resolved` hoặc `In Progress → Resolved`. Nhân viên và màu có thao tác kích hoạt/tạm ngưng. Không cho xóa Admin đang đăng nhập.
- Ảnh xem trước mẫu tải qua `/api/choco-templates/upload-image`, nhận PNG/JPEG tối đa 5 MB. Mẫu vẫn cần đường dẫn ảnh và đường dẫn G-code. Frontend không sinh G-code hoặc điều khiển robot.

## Cấu trúc frontend

```text
src/main.tsx                  React, router và AuthProvider
src/choco/ChocoApp.tsx         Khung ứng dụng, đăng nhập, tài khoản, routes
src/choco/api.ts               HTTP, JWT session, phân trang, truy vấn hủy được
src/choco/auth.tsx             Theo dõi và xác minh phiên Admin
src/choco/PublicHome.tsx       Homepage và điều hướng công khai
src/choco/public.css           Giao diện homepage responsive
src/choco/DashboardPage.tsx    Thống kê từ API dashboard
src/choco/CatalogPage.tsx      Bộ sưu tập dĩa
src/choco/TemplatesPage.tsx    Thư viện mẫu và chi tiết thiết kế
src/choco/ResourcePage.tsx     Danh sách, biểu mẫu, upload và thao tác quản lý
src/choco/resources.ts         Trường DTO, tham chiếu và quy tắc từng tài nguyên
src/choco/format.ts            Tiền tệ, thời gian và tên trạng thái
src/choco/styles.css           Giao diện responsive
src/choco/tokens.css           Màu sắc, font và spacing của design system
src/choco/base.css             Quy tắc nền, focus và reduced motion
```

## Kiểm tra và build

```powershell
npm run build
npm test
npm run lint
```

`build` kiểm tra TypeScript và tạo bundle ở `dist/`. Các kiểm tra trong `src/choco` xác minh hợp đồng HTTP/phiên đăng nhập và các request/quy tắc biểu mẫu. Dữ liệu tạo trong test chỉ là input kiểm tra, không được dùng làm nguồn dữ liệu ứng dụng. Các test này không thay thế kiểm thử đăng nhập và CRUD với SQL Server thật.

## Triển khai

Phục vụ `dist/` bằng web server có fallback route SPA về `index.html`. Cấu hình reverse proxy cùng origin cho **`/api` và `/uploads`** tới backend ChocoRobot, đồng thời dùng HTTPS cho môi trường triển khai. Proxy của `npm run dev` không đi vào bundle production; `CHOCO_API_URL` không tự cấu hình máy chủ production. Tránh để fallback SPA xử lý nhầm request API hoặc ảnh upload.

Các thay đổi giao diện được phát triển trên **nhánh `fe`**; chỉ commit hoặc push khi được cho phép. Backend được chạy từ checkout nhánh `BE` riêng; phần frontend này không sửa mã nguồn backend hoặc thay đổi schema database.

## Kết quả kiểm tra phiên redesign

Xem [Backend và hợp đồng API](docs/backend-api-verification.md) và [báo cáo Frontend/QA](docs/redesign-verification.md). Các giới hạn kiểm thử được ghi riêng; unit test không thay thế E2E với tài khoản Admin thật.

## Studio 3D và guest checkout

Xem [báo cáo studio 3D](docs/studio-3d-verification.md). Lựa chọn ID mẫu/dĩa và nét tự vẽ được lưu trong sessionStorage của tab. Tên, ảnh, giá và tồn kho được đọc lại từ API. Mẫu tự vẽ không được coi là mẫu xưởng có thể đặt. Checkout gọi public `POST /api/customers` để lưu ba thông tin liên hệ; API hiện tại chưa nhận bản vẽ tùy chỉnh, đặt đơn công khai hoặc thanh toán trực tuyến. Không có giả lập thành công thanh toán.

Các GLB được sao chép nguyên bản từ thư mục Threejs người dùng cung cấp. Giấy phép/attribution nằm ở `public/models/choco/README.md`; robot dùng CC BY-NC 4.0. Three.js được tải theo route studio, không tải mô hình robot trong homepage.

## FAQ và nguồn dữ liệu hiện tại

Tiêu đề “Trước khi bắt đầu” là câu đầy đủ, không dùng ngắt dòng bị ẩn trên mobile. FAQ được bố trí lại hai cột trên desktop và một cột trên mobile. Thư viện homepage gọi GET/choco-templates; studio và checkout gọi thêm GET/plates,/plate-colors,/plate-types, xử lý riêng loading/error/empty. Bốn GET danh sách catalog hiện được mở công khai theo sự cho phép mới; các GET chi tiết và mọi thao tác tạo/sửa/xóa vẫn cần Admin. Không đổi hợp đồng dữ liệu hoặc schema.

## Ngoại lệ Backend đã được cho phép

Người dùng đã cho phép mở API đọc catalog công khai. Bốn GET danh sách mẫu/dĩa/loại/màu hiện không cần đăng nhập; detail và mọi thao tác ghi vẫn Admin. Thay đổi local nằm trong checkout BE riêng, gồm4controller và test phân quyền, chưacommit/push. Ngoài phạm vi này, Backend/config/schema/data không được sửa. Database Docker hiện chưa có bản ghi catalog; cần nhập dữ liệu thật qua quản trị để có mẫu hiển thị.

## Bốn mẫu cơ bản đã nạp

Đã có trái tim, hoa năm cánh, xoắn ốc và ba đường sóng trong database. Studio lấy record qua API và đọc tệp G-code tương ứng để mô phỏng3D, không dựng lại preset theo tên. Chọn mẫu tại `/trai-nghiem`, rồi bấm **Xem mô phỏng**. Chi tiết nạpSQL, references, assets và kiểm thử ở [basic-template-seed-report.md](docs/basic-template-seed-report.md). Mô phỏng không vận hành robot thật. Chưa có sản phẩm dĩa, giá hoặc tồn kho để đặt hàng.

## Máy 3D đúng theo dự án Threejs nguồn

Studio hiện dùng nguyên cụm `createDispenserToolhead()` từ `C:/Users/thong/Downloads/Threejs/src/main.js` (đầu kim, barrel, piston, bracket, mô-tơ, LED, ống dẫn), không còn ghép KUMA với đầu phun mới. Snapshot nguồn và kiểm tra geometry/material parity nằm trong `src/choco/studio/vendor/threejs/`. Timeline hạ/vẽ/nâng/chuyển/thu về giữ thời gian và easing mẫu gốc, đường vẽ vẫn lấy từ G-code do API trả về.

Chi tiết và xác minh: [source-threejs-integration.md](docs/source-threejs-integration.md). Dĩa `dish.glb` vẫn là asset người dùng cung cấp, tách biệt với máy. Source Downloads không sửa; Backend/database không thay đổi trong lượt tích hợp máy này.

## Trạng thái dữ liệu sau yêu cầu gỡ mẫu

Đã gỡ4mẫu và2reference do agent thêm; DB Docker hiện chỉ còn Admin và chưa có catalog. Bản gốc có1mẫu/1dĩa người dùng nhắc chưa được định vị, cần server hoặc tệpbackupđúng để dùng lại. Không tự seed hoặc dựng dữ liệu thay thế. Xem [báo cáo cleanup và backup](docs/basic-template-cleanup-report.md).

## Database hiện tại từ script người dùng

Đã nhập dữ liệu từ Downloads/script.sql:1mẫu HappyBirthday,1dĩa PLATE-001(50000đ,tồn100),1loại dĩa,10màu và dữ liệu liên quan. GiữAdminđang dùng; không dựng lại schema. Xem [báo cáo import dữ liệu gốc](docs/original-script-data-import.md). URLmedia/G-code trong nguồn chưa tải được nên mẫu gốc chưa mô phỏng; không có dữ liệu thay thế.

## Mô phỏng theo cấu trúc database mới

Đã bỏ G-code khỏi luồng dựng/mô phỏng. Studio đọc TEMPLATE_ELEMENT theo API, dùng elementName/positionX/positionY/scale để dựng chữ trong khung bố cục200x200, không tải tệp đính kèm cũ. Thumbnail,3Dvàcheckout dùng chung cách dựng. Chi tiết quyước/giới hạn và kiểm thử ở [database-template-layout.md](docs/database-template-layout.md). GET bố cục theo mẫu được mở công khai theo sự cho phép mới, mọi thao tác ghi vẫnAdmin.

## Kiểm tra phần thanh toán

Checkout hiện có khối Thanh toán gồm giá API, trạng thái chưa thu tiền và hướng dẫn tiền mặt tại xưởng. Lối vào thu ngân yêu cầu Admin. Customer vẫn chưa thể tạo đơn/chi trả tự phục vụ vì BE chưa có public checkout; lưu liên hệ không phải thanh toán. Kết quả và hợp đồng cần bổ sung ở [payment-verification.md](docs/payment-verification.md).
