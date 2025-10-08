import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AdminDashboard.module.css";

const AdminDashboard: React.FC = () => {
    const [userRole, setUserRole] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserRole = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) return navigate("/signin");

            try {
                const response = await fetch("http://localhost:3333/auth/me", {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();
                setUserRole(data.role);
                if (data.role !== "ADMIN") {
                    navigate("/"); // Перенаправляем, если не админ
                }
            } catch (error) {
                console.error("Ошибка получения роли:", error);
                navigate("/");
            }
        };

        fetchUserRole();
    }, []);

    if (userRole !== "ADMIN") return <h2>Loading...</h2>;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <div className={styles.adminContainer}>
                    <h1>Admin panel</h1>
                    <div className={styles.adminOptions}>
                        <button onClick={() => navigate("/admin/users")}>Users manage</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
