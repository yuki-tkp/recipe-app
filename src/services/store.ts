import { Category, Supplier, Ingredient, Prep, Recipe, PriceHistory, PrepItem, RecipeItem } from '../types';
import seedData from '../db/seed_data.json';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';

// ローカルストレージキー (以前のデータを読み込むため)
const STORAGE_KEYS = {
  CATEGORIES: 'cost_manager_categories',
  SUPPLIERS: 'cost_manager_suppliers',
  INGREDIENTS: 'cost_manager_ingredients',
  PREPS: 'cost_manager_preps',
  RECIPES: 'cost_manager_recipes',
  SETTINGS: 'cost_manager_settings',
  PRICE_HISTORIES: 'cost_manager_price_histories',
};

export interface SystemSettings {
  userRole: 'admin' | 'manager' | 'staff';
  theme: 'dark' | 'light';
  fontSize: 'normal' | 'large';
  taxRateDefault: number;
}

const DEFAULT_SETTINGS: SystemSettings = {
  userRole: 'admin',
  theme: 'dark',
  fontSize: 'normal',
  taxRateDefault: 0.08,
};

// 単位のg/ml換算ヘルパー
export const convertQuantityToStockUnit = (qty: number, unit: string): { baseQty: number; baseUnit: string } => {
  const u = unit.toLowerCase().trim();
  if (u === 'kg' || u === 'ｋｇ') return { baseQty: qty * 1000, baseUnit: 'g' };
  if (u === 'l' || u === 'ｌ') return { baseQty: qty * 1000, baseUnit: 'ml' };
  if (u === 'g' || u === 'ｇ') return { baseQty: qty, baseUnit: 'g' };
  if (u === 'ml' || u === 'ｍｌ') return { baseQty: qty, baseUnit: 'ml' };
  return { baseQty: qty, baseUnit: unit };
};

export const calculateBaseUnitCost = (
  purchaseQty: number,
  purchaseUnit: string,
  priceExTax: number
): { baseUnit: string; unitCost: number } => {
  if (purchaseQty <= 0) return { baseUnit: purchaseUnit, unitCost: 0 };
  const { baseQty, baseUnit } = convertQuantityToStockUnit(purchaseQty, purchaseUnit);
  return { baseUnit, unitCost: priceExTax / baseQty };
};

class DataStore {
  private categories: Category[] = [];
  private suppliers: Supplier[] = [];
  private ingredients: Ingredient[] = [];
  private preps: Prep[] = [];
  private recipes: Recipe[] = [];
  private priceHistories: PriceHistory[] = [];
  private settings: SystemSettings = DEFAULT_SETTINGS;
  private listeners: (() => void)[] = [];
  
  private session: Session | null = null;
  private realtimeChannel: any = null;

  constructor() {
    // 以前のローカルデータを読み込む (クラウド移行用)
    const load = (key: string) => {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    };

    this.categories = load(STORAGE_KEYS.CATEGORIES) || [];
    this.suppliers = load(STORAGE_KEYS.SUPPLIERS) || [];
    this.ingredients = load(STORAGE_KEYS.INGREDIENTS) || [];
    this.preps = load(STORAGE_KEYS.PREPS) || [];
    this.recipes = load(STORAGE_KEYS.RECIPES) || [];
    this.priceHistories = load(STORAGE_KEYS.PRICE_HISTORIES) || [];

    const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    this.settings = storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS;
    
    this.recalculateAll();

    // UI反映
    if (this.settings.fontSize === 'large') {
      document.body.classList.add('large-text');
    }
  }

  // App.tsx からセッションが渡される
  setSession(session: Session | null) {
    this.session = session;
    if (session) {
      this.loadFromSupabase();
      this.setupRealtime();
    } else {
      // ログアウト時はデータをクリア
      this.categories = [];
      this.suppliers = [];
      this.ingredients = [];
      this.preps = [];
      this.recipes = [];
      this.priceHistories = [];
      this.notifyListeners();
      
      if (this.realtimeChannel) {
        supabase?.removeChannel(this.realtimeChannel);
      }
    }
  }

  // 現在のユーザー権限を取得
  getUserRole(): 'admin' | 'staff' {
    if (this.session?.user?.email === 'staff@11tap.com') {
      return 'staff';
    }
    return 'admin';
  }

  // ログアウト処理
  async logout() {
    if (supabase) {
      await supabase.auth.signOut();
      this.setSession(null);
    }
  }

  private async loadFromSupabase() {
    if (!supabase || !this.session) return;
    
    try {
      const [{ data: cats }, { data: supps }, { data: ings }, { data: preps }, { data: recs }, { data: hists }] = await Promise.all([
        supabase.from('categories').select('*').order('id'),
        supabase.from('suppliers').select('*').order('id'),
        supabase.from('ingredients').select('*').order('id'),
        supabase.from('preps').select('*').order('id'),
        supabase.from('recipes').select('*').order('id'),
        supabase.from('price_histories').select('*').order('changedAt', { ascending: false }).limit(100),
      ]);

      const sortByCat = (a: any, b: any) => {
        const catA = a.categoryId || '';
        const catB = b.categoryId || '';
        if (catA === catB) {
          return (a.name || '').localeCompare(b.name || '', 'ja');
        }
        return catA.localeCompare(catB, 'ja');
      };

      // Helper to merge while preserving local order
      const loadSavedOrder = (key: string) => {
        try {
          return JSON.parse(localStorage.getItem(key) || '[]');
        } catch {
          return [];
        }
      };

      const mergeWithLocalOrder = <T extends { id: string }>(localArr: T[], fetchedArr: T[], defaultSort?: (a: T, b: T) => number, storageKey?: string) => {
        const existingOrder = storageKey ? loadSavedOrder(storageKey) : localArr.map(item => item.id);
        if (!existingOrder.length) return defaultSort ? fetchedArr.sort(defaultSort) : fetchedArr;
        
        return fetchedArr.sort((a, b) => {
          const idxA = existingOrder.indexOf(a.id);
          const idxB = existingOrder.indexOf(b.id);
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          if (defaultSort) return defaultSort(a, b);
          return 0;
        });
      };

      if (cats) {
        let parsedCats = cats.map(c => ({
          ...c,
          type: c.id.startsWith('prep_') ? 'prep' : c.id.startsWith('recipe_') ? 'recipe' : 'common'
        }));

        // Deduplicate categories by name and type
        const seen = new Set<string>();
        const duplicates: any[] = [];
        const uniqueCats: any[] = [];
        const idMapping = new Map<string, string>();
        
        for (const cat of parsedCats) {
          const key = `${cat.type}_${cat.name}`;
          if (seen.has(key)) {
            duplicates.push(cat);
            idMapping.set(cat.id, uniqueCats.find(c => c.type === cat.type && c.name === cat.name)!.id);
          } else {
            seen.add(key);
            uniqueCats.push(cat);
          }
        }

        if (duplicates.length > 0 && supabase) {
          const duplicateIds = duplicates.map(d => d.id);
          supabase.from('categories').delete().in('id', duplicateIds).then();
          
          // Background remap
          setTimeout(() => {
            if (!supabase) return;
            let remapped = false;
            for (const p of this.preps) {
              if (p.categoryId && idMapping.has(p.categoryId)) {
                p.categoryId = idMapping.get(p.categoryId) as string;
                supabase.from('preps').update({ categoryId: p.categoryId }).eq('id', p.id).then();
                remapped = true;
              }
            }
            for (const r of this.recipes) {
              if (r.categoryId && idMapping.has(r.categoryId)) {
                r.categoryId = idMapping.get(r.categoryId) as string;
                supabase.from('recipes').update({ categoryId: r.categoryId }).eq('id', r.id).then();
                remapped = true;
              }
            }
            for (const i of this.ingredients) {
              if (i.categoryId && idMapping.has(i.categoryId)) {
                i.categoryId = idMapping.get(i.categoryId) as string;
                supabase.from('ingredients').update({ categoryId: i.categoryId }).eq('id', i.id).then();
                remapped = true;
              }
            }
            if (remapped) this.notifyListeners();
          }, 1000);
        }
        
        parsedCats = uniqueCats;
        this.categories = mergeWithLocalOrder(this.categories, parsedCats as any[]);
      }
      if (supps) this.suppliers = mergeWithLocalOrder(this.suppliers, supps);
      if (ings) this.ingredients = mergeWithLocalOrder(this.ingredients, ings, sortByCat);
      if (preps) this.preps = mergeWithLocalOrder(this.preps, preps, this.getAutoSortFunction('prep'), 'prep_manual_order');
      if (recs) this.recipes = mergeWithLocalOrder(this.recipes, recs, this.getAutoSortFunction('recipe'), 'recipe_manual_order');
      if (hists) this.priceHistories = hists;

      // --------------------------------------------------------
      // 一時的な処理: ログアウト等でローカルの並び順がリセットされバラバラになった状態を復旧するためのv3
      if (!localStorage.getItem('has_sorted_by_category_v3')) {
        if (this.ingredients.length > 0) this.ingredients.sort(sortByCat);
        if (this.preps.length > 0) this.preps.sort(sortByCat);
        if (this.recipes.length > 0) this.recipes.sort(sortByCat);
        
        localStorage.setItem('has_sorted_by_category_v3', 'true');
      }
      // --------------------------------------------------------

      await this.runCategoryMigration();

      this.recalculateAll();
      this.notifyListeners();
    } catch (e) {
      console.error('Supabase load error:', e);
    }
  }

  // リアルタイム同期設定
  private setupRealtime() {
    if (!supabase) return;
    
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
    }
    
    this.realtimeChannel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
        // 何か変更があればリロードする (シンプルで堅牢な手法)
        console.log('Realtime update received:', payload);
        this.loadFromSupabase();
      })
      .subscribe();
  }

  // 全データの自動再計算エンジン
  recalculateAll() {
    const ingredientMap = new Map<string, Ingredient>();
    
    this.ingredients.forEach(ing => {
      const { baseUnit, unitCost } = calculateBaseUnitCost(ing.purchaseQuantity, ing.purchaseUnit, ing.purchasePriceExTax);
      ing.baseUnit = baseUnit;
      ing.unitCost = Number(unitCost.toFixed(4));
      ing.purchasePriceInTax = Number((ing.purchasePriceExTax * (1 + ing.taxRate)).toFixed(2));
      ingredientMap.set(ing.id, ing);
    });

    const prepMap = new Map<string, Prep>();
    this.preps.forEach(p => prepMap.set(p.id, p));

    // 仕込みの原価を再帰的に計算する関数（無限ループ防止付き）
    const calculating = new Set<string>();
    const calculated = new Set<string>();

    const calcPrepCost = (prepId: string): number => {
      if (calculated.has(prepId)) return prepMap.get(prepId)!.totalCost;
      if (calculating.has(prepId)) return 0; // 循環参照の検知

      const prep = prepMap.get(prepId);
      if (!prep) return 0;

      calculating.add(prepId);
      let totalCost = 0;

      prep.items.forEach(item => {
        const type = item.type || 'ingredient';
        if (type === 'ingredient' && item.ingredientId && ingredientMap.has(item.ingredientId)) {
          const ing = ingredientMap.get(item.ingredientId)!;
          const { baseQty } = convertQuantityToStockUnit(item.quantity, item.unit);
          totalCost += baseQty * ing.unitCost;
        } else if (type === 'prep' && item.prepId && prepMap.has(item.prepId)) {
          const childPrep = prepMap.get(item.prepId)!;
          // 再帰的に子仕込みの原価を計算
          calcPrepCost(childPrep.id);
          const { baseQty } = convertQuantityToStockUnit(item.quantity, item.unit);
          totalCost += baseQty * childPrep.unitCost;
        }
      });

      prep.totalCost = Number(totalCost.toFixed(2));
      prep.unitCost = prep.yieldQuantity > 0 ? Number((prep.totalCost / prep.yieldQuantity).toFixed(4)) : 0;
      
      calculating.delete(prepId);
      calculated.add(prepId);
      
      return prep.totalCost;
    };

    this.preps.forEach(prep => {
      calcPrepCost(prep.id);
    });

    this.recipes.forEach(rec => {
      let costPrice = 0;
      rec.items.forEach(item => {
        if (item.id) {
          if (item.type === 'ingredient' && ingredientMap.has(item.id)) {
            const ing = ingredientMap.get(item.id)!;
            const { baseQty } = convertQuantityToStockUnit(item.quantity, item.unit);
            costPrice += baseQty * ing.unitCost;
          } else if (item.type === 'prep' && prepMap.has(item.id)) {
            const prep = prepMap.get(item.id)!;
            const { baseQty } = convertQuantityToStockUnit(item.quantity, item.unit);
            costPrice += baseQty * prep.unitCost;
          }
        }
      });
      rec.costPrice = Number(costPrice.toFixed(2));
      rec.sellingPriceExTax = Number((rec.sellingPriceInTax / 1.10).toFixed(2));
      rec.costRate = rec.sellingPriceExTax > 0 ? Number(((rec.costPrice / rec.sellingPriceExTax) * 100).toFixed(1)) : 0;
      rec.grossProfit = Number((rec.sellingPriceExTax - rec.costPrice).toFixed(2));
    });
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private sortCategories() {
    const prepOrder = ['未設定', '乾物・缶詰・常温食材', 'ソース・ドレッシング', '油脂', '粉', '調味料・香辛料', '冷凍', '冷蔵', '精肉', '青果', 'その他', '調味料・トッピング・野菜'];
    const recipeOrder = ['未設定', 'チャージ', 'クイック', 'アラカルト', 'サラダ', 'フライ', 'ミート', 'パスタ・ピザ'];
    
    this.categories.sort((a, b) => {
      const typeOrder: Record<string, number> = { prep: 1, recipe: 2, ingredient: 3, common: 4 };
      const typeA = typeOrder[a.type || 'common'] || 5;
      const typeB = typeOrder[b.type || 'common'] || 5;
      if (typeA !== typeB) return typeA - typeB;

      let order: string[] = [];
      if (a.type === 'prep') order = prepOrder;
      if (a.type === 'recipe') order = recipeOrder;
      
      const idxA = order.indexOf(a.name);
      const idxB = order.indexOf(b.name);
      
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      
      return a.name.localeCompare(b.name, 'ja');
    });
  }

  private notifyListeners() {
    this.sortCategories();
    this.listeners.forEach(l => l());
    
    // 現在の並び順と状態をローカルストレージに保存し、リロード後も順序を維持する
    try {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
      localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(this.suppliers));
      localStorage.setItem(STORAGE_KEYS.INGREDIENTS, JSON.stringify(this.ingredients));
      localStorage.setItem(STORAGE_KEYS.PREPS, JSON.stringify(this.preps));
      localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(this.recipes));
    } catch (e) {
      console.warn('Failed to save state to localStorage', e);
    }
  }

  // --- Getters ---
  getCategories() { return this.categories; }
  getSuppliers() { return this.suppliers; }
  getIngredients() { return this.ingredients; }
  getPreps() { return this.preps; }
  getRecipes() { return this.recipes; }
  getPriceHistories() { return this.priceHistories; }
  getSettings() { return this.settings; }

  // --- Mutations (Supabase連携) ---
  
  updateIngredient(id: string, updated: Partial<Ingredient>) {
    const idx = this.ingredients.findIndex(ing => ing.id === id);
    if (idx !== -1) {
      const old = this.ingredients[idx];
      const newPrice = updated.purchasePriceExTax;
      
      if (newPrice !== undefined && newPrice !== old.purchasePriceExTax) {
        this.addPriceHistory(id, old.purchasePriceExTax, newPrice);
      }
      
      const newIng = {
        ...old,
        ...updated,
        updatedAt: new Date().toISOString(),
      };
      this.ingredients[idx] = newIng;
      this.recalculateAll();
      this.notifyListeners();
      
      if (supabase) {
        supabase.from('ingredients').update(updated).eq('id', id).then();
      }
    }
  }

  addIngredient(ing: Omit<Ingredient, 'id' | 'unitCost' | 'baseUnit' | 'updatedAt' | 'purchasePriceInTax'>) {
    const id = 'ing_' + Math.random().toString(36).substr(2, 9);
    const newIng: Ingredient = {
      ...ing,
      id,
      purchasePriceInTax: Number((ing.purchasePriceExTax * (1 + ing.taxRate)).toFixed(2)),
      baseUnit: ing.purchaseUnit,
      unitCost: 0,
      updatedAt: new Date().toISOString(),
    };
    this.ingredients.push(newIng);
    this.recalculateAll();
    this.notifyListeners();
    
    if (supabase) {
      supabase.from('ingredients').insert(newIng).then();
    }
    return id;
  }

  deleteIngredient(id: string) {
    this.ingredients = this.ingredients.filter(ing => ing.id !== id);
    this.recalculateAll();
    this.notifyListeners();
    if (supabase) {
      supabase.from('ingredients').delete().eq('id', id).then();
    }
  }

  private getAutoSortFunction(type: 'prep' | 'recipe') {
    const prepOrder = ['未設定', '乾物・缶詰・常温食材', 'ソース・ドレッシング', '油脂', '粉', '調味料・香辛料', '冷凍', '冷蔵', '精肉', '青果', 'その他', '調味料・トッピング・野菜'];
    const recipeOrder = ['未設定', 'チャージ', 'クイック', 'アラカルト', 'サラダ', 'フライ', 'ミート', 'パスタ・ピザ'];
    const order = type === 'prep' ? prepOrder : recipeOrder;

    return (a: any, b: any) => {
      const getFirstCatName = (catId: string) => {
        const id = (catId || '').split(',')[0];
        return this.categories.find(c => c.id === id && c.type === type)?.name || '';
      };
      const catA = getFirstCatName(a.categoryId);
      const catB = getFirstCatName(b.categoryId);
      const indexA = order.indexOf(catA);
      const indexB = order.indexOf(catB);
      
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      
      if (posA !== posB) return posA - posB;
      
      return (a.name || '').localeCompare(b.name || '', 'ja');
    };
  }

  private insertItemAutoSorted<T extends { id: string }>(arr: T[], item: T, type: 'prep' | 'recipe'): T[] {
    const sortFn = this.getAutoSortFunction(type);
    const filtered = arr.filter(x => x.id !== item.id);
    
    let insertIndex = filtered.length;
    for (let i = 0; i < filtered.length; i++) {
      if (sortFn(item, filtered[i]) < 0) {
        insertIndex = i;
        break;
      }
    }
    filtered.splice(insertIndex, 0, item);
    return filtered;
  }

  private saveManualOrder(type: 'prep' | 'recipe') {
    if (type === 'prep') {
      localStorage.setItem('prep_manual_order', JSON.stringify(this.preps.map(p => p.id)));
    } else {
      localStorage.setItem('recipe_manual_order', JSON.stringify(this.recipes.map(r => r.id)));
    }
  }

  createPrep(prep: Omit<Prep, 'id' | 'totalCost' | 'unitCost'>) {
    const id = 'prep_' + Math.random().toString(36).substr(2, 9);
    const newPrep: Prep = {
      ...prep,
      id,
      totalCost: 0,
      unitCost: 0,
    };
    this.preps = this.insertItemAutoSorted(this.preps, newPrep, 'prep');
    this.saveManualOrder('prep');
    this.recalculateAll();
    this.notifyListeners();
    
    if (supabase) {
      supabase.from('preps').insert(newPrep).then();
    }
    return id;
  }

  updatePrep(id: string, updated: Partial<Prep>) {
    const idx = this.preps.findIndex(p => p.id === id);
    if (idx !== -1) {
      const updatedPrep = { ...this.preps[idx], ...updated };
      this.preps = this.insertItemAutoSorted(this.preps, updatedPrep, 'prep');
      this.saveManualOrder('prep');
      this.recalculateAll();
      this.notifyListeners();
      
      if (supabase) {
        supabase.from('preps').update(updated).eq('id', id).then();
      }
    }
  }

  deletePrep(id: string) {
    this.preps = this.preps.filter(p => p.id !== id);
    this.recipes.forEach(rec => {
      rec.items = rec.items.map(item => {
        if (item.type === 'prep' && item.id === id) return { ...item, id: null };
        return item;
      });
      if (supabase) {
        supabase.from('recipes').update({ items: rec.items }).eq('id', rec.id).then();
      }
    });
    this.recalculateAll();
    this.notifyListeners();
    if (supabase) {
      supabase.from('preps').delete().eq('id', id).then();
    }
  }

  reorderPreps(sourceId: string, destId: string) {
    const sourceIndex = this.preps.findIndex(p => p.id === sourceId);
    const destIndex = this.preps.findIndex(p => p.id === destId);
    if (sourceIndex !== -1 && destIndex !== -1 && sourceIndex !== destIndex) {
      const [moved] = this.preps.splice(sourceIndex, 1);
      this.preps.splice(destIndex, 0, moved);
      this.saveManualOrder('prep');
      this.notifyListeners();
    }
  }

  createRecipe(recipe: Omit<Recipe, 'id' | 'costPrice' | 'costRate' | 'grossProfit' | 'sellingPriceExTax'>) {
    const id = 'recipe_' + Math.random().toString(36).substr(2, 9);
    const newRecipe: Recipe = {
      ...recipe,
      id,
      sellingPriceExTax: 0,
      costPrice: 0,
      costRate: 0,
      grossProfit: 0,
    };
    this.recipes = this.insertItemAutoSorted(this.recipes, newRecipe, 'recipe');
    this.saveManualOrder('recipe');
    this.recalculateAll();
    this.notifyListeners();
    if (supabase) {
      supabase.from('recipes').insert(newRecipe).then();
    }
    return id;
  }

  updateRecipe(id: string, updated: Partial<Recipe>) {
    const idx = this.recipes.findIndex(r => r.id === id);
    if (idx !== -1) {
      const updatedRecipe = { ...this.recipes[idx], ...updated };
      this.recipes = this.insertItemAutoSorted(this.recipes, updatedRecipe, 'recipe');
      this.saveManualOrder('recipe');
      this.recalculateAll();
      this.notifyListeners();
      if (supabase) {
        supabase.from('recipes').update(updated).eq('id', id).then();
      }
    }
  }

  deleteRecipe(id: string) {
    this.recipes = this.recipes.filter(r => r.id !== id);
    this.notifyListeners();
    if (supabase) {
      supabase.from('recipes').delete().eq('id', id).then();
    }
  }

  reorderRecipes(sourceId: string, destId: string) {
    const sourceIndex = this.recipes.findIndex(r => r.id === sourceId);
    const destIndex = this.recipes.findIndex(r => r.id === destId);
    if (sourceIndex !== -1 && destIndex !== -1 && sourceIndex !== destIndex) {
      const [moved] = this.recipes.splice(sourceIndex, 1);
      this.recipes.splice(destIndex, 0, moved);
      this.saveManualOrder('recipe');
      this.notifyListeners();
    }
  }

  createCategory(name: string, type: 'prep' | 'recipe' | 'ingredient' | 'common' = 'common') {
    const id = (type !== 'common' ? `${type}_` : 'cat_') + Math.random().toString(36).substr(2, 9);
    this.categories.push({ id, name, type });
    this.notifyListeners();
    if (supabase) {
      supabase.from('categories').insert({ id, name }).then();
    }
    return id;
  }

  updateCategory(id: string, name: string) {
    const idx = this.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.categories[idx].name = name;
      this.notifyListeners();
      if (supabase) {
        supabase.from('categories').update({ name }).eq('id', id).then();
      }
    }
  }

  async runCategoryMigration() {
    if (localStorage.getItem('category_migration_v6')) return;
    if (!supabase) return;

    const prepCatNames = ['未設定', '乾物・缶詰・常温食材', 'ソース・ドレッシング', '油脂', '粉', '調味料・香辛料', '冷凍', '冷蔵', '精肉', '青果', 'その他', '調味料・トッピング・野菜'];
    const recipeCatNames = ['未設定', 'チャージ', 'クイック', 'アラカルト', 'サラダ', 'フライ', 'ミート', 'パスタ・ピザ'];

    const newCategories = [];
    
    // Create new categories if they don't exist
    for (const name of prepCatNames) {
      if (!this.categories.some(c => c.name === name && c.type === 'prep')) {
        const id = `prep_${Math.random().toString(36).substr(2, 9)}`;
        newCategories.push({ id, name, type: 'prep' });
        this.categories.push({ id, name, type: 'prep' });
      }
    }
    
    for (const name of recipeCatNames) {
      if (!this.categories.some(c => c.name === name && c.type === 'recipe')) {
        const id = `recipe_${Math.random().toString(36).substr(2, 9)}`;
        newCategories.push({ id, name, type: 'recipe' });
        this.categories.push({ id, name, type: 'recipe' });
      }
    }

    if (newCategories.length > 0) {
      const inserts = newCategories.map(c => ({ id: c.id, name: c.name }));
      await supabase.from('categories').insert(inserts);
    }

    const prepUnset = this.categories.find(c => c.name === '未設定' && c.type === 'prep');
    const recipeUnset = this.categories.find(c => c.name === '未設定' && c.type === 'recipe');

    const prepUpdates = [];
    for (const p of this.preps) {
      const ids = (p.categoryId || '').split(',');
      const hasValidCat = ids.some(id => this.categories.some(c => c.id === id && (c.type === 'prep' || c.type === 'recipe')));
      if (!hasValidCat && prepUnset) {
        p.categoryId = prepUnset.id;
        prepUpdates.push(supabase.from('preps').update({ categoryId: prepUnset.id }).eq('id', p.id));
      }
    }

    const recipeUpdates = [];
    for (const r of this.recipes) {
      const ids = (r.categoryId || '').split(',');
      const hasValidCat = ids.some(id => this.categories.some(c => c.id === id && (c.type === 'prep' || c.type === 'recipe')));
      if (!hasValidCat && recipeUnset) {
        r.categoryId = recipeUnset.id;
        recipeUpdates.push(supabase.from('recipes').update({ categoryId: recipeUnset.id }).eq('id', r.id));
      }
    }

    if (prepUpdates.length > 0 || recipeUpdates.length > 0) {
      await Promise.all([...prepUpdates, ...recipeUpdates]);
    }

    const sortByCatName = (a: any, b: any, order: string[]) => {
      const getFirstCatName = (catId: string) => {
        const id = (catId || '').split(',')[0];
        return this.categories.find(c => c.id === id)?.name || '';
      };
      const catA = getFirstCatName(a.categoryId);
      const catB = getFirstCatName(b.categoryId);
      const indexA = order.indexOf(catA);
      const indexB = order.indexOf(catB);
      if (indexA === -1 && indexB === -1) return catA.localeCompare(catB, 'ja');
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    };

    this.preps.sort((a, b) => sortByCatName(a, b, prepCatNames));
    this.recipes.sort((a, b) => sortByCatName(a, b, recipeCatNames));

    localStorage.setItem('category_migration_v6', 'true');
    this.notifyListeners();
  }

  deleteCategory(id: string) {
    this.categories = this.categories.filter(c => c.id !== id);
    this.notifyListeners();
    if (supabase) {
      supabase.from('categories').delete().eq('id', id).then();
    }
  }

  createSupplier(supp: Omit<Supplier, 'id'>) {
    const id = 'supp_' + Math.random().toString(36).substr(2, 9);
    const newSupp = { ...supp, id };
    this.suppliers.push(newSupp);
    this.notifyListeners();
    if (supabase) {
      supabase.from('suppliers').insert(newSupp).then();
    }
    return id;
  }

  updateSupplier(id: string, updated: Partial<Supplier>) {
    const idx = this.suppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.suppliers[idx] = { ...this.suppliers[idx], ...updated };
      this.notifyListeners();
      if (supabase) {
        supabase.from('suppliers').update(updated).eq('id', id).then();
      }
    }
  }

  deleteSupplier(id: string) {
    this.suppliers = this.suppliers.filter(s => s.id !== id);
    this.ingredients.forEach(ing => {
      if (ing.supplierId === id) {
        ing.supplierId = null;
        if (supabase) {
          supabase.from('ingredients').update({ supplierId: null }).eq('id', ing.id).then();
        }
      }
    });
    this.notifyListeners();
    if (supabase) {
      supabase.from('suppliers').delete().eq('id', id).then();
    }
  }

  private addPriceHistory(ingredientId: string, oldPrice: number, newPrice: number) {
    const id = 'hist_' + Math.random().toString(36).substr(2, 9);
    const roleMap: Record<SystemSettings['userRole'], string> = {
      admin: '管理者',
      manager: '店長・料理長',
      staff: '一般スタッフ'
    };
    const hist: PriceHistory = {
      id,
      ingredientId,
      oldPrice,
      newPrice,
      changedAt: new Date().toISOString(),
      changedBy: roleMap[this.settings.userRole] || 'システム',
    };
    this.priceHistories.unshift(hist);
    if (this.priceHistories.length > 100) this.priceHistories.pop();
    
    if (supabase) {
      supabase.from('price_histories').insert(hist).then();
    }
  }

  updateSettings(updated: Partial<SystemSettings>) {
    this.settings = { ...this.settings, ...updated };
    if (updated.fontSize) {
      if (updated.fontSize === 'large') document.body.classList.add('large-text');
      else document.body.classList.remove('large-text');
    }
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    this.notifyListeners();
  }

  exportData(): string {
    return JSON.stringify({
      categories: this.categories,
      suppliers: this.suppliers,
      ingredients: this.ingredients,
      preps: this.preps,
      recipes: this.recipes,
      priceHistories: this.priceHistories,
    }, null, 2);
  }

  // --- ローカルデータをクラウドへ移行 ---
  async migrateLocalDataToCloud() {
    if (!supabase || !this.session) {
      alert('移行を実行するにはログインが必要です。');
      return false;
    }
    
    try {
      // 現在のメモリはクラウド上の空データで上書きされている可能性があるため、
      // ローカルストレージから直接読み込む
      const load = (key: string) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
      };

      const localCats = load(STORAGE_KEYS.CATEGORIES);
      const localSupps = load(STORAGE_KEYS.SUPPLIERS);
      const localIngs = load(STORAGE_KEYS.INGREDIENTS);
      const localPreps = load(STORAGE_KEYS.PREPS);
      const localRecs = load(STORAGE_KEYS.RECIPES);
      const localHists = load(STORAGE_KEYS.PRICE_HISTORIES);

      // 1. 各テーブルにローカルデータを一括インサート
      const upsertData = async (table: string, data: any[], allowedKeys: string[]) => {
        if (data && data.length > 0) {
          // DBに存在しない余分なプロパティを取り除く
          const cleanData = data.map(item => {
            const cleanItem: any = {};
            for (const key of allowedKeys) {
              if (item[key] !== undefined) cleanItem[key] = item[key];
            }
            return cleanItem;
          });
          
          const { error } = await supabase!.from(table).upsert(cleanData);
          if (error) throw new Error(`[${table}] ${error.message}`);
        }
      };

      await upsertData('categories', localCats, ['id', 'name']);
      await upsertData('suppliers', localSupps, ['id', 'name', 'contactPerson', 'phone', 'email', 'memo']);
      await upsertData('ingredients', localIngs, ['id', 'name', 'categoryId', 'supplierId', 'purchaseQuantity', 'purchaseUnit', 'purchasePriceExTax', 'purchasePriceInTax', 'taxRate', 'baseUnit', 'unitCost', 'stockQuantity', 'status', 'memo', 'updatedAt']);
      await upsertData('preps', localPreps, ['id', 'name', 'categoryId', 'shelfLife', 'yieldQuantity', 'yieldUnit', 'totalCost', 'unitCost', 'instructions', 'storageMethod', 'container', 'imageUrl', 'memo', 'items']);
      await upsertData('recipes', localRecs, ['id', 'name', 'categoryId', 'sellingPriceExTax', 'sellingPriceInTax', 'costPrice', 'costRate', 'grossProfit', 'dishware', 'instructions', 'imageUrl', 'status', 'memo', 'items']);
      await upsertData('price_histories', localHists, ['id', 'ingredientId', 'oldPrice', 'newPrice', 'changedAt', 'changedBy']);
      
      alert('クラウドへのデータ移行が完了しました！');
      // 再取得してメモリに反映
      await this.loadFromSupabase();
      return true;
    } catch (e: any) {
      console.error('Migration failed:', e);
      alert('移行中にエラーが発生しました: ' + e.message);
      return false;
    }
  }

  importData(jsonString: string): boolean {
    // インポートは一括JSON挿入ですが、マルチテナント対応では一旦サポート外とするか、一つずつINSERTします
    return false;
  }
}

export const store = new DataStore();
export default store;
