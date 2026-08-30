import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Save, 
  ArrowLeft,
  ChefHat,
  Clock,
  Database,
  GripVertical
} from 'lucide-react';
import { store, SystemSettings } from '../services/store';
import { Prep, Category, Ingredient, PrepItem } from '../types';

interface PrepListProps {
  settings: SystemSettings;
}

export const PrepList: React.FC<PrepListProps> = ({ settings }) => {
  const [preps, setPreps] = useState<Prep[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  
  // 画面遷移ステート: 'list' | 'detail' | 'create'
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create'>('list');
  const [selectedPrepId, setSelectedPrepId] = useState<string | null>(null);
  
  // フィルター
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // エディタフォーム用ステート
  const [formPrep, setFormPrep] = useState<Omit<Prep, 'totalCost' | 'unitCost'>>({
    id: '',
    name: '',
    categoryId: '',
    shelfLife: '',
    yieldQuantity: 1,
    yieldUnit: 'g',
    instructions: [],
    storageMethod: '',
    container: '',
    memo: '',
    imageUrl: '',
    items: [],
  });

  const [newInstruction, setNewInstruction] = useState('');
  const [newIngredientSearch, setNewIngredientSearch] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [newIngredientQty, setNewIngredientQty] = useState(1);
  const [newIngredientUnit, setNewIngredientUnit] = useState('g');

  const [draggedPrepId, setDraggedPrepId] = useState<string | null>(null);

  const canEdit = store.getUserRole() !== 'staff';

  const loadData = () => {
    setPreps([...store.getPreps()]);
    setCategories([...store.getCategories()]);
    setIngredients([...store.getIngredients()]);
  };

  useEffect(() => {
    loadData();
    return store.subscribe(loadData);
  }, []);

  // 編集開始
  const handleOpenDetail = (prep: Prep) => {
    setSelectedPrepId(prep.id);
    setFormPrep({
      id: prep.id,
      name: prep.name,
      categoryId: prep.categoryId,
      shelfLife: prep.shelfLife,
      yieldQuantity: prep.yieldQuantity,
      yieldUnit: prep.yieldUnit,
      instructions: [...prep.instructions],
      storageMethod: prep.storageMethod,
      container: prep.container,
      memo: prep.memo,
      imageUrl: prep.imageUrl,
      items: prep.items.map(item => ({ ...item })),
    });
    setNewInstruction('');
    setNewIngredientSearch('');
    setSelectedIngredient(null);
    setViewMode('detail');
  };

  // 新規作成開始
  const handleOpenCreate = () => {
    setFormPrep({
      id: '',
      name: '',
      categoryId: categories.find(c => c.name === '野菜' || c.name === '調味料' || c.name === 'トッピング')?.id || categories[0]?.id || '',
      shelfLife: '冷蔵3日程度',
      yieldQuantity: 1000,
      yieldUnit: 'g',
      instructions: [],
      storageMethod: '冷蔵保存',
      container: 'タッパー大',
      memo: '',
      imageUrl: '',
      items: [],
    });
    setNewInstruction('');
    setNewIngredientSearch('');
    setSelectedIngredient(null);
    setViewMode('create');
  };

  // 保存
  const handleSave = () => {
    if (!formPrep.name || !formPrep.categoryId) {
      alert('仕込み名とカテゴリは必須です。');
      return;
    }

    if (viewMode === 'create') {
      store.createPrep(formPrep);
    } else {
      store.updatePrep(formPrep.id, formPrep);
    }
    
    setViewMode('list');
  };

  // 削除
  const handleDeletePrep = (id: string, name: string) => {
    if (window.confirm(`「${name}」を削除しますか？\nこの仕込みを使用している提供レシピの原価計算に影響します。`)) {
      store.deletePrep(id);
      setViewMode('list');
    }
  };

  // 手順追加
  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return;
    setFormPrep({
      ...formPrep,
      instructions: [...formPrep.instructions, newInstruction.trim()]
    });
    setNewInstruction('');
  };

  // 手順削除
  const handleRemoveInstruction = (idx: number) => {
    const updated = [...formPrep.instructions];
    updated.splice(idx, 1);
    setFormPrep({ ...formPrep, instructions: updated });
  };

  // 食材検索候補の取得
  const ingredientSuggestions = newIngredientSearch.trim()
    ? ingredients.filter(ing => 
        ing.name.toLowerCase().includes(newIngredientSearch.toLowerCase()) && ing.status === 'active'
      ).slice(0, 5)
    : [];

  // 食材追加
  const handleAddIngredient = () => {
    if (!selectedIngredient) return;
    
    // 重複チェック
    const exists = formPrep.items.some(item => item.ingredientId === selectedIngredient.id);
    if (exists) {
      alert('すでに登録されている食材です。');
      return;
    }

    const newItem: PrepItem = {
      ingredientId: selectedIngredient.id,
      quantity: newIngredientQty,
      unit: newIngredientUnit,
      rawText: `${selectedIngredient.name}${newIngredientQty}${newIngredientUnit}`,
      memo: '',
    };

    setFormPrep({
      ...formPrep,
      items: [...formPrep.items, newItem]
    });

    setNewIngredientSearch('');
    setSelectedIngredient(null);
    setNewIngredientQty(1);
  };

  // 材料削除
  const handleRemoveIngredient = (idx: number) => {
    const updated = [...formPrep.items];
    updated.splice(idx, 1);
    setFormPrep({ ...formPrep, items: updated });
  };

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || '未分類';
  };

  const getIngredientName = (id: string | null) => {
    if (!id) return '不明な食材';
    return ingredients.find(ing => ing.id === id)?.name || '不明な食材';
  };

  const getIngredientUnitCost = (id: string | null) => {
    if (!id) return 0;
    return ingredients.find(ing => ing.id === id)?.unitCost || 0;
  };

  // 単位換算後の小計計算
  const calculateItemCost = (item: PrepItem) => {
    if (!item.ingredientId) return 0;
    const ing = ingredients.find(i => i.id === item.ingredientId);
    if (!ing) return 0;
    
    // 単位変換
    const u = item.unit.toLowerCase().trim();
    let baseQty = item.quantity;
    if (u === 'kg' || u === 'ｋｇ') baseQty = item.quantity * 1000;
    else if (u === 'l' || u === 'ｌ') baseQty = item.quantity * 1000;
    
    return baseQty * ing.unitCost;
  };

  // 現在編集中の仕込みの仮の総原価・単位原価計算
  const currentTempTotalCost = formPrep.items.reduce((sum, item) => sum + calculateItemCost(item), 0);
  const currentTempUnitCost = formPrep.yieldQuantity > 0 ? currentTempTotalCost / formPrep.yieldQuantity : 0;

  // フィルタリングされた一覧
  const filteredPreps = preps.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in">
      {viewMode === 'list' ? (
        // ================== 一覧画面 ==================
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>仕込みレシピ一覧</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>店舗で事前に作成する仕込みのレシピと単価を管理します</p>
            </div>
            {canEdit && (
              <button className="btn btn-primary" onClick={handleOpenCreate}>
                <Plus size={16} /> 新規仕込み作成
              </button>
            )}
          </div>

          {/* 検索・フィルターパネル */}
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
            <div className="filter-row" style={{ margin: 0 }}>
              <div className="filter-item" style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="仕込み名で検索..." 
                  style={{ paddingLeft: '36px' }}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                />
              </div>
              <div className="filter-item filter-item-sm">
                <select className="input-control" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}>
                  <option value="all">すべてのカテゴリ</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 仕込みリストカード */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px',
          }}>
            {filteredPreps.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                仕込みレシピが登録されていません。
              </div>
            ) : (
              filteredPreps.map(prep => (
                <div 
                  key={prep.id} 
                  className="glass-panel" 
                  onClick={() => handleOpenDetail(prep)}
                  draggable={canEdit && searchText === '' && selectedCategory === 'all'}
                  onDragStart={(e) => {
                    setDraggedPrepId(prep.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedPrepId === null || draggedPrepId === prep.id) return;
                    if (searchText !== '' || selectedCategory !== 'all') {
                      alert('並び替えはすべてのカテゴリを表示している状態でのみ可能です。');
                      return;
                    }
                    store.reorderPreps(draggedPrepId, prep.id);
                    setDraggedPrepId(null);
                  }}
                  onDragEnd={() => setDraggedPrepId(null)}
                  style={{ 
                    margin: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', 
                    justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
                    opacity: draggedPrepId === prep.id ? 0.5 : 1,
                    transform: draggedPrepId === prep.id ? 'scale(0.98)' : 'scale(1)',
                    transition: 'transform 0.2s ease, opacity 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                        {getCategoryName(prep.categoryId)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Clock size={12} />
                        {prep.shelfLife}
                      </span>
                    </div>

                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>{prep.name}</h3>
                    
                    {canEdit && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                        完成量: {prep.yieldQuantity} {prep.yieldUnit}
                      </div>
                    )}
                  </div>

                  {canEdit && (
                    <div style={{ 
                      borderTop: '1px solid var(--panel-border)', paddingTop: '12px', marginTop: '12px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>総原価</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>¥{Math.round(prep.totalCost).toLocaleString()}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>1{prep.yieldUnit}あたり原価</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-good)' }}>¥{prep.unitCost.toFixed(2)}</div>
                      </div>
                    </div>
                  )}
                  
                  <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.1 }}>
                    <ChevronRight size={40} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        // ================== 作成 / 編集画面 ==================
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
              <ArrowLeft size={16} /> 一覧へ戻る
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              {viewMode === 'detail' && canEdit && (
                <button type="button" className="btn btn-danger" onClick={() => handleDeletePrep(formPrep.id, formPrep.name)}>
                  <Trash2 size={16} /> 削除
                </button>
              )}
              {canEdit && (
                <button type="button" className="btn btn-primary" onClick={handleSave}>
                  <Save size={16} /> 保存する
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
            {/* 左側：基本情報 */}
            <div className="glass-panel" style={{ margin: 0, order: canEdit ? 1 : 2 }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChefHat size={18} />
                仕込み基本情報
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>仕込み名</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    required 
                    readOnly={!canEdit}
                    value={formPrep.name} 
                    onChange={e => setFormPrep({ ...formPrep, name: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>カテゴリ</label>
                    <select 
                      className="input-control" 
                      value={formPrep.categoryId} 
                      disabled={!canEdit}
                      onChange={e => setFormPrep({ ...formPrep, categoryId: e.target.value })}
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>保存期間</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      readOnly={!canEdit}
                      value={formPrep.shelfLife} 
                      onChange={e => setFormPrep({ ...formPrep, shelfLife: e.target.value })} 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>完成量</label>
                    <input 
                      type="number" 
                      className="input-control" 
                      min="1"
                      readOnly={!canEdit}
                      value={formPrep.yieldQuantity} 
                      onChange={e => setFormPrep({ ...formPrep, yieldQuantity: Number(e.target.value) })} 
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>完成単位</label>
                    <select 
                      className="input-control" 
                      value={formPrep.yieldUnit} 
                      disabled={!canEdit}
                      onChange={e => setFormPrep({ ...formPrep, yieldUnit: e.target.value })}
                    >
                      {['g', 'ml', '個', '本', '枚', 'パック', '缶'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>保存方法</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      readOnly={!canEdit}
                      value={formPrep.storageMethod} 
                      onChange={e => setFormPrep({ ...formPrep, storageMethod: e.target.value })} 
                      list="storage-methods-list"
                    />
                    <datalist id="storage-methods-list">
                      {Array.from(new Set(preps.map(p => p.storageMethod).filter(Boolean))).map(method => (
                        <option key={method} value={method} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>使用容器</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      readOnly={!canEdit}
                      value={formPrep.container} 
                      onChange={e => setFormPrep({ ...formPrep, container: e.target.value })} 
                      list="containers-list"
                    />
                    <datalist id="containers-list">
                      {Array.from(new Set(preps.map(p => p.container).filter(Boolean))).map(container => (
                        <option key={container} value={container} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>注意点 / メモ</label>
                  <textarea 
                    className="input-control" 
                    rows={3}
                    readOnly={!canEdit}
                    value={formPrep.memo} 
                    onChange={e => setFormPrep({ ...formPrep, memo: e.target.value })} 
                  />
                </div>
              </div>

              {/* 原価サマリーパネル */}
              {canEdit && (
                <div style={{ 
                  marginTop: '24px', padding: '16px', background: 'rgba(59,130,246,0.05)',
                  border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px',
                  display: 'flex', justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>仕込み総原価 (計算値)</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                      ¥{Math.round(currentTempTotalCost).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>1{formPrep.yieldUnit}あたり原価</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-good)', marginTop: '4px' }}>
                      ¥{currentTempUnitCost.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 右側：使用材料・作成手順 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', order: canEdit ? 2 : 1 }}>
              {/* 使用材料 */}
              <div className="glass-panel" style={{ margin: 0 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={18} />
                  使用材料
                </h3>

                {/* 材料のサジェスト追加フォーム */}
                {canEdit && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', position: 'relative' }}>
                    <div style={{ flex: 2, minWidth: '180px' }}>
                      <input 
                        type="text" 
                        className="input-control" 
                        placeholder="食材名で検索して選択..." 
                        value={newIngredientSearch}
                        onChange={e => {
                          setNewIngredientSearch(e.target.value);
                          if (selectedIngredient) setSelectedIngredient(null);
                        }}
                      />
                      {/* サジェストリスト */}
                      {ingredientSuggestions.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '44px', left: 0, width: '100%', background: '#1e293b',
                          border: '1px solid var(--panel-border)', borderRadius: '6px', zIndex: 10,
                          boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
                        }}>
                          {ingredientSuggestions.map(ing => (
                            <div 
                              key={ing.id}
                              onClick={() => {
                                setSelectedIngredient(ing);
                                setNewIngredientSearch(ing.name);
                              }}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--panel-border)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-glow)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ fontWeight: 600 }}>{ing.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{getCategoryName(ing.categoryId)} - {ing.purchaseQuantity}{ing.purchaseUnit}あたり¥{ing.purchasePriceExTax}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, display: 'flex', gap: '6px', minWidth: '120px' }}>
                      <input 
                        type="number" 
                        className="input-control" 
                        placeholder="分量" 
                        value={newIngredientQty}
                        onChange={e => setNewIngredientQty(Number(e.target.value))}
                      />
                      <select 
                        className="input-control"
                        value={newIngredientUnit}
                        onChange={e => setNewIngredientUnit(e.target.value)}
                        style={{ width: '80px' }}
                      >
                        {['g', 'kg', 'ml', 'L', '個', '本', '枚', '袋', 'パック', '束', 'ケース'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={handleAddIngredient} disabled={!selectedIngredient}>
                      追加
                    </button>
                  </div>
                )}

                {/* 登録済み材料一覧 */}
                <div className="table-wrapper">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        <th>品名</th>
                        <th style={{ width: '120px', textAlign: 'right' }}>使用量</th>
                        {canEdit && <th style={{ width: '120px', textAlign: 'right' }}>基準単価</th>}
                        {canEdit && <th style={{ width: '120px', textAlign: 'right' }}>小計原価</th>}
                        {canEdit && <th style={{ width: '50px' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {formPrep.items.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit ? 5 : 4} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>
                            材料が登録されていません。
                          </td>
                        </tr>
                      ) : (
                        formPrep.items.map((item, idx) => {
                          const cost = calculateItemCost(item);
                          const unitCost = getIngredientUnitCost(item.ingredientId);
                          const ingName = getIngredientName(item.ingredientId);
                          
                          return (
                            <tr key={idx}>
                              <td style={{ fontWeight: 600 }}>{ingName}</td>
                              <td style={{ textAlign: 'right' }}>
                                {canEdit ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                    <input 
                                      type="number" 
                                      step="any"
                                      className="table-input"
                                      value={item.quantity}
                                      onChange={e => {
                                        const updated = [...formPrep.items];
                                        updated[idx].quantity = Number(e.target.value);
                                        setFormPrep({ ...formPrep, items: updated });
                                      }}
                                      style={{ width: '80px', textAlign: 'right' }}
                                    />
                                    <span style={{ fontSize: '0.9em' }}>{item.unit}</span>
                                  </div>
                                ) : (
                                  `${item.quantity}${item.unit}`
                                )}
                              </td>
                              {canEdit && (
                                <td style={{ textAlign: 'right', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                                  ¥{unitCost.toFixed(3)}
                                </td>
                              )}
                              {canEdit && (
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                  ¥{Math.round(cost).toLocaleString()}
                                </td>
                              )}
                              {canEdit && (
                                <td style={{ textAlign: 'center' }}>
                                  <button type="button" onClick={() => handleRemoveIngredient(idx)} style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}>
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 作成手順 */}
              <div className="glass-panel" style={{ margin: 0 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
                  作成手順 ({formPrep.instructions.length}ステップ)
                </h3>

                {canEdit && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                    <input 
                      type="text" 
                      className="input-control" 
                      placeholder="新しい手順を入力..." 
                      value={newInstruction}
                      onChange={e => setNewInstruction(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleAddInstruction}>
                      追加
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {formPrep.instructions.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>手順が登録されていません。</p>
                  ) : (
                    formPrep.instructions.map((step, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                        padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)',
                        borderRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary-hover)', marginTop: canEdit ? '10px' : '0' }}>{idx + 1}.</span>
                          {canEdit ? (
                            <textarea
                              value={step}
                              onChange={(e) => {
                                const newInstructions = [...formPrep.instructions];
                                newInstructions[idx] = e.target.value;
                                setFormPrep({ ...formPrep, instructions: newInstructions });
                              }}
                              className="input-control"
                              style={{ flex: 1, resize: 'vertical', minHeight: '42px' }}
                              rows={2}
                            />
                          ) : (
                            <span>{step}</span>
                          )}
                        </div>
                        {canEdit && (
                          <button type="button" onClick={() => handleRemoveInstruction(idx)} style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer', marginLeft: '10px' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default PrepList;
