-- User requested removal of the four records added by our basic-template seed.
-- Prerequisite: verified COPY_ONLY backup. No original records, schema, prices or auth are changed.
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
IF DB_NAME() <> N'ChocoRobotDB' THROW 51000, 'Unexpected database; cleanup cancelled.', 1;
DECLARE @expected TABLE (id int PRIMARY KEY, template_name nvarchar(150), image_preview_url varchar(500), gcode_file_url varchar(500));
INSERT @expected VALUES
(1,N'Trái tim cơ bản','/catalog/basic/heart.png','/catalog/basic/heart-preview.gcode'),
(2,N'Bông hoa năm cánh','/catalog/basic/flower.png','/catalog/basic/flower-preview.gcode'),
(3,N'Xoắn ốc chocolate','/catalog/basic/spiral.png','/catalog/basic/spiral-preview.gcode'),
(4,N'Ba đường sóng','/catalog/basic/waves.png','/catalog/basic/waves-preview.gcode');
BEGIN TRY
  BEGIN TRANSACTION;
  IF EXISTS (
    SELECT 1 FROM @expected e LEFT JOIN dbo.CHOCO_TEMPLATE t WITH (UPDLOCK,HOLDLOCK) ON t.id=e.id
    WHERE t.id IS NULL OR t.template_name<>e.template_name OR t.image_preview_url<>e.image_preview_url
      OR t.gcode_file_url<>e.gcode_file_url OR ISNULL(t.plate_type_id,-1)<>2 OR ISNULL(t.staff_id,-1)<>1
  ) THROW 51001, 'Seed record identity differs; no data removed.', 1;
  IF EXISTS (SELECT 1 FROM dbo.[ORDER] o JOIN @expected e ON e.id=o.choco_template_id)
    OR EXISTS (SELECT 1 FROM dbo.TEMPLATE_ELEMENT x JOIN @expected e ON e.id=x.template_id)
    THROW 51002, 'Seed templates now have dependent business records; no data removed.', 1;
  DECLARE @removedTemplates TABLE(id int,template_name nvarchar(150));
  DELETE t OUTPUT deleted.id,deleted.template_name INTO @removedTemplates
  FROM dbo.CHOCO_TEMPLATE t JOIN @expected e ON e.id=t.id;
  IF (SELECT COUNT(*) FROM @removedTemplates)<>4 THROW 51003, 'Unexpected deletion count; rollback.', 1;
  DELETE t FROM dbo.PLATE_TYPE t
  WHERE t.id=2 AND t.type_name=N'Dĩa tròn 200 mm (tham chiếu mẫu)' AND t.shape=N'Tròn' AND t.dimensions='200 mm (preview reference)'
    AND NOT EXISTS (SELECT 1 FROM dbo.CHOCO_TEMPLATE x WHERE x.plate_type_id=t.id)
    AND NOT EXISTS (SELECT 1 FROM dbo.PLATE p WHERE p.type_id=t.id);
  DECLARE @removedTypes int=@@ROWCOUNT;
  DELETE s FROM dbo.STAFF s
  WHERE s.id=1 AND s.employee_code='CATALOG-BASIC' AND s.full_name=N'Thiết kế mẫu cơ bản (tham chiếu)'
    AND s.phone='0000000000' AND s.position='Designer' AND s.admin_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM dbo.CHOCO_TEMPLATE t WHERE t.staff_id=s.id)
    AND NOT EXISTS (SELECT 1 FROM dbo.TEMPLATE_ELEMENT x WHERE x.staff_id=s.id)
    AND NOT EXISTS (SELECT 1 FROM dbo.INCIDENT_REPORT i WHERE i.staff_id=s.id);
  DECLARE @removedAuthors int=@@ROWCOUNT;
  COMMIT TRANSACTION;
  SELECT DB_NAME() AS database_name,(SELECT COUNT(*) FROM @removedTemplates) AS removed_templates,@removedTypes AS removed_reference_types,@removedAuthors AS removed_reference_authors;
  SELECT id,template_name FROM @removedTemplates ORDER BY id;
  SELECT COUNT(*) AS remaining_templates FROM dbo.CHOCO_TEMPLATE;
  SELECT COUNT(*) AS remaining_plates FROM dbo.PLATE;
END TRY
BEGIN CATCH
  IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
