const PAGE_TITLES: Record<string, { title: string; category: string }> = {
    // Self
    '/employee': { title: 'Dashboard', category: 'Self' },
    '/org-admin': { title: 'Dashboard', category: 'Self' },
    '/employee/approvals': { title: 'Approvals', category: 'Self' },
    '/org-admin/approvals': { title: 'Approvals', category: 'Self' },
    '/employee/notifications': { title: 'Notifications', category: 'Self' },
    '/org-admin/notifications': { title: 'Notifications', category: 'Self' },
    '/employee/birthdays': { title: 'Birthdays', category: 'Self' },
    '/employee/recruitment/referral-rewards': { title: 'Referral rewards', category: 'Recruitment' },
    '/org-admin/recruitment/referral-rewards': { title: 'Referral rewards', category: 'Recruitment' },
    '/org-admin/birthdays': { title: 'Birthdays', category: 'Self' },

    // Core
    '/employee/orgProfile': { title: 'Organization Profile', category: 'Tools' },
    '/employee/sites': { title: 'Sites', category: 'Management' },
    '/employee/departments': { title: 'Departments', category: 'Management' },
    '/org-admin/departments': { title: 'Departments', category: 'Management' },
    '/employee/roles': { title: 'Roles', category: 'Management' },
    '/employee/holidays': { title: 'Holidays', category: 'Attendance' },
    '/employee/leave': { title: 'My Leave', category: 'Attendance' },

    // Management
    '/employee/policies': { title: 'Policies', category: 'Management' },
    '/org-admin/policies': { title: 'Policies', category: 'Management' },
    '/employee/employee-management': { title: 'Employees', category: 'Management' },
    '/org-admin/onboarding-settings': { title: 'Onboarding Settings', category: 'Management' },
    '/org-admin/employee-onboarding': { title: 'Employee Onboarding', category: 'Management' },
    '/employee/employee-sites': { title: 'Site Assignment', category: 'Management' },
    '/employee/leave-requests': { title: 'Leave Management', category: 'Management' },
    '/employee/regularize-requests': { title: 'Regularize Requests', category: 'Management' },
    '/employee/attendance-dashboard': { title: 'Attendance Dashboard', category: 'Management' },
    '/employee/attendance': { title: 'Detailed Attendance', category: 'Attendance' },
    '/org-admin/attendance/employee': { title: 'Detailed Attendance', category: 'Attendance' },
    '/employee/petty-cash': { title: 'Petty Cash', category: 'Management' },
    '/employee/wallet-expenses': { title: 'Wallet Expenses', category: 'Management' },
    '/employee/wallet-config': { title: 'Wallet Config', category: 'Management' },
    '/employee/wallet-topups': { title: 'Wallet Topups', category: 'Management' },
    '/employee/verification-issues': { title: 'Verification Issues', category: 'Management' },
    '/employee/payroll': { title: 'Payroll', category: 'Management' },
    // Insurance
    '/employee/insurance': { title: 'Insurance', category: 'Management' },
    '/org-admin/insurance': { title: 'Insurance', category: 'Management' },
    '/employee/my-insurance': { title: 'My insurance', category: 'Self' },

    // Salary Advance
    '/employee/my-profile': { title: 'My profile', category: 'Self' },
    '/employee/my-advances': { title: 'My advances', category: 'Self' },
    '/employee/payouts': { title: 'Payouts', category: 'Payroll' },
    '/org-admin/payouts': { title: 'Payouts', category: 'Payroll' },
    '/employee/salary-advance': { title: 'Overview', category: 'Salary Advance' },
    '/org-admin/salary-advance': { title: 'Overview', category: 'Salary Advance' },
    '/employee/salary-advance/advances': { title: 'Advances', category: 'Salary Advance' },
    '/org-admin/salary-advance/advances': { title: 'Advances', category: 'Salary Advance' },
    '/employee/salary-advance/types': { title: 'Advance types', category: 'Salary Advance' },
    '/org-admin/salary-advance/types': { title: 'Advance types', category: 'Salary Advance' },

    // Expenses
    '/employee/my-expenses': { title: 'My expenses', category: 'Self' },
    '/employee/my-expenses/wallet': { title: 'Wallet statement', category: 'Self' },
    '/employee/expenses': { title: 'Overview', category: 'Expenses' },
    '/org-admin/expenses': { title: 'Overview', category: 'Expenses' },
    '/employee/expenses/claims': { title: 'Claims', category: 'Expenses' },
    '/org-admin/expenses/claims': { title: 'Claims', category: 'Expenses' },
    '/employee/expenses/wallets': { title: 'Wallets', category: 'Expenses' },
    '/org-admin/expenses/wallets': { title: 'Wallets', category: 'Expenses' },
    '/employee/expenses/categories': { title: 'Categories', category: 'Expenses' },
    '/org-admin/expenses/categories': { title: 'Categories', category: 'Expenses' },

    // Data Collection
    '/employee/data-collection': { title: 'Overview', category: 'Data Collection' },
    '/org-admin/data-collection': { title: 'Overview', category: 'Data Collection' },
    '/employee/data-collection/my': { title: 'My forms', category: 'Data Collection' },
    '/org-admin/data-collection/my': { title: 'My forms', category: 'Data Collection' },
    '/employee/data-collection/forms': { title: 'Forms', category: 'Data Collection' },
    '/org-admin/data-collection/forms': { title: 'Forms', category: 'Data Collection' },
    '/employee/data-collection/assignments': { title: 'Assignments', category: 'Data Collection' },
    '/org-admin/data-collection/assignments': { title: 'Assignments', category: 'Data Collection' },
    '/employee/data-collection/submissions': { title: 'Submissions', category: 'Data Collection' },
    '/org-admin/data-collection/submissions': { title: 'Submissions', category: 'Data Collection' },

    // Tasks
    '/employee/tasks': { title: 'My tasks', category: 'Tasks' },
    '/employee/tasks/assigned': { title: 'Assigned by me', category: 'Tasks' },
    '/employee/tasks/board': { title: 'Board', category: 'Tasks' },
    '/employee/tasks/list': { title: 'All tasks', category: 'Tasks' },
    '/employee/tasks/dashboard': { title: 'Dashboard', category: 'Tasks' },
    '/org-admin/tasks': { title: 'My tasks', category: 'Tasks' },
    '/org-admin/tasks/assigned': { title: 'Assigned by me', category: 'Tasks' },
    '/org-admin/tasks/board': { title: 'Board', category: 'Tasks' },
    '/org-admin/tasks/list': { title: 'All tasks', category: 'Tasks' },
    '/org-admin/tasks/dashboard': { title: 'Dashboard', category: 'Tasks' },

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

    // Recruitment
    '/employee/recruitment': { title: 'Overview', category: 'Recruitment' },
    '/employee/recruitment/positions': { title: 'Positions', category: 'Recruitment' },
    '/employee/recruitment/positions/new': { title: 'New position', category: 'Recruitment' },
    '/employee/recruitment/candidates': { title: 'Candidates', category: 'Recruitment' },
    '/employee/recruitment/interviews': { title: 'Interviews', category: 'Recruitment' },
    '/employee/recruitment/offers': { title: 'Offers', category: 'Recruitment' },
    '/employee/recruitment/settings': { title: 'Settings', category: 'Recruitment' },
    '/employee/recruitment/documents': { title: 'Document Centre', category: 'Recruitment' },
    '/org-admin/recruitment': { title: 'Overview', category: 'Recruitment' },
    '/org-admin/recruitment/positions': { title: 'Positions', category: 'Recruitment' },
    '/org-admin/recruitment/positions/new': { title: 'New position', category: 'Recruitment' },
    '/org-admin/recruitment/candidates': { title: 'Candidates', category: 'Recruitment' },
    '/org-admin/recruitment/interviews': { title: 'Interviews', category: 'Recruitment' },
    '/org-admin/recruitment/offers': { title: 'Offers', category: 'Recruitment' },
    '/org-admin/recruitment/settings': { title: 'Settings', category: 'Recruitment' },
    '/org-admin/recruitment/documents': { title: 'Document Centre', category: 'Recruitment' },
    '/employee/my-interviews': { title: 'My interviews', category: 'Self' },
    '/employee/my-reviews': { title: 'My reviews', category: 'Self' },
    '/employee/refer': { title: 'Refer a candidate', category: 'Self' },

    // Public Portal
    '/careers': { title: 'Careers Portal', category: 'Public' },
};

export function getPageTitle(pathname: string, role: 'employee' | 'org-admin') {
    // Try exact match first
    if (PAGE_TITLES[pathname]) {
        const { title, category } = PAGE_TITLES[pathname];
        return { title: `${title}`, description: category };
    }

    // Fallback for dynamic routes or unknown paths
    const parts = pathname.split('/').filter(Boolean);

    if (/^\/(employee|org-admin)\/recruitment\/positions\/\d+$/.test(pathname)) {
        return { title: 'Position', description: 'Recruitment' };
    }

    if (/^\/employee\/my-interviews\/\d+$/.test(pathname)) {
        return { title: 'Interview', description: 'Self' };
    }

    if (/^\/employee\/my-reviews\/\d+$/.test(pathname)) {
        return { title: 'Candidate review', description: 'Self' };
    }

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
