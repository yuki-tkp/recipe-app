import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Save, 
  ArrowLeft,
  Flame,
  Printer,
  Eye,
  EyeOff,
  Database,
  ChefHat,
  Sliders,
  DollarSign,
  GripVertical
} from 'lucide-react';
import { store, SystemSettings } from '../services/store';
import { Recipe, Category, Ingredient, Prep, RecipeItem } from '../types';

interface RecipeListProps {
  settings: SystemSettings;
  selectedRecipeId: string | null;
  setSelectedRecipeId: (id: string | null) => void;
}

export const RecipeList: React.FC<RecipeListProps> = ({ settings, selectedRecipeId, setSelectedRecipeId }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [preps, setPreps] = useState<Prep[]>([]);
  
  // 画面遷移ステート: 'list' | 'detail' | 'create'
  const [viewMode, setViewMode] = useState<'list' | 'detail' | 'create'>('list');

  // 印刷モード設定
  const [printMode, setPrintMode] = useState(false);
  const [printShowCostInfo, setPrintShowCostInfo] = useState(false);
  const [printShowInstructions, setPrintShowInstructions] = useState(true);
  const [printShowPhoto, setPrintShowPhoto] = useState(true);

  // 検索・フィルタ
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // エディタフォーム用
  const [formRecipe, setFormRecipe] = useState<Omit<Recipe, 'costPrice' | 'costRate' | 'grossProfit' | 'sellingPriceExTax'>>({
    id: '',
    name: '',
    categoryId: '',
    sellingPriceInTax: 0,
    dishware: '',
    instructions: [],
    imageUrl: '',
    status: 'public',
    memo: '',
    items: [],
  });

  const [newInstruction, setNewInstruction] = useState('');
  const [newMaterialSearch, setNewMaterialSearch] = useState('');
  const [newMaterialType, setNewMaterialType] = useState<'ingredient' | 'prep'>('ingredient');
  const [selectedMaterial, setSelectedMaterial] = useState<{ id: string; name: string; unit: string } | null>(null);
  const [newMaterialQty, setNewMaterialQty] = useState(1);
  const [newMaterialUnit, setNewMaterialUnit] = useState('g');

  const [draggedRecipeId, setDraggedRecipeId] = useState<string | null>(null);
  const [draggedMaterialIndex, setDraggedMaterialIndex] = useState<number | null>(null);

  const canEdit = store.getUserRole() !== 'staff';

  const loadData = () => {
    setRecipes([...store.getRecipes()]);
    setCategories([...store.getCategories()]);
    setIngredients([...store.getIngredients()]);
    setPreps([...store.getPreps()]);
  };

  useEffect(() => {
    loadData();
    const unsub = store.subscribe(loadData);
    
    // ダッシュボード等からの遷移用
    if (selectedRecipeId) {
      const rec = store.getRecipes().find(r => r.id === selectedRecipeId);
      if (rec) {
        handleOpenDetail(rec);
      }
      setSelectedRecipeId(null); // クリア
    }
    
    return unsub;
  }, [selectedRecipeId]);

  const handleOpenDetail = (recipe: Recipe) => {
    setFormRecipe({
      id: recipe.id,
      name: recipe.name,
      categoryId: recipe.categoryId,
      sellingPriceInTax: recipe.sellingPriceInTax,
      dishware: recipe.dishware,
      instructions: [...recipe.instructions],
      imageUrl: recipe.imageUrl,
      status: recipe.status,
      memo: recipe.memo,
      items: recipe.items.map(item => ({ ...item })),
    });
    setNewInstruction('');
    setNewMaterialSearch('');
    setSelectedMaterial(null);
    setPrintMode(false);
    setViewMode('detail');
  };

  const handleOpenCreate = () => {
    setFormRecipe({
      id: '',
      name: '',
      categoryId: categories[0]?.id || '',
      sellingPriceInTax: 880,
      dishware: '丸皿',
      instructions: [],
      imageUrl: '',
      status: 'public',
      memo: '',
      items: [],
    });
    setNewInstruction('');
    setNewMaterialSearch('');
    setSelectedMaterial(null);
    setPrintMode(false);
    setViewMode('create');
  };

  const handleSave = () => {
    if (!formRecipe.name || !formRecipe.categoryId) {
      alert('レシピ名とカテゴリは必須です。');
      return;
    }

    if (viewMode === 'create') {
      const newId = store.createRecipe(formRecipe);
      setFormRecipe(prev => ({ ...prev, id: newId }));
      if (setSelectedRecipeId) setSelectedRecipeId(newId);
      setViewMode('detail');
    } else {
      store.updateRecipe(formRecipe.id, formRecipe);
    }
    
    alert('保存しました');
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`「${name}」を削除しますか？`)) {
      store.deleteRecipe(id);
      setViewMode('list');
    }
  };

  // 手順
  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return;
    setFormRecipe({
      ...formRecipe,
      instructions: [...formRecipe.instructions, newInstruction.trim()]
    });
    setNewInstruction('');
  };

  const handleRemoveInstruction = (idx: number) => {
    const updated = [...formRecipe.instructions];
    updated.splice(idx, 1);
    setFormRecipe({ ...formRecipe, instructions: updated });
  };

  // サジェスト
  const materialSuggestions = newMaterialSearch.trim()
    ? newMaterialType === 'ingredient'
      ? ingredients.filter(ing => ing.name.toLowerCase().includes(newMaterialSearch.toLowerCase()) && ing.status === 'active').slice(0, 5)
      : preps.filter(prep => prep.name.toLowerCase().includes(newMaterialSearch.toLowerCase())).slice(0, 5)
    : [];

  // 材料追加
  const handleAddMaterial = () => {
    if (!selectedMaterial && !newMaterialSearch.trim()) return;

    if (selectedMaterial) {
      const exists = formRecipe.items.some(item => item.id === selectedMaterial.id && item.type === newMaterialType);
      if (exists) {
        alert('すでに登録されている材料です。');
        return;
      }

      const newItem: RecipeItem = {
        type: newMaterialType,
        id: selectedMaterial.id,
        quantity: newMaterialQty,
        unit: newMaterialUnit,
        rawText: `${selectedMaterial.name}${newMaterialQty}${newMaterialUnit}`,
        memo: '',
      };

      setFormRecipe({
        ...formRecipe,
        items: [...formRecipe.items, newItem]
      });
    } else {
      const customName = newMaterialSearch.trim();
      const newItem: RecipeItem = {
        type: 'custom',
        id: null,
        customName: customName,
        quantity: newMaterialQty,
        unit: newMaterialUnit,
        rawText: `${customName}${newMaterialQty}${newMaterialUnit}`,
        memo: '',
      };

      setFormRecipe({
        ...formRecipe,
        items: [...formRecipe.items, newItem]
      });
    }

    setNewMaterialSearch('');
    setSelectedMaterial(null);
    setNewMaterialQty(1);
  };

  const handleRemoveMaterial = (idx: number) => {
    const updated = [...formRecipe.items];
    updated.splice(idx, 1);
    setFormRecipe({ ...formRecipe, items: updated });
  };

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || '未分類';
  };

  const getMaterialName = (item: RecipeItem) => {
    if (item.type === 'custom') return item.customName || '不明な材料';
    if (!item.id) return '不明な材料';
    if (item.type === 'ingredient') {
      return ingredients.find(ing => ing.id === item.id)?.name || '不明な食材';
    } else {
      return preps.find(p => p.id === item.id)?.name || '不明な仕込み';
    }
  };

  const getMaterialUnitCost = (item: RecipeItem) => {
    if (!item.id) return 0;
    if (item.type === 'ingredient') {
      return ingredients.find(ing => ing.id === item.id)?.unitCost || 0;
    } else {
      return preps.find(p => p.id === item.id)?.unitCost || 0;
    }
  };

  const calculateItemCost = (item: RecipeItem) => {
    const unitCost = getMaterialUnitCost(item);
    const { baseQty } = store.getIngredients().length > 0
      ? { baseQty: item.quantity } // モック
      : { baseQty: item.quantity };
      
    // 単位換算
    const u = item.unit.toLowerCase().trim();
    let calculatedQty = item.quantity;
    if (u === 'kg' || u === 'ｋｇ') calculatedQty = item.quantity * 1000;
    else if (u === 'l' || u === 'ｌ') calculatedQty = item.quantity * 1000;

    return calculatedQty * unitCost;
  };

  // 編集レシピの仮計算
  const tempSellingEx = Number((formRecipe.sellingPriceInTax / 1.10).toFixed(2));
  const tempCostPrice = formRecipe.items.reduce((sum, item) => sum + calculateItemCost(item), 0);
  const tempCostRate = tempSellingEx > 0 ? Number(((tempCostPrice / tempSellingEx) * 100).toFixed(1)) : 0;
  const tempGross = Number((tempSellingEx - tempCostPrice).toFixed(2));

  const getCostRateClass = (rate: number) => {
    if (rate < 25) return 'cost-rate-good';
    if (rate <= 35) return 'cost-rate-normal';
    if (rate <= 45) return 'cost-rate-warning';
    return 'cost-rate-danger';
  };

  // フィルタリング
  const filteredRecipes = recipes.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || r.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="animate-fade-in">
      {viewMode === 'list' ? (
        // ================== 一覧画面 ==================
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>提供メニューレシピ表</h2>
              <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>お客様に提供するメニューのレシピ、原価、粗利、手順を管理します</p>
            </div>
            {canEdit && (
              <button className="btn btn-primary" onClick={handleOpenCreate}>
                <Plus size={16} /> 新規レシピ作成
              </button>
            )}
          </div>

          {/* 検索・フィルター */}
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
            <div className="filter-row" style={{ margin: 0 }}>
              <div className="filter-item" style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '13px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  className="input-control" 
                  placeholder="メニュー名で検索..." 
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

          {/* レシピ一覧カード */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
            gap: '20px',
          }}>
            {filteredRecipes.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                提供レシピが登録されていません。
              </div>
            ) : (
              filteredRecipes.map(recipe => (
                <div 
                  key={recipe.id} 
                  className="glass-panel"
                  onClick={() => handleOpenDetail(recipe)}
                  draggable={canEdit && searchText === '' && selectedCategory === 'all'}
                  onDragStart={(e) => {
                    setDraggedRecipeId(recipe.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedRecipeId === null || draggedRecipeId === recipe.id) return;
                    if (searchText !== '' || selectedCategory !== 'all') {
                      alert('並び替えはすべてのカテゴリを表示している状態でのみ可能です。');
                      return;
                    }
                    store.reorderRecipes(draggedRecipeId, recipe.id);
                    setDraggedRecipeId(null);
                  }}
                  onDragEnd={() => setDraggedRecipeId(null)}
                  style={{ 
                    margin: 0, cursor: 'pointer', display: 'flex', flexDirection: 'column', 
                    justifyContent: 'space-between', position: 'relative', overflow: 'hidden',
                    opacity: draggedRecipeId === recipe.id ? 0.5 : (recipe.status === 'private' ? 0.6 : 1),
                    transform: draggedRecipeId === recipe.id ? 'scale(0.98)' : 'scale(1)',
                    transition: 'transform 0.2s ease, opacity 0.2s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--panel-border)'}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                        {getCategoryName(recipe.categoryId)}
                      </span>
                      {recipe.status === 'private' && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <EyeOff size={12} /> 非公開
                        </span>
                      )}
                    </div>

                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '4px' }}>{recipe.name}</h3>
                    {canEdit && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>食器: {recipe.dishware || '-'}</p>
                    )}
                  </div>

                  {/* 簡易財務表示 */}
                  {canEdit && (
                    <div style={{
                      marginTop: '20px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      borderTop: '1px solid var(--panel-border)',
                      paddingTop: '12px',
                      gap: '10px'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>売価(税込)</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>¥{Math.round(recipe.sellingPriceInTax).toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>原価</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700 }}>¥{Math.round(recipe.costPrice).toLocaleString()}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>原価率</div>
                        <span className={`badge ${getCostRateClass(recipe.costRate)}`} style={{ padding: '2px 6px', marginTop: '2px', fontSize: '0.8rem' }}>
                          {recipe.costRate.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>粗利</div>
                        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-good)' }}>¥{Math.round(recipe.sellingPriceExTax - recipe.costPrice).toLocaleString()}</div>
                      </div>
                    </div>
                  )}

                  <div style={{ position: 'absolute', right: '12px', top: '35%', opacity: 0.1 }}>
                    <ChevronRight size={36} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : printMode ? (
        // ================== A4印刷用レイアウト画面 ==================
        <div className="animate-fade-in recipe-print-container" style={{ background: '#fff', color: '#000', padding: '20px', borderRadius: '8px' }}>
          {/* コントロールパネル (印刷時にはCSSで消える) */}
          <div className="glass-panel no-print" style={{ margin: 0, marginBottom: '24px', background: 'rgba(30,41,59,0.9)', color: '#fff' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} /> 印刷設定
            </h4>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={printShowCostInfo} onChange={e => setPrintShowCostInfo(e.target.checked)} />
                原価・売価を表示する
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                <input type="checkbox" checked={printShowInstructions} onChange={e => setPrintShowInstructions(e.target.checked)} />
                作成手順を表示する
              </label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={16} /> 印刷する (A4出力)
              </button>
              <button className="btn btn-secondary" onClick={() => setPrintMode(false)}>
                プレビューを閉じる
              </button>
            </div>
          </div>

          {/* 実際の紙面デザイン */}
          <div style={{ border: '2px solid #000', padding: '30px', minHeight: '800px', display: 'flex', flexDirection: 'column', color: '#000' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, border: '1px solid #000', padding: '2px 8px' }}>
                  {getCategoryName(formRecipe.categoryId)}
                </span>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginTop: '8px', color: '#000' }}>{formRecipe.name}</h1>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1rem', fontWeight: 600 }}>使用食器: {formRecipe.dishware || '(指定なし)'}</div>
                {printShowCostInfo && (
                  <div style={{ marginTop: '10px', fontSize: '1.1rem', fontWeight: 700 }}>
                    <div>売価: ¥{Math.round(formRecipe.sellingPriceInTax).toLocaleString()} (税込)</div>
                    <div style={{ fontSize: '0.9rem', color: '#333' }}>原価: ¥{Math.round(tempCostPrice).toLocaleString()} (原価率: {tempCostRate}%)</div>
                  </div>
                )}
              </div>
            </div>

            {/* 材料リスト */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '12px' }}>■ 使用材料</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '1.15rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #000' }}>
                    <th style={{ textAlign: 'left', padding: '6px' }}>材料名</th>
                    <th style={{ textAlign: 'right', padding: '6px', width: '150px' }}>使用量</th>
                  </tr>
                </thead>
                <tbody>
                  {formRecipe.items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px dashed #ccc' }}>
                      <td style={{ padding: '8px 6px', fontWeight: 600 }}>{getMaterialName(item)}</td>
                      <td style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700 }}>{item.quantity} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 手順リスト */}
            {printShowInstructions && (
              <div style={{ marginBottom: '24px', flex: 1 }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, borderBottom: '1px solid #000', paddingBottom: '6px', marginBottom: '12px' }}>■ 作成手順</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '1.1rem', lineHeight: '1.6' }}>
                  {formRecipe.instructions.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 800, minWidth: '24px' }}>{idx + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* メモ */}
            {formRecipe.memo && (
              <div style={{ border: '1px solid #000', padding: '12px', background: '#f9f9f9', fontSize: '1rem' }}>
                <strong style={{ display: 'block', marginBottom: '4px' }}>盛り付け・提供時の注意点:</strong>
                <p style={{ whiteSpace: 'pre-wrap' }}>{formRecipe.memo}</p>
              </div>
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
              <button className="btn btn-secondary" onClick={() => setPrintMode(true)}>
                <Printer size={16} /> A4印刷プレビュー
              </button>
              {viewMode === 'detail' && canEdit && (
                <button type="button" className="btn btn-danger" onClick={() => handleDelete(formRecipe.id, formRecipe.name)}>
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
                <Flame size={18} />
                提供レシピ基本情報
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>メニュー名</label>
                  <input 
                    type="text" 
                    className="input-control" 
                    required 
                    readOnly={!canEdit}
                    value={formRecipe.name} 
                    onChange={e => setFormRecipe({ ...formRecipe, name: e.target.value })} 
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>カテゴリ</label>
                    <select 
                      className="input-control" 
                      value={formRecipe.categoryId} 
                      disabled={!canEdit}
                      onChange={e => setFormRecipe({ ...formRecipe, categoryId: e.target.value })}
                    >
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>公開設定</label>
                    <select 
                      className="input-control" 
                      value={formRecipe.status} 
                      disabled={!canEdit}
                      onChange={e => setFormRecipe({ ...formRecipe, status: e.target.value as any })}
                    >
                      <option value="public">公開</option>
                      <option value="private">非公開・下書き</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>売価 (税込)</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-secondary)', marginRight: '6px' }}>¥</span>
                      <input 
                        type="number" 
                        className="input-control" 
                        readOnly={!canEdit}
                        value={formRecipe.sellingPriceInTax} 
                        onChange={e => setFormRecipe({ ...formRecipe, sellingPriceInTax: Number(e.target.value) })} 
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>使用食器</label>
                    <input 
                      type="text" 
                      className="input-control" 
                      readOnly={!canEdit}
                      value={formRecipe.dishware} 
                      onChange={e => setFormRecipe({ ...formRecipe, dishware: e.target.value })} 
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>盛り付けメモ / 注意点</label>
                  <textarea 
                    className="input-control" 
                    rows={4}
                    readOnly={!canEdit}
                    placeholder="提供時の飾りや注意点を入力..."
                    value={formRecipe.memo} 
                    onChange={e => setFormRecipe({ ...formRecipe, memo: e.target.value })} 
                  />
                </div>
              </div>

              {/* 財務サマリーパネル */}
              {canEdit && (
                <div style={{ 
                  marginTop: '24px', padding: '16px', background: 'rgba(59,130,246,0.05)',
                  border: '1px solid rgba(59,130,246,0.15)', borderRadius: '10px',
                  display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>総原価 (計算値)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>
                      ¥{Math.round(tempCostPrice).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>原価率</div>
                    <span className={`badge ${getCostRateClass(tempCostRate)}`} style={{ marginTop: '4px' }}>
                      {tempCostRate.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>粗利額</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-good)', marginTop: '4px' }}>
                      ¥{Math.round(tempGross).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 右側：使用材料 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', order: canEdit ? 2 : 1 }}>
              <div className="glass-panel" style={{ margin: 0 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={18} />
                  使用材料 (食材・仕込み)
                </h3>

                {/* 追加フォーム */}
                {canEdit && (
                  <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', position: 'relative' }}>
                    <div style={{ width: '120px' }}>
                      <select 
                        className="input-control"
                        value={newMaterialType}
                        onChange={e => {
                          setNewMaterialType(e.target.value as any);
                          setNewMaterialSearch('');
                          setSelectedMaterial(null);
                        }}
                      >
                        <option value="ingredient">食材マスタ</option>
                        <option value="prep">仕込み</option>
                      </select>
                    </div>
                    <div style={{ flex: 2, minWidth: '150px' }}>
                      <input 
                        type="text" 
                        className="input-control" 
                        placeholder={newMaterialType === 'ingredient' ? "食材名で検索..." : "仕込み名で検索..."}
                        value={newMaterialSearch}
                        onChange={e => {
                          setNewMaterialSearch(e.target.value);
                          if (selectedMaterial) setSelectedMaterial(null);
                        }}
                      />
                      {/* サジェストリスト */}
                      {materialSuggestions.length > 0 && (
                        <div style={{
                          position: 'absolute', top: '44px', left: 0, width: '100%', background: '#1e293b',
                          border: '1px solid var(--panel-border)', borderRadius: '6px', zIndex: 10,
                          boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
                        }}>
                          {materialSuggestions.map(mat => (
                            <div 
                              key={mat.id}
                              onClick={() => {
                                setSelectedMaterial({
                                  id: mat.id,
                                  name: mat.name,
                                  unit: newMaterialType === 'ingredient' ? (mat as Ingredient).purchaseUnit : (mat as Prep).yieldUnit
                                });
                                setNewMaterialSearch(mat.name);
                              }}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid var(--panel-border)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'var(--primary-glow)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div style={{ fontWeight: 600 }}>{mat.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {newMaterialType === 'ingredient'
                                  ? `${getCategoryName((mat as Ingredient).categoryId)} - ${(mat as Ingredient).purchaseQuantity}${(mat as Ingredient).purchaseUnit}あたり¥${(mat as Ingredient).purchasePriceExTax}`
                                  : `${getCategoryName((mat as Prep).categoryId)} - 完成: ${(mat as Prep).yieldQuantity}${(mat as Prep).yieldUnit} (1単位あたり¥${(mat as Prep).unitCost.toFixed(2)})`
                                }
                              </div>
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
                        value={newMaterialQty}
                        onChange={e => setNewMaterialQty(Number(e.target.value))}
                      />
                      <select 
                        className="input-control"
                        value={newMaterialUnit}
                        onChange={e => setNewMaterialUnit(e.target.value)}
                        style={{ width: '80px' }}
                      >
                        {['g', 'kg', 'ml', 'L', '個', '本', '枚', '袋', 'パック', '束', 'ケース'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={handleAddMaterial} disabled={!selectedMaterial && !newMaterialSearch.trim()}>
                      追加
                    </button>
                  </div>
                )}

                {/* 登録済み材料 */}
                <div className="table-wrapper">
                  <table className="excel-table">
                    <thead>
                      <tr>
                        {canEdit && <th style={{ width: '30px' }}></th>}
                        <th>タイプ</th>
                        <th>品名</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>使用量</th>
                        {canEdit && <th style={{ width: '100px', textAlign: 'right' }}>単価</th>}
                        {canEdit && <th style={{ width: '100px', textAlign: 'right' }}>小計</th>}
                        {canEdit && <th style={{ width: '50px' }}></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {formRecipe.items.length === 0 ? (
                        <tr>
                          <td colSpan={canEdit ? 7 : 5} style={{ textAlign: 'center', padding: '16px', color: 'var(--text-secondary)' }}>
                            材料が登録されていません。
                          </td>
                        </tr>
                      ) : (
                        formRecipe.items.map((item, idx) => {
                          const cost = calculateItemCost(item);
                          const unitCost = getMaterialUnitCost(item);
                          
                          return (
                            <tr 
                              key={idx}
                              draggable={canEdit}
                              onDragStart={(e) => {
                                setDraggedMaterialIndex(idx);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (draggedMaterialIndex === null || draggedMaterialIndex === idx) return;
                                const newItems = [...formRecipe.items];
                                const [movedItem] = newItems.splice(draggedMaterialIndex, 1);
                                newItems.splice(idx, 0, movedItem);
                                setFormRecipe({ ...formRecipe, items: newItems });
                                setDraggedMaterialIndex(null);
                              }}
                              onDragEnd={() => setDraggedMaterialIndex(null)}
                              style={{ 
                                opacity: draggedMaterialIndex === idx ? 0.5 : 1,
                                background: draggedMaterialIndex === idx ? 'rgba(255,255,255,0.05)' : undefined
                              }}
                            >
                              {canEdit && (
                                <td style={{ textAlign: 'center', cursor: 'grab', color: 'var(--text-muted)' }}>
                                  <GripVertical size={14} />
                                </td>
                              )}
                              <td>
                                <span style={{
                                  fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px',
                                  background: item.type === 'prep' ? 'rgba(16,185,129,0.15)' : item.type === 'custom' ? 'rgba(255,255,255,0.1)' : 'rgba(59,130,246,0.15)',
                                  color: item.type === 'prep' ? 'var(--color-good)' : item.type === 'custom' ? 'var(--text-secondary)' : 'var(--primary-hover)',
                                  fontWeight: 600
                                }}>
                                  {item.type === 'prep' ? '仕込み' : item.type === 'custom' ? 'その他' : '食材'}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600 }}>{getMaterialName(item)}</td>
                              <td style={{ textAlign: 'right' }}>
                                {canEdit ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                    <input 
                                      type="number" 
                                      step="any"
                                      className="table-input"
                                      value={item.quantity}
                                      onChange={e => {
                                        const updated = [...formRecipe.items];
                                        updated[idx].quantity = Number(e.target.value);
                                        setFormRecipe({ ...formRecipe, items: updated });
                                      }}
                                      style={{ width: '80px', textAlign: 'right' }}
                                    />
                                    <span style={{ fontSize: '0.9em' }}>{item.unit}</span>
                                  </div>
                                ) : (
                                  `${item.quantity}${item.unit}`
                                )}
                              </td>
                              <td style={{ textAlign: 'right', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                                ¥{unitCost.toFixed(3)}
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: 600 }}>
                                ¥{Math.round(cost).toLocaleString()}
                              </td>
                              {canEdit && (
                                <td style={{ textAlign: 'center' }}>
                                  <button type="button" onClick={() => handleRemoveMaterial(idx)} style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}>
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

              {/* 手順 */}
              <div className="glass-panel" style={{ margin: 0 }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px' }}>
                  作成手順 ({formRecipe.instructions.length}ステップ)
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
                  {formRecipe.instructions.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>手順が登録されていません。</p>
                  ) : (
                    formRecipe.instructions.map((step, idx) => (
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
                                const newInstructions = [...formRecipe.instructions];
                                newInstructions[idx] = e.target.value;
                                setFormRecipe({ ...formRecipe, instructions: newInstructions });
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
export default RecipeList;
