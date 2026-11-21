-- Additive, repeat-safe semester portal upgrade.
-- This file is intentionally separate from db/schema.sql.
DELIMITER $$
DROP PROCEDURE IF EXISTS ensure_semester_portal_columns$$
CREATE PROCEDURE ensure_semester_portal_columns()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='loans' AND column_name='semester_id') THEN
    ALTER TABLE loans ADD COLUMN semester_id INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='theses' AND column_name='semester_id') THEN
    ALTER TABLE theses ADD COLUMN semester_id INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='student_document_requests' AND column_name='semester_id') THEN
    ALTER TABLE student_document_requests ADD COLUMN semester_id INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='support_tickets' AND column_name='semester_id') THEN
    ALTER TABLE support_tickets ADD COLUMN semester_id INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='library_reservations' AND column_name='semester_id') THEN
    ALTER TABLE library_reservations ADD COLUMN semester_id INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='loan_renewal_requests' AND column_name='semester_id') THEN
    ALTER TABLE loan_renewal_requests ADD COLUMN semester_id INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='career_applications' AND column_name='semester_id') THEN
    ALTER TABLE career_applications ADD COLUMN semester_id INT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name='loans' AND column_name='semester_id' AND referenced_table_name='semesters') THEN
    ALTER TABLE loans ADD CONSTRAINT loans_semester_id_fk FOREIGN KEY(semester_id) REFERENCES semesters(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name='theses' AND column_name='semester_id' AND referenced_table_name='semesters') THEN
    ALTER TABLE theses ADD CONSTRAINT theses_semester_id_fk FOREIGN KEY(semester_id) REFERENCES semesters(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name='student_document_requests' AND column_name='semester_id' AND referenced_table_name='semesters') THEN
    ALTER TABLE student_document_requests ADD CONSTRAINT document_requests_semester_id_fk FOREIGN KEY(semester_id) REFERENCES semesters(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name='support_tickets' AND column_name='semester_id' AND referenced_table_name='semesters') THEN
    ALTER TABLE support_tickets ADD CONSTRAINT support_tickets_semester_id_fk FOREIGN KEY(semester_id) REFERENCES semesters(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name='library_reservations' AND column_name='semester_id' AND referenced_table_name='semesters') THEN
    ALTER TABLE library_reservations ADD CONSTRAINT library_reservations_semester_id_fk FOREIGN KEY(semester_id) REFERENCES semesters(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name='loan_renewal_requests' AND column_name='semester_id' AND referenced_table_name='semesters') THEN
    ALTER TABLE loan_renewal_requests ADD CONSTRAINT loan_renewals_semester_id_fk FOREIGN KEY(semester_id) REFERENCES semesters(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.key_column_usage WHERE table_schema=DATABASE() AND table_name='career_applications' AND column_name='semester_id' AND referenced_table_name='semesters') THEN
    ALTER TABLE career_applications ADD CONSTRAINT career_applications_semester_id_fk FOREIGN KEY(semester_id) REFERENCES semesters(id);
  END IF;
END$$
DELIMITER ;
CALL ensure_semester_portal_columns();
DROP PROCEDURE ensure_semester_portal_columns;

CREATE TABLE IF NOT EXISTS student_payment_requests (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  student INT NOT NULL,
  invoice INT NOT NULL,
  semester_id INT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  method VARCHAR(30) NOT NULL,
  reference VARCHAR(100) NOT NULL UNIQUE,
  student_note VARCHAR(500),
  status VARCHAR(16) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  reviewer INT,
  review_note VARCHAR(500),
  receipt_id INT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY(student) REFERENCES students(user_id),
  FOREIGN KEY(invoice) REFERENCES invoices(id),
  FOREIGN KEY(semester_id) REFERENCES semesters(id),
  FOREIGN KEY(reviewer) REFERENCES users(id),
  FOREIGN KEY(receipt_id) REFERENCES receipts(id),
  CHECK (amount > 0),
  INDEX student_payment_semester_idx (student,semester_id,status),
  INDEX student_payment_review_idx (status,semester_id,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
