import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Filter, 
  Eye, 
  EyeOff, 
  RefreshCw,
  FolderOpen
} from 'lucide-react';
import { store, SystemSettings } from '../services/store';
import { Ingredient, Category, Supplier } from '../types';

interface InventoryTableProps {
  settings: SystemSettings;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ settings }) => {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // フィルター
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [showInactive, setShowInactive] = useState(false);
  
  // 新規追加フォーム表示用
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIng, setNewIng] = useState({
    name: '',
    categoryId: '',
    supplierId: '',
    purchaseQuantity: 1,
    purchaseUnit: 'g',
    purchasePriceExTax: 0,
    taxRate: 0.08,
    stockQuantity: 0,
  });

  // 編集権限
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

  const handleUpdate = (id: string, field: keyof Ingredient, value: any) => {
    if (!canEdit) return;
    
    // 数値型のパース
    let parsedValue = value;
    if (field === 'purchaseQuantity' || field === 'purchasePriceExTax' || field === 'stockQuantity' || field === 'taxRate') {
      parsedValue = value === '' ? 0 : parseFloat(value);
      if (isNaN(parsedValue)) parsedValue = 0;
    }
    
    store.updateIngredient(id, { [field]: parsedValue });
  };

  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIng.name || !newIng.categoryId) {
      alert('品名とカテゴリは必須です。');
      return;
    }
    store.addIngredient({
      name: newIng.name,
      categoryId: newIng.categoryId,
      supplierId: newIng.supplierId || null,
      purchaseQuantity: Number(newIng.purchaseQuantity),
      purchaseUnit: newIng.purchaseUnit,
      purchasePriceExTax: Number(newIng.purchasePriceExTax),
      taxRate: Number(newIng.taxRate),
      stockQuantity: Number(newIng.stockQuantity),
      status: 'active',
      memo: '',
    });
    setNewIng({
      name: '',
      categoryId: categories[0]?.id || '',
      supplierId: '',
      purchaseQuantity: 1,
      purchaseUnit: 'g',
      purchasePriceExTax: 0,
      taxRate: 0.08,
      stockQuantity: 0,
    });
    setShowAddForm(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (!canEdit) return;
    if (window.confirm(`「${name}」を削除しますか？\nこの食材を使用している仕込み・レシピの原価計算に影響を与える可能性があります。`)) {
      store.deleteIngredient(id);
    }
  };

  // フィルタリング処理
  const filteredIngredients = ingredients.filter(ing => {
    const matchesSearch = ing.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ing.categoryId === selectedCategory;
    
    let matchesSupplier = true;
    if (selectedSupplier !== 'all') {
      if (selectedSupplier === 'none') {
        matchesSupplier = ing.supplierId === null;
      } else {
        matchesSupplier = ing.supplierId === selectedSupplier;
      }
    }

    const matchesStatus = showInactive || ing.status === 'active';

    return matchesSearch && matchesCategory && matchesSupplier && matchesStatus;
  });

  // カテゴリ別グループ化 (選択カテゴリがallの場合のみカテゴリで区切る)
  const groupedIngredients: { [catId: string]: Ingredient[] } = {};
  filteredIngredients.forEach(ing => {
    if (!groupedIngredients[ing.categoryId]) {
      groupedIngredients[ing.categoryId] = [];
    }
    groupedIngredients[ing.categoryId].push(ing);
  });

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || '未分類';
  };

  const getSupplierName = (id: string | null) => {
    if (!id) return '-';
    return suppliers.find(s => s.id === id)?.name || '-';
  };

  // 全体棚卸合計の集計 (フィルタ反映後)
  const filteredTotalExTax = filteredIngredients.reduce((sum, ing) => sum + (ing.purchasePriceExTax * ing.stockQuantity), 0);
  const filteredTotalInTax = filteredIngredients.reduce((sum, ing) => sum + (ing.purchasePriceInTax * ing.stockQuantity), 0);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>食品・ドリンク棚卸表</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>食材・備品・ドリンクの仕入れ単価と在庫残量を管理します</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => {
            setNewIng(prev => ({ ...prev, categoryId: categories[0]?.id || '' }));
            setShowAddForm(!showAddForm);
          }}>
            <Plus size={16} /> 新規食材登録
          </button>
        )}
      </div>

      {/* 新規登録フォーム */}
      {showAddForm && (
        <form onSubmit={handleAddIngredient} className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>品名</label>
            <input type="text" className="input-control" required value={newIng.name} onChange={e => setNewIng({ ...newIng, name: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>カテゴリ</label>
            <select className="input-control" value={newIng.categoryId} onChange={e => setNewIng({ ...newIng, categoryId: e.target.value })}>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>発注先 / 業者</label>
            <select className="input-control" value={newIng.supplierId} onChange={e => setNewIng({ ...newIng, supplierId: e.target.value })}>
              <option value="">(未選択)</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>仕入れ容量</label>
            <input type="number" step="any" min="0.001" className="input-control" required value={newIng.purchaseQuantity} onChange={e => setNewIng({ ...newIng, purchaseQuantity: Number(e.target.value) })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>容量単位</label>
            <select className="input-control" value={newIng.purchaseUnit} onChange={e => setNewIng({ ...newIng, purchaseUnit: e.target.value })}>
              {['g', 'kg', 'ml', 'L', '個', '本', '枚', '袋', 'パック', '束', '缶', 'ケース'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>仕入れ単価 (税別)</label>
            <input type="number" min="0" className="input-control" required value={newIng.purchasePriceExTax} onChange={e => setNewIng({ ...newIng, purchasePriceExTax: Number(e.target.value) })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>税率</label>
            <select className="input-control" value={newIng.taxRate} onChange={e => setNewIng({ ...newIng, taxRate: Number(e.target.value) })}>
              <option value="0.08">8% (軽減税率)</option>
              <option value="0.10">10% (通常・酒類等)</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>初期在庫残量</label>
            <input type="number" step="any" min="0" className="input-control" value={newIng.stockQuantity} onChange={e => setNewIng({ ...newIng, stockQuantity: Number(e.target.value) })} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>キャンセル</button>
            <button type="submit" className="btn btn-primary">追加する</button>
          </div>
        </form>
      )}

      {/* 検索・フィルターパネル */}
      <div className="glass-panel no-print" style={{ padding: '16px', marginBottom: '20px' }}>
        <div className="filter-row" style={{ margin: 0 }}>
          {/* 検索 */}
          <div className="filter-item" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              className="input-control" 
              placeholder="品名で検索..." 
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
              <option value="none">発注先なし</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* 停止中も表示トグル */}
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => setShowInactive(!showInactive)}
            style={{ minWidth: '150px' }}
          >
            {showInactive ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{showInactive ? '停止中を非表示' : '停止中も表示'}</span>
          </button>
        </div>
      </div>

      {/* 棚卸評価額の表示 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 24px', 
        background: 'rgba(59, 130, 246, 0.05)',
        border: '1px solid rgba(59, 130, 246, 0.15)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '20px',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          {selectedCategory === 'all' ? '全体の棚卸評価額' : `${getCategoryName(selectedCategory)} の棚卸評価額`}
        </span>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '8px' }}>税別:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>¥{Math.round(filteredTotalExTax).toLocaleString()}</span>
          </div>
          <div style={{ borderLeft: '1px solid var(--panel-border)', height: '24px' }}></div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: '8px' }}>税込:</span>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-good)' }}>¥{Math.round(filteredTotalInTax).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Excel風テーブル */}
      <div className="table-wrapper">
        <table className="excel-table">
          <thead>
            <tr>
              <th>品名</th>
              <th>発注先</th>
              <th style={{ width: '90px' }}>仕入容量</th>
              <th style={{ width: '90px' }}>単位</th>
              <th style={{ width: '120px' }}>単価 (税別)</th>
              <th style={{ width: '80px' }}>税率</th>
              <th style={{ width: '100px' }}>在庫残量</th>
              <th style={{ width: '130px' }}>棚卸額 (税別)</th>
              <th style={{ width: '80px' }}>状態</th>
              {canEdit && <th style={{ width: '60px' }} className="no-print">操作</th>}
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => {
              // 選択カテゴリフィルターがある場合はそのカテゴリのみ表示
              if (selectedCategory !== 'all' && selectedCategory !== cat.id) return null;
              
              const ingsInCat = groupedIngredients[cat.id] || [];
              if (ingsInCat.length === 0) return null;

              return (
                <React.Fragment key={cat.id}>
                  {/* カテゴリセパレータ行 */}
                  <tr className="category-row">
                    <td colSpan={canEdit ? 10 : 9} style={{ display: 'table-cell', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FolderOpen size={16} />
                        <span>{cat.name} ({ingsInCat.length}件)</span>
                      </div>
                    </td>
                  </tr>

                  {ingsInCat.map(ing => {
                    const inventoryAmountEx = ing.purchasePriceExTax * ing.stockQuantity;
                    return (
                      <tr key={ing.id} style={{ opacity: ing.status === 'inactive' ? 0.5 : 1 }}>
                        {/* 品名 */}
                        <td>
                          {canEdit ? (
                            <input 
                              type="text" 
                              className="table-input" 
                              value={ing.name}
                              onChange={e => handleUpdate(ing.id, 'name', e.target.value)}
                            />
                          ) : (
                            ing.name
                          )}
                        </td>
                        
                        {/* 発注先 */}
                        <td>
                          {canEdit ? (
                            <select 
                              className="table-input"
                              value={ing.supplierId || ''}
                              onChange={e => handleUpdate(ing.id, 'supplierId', e.target.value || null)}
                              style={{ background: 'transparent' }}
                            >
                              <option value="" style={{ background: '#1e293b' }}>-</option>
                              {suppliers.map(s => (
                                <option key={s.id} value={s.id} style={{ background: '#1e293b' }}>{s.name}</option>
                              ))}
                            </select>
                          ) : (
                            getSupplierName(ing.supplierId)
                          )}
                        </td>

                        {/* 容量 */}
                        <td>
                          {canEdit ? (
                            <input 
                              type="number" 
                              step="any"
                              min="0.001"
                              className="table-input"
                              value={ing.purchaseQuantity}
                              onChange={e => handleUpdate(ing.id, 'purchaseQuantity', e.target.value)}
                              style={{ textAlign: 'right' }}
                            />
                          ) : (
                            ing.purchaseQuantity
                          )}
                        </td>

                        {/* 単位 */}
                        <td>
                          {canEdit ? (
                            <select
                              className="table-input"
                              value={ing.purchaseUnit}
                              onChange={e => handleUpdate(ing.id, 'purchaseUnit', e.target.value)}
                            >
                              {['g', 'kg', 'ml', 'L', '個', '本', '枚', '袋', 'パック', '束', '缶', 'ケース'].map(u => (
                                <option key={u} value={u} style={{ background: '#1e293b' }}>{u}</option>
                              ))}
                            </select>
                          ) : (
                            ing.purchaseUnit
                          )}
                        </td>

                        {/* 単価 */}
                        <td>
                          {canEdit ? (
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-secondary)', marginRight: '4px' }}>¥</span>
                              <input 
                                type="number" 
                                className="table-input"
                                value={ing.purchasePriceExTax}
                                onChange={e => handleUpdate(ing.id, 'purchasePriceExTax', e.target.value)}
                                style={{ textAlign: 'right' }}
                              />
                            </div>
                          ) : (
                            `¥${ing.purchasePriceExTax.toLocaleString()}`
                          )}
                        </td>

                        {/* 税率 */}
                        <td>
                          {canEdit ? (
                            <select
                              className="table-input"
                              value={ing.taxRate}
                              onChange={e => handleUpdate(ing.id, 'taxRate', e.target.value)}
                            >
                              <option value="0.08" style={{ background: '#1e293b' }}>8%</option>
                              <option value="0.10" style={{ background: '#1e293b' }}>10%</option>
                            </select>
                          ) : (
                            `${ing.taxRate * 100}%`
                          )}
                        </td>

                        {/* 在庫残量 */}
                        <td>
                          {canEdit ? (
                            <input 
                              type="number" 
                              step="any"
                              min="0"
                              className="table-input"
                              value={ing.stockQuantity}
                              onChange={e => handleUpdate(ing.id, 'stockQuantity', e.target.value)}
                              style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-hover)' }}
                            />
                          ) : (
                            ing.stockQuantity
                          )}
                        </td>

                        {/* 棚卸額 (税別) */}
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          ¥{Math.round(inventoryAmountEx).toLocaleString()}
                        </td>

                        {/* 状態ステータス */}
                        <td>
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => handleUpdate(ing.id, 'status', ing.status === 'active' ? 'inactive' : 'active')}
                              style={{
                                border: 'none',
                                background: ing.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                color: ing.status === 'active' ? 'var(--color-good)' : 'var(--text-muted)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: 600,
                              }}
                            >
                              {ing.status === 'active' ? '使用中' : '停止中'}
                            </button>
                          ) : (
                            <span style={{ color: ing.status === 'active' ? 'var(--color-good)' : 'var(--text-muted)' }}>
                              {ing.status === 'active' ? '使用中' : '停止中'}
                            </span>
                          )}
                        </td>

                        {/* 削除操作 */}
                        {canEdit && (
                          <td className="no-print" style={{ textAlign: 'center' }}>
                            <button 
                              type="button" 
                              onClick={() => handleDelete(ing.id, ing.name)}
                              style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default InventoryTable;
