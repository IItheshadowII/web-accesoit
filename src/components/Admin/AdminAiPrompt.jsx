import React, { useEffect, useState } from 'react';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import apiFetch from '../../lib/api';

const AdminAiPrompt = () => {
  // Force redeploy - dark textarea editor with restore button
  const [prompt, setPrompt] = useState('');
  const [provider, setProvider] = useState('openai');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        // Obtener provider actual
        const cfgRes = await apiFetch('/api/config');
        let currentProvider = 'openai';
        if (cfgRes.ok) {
          const c = await cfgRes.json();
          currentProvider = c.provider || 'openai';
          setProvider(currentProvider);
        }
        const res = await apiFetch(`/api/admin/ai-prompt?provider=${currentProvider}`, { headers: { Authorization: `Bearer ${token}` } });
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
        body: JSON.stringify({ system: prompt, provider })
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

  const handleRestore = () => {
    const defaultPrompt = 'Eres el asistente comercial de AccesoIT, expertos en automatización e IA.\n\nTONO Y PERSONALIDAD (PROFESIONAL CERCANO):\n- Usa "vos" (tratamiento estándar en Argentina) pero mantén un vocabulario profesional.\n- Sé cordial, directo y ejecutivo.\n- Evita el slang o informalidad excesiva ("tranqui", "re", "buenísimo").\n- Evita también la formalidad robótica ("estimado", "su persona").\n- Actúa como un consultor experto que valora el tiempo del cliente.\n\nOBJETIVO PRINCIPAL:\nTu ÚNICA meta es AGENDAR UNA LLAMADA (video o telefónica) con el cliente. No estás aquí para dar soporte técnico ni diseñar soluciones complejas por chat.\n\nCOMPORTAMIENTO DE VENTA:\n1.  **Escucha y Valida**: Cuando el cliente te cuente su idea, confirma que es una excelente iniciativa y totalmente viable.\n2.  **No Abrumes**: Cero tecnicismos (APIs, protocolos) a menos que te pregunten.\n3.  **Cierra la Venta**: Después de validar, invita a una llamada para concretar.\n\nMANEJO DE OBJECIONES:\n- Si dicen "no tengo idea": "No te preocupes, nosotros nos encargamos de la tecnología. Lo importante es entender tu negocio. ¿Podemos hablar mañana?"\n- Si preguntan precios: "Depende del alcance del proyecto, pero tenemos opciones a medida. Lo podemos revisar en una llamada de 10 minutos."\n\nAGENDAMIENTO (PRIORIDAD MÁXIMA):\n- Agenda INMEDIATAMENTE si tienes fecha y hora.\n- Si falta el nombre o email, pídelo amablemente.\n- Asume "Consulta de Automatización" como servicio.\n- Usa la fecha de mañana si dicen "mañana".';
    setPrompt(defaultPrompt);
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Prompt del Asistente (IA)</h2>
      <p className="text-sm text-gray-400 mb-4">Editá el prompt del asistente. Esto cambia el comportamiento del chat.</p>
      <p className="text-xs text-gray-400 mb-2">Proveedor activo: {provider}</p>
      
      {/* Container with guaranteed dark background */}
      <div 
        style={{ 
          backgroundColor: '#0a0a0a', 
          border: '1px solid rgba(255,255,255,0.1)', 
          borderRadius: '6px',
          padding: '0'
        }}
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            height: '256px',
            padding: '12px',
            backgroundColor: '#0a0a0a',
            color: '#ffffff',
            border: 'none',
            outline: 'none',
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Menlo, "Roboto Mono", "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '1.5',
            resize: 'none'
          }}
        />
      </div>
      
      <div className="flex items-center gap-3 mt-4">
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
        <Button variant="outline" onClick={handleRestore}>Restaurar por defecto</Button>
        <span className="text-sm text-gray-300">{message}</span>
      </div>
    </Card>
  );
};

export default AdminAiPrompt;
