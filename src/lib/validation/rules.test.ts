import { describe, it, expect } from 'vitest'
import { getConnectionProtocol } from './rules'

describe('getConnectionProtocol', () => {
  it('should return dns for route53 to any target', () => {
    expect(getConnectionProtocol('route53', 'cloudfront')).toBe('dns')
    expect(getConnectionProtocol('route53', 'alb')).toBe('dns')
    expect(getConnectionProtocol('route53', 'api-gateway')).toBe('dns')
    expect(getConnectionProtocol('route53', 's3')).toBe('dns')
  })

  it('should return inline for waf/shield', () => {
    expect(getConnectionProtocol('waf', 'cloudfront')).toBe('inline')
    expect(getConnectionProtocol('waf', 'alb')).toBe('inline')
    expect(getConnectionProtocol('shield', 'cloudfront')).toBe('inline')
    expect(getConnectionProtocol('shield', 'route53')).toBe('inline')
  })

  it('should return http for alb to compute services', () => {
    expect(getConnectionProtocol('alb', 'ecs')).toBe('http')
    expect(getConnectionProtocol('alb', 'ec2')).toBe('http')
    expect(getConnectionProtocol('alb', 'lambda')).toBe('http')
  })

  it('should return tcp for nlb to compute services', () => {
    expect(getConnectionProtocol('nlb', 'ecs')).toBe('tcp')
    expect(getConnectionProtocol('nlb', 'ec2')).toBe('tcp')
  })

  it('should return invoke for api-gateway to lambda', () => {
    expect(getConnectionProtocol('api-gateway', 'lambda')).toBe('invoke')
  })

  it('should return https for api-gateway to non-lambda targets', () => {
    expect(getConnectionProtocol('api-gateway', 'ecs')).toBe('https')
    expect(getConnectionProtocol('api-gateway', 'ec2')).toBe('https')
    expect(getConnectionProtocol('api-gateway', 'nlb')).toBe('https')
  })

  it('should return tcp for compute to rds/elasticache', () => {
    expect(getConnectionProtocol('ecs', 'rds')).toBe('tcp')
    expect(getConnectionProtocol('ec2', 'rds')).toBe('tcp')
    expect(getConnectionProtocol('lambda', 'rds')).toBe('tcp')
    expect(getConnectionProtocol('ecs', 'elasticache')).toBe('tcp')
    expect(getConnectionProtocol('ec2', 'elasticache')).toBe('tcp')
    expect(getConnectionProtocol('lambda', 'elasticache')).toBe('tcp')
  })

  it('should return https for compute to dynamodb/s3', () => {
    expect(getConnectionProtocol('ecs', 'dynamodb')).toBe('https')
    expect(getConnectionProtocol('ec2', 's3')).toBe('https')
    expect(getConnectionProtocol('lambda', 'dynamodb')).toBe('https')
    expect(getConnectionProtocol('lambda', 's3')).toBe('https')
  })

  it('should return https for cloudfront to any target', () => {
    expect(getConnectionProtocol('cloudfront', 'alb')).toBe('https')
    expect(getConnectionProtocol('cloudfront', 's3')).toBe('https')
    expect(getConnectionProtocol('cloudfront', 'ec2')).toBe('https')
  })

  it('should return tcp for nat-gateway to internet-gateway', () => {
    expect(getConnectionProtocol('nat-gateway', 'internet-gateway')).toBe('tcp')
  })

  it('should return http for alb to eks', () => {
    expect(getConnectionProtocol('alb', 'eks')).toBe('http')
  })

  it('should return tcp for nlb to eks', () => {
    expect(getConnectionProtocol('nlb', 'eks')).toBe('tcp')
  })

  it('should return https for compute to messaging services', () => {
    expect(getConnectionProtocol('ecs', 'sqs')).toBe('https')
    expect(getConnectionProtocol('eks', 'sns')).toBe('https')
    expect(getConnectionProtocol('ec2', 'kinesis')).toBe('https')
    expect(getConnectionProtocol('lambda', 'sqs')).toBe('https')
  })

  it('should return invoke for sqs/sns/kinesis to lambda', () => {
    expect(getConnectionProtocol('sqs', 'lambda')).toBe('invoke')
    expect(getConnectionProtocol('sns', 'lambda')).toBe('invoke')
    expect(getConnectionProtocol('kinesis', 'lambda')).toBe('invoke')
  })

  it('should return https for sqs/kinesis to ecs/eks', () => {
    expect(getConnectionProtocol('sqs', 'ecs')).toBe('https')
    expect(getConnectionProtocol('sqs', 'eks')).toBe('https')
    expect(getConnectionProtocol('kinesis', 'ecs')).toBe('https')
    expect(getConnectionProtocol('kinesis', 'eks')).toBe('https')
  })

  it('should return https for sns to sqs/ecs/eks', () => {
    expect(getConnectionProtocol('sns', 'sqs')).toBe('https')
    expect(getConnectionProtocol('sns', 'ecs')).toBe('https')
    expect(getConnectionProtocol('sns', 'eks')).toBe('https')
  })

  it('should fallback to https for unknown pairs', () => {
    expect(getConnectionProtocol('s3', 'rds')).toBe('https')
  })
})
