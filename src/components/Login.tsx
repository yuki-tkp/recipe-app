import { useState } from 'react';
import { supabase } from '../services/supabase';
import { Users, ShieldAlert } from 'lucide-react';
import './Login.css';

export const Login = () => {
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'admin' | 'staff'>('staff');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    setLoading(true);
    setMessage('');
    
    try {
      if (loginMode === 'staff') {
        const { error } = await supabase.auth.signInWithPassword({
          email: 'staff@11tap.com',
          password,
        });
        if (error) {
          throw new Error('パスワードが間違っているか、スタッフアカウントが未作成です。');
        }
      } else {
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
          });
          if (error) throw error;
          setMessage('確認メールを送信しました。メール内のリンクをクリックしてください。');
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (error) throw error;
        }
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1 className="login-title">スマート原価</h1>
        <p className="login-subtitle">レシピ＆棚卸管理システム</p>

        <div className="login-tabs">
          <button 
            className={`login-tab ${loginMode === 'staff' ? 'active' : ''}`}
            onClick={() => { setLoginMode('staff'); setMessage(''); setPassword(''); }}
          >
            <Users size={18} />
            スタッフ
          </button>
          <button 
            className={`login-tab ${loginMode === 'admin' ? 'active' : ''}`}
            onClick={() => { setLoginMode('admin'); setMessage(''); setPassword(''); setIsSignUp(false); }}
          >
            <ShieldAlert size={18} />
            管理者
          </button>
        </div>

        <form onSubmit={handleAuth} className="login-form">
          {loginMode === 'admin' && (
            <div className="form-group">
              <label>メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
              />
            </div>
          )}
          
          <div className="form-group">
            <label>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={loginMode === 'admin' ? 6 : 1}
              placeholder={loginMode === 'staff' ? 'スタッフ用パスワードを入力' : ''}
            />
          </div>
          
          {message && <div className="login-message">{message}</div>}
          
          <button type="submit" className="login-button" disabled={loading}>
            {loading ? '処理中...' : loginMode === 'staff' ? '業務を開始する' : isSignUp ? '登録する' : 'ログイン'}
          </button>
        </form>
        
        {loginMode === 'admin' && (
          <div className="login-toggle">
            <button onClick={() => setIsSignUp(!isSignUp)} className="text-button">
              {isSignUp ? 'すでにアカウントをお持ちの方はこちら' : '新規アカウント作成はこちら'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
