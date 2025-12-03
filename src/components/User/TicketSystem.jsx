import React, { useEffect, useState } from 'react';
import { Ticket, Plus, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import apiFetch from '../../lib/api';

const TicketSystem = ({ isAdmin = false }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    priority: 'medium'
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/tickets', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (e) {
      console.error('Error loading tickets:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/tickets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newTicket)
      });
      
      if (res.ok) {
        setNewTicket({ subject: '', message: '', priority: 'medium' });
        setShowNewTicket(false);
        loadTickets();
      }
    } catch (e) {
      console.error('Error creating ticket:', e);
    }
  };

  const handleUpdateTicket = async (ticketId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });
      
      if (res.ok) {
        loadTickets();
        if (selectedTicket?.id === ticketId) {
          const updatedTicket = await res.json();
          setSelectedTicket(updatedTicket);
        }
      }
    } catch (e) {
      console.error('Error updating ticket:', e);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open': return <Clock size={16} className="text-yellow-400" />;
      case 'in_progress': return <MessageSquare size={16} className="text-blue-400" />;
      case 'closed': return <CheckCircle size={16} className="text-green-400" />;
      default: return <AlertCircle size={16} className="text-gray-400" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400';
      case 'high': return 'bg-orange-500/20 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-green-500/20 text-green-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading) return <div>Cargando tickets...</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Ticket size={20} />
            {isAdmin ? 'Gestión de Tickets' : 'Mis Tickets de Soporte'}
          </h3>
          
          {!isAdmin && (
            <Button onClick={() => setShowNewTicket(true)} className="gap-2">
              <Plus size={16} />
              Nuevo Ticket
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="p-4 bg-white/5 rounded-lg border border-white/10 cursor-pointer hover:bg-white/10 transition-colors"
              onClick={() => setSelectedTicket(ticket)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {getStatusIcon(ticket.status)}
                  <h4 className="font-medium">{ticket.subject}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(ticket.priority)}`}>
                    {ticket.priority}
                  </span>
                  <span className="text-xs text-gray-400">
                    #{ticket.id}
                  </span>
                </div>
              </div>
              
              <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                {ticket.message}
              </p>
              
              <div className="flex justify-between text-xs text-gray-500">
                <span>
                  {isAdmin && ticket.user ? `${ticket.user.name || ticket.user.email}` : 'Creado'}
                  {' '}{new Date(ticket.createdAt).toLocaleDateString()}
                </span>
                <span className="capitalize">{ticket.status.replace('_', ' ')}</span>
              </div>
            </div>
          ))}
          
          {tickets.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              {isAdmin ? 'No hay tickets pendientes' : 'No tienes tickets de soporte'}
            </div>
          )}
        </div>
      </Card>

      {/* Modal nuevo ticket */}
      {showNewTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Nuevo Ticket de Soporte</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Asunto</label>
                <input
                  type="text"
                  value={newTicket.subject}
                  onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                  style={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#ffffff' }}
                  placeholder="Describe brevemente el problema"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Prioridad</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  style={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#ffffff' }}
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Mensaje</label>
                <textarea
                  value={newTicket.message}
                  onChange={(e) => setNewTicket({...newTicket, message: e.target.value})}
                  className="w-full h-32 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                  style={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#ffffff' }}
                  placeholder="Describe el problema en detalle"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleCreateTicket}>Crear Ticket</Button>
              <Button variant="outline" onClick={() => setShowNewTicket(false)}>Cancelar</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal detalle ticket */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  {getStatusIcon(selectedTicket.status)}
                  {selectedTicket.subject}
                </h3>
                <p className="text-sm text-gray-400">
                  Ticket #{selectedTicket.id} • Creado {new Date(selectedTicket.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${getPriorityColor(selectedTicket.priority)}`}>
                {selectedTicket.priority}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Mensaje inicial:</h4>
                <div className="bg-white/5 p-3 rounded border-l-4 border-blue-500">
                  {selectedTicket.message}
                </div>
              </div>

              {selectedTicket.response && (
                <div>
                  <h4 className="font-medium mb-2">Respuesta del equipo:</h4>
                  <div className="bg-white/5 p-3 rounded border-l-4 border-green-500">
                    {selectedTicket.response}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Respondido {new Date(selectedTicket.respondedAt).toLocaleString()}
                  </p>
                </div>
              )}

              {isAdmin && (
                <div className="border-t border-white/10 pt-4">
                  <h4 className="font-medium mb-2">Responder ticket:</h4>
                  <textarea
                    className="w-full h-24 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                    style={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#ffffff' }}
                    placeholder="Escribe tu respuesta..."
                    defaultValue={selectedTicket.response || ''}
                    onBlur={(e) => {
                      if (e.target.value !== (selectedTicket.response || '')) {
                        handleUpdateTicket(selectedTicket.id, { response: e.target.value });
                      }
                    }}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'in_progress' })}
                      disabled={selectedTicket.status === 'in_progress'}
                    >
                      En Progreso
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'closed' })}
                      disabled={selectedTicket.status === 'closed'}
                    >
                      Cerrar
                    </Button>
                  </div>
                </div>
              )}

              {!isAdmin && selectedTicket.status !== 'closed' && (
                <div className="border-t border-white/10 pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'closed' })}
                  >
                    Cerrar Ticket
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>Cerrar</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default TicketSystem;