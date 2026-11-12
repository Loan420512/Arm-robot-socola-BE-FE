# Đối chiếu dữ liệu nghiệp vụ chỉ từ API

Ngày: 12/11/2026, Asia/Saigon. Branch Frontend: `fe`. Backend: `BE`, checkout `C:/Users/thong/.codex/worktrees/run-chocorobot-be/SWD-BE`, giữ **chỉ đọc**.

Tài liệu này phân biệt API đang tồn tại với hợp đồng đề xuất. Không có endpoint mới nào trong phần đề xuất được triển khai lên BE, không đổi quyền truy cập, cấu hình, schema hoặc dữ liệu.

## Yêu cầu dữ liệu

Tên mẫu, ảnh mẫu, loại dĩa, màu dĩa, mã SKU, giá, tồn kho, khách hàng, đơn hàng, giao dịch và số liệu dashboard phải đến từ phản hồi API. Frontend không tự tạo bản ghi, giá, danh mục hoặc hình mẫu thay thế khi API rỗng hay lỗi.

Các nút, nhãn giao diện, thông báo trạng thái, token thiết kế và đầu vào do người dùng tự vẽ là logic/UI; chúng không phải dữ liệu nghiệp vụ được giả làm phản hồi API. Mô hình robot/dĩa GLB do người dùng cung cấp là tài nguyên dựng hình cục bộ, chưa có API metadata để chọn chúng theo sản phẩm thật.

## Hợp đồng BE hiện có

| Nguồn dữ liệu | Endpoint đang có | Quyền thực tế |
| --- | --- | --- |
| Mẫu chocolate | `GET /api/choco-templates`, `GET /api/choco-templates/{id}`, `GET /api/choco-templates/by-plate-type/{id}` | Admin JWT |
| Dĩa, SKU, giá, tồn kho | `GET /api/plates`, `GET /api/plates/{id}`, theo loại/màu | Admin JWT |
| Loại, hình dáng, kích thước dĩa | `GET /api/plate-types` | Admin JWT |
| Tên, mã màu, trạng thái màu | `GET /api/plate-colors` | Admin JWT |
| Chi tiết mẫu | `GET /api/template-elements/by-template/{id}` | Admin JWT |
| Lưu liên hệ khách | `POST /api/customers` với `{fullName,phone,email}` | Công khai; không cấp phiên đăng nhập |
| Tạo đơn | `POST /api/orders` với `{customerId,plateId,chocoTemplateId}` | Admin JWT |
| Ghi nhận thanh toán | `POST /api/payments` | Admin JWT, chỉ tiền mặt đã xác nhận thực nhận |

BE trả envelope `{success,message,data,errors}`. Danh sách phân trang có `items,pageNumber,pageSize,totalCount,totalPages`. `pageSize` tối đa100. Đọc dữ liệu phải giữ nguyên đường dẫn, field và quyền BE; việc FE gửi GET khi chưa có phiên không mở quyền Backend.

Nguồn xác minh:

- `BE-SWD/Controllers/ChocoTemplateController.cs:12`, `PlateController` trong `PlatesController.cs:12`, `PlateColorController.cs:12` và `PlateTypeController.cs:12`: `Authorize(Roles = SystemRoles.Admin)` ở cấp controller.
- `BE-SWD/DTOs/ChocoTemplate/Contracts.cs:51`: response chỉ có ID, loại dĩa, nhân viên, tên, `imagePreviewUrl`, `gcodeFileUrl`, trạng thái và ngày tạo.
- `BE-SWD/DTOs/TemplateElement/Contracts.cs:50`: chi tiết mẫu có tên, tọa độ X/Y và scale; **không có điểm đường vẽ hoặc định nghĩa hình**. Không được suy đoán tên một chi tiết thành trái tim/hoa hoặc tự chọn thang tọa độ.
- `BE-SWD/DTOs/Plate/Contracts.cs:60` và `Details.cs:3`: dĩa trả `price,stockQuantity` và metadata màu/loại/hình dáng/kích thước. Giá thiếu không được biến thành0; tồn kho thiếu không đồng nghĩa hết hàng.
- `BE-SWD/Controllers/CustomerRegistrationController.cs:14`: contact-only public endpoint; nhận `customerId` không tạo đơn, không xác thực danh tính và không cấp quyền đọc hồ sơ.
- `BE-SWD/DTOs/Order/Contracts.cs:6`: không có trường nhận bản vẽ cục bộ, chocolate tự chọn hoặc giá do trình duyệt gửi.
- `BE-SWD/DTOs/Payment/Contracts.cs:6` và `Services/BusinessRules.cs:201`: cần `cashReceivedConfirmed=true`; dòng207 từ chối phương thức online chưa có tích hợp provider đã xác minh.
- `BE-SWD/Common/SystemConstants.cs:146`: toàn bộ route hiện có; không có route công khai cho catalog, endpoint danh mục chocolate, preview-path, robot/model metadata hoặc guest checkout.

Các trạng thái đơn/hoàn tiền/sự cố và danh sách phương thức trong form quản trị hiện là các hằng số của hợp đồng BE (`BusinessValues`, `SystemConstants.cs:54`), không phải bản ghi hàng hóa. FE giữ đúng các giá trị được BE chấp nhận. Nếu yêu cầu cả lựa chọn trạng thái/chức vụ/phương thức cũng phải nạp động, BE cần thêm endpoint metadata thay vì FE tự đổi chuỗi hoặc gửi giá trị ngoài contract. Việc BE khai báo tên phương thức online không có nghĩa đã xử lý thanh toán online.

## Kiểm tra HTTP và database thật

Đã gọi API trên BE đang chạy tại `http://127.0.0.1:5143`:

| Request không token | Kết quả |
| --- | --- |
| `GET /swagger/v1/swagger.json` | 200, đọc được path/schema thật |
| `GET /api/choco-templates` | 401, `Authentication required` |
| `GET /api/plates` | 401, `Authentication required` |
| `GET /api/plate-colors` | 401, `Authentication required` |
| `GET /api/plate-types` | 401, `Authentication required` |

Không có token Admin thật để xác minh catalog200 trong phiên này. Không mint JWT, không mượn quyền Admin cho khách, không đổi authorization hoặc thêm mock API để vượt401.

Truy vấn SQL chỉ đọc trên Docker container `chocorobot-sql` trả `DB_NAME()=ChocoRobotDB`. Các bảng `CHOCO_TEMPLATE`, `TEMPLATE_ELEMENT`, `PLATE`, `PLATE_COLOR`, `PLATE_TYPE` đều0 bản ghi. Database Docker `127.0.0.1:1433` đã được người dùng chọn; không sửa dữ liệu để tạo mẫu thử.

## Các giới hạn ảnh, đường vẽ và model

API hiện cung cấp ảnh preview và đường dẫn tệp G-code, không cung cấp geometry/strokes. Frontend có thể trình bày ảnh thật do API trả về. Không được vẽ một mẫu thủ tục khác rồi gắn tên/ID của mẫu API vào nó.

`Program.cs:68` và `Configuration/TemplateImageOptions.cs:9` chỉ phục vụ thư mục ảnh tại `/uploads/choco-templates`, với PNG/JPEG. `Services/TemplateImageService.cs:63` tạo URL ảnh lưu bởi upload Admin. Chưa có hợp đồng nạp G-code dạng text từ URL hoặc endpoint nhận geometry. Một `gcodeFileUrl` không tự bảo đảm file tồn tại, CORS cho phép đọc, đơn vị đo, gốc tọa độ, chế độ extrusion hoặc tương thích robot.

Nếu tệp không đọc được hoặc thiếu dữ liệu tọa độ, FE phải báo chưa có đường mô phỏng; không đoán hình từ tên mẫu, không trace ảnh thành G-code ngầm và không báo robot đang thực thi thật.

Các mô hình GLB hiện nằm tại `public/models/choco/`, nguồn do người dùng cung cấp, có attribution riêng. Chúng chỉ là trình hiển thị chung, chưa phải sản phẩm hoặc thiết bị được đọc từ DB. Khi cần toàn bộ metadata từ API, cần endpoint mô tả assetURL, scale, orientation, calibration và attribution/license; FE không tự thêm các bản ghi đó vào database.

## Đề xuất tối thiểu để phục vụ khách không đăng nhập

Các endpoint và field bên dưới **chỉ là đề xuất**, chưa được tạo. Phải được người dùng cho phép sửa BE/API contract trước khi triển khai.

### 1. Catalog đọc công khai

Thêm API đọc riêng, ví dụ `GET /api/catalog/choco-templates`, `/plates`, `/plate-types`, `/plate-colors`. Trả cùng cấu trúc phân trang và field đang có; chỉ mẫu/màu đang sử dụng và dữ liệu cần cho khách, không lộ staff/admin hoặc đường dẫn nội bộ. Không chuyển CRUD/Admin hiện có thành công khai.

FE hiện phải tiếp tục gọi các GET đang tồn tại và hiển thị lỗi quyền truy cập đúng thực tế. Không thể gọi một route `/catalog` đề xuất chưa tồn tại rồi tuyên bố đã tích hợp.

### 2. Dữ liệu preview chính xác

Định nghĩa dữ liệu có version cho ảnh, preview-path hoặc G-code tải được, gồm:

- Đơn vị, gốc/trục tọa độ, vùng in, chiều rộng/chiều cao hoặc bán kính dĩa và reference loại dĩa.
- Đường stroke có thứ tự, travel/lift/extrude khác nhau; nếu dùng G-code thì cần định dạng được hỗ trợ, parser bounds, dung lượng/số điểm tối đa và trạng thái tương thích.
- Màu/chất liệu chocolate nếu là lựa chọn nghiệp vụ; API hiện chưa có danh mục này.
- URL ảnh/mô hình/tệp an toàn và attribution. Phục vụ qua URL cùng origin hoặc CORS xác định, không gửi Bearer token tới origin tùy ý từ field URL.

Chỉ khi BE có metadata đủ nghĩa FE mới mô phỏng chính xác đường chạy. Ảnh xem trước không được coi là đường chạy robot.

### 3. Guest checkout

Thêm API công khai nhận thông tin liên hệ và các ID lựa chọn catalog, ví dụ `POST /api/checkout`. Server xác thực mẫu hoạt động, dĩa tương thích, giá từ DB và tồn kho; tính tổng tiền ở BE, không tin giá từ trình duyệt. Cần quy định draft tùy chỉnh có được đặt hay phải xác nhận riêng, chống gửi lặp và receipt với mã đơn/trạng thái thật.

Phần thu tiền phải có hợp đồng riêng: nếu tiền mặt, đơn chỉ chờ thanh toán cho đến Admin thực nhận; nếu online, chỉ báo thành công sau xác nhận provider/server. Không dùng contact201 hoặc tạo đơn201 để gắn trạng thái paid.

## Quy tắc kiểm tra FE sau cập nhật

- Khi API401/403, hiện chưa có quyền tải thư viện, không đổi thành danh sách rỗng và không đưa người mua vào login Admin bắt buộc.
- Khi API200 với0items, hiện empty state và chỉ cho quản trị tạo dữ liệu ở khu quản trị.
- Khi API500/offline/timeout/malformed JSON, hiện lỗi và retry; không dựng mẫu/giá/màu thay thế.
- Lựa chọn lưu trong trình duyệt chỉ gồm ID/draft do người dùng tạo; tên, ảnh, giá và tồn kho phải được đọc lại từ API và kiểm tra trước checkout.
- Không hiện giá0, màu, dĩa, ID hoặc mẫu mặc định khi API chưa trả dữ liệu hợp lệ.
- Bộ kiểm thử transport có thể giả lập response trong unit test; runtime ứng dụng không có dữ liệu/catalog mock.

## Trạng thái bàn giao

Audit BE và giới hạn contract đã hoàn tất. Các module Frontend đang được đổi sang:

- `studio/catalog.ts`: đọc đúng bốn nguồn `/choco-templates`, `/plates`, `/plate-colors`, `/plate-types`, kiểm tra page/row và giữ lỗi quyền truy cập từ BE. Không có route/catalog giả lập.
- `PublicHome.tsx`: tên/ảnh mẫu đến từ danh sách API, không còn bộ ba mẫu cảm hứng viết sẵn hoặc ID preset trong link.
- `StudioPage.tsx`: mẫu/loại dĩa/màu/giá/tồn kho đến từ API; ảnh mẫu là URL thật của mẫu. Không có danh mục chocolate hoặc các hình preset thay cho dữ liệu xưởng. Tự vẽ chỉ là đầu vào bản nháp người dùng và không được đặt như mẫu API.
- `design.ts`: draft version2 chỉ lưu ID mẫu/dĩa cùng điều chỉnh và nét vẽ người dùng; không lưu tên/giá/tồn kho server làm fallback. Draft cũ chứa mẫu thủ tục không còn dùng làm nguồn catalog.
- `CheckoutPage.tsx`: nạp lại catalog theo ID, chỉ tiếp tục khi lựa chọn còn hợp lệ; contact201 vẫn không có nghĩa order/paid.
- `CatalogPage.tsx` và `ResourcePage.tsx`: trường giá/tồn kho thiếu được hiển thị chưa có thông tin, không tự chuyển thành0.

Review source cuối đã xác nhận:

- `StudioPage` không cho checkout trong lúc tải lại/lỗi catalog hoặc khi thiếu mẫu/dĩa/giá/tồn kho hợp lệ.
- ID loại dĩa của mẫu phải là số dương trước khi xét tương thích; không coi hai giá trị `null` là một loại dĩa phù hợp.
- `CheckoutPage` áp dụng điều kiện tương tự trong cả UI và handler submit, không chỉ dựa vào nút disabled.
- Xoay/phóng ảnh được ghi rõ chỉ phục vụ xem bố cục; mẫu đặt vẫn theo tệp gốc, không giả rằng BE đã lưu biến đổi của preview.
- Quét runtime `src/choco` không còn các danh mục `PATTERNS`, `CHOCOLATES`, `PLATE_COLORS`, hàm `presetPaths` hoặc phép thay giá/tồn kho/số tiền thiếu bằng0. Scoped lint `StudioPage`, `CheckoutPage`, `CatalogPage`, `ResourcePage` đạt.

Không còn finding actionable trong review source ở phạm vi này. Kết quả build/test/E2E tổng hợp do lượt kiểm tra của root xác nhận riêng. Tài liệu này chưa tuyên bố thư viện đã được Backend mở công khai: các GET không token vẫn401 và database catalog đang rỗng. Hoàn thành FE không tự gỡ được hai giới hạn này.

## Kiểm tra tổng hợp cuối

- Production build và lint đạt;75/75tests đạt trong4files. Warning bundle lớn của Three.js vẫn có; renderer đã nạp theo route.
- Playwright thực tế: homepage gọi GET/choco-templates và hiện đúng401 từBE; không có catalog card giả. Studio gọi4GET thật, hiển thị lỗi quyền, khóa chọn dĩa/checkout khi chưa xác minh catalog.
- Nét tự vẽ và mô phỏng người dùng vẫn hoạt động nhưng không được coi là mẫu đặt hàngAPI. Draftv2 giữIDvà nét người dùng, không khôi phục presetv1. Checkout tải lạiAPI, không cho submit khi thư viện lỗi hoặc lựa chọn không hợp lệ; không yêu cầu Customerpassword.
- Console có network401 đúng với Backend chưapublic; không có lỗi JavaScript trongluồng kiểm tra. Chưa xác minh happy-path bằng Admincredential hoặc bản ghi mẫu thật, vì chưa được cung cấp vàcatalog đangrỗng.
- FAQ “Trước khi bắt đầu” đã bỏbr, đủ whitespace; đã xem screenshot1440/390, không tràn ngang. Fileảnh output/playwright/faq-redesign-desktop.png vàfaq-redesign-mobile.png.
- Không sửa code/config/secrets/schema/dataBackend. BE5143/FE5173vàDocker vẫn chạy; gitBE sạch. Không commit/push.

## Phạm vi Backend vừa được cho phép

Người dùng đã trả lời “Cho phép mở API đọc catalog công khai”. Theo ngoại lệ được cho phép này, chỉ4GETcollection `/api/choco-templates`, `/api/plates`, `/api/plate-types`, `/api/plate-colors` được mở cho anonymous; các API chi tiết/ghi/upload/quản trị còn lại giữAdmin. Đây là thay đổi quyền đọc, không đổi DTO/service/repository/schema hoặc ghi dữ liệu. Tests về quyền được cập nhật theo chính4GET này. Backend HEAD vẫn2e6f800 với thay đổi local chưacommit; các xác nhận “BE không thay đổi” ở phần audit trước mô tả trạng thái trước khi được cho phép.

## Kết quả sau khi mở quyền đọc theo phê duyệt

Trạng thái mới nhất thay thế các ghi nhận401 ở giai đoạn audit phía trên:

- GET4collectioncatalog trả200quaBE5143vàFE5173, envelope success=true,items=[],totalCount=0. Đó là phản hồi thực tế củaChocoRobotDB, không phải APIgiả hoặc fallback.
- Kiểm tra độc lập toàn bộ74operationscònđược bảo vệ: yêu cầu xác thực vẫn giữ; upload kiểm tra với multipartcontenttype trả401 (gửiJSONtrả415 vì media type cũ).
- Swagger bỏ JWT requirement đúng4GET. Invalidpagination400. CRUD/detail/bytype/bycolor/upload/order/payment/privatecustomer/staff không được mở.
- BE+Tests build0errors0warnings. Standardisolatedharness551checksPASS; dùng SQLtạm khôngkhảdụng và testsecret, không ghiDockerDB hoặc sử dụng tokenkiểm thử đăng nhập appthật. Log ngoài repo: C:/Users/thong/AppData/Local/Temp/chocorobot-public-catalog-harness-20261112.log.
- Backendđổi đúng5file: BE-SWD/Controllers/ChocoTemplateController.cs,PlatesController.cs,PlateTypeController.cs,PlateColorController.cs vàBE-SWD.Tests/Program.cs. Không đổiDTO/service/repository/config/secrets/schema/data; khôngcommit/push.
- FEbuild/lint75testsPASS. Hallmark4fileUI+studio/checkoutrender:0FAIL0REFLEX0WARN; homepageFAQkiểm tra riêng0FAIL0WARN.
- CatalogDBchưa cómẫu/dĩa/loại/màu nên chưa kiểm chứngảnh/giásản phẩm thật với bản ghi có sẵn; FEhiệnemptyđúngnguồn và khôngtạo mẫuđểche dữliệurỗng.

## Cập nhật sau yêu cầu nạp mẫu cơ bản

Đã thêm4recordCHOCO_TEMPLATE và1loại dĩa tham chiếu theo yêu cầu người dùng, sau auditDBrỗng ở phía trên. Ảnh và G-code được lấy từ URL API trả về; Studio hiện parse tệp G-code tham chiếu để mô phỏng đúng hình thay vì chỉ đặt ảnh trên dĩa. Không có catalog fallback viết sẵn. Report mới ở [basic-template-seed-report.md](basic-template-seed-report.md). PLATE vàPLATE_COLOR vẫn0; không tự tạo giá/tồn kho.
