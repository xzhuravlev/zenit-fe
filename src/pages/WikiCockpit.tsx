import React, { useEffect, useState, useRef } from "react";
import styles from "./WikiCockpit.module.css";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/axios";


interface Media {
    id: number;
    link: string;
    type: string;
    width: number | null;
    height: number | null;
    cockpitId: number | null;
    instrumentId: number | null;
}

interface Instrument {
    id: number;
    name: string;
    x: number;
    y: number;
    cockpitId: number;
    media: Media[];
}

interface Cockpit {
    id: number;
    createdAt: string;
    updatedAt: string;
    name: string;
    manufacturer: string;
    model: string;
    type: string;
    instruments: Instrument[];
    media: Media[];
    _count?: { favoritedBy: number };
}

const WikiCockpit: React.FC = () => {
    const { id } = useParams();
    const [panoramaPreviewUrl, setPanoramaPreviewUrl] = useState<string | null>(null);
    const [panoramaPreviewWidth, setPanoramaPreviewWidth] = useState<number>(0);
    const [panoramaPreviewHeight, setPanoramaPreviewHeight] = useState<number>(0);
    const [cockpit, setCockpit] = useState<Cockpit | null>(null);
    const [cockpitDescription, setCockpitDescription] = useState<string | null>(null);
    const [instrumentDescriptions, setInstrumentDescriptions] = useState<{ [key: number]: string }>({});
    const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
    const viewerRef = useRef<any>(null);

    const [loadingFlag, setLoadingFlag] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    // const navigate = useNavigate();

    useEffect(() => {
        const fetchCockpit = async () => {
            const token = localStorage.getItem("access_token");
            if (!token) {
                setError("Unauthorized: Please sign in.");
                setLoadingFlag(false);
                return;
            }

            try {
                const { data } = await api.get(`/cockpits/${id}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                setCockpit(data);
                const panoramaMedia = data.media.find((m: Media) => m.type === "PANORAMA");
                if (panoramaMedia) {
                    setPanoramaPreviewUrl(panoramaMedia.link);
                    setPanoramaPreviewWidth(panoramaMedia.width);
                    setPanoramaPreviewHeight(panoramaMedia.height);
                }

                // Найти media с type "TEXT" для описания кокпита
                const textMedia = data.media.find((m: Media) => m.type === "TEXT");
                if (textMedia) {
                    fetchTextFile(textMedia.link, setCockpitDescription);
                }

                // Найти media с type "TEXT" для инструментов
                data.instruments.forEach((instrument: Instrument) => {
                    const instrumentTextMedia = instrument.media.find((m: Media) => m.type === "TEXT");
                    if (instrumentTextMedia) {
                        fetchTextFile(instrumentTextMedia.link, (text) =>
                            setInstrumentDescriptions((prev) => ({ ...prev, [instrument.id]: text }))
                        );
                    }
                });


            } catch (err: any) {
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoadingFlag(false);
            }
        }

        fetchCockpit();
    }, [id]);

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

    // useEffect(() => {
    //     (async () => {
    //         try {
    //             await api.get(`/cockpits/${id}`); // или твой URL wiki
    //         } catch (e: any) {
    //             const status = e?.response?.status;
    //             const message = e?.response?.data?.message;
    //             if (status === 403 && /Purchase required/i.test(message || '')) {
    //                 navigate(`/cockpits/${id}/pay`);
    //                 return;
    //             }
    //             setError(message || 'Error loading cockpit');
    //         }
    //     })();
    // }, [id, navigate]);

    // Добавление инструментов в панораму
    // Добавление инструментов в панораму после полной загрузки
    useEffect(() => {
        if (viewerRef.current && cockpit?.instruments) {
            viewerRef.current.on("load", () => {
                cockpit.instruments.forEach((instrument) => {
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
    }, [cockpit?.instruments]);

    // Функция для загрузки текстового файла
    const fetchTextFile = async (url: string, setState: (text: string) => void) => {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch text: ${url}`);
            const text = await response.text();
            setState(text);
        } catch (error) {
            console.error("Error fetching text file:", error);
            setState("Failed to load description.");
        }
    };

    if (loadingFlag) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.contentBody}>
                    <div className={styles.splitContainer}>
                        <div className={styles.leftPane}>
                        </div>
                        <div className={styles.rightPane}>
                            <h1>Loading...</h1>

                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.contentBody}>
                    <h1 className={styles.error}>{error}</h1>
                </div>
            </div>
        );
    }

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
                        <h1>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <span style={{ color: 'white', background: 'green', padding: '2px 10px', borderRadius: '8px' }}>
                                        Wiki
                                    </span> {cockpit?.name}
                                </div>
                                <span style={{ color: 'white', background: 'orange', padding: '2px 10px', borderRadius: '8px' }}>
                                    ★ {cockpit?._count?.favoritedBy}
                                </span>
                            </div>
                        </h1>
                        <hr style={{ border: "1px solid #ccc", margin: "10px 0" }} />
                        {selectedInstrument ? (
                            <>
                                <h2>
                                    <span style={{ color: 'white', background: 'orange', padding: '2px 10px', borderRadius: '8px' }}>
                                        Instrument
                                    </span>
                                </h2>
                                <h2>
                                    <span style={{
                                        color: 'white',
                                        background: 'gray',
                                        padding: '4px 10px',
                                        borderRadius: '8px'
                                    }}>
                                        {selectedInstrument.name}
                                    </span>
                                </h2>
                                <p className={styles.description}>{instrumentDescriptions[selectedInstrument.id] || "No description available."}</p>
                            </>
                        ) : (
                            <>
                                <h2>
                                    <span style={{ color: 'white', background: 'green', padding: '2px 10px', borderRadius: '8px' }}>
                                        Aircraft and Cockpit
                                    </span>
                                </h2>
                                <h2>

                                    <span style={{
                                        color: 'white',
                                        background: 'gray',
                                        padding: '4px 10px',
                                        borderRadius: '8px'
                                    }}>
                                        {cockpit?.manufacturer} - {cockpit?.model} ({cockpit?.type})
                                    </span>
                                </h2>
                                <p className={styles.description}>{cockpitDescription}</p>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WikiCockpit;
