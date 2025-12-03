import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Mail, Phone, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Button from '../UI/Button';
import Card from '../UI/Card';
import apiFetch from '../../lib/api';

const AppointmentsManager = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, confirmed, cancelled

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await apiFetch('/api/appointments', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setAppointments(data);
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelAppointment = async (id) => {
        if (!confirm('¿Estás seguro de que deseas cancelar esta cita?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await apiFetch(`/api/appointments/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Actualizar la lista localmente
                setAppointments(appointments.map(apt => 
                    apt.id === id ? { ...apt, status: 'cancelled' } : apt
                ));
                alert('Cita cancelada correctamente. Se ha notificado a n8n para eliminar el evento de Google Calendar.');
            } else {
                alert('Error al cancelar la cita');
            }
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            alert('Error al cancelar la cita');
        }
    };

    const handleDeleteAppointment = async (id) => {
        if (!confirm('¿Estás seguro de que deseas ELIMINAR permanentemente esta cita? Esta acción no se puede deshacer.')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await apiFetch(`/api/appointments/${id}?hard=true`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // Remover de la lista local
                setAppointments(prev => prev.filter(a => a.id !== id));
                alert('Cita eliminada permanentemente.');
            } else {
                const err = await response.json().catch(() => ({}));
                console.error('Delete failed', err);
                alert('Error al eliminar la cita');
            }
        } catch (error) {
            console.error('Error deleting appointment:', error);
            alert('Error al eliminar la cita');
        }
    };

    const filteredAppointments = appointments.filter(apt => {
        if (filter === 'all') return true;
        return apt.status === filter;
    });

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-500/20 text-yellow-400',
            confirmed: 'bg-green-500/20 text-green-400',
            cancelled: 'bg-red-500/20 text-red-400'
        };

        const icons = {
            pending: <AlertCircle size={14} />,
            confirmed: <CheckCircle size={14} />,
            cancelled: <XCircle size={14} />
        };

        const labels = {
            pending: 'Pendiente',
            confirmed: 'Confirmada',
            cancelled: 'Cancelada'
        };

        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
                {icons[status]}
                {labels[status]}
            </span>
        );
    };

    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-400">Cargando citas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
                <Button
                    variant={filter === 'all' ? 'primary' : 'outline'}
                    onClick={() => setFilter('all')}
                    size="sm"
                >
                    Todas ({appointments.length})
                </Button>
                <Button
                    variant={filter === 'pending' ? 'primary' : 'outline'}
                    onClick={() => setFilter('pending')}
                    size="sm"
                >
                    Pendientes ({appointments.filter(a => a.status === 'pending').length})
                </Button>
                <Button
                    variant={filter === 'confirmed' ? 'primary' : 'outline'}
                    onClick={() => setFilter('confirmed')}
                    size="sm"
                >
                    Confirmadas ({appointments.filter(a => a.status === 'confirmed').length})
                </Button>
                <Button
                    variant={filter === 'cancelled' ? 'primary' : 'outline'}
                    onClick={() => setFilter('cancelled')}
                    size="sm"
                >
                    Canceladas ({appointments.filter(a => a.status === 'cancelled').length})
                </Button>
            </div>

            {/* Lista de citas */}
            <div className="grid grid-cols-1 gap-4">
                {filteredAppointments.length === 0 ? (
                    <Card className="text-center py-12">
                        <Calendar className="mx-auto mb-4 text-gray-500" size={48} />
                        <p className="text-gray-400">No hay citas {filter !== 'all' ? filter : ''}</p>
                    </Card>
                ) : (
                    filteredAppointments.map((appointment) => (
                        <motion.div
                            key={appointment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Card className="hover:border-blue-500/50 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-xl font-bold">{appointment.name}</h3>
                                            {getStatusBadge(appointment.status)}
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-400">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-blue-400" />
                                                <span>{formatDate(appointment.date)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} className="text-blue-400" />
                                                <span>{appointment.time}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Mail size={16} className="text-blue-400" />
                                                <span>{appointment.email}</span>
                                            </div>
                                            {appointment.phone && (
                                                <div className="flex items-center gap-2">
                                                    <Phone size={16} className="text-blue-400" />
                                                    <span>{appointment.phone}</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="mt-3 p-3 bg-white/5 rounded-lg">
                                            <p className="text-sm">
                                                <strong className="text-blue-400">Servicio:</strong> {appointment.service}
                                            </p>
                                            {appointment.message && (
                                                <p className="text-sm mt-2">
                                                    <strong className="text-blue-400">Mensaje:</strong> {appointment.message}
                                                </p>
                                            )}
                                        </div>

                                        {appointment.googleEventId && (
                                            <p className="text-xs text-gray-500 mt-2">
                                                ✓ Sincronizado con Google Calendar (ID: {appointment.googleEventId.substring(0, 12)}...)
                                            </p>
                                        )}

                                        <p className="text-xs text-gray-500 mt-1">
                                            ID: {appointment.id} • Creada: {new Date(appointment.createdAt).toLocaleString('es-AR')}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-2 ml-4">
                                        {appointment.status !== 'cancelled' && (
                                            <Button
                                                variant="outline"
                                                onClick={() => handleCancelAppointment(appointment.id)}
                                                className="text-yellow-400 border-yellow-400 hover:bg-yellow-500/10"
                                            >
                                                <XCircle size={18} />
                                                <span className="ml-2">Cancelar</span>
                                            </Button>
                                        )}

                                        <Button
                                            variant="outline"
                                            onClick={() => handleDeleteAppointment(appointment.id)}
                                            className="text-red-400 border-red-400 hover:bg-red-500/10"
                                        >
                                            <Trash2 size={18} />
                                            <span className="ml-2">Eliminar</span>
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AppointmentsManager;
