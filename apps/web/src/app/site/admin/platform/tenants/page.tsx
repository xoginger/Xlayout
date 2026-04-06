/**
 * Creado y diseñado por XO
 */

"use client";

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminTable, StatusBadge } from '@/components/admin/AdminTable';
import { AdminButton } from '@/components/admin/AdminButton';
import { AdminModal } from '@/components/admin/AdminModal';
import { AdminDrawer } from '@/components/admin/AdminDrawer';
import { AdminTabs } from '@/components/admin/AdminTabs';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { usePlatformStore, Tenant } from '@/store/admin-platform-store';
import { useAdminCatalogStore } from '@/store/admin-catalog-store';
import { useAuthStore } from '@/store/auth-store';

// ── Componentes Locales ──────────────────────────────────────────────────────

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/>
  </svg>
);

const TenantUsersTable = ({ users, onStatusChange, onRoleChange }: { 
  users: any[], 
  onStatusChange: (u: any, s: string) => void,
  onRoleChange: (u: any, r: string) => void 
}) => {
  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuario</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rol</th>
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 italic non-italic">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-700">{u.firstName} {u.lastName}</span>
                  <span className="text-[10px] font-mono text-slate-400">{u.email}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <select 
                  className="text-xs bg-slate-100 border-none rounded py-1 px-2 focus:ring-0"
                  value={u.role}
                  onChange={(e) => onRoleChange(u, e.target.value)}
                >
                  <option value="TENANT_ADMIN">Admin</option>
                  <option value="BUSINESS_OWNER">Owner</option>
                  <option value="CATALOG_MANAGER">Catalog</option>
                  <option value="SALES_USER">Sales</option>
                </select>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={u.status} />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  {u.status === 'ACTIVE' ? (
                    <AdminButton variant="ghost" size="sm" onClick={() => onStatusChange(u, 'SUSPENDED')}>
                      Suspender
                    </AdminButton>
                  ) : (
                    <AdminButton variant="ghost" size="sm" onClick={() => onStatusChange(u, 'ACTIVE')}>
                      Activar
                    </AdminButton>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const CatalogLinesTable = ({ lines, onStatusChange }: { lines: any[], onStatusChange: (id: string, s: boolean) => void }) => (
  <div className="border border-slate-100 rounded-lg overflow-hidden">
    <table className="min-w-full divide-y divide-slate-100 italic non-italic">
      <thead className="bg-slate-50/50">
        <tr>
          <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-slate-400 tracking-wider">Línea</th>
          <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estado</th>
          <th className="px-4 py-2 text-right text-[10px] uppercase font-bold text-slate-400 tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {lines.map((l) => (
          <tr key={l.id} className="hover:bg-slate-50/30 transition-colors">
            <td className="px-4 py-3">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-700">{l.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{l.slug}</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={l.active ? 'ACTIVE' : 'INACTIVE'} />
            </td>
            <td className="px-4 py-3 text-right">
              <AdminButton variant="ghost" size="sm" onClick={() => onStatusChange(l.id, !l.active)}>
                {l.active ? 'Desactivar' : 'Activar'}
              </AdminButton>
            </td>
          </tr>
        ))}
        {lines.length === 0 && (
          <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400 text-xs italic">Marca sin líneas registradas</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const CatalogCategoriesTable = ({ categories, onStatusChange }: { categories: any[], onStatusChange: (id: string, s: boolean) => void }) => (
  <div className="border border-slate-100 rounded-lg overflow-hidden">
    <table className="min-w-full divide-y divide-slate-100 italic non-italic">
      <thead className="bg-slate-50/50">
        <tr>
          <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-slate-400 tracking-wider">Categoría</th>
          <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-slate-400 tracking-wider">Padre</th>
          <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estado</th>
          <th className="px-4 py-2 text-right text-[10px] uppercase font-bold text-slate-400 tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {categories.map((c) => (
          <tr key={c.id} className="hover:bg-slate-50/30 transition-colors">
            <td className="px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">{c.name}</span>
            </td>
            <td className="px-4 py-3 text-xs text-slate-500">
              {c.parent?.name || '-'}
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={c.active ? 'ACTIVE' : 'INACTIVE'} />
            </td>
            <td className="px-4 py-3 text-right">
              <AdminButton variant="ghost" size="sm" onClick={() => onStatusChange(c.id, !c.active)}>
                {c.active ? 'Desactivar' : 'Activar'}
              </AdminButton>
            </td>
          </tr>
        ))}
        {categories.length === 0 && (
          <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs italic">Crea una categoría para organizar el catálogo</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const CatalogProductsTable = ({ 
  products, onStatusChange, onPublish, onUnpublish 
}: { 
  products: any[], onStatusChange: (id: string, s: boolean) => void,
  onPublish: (id: string) => void, onUnpublish: (id: string) => void
}) => (
  <div className="border border-slate-100 rounded-lg overflow-hidden">
    <table className="min-w-full divide-y divide-slate-100 italic non-italic text-xs">
      <thead className="bg-slate-50/50">
        <tr>
          <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-slate-400 tracking-wider">Producto</th>
          <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estructura</th>
          <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estado</th>
          <th className="px-4 py-2 text-left text-[10px] uppercase font-bold text-slate-400 tracking-wider">3D</th>
          <th className="px-4 py-2 text-right text-[10px] uppercase font-bold text-slate-400 tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {products.map((p) => (
          <tr key={p.id} className="hover:bg-slate-50/30 transition-colors">
            <td className="px-4 py-3">
              <div className="flex flex-col">
                <span className="font-semibold text-slate-700">{p.name}</span>
                <span className="text-[10px] font-mono text-slate-400">{p.sku}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-[10px]">
              <div className="flex flex-col">
                <span className="text-blue-600 font-medium">L: {p.line?.name || 'ERR'}</span>
                <span className="text-slate-400">C: {p.category?.name || 'N/A'}</span>
              </div>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={p.status} />
            </td>
            <td className="px-4 py-3">
              {p.assets?.some((a: any) => a.assetType === 'model_3d') ? (
                <div className="flex items-center gap-1 text-emerald-600 font-bold uppercase text-[9px]">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SI
                </div>
              ) : (
                <span className="text-slate-300 font-bold uppercase text-[9px]">NO</span>
              )}
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex justify-end gap-1">
                {p.status === 'DRAFT' ? (
                  <AdminButton variant="primary" size="sm" onClick={() => onPublish(p.id)}>Publicar</AdminButton>
                ) : (
                  <AdminButton variant="outline" size="sm" onClick={() => onUnpublish(p.id)}>Draft</AdminButton>
                )}
                <AdminButton variant="ghost" size="sm" onClick={() => onStatusChange(p.id, !p.active)}>
                  {p.active ? 'Off' : 'On'}
                </AdminButton>
              </div>
            </td>
          </tr>
        ))}
        {products.length === 0 && (
          <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs italic">Marca sin productos. Sube el catálogo maestro o crea uno.</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

const CatalogAssetsGrid = ({ assets }: { assets: any[] }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      {assets.map((a) => (
        <div key={a.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Producto Asoc.</span>
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[120px]">
                {a.product?.name || 'Biblioteca (Sin uso)'}
              </span>
            </div>
            <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
              a.conversionStatus === 'converted' ? 'bg-emerald-100 text-emerald-700' : 
              a.conversionStatus === 'failed' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {a.conversionStatus}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200">
            <div className="w-8 h-8 rounded bg-white border border-slate-100 flex items-center justify-center text-slate-300">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1V18.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/></svg>
            </div>
            <div className="flex flex-col min-w-0">
               <span className="text-[10px] font-bold text-slate-600 truncate">{a.metadata?.originalName || 'Asset 3D'}</span>
               <span className="text-[9px] text-slate-400 uppercase font-mono tracking-tighter">{a.originalFormat || 'bin'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    {assets.length === 0 && (
      <div className="py-12 text-center text-slate-400 text-xs italic">No hay assets 3D registrados para esta marca</div>
    )}
  </div>
);

export default function PlatformTenantsPage() {
  const { 
    tenants, fetchTenants, createTenant, updateTenant, deleteTenant, 
    updateTenantStatus, isLoading,
    tenantUsers, fetchTenantUsers, createTenantUser, 
    updateTenantUserStatus, updateTenantUserRole 
  } = usePlatformStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [editingTenant, setEditingTenant] = useState<Partial<Tenant> | null>(null);
  const [drawerTab, setDrawerTab] = useState('general');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    firstName: '', lastName: '', email: '', password: '', role: 'TENANT_ADMIN' as any
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [newTenant, setNewTenant] = useState({
    name: '', slug: '',
    adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLineModalOpen, setIsLineModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newLineData, setNewLineData] = useState({ name: '', description: '' });
  const [newCategoryData, setNewCategoryData] = useState({ name: '', parentId: '' });
  const [newProductData, setNewProductData] = useState({ 
    name: '', sku: '', lineId: '', categoryId: '', width: 0, depth: 0, height: 0
  });

  const {
    lines, categories, products, assets, isLoading: isCatalogLoading,
    fetchLines, fetchCategories, fetchProducts, fetchAssets,
    createLine, updateLineStatus, createCategory, updateCategoryStatus,
    createProduct, updateProductStatus, publishProduct, unpublishProduct
  } = useAdminCatalogStore();

  const { setActiveTenantId, activeTenantId } = useAuthStore();

  // Sub-tabs internas de catálogo
  const [catalogSubTab, setCatalogSubTab] = useState('lines');

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Cargar usuarios o datos de catálogo cuando se activa la pestaña correspondiente
  useEffect(() => {
    if (selectedTenant && drawerTab === 'users') {
      fetchTenantUsers(selectedTenant.id);
    }
    
    if (selectedTenant && drawerTab === 'catalog') {
      // Sincronizar activeTenantId para que las peticiones vayan al tenant correcto
      setActiveTenantId(selectedTenant.id);
      
      // Cargar datos según la sub-tab activa
      if (catalogSubTab === 'lines') fetchLines();
      if (catalogSubTab === 'categories') fetchCategories();
      if (catalogSubTab === 'products') fetchProducts();
      if (catalogSubTab === 'assets') fetchAssets();
    }
  }, [selectedTenant, drawerTab, catalogSubTab, fetchTenantUsers, fetchLines, fetchCategories, fetchProducts, fetchAssets, setActiveTenantId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createTenant(newTenant);
      setIsModalOpen(false);
      setNewTenant({ name: '', slug: '', adminFirstName: '', adminLastName: '', adminEmail: '', adminPassword: '' });
    } catch (err: any) {
      alert(err.message || 'Error al crear la marca');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant || !editingTenant.id) return;
    setIsSubmitting(true);
    try {
      await updateTenant(editingTenant.id, {
        name: editingTenant.name,
        slug: editingTenant.slug,
        contactEmail: editingTenant.contactEmail,
      });
      setIsEditModalOpen(false);
      setEditingTenant(null);
    } catch (err: any) {
      alert(err.message || 'Error al actualizar la marca');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (tenant: Tenant) => {
    const confirmMessage = `¿Estás ABSOLUTAMENTE SEGURO de eliminar la marca "${tenant.name}"?\n\nEsta acción solo se completará si no hay productos, usuarios o proyectos vinculados. No se podrá revertir fácilmente.`;
    
    if (confirm(confirmMessage)) {
      try {
        await deleteTenant(tenant.id);
        alert('Marca marcada como inactiva correctamente.');
      } catch (err: any) {
        alert(err.message || 'Error al eliminar la marca');
      }
    }
  };

  // Filtrar tenants según búsqueda y estado
  const filteredTenants = tenants.filter((t) => {
    if (searchFilter && !t.name.toLowerCase().includes(searchFilter.toLowerCase()) && !t.slug.toLowerCase().includes(searchFilter.toLowerCase())) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  const handleStatusChange = async (tenant: Tenant, newStatus: string) => {
    try {
      await updateTenantStatus(tenant.id, newStatus);
    } catch (err: any) {
      alert(err.message || 'Error al cambiar estado');
    }
  };

  const columns = [
    { header: 'Nombre', accessor: (t: Tenant) => (
      <button onClick={() => setSelectedTenant(t)} className="text-blue-600 hover:text-blue-700 font-medium hover:underline text-left">
        {t.name}
      </button>
    )},
    { header: 'Slug', accessor: (t: Tenant) => <span className="font-mono text-xs text-slate-500">{t.slug}</span> },
    { header: 'Estado', accessor: (t: Tenant) => <StatusBadge status={t.status} /> },
    { header: 'Creación', accessor: (t: Tenant) => new Date(t.createdAt).toLocaleDateString('es-MX') },
    {
      header: 'Acciones',
      accessor: (t: Tenant) => (
        <div className="flex gap-2">
          <AdminButton variant="ghost" size="sm" onClick={() => setSelectedTenant(t)}>
            Ver
          </AdminButton>
          <AdminButton variant="outline" size="sm" onClick={() => {
            setEditingTenant({ ...t });
            setIsEditModalOpen(true);
          }}>
            Editar
          </AdminButton>
          <div className="w-px h-8 bg-slate-200 mx-1" />
          {t.status === 'ACTIVE' && (
            <AdminButton variant="outline" size="sm" onClick={() => handleStatusChange(t, 'SUSPENDED')}>
              Suspender
            </AdminButton>
          )}
          {(t.status === 'SUSPENDED' || t.status === 'PENDING' || t.status === 'INACTIVE') && (
            <AdminButton variant="primary" size="sm" onClick={() => handleStatusChange(t, 'ACTIVE')}>
              {t.status === 'INACTIVE' ? 'Reactivar' : 'Activar'}
            </AdminButton>
          )}
          {t.status !== 'INACTIVE' && (
            <AdminButton variant="destructive" size="sm" onClick={() => handleDelete(t)}>
              Eliminar
            </AdminButton>
          )}
        </div>
      )
    },
  ];

  // Tabs del drawer de detalle
  const drawerTabs = [
    { id: 'general', label: 'General' },
    { id: 'users', label: 'Usuarios' },
    { id: 'catalog', label: 'Catálogo' },
    { id: 'distributors', label: 'Distribuidores' },
    { id: 'activity', label: 'Actividad' },
  ];

  return (
    <AdminLayout type="platform" title="Marcas">
      {/* Cabecera y acciones */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gestión de Marcas</h2>
          <p className="text-sm text-slate-500">Administra fabricantes, su estado y sus recursos vinculados.</p>
        </div>
        <AdminButton onClick={() => setIsModalOpen(true)} icon={
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
        }>
          Crear Marca
        </AdminButton>
      </div>

      {/* Filtros */}
      <AdminFilterBar
        filters={[
          { id: 'search', label: '', type: 'search', placeholder: 'Buscar por nombre o slug...', value: searchFilter },
          { id: 'status', label: 'Estado', type: 'select', value: statusFilter, options: [
            { label: 'Activo', value: 'ACTIVE' },
            { label: 'Suspendido', value: 'SUSPENDED' },
            { label: 'Pendiente', value: 'PENDING' },
            { label: 'Inactivo', value: 'INACTIVE' },
          ]},
        ]}
        onChange={(id, value) => {
          if (id === 'search') setSearchFilter(value);
          if (id === 'status') setStatusFilter(value);
        }}
        onClear={() => { setSearchFilter(''); setStatusFilter(''); }}
        hasActiveFilters={!!searchFilter || !!statusFilter}
      />

      {/* Tabla de marcas */}
      <AdminTable
        columns={columns as any}
        data={filteredTenants}
        loading={isLoading}
        emptyMessage="No se encontraron marcas. ¡Crea la primera!"
        onRowClick={(t) => setSelectedTenant(t)}
      />

      {/* Modal para crear marca */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Crear Nueva Marca"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleCreate} loading={isSubmitting}>Crear Marca</AdminButton>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="border-b border-slate-200 pb-4 mb-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Datos de la Marca</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Marca</label>
                <input
                  type="text" required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ej. Herman Miller"
                  value={newTenant.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setNewTenant({ ...newTenant, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') });
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slug (Identificador URL)</label>
                <input
                  type="text" required
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-slate-500"
                  value={newTenant.slug} readOnly
                />
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Administrador Inicial de la Marca</h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={newTenant.adminFirstName} onChange={(e) => setNewTenant({ ...newTenant, adminFirstName: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
                <input type="text" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={newTenant.adminLastName} onChange={(e) => setNewTenant({ ...newTenant, adminLastName: e.target.value })} />
              </div>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email del Admin</label>
              <input type="email" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={newTenant.adminEmail} onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña Temporal</label>
              <input type="password" required minLength={8} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500" value={newTenant.adminPassword} onChange={(e) => setNewTenant({ ...newTenant, adminPassword: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>

      {/* Modal para EDITAR marca */}
      <AdminModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar Marca"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={handleEdit} loading={isSubmitting}>Guardar Cambios</AdminButton>
          </>
        }
      >
        {editingTenant && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la Marca</label>
              <input
                type="text" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={editingTenant.name || ''}
                onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Slug (URL)</label>
              <input
                type="text" required
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={editingTenant.slug || ''}
                onChange={(e) => setEditingTenant({ ...editingTenant, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-') })}
              />
              <p className="text-[10px] text-slate-400 mt-1">Cuidado: cambiar el slug puede romper enlaces externos guardados.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email de Contacto</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                value={editingTenant.contactEmail || ''}
                onChange={(e) => setEditingTenant({ ...editingTenant, contactEmail: e.target.value })}
              />
            </div>
            <button type="submit" className="hidden" />
          </form>
        )}
      </AdminModal>

      {/* Drawer de detalle de marca */}
      <AdminDrawer
        isOpen={!!selectedTenant}
        onClose={() => setSelectedTenant(null)}
        title={selectedTenant?.name || ''}
        subtitle={selectedTenant?.slug}
        width="xl"
      >
        {selectedTenant && (
          <div>
            <div className="px-6 pt-4">
              <AdminTabs tabs={drawerTabs} activeTab={drawerTab} onChange={setDrawerTab} />
            </div>
            <div className="p-6">
              {drawerTab === 'general' && (
                <div className="space-y-6">
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 grid grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Estado del Sistema</p>
                      <StatusBadge status={selectedTenant.status} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">ID Unívoco</p>
                      <p className="text-xs text-slate-600 font-mono truncate">{selectedTenant.id}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email de Contacto</p>
                      <p className="text-sm text-slate-700 font-medium">{selectedTenant.contactEmail || 'Sin definir'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Fecha de Alta</p>
                      <p className="text-sm text-slate-700 font-medium">{new Date(selectedTenant.createdAt).toLocaleString('es-MX')}</p>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100/50">
                    <h4 className="text-sm font-bold text-blue-900 mb-4 flex items-center gap-2">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                       Métricas de Recursos
                    </h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Productos</p>
                        <p className="text-xl font-black text-blue-600">{selectedTenant._count?.products || 0}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Usuarios</p>
                        <p className="text-xl font-black text-blue-600">{selectedTenant._count?.companyUsers || 0}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">Accesos</p>
                        <p className="text-xl font-black text-blue-600">{selectedTenant._count?.distributorAccesses || 0}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex flex-wrap gap-2">
                    <AdminButton variant="primary" size="sm" onClick={() => {
                       setEditingTenant({ ...selectedTenant });
                       setIsEditModalOpen(true);
                    }}>
                      Editar Datos
                    </AdminButton>
                    
                    {selectedTenant.status === 'ACTIVE' && (
                      <AdminButton variant="outline" size="sm" onClick={() => handleStatusChange(selectedTenant, 'SUSPENDED')}>Suspender</AdminButton>
                    )}
                    {selectedTenant.status !== 'ACTIVE' && (
                      <AdminButton variant="outline" size="sm" onClick={() => handleStatusChange(selectedTenant, 'ACTIVE')}>Activar</AdminButton>
                    )}
                    
                    <div className="flex-1" />
                    
                    {selectedTenant.status !== 'INACTIVE' && (
                      <AdminButton variant="destructive" size="sm" onClick={() => handleDelete(selectedTenant)}>Eliminar de la Plataforma</AdminButton>
                    )}
                  </div>
                </div>
              )}
              {drawerTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">Usuarios Internos</h4>
                      <p className="text-xs text-slate-500">Administra el personal con acceso a esta marca.</p>
                    </div>
                    <AdminButton size="sm" onClick={() => setIsUserModalOpen(true)} icon={<PlusIcon />}>
                      Agregar Usuario
                    </AdminButton>
                  </div>

                  <TenantUsersTable 
                    users={tenantUsers} 
                    onStatusChange={async (u, s) => {
                      try {
                        await updateTenantUserStatus(u.id, s);
                      } catch (err: any) {
                        alert(err.message || 'Error al cambiar estado');
                      }
                    }}
                    onRoleChange={async (u, r) => {
                      try {
                        await updateTenantUserRole(u.id, r);
                      } catch (err: any) {
                        alert(err.message || 'Error al cambiar rol');
                      }
                    }}
                  />
                  
                  {tenantUsers.length === 0 && !isLoading && (
                    <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-8 text-center">
                      <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                      </div>
                      <p className="text-sm font-medium text-slate-600">No hay usuarios registrados</p>
                      <p className="text-xs text-slate-400 mt-1 mb-4">Crea el primer administrador para que la marca pueda operar.</p>
                      <AdminButton variant="outline" size="sm" onClick={() => setIsUserModalOpen(true)}>Crear Administrador</AdminButton>
                    </div>
                  )}
                </div>
              )}
              {drawerTab === 'catalog' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex gap-4">
                      {['lines', 'categories', 'products', 'assets'].map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setCatalogSubTab(tab)}
                          className={`pb-2 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                            catalogSubTab === tab 
                              ? 'text-blue-600 border-blue-600' 
                              : 'text-slate-400 border-transparent hover:text-slate-600'
                          }`}
                        >
                          {tab === 'lines' && 'Líneas'}
                          {tab === 'categories' && 'Categorías'}
                          {tab === 'products' && 'Productos'}
                          {tab === 'assets' && 'Assets 3D'}
                        </button>
                      ))}
                    </div>
                    <AdminButton size="sm" onClick={() => {
                      if (catalogSubTab === 'lines') setIsLineModalOpen(true);
                      if (catalogSubTab === 'categories') setIsCategoryModalOpen(true);
                      if (catalogSubTab === 'products') setIsProductModalOpen(true);
                    }} icon={<PlusIcon />}>
                      {catalogSubTab === 'lines' && 'Nueva Línea'}
                      {catalogSubTab === 'categories' && 'Nueva Categoría'}
                      {catalogSubTab === 'products' && 'Nuevo Producto'}
                      {catalogSubTab === 'assets' && 'Subir Asset'}
                    </AdminButton>
                  </div>

                  <div className="mt-4 min-h-[300px]">
                    {catalogSubTab === 'lines' && (
                      <CatalogLinesTable 
                        lines={lines} 
                        onStatusChange={updateLineStatus} 
                      />
                    )}
                    {catalogSubTab === 'categories' && (
                      <CatalogCategoriesTable 
                        categories={categories} 
                        onStatusChange={updateCategoryStatus} 
                      />
                    )}
                    {catalogSubTab === 'products' && (
                      <CatalogProductsTable 
                        products={products}
                        onStatusChange={updateProductStatus}
                        onPublish={publishProduct}
                        onUnpublish={unpublishProduct}
                      />
                    )}
                    {catalogSubTab === 'assets' && (
                      <CatalogAssetsGrid 
                        assets={assets}
                      />
                    )}

                    {isCatalogLoading && (
                      <div className="py-12 text-center text-slate-400 text-sm">Cargando datos...</div>
                    )}
                  </div>
                </div>
              )}
              {drawerTab === 'distributors' && (
                <div className="text-sm text-slate-500 italic">
                  <p className="mb-2">Empresas externas que tienen permiso para vender productos de {selectedTenant.name}.</p>
                  <p className="text-xs bg-slate-100 rounded p-3">
                    Accede a la sección de "Accesos y Permisos" para una gestión completa.
                  </p>
                </div>
              )}
              {drawerTab === 'activity' && (
                <div className="text-sm text-slate-500 italic">
                  <p className="mb-2">Historial de cambios técnicos realizados sobre esta marca.</p>
                  <div className="border-l-2 border-slate-200 ml-2 pl-4 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 border-2 border-white" />
                      <p className="text-xs font-bold text-slate-700">Creación de la Marca</p>
                      <p className="text-[10px] text-slate-400">{new Date(selectedTenant.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white" />
                      <p className="text-xs font-bold text-slate-700">Estado actual: {selectedTenant.status}</p>
                      <p className="text-[10px] text-slate-400">Última actualización: {new Date(selectedTenant.updatedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>

      {/* Modal para agregar usuario al tenant */}
      <AdminModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={`Agregar Usuario a ${selectedTenant?.name}`}
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsUserModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={() => {
              const form = document.getElementById('add-user-form') as HTMLFormElement;
              if (form) form.requestSubmit();
            }} loading={isSubmitting}>Crear Usuario</AdminButton>
          </>
        }
      >
        <form 
          id="add-user-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!selectedTenant) return;
            setIsSubmitting(true);
            try {
              await createTenantUser({ ...newUser, tenantId: selectedTenant.id });
              setIsUserModalOpen(false);
              setNewUser({ firstName: '', lastName: '', email: '', password: '', role: 'TENANT_ADMIN' as any });
            } catch (err: any) {
              alert(err.message || 'Error al crear usuario');
            } finally {
              setIsSubmitting(false);
            }
          }}
          className="space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre</label>
              <input 
                type="text" required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden" 
                value={newUser.firstName} onChange={e => setNewUser({...newUser, firstName: e.target.value})} 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Apellido</label>
              <input 
                type="text" required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden" 
                value={newUser.lastName} onChange={e => setNewUser({...newUser, lastName: e.target.value})} 
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
            <input 
              type="email" required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden" 
              value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contraseña</label>
            <input 
              type="password" required minLength={8}
              placeholder="Mínimo 8 caracteres" 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden" 
              value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rol de Usuario</label>
            <select 
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-hidden" 
              value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})}
            >
              <option value="TENANT_ADMIN">Administrador de Marca (Full)</option>
              <option value="BUSINESS_OWNER">Propietario de Negocio</option>
              <option value="CATALOG_MANAGER">Gestor de Catálogo</option>
              <option value="SALES_USER">Usuario de Ventas</option>
            </select>
          </div>
          <button type="submit" className="hidden" />
        </form>
      </AdminModal>

      {/* Modales de Catálogo */}
      <AdminModal
        isOpen={isLineModalOpen}
        onClose={() => setIsLineModalOpen(false)}
        title="Nueva Línea de Producto"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsLineModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={async () => {
              setIsSubmitting(true);
              try {
                await createLine(newLineData.name);
                setIsLineModalOpen(false);
                setNewLineData({ name: '', description: '' });
              } catch (err: any) {
                alert(err.message || 'Error al crear la línea');
              } finally {
                setIsSubmitting(false);
              }
            }} loading={isSubmitting}>Crear Línea</AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre de la Línea</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newLineData.name} onChange={e => setNewLineData({...newLineData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descripción (Opcional)</label>
            <textarea className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newLineData.description} onChange={e => setNewLineData({...newLineData, description: e.target.value})} />
          </div>
        </div>
      </AdminModal>

      <AdminModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Nueva Categoría"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsCategoryModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={async () => {
              setIsSubmitting(true);
              try {
                await createCategory(newCategoryData.name, newCategoryData.parentId || undefined);
                setIsCategoryModalOpen(false);
                setNewCategoryData({ name: '', parentId: '' });
              } catch (err: any) {
                alert(err.message || 'Error al crear la categoría');
              } finally {
                setIsSubmitting(false);
              }
            }} loading={isSubmitting}>Crear Categoría</AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre de la Categoría</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newCategoryData.name} onChange={e => setNewCategoryData({...newCategoryData, name: e.target.value})} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Categoría Padre (Opcional)</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newCategoryData.parentId} onChange={e => setNewCategoryData({...newCategoryData, parentId: e.target.value})}>
              <option value="">Ninguna (Nivel Raíz)</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Nuevo Producto"
        footer={
          <>
            <AdminButton variant="outline" onClick={() => setIsProductModalOpen(false)}>Cancelar</AdminButton>
            <AdminButton onClick={async () => {
              if (!newProductData.lineId) {
                alert("Debes seleccionar una línea");
                return;
              }
              setIsSubmitting(true);
              try {
                const { lineId, categoryId, ...productBody } = newProductData;
                await createProduct({ 
                  ...productBody, 
                  lineId, 
                  categoryId: categoryId || undefined 
                });
                setIsProductModalOpen(false);
                setNewProductData({ name: '', sku: '', lineId: '', categoryId: '', width: 0, depth: 0, height: 0 });
              } catch (err: any) {
                alert(err.message || 'Error al crear el producto');
              } finally {
                setIsSubmitting(false);
              }
            }} loading={isSubmitting}>Crear Producto</AdminButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newProductData.name} onChange={e => setNewProductData({...newProductData, name: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">SKU (Identificador)</label>
              <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase" value={newProductData.sku} onChange={e => setNewProductData({...newProductData, sku: e.target.value.toUpperCase()})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Línea (Requerido)</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newProductData.lineId} onChange={e => setNewProductData({...newProductData, lineId: e.target.value})}>
                <option value="">Seleccionar...</option>
                {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Categoría</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newProductData.categoryId} onChange={e => setNewProductData({...newProductData, categoryId: e.target.value})}>
                <option value="">Opcional...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 text-[10px]">Ancho (cm)</label>
              <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newProductData.width} onChange={e => setNewProductData({...newProductData, width: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 text-[10px]">Fondo (cm)</label>
              <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newProductData.depth} onChange={e => setNewProductData({...newProductData, depth: Number(e.target.value)})} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase mb-1 text-[10px]">Alto (cm)</label>
              <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={newProductData.height} onChange={e => setNewProductData({...newProductData, height: Number(e.target.value)})} />
            </div>
          </div>
        </div>
      </AdminModal>
    </AdminLayout>
  );
}

