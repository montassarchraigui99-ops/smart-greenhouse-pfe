export const formatTimestamp = (iso: string): string => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
};

export const formatSensorValue = (value: number, unit: string): string => {
    if (unit === 'lux' && value >= 1000) {
        return `${(value / 1000).toFixed(1)}k ${unit}`;
    }
    return `${value} ${unit}`;
};

export const getStatusColor = (status: 'normal' | 'warning' | 'critical'): string => {
    const map = {
        normal: '#16A34A',
        warning: '#F59E0B',
        critical: '#EF4444',
    };
    return map[status];
};

export const getSeverityColor = (severity: 'critical' | 'warning' | 'info'): string => {
    const map = {
        critical: '#EF4444',
        warning: '#F59E0B',
        info: '#3B82F6',
    };
    return map[severity];
};

export const getSeverityBgColor = (severity: 'critical' | 'warning' | 'info'): string => {
    const map = {
        critical: '#FEF2F2',
        warning: '#FFFBEB',
        info: '#EFF6FF',
    };
    return map[severity];
};
