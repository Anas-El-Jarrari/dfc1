export type Level = 'stadt' | 'land' | 'bund' | 'eu';
export type Ampel = 'green' | 'yellow' | 'red';
export type ExplainLevel = 'bilder' | 'leicht' | 'einfach' | 'original';

export interface CorpusEntry {
  id: string;
  title: string;
  text: string;
  source: string;
}

export interface Topic {
  id: string;
  title: string;
  shortTitle: string;
  level: Level;
  location: string;
  tags: string[];
  deadline: string;
  deadlineText?: string;
  ampel: Ampel;
  ampelText: string;
  stats: { pro: number; contra: number; neutral: number; total: number };
  decisionMaker: string;
  blick2050: {
    summary: string;
    details: string[];
    label: string;
  };
  corpus: CorpusEntry[];
}

export interface UserProfile {
  location: string;
  interests: string[];
  easyLanguage: boolean;
  kimDisabled: boolean;
}

export interface Submission {
  id: string;
  topicId: string;
  topicTitle: string;
  type: 'stellungnahme' | 'antrag' | 'petition' | 'umfrage';
  level: Level;
  text: string;
  submittedAt: string;
  status: 'eingereicht' | 'in_pruefung' | 'im_ausschuss' | 'entschieden';
  referenceNumber: string;
  nextDate?: string;
}

export interface GuardianResult {
  pass: boolean;
  issues: Array<{ type: string; text: string; severity: string }>;
  checkedAt: string;
}

export interface ExplainResult {
  sentences: Array<{ text: string; sourceId: string }>;
  level: ExplainLevel;
  guardian?: GuardianResult;
}

export interface WeighResult {
  pro: Array<{ text: string; sourceId: string; relevance: string }>;
  contra: Array<{ text: string; sourceId: string; relevance: string }>;
  strongestCounter: { text: string; sourceId: string };
  blick2050: { summary: string; details: string[]; label: string };
  guardian?: GuardianResult;
}

export interface RephraseResult {
  original: string;
  suggestion: string;
  aiPercentage: number;
  guardian?: GuardianResult;
}
