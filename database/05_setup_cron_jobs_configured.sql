-- Setup Cron Jobs for Automated NFL Results Updates
-- Runs during game windows only (Thu/Sun/Mon nights)
-- Only active during NFL season (September through January)

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Configure with actual credentials
DO $$
DECLARE
  service_key TEXT := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlpYWticWxvYXlmbHNiY2h0ZmtpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDUxNDg4MywiZXhwIjoyMDgwMDkwODgzfQ.psToTV5YJMIDstmt4nny0_ovBOHS3IX-NxV0JhraCh8';
  project_url TEXT := 'https://iiakbqloayflsbchtfki.supabase.co';
BEGIN
  -- Remove existing jobs if they exist
  PERFORM cron.unschedule('thursday-night-football') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'thursday-night-football');
  PERFORM cron.unschedule('sunday-football-early') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sunday-football-early');
  PERFORM cron.unschedule('sunday-football-late') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sunday-football-late');
  PERFORM cron.unschedule('monday-night-football') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'monday-night-football');

  -- Thursday Night Football: 8 PM - midnight ET (1 AM - 5 AM UTC Friday)
  -- Only runs September through January (months 9-12, 1)
  PERFORM cron.schedule(
    'thursday-night-football',
    '0 1-5 * 9-12,1 5',
    format(
      $query$
      SELECT net.http_post(
        url:='%s/functions/v1/update-nfl-results',
        headers:='{"Authorization": "Bearer %s"}'::jsonb
      );
      $query$,
      project_url,
      service_key
    )
  );

  -- Sunday Football Early: 6 PM - 11 PM UTC Sunday
  PERFORM cron.schedule(
    'sunday-football-early',
    '0 18-23 * 9-12,1 0',
    format(
      $query$
      SELECT net.http_post(
        url:='%s/functions/v1/update-nfl-results',
        headers:='{"Authorization": "Bearer %s"}'::jsonb
      );
      $query$,
      project_url,
      service_key
    )
  );

  -- Sunday Football Late: Midnight - 5 AM UTC Monday
  PERFORM cron.schedule(
    'sunday-football-late',
    '0 0-5 * 9-12,1 1',
    format(
      $query$
      SELECT net.http_post(
        url:='%s/functions/v1/update-nfl-results',
        headers:='{"Authorization": "Bearer %s"}'::jsonb
      );
      $query$,
      project_url,
      service_key
    )
  );

  -- Monday Night Football: 8 PM - midnight ET (1 AM - 5 AM UTC Tuesday)
  PERFORM cron.schedule(
    'monday-night-football',
    '0 1-5 * 9-12,1 2',
    format(
      $query$
      SELECT net.http_post(
        url:='%s/functions/v1/update-nfl-results',
        headers:='{"Authorization": "Bearer %s"}'::jsonb
      );
      $query$,
      project_url,
      service_key
    )
  );
END $$;

-- Verify cron jobs were created
SELECT jobname, schedule, active FROM cron.job;
