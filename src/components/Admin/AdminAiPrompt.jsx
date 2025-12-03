import React, { useEffect, useState } from 'react';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import apiFetch from '../../lib/api';

const AdminAiPrompt = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await apiFetch('/api/admin/ai-prompt', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const json = await res.json();
          setPrompt(json.system || '');
        } else {
          console.error('Failed to load ai prompt');
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/admin/ai-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ system: prompt })
      });
      if (res.ok) {
        setMessage('Guardado correctamente');
      } else {
        const err = await res.json();
        setMessage('Error: ' + (err.error || 'No se pudo guardar'));
      }
    } catch (e) {
      setMessage('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Prompt del Asistente (IA)</h2>
      <p className="text-sm text-gray-400 mb-4">Editá el prompt del asistente. Esto cambia el comportamiento del chat.</p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full h-64 p-3 bg-black/80 border border-white/10 rounded-md text-sm font-mono placeholder-gray-400 resize-none"
        style={{ backgroundColor: '#071016', color: '#ffffff' }}
        spellCheck={false}
      />
      <div className="flex items-center gap-3 mt-4">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        <span className="text-sm text-gray-300">{message}</span>
      </div>
    </Card>
  );
};

export default AdminAiPrompt;
