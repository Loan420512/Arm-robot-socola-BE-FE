# ChocoRobot Studio design system

The brand is preserved from the existing frontend: Be Vietnam Pro, cacao surfaces, warm cream and terracotta actions. Tokens live in src/choco/tokens.css; shared base behavior in base.css; layout and component recipes in styles.css.

Operational screens lead with real data and actions. The dashboard signature is the recent order ledger. The sidebar groups workspace, operations and workshop management. Below 960px it becomes a keyboard accessible drawer. Auth screens use a compact introduction on mobile.

Body uses 16px, controls have at least 44px targets, mobile input text is 16px. Financial figures use tabular numerals. Preserve clear labels, focus-visible outlines, reduced motion behavior and distinct loading, empty, error and success states. Never replace unavailable API data with sample records or zero-value success states.

Use one primary action style and the shared field/table/dialog recipes. All 13 resource screens share this system; the catalog and template library retain product imagery, while operations use tables. Customer contact registration is separate from Admin authentication.

The initial route / is a public homepage. It uses the same brand tokens with spacious editorial composition. Public discovery anchors do not require authentication or call protected APIs. The operational dashboard lives at /quan-tri and all existing management routes remain guarded. Customers browse, design and proceed to guest checkout without login. Contact details are collected at checkout only; Admin authentication remains separate. Never present contact registration as a paid order.

The public 3D studio uses a large live WebGL canvas with a grouped control panel. Mobile shows the model before the controls. Templates, plate colors, prices and inventory come only from API catalog records. Freehand strokes remain user input and cannot stand in for an API template. Do not infer shape paths from template names or show product options that have no API. Preview, pause, camera angle and undo remain available without login. Checkout preserves the draft and shows the actual scope of the current public contact API.

API-only rule: Catalog errors are errors, not empty success or generated examples. Persist chosen IDs only and reload catalog records before checkout. A thumbnail/image is a preview, not a robot path. The supplied generic GLB assets remain rendering resources with provenance, not inventory records. The FAQ heading is real text with whitespace, never a hidden line-break used as a separator.
