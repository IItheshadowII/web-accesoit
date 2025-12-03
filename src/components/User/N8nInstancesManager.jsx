import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Workflow, 
    Play, 
    Square, 
    Trash2, 
    ExternalLink, 
    AlertCircle, 
    Loader, 
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';
import { apiFetch } from '../../lib/api';

const N8nInstancesManager = () => {
    const [instances, setInstances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [actionLoading, setActionLoading] = useState({});

    useEffect(() => {
        fetchInstances();
    }, []);

    const fetchInstances = async () => {
        try {
            setLoading(true);
            setError('');
            const token = localStorage.getItem('token');

            const response = await apiFetch('/api/n8n/instances/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Error al cargar instancias');
            }

            const data = await response.json();
            setInstances(data);
        } catch (err) {
            console.error('Error fetching instances:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleInstance = async (instanceId, currentStatus) => {
        try {
            setActionLoading(prev => ({ ...prev, [instanceId]: 'toggle' }));
            const token = localStorage.getItem('token');

            const response = await apiFetch(`/api/n8n/instances/${instanceId}/toggle`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al cambiar estado');
            }

            // Actualizar localmente (optimistic update)
            setInstances(prev => prev.map(inst => 
                inst.id === instanceId 
                    ? { ...inst, status: currentStatus === 'running' ? 'stopped' : 'running' }
                    : inst
            ));

        } catch (err) {
            console.error('Error toggling instance:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [instanceId]: null }));
        }
    };

    const handleDeleteInstance = async (instanceId, slug) => {
        const confirmMessage = `¿Estás seguro de eliminar la instancia "${slug}"?\n\nEsta acción no se puede deshacer y se eliminarán todos los datos.`;
        
        if (!confirm(confirmMessage)) return;

        try {
            setActionLoading(prev => ({ ...prev, [instanceId]: 'delete' }));
            const token = localStorage.getItem('token');

            const response = await apiFetch(`/api/n8n/instances/${instanceId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ hardDelete: false })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Error al eliminar instancia');
            }

            // Remover de la lista o actualizar estado
            setInstances(prev => prev.filter(inst => inst.id !== instanceId));

        } catch (err) {
            console.error('Error deleting instance:', err);
            alert(`Error: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [instanceId]: null }));
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            creating: {
                icon: Clock,
                color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
                label: 'Creando'
            },
            running: {
                icon: CheckCircle,
                color: 'bg-green-500/20 text-green-400 border-green-500/30',
                label: 'Activa'
            },
            stopped: {
                icon: Square,
                color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
                label: 'Detenida'
            },
            error: {
                icon: XCircle,
                color: 'bg-red-500/20 text-red-400 border-red-500/30',
                label: 'Error'
            },
            cancelled: {
                icon: XCircle,
                color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                label: 'Cancelada'
            }
        };

        const config = statusConfig[status] || statusConfig.error;
        const Icon = config.icon;

        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}>
                <Icon size={14} />
                {config.label}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader className="animate-spin text-blue-400" size={32} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                </div>
            </div>
        );
    }

    if (instances.length === 0) {
        return (
            <div className="text-center py-12">
                <Workflow className="mx-auto mb-4 text-gray-500" size={64} />
                <h3 className="text-xl font-semibold mb-2">No tienes instancias n8n</h3>
                <p className="text-gray-400 mb-6">
                    Contrata tu primera instancia para empezar a automatizar
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <AnimatePresence mode="popLayout">
                {instances.map((instance) => (
                    <motion.div
                        key={instance.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6 hover:border-white/20 transition-colors"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="bg-gradient-to-br from-blue-500 to-violet-500 p-3 rounded-lg">
                                    <Workflow className="text-white" size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold">{instance.slug}</h3>
                                    <p className="text-sm text-gray-400">
                                        {instance.plan?.name || 'Básico n8n'}
                                    </p>
                                </div>
                            </div>
                            {getStatusBadge(instance.status)}
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">URL:</span>
                                <a
                                    href={instance.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 group"
                                >
                                    {instance.url}
                                    <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </a>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">Usuario:</span>
                                <code className="bg-black/30 px-2 py-1 rounded text-blue-300 font-mono text-xs">
                                    {instance.basicAuthUser}
                                </code>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">Contraseña:</span>
                                <code className="bg-black/30 px-2 py-1 rounded text-blue-300 font-mono text-xs">
                                    {instance.basicAuthPass}
                                </code>
                            </div>

                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-gray-400">Creada:</span>
                                <span className="text-white">
                                    {new Date(instance.createdAt).toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {/* Botón Abrir */}
                            <motion.a
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                href={instance.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-blue-500/50 transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ExternalLink size={18} />
                                Abrir n8n
                            </motion.a>

                            {/* Botón Toggle (Iniciar/Detener) */}
                            {(instance.status === 'running' || instance.status === 'stopped') && (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => handleToggleInstance(instance.id, instance.status)}
                                    disabled={actionLoading[instance.id] === 'toggle'}
                                    className="px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {actionLoading[instance.id] === 'toggle' ? (
                                        <Loader className="animate-spin" size={18} />
                                    ) : instance.status === 'running' ? (
                                        <Square size={18} />
                                    ) : (
                                        <Play size={18} />
                                    )}
                                </motion.button>
                            )}

                            {/* Botón Eliminar */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleDeleteInstance(instance.id, instance.slug)}
                                disabled={actionLoading[instance.id] === 'delete'}
                                className="px-4 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg font-medium hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {actionLoading[instance.id] === 'delete' ? (
                                    <Loader className="animate-spin" size={18} />
                                ) : (
                                    <Trash2 size={18} />
                                )}
                            </motion.button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default N8nInstancesManager;
