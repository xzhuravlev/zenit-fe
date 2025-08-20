import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./SignUp.module.css";
import { api } from "../api/axios";

const SignUp: React.FC = () => {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post("/auth/registration", { email, username, password });
            window.dispatchEvent(new Event("auth:changed"));
            navigate("/cockpits");
        } catch (err: any) {
            setError(err.response?.data?.message || "Registration error");
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <h2 className={styles.title}>Sign Up 👋</h2>
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
                        <label className={styles.label}>Username</label>
                        <input
                            className={styles.input}
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Choose a username"
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
                            placeholder="Enter a password"
                        />
                    </div>

                    <button type="submit" className={styles.button}>
                        Sign Up
                    </button>
                </form>

                <div className={styles.signUpLink}>
                    <span>Already have an account? </span>
                    <Link to="/signin">Sign in!</Link>
                </div>
            </div>
        </div>
    );
};

export default SignUp;
