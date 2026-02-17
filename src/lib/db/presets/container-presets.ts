import type { PresetArchitecture } from './types'
import { makeNode, makeEdge } from './helpers'

// EKS Microservices: Route53 → CloudFront → VPC[PubSubnet(ALB) → PrivSubnet(EKS → RDS, EKS → ElastiCache)]
export const eksMicroservices: PresetArchitecture = {
  id: 'preset-eks-microservices',
  name: 'EKS Microservices',
  description:
    'Route53 → CloudFront → VPC内ALB → EKS → RDS + ElastiCache のマイクロサービス構成',
  scale: 'L',
  scaleDescription: '~100K users / マイクロサービス',
  nodes: [
    makeNode('ems-route53', 'route53', 0, 200),
    makeNode('ems-cloudfront', 'cloudfront', 250, 200),
    makeNode('ems-vpc', 'vpc', 500, 30, { style: { width: 660, height: 560 } }),
    makeNode('ems-pub-subnet', 'subnet', 30, 130, {
      parentId: 'ems-vpc',
      subnetType: 'public',
      style: { width: 260, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('ems-alb', 'alb', 30, 40, { parentId: 'ems-pub-subnet' }),
    makeNode('ems-priv-compute', 'subnet', 330, 130, {
      parentId: 'ems-vpc',
      subnetType: 'private',
      style: { width: 270, height: 160 },
      configOverrides: {
        name: 'Private Subnet (Compute)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('ems-eks', 'eks', 35, 40, {
      parentId: 'ems-priv-compute',
      configOverrides: {
        name: 'EKS',
        latency: { base: 50, perRequest: 0.5 },
        cost: { monthly: 73 },
        specific: {
          nodeGroupType: 'managed' as const,
          nodeCount: 3,
          instanceType: 't3.medium',
          autoScaling: { enabled: true, min: 2, max: 10, targetCPU: 70 },
        },
      },
    }),
    makeNode('ems-priv-data', 'subnet', 330, 330, {
      parentId: 'ems-vpc',
      subnetType: 'private',
      style: { width: 270, height: 210 },
      configOverrides: {
        name: 'Private Subnet (Data)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.3.0/24', availabilityZone: 'ap-northeast-1c', subnetType: 'private' },
      },
    }),
    makeNode('ems-rds', 'rds', 35, 40, { parentId: 'ems-priv-data' }),
    makeNode('ems-cache', 'elasticache', 35, 120, {
      parentId: 'ems-priv-data',
      configOverrides: {
        name: 'ElastiCache',
        cache: { enabled: true, ttl: 300, hitRate: 0.9 },
        latency: { base: 1 },
        cost: { monthly: 12.5 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.t3.micro',
          numNodes: 2,
          clusterMode: false,
        },
      },
    }),
  ],
  edges: [
    makeEdge('ems-e1', 'ems-route53', 'ems-cloudfront', 'route53', 'cloudfront'),
    makeEdge('ems-e2', 'ems-cloudfront', 'ems-alb', 'cloudfront', 'alb'),
    makeEdge('ems-e3', 'ems-alb', 'ems-eks', 'alb', 'eks'),
    makeEdge('ems-e4', 'ems-eks', 'ems-rds', 'eks', 'rds'),
    makeEdge('ems-e5', 'ems-eks', 'ems-cache', 'eks', 'elasticache'),
  ],
}

// High-Performance TCP: Route53 → VPC[NLB → ECS → RDS + ElastiCache]
export const highPerformanceTcp: PresetArchitecture = {
  id: 'preset-high-perf-tcp',
  name: 'High-Performance TCP',
  description:
    'Route53 → VPC内NLB → ECS → RDS + ElastiCache のTCP/gRPC向け高性能構成',
  scale: 'M',
  scaleDescription: '~5K同時接続 / gRPC、ゲームサーバー',
  nodes: [
    makeNode('hpt-route53', 'route53', 0, 200),
    makeNode('hpt-vpc', 'vpc', 250, 30, { style: { width: 660, height: 460 } }),
    makeNode('hpt-pub-subnet', 'subnet', 30, 100, {
      parentId: 'hpt-vpc',
      subnetType: 'public',
      style: { width: 260, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('hpt-nlb', 'nlb', 30, 40, { parentId: 'hpt-pub-subnet' }),
    makeNode('hpt-priv-subnet', 'subnet', 330, 100, {
      parentId: 'hpt-vpc',
      subnetType: 'private',
      style: { width: 270, height: 330 },
      configOverrides: {
        name: 'Private Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('hpt-ecs', 'ecs', 35, 40, {
      parentId: 'hpt-priv-subnet',
      configOverrides: {
        name: 'ECS',
        latency: { base: 30, perRequest: 0.3 },
        cost: { monthly: 0 },
        specific: {
          launchType: 'fargate' as const,
          taskCount: 4,
          cpu: 1,
          memory: 2,
          autoScaling: { enabled: true, min: 2, max: 16, targetCPU: 60 },
        },
      },
    }),
    makeNode('hpt-rds', 'rds', 35, 140, {
      parentId: 'hpt-priv-subnet',
      configOverrides: {
        name: 'RDS',
        latency: { base: 3, perRequest: 0.1 },
        cost: { monthly: 50 },
        security: { encryption: true },
        specific: {
          instanceClass: 'db.r5.large',
          multiAZ: false,
          readReplicas: 0,
          storageGB: 100,
        },
      },
    }),
    makeNode('hpt-cache', 'elasticache', 35, 240, {
      parentId: 'hpt-priv-subnet',
      configOverrides: {
        name: 'ElastiCache',
        cache: { enabled: true, ttl: 60, hitRate: 0.95 },
        latency: { base: 0.5 },
        cost: { monthly: 25 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.r5.large',
          numNodes: 2,
          clusterMode: false,
        },
      },
    }),
  ],
  edges: [
    makeEdge('hpt-e1', 'hpt-route53', 'hpt-nlb', 'route53', 'nlb'),
    makeEdge('hpt-e2', 'hpt-nlb', 'hpt-ecs', 'nlb', 'ecs'),
    makeEdge('hpt-e3', 'hpt-ecs', 'hpt-rds', 'ecs', 'rds'),
    makeEdge('hpt-e4', 'hpt-ecs', 'hpt-cache', 'ecs', 'elasticache'),
  ],
}
