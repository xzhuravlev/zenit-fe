import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './Header.module.css';
import { api } from '../api/axios';
import { useAuth } from '../context/AuthContext';

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        if (loading) return;
        setLoading(true);
        const accessToken = localStorage.getItem('access_token');

        try {
            await api.post('/auth/logout', null, {
                withCredentials: true,
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            });
        } catch { } finally {
            localStorage.removeItem('access_token');
            window.dispatchEvent(new Event('auth:changed')); // сообщаем провайдеру
            setLoading(false);
            navigate('/signin', { replace: true });
        }
    };

    const isAdminLike = user?.role === 'ADMIN';

    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <span className={styles.logoText}>ZENIT</span>
            </div>

            <nav className={styles.nav}>
                <ul className={styles.navList}>
                    <li><Link to="/cockpits">Cockpits</Link></li>
                    <li><Link to="/create-cockpit">Create Cockpit</Link></li>

                    {!user ? (
                        <>
                            <li><Link to="/signin">Sign In</Link></li>
                            <li><Link to="/signup">Registration</Link></li>
                        </>
                    ) : (
                        <>
                            <li>
                                <span className={styles.userBadge}>
                                    {user.username} ({user.role})
                                </span>
                            </li>
                            {isAdminLike && (
                                <li><Link to="/admin">Admin Panel</Link></li>
                            )}
                            <li>
                                <button onClick={handleLogout} className={styles.logoutBtn} disabled={loading}>
                                    {loading ? 'Logging out…' : 'Logout'}
                                </button>
                            </li>
                        </>
                    )}
                </ul>
            </nav>
        </header>
    );
};

export default Header;
