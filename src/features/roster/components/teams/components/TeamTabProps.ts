import type { useTeamEditor } from '../../../hooks/useTeamEditor';
import type { TeamsCatalog } from '../../../hooks/useTeamsCatalog';
import type { RosterUnit, RosterUnitDetail } from '../../../types/roster.types';

export type TeamEditor = ReturnType<typeof useTeamEditor>;

export interface TeamTabProps {
  editor: TeamEditor;
  catalog: TeamsCatalog;
  units: RosterUnit[];
}

export interface TeamDetailTabProps extends TeamTabProps {
  detail: RosterUnitDetail;
}
