-- SaaS / マルチテナント用 Supabase スキーマ

-- ==========================================
-- 1. 企業 (テナント) と ユーザー (プロフィール)
-- ==========================================
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff', -- 'admin', 'manager', 'staff'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. アプリケーションデータテーブル
-- ※ すべてのテーブルに company_id を追加
-- ==========================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "contactPerson" TEXT,
  phone TEXT,
  email TEXT,
  memo TEXT
);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "categoryId" TEXT,
  "supplierId" TEXT,
  "purchaseQuantity" NUMERIC NOT NULL,
  "purchaseUnit" TEXT NOT NULL,
  "purchasePriceExTax" NUMERIC NOT NULL,
  "purchasePriceInTax" NUMERIC NOT NULL,
  "taxRate" NUMERIC NOT NULL,
  "baseUnit" TEXT NOT NULL,
  "unitCost" NUMERIC NOT NULL,
  "stockQuantity" NUMERIC NOT NULL,
  status TEXT NOT NULL,
  memo TEXT,
  "updatedAt" TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS preps (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "categoryId" TEXT,
  "shelfLife" TEXT,
  "yieldQuantity" NUMERIC NOT NULL,
  "yieldUnit" TEXT NOT NULL,
  "totalCost" NUMERIC NOT NULL,
  "unitCost" NUMERIC NOT NULL,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  "storageMethod" TEXT,
  container TEXT,
  "imageUrl" TEXT,
  memo TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "categoryId" TEXT,
  "sellingPriceInTax" NUMERIC NOT NULL,
  "sellingPriceExTax" NUMERIC NOT NULL,
  "costPrice" NUMERIC NOT NULL,
  "costRate" NUMERIC NOT NULL,
  "grossProfit" NUMERIC NOT NULL,
  dishware TEXT,
  instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  "imageUrl" TEXT,
  status TEXT NOT NULL,
  memo TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS price_histories (
  id TEXT PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  "ingredientId" TEXT NOT NULL,
  "oldPrice" NUMERIC NOT NULL,
  "newPrice" NUMERIC NOT NULL,
  "changedAt" TEXT NOT NULL,
  "changedBy" TEXT NOT NULL
);

-- ==========================================
-- 3. Row Level Security (RLS) の設定
-- ==========================================
-- 自分の所属する会社のデータのみアクセス可能にする関数
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- RLSの有効化
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE preps ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_histories ENABLE ROW LEVEL SECURITY;

-- プロフィールのポリシー: 自分自身のプロフィールのみ読み書き可能
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 会社のポリシー: 所属している会社の情報のみ取得可能
CREATE POLICY "Users can view own company" ON companies FOR SELECT USING (id = public.get_my_company_id());

-- データテーブルのポリシー: 所属会社のデータのみ読み書き可能
CREATE POLICY "Tenant isolation for categories" ON categories USING (company_id = public.get_my_company_id());
CREATE POLICY "Tenant isolation for suppliers" ON suppliers USING (company_id = public.get_my_company_id());
CREATE POLICY "Tenant isolation for ingredients" ON ingredients USING (company_id = public.get_my_company_id());
CREATE POLICY "Tenant isolation for preps" ON preps USING (company_id = public.get_my_company_id());
CREATE POLICY "Tenant isolation for recipes" ON recipes USING (company_id = public.get_my_company_id());
CREATE POLICY "Tenant isolation for price_histories" ON price_histories USING (company_id = public.get_my_company_id());

-- ==========================================
-- 4. INSERT時の company_id 自動付与トリガー
-- ==========================================
CREATE OR REPLACE FUNCTION public.set_company_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id = public.get_my_company_id();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_company_id_categories BEFORE INSERT ON categories FOR EACH ROW EXECUTE PROCEDURE public.set_company_id();
CREATE TRIGGER set_company_id_suppliers BEFORE INSERT ON suppliers FOR EACH ROW EXECUTE PROCEDURE public.set_company_id();
CREATE TRIGGER set_company_id_ingredients BEFORE INSERT ON ingredients FOR EACH ROW EXECUTE PROCEDURE public.set_company_id();
CREATE TRIGGER set_company_id_preps BEFORE INSERT ON preps FOR EACH ROW EXECUTE PROCEDURE public.set_company_id();
CREATE TRIGGER set_company_id_recipes BEFORE INSERT ON recipes FOR EACH ROW EXECUTE PROCEDURE public.set_company_id();
CREATE TRIGGER set_company_id_price_histories BEFORE INSERT ON price_histories FOR EACH ROW EXECUTE PROCEDURE public.set_company_id();

-- ==========================================
-- 5. ユーザー登録時の自動企業割り当て (オプション)
-- ※SaaSの場合は、新規ユーザー登録時に自動で会社を作る等のトリガーを仕込みます
-- ==========================================
-- 簡易的な関数として、最初のサインアップ時にテスト用の会社を作る例
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- デフォルトの会社を作成
  INSERT INTO public.companies (name) VALUES ('My Company') RETURNING id INTO new_company_id;
  
  -- プロフィールを作成して会社に紐付け
  INSERT INTO public.profiles (id, company_id, role)
  VALUES (new.id, new_company_id, 'admin');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 新規ユーザー登録時にトリガーを実行 (自社利用フェーズ1用)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
