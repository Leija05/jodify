export interface SupabaseConfig {
    url: string;
    key: string;
}

export interface SupabaseClient {
    config: SupabaseConfig;
    from: (table: string) => { table: string };
}

export const supabaseClient = {
    create(config: SupabaseConfig): SupabaseClient {
        return {
            config,
            from: (table: string) => ({ table })
        };
    }
};
