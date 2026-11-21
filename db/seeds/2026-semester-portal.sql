-- Repeat-safe demo records for the semester portal workflows.
-- Designed to add sample records without truncating or replacing user data.

INSERT IGNORE INTO role_permissions(role_name,permission_name) VALUES
  ('STUDENT','request_payment'),
  ('ADMIN','payment_request_review'),
  ('ACCOUNTS_OFFICER','payment_request_review');

-- Existing portal requests receive a semester from the student's latest
-- registered term; rows without registration use the currently active term.
UPDATE student_document_requests r
SET semester_id=COALESCE(
  (SELECT o.term FROM registrations x JOIN offerings o ON o.id=x.offering
   JOIN semesters t ON t.id=o.term WHERE x.student=r.student
   ORDER BY t.starts_on DESC LIMIT 1),
  (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE
   ORDER BY starts_on DESC LIMIT 1),
  (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
)
WHERE semester_id IS NULL;

UPDATE support_tickets r
SET semester_id=COALESCE(
  (SELECT o.term FROM registrations x JOIN offerings o ON o.id=x.offering
   JOIN semesters t ON t.id=o.term WHERE x.student=r.student
   ORDER BY t.starts_on DESC LIMIT 1),
  (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE
   ORDER BY starts_on DESC LIMIT 1),
  (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
)
WHERE semester_id IS NULL;

UPDATE theses r
SET semester_id=COALESCE(
  (SELECT o.term FROM registrations x JOIN offerings o ON o.id=x.offering
   JOIN semesters t ON t.id=o.term WHERE x.student=r.student
   ORDER BY t.starts_on DESC LIMIT 1),
  (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE
   ORDER BY starts_on DESC LIMIT 1),
  (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
)
WHERE semester_id IS NULL;

UPDATE loans r
SET semester_id=COALESCE(
  (SELECT t.id FROM semesters t WHERE r.issued BETWEEN t.starts_on AND t.ends_on
   ORDER BY t.starts_on DESC LIMIT 1),
  (SELECT o.term FROM registrations x JOIN offerings o ON o.id=x.offering
   JOIN semesters t ON t.id=o.term WHERE x.student=r.student
   ORDER BY t.starts_on DESC LIMIT 1),
  (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE
   ORDER BY starts_on DESC LIMIT 1),
  (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
)
WHERE semester_id IS NULL;

UPDATE library_reservations r
SET semester_id=COALESCE(
  (SELECT o.term FROM registrations x JOIN offerings o ON o.id=x.offering
   JOIN semesters t ON t.id=o.term WHERE x.student=r.student
   ORDER BY t.starts_on DESC LIMIT 1),
  (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE
   ORDER BY starts_on DESC LIMIT 1),
  (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
)
WHERE semester_id IS NULL;

UPDATE loan_renewal_requests r
JOIN loans l ON l.id=r.loan
SET r.semester_id=COALESCE(
  l.semester_id,
  (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE
   ORDER BY starts_on DESC LIMIT 1),
  (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
)
WHERE r.semester_id IS NULL;

UPDATE career_applications r
SET semester_id=COALESCE(
  (SELECT o.term FROM registrations x JOIN offerings o ON o.id=x.offering
   JOIN semesters t ON t.id=o.term WHERE x.student=r.student
   ORDER BY t.starts_on DESC LIMIT 1),
  (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE
   ORDER BY starts_on DESC LIMIT 1),
  (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
)
WHERE semester_id IS NULL;

-- Ensure the core demo student can explore fees and the pending verification flow.
INSERT IGNORE INTO invoices(student,label,amount,due)
SELECT u.id,'Semester portal demo fee',3200,DATE_ADD(CURRENT_DATE,INTERVAL 30 DAY)
FROM users u WHERE u.email='student@campus.test';

INSERT IGNORE INTO invoice_details(invoice,term,issued)
SELECT i.id,t.id,t.starts_on
FROM invoices i
JOIN users u ON u.id=i.student AND u.email='student@campus.test'
JOIN semesters t ON t.id=COALESCE(
  (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE ORDER BY starts_on DESC LIMIT 1),
  (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
)
WHERE i.label='Semester portal demo fee';

UPDATE invoice_details d
JOIN invoices i ON i.id=d.invoice
JOIN users u ON u.id=i.student AND u.email='student@campus.test'
JOIN semesters t ON t.id=COALESCE(
  (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE ORDER BY starts_on DESC LIMIT 1),
  (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
)
SET d.term=t.id,d.issued=t.starts_on
WHERE i.label='Semester portal demo fee';

INSERT IGNORE INTO invoice_items(invoice,label,amount)
SELECT i.id,'Semester portal fee',i.amount FROM invoices i
JOIN users u ON u.id=i.student AND u.email='student@campus.test'
WHERE i.label='Semester portal demo fee';

INSERT IGNORE INTO student_payment_requests(student,invoice,semester_id,amount,method,reference,student_note)
SELECT u.id,i.id,d.term,1200,'bKash','CAMPUS-DEMO-PAYMENT-2026-01',
  'Sample pending request. No external payment was collected.'
FROM users u
JOIN invoices i ON i.student=u.id AND i.label='Semester portal demo fee'
JOIN invoice_details d ON d.invoice=i.id
WHERE u.email='student@campus.test';

-- Ensure the demo student has a thesis proposal linked to a sample semester.
INSERT IGNORE INTO theses(student,title,proposal,status,semester_id)
SELECT u.id,'Smart campus service improvement',
  'A demo proposal for reviewing milestones, feedback, and thesis progress.',
  'Submitted',
  COALESCE(
    (SELECT o.term FROM registrations r JOIN offerings o ON o.id=r.offering
     JOIN semesters t ON t.id=o.term WHERE r.student=u.id ORDER BY t.starts_on DESC LIMIT 1),
    (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE ORDER BY starts_on DESC LIMIT 1),
    (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
  )
FROM users u WHERE u.email='student@campus.test';

-- An existing published result and held class provide safe review examples.
INSERT INTO grade_review_requests(reg,student,reason)
SELECT r.id,r.student,'Demo request: please explain the published grade calculation.'
FROM registrations r
JOIN users u ON u.id=r.student AND u.email='student@campus.test'
JOIN results g ON g.reg=r.id AND g.published=1
JOIN offerings o ON o.id=r.offering
JOIN semesters s ON s.id=o.term
WHERE NOT EXISTS (
  SELECT 1 FROM grade_review_requests x
  WHERE x.reg=r.id AND x.reason='Demo request: please explain the published grade calculation.'
)
ORDER BY s.starts_on DESC
LIMIT 1;

INSERT INTO attendance_correction_requests(reg,student,day,requested_status,reason)
SELECT r.id,r.student,cs.day,
  CASE WHEN COALESCE(a.present,0)=1 THEN 'Absent' ELSE 'Present' END,
  'Demo request for exploring attendance review.'
FROM registrations r
JOIN users u ON u.id=r.student AND u.email='student@campus.test'
JOIN class_sessions cs ON cs.offering=r.offering AND cs.status='Held'
LEFT JOIN attendance a ON a.reg=r.id AND a.day=cs.day
WHERE r.status='Approved'
  AND cs.day<=CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM attendance_correction_requests x
    WHERE x.reg=r.id AND x.day=cs.day AND x.reason='Demo request for exploring attendance review.'
  )
ORDER BY cs.day DESC
LIMIT 1;

INSERT INTO support_replies(ticket,author,message)
SELECT t.id,a.id,'Demo reply: your request is in the student support queue.'
FROM support_tickets t
JOIN users s ON s.id=t.student AND s.email='student@campus.test'
JOIN users a ON a.email='admin@campus.test'
WHERE t.subject='Demo portal support request'
  AND NOT EXISTS (
    SELECT 1 FROM support_replies r
    WHERE r.ticket=t.id AND r.message='Demo reply: your request is in the student support queue.'
  );

INSERT IGNORE INTO career_applications(opportunity,student,cover_note,semester_id)
SELECT o.id,s.id,'Demo application for the semester career workspace.',
  COALESCE(
    (SELECT x.term FROM registrations r JOIN offerings x ON x.id=r.offering
     JOIN semesters t ON t.id=x.term WHERE r.student=s.id ORDER BY t.starts_on DESC LIMIT 1),
    (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE ORDER BY starts_on DESC LIMIT 1),
    (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
  )
FROM career_opportunities o
JOIN users s ON s.email='student@campus.test'
WHERE o.title='Campus software engineering internship'
  AND o.status='Published'
  AND (o.deadline IS NULL OR o.deadline>=CURRENT_DATE);

-- Demo copies show both a pending reservation and a renewal request.
INSERT IGNORE INTO books(code,title,author,copies)
VALUES ('DEMO-RESERVE-26','Semester Portal Reservation Demo','Campus Library Demo',1),
       ('DEMO-RENEW-26','Semester Portal Renewal Demo','Campus Library Demo',1);
INSERT IGNORE INTO book_copies(book,accession)
SELECT id,CONCAT(code,'-COPY-1') FROM books WHERE code IN ('DEMO-RESERVE-26','DEMO-RENEW-26');

INSERT INTO loans(book,student,issued,due,semester_id)
SELECT b.id,s.id,CURRENT_DATE,DATE_ADD(CURRENT_DATE,INTERVAL 7 DAY),
  COALESCE(
    (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE ORDER BY starts_on DESC LIMIT 1),
    (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
  )
FROM books b
JOIN users s ON s.email='student@campus.test'
WHERE b.code='DEMO-RENEW-26'
  AND NOT EXISTS (SELECT 1 FROM loans l WHERE l.book=b.id AND l.student=s.id AND l.returned IS NULL);

INSERT IGNORE INTO loan_copies(loan,copy_id)
SELECT l.id,c.id FROM loans l
JOIN books b ON b.id=l.book AND b.code='DEMO-RENEW-26'
JOIN users s ON s.id=l.student AND s.email='student@campus.test'
JOIN book_copies c ON c.book=b.id
WHERE NOT EXISTS (SELECT 1 FROM loan_copies x WHERE x.loan=l.id);

INSERT INTO loans(book,student,issued,due,semester_id)
SELECT b.id,s.id,CURRENT_DATE,DATE_ADD(CURRENT_DATE,INTERVAL 7 DAY),
  COALESCE(
    (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE ORDER BY starts_on DESC LIMIT 1),
    (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
  )
FROM books b
JOIN users s ON s.email='student01@demo.campus.test'
WHERE b.code='DEMO-RESERVE-26'
  AND NOT EXISTS (SELECT 1 FROM loans l WHERE l.book=b.id AND l.student=s.id AND l.returned IS NULL);

INSERT IGNORE INTO loan_copies(loan,copy_id)
SELECT l.id,c.id FROM loans l
JOIN books b ON b.id=l.book AND b.code='DEMO-RESERVE-26'
JOIN users s ON s.id=l.student AND s.email='student01@demo.campus.test'
JOIN book_copies c ON c.book=b.id
WHERE NOT EXISTS (SELECT 1 FROM loan_copies x WHERE x.loan=l.id);

INSERT INTO loan_renewal_requests(loan,student,requested_due,semester_id)
SELECT l.id,l.student,DATE_ADD(l.due,INTERVAL 7 DAY),l.semester_id
FROM loans l JOIN books b ON b.id=l.book AND b.code='DEMO-RENEW-26'
JOIN users u ON u.id=l.student AND u.email='student@campus.test'
WHERE l.returned IS NULL
  AND NOT EXISTS (SELECT 1 FROM loan_renewal_requests r WHERE r.loan=l.id AND r.status IN ('Pending','Approved'));

INSERT INTO library_reservations(book,student,semester_id)
SELECT b.id,u.id,
  COALESCE(
    (SELECT id FROM semesters WHERE starts_on<=CURRENT_DATE AND ends_on>=CURRENT_DATE ORDER BY starts_on DESC LIMIT 1),
    (SELECT id FROM semesters ORDER BY starts_on DESC LIMIT 1)
  )
FROM books b JOIN users u ON u.email='student@campus.test'
WHERE b.code='DEMO-RESERVE-26'
  AND NOT EXISTS (SELECT 1 FROM library_reservations r WHERE r.book=b.id AND r.student=u.id AND r.status IN ('Pending','Ready'));
