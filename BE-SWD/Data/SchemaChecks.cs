using ChocoRobot.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChocoRobot.Data;
// Chỉ khai báo metadata; ứng dụng không tự thay đổi schema.
public static class SchemaChecks
{
    public static string In(string column, BusinessValueSet set)
    {
        var quotedValues = BusinessValues.For(set).Select(value => $"'{value.Replace("'", "''")}'");
        return $"[{column}] IN ({string.Join(",", quotedValues)})";
    }

    public static void Configure(ModelBuilder model)
    {
        model.Entity<Admin>().ToTable("ADMIN", table =>
        {
            table.HasCheckConstraint("CK_ADMIN_ROLE", In("role", BusinessValueSet.Roles));
        });
        model.Entity<Staff>().ToTable("STAFF", table =>
        {
            table.HasCheckConstraint("CK_STAFF_POSITION", In("position", BusinessValueSet.StaffPositions));
        });
        model.Entity<CashFlowAudit>().ToTable("CASH_FLOW_AUDIT", table =>
        {
            table.HasCheckConstraint("CK_CASH_FLOW_AUDIT_STATUS", In("status", BusinessValueSet.AuditStatuses));
        });
        model.Entity<Order>().ToTable("ORDER", table =>
        {
            table.HasCheckConstraint("CK_ORDER_STATUS", In("status", BusinessValueSet.OrderStatuses));
        });
        model.Entity<IncidentReport>().ToTable("INCIDENT_REPORT", table =>
        {
            table.HasCheckConstraint("CK_INCIDENT_REPORT_STATUS", In("status", BusinessValueSet.IncidentStatuses));
        });
        model.Entity<Payment>().ToTable("PAYMENT", t =>
        {
            t.HasCheckConstraint("CK_PAYMENT_METHOD", In("payment_method", BusinessValueSet.PaymentMethods));
            t.HasCheckConstraint("CK_PAYMENT_STATUS", In("payment_status", BusinessValueSet.PaymentStatuses));
        });
        model.Entity<RefundTransaction>().ToTable("REFUND_TRANSACTION", table =>
        {
            table.HasCheckConstraint("CK_REFUND_STATUS", In("status", BusinessValueSet.RefundStatuses));
        });
    }
}
