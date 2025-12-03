import React, { useEffect, useState } from 'react';
import { User, Lock, Mail, Building } from 'lucide-react';
import Card from '../UI/Card';
import Button from '../UI/Button';
import apiFetch from '../../lib/api';

const UserProfile = () => {
  const [profile, setProfile] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/profile', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (e) {
      console.error('Error loading profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: profile.email,
          name: profile.name,
          company: profile.company
        })
      });
      
      if (res.ok) {
        const updatedProfile = await res.json();
        setProfile(updatedProfile);
        // Update localStorage user
        localStorage.setItem('user', JSON.stringify(updatedProfile));
        setMessage('Perfil actualizado correctamente');
      } else {
        const err = await res.json();
        setMessage('Error: ' + (err.error || 'No se pudo actualizar'));
      }
    } catch (e) {
      setMessage('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.new !== passwords.confirm) {
      setMessage('Las contraseñas no coinciden');
      return;
    }
    
    setSaving(true);
    setMessage('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          password: passwords.new
        })
      });
      
      if (res.ok) {
        setMessage('Contraseña actualizada correctamente');
        setPasswords({ current: '', new: '', confirm: '' });
        setShowPasswordChange(false);
      } else {
        const err = await res.json();
        setMessage('Error: ' + (err.error || 'No se pudo actualizar la contraseña'));
      }
    } catch (e) {
      setMessage('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Cargando perfil...</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <User size={20} />
          Mi Perfil
        </h3>
        
        {message && (
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm">
            {message}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              <Mail size={16} />
              Email
            </label>
            <input
              type="email"
              value={profile.email || ''}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              <User size={16} />
              Nombre
            </label>
            <input
              type="text"
              value={profile.name || ''}
              onChange={(e) => setProfile({...profile, name: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 flex items-center gap-2">
              <Building size={16} />
              Empresa
            </label>
            <input
              type="text"
              value={profile.company || ''}
              onChange={(e) => setProfile({...profile, company: e.target.value})}
              className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Perfil'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="gap-2"
          >
            <Lock size={16} />
            Cambiar Contraseña
          </Button>
        </div>
      </Card>

      {showPasswordChange && (
        <Card className="p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Lock size={20} />
            Cambiar Contraseña
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nueva Contraseña</label>
              <input
                type="password"
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handlePasswordChange} disabled={saving}>
              {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
            </Button>
            <Button variant="outline" onClick={() => setShowPasswordChange(false)}>
              Cancelar
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default UserProfile;