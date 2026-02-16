import type { AWSServiceType } from '@/types'

export const ALLOWED_TARGETS: Partial<Record<AWSServiceType, readonly AWSServiceType[]>> = {
  route53: ['cloudfront', 'alb', 'nlb', 'api-gateway', 's3', 'ec2'],
  cloudfront: ['alb', 'nlb', 'api-gateway', 's3', 'ec2', 'lambda'],
  waf: ['cloudfront', 'alb', 'api-gateway'],
  shield: ['cloudfront', 'alb', 'nlb', 'route53'],
  alb: ['ecs', 'eks', 'ec2', 'lambda'],
  nlb: ['ecs', 'eks', 'ec2'],
  'api-gateway': ['lambda', 'ecs', 'ec2', 'nlb'],
  ecs: ['rds', 'dynamodb', 'elasticache', 's3', 'sqs', 'sns', 'kinesis'],
  eks: ['rds', 'dynamodb', 'elasticache', 's3', 'sqs', 'sns', 'kinesis'],
  ec2: ['rds', 'dynamodb', 'elasticache', 's3', 'sqs', 'sns', 'kinesis'],
  lambda: ['rds', 'dynamodb', 'elasticache', 's3', 'sqs', 'sns', 'kinesis'],
  sqs: ['lambda', 'ecs', 'eks'],
  sns: ['lambda', 'sqs', 'kinesis', 'ecs', 'eks'],
  kinesis: ['lambda', 'ecs', 'eks'],
  s3: [],
  rds: [],
  dynamodb: [],
  elasticache: [],
  'nat-gateway': ['internet-gateway'],
}

export type ConnectionProtocol = 'http' | 'https' | 'tcp' | 'udp' | 'dns' | 'invoke' | 'inline'

const COMPUTE_TYPES: readonly AWSServiceType[] = ['ecs', 'eks', 'ec2', 'lambda']

const MESSAGING_TYPES: readonly AWSServiceType[] = ['sqs', 'sns', 'kinesis']

const PROTOCOL_RULES: readonly {
  readonly source: AWSServiceType | readonly AWSServiceType[]
  readonly target: AWSServiceType | readonly AWSServiceType[] | '*'
  readonly protocol: ConnectionProtocol
}[] = [
  { source: 'route53', target: '*', protocol: 'dns' },
  { source: 'waf', target: '*', protocol: 'inline' },
  { source: 'shield', target: '*', protocol: 'inline' },
  { source: 'alb', target: ['ecs', 'ec2', 'lambda'], protocol: 'http' },
  { source: 'alb', target: 'eks', protocol: 'http' },
  { source: 'nlb', target: ['ecs', 'ec2'], protocol: 'tcp' },
  { source: 'nlb', target: 'eks', protocol: 'tcp' },
  { source: 'api-gateway', target: 'lambda', protocol: 'invoke' },
  { source: 'api-gateway', target: ['ecs', 'ec2', 'nlb'], protocol: 'https' },
  { source: COMPUTE_TYPES, target: ['rds', 'elasticache'], protocol: 'tcp' },
  { source: COMPUTE_TYPES, target: ['dynamodb', 's3'], protocol: 'https' },
  { source: COMPUTE_TYPES, target: MESSAGING_TYPES, protocol: 'https' },
  { source: 'sqs', target: 'lambda', protocol: 'invoke' },
  { source: 'sqs', target: ['ecs', 'eks'], protocol: 'https' },
  { source: 'sns', target: 'lambda', protocol: 'invoke' },
  { source: 'sns', target: ['sqs', 'kinesis', 'ecs', 'eks'], protocol: 'https' },
  { source: 'kinesis', target: 'lambda', protocol: 'invoke' },
  { source: 'kinesis', target: ['ecs', 'eks'], protocol: 'https' },
  { source: 'cloudfront', target: '*', protocol: 'https' },
  { source: 'nat-gateway', target: 'internet-gateway', protocol: 'tcp' },
]

function matchesServiceType(
  serviceType: AWSServiceType,
  pattern: AWSServiceType | readonly AWSServiceType[] | '*',
): boolean {
  if (pattern === '*') return true
  if (Array.isArray(pattern)) return pattern.includes(serviceType)
  return serviceType === pattern
}

export function getConnectionProtocol(
  sourceType: AWSServiceType,
  targetType: AWSServiceType,
): ConnectionProtocol {
  for (const rule of PROTOCOL_RULES) {
    if (
      matchesServiceType(sourceType, rule.source) &&
      matchesServiceType(targetType, rule.target)
    ) {
      return rule.protocol
    }
  }
  return 'https'
}

export const SUBOPTIMAL_CONNECTIONS: Record<string, string> = {
  'cloudfront->rds': 'CloudFront should not connect directly to RDS. Use a compute layer.',
  'route53->rds': 'Route 53 should not connect directly to RDS. Use a load balancer.',
  'alb->rds': 'ALB should not connect directly to RDS. Use a compute service like ECS or Lambda.',
}
