import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './Header.module.css';
import { api } from '../api/axios'; // твой инстанс

const Header: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    const isAuthed = useMemo(
        () => Boolean(localStorage.getItem('access_token')),
        [location.key]
    );

    const handleLogout = async () => {
        if (loading) return;
        setLoading(true);
        const accessToken = localStorage.getItem('access_token');

        try {
            await api.post(
                '/auth/logout',
                null,
                {
                    withCredentials: true, // чтобы кука refresh_token дошла до сервера
                    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
                }
            );
        } catch {
            // игнорируем — даже если 401 при истёкшем access_token, всё равно чистим локально
        } finally {
            localStorage.removeItem('access_token');
            setLoading(false);
            navigate('/signin', { replace: true });
        }
    };

    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <span className={styles.logoText}>ZENIT</span>
            </div>
            <nav className={styles.nav}>
                <ul className={styles.navList}>
                    <li><Link to="/cockpits">Cockpits</Link></li>
                    <li><Link to="/create-cockpit">Create Cockpit</Link></li>

                    {!isAuthed ? (
                        <>
                            <li><Link to="/signin">Sign In</Link></li>
                            <li><Link to="/signup">Registration</Link></li>
                        </>
                    ) : (
                        <li>
                            <button
                                onClick={handleLogout}
                                className={styles.logoutBtn}
                                disabled={loading}
                            >
                                {loading ? 'Logging out…' : 'Logout'}
                            </button>
                        </li>
                    )}
                </ul>
            </nav>
        </header>
    );
};

export default Header;
