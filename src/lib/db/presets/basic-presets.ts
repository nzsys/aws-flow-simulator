import type { PresetArchitecture } from './types'
import { makeNode, makeEdge } from './helpers'

// Static Website (Minimal): Route53 → CloudFront → S3
export const staticWebsite: PresetArchitecture = {
  id: 'preset-static-website',
  name: 'Static Website',
  description: 'Route53 → CloudFront → S3 の最もシンプルな静的サイトホスティング構成',
  scale: 'S',
  scaleDescription: '~100 users / ランディングページ',
  nodes: [
    makeNode('sw-route53', 'route53', 0, 200),
    makeNode('sw-cloudfront', 'cloudfront', 250, 200),
    makeNode('sw-s3', 's3', 500, 200),
  ],
  edges: [
    makeEdge('sw-e1', 'sw-route53', 'sw-cloudfront', 'route53', 'cloudfront'),
    makeEdge('sw-e2', 'sw-cloudfront', 'sw-s3', 'cloudfront', 's3'),
  ],
}

// Serverless API: Route53 → API Gateway → Lambda → DynamoDB (no VPC)
export const serverlessApi: PresetArchitecture = {
  id: 'preset-serverless-api',
  name: 'Serverless API',
  description: 'Route53 → API Gateway → Lambda → DynamoDB のサーバーレス構成',
  scale: 'S',
  scaleDescription: '~1K users / MVP、小規模API',
  nodes: [
    makeNode('sa-route53', 'route53', 0, 200),
    makeNode('sa-apigw', 'api-gateway', 250, 200),
    makeNode('sa-lambda', 'lambda', 500, 200),
    makeNode('sa-dynamodb', 'dynamodb', 750, 200),
  ],
  edges: [
    makeEdge('sa-e1', 'sa-route53', 'sa-apigw', 'route53', 'api-gateway'),
    makeEdge('sa-e2', 'sa-apigw', 'sa-lambda', 'api-gateway', 'lambda'),
    makeEdge('sa-e3', 'sa-lambda', 'sa-dynamodb', 'lambda', 'dynamodb'),
  ],
}

// Static Website + API: Route53 → CloudFront → S3 + API Gateway → Lambda → DynamoDB
export const staticWebsiteWithApi: PresetArchitecture = {
  id: 'preset-static-website-api',
  name: 'Static Website + API',
  description: 'Route53 → CloudFront → S3 (静的サイト) + API Gateway → Lambda → DynamoDB (API)',
  scale: 'S',
  scaleDescription: '~1K users / 小規模SPA + API',
  nodes: [
    makeNode('swa-route53', 'route53', 0, 200),
    makeNode('swa-cloudfront', 'cloudfront', 250, 80),
    makeNode('swa-s3', 's3', 500, 80),
    makeNode('swa-apigw', 'api-gateway', 250, 320),
    makeNode('swa-lambda', 'lambda', 500, 320),
    makeNode('swa-dynamodb', 'dynamodb', 750, 320),
  ],
  edges: [
    makeEdge('swa-e1', 'swa-route53', 'swa-cloudfront', 'route53', 'cloudfront'),
    makeEdge('swa-e2', 'swa-cloudfront', 'swa-s3', 'cloudfront', 's3'),
    makeEdge('swa-e3', 'swa-route53', 'swa-apigw', 'route53', 'api-gateway'),
    makeEdge('swa-e4', 'swa-apigw', 'swa-lambda', 'api-gateway', 'lambda'),
    makeEdge('swa-e5', 'swa-lambda', 'swa-dynamodb', 'lambda', 'dynamodb'),
  ],
}
