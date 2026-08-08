import { NextRequest, NextResponse } from 'next/server';
import { redisCommand } from '@/lib/redisAdmin';

/**
 * Lead recuperado de la DLQ. El JSON del stream no está tipado en origen, así
 * que solo se declaran los campos que la alerta necesita leer; si el parseo
 * falla se conserva el mensaje crudo en `raw`.
 */
interface FailedLead {
  establishmentName?: string;
  data?: { establishmentName?: string };
  dlqReason?: string;
  lastError?: string;
  raw?: [string, string[]];
}

/**
 * API Route protegida que verifica la Dead Letter Queue (DLQ)
 * y envía alertas al equipo si hay leads fallidos.
 * 
 * Configurada para ejecutarse automáticamente cada hora vía Vercel Cron.
 * También puede ejecutarse manualmente con el CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  // 1. VERIFICAR AUTENTICACIÓN DEL CRON
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;
  
  if (!expectedSecret) {
    console.error('[Cron DLQ] CRON_SECRET no está configurado');
    return NextResponse.json(
      { success: false, error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  // Vercel Cron envía el secreto en el header 'Authorization' como Bearer token
  // También aceptamos query param para pruebas manuales
  const querySecret = request.nextUrl.searchParams.get('secret');
  const providedSecret = authHeader?.replace('Bearer ', '') || querySecret;
  
  if (providedSecret !== expectedSecret) {
    console.warn(`[Cron DLQ] Intento no autorizado a las ${new Date().toISOString()}`);
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    // 2. CONSULTAR TAMAÑO DE LA DLQ EN REDIS
    const dlqResult = await redisCommand<number>(['XLEN', 'stream:sighfood-leads-dlq']);
    const dlqSize = dlqResult.result || 0;
    
    const threshold = parseInt(process.env.CRON_DLQ_THRESHOLD || '1');
    
    console.log(`[Cron DLQ] DLQ size: ${dlqSize}, threshold: ${threshold}`);
    
    // 3. SI HAY ELEMENTOS EN LA DLQ, ENVIAR ALERTA
    if (dlqSize >= threshold) {
      console.warn(`[Cron DLQ] ⚠ ALERTA: ${dlqSize} leads en DLQ requieren atención`);
      
      // Leer los últimos N mensajes de la DLQ para incluirlos en la alerta
      // XRANGE devuelve [idDelMensaje, [campo1, valor1, campo2, valor2, …]]
      const messagesResult = await redisCommand<Array<[string, string[]]>>([
        'XRANGE',
        'stream:sighfood-leads-dlq',
        '-',
        '+',
        'COUNT',
        '10' // Máximo 10 mensajes en la alerta
      ]);

      const failedLeads: FailedLead[] = (messagesResult.result || []).map((msg) => {
        try {
          const dataStr = msg[1][1]; // El campo 'data' del stream
          return JSON.parse(dataStr);
        } catch {
          return { raw: msg };
        }
      });
      
      // 4. ENVIAR NOTIFICACIÓN DE ALERTA
      // Usamos fetch directo a la API de Resend/Twilio para no depender del notificationClient
      // que está diseñado para el Worker (lado servidor de Node, no Edge)
      await sendDLQAlert(dlqSize, failedLeads);
      
      const duration = Date.now() - startTime;
      
      return NextResponse.json({
        success: true,
        alertSent: true,
        dlqSize,
        failedLeadsCount: failedLeads.length,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
    
    // 5. DLQ VACÍA - TODO NORMAL
    const duration = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      alertSent: false,
      dlqSize: 0,
      duration,
      timestamp: new Date().toISOString(),
      message: 'DLQ limpia, sin alertas necesarias',
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[Cron DLQ] Error ejecutando el check:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Envía alerta de DLQ al equipo de ventas
 * Usa Resend (email) como canal principal por ser más confiable para alertas
 */
async function sendDLQAlert(dlqSize: number, failedLeads: FailedLead[]): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'noreply@sighfood.com';
  const toEmail = process.env.SALES_TEAM_EMAIL || 'ventas@sighfood.com';
  
  // Si no hay Resend configurado, usar modo mock (solo logs)
  if (!resendKey || resendKey === 'your_resend_api_key_here') {
    console.warn('[Cron DLQ] ⚠ MODO MOCK: Resend no configurado, solo se registrará en logs');
    console.warn(`[Cron DLQ] ALERTA SIMULADA: ${dlqSize} leads fallidos`);
    console.warn('[Cron DLQ] Leads:', JSON.stringify(failedLeads, null, 2));
    return;
  }
  
  const leadsSummary = failedLeads
    .map((lead, i) => {
      const name = lead.data?.establishmentName || lead.establishmentName || 'Desconocido';
      const reason = lead.dlqReason || lead.lastError || 'Error desconocido';
      return `<li><strong>${i + 1}. ${name}</strong><br/><em>Razón: ${reason}</em></li>`;
    })
    .join('');
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #dc2626;"> ALERTA: Leads Fallidos en DLQ</h2>
      <p>Se detectaron <strong>${dlqSize} leads</strong> en la Dead Letter Queue que requieren atención manual.</p>
      
      <h3>Leads afectados:</h3>
      <ol style="background: #fef2f2; padding: 16px; border-radius: 8px; border-left: 4px solid #dc2626;">
        ${leadsSummary}
      </ol>
      
      <h3>Acciones requeridas:</h3>
      <ul>
        <li>Revisar el Dashboard de Observabilidad: <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/admin">/admin</a></li>
        <li>Verificar la sección "En Dead Letter Queue (DLQ)"</li>
        <li>Contactar manualmente a los leads fallidos si es posible</li>
        <li>Investigar la causa raíz del fallo (CRM, notificaciones, etc.)</li>
      </ul>
      
      <hr style="margin: 24px 0;"/>
      <p style="color: #6b7280; font-size: 12px;">
        Esta alerta fue generada automáticamente por el Cron Job de SIGH_FOOD.<br/>
        Timestamp: ${new Date().toISOString()}
      </p>
    </div>
  `;
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: `🚨 ALERTA DLQ: ${dlqSize} leads fallidos requieren atención`,
        html,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Cron DLQ] Error enviando alerta: ${response.status} - ${errorText}`);
    } else {
      console.log(`[Cron DLQ] ✓ Alerta enviada exitosamente a ${toEmail}`);
    }
  } catch (error) {
    console.error('[Cron DLQ] Error fatal enviando alerta:', error);
  }
}