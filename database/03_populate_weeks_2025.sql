-- Populate weeks table for 2025 NFL Season
-- Run this in your Supabase SQL Editor

INSERT INTO weeks (week_number, season_year, start_date, end_date, is_complete) VALUES
-- Week 1: September 4-8, 2025
(1, 2025, '2025-09-04', '2025-09-08', false),
-- Week 2: September 11-15, 2025
(2, 2025, '2025-09-11', '2025-09-15', false),
-- Week 3: September 18-22, 2025
(3, 2025, '2025-09-18', '2025-09-22', false),
-- Week 4: September 25-29, 2025
(4, 2025, '2025-09-25', '2025-09-29', false),
-- Week 5: October 2-6, 2025
(5, 2025, '2025-10-02', '2025-10-06', false),
-- Week 6: October 9-13, 2025
(6, 2025, '2025-10-09', '2025-10-13', false),
-- Week 7: October 16-20, 2025
(7, 2025, '2025-10-16', '2025-10-20', false),
-- Week 8: October 23-27, 2025
(8, 2025, '2025-10-23', '2025-10-27', false),
-- Week 9: October 30 - November 3, 2025
(9, 2025, '2025-10-30', '2025-11-03', false),
-- Week 10: November 6-10, 2025
(10, 2025, '2025-11-06', '2025-11-10', false),
-- Week 11: November 13-17, 2025
(11, 2025, '2025-11-13', '2025-11-17', false),
-- Week 12: November 20-24, 2025 (Thanksgiving week)
(12, 2025, '2025-11-20', '2025-11-24', false),
-- Week 13: November 27 - December 1, 2025
(13, 2025, '2025-11-27', '2025-12-01', false),
-- Week 14: December 4-8, 2025
(14, 2025, '2025-12-04', '2025-12-08', false),
-- Week 15: December 11-15, 2025
(15, 2025, '2025-12-11', '2025-12-15', false),
-- Week 16: December 18-22, 2025
(16, 2025, '2025-12-18', '2025-12-22', false),
-- Week 17: December 25-29, 2025
(17, 2025, '2025-12-25', '2025-12-29', false),
-- Week 18: January 1-5, 2026
(18, 2025, '2026-01-01', '2026-01-05', false)
ON CONFLICT DO NOTHING;

-- Verify the data was inserted
SELECT week_number, start_date, end_date FROM weeks WHERE season_year = 2025 ORDER BY week_number;
