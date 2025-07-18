import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./SignUp.module.css";
import { api } from "../api/axios";

const SignIn: React.FC = () => {
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/auth/registration', { email, username, password });
            navigate('/cockpits');
        } catch (err: any) {
            setError(err.message || "Error authorization");
        }
    }


    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <h2>Registration</h2>
                <form onSubmit={handleSubmit}>
                <div>
                        <label>Email:</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Username:</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label>Пароль:</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">Войти</button>
                </form>
                <div>
                    <Link to="/signup">Don't have an account? Sign up!</Link>
                </div>
            </div>
        </div>
    );
};

export default SignIn;
