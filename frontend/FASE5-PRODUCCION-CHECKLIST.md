# Checklist de Producción - SIGH_FOOD
## Fase 5 - Semana 2

### INFRAESTRUCTURA
- [ ] Vercel Pro plan activado (si es necesario)
- [ ] Dominio personalizado configurado
- [ ] SSL certificate activo
- [ ] Environment variables configuradas en Vercel
- [ ] Upstash Redis en región óptima (us-east-1 o eu-west-1)
- [ ] Cron Jobs configurados (DLQ check + Warmup)

### MONITOREO
- [ ] Vercel Analytics habilitado
- [ ] Upstash Console configurada con alertas
- [ ] Error tracking (Sentry/Datadog) configurado
- [ ] Uptime monitoring (UptimeRobot) activo
- [ ] Alertas de DLQ configuradas

### SEGURIDAD
- [ ] ADMIN_TOKEN cambiado del valor por defecto
- [ ] CRON_SECRET cambiado del valor por defecto
- [ ] CORS configurado correctamente
- [ ] Rate limiting implementado
- [ ] .env no committeado a Git

### PERFORMANCE
- [ ] Lighthouse score >= 90 en Performance
- [ ] Lighthouse score >= 100 en Accessibility
- [ ] Core Web Vitals en verde (LCP < 2.5s, CLS < 0.1)
- [ ] Edge Functions optimizadas (cold starts < 100ms)
- [ ] Assets optimizados (WebP, lazy loading)

### RESILIENCIA
- [ ] Pruebas de estrés completadas (10,000 usuarios)
- [ ] SLA cumplidos (p95 < 50ms, error rate < 1%)
- [ ] DLQ rate < 0.1%
- [ ] Buffer Redis estable (max length < 10,000)
- [ ] Circuit breaker implementado

### DOCUMENTACIÓN
- [ ] README.md actualizado
- [ ] API documentation completa
- [ ] Runbooks de operación creados
- [ ] Incident response plan documentado
- [ ] FASE5-SEMANA2-REPORTE-EJECUTIVO.md completado

### BACKUP & RECOVERY
- [ ] Backup de Redis configurado (Upstash lo hace automático)
- [ ] Plan de recovery documentado
- [ ] Database migration scripts versionados

### COMUNICACIÓN
- [ ] Equipo de ventas capacitado en dashboard
- [ ] Canal de alertas configurado (Slack/Email)
- [ ] Contacto de emergencia definido

---

**Fecha de Revisión:** 2026-08-04  
**Revisado por:** ___________________  
**Aprobado para Producción:** ☐ Sí ☐ No

════════════════════════════════════════════════════════════