import React from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { ArrowLeft, CheckCircle, Bot, Brain, Server, Stethoscope, Code, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const ServiceDetail = () => {
    const { slug } = useParams();

    // Define los servicios aquí para poder encontrarlos por slug
    const services = [
        {
            icon: <Bot size={32} className="text-accent" />,
            title: "Bots y Automatizaciones",
            description: "Bots de WhatsApp y flujos automáticos para ventas y soporte 24/7.",
            slug: "bots-y-automatizaciones",
            subcategories: [
                "Bot de WhatsApp para atención al cliente",
                "Bot de WhatsApp para ventas y carritos",
                "Automatización de recordatorios de citas",
                "Flujos automáticos de seguimiento post-venta",
                "Integraciones con CRM (HubSpot, Zoho, etc.)"
            ]
        },
        {
            icon: <Brain size={32} className="text-purple-400" />,
            title: "Asistentes con IA",
            description: "Chatbots inteligentes y análisis de datos para tu negocio.",
            slug: "asistentes-con-ia",
            subcategories: [
                "Asistente IA para soporte interno",
                "Asistente IA para ventas y ofertas",
                "Análisis de datos y generación de reportes",
                "IA para documentación y base de conocimiento"
            ]
        },
        {
            icon: <Server size={32} className="text-blue-400" />,
            title: "Infraestructura y DevOps",
            description: "Servidores, virtualización y despliegues seguros en la nube.",
            slug: "infraestructura-y-devops",
            subcategories: [
                "Despliegues automatizados (CI/CD)",
                "Configuración de VPS y servidores cloud",
                "Monitoreo y alertas 24/7",
                "Backups automáticos y recuperación ante desastres",
                "Optimización de rendimiento y seguridad"
            ]
        },
        {
            icon: <Stethoscope size={32} className="text-green-400" />,
            title: "Soluciones Médicas",
            description: "Transcripción de consultas y sistemas para clínicas.",
            slug: "soluciones-medicas",
            subcategories: [
                "Transcripción automática de consultas",
                "Sistemas de gestión de citas médicas",
                "Recordatorios automáticos para pacientes",
                "Integración con historiales clínicos"
            ]
        },
        {
            icon: <Code size={32} className="text-yellow-400" />,
            title: "Desarrollo a Medida",
            description: "Webs funcionales y herramientas personalizadas.",
            slug: "desarrollo-a-medida",
            subcategories: [
                "Desarrollo de landing pages",
                "Dashboards de administración personalizados",
                "Integraciones entre sistemas (APIs)",
                "MVPs rápidos para validar ideas"
            ]
        },
        {
            icon: <ShieldCheck size={32} className="text-red-400" />,
            title: "Soporte IT",
            description: "Mantenimiento, seguridad y consultoría tecnológica.",
            slug: "soporte-it",
            subcategories: [
                "Mantenimiento preventivo y correctivo",
                "Hardening de servidores y redes",
                "Soporte remoto para equipos",
                "Auditoría básica de seguridad"
            ]
        }
    ];

    const service = services.find(s => s.slug === slug);

    if (!service) {
        return (
            <div className="container text-center py-20">
                <h2 className="text-2xl font-bold">Servicio no encontrado</h2>
                <p className="text-gray-400 mb-8">El servicio que buscas no existe o ha sido movido.</p>
                <Link to="/">
                    <Button variant="primary">
                        <ArrowLeft className="mr-2" size={20} />
                        Volver al Inicio
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black -z-10"></div>
                <div className="container relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-3xl mx-auto text-center"
                    >
                        <div className="inline-block p-4 bg-white/10 rounded-lg mb-6">
                            {React.cloneElement(service.icon, { size: 48 })}
                        </div>
                        <h1 className="text-4xl md:text-6xl font-bold mb-4">{service.title}</h1>
                        <p className="text-lg text-gray-400">{service.description}</p>
                    </motion.div>
                </div>
            </section>

            <section className="py-20 bg-black/50">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >
                        <h2 className="text-3xl font-bold text-center mb-12">¿Qué podemos ofrecerte en {service.title}?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {service.subcategories.map((item, index) => (
                                <Card key={index} className="h-full">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-white/5 rounded-lg">
                                            <CheckCircle className="text-accent" size={24} />
                                        </div>
                                        <h3 className="text-xl font-bold">{item}</h3>
                                    </div>
                                    <p className="text-gray-400">Detalle, implementación y mejores prácticas adaptadas a tu necesidad.</p>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="py-20 text-center">
                <div className="container">
                    <Card className="py-12 px-6 border-accent/20">
                        <h2 className="text-3xl font-bold mb-4">¿Interesado en esta solución?</h2>
                        <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                            Contáctanos para una consultoría gratuita y descubre cómo podemos ayudarte a alcanzar tus objetivos.
                        </p>
                        <Link to="/contact">
                            <Button variant="primary" size="lg">
                                Agendar una Cita
                            </Button>
                        </Link>
                    </Card>
                </div>
            </section>
        </div>
    );
};

export default ServiceDetail;
