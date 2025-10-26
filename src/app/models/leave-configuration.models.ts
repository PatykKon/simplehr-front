import { LeaveType } from './leave-proposal.models';

/**
 * Konfiguracja typu urlopu - odpowiedź z API
 */
export interface LeaveConfigurationResponse {
  id: number;
  leaveType: LeaveType;
  name: string;
  description?: string;
  requiresApproval: boolean;
  autoApprove?: boolean;
  daysPerYear?: number;
  minimumAdvanceDays?: number;
  maximumAdvanceDays?: number;
  minimumDurationDays?: number;
  maximumDurationDays?: number;
  canBeSplit?: boolean;
  requiresDocument?: boolean;
  isPaid?: boolean;
  carryOverAllowed?: boolean;
  carryOverMaxDays?: number;
  active: boolean;
  configurationRules?: string;
  // Ustawienia akceptacji
  requiredApprovals?: number;
  approverRoles?: string[];
  canApproveOwnRequests?: boolean;
}

/**
 * Żądanie utworzenia/aktualizacji konfiguracji typu urlopu
 */
export interface LeaveConfigurationRequest {
  leaveType: LeaveType;
  name: string;
  description?: string;
  requiresApproval: boolean;
  autoApprove?: boolean;
  daysPerYear?: number;
  minimumAdvanceDays?: number;
  maximumAdvanceDays?: number;
  minimumDurationDays?: number;
  maximumDurationDays?: number;
  canBeSplit?: boolean;
  requiresDocument?: boolean;
  isPaid?: boolean;
  carryOverAllowed?: boolean;
  carryOverMaxDays?: number;
  active?: boolean;
  configurationRules?: string;
  // Ustawienia akceptacji
  requiredApprovals?: number;
  approverRoles?: string[];
  canApproveOwnRequests?: boolean;
}

/**
 * Opcje konfiguracji dla różnych typów urlopów
 */
export const LEAVE_CONFIGURATION_DEFAULTS = {
  [LeaveType.ANNUAL]: {
    name: 'Urlop wypoczynkowy',
    description: 'Roczny płatny urlop wypoczynkowy',
    requiresApproval: true,
    autoApprove: false,
    daysPerYear: 26,
    minimumAdvanceDays: 7,
    maximumAdvanceDays: 365,
    minimumDurationDays: 1,
    maximumDurationDays: 14,
    canBeSplit: true,
    requiresDocument: false,
    isPaid: true,
    carryOverAllowed: true,
    carryOverMaxDays: 5,
    active: true,
    requiredApprovals: 1,
    approverRoles: ['MANAGER', 'HR', 'ADMIN'],
    canApproveOwnRequests: false,
    icon: '🏖️',
    color: '#3b82f6'
  },
  [LeaveType.SICK]: {
    name: 'Zwolnienie lekarskie',
    description: 'Urlop chorobowy z zaświadczeniem lekarskim',
    requiresApproval: false,
    autoApprove: true,
    daysPerYear: 30,
    minimumAdvanceDays: 0,
    maximumAdvanceDays: 0,
    minimumDurationDays: 1,
    maximumDurationDays: 183,
    canBeSplit: true,
    requiresDocument: true,
    isPaid: true,
    carryOverAllowed: false,
    carryOverMaxDays: 0,
    active: true,
    requiredApprovals: 0,
    approverRoles: ['HR', 'ADMIN'],
    canApproveOwnRequests: true,
    icon: '🏥',
    color: '#ef4444'
  },
  [LeaveType.UNPAID]: {
    name: 'Urlop bezpłatny',
    description: 'Urlop bezpłatny na wniosek pracownika',
    requiresApproval: true,
    autoApprove: false,
    daysPerYear: 365,
    minimumAdvanceDays: 14,
    maximumAdvanceDays: 90,
    minimumDurationDays: 1,
    maximumDurationDays: 90,
    canBeSplit: true,
    requiresDocument: false,
    isPaid: false,
    carryOverAllowed: false,
    carryOverMaxDays: 0,
    active: true,
    requiredApprovals: 2,
    approverRoles: ['MANAGER', 'HR', 'ADMIN'],
    canApproveOwnRequests: false,
    icon: '💸',
    color: '#64748b'
  },
  [LeaveType.PARENTAL]: {
    name: 'Urlop rodzicielski',
    description: 'Urlop rodzicielski po urodzeniu dziecka',
    requiresApproval: true,
    autoApprove: false,
    daysPerYear: 365,
    minimumAdvanceDays: 21,
    maximumAdvanceDays: 90,
    minimumDurationDays: 8,
    maximumDurationDays: 365,
    canBeSplit: true,
    requiresDocument: true,
    isPaid: true,
    carryOverAllowed: false,
    carryOverMaxDays: 0,
    active: true,
    requiredApprovals: 1,
    approverRoles: ['HR', 'ADMIN'],
    canApproveOwnRequests: false,
    icon: '👶',
    color: '#8b5cf6'
  },
  [LeaveType.MATERNITY]: {
    name: 'Urlop macierzyński',
    description: 'Urlop macierzyński dla matek',
    requiresApproval: false,
    autoApprove: true,
    daysPerYear: 365,
    minimumAdvanceDays: 0,
    maximumAdvanceDays: 0,
    minimumDurationDays: 112,
    maximumDurationDays: 112,
    canBeSplit: false,
    requiresDocument: true,
    isPaid: true,
    carryOverAllowed: false,
    carryOverMaxDays: 0,
    active: true,
    requiredApprovals: 0,
    approverRoles: ['HR', 'ADMIN'],
    canApproveOwnRequests: true,
    icon: '🤱',
    color: '#ec4899'
  },
  [LeaveType.PATERNITY]: {
    name: 'Urlop ojcowski',
    description: 'Urlop ojcowski dla ojców',
    requiresApproval: false,
    autoApprove: true,
    daysPerYear: 10,
    minimumAdvanceDays: 0,
    maximumAdvanceDays: 0,
    minimumDurationDays: 1,
    maximumDurationDays: 10,
    canBeSplit: true,
    requiresDocument: true,
    isPaid: true,
    carryOverAllowed: false,
    carryOverMaxDays: 0,
    active: true,
    requiredApprovals: 0,
    approverRoles: ['HR', 'ADMIN'],
    canApproveOwnRequests: true,
    icon: '👨‍👶',
    color: '#06b6d4'
  },
  [LeaveType.COMPASSIONATE]: {
    name: 'Urlop okolicznościowy',
    description: 'Urlop z powodu ważnych wydarzeń rodzinnych',
    requiresApproval: true,
    autoApprove: false,
    daysPerYear: 2,
    minimumAdvanceDays: 0,
    maximumAdvanceDays: 7,
    minimumDurationDays: 1,
    maximumDurationDays: 2,
    canBeSplit: true,
    requiresDocument: false,
    isPaid: true,
    carryOverAllowed: false,
    carryOverMaxDays: 0,
    active: true,
    requiredApprovals: 1,
    approverRoles: ['MANAGER', 'HR', 'ADMIN'],
    canApproveOwnRequests: false,
    icon: '💐',
    color: '#84cc16'
  },
  [LeaveType.STUDY]: {
    name: 'Urlop szkoleniowy',
    description: 'Urlop na cele szkoleniowe i edukacyjne',
    requiresApproval: true,
    autoApprove: false,
    daysPerYear: 6,
    minimumAdvanceDays: 30,
    maximumAdvanceDays: 90,
    minimumDurationDays: 1,
    maximumDurationDays: 6,
    canBeSplit: true,
    requiresDocument: true,
    isPaid: true,
    carryOverAllowed: false,
    carryOverMaxDays: 0,
    active: true,
    requiredApprovals: 1,
    approverRoles: ['MANAGER', 'HR', 'ADMIN'],
    canApproveOwnRequests: false,
    icon: '📚',
    color: '#f59e0b'
  },
  [LeaveType.SABBATICAL]: {
    name: 'Urlop sabbatical',
    description: 'Długoterminowy urlop sabbatical',
    requiresApproval: true,
    autoApprove: false,
    daysPerYear: 365,
    minimumAdvanceDays: 90,
    maximumAdvanceDays: 180,
    minimumDurationDays: 30,
    maximumDurationDays: 365,
    canBeSplit: false,
    requiresDocument: false,
    isPaid: false,
    carryOverAllowed: false,
    carryOverMaxDays: 0,
    active: false,
    requiredApprovals: 2,
    approverRoles: ['HR', 'ADMIN'],
    canApproveOwnRequests: false,
    icon: '🧘',
    color: '#6366f1'
  },
  [LeaveType.OTHER]: {
    name: 'Inny',
    description: 'Inne rodzaje urlopów',
    requiresApproval: true,
    autoApprove: false,
    daysPerYear: 5,
    minimumAdvanceDays: 1,
    maximumAdvanceDays: 30,
    minimumDurationDays: 1,
    maximumDurationDays: 5,
    canBeSplit: true,
    requiresDocument: false,
    isPaid: false,
    carryOverAllowed: false,
    carryOverMaxDays: 0,
    active: true,
    requiredApprovals: 1,
    approverRoles: ['MANAGER', 'HR', 'ADMIN'],
    canApproveOwnRequests: false,
    icon: '📋',
    color: '#64748b'
  }
};