import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { InventoryItem } from '../../types';
import { Package, Plus, AlertTriangle, Edit2, Trash2, X, Save } from 'lucide-react';

interface InventoryFormData {
  itemCode: string;
  name: string;
  category: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  supplier: string;
  reorderLevel: string;
}

const initialFormData: InventoryFormData = {
  itemCode: '',
  name: '',
  category: '',
  quantity: '',
  unit: '',
  unitPrice: '',
  supplier: '',
  reorderLevel: ''
};

export function InventoryModule() {
  const { db, hasPermission } = useAppStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<InventoryFormData>(initialFormData);
  const [saving, setSaving] = useState(false);

  const loadItems = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    const data = await db.inventory.getAll(filterCategory ? { category: filterCategory } : undefined);
    setItems(data);
    setLoading(false);
  }, [db, filterCategory]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleDelete = async (id: string) => {
    if (!db || !confirm('Are you sure you want to delete this item?')) return;
    await db.inventory.delete(id);
    loadItems();
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      itemCode: item.itemCode,
      name: item.name,
      category: item.category,
      quantity: String(item.quantity),
      unit: item.unit,
      unitPrice: String(item.unitPrice),
      supplier: item.supplier || '',
      reorderLevel: item.reorderLevel ? String(item.reorderLevel) : ''
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!db) return;
    if (!formData.itemCode || !formData.name || !formData.category || !formData.unit) {
      alert('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingItem) {
        await db.inventory.update(editingItem.id, {
          name: formData.name,
          category: formData.category,
          quantity: Number(formData.quantity),
          unit: formData.unit,
          unitPrice: Number(formData.unitPrice),
          supplier: formData.supplier || undefined,
          reorderLevel: formData.reorderLevel ? Number(formData.reorderLevel) : undefined
        });
      } else {
        await db.inventory.create({
          itemCode: formData.itemCode,
          name: formData.name,
          category: formData.category,
          quantity: Number(formData.quantity) || 0,
          unit: formData.unit,
          unitPrice: Number(formData.unitPrice) || 0,
          supplier: formData.supplier || undefined,
          reorderLevel: formData.reorderLevel ? Number(formData.reorderLevel) : undefined
        });
      }
      setShowModal(false);
      loadItems();
    } catch (error) {
      console.error('Error saving inventory item:', error);
      alert('Failed to save inventory item');
    }
    setSaving(false);
  };

  const categories = [...new Set(items.map(i => i.category))];
  const lowStock = items.filter(i => i.reorderLevel && i.quantity <= i.reorderLevel);
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
  const canEdit = hasPermission('inventory:edit');
  const canDelete = hasPermission('inventory:delete');
  const canCreate = hasPermission('inventory:create');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Inventory Management</h1>
        {canCreate && (
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Item
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Items</p>
              <p className="text-2xl font-bold text-slate-800">{items.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Low Stock Alerts</p>
              <p className="text-2xl font-bold text-red-600">{lowStock.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Value</p>
              <p className="text-2xl font-bold text-slate-800">${totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex gap-4">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No inventory items found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Code</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Quantity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Unit</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Unit Price</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Value</th>
                  {(canEdit || canDelete) && (
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map(item => {
                  const isLow = item.reorderLevel && item.quantity <= item.reorderLevel;
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 ${isLow ? 'bg-red-50' : ''}`}>
                      <td className="px-4 py-3 text-sm text-slate-700">{item.itemCode}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.category}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={isLow ? 'text-red-600 font-medium' : 'text-slate-600'}>
                          {item.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{item.unit}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">${(item.quantity * item.unitPrice).toLocaleString()}</td>
                      {(canEdit || canDelete) && (
                        <td className="px-4 py-3 text-right">
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Item Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.itemCode}
                    onChange={e => setFormData({ ...formData, itemCode: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., INV-001"
                    disabled={!!editingItem}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Stationery, Electronics"
                    list="categories"
                  />
                  <datalist id="categories">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter item name"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Unit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., pcs, kg, box"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unit Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.unitPrice}
                    onChange={e => setFormData({ ...formData, unitPrice: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={e => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter supplier name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={formData.reorderLevel}
                    onChange={e => setFormData({ ...formData, reorderLevel: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Minimum stock alert level"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}