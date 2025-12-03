import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Server, Activity, LogOut, User, Calendar, Workflow } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import AppointmentsManager from '../components/Admin/AppointmentsManager';
import AdminAiPrompt from '../components/Admin/AdminAiPrompt';
import apiFetch from '../lib/api';

const Dashboard = () => {
    const [user, setUser] = useState(null);
    const [services, setServices] = useState([]);
    const [n8nInstances, setN8nInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('services'); // 'services' or 'appointments' or 'n8n' or 'ai'
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        const fetchDashboardData = async () => {
            try {
                const response = await apiFetch('/api/dashboard', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setServices(data.services);
                }

                const n8nRes = await apiFetch('/api/n8n/instances', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (n8nRes.ok) {
                    setN8nInstances(await n8nRes.json());
                } else {
                    // If token is invalid, logout
                    handleLogout();
                }
            } catch (error) {
                console.error('Error fetching dashboard:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;

    return (
        <div className="min-h-screen py-20">
            <div className="container">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-3xl font-bold">Hola, {user?.name}</h1>
                        <p className="text-gray-400">{user?.company || 'Administrador'}</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} className="gap-2">
                        <LogOut size={18} /> Salir
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('services')}
                        className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'services'
                            ? 'text-blue-400'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Server size={18} />
                            <span>Servicios</span>
                        </div>
                        {activeTab === 'services' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('appointments')}
                        className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'appointments'
                            ? 'text-blue-400'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Calendar size={18} />
                            <span>Citas Agendadas</span>
                        </div>
                        {activeTab === 'appointments' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('n8n')}
                        className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'n8n'
                            ? 'text-blue-400'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Workflow size={18} />
                            <span>Instancias n8n</span>
                        </div>
                        {activeTab === 'n8n' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`px-4 py-2 font-medium transition-colors relative ${activeTab === 'ai'
                            ? 'text-blue-400'
                            : 'text-gray-400 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Workflow size={18} />
                            <span>AI Prompt</span>
                        </div>
                        {activeTab === 'ai' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400"
                            />
                        )}
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'services' ? (
                    <>
                        <h2 className="text-2xl font-bold mb-6">Estado de Servicios</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {services.map((service) => (
                                <Card key={service.id} className="relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-white/5 rounded-lg">
                                            <Server className="text-blue-400" />
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${service.status === 'Active' ? 'bg-green-500/20 text-green-400' :
                                            service.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-red-500/20 text-red-400'
                                            }`}>
                                            {service.status === 'Active' ? 'Activo' :
                                                service.status === 'Pending' ? 'Pendiente' : 'Problema'}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                                    <p className="text-gray-400 text-sm">{service.description}</p>
                                </Card>
                            ))}

                            {services.length === 0 && (
                                <div className="col-span-3 text-center py-10 text-gray-500">
                                    No tienes servicios activos actualmente.
                                </div>
                            )}
                        </div>
                    </>
                ) : activeTab === 'n8n' ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold">Mis Instancias n8n</h2>
                            <Button onClick={async () => {
                                try {
                                    const token = localStorage.getItem('token');
                                    const res = await apiFetch('/api/n8n/provision', {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${token}`
                                        },
                                        body: JSON.stringify({ userId: user.id })
                                    });
                                    if (res.ok) {
                                        alert('Instancia solicitada. Recibirás un email con las credenciales.');
                                        // Recargar instancias
                                        const updatedRes = await apiFetch('/api/n8n/instances', { headers: { 'Authorization': `Bearer ${token}` } });
                                        if (updatedRes.ok) setN8nInstances(await updatedRes.json());
                                    } else {
                                        const err = await res.json();
                                        alert('Error: ' + (err.error || 'No se pudo crear la instancia'));
                                    }
                                } catch (e) {
                                    console.error(e);
                                    alert('Error de conexión');
                                }
                            }}>
                                Nueva Instancia
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {n8nInstances.map((instance) => (
                                <Card key={instance.id} className="relative overflow-hidden border border-blue-500/30">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-blue-500/10 rounded-lg">
                                            <Workflow className="text-blue-400" />
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${instance.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                                            }`}>
                                            {instance.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">{instance.slug}</h3>
                                    <div className="space-y-2 text-sm text-gray-300">
                                        <p><strong>URL:</strong> <a href={instance.url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{instance.url}</a></p>
                                        <p><strong>Host:</strong> {instance.host}</p>
                                        <p><strong>Usuario:</strong> {instance.basicAuthUser}</p>
                                        <div className="bg-black/30 p-2 rounded text-xs font-mono break-all">
                                            Pass: {instance.basicAuthPass}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">⚠️ Guarda estas credenciales. Se recomienda cambiarlas tras el primer ingreso.</p>
                                    </div>
                                </Card>
                            ))}
                            {n8nInstances.length === 0 && (
                                <div className="col-span-2 text-center py-10 text-gray-500 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <Workflow className="mx-auto mb-4 opacity-50" size={48} />
                                    <p>No tienes instancias de n8n activas.</p>
                                    <p className="text-sm mt-2">Haz clic en "Nueva Instancia" para comenzar.</p>
                                </div>
                            )}
                        </div>
                    </>
                ) : activeTab === 'ai' ? (
                    <>
                        <h2 className="text-2xl font-bold mb-6">Prompt del Asistente</h2>
                        <AdminAiPrompt />
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold mb-6">Gestión de Citas</h2>
                        <AppointmentsManager />
                    </>
                )}
            </div>
        </div >
    );
};

export default Dashboard;
