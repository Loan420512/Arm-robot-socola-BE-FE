-- User-authorized data seed for ChocoRobotDB. Inserts only; no schema, auth, price or stock changes.
-- Artwork and G-code are preview references, not calibrated robot jobs.
SET NOCOUNT ON;
SET XACT_ABORT ON;
IF DB_NAME() <> N'ChocoRobotDB' THROW 51000, 'Unexpected database; seed cancelled.', 1;
BEGIN TRY
    BEGIN TRANSACTION;
    DECLARE @plateTypeId int, @staffId int;
    DECLARE @createdType int = 0, @createdStaff int = 0;
    SELECT TOP (1) @plateTypeId = id FROM dbo.PLATE_TYPE WITH (UPDLOCK, HOLDLOCK)
    WHERE type_name = N'Dĩa tròn 200 mm (tham chiếu mẫu)' ORDER BY id;
    IF @plateTypeId IS NULL
    BEGIN
        INSERT dbo.PLATE_TYPE (type_name, shape, dimensions)
        VALUES (N'Dĩa tròn 200 mm (tham chiếu mẫu)', N'Tròn', '200 mm (preview reference)');
        SET @plateTypeId = CONVERT(int, SCOPE_IDENTITY());
        SET @createdType = 1;
    END;
    SELECT TOP (1) @staffId = id FROM dbo.STAFF WITH (UPDLOCK, HOLDLOCK)
    WHERE employee_code = 'CATALOG-BASIC' ORDER BY id;
    IF @staffId IS NULL
    BEGIN
        -- Catalog author reference required by the existing template contract; no real person/contact.
        INSERT dbo.STAFF (admin_id, full_name, employee_code, phone, position, is_active)
        VALUES (NULL, N'Thiết kế mẫu cơ bản (tham chiếu)', 'CATALOG-BASIC', '0000000000', 'Designer', 1);
        SET @staffId = CONVERT(int, SCOPE_IDENTITY());
        SET @createdStaff = 1;
    END;
    DECLARE @seed TABLE (template_name nvarchar(150), image_preview_url varchar(500), gcode_file_url varchar(500));
    INSERT @seed (template_name, image_preview_url, gcode_file_url)
    VALUES
    (N'Trái tim cơ bản', N'/catalog/basic/heart.png', N'/catalog/basic/heart-preview.gcode'),
    (N'Bông hoa năm cánh', N'/catalog/basic/flower.png', N'/catalog/basic/flower-preview.gcode'),
    (N'Xoắn ốc chocolate', N'/catalog/basic/spiral.png', N'/catalog/basic/spiral-preview.gcode'),
    (N'Ba đường sóng', N'/catalog/basic/waves.png', N'/catalog/basic/waves-preview.gcode');
    DECLARE @created TABLE (id int);
    INSERT dbo.CHOCO_TEMPLATE (plate_type_id, staff_id, template_name, image_preview_url, gcode_file_url, is_active, created_at)
    OUTPUT inserted.id INTO @created(id)
    SELECT @plateTypeId, @staffId, s.template_name, s.image_preview_url, s.gcode_file_url, 1, SYSDATETIME()
    FROM @seed s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.CHOCO_TEMPLATE t WITH (UPDLOCK, HOLDLOCK) WHERE t.image_preview_url = s.image_preview_url);
    COMMIT TRANSACTION;
    SELECT DB_NAME() AS database_name, (SELECT COUNT(*) FROM @created) AS created_templates,
           @createdType AS created_reference_plate_types, @createdStaff AS created_reference_authors;
    SELECT t.id, t.template_name, t.plate_type_id, t.staff_id, t.image_preview_url, t.gcode_file_url, t.is_active
    FROM dbo.CHOCO_TEMPLATE t JOIN @seed s ON s.image_preview_url = t.image_preview_url ORDER BY t.id;
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
