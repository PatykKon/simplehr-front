import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login.component';
import { RegisterComponent } from './components/auth/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { WorkScheduleListComponent } from './components/work-schedule/work-schedule-list.component';
import { LeaveRequestsListComponent } from './components/leave-requests/leave-requests-list.component';
import { AdminPanelComponent } from './components/admin/admin-panel.component';
import { AddEmployeeComponent } from './components/admin/add-employee.component';
import { EmployeeListComponent } from './components/admin/employee-list.component';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/public/landing.component').then(m => m.LandingComponent)
  },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'leave',
    loadComponent: () => import('./components/leave-requests/leave-hub.component').then(m => m.LeaveHubComponent),
    canActivate: [AuthGuard]
  },
  // Ewidencja czasu pracy
  {
    path: 'work-time',
    loadComponent: () => import('./components/work-time/work-time-calendar.component').then(m => m.WorkTimeCalendarComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'work-time/config',
    loadComponent: () => import('./components/work-time/work-time-config.component').then(m => m.WorkTimeConfigComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'work-time/day/:date',
    loadComponent: () => import('./components/work-time/work-time-day.component').then(m => m.WorkTimeDayComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'work-time-records',
    loadComponent: () => import('./components/work-time-record/work-time-record-list.component').then(m => m.WorkTimeRecordListComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'work-time-records/:id',
    loadComponent: () => import('./components/work-time-record/work-time-record-details.component').then(m => m.WorkTimeRecordDetailsComponent),
    canActivate: [AuthGuard]
  },
  // Routing dla grafików pracy
  { 
    path: 'schedules', 
    component: WorkScheduleListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'schedules/hub',
    loadComponent: () => import('./components/work-schedule/schedules-hub.component').then(m => m.SchedulesHubComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'schedules/published',
    component: WorkScheduleListComponent,
    canActivate: [AuthGuard],
    data: { presetStatus: 'PUBLISHED', title: 'Opublikowane grafiki' }
  },
  {
    path: 'schedules/create',
    loadComponent: () => import('./components/work-schedule/work-schedule-create.component').then(m => m.WorkScheduleCreateComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR', 'MANAGER'] }
  },
  {
    path: 'schedules/:id/edit',
    loadComponent: () => import('./components/work-schedule/work-schedule-create.component').then(m => m.WorkScheduleCreateComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR', 'MANAGER'] }
  },
  {
    path: 'schedules/:id',
    loadComponent: () => import('./components/work-schedule/work-schedule-details.component').then(m => m.WorkScheduleDetailsComponent),
    canActivate: [AuthGuard]
  },
  // Routing dla HR (musi być przed bardziej ogólnymi trasami)
  {
    path: 'hr/leave-management',
    loadComponent: () => import('./components/leave-requests/hr-management/hr-management.component').then(m => m.HrManagementComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR', 'MANAGER'] }
  },
  // Routing dla wniosków urlopowych
  {
    path: 'leave-requests',
    component: LeaveRequestsListComponent,
    canActivate: [AuthGuard]
  },
  {
    path: 'leave-requests/create',
    loadComponent: () => import('./components/leave-requests/create-leave-request.component').then(m => m.CreateLeaveRequestComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'leave-requests/:id',
    loadComponent: () => import('./components/leave-requests/leave-proposal-details.component').then(m => m.LeaveProposalDetailsComponent),
    canActivate: [AuthGuard]
  },
  {
    path: 'leave-requests/:id/edit',
    loadComponent: () => import('./components/leave-requests/edit-leave-proposal.component').then(m => m.EditLeaveProposalComponent),
    canActivate: [AuthGuard]
  },
  // Routing dla panelu administratora
  {
    path: 'admin',
    component: AdminPanelComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR'] }
  },
  {
    path: 'admin/employees/add',
    component: AddEmployeeComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR'] }
  },
  {
    path: 'admin/employees/list',
    component: EmployeeListComponent,
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR'] }
  },
  {
    path: 'admin/employees/import',
    loadComponent: () => import('./components/admin/import-employees.component').then(m => m.ImportEmployeesComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR'] }
  },
  {
    path: 'admin/employees/:id',
    loadComponent: () => import('./components/admin/employee-details.component').then(m => m.EmployeeDetailsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR', 'MANAGER'] }
  },
  {
    path: 'admin/employees/edit/:id',
    loadComponent: () => import('./components/admin/edit-employee.component').then(m => m.EditEmployeeComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR'] }
  },
  {
    path: 'admin/employees/:id/leave-balances',
    loadComponent: () => import('./components/admin/manage-leave-balances.component').then(m => m.ManageLeaveBalancesComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR'] }
  },
  {
    path: 'admin/schedule-configs',
    loadComponent: () => import('./components/admin/schedule-configs/schedule-configs.component').then(m => m.ScheduleConfigsComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR'] }
  },
  {
    path: 'admin/leave-configuration',
    loadComponent: () => import('./components/admin/leave-configuration.component').then(m => m.LeaveConfigurationComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN'] }
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./components/admin/users-admin.component').then(m => m.UsersAdminComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR'] }
  },
  {
    path: 'admin/work-time',
    loadComponent: () => import('./components/admin/work-time-admin.component').then(m => m.WorkTimeAdminComponent),
    canActivate: [AuthGuard, RoleGuard],
    data: { requiredRoles: ['ADMIN', 'HR'] }
  },
  { path: '**', redirectTo: '/' }
];
