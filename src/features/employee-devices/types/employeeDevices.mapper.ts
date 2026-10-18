import type {
  DeviceEventDto,
  DeviceSessionDto,
  EmployeeDeviceDetailDto,
  EmployeeDeviceDto,
  EmployeeDeviceListResponseDto,
} from './employeeDevices.dto';
import type {
  DeviceEvent,
  DeviceEventKind,
  DevicePlatform,
  DeviceSession,
  EmployeeDevice,
  EmployeeDeviceDetail,
  EmployeeDeviceListResult,
} from './employeeDevices.model';

const EVENT_KINDS: DeviceEventKind[] = ['registered', 'blocked', 'reset', 'allowed', 'logout'];

export function toPlatform(value: string | null | undefined): DevicePlatform {
  const v = String(value || '').toLowerCase();
  if (v === 'android' || v === 'ios' || v === 'web') return v;
  return 'unknown';
}

export function toEmployeeDevice(dto: EmployeeDeviceDto): EmployeeDevice {
  return {
    employeeId: dto.employeeId,
    userId: dto.userId,
    name: dto.name,
    code: dto.code,
    department: dto.department,
    phone: dto.phone,
    device: dto.device
      ? { platform: toPlatform(dto.device.platform), name: dto.device.name || 'Unnamed phone', boundAt: dto.device.boundAt }
      : null,
    singleDevice: Boolean(dto.singleDevice),
    lastSeenAt: dto.lastSeenAt,
    phoneSessions: dto.phoneSessions || 0,
    webSessions: dto.webSessions || 0,
    webLastSeenAt: dto.webLastSeenAt || null,
    pendingDevice: dto.pendingDevice
      ? { platform: toPlatform(dto.pendingDevice.platform), name: dto.pendingDevice.name || 'Unnamed phone', at: dto.pendingDevice.at }
      : null,
  };
}

export function toEmployeeDeviceList(dto: EmployeeDeviceListResponseDto): EmployeeDeviceListResult {
  return {
    employees: (dto.employees || []).map(toEmployeeDevice),
    page: dto.page,
    pageSize: dto.pageSize,
    total: dto.total,
    pages: dto.pages,
    summary: dto.summary || { registered: 0, pending: 0, none: 0 },
  };
}

function toSession(dto: DeviceSessionDto): DeviceSession {
  return {
    id: dto.id,
    type: dto.type === 'web' ? 'web' : 'mobile',
    name: dto.name || (dto.type === 'web' ? 'Web browser' : 'Phone'),
    ip: dto.ip,
    lastSeenAt: dto.lastSeenAt,
    createdAt: dto.createdAt,
    isRegisteredPhone: Boolean(dto.isRegisteredPhone),
  };
}

function toEvent(dto: DeviceEventDto): DeviceEvent {
  return {
    id: dto.id,
    event: (EVENT_KINDS as string[]).includes(dto.event) ? (dto.event as DeviceEventKind) : 'registered',
    deviceName: dto.deviceName,
    platform: toPlatform(dto.platform),
    actorName: dto.actorName,
    at: dto.at,
  };
}

export function toEmployeeDeviceDetail(dto: EmployeeDeviceDetailDto): EmployeeDeviceDetail {
  return {
    ...toEmployeeDevice(dto),
    sessions: {
      phone: (dto.sessions?.phone || []).map(toSession),
      web: (dto.sessions?.web || []).map(toSession),
    },
    events: (dto.events || []).map(toEvent),
  };
}
