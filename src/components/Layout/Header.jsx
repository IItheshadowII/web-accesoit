import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Terminal } from 'lucide-react';

const Header = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { name: 'Inicio', path: '/' },
        { name: 'Servicios', path: '/services' },
        { name: 'Contacto', path: '/contact' },
    ];

    return (
        <header
            className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'glass py-3' : 'bg-transparent py-5'
                }`}
        >
            <div className="container flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2 text-2xl font-bold text-white">
                    <Terminal className="text-accent" />
                    <span>Acceso<span className="text-accent">IT</span></span>
                </Link>

                {/* Desktop Nav */}
                <nav className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`text-sm font-medium transition-colors hover:text-accent ${location.pathname === link.path ? 'text-accent' : 'text-gray-300'
                                }`}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <div className="flex items-center">
                        <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors mr-6">
                            Portal
                        </Link>
                        <Link to="/contact" className="btn btn-primary text-sm px-5 py-2">
                            Empezar
                        </Link>
                    </div>
                </nav>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-white"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Nav */}
            {isMobileMenuOpen && (
                <div className="md:hidden glass absolute top-full left-0 w-full p-4 flex flex-col gap-4 border-t border-glass-border">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className="text-gray-300 hover:text-accent py-2"
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {link.name}
                        </Link>
                    ))}
                    <Link
                        to="/login"
                        className="text-gray-300 hover:text-accent py-2"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Portal Clientes
                    </Link>
                </div>
            )}
        </header>
    );
};

export default Header;
