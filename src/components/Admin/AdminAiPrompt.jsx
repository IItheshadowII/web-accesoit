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

  // Ensure textarea styles are not overridden by global CSS: inject a high-specificity rule
  useEffect(() => {
    try {
      const styleId = 'admin-ai-prompt-textarea-style';
      if (!document.getElementById(styleId)) {
        const s = document.createElement('style');
        s.id = styleId;
        s.innerHTML = `#admin-ai-prompt-textarea { background-color: #071016 !important; color: #ffffff !important; caret-color: #ffffff !important; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", "Courier New", monospace !important; }
        #admin-ai-prompt-textarea::selection { background: rgba(255,255,255,0.12) !important; }
        `;
        document.head.appendChild(s);
      }
    } catch (e) {
      // silent
      console.warn('Could not inject admin ai prompt styles', e && e.message);
    }
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
        id="admin-ai-prompt-textarea"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full h-64 p-3 border border-white/10 rounded-md text-sm font-mono placeholder-gray-400 resize-none"
        style={{ backgroundColor: 'transparent' }}
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
