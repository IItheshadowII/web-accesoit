import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';
import apiFetch from '../lib/api';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        company: '',
        email: '',
        message: ''
    });
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const response = await apiFetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setStatus('success');
                setFormData({ name: '', company: '', email: '', message: '' });
                setTimeout(() => setStatus('idle'), 5000);
            } else {
                throw new Error('Failed to send');
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen py-20">
            <div className="container">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <h1 className="text-4xl md:text-5xl font-bold mb-6">Hablemos</h1>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Cuéntanos sobre tu proyecto y te ayudaremos a llevarlo al siguiente nivel.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
                    {/* Contact Info */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <h2 className="text-2xl font-bold mb-8">Información de Contacto</h2>
                        <div className="space-y-6">
                            <Card className="flex items-center gap-4" hover={false}>
                                <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                                    <Mail size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-300">Email</h3>
                                    <p className="text-white">contacto@accesoit.com.ar</p>
                                </div>
                            </Card>

                            <Card className="flex items-center gap-4" hover={false}>
                                <div className="p-3 bg-purple-500/20 rounded-full text-purple-400">
                                    <Phone size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-300">Teléfono / WhatsApp</h3>
                                    <p className="text-white">2257 63 9463</p>
                                </div>
                            </Card>

                            <Card className="flex items-center gap-4" hover={false}>
                                <div className="p-3 bg-accent/20 rounded-full text-accent">
                                    <MapPin size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-300">Ubicación</h3>
                                    <p className="text-white">Buenos Aires, Argentina</p>
                                </div>
                            </Card>
                        </div>
                    </motion.div>

                    {/* Contact Form */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card className="p-8">
                            {status === 'success' ? (
                                <div className="text-center py-10">
                                    <div className="inline-flex p-4 bg-green-500/20 rounded-full text-green-400 mb-4">
                                        <CheckCircle size={48} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">¡Mensaje Enviado!</h3>
                                    <p className="text-gray-400">Nos pondremos en contacto contigo a la brevedad.</p>
                                    <Button variant="outline" className="mt-6" onClick={() => setStatus('idle')}>
                                        Enviar otro mensaje
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Nombre</label>
                                            <input
                                                type="text"
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                                placeholder="Tu nombre"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-400 mb-2">Empresa</label>
                                            <input
                                                type="text"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                                placeholder="Nombre de tu empresa"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                            placeholder="tu@email.com"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Mensaje</label>
                                        <textarea
                                            rows="4"
                                            name="message"
                                            value={formData.message}
                                            onChange={handleChange}
                                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors resize-none"
                                            placeholder="¿En qué podemos ayudarte?"
                                            required
                                        ></textarea>
                                    </div>

                                    {status === 'error' && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                                            <AlertCircle size={16} />
                                            <span>Hubo un error al enviar el mensaje. Inténtalo nuevamente.</span>
                                        </div>
                                    )}

                                    <Button className="w-full" disabled={status === 'loading'}>
                                        {status === 'loading' ? 'Enviando...' : 'Enviar Mensaje'}
                                        {!status === 'loading' && <Send size={18} className="ml-2" />}
                                    </Button>
                                </form>
                            )}
                        </Card>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
