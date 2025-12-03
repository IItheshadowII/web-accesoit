import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Brain, Server, Stethoscope, Code, ShieldCheck, CheckCircle } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import { Link } from 'react-router-dom';

const Services = () => {
    const categories = [
        {
            title: "Bots y Automatizaciones",
            icon: <Bot className="text-accent" size={40} />,
            items: [
                "Bots de WhatsApp (Ventas / Soporte / Recordatorios)",
                "Toma de pedidos y reservas automáticas",
                "Integración con Google Sheets y CRM",
                "Flujos de Automatización (n8n / APIs)",
                "Scraping de sistemas sin API"
            ]
        },
        {
            title: "Asistentes con IA",
            icon: <Brain className="text-purple-400" size={40} />,
            items: [
                "Chatbots entrenados con info del negocio",
                "Asistentes internos para procedimientos y precios",
                "Análisis inteligente de datos y gastos",
                "IA Local / Privada (Llama, Mistral en servidores propios)"
            ]
        },
        {
            title: "Infraestructura y DevOps",
            icon: <Server className="text-blue-400" size={40} />,
            items: [
                "Diseño y montaje de servidores (Proxmox, VMware)",
                "Servidores en la Nube / VPS Administrado",
                "Dockerización de aplicaciones",
                "Estrategias de Backup y Seguridad"
            ]
        },
        {
            title: "Soluciones Médicas",
            icon: <Stethoscope className="text-green-400" size={40} />,
            items: [
                "Transcripción de consultas (Voz a Texto)",
                "Integración con historias clínicas",
                "Monitoreo de servidores y bases de datos",
                "Automatización de reportes médicos"
            ]
        },
        {
            title: "Desarrollo a Medida",
            icon: <Code className="text-yellow-400" size={40} />,
            items: [
                "Mini-sistemas para comercios (Stock, Ventas)",
                "Webs institucionales con automatización",
                "Paneles de control para clientes",
                "Integraciones a medida"
            ]
        },
        {
            title: "Soporte IT y Consultoría",
            icon: <ShieldCheck className="text-red-400" size={40} />,
            items: [
                "Consultoría en infraestructura e IA",
                "Soporte y administración de servidores",
                "Evaluación de seguridad (Security Check)",
                "Diseño de roadmap tecnológico"
            ]
        }
    ];

    return (
        <div className="min-h-screen py-20">
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">Nuestros Servicios</h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Soluciones tecnológicas integrales para automatizar, escalar y proteger tu negocio.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {categories.map((category, index) => (
                        <Card key={index} className="h-full">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-white/5 rounded-lg">
                                    {category.icon}
                                </div>
                                <h2 className="text-2xl font-bold">{category.title}</h2>
                            </div>
                            <ul className="space-y-3 mb-8">
                                {category.items.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-gray-300">
                                        <CheckCircle size={18} className="text-accent mt-1 shrink-0" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    ))}
                </div>

                <div className="mt-20 text-center">
                    <h2 className="text-3xl font-bold mb-8">¿No encuentras lo que buscas?</h2>
                    <Link to="/contact">
                        <Button variant="primary" className="text-lg px-8">
                            Contáctanos
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Services;
