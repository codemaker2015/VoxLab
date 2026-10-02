import { authenticationAgent } from './authentication';
import { returnsAgent } from './returns';
import { salesAgent } from './sales';
import { simulatedHumanAgent } from './simulatedHuman';

authenticationAgent.handoffs.push(returnsAgent, salesAgent, simulatedHumanAgent);
returnsAgent.handoffs.push(authenticationAgent, salesAgent, simulatedHumanAgent);
salesAgent.handoffs.push(authenticationAgent, returnsAgent, simulatedHumanAgent);
simulatedHumanAgent.handoffs.push(authenticationAgent, returnsAgent, salesAgent);

export const customerServiceRetailScenario = [
  authenticationAgent,
  returnsAgent,
  salesAgent,
  simulatedHumanAgent,
];

export const customerServiceRetailCompanyName = 'Snowy Peak Boards';
