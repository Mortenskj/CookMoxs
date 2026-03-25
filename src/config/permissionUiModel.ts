export type PermissionUiState = 'private' | 'shared_view' | 'shared_edit' | 'household';

export interface PermissionUiCopy {
  shortLabel: string;
  ownerDetail: string;
  memberDetail: string;
  neutralDetail: string;
}

export const PERMISSION_UI_COPY: Record<PermissionUiState, PermissionUiCopy> = {
  private: {
    shortLabel: 'Privat',
    ownerDetail: 'Kun dig kan se dette indhold.',
    memberDetail: 'Kun ejeren kan se dette indhold.',
    neutralDetail: 'Kun ejeren kan se dette indhold.',
  },
  shared_view: {
    shortLabel: 'Delt visning',
    ownerDetail: 'Andre kan se dette indhold, men ikke redigere det.',
    memberDetail: 'Du kan se dette indhold, men ikke redigere det.',
    neutralDetail: 'Dette indhold deles som laeseadgang.',
  },
  shared_edit: {
    shortLabel: 'Delt redigering',
    ownerDetail: 'Andre kan se og redigere dette indhold.',
    memberDetail: 'Du kan se og redigere dette indhold.',
    neutralDetail: 'Dette indhold deles med redigering.',
  },
  household: {
    shortLabel: 'Husstand',
    ownerDetail: 'Dette indhold tilhoerer en husstand.',
    memberDetail: 'Dette indhold tilhoerer en husstand.',
    neutralDetail: 'Dette indhold tilhoerer en husstand.',
  },
};
