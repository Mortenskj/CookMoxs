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
    ownerDetail: 'Kun du kan se dette indhold.',
    memberDetail: 'Kun ejeren kan se dette indhold.',
    neutralDetail: 'Kun ejeren kan se dette indhold.',
  },
  shared_view: {
    shortLabel: 'Delt visning',
    ownerDetail: 'Andre kan se dette indhold, men ikke redigere det.',
    memberDetail: 'Du kan se dette indhold, men ikke redigere det.',
    neutralDetail: 'Dette indhold deles som læseadgang.',
  },
  shared_edit: {
    shortLabel: 'Delt visning',
    ownerDetail: 'Andre kan se dette indhold, men ikke redigere det.',
    memberDetail: 'Du kan se dette indhold, men ikke redigere det.',
    neutralDetail: 'Dette indhold deles som læseadgang.',
  },
  household: {
    shortLabel: 'Husstand',
    ownerDetail: 'Dette indhold tilhører en husstand.',
    memberDetail: 'Dette indhold tilhører en husstand.',
    neutralDetail: 'Dette indhold tilhører en husstand.',
  },
};
