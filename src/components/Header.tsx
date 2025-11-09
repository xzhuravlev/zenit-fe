import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Header.module.css";
import { api } from "../api/axios";
import { useAuth } from "../context/AuthContext";

const DEFAULT_AVATAR = "/media/avatar.jpg"; // из public

const Header: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        if (loading) return;
        setLoading(true);
        const accessToken = localStorage.getItem("access_token");

        try {
            await api.post("/auth/logout", null, {
                withCredentials: true,
                headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
            });
        } catch {
            // игнорируем ошибки
        } finally {
            localStorage.removeItem("access_token");
            window.dispatchEvent(new Event("auth:changed"));
            setLoading(false);
            navigate("/signin", { replace: true });
        }
    };

    const isAdminLike = user?.role === "ADMIN";

    return (
        <header className={styles.header}>
            <div className={styles.logoContainer}>
                <span className={styles.logoText}>ZENIT</span>
            </div>

            <nav className={styles.nav}>
            <ul className={styles.navList}>
    {!user ? (
        <>
            <li><Link to="/signin">Sign In</Link></li>
            <li><Link to="/signup">Registration</Link></li>
        </>
    ) : (
        <>
            {/* ЛЕВАЯ ЧАСТЬ */}
            <li><Link to="/cockpits">Cockpits</Link></li>
            <li><Link to="/create-cockpit">Create Cockpit</Link></li>
            {isAdminLike && (
                <li><Link to="/admin">Admin Panel</Link></li>
            )}

            {/* ПРАВАЯ ЧАСТЬ (аватар + logout), уезжает вправо */}
            <li className={styles.rightBlock}>
                <div className={styles.userInfo}>
                    <img
                        src={user.avatar || DEFAULT_AVATAR}
                        alt="User avatar"
                        className={styles.avatar}
                    />
                    <span className={styles.userBadge}>
                        {user.username} ({user.role})
                    </span>
                </div>

                <button
                    onClick={handleLogout}
                    className={styles.logoutBtn}
                    disabled={loading}
                >
                    {loading ? "Logging out…" : "Logout"}
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
