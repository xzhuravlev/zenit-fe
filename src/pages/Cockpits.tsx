// src/pages/Cockpits.tsx
import React, { useEffect, useState } from "react";
import styles from "./Cockpits.module.css"; // Импорт CSS-модуля
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/axios";

interface Checklist {
    id: number;
    progresses?: {
        percent: number;
        attempt: number;
    }[];
}

interface Creator {
    verified: boolean;
}

interface Media {
    id: number;
    link: string;
    type: string;
    width: number | null;
    height: number | null;
    cockpitId: number;
}

interface Cockpit {
    id: number;
    createdAt: string;
    updatedAt: string;
    name: string;
    manufacturer: string | null;
    model: string | null;
    type: string | null;
    creatorId: number;
    checklist?: Checklist | null;
    creator?: Creator | null;
    media: Media[];
    _count: {
        favoritedBy: number; // Количество пользователей, добавивших в избранное
    };
}

interface User {
    username: string;
    id: number;
}

interface Filters {
    name: string;
    manufacturer: string;
    model: string;
    type: string;
    hasChecklist: boolean; // "true" или "false" или пустая строка
    orderBy: string;
}

const Cockpits: React.FC = () => {
    const [cockpits, setCockpits] = useState<Cockpit[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [filters, setFilters] = useState<Filters>({
        name: "",
        manufacturer: "",
        model: "",
        type: "",
        hasChecklist: false,
        orderBy: "",
    });
    const navigate = useNavigate();

    // Функция для получения данных текущего пользователя
    const fetchCurrentUser = async () => {
        try {
            const response = await api.get("/auth/me");
            setCurrentUser(response.data);
        } catch (err: any) {
            console.error("Ошибка при получении данных пользователя:", err.response?.data?.message || err.message);
        }
    };

    // Функция для получения кокпитов с учётом фильтров
    const fetchCockpits = async (queryParams = "") => {
        try {
            const response = await api.get(`/cockpits${queryParams}`);
            setCockpits(response.data);
        } catch (err: any) {
            setError(err?.response?.data?.message || err.message || "Ошибка при получении кокпитов");
        }
    };

    useEffect(() => {
        fetchCurrentUser();
        fetchCockpits();
    }, []);

    // Функция, которая формирует строку запроса по фильтрам и выполняет fetch
    // Затем в applyFilters:
    const applyFilters = () => {
        const params: Record<string, string> = {};
        if (filters.name.trim()) params.name = filters.name.trim();
        if (filters.manufacturer.trim()) params.manufacturer = filters.manufacturer.trim();
        if (filters.model.trim()) params.model = filters.model.trim();
        if (filters.type.trim()) params.type = filters.type.trim();
        if (filters.hasChecklist) {
            params.hasChecklist = "true";
        }
        if (filters.orderBy.trim()) params.orderBy = filters.orderBy.trim();

        // Формируем строку запроса для fetch
        const queryString = new URLSearchParams(params).toString();
        fetchCockpits(queryString ? `?${queryString}` : "");
    };

    const getPreviewImage = (cockpit: Cockpit) => {
        const panorama = cockpit.media.find(m => m.type === "PANORAMA");
        if (!panorama) return undefined;

        // Изменяем ссылку, добавляя `_preview` перед расширением
        const url = panorama.link;
        const lastDotIndex = url.lastIndexOf(".");

        if (lastDotIndex === -1) return undefined; // Если нет расширения, не изменяем

        const previewUrl = `${url.slice(0, lastDotIndex)}_preview${url.slice(lastDotIndex)}`;
        return previewUrl;
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <h1>Cockpits</h1>
                <hr className={styles.headerLineDivider} />
                <h3>Welcome to cockpits library! Choose any existed cockpit or create yours!</h3>
                {error && <p className={styles.error}>{error}</p>}
                <div className={styles.splitContainer}>
                    <div className={styles.leftPane}>
                        {/* Панель фильтров */}
                        <div className={styles.filterPanel}>
                            <h2>Filters</h2>
                            <div className={styles.filterGroup}>
                                <label>Name:</label>
                                <input
                                    type="text"
                                    value={filters.name}
                                    onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                                />
                            </div>
                            <div className={styles.filterGroup}>
                                <label>Manufacturer:</label>
                                <input
                                    type="text"
                                    value={filters.manufacturer}
                                    onChange={(e) => setFilters({ ...filters, manufacturer: e.target.value })}
                                />
                            </div>
                            <div className={styles.filterGroup}>
                                <label>Model:</label>
                                <input
                                    type="text"
                                    value={filters.model}
                                    onChange={(e) => setFilters({ ...filters, model: e.target.value })}
                                />
                            </div>
                            <div className={styles.filterGroup}>
                                <label>Type:</label>
                                <input
                                    type="text"
                                    value={filters.type}
                                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                                />
                            </div>
                            <div className={styles.filterGroup}>
                                <label>Has Checklist:</label>
                                <input
                                    type="checkbox"
                                    checked={filters.hasChecklist}
                                    onChange={(e) => setFilters({ ...filters, hasChecklist: e.target.checked })}
                                />
                            </div>
                            <div className={styles.filterGroup}>
                                <label>Order By:</label>
                                <select
                                    value={filters.orderBy}
                                    onChange={(e) => setFilters({ ...filters, orderBy: e.target.value })}
                                >
                                    <option value="">Default</option>
                                    <option value="new">Newest</option>
                                    <option value="old">Oldest</option>
                                </select>
                            </div>
                            <button className={styles.applyFilterButton} onClick={applyFilters}>
                                Filter!
                            </button>
                        </div>
                    </div>
                    <div className={styles.rightPane}>
                        {/* Сетка кокпитов */}
                        <div className={styles.cockpitsGrid}>
                            {cockpits.map(cockpit => (
                                <div
                                    key={cockpit.id}
                                    className={styles.cockpitTile}
                                    style={{
                                        backgroundImage: `linear-gradient(to right, white 0%, white 50%, transparent 100%), url(${getPreviewImage(cockpit)})`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'top right',
                                        backgroundSize: 'auto 100%' // Изображение во всю высоту контейнера
                                    }}
                                >
                                    <div className={styles.cockpitTileContent}>
                                        <h2 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span>
                                                {cockpit.name}
                                            </span>
                                            <span>
                                                {cockpit.creator?.verified && (
                                                    <span style={{
                                                        color: 'white',
                                                        background: 'deepskyblue',
                                                        padding: '2px 6px',
                                                        borderRadius: '50%',
                                                        boxShadow: "0 0 20px rgba(255, 255, 255, 1)",
                                                        marginRight: "10px",
                                                    }}>
                                                        ✓
                                                    </span>
                                                )}
                                                <span style={{
                                                    color: 'white',
                                                    background: 'orange',
                                                    padding: '2px 10px',
                                                    borderRadius: '8px',
                                                    boxShadow: "0 0 20px rgba(255, 255, 255, 1)",
                                                }}>
                                                    ★ {cockpit?._count?.favoritedBy}
                                                </span>
                                            </span>
                                        </h2>
                                        <p><strong>Manufacturer:</strong> {cockpit.manufacturer || "N/A"}</p>
                                        <p><strong>Model:</strong> {cockpit.model || "N/A"}</p>
                                        <p><strong>Type:</strong> {cockpit.type || "N/A"}</p>
                                        <p>
                                            <strong>Created At:</strong>{" "}
                                            {new Date(cockpit.createdAt).toLocaleString()}
                                        </p>
                                        <div className={styles.cockpitButtons}>
                                            <button className={styles.wikiButton} onClick={() => navigate(`/cockpits/${cockpit.id}/wiki`)}>
                                                View Wiki
                                            </button>
                                            {cockpit.checklist && (
                                                <button className={styles.checklistButton} onClick={() => navigate(`/cockpits/${cockpit.id}/checklist`)}>
                                                    Checklist
                                                </button>
                                            )}
                                            {cockpit.checklist && cockpit.checklist.progresses && cockpit.checklist.progresses.length > 0 ? (
                                                <div className={styles.checklistProgress}>
                                                    {cockpit.checklist.progresses[0]?.percent ?? "N/A"}% - Attempt {cockpit.checklist.progresses[0]?.attempt ?? "N/A"}
                                                </div>
                                            ) : ""}
                                            {currentUser && cockpit.creatorId === currentUser.id && (
                                                <button className={styles.editButton} onClick={() => navigate(`/cockpits/${cockpit.id}/edit`)}>
                                                    <i className="fa-solid fa-edit"></i> Edit
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

};

export default Cockpits;
