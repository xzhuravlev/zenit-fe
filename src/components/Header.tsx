import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Header.module.css';

const Header: React.FC = () => {
    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                    <span className={styles.logoText}>ZENIT</span>
            </div>
            <nav className={styles.nav}>
                <ul className={styles.navList}>
                    <li><Link to="/cockpits">Cockpits</Link></li>
                    <li><Link to="/create-cockpit">Create Cockpit</Link></li>
                    <li><Link to="/signin">Sign In</Link></li>
                    <li><Link to="/signup">Registration</Link></li>
                    {/* Добавьте другие ссылки по необходимости */}
                </ul>
            </nav>
        </header>
    );
};

export default Header;
