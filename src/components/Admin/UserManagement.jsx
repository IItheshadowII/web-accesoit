import React, { useEffect, useState } from 'react';
import { Users, Edit, Trash2, Plus } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import apiFetch from '../../lib/api';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/admin/users', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/api/admin/user/${editingUser.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingUser)
      });
      
      if (res.ok) {
        setMessage('Usuario actualizado correctamente');
        setEditingUser(null);
        loadUsers();
      } else {
        const err = await res.json();
        setMessage('Error: ' + (err.error || 'No se pudo actualizar'));
      }
    } catch (e) {
      setMessage('Error de conexión');
    }
  };

  if (loading) return <div>Cargando usuarios...</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Users size={20} />
          Gestión de Usuarios
        </h3>
        
        {message && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm">
            {message}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2">Email</th>
                <th className="text-left py-2">Nombre</th>
                <th className="text-left py-2">Empresa</th>
                <th className="text-left py-2">Rol</th>
                <th className="text-left py-2">Creado</th>
                <th className="text-left py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-white/5">
                  <td className="py-2">{user.email}</td>
                  <td className="py-2">{user.name || 'Sin nombre'}</td>
                  <td className="py-2">{user.company || 'Sin empresa'}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.role === 'admin' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-2">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingUser(user)}
                        className="gap-1"
                      >
                        <Edit size={14} />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            const res = await apiFetch(`/api/admin/user/${user.id}/disable`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ disabled: !user.disabled })
                            });
                            if (res.ok) {
                              setMessage(!user.disabled ? 'Usuario deshabilitado' : 'Usuario habilitado');
                              loadUsers();
                            } else {
                              const err = await res.json();
                              setMessage('Error: ' + (err.error || 'No se pudo cambiar estado'));
                            }
                          } catch (e) {
                            setMessage('Error de conexión');
                          }
                        }}
                        className="gap-1"
                      >
                        {user.disabled ? 'Habilitar' : 'Deshabilitar'}
                      </Button>

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => { setConfirmDeleteUser(user); setDeleteConfirmationText(''); }}
                        className="gap-1"
                      >
                        <Trash2 size={14} />
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de edición */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Editar Usuario</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  style={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#ffffff' }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input
                  type="text"
                  value={editingUser.name || ''}
                  onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  style={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#ffffff' }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Empresa</label>
                <input
                  type="text"
                  value={editingUser.company || ''}
                  onChange={(e) => setEditingUser({...editingUser, company: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  style={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#ffffff' }}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <select
                  value={editingUser.role || 'user'}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                  style={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#ffffff' }}
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Nueva Contraseña (opcional)</label>
                <input
                  type="password"
                  value={editingUser.password || ''}
                  onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                  placeholder="Dejar vacío para mantener actual"
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
                  style={{ backgroundColor: '#1f2937', borderColor: '#4b5563', color: '#ffffff' }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleSaveUser}>Guardar</Button>
              <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Eliminar Usuario</h3>
            <p className="text-sm text-gray-300 mb-4">Estás a punto de eliminar al usuario <strong>{confirmDeleteUser.email}</strong>. Esta acción puede ser reversible (soft) o permanente (hard). Para evitar borrados accidentales, escribe <strong>ELIMINAR</strong> en el campo y confirma.</p>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Escribe ELIMINAR para confirmar"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />

              <div className="flex gap-3">
                <Button
                  onClick={async () => {
                    if (deleteConfirmationText !== 'ELIMINAR') {
                      setMessage('Debes escribir ELIMINAR para confirmar');
                      return;
                    }

                    try {
                      const token = localStorage.getItem('token');
                      // Por defecto hacemos soft delete (anonymize + disable). Para hard delete, podríamos pasar hard: true
                      const res = await apiFetch(`/api/admin/user/${confirmDeleteUser.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ confirm: 'ELIMINAR', hard: false })
                      });

                      if (res.ok) {
                        const data = await res.json();
                        setMessage(data.message || 'Usuario eliminado (soft)');
                        setConfirmDeleteUser(null);
                        loadUsers();
                      } else {
                        const err = await res.json();
                        setMessage('Error: ' + (err.error || 'No se pudo eliminar'));
                      }
                    } catch (e) {
                      setMessage('Error de conexión');
                    }
                  }}
                >
                  Eliminar (soft)
                </Button>

                <Button
                  variant="danger"
                  onClick={async () => {
                    if (deleteConfirmationText !== 'ELIMINAR') {
                      setMessage('Debes escribir ELIMINAR para confirmar');
                      return;
                    }

                    try {
                      const token = localStorage.getItem('token');
                      const res = await apiFetch(`/api/admin/user/${confirmDeleteUser.id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ confirm: 'ELIMINAR', hard: true })
                      });

                      if (res.ok) {
                        const data = await res.json();
                        setMessage(data.message || 'Usuario eliminado permanentemente');
                        setConfirmDeleteUser(null);
                        loadUsers();
                      } else {
                        const err = await res.json();
                        setMessage('Error: ' + (err.error || 'No se pudo eliminar'));
                      }
                    } catch (e) {
                      setMessage('Error de conexión');
                    }
                  }}
                >
                  Eliminar (permanente)
                </Button>

                <Button variant="outline" onClick={() => setConfirmDeleteUser(null)}>Cancelar</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default UserManagement;