import React, { useEffect, useRef, useState } from "react";
import styles from "./CreateCockpit.module.css";
import { useNavigate } from "react-router-dom";
import { api } from "../api/axios";


// Интерфейс для инструмента
interface Instrument {
    id: number;
    x: number;
    y: number;
    name: string;
    description: string;
    showChecklist?: boolean;
    checklistOrder?: number;
}

const CreateCockpit: React.FC = () => {

    const [cockpitViewUrl, setCockpitViewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState<boolean>(false);
    const [cockpitInfo, setCockpitInfo] = useState({
        name: "",
        manufacturer: "",
        model: "",
        type: "",
        description: ""
    });
    const [instruments, setInstruments] = useState<Instrument[]>([]);
    const [addingInstrument, setAddingInstrument] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const viewerRef = useRef<any>(null);
    const [imageWidth, setImageWidth] = useState<number>(0);
    const [imageHeight, setImageHeight] = useState<number>(0);
    const navigate = useNavigate();

    // Инициализация pannellum и сохранение инстанса в viewerRef
    useEffect(() => {
        if (cockpitViewUrl && (window as any).pannellum) {
            viewerRef.current = (window as any).pannellum.viewer("panorama", {
                type: "equirectangular",
                panorama: cockpitViewUrl,
                autoLoad: true,
                autoRotate: 10,
            });
        }
    }, [cockpitViewUrl]);

    // Обработчики формы
    const handleCockpitInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setCockpitInfo({
            ...cockpitInfo,
            [e.target.name]: e.target.value
        });
    };

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

    // Обработчик выбора файла
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };

    // Отправка файла на сервер для загрузки в S3
    const handleUploadToS3 = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append("file", selectedFile);

        try {
            const response = await api.post("/s3/uploadPanorama", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });
        
            const data = response.data;
            console.log(data);

            if (!data?.url?.originalUrl) {
                throw new Error("Сервер вернул некорректный ответ: отсутствует originalUrl");
            }
        
            setCockpitViewUrl(data.url.originalUrl); // Обновляем URL панорамы с S3
            getImageSize(data.url.originalUrl).then(size => {
                setImageHeight(size.height);
                setImageWidth(size.width);
            });
        } catch (err: any) {
            console.error("Ошибка загрузки файла:", err?.message || err);
            setError(`Ошибка загрузки файла: ${err?.message || "Неизвестная ошибка"}`);
        } finally {
            setUploading(false);
        }
        
    };

    // Обработчик клика по кнопке "Загрузить"
    const handleUploadClick = () => {
        if (!selectedFile) {
            setError("Choose file to upload!");
            return;
        }
        handleUploadToS3();
    };

    // Обработчик клика по панораме
    const handlePanoramaClick = (e: React.MouseEvent<HTMLDivElement>) => {
        // Проверяем, активен ли режим добавления
        if (!addingInstrument) return;

        // Если инстанс viewer уже создан, получаем угловые координаты (yaw и pitch)
        if (viewerRef.current && typeof viewerRef.current.mouseEventToCoords === "function") {
            const coords = viewerRef.current.mouseEventToCoords(e);
            if (!coords) return;
            const [pitch, yaw] = coords;
            console.log(`yaw: ${yaw}, pitch: ${pitch}`);
            console.log(`imageWidth: ${imageWidth}, imageHeigh: ${imageHeight}`);

            const x = Math.round(((yaw + 180) / 360) * imageWidth);
            const y = Math.round(((90 - pitch) / 180) * imageHeight);
            
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
            setAddingInstrument(false);
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

    const handleAddInstrumentButtonClick = () => {
        if(!cockpitViewUrl){ setError("Set Cockpit View"); return; }
        setAddingInstrument(true);
        const panoramaElem = document.getElementById("panorama");
        if (panoramaElem) {
            panoramaElem.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const handleRemoveInstrument = (id: number) => {
        setInstruments(prev => prev.filter(inst => inst.id !== id));
    
        // Удаляем хотспот из панорамы, если он существует
        if (viewerRef.current) {
            viewerRef.current.removeHotSpot(`hotspot-${id}`);
        }
    };
    

    const uploadTextToS3 = async (text: string, filename: string) => {
        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("You should sign in first");
            return null;
        }
    
        try {
            const response = await fetch("http://localhost:3333/s3/upload-text", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ text, filename })
            });
    
            if (!response.ok) {
                throw new Error(`Ошибка загрузки текста: ${response.statusText}`);
            }
    
            const data = await response.json();
            return data.url; // Вернем URL файла
        } catch (error) {
            console.error("Ошибка загрузки текста:", error);
            return null;
        }
    };

    const handleCreateCockpitClick = async () => {
        if (!cockpitViewUrl) { setError("Set Cockpit View"); return; }
        if (!cockpitInfo.name) { setError("Set Cockpit Name"); return; }
        if (!cockpitInfo.manufacturer) { setError("Set Cockpit Manufacturer"); return; }
        if (!cockpitInfo.model) { setError("Set Cockpit Model"); return; }
        if (!cockpitInfo.type) { setError("Set Cockpit Type"); return; }
    
        for (const instrument of instruments) {
            if (!instrument.name) { setError("Set Instrument Name"); return; }
        }
    
        setError(null);
        const token = localStorage.getItem("access_token");
        if (!token) {
            setError("You should sign in first");
            return;
        }

        // Фильтруем инструменты для чеклиста
        const checklistItems = instruments
            .filter(inst => inst.showChecklist) // Только те, у которых showChecklist === true
            .map((inst, index) => ({
                order: inst.checklistOrder ?? (index + 1) * 10, // Если не указан порядок, ставим шаг в 10
                instrumentIndex: instruments.findIndex(i => i.id === inst.id)
            }));

    
        // 🔹 Загружаем текст cockpit description в S3
        let cockpitTextUrl = null;
        if (cockpitInfo.description) {
            cockpitTextUrl = await uploadTextToS3(cockpitInfo.description, "cockpit_description");
        }
    
        // 🔹 Загружаем описания инструментов в S3
        const instrumentMedia = await Promise.all(
            instruments.map(async (inst) => {
                let textUrl = null;
                if (inst.description) {
                    textUrl = await uploadTextToS3(inst.description, `instrument_${inst.id}_description`);
                }
    
                return {
                    name: inst.name || "Unnamed Instrument",
                    x: inst.x,
                    y: inst.y,
                    media: textUrl ? [{ link: textUrl, type: "TEXT" }] : []
                };
            })
        );
    
        // 🔹 Формируем данные для отправки
        const cockpitData = {
            name: cockpitInfo.name,
            manufacturer: cockpitInfo.manufacturer,
            model: cockpitInfo.model,
            type: cockpitInfo.type,
            media: [
                { link: cockpitViewUrl, type: "PANORAMA", width: imageWidth, height: imageHeight },
                ...(cockpitTextUrl ? [{ link: cockpitTextUrl, type: "TEXT" }] : []) // Добавляем текстовое описание
            ],
            ...(checklistItems.length > 0 ? { checklist: { items: checklistItems } } : {}),
            instruments: instrumentMedia
        };
    
        try {
            const response = await fetch("http://localhost:3333/cockpits", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(cockpitData)
            });
    
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
    
            const result = await response.json();
            console.log("Кокпит успешно создан:", result);
            setError(null);
            navigate("/cockpits");

        } catch (error) {
            console.error("Ошибка при создании кокпита:", error);
        }
    };
    
    
    
    

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentBody}>
                <div className={styles.splitContainer}>
                    <div className={styles.leftPane}>
                        {/* LEFT panel - Cockpit */}
                        <div className={styles.leftPane} onClick={cockpitViewUrl && addingInstrument ? handlePanoramaClick : undefined}>
                            {cockpitViewUrl ?
                                (
                                    <div id="panorama" className={styles.panoramaViewer}></div>
                                ) : (
                                    <div className={styles.uploadPrompt}>
                                        <h2>Upload your cockpit Panorama or Photo ✈️</h2>
                                        <input type="file" accept="image/*" onChange={handleFileChange} />
                                        <button
                                            onClick={handleUploadClick}
                                            disabled={uploading}
                                            className={styles.uploadButton}
                                        >
                                            {uploading ? "Uploading..." : "Upload"}
                                        </button>
                                        {error && (<h2 className={styles.errorText}>{error}</h2>)}
                                    </div>
                                )
                            }
                        </div>
                    </div>
                    <div className={styles.rightPane}>
                        {/* RIGHT panel - Creator */}
                        <h1>
                            <div>
                                <span style={{ color: 'white', background: 'green', padding: '2px 10px', borderRadius: '8px' }}>
                                    Create
                                </span> {cockpitInfo.name}
                            </div>
                        </h1>

                        <div className={styles.splitHorizontallyContainer}>
                            <div className={styles.smallHorizontalContainer}>
                                {/* right UP panel - cockpit DATA */}
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
                                    <label htmlFor="description">Popis</label>
                                    <textarea className={styles.cockpitDescription} name="description" value={cockpitInfo.description} onChange={handleCockpitInfoChange} />

                                </div>
                            </div>
                            <div className={styles.smallHorizontalContainer}>
                                <h1>Add cockpit view as:</h1>
                            </div>
                            <div className={styles.smallHorizontalContainer}>
                                {/* <h1>Add instruments:</h1> */}
                                {instruments.length === 0 ? ( <h1>Add new instrument:</h1> ) : ( <h1>Added instruments:</h1> )}

                                {instruments.map(inst => (
                                    <div key={inst.id} className={styles.instrumentItem}>
                                        <p>
                                            <strong>Marker:</strong> (x: {inst.x.toFixed(0)}, y: {inst.y.toFixed(0)})
                                        </p>
                                        <div className={styles.formGroup}>
                                            <label>Name</label>
                                            <input type="text" value={inst.name} onChange={(e) => handleInstrumentChange(inst.id, "name", e.target.value)} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>Description</label>
                                            <textarea rows={2} value={inst.description} onChange={(e) => handleInstrumentChange(inst.id, "description", e.target.value)} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    checked={inst.showChecklist ?? false}
                                                    onChange={(e) => handleInstrumentChange(inst.id, "showChecklist", e.target.checked)}
                                                />
                                                Include in Checklist
                                            </label>
                                        </div>
                                        {inst.showChecklist && (
                                            <div className={styles.formGroup}>
                                                <label>Checklist Order</label>
                                                <input type="number" value={inst.checklistOrder ?? ""}
                                                    onChange={(e) => handleInstrumentChange(inst.id, "checklistOrder", Number(e.target.value))}
                                                />
                                            </div>
                                        )}
                                        {/* 🔴 Добавляем кнопку удаления */}
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
};

export default CreateCockpit;
