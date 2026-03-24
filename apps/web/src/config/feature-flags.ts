/**
 * Feature Flags Configuration
 * 
 * Centralized feature flag management for enabling/disabling features
 * without code deployment.
 * 
 * Usage:
 * - In components: const { isEnabled } = useFeatureFlag('FEATURE_NAME')
 * - In logic: if (featureFlags.FEATURE_NAME) { ... }
 */

export interface FeatureFlag {
    name: string;
    description: string;
    enabled: boolean;
    enabledFor?: {
        roles?: string[];
        userIds?: string[];
        percentage?: number; // 0-100 for gradual rollout
    };
}

// Default feature flags configuration
export const defaultFeatureFlags: Record<string, FeatureFlag> = {
    // Core Modules
    ENABLE_HR_MODULE: {
        name: 'HR Module',
        description: 'Enable HR employee management module',
        enabled: true,
    },
    ENABLE_LEAVE_MODULE: {
        name: 'Leave Module',
        description: 'Enable leave request and approval module',
        enabled: true,
    },
    ENABLE_BOOKING_MODULE: {
        name: 'Booking Module',
        description: 'Enable meeting room booking module',
        enabled: true,
    },
    ENABLE_DOCUMENTS_MODULE: {
        name: 'Documents Module',
        description: 'Enable documents and policies module',
        enabled: true,
    },

    // Future Modules (disabled by default)
    ENABLE_PAYROLL_MODULE: {
        name: 'Payroll Module',
        description: 'Enable payroll management (coming soon)',
        enabled: false,
        enabledFor: { roles: ['ADMIN'] }, // Only admins can see it for testing
    },
    ENABLE_TIMESHEET_MODULE: {
        name: 'Timesheet Module',
        description: 'Enable timesheet tracking (coming soon)',
        enabled: false,
    },
    ENABLE_RECRUITMENT_MODULE: {
        name: 'Recruitment Module',
        description: 'Enable recruitment management (coming soon)',
        enabled: false,
    },
    ENABLE_TRAINING_MODULE: {
        name: 'Training Module',
        description: 'Enable training and development (coming soon)',
        enabled: false,
    },

    // Feature Enhancements
    ENABLE_DARK_MODE: {
        name: 'Dark Mode',
        description: 'Enable dark mode theme switcher',
        enabled: true,
    },
    ENABLE_NOTIFICATIONS: {
        name: 'Notifications',
        description: 'Enable in-app notifications',
        enabled: true,
    },
    ENABLE_REALTIME_UPDATES: {
        name: 'Realtime Updates',
        description: 'Enable WebSocket realtime updates',
        enabled: false,
    },
    ENABLE_ADVANCED_SEARCH: {
        name: 'Advanced Search',
        description: 'Enable advanced search with filters',
        enabled: true,
    },
    ENABLE_EXPORT_EXCEL: {
        name: 'Export to Excel',
        description: 'Enable data export to Excel',
        enabled: true,
    },
    ENABLE_AUDIT_LOGS: {
        name: 'Audit Logs',
        description: 'Enable audit log viewing for HR/Admin',
        enabled: true,
        enabledFor: { roles: ['ADMIN', 'HR'] },
    },

    // Experimental Features
    ENABLE_AI_ASSISTANT: {
        name: 'AI Assistant',
        description: 'Enable AI-powered assistance (experimental)',
        enabled: false,
        enabledFor: { percentage: 10 }, // 10% rollout
    },
    ENABLE_BPMN_EDITOR: {
        name: 'BPMN Editor',
        description: 'Enable visual process diagram editor',
        enabled: false,
    },
};

export type FeatureFlagKey = keyof typeof defaultFeatureFlags;
