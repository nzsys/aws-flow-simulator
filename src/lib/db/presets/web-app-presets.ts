import type { PresetArchitecture } from './types'
import { makeNode, makeEdge } from './helpers'

// Basic Web App: Route53 → CloudFront → [VPC: PubSubnet(ALB), PrivSubnet(ECS → RDS)]
export const basicWebApp: PresetArchitecture = {
  id: 'preset-basic-web-app',
  name: 'Basic Web App',
  description: 'Route53 → CloudFront → VPC内ALB → ECS → RDS の基本的な Web アプリケーション構成',
  scale: 'M',
  scaleDescription: '~10K users / 標準的Webアプリ',
  nodes: [
    makeNode('bwa-route53', 'route53', 0, 200),
    makeNode('bwa-cloudfront', 'cloudfront', 250, 200),
    makeNode('bwa-vpc', 'vpc', 500, 100, { style: { width: 640, height: 400 } }),
    makeNode('bwa-pub-subnet', 'subnet', 30, 110, {
      parentId: 'bwa-vpc',
      subnetType: 'public',
      style: { width: 260, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('bwa-alb', 'alb', 30, 40, { parentId: 'bwa-pub-subnet' }),
    makeNode('bwa-priv-subnet', 'subnet', 330, 110, {
      parentId: 'bwa-vpc',
      subnetType: 'private',
      style: { width: 260, height: 260 },
      configOverrides: {
        name: 'Private Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('bwa-ecs', 'ecs', 30, 40, {
      parentId: 'bwa-priv-subnet',
      configOverrides: {
        name: 'ECS',
        latency: { base: 50, perRequest: 0.5 },
        cost: { monthly: 0 },
        specific: {
          launchType: 'fargate' as const,
          taskCount: 2,
          cpu: 0.25,
          memory: 0.5,
          autoScaling: { enabled: true, min: 2, max: 10, targetCPU: 70 },
        },
      },
    }),
    makeNode('bwa-rds', 'rds', 30, 140, { parentId: 'bwa-priv-subnet' }),
  ],
  edges: [
    makeEdge('bwa-e1', 'bwa-route53', 'bwa-cloudfront', 'route53', 'cloudfront'),
    makeEdge('bwa-e2', 'bwa-cloudfront', 'bwa-alb', 'cloudfront', 'alb'),
    makeEdge('bwa-e3', 'bwa-alb', 'bwa-ecs', 'alb', 'ecs'),
    makeEdge('bwa-e4', 'bwa-ecs', 'bwa-rds', 'ecs', 'rds'),
  ],
}

// HA Web App: Route53 → CloudFront → [VPC: PubSubnet(ALB), PrivSubnet1(ECS), PrivSubnet2(RDS + ElastiCache)]
export const haWebApp: PresetArchitecture = {
  id: 'preset-ha-web-app',
  name: 'HA Web App',
  description:
    'Route53 → CloudFront → VPC内ALB → ECS(AutoScaling) → RDS(Multi-AZ) + ElastiCache の高可用性構成',
  scale: 'L',
  scaleDescription: '~100K users / 高可用性Webアプリ',
  nodes: [
    makeNode('ha-route53', 'route53', 0, 200),
    makeNode('ha-cloudfront', 'cloudfront', 250, 200),
    makeNode('ha-vpc', 'vpc', 500, 30, { style: { width: 660, height: 560 } }),
    makeNode('ha-pub-subnet', 'subnet', 30, 130, {
      parentId: 'ha-vpc',
      subnetType: 'public',
      style: { width: 260, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('ha-alb', 'alb', 30, 40, { parentId: 'ha-pub-subnet' }),
    makeNode('ha-priv-subnet-1', 'subnet', 330, 130, {
      parentId: 'ha-vpc',
      subnetType: 'private',
      style: { width: 270, height: 160 },
      configOverrides: {
        name: 'Private Subnet (Compute)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('ha-ecs', 'ecs', 35, 40, {
      parentId: 'ha-priv-subnet-1',
      configOverrides: {
        name: 'ECS',
        latency: { base: 50, perRequest: 0.5 },
        cost: { monthly: 0 },
        specific: {
          launchType: 'fargate' as const,
          taskCount: 4,
          cpu: 0.5,
          memory: 1,
          autoScaling: { enabled: true, min: 4, max: 20, targetCPU: 60 },
        },
      },
    }),
    makeNode('ha-priv-subnet-2', 'subnet', 330, 330, {
      parentId: 'ha-vpc',
      subnetType: 'private',
      style: { width: 270, height: 210 },
      configOverrides: {
        name: 'Private Subnet (Data)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.3.0/24', availabilityZone: 'ap-northeast-1c', subnetType: 'private' },
      },
    }),
    makeNode('ha-rds', 'rds', 35, 40, {
      parentId: 'ha-priv-subnet-2',
      configOverrides: {
        name: 'RDS',
        latency: { base: 3, perRequest: 0.1 },
        cost: { monthly: 50 },
        security: { encryption: true },
        specific: {
          instanceClass: 'db.t3.medium',
          multiAZ: true,
          readReplicas: 1,
          storageGB: 100,
        },
      },
    }),
    makeNode('ha-cache', 'elasticache', 35, 120, {
      parentId: 'ha-priv-subnet-2',
      configOverrides: {
        name: 'ElastiCache',
        cache: { enabled: true, ttl: 300, hitRate: 0.9 },
        latency: { base: 1 },
        cost: { monthly: 25 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.t3.small',
          numNodes: 2,
          clusterMode: false,
        },
      },
    }),
  ],
  edges: [
    makeEdge('ha-e1', 'ha-route53', 'ha-cloudfront', 'route53', 'cloudfront'),
    makeEdge('ha-e2', 'ha-cloudfront', 'ha-alb', 'cloudfront', 'alb'),
    makeEdge('ha-e3', 'ha-alb', 'ha-ecs', 'alb', 'ecs'),
    makeEdge('ha-e4', 'ha-ecs', 'ha-rds', 'ecs', 'rds'),
    makeEdge('ha-e5', 'ha-ecs', 'ha-cache', 'ecs', 'elasticache'),
  ],
}

// Secure Three-Tier: Shield + WAF + Route53 → CloudFront → VPC[PubSubnet(ALB) → PrivCompute(ECS) → PrivData(RDS + ElastiCache)] + NAT GW
export const secureThreeTier: PresetArchitecture = {
  id: 'preset-secure-three-tier',
  name: 'Secure Three-Tier Web App',
  description:
    'Shield + WAF + Route53 → CloudFront → VPC内ALB → ECS → RDS + ElastiCache のセキュリティベストプラクティス構成（NAT Gateway付き）',
  scale: 'L',
  scaleDescription: '~100K users / セキュリティ重視',
  nodes: [
    makeNode('stt-shield', 'shield', 0, 80, {
      configOverrides: {
        name: 'Shield',
        latency: { base: 0 },
        cost: { monthly: 3000 },
        security: { ddosProtection: true },
        specific: { tier: 'advanced' },
      },
    }),
    makeNode('stt-waf', 'waf', 0, 200),
    makeNode('stt-route53', 'route53', 0, 360),
    makeNode('stt-cloudfront', 'cloudfront', 280, 200),
    makeNode('stt-vpc', 'vpc', 560, 20, { style: { width: 680, height: 570 } }),
    makeNode('stt-pub-subnet', 'subnet', 30, 140, {
      parentId: 'stt-vpc',
      subnetType: 'public',
      style: { width: 260, height: 160 },
      configOverrides: {
        name: 'Public Subnet',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.1.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'public' },
      },
    }),
    makeNode('stt-alb', 'alb', 30, 40, { parentId: 'stt-pub-subnet' }),
    makeNode('stt-priv-compute', 'subnet', 330, 140, {
      parentId: 'stt-vpc',
      subnetType: 'private',
      style: { width: 270, height: 160 },
      configOverrides: {
        name: 'Private Subnet (Compute)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.2.0/24', availabilityZone: 'ap-northeast-1a', subnetType: 'private' },
      },
    }),
    makeNode('stt-ecs', 'ecs', 35, 40, {
      parentId: 'stt-priv-compute',
      configOverrides: {
        name: 'ECS',
        latency: { base: 50, perRequest: 0.5 },
        cost: { monthly: 0 },
        specific: {
          launchType: 'fargate' as const,
          taskCount: 3,
          cpu: 0.5,
          memory: 1,
          autoScaling: { enabled: true, min: 2, max: 12, targetCPU: 70 },
        },
      },
    }),
    makeNode('stt-priv-data', 'subnet', 330, 340, {
      parentId: 'stt-vpc',
      subnetType: 'private',
      style: { width: 270, height: 180 },
      configOverrides: {
        name: 'Private Subnet (Data)',
        latency: { base: 0 },
        cost: { monthly: 0 },
        specific: { cidrBlock: '10.0.3.0/24', availabilityZone: 'ap-northeast-1c', subnetType: 'private' },
      },
    }),
    makeNode('stt-rds', 'rds', 35, 35, {
      parentId: 'stt-priv-data',
      configOverrides: {
        name: 'RDS',
        latency: { base: 3, perRequest: 0.1 },
        cost: { monthly: 50 },
        security: { encryption: true },
        specific: {
          instanceClass: 'db.t3.medium',
          multiAZ: true,
          readReplicas: 0,
          storageGB: 100,
        },
      },
    }),
    makeNode('stt-cache', 'elasticache', 35, 110, {
      parentId: 'stt-priv-data',
      configOverrides: {
        name: 'ElastiCache',
        cache: { enabled: true, ttl: 300, hitRate: 0.9 },
        latency: { base: 1 },
        cost: { monthly: 25 },
        specific: {
          engine: 'redis' as const,
          nodeType: 'cache.t3.small',
          numNodes: 2,
          clusterMode: false,
        },
      },
    }),
    makeNode('stt-nat', 'nat-gateway', 30, 470, { parentId: 'stt-vpc' }),
  ],
  edges: [
    makeEdge('stt-e1', 'stt-shield', 'stt-cloudfront', 'shield', 'cloudfront'),
    makeEdge('stt-e2', 'stt-waf', 'stt-cloudfront', 'waf', 'cloudfront'),
    makeEdge('stt-e3', 'stt-route53', 'stt-cloudfront', 'route53', 'cloudfront'),
    makeEdge('stt-e4', 'stt-cloudfront', 'stt-alb', 'cloudfront', 'alb'),
    makeEdge('stt-e5', 'stt-alb', 'stt-ecs', 'alb', 'ecs'),
    makeEdge('stt-e6', 'stt-ecs', 'stt-rds', 'ecs', 'rds'),
    makeEdge('stt-e7', 'stt-ecs', 'stt-cache', 'ecs', 'elasticache'),
  ],
}
