/**
 * Rutas para webhooks de pasarelas de pago
 * Integración preparada para Stripe y MercadoPago
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { provisionN8nInstance } = require('../services/n8nProvisioner');
const prisma = new PrismaClient();

/**
 * POST /api/webhooks/payments/n8n
 * Webhook para recibir eventos de pagos de suscripciones n8n
 * 
 * Formato esperado (stub):
 * {
 *   "provider": "stripe" | "mercadopago",
 *   "event": "subscription.created" | "subscription.updated" | "subscription.cancelled",
 *   "customerId": "cus_xxx",
 *   "subscriptionId": "sub_xxx",
 *   "userId": 123,
 *   "planId": 1,
 *   "status": "active" | "past_due" | "canceled",
 *   "signature": "xxx" (para validación en producción)
 * }
 */
router.post('/n8n', async (req, res) => {
    try {
        const {
            provider,
            event,
            customerId,
            subscriptionId,
            userId,
            planId,
            status,
            signature
        } = req.body;

        console.log('[PAYMENT WEBHOOK] Received event:', event, 'for user:', userId);

        // VALIDACIÓN DE FIRMA (en producción)
        // Para Stripe: usar stripe.webhooks.constructEvent()
        // Para MercadoPago: validar con secret key
        if (process.env.NODE_ENV === 'production' && !validateWebhookSignature(req, signature, provider)) {
            console.error('[PAYMENT WEBHOOK] Invalid signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Verificar que el usuario existe
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            console.error('[PAYMENT WEBHOOK] User not found:', userId);
            return res.status(404).json({ error: 'User not found' });
        }

        // Buscar o crear suscripción
        let subscription = await prisma.subscription.findFirst({
            where: {
                userId,
                providerSubId: subscriptionId
            }
        });

        if (!subscription) {
            // Crear nueva suscripción
            subscription = await prisma.subscription.create({
                data: {
                    userId,
                    planId,
                    provider,
                    providerCustomerId: customerId,
                    providerSubId: subscriptionId,
                    status
                }
            });
            console.log('[PAYMENT WEBHOOK] Subscription created:', subscription.id);
        } else {
            // Actualizar suscripción existente
            subscription = await prisma.subscription.update({
                where: { id: subscription.id },
                data: { status }
            });
            console.log('[PAYMENT WEBHOOK] Subscription updated:', subscription.id);
        }

        // LÓGICA SEGÚN EL EVENTO
        switch (event) {
            case 'subscription.created':
            case 'subscription.activated':
                // Si la suscripción está activa, provisionar instancia n8n
                if (status === 'active') {
                    console.log('[PAYMENT WEBHOOK] Provisioning n8n instance for user:', userId);
                    
                    try {
                        const instance = await provisionN8nInstance(userId, planId);
                        console.log('[PAYMENT WEBHOOK] Instance provisioned:', instance.id);
                        
                        return res.json({
                            success: true,
                            message: 'Subscription activated and instance provisioned',
                            subscription,
                            instance
                        });
                    } catch (provisionError) {
                        console.error('[PAYMENT WEBHOOK] Provisioning error:', provisionError);
                        // No fallar el webhook, solo registrar error
                        return res.json({
                            success: true,
                            message: 'Subscription activated but provisioning failed',
                            subscription,
                            error: provisionError.message
                        });
                    }
                }
                break;

            case 'subscription.updated':
                // Si cambió a past_due o canceled, suspender instancia
                if (status === 'past_due' || status === 'canceled') {
                    console.log('[PAYMENT WEBHOOK] Suspending instances for user:', userId);
                    
                    const instances = await prisma.n8nInstance.findMany({
                        where: { 
                            userId,
                            status: { in: ['running', 'stopped'] }
                        }
                    });

                    for (const instance of instances) {
                        await prisma.n8nInstance.update({
                            where: { id: instance.id },
                            data: { status: 'stopped' }
                        });
                        
                        // TODO: Llamar a stopService si es necesario
                    }
                }
                break;

            case 'subscription.cancelled':
            case 'subscription.deleted':
                console.log('[PAYMENT WEBHOOK] Cancelling instances for user:', userId);
                
                // Marcar instancias como canceladas (soft delete)
                await prisma.n8nInstance.updateMany({
                    where: { 
                        userId,
                        status: { notIn: ['cancelled', 'error'] }
                    },
                    data: { status: 'cancelled' }
                });

                // TODO: Programar eliminación definitiva después de X días
                break;

            default:
                console.log('[PAYMENT WEBHOOK] Unhandled event:', event);
        }

        res.json({
            success: true,
            message: 'Webhook processed',
            subscription
        });

    } catch (error) {
        console.error('[PAYMENT WEBHOOK] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/webhooks/payments/stripe
 * Endpoint específico para webhooks de Stripe
 * (En producción, usar raw body para validar signature)
 */
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const sig = req.headers['stripe-signature'];
        
        // TODO: Implementar validación real con Stripe SDK
        // const event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
        
        console.log('[STRIPE WEBHOOK] Received event');
        
        // Mapear evento de Stripe a formato interno y redirigir al handler principal
        const stripeEvent = JSON.parse(req.body);
        
        // Transformar y llamar al handler principal...
        res.json({ received: true });
        
    } catch (error) {
        console.error('[STRIPE WEBHOOK] Error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/webhooks/payments/mercadopago
 * Endpoint específico para webhooks de MercadoPago
 */
router.post('/mercadopago', async (req, res) => {
    try {
        const { type, data } = req.body;
        
        console.log('[MERCADOPAGO WEBHOOK] Received event:', type);
        
        // TODO: Implementar validación y mapeo de eventos de MercadoPago
        // MercadoPago envía notifications que luego hay que consultar via API
        
        res.json({ received: true });
        
    } catch (error) {
        console.error('[MERCADOPAGO WEBHOOK] Error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * Validar firma del webhook (stub)
 * @param {Object} req - Request object
 * @param {string} signature - Firma del webhook
 * @param {string} provider - Proveedor (stripe, mercadopago)
 * @returns {boolean}
 */
function validateWebhookSignature(req, signature, provider) {
    // TODO: Implementar validación real según el proveedor
    
    // Para Stripe:
    // const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    // const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    
    // Para MercadoPago:
    // Verificar x-signature header con secret key
    
    console.log('[WEBHOOK VALIDATION] Skipping validation in development mode');
    return true; // En desarrollo, aceptar todos
}

module.exports = router;
