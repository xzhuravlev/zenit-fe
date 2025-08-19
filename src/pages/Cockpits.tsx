// src/pages/Cockpits.tsx
import React, { useEffect, useState } from "react";
import styles from "./Cockpits.module.css"; // Импорт CSS-модуля
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/axios";

interface Checklist {
    id: number;
    name: string;
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
    checklists?: Checklist[] | null;
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

    // лайк/анлайк локально: состояние и индикатор загрузки
    const [likedByMe, setLikedByMe] = useState<Record<number, boolean>>({});
    const [favLoading, setFavLoading] = useState<Record<number, boolean>>({});

    type ToggleFavoriteResponse = {
        cockpitId: number;
        liked: boolean;
        favoritesCount: number;
    };

    const toggleFavorite = async (cockpitId: number) => {
        if (!currentUser) {
            // если хочешь — редирект на логин
            // navigate('/login');
            return;
        }
        setFavLoading(prev => ({ ...prev, [cockpitId]: true }));

        try {
            const { data } = await api.patch<ToggleFavoriteResponse>(`/cockpits/${cockpitId}/favorite`);

            // обновляем счётчик в нужной плитке
            setCockpits(prev =>
                prev.map(c =>
                    c.id === cockpitId
                        ? { ...c, _count: { ...c._count, favoritedBy: data.favoritesCount } }
                        : c
                )
            );
            // и локальное состояние лайка
            setLikedByMe(prev => ({ ...prev, [cockpitId]: data.liked }));
        } catch (e: any) {
            console.error("toggle favorite failed:", e?.response?.data || e.message);
        } finally {
            setFavLoading(prev => ({ ...prev, [cockpitId]: false }));
        }
    };


    const [openChecklistMenu, setOpenChecklistMenu] = useState<Record<number, boolean>>({});

    const toggleChecklistMenu = (cockpitId: number) => {
        setOpenChecklistMenu(prev => ({ ...prev, [cockpitId]: !prev[cockpitId] }));
    };

    const closeChecklistMenu = (cockpitId: number) => {
        setOpenChecklistMenu(prev => ({ ...prev, [cockpitId]: false }));
    };

    // --- ДОБАВЬ ЭТО ВВЕРХ КОМПОНЕНТА (после других useState) ---
    const [selectedChecklists, setSelectedChecklists] = useState<Record<number, number | "">>({});

    /** Берём последнюю попытку как актуальную */
    const getLatestProgress = (cl?: Checklist | null) => {
        if (!cl?.progresses || cl.progresses.length === 0) return null;
        return cl.progresses[cl.progresses.length - 1];
    };

    const handleChecklistSelect = (cockpitId: number, checklistId: number | "") => {
        setSelectedChecklists(prev => ({ ...prev, [cockpitId]: checklistId }));
    };

    const startSelectedChecklist = (cockpitId: number, checklistId: number | "") => {
        if (!checklistId) return;
        // Маршрут подставь под свой реальный: вариант 1
        navigate(`/cockpits/${cockpitId}/checklist/${checklistId}`);
        // если у тебя страница одна и принимает query:
        // navigate(`/cockpits/${cockpitId}/checklist?checklistId=${checklistId}`);
    };


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
            const list = response.data as (Cockpit & { favoritedBy?: Array<{ id: number }> })[];
            setLikedByMe(Object.fromEntries(list.map(c => [c.id, (c as any).favoritedBy?.length > 0])));
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
                                                <button
                                                    className={`${styles.favoriteButton} ${likedByMe[cockpit.id] ? styles.favoriteActive : ""}`}
                                                    onClick={() => toggleFavorite(cockpit.id)}
                                                    disabled={!!favLoading[cockpit.id]}
                                                    aria-pressed={!!likedByMe[cockpit.id]}
                                                    title={likedByMe[cockpit.id] ? "Remove from favorites" : "Add to favorites"}
                                                >
                                                    <span className={styles.starIcon}>★</span>
                                                    {cockpit?._count?.favoritedBy ?? 0}
                                                </button>


                                            </span>
                                        </h2>
                                        <p><strong>Manufacturer:</strong> {cockpit.manufacturer || "N/A"}</p>
                                        <p><strong>Model:</strong> {cockpit.model || "N/A"}</p>
                                        <p><strong>Type:</strong> {cockpit.type || "N/A"}</p>
                                        <p>
                                            <strong>Created At:</strong>{" "}
                                            {new Date(cockpit.createdAt).toLocaleString()}
                                        </p>
                                        <div className={styles.cockpitButtons} >
                                            {/* <button className={styles.wikiButton} onClick={() => navigate(`/cockpits/${cockpit.id}/wiki`)}>
                                                View Wiki
                                            </button> */}

                                            <button className={`${styles.actionButton} ${styles.wikiButton}`} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }} onClick={() => navigate(`/cockpits/${cockpit.id}/wiki`)}>
                                                View Wiki
                                            </button>


                                            {cockpit.checklists && cockpit.checklists.length > 0 && (
                                                <div className={styles.checklistsUiWrap}>
                                                    {/* 1) Когда чеклист ещё не выбран — показываем одну синюю кнопку */}
                                                    {(!selectedChecklists[cockpit.id] || selectedChecklists[cockpit.id] === "") && (
                                                        <div className={styles.dropdownWrap}>
                                                            <button
                                                                className={`${styles.actionButton} ${styles.checklistsButton}`}
                                                                onClick={() => toggleChecklistMenu(cockpit.id)}
                                                            >
                                                                Checklists
                                                            </button>

                                                            {openChecklistMenu[cockpit.id] && (
                                                                <div className={styles.dropdownMenu}>
                                                                    {cockpit.checklists.map((cl) => {
                                                                        const latest = getLatestProgress(cl);
                                                                        return (
                                                                            <button
                                                                                key={cl.id}
                                                                                className={styles.dropdownItem}
                                                                                onClick={() => {
                                                                                    handleChecklistSelect(cockpit.id, cl.id);
                                                                                    closeChecklistMenu(cockpit.id);
                                                                                }}
                                                                                title={cl.name}
                                                                            >
                                                                                <span className={styles.dropdownItemTitle}>{cl.name}</span>
                                                                                <span className={styles.dropdownItemMeta}>
                                                                                    {latest ? `${latest.percent ?? 0}% (attempt ${latest.attempt ?? 1})` : "no attempts"}
                                                                                </span>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* 2) Когда чеклист выбран — показываем сплит-кнопку */}
                                                    {(selectedChecklists[cockpit.id] && selectedChecklists[cockpit.id] !== "") && (() => {
                                                        const selectedId = selectedChecklists[cockpit.id] as number;
                                                        const selected = cockpit.checklists?.find(cl => cl.id === selectedId);
                                                        const latest = getLatestProgress(selected);

                                                        if (!selected) return null;

                                                        return (
                                                            <div className={styles.splitChecklist}>
                                                                <button
                                                                    className={`${styles.actionButton} ${styles.splitLeft}`}
                                                                    onClick={() => toggleChecklistMenu(cockpit.id)}
                                                                    title="Change checklist"
                                                                >
                                                                    <span className={styles.splitLeftTitle}>{selected.name}</span>
                                                                    <span className={styles.splitLeftSubtitle}>
                                                                        {latest ? `${latest.percent ?? 0}% last test` : "no previous test"}
                                                                    </span>
                                                                </button>

                                                                <button
                                                                    className={`${styles.actionButton} ${styles.splitRight}`}
                                                                    onClick={() => startSelectedChecklist(cockpit.id, selected.id)}
                                                                    title="Start checklist"
                                                                >
                                                                    <span className={styles.playIcon}>▶</span>
                                                                </button>

                                                                {/* Выпадающее меню для смены выбранного чеклиста */}
                                                                {openChecklistMenu[cockpit.id] && (
                                                                    <div className={`${styles.dropdownMenu} ${styles.dropdownMenuAttached}`}>
                                                                        {cockpit.checklists.map((cl) => {
                                                                            const latestCl = getLatestProgress(cl);
                                                                            const active = cl.id === selectedId;
                                                                            return (
                                                                                <button
                                                                                    key={cl.id}
                                                                                    className={`${styles.dropdownItem} ${active ? styles.dropdownItemActive : ""}`}
                                                                                    onClick={() => {
                                                                                        handleChecklistSelect(cockpit.id, cl.id);
                                                                                        closeChecklistMenu(cockpit.id);
                                                                                    }}
                                                                                    title={cl.name}
                                                                                >
                                                                                    <span className={styles.dropdownItemTitle}>{cl.name}</span>
                                                                                    <span className={styles.dropdownItemMeta}>
                                                                                        {latestCl ? `${latestCl.percent ?? 0}% (attempt ${latestCl.attempt ?? 1})` : "no attempts"}
                                                                                    </span>
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}


                                            {/* {currentUser && cockpit.creatorId === currentUser.id && (
                                                <button className={styles.editButton} onClick={() => navigate(`/cockpits/${cockpit.id}/edit`)}>
                                                    <i className="fa-solid fa-edit"></i> Edit
                                                </button>
                                            )} */}
                                            {currentUser && cockpit.creatorId === currentUser.id && (
                                                <button className={`${styles.actionButton} ${styles.editButton}`} onClick={() => navigate(`/cockpits/${cockpit.id}/edit`)}>
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
        </div >
    );

};

export default Cockpits;
