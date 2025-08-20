import axios from "axios";
import { config } from "process";

const api = axios.create({
    baseURL: "http://localhost:3333", // адрес твоего бекенда
    withCredentials: true, // если используешь куки или сессии
});

api.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem("access_token");
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Проверка: если ошибка 401 и это не попытка refresh
        if (
            error.response?.status === 401 &&
            !originalRequest._retry &&
            !originalRequest.url.includes("/auth/refresh")
        ) {
            originalRequest._retry = true;

            try {
                const refreshResponse = await axios.post(
                    "http://localhost:3333/auth/refresh",
                    {},
                    { withCredentials: true }
                );

                const newAccessToken = refreshResponse.data.access_token;
                localStorage.setItem("access_token", newAccessToken);

                // Подставляем новый токен и повторяем запрос
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Если refresh неудачен — удалить токены и перекинуть пользователя на вход
                localStorage.removeItem("access_token");
                window.dispatchEvent(new Event('auth:changed'));
                window.location.href = "/signin"; // или navigate("/signin") если в React
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export { api };