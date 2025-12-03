import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import Button from '../components/UI/Button';
import Card from '../components/UI/Card';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    // Use relative URL in production so requests go to the same origin (e.g. /api/auth/login)
    // In development set VITE_API_URL to 'http://localhost:3002'
    const API_URL = import.meta.env.VITE_API_URL || '';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        console.log('🔐 Intentando login...', { email, API_URL });

        try {
            const url = `${API_URL}/api/auth/login`;
            console.log('📡 Llamando a:', url);

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            console.log('📬 Response status:', response.status);

            const data = await response.json();
            console.log('📦 Response data:', data);

            if (!response.ok) {
                // Show specific message for disabled users
                const errorMsg = data.error || 'Error al iniciar sesión';
                console.error('❌ Login error:', errorMsg);
                setError(errorMsg);
                setLoading(false);
                return;
            }

            console.log('✅ Login exitoso, guardando token...');
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            console.log('✅ Redirigiendo a dashboard...');
            navigate('/dashboard');
        } catch (err) {
            console.error('❌ Exception durante login:', err);
            setError(`Error de conexión: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`${API_URL}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential: credentialResponse.credential }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.error || 'Error al iniciar sesión con Google');
                setLoading(false);
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/dashboard');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleError = () => {
        setError('Error al iniciar sesión con Google');
    };

    return (
        <div className="min-h-screen flex items-center justify-center py-20">
            <div className="container max-w-md">
                <Card className="p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="p-4 bg-white/5 rounded-full">
                            <Lock size={40} className="text-accent" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Portal de Clientes</h1>
                    <p className="text-gray-400 mb-8">Accede a tus reportes y estado de servicios.</p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent"
                            required
                        />
                        <Button className="w-full" disabled={loading}>
                            {loading ? 'Ingresando...' : 'Ingresar'}
                        </Button>
                    </form>

                    <div className="my-6 flex items-center gap-4">
                        <div className="flex-1 h-px bg-white/10"></div>
                        <span className="text-sm text-gray-500">o continúa con</span>
                        <div className="flex-1 h-px bg-white/10"></div>
                    </div>

                    <div className="flex justify-center">
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={handleGoogleError}
                            theme="filled_black"
                            size="large"
                            text="continue_with"
                            locale="es"
                        />
                    </div>

                    <p className="mt-6 text-sm text-gray-500">
                        Al registrarte con Google, aceptas nuestros términos de servicio.
                    </p>
                </Card>
            </div>
        </div>
    );
};

export default Login;
