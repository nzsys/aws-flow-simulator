export type { PresetScale, PresetArchitecture } from './types'

import { staticWebsite, serverlessApi, staticWebsiteWithApi } from './basic-presets'
import { basicWebApp, haWebApp, secureThreeTier } from './web-app-presets'
import { eksMicroservices, highPerformanceTcp } from './container-presets'
import { serverlessFullStack, queueWorker, cqrsReadWrite } from './serverless-presets'
import { eventDriven, realtimePipeline, fanoutNotification } from './event-presets'
import { enterpriseEcommerce } from './enterprise-presets'
import type { PresetArchitecture } from './types'

export const PRESET_ARCHITECTURES: readonly PresetArchitecture[] = [
  staticWebsite,
  serverlessApi,
  staticWebsiteWithApi,
  basicWebApp,
  queueWorker,
  highPerformanceTcp,
  realtimePipeline,
  haWebApp,
  eksMicroservices,
  fanoutNotification,
  serverlessFullStack,
  secureThreeTier,
  cqrsReadWrite,
  eventDriven,
  enterpriseEcommerce,
]
