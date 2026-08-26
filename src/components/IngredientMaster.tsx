import React, { useState, useEffect } from 'react';
import { Search, Database, FileText } from 'lucide-react';
import { store, SystemSettings } from '../services/store';
import { Ingredient, Category, Supplier } from '../types';

interface IngredientMasterProps {
  settings: SystemSettings;
}

export const IngredientMaster: React.FC<IngredientMasterProps> = ({ settings }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // フィルター
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');

  const canEdit = settings.userRole === 'admin' || settings.userRole === 'manager';

  const loadData = () => {
    setIngredients([...store.getIngredients()]);
    setCategories([...store.getCategories()]);
    setSuppliers([...store.getSuppliers()]);
  };

  useEffect(() => {
    loadData();
    return store.subscribe(loadData);
  }, []);

  const handleMemoChange = (id: string, memo: string) => {
    if (!canEdit) return;
    store.updateIngredient(id, { memo });
  };

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || '未分類';
  };

  const getSupplierName = (id: string | null) => {
    if (!id) return '-';
    return suppliers.find(s => s.id === id)?.name || '-';
  };

  // フィルタリング
  const filtered = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ing.categoryId === selectedCategory;
    const matchesSupplier = selectedSupplier === 'all' || ing.supplierId === selectedSupplier;
    return matchesSearch && matchesCategory && matchesSupplier && ing.status === 'active';
  });

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>基準食材単価マスタ</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          棚卸表の仕入価格から、レシピや仕込み原価計算で使用する「1gあたり単価」「1mlあたり単価」等の基準単価を自動生成します
        </p>
      </div>

      {/* 検索・フィルターパネル */}
      <div className="glass-panel no-print" style={{ padding: '16px', marginBottom: '20px' }}>
        <div className="filter-row" style={{ margin: 0 }}>
          {/* 検索 */}
          <div className="filter-item" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-control" 
              placeholder="食材名で検索..." 
              style={{ paddingLeft: '36px' }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>

          {/* カテゴリ */}
          <div className="filter-item filter-item-sm">
            <select className="input-control" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
              <option value="all">すべてのカテゴリ</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* 業者 */}
          <div className="filter-item filter-item-sm">
            <select className="input-control" value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
              <option value="all">すべての発注先</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* マスタテーブル */}
      <div className="table-wrapper">
        <table className="excel-table">
          <thead>
            <tr>
              <th style={{ width: '80px' }}>食材ID</th>
              <th>食材名</th>
              <th>カテゴリ</th>
              <th>発注先</th>
              <th>仕入容量・単位</th>
              <th>仕入れ価格 (税別)</th>
              <th style={{ width: '100px', textAlign: 'center' }}>基準単位</th>
              <th style={{ width: '150px', textAlign: 'right' }}>基準単価 (税別)</th>
              <th>計算式</th>
              <th>メモ (発注詳細など)</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  該当する食材がありません。
                </td>
              </tr>
            ) : (
              filtered.map(ing => {
                // 計算プロセスの説明
                let formula = '';
                const u = ing.purchaseUnit.toLowerCase();
                if (u === 'kg' || u === 'ｋｇ') {
                  formula = `¥${ing.purchasePriceExTax} ÷ (${ing.purchaseQuantity}kg × 1,000)`;
                } else if (u === 'l' || u === 'ｌ') {
                  formula = `¥${ing.purchasePriceExTax} ÷ (${ing.purchaseQuantity}L × 1,000)`;
                } else {
                  formula = `¥${ing.purchasePriceExTax} ÷ ${ing.purchaseQuantity}${ing.purchaseUnit}`;
                }

                return (
                  <tr key={ing.id}>
                    {/* 食材ID */}
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {ing.id.replace('ing_', '')}
                    </td>

                    {/* 食材名 */}
                    <td style={{ fontWeight: 600 }}>{ing.name}</td>

                    {/* カテゴリ */}
                    <td>
                      <span style={{
                        padding: '3px 8px', borderRadius: '4px',
                        background: 'rgba(255,255,255,0.05)', fontSize: '0.85em'
                      }}>
                        {getCategoryName(ing.categoryId)}
                      </span>
                    </td>

                    {/* 発注先 */}
                    <td>{getSupplierName(ing.supplierId)}</td>

                    {/* 仕入容量 */}
                    <td>{`${ing.purchaseQuantity} ${ing.purchaseUnit}`}</td>

                    {/* 仕入価格 */}
                    <td>{`¥${ing.purchasePriceExTax.toLocaleString()}`}</td>

                    {/* 基準単位 */}
                    <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary-hover)' }}>
                      {ing.baseUnit}
                    </td>

                    {/* 基準単価 */}
                    <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--color-good)', fontSize: '1.05em' }}>
                      {`¥${ing.unitCost.toFixed(3)}`}
                      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        /{ing.baseUnit}
                      </span>
                    </td>

                    {/* 計算式 */}
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formula}
                    </td>

                    {/* メモ */}
                    <td>
                      {canEdit ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FileText size={14} style={{ color: 'var(--text-muted)' }} />
                          <input 
                            type="text" 
                            className="table-input"
                            placeholder="メモを追加..."
                            value={ing.memo || ''}
                            onChange={e => handleMemoChange(ing.id, e.target.value)}
                          />
                        </div>
                      ) : (
                        ing.memo || '-'
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default IngredientMaster;
