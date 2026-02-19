const PAGE_TITLES: Record<string, { title: string; category: string }> = {
    // Dashboard
    '/employee': { title: 'Dashboard', category: 'Overview' },
    '/org-admin': { title: 'Dashboard', category: 'Overview' },

    // Main
    '/employee/orgProfile': { title: 'Organization Profile', category: 'Main' },
    '/employee/sites': { title: 'Sites', category: 'Main' },
    '/employee/departments': { title: 'Departments', category: 'Main' },
    '/employee/roles': { title: 'Roles', category: 'Main' },
    '/employee/attendance-rules': { title: 'Policies', category: 'Main' },
    '/employee/attendance-config': { title: 'Attendance Config', category: 'Main' },
    '/employee/holiday-calendar': { title: 'Holiday Calendar', category: 'Main' },

    // Management
    '/employee/employee-management': { title: 'Employees', category: 'Management' },
    '/employee/employee-sites': { title: 'Employee Sites', category: 'Management' },
    '/employee/leave-requests': { title: 'Leave Requests', category: 'Management' },
    '/employee/regularize-requests': { title: 'Regularize Requests', category: 'Management' },
    '/employee/attendance-dashboard': { title: 'Attendance Dashboard', category: 'Management' },
    '/employee/petty-cash': { title: 'Petty Cash', category: 'Management' },
    '/employee/wallet-expenses': { title: 'Wallet Expenses', category: 'Management' },
    '/employee/wallet-config': { title: 'Wallet Config', category: 'Management' },
    '/employee/wallet-topups': { title: 'Wallet Topups', category: 'Management' },
    '/employee/verification-issues': { title: 'Verification Issues', category: 'Management' },
    '/employee/payroll': { title: 'Payroll', category: 'Management' },
    '/employee/insurance': { title: 'Insurance', category: 'Management' },

    // Insurance
    '/employee/insurance/dashboard': { title: 'Dashboard', category: 'Insurance' },
    '/employee/insurance/providers': { title: 'Providers', category: 'Insurance' },
    '/employee/insurance/policies': { title: 'Policies', category: 'Insurance' },
    '/employee/insurance/enrollment': { title: 'Enrollment', category: 'Insurance' },
    '/employee/insurance/dependents': { title: 'Dependents', category: 'Insurance' },
    '/employee/insurance/beneficiaries': { title: 'Beneficiaries', category: 'Insurance' },

    // Salary Advance
    '/employee/salary-advance/requests': { title: 'All Requests', category: 'Salary Advance' },
    '/employee/salary-advance/approvals': { title: 'Approval Queue', category: 'Salary Advance' },
    '/employee/salary-advance/repayments': { title: 'Repayment Schedule', category: 'Salary Advance' },
    '/employee/salary-advance/analytics': { title: 'Analytics', category: 'Salary Advance' },
    '/employee/salary-advance/policy': { title: 'Policy Configuration', category: 'Salary Advance' },

    // Task
    '/employee/tasks': { title: 'Templates', category: 'Task' },
    '/employee/task-assignments': { title: 'Assignments', category: 'Task' },
    '/employee/task-dashboard': { title: 'Dashboard', category: 'Task' },
    '/employee/dashboard-builder': { title: 'Builder', category: 'Task' },

    // Inventory - Master Data
    '/employee/inventory/onboarding': { title: 'Onboarding', category: 'Inventory' },
    '/employee/inventory/sites': { title: 'Site Config', category: 'Inventory' },
    '/employee/inventory/categories': { title: 'Categories', category: 'Inventory' },
    '/employee/inventory/subcategories': { title: 'Subcategories', category: 'Inventory' },
    '/employee/inventory/vendors': { title: 'Vendors', category: 'Inventory' },
    '/employee/inventory/items': { title: 'Items', category: 'Inventory' },

    // Inventory - CORE
    '/employee/inventory/stores': { title: 'Store Selection', category: 'Inventory' },
    '/employee/inventory/stock': { title: 'Store Stock', category: 'Inventory' },
    '/employee/inventory/batches': { title: 'Store Batch', category: 'Inventory' },
    '/employee/inventory/serials': { title: 'Store Serials', category: 'Inventory' },
    '/employee/inventory/ledger': { title: 'Stock Ledger', category: 'Inventory' },

    // Inventory - Transactions
    '/employee/inventory/grn': { title: 'GRN', category: 'Inventory' },
    '/employee/rfq': { title: 'RFQ', category: 'Inventory' },
    '/employee/pr': { title: 'Purchase Request', category: 'Inventory' },

    // Public Portal
    '/careers': { title: 'Careers Portal', category: 'Public' },
    '/interview/apply': { title: 'Job Application', category: 'Public Request' },
};

export function getPageTitle(pathname: string, role: 'employee' | 'org-admin') {
    // Try exact match first
    if (PAGE_TITLES[pathname]) {
        const { title, category } = PAGE_TITLES[pathname];
        return { title: `${title}`, description: category };
    }

    // Fallback for dynamic routes or unknown paths
    const parts = pathname.split('/').filter(Boolean);

    if (pathname.startsWith('/careers')) {
        return { title: 'Careers Portal', description: 'Public' };
    }

    const lastPart = parts[parts.length - 1];

    if (!lastPart) {
        return { title: 'Dashboard', description: 'Overview' };
    }

    // Capitalize and clean up
    const title = lastPart.charAt(0).toUpperCase() + lastPart.slice(1).replace(/-/g, ' ');
    return { title, description: 'Page' };
}
