-- Setup Cron Jobs for Automated NFL Results Updates
-- Runs during game windows only (Thu/Sun/Mon nights)
-- Only active during NFL season (September through January)

-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Set your service role key here before running
DO $$
DECLARE
  service_key TEXT := 'YOUR_LEGACY_SERVICE_ROLE_KEY_HERE';
  project_url TEXT := 'https://YOUR_PROJECT_REF.supabase.co';
BEGIN
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

-- To unschedule a job (if needed):
-- SELECT cron.unschedule('job-name-here');
