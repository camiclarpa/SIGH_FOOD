import { logger } from '../utils/logger';
import { metricsClient } from '../utils/metrics';

export interface CRMContact {
  name: string;
  email?: string;
  phone: string;
  company?: string;
  customFields?: Record<string, unknown>;
}

export interface CRMDeal {
  title: string;
  value: number;
  currency: string;
  stageId?: number;
  contactId?: string;
  customFields?: Record<string, unknown>;
}

export interface CRMClient {
  createContact(contact: CRMContact): Promise<string>;
  createDeal(deal: CRMDeal): Promise<string>;
  updateDealStatus(dealId: string, status: string): Promise<void>;
}

/** Envoltura estándar de las respuestas de la API de Pipedrive */
interface PipedriveResponse<T> {
  data: T;
}

/** Entidad creada por Pipedrive (persona, deal…). El id llega como número. */
interface PipedriveEntity {
  id: number;
}

/**
 * Cliente de Pipedrive CRM
 * API Docs: https://developers.pipedrive.com/docs/api/v1
 */
export class PipedriveClient implements CRMClient {
  private baseUrl: string;
  private apiToken: string;

  constructor() {
    this.baseUrl = process.env.PIPEDRIVE_API_URL || 'https://api.pipedrive.com/v1';
    this.apiToken = process.env.PIPEDRIVE_API_TOKEN || '';
  }

  private async makeRequest<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    if (!this.apiToken || this.apiToken === 'your_pipedrive_api_token_here') {
      throw new Error('CONFIG_ERROR: Configura PIPEDRIVE_API_TOKEN en tu .env');
    }

    const url = `${this.baseUrl}${endpoint}?api_token=${this.apiToken}`;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pipedrive API Error ${response.status}: ${errorText}`);
    }

    return response.json() as Promise<T>;
  }

  async createContact(contact: CRMContact): Promise<string> {
    logger.info('Creando contacto en Pipedrive', { name: contact.name, phone: contact.phone });
    
    const payload = {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      org_name: contact.company,
      // Campos personalizados de SIGH_FOOD
      ...contact.customFields,
    };

    const result = await this.makeRequest<PipedriveResponse<PipedriveEntity>>('POST', '/persons', payload);
    const contactId = String(result.data.id);
    
    logger.info('Contacto creado exitosamente', { contactId });
    metricsClient.increment('crm.contact_created');
    
    return contactId;
  }

  async createDeal(deal: CRMDeal): Promise<string> {
    logger.info('Creando deal en Pipedrive', { title: deal.title, value: deal.value });
    
    const payload = {
      title: deal.title,
      value: deal.value,
      currency: deal.currency,
      stage_id: deal.stageId || 1, // Stage 1 = "Nuevo Lead"
      person_id: deal.contactId,
      ...deal.customFields,
    };

    const result = await this.makeRequest<PipedriveResponse<PipedriveEntity>>('POST', '/deals', payload);
    const dealId = String(result.data.id);
    
    logger.info('Deal creado exitosamente', { dealId });
    metricsClient.increment('crm.deal_created');
    
    return dealId;
  }

  async updateDealStatus(dealId: string, status: string): Promise<void> {
    logger.info('Actualizando estado del deal', { dealId, status });
    
    // Mapear status a stage_id de Pipedrive
    const stageMap: Record<string, number> = {
      'qualified': 2,
      'demo_scheduled': 3,
      'pilot_sent': 4,
      'won': 5,
      'lost': 6,
    };

    const stageId = stageMap[status];
    if (!stageId) {
      logger.warn('Status no mapeado a stage de Pipedrive', { status });
      return;
    }

    await this.makeRequest<PipedriveResponse<PipedriveEntity>>('PUT', `/deals/${dealId}`, { stage_id: stageId });
    logger.info('Deal actualizado', { dealId, stageId });
  }
}

/**
 * Cliente Mock para desarrollo (cuando no hay credenciales reales)
 */
export class MockCRMClient implements CRMClient {
  async createContact(contact: CRMContact): Promise<string> {
    const latency = Math.floor(Math.random() * 500) + 200;
    await new Promise((resolve) => setTimeout(resolve, latency));
    
    logger.info('[MOCK CRM] Contacto creado', { name: contact.name });
    metricsClient.increment('crm.mock_contact_created');
    
    return `mock-contact-${Date.now()}`;
  }

  async createDeal(deal: CRMDeal): Promise<string> {
    const latency = Math.floor(Math.random() * 500) + 200;
    await new Promise((resolve) => setTimeout(resolve, latency));
    
    logger.info('[MOCK CRM] Deal creado', { title: deal.title, value: deal.value });
    metricsClient.increment('crm.mock_deal_created');
    
    return `mock-deal-${Date.now()}`;
  }

  async updateDealStatus(dealId: string, status: string): Promise<void> {
    logger.info('[MOCK CRM] Deal actualizado', { dealId, status });
  }
}

/**
 * Factory: Retorna el cliente real o mock según configuración
 */
export function createCRMClient(): CRMClient {
  const apiToken = process.env.PIPEDRIVE_API_TOKEN;
  
  if (apiToken && apiToken !== 'your_pipedrive_api_token_here') {
    logger.info('Usando cliente real de Pipedrive CRM');
    return new PipedriveClient();
  } else {
    logger.warn('Usando cliente MOCK de CRM (configura PIPEDRIVE_API_TOKEN para usar el real)');
    return new MockCRMClient();
  }
}

export const crmClient = createCRMClient();