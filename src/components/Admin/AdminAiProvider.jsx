import React, { useEffect, useState } from 'react';
import Card from '../../components/UI/Card';
import Button from '../../components/UI/Button';
import apiFetch from '../../lib/api';

const AdminAiProvider = () => {
    const [settings, setSettings] = useState({
        provider: 'openai',
        model: '',
        apiKey: '',
        baseUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [modelsLoading, setModelsLoading] = useState(false);
    const [modelsMessage, setModelsMessage] = useState('');
    const [geminiModels, setGeminiModels] = useState([]);

    const providers = {
        openai: {
            name: 'OpenAI',
            models: [
                'gpt-5-nano',
                'gpt-4o-mini',
                'gpt-4o',
                'gpt-4-turbo',
                'gpt-4',
                'gpt-3.5-turbo',
                'o1-mini',
                'o1-preview'
            ],
            defaultBaseUrl: 'https://api.openai.com/v1'
        },
        gemini: {
            name: 'Google Gemini',
            models: geminiModels.length > 0 ? geminiModels : [
                'gemini-2.0-flash-lite',
                'gemini-2.5-flash-lite', 
                'gemini-2.5-flash',
                'gemini-1.5-flash',
                'gemini-1.5-pro'
            ],
            defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta'
        },
        groq: {
            name: 'Groq',
            models: [
                'llama-3.3-70b-versatile',
                'llama-3.1-8b-instant',
                'llama-3.1-70b-versatile',
                'llama3-8b-8192',
                'llama3-70b-8192',
                'mixtral-8x7b-32768'
            ],
            defaultBaseUrl: 'https://api.groq.com/openai/v1'
        },
        custom: {
            name: 'Custom (Ollama, etc)',
            models: [], // User defined
            defaultBaseUrl: 'http://localhost:11434/v1'
        }
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await apiFetch('/api/admin/ai-provider', { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const data = await res.json();
                    setSettings(data);
                } else {
                    console.error('Failed to load AI provider settings');
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
            const res = await apiFetch('/api/admin/ai-provider', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                setMessage('Guardado correctamente');
                // Refresh settings to show placeholder for API key
                const newRes = await apiFetch('/api/admin/ai-provider', { headers: { Authorization: `Bearer ${token}` } });
                if (newRes.ok) setSettings(await newRes.json());

            } else {
                const err = await res.json();
                setMessage('Error: ' + (err.error || 'No se pudo guardar'));
            }
        } catch (e) {
            setMessage('Error de conexi�n');
        } finally {
            setSaving(false);
        }
    };

    const handleProviderChange = (e) => {
        const newProvider = e.target.value;
        const providerData = providers[newProvider];
        setSettings({
            ...settings,
            provider: newProvider,
            model: providerData.models[0] || '',
            baseUrl: providerData.defaultBaseUrl || ''
        });
    };

    return (
        <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">Proveedor de IA</h2>
            <p className="text-sm text-gray-400 mb-6">Configura el modelo de lenguaje a utilizar en el chat.</p>

            {loading ? (
                <p>Cargando configuraci�n...</p>
            ) : (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Proveedor</label>
                        <select
                            value={settings.provider}
                            onChange={handleProviderChange}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                        >
                            {Object.keys(providers).map(key => (
                                <option key={key} value={key}>{providers[key].name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Modelo</label>
                        {providers[settings.provider]?.models.length > 0 ? (
                            <select
                                value={settings.model}
                                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            >
                                {providers[settings.provider].models.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type="text"
                                value={settings.model}
                                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                                placeholder="Ej: llama2, gemma:7b"
                            />
                        )}
                    </div>
                    {settings.provider === 'gemini' && (
                        <div>
                            <Button
                                onClick={async () => {
                                    setModelsMessage('');
                                    setModelsLoading(true);
                                    try {
                                        const token = localStorage.getItem('token');
                                        const res = await apiFetch('/api/admin/ai-provider/models', { headers: { Authorization: `Bearer ${token}` } });
                                        if (res.ok) {
                                            const data = await res.json();
                                            const list = data.models || [];
                                            if (list.length > 0) {
                                                // Store list in state so it persists across renders
                                                setGeminiModels(list);
                                                // If current model not in list, select first
                                                if (!list.includes(settings.model)) {
                                                    setSettings({ ...settings, model: list[0] });
                                                } else {
                                                    setSettings({ ...settings });
                                                }
                                                setModelsMessage(`Modelos cargados: ${list.length}`);
                                            } else {
                                                setModelsMessage('No se encontraron modelos disponibles para esta credencial.');
                                            }
                                        } else {
                                            const errText = await res.text();
                                            setModelsMessage(`Error al listar modelos: ${errText.substring(0,200)}`);
                                        }
                                    } catch (e) {
                                        console.error('Failed to load Gemini models', e);
                                        setModelsMessage('Error al cargar modelos. Revisa la consola del servidor.');
                                    } finally {
                                        setModelsLoading(false);
                                    }
                                }}
                                disabled={modelsLoading}
                            >
                                {modelsLoading ? 'Cargando modelos...' : 'Cargar modelos desde Google'}
                            </Button>
                            <p className="text-xs text-gray-400 mt-1">Usa tu API Key para listar los modelos disponibles. Obtén una en Google AI Studio.</p>
                            {modelsMessage && (
                              <p className="text-xs mt-1" style={{ color: '#9ae6b4' }}>{modelsMessage}</p>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">API Key</label>
                        <input
                            type="password"
                            value={settings.apiKey}
                            onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            placeholder="Dejar sin cambios para no modificar"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Base URL (Opcional)</label>
                        <input
                            type="text"
                            value={settings.baseUrl}
                            onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent transition-colors"
                            placeholder="Ej: https://api.openai.com/v1"
                        />
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 mt-6">
                <Button onClick={handleSave} disabled={saving || loading}>
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
                {message && <span className="text-sm text-gray-300">{message}</span>}
            </div>
        </Card>
    );
};

export default AdminAiProvider;
