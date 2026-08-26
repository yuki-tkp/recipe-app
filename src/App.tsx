import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { InventoryTable } from './components/InventoryTable';
import { IngredientMaster } from './components/IngredientMaster';
import { PrepList } from './components/PrepList';
import { RecipeList } from './components/RecipeList';
import { CostCalculator } from './components/CostCalculator';
import { SupplierManager } from './components/SupplierManager';
import { Settings } from './components/Settings';
import { Login } from './components/Login';
import { store, SystemSettings } from './services/store';
import { supabase } from './services/supabase';
import { Session } from '@supabase/supabase-js';

function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [settings, setSettings] = useState<SystemSettings>(store.getSettings());
  const [session, setSession] = useState<Session | null>(null);
  
  // ダッシュボードや原価計算票からレシピ詳細への直接ジャンプ用
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  useEffect(() => {
    // 認証セッションの取得
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) {
          store.setSession(session); // storeにセッションを渡す
        }
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        store.setSession(session); // storeにセッションを渡す
      });

      // クリーンアップ
      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    // データストアの変化を監視
    const updateSettings = () => {
      setSettings({ ...store.getSettings() });
    };

    // 初期化時にフォントサイズクラスを設定
    const initSettings = store.getSettings();
    if (initSettings.fontSize === 'large') {
      document.body.classList.add('large-text');
    } else {
      document.body.classList.remove('large-text');
    }

    return store.subscribe(updateSettings);
  }, []);

  // スタッフ権限の場合のアクセス制御（強制ルーティング）
  useEffect(() => {
    if (session && store.getUserRole() === 'staff') {
      if (currentView !== 'recipes' && currentView !== 'preps') {
        setCurrentView('recipes');
      }
    }
  }, [session, currentView]);

  // Supabase設定済み ＆ 未ログインの場合はログイン画面を表示
  if (supabase && !session) {
    return <Login />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} setSelectedRecipeId={setSelectedRecipeId} />;
      case 'inventory':
        return <InventoryTable settings={settings} />;
      case 'ingredients':
        return <IngredientMaster settings={settings} />;
      case 'preps':
        return <PrepList settings={settings} />;
      case 'recipes':
        return (
          <RecipeList 
            settings={settings} 
            selectedRecipeId={selectedRecipeId}
            setSelectedRecipeId={setSelectedRecipeId}
          />
        );
      case 'cost':
        return (
          <CostCalculator 
            settings={settings} 
            onViewChange={setCurrentView}
            setSelectedRecipeId={setSelectedRecipeId}
          />
        );
      case 'suppliers':
        return <SupplierManager settings={settings} />;
      case 'settings':
        return <Settings settings={settings} />;
      default:
        return <Dashboard onViewChange={setCurrentView} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        settings={settings} 
      />
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}

export default App;
