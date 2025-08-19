import React, { useEffect, useRef, useState } from "react";
import styles from "./Checklist.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/axios";


interface ChecklistItem {
    id: number;
    description: string;
    order: number;
    checklistId: number;
    instrumentId: number;
}

interface Media {
    id: number;
    link: string;
    type: string;
    width: number;
    height: number;
    cockpitId: number,
    instrumentId: number,
}

interface Instrument {
    id: number;
    name: string;
    x: number;
    y: number;
    cockpitId: number;
    panoramaInstrumentId: number | null;
}

interface Cockpit {
    id: number;
    name: string;
    media: Media[];
    instruments: Instrument[];
}

interface CockpitChecklist {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
    cockpitId: number;
    items: ChecklistItem[];
    cockpit: Cockpit;
}

const Checklist: React.FC = () => {
    const { cockpitId, checklistId } = useParams<{ cockpitId: string; checklistId: string }>();
    const [checklist, setChecklist] = useState<CockpitChecklist | null>(null);
    const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
    const [panoramaPreviewUrl, setPanoramaPreviewUrl] = useState<string | null>(null);
    const [panoramaPreviewWidth, setPanoramaPreviewWidth] = useState<number>(0);
    const [panoramaPreviewHeight, setPanoramaPreviewHeight] = useState<number>(0);
    const viewerRef = useRef<any>(null);
    const navigate = useNavigate();

    const dragItem = React.useRef<any>(null);
    const dragOverItem = React.useRef<any>(null);

    const [solutionResult, setSolutionResult] = useState<{
        id: number;
        percent: number;
        attempt: number;
        userId: number;
        checklistId: number;
    } | null>(null);

    const [loadingFlag, setLoadingFlag] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);


    const handleSort = () => {
        if (dragItem.current == null || dragOverItem.current == null) return;

        setChecklist(prev => {
            if (!prev) return prev;

            const items = [...prev.items];
            const from = dragItem.current as number;
            const to = dragOverItem.current as number;

            if (from === to) return prev; // ничего не делаем
            if (from < 0 || from >= items.length || to < 0 || to >= items.length) return prev;

            const [moved] = items.splice(from, 1);
            items.splice(to, 0, moved);

            // опционально обновим order чтобы соответствовал новому визуальному порядку
            const reOrdered = items.map((it, idx) => ({ ...it, order: idx }));

            dragItem.current = null;
            dragOverItem.current = null;

            return { ...prev, items: reOrdered };
        });
    };

    // const handleSort = () => {
    //     if (dragItem.current == null || dragOverItem.current == null) return;

    //     setChecklist(prev => {
    //         if (!prev) return prev;

    //         const items = [...prev.items];
    //         const from = dragItem.current as number;
    //         const to = dragOverItem.current as number;

    //         if (from < 0 || from >= items.length || to < 0 || to >= items.length) {
    //             return prev;
    //         }

    //         const [moved] = items.splice(from, 1);
    //         items.splice(to, 0, moved);

    //         dragItem.current = null;
    //         dragOverItem.current = null;

    //         // по желанию обновляем order, чтобы сохранялся новый порядок
    //         const reOrdered = items.map((it, idx) => ({ ...it, order: idx }));

    //         return { ...prev, items: reOrdered };
    //     });
    // };

    const handleSelectChecklistItem = (ci: ChecklistItem) => {
        if (!selectedInstrument) return;

        setChecklist(prev => {
            if (!prev) return prev;

            const instruments = prev.cockpit.instruments.map(inst =>
                inst.id === ci.instrumentId
                    ? { ...inst, panoramaInstrumentId: selectedInstrument.id }
                    : inst
            );

            return { ...prev, cockpit: { ...prev.cockpit, instruments } };
        });

        setSelectedInstrument(null);
    };

    const handleSendSolution = async () => {
        const accessToken = localStorage.getItem("access_token");
        if (!accessToken || !checklist) {
            console.error("Нет access_token или чеклист не загружен");
            return;
        }

        const selectedInstrumentIds = checklist.items
            .map(item => {
                const inst = checklist.cockpit.instruments.find(i => i.id === item.instrumentId);
                return inst?.panoramaInstrumentId ?? null;
            })
            .filter((id): id is number => id !== null);

        console.log("Отправляемые instrumentIds:", selectedInstrumentIds);

        try {
            const response = await api.post(`/checklists/${checklistId}/complete`, {
                selectedInstrumentIds,
            });
            console.log("Решение отправлено успешно:", response.data);
            setSolutionResult(response.data);
        } catch (error) {
            console.error("Ошибка при отправке решения:", error);
        }
    };




    const handleSelectInstrument = (tableInsturment: Instrument) => {
        if (!selectedInstrument) return;
        tableInsturment.panoramaInstrumentId = selectedInstrument.id;
        console.log(tableInsturment.name, " linked with ", selectedInstrument.name)
        setSelectedInstrument(null);
    }


    useEffect(() => {
        const fetchCockpit = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) {
                setError("Unauthorized: Please sign in.");
                setLoadingFlag(false);
                return;
            }

            try {
                const { data } = await api.get(`/checklists/${checklistId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                setChecklist(data);
                const panoramaMedia = data.cockpit.media.find((m: Media) => m.type === "PANORAMA");
                if (panoramaMedia) {
                    setPanoramaPreviewUrl(panoramaMedia.link);
                    setPanoramaPreviewWidth(panoramaMedia.width);
                    setPanoramaPreviewHeight(panoramaMedia.height);
                }
            } catch (err: any) {
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoadingFlag(false);
            }
        }

        fetchCockpit();
    }, [checklistId]);

    useEffect(() => {
        if (panoramaPreviewUrl && (window as any).pannellum) {
            viewerRef.current = (window as any).pannellum.viewer("panorama", {
                type: "equirectangular",
                panorama: panoramaPreviewUrl,
                autoLoad: true,
                autoRotate: 2,
            });

            // Добавляем обработчик клика на всю панораму
            viewerRef.current.on("mousedown", () => {
                setSelectedInstrument(null); // Сбрасываем выбранный инструмент
            });
        }
    }, [panoramaPreviewUrl]);

    // Добавление инструментов в панораму
    // Добавление инструментов в панораму после полной загрузки
    useEffect(() => {
        if (viewerRef.current && checklist?.cockpit?.instruments) {
            viewerRef.current.on("load", () => {
                checklist.cockpit.instruments.forEach((instrument) => {
                    const yaw = Math.round(((instrument.x / panoramaPreviewWidth) * 360) - 180);
                    const pitch = Math.round(90 - ((instrument.y / panoramaPreviewHeight) * 180));

                    if (viewerRef.current) {
                        viewerRef.current.addHotSpot({
                            pitch: pitch,
                            yaw: yaw,
                            cssClass: "my-hotspot",
                            createTooltipFunc: (hotSpotDiv: HTMLElement) => {
                                hotSpotDiv.innerHTML = '';
                                hotSpotDiv.style.cursor = "pointer";
                                hotSpotDiv.onclick = (event) => {
                                    event.stopPropagation(); // Предотвращаем клик по панораме
                                    setSelectedInstrument(instrument);
                                };
                            },
                            createTooltipArgs: {},
                        });
                    }
                });
            });
        }
    }, [checklist?.cockpit?.instruments]);

    // const handleSendSolution = async () => {

    //     // Получаем access_token из localStorage
    //     const accessToken = localStorage.getItem("access_token");
    //     if (!accessToken) {
    //         console.error("Нет access_token");
    //         return;
    //     }

    //     // Собираем массив selectedInstrumentIds по порядку из checklistInstruments
    //     const selectedInstrumentIds = checklist?.cockpit.instruments
    //         .map((instrument) => instrument.panoramaInstrumentId)
    //         .filter((id): id is number => id !== undefined);

    //     console.log("Отправляемые instrumentIds:", selectedInstrumentIds);

    //     try {
    //         // checklists/18/complete
    //         const response = await api.post(`/checklists/${checklistId}/complete`, {
    //             selectedInstrumentIds,
    //         });

    //         console.log("Решение отправлено успешно:", response.data);
    //         // Сохраняем результат в состоянии
    //         setSolutionResult(response.data);
    //     } catch (error) {
    //         console.error("Ошибка при отправке решения:", error);
    //     }


    //     // try {
    //     //     const response = await fetch(`http://localhost:3333/cockpits/${id}/complete-checklist`, {
    //     //         method: "POST",
    //     //         headers: {
    //     //             "Content-Type": "application/json",
    //     //             Authorization: `Bearer ${accessToken}`,
    //     //         },
    //     //         body: JSON.stringify({
    //     //             selectedInstrumentIds,
    //     //         }),
    //     //     });

    //     //     if (!response.ok) {
    //     //         throw new Error(`Ошибка: ${response.statusText}`);
    //     //     }

    //     //     const data = await response.json();
    //     //     console.log("Решение отправлено успешно:", data);
    //     //     // Сохраняем результат в состоянии
    //     //     setSolutionResult(data);
    //     // } catch (error) {
    //     //     console.error("Ошибка при отправке решения:", error);
    //     // }
    // };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <div className={styles.splitContainer}>
                    <div className={styles.leftPane}>
                        {panoramaPreviewUrl ? (
                            <div id="panorama" className={styles.panoramaViewer}></div>
                        ) : (
                            <p>No panorama available</p>
                        )}
                    </div>
                    <div className={styles.rightPane}>
                        <div className={styles.rightPaneHeader}>
                            <h1>
                                <span className={styles.checklistTag}>Checklist</span> {checklist?.cockpit?.name}
                            </h1>
                            <h2>
                            <span className={styles.checklistTag}>Test:</span> {checklist?.name}
                            </h2>
                            <hr className={styles.headerLineDivider} />
                            <div className={styles.splitHorizontallyContainer}>
                                <div className={styles.smallHorizontalContainer} style={{ backgroundColor: "#ccc" }}>
                                    <h3><span style={{ background: "orange", padding: "10px 20px", borderRadius: "8px" }}>Hint</span> Link instruments from panorama with table</h3>
                                </div>
                                <div className={styles.smallHorizontalContainer}>

                                    <div className={styles.listSort}>
                                        {checklist?.items.map((item, index) => {
                                            const inst = checklist.cockpit.instruments.find(i => i.id === item.instrumentId);
                                            const isLinked = !!inst?.panoramaInstrumentId;
                                            const isOtherLinked =
                                                !!selectedInstrument && isLinked && inst!.panoramaInstrumentId !== selectedInstrument.id;

                                            const itemClass = isLinked
                                                ? (isOtherLinked ? styles.itemContentLinked : styles.itemContentSelected)
                                                : styles.itemContentUnselected;

                                            return (
                                                <div key={item.id} className={styles.listItem}>
                                                    {/* ВЕСЬ ЭЛЕМЕНТ ловит наведение (обновляет dragOverItem) */}
                                                    <div
                                                        className={itemClass}
                                                        onClick={() => handleSelectChecklistItem(item)}
                                                        onDragEnterCapture={() => { dragOverItem.current = index; }}
                                                        onDragOver={(e) => { e.preventDefault(); dragOverItem.current = index; }}
                                                    >
                                                        <h2 style={{ marginRight: "8px" }}>{index}</h2>

                                                        {/* Хэндл запускает перетаскивание и завершает сортировку */}
                                                        <div
                                                            className={styles.dragHandle}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                dragItem.current = index;
                                                                // помогает стабильности dnd
                                                                e.dataTransfer?.setData("text/plain", String(item.id));
                                                                e.dataTransfer!.effectAllowed = "move";
                                                            }}
                                                            onDragEnd={(e) => {
                                                                e.preventDefault();
                                                                handleSort();
                                                            }}
                                                        >
                                                            ≡
                                                        </div>

                                                        <h3 className={styles.itemName}>{item.description}</h3>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* <div className={styles.listSort}>
                                        {checklist?.items.map((item, index) => {
                                            const inst = checklist.cockpit.instruments.find(i => i.id === item.instrumentId);
                                            const isLinked = !!inst?.panoramaInstrumentId;
                                            const isOtherLinked =
                                                !!selectedInstrument && isLinked && inst!.panoramaInstrumentId !== selectedInstrument.id;

                                            const itemClass = isLinked
                                                ? (isOtherLinked ? styles.itemContentLinked : styles.itemContentSelected)
                                                : styles.itemContentUnselected;

                                            return (
                                                <div key={item.id} className={styles.listItem}>
                                                    <div
                                                        className={itemClass}
                                                        onClick={() => handleSelectChecklistItem(item)}
                                                    >
                                                        <h2 style={{ marginRight: "8px" }}>{index}</h2>

                                                        <div
                                                            className={styles.dragHandle}
                                                            draggable
                                                            onDragStart={() => (dragItem.current = index)}
                                                            onDragEnter={() => (dragOverItem.current = index)}
                                                            onDragEnd={handleSort}
                                                            onDragOver={(e) => e.preventDefault()}
                                                        >
                                                            ≡
                                                        </div>

                                                        <h3 className={styles.itemName}>{item.description}</h3>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div> */}

                                    <hr className={styles.headerLineDivider} />
                                    <button className={styles.sendSolutionButton} onClick={() => handleSendSolution()}>
                                        Send Solution
                                    </button>
                                    {error && <h1 className={styles.error}>{error}</h1>}
                                    {solutionResult && (
                                        <div className={styles.solutionModal}>
                                            <div className={styles.solutionContent}>
                                                <h2>Result</h2>
                                                <p>Percent: {solutionResult.percent}%</p>
                                                <p>Attempt: {solutionResult.attempt}</p>
                                                <button className={styles.closeResultButton} onClick={() => setSolutionResult(null)}>Close</button>
                                                <button className={styles.closeResultButton} onClick={() => navigate("/cockpits")}>Back to Cockpits</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Checklist;
