import React, { useState, useEffect } from 'react';
import { Search, Download, Clipboard, ArrowUpDown } from 'lucide-react';
import { store, SystemSettings } from '../services/store';
import { Recipe, Category } from '../types';

interface CostCalculatorProps {
  settings: SystemSettings;
  onViewChange: (view: string) => void;
  setSelectedRecipeId?: (id: string | null) => void;
}

type SortField = 'name' | 'sellingPriceInTax' | 'costPrice' | 'costRate' | 'grossProfit';
type SortOrder = 'asc' | 'desc';

export const CostCalculator: React.FC<CostCalculatorProps> = ({ settings, onViewChange, setSelectedRecipeId }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  // 検索・フィルタ
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // ソート
  const [sortField, setSortField] = useState<SortField>('costRate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const loadData = () => {
    setRecipes([...store.getRecipes()]);
    setCategories([...store.getCategories()]);
  };

  useEffect(() => {
    loadData();
    return store.subscribe(loadData);
  }, []);

  const getCategoryName = (id: string) => {
    return categories.find(c => c.id === id)?.name || '未分類';
  };

  const getCostRateClass = (rate: number) => {
    if (rate < 25) return 'cost-rate-good';
    if (rate <= 35) return 'cost-rate-normal';
    if (rate <= 45) return 'cost-rate-warning';
    return 'cost-rate-danger';
  };

  const getCostRateLabel = (rate: number) => {
    if (rate < 25) return '良好 (<25%)';
    if (rate <= 35) return '通常 (25-35%)';
    if (rate <= 45) return '注意 (35-45%)';
    return '要改善 (>=45%)';
  };

  // ソート処理
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // フィルタリングとソートの適用
  const filteredAndSorted = recipes
    .filter(r => {
      const matchesSearch = r.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || r.categoryId === selectedCategory;
      return matchesSearch && matchesCategory && r.status === 'public';
    })
    .sort((a, b) => {
      let valA: any = a[sortField === 'grossProfit' ? 'sellingPriceExTax' : sortField];
      let valB: any = b[sortField === 'grossProfit' ? 'sellingPriceExTax' : sortField];

      // 粗利額の特殊計算
      if (sortField === 'grossProfit') {
        valA = a.sellingPriceExTax - a.costPrice;
        valB = b.sellingPriceExTax - b.costPrice;
      } else if (sortField === 'name') {
        valA = a.name;
        valB = b.name;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // クリップボードへコピー (Excel貼り付け用TSV)
  const copyToClipboard = () => {
    const header = 'メニュー名\tカテゴリ\t売価(税込)\t売価(税別)\t原価\t原価率\t粗利額\t食材数\t仕込み使用数\n';
    const rows = filteredAndSorted.map(r => {
      const cat = getCategoryName(r.categoryId);
      const gross = Math.round(r.sellingPriceExTax - r.costPrice);
      const ingCount = r.items.filter(i => i.type === 'ingredient').length;
      const prepCount = r.items.filter(i => i.type === 'prep').length;
      return `${r.name}\t${cat}\t${r.sellingPriceInTax}\t${Math.round(r.sellingPriceExTax)}\t${Math.round(r.costPrice)}\t${r.costRate}%\t${gross}\t${ingCount}\t${prepCount}`;
    }).join('\n');

    navigator.clipboard.writeText(header + rows).then(() => {
      alert('一覧データをExcel貼り付け用(TSV)としてクリップボードにコピーしました！\nExcel上で「貼り付け(Ctrl+V)」をすると、セルにきれいに分割されてペーストできます。');
    }).catch(err => {
      alert('コピーに失敗しました: ' + err);
    });
  };

  const handleRecipeClick = (id: string) => {
    if (setSelectedRecipeId) {
      setSelectedRecipeId(id);
      onViewChange('recipes');
    }
  };

  // 平均指標の計算 (フィルター反映後)
  const avgFilteredRate = filteredAndSorted.length > 0
    ? filteredAndSorted.reduce((sum, r) => sum + r.costRate, 0) / filteredAndSorted.length
    : 0;

  const totalFilteredSales = filteredAndSorted.reduce((sum, r) => sum + r.sellingPriceInTax, 0);
  const totalFilteredCosts = filteredAndSorted.reduce((sum, r) => sum + r.costPrice, 0);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>原価計算票一覧</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>全提供メニューの原価、原価率、粗利を一覧表示して、利益構造を分析します</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }} className="no-print">
          <button className="btn btn-secondary" onClick={copyToClipboard}>
            <Clipboard size={16} /> Excel出力用にコピー (TSV)
          </button>
        </div>
      </div>

      {/* 検索・フィルターパネル */}
      <div className="glass-panel no-print" style={{ padding: '16px', marginBottom: '20px' }}>
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

      {/* サマリーバー */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '20px',
      }}>
        <div className="glass-panel" style={{ margin: 0, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>表示メニュー数</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>{filteredAndSorted.length} 品</div>
          </div>
        </div>
        <div className="glass-panel" style={{ margin: 0, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>平均原価率</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px', color: 'var(--color-good)' }}>
              {avgFilteredRate.toFixed(1)} %
            </div>
          </div>
        </div>
        <div className="glass-panel" style={{ margin: 0, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>売価合計 (税込)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>
              ¥{Math.round(totalFilteredSales).toLocaleString()}
            </div>
          </div>
        </div>
        <div className="glass-panel" style={{ margin: 0, padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>原価合計</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '2px' }}>
              ¥{Math.round(totalFilteredCosts).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 原価計算票テーブル */}
      <div className="table-wrapper">
        <table className="excel-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                メニュー名 <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
              </th>
              <th>カテゴリ</th>
              <th onClick={() => handleSort('sellingPriceInTax')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                売価 (税込) <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
              </th>
              <th style={{ textAlign: 'right' }}>売価 (税別)</th>
              <th onClick={() => handleSort('costPrice')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                原価 <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
              </th>
              <th onClick={() => handleSort('costRate')} style={{ cursor: 'pointer', textAlign: 'center' }}>
                原価率 <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
              </th>
              <th onClick={() => handleSort('grossProfit')} style={{ cursor: 'pointer', textAlign: 'right' }}>
                粗利額 (税別) <ArrowUpDown size={12} style={{ marginLeft: '4px' }} />
              </th>
              <th style={{ textAlign: 'center' }}>材料数 (食材 / 仕込み)</th>
              <th style={{ width: '120px', textAlign: 'center' }}>アラート</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSorted.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                  該当するメニューがありません。
                </td>
              </tr>
            ) : (
              filteredAndSorted.map(rec => {
                const gross = rec.sellingPriceExTax - rec.costPrice;
                const ingCount = rec.items.filter(i => i.type === 'ingredient').length;
                const prepCount = rec.items.filter(i => i.type === 'prep').length;
                
                // 原価率警告に応じた行色変更
                let rowClass = '';
                if (rec.costRate >= 45) rowClass = 'row-cost-danger';
                else if (rec.costRate >= 35) rowClass = 'row-cost-warning';

                return (
                  <tr key={rec.id} className={rowClass} onClick={() => handleRecipeClick(rec.id)} style={{ cursor: 'pointer' }}>
                    {/* メニュー名 */}
                    <td style={{ fontWeight: 700 }}>{rec.name}</td>

                    {/* カテゴリ */}
                    <td>{getCategoryName(rec.categoryId)}</td>

                    {/* 売価(税込) */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ¥{Math.round(rec.sellingPriceInTax).toLocaleString()}
                    </td>

                    {/* 売価(税別) */}
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      ¥{Math.round(rec.sellingPriceExTax).toLocaleString()}
                    </td>

                    {/* 原価 */}
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      ¥{Math.round(rec.costPrice).toLocaleString()}
                    </td>

                    {/* 原価率 */}
                    <td style={{ textAlign: 'center', fontWeight: 800 }}>
                      <span className={`badge ${getCostRateClass(rec.costRate)}`}>
                        {rec.costRate.toFixed(1)}%
                      </span>
                    </td>

                    {/* 粗利 */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--color-good)' }}>
                      ¥{Math.round(gross).toLocaleString()}
                    </td>

                    {/* 材料数 */}
                    <td style={{ textAlign: 'center', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                      {ingCount + prepCount}品 ({ingCount} / {prepCount})
                    </td>

                    {/* アラートラベル */}
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${getCostRateClass(rec.costRate)}`} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                        {getCostRateLabel(rec.costRate)}
                      </span>
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
export default CostCalculator;
