import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  Download, 
  Upload, 
  RotateCcw,
  Settings as SettingsIcon,
  FolderPlus,
  ShieldAlert,
  Type,
  CloudUpload
} from 'lucide-react';
import { store, SystemSettings } from '../services/store';
import { Category } from '../types';

interface SettingsProps {
  settings: SystemSettings;
}

export const Settings: React.FC<SettingsProps> = ({ settings }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState('');
  
  // カテゴリ編集用
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // インポートテキストエリア用
  const [importJson, setImportJson] = useState('');

  const canEdit = settings.userRole === 'admin';

  const loadData = () => {
    setCategories([...store.getCategories()]);
  };

  useEffect(() => {
    loadData();
    return store.subscribe(loadData);
  }, []);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    store.createCategory(newCatName.trim());
    setNewCatName('');
  };

  const handleStartEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    store.updateCategory(editingId!, editName.trim());
    setEditingId(null);
  };

  const handleDeleteCategory = (id: string, name: string) => {
    if (window.confirm(`カテゴリ「${name}」を削除しますか？\n登録されている食材やレシピのカテゴリ情報が消える可能性があります。`)) {
      store.deleteCategory(id);
    }
  };

  // シードデータへのリセット
  const handleResetToSeed = () => {
    if (window.confirm('警告: すべてのデータが初期Excelデータ（2025年版）にリセットされ、ご自身で編集したデータは上書き削除されます。よろしいですか？')) {
      // 実際にはローカルストレージを全クリアして再リロード
      localStorage.clear();
      window.location.reload();
    }
  };

  // エクスポート
  const handleExport = () => {
    const dataStr = store.exportData();
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `cost_manager_backup_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // インポート
  const handleImport = () => {
    if (!importJson.trim()) return;
    if (window.confirm('インポートを実行します。現在のすべてのデータが上書きされます。よろしいですか？')) {
      const success = store.importData(importJson);
      if (success) {
        alert('データを正常にインポートしました！');
        setImportJson('');
      } else {
        alert('インポートに失敗しました。JSONフォーマットが正しくありません。');
      }
    }
  };

  // クラウドへの移行
  const handleMigrateToCloud = async () => {
    if (window.confirm('現在ローカルに保存されているすべてのデータを、クラウド（Supabase）にアップロードして移行します。よろしいですか？')) {
      await store.migrateLocalDataToCloud();
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>システム管理・設定</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>カテゴリの管理、データバックアップ、システムのリセットを行います</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
        {/* カテゴリ管理パネル */}
        <div className="glass-panel" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderPlus size={18} />
            カテゴリマスタ管理
          </h3>
          
          {canEdit && (
            <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input 
                type="text" 
                className="input-control" 
                placeholder="新しいカテゴリ名..." 
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary">
                <Plus size={16} /> 追加
              </button>
            </form>
          )}

          <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--panel-border)', borderRadius: '8px' }}>
            <table className="excel-table">
              <tbody>
                {categories.map(cat => (
                  <tr key={cat.id}>
                    <td>
                      {editingId === cat.id ? (
                        <input 
                          type="text" 
                          className="table-input" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                        />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{cat.name}</span>
                      )}
                    </td>
                    {canEdit && (
                      <td style={{ width: '100px', textAlign: 'center' }}>
                        {editingId === cat.id ? (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button type="button" onClick={handleSaveEdit} style={{ border: 'none', background: 'transparent', color: 'var(--color-good)', cursor: 'pointer' }}>
                              <Save size={14} />
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                              キャンセル
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button type="button" onClick={() => handleStartEdit(cat)} style={{ border: 'none', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                              <Edit2 size={14} />
                            </button>
                            <button type="button" onClick={() => handleDeleteCategory(cat.id, cat.name)} style={{ border: 'none', background: 'transparent', color: 'var(--color-danger)', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* データ移行とメンテナンスパネル */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* バックアップ ＆ インポート */}
          <div className="glass-panel" style={{ margin: 0 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              データのエクスポート・インポート
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                本システムのすべてのデータ（食材、レシピ、仕込み、カテゴリ、業者など）をJSONファイルとして保存、または過去のバックアップから復元できます。
              </p>
              
              <button type="button" className="btn btn-secondary" onClick={handleExport} style={{ width: '100%' }}>
                <Download size={16} /> バックアップデータをダウンロード (JSON)
              </button>

              {canEdit && (
                <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px', marginTop: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    復元用JSONデータを貼り付け:
                  </label>
                  <textarea 
                    className="input-control" 
                    rows={4}
                    placeholder='{"categories": [...], "ingredients": [...]}'
                    value={importJson}
                    onChange={e => setImportJson(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleImport} 
                    disabled={!importJson.trim()} 
                    style={{ width: '100%', marginTop: '10px' }}
                  >
                    <Upload size={16} /> データを復元 (インポート)
                  </button>
                </div>
              )}

              {/* クラウドデータ移行ボタン */}
              <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: '16px', marginTop: '8px' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>
                  SaaSデータベース（Supabase）の初期設定を行った後、これまで使っていたローカルデータをクラウドに移行する場合はこちらのボタンを押してください。
                </p>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleMigrateToCloud}
                  style={{ width: '100%', backgroundColor: '#10b981', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)' }}
                >
                  <CloudUpload size={16} /> ローカルデータをクラウドへ移行する
                </button>
              </div>
            </div>
          </div>

          {/* システムリセット */}
          <div className="glass-panel" style={{ margin: 0, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '16px', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} />
              危険な操作
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
              システムに初期登録されている2025年版のExcelデータ（提供レシピ、仕込みレシピ、食品棚卸表）に戻します。編集した内容はすべて削除されますのでご注意ください。
            </p>
            <button type="button" className="btn btn-danger" onClick={handleResetToSeed} style={{ width: '100%' }}>
              <RotateCcw size={16} /> 初期シードデータにリセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Settings;
