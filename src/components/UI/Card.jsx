import React from 'react';
import { motion } from 'framer-motion';

const Card = ({ children, className = '', hover = true, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            whileHover={hover ? { y: -5, transition: { duration: 0.2 } } : {}}
            className={`glass p-6 rounded-xl border border-white/5 ${className}`}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export default Card;
