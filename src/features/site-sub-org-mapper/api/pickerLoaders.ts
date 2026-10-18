import * as mapperApi from './siteSubOrgMapper.api';
import { toSiteOption, toSubOrgOption } from '../types/siteSubOrgMapper.mapper';
import type { PickerOption } from '../types/siteSubOrgMapper.model';

// Module-level loaders so pickers get a stable function reference.
export function loadSiteOptions(search: string): Promise<PickerOption[]> {
  return mapperApi.listSiteOptions(search).then((dto) => (dto.sites || []).map(toSiteOption));
}

export function loadSubOrgOptions(search: string): Promise<PickerOption[]> {
  return mapperApi.listSubOrgOptions(search).then((dto) => (dto.subOrganizations || []).map(toSubOrgOption));
}
