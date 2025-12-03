import { toast } from 'react-hot-toast';

export const showSuccess = (message: string) => {
    toast.success(message, {
        duration: 3000,
        position: 'top-right',
        style: {
            background: '#10B981',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
        },
    });
};

export const showError = (message: string) => {
    toast.error(message, {
        duration: 4000,
        position: 'top-right',
        style: {
            background: '#EF4444',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
        },
    });
};

export const showInfo = (message: string) => {
    toast(message, {
        duration: 3000,
        position: 'top-right',
        icon: 'ℹ️',
        style: {
            background: '#3B82F6',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
        },
    });
};

export const showWarning = (message: string) => {
    toast(message, {
        duration: 3500,
        position: 'top-right',
        icon: '⚠️',
        style: {
            background: '#F59E0B',
            color: '#fff',
            padding: '16px',
            borderRadius: '8px',
        },
    });
};
