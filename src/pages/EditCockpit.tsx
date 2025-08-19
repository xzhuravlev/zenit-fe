import React, { useEffect, useRef, useState } from "react";
import styles from "./EditCockpit.module.css";
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
    description: string;
    cockpitId: number;
    media: Media[];
}

interface ChecklistItem {
    id: number;
    description: string;
    order: number;
    checklistId: number;
    instrumentId: number;
}

interface Checklist {
    id: number;
    name: string;
    createdAt: string;
    updatedAt: string;
    cockpitId: number;
    items: ChecklistItem[];
}

interface Cockpit {
    id: number;
    name: string;
    manufacturer: string;
    model: string;
    type: string;
    description: string;
    createdAt: string;
    updatedAt: string;
    creator: { username: string };
    instruments: Instrument[];
    checklists: Checklist[];
    media: Media[];
}

const EditCockpit: React.FC = () => {
    const { id } = useParams();
    const [cockpit, setCockpit] = useState<Cockpit | null>(null);
    const [panoramaPreviewUrl, setPanoramaPreviewUrl] = useState<string | null>(null);
    const [panoramaPreviewWidth, setPanoramaPreviewWidth] = useState<number>(0);
    const [panoramaPreviewHeight, setPanoramaPreviewHeight] = useState<number>(0);
    const viewerRef = useRef<any>(null);

    const [panoramaSelectedFile, setPanoramaSelectedFile] = useState<File | null>(null);
    const [uploadingFlag, setUploadingFlag] = useState<boolean>(false);
    const [addingInstrumentFlag, setAddingInstrumentFlag] = useState<boolean>(false);




    const [loadingFlag, setLoadingFlag] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();


    const handleCockpitInfoChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;

        setCockpit(prev => {
            if (!prev) return prev;              // стейт ещё не загружен

            // есть ли такое поле в объекте cockpit?
            if (name in prev) {
                const key = name as keyof Cockpit; // даём TS понять, что это ключ Cockpit
                return { ...prev, [key]: value } as Cockpit;
            }

            return prev; // игнорируем посторонние поля
        });
    };


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setPanoramaSelectedFile(file);
            // setPanoramaPreviewUrl(URL.createObjectURL(file));
        }
    }

    const handleUploadClick = () => {
        if (!panoramaSelectedFile) {
            setError("Choose file to upload!");
            return;
        }

        setUploadingFlag(true);
        setError(null);
        const url = URL.createObjectURL(panoramaSelectedFile)
        setPanoramaPreviewUrl(url);
        if (url) {
            getImageSize(URL.createObjectURL(panoramaSelectedFile)).then(size => {
                setPanoramaPreviewHeight(size.height);
                setPanoramaPreviewWidth(size.width);
                console.log("Height:", size.height)
                console.log("Width:", size.width)
            });
        } else {
            console.error("Ошибка загрузки файла");
            setError("Ошибка загрузки файла");
        }
        setUploadingFlag(false);
    }

    const getImageSize = (url: string) => {
        return new Promise<{ width: number; height: number }>((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
                resolve({ width: img.naturalWidth, height: img.naturalHeight });
            };
            img.onerror = reject;
        });
    };

    // Обработчик клика по панораме
    const handlePanoramaClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!addingInstrumentFlag) return;
        if (!viewerRef.current || typeof viewerRef.current.mouseEventToCoords !== "function") return;
        if (!panoramaPreviewWidth || !panoramaPreviewHeight) return;

        const coords = viewerRef.current.mouseEventToCoords(e);
        if (!coords) return;

        const [pitch, yaw] = coords;

        const x = Math.round(((yaw + 180) / 360) * panoramaPreviewWidth);
        const y = Math.round(((90 - pitch) / 180) * panoramaPreviewHeight);

        // добавляем хот-спот сразу (визуально)
        viewerRef.current.addHotSpot({
            id: `hotspot-${Date.now()}`,
            pitch,
            yaw,
            cssClass: "my-hotspot",
            createTooltipFunc: (hotSpotDiv: HTMLElement) => {
                hotSpotDiv.innerHTML = "";
            },
            createTooltipArgs: {}
        });

        // а состояние — через setCockpit
        setCockpit(prev => {
            if (!prev) return prev;

            const newInstrument: Instrument = {
                id: Date.now(),           // временный id на клиенте
                name: "",
                x,
                y,
                cockpitId: prev.id,
                media: [],
                description: ""           // если сделал поле опциональным — можно убрать
            };

            return {
                ...prev,
                instruments: [...prev.instruments, newInstrument]
            };
        });

        setAddingInstrumentFlag(false);
    };

    const handleAddInstrumentButtonClick = () => {
        if (!panoramaPreviewUrl) {
            setError("Set Cockpit View");
            return;
        }
        setAddingInstrumentFlag(true);
        const panoramaElem = document.getElementById("panorama");
        if (panoramaElem) {
            panoramaElem.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const handleInstrumentChange = (
        id: number,
        field: keyof Omit<Instrument, "id" | "x" | "y">,
        value: string | boolean | number
    ) => {
        setCockpit(prev => {
            if (!prev) return prev; // ещё не загружено

            return {
                ...prev,
                instruments: prev.instruments.map(inst =>
                    inst.id === id ? { ...inst, [field]: value } : inst
                )
            };
        });
    };

    const handleRemoveInstrument = (id: number) => {
        // 1) Удаляем инструмент и связанные checklist items в одном setCockpit
        setCockpit(prev => {
            if (!prev) return prev;

            return {
                ...prev,
                instruments: prev.instruments.filter(inst => inst.id !== id),
                checklists: prev.checklists.map(cl => ({
                    ...cl,
                    items: cl.items.filter(item => item.instrumentId !== id),
                })),
            };
        });

        // 2) Удаляем хот-спот из панорамы
        if (viewerRef.current && typeof viewerRef.current.removeHotSpot === 'function') {
            viewerRef.current.removeHotSpot(`hotspot-${id}`);
        }
    };

    const generateCockpitDescriptionFilename = (cockpitName: string): string => {
        const nameNoSpaces = cockpitName.replace(/\s+/g, '');
        const now = new Date().toISOString().replace(/[:.]/g, '-'); // безопасный формат
        return `${nameNoSpaces}_${now}_cockpit_description.txt`;
    };

    const generateInstrumentDescriptionFilename = (cockpitName: string, instrumentName: string): string => {
        const cleanCockpit = cockpitName.trim().replace(/\s+/g, '');
        const cleanInstrument = instrumentName.trim().replace(/\s+/g, '');
        const now = new Date().toISOString().replace(/[:.]/g, '-');
        return `${cleanCockpit}_${cleanInstrument}_${now}_instrument_description.txt`;
    };

    const uploadPanoramaToS3 = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await api.post("/s3/uploadPanorama", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            const data = response.data;
            if (!data?.url?.originalUrl) {
                throw new Error("Сервер вернул некорректный ответ: отсутствует originalUrl");
            }

            return {
                originalUrl: data.url.originalUrl,
                previewUrl: data.url.previewUrl,
            };
        } catch (err: any) {
            console.error("Ошибка загрузки панорамы:", err?.message || err);
            throw new Error(`Ошибка загрузки панорамы: ${err?.message || "Неизвестная ошибка"}`);
        }
    };

    const uploadTextToS3 = async (text: string, filename?: string): Promise<string | null> => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("You should sign in first");
            return null;
        }

        try {
            const response = await api.post("/s3/uploadText", { text, filename }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            return response.data.url; // URL строки с текстом
        } catch (err) {
            console.error("Ошибка загрузки текста на S3:", err);
            setError("Ошибка загрузки текста");
            return null;
        }
    };

    const handleEditCockpitClick = async () => {
        if (!cockpit?.name) { setError("Set cockpit name"); return; }
        if (!cockpit?.manufacturer) { setError("Set cockpit manufacturer"); return; }
        if (!cockpit?.model) { setError("Set cockpit model"); return; }
        if (!cockpit?.type) { setError("Set cockpit type"); return; }

        for (const instrument of cockpit.instruments) {
            if (!instrument.name) { setError("Set instrument name"); return; }
        }

        setError(null);

        const token = localStorage.getItem("access_token");
        if (!token) { setError("You should sign in first"); return; }

        // ЗАГРУЗКА описания кокпита
        let cockpitTextUrl: string | null = null;
        if (cockpit?.description) {
            cockpitTextUrl = await uploadTextToS3(
                cockpit?.description,
                generateCockpitDescriptionFilename(cockpit.name)
            );
        }

        // ЗАГРУЗКА описания всех инструментов
        const instrumentMedia = await Promise.all(
            cockpit.instruments.map(async (inst) => {
                let textUrl = null;
                if (inst.description) {
                    const filename = generateInstrumentDescriptionFilename(cockpit.name, inst.name);
                    textUrl = await uploadTextToS3(inst.description, filename);
                }

                return {
                    name: inst.name,
                    x: inst.x,
                    y: inst.y,
                    media: textUrl ? [{ link: textUrl, type: "TEXT" }] : []
                };
            })
        );

        // ЗАГРУЗКА панорамы кокпита
        let cockpitPanorama = null;
        try {
            if(panoramaSelectedFile){
                cockpitPanorama = await uploadPanoramaToS3(panoramaSelectedFile);
            }
        } catch (err: any) {
            setError(err.message);
            return;
        }


        const media: any[] = [];
        if (cockpitPanorama?.originalUrl) {
            media.push({
                link: cockpitPanorama.originalUrl,
                type: "PANORAMA",
                width: panoramaPreviewWidth,
                height: panoramaPreviewHeight,
            });
        }else {
            media.push({
                link: panoramaPreviewUrl,
                type: "PANORAMA",
                width: panoramaPreviewWidth,
                height: panoramaPreviewHeight,
            });
        }

        if (cockpitTextUrl) {
            media.push({
                link: cockpitTextUrl,
                type: "TEXT",
            });
        }


        const formattedChecklists = cockpit.checklists.map(checklist => ({
            name: checklist.name,
            items: checklist.items.map(item => {
                const instrumentIndex = cockpit.instruments.findIndex(i => i.id === item.instrumentId);
                if (instrumentIndex === -1) {
                    throw new Error(`Instrument with id ${item.instrumentId} not found`);
                }
                return {
                    description: item.description,
                    order: item.order,
                    instrumentIndex,
                };
            }),
        }));


        console.log(cockpit.instruments)
        console.log(formattedChecklists)


        const cockpitData = {
            name: cockpit.name,
            manufacturer: cockpit.manufacturer,
            model: cockpit.model,
            type: cockpit.type,
            media,
            instruments: instrumentMedia,
            ...(formattedChecklists.length > 0 ? { checklists: formattedChecklists } : {}),
        };

        console.log("NEW COCKPIT:")
        console.log(cockpitData)

        try {
            const response = await api.patch(`/cockpits/${cockpit.id}`, cockpitData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            console.log("Cockpit created:", response.data);
            setError(null);
            navigate("/cockpits");
        } catch (error: any) {
            console.error("Error:", error);
            setError("Ошибка при создании кокпита");
        }
    };






    useEffect(() => {
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
                    fetchTextFile(textMedia.link, (text) => {
                        setCockpit((prev) =>
                            prev
                                ? { ...prev, description: text }
                                : prev
                        );
                    });
                }

                // Найти media с type "TEXT" для инструментов
                data.instruments.forEach((instrument: Instrument) => {
                    const instrumentTextMedia = instrument.media.find((m: Media) => m.type === "TEXT");
                    if (instrumentTextMedia) {
                        fetchTextFile(instrumentTextMedia.link, (text) => {
                            setCockpit((prev) =>
                                prev
                                    ? {
                                        ...prev,
                                        instruments: prev.instruments.map((instr) =>
                                            instr.id === instrument.id
                                                ? { ...instr, description: text }
                                                : instr
                                        ),
                                    }
                                    : prev
                            );
                        });
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
        // это срабатывает каждый раз, когда изменяется panoramaPreviewUrl
        if (panoramaPreviewUrl && (window as any).pannellum) {
            viewerRef.current = (window as any).pannellum.viewer("panorama", {
                type: "equirectangular",
                panorama: panoramaPreviewUrl,
                autoLoad: true,
                autoRotate: 10,
            });
        }
        if (viewerRef.current && cockpit?.instruments) {
            viewerRef.current.on("load", () => {
                cockpit.instruments.forEach((instrument) => {
                    const yaw = Math.round(((instrument.x / panoramaPreviewWidth) * 360) - 180);
                    const pitch = Math.round(90 - ((instrument.y / panoramaPreviewHeight) * 180));

                    if (viewerRef.current) {
                        viewerRef.current.addHotSpot({
                            id: `hotspot-${instrument.id}`, // Уникальный ID для удаления
                            pitch: pitch,
                            yaw: yaw,
                            cssClass: "my-hotspot",
                            createTooltipFunc: (hotSpotDiv: HTMLElement) => {
                                hotSpotDiv.innerHTML = "";
                            },
                            createTooltipArgs: {}
                        });
                    }
                });
            });
        }
    }, [panoramaPreviewUrl]);

    useEffect(() => {
        console.log(cockpit)
    }, [cockpit]);



    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <div className={styles.splitContainer}>
                    {/* <div className={styles.leftPane}> */}
                    <div className={styles.leftPane} onClick={panoramaPreviewUrl && addingInstrumentFlag ? handlePanoramaClick : undefined}>

                        {/* LEFT panel - Cockpit Preview and Uploader */}
                        {panoramaPreviewUrl ?
                            (
                                <div id="panorama" className={styles.panoramaViewer} />
                            ) : (
                                <div className={styles.uploadPrompt}>
                                    <h2>Upload your cockpit Panorama ✈️</h2>
                                    <input type="file" accept="image/*" onChange={handleFileChange} />
                                    <button onClick={handleUploadClick} disabled={uploadingFlag} className={styles.uploadButton}>
                                        {uploadingFlag ? "Uploading..." : "Upload!"}
                                    </button>
                                    {error && (<h2 className={styles.errorText}>{error}</h2>)}
                                </div>
                            )
                        }
                    </div>
                    <div className={styles.rightPane}>
                        {/* RIGHT panel - Info about Cockpit */}
                        <h1>
                            <div>
                                <span style={{ color: 'white', background: 'orange', padding: '2px 10px', borderRadius: '8px' }}>
                                    Edit
                                </span> {cockpit?.name ?? ''}
                            </div>
                        </h1>

                        <div className={styles.splitHorizontallyContainer}>
                            <div className={styles.smallHorizontalContainer}>
                                {/* RIGHT TOP panel - cockpit DATA */}
                                <h1>Edit Cockpit:</h1>
                                <div className={styles.formGroup}>
                                    <label htmlFor="name">Name</label>
                                    <input type="text" id="name" name="name" value={cockpit?.name ?? ''} onChange={handleCockpitInfoChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="manufacturer">Manufacturer</label>
                                    <input type="text" id="manufacturer" name="manufacturer" value={cockpit?.manufacturer ?? ''} onChange={handleCockpitInfoChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="model">Model</label>
                                    <input type="text" id="model" name="model" value={cockpit?.model ?? ''} onChange={handleCockpitInfoChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="type">Type</label>
                                    <input type="text" id="type" name="type" value={cockpit?.type ?? ''} onChange={handleCockpitInfoChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="description">Description</label>
                                    <textarea className={styles.cockpitDescription} name="description" value={cockpit?.description ?? ''} onChange={handleCockpitInfoChange} />
                                </div>
                            </div>
                            <div className={styles.smallHorizontalContainer}>
                                {/* RIGHT MIDDLE panel - instruments DATA */}
                                {cockpit?.instruments.length === 0 ?
                                    (
                                        <h1>Add new instrument:</h1>
                                    ) : (
                                        <h1>Added instruments:</h1>
                                    )}
                                {cockpit?.instruments.map(inst => (
                                    <div key={inst.id} className={styles.instrumentItem}>
                                        <p>
                                            <strong>Marker:</strong> (x: {inst.x.toFixed(0)}, y: {inst.y.toFixed(0)}, w: {panoramaPreviewWidth}, h: {panoramaPreviewHeight})
                                        </p>
                                        <div className={styles.formGroup}>
                                            <label>Name</label>
                                            <input type="text" value={inst.name} onChange={(e) => handleInstrumentChange(inst.id, "name", e.target.value)} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Description</label>
                                            <textarea rows={2} value={inst.description} onChange={(e) => handleInstrumentChange(inst.id, "description", e.target.value)} />
                                        </div>
                                        <button className={styles.deleteInstrumentButton} onClick={() => handleRemoveInstrument(inst.id)}>
                                            ❌ Remove Instrument
                                        </button>
                                    </div>

                                ))}
                                <button className={styles.addInstrumentButton} onClick={handleAddInstrumentButtonClick}>
                                    Add new Instrument
                                </button>
                            </div>
                            <div className={styles.smallHorizontalContainer}>
                                {/* RIGHT BOTTOM panel - checklists */}
                                {cockpit?.checklists.length === 0 ? (
                                    <h1>Add new checklist:</h1>
                                ) : (
                                    <h1>Checklists:</h1>
                                )}

                                {cockpit?.checklists.map((checklist, checklistIndex) => (
                                    <div key={checklist.id} className={styles.checklistItem}>
                                        <div className={styles.formGroup}>
                                            <label>Checklist Name</label>
                                            <input
                                                type="text"
                                                value={checklist.name}
                                                onChange={(e) => {
                                                    setCockpit((prev) => {
                                                        if (!prev) return prev;
                                                        const updatedChecklists = [...prev.checklists];
                                                        updatedChecklists[checklistIndex] = {
                                                            ...updatedChecklists[checklistIndex],
                                                            name: e.target.value,
                                                        };
                                                        return { ...prev, checklists: updatedChecklists };
                                                    });
                                                }}
                                            />
                                        </div>

                                        {checklist.items.map((item, itemIndex) => (
                                            <div key={itemIndex} className={styles.checklistItemItem}>
                                                <div className={styles.formGroup}>
                                                    <label>Instrument</label>
                                                    <select
                                                        value={item.instrumentId}
                                                        onChange={(e) => {
                                                            setCockpit((prev) => {
                                                                if (!prev) return prev;
                                                                const updatedChecklists = [...prev.checklists];
                                                                const updatedItems = [...updatedChecklists[checklistIndex].items];
                                                                updatedItems[itemIndex] = {
                                                                    ...updatedItems[itemIndex],
                                                                    instrumentId: Number(e.target.value),
                                                                };
                                                                updatedChecklists[checklistIndex] = {
                                                                    ...updatedChecklists[checklistIndex],
                                                                    items: updatedItems,
                                                                };
                                                                return { ...prev, checklists: updatedChecklists };
                                                            });
                                                        }}
                                                    >
                                                        {cockpit.instruments.map((inst) => (
                                                            <option key={inst.id} value={inst.id}>
                                                                {inst.name || `Instrument ${inst.id}`}
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <label>Description</label>
                                                    <input
                                                        type="text"
                                                        value={item.description}
                                                        onChange={(e) => {
                                                            setCockpit((prev) => {
                                                                if (!prev) return prev;
                                                                const updatedChecklists = [...prev.checklists];
                                                                const updatedItems = [...updatedChecklists[checklistIndex].items];
                                                                updatedItems[itemIndex] = {
                                                                    ...updatedItems[itemIndex],
                                                                    description: e.target.value,
                                                                };
                                                                updatedChecklists[checklistIndex] = {
                                                                    ...updatedChecklists[checklistIndex],
                                                                    items: updatedItems,
                                                                };
                                                                return { ...prev, checklists: updatedChecklists };
                                                            });
                                                        }}
                                                    />

                                                    <label>Order</label>
                                                    <input
                                                        type="number"
                                                        value={item.order}
                                                        onChange={(e) => {
                                                            setCockpit((prev) => {
                                                                if (!prev) return prev;
                                                                const updatedChecklists = [...prev.checklists];
                                                                const updatedItems = [...updatedChecklists[checklistIndex].items];
                                                                updatedItems[itemIndex] = {
                                                                    ...updatedItems[itemIndex],
                                                                    order: Number(e.target.value),
                                                                };
                                                                updatedChecklists[checklistIndex] = {
                                                                    ...updatedChecklists[checklistIndex],
                                                                    items: updatedItems,
                                                                };
                                                                return { ...prev, checklists: updatedChecklists };
                                                            });
                                                        }}
                                                    />

                                                    <button
                                                        className={styles.deleteInstrumentButton}
                                                        onClick={() => {
                                                            setCockpit((prev) => {
                                                                if (!prev) return prev;
                                                                const updatedChecklists = [...prev.checklists];
                                                                const updatedItems = updatedChecklists[checklistIndex].items.filter(
                                                                    (_, i) => i !== itemIndex
                                                                );
                                                                updatedChecklists[checklistIndex] = {
                                                                    ...updatedChecklists[checklistIndex],
                                                                    items: updatedItems,
                                                                };
                                                                return { ...prev, checklists: updatedChecklists };
                                                            });
                                                        }}
                                                    >
                                                        ❌ Remove Item
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <button
                                            onClick={() => {
                                                setCockpit((prev) => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        checklists: prev.checklists.filter((cl) => cl.id !== checklist.id),
                                                    };
                                                });
                                            }}
                                        >
                                            🗑️ Delete Checklist
                                        </button>

                                        <button
                                            className={styles.addInstrumentButton}
                                            onClick={() => {
                                                setCockpit((prev) => {
                                                    if (!prev) return prev;
                                                    const updatedChecklists = [...prev.checklists];
                                                    const updatedItems = [
                                                        ...updatedChecklists[checklistIndex].items,
                                                        {
                                                            id: Date.now(), // временный ID
                                                            instrumentId: prev.instruments[0]?.id ?? 0,
                                                            description: "",
                                                            order: (checklist.items.length + 1) * 10,
                                                            checklistId: checklist.id,
                                                        },
                                                    ];
                                                    updatedChecklists[checklistIndex] = {
                                                        ...updatedChecklists[checklistIndex],
                                                        items: updatedItems,
                                                    };
                                                    return { ...prev, checklists: updatedChecklists };
                                                });
                                            }}
                                        >
                                            ➕ Add existing instrument to this checklist
                                        </button>
                                    </div>
                                ))}

                                <button
                                    className={styles.addInstrumentButton}
                                    onClick={() => {
                                        setCockpit((prev) => {
                                            if (!prev) return prev;
                                            const newChecklist: Checklist = {
                                                id: Date.now(),
                                                name: "",
                                                createdAt: new Date().toISOString(),
                                                updatedAt: new Date().toISOString(),
                                                cockpitId: prev.id,
                                                items: [],
                                            };
                                            return { ...prev, checklists: [...prev.checklists, newChecklist] };
                                        });
                                    }}
                                >
                                    Add new Checklist
                                </button>
                            </div>
                            <div className={styles.smallHorizontalContainer}>
                                <button className={styles.editCockpit} onClick={handleEditCockpitClick}>
                                    Edit Cockpit!
                                </button>
                                {error && (<h2 className={styles.editError}>{error}</h2>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EditCockpit;
