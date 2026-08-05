export interface RedisConfig {
  url: string;
  maxRetries: number;
  connectionTimeout: number;
}

export interface SQSConfig {
  queueUrl: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  maxRetries: number;
}

export interface AppConfig {
  redis: RedisConfig;
  sqs: SQSConfig;
  logLevel: string;
  environment: string;
}

export const config: AppConfig = {
  redis: {
    url: process.env.REDIS_URL || '',
    maxRetries: parseInt(process.env.REDIS_MAX_RETRIES || '3'),
    connectionTimeout: parseInt(process.env.REDIS_TIMEOUT || '5000'),
  },
  sqs: {
    queueUrl: process.env.SQS_QUEUE_URL || 'https://sqs.us-east-1.amazonaws.com/123456789/my-queue',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    maxRetries: parseInt(process.env.SQS_MAX_RETRIES || '3'),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',
};
