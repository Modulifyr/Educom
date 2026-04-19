import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/appStore';
import type { InventoryItem } from '../../types';
import { Package, Plus, AlertTriangle, Edit2, Trash2 } from 'lucide-react';

export function InventoryModule() {
  const { db, hasPermission } = useAppStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('');

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
    if (!db || !confirm('Are you sure?')) return;
    await db.inventory.delete(id);
    loadItems();
  };

  const categories = [...new Set(items.map(i => i.category))];
  const lowStock = items.filter(i => i.reorderLevel && i.quantity <= i.reorderLevel);
  const totalValue = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Inventory Management</h1>
        {hasPermission('inventory:create') && (
          <button
            onClick={() => {}}
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
                  {(hasPermission('inventory:edit') || hasPermission('inventory:delete')) && (
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
                      {(hasPermission('inventory:edit') || hasPermission('inventory:delete')) && (
                        <td className="px-4 py-3 text-right">
                          {hasPermission('inventory:edit') && (
                            <button
                              onClick={() => {}}
                              className="p-2 text-primary-600 hover:bg-primary-50 rounded"
                            >
                              <Edit2 size={16} />
                            </button>
                          )}
                          {hasPermission('inventory:delete') && (
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
    </div>
  );
}
