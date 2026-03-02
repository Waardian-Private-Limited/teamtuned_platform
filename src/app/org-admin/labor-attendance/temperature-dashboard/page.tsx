import DeviceTemperatureDashboard from '@/components/labor/DeviceTemperatureDashboard';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Device Health Dashboard | TeamTuned',
    description: 'Monitor Kiosk Hardware Temperature',
};

export default function DeviceHealthPage() {
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Device Health Dashboard</h1>
            <DeviceTemperatureDashboard />
        </div>
    );
}
