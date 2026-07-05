export type Plan = 'free' | 'starter' | 'pro' | 'elite' | 'admin';
export type MlClass = 'Momentum' | 'Swing' | 'Consolidating' | 'Hold' | 'Declining' | 'Stagnant' | 'Watch';
export type SignalType = 'BUY' | 'SELL' | 'HOLD';
export type PaperTradeSignal = 'BUY' | 'SELL';
export type PaperTradeStatus = 'OPEN' | 'WIN' | 'LOSS';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row:    { id: string; email: string | null; full_name: string | null; avatar_url: string | null; plan: Plan; plan_expires_at: string | null; broker: string | null; created_at: string; updated_at: string };
        Insert: { id: string; email?: string | null; full_name?: string | null; avatar_url?: string | null; plan?: Plan; plan_expires_at?: string | null; broker?: string | null };
        Update: { email?: string | null; full_name?: string | null; avatar_url?: string | null; plan?: Plan; plan_expires_at?: string | null; broker?: string | null };
        Relationships: [];
      };
      portfolios: {
        Row:    { id: string; user_id: string; name: string; broker: string | null; created_at: string };
        Insert: { id?: string; user_id: string; name: string; broker?: string | null };
        Update: { id?: string; user_id?: string; name?: string; broker?: string | null };
        Relationships: [];
      };
      holdings: {
        Row:    { id: string; portfolio_id: string; user_id: string; symbol: string; exchange: string; qty: number; avg_price: number; purchase_date: string | null; ml_class: MlClass | null; created_at: string; updated_at: string };
        Insert: { id?: string; portfolio_id: string; user_id: string; symbol: string; exchange?: string; qty: number; avg_price: number; purchase_date?: string | null; ml_class?: MlClass | null };
        Update: { portfolio_id?: string; user_id?: string; symbol?: string; exchange?: string; qty?: number; avg_price?: number; purchase_date?: string | null; ml_class?: MlClass | null };
        Relationships: [];
      };
      watchlists: {
        Row:    { id: string; user_id: string; symbol: string; exchange: string; added_at: string };
        Insert: { id?: string; user_id: string; symbol: string; exchange?: string };
        Update: { user_id?: string; symbol?: string; exchange?: string };
        Relationships: [];
      };
      strategies: {
        Row:    { id: string; user_id: string; name: string; strategy_type: string; universe: string[]; indicators: string[]; stop_loss_pct: number; target_pct: number; config: Record<string, unknown>; created_at: string };
        Insert: { id?: string; user_id: string; name: string; strategy_type: string; universe?: string[]; indicators?: string[]; stop_loss_pct?: number; target_pct?: number; config?: Record<string, unknown> };
        Update: { user_id?: string; name?: string; strategy_type?: string; universe?: string[]; indicators?: string[]; stop_loss_pct?: number; target_pct?: number; config?: Record<string, unknown> };
        Relationships: [];
      };
      paper_strategies: {
        Row:    { id: string; user_id: string; name: string; algo_type: string | null; capital: number; rsi_low: number; rsi_high: number; sl_pct: number; target_pct: number; trial_days: number; active: boolean; started_at: string; created_at: string };
        Insert: { id?: string; user_id: string; name: string; algo_type?: string | null; capital?: number; rsi_low?: number; rsi_high?: number; sl_pct?: number; target_pct?: number; trial_days?: number; active?: boolean; started_at?: string };
        Update: { name?: string; algo_type?: string | null; capital?: number; rsi_low?: number; rsi_high?: number; sl_pct?: number; target_pct?: number; trial_days?: number; active?: boolean };
        Relationships: [];
      };
      paper_trades: {
        Row:    { id: string; strategy_id: string; user_id: string; symbol: string; signal: PaperTradeSignal; entry_price: number; qty: number; entry_at: string; exit_price: number | null; exit_at: string | null; pl: number | null; status: PaperTradeStatus };
        Insert: { id?: string; strategy_id: string; user_id: string; symbol: string; signal?: PaperTradeSignal; entry_price: number; qty: number; entry_at?: string; exit_price?: number | null; exit_at?: string | null; pl?: number | null; status?: PaperTradeStatus };
        Update: { exit_price?: number | null; exit_at?: string | null; pl?: number | null; status?: PaperTradeStatus };
        Relationships: [];
      };
      broker_connections: {
        Row:    { id: string; user_id: string; broker_name: string; plaid_access_token: string; plaid_item_id: string; institution_name: string | null; last_synced_at: string | null; created_at: string };
        Insert: { id?: string; user_id: string; broker_name: string; plaid_access_token: string; plaid_item_id: string; institution_name?: string | null; last_synced_at?: string | null };
        Update: { broker_name?: string; plaid_access_token?: string; institution_name?: string | null; last_synced_at?: string | null };
        Relationships: [];
      };
      plaid_holdings: {
        Row:    { id: string; user_id: string; broker_connection_id: string; symbol: string; name: string | null; qty: number; cost_basis: number | null; institution_price: number | null; institution_value: number | null; security_type: string; vested_qty: number | null; unvested_qty: number | null; account_name: string | null; account_type: string | null; synced_at: string };
        Insert: { id?: string; user_id: string; broker_connection_id: string; symbol: string; name?: string | null; qty: number; cost_basis?: number | null; institution_price?: number | null; institution_value?: number | null; security_type?: string; vested_qty?: number | null; unvested_qty?: number | null; account_name?: string | null; account_type?: string | null; synced_at?: string };
        Update: { symbol?: string; name?: string | null; qty?: number; cost_basis?: number | null; institution_price?: number | null; institution_value?: number | null; security_type?: string; vested_qty?: number | null; unvested_qty?: number | null; account_name?: string | null; account_type?: string | null; synced_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
