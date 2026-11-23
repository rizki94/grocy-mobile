import { useContext } from 'react';
import { UserContext } from '../contexts/app-context';

// Modern web (database dot-notation) aliases for legacy mobile permission names
const PERMISSION_ALIASES: Record<string, string[]> = {
  'approve-invoice': ['transaction.sales.approve', 'transaction.sales.view'],
  'sales-omzet-report': ['transaction.sales.view', 'report.sales.view'],
  'loss-profit-report': ['report.profit_loss.view', 'accounting.journal.view'],
  'sales-return-list': ['transaction.sales.view', 'transaction.sales_return.view'],
  'sales-order': ['transaction.sales.create', 'transaction.sales.view'],
  'price-request-approve': ['transaction.sales.view', 'product.view'],
  'payment-ar-list': ['accounting.payment.view', 'report.customer_outstanding.view'],
  'payment-ap-list': ['accounting.payment.view', 'report.supplier_outstanding.view'],
  'purchase-report': ['transaction.purchase.view', 'report.purchase.view'],
  '4pilar-pelunasan-piutang': ['accounting.payment.view', 'payment.receivable.create'],
  '4pilar-pelunasan-hutang': ['accounting.payment.view', 'payment.payable.create'],
  'stock-opname-list': ['transaction.stock_opname.view', 'product.view'],
  'product-stock-list': ['product.view', 'settings.warehouse.view'],
  'see-modal-in-price-stock': ['product.view', 'report.product_profitability.view'],
  'cancel-transaction': ['transaction.sales.delete', 'transaction.sales.view'],
  'STOCK_OPNAME_VIEW_SYSTEM_STOCK': ['transaction.stock_opname.view', 'product.view'],
};

export function usePermissions() {
  const user = useContext(UserContext);

  const checkSinglePermission = (perm: string, perms: string[]): boolean => {
    if (perms.includes(perm)) return true;
    const aliases = PERMISSION_ALIASES[perm];
    if (aliases && aliases.some(a => perms.includes(a))) {
      return true;
    }
    return false;
  };

  const hasPermission = (allowedPermission: string | string[]) => {
    if (!user) return false;

    // Super Admin has all permissions (matching web version)
    if (user.isSuperAdmin || user.role === 'super_admin' || user.role === 'superadmin') {
      return true;
    }

    const perms = Array.isArray(user.permission) ? user.permission : [];
    if (perms.length === 0) return false;

    if (Array.isArray(allowedPermission)) {
      return allowedPermission.some(p => checkSinglePermission(p, perms));
    }

    return checkSinglePermission(allowedPermission, perms);
  };

  return { hasPermission, permissions: user?.permission || [] };
}
