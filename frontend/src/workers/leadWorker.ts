import { messageQueueClient } from '../clients/messageQueue';
import { crmClient } from '../integrations/crmClient';
import { routeNotification, calculateEstimatedMonthlyProfit } from '../integrations/notificationRouter';
import { logger } from '../utils/logger';
import { metricsClient } from '../utils/metrics';

/**
 * Calcula el delay exponencial para reintentos
 * Intento 1: 1s, Intento 2: 5s, Intento 3: 30s
 */
function calculateBackoffDelay(retryCount: number): number {
  const delays = [1000, 5000, 30000];
  return delays[Math.min(retryCount - 1, delays.length - 1)];
}

/**
 * Bucle principal del Worker con resiliencia completa
 * - Idempotencia: verifica isAlreadyProcessed antes de procesar
 * - Reintentos: backoff exponencial (1s, 5s, 30s)
 * - DLQ: mueve a Dead Letter Queue tras maxRetries intentos
 * - CRM: crea contacto y deal en Pipedrive
 * - Notificaciones: envía alertas inteligentes
 */
async function runWorker() {
  logger.info('🚀 Worker iniciado con CRM + Notificaciones + Resiliencia');
  let processedCount = 0;
  let dlqCount = 0;

  while (true) {
    try {
      const message = await messageQueueClient.receiveMessage();

      if (message) {
        const startTime = Date.now();
        const { idempotencyKey, _receiptHandle, data } = message;
        
        logger.info('📨 Mensaje recibido', { idempotencyKey });

        // VERIFICACIÓN DE IDEMPOTENCIA: se ejecuta ANTES de procesar
        const alreadyProcessed = await messageQueueClient.isAlreadyProcessed(idempotencyKey);
        
        if (alreadyProcessed) {
          logger.info('⚠ Lead ya procesado (idempotencia), eliminando de cola', { idempotencyKey });
          await messageQueueClient.deleteMessage(_receiptHandle);
          await messageQueueClient.resetRetryCount(idempotencyKey);
          metricsClient.increment('worker.idempotent_skip');
          continue;
        }

        // PROCESAMIENTO DEL LEAD con try/catch para manejar errores
        try {
          // 1. Crear contacto en CRM
          const contactId = await crmClient.createContact({
            name: data.decisionMaker,
            phone: data.phone,
            company: data.establishmentName,
            customFields: {
              top_liquors: data.topLiquors,
              estimated_weekly_volume: data.estimatedWeeklyVolume,
            },
          });

          // 2. Crear deal en CRM
          const dealTitle = `Lead: ${data.establishmentName} - ${data.decisionMaker}`;
          const dealValue = data.estimatedWeeklyVolume * 23500 * 4;
          
          const dealId = await crmClient.createDeal({
            title: dealTitle,
            value: dealValue,
            currency: 'COP',
            contactId,
            customFields: {
              establishment_name: data.establishmentName,
              top_liquors: data.topLiquors,
              estimated_weekly_volume: data.estimatedWeeklyVolume,
            },
          });

          // 3. Enviar notificación inteligente
          const notificationResult = await routeNotification({
            idempotencyKey,
            establishmentName: data.establishmentName,
            decisionMaker: data.decisionMaker,
            phone: data.phone,
            topLiquors: data.topLiquors,
            estimatedWeeklyVolume: data.estimatedWeeklyVolume,
            estimatedMonthlyProfit: calculateEstimatedMonthlyProfit(data.estimatedWeeklyVolume),
            crmContactId: contactId,
            crmDealId: dealId,
          });

          if (notificationResult.success) {
            logger.info('📬 Notificación enviada', {
              channel: notificationResult.channel,
              priority: notificationResult.priority
            });
          }

          // 4. ÉXITO: Marcar como procesado pasando metadata CRM (crmContactId y crmDealId)
          await messageQueueClient.markAsProcessed(idempotencyKey, {
            crmContactId: contactId,
            crmDealId: dealId,
            notificationChannel: notificationResult.channel,
            notificationPriority: notificationResult.priority,
          });
          
          await messageQueueClient.deleteMessage(_receiptHandle);
          await messageQueueClient.resetRetryCount(idempotencyKey);
          
          const duration = Date.now() - startTime;
          processedCount++;
          metricsClient.increment('worker.leads_processed');
          metricsClient.timing('worker.processing_time', duration);
          
          logger.info(`✅ Lead procesado exitosamente. Total: ${processedCount}`, { 
            idempotencyKey, 
            contactId,
            dealId,
            duration 
          });

        } catch (crmError) {
          // MANEJO DE ERRORES con try/catch
          const currentRetry = await messageQueueClient.incrementRetryCount(idempotencyKey);
          const maxRetries = messageQueueClient.getMaxRetries();
          
          logger.warn(`❌ Error al procesar lead (intento ${currentRetry}/${maxRetries})`, {
            idempotencyKey,
            error: (crmError as Error).message,
            retryCount: currentRetry
          });

          metricsClient.increment('worker.crm_failed');

          // Si superó el máximo de reintentos, mover a DLQ
          if (currentRetry >= maxRetries) {
            logger.error(` Lead movido a DLQ después de ${maxRetries} intentos`, {
              idempotencyKey,
              reason: (crmError as Error).message
            });

            await messageQueueClient.moveToDLQ(
              message,
              `Failed after ${maxRetries} retries: ${(crmError as Error).message}`
            );
            await messageQueueClient.deleteMessage(_receiptHandle);
            await messageQueueClient.resetRetryCount(idempotencyKey);
            
            dlqCount++;
            metricsClient.increment('worker.leads_dlq');
            logger.info(` DLQ count: ${dlqCount}`);
          } else {
            // Reintentar con backoff exponencial
            const delay = calculateBackoffDelay(currentRetry);
            logger.info(`⏳ Reintentando en ${delay/1000}s...`, { idempotencyKey });
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      } else {
        // No hay mensajes, esperar 2 segundos
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    } catch (error) {
      // MANEJO DE ERRORES del bucle principal con try/catch
      const err = error as Error;
      logger.error('❌ Error en el bucle del Worker', err);
      metricsClient.increment('worker.loop_error');
      
      // Esperar 5s antes de reintentar el bucle
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

// Iniciar el Worker
runWorker().catch((err) => {
  logger.error('El Worker se detuvo inesperadamente', err);
  process.exit(1);
});