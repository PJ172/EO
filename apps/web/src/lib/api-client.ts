import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosRequestConfig } from "axios";

// Automatically use the hostname of the browser if NEXT_PUBLIC_API_URL is undefined
const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || 
    (typeof window !== "undefined" 
        ? `http://${window.location.hostname}:3001/api/v1` 
        : "http://localhost:3001/api/v1");

export const API_BASE_URL = RAW_API_URL;

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // Increased timeout for file uploads and large jobs
});

// Token management
let accessToken: string | null = null;

// Singleton promise to prevent concurrent token refresh race conditions.
// When multiple requests fail with 401 simultaneously, only ONE refresh
// is sent to the server. All other failing requests queue and wait for
// the single promise to resolve before retrying with the new token.
let refreshPromise: Promise<string> | null = null;

export const setAccessToken = (token: string | null) => {
    accessToken = token;
    if (token) {
        localStorage.setItem("accessToken", token);
        // Cookie max-age matches JWT expiry: 8h in dev, 15min in prod.
        const maxAge = process.env.NODE_ENV === 'production' ? 900 : 28800;
        document.cookie = `accessToken=${token}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } else {
        localStorage.removeItem("accessToken");
        document.cookie = "accessToken=; path=/; max-age=0; SameSite=Lax";
    }
};

export const getAccessToken = (): string | null => {
    if (accessToken) return accessToken;
    if (typeof window !== "undefined") {
        accessToken = localStorage.getItem("accessToken");
    }
    return accessToken;
};

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken();
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors & token refresh
// Error Translation Helper
const translateError = (error: AxiosError): string => {
    const status = error.response?.status;
    const data: any = error.response?.data;
    const message = Array.isArray(data?.message) 
        ? data.message.join(', ') 
        : (data?.message || error.message);

    const url = error.config?.url;
    // 1. Network / Server Reachability Errors
    if (message === 'Network Error') {
        return 'Lỗi kết nối mạng. Vui lòng kiểm tra đường truyền internet hoặc server chưa khởi động.';
    }

    // 2. HTTP Status Code Mapping
    switch (status) {
        case 400:
            if (message === 'Bad Request') return 'Yêu cầu không hợp lệ.';
            return message;
        case 401:
            if (url?.includes('/auth/login') || url?.includes('/login')) {
                return 'Tên đăng nhập hoặc mật khẩu không chính xác.';
            }
            if (url?.includes('/users/verify-admin-password') || (error.config?.method === 'patch' && url?.match(/\/users\/[^/]+$/))) {
                return typeof message === 'string' ? message : 'Mật khẩu xác nhận không chính xác.';
            }
            return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        case 403:
            return message || 'Bạn không có quyền thực hiện thao tác này.';
        case 404:
            return 'Không tìm thấy dữ liệu yêu cầu.';
        case 500:
            return `Đã xảy ra lỗi hệ thống (${message}). Vui lòng liên hệ quản trị viên.`;
        case 502:
        case 503:
        case 504:
            return 'Server đang bảo trì hoặc quá tải. Vui lòng thử lại sau.';
        default:
            if (typeof message === 'string') {
                if (message.includes('Internal server error')) return `Đã xảy ra lỗi nội bộ hệ thống (${message}).`;
                if (message.includes('Unauthorized')) return 'Không có quyền truy cập.';
            }
            return message || 'Đã xảy ra lỗi không xác định.';
    }
};

// Response interceptor - handle errors & token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Handle 401 - try to refresh token
        if (error.response?.status === 401) {
            // Skip auth logic for login requests
            if (error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/login')) {
                return Promise.reject(error);
            }

            // Skip redirect for endpoints that use adminPassword confirmation (business 401, not session expiry)
            // e.g. PATCH /users/:id returns 401 when admin password is wrong, OR verify-admin-password
            const isAdminPasswordEndpoint =
                (error.config?.method === 'patch' && error.config?.url?.match(/\/users\/[^/]+$/)) ||
                (error.config?.method === 'post' && error.config?.url?.includes('/users/verify-admin-password'));
            if (isAdminPasswordEndpoint) {
                return Promise.reject(error);
            }

            if (!originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    const refreshToken = localStorage.getItem("refreshToken");
                    if (refreshToken) {
                        // Use singleton lock: only ONE refresh request at a time.
                        // All concurrent 401s share the same promise.
                        if (!refreshPromise) {
                            refreshPromise = new Promise<string>((resolve, reject) => {
                                // 10-second timeout prevents the lock from getting stuck on network failure
                                const timeout = setTimeout(() => {
                                    refreshPromise = null;
                                    reject(new Error('Token refresh timed out'));
                                }, 10000);

                                axios
                                    .post(`${API_BASE_URL}/auth/refresh`, { refreshToken })
                                    .then(r => {
                                        clearTimeout(timeout);
                                        const newToken: string = r.data.accessToken;
                                        setAccessToken(newToken);
                                        resolve(newToken);
                                    })
                                    .catch(err => {
                                        clearTimeout(timeout);
                                        reject(err);
                                    })
                                    .finally(() => {
                                        refreshPromise = null;
                                    });
                            });
                        }

                        const newToken = await refreshPromise;
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        }
                        return apiClient(originalRequest);
                    }
                } catch (refreshError) {
                    refreshPromise = null;
                    console.error("Token refresh failed:", refreshError);
                }
            }

            // If we reach here, it means:
            // 1. Retry already attempted and failed again
            // 2. No refresh token available
            // 3. Refresh attempt failed (catch block)

            if (typeof window !== "undefined") {
                // If we are ON the login page
                if (window.location.pathname.includes('/login')) {
                    // Critical Fix: If we get 401 on login page (from background requests), 
                    // we MUST clear the invalid tokens to prevent them from being sent again.
                    // BUT we suppress the error to not crash the login form.
                    setAccessToken(null);
                    localStorage.removeItem("refreshToken");
                    return new Promise(() => { });
                }

                // If NOT on login page, force logout and redirect
                setAccessToken(null);
                localStorage.removeItem("refreshToken");
                window.location.href = "/login";
                return new Promise(() => { });
            }
        }

        // Translate the error message for the consumer
        const translatedMessage = translateError(error);

        // Mutate the error object to carry the translated message
        // This ensures toast notifications using error.message get the Vietnamese text
        error.message = translatedMessage;

        if (error.response && error.response.data && typeof error.response.data === 'object') {
            // specific for NestJS standard error response { statusCode, message, error }
            (error.response.data as any).message = translatedMessage;
        }

        // Log other errors
        if (error.response?.status !== 401) {
            // console.error(`API Error [${error.response?.status}] ${originalRequest?.url}:`, error.response?.data);
        }

        return Promise.reject(error);
    }
);

// Generic API response type
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
    };
}

// Paginated response type
export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// Helper function for GET requests
export async function apiGet<T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.get<T>(url, { ...config, params });
    return response.data;
}

// Helper function for POST requests
export async function apiPost<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.post<T>(url, data, config);
    return response.data;
}

// Helper function for PATCH requests
export async function apiPatch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.patch<T>(url, data, config);
    return response.data;
}

// Helper function for PUT requests
export async function apiPut<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.put<T>(url, data, config);
    return response.data;
}

// Helper function for DELETE requests
export async function apiDelete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await apiClient.delete<T>(url, config);
    return response.data;
}

export const authApi = {
    forgotPassword: (email: string) =>
        apiPost<{ success: boolean }>('/auth/forgot-password', { email }),

    verifyOtp: (target: string, code: string) =>
        apiPost<{ valid: boolean }>('/auth/verify-otp', { target, code }),

    resetPassword: (target: string, code: string, newPassword: string) =>
        apiPost<{ message: string }>('/auth/reset-password', { target, code, newPassword }),

    verifyPassword: (password: string) =>
        apiPost<{ valid: boolean }>('/auth/verify-password', { password }),
};

// Request API Helpers
export const requestApi = {
    getAll: () => apiGet<any[]>('/requests'),
    getPending: () => apiGet<any[]>('/requests/pending'),
    create: (data: any) => apiPost<any>('/requests', data),
    getOne: (id: string) => apiGet<any>(`/requests/${id}`),
    submit: (id: string) => apiPost<any>(`/requests/${id}/submit`),
    approve: (id: string, comment?: string) => apiPost<any>(`/requests/${id}/approve`, { comment }),
    reject: (id: string, comment?: string) => apiPost<any>(`/requests/${id}/reject`, { comment }),
};

// KPI API Helpers
export const kpiApi = {
    // Periods
    getPeriods: () => apiGet<any[]>('/kpi/periods'),
    getActivePeriod: () => apiGet<any>('/kpi/periods/active'),
    createPeriod: (data: any) => apiPost<any>('/kpi/periods', data),
    updatePeriod: (id: string, data: any) => apiPost<any>(`/kpi/periods/${id}`, data),
    deletePeriod: (id: string) => apiDelete<any>(`/kpi/periods/${id}`),
    getPeriodSummary: (periodId: string) => apiGet<any>(`/kpi/periods/${periodId}/summary`),
    getKPIsByPeriod: (periodId: string, isDeleted: boolean = false) => apiGet<any[]>(`/kpi/periods/${periodId}/kpis${isDeleted ? '?isDeleted=true' : ''}`),
    // Employee KPIs
    getEmployeeKPIs: (employeeId: string) => apiGet<any[]>(`/kpi/employee/${employeeId}`),
    getOne: (id: string) => apiGet<any>(`/kpi/${id}`),
    create: (data: any) => apiPost<any>('/kpi', data),
    update: (id: string, data: any) => apiPost<any>(`/kpi/${id}`, data),
    submit: (id: string) => apiPost<any>(`/kpi/${id}/submit`),
    review: (id: string) => apiPost<any>(`/kpi/${id}/review`),
    finalize: (id: string) => apiPost<any>(`/kpi/${id}/finalize`),
    delete: (id: string) => apiDelete<any>(`/kpi/${id}`),
    restore: (id: string) => apiPost<any>(`/kpi/${id}/restore`),
    forceDelete: (id: string) => apiDelete<any>(`/kpi/${id}/force`),
};

// Car Booking API Helpers
export const carBookingApi = {
    // Cars
    getCars: () => apiGet<any[]>('/car-booking/cars'),
    getAvailableCars: (startTime: string, endTime: string) =>
        apiGet<any[]>(`/car-booking/cars/available?startTime=${startTime}&endTime=${endTime}`),
    getCar: (id: string) => apiGet<any>(`/car-booking/cars/${id}`),
    createCar: (data: any) => apiPost<any>('/car-booking/cars', data),
    updateCar: (id: string, data: any) => apiPost<any>(`/car-booking/cars/${id}`, data),
    deleteCar: (id: string) => apiDelete<any>(`/car-booking/cars/${id}`),

    // Bookings
    getMyBookings: () => apiGet<any[]>('/car-booking/bookings'),
    getUpcoming: () => apiGet<any[]>('/car-booking/bookings/upcoming'),
    getBooking: (id: string) => apiGet<any>(`/car-booking/bookings/${id}`),
    createBooking: (data: any) => apiPost<any>('/car-booking/bookings', data),
    updateBooking: (id: string, data: any) => apiPost<any>(`/car-booking/bookings/${id}`, data),
    cancelBooking: (id: string) => apiPost<any>(`/car-booking/bookings/${id}/cancel`),

    // Stats
    getStats: () => apiGet<any>('/car-booking/statistics'),
};

// News API Helpers
export const newsApi = {
    // Public
    getPublished: (take?: number) => apiGet<any[]>(`/news/public${take ? `?take=${take}` : ''}`),
    getPublic: (id: string) => apiGet<any>(`/news/public/${id}`),

    // Categories
    getCategories: () => apiGet<any[]>('/news/categories'),
    createCategory: (data: any) => apiPost<any>('/news/categories', data),
    deleteCategory: (id: string) => apiDelete<any>(`/news/categories/${id}`),

    // Articles
    getArticles: () => apiGet<any[]>('/news/articles'),
    getArticle: (id: string) => apiGet<any>(`/news/articles/${id}`),
    createArticle: (data: any) => apiPost<any>('/news/articles', data),
    updateArticle: (id: string, data: any) => apiPut<any>(`/news/articles/${id}`, data),
    publish: (id: string) => apiPost<any>(`/news/articles/${id}/publish`),
    unpublish: (id: string) => apiPost<any>(`/news/articles/${id}/unpublish`),
    deleteArticle: (id: string) => apiDelete<any>(`/news/articles/${id}`),
};

// Tasks API Helpers
export const tasksApi = {
    getMyTasks: () => apiGet<any[]>('/tasks'),
    getAssignedToMe: () => apiGet<any[]>('/tasks/assigned-to-me'),
    getAssignedByMe: () => apiGet<any[]>('/tasks/assigned-by-me'),
    getStats: () => apiGet<any>('/tasks/stats'),
    getTask: (id: string) => apiGet<any>(`/tasks/${id}`),
    create: (data: any) => apiPost<any>('/tasks', data),
    update: (id: string, data: any) => apiPost<any>(`/tasks/${id}`, data),
    updateStatus: (id: string, status: string) => apiPost<any>(`/tasks/${id}/status/${status}`),
    delete: (id: string) => apiDelete<any>(`/tasks/${id}`),
    addComment: (taskId: string, content: string) => apiPost<any>(`/tasks/${taskId}/comments`, { content }),
    deleteComment: (commentId: string) => apiDelete<any>(`/tasks/comments/${commentId}`),
};
// Projects API Helpers
export const projectsApi = {
    getAll: () => apiGet<any[]>('/projects'),
    getOne: (id: string) => apiGet<any>(`/projects/${id}`),
    create: (data: any) => apiPost<any>('/projects', data),
    update: (id: string, data: any) => apiPatch<any>(`/projects/${id}`, data),
    delete: (id: string) => apiDelete<any>(`/projects/${id}`),

    // Tasks
    createTask: (data: any) => apiPost<any>('/projects/tasks', data),
    updateTask: (id: string, data: any) => apiPatch<any>(`/projects/tasks/${id}`, data),
    deleteTask: (id: string) => apiDelete<any>(`/projects/tasks/${id}`),

    // Dependencies
    createDependency: (data: any) => apiPost<any>('/projects/dependencies', data),
    deleteDependency: (id: string) => apiDelete<any>(`/projects/dependencies/${id}`),
};

// Upload API Helpers
export const uploadApi = {
    upload: (file: File, folder?: string, oldFileId?: string) => {
        const formData = new FormData();
        if (folder) formData.append('folder', folder);
        if (oldFileId) formData.append('oldFileId', oldFileId);
        formData.append('file', file);
        return apiPost<any>('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    },
    getFileUrl: (fileId: string) => `${API_BASE_URL}/files/${fileId}`,
};

// ==========================================
// THỰC ĐƠN & SUẤT ĂN (MEAL MANAGEMENT)
// ==========================================
export const mealApi = {
    // Nhân viên
    getSessions: async () => {
        return apiClient.get(`/api/v1/meals/sessions`);
    },
    getMenu: async (date: string) => {
        return apiClient.get(`/api/v1/meals/menu?date=${date}`);
    },
    getMyRegistrations: async (from?: string, to?: string) => {
        const params = new URLSearchParams();
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        return apiClient.get(`/api/v1/meals/my-registrations?${params.toString()}`);
    },
    register: async (data: { sessionId: string; date: string; note?: string }) => {
        return apiClient.post(`/api/v1/meals/register`, data);
    },
    cancel: async (id: string) => {
        return apiClient.post(`/api/v1/meals/cancel/${id}`);
    },

    // Quản trị (Admin)
    getDailyStats: async (date: string) => {
        return apiClient.get(`/api/v1/meals/admin/daily?date=${date}`);
    },
    getRegistrationsByDate: async (date: string, sessionId?: string) => {
        const params = new URLSearchParams();
        params.append('date', date);
        if (sessionId) params.append('sessionId', sessionId);
        return apiClient.get(`/api/v1/meals/admin/registrations?${params.toString()}`);
    },
    getMonthlyReport: async (month: string) => {
        return apiClient.get(`/api/v1/meals/admin/monthly?month=${month}`);
    },
    updateSession: async (id: string, data: any) => {
        return apiClient.patch(`/api/v1/meals/sessions/${id}`, data);
    },
    upsertMenu: async (data: any) => {
        return apiClient.post(`/api/v1/meals/menu`, data);
    },
};
