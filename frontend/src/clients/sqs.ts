import { config } from '../config';

export interface SQSMessage {
  messageId: string;
  body: string;
  receiptHandle?: string;
  attributes?: Record<string, string>;
}

export interface SendMessageParams {
  messageBody: string;
  messageAttributes?: Record<string, {
    DataType: string;
    StringValue: string;
  }>;
  delaySeconds?: number;
}

export interface SQSClient {
  sendMessage(params: SendMessageParams): Promise<string>;
  receiveMessage(maxMessages?: number): Promise<SQSMessage[]>;
  deleteMessage(receiptHandle: string): Promise<void>;
  getQueueAttributes(): Promise<Record<string, string>>;
}

// Implementación para Cloudflare Workers
export class SQSClientImpl implements SQSClient {
  private queueUrl: string;
  private region: string;
  private accessKeyId: string;
  private secretAccessKey: string;

  constructor() {
    this.queueUrl = config.sqs.queueUrl;
    this.region = config.sqs.region;
    this.accessKeyId = config.sqs.accessKeyId;
    this.secretAccessKey = config.sqs.secretAccessKey;
  }

  private async signRequest(method: string, body: unknown): Promise<RequestInit> {
    // Implementación de AWS Signature Version 4
    // Para producción, usar una librería como @aws-sdk/signature-v4
    return {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'AWS4-HMAC-SHA256 ...', // Implementar signing
      },
      body: JSON.stringify(body),
    };
  }

  async sendMessage(params: SendMessageParams): Promise<string> {
    const body = {
      QueueUrl: this.queueUrl,
      MessageBody: params.messageBody,
      MessageAttributes: params.messageAttributes,
      DelaySeconds: params.delaySeconds,
    };

    const response = await fetch(
      `https://sqs.${this.region}.amazonaws.com/`,
      await this.signRequest('POST', body)
    );

    if (!response.ok) {
      throw new Error(`SQS error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.MessageId;
  }

  async receiveMessage(maxMessages: number = 1): Promise<SQSMessage[]> {
    const body = {
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: maxMessages,
      WaitTimeSeconds: 20,
    };

    const response = await fetch(
      `https://sqs.${this.region}.amazonaws.com/`,
      await this.signRequest('POST', body)
    );

    if (!response.ok) {
      throw new Error(`SQS error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.Messages || [];
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    const body = {
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle,
    };

    const response = await fetch(
      `https://sqs.${this.region}.amazonaws.com/`,
      await this.signRequest('POST', body)
    );

    if (!response.ok) {
      throw new Error(`SQS error: ${response.status} ${response.statusText}`);
    }
  }

  async getQueueAttributes(): Promise<Record<string, string>> {
    const body = {
      QueueUrl: this.queueUrl,
      AttributeNames: ['All'],
    };

    const response = await fetch(
      `https://sqs.${this.region}.amazonaws.com/`,
      await this.signRequest('POST', body)
    );

    if (!response.ok) {
      throw new Error(`SQS error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.Attributes || {};
  }
}

export const sqsClient = new SQSClientImpl();
