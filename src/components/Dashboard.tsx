import React from 'react';
import { 
  Flame, 
  ChefHat, 
  Database, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  Calendar,
  DollarSign
} from 'lucide-react';
import { store } from '../services/store';

interface DashboardProps {
  onViewChange: (view: string) => void;
  setSelectedRecipeId?: (id: string | null) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onViewChange, setSelectedRecipeId }) => {
  const ingredients = store.getIngredients();
  const preps = store.getPreps();
  const recipes = store.getRecipes();

  // 計算
  const totalIngredients = ingredients.length;
  const totalPreps = preps.length;
  const totalRecipes = recipes.length;

  // 平均原価率 (売価がある公開レシピのみ)
  const activeRecipes = recipes.filter(r => r.status === 'public' && r.sellingPriceExTax > 0);
  const avgCostRate = activeRecipes.length > 0
    ? activeRecipes.reduce((sum, r) => sum + r.costRate, 0) / activeRecipes.length
    : 0;

  // 月末棚卸額の集計
  const totalInventoryExTax = ingredients.reduce((sum, ing) => sum + (ing.purchasePriceExTax * ing.stockQuantity), 0);
  const totalInventoryInTax = ingredients.reduce((sum, ing) => sum + (ing.purchasePriceInTax * ing.stockQuantity), 0);

  // 原価率が高いメニュー (原価率45%以上)
  const highCostRecipes = recipes
    .filter(r => r.costRate >= 45)
    .sort((a, b) => b.costRate - a.costRate)
    .slice(0, 5);

  // 単価未登録の食材 (単価が0以下)
  const unpricedIngredients = ingredients
    .filter(ing => ing.purchasePriceExTax <= 0)
    .slice(0, 5);

  // 最近更新されたレシピ (仮に最新登録されたもの)
  const recentRecipes = [...recipes]
    .sort((a, b) => b.id.localeCompare(a.id)) // 簡易ソート
    .slice(0, 5);

  const handleRecipeClick = (id: string) => {
    if (setSelectedRecipeId) {
      setSelectedRecipeId(id);
      onViewChange('recipes');
    }
  };

  const getCostRateClass = (rate: number) => {
    if (rate < 25) return 'cost-rate-good';
    if (rate <= 35) return 'cost-rate-normal';
    if (rate <= 45) return 'cost-rate-warning';
    return 'cost-rate-danger';
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>店舗ダッシュボード</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>原価、棚卸状況、メニュー分析のリアルタイムサマリー</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }} className="no-print">
          <button className="btn btn-secondary" onClick={() => onViewChange('inventory')}>
            <Plus size={16} /> 棚卸入力
          </button>
          <button className="btn btn-primary" onClick={() => onViewChange('recipes')}>
            <Plus size={16} /> レシピ作成
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '28px',
      }}>
        {/* レシピ数 */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', margin: 0 }}>
          <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', borderRadius: '12px' }}>
            <Flame size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>登録メニュー数</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px' }}>{totalRecipes} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>品</span></div>
          </div>
        </div>

        {/* 仕込み数 */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', margin: 0 }}>
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-good)', borderRadius: '12px' }}>
            <ChefHat size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>登録仕込み数</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px' }}>{totalPreps} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>品</span></div>
          </div>
        </div>

        {/* 食材数 */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', margin: 0 }}>
          <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-normal)', borderRadius: '12px' }}>
            <Database size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>管理食材数</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px' }}>{totalIngredients} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>種</span></div>
          </div>
        </div>

        {/* 平均原価率 */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', margin: 0 }}>
          <div style={{ padding: '12px', background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa', borderRadius: '12px' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>平均原価率</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '4px' }}>{avgCostRate.toFixed(1)} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>%</span></div>
          </div>
        </div>
      </div>

      {/* Inventory Valuation & Quick Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '24px',
        marginBottom: '28px',
      }}>
        {/* 棚卸評価額 */}
        <div className="glass-panel" style={{ margin: 0, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', right: '-20px', bottom: '-20px', color: 'rgba(255, 255, 255, 0.02)', pointerEvents: 'none'
          }}>
            <DollarSign size={200} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="var(--primary)" />
            現在庫棚卸評価額
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>棚卸合計額 (税別)</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                ¥{Math.round(totalInventoryExTax).toLocaleString()}
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>棚卸合計額 (税込)</span>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-good)', marginTop: '4px' }}>
                ¥{Math.round(totalInventoryInTax).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* 要改善メニュー */}
        <div className="glass-panel" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-danger)' }}>
            <AlertTriangle size={18} />
            原価率が高いメニュー (要改善)
          </h3>
          {highCostRecipes.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', padding: '12px 0' }}>原価率が45%を超えるメニューはありません。良好です！</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {highCostRecipes.map(r => (
                <div 
                  key={r.id} 
                  onClick={() => handleRecipeClick(r.id)}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                    border: '1px solid var(--panel-border)', cursor: 'pointer', transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                >
                  <span style={{ fontWeight: 600 }}>{r.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>売価: ¥{r.sellingPriceInTax}</span>
                    <span className="badge cost-rate-danger">{r.costRate}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '24px',
      }}>
        {/* 単価未登録の食材 */}
        <div className="glass-panel" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            単価未登録の食材 ({ingredients.filter(i => i.purchasePriceExTax <= 0).length}品)
          </h3>
          {unpricedIngredients.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', padding: '12px 0' }}>すべての食材に単価が登録されています。</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {unpricedIngredients.map(ing => (
                <div key={ing.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px',
                  border: '1px solid var(--panel-border)'
                }}>
                  <span style={{ fontWeight: 500 }}>{ing.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-warning)', fontWeight: 600 }}>単価未登録</span>
                </div>
              ))}
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', marginTop: '8px', padding: '8px' }} 
                onClick={() => onViewChange('inventory')}
              >
                棚卸表で登録する
              </button>
            </div>
          )}
        </div>

        {/* 最近更新されたレシピ */}
        <div className="glass-panel" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            登録・変更レシピ一覧 (最新5件)
          </h3>
          <textarea
            className="input-control"
            style={{ width: '100%', height: '200px', resize: 'vertical', lineHeight: '1.6' }}
            defaultValue={recentRecipes.map(r => `${r.name} (${r.costRate}%)`).join('\n')}
          />
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
