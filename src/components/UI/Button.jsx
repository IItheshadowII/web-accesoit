import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ children, variant = 'primary', className = '', ...props }) => {
    const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-gradient-to-r from-blue-600 to-violet-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-0.5",
        outline: "bg-transparent border border-white/10 text-white hover:bg-white/5 hover:border-blue-500/50",
        ghost: "bg-transparent text-gray-300 hover:text-white hover:bg-white/5"
    };

    return (
        <motion.button
            whileTap={{ scale: 0.98 }}
            className={`${baseStyles} ${variants[variant]} ${className}`}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default Button;
