const PAGE_TITLES: Record<string, { title: string; category: string }> = {
    // Self
    '/employee': { title: 'Dashboard', category: 'Self' },
    '/org-admin': { title: 'Dashboard', category: 'Self' },
    '/employee/approvals': { title: 'Approvals', category: 'Self' },
    '/org-admin/approvals': { title: 'Approvals', category: 'Self' },
    '/employee/my-exit': { title: 'My exit', category: 'Self' },
    '/employee/exits': { title: 'Exits', category: 'Management' },
    '/org-admin/exits': { title: 'Exits', category: 'Management' },
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
    '/employee/grades': { title: 'Grades / bands', category: 'Management' },
    '/org-admin/grades': { title: 'Grades / bands', category: 'Management' },
    '/employee/cost-centres': { title: 'Cost centres', category: 'Management' },
    '/org-admin/cost-centres': { title: 'Cost centres', category: 'Management' },
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
    '/employee/verification-issues': { title: 'Verification Issues', category: 'Management' },
    '/employee/payroll': { title: 'Payroll', category: 'Management' },
    // Insurance
    '/employee/insurance': { title: 'Insurance', category: 'Management' },
    '/org-admin/insurance': { title: 'Insurance', category: 'Management' },
    '/employee/my-insurance': { title: 'My insurance', category: 'Self' },

    // Salary Advance
    '/employee/my-profile': { title: 'My profile', category: 'Self' },
    '/employee/my-tax': { title: 'Tax declaration', category: 'Self' },
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

    // Petty cash
    '/employee/my-petty-cash': { title: 'My petty cash', category: 'Self' },
    '/employee/my-petty-cash/expenses': { title: 'My petty cash', category: 'Self' },
    '/employee/my-petty-cash/fund-requests': { title: 'My petty cash', category: 'Self' },
    '/employee/petty-cash': { title: 'Overview', category: 'Petty Cash' },
    '/org-admin/petty-cash': { title: 'Overview', category: 'Petty Cash' },
    '/employee/petty-cash/wallets': { title: 'Wallets', category: 'Petty Cash' },
    '/org-admin/petty-cash/wallets': { title: 'Wallets', category: 'Petty Cash' },
    '/employee/petty-cash/expenses': { title: 'Expenses', category: 'Petty Cash' },
    '/org-admin/petty-cash/expenses': { title: 'Expenses', category: 'Petty Cash' },
    '/employee/petty-cash/fund-requests': { title: 'Fund requests', category: 'Petty Cash' },
    '/org-admin/petty-cash/fund-requests': { title: 'Fund requests', category: 'Petty Cash' },
    '/employee/petty-cash/inward': { title: 'Inward register', category: 'Petty Cash' },
    '/org-admin/petty-cash/inward': { title: 'Inward register', category: 'Petty Cash' },
    '/employee/petty-cash/categories': { title: 'Categories', category: 'Petty Cash' },
    '/org-admin/petty-cash/categories': { title: 'Categories', category: 'Petty Cash' },
    '/employee/petty-cash/settings': { title: 'Settings', category: 'Petty Cash' },
    '/org-admin/petty-cash/settings': { title: 'Settings', category: 'Petty Cash' },

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
    '/org-admin/performance': { title: 'Performance setup', category: 'Performance' },
    '/org-admin/performance/cycles': { title: 'Review cycles', category: 'Performance' },
    '/org-admin/performance/my-goals': { title: 'My goals', category: 'Performance' },
    '/org-admin/performance/team-goals': { title: 'Team goals', category: 'Performance' },
    '/org-admin/performance/feedback': { title: 'Feedback to give', category: 'Performance' },
    '/org-admin/performance/improvement-plans': { title: 'Improvement plans', category: 'Performance' },
    '/org-admin/performance/kudos': { title: 'Kudos', category: 'Performance' },
    '/org-admin/performance/okrs': { title: 'OKRs', category: 'Performance' },
    '/org-admin/performance/talent': { title: 'Talent', category: 'Performance' },
    '/org-admin/learning': { title: 'Learning', category: 'Learning' },
    '/org-admin/surveys': { title: 'Surveys', category: 'Engagement' },
    '/org-admin/performance/one-on-ones': { title: 'One-on-ones', category: 'Performance' },
    '/employee/performance': { title: 'Performance setup', category: 'Performance' },
    '/employee/performance/cycles': { title: 'Review cycles', category: 'Performance' },
    '/employee/performance/my-goals': { title: 'My goals', category: 'Performance' },
    '/employee/performance/team-goals': { title: 'Team goals', category: 'Performance' },
    '/employee/performance/feedback': { title: 'Feedback to give', category: 'Performance' },
    '/employee/performance/improvement-plans': { title: 'Improvement plans', category: 'Performance' },
    '/employee/performance/kudos': { title: 'Kudos', category: 'Performance' },
    '/employee/performance/okrs': { title: 'OKRs', category: 'Performance' },
    '/employee/performance/talent': { title: 'Talent', category: 'Performance' },
    '/employee/learning': { title: 'Learning', category: 'Learning' },
    '/employee/surveys': { title: 'Surveys', category: 'Engagement' },
    '/employee/performance/one-on-ones': { title: 'One-on-ones', category: 'Performance' },

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

    // Income Tax (TDS)
    '/employee/tds': { title: 'Overview', category: 'Income Tax (TDS)' },
    '/employee/tds/settings': { title: 'TDS settings', category: 'Income Tax (TDS)' },
    '/employee/tds/declarations': { title: 'Employee declarations', category: 'Income Tax (TDS)' },
    '/employee/tds/proofs': { title: 'Proof review', category: 'Income Tax (TDS)' },
    '/employee/tds/returns': { title: 'Deposits & returns', category: 'Income Tax (TDS)' },
    '/employee/tds/form16': { title: 'Form 16', category: 'Income Tax (TDS)' },
    '/org-admin/tds': { title: 'Overview', category: 'Income Tax (TDS)' },
    '/org-admin/tds/settings': { title: 'TDS settings', category: 'Income Tax (TDS)' },
    '/org-admin/tds/declarations': { title: 'Employee declarations', category: 'Income Tax (TDS)' },
    '/org-admin/tds/proofs': { title: 'Proof review', category: 'Income Tax (TDS)' },
    '/org-admin/tds/returns': { title: 'Deposits & returns', category: 'Income Tax (TDS)' },
    '/org-admin/tds/form16': { title: 'Form 16', category: 'Income Tax (TDS)' },

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

    if (/^\/(employee\/employee-management|org-admin\/employees)\/\d+$/.test(pathname)) {
        return { title: 'Employee', description: 'Management' };
    }

    if (/^\/(employee|org-admin)\/petty-cash\/wallets\/\d+$/.test(pathname) || /^\/employee\/my-petty-cash\/wallets\/\d+$/.test(pathname)) {
        return { title: 'Wallet', description: 'Petty Cash' };
    }

    if (/^\/(employee|org-admin)\/petty-cash\/expenses\/\d+$/.test(pathname)) {
        return { title: 'Expense', description: 'Petty Cash' };
    }

    if (/^\/employee\/my-petty-cash\/expenses\/\d+$/.test(pathname)) {
        return { title: 'Expense', description: 'Self' };
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
