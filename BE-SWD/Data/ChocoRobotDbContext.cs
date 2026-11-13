using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChocoRobot.Data;

public class ChocoRobotDbContext(DbContextOptions<ChocoRobotDbContext> options) : DbContext(options)
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Giữ nguyên tên bảng, kiểu dữ liệu và quan hệ của schema hiện tại.
        ConfigureAdmin(modelBuilder);
        ConfigureCustomer(modelBuilder);
        ConfigureStaff(modelBuilder);
        ConfigureCashFlowAudit(modelBuilder);
        ConfigurePlateType(modelBuilder);
        ConfigurePlateColor(modelBuilder);
        ConfigurePlate(modelBuilder);
        ConfigureChocoTemplate(modelBuilder);
        ConfigureTemplateElement(modelBuilder);
        ConfigureOrder(modelBuilder);
        ConfigureIncidentReport(modelBuilder);
        ConfigurePayment(modelBuilder);
        ConfigureRefundTransaction(modelBuilder);
        SchemaChecks.Configure(modelBuilder);
        if ((Database.ProviderName ?? "").Contains("Npgsql", StringComparison.Ordinal))
            AdaptStoreTypesForPostgres(modelBuilder);
    }

    // Chỉ đổi kiểu lưu trữ khi host là PostgreSQL. Quan hệ và ràng buộc nghiệp vụ giữ nguyên.
    private static void AdaptStoreTypesForPostgres(ModelBuilder modelBuilder)
    {
        foreach (var property in modelBuilder.Model.GetEntityTypes().SelectMany(entity => entity.GetProperties()))
        {
            var storeType = property.GetColumnType();
            if (storeType is not null)
            {
                var mapped = storeType switch
                {
                    "bit" => "boolean",
                    "datetime" => "timestamp without time zone",
                    "float" => "double precision",
                    "nvarchar(max)" => "text",
                    _ when storeType.StartsWith("nvarchar(", StringComparison.Ordinal) => storeType.Replace("nvarchar", "character varying"),
                    _ => storeType
                };
                if (!string.Equals(mapped, storeType, StringComparison.Ordinal))
                    property.SetColumnType(mapped);
            }

            var defaultSql = property.GetDefaultValueSql();
            if (defaultSql is not null && defaultSql.Contains("GETDATE", StringComparison.OrdinalIgnoreCase))
                property.SetDefaultValueSql("CURRENT_TIMESTAMP");
        }
    }

    private static void ConfigureAdmin(ModelBuilder modelBuilder)
    {
        var admin = modelBuilder.Entity<Admin>();
        admin.ToTable("ADMIN");
        admin.HasKey(x => x.Id);
        admin.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        admin.Property(x => x.Username)
            .HasColumnName("username")
            .HasColumnType("varchar(100)");
        admin.Property(x => x.PasswordHash)
            .HasColumnName("password_hash")
            .HasColumnType("varchar(255)");
        admin.Property(x => x.Email)
            .HasColumnName("email")
            .HasColumnType("varchar(100)");
        admin.Property(x => x.Role)
            .HasColumnName("role")
            .HasColumnType("varchar(30)");
    }

    private static void ConfigureCustomer(ModelBuilder modelBuilder)
    {
        var customer = modelBuilder.Entity<Customer>();
        customer.ToTable("CUSTOMER");
        customer.HasKey(x => x.Id);
        customer.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        customer.Property(x => x.FullName)
            .HasColumnName("full_name")
            .HasColumnType("nvarchar(100)");
        customer.Property(x => x.Phone)
            .HasColumnName("phone")
            .HasColumnType("varchar(20)");
        customer.Property(x => x.Email)
            .HasColumnName("email")
            .HasColumnType("varchar(100)");
        customer.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("datetime")
            .HasDefaultValueSql("GETDATE()");
    }

    private static void ConfigureStaff(ModelBuilder modelBuilder)
    {
        var staff = modelBuilder.Entity<Staff>();
        staff.ToTable("STAFF");
        staff.HasKey(x => x.Id);
        staff.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        staff.Property(x => x.AdminId)
            .HasColumnName("admin_id")
            .HasColumnType("int");
        staff.HasOne<Admin>()
            .WithMany()
            .HasForeignKey(x => x.AdminId)
            .OnDelete(DeleteBehavior.NoAction);
        staff.Property(x => x.FullName)
            .HasColumnName("full_name")
            .HasColumnType("nvarchar(100)");
        staff.Property(x => x.EmployeeCode)
            .HasColumnName("employee_code")
            .HasColumnType("varchar(50)");
        staff.Property(x => x.Phone)
            .HasColumnName("phone")
            .HasColumnType("varchar(20)");
        staff.Property(x => x.Position)
            .HasColumnName("position")
            .HasColumnType("varchar(30)");
        staff.Property(x => x.IsActive)
            .HasColumnName("is_active")
            .HasColumnType("bit")
            .HasDefaultValue(true);
    }

    private static void ConfigureCashFlowAudit(ModelBuilder modelBuilder)
    {
        var cashFlowAudit = modelBuilder.Entity<CashFlowAudit>();
        cashFlowAudit.ToTable("CASH_FLOW_AUDIT");
        cashFlowAudit.HasKey(x => x.Id);
        cashFlowAudit.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        cashFlowAudit.Property(x => x.AdminId)
            .HasColumnName("admin_id")
            .HasColumnType("int");
        cashFlowAudit.HasOne<Admin>()
            .WithMany()
            .HasForeignKey(x => x.AdminId)
            .OnDelete(DeleteBehavior.NoAction);
        cashFlowAudit.Property(x => x.AuditDate)
            .HasColumnName("audit_date")
            .HasColumnType("date");
        cashFlowAudit.Property(x => x.TotalRevenue)
            .HasColumnName("total_revenue")
            .HasColumnType("decimal(18,2)");
        cashFlowAudit.Property(x => x.TotalRefund)
            .HasColumnName("total_refund")
            .HasColumnType("decimal(18,2)");
        cashFlowAudit.Property(x => x.Status)
            .HasColumnName("status")
            .HasColumnType("varchar(30)");
    }

    private static void ConfigurePlateType(ModelBuilder modelBuilder)
    {
        var plateType = modelBuilder.Entity<PlateType>();
        plateType.ToTable("PLATE_TYPE");
        plateType.HasKey(x => x.Id);
        plateType.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        plateType.Property(x => x.Shape)
            .HasColumnName("shape")
            .HasColumnType("nvarchar(50)");
        plateType.Property(x => x.TypeName)
            .HasColumnName("type_name")
            .HasColumnType("nvarchar(100)");
        plateType.Property(x => x.Dimensions)
            .HasColumnName("dimensions")
            .HasColumnType("varchar(100)");
    }

    private static void ConfigurePlateColor(ModelBuilder modelBuilder)
    {
        var plateColor = modelBuilder.Entity<PlateColor>();
        plateColor.ToTable("PLATE_COLOR");
        plateColor.HasKey(x => x.Id);
        plateColor.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        plateColor.Property(x => x.ColorName)
            .HasColumnName("color_name")
            .HasColumnType("nvarchar(50)")
            .IsRequired();
        plateColor.Property(x => x.ColorCode)
            .HasColumnName("color_code")
            .HasColumnType("varchar(20)")
            .IsRequired();
        plateColor.Property(x => x.IsActive)
            .HasColumnName("is_active")
            .HasColumnType("bit")
            .HasDefaultValue(true);
        plateColor.HasIndex(x => x.ColorCode)
            .IsUnique()
            .HasFilter(null);
    }

    private static void ConfigurePlate(ModelBuilder modelBuilder)
    {
        var plate = modelBuilder.Entity<Plate>();
        plate.ToTable("PLATE");
        plate.HasKey(x => x.Id);
        plate.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        plate.Property(x => x.TypeId)
            .HasColumnName("type_id")
            .HasColumnType("int");
        plate.HasOne<PlateType>()
            .WithMany()
            .HasForeignKey(x => x.TypeId)
            .OnDelete(DeleteBehavior.NoAction);
        plate.Property(x => x.ColorId)
            .HasColumnName("color_id")
            .HasColumnType("int");
        plate.HasOne<PlateColor>()
            .WithMany()
            .HasForeignKey(x => x.ColorId)
            .OnDelete(DeleteBehavior.NoAction);
        plate.Property(x => x.Sku)
            .HasColumnName("sku")
            .HasColumnType("varchar(100)");
        plate.Property(x => x.Material)
            .HasColumnName("material")
            .HasColumnType("nvarchar(100)");
        plate.Property(x => x.Color)
            .HasColumnName("color")
            .HasColumnType("nvarchar(50)");
        plate.Property(x => x.Price)
            .HasColumnName("price")
            .HasColumnType("decimal(18,2)");
        plate.Property(x => x.StockQuantity)
            .HasColumnName("stock_quantity")
            .HasColumnType("int");
    }

    private static void ConfigureChocoTemplate(ModelBuilder modelBuilder)
    {
        var chocoTemplate = modelBuilder.Entity<ChocoTemplate>();
        chocoTemplate.ToTable("CHOCO_TEMPLATE");
        chocoTemplate.HasKey(x => x.Id);
        chocoTemplate.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        chocoTemplate.Property(x => x.PlateTypeId)
            .HasColumnName("plate_type_id")
            .HasColumnType("int");
        chocoTemplate.HasOne<PlateType>()
            .WithMany()
            .HasForeignKey(x => x.PlateTypeId)
            .OnDelete(DeleteBehavior.NoAction);
        chocoTemplate.Property(x => x.StaffId)
            .HasColumnName("staff_id")
            .HasColumnType("int");
        chocoTemplate.HasOne<Staff>()
            .WithMany()
            .HasForeignKey(x => x.StaffId)
            .OnDelete(DeleteBehavior.NoAction);
        chocoTemplate.Property(x => x.TemplateName)
            .HasColumnName("template_name")
            .HasColumnType("nvarchar(150)");
        chocoTemplate.Property(x => x.ImagePreviewUrl)
            .HasColumnName("image_preview_url")
            .HasColumnType("varchar(500)");
        chocoTemplate.Property(x => x.GcodeFileUrl)
            .HasColumnName("gcode_file_url")
            .HasColumnType("varchar(500)");
        chocoTemplate.Property(x => x.IsActive)
            .HasColumnName("is_active")
            .HasColumnType("bit")
            .HasDefaultValue(true);
        chocoTemplate.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("datetime")
            .HasDefaultValueSql("GETDATE()");
    }

    private static void ConfigureTemplateElement(ModelBuilder modelBuilder)
    {
        var templateElement = modelBuilder.Entity<TemplateElement>();
        templateElement.ToTable("TEMPLATE_ELEMENT");
        templateElement.HasKey(x => x.Id);
        templateElement.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        templateElement.Property(x => x.TemplateId)
            .HasColumnName("template_id")
            .HasColumnType("int")
            .IsRequired();
        templateElement.HasOne<ChocoTemplate>()
            .WithMany()
            .HasForeignKey(x => x.TemplateId)
            .OnDelete(DeleteBehavior.NoAction);
        templateElement.Property(x => x.StaffId)
            .HasColumnName("staff_id")
            .HasColumnType("int");
        templateElement.HasOne<Staff>()
            .WithMany()
            .HasForeignKey(x => x.StaffId)
            .OnDelete(DeleteBehavior.NoAction);
        templateElement.Property(x => x.ElementName)
            .HasColumnName("element_name")
            .HasColumnType("nvarchar(150)");
        templateElement.Property(x => x.PositionX)
            .HasColumnName("position_x")
            .HasColumnType("int");
        templateElement.Property(x => x.PositionY)
            .HasColumnName("position_y")
            .HasColumnType("int");
        templateElement.Property(x => x.Scale)
            .HasColumnName("scale")
            .HasColumnType("float");
    }

    private static void ConfigureOrder(ModelBuilder modelBuilder)
    {
        var order = modelBuilder.Entity<Order>();
        order.ToTable("ORDER");
        order.HasKey(x => x.Id);
        order.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        order.Property(x => x.OrderCode)
            .HasColumnName("order_code")
            .HasColumnType("varchar(50)");
        order.Property(x => x.CustomerId)
            .HasColumnName("customer_id")
            .HasColumnType("int");
        order.HasOne<Customer>()
            .WithMany()
            .HasForeignKey(x => x.CustomerId)
            .OnDelete(DeleteBehavior.NoAction);
        order.Property(x => x.PlateId)
            .HasColumnName("plate_id")
            .HasColumnType("int");
        order.HasOne<Plate>()
            .WithMany()
            .HasForeignKey(x => x.PlateId)
            .OnDelete(DeleteBehavior.NoAction);
        order.Property(x => x.ChocoTemplateId)
            .HasColumnName("choco_template_id")
            .HasColumnType("int");
        order.HasOne<ChocoTemplate>()
            .WithMany()
            .HasForeignKey(x => x.ChocoTemplateId)
            .OnDelete(DeleteBehavior.NoAction);
        order.Property(x => x.TotalAmount)
            .HasColumnName("total_amount")
            .HasColumnType("decimal(18,2)");
        order.Property(x => x.Status)
            .HasColumnName("status")
            .HasColumnType("varchar(30)")
            .HasDefaultValue(StatusValues.Pending);
        order.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("datetime")
            .HasDefaultValueSql("GETDATE()");
        order.HasIndex(x => x.OrderCode)
            .IsUnique()
            .HasFilter(null);
    }

    private static void ConfigureIncidentReport(ModelBuilder modelBuilder)
    {
        var incidentReport = modelBuilder.Entity<IncidentReport>();
        incidentReport.ToTable("INCIDENT_REPORT");
        incidentReport.HasKey(x => x.Id);
        incidentReport.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        incidentReport.Property(x => x.StaffId)
            .HasColumnName("staff_id")
            .HasColumnType("int");
        incidentReport.HasOne<Staff>()
            .WithMany()
            .HasForeignKey(x => x.StaffId)
            .OnDelete(DeleteBehavior.NoAction);
        incidentReport.Property(x => x.IncidentType)
            .HasColumnName("incident_type")
            .HasColumnType("varchar(50)");
        incidentReport.Property(x => x.Description)
            .HasColumnName("description")
            .HasColumnType("nvarchar(max)");
        incidentReport.Property(x => x.Status)
            .HasColumnName("status")
            .HasColumnType("varchar(30)")
            .HasDefaultValue(StatusValues.Open);
        incidentReport.Property(x => x.ReportedAt)
            .HasColumnName("reported_at")
            .HasColumnType("datetime")
            .HasDefaultValueSql("GETDATE()");
    }

    private static void ConfigurePayment(ModelBuilder modelBuilder)
    {
        var payment = modelBuilder.Entity<Payment>();
        payment.ToTable("PAYMENT");
        payment.HasKey(x => x.Id);
        payment.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        payment.Property(x => x.OrderId)
            .HasColumnName("order_id")
            .HasColumnType("int")
            .IsRequired();
        payment.HasOne<Order>()
            .WithMany()
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.NoAction);
        payment.Property(x => x.AuditId)
            .HasColumnName("audit_id")
            .HasColumnType("int");
        payment.HasOne<CashFlowAudit>()
            .WithMany()
            .HasForeignKey(x => x.AuditId)
            .OnDelete(DeleteBehavior.NoAction);
        payment.Property(x => x.Amount)
            .HasColumnName("amount")
            .HasColumnType("decimal(18,2)");
        payment.Property(x => x.PaymentMethod)
            .HasColumnName("payment_method")
            .HasColumnType("varchar(30)");
        payment.Property(x => x.PaymentStatus)
            .HasColumnName("payment_status")
            .HasColumnType("varchar(30)");
        payment.Property(x => x.TransactionId)
            .HasColumnName("transaction_id")
            .HasColumnType("varchar(100)");
        payment.Property(x => x.PaidAt)
            .HasColumnName("paid_at")
            .HasColumnType("datetime");
        payment.HasIndex(x => x.OrderId)
            .IsUnique()
            .HasFilter(null);
    }

    private static void ConfigureRefundTransaction(ModelBuilder modelBuilder)
    {
        var refundTransaction = modelBuilder.Entity<RefundTransaction>();
        refundTransaction.ToTable("REFUND_TRANSACTION");
        refundTransaction.HasKey(x => x.Id);
        refundTransaction.Property(x => x.Id)
            .HasColumnName("id")
            .UseIdentityColumn();
        refundTransaction.Property(x => x.AuditId)
            .HasColumnName("audit_id")
            .HasColumnType("int");
        refundTransaction.HasOne<CashFlowAudit>()
            .WithMany()
            .HasForeignKey(x => x.AuditId)
            .OnDelete(DeleteBehavior.NoAction);
        refundTransaction.Property(x => x.AdminId)
            .HasColumnName("admin_id")
            .HasColumnType("int");
        refundTransaction.HasOne<Admin>()
            .WithMany()
            .HasForeignKey(x => x.AdminId)
            .OnDelete(DeleteBehavior.NoAction);
        refundTransaction.Property(x => x.PaymentId)
            .HasColumnName("payment_id")
            .HasColumnType("int")
            .IsRequired();
        refundTransaction.HasOne<Payment>()
            .WithMany()
            .HasForeignKey(x => x.PaymentId)
            .OnDelete(DeleteBehavior.NoAction);
        refundTransaction.Property(x => x.RefundAmount)
            .HasColumnName("refund_amount")
            .HasColumnType("decimal(18,2)");
        refundTransaction.Property(x => x.Reason)
            .HasColumnName("reason")
            .HasColumnType("nvarchar(500)");
        refundTransaction.Property(x => x.Status)
            .HasColumnName("status")
            .HasColumnType("varchar(30)")
            .HasDefaultValue(StatusValues.Pending);
        refundTransaction.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .HasColumnType("datetime")
            .HasDefaultValueSql("GETDATE()");
        refundTransaction.HasIndex(x => x.PaymentId)
            .IsUnique()
            .HasFilter(null);
    }
}
