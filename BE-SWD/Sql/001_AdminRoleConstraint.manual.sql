-- Manual review only. Never executed by the application.
-- Inspect these rows and resolve their roles explicitly before applying the constraint.
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF EXISTS (SELECT 1 FROM dbo.ADMIN WHERE role IS NOT NULL AND role COLLATE Latin1_General_100_BIN2 <> 'Admin')
BEGIN
    SELECT id, username, role FROM dbo.ADMIN WHERE role IS NOT NULL AND role COLLATE Latin1_General_100_BIN2 <> 'Admin';
    ROLLBACK;
    THROW 50001, 'Existing accounts have incompatible roles. No data changed.', 1;
END;
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE name = 'CK_ADMIN_ROLE' AND parent_object_id=OBJECT_ID('dbo.ADMIN'))
    ALTER TABLE dbo.ADMIN DROP CONSTRAINT CK_ADMIN_ROLE;
ALTER TABLE dbo.ADMIN WITH CHECK ADD CONSTRAINT CK_ADMIN_ROLE CHECK ([role] = 'Admin');
COMMIT;
