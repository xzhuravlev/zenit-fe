import React, { useEffect, useRef, useState } from "react";
import styles from "./CreateCockpit.module.css";
import { api } from "../api/axios";
import { useNavigate } from "react-router-dom";



interface Instrument {
    id: number;
    x: number;
    y: number;
    name: string;
    description: string;
    showChecklist?: boolean;
    checklistOrder?: number;
}

interface ChecklistItem {
    description: string;
    order: number;
    instrumentId: number; // <--- вместо instrumentIndex, при отправке это используем для определения индекса в списке инструментов
}

interface Checklist {
    id: number;
    name: string;
    items: ChecklistItem[];
}

const CreateCockpit: React.FC = () => {
    const [panoramaSelectedFile, setPanoramaSelectedFile] = useState<File | null>(null);
    const [panoramaPreviewUrl, setPanoramaPreviewUrl] = useState<string | null>(null);
    const [panoramaPreviewWidth, setPanoramaPreviewWidth] = useState<number>(0);
    const [panoramaPreviewHeight, setPanoramaPreviewHeight] = useState<number>(0);
    const viewerRef = useRef<any>(null);
    const [uploadingFlag, setUploadingFlag] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [cockpitInfo, setCockpitInfo] = useState({
        name: "",
        manufacturer: "",
        model: "",
        type: "",
        description: ""
    });
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [addingInstrumentFlag, setAddingInstrumentFlag] = useState<boolean>(false);
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const navigate = useNavigate();




    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            setPanoramaSelectedFile(file);
            // setPanoramaPreviewUrl(URL.createObjectURL(file));
        }
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

    const handleCockpitInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCockpitInfo({
            ...cockpitInfo,
            [e.target.name]: e.target.value
        });
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

    // Обработчик клика по панораме
    const handlePanoramaClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Проверяем, активен ли режим добавления
        if (!addingInstrumentFlag) return;

        // Если инстанс viewer уже создан, получаем угловые координаты (yaw и pitch)
        if (viewerRef.current && typeof viewerRef.current.mouseEventToCoords === "function") {
            const coords = viewerRef.current.mouseEventToCoords(e);
            if (!coords) return;
            const [pitch, yaw] = coords;
            console.log(`yaw: ${yaw}, pitch: ${pitch}`);
            console.log(`imageWidth: ${panoramaPreviewWidth}, imageHeigh: ${panoramaPreviewHeight}`);

            const x = Math.round(((yaw + 180) / 360) * panoramaPreviewWidth);
            const y = Math.round(((90 - pitch) / 180) * panoramaPreviewHeight);

            console.log(`x: ${x}, y: ${y}`);

            const newInstrument: Instrument = {
                id: Date.now(),
                x,
                y,
                name: "",
                description: ""
            }

            viewerRef.current.addHotSpot({
                id: `hotspot-${newInstrument.id}`, // Уникальный ID для удаления
                pitch: pitch,
                yaw: yaw,
                cssClass: "my-hotspot",
                createTooltipFunc: (hotSpotDiv: HTMLElement) => {
                    hotSpotDiv.innerHTML = "";
                },
                createTooltipArgs: {}
            });

            setInstruments(prev => [...prev, newInstrument]);
            setAddingInstrumentFlag(false);
        }
    };

    const handleInstrumentChange = (
        id: number,
        field: keyof Omit<Instrument, "id" | "x" | "y">,
        value: string | boolean | number
    ) => {
        setInstruments(prev =>
            prev.map(inst => inst.id === id ? { ...inst, [field]: value } : inst)
        );
    };

    const handleRemoveInstrument = (id: number) => {
        // Удаляем инструмент
        setInstruments(prev => prev.filter(inst => inst.id !== id));

        // Удаляем хотспот из панорамы
        if (viewerRef.current) {
            viewerRef.current.removeHotSpot(`hotspot-${id}`);
        }

        // Удаляем все checklist items, где используется этот инструмент
        setChecklists(prevChecklists =>
            prevChecklists.map(cl => ({
                ...cl,
                items: cl.items.filter(item => item.instrumentId !== id),
            }))
        );
    };

    const handleAddChecklistButtonClick = () => {
        if (!panoramaPreviewUrl) {
            setError("Set Cockpit View");
            return;
        }
        if (instruments.length === 0) {
            setError("You should add instruments");
            return;
        }

        const newChecklist: Checklist = {
            id: Date.now(),
            name: "",
            items: [],
        };

        setChecklists(prev => [...prev, newChecklist]);
    }

    const handleRemoveChecklist = (id: number) => {
        setChecklists(prev => prev.filter(cl => cl.id !== id));
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



    const handleCreateCockpitClick = async () => {
        if (!panoramaSelectedFile) { setError("Set cockpit panorama file"); return; }
        if (!cockpitInfo.name) { setError("Set cockpit name"); return; }
        if (!cockpitInfo.manufacturer) { setError("Set cockpit manufacturer"); return; }
        if (!cockpitInfo.model) { setError("Set cockpit model"); return; }
        if (!cockpitInfo.type) { setError("Set cockpit type"); return; }

        for (const instrument of instruments) {
            if (!instrument.name) { setError("Set instrument name"); return; }
        }

        setError(null);

        const token = localStorage.getItem("access_token");
        if (!token) { setError("You should sign in first"); return; }

        // ЗАГРУЗКА описания кокпита
        let cockpitTextUrl: string | null = null;
        if (cockpitInfo.description) {
            cockpitTextUrl = await uploadTextToS3(
                cockpitInfo.description,
                generateCockpitDescriptionFilename(cockpitInfo.name)
            );
        }

        // ЗАГРУЗКА описания всех инструментов
        const instrumentMedia = await Promise.all(
            instruments.map(async (inst) => {
                let textUrl = null;
                if (inst.description) {
                    const filename = generateInstrumentDescriptionFilename(cockpitInfo.name, inst.name);
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
            cockpitPanorama = await uploadPanoramaToS3(panoramaSelectedFile);
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
        }

        if (cockpitTextUrl) {
            media.push({
                link: cockpitTextUrl,
                type: "TEXT",
            });
        }


        const formattedChecklists = checklists.map(checklist => ({
            name: checklist.name,
            items: checklist.items.map(item => {
                const instrumentIndex = instruments.findIndex(i => i.id === item.instrumentId);
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


        console.log(instruments)
        console.log(formattedChecklists)


        const cockpitData = {
            name: cockpitInfo.name,
            manufacturer: cockpitInfo.manufacturer,
            model: cockpitInfo.model,
            type: cockpitInfo.type,
            media,
            instruments: instrumentMedia,
            ...(formattedChecklists.length > 0 ? { checklists: formattedChecklists } : {}),
        };

        console.log("NEW COCKPIT:")
        console.log(cockpitData)

        try {
            const response = await api.post("/cockpits", cockpitData, {
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
        // это срабатывает каждый раз, когда изменяется panoramaPreviewUrl
        if (panoramaPreviewUrl && (window as any).pannellum) {
            viewerRef.current = (window as any).pannellum.viewer("panorama", {
                type: "equirectangular",
                panorama: panoramaPreviewUrl,
                autoLoad: true,
                autoRotate: 10,
            });
        }
    }, [panoramaPreviewUrl]);




    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <div className={styles.splitContainer}>
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
                                <span style={{ color: 'white', background: 'green', padding: '2px 10px', borderRadius: '8px' }}>
                                    Create
                                </span> {cockpitInfo.name}
                            </div>
                        </h1>

                        <div className={styles.splitHorizontallyContainer}>
                            <div className={styles.smallHorizontalContainer}>
                                {/* RIGHT TOP panel - cockpit DATA */}
                                <h1>Create new Cockpit:</h1>
                                <div className={styles.formGroup}>
                                    <label htmlFor="name">Name</label>
                                    <input type="text" id="name" name="name" value={cockpitInfo.name} onChange={handleCockpitInfoChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="manufacturer">Manufacturer</label>
                                    <input type="text" id="manufacturer" name="manufacturer" value={cockpitInfo.manufacturer} onChange={handleCockpitInfoChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="model">Model</label>
                                    <input type="text" id="model" name="model" value={cockpitInfo.model} onChange={handleCockpitInfoChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="type">Type</label>
                                    <input type="text" id="type" name="type" value={cockpitInfo.type} onChange={handleCockpitInfoChange} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label htmlFor="description">Description</label>
                                    <textarea className={styles.cockpitDescription} name="description" value={cockpitInfo.description} onChange={handleCockpitInfoChange} />
                                </div>
                            </div>
                            <div className={styles.smallHorizontalContainer}>
                                {/* RIGHT MIDDLE panel - instruments DATA */}
                                {instruments.length === 0 ?
                                    (
                                        <h1>Add new instrument:</h1>
                                    ) : (
                                        <h1>Added instruments:</h1>
                                    )}
                                {instruments.map(inst => (
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
                                {checklists.length === 0 ?
                                    (
                                        <h1>Add new checklist:</h1>
                                    ) : (
                                        <h1>Checklists:</h1>
                                    )}
                                {checklists.map((checklist, checklistIndex) => (
                                    <div key={checklist.id} className={styles.checklistItem}>
                                        <div className={styles.formGroup}>
                                            <label>Checklist Name</label>
                                            <input
                                                type="text"
                                                value={checklist.name}
                                                onChange={(e) => {
                                                    const updated = [...checklists];
                                                    updated[checklistIndex].name = e.target.value;
                                                    setChecklists(updated);
                                                }}
                                            />
                                        </div>

                                        {checklist.items.map((item, itemIndex) => (
                                            <div className={styles.checklistItemItem}>
                                                <div key={itemIndex} className={styles.formGroup}>
                                                    <label>Instrument</label>
                                                    <select
                                                        value={item.instrumentId}
                                                        onChange={(e) => {
                                                            const updated = [...checklists];
                                                            updated[checklistIndex].items[itemIndex].instrumentId = Number(e.target.value);
                                                            setChecklists(updated);
                                                        }}
                                                    >
                                                        {instruments.map(inst => (
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
                                                            const updated = [...checklists];
                                                            updated[checklistIndex].items[itemIndex].description = e.target.value;
                                                            setChecklists(updated);
                                                        }}
                                                    />

                                                    <label>Order</label>
                                                    <input
                                                        type="number"
                                                        value={item.order}
                                                        onChange={(e) => {
                                                            const updated = [...checklists];
                                                            updated[checklistIndex].items[itemIndex].order = Number(e.target.value);
                                                            setChecklists(updated);
                                                        }}
                                                    />

                                                    <button
                                                        className={styles.deleteInstrumentButton}
                                                        onClick={() => {
                                                            const updated = [...checklists];
                                                            updated[checklistIndex].items.splice(itemIndex, 1);
                                                            setChecklists(updated);
                                                        }}
                                                    >
                                                        ❌ Remove Item
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <button onClick={() => handleRemoveChecklist(checklist.id)}>
                                            🗑️ Delete Checklist
                                        </button>
                                        <button
                                            className={styles.addInstrumentButton}
                                            onClick={() => {
                                                const updated = [...checklists];
                                                updated[checklistIndex].items.push({
                                                    instrumentId: instruments[0]?.id ?? 0,
                                                    description: "",
                                                    order: (checklist.items.length + 1) * 10,
                                                });
                                                setChecklists(updated);
                                            }}
                                        >
                                            ➕ Add existing instrument to this checklist
                                        </button>
                                    </div>
                                ))}
                                <button className={styles.addInstrumentButton} onClick={handleAddChecklistButtonClick}>
                                    Add new Checklist
                                </button>
                            </div>
                            <div className={styles.smallHorizontalContainer}>
                                <button className={styles.createCockpit} onClick={handleCreateCockpitClick}>
                                    Create Cockpit!
                                </button>
                                {error && (<h2 className={styles.createError}>{error}</h2>)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CreateCockpit;
