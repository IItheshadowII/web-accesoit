import React from 'react';
import { Terminal, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-black/50 border-t border-glass-border mt-20 pt-12 pb-6">
            <div className="container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12 items-start">
                <div>
                    <div className="flex items-center gap-2 text-xl font-bold text-white mb-4">
                        <Terminal className="text-accent" />
                        <span>Acceso<span className="text-accent">IT</span></span>
                    </div>
                    <p className="text-gray-400 text-sm max-w-md">
                        Automatización e infraestructura IT para potenciar tu negocio.
                    </p>
                </div>

                <div>
                    <h3 className="text-white font-bold mb-4">Servicios</h3>
                    <ul className="text-gray-400 text-sm space-y-2">
                        <li><a href="/service/bots-y-automatizaciones" className="hover:text-accent transition-colors">Bots y Automatizaciones</a></li>
                        <li><a href="/service/asistentes-con-ia" className="hover:text-accent transition-colors">Asistentes IA</a></li>
                        <li><a href="/service/infraestructura-y-devops" className="hover:text-accent transition-colors">Infraestructura y DevOps</a></li>
                        <li><a href="/service/desarrollo-a-medida" className="hover:text-accent transition-colors">Desarrollo a Medida</a></li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-white font-bold mb-4">Empresa</h3>
                    <ul className="text-gray-400 text-sm space-y-2">
                        <li><a href="#" className="hover:text-accent transition-colors">Sobre Nosotros</a></li>
                        <li><a href="#" className="hover:text-accent transition-colors">Casos de Éxito</a></li>
                        <li><a href="#" className="hover:text-accent transition-colors">Blog</a></li>
                        <li><a href="/contact" className="hover:text-accent transition-colors">Contacto</a></li>
                    </ul>
                </div>

                <div>
                    <h3 className="text-white font-bold mb-4">Contacto</h3>
                    <ul className="text-gray-400 text-sm space-y-2">
                        <li className="flex items-center gap-2"><Mail size={16} /> contacto@accesoit.com</li>
                        <li className="flex items-center gap-2"><Phone size={16} /> +54 9 11 1234 5678</li>
                        <li className="flex items-center gap-2"><MapPin size={16} /> Buenos Aires, Argentina</li>
                    </ul>
                </div>
            </div>

            <div className="container border-t border-white/5 pt-6 text-center text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} AccesoIT. Todos los derechos reservados.
            </div>
        </footer>
    );
};

export default Footer;
