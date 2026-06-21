export type Plan = 'free' | 'starter' | 'pro' | 'elite';
export type MlClass = 'Momentum' | 'Swingable' | 'LongTerm' | 'ExitNow' | 'Watch';
export type SignalType = 'BUY' | 'SELL' | 'HOLD';
export type TradeStatus = 'open' | 'win' | 'sl' | 'hold';
export type PaperTradeStatus = 'running' | 'completed' | 'stopped';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          plan: Plan;
          broker: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      portfolios: {
        Row: { id: string; user_id: string; name: string; broker: string | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['portfolios']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['portfolios']['Row']>;
      };
      holdings: {
        Row: { id: string; portfolio_id: string; user_id: string; symbol: string; exchange: string; qty: number; avg_price: number; ml_class: MlClass | null; created_at: string; updated_at: string };
        Insert: Omit<Database['public']['Tables']['holdings']['Row'], 'id' | 'created_at' | 'updated_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['holdings']['Row']>;
      };
      watchlists: {
        Row: { id: string; user_id: string; symbol: string; exchange: string; added_at: string };
        Insert: Omit<Database['public']['Tables']['watchlists']['Row'], 'id' | 'added_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['watchlists']['Row']>;
      };
      strategies: {
        Row: { id: string; user_id: string; name: string; strategy_type: string; universe: string[]; indicators: string[]; stop_loss_pct: number; target_pct: number; config: Record<string, unknown>; created_at: string };
        Insert: Omit<Database['public']['Tables']['strategies']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['strategies']['Row']>;
      };
      paper_trades: {
        Row: { id: string; user_id: string; strategy_id: string | null; strategy_name: string; virtual_capital: number; current_value: number; status: PaperTradeStatus; start_date: string; end_date: string | null; created_at: string };
        Insert: Omit<Database['public']['Tables']['paper_trades']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['paper_trades']['Row']>;
      };
      paper_trade_logs: {
        Row: { id: string; paper_trade_id: string; user_id: string; symbol: string; signal: SignalType; entry_price: number | null; exit_price: number | null; qty: number | null; pl: number | null; status: TradeStatus; fired_at: string };
        Insert: Omit<Database['public']['Tables']['paper_trade_logs']['Row'], 'id' | 'fired_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['paper_trade_logs']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
