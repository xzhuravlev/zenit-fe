import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./SignIn.module.css";
import { api } from "../api/axios";
import { GoogleLogin } from "@react-oauth/google";

const SignIn: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/auth/login', { email, password });
            window.dispatchEvent(new Event('auth:changed'));
            navigate('/cockpits');
        } catch (err: any) {
            setError(err.response?.data?.message || "Authorization error");
        }
    };

    const handleGoogleSuccess = async (cred: any) => {
        try {
            await api.post('/auth/google', { idToken: cred.credential });
            window.dispatchEvent(new Event('auth:changed'));
            navigate('/cockpits');
        } catch (err: any) {
            setError(err.response?.data?.message || "Google authorization error");
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <h2 className={styles.title}>Sign In 🔐</h2>
                <form onSubmit={handleSubmit} className={styles.form}>
                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Email</label>
                        <input
                            className={styles.input}
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Enter your email"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Password</label>
                        <input
                            className={styles.input}
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                        />
                    </div>

                    <button type="submit" className={styles.button}>
                        Sign In
                    </button>
                </form>

                <div className={styles.signUpLink}>
                    <span>Don’t have an account? </span>
                    <Link to="/signup">Sign up!</Link>
                </div>
                <div className={styles.googleButton}>
                    <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setError("Google login error")}/>
                </div>
            </div>
        </div>
    );
};

export default SignIn;
