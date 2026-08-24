import { createTRPCRouter } from '@/trpc/init'
import { dashboardProcedure } from './dashboard.procedure'
import {
  createSettlementProcedure,
  ensureDirectGroupProcedure,
  linkParticipantProcedure,
  unlinkParticipantProcedure,
  updatePersonProcedure,
} from './identity.procedure'

export const personalRouter = createTRPCRouter({
  dashboard: dashboardProcedure,
  linkParticipant: linkParticipantProcedure,
  unlinkParticipant: unlinkParticipantProcedure,
  updatePerson: updatePersonProcedure,
  ensureDirectGroup: ensureDirectGroupProcedure,
  createSettlement: createSettlementProcedure,
})
