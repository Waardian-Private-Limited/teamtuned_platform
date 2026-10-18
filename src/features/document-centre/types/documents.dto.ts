// Document Centre wire types (backend /api/v1/documents, docs/DOCUMENTS_DESIGN.md).

export type DocType = 'offer_letter' | 'appointment_letter' | 'joining_letter' | 'confirmation_letter' | 'experience_letter' | 'relieving_letter';
export type SubjectType = 'employee' | 'candidate';
export type InputType = 'date' | 'text' | 'number' | 'money';

export interface FieldDto { key: string; label: string }

export interface DocTypeDto {
  code: DocType;
  label: string;
  description: string;
  subjects: SubjectType[];
  referenceFormat: string;
  fields: FieldDto[];
}

export interface TypesDto { types: DocTypeDto[]; planned: string[] }

export type BlockType = 'letterhead' | 'title' | 'meta' | 'text' | 'table' | 'signatures' | 'acceptance' | 'spacer' | 'page_break' | 'footer_note';

export interface SignatureSlot { label: string; signatoryId: number | null; showStamp: boolean }

export type TemplateBlock =
  | { id: string; type: 'letterhead'; showLogo: boolean; showAddress: boolean }
  | { id: string; type: 'title'; text: string; align: 'left' | 'center' }
  | { id: string; type: 'meta'; showReference: boolean; showDate: boolean }
  | { id: string; type: 'text'; text: string }
  | { id: string; type: 'footer_note'; text: string }
  | { id: string; type: 'table'; heading: string; rows: { label: string; value: string }[] }
  | { id: string; type: 'signatures'; closing: string; slots: SignatureSlot[] }
  | { id: string; type: 'acceptance'; text: string }
  | { id: string; type: 'spacer'; size: 'sm' | 'md' | 'lg' }
  | { id: string; type: 'page_break' };

export interface TemplateInput { key: string; label: string; type: InputType; default: string; required: boolean }

export interface TemplatePage { margin: 'narrow' | 'normal' | 'wide'; fontSize: number }

export interface TemplateDto {
  id: number;
  docType: DocType;
  docTypeLabel: string;
  name: string;
  subOrganizationId: number | null;
  isDefault: boolean;
  page: TemplatePage;
  blocks: TemplateBlock[];
  inputs: TemplateInput[];
  referenceFormat: string | null;
  version: number;
  updatedAt: string;
  blockCount?: number;
}

export interface TemplateBody {
  doc_type: DocType;
  name: string;
  sub_organization_id: number | null;
  is_default: boolean;
  page: TemplatePage;
  blocks: TemplateBlock[];
  inputs: TemplateInput[];
  reference_format: string | null;
}

export interface AssetDto {
  id: number;
  kind: 'signature' | 'stamp';
  name: string;
  designation: string | null;
  subOrganizationId: number | null;
  mime: string;
  updatedAt: string;
}

/** A person letters are about: an employee (employee id) or a recruitment candidate (application id). */
export interface SubjectDto {
  type: SubjectType;
  id: number;
  name: string;
  email: string | null;
  status: string;
  // employee
  code?: string | null;
  designation?: string | null;
  department?: string | null;
  // candidate
  positionTitle?: string;
  stage?: string;
  offerStatus?: string | null;
}

export interface SubjectPage { type: SubjectType; items: SubjectDto[]; page: number; pageSize: number; total: number; pages: number }

export interface FormInputDto extends TemplateInput { value: string }

export interface SlotDto { key: string; label: string; signatoryId: number | null; open: boolean; chosen?: number | null }

export interface GenerateFormDto {
  subject: { type: SubjectType; id: number; name: string; email: string | null; subOrganizationId: number | null };
  templates: { id: number; docType: DocType; docTypeLabel: string; name: string; isDefault: boolean; subOrganizationId: number | null }[];
  template?: { id: number; name: string; docType: DocType };
  inputs?: FormInputDto[];
  slots?: SlotDto[];
  usesStamp?: boolean;
  signatories?: { id: number; name: string; designation: string | null }[];
  stamps?: { id: number; name: string }[];
  email?: string | null;
}

export interface IssueDto {
  id: number;
  docType: DocType;
  docTypeLabel: string;
  templateName: string | null;
  reference: string | null;
  delivery: 'download' | 'email';
  emailedTo: string | null;
  issuedBy: string | null;
  issuedAt: string;
}

export interface GenerateBody {
  template_id: number;
  subject: { type: SubjectType; id: number };
  inputs: Record<string, string>;
  signatories: Record<string, number>;
  stamp_id?: number | null;
  delivery: 'download' | 'email';
  email_to?: string;
  message?: string;
  preview?: boolean;
}
