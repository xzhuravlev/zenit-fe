import React, { useEffect, useState, useCallback } from "react";
import styles from "./AdminUsers.module.css";


interface User {
    id: number;
    username: string;
    email: string;
    role: string;
    verified: boolean; // важно: без "is"
}

const API = "http://localhost:3333";

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);

    const getToken = () => localStorage.getItem("access_token") ?? "";

    // универсальная загрузка пользователей
    const fetchUsers = useCallback(async () => {
        try {
            setError(null);
            const token = getToken();
            if (!token) throw new Error("Нет access_token в localStorage");

            const res = await fetch(`${API}/users/all`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Ошибка загрузки пользователей (${res.status}): ${text || res.statusText}`);
            }

            const data: User[] = await res.json();
            setUsers(data);
        } catch (e: any) {
            setError(e.message ?? "Неизвестная ошибка");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // переключение verify (теперь не только true)
    const toggleVerify = async (userId: number, current: boolean) => {
        try {
            setBusyId(userId);
            setError(null);

            const token = getToken();
            if (!token) throw new Error("Нет access_token в localStorage");

            // PATCH не принимает тело — можно просто отправить, сервер сам обработает
            const res = await fetch(`${API}/users/verify/${userId}`, {
                method: "PATCH",
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Не удалось изменить verify (${res.status}): ${text || res.statusText}`);
            }

            // локально переключаем без перезагрузки
            setUsers(prev =>
                prev.map(u => (u.id === userId ? { ...u, verified: !current } : u))
            );
        } catch (e: any) {
            setError(e.message ?? "Неизвестная ошибка");
        } finally {
            setBusyId(null);
        }
    };

    if (loading) return <div>Загрузка…</div>;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <div>
                    <h1>User list</h1>

                    {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

                    <ul>
                        {users.map((user) => (
                            <li key={user.id} style={{ marginBottom: 8 }}>
                                <strong>{user.username}</strong> ({user.email}) — {user.role} —{" "}
                                {user.verified ? "✅ verified" : "❌ not verified"}
                                <button
                                    onClick={() => toggleVerify(user.id, user.verified)}
                                    disabled={busyId === user.id}
                                    style={{ marginLeft: 8 }}
                                >
                                    {busyId === user.id
                                        ? "Обновление…"
                                        : user.verified
                                            ? "Verify"
                                            : "Unverify"}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminUsers;
