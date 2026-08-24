import { createTRPCRouter } from '@/trpc/init'
import { dashboardProcedure } from './dashboard.procedure'

export const personalRouter = createTRPCRouter({
  dashboard: dashboardProcedure,
})
