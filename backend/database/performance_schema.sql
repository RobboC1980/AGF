-- Performance Monitoring Database Schema
-- Tables for tracking query performance, indexing suggestions, and system metrics

-- Table for tracking slow queries
CREATE TABLE IF NOT EXISTS slow_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(32) NOT NULL,
    query_text TEXT NOT NULL,
    execution_time DECIMAL(10,3) NOT NULL,
    rows_returned INTEGER DEFAULT 0,
    endpoint VARCHAR(255),
    parameters JSONB,
    analysis_status VARCHAR(50) DEFAULT 'pending',
    optimization_suggestions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for index suggestions
CREATE TABLE IF NOT EXISTS index_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    columns TEXT[] NOT NULL,
    index_type VARCHAR(50) NOT NULL,
    estimated_impact DECIMAL(3,2) NOT NULL,
    query_patterns TEXT[],
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'implemented', 'rejected')),
    implementation_sql TEXT,
    size_estimate_mb INTEGER,
    maintenance_cost DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    implemented_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID,
    notes TEXT
);

-- Table for query performance metrics
CREATE TABLE IF NOT EXISTS query_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_hash VARCHAR(32) NOT NULL,
    endpoint VARCHAR(255),
    execution_time DECIMAL(10,3) NOT NULL,
    rows_returned INTEGER DEFAULT 0,
    cache_hit BOOLEAN DEFAULT FALSE,
    user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    parameters_hash VARCHAR(32),
    error_occurred BOOLEAN DEFAULT FALSE,
    error_message TEXT
);

-- Table for database connection pool metrics
CREATE TABLE IF NOT EXISTS connection_pool_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_connections INTEGER NOT NULL,
    idle_connections INTEGER NOT NULL,
    total_connections INTEGER NOT NULL,
    connection_errors INTEGER DEFAULT 0,
    average_connection_time DECIMAL(10,3),
    peak_connections INTEGER,
    utilization_rate DECIMAL(5,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for database size and growth tracking
CREATE TABLE IF NOT EXISTS database_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    row_count BIGINT,
    table_size_bytes BIGINT,
    index_size_bytes BIGINT,
    last_vacuum TIMESTAMP WITH TIME ZONE,
    last_analyze TIMESTAMP WITH TIME ZONE,
    bloat_ratio DECIMAL(5,2),
    seq_scans BIGINT,
    idx_scans BIGINT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for application performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(100) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    unit VARCHAR(20),
    tags JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for system resource metrics
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    network_io_mb DECIMAL(10,2),
    active_users INTEGER,
    concurrent_requests INTEGER,
    response_time_p50 DECIMAL(10,3),
    response_time_p95 DECIMAL(10,3),
    response_time_p99 DECIMAL(10,3),
    error_rate DECIMAL(5,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table for tracking database optimization events
CREATE TABLE IF NOT EXISTS optimization_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    affected_tables TEXT[],
    performance_impact JSONB,
    executed_by UUID,
    execution_time DECIMAL(10,3),
    status VARCHAR(50) DEFAULT 'completed',
    rollback_plan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance monitoring tables
CREATE INDEX IF NOT EXISTS idx_slow_queries_execution_time ON slow_queries(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_slow_queries_created_at ON slow_queries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slow_queries_query_hash ON slow_queries(query_hash);
CREATE INDEX IF NOT EXISTS idx_slow_queries_endpoint ON slow_queries(endpoint);

CREATE INDEX IF NOT EXISTS idx_index_suggestions_priority ON index_suggestions(priority, status);
CREATE INDEX IF NOT EXISTS idx_index_suggestions_table_name ON index_suggestions(table_name);
CREATE INDEX IF NOT EXISTS idx_index_suggestions_created_at ON index_suggestions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_query_metrics_timestamp ON query_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_query_metrics_query_hash ON query_metrics(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_metrics_endpoint ON query_metrics(endpoint);
CREATE INDEX IF NOT EXISTS idx_query_metrics_execution_time ON query_metrics(execution_time DESC);
CREATE INDEX IF NOT EXISTS idx_query_metrics_user_id ON query_metrics(user_id);

CREATE INDEX IF NOT EXISTS idx_connection_pool_metrics_timestamp ON connection_pool_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_database_metrics_timestamp ON database_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_database_metrics_table_name ON database_metrics(table_name);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type, metric_name);

CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_optimization_events_created_at ON optimization_events(created_at DESC);

-- Create partitioned tables for high-volume metrics (optional, for scale)
-- Partition query_metrics by month
CREATE TABLE IF NOT EXISTS query_metrics_monthly (
    LIKE query_metrics INCLUDING ALL
) PARTITION BY RANGE (timestamp);

-- Create views for common performance queries
CREATE OR REPLACE VIEW slow_query_summary AS
SELECT 
    query_hash,
    query_text,
    COUNT(*) as occurrence_count,
    AVG(execution_time) as avg_execution_time,
    MAX(execution_time) as max_execution_time,
    MIN(execution_time) as min_execution_time,
    AVG(rows_returned) as avg_rows_returned,
    MAX(created_at) as last_occurrence
FROM slow_queries 
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY query_hash, query_text
ORDER BY avg_execution_time DESC;

CREATE OR REPLACE VIEW performance_dashboard AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as total_queries,
    AVG(execution_time) as avg_execution_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time) as p50_execution_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time) as p95_execution_time,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time) as p99_execution_time,
    COUNT(CASE WHEN cache_hit THEN 1 END) * 100.0 / COUNT(*) as cache_hit_rate,
    COUNT(CASE WHEN error_occurred THEN 1 END) * 100.0 / COUNT(*) as error_rate
FROM query_metrics 
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', timestamp)
ORDER BY hour DESC;

CREATE OR REPLACE VIEW table_performance_summary AS
SELECT 
    dm.table_name,
    dm.row_count,
    dm.table_size_bytes / 1024 / 1024 as table_size_mb,
    dm.index_size_bytes / 1024 / 1024 as index_size_mb,
    dm.bloat_ratio,
    dm.seq_scans,
    dm.idx_scans,
    CASE 
        WHEN dm.idx_scans > 0 THEN dm.idx_scans * 100.0 / (dm.seq_scans + dm.idx_scans)
        ELSE 0 
    END as index_usage_ratio,
    COUNT(isug.id) as pending_index_suggestions
FROM database_metrics dm
LEFT JOIN index_suggestions isug ON dm.table_name = isug.table_name AND isug.status = 'pending'
WHERE dm.timestamp = (
    SELECT MAX(timestamp) 
    FROM database_metrics dm2 
    WHERE dm2.table_name = dm.table_name
)
GROUP BY dm.table_name, dm.row_count, dm.table_size_bytes, dm.index_size_bytes, 
         dm.bloat_ratio, dm.seq_scans, dm.idx_scans
ORDER BY table_size_mb DESC;

-- Create functions for performance analysis
CREATE OR REPLACE FUNCTION analyze_query_performance(
    p_hours INTEGER DEFAULT 24
) RETURNS TABLE (
    query_pattern TEXT,
    total_executions BIGINT,
    avg_execution_time NUMERIC,
    total_time NUMERIC,
    impact_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sq.query_text as query_pattern,
        COUNT(*)::BIGINT as total_executions,
        AVG(sq.execution_time)::NUMERIC as avg_execution_time,
        SUM(sq.execution_time)::NUMERIC as total_time,
        (COUNT(*) * AVG(sq.execution_time))::NUMERIC as impact_score
    FROM slow_queries sq
    WHERE sq.created_at > NOW() - (p_hours || ' hours')::INTERVAL
    GROUP BY sq.query_text
    ORDER BY impact_score DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION suggest_index_optimizations(
    p_table_name TEXT DEFAULT NULL
) RETURNS TABLE (
    table_name TEXT,
    suggested_columns TEXT[],
    index_type TEXT,
    estimated_impact NUMERIC,
    reasoning TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        isug.table_name::TEXT,
        isug.columns,
        isug.index_type::TEXT,
        isug.estimated_impact,
        CASE 
            WHEN isug.estimated_impact > 0.7 THEN 'High impact - frequently queried columns'
            WHEN isug.estimated_impact > 0.4 THEN 'Medium impact - moderate performance gain expected'
            ELSE 'Low impact - consider table size vs benefit'
        END::TEXT as reasoning
    FROM index_suggestions isug
    WHERE (p_table_name IS NULL OR isug.table_name = p_table_name)
        AND isug.status = 'pending'
    ORDER BY isug.estimated_impact DESC, isug.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up query metrics older than 30 days
    DELETE FROM query_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    -- Clean up slow queries older than 90 days
    DELETE FROM slow_queries 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up performance metrics older than 30 days
    DELETE FROM performance_metrics 
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create scheduled cleanup trigger (would be called by cron job)
-- Note: In production, this would be handled by a scheduled job rather than a trigger

-- Grant permissions for performance monitoring
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create materialized view for performance dashboard (refreshed periodically)
CREATE MATERIALIZED VIEW IF NOT EXISTS performance_summary_hourly AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    COUNT(*) as total_queries,
    AVG(execution_time) as avg_execution_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time) as p95_execution_time,
    COUNT(CASE WHEN cache_hit THEN 1 END) * 100.0 / COUNT(*) as cache_hit_rate
FROM query_metrics 
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', timestamp);

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_summary_hourly_hour 
ON performance_summary_hourly(hour);

-- Set up row level security for performance data
ALTER TABLE slow_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE index_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for performance monitoring (allow admin access)
CREATE POLICY "Performance data viewable by authenticated users" ON slow_queries
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Index suggestions viewable by authenticated users" ON index_suggestions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Query metrics viewable by authenticated users" ON query_metrics
    FOR SELECT USING (auth.role() = 'authenticated');

-- Additional indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_query_metrics_composite ON query_metrics(endpoint, timestamp DESC) 
WHERE execution_time > 1.0;

CREATE INDEX IF NOT EXISTS idx_slow_queries_analysis ON slow_queries(analysis_status, created_at) 
WHERE analysis_status = 'pending';

-- Comments for documentation
COMMENT ON TABLE slow_queries IS 'Tracks queries that exceed performance thresholds for analysis';
COMMENT ON TABLE index_suggestions IS 'AI-generated suggestions for database index optimizations';
COMMENT ON TABLE query_metrics IS 'Real-time query performance metrics and statistics';
COMMENT ON TABLE connection_pool_metrics IS 'Database connection pool health and utilization metrics';
COMMENT ON TABLE database_metrics IS 'Table-level database statistics and growth tracking';
COMMENT ON TABLE performance_metrics IS 'Application-level performance metrics and KPIs';
COMMENT ON TABLE system_metrics IS 'System resource utilization and health metrics';
COMMENT ON TABLE optimization_events IS 'Log of database optimization activities and their impact'; 