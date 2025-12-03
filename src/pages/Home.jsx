import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, Brain, Server, Stethoscope, Code, ShieldCheck } from 'lucide-react';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import { Link, useNavigate } from 'react-router-dom';

const Home = () => {
    const navigate = useNavigate();
    const services = [
        {
            icon: <Bot size={40} className="text-accent" />,
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
            icon: <Brain size={40} className="text-purple-400" />,
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
            icon: <Server size={40} className="text-blue-400" />,
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
            icon: <Stethoscope size={40} className="text-green-400" />,
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
            icon: <Code size={40} className="text-yellow-400" />,
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
            icon: <ShieldCheck size={40} className="text-red-400" />,
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

    return (
        <div className="min-h-screen">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black -z-10"></div>

                <div className="container text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
                            Automatización e <br />
                            <span className="text-gradient">Infraestructura Inteligente</span>
                        </h1>
                        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
                            Transformamos tu negocio con Bots, Inteligencia Artificial y soluciones IT de alto rendimiento.
                        </p>
                        <div className="flex flex-col md:flex-row gap-4 justify-center">
                            <Link to="/contact">
                                <Button variant="primary" className="w-full md:w-auto">
                                    Empezar Ahora <ArrowRight className="ml-2" size={20} />
                                </Button>
                            </Link>
                            <Link to="/services">
                                <Button variant="outline" className="w-full md:w-auto">
                                    Ver Servicios
                                </Button>
                            </Link>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Services Grid */}
            <section className="py-20 bg-black/50">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Nuestras Soluciones</h2>
                        <p className="text-gray-400">Tecnología de punta adaptada a tus necesidades.</p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((service, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                            >
                                <Card className="h-full cursor-pointer" onClick={() => navigate(`/service/${service.slug}`)}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-white/5 rounded-lg">
                                            {service.icon}
                                        </div>
                                        <h2 className="text-2xl font-bold flex items-center gap-2">
                                            {service.title}
                                            <ArrowRight size={18} className="text-accent" />
                                        </h2>
                                    </div>
                                    <p className="text-gray-400">
                                        {service.description}
                                    </p>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="container">
                    <Card className="text-center py-16 px-6 relative overflow-hidden border-accent/20">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10 -z-10"></div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">¿Listo para escalar tu negocio?</h2>
                        <p className="text-gray-300 mb-8 max-w-xl mx-auto">
                            Agenda una consultoría gratuita y descubre cómo nuestras soluciones pueden optimizar tus procesos.
                        </p>
                        <Link to="/contact">
                            <Button variant="primary" className="text-lg px-8">
                                Hablemos
                            </Button>
                        </Link>
                    </Card>
                </div>
            </section>
        </div>
    );
};

export default Home;
