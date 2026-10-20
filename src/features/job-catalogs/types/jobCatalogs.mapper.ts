import type { CatalogItemDto } from './jobCatalogs.dto';
import type { CatalogFormInput, CatalogItem } from './jobCatalogs.model';

export function toCatalogItem(dto: CatalogItemDto): CatalogItem {
  return {
    id: dto.id,
    subOrganizationId: dto.sub_organization_id ?? null,
    name: dto.name,
    code: dto.code,
    description: dto.description,
    displayOrder: dto.display_order,
    status: dto.status,
    employeeCount: dto.employee_count,
  };
}

export function toCatalogBody(input: CatalogFormInput) {
  return {
    name: input.name.trim(),
    code: input.code.trim() || undefined,
    description: input.description.trim(),
    display_order: input.displayOrder.trim() === '' ? undefined : Number(input.displayOrder),
    status: input.status,
    sub_organization_id: input.subOrganizationId,
  };
}
