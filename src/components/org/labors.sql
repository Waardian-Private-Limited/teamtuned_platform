

USE org_1765784569491;


INSERT INTO org_1765784569491.permission_categories (feature_id, code, name, sort_order) VALUES
(1, 'LABOR_MGMT', 'Labor Management', 19);



-- LABOR CATEGORIES
INSERT INTO org_1765784569491.permissions (category_id, code, name) VALUES
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_CAT_VIEW', 'View Labor Categories'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_CAT_ADD', 'Add Labor Category'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_CAT_EDIT', 'Edit Labor Category'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_CAT_DELETE', 'Delete Labor Category');

-- LABOR CONTRACTORS
INSERT INTO org_1765784569491.permissions (category_id, code, name) VALUES
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_CONTRACTOR_VIEW', 'View Labor Contractors'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_CONTRACTOR_ADD', 'Add Labor Contractor'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_CONTRACTOR_EDIT', 'Edit Labor Contractor'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_CONTRACTOR_DELETE', 'Delete Labor Contractor');

-- LABORERS
INSERT INTO org_1765784569491.permissions (category_id, code, name) VALUES
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABORER_VIEW', 'View Laborers'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABORER_ADD', 'Add Laborer'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABORER_EDIT', 'Edit Laborer'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABORER_DELETE', 'Delete Laborer');

-- LABOR FACE REGISTRATION
INSERT INTO org_1765784569491.permissions (category_id, code, name) VALUES
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_FACE_REGISTER', 'Register Laborer Face'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_FACE_UPDATE', 'Update Laborer Face'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_FACE_DELETE', 'Delete Laborer Face');

-- LABOR RATE CARDS
INSERT INTO org_1765784569491.permissions (category_id, code, name) VALUES
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_RATE_VIEW', 'View Labor Rate Cards'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_RATE_ADD', 'Add Labor Rate Card'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_RATE_EDIT', 'Edit Labor Rate Card'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_RATE_DELETE', 'Delete Labor Rate Card'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_RATE_BULK_UPDATE', 'Bulk Update Labor Rates');

-- LABOR ATTENDANCE
INSERT INTO org_1765784569491.permissions (category_id, code, name) VALUES
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_ATTEND_VIEW', 'View Labor Attendance'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_ATTEND_MARK', 'Mark Labor Attendance'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_ATTEND_MANUAL', 'Manual Labor Attendance Entry');

-- LABOR PAYROLL
INSERT INTO org_1765784569491.permissions (category_id, code, name) VALUES
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_PAYROLL_VIEW', 'View Labor Payroll'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_PAYROLL_GENERATE', 'Generate Labor Payroll'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_PAYROLL_EXPORT', 'Export Labor Payroll Reports');

-- LABOR SETTINGS
INSERT INTO org_1765784569491.permissions (category_id, code, name) VALUES
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_SETTINGS_VIEW', 'View Labor Settings'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_SETTINGS_EDIT', 'Edit Labor Settings');

INSERT INTO org_1765784569491.permissions (category_id, code, name) VALUES
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_ATTEND_VIEW', 'View Labor Attendance'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_ATTEND_MARK', 'Mark Labor Attendance'),
((SELECT id FROM permission_categories WHERE code='LABOR_MGMT' AND feature_id=1), 'LABOR_ATTEND_MANUAL', 'Manual Labor Attendance Entry');

ALTER TABLE org_1765784569491.organization_info ADD COLUMN rekognition_collection_id VARCHAR(255) AFTER timezone;
ALTER TABLE org_1765784569491.organization_info ADD COLUMN timezone varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT 'Asia/Kolkata';