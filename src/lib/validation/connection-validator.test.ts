import { describe, it, expect } from 'vitest'
import { canConnect, getServiceLabel, isReverseValid } from './connection-validator'

describe('getServiceLabel', () => {
  it('should return display label for service types', () => {
    expect(getServiceLabel('route53')).toBe('Route 53')
    expect(getServiceLabel('cloudfront')).toBe('CloudFront')
    expect(getServiceLabel('api-gateway')).toBe('API Gateway')
    expect(getServiceLabel('ec2')).toBe('EC2')
    expect(getServiceLabel('elasticache')).toBe('ElastiCache')
  })
})

describe('isReverseValid', () => {
  it('should return true when reverse connection is valid', () => {
    // EC2 → Route53 is invalid, but Route53 → EC2 is valid
    expect(isReverseValid('ec2', 'route53')).toBe(true)
  })

  it('should return false when reverse connection is also invalid', () => {
    // EC2 → WAF is invalid, WAF → EC2 is also invalid
    expect(isReverseValid('ec2', 'waf')).toBe(false)
  })

  it('should return false when target has restrictions that exclude source', () => {
    // Route53 → EC2: EC2's allowed targets don't include Route53
    expect(isReverseValid('route53', 'ec2')).toBe(false)
  })
})

describe('canConnect', () => {
  it('should allow valid connections', () => {
    expect(canConnect('route53', 'cloudfront').allowed).toBe(true)
    expect(canConnect('cloudfront', 'alb').allowed).toBe(true)
    expect(canConnect('alb', 'ecs').allowed).toBe(true)
    expect(canConnect('ecs', 'rds').allowed).toBe(true)
    expect(canConnect('api-gateway', 'lambda').allowed).toBe(true)
  })

  it('should block invalid connections', () => {
    expect(canConnect('route53', 'rds').allowed).toBe(false)
    expect(canConnect('s3', 'ec2').allowed).toBe(false)
  })

  it('should warn about suboptimal connections', () => {
    const result = canConnect('cloudfront', 'rds')
    // cloudfront->rds: not in allowed targets, should be blocked
    expect(result.allowed).toBe(false)
  })

  it('should return Japanese infrastructure message', () => {
    const result = canConnect('vpc', 'subnet')
    expect(result.allowed).toBe(false)
    expect(result.warning).toBe(
      'インフラサービスはコンテナメント（包含）で配置します。接続ではありません。',
    )
  })

  it('should return Japanese infrastructure message for flow-to-infra', () => {
    const result = canConnect('ecs', 'vpc')
    expect(result.allowed).toBe(false)
    expect(result.warning).toBe(
      'インフラサービスはコンテナメント（包含）で配置します。接続ではありません。',
    )
  })

  it('should allow nat-gateway to internet-gateway', () => {
    const result = canConnect('nat-gateway', 'internet-gateway')
    expect(result.allowed).toBe(true)
  })

  it('should return terminal service message for S3', () => {
    const result = canConnect('s3', 'ec2')
    expect(result.allowed).toBe(false)
    expect(result.warning).toBe('S3 は終端サービスのため、出力接続はできません')
  })

  it('should return terminal service message for RDS', () => {
    const result = canConnect('rds', 'ecs')
    expect(result.allowed).toBe(false)
    expect(result.warning).toBe('RDS は終端サービスのため、出力接続はできません')
  })

  it('should return terminal service message for DynamoDB', () => {
    const result = canConnect('dynamodb', 's3')
    expect(result.allowed).toBe(false)
    expect(result.warning).toBe('DynamoDB は終端サービスのため、出力接続はできません')
  })

  it('should return terminal service message for ElastiCache', () => {
    const result = canConnect('elasticache', 'lambda')
    expect(result.allowed).toBe(false)
    expect(result.warning).toBe('ElastiCache は終端サービスのため、出力接続はできません')
  })

  it('should include reverse hint when reverse connection is valid (EC2 → Route53)', () => {
    const result = canConnect('ec2', 'route53')
    expect(result.allowed).toBe(false)
    expect(result.warning).toContain('EC2 → Route 53 は接続できません')
    expect(result.warning).toContain('逆方向 Route 53 → EC2 は可能です')
    expect(result.warning).toContain('EC2 の接続先:')
    expect(result.warning).toContain('RDS')
    expect(result.warning).toContain('DynamoDB')
  })

  it('should not include reverse hint when reverse is also invalid (EC2 → WAF)', () => {
    const result = canConnect('ec2', 'waf')
    expect(result.allowed).toBe(false)
    expect(result.warning).toContain('EC2 → WAF は接続できません。')
    expect(result.warning).not.toContain('逆方向')
    expect(result.warning).toContain('EC2 の接続先:')
  })

  it('should include allowed targets list in rejection message', () => {
    const result = canConnect('route53', 'rds')
    expect(result.allowed).toBe(false)
    expect(result.warning).toContain('Route 53 の接続先:')
    expect(result.warning).toContain('CloudFront')
    expect(result.warning).toContain('ALB')
  })
})
