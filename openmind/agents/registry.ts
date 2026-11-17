import draft from './draft';
import explain from './explain';
import factcheck from './factcheck';
import guardian from './guardian';
import kim from './kim';
import neutrality from './neutrality';
import newsExplain from './newsExplain';
import rephrase from './rephrase';
import weigh from './weigh';
import type { Agent } from './types';

/** Every agent of the app. A new agent is one file in this folder plus one entry here. */
const AGENTS = [kim, explain, weigh, rephrase, neutrality, guardian, newsExplain, draft, factcheck] as Agent[];

export const getAgent = (name: string) => AGENTS.find((a) => a.name === name);
export const agentNames = () => AGENTS.map((a) => a.name);
