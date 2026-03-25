export const COOKING_LEVELS = [
  'Begynder',
  'Hverdags kok',
  'Erfaren amatør',
  'Professionel',
] as const;

export type UserLevel = (typeof COOKING_LEVELS)[number];

export const DEFAULT_USER_LEVEL: UserLevel = 'Hverdags kok';

export const LEVEL_META: Record<UserLevel, {
  shortLabel: string;
  cookIntro: string;
  reminderLabel: string;
  ingredientLabel: string;
  nextStepLabel: string;
}> = {
  'Begynder': {
    shortLabel: 'Tryg guidning',
    cookIntro: 'Rolig, trinvis guidning med lidt mere forklaring undervejs.',
    reminderLabel: 'Husk dette',
    ingredientLabel: 'Brug nu',
    nextStepLabel: 'Det kommer bagefter',
  },
  'Hverdags kok': {
    shortLabel: 'Praktisk flow',
    cookIntro: 'Korte, praktiske instruktioner til almindelig madlavning i hverdagen.',
    reminderLabel: 'Husk',
    ingredientLabel: 'Ingredienser nu',
    nextStepLabel: 'Næste trin',
  },
  'Erfaren amatør': {
    shortLabel: 'Præcis støtte',
    cookIntro: 'Mere præcist køkkensprog og mindre håndholding, men stadig overskueligt.',
    reminderLabel: 'Vigtigt',
    ingredientLabel: 'Mise en place',
    nextStepLabel: 'Næste arbejdsgang',
  },
  'Professionel': {
    shortLabel: 'Service mode',
    cookIntro: 'Stramt, teknisk og hurtigt overblik med fokus på execution.',
    reminderLabel: 'Obs.',
    ingredientLabel: 'Til step',
    nextStepLabel: 'On deck',
  },
};
