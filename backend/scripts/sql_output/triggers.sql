-- TRIGGERS STATEMENTS

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_update_project_progress
AFTER INSERT OR UPDATE OR DELETE ON stories
FOR EACH ROW
EXECUTE FUNCTION update_project_progress();

CREATE TRIGGER trigger_log_project_activity
AFTER INSERT OR UPDATE OR DELETE ON projects
FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER trigger_log_epic_activity
AFTER INSERT OR UPDATE OR DELETE ON epics
FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER trigger_log_story_activity
AFTER INSERT OR UPDATE OR DELETE ON stories
FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER trigger_log_task_activity
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER trigger_story_assignment_notification
AFTER UPDATE ON stories
FOR EACH ROW EXECUTE FUNCTION create_assignment_notification();

CREATE TRIGGER trigger_task_assignment_notification
AFTER UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION create_assignment_notification();

