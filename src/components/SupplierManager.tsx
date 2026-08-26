import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Save, Trash, Phone, Mail, User, ShieldAlert, Database } from 'lucide-react';
import { store, SystemSettings } from '../services/store';
import { Supplier, Ingredient } from '../types';

interface SupplierManagerProps {
  settings: SystemSettings;
}

export const SupplierManager: React.FC<SupplierManagerProps> = ({ settings }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  
  // 新規追加フォーム
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSupp, setNewSupp] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    memo: '',
  });

  // 編集フォーム
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSupp, setEditSupp] = useState<Supplier>({
    id: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    memo: '',
  });

  const canEdit = settings.userRole === 'admin' || settings.userRole === 'manager';

  const loadData = () => {
    const list = store.getSuppliers();
    setSuppliers([...list]);
    setIngredients([...store.getIngredients()]);
    if (list.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(list[0].id);
    }
  };

  useEffect(() => {
    loadData();
    return store.subscribe(loadData);
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupp.name.trim()) return;
    const id = store.createSupplier(newSupp);
    setNewSupp({ name: '', contactPerson: '', phone: '', email: '', memo: '' });
    setShowAddForm(false);
    setSelectedSupplierId(id);
  };

  const handleStartEdit = (supp: Supplier) => {
    setEditingId(supp.id);
    setEditSupp({ ...supp });
  };

  const handleSaveEdit = () => {
    if (!editSupp.name.trim()) return;
    store.updateSupplier(editSupp.id, editSupp);
    setEditingId(null);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`「${name}」を削除しますか？\nこの業者が登録されていた食材は「発注先なし」に更新されます。`)) {
      store.deleteSupplier(id);
      if (selectedSupplierId === id) {
        setSelectedSupplierId(suppliers.find(s => s.id !== id)?.id || null);
      }
    }
  };

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const supplierIngredients = ingredients.filter(ing => ing.supplierId === selectedSupplierId && ing.status === 'active');

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>発注先・仕入れ業者管理</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>食材の仕入れ先業者、連絡先、取扱食材を一覧管理します</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={16} /> 新規業者登録
          </button>
        )}
      </div>

      {/* 新規登録 */}
      {showAddForm && (
        <form onSubmit={handleAdd} className="glass-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>業者名</label>
            <input type="text" className="input-control" required value={newSupp.name} onChange={e => setNewSupp({ ...newSupp, name: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>担当者名</label>
            <input type="text" className="input-control" value={newSupp.contactPerson} onChange={e => setNewSupp({ ...newSupp, contactPerson: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>電話番号</label>
            <input type="text" className="input-control" value={newSupp.phone} onChange={e => setNewSupp({ ...newSupp, phone: e.target.value })} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>メールアドレス</label>
            <input type="email" className="input-control" value={newSupp.email} onChange={e => setNewSupp({ ...newSupp, email: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>発注メモ (締日、最小発注単位など)</label>
            <input type="text" className="input-control" value={newSupp.memo} onChange={e => setNewSupp({ ...newSupp, memo: e.target.value })} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>キャンセル</button>
            <button type="submit" className="btn btn-primary">登録する</button>
          </div>
        </form>
      )}

      {/* メインレイアウト */}
      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* 左側：業者リスト */}
        <div style={{ flex: 1, minWidth: '300px' }}>
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '8px' }}>業者一覧</h3>
            {suppliers.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>登録されている業者がありません。</p>
            ) : (
              suppliers.map(s => (
                <div 
                  key={s.id}
                  onClick={() => { if (editingId !== s.id) setSelectedSupplierId(s.id); }}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '12px 16px', borderRadius: '8px', 
                    background: selectedSupplierId === s.id ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid',
                    borderColor: selectedSupplierId === s.id ? 'var(--primary)' : 'var(--panel-border)',
                    cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{s.name}</span>
                  {canEdit && (
                    <div style={{ display: 'flex', gap: '8px' }} className="no-print">
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(s); }}
                        style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id, s.name); }}
                        style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 右側：詳細 ＆ 取扱食材 */}
        <div style={{ flex: 2, minWidth: '400px' }}>
          {selectedSupplier ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* 基本情報パネル / 編集フォーム */}
              <div className="glass-panel" style={{ margin: 0 }}>
                {editingId === selectedSupplier.id ? (
                  /* 編集ビュー */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>業者情報の編集</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>業者名</label>
                        <input type="text" className="input-control" value={editSupp.name} onChange={e => setEditSupp({ ...editSupp, name: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>担当者名</label>
                        <input type="text" className="input-control" value={editSupp.contactPerson} onChange={e => setEditSupp({ ...editSupp, contactPerson: e.target.value })} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>電話番号</label>
                        <input type="text" className="input-control" value={editSupp.phone} onChange={e => setEditSupp({ ...editSupp, phone: e.target.value })} />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>メールアドレス</label>
                        <input type="email" className="input-control" value={editSupp.email} onChange={e => setEditSupp({ ...editSupp, email: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>発注メモ</label>
                      <input type="text" className="input-control" value={editSupp.memo} onChange={e => setEditSupp({ ...editSupp, memo: e.target.value })} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>キャンセル</button>
                      <button type="button" className="btn btn-primary" onClick={handleSaveEdit}><Save size={14} /> 保存</button>
                    </div>
                  </div>
                ) : (
                  /* 詳細表示ビュー */
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '20px' }}>{selectedSupplier.name} 詳細</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <User size={18} style={{ color: 'var(--primary-hover)' }} />
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>担当者</div>
                          <div style={{ fontWeight: 600 }}>{selectedSupplier.contactPerson || '-'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Phone size={18} style={{ color: 'var(--primary-hover)' }} />
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>電話番号</div>
                          <div style={{ fontWeight: 600 }}>{selectedSupplier.phone || '-'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Mail size={18} style={{ color: 'var(--primary-hover)' }} />
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>メールアドレス</div>
                          <div style={{ fontWeight: 600 }}>{selectedSupplier.email || '-'}</div>
                        </div>
                      </div>
                    </div>
                    {selectedSupplier.memo && (
                      <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>発注メモ</div>
                        <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{selectedSupplier.memo}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 取扱食材一覧 */}
              <div className="glass-panel" style={{ margin: 0 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={18} />
                  取扱食材一覧 ({supplierIngredients.length}品)
                </h3>
                {supplierIngredients.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>この業者が取扱う食材は登録されていません。</p>
                ) : (
                  <div className="table-wrapper">
                    <table className="excel-table">
                      <thead>
                        <tr>
                          <th>食材名</th>
                          <th>仕入容量・単位</th>
                          <th style={{ textAlign: 'right' }}>単価 (税別)</th>
                          <th style={{ textAlign: 'center' }}>基準単位</th>
                          <th style={{ textAlign: 'right' }}>基準単価</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierIngredients.map(ing => (
                          <tr key={ing.id}>
                            <td style={{ fontWeight: 600 }}>{ing.name}</td>
                            <td>{ing.purchaseQuantity} {ing.purchaseUnit}</td>
                            <td style={{ textAlign: 'right' }}>¥{ing.purchasePriceExTax.toLocaleString()}</td>
                            <td style={{ textAlign: 'center' }}>{ing.baseUnit}</td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-good)' }}>¥{ing.unitCost.toFixed(3)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              業者を選択するか、新規登録してください。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SupplierManager;
