# ChocoRobot: redesign và kiểm thử

Ngày: 12/11/2026, Asia/Saigon. Phạm vi chỉnh sửa: Frontend `StickerKiosk` trên branch `fe`.

## Backend BE

- Fetch remote và `git pull --ff-only origin BE` thành công, Already up to date, HEAD `2e6f800`.
- Dùng checkout BE riêng đang sạch, giữ nguyên tiến trình đang chạy PID 16628 tại `http://127.0.0.1:5143`.
- SQL Server Docker `chocorobot-sql`, database `ChocoRobotDB`: truy vấn thành công, 13 bảng; ADMIN có 1 bản ghi, 12 bảng nghiệp vụ còn lại rỗng.
- Swagger UI/JSON trả 200. Swagger chứa 80 operations, 38 GET; toàn bộ 38 GET khi chưa đăng nhập trả 401.
- Token không hợp lệ trả 401. Login với username không tồn tại trả 401, chứng minh truy vấn SQL qua API hoạt động. Login và đăng ký liên hệ thiếu trường trả 400 đúng validation envelope.
- CORS preflight trả 204 nhưng không có Allow-Origin; Frontend dùng proxy cùng origin `/api` và `/uploads`. Không đổi cấu hình CORS.
- Không sửa code, cấu hình, `.env`, dependency manifest, schema hoặc dữ liệu BE. Không migration, seed, reset Admin, mint JWT, commit hoặc push.
- Chi tiết request/response và lệnh kiểm tra: [backend-api-verification.md](backend-api-verification.md).

## Frontend và source audit

`fe` đã fetch/pull --ff-only, Already up to date tại `96f13fb`. Working tree ban đầu có sẵn migration Frontend chưa commit; đã lưu snapshot ngoài repository trước khi chỉnh sửa. Không chuyển branch trên working tree đang bẩn.

Kiến trúc được giữ: React 19, TypeScript, React Router 7, AuthProvider/context, JWT trong sessionStorage, HTTP client cùng origin, AbortController/timeout, hook useQuery, 13 resource definitions và form theo DTO. Không thêm state library, mock server hoặc dữ liệu nghiệp vụ hardcode.

| Route | Thay đổi giao diện/UX |
| --- | --- |
| `/dang-nhap` | AuthShell mới, biểu mẫu rõ ràng, hiện/ẩn mật khẩu, busy/error, hướng dẫn cấp tài khoản |
| `/dang-ky` | Đăng ký thông tin liên hệ bằng API thật, validation và thông báo kết quả theo customerId |
| `/` | Homepage công khai, giới thiệu/cảm hứng/quy trình/FAQ/liên hệ; không ép đăng nhập |
| `/quan-tri` | Dashboard quản trị: đơn hàng dẫn đầu, thống kê dạng hàng, 4 query độc lập, loading/error riêng |
| `/dia` | Layout danh mục, bộ lọc, skeleton, empty/error và chi tiết dĩa |
| `/mau-chocolate` | Layout thư viện, ảnh thật từ API, skeleton, empty/error và chi tiết/thành phần mẫu |
| `/danh-muc` | Điều hướng danh mục và đội ngũ theo design system chung |
| `/quan-ly/:resourceKey` | 13 màn quản lý, table/form/detail/confirm, skeleton/success/error, URL tìm kiếm/phân trang |
| `/tai-khoan` | Profile và đổi mật khẩu trong bố cục thống nhất |
| Trang không tồn tại và route cũ | Giữ fallback và redirect đã có |

13 tài nguyên: plates, plate-types, plate-colors, choco-templates, template-elements, customers, orders, payments, refunds, cash-flow-audits, staff, admin, incident-reports.

Component chính được tạo/sửa: AuthShell, RegisterPage, Workspace, LoginPage, DashboardPage, QueryError, LedgerSkeleton, RevenueChart, CatalogPage, TemplatesPage, ResourcePage. Thêm `tokens.css`, `base.css`, khóa hướng thiết kế trong `design.md`; sửa import không tồn tại của PublicHome bằng PlateArt hiện có. PublicHome vốn chưa được đăng ký route, không đưa các đường dẫn thử phối chưa có logic vào giao diện chạy thật.

Navbar có breadcrumb theo trang, menu mobile có Escape/focus trap/trả focus và inert nền. Sidebar dùng nền cacao, nền nội dung kem, action đất nung, font Be Vietnam Pro. CSS responsive cho bảng, grid, dialog, profile và auth; header/sidebar chuyển ở ngưỡng 960px thống nhất với JavaScript. Input mobile 16px và targets từ 44px.

## API đã tích hợp và đối chiếu

- Sửa lỗi thực tế: quản trị khách hàng dùng `/api/admin/customers`; `/api/customers` chỉ là POST đăng ký liên hệ công khai.
- `registerCustomer` chỉ gửi fullName/phone/email đã trim, xác thực receipt `{customerId}`, không tạo session hoặc gửi Bearer token.
- Giữ login `/api/auth/login`, xác minh `/api/auth/me`, đổi mật khẩu `/api/auth/change-password` và các API quản trị đã có. Giữ JWT, hết hạn phiên, 401/403, timeout/cancellation và lỗi validation.
- Dashboard dùng `/dashboard/overview`, `/dashboard/revenue`, `/dashboard/orders-statistics`, `/orders`. Lỗi một vùng không biến thành số 0 hoặc thông báo danh sách rỗng.
- Đã đối chiếu trường CRUD của 13 resource với DTO và business rules BE: trạng thái đơn/sự cố, tồn kho, xác nhận Cash thực nhận, giới hạn hoàn tiền, đối soát và ảnh upload.
- Tìm kiếm/phân trang bảng lưu trong `q`, `page`, `pageSize`; `?view=<id>` mở chi tiết, kể cả đơn đã hoàn thành. Giữ `?new=1` và `?edit=<id>`.

## Kết quả kiểm thử

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| Production build | PASS: TypeScript và Vite build |
| Lint | PASS, không cảnh báo oxlint |
| Unit tests | 38/38 PASS, 2 files |
| Whitespace diff | `git diff --check` không có lỗi |
| HTTP qua Vite | `/api/auth/login {}` ->400; `/api/customers {}` ->400; `/api/admin/customers` chưa có token ->401, đúng BE envelope |
| Playwright login sai | API thật trả401, UI hiển thị thông báo tiếng Việt, submit hoạt động lại |
| Playwright password toggle | PASS, hiện/ẩn và aria-pressed cập nhật |
| Playwright mất mạng | PASS, UI hiển thị lỗi kết nối, không treo nút; đã trả browser về online |
| Playwright register validation | PASS, tên chỉ khoảng trắng bị chặn trước HTTP; required/type/pattern theo form |
| Playwright route guard | 18 route quản trị đều redirect về `/dang-nhap` khi chưa có session |
| Responsive auth | Kiểm tra 390x844, 768x1024, 1440x900; không tràn ngang; login mobile submit trong viewport, input16px |
| Console khi tải sạch | Không có JS error hoặc warning; 401/offline errors trong negative tests là chủ đích |
| Hallmark | 8 file UI và 2 auth routes, render 1280/1440/1920/375: 0 FAIL, 1 WARN, 3 ANSWERED |
| Code review Standards | Các lỗi focus, active-hover contrast và breakpoint đã sửa; không còn lỗi actionable trong review cuối |
| Code review Spec | Không tìm thấy handler nghiệp vụ bị mất hoặc contract bị thay đổi |

Unit tests dùng transport giả lập trong môi trường test để kiểm tra request/validation/session; ứng dụng chạy thật không có mock API hay mock business data. Không coi unit tests là xác nhận CRUD trên SQL.

Hallmark còn cảnh báo 28a về `loading="lazy"` của ảnh thumbnail trong bảng ResourcePage. Giữ lazy load cho ảnh bảng; không coi đây là ảnh hero/LCP. Các ghi chú F7/F25 giải thích form recipe dùng chung và lược phần giới thiệu lặp lại trên mobile. Render các màn quản trị sau đăng nhập chưa được xác minh.

Screenshot nằm trong `output/playwright`: login-before, login-desktop, login-tablet, login-mobile, register-desktop, register-tablet, register-mobile. Capture/log tự sinh được ignore khỏi Git.

## Phần chưa thể xác minh

Homepage `/` đã được tách khỏi Auth guard theo yêu cầu mới. Dashboard chuyển sang `/quan-tri`, sidebar/breadcrumb/default login destination được cập nhật; route quản lý vẫn bảo vệ JWT và giữ return destination. Public404 không ép đăng nhập.

Chưa có thông tin đăng nhập Admin thật. Chưa kiểm thử login200, profile/đổi mật khẩu, CRUD qua UI/SQL, lỗi403 bằng tài khoản khác hoặc responsive/console/network của các trang sau đăng nhập. Không bypass guard, tạo JWT hoặc đổi mật khẩu để vượt giới hạn này.

BE chỉ hỗ trợ tài khoản Admin, không có đăng ký account công khai hay login Customer/Staff. `/dang-ky` được ghi rõ là đăng ký liên hệ. Muốn tài khoản/role mới cần quyết định về API contract; phiên này không đổi contract.

Chưa gửi đăng ký hợp lệ để tránh để lại hồ sơ thử khi chưa có phiên Admin dọn dữ liệu. Vì vậy success state đăng ký được kiểm tra ở mức hợp đồng/unit test, chưa xác minh end-to-end201.

Các kiểm tra còn lại cần username/password Admin dành cho kiểm thử và dữ liệu/thỏa thuận tạo dữ liệu kiểm thử. Cả BE5143 và Vite5173 được giữ chạy.

## Git và file thay đổi

Branch hiện tại: `fe`. Không commit, push, merge, reset hoặc force push.

Không có file Backend bị chỉnh sửa trong checkout BE hoặc trong repository Frontend. BE git status cuối rỗng. Tất cả thay đổi hiện tại đều nằm dưới `StickerKiosk/`.

So snapshot đầu phiên: sửa 11 file trong src/choco, thêm2 file CSS; danh sách chính xác cùng các tài liệu/config Frontend ở [session-file-changes.json](session-file-changes.json). Toàn bộ status hiện tại, gồm cả thay đổi có trước, ở [git-working-tree.txt](git-working-tree.txt).

43 file đã mang trạng thái deleted từ trước khi bắt đầu. Cuối phiên vẫn43, không có file bị xóa thêm. Các chỉnh sửa/index/package/route migration có trước được giữ nguyên, không tự commit hoặc restore.

## Kiểm tra bổ sung homepage công khai

- Playwright với browser session mới: mở `/` giữ nguyên URL, render homepage, không có request `/api/` và không có JS error.
- CTA khám phá và các anchor cảm hứng/quy trình/FAQ hoạt động; không có anchor hỏng. FAQ mở được.
- `/quan-tri` và `/quan-ly/orders?new=1` chưa có phiên redirect sang login; `history.state.usr.from` giữ nguyên deep link đơn hàng. Login mặc định sau thành công đi `/quan-tri`.
- URL lạ hiển thị public404, nút về trang chủ trở về `/`.
- Homepage kiểm tra 390x844,768x1024,1440x900; không overflow ngang. Screenshots `output/playwright/home-desktop.png`, `home-tablet.png`, `home-mobile.png`.
- Build, lint và38tests vẫn PASS. Hallmark public render1280/1440/1920/375:0FAIL,0WARN;1waiver cho PlateArt có sẵn được chú thích minh họa;1note về word budget FAQ.
- Customer login chưa có API trong BE; không đổi Admin session thành Customer session. Form liên hệ `/dang-ky` vẫn dùng public contract đang có.
